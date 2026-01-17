import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import type { MovimientoLogistico, Rendicion, EventoProduccion, Pedido } from '../types';

type EventoTipo = 'movimiento' | 'rendicion' | 'produccion';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tipo: EventoTipo;
    evento: MovimientoLogistico | Rendicion | EventoProduccion;
}

export function SincronizarEventoModal({ isOpen, onClose, tipo, evento }: Props) {
    const {
        pedidos, createPedido, updatePedido,
        updateMovimientoLogistico, updateRendicion, updateEventoProduccion,
        createProduccion, addPayment,
        clientes: _clientes, getClienteByNombre
    } = useDatabase();
    // clientes se usa indirectamente via getClienteByNombre
    void _clientes;

    const [mode, setMode] = useState<'vincular' | 'crear'>('vincular');
    const [selectedPedidoId, setSelectedPedidoId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Nuevo pedido form
    const [nuevoPedido, setNuevoPedido] = useState({
        descripcion: '',
        vendedora: '',
        estado: 'en_produccion' as Pedido['estado']
    });

    // Filtrar pedidos por cliente del evento
    const clienteEvento = 'cliente' in evento ? evento.cliente : '';

    const pedidosFiltrados = useMemo(() => {
        let filtered = pedidos;

        // Primero filtrar por cliente si existe
        if (clienteEvento) {
            filtered = pedidos.filter(p =>
                p.cliente.toUpperCase().includes(clienteEvento.toUpperCase()) ||
                clienteEvento.toUpperCase().includes(p.cliente.toUpperCase())
            );
        }

        // Luego filtrar por búsqueda
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.id.toLowerCase().includes(query) ||
                p.cliente.toLowerCase().includes(query) ||
                p.descripcion.toLowerCase().includes(query)
            );
        }

        // Ordenar por fecha más reciente
        return filtered.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ).slice(0, 20);
    }, [pedidos, clienteEvento, searchQuery]);

    // Configuración visual por tipo
    const config = {
        movimiento: {
            title: 'Sincronizar Movimiento',
            icon: '🚚',
            color: 'from-blue-500 to-cyan-600',
            accion: 'Este movimiento actualizará el estado del pedido'
        },
        rendicion: {
            title: 'Sincronizar Rendición',
            icon: '💰',
            color: 'from-orange-500 to-amber-600',
            accion: 'Esta rendición se registrará como pago en el pedido'
        },
        produccion: {
            title: 'Sincronizar Producción',
            icon: '🏭',
            color: 'from-indigo-500 to-purple-600',
            accion: 'Este evento creará una producción vinculada al pedido'
        }
    };

    const currentConfig = config[tipo];

    // Obtener descripción del evento
    const getEventoDescripcion = () => {
        if (tipo === 'movimiento') {
            const mov = evento as MovimientoLogistico;
            const detalle = mov.detalle as any;
            if (detalle?.items) {
                return detalle.items.map((i: any) => `${i.cantidad} ${i.producto}`).join(', ');
            }
            return mov.observaciones || mov.tipo;
        } else if (tipo === 'rendicion') {
            const rend = evento as Rendicion;
            return `S/. ${rend.monto} - ${rend.tipo.replace('_', ' ')}`;
        } else {
            const prod = evento as EventoProduccion;
            return `${prod.producto} x ${prod.cantidad || 1}`;
        }
    };

    const handleSincronizar = async () => {
        setIsSubmitting(true);
        try {
            let pedidoId = selectedPedidoId;

            // Si es modo crear, primero crear el pedido
            if (mode === 'crear') {
                // Buscar si el cliente existe (para validación futura)
                const _clienteData = clienteEvento ? getClienteByNombre(clienteEvento) : null;
                void _clienteData; // Reservado para uso futuro

                const newPedido = await createPedido({
                    cliente: clienteEvento || 'Sin Cliente',
                    vendedora: nuevoPedido.vendedora || 'Logística',
                    descripcion: nuevoPedido.descripcion || getEventoDescripcion(),
                    estado: nuevoPedido.estado,
                    precio: 0,
                    pagado: 0,
                });
                pedidoId = newPedido.id;
                console.log('✅ Nuevo pedido creado:', pedidoId);
            }

            if (!pedidoId) {
                alert('Debes seleccionar o crear un pedido');
                setIsSubmitting(false);
                return;
            }

            // Sincronizar según tipo
            if (tipo === 'movimiento') {
                const mov = evento as MovimientoLogistico;

                // Actualizar el movimiento con el pedido_id
                await updateMovimientoLogistico(mov.id, { pedido_id: pedidoId });

                // Si es una entrega, actualizar el pedido a "entregado"
                if (mov.tipo === 'entrega') {
                    await updatePedido(pedidoId, { estado: 'entregado' });
                    console.log(`📦 Pedido ${pedidoId} marcado como entregado`);
                }
                // Si es un recojo, actualizar a "listo"
                else if (mov.tipo === 'recojo') {
                    await updatePedido(pedidoId, { estado: 'listo' });
                    console.log(`📦 Pedido ${pedidoId} marcado como listo`);
                }

            } else if (tipo === 'rendicion') {
                const rend = evento as Rendicion;

                // Actualizar la rendición con el pedido_id
                await updateRendicion(rend.id, { pedido_id: pedidoId });

                // Si es un pago, registrar como pago en el pedido
                if (rend.tipo === 'adelanto_produccion' || rend.tipo === 'pago_saldo') {
                    await addPayment(pedidoId, rend.monto, `Rendición: ${rend.tipo.replace('_', ' ')}`);
                    console.log(`💰 Pago de S/. ${rend.monto} registrado en pedido ${pedidoId}`);
                }

            } else if (tipo === 'produccion') {
                const prod = evento as EventoProduccion;

                // Actualizar el evento con el pedido_id
                await updateEventoProduccion(prod.id, { pedido_id: pedidoId });

                // Crear una producción formal vinculada al pedido
                await createProduccion({
                    pedido_id: pedidoId,
                    proveedor_id: prod.proveedor || 'Sin Proveedor',
                    producto_base: prod.producto,
                    descripcion: prod.observaciones,
                    cantidad_aprobada: prod.cantidad || 1,
                    precio_unitario: prod.precio_unitario || 0,
                    precio_total: prod.precio_total || 0,
                    incluye_igv: false,
                    fecha_aprobacion: prod.fecha,
                    prueba_color: 'na',
                    muestra_fisica: 'na',
                    estado: prod.estado === 'completado' ? 'entregado' : 'en_proceso',
                });
                console.log(`🏭 Producción creada para pedido ${pedidoId}`);

                // Actualizar estado del pedido
                await updatePedido(pedidoId, { estado: 'en_produccion' });
            }

            alert('✅ Evento sincronizado correctamente con el dashboard');
            onClose();

        } catch (err) {
            console.error('Error sincronizando:', err);
            alert('Error al sincronizar. Ver consola para detalles.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const clienteInfo = clienteEvento ? getClienteByNombre(clienteEvento) : null;
    const clienteLogo = clienteInfo?.logo || clienteInfo?.grupo_logo_url;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            tabIndex={0}
            ref={(el) => el?.focus()}
        >
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className={`bg-gradient-to-r ${currentConfig.color} p-6 rounded-t-2xl`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{currentConfig.icon}</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">{currentConfig.title}</h2>
                                <p className="text-white/70 text-sm">Vincular con Dashboard Principal</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Resumen del evento */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                            {clienteLogo ? (
                                <img src={clienteLogo} alt={clienteEvento} className="w-10 h-10 rounded-lg object-cover" />
                            ) : clienteEvento ? (
                                <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400">
                                    {clienteEvento.substring(0, 2).toUpperCase()}
                                </div>
                            ) : null}
                            <div>
                                <p className="text-white font-medium">{clienteEvento || 'Sin Cliente'}</p>
                                <p className="text-gray-400 text-sm">{evento.fecha}</p>
                            </div>
                        </div>
                        <p className="text-cyan-400 text-sm">{getEventoDescripcion()}</p>
                        <p className="text-gray-500 text-xs mt-2">{currentConfig.accion}</p>
                    </div>

                    {/* Tabs: Vincular / Crear */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('vincular')}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                                mode === 'vincular'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                        >
                            🔗 Vincular a Pedido Existente
                        </button>
                        <button
                            onClick={() => setMode('crear')}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                                mode === 'crear'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                        >
                            ➕ Crear Nuevo Pedido
                        </button>
                    </div>

                    {mode === 'vincular' ? (
                        <>
                            {/* Búsqueda de pedidos */}
                            <div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar pedido por ID, cliente o descripción..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 outline-none"
                                />
                            </div>

                            {/* Lista de pedidos */}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {pedidosFiltrados.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No se encontraron pedidos</p>
                                        <p className="text-sm">Intenta buscar o crea uno nuevo</p>
                                    </div>
                                ) : (
                                    pedidosFiltrados.map(pedido => {
                                        const pedidoCliente = getClienteByNombre(pedido.cliente);
                                        const pedidoLogo = pedidoCliente?.logo || pedidoCliente?.grupo_logo_url;

                                        return (
                                            <button
                                                key={pedido.id}
                                                onClick={() => setSelectedPedidoId(pedido.id)}
                                                className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                                                    selectedPedidoId === pedido.id
                                                        ? 'border-cyan-500 bg-cyan-500/10'
                                                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                                }`}
                                            >
                                                {/* Logo */}
                                                {pedidoLogo ? (
                                                    <img src={pedidoLogo} alt={pedido.cliente} className="w-8 h-8 rounded object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                                        {pedido.cliente.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-medium truncate">{pedido.cliente}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                            pedido.estado === 'entregado' ? 'bg-green-500/20 text-green-400' :
                                                            pedido.estado === 'en_produccion' ? 'bg-blue-500/20 text-blue-400' :
                                                            pedido.estado === 'listo' ? 'bg-purple-500/20 text-purple-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                            {pedido.estado}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-500 text-xs truncate">{pedido.descripcion}</p>
                                                </div>

                                                {/* ID */}
                                                <span className="text-gray-600 text-xs font-mono shrink-0">{pedido.id.slice(-8)}</span>

                                                {/* Check */}
                                                {selectedPedidoId === pedido.id && (
                                                    <span className="text-cyan-400">✓</span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        /* Formulario nuevo pedido */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    value={nuevoPedido.descripcion}
                                    onChange={(e) => setNuevoPedido(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder={getEventoDescripcion()}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Vendedora</label>
                                    <input
                                        type="text"
                                        value={nuevoPedido.vendedora}
                                        onChange={(e) => setNuevoPedido(prev => ({ ...prev, vendedora: e.target.value.toUpperCase() }))}
                                        placeholder="Logística"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Estado Inicial</label>
                                    <select
                                        value={nuevoPedido.estado}
                                        onChange={(e) => setNuevoPedido(prev => ({ ...prev, estado: e.target.value as Pedido['estado'] }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none"
                                    >
                                        <option value="cotizacion">Cotización</option>
                                        <option value="aprobado">Aprobado</option>
                                        <option value="en_produccion">En Producción</option>
                                        <option value="listo">Listo</option>
                                        <option value="entregado">Entregado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                <p className="text-emerald-400 text-sm">
                                    Se creará un nuevo pedido para <strong>{clienteEvento || 'Sin Cliente'}</strong> y se vinculará automáticamente con este evento.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSincronizar}
                        disabled={isSubmitting || (mode === 'vincular' && !selectedPedidoId)}
                        className={`flex-1 py-3 bg-gradient-to-r ${currentConfig.color} hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2`}
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Sincronizando...</span>
                        ) : (
                            <>
                                <span>🚀</span>
                                <span>{mode === 'crear' ? 'Crear y Sincronizar' : 'Sincronizar'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
