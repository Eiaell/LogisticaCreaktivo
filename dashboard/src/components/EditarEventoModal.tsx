import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
// Types imported for documentation only - actual types are inferred from useDatabase
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { MovimientoLogistico as _ML, Rendicion as _R, EventoProduccion as _EP } from '../types';

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

    // Cargar datos del evento al abrir
    useEffect(() => {
        if (!isOpen || !eventoId) return;

        let evento: any = null;
        switch (tipo) {
            case 'movimiento':
                evento = movimientosLogisticos.find(m => m.id === eventoId);
                break;
            case 'rendicion':
                evento = rendiciones.find(r => r.id === eventoId);
                break;
            case 'produccion':
                evento = eventosProduccion.find(e => e.id === eventoId);
                break;
        }

        if (evento) {
            setFormData({ ...evento });
        }
    }, [isOpen, eventoId, tipo, movimientosLogisticos, rendiciones, eventosProduccion]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const updates = { ...formData, updated_at: now };

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

    // Lista de clientes con nombre comercial para mostrar
    const clientesConNombre = Object.entries(clientes).map(([key, c]) => ({
        id: key,
        razon_social: c.razon_social || key,
        nombre_comercial: c.nombre_comercial || c.razon_social || key,
        display: c.nombre_comercial || c.razon_social || key
    }));
    const proveedoresList = Object.keys(proveedores);

    // Handlers para items del detalle
    const handleItemChange = (index: number, field: string, value: any) => {
        const detalle = formData.detalle || {};
        const items = [...(detalle.items || [])];
        items[index] = { ...items[index], [field]: value };
        handleChange('detalle', { ...detalle, items });
    };

    const addItem = () => {
        const detalle = formData.detalle || {};
        const items = [...(detalle.items || []), { producto: '', cantidad: 1 }];
        handleChange('detalle', { ...detalle, items });
    };

    const removeItem = (index: number) => {
        const detalle = formData.detalle || {};
        const items = (detalle.items || []).filter((_: any, i: number) => i !== index);
        handleChange('detalle', { ...detalle, items });
    };

    // Configuración por tipo
    const config = {
        movimiento: {
            title: 'Editar Movimiento Logistico',
            icon: '🚚',
            color: 'from-blue-500 to-cyan-600',
            estados: ['pendiente', 'en_proceso', 'completado', 'cancelado'],
            tipos: ['entrega', 'recojo', 'compra', 'traslado']
        },
        rendicion: {
            title: 'Editar Rendicion / Pago',
            icon: '💰',
            color: 'from-orange-500 to-amber-600',
            estados: ['registrado', 'pendiente', 'pagado', 'rechazado'],
            tipos: ['movilidad', 'adelanto_produccion', 'pago_saldo', 'gasto_extra', 'compra_material']
        },
        produccion: {
            title: 'Editar Evento de Produccion',
            icon: '🏭',
            color: 'from-indigo-500 to-purple-600',
            estados: ['pendiente', 'en_produccion', 'completado', 'cancelado'],
            tipos: ['orden_produccion', 'prueba_color', 'muestra']
        }
    };

    const currentConfig = config[tipo];

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
                                <p className="text-white/70 text-sm">ID: {eventoId}</p>
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Fecha */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
                        <input
                            type="date"
                            value={formData.fecha || ''}
                            onChange={(e) => handleChange('fecha', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none [color-scheme:dark]"
                        />
                    </div>

                    {/* Tipo y Estado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
                            <select
                                value={formData.tipo || ''}
                                onChange={(e) => handleChange('tipo', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                {currentConfig.tipos.map(t => (
                                    <option key={t} value={t} className="bg-gray-800 text-white">{t.replace('_', ' ').toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                            <select
                                value={formData.estado || ''}
                                onChange={(e) => handleChange('estado', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                {currentConfig.estados.map(e => (
                                    <option key={e} value={e} className="bg-gray-800 text-white">{e.replace('_', ' ').toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Cliente y Proveedor */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
                            <select
                                value={formData.cliente || ''}
                                onChange={(e) => handleChange('cliente', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="" className="bg-gray-800 text-gray-400">Seleccionar cliente...</option>
                                {clientesConNombre.map(c => (
                                    <option key={c.id} value={c.id} className="bg-gray-800 text-white">
                                        {c.display}
                                    </option>
                                ))}
                            </select>
                            {formData.cliente && clientes[formData.cliente] && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Razón social: {clientes[formData.cliente].razon_social}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Proveedor</label>
                            <input
                                type="text"
                                list="proveedores-list-edit"
                                value={formData.proveedor || ''}
                                onChange={(e) => handleChange('proveedor', e.target.value.toUpperCase())}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                placeholder="Nombre del proveedor"
                            />
                            <datalist id="proveedores-list-edit">
                                {proveedoresList.map(p => <option key={p} value={p} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Campos especificos por tipo */}
                    {tipo === 'movimiento' && (
                        <>
                            {/* Items del movimiento */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-400">Items / Productos</label>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                                    >
                                        + Agregar item
                                    </button>
                                </div>
                                {formData.detalle?.items && formData.detalle.items.length > 0 ? (
                                    <div className="space-y-2">
                                        {formData.detalle.items.map((item: any, index: number) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <input
                                                    type="number"
                                                    value={item.cantidad || 1}
                                                    onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 1)}
                                                    className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none text-center"
                                                    min="1"
                                                />
                                                <input
                                                    type="text"
                                                    value={item.producto || ''}
                                                    onChange={(e) => handleItemChange(index, 'producto', e.target.value)}
                                                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                                    placeholder="Descripción del producto"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm italic py-2">No hay items registrados</p>
                                )}
                            </div>

                            {/* Origen y Destino */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Origen</label>
                                    <input
                                        type="text"
                                        value={formData.detalle?.origen || ''}
                                        onChange={(e) => handleChange('detalle', { ...formData.detalle, origen: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                        placeholder="Lugar de origen"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Destino</label>
                                    <input
                                        type="text"
                                        value={formData.detalle?.destino || ''}
                                        onChange={(e) => handleChange('detalle', { ...formData.detalle, destino: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                        placeholder="Lugar de destino"
                                    />
                                </div>
                            </div>

                            {/* Costo Movilidad */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Costo Movilidad (S/.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.costo_movilidad || ''}
                                    onChange={(e) => handleChange('costo_movilidad', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </>
                    )}

                    {tipo === 'rendicion' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Monto (S/.)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.monto || ''}
                                    onChange={(e) => handleChange('monto', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Moneda</label>
                                <select
                                    value={formData.moneda || 'PEN'}
                                    onChange={(e) => handleChange('moneda', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="PEN" className="bg-gray-800 text-white">PEN (Soles)</option>
                                    <option value="USD" className="bg-gray-800 text-white">USD (Dolares)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {tipo === 'produccion' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Producto</label>
                                <input
                                    type="text"
                                    value={formData.producto || ''}
                                    onChange={(e) => handleChange('producto', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                    placeholder="Nombre del producto"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Cantidad</label>
                                    <input
                                        type="number"
                                        value={formData.cantidad || ''}
                                        onChange={(e) => handleChange('cantidad', parseInt(e.target.value) || 0)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Precio Unit.</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.precio_unitario || ''}
                                        onChange={(e) => handleChange('precio_unitario', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Precio Total</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.precio_total || ''}
                                        onChange={(e) => handleChange('precio_total', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none placeholder-gray-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Observaciones */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Observaciones</label>
                        <textarea
                            value={formData.observaciones || ''}
                            onChange={(e) => handleChange('observaciones', e.target.value)}
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500 outline-none resize-none placeholder-gray-500"
                            placeholder="Notas adicionales..."
                        />
                    </div>
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
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`flex-1 py-3 bg-gradient-to-r ${currentConfig.color} hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2`}
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Guardando...</span>
                        ) : (
                            <>
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
