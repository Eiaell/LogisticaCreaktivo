import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import type { MovimientoLogistico, Rendicion, EventoProduccion, TaskEvento } from '../types';
import { TIPOS_MOVIMIENTO, TIPOS_RENDICION, TIPOS_TASK_PKL } from '../types';

type EventoTipo = 'movimiento' | 'rendicion' | 'produccion';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tipo: EventoTipo;
    eventoId: string;
}

export function EditarEventoModal({ isOpen, onClose, tipo, eventoId }: Props) {
    const {
        movimientosLogisticos, rendiciones, eventosProduccion,
        updateMovimientoLogistico, updateRendicion, updateEventoProduccion,
        clientes, proveedores
    } = useDatabase();

    // Estado del formulario
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [eventoNotFound, setEventoNotFound] = useState(false);

    // Estado para tasks
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskTipo, setNewTaskTipo] = useState('pago');
    const [newTaskNombre, setNewTaskNombre] = useState('');
    const [newTaskMonto, setNewTaskMonto] = useState('');

    // Cargar datos del evento al abrir
    useEffect(() => {
        if (!isOpen) {
            setFormData({});
            setEventoNotFound(false);
            return;
        }

        if (!eventoId) return;

        setFormData({});
        setEventoNotFound(false);

        let evento: MovimientoLogistico | Rendicion | EventoProduccion | null = null;
        switch (tipo) {
            case 'movimiento':
                evento = movimientosLogisticos.find(m => m.id === eventoId) || null;
                break;
            case 'rendicion':
                evento = rendiciones.find(r => r.id === eventoId) || null;
                break;
            case 'produccion':
                evento = eventosProduccion.find(e => e.id === eventoId) || null;
                break;
        }

        if (evento) {
            console.log('📂 Evento cargado:', { tipo, eventoId, eventoTipo: (evento as any).tipo });
            setFormData({ ...evento });
        } else {
            console.error(`Evento no encontrado: tipo=${tipo}, id=${eventoId}`);
            setEventoNotFound(true);
        }
    }, [isOpen, eventoId, tipo, movimientosLogisticos, rendiciones, eventosProduccion]);

    // Cerrar con ESC y scroll al abrir
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        // Scroll suave hacia arriba para que el modal sea visible
        window.scrollTo({ top: 0, behavior: 'smooth' });

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Funciones para tasks
    const handleAddTask = () => {
        const tasks = formData.tasks || [];
        const newTask: TaskEvento = {
            task_id: `TASK-${Date.now()}`,
            tipo: newTaskTipo,
            nombre: newTaskNombre || `${newTaskTipo.charAt(0).toUpperCase() + newTaskTipo.slice(1)}`,
            costo: newTaskMonto ? { monto: parseFloat(newTaskMonto), moneda: 'PEN' } : undefined,
            estado: 'completado',
            fecha_completado: new Date().toISOString()
        };
        handleChange('tasks', [...tasks, newTask]);
        setNewTaskNombre('');
        setNewTaskMonto('');
        setShowAddTask(false);
    };

    const handleDeleteTask = (taskId: string) => {
        const tasks = (formData.tasks || []).filter((t: TaskEvento) => t.task_id !== taskId);
        handleChange('tasks', tasks);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const updates = { ...formData, updated_at: now };

            console.log('📝 Guardando evento:', { tipo, eventoId, updates });

            switch (tipo) {
                case 'movimiento':
                    await updateMovimientoLogistico(eventoId, updates);
                    break;
                case 'rendicion':
                    await updateRendicion(eventoId, updates);
                    break;
                case 'produccion':
                    await updateEventoProduccion(eventoId, updates);
                    break;
            }

            onClose();
        } catch (err) {
            console.error('Error actualizando evento:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Mostrar mensaje si el evento no fue encontrado
    if (eventoNotFound) {
        return createPortal(
            <div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">
                <div className="liquid-glass liquid-glass-orange rounded-2xl p-8 max-w-md text-center">
                    <div className="text-5xl mb-4">❌</div>
                    <h2 className="text-xl font-bold text-white mb-2">Evento no encontrado</h2>
                    <p className="text-gray-400 mb-4">
                        No se pudo encontrar el evento con ID: {eventoId}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    // Mostrar loading si formData está vacío
    if (Object.keys(formData).length === 0) {
        return createPortal(
            <div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">
                <div className="liquid-glass liquid-glass-orange rounded-2xl p-8 text-center">
                    <div className="text-4xl animate-pulse mb-4">⏳</div>
                    <p className="text-gray-400">Cargando datos...</p>
                </div>
            </div>,
            document.body
        );
    }

    // Configuración por tipo - usando las constantes de types
    const config = {
        movimiento: {
            title: 'Evento Logístico',
            icon: '🚚',
            estados: ['pendiente', 'en_proceso', 'completado', 'cancelado'],
            tipos: TIPOS_MOVIMIENTO.map(t => ({ value: t.value, label: `${t.icon} ${t.label}` }))
        },
        rendicion: {
            title: 'Rendición de Pago',
            icon: '💰',
            estados: ['registrado', 'pendiente', 'pagado', 'rechazado'],
            tipos: TIPOS_RENDICION.map(t => ({ value: t.value, label: `${t.icon} ${t.label}` }))
        },
        produccion: {
            title: 'Producción',
            icon: '🏭',
            estados: ['pendiente', 'en_produccion', 'completado', 'cancelado'],
            tipos: [
                { value: 'orden_produccion', label: '🏭 Orden de Producción' },
                { value: 'prueba_color', label: '🎨 Prueba de Color' },
                { value: 'muestra', label: '📦 Muestra' }
            ]
        }
    };

    const currentConfig = config[tipo];

    const clientesList = Object.entries(clientes).map(([key, c]) => ({
        id: key,
        display: c.nombre_comercial || c.razon_social || key
    }));
    const proveedoresList = Object.keys(proveedores);

    // Handlers para items del detalle (movimiento)
    const handleItemChange = (index: number, field: string, value: any) => {
        const detalle = formData.detalle || {};
        const items = [...(detalle.items || [])];
        items[index] = { ...items[index], [field]: value };
        handleChange('detalle', { ...detalle, items });
    };

    const addItem = () => {
        const detalle = formData.detalle || {};
        const newItem = formData.tipo === 'compra'
            ? { producto: '', cantidad: 1, precio_total: 0 }
            : { producto: '', cantidad: 1 };
        const items = [...(detalle.items || []), newItem];
        handleChange('detalle', { ...detalle, items });
    };

    const removeItem = (index: number) => {
        const detalle = formData.detalle || {};
        const items = (detalle.items || []).filter((_: any, i: number) => i !== index);
        handleChange('detalle', { ...detalle, items });
    };

    return createPortal(
        <div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">
            <div className="liquid-glass liquid-glass-orange rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header - Compacto como PKL */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{currentConfig.icon}</span>
                            <div>
                                <h2 className="text-lg font-bold text-white">{currentConfig.title}</h2>
                                <p className="text-white/70 text-xs">
                                    {formData.cliente || 'Sin cliente'} • {formData.fecha}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors text-sm"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content - Compacto */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {/* Tipo y Estado */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-0.5">Tipo</label>
                            <input
                                type="text"
                                list="tipos-evento-edit-list"
                                value={formData.tipo || ''}
                                onChange={(e) => {
                                    console.log('🔄 Cambiando tipo:', formData.tipo, '->', e.target.value);
                                    handleChange('tipo', e.target.value);
                                }}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                placeholder="Escribe para buscar..."
                            />
                            <datalist id="tipos-evento-edit-list">
                                {currentConfig.tipos.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </datalist>
                            {/* Debug: mostrar valor actual */}
                            <span className="text-[10px] text-gray-600">Valor: {formData.tipo}</span>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-0.5">Estado</label>
                            <input
                                type="text"
                                list="estados-evento-edit-list"
                                value={formData.estado || ''}
                                onChange={(e) => handleChange('estado', e.target.value)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                placeholder="Escribe para buscar..."
                            />
                            <datalist id="estados-evento-edit-list">
                                {currentConfig.estados.map(e => (
                                    <option key={e} value={e}>{e.replace(/_/g, ' ').toUpperCase()}</option>
                                ))}
                            </datalist>
                        </div>
                    </div>

                    {/* Campos dinámicos según tipo de evento */}
                    {formData.tipo !== 'caja_diaria' && tipo === 'movimiento' && (
                        <>
                            {/* MOVIMIENTO: Cliente + Responsable */}
                            {['entrega', 'recojo', 'traslado'].includes(formData.tipo) && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-0.5">Cliente</label>
                                        <input
                                            type="text"
                                            list="clientes-edit-mov-list"
                                            value={formData.cliente || ''}
                                            onChange={(e) => handleChange('cliente', e.target.value)}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                            placeholder="Escribe para buscar..."
                                        />
                                        <datalist id="clientes-edit-mov-list">
                                            <option value="INTERNO">🏢 Interno</option>
                                            {clientesList.map(c => (
                                                <option key={c.id} value={c.display}>{c.display}</option>
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-0.5">Responsable</label>
                                        <input
                                            type="text"
                                            list="responsable-edit-list"
                                            value={formData.proveedor || ''}
                                            onChange={(e) => handleChange('proveedor', e.target.value)}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                            placeholder="Escribe para buscar..."
                                        />
                                        <datalist id="responsable-edit-list">
                                            <option value="MOTORIZADO">🏍️ Motorizado</option>
                                            <option value="SERVICIO_EXTERNO">🚐 Servicio Externo</option>
                                            <option value="LOGISTICA_INTERNA">🏢 Logística Interna</option>
                                        </datalist>
                                    </div>
                                </div>
                            )}

                            {/* COMPRA: Solo Tienda/Proveedor */}
                            {formData.tipo === 'compra' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-0.5">Tienda / Proveedor</label>
                                    <input
                                        type="text"
                                        list="proveedores-list-edit-compra"
                                        value={formData.proveedor || ''}
                                        onChange={(e) => handleChange('proveedor', e.target.value.toUpperCase())}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                        placeholder="Ej: Promart, Sodimac..."
                                    />
                                    <datalist id="proveedores-list-edit-compra">
                                        {proveedoresList.map(p => <option key={p} value={p} />)}
                                        <option value="PROMART">Promart</option>
                                        <option value="SODIMAC">Sodimac</option>
                                        <option value="MAESTRO">Maestro</option>
                                    </datalist>
                                </div>
                            )}

                            {/* Descripción para movimientos */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-0.5">Descripción</label>
                                <input
                                    type="text"
                                    value={formData.detalle?.descripcion || ''}
                                    onChange={(e) => handleChange('detalle', { ...formData.detalle, descripcion: e.target.value })}
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                    placeholder="Descripción del movimiento"
                                />
                            </div>
                        </>
                    )}

                    {/* Para rendición y producción: mantener campos originales */}
                    {formData.tipo !== 'caja_diaria' && tipo !== 'movimiento' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-0.5">
                                    {tipo === 'rendicion' ? 'Beneficiario' : 'Cliente'}
                                </label>
                                {tipo === 'rendicion' ? (
                                    <input
                                        type="text"
                                        list="proveedores-list-edit-rend"
                                        value={formData.proveedor || ''}
                                        onChange={(e) => handleChange('proveedor', e.target.value)}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                        placeholder="A quién se le paga"
                                    />
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            list="clientes-edit-prod-list"
                                            value={formData.cliente || ''}
                                            onChange={(e) => handleChange('cliente', e.target.value)}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                            placeholder="Escribe para buscar..."
                                        />
                                        <datalist id="clientes-edit-prod-list">
                                            <option value="INTERNO">🏢 Interno</option>
                                            {clientesList.map(c => (
                                                <option key={c.id} value={c.display}>{c.display}</option>
                                            ))}
                                        </datalist>
                                    </>
                                )}
                                <datalist id="proveedores-list-edit-rend">
                                    {proveedoresList.map(p => <option key={p} value={p} />)}
                                </datalist>
                            </div>
                            {tipo !== 'rendicion' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-0.5">Proveedor</label>
                                    <input
                                        type="text"
                                        list="proveedores-list-edit"
                                        value={formData.proveedor || ''}
                                        onChange={(e) => handleChange('proveedor', e.target.value.toUpperCase())}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                        placeholder="Nombre del proveedor"
                                    />
                                    <datalist id="proveedores-list-edit">
                                        {proveedoresList.map(p => <option key={p} value={p} />)}
                                    </datalist>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fecha */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Fecha</label>
                        <input
                            type="date"
                            value={formData.fecha || ''}
                            onChange={(e) => handleChange('fecha', e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none [color-scheme:dark]"
                        />
                    </div>

                    {/* Campos específicos por tipo */}
                    {tipo === 'movimiento' && (
                        <>
                            {/* Items del movimiento - Con precios para compras */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs text-gray-400">
                                        {formData.tipo === 'compra' ? '🛒 Productos Comprados' : 'Items'} ({formData.detalle?.items?.length || 0})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="text-xs text-orange-400 hover:text-orange-300"
                                    >
                                        + Agregar {formData.tipo === 'compra' ? 'Producto' : 'Item'}
                                    </button>
                                </div>
                                <div className="bg-gray-800/50 border border-gray-700 rounded-lg max-h-40 overflow-y-auto">
                                    {formData.detalle?.items && formData.detalle.items.length > 0 ? (
                                        <div className="divide-y divide-gray-700/50">
                                            {formData.detalle.items.map((item: any, index: number) => (
                                                <div key={index} className="p-2 flex gap-2 items-center">
                                                    <input
                                                        type="number"
                                                        value={item.cantidad || 1}
                                                        onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 1)}
                                                        className="w-12 bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white text-center text-xs"
                                                        min="1"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={item.producto || ''}
                                                        onChange={(e) => handleItemChange(index, 'producto', e.target.value)}
                                                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs placeholder-gray-500"
                                                        placeholder={formData.tipo === 'compra' ? 'Descripción del producto' : 'Descripción'}
                                                    />
                                                    {formData.tipo === 'compra' && (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.precio_total || item.precio_unitario || ''}
                                                            onChange={(e) => handleItemChange(index, 'precio_total', parseFloat(e.target.value) || 0)}
                                                            className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-amber-400 text-xs"
                                                            placeholder="S/."
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-1 text-red-400 hover:bg-red-500/20 rounded text-xs"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}
                                            {/* Total para compras */}
                                            {formData.tipo === 'compra' && formData.detalle.items.length > 0 && (
                                                <div className="p-2 bg-gray-900/50 flex justify-between items-center">
                                                    <span className="text-xs text-gray-400">Total productos:</span>
                                                    <span className="text-sm text-amber-400 font-bold">
                                                        S/ {formData.detalle.items.reduce((sum: number, item: any) => sum + (item.precio_total || 0), 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-xs italic py-3 text-center">
                                            {formData.tipo === 'compra' ? 'No hay productos' : 'No hay items'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Origen y Destino - Solo para entrega, recojo, traslado */}
                            {['entrega', 'recojo', 'traslado'].includes(formData.tipo) && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-0.5">Origen</label>
                                        <input
                                            type="text"
                                            value={formData.detalle?.origen || ''}
                                            onChange={(e) => handleChange('detalle', { ...formData.detalle, origen: e.target.value })}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                            placeholder="Lugar de origen"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-0.5">Destino</label>
                                        <input
                                            type="text"
                                            value={formData.detalle?.destino || ''}
                                            onChange={(e) => handleChange('detalle', { ...formData.detalle, destino: e.target.value })}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                            placeholder="Lugar de destino"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Costo Movilidad - Solo para entrega, recojo, traslado, compra */}
                            {['entrega', 'recojo', 'traslado', 'compra'].includes(formData.tipo) && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-0.5">Costo Movilidad (S/.)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.costo_movilidad || ''}
                                        onChange={(e) => handleChange('costo_movilidad', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {tipo === 'rendicion' && (
                        <>
                            <div>
                                <label className="block text-xs text-gray-400 mb-0.5">Descripción</label>
                                <input
                                    type="text"
                                    value={formData.descripcion || ''}
                                    onChange={(e) => handleChange('descripcion', e.target.value)}
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                    placeholder="Descripción de la rendición"
                                />
                            </div>
                            {/* Monto - Ocultar para caja_diaria */}
                            {formData.tipo !== 'caja_diaria' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-0.5">Monto (S/.)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.monto || ''}
                                            onChange={(e) => handleChange('monto', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-0.5">Moneda</label>
                                        <input
                                            type="text"
                                            list="moneda-edit-list"
                                            value={formData.moneda || 'PEN'}
                                            onChange={(e) => handleChange('moneda', e.target.value)}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                            placeholder="PEN o USD"
                                        />
                                        <datalist id="moneda-edit-list">
                                            <option value="PEN">PEN (Soles)</option>
                                            <option value="USD">USD (Dólares)</option>
                                        </datalist>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {tipo === 'produccion' && (
                        <>
                            <div>
                                <label className="block text-xs text-gray-400 mb-0.5">Producto</label>
                                <input
                                    type="text"
                                    value={formData.producto || ''}
                                    onChange={(e) => handleChange('producto', e.target.value)}
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-500"
                                    placeholder="Nombre del producto"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-0.5">Cantidad</label>
                                    <input
                                        type="number"
                                        value={formData.cantidad || ''}
                                        onChange={(e) => handleChange('cantidad', parseInt(e.target.value) || 0)}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-0.5">Precio Unit.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.precio_unitario || ''}
                                        onChange={(e) => handleChange('precio_unitario', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-0.5">Precio Total</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.precio_total || ''}
                                        onChange={(e) => handleChange('precio_total', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Tasks */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs text-gray-400">Tasks ({(formData.tasks || []).length})</label>
                            <button
                                type="button"
                                onClick={() => setShowAddTask(true)}
                                className="text-xs text-orange-400 hover:text-orange-300"
                            >
                                + Agregar Task
                            </button>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg max-h-32 overflow-y-auto">
                            {formData.tasks && formData.tasks.length > 0 ? (
                                <div className="divide-y divide-gray-700/50">
                                    {formData.tasks.map((task: TaskEvento) => {
                                        const tipoInfo = TIPOS_TASK_PKL.find(t => t.value === task.tipo);
                                        return (
                                            <div key={task.task_id} className="p-2 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="text-xs">{tipoInfo?.label?.[0] || '📋'}</span>
                                                    <span className="text-white text-xs truncate">{task.nombre}</span>
                                                </div>
                                                {task.costo && (
                                                    <span className="text-amber-400 text-xs font-medium">
                                                        S/ {task.costo.monto.toFixed(2)}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTask(task.task_id)}
                                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded text-xs"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-xs italic py-3 text-center">No hay tasks</p>
                            )}
                        </div>

                        {/* Formulario agregar task */}
                        {showAddTask && (
                            <div className="mt-2 p-2 bg-gray-800/80 border border-orange-500/30 rounded-lg space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        list="tipos-task-edit-list"
                                        value={newTaskTipo}
                                        onChange={(e) => setNewTaskTipo(e.target.value)}
                                        className="w-28 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none"
                                        placeholder="Tipo..."
                                    />
                                    <datalist id="tipos-task-edit-list">
                                        {TIPOS_TASK_PKL.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </datalist>
                                    <input
                                        type="text"
                                        value={newTaskNombre}
                                        onChange={(e) => setNewTaskNombre(e.target.value)}
                                        placeholder="Descripción..."
                                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none placeholder-gray-500"
                                    />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-400 text-xs">S/</span>
                                        <input
                                            type="number"
                                            value={newTaskMonto}
                                            onChange={(e) => setNewTaskMonto(e.target.value)}
                                            placeholder="0.00"
                                            step="0.01"
                                            className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none"
                                        />
                                    </div>
                                    <div className="flex-1"></div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddTask(false)}
                                        className="px-2 py-1 text-gray-400 hover:text-white text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddTask}
                                        className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded"
                                    >
                                        Agregar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-0.5">Observaciones</label>
                        <textarea
                            value={formData.observaciones || ''}
                            onChange={(e) => handleChange('observaciones', e.target.value)}
                            rows={2}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 outline-none resize-none placeholder-gray-500"
                            placeholder="Notas adicionales..."
                        />
                    </div>
                </div>

                {/* Footer - Compacto como PKL */}
                <div className="flex gap-3 px-4 py-3 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors text-sm"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Guardando...</span>
                        ) : (
                            <>
                                <span>💾</span>
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
