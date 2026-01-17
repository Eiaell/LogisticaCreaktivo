import { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import type { MovimientoLogistico, Rendicion, EventoProduccion } from '../types';
import { EditarEventoModal } from './EditarEventoModal';
import { SincronizarEventoModal } from './SincronizarEventoModal';

interface DiaADiaPageProps {
    onBack: () => void;
}

// Función para formatear fecha
function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00'); // Forzar mediodía para evitar problemas de timezone
    return date.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para obtener fecha en formato YYYY-MM-DD
function getDateKey(dateStr: string): string {
    if (!dateStr) return '';
    // Si ya es YYYY-MM-DD, retornarlo
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Si es un timestamp ISO
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

// Iconos y colores por tipo de movimiento
const MOVIMIENTO_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
    entrega: { icon: '📦', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
    recojo: { icon: '🚚', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
    compra: { icon: '🛒', color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/30' },
    traslado: { icon: '🔄', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/30' },
};

// Iconos y colores por tipo de rendición
const RENDICION_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
    movilidad: { icon: '🚕', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20 border-cyan-500/30' },
    adelanto_produccion: { icon: '💰', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30' },
    pago_saldo: { icon: '✅', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30' },
    gasto_extra: { icon: '📋', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
    compra_material: { icon: '🛍️', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20 border-indigo-500/30' },
};

// Componente para mostrar logo de cliente
function ClienteLogo({ logoUrl, nombre, size = 'md' }: { logoUrl?: string | null; nombre: string; size?: 'sm' | 'md' }) {
    const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={nombre}
                className={`${sizeClasses} rounded-lg object-cover border border-gray-700`}
            />
        );
    }

    // Placeholder con iniciales
    const iniciales = nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    return (
        <div className={`${sizeClasses} rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center`}>
            <span className={`${textSize} font-bold text-gray-400`}>{iniciales}</span>
        </div>
    );
}

// Componente para mostrar un movimiento
function MovimientoCard({ movimiento, onEdit, onDelete, onSync, clienteLogo }: {
    movimiento: MovimientoLogistico;
    onEdit: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
}) {
    const config = MOVIMIENTO_CONFIG[movimiento.tipo] || MOVIMIENTO_CONFIG.traslado;
    const detalle = movimiento.detalle as any;

    // Construir resumen según tipo
    let resumen = '';
    if (detalle?.items && Array.isArray(detalle.items)) {
        resumen = detalle.items.map((i: any) => `${i.cantidad} ${i.producto}`).join(', ');
    } else if (detalle?.origen) {
        resumen = `${detalle.origen}${detalle.destino ? ` → ${detalle.destino}` : ''}`;
        if (detalle.item) resumen += ` (${detalle.item})`;
    }

    return (
        <div className={`border rounded-xl p-4 ${config.bgColor} group relative cursor-pointer hover:border-cyan-500/50 transition-all`} onClick={onEdit}>
            {/* Botones de acción (hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                    title="Editar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
                    title="Eliminar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div className="flex items-start gap-3">
                <div className="text-2xl">{config.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold uppercase text-sm ${config.color}`}>
                            {movimiento.tipo}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                            movimiento.estado === 'completado' ? 'bg-green-500/30 text-green-400' : 'bg-yellow-500/30 text-yellow-400'
                        }`}>
                            {movimiento.estado}
                        </span>
                    </div>

                    {movimiento.cliente && (
                        <div className="flex items-center gap-2">
                            <ClienteLogo logoUrl={clienteLogo} nombre={movimiento.cliente} size="sm" />
                            <span className="text-white font-medium">{movimiento.cliente}</span>
                        </div>
                    )}

                    {resumen && (
                        <p className="text-gray-400 text-sm mt-1">{resumen}</p>
                    )}

                    {movimiento.observaciones && (
                        <p className="text-gray-500 text-xs mt-2 italic">"{movimiento.observaciones}"</p>
                    )}

                    {movimiento.costo_movilidad && Number(movimiento.costo_movilidad) > 0 && (
                        <p className="text-amber-400 font-mono text-sm mt-2">
                            Costo: S/. {Number(movimiento.costo_movilidad).toFixed(2)}
                        </p>
                    )}

                    {/* Botón de sincronización */}
                    {movimiento.pedido_id ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                                ✓ Vinculado a pedido
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            🚀 Sincronizar con Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente para mostrar una rendición
function RendicionCard({ rendicion, onEdit, onDelete, onSync, clienteLogo }: {
    rendicion: Rendicion;
    onEdit: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
}) {
    const config = RENDICION_CONFIG[rendicion.tipo] || RENDICION_CONFIG.gasto_extra;
    const detalle = rendicion.detalle as any;

    return (
        <div className={`border rounded-xl p-4 ${config.bgColor} group relative cursor-pointer hover:border-orange-500/50 transition-all`} onClick={onEdit}>
            {/* Botones de acción (hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                    title="Editar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
                    title="Eliminar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div className="flex items-start gap-3">
                <div className="text-2xl">{config.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold uppercase text-sm ${config.color}`}>
                            {rendicion.tipo.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                            rendicion.estado === 'pagado' ? 'bg-green-500/30 text-green-400' : 'bg-yellow-500/30 text-yellow-400'
                        }`}>
                            {rendicion.estado}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {rendicion.cliente && (
                            <>
                                <ClienteLogo logoUrl={clienteLogo} nombre={rendicion.cliente} size="sm" />
                                <span className="text-cyan-400 text-sm">{rendicion.cliente}</span>
                            </>
                        )}
                        {rendicion.cliente && rendicion.proveedor && (
                            <span className="text-gray-600">→</span>
                        )}
                        {rendicion.proveedor && (
                            <span className="text-orange-400 text-sm">{rendicion.proveedor}</span>
                        )}
                    </div>

                    {detalle?.concepto && (
                        <p className="text-gray-400 text-sm mt-1">{detalle.concepto}</p>
                    )}

                    {rendicion.observaciones && (
                        <p className="text-gray-500 text-xs mt-2 italic">"{rendicion.observaciones}"</p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                            {rendicion.tiene_comprobante && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                                    Con comprobante
                                </span>
                            )}
                        </div>
                        <p className="text-amber-400 font-bold text-lg">
                            S/. {Number(rendicion.monto).toFixed(2)}
                        </p>
                    </div>

                    {/* Botón de sincronización */}
                    {rendicion.pedido_id ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                                ✓ Vinculado a pedido
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            🚀 Sincronizar con Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente para mostrar un evento de producción
function ProduccionCard({ evento, onEdit, onDelete, onSync, clienteLogo }: {
    evento: EventoProduccion;
    onEdit: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
}) {
    const especificaciones = evento.especificaciones as Record<string, any> || {};

    return (
        <div className="border rounded-xl p-4 bg-indigo-500/20 border-indigo-500/30 group relative cursor-pointer hover:border-indigo-500/50 transition-all" onClick={onEdit}>
            {/* Botones de acción (hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                    title="Editar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
                    title="Eliminar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div className="flex items-start gap-3">
                <div className="text-2xl">🏭</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold uppercase text-sm text-indigo-400">
                            Producción
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                            evento.estado === 'completado' ? 'bg-green-500/30 text-green-400' :
                            evento.estado === 'en_produccion' ? 'bg-blue-500/30 text-blue-400' :
                            'bg-yellow-500/30 text-yellow-400'
                        }`}>
                            {evento.estado}
                        </span>
                    </div>

                    <p className="text-white font-medium">{evento.producto}</p>

                    <div className="flex items-center gap-2 mt-1">
                        {evento.cliente && (
                            <ClienteLogo logoUrl={clienteLogo} nombre={evento.cliente} size="sm" />
                        )}
                        <span className="text-cyan-400 text-sm">{evento.cliente}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-orange-400 text-sm">{evento.proveedor}</span>
                    </div>

                    {evento.cantidad && (
                        <p className="text-gray-400 text-sm mt-1">Cantidad: {evento.cantidad}</p>
                    )}

                    {/* Especificaciones */}
                    {Object.keys(especificaciones).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                            {Object.entries(especificaciones).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                    {key}: <span className="text-gray-400">{String(value)}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {evento.observaciones && (
                        <p className="text-gray-500 text-xs mt-2 italic">"{evento.observaciones}"</p>
                    )}

                    {evento.precio_total && (
                        <p className="text-amber-400 font-bold text-lg mt-2">
                            S/. {Number(evento.precio_total).toFixed(2)}
                        </p>
                    )}

                    {/* Botón de sincronización */}
                    {evento.pedido_id ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                                ✓ Vinculado a pedido
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            🚀 Sincronizar con Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Modal de confirmación para eliminar
function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemType }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemType: string;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full">
                <div className="text-center">
                    <div className="text-5xl mb-4">🗑️</div>
                    <h2 className="text-xl font-bold text-white mb-2">Eliminar {itemType}</h2>
                    <p className="text-gray-400 mb-6">
                        ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DiaADiaPage({ onBack }: DiaADiaPageProps) {
    const {
        movimientosLogisticos, rendiciones, eventosProduccion,
        deleteMovimientoLogistico, deleteRendicion, deleteEventoProduccion,
        getClienteByNombre,
        createPedido, updatePedido, addPayment,
        updateMovimientoLogistico, updateRendicion, updateEventoProduccion,
        createProduccion
    } = useDatabase();

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'movimientos' | 'rendiciones' | 'produccion'>('all');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: string; id: string; itemType: string } | null>(null);
    const [editModal, setEditModal] = useState<{ isOpen: boolean; tipo: 'movimiento' | 'rendicion' | 'produccion'; id: string } | null>(null);
    const [syncModal, setSyncModal] = useState<{
        isOpen: boolean;
        tipo: 'movimiento' | 'rendicion' | 'produccion';
        evento: MovimientoLogistico | Rendicion | EventoProduccion;
    } | null>(null);
    const [confirmBatchDelete, setConfirmBatchDelete] = useState<{
        isOpen: boolean;
        tipo: 'movimientos' | 'rendiciones' | 'producciones';
        items: string[];
    } | null>(null);
    const [confirmBatchAccept, setConfirmBatchAccept] = useState<{
        isOpen: boolean;
        tipo: 'movimientos' | 'rendiciones' | 'producciones';
        items: (MovimientoLogistico | Rendicion | EventoProduccion)[];
    } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Agrupar eventos por fecha
    const eventosPorFecha = useMemo(() => {
        const grupos: Record<string, {
            movimientos: MovimientoLogistico[];
            rendiciones: Rendicion[];
            producciones: EventoProduccion[];
            totalMonto: number
        }> = {};

        // Agregar movimientos
        movimientosLogisticos.forEach(m => {
            const fecha = getDateKey(m.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) {
                grupos[fecha] = { movimientos: [], rendiciones: [], producciones: [], totalMonto: 0 };
            }
            grupos[fecha].movimientos.push(m);
            if (m.costo_movilidad) {
                grupos[fecha].totalMonto += Number(m.costo_movilidad);
            }
        });

        // Agregar rendiciones
        rendiciones.forEach(r => {
            const fecha = getDateKey(r.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) {
                grupos[fecha] = { movimientos: [], rendiciones: [], producciones: [], totalMonto: 0 };
            }
            grupos[fecha].rendiciones.push(r);
            grupos[fecha].totalMonto += Number(r.monto);
        });

        // Agregar eventos de producción
        eventosProduccion.forEach(e => {
            const fecha = getDateKey(e.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) {
                grupos[fecha] = { movimientos: [], rendiciones: [], producciones: [], totalMonto: 0 };
            }
            grupos[fecha].producciones.push(e);
            if (e.precio_total) {
                grupos[fecha].totalMonto += Number(e.precio_total);
            }
        });

        return grupos;
    }, [movimientosLogisticos, rendiciones, eventosProduccion]);

    // Fechas ordenadas (más reciente primero)
    const fechasOrdenadas = useMemo(() => {
        return Object.keys(eventosPorFecha).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [eventosPorFecha]);

    // Totales generales
    const totales = useMemo(() => {
        let movimientos = 0;
        let rendicionesCount = 0;
        let produccionesCount = 0;
        let montoTotal = 0;

        Object.values(eventosPorFecha).forEach(grupo => {
            movimientos += grupo.movimientos.length;
            rendicionesCount += grupo.rendiciones.length;
            produccionesCount += grupo.producciones.length;
            montoTotal += grupo.totalMonto;
        });

        return { movimientos, rendiciones: rendicionesCount, producciones: produccionesCount, montoTotal, dias: fechasOrdenadas.length };
    }, [eventosPorFecha, fechasOrdenadas]);

    // Datos del día seleccionado
    const diaSeleccionado = selectedDate ? eventosPorFecha[selectedDate] : null;

    // Handlers para eliminar
    const handleDeleteMovimiento = (id: string) => {
        setDeleteModal({ isOpen: true, type: 'movimiento', id, itemType: 'Movimiento' });
    };

    const handleDeleteRendicion = (id: string) => {
        setDeleteModal({ isOpen: true, type: 'rendicion', id, itemType: 'Rendición' });
    };

    const handleDeleteProduccion = (id: string) => {
        setDeleteModal({ isOpen: true, type: 'produccion', id, itemType: 'Producción' });
    };

    const confirmDelete = () => {
        if (!deleteModal) return;

        switch (deleteModal.type) {
            case 'movimiento':
                deleteMovimientoLogistico(deleteModal.id);
                break;
            case 'rendicion':
                deleteRendicion(deleteModal.id);
                break;
            case 'produccion':
                deleteEventoProduccion(deleteModal.id);
                break;
        }
    };

    // Abrir modal de edición
    const handleEdit = (type: string, id: string) => {
        setEditModal({
            isOpen: true,
            tipo: type as 'movimiento' | 'rendicion' | 'produccion',
            id
        });
    };

    // Abrir modal de sincronización
    const handleSync = (tipo: 'movimiento' | 'rendicion' | 'produccion', evento: MovimientoLogistico | Rendicion | EventoProduccion) => {
        setSyncModal({
            isOpen: true,
            tipo,
            evento
        });
    };

    // Obtener items pendientes de sincronizar (sin pedido_id)
    const getPendientesSinSincronizar = () => {
        if (!diaSeleccionado) return { movimientos: [], rendiciones: [], producciones: [] };
        return {
            movimientos: diaSeleccionado.movimientos.filter(m => !m.pedido_id),
            rendiciones: diaSeleccionado.rendiciones.filter(r => !r.pedido_id),
            producciones: diaSeleccionado.producciones.filter(p => !p.pedido_id)
        };
    };

    const pendientes = getPendientesSinSincronizar();

    const confirmBatchDeleteAction = async () => {
        if (!confirmBatchDelete) return;

        const { items } = confirmBatchDelete;

        // Eliminar cada item según su tipo (detectado por la estructura)
        for (const id of items) {
            // Buscar en qué lista está el id
            if (pendientes.movimientos.some(m => m.id === id)) {
                await deleteMovimientoLogistico(id);
            } else if (pendientes.rendiciones.some(r => r.id === id)) {
                await deleteRendicion(id);
            } else if (pendientes.producciones.some(p => p.id === id)) {
                await deleteEventoProduccion(id);
            }
        }

        setConfirmBatchDelete(null);
    };

    const confirmBatchAcceptAction = async () => {
        if (!confirmBatchAccept) return;

        setIsProcessing(true);
        const { items } = confirmBatchAccept;

        try {
            for (const evento of items) {
                const clienteEvento = 'cliente' in evento ? evento.cliente : '';

                // Detectar tipo de evento
                const isMovimiento = pendientes.movimientos.some(m => m.id === evento.id);
                const isRendicion = pendientes.rendiciones.some(r => r.id === evento.id);
                const isProduccion = pendientes.producciones.some(p => p.id === evento.id);

                // Crear descripción según tipo
                let descripcion = '';
                if (isMovimiento) {
                    const mov = evento as MovimientoLogistico;
                    const detalle = mov.detalle as any;
                    if (detalle?.items) {
                        descripcion = detalle.items.map((i: any) => `${i.cantidad} ${i.producto}`).join(', ');
                    } else {
                        descripcion = mov.observaciones || mov.tipo;
                    }
                } else if (isRendicion) {
                    const rend = evento as Rendicion;
                    const detalle = rend.detalle as any;
                    descripcion = detalle?.concepto || `${rend.tipo.replace('_', ' ')} - S/. ${rend.monto}`;
                } else if (isProduccion) {
                    const prod = evento as EventoProduccion;
                    descripcion = `${prod.producto} x ${prod.cantidad || 1}`;
                }

                // Crear nuevo pedido
                const newPedido = await createPedido({
                    cliente: clienteEvento || 'Sin Cliente',
                    vendedora: 'Logística',
                    descripcion: (descripcion || 'Evento importado').toUpperCase(),
                    estado: 'en_produccion',
                    precio: 0,
                    pagado: 0,
                });

                // Vincular según tipo detectado
                if (isMovimiento) {
                    const mov = evento as MovimientoLogistico;
                    await updateMovimientoLogistico(mov.id, { pedido_id: newPedido.id });
                    if (mov.tipo === 'entrega') {
                        await updatePedido(newPedido.id, { estado: 'entregado' });
                    } else if (mov.tipo === 'recojo') {
                        await updatePedido(newPedido.id, { estado: 'listo' });
                    }
                } else if (isRendicion) {
                    const rend = evento as Rendicion;
                    await updateRendicion(rend.id, { pedido_id: newPedido.id });
                    if (rend.tipo === 'adelanto_produccion' || rend.tipo === 'pago_saldo') {
                        await addPayment(newPedido.id, rend.monto, `Rendición: ${rend.tipo.replace('_', ' ')}`);
                    }
                } else if (isProduccion) {
                    const prod = evento as EventoProduccion;
                    await updateEventoProduccion(prod.id, { pedido_id: newPedido.id });
                    await createProduccion({
                        pedido_id: newPedido.id,
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
                }

                console.log(`✅ Evento sincronizado con nuevo pedido ${newPedido.id}`);
            }
        } catch (error) {
            console.error('Error al sincronizar eventos:', error);
        }

        setIsProcessing(false);
        setConfirmBatchAccept(null);
    };

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-3xl font-black">
                            <span className="text-cyan-400">📅</span> Día a Día
                        </h1>
                        <p className="text-gray-500 text-sm">Registro de actividades diarias</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        Todo
                    </button>
                    <button
                        onClick={() => setFilterType('movimientos')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'movimientos' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        🚚 Movimientos
                    </button>
                    <button
                        onClick={() => setFilterType('rendiciones')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'rendiciones' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        💰 Rendiciones
                    </button>
                    <button
                        onClick={() => setFilterType('produccion')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'produccion' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        🏭 Producción
                    </button>
                </div>
            </header>

            {/* KPIs Resumen */}
            <div className="grid grid-cols-5 gap-4 mb-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white">{totales.dias}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Días</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">{totales.movimientos}</div>
                    <div className="text-xs text-blue-400/70 uppercase tracking-wider">Movimientos</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-orange-400">{totales.rendiciones}</div>
                    <div className="text-xs text-orange-400/70 uppercase tracking-wider">Rendiciones</div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-indigo-400">{totales.producciones}</div>
                    <div className="text-xs text-indigo-400/70 uppercase tracking-wider">Producciones</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-amber-400">S/. {totales.montoTotal.toFixed(2)}</div>
                    <div className="text-xs text-amber-400/70 uppercase tracking-wider">Monto Total</div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de fechas */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <h2 className="text-lg font-bold text-white mb-4">Fechas</h2>

                        {fechasOrdenadas.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No hay eventos registrados</p>
                                <p className="text-gray-600 text-sm mt-2">Importa un JSON de día a día para comenzar</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {fechasOrdenadas.map(fecha => {
                                    const grupo = eventosPorFecha[fecha];
                                    const isSelected = selectedDate === fecha;
                                    const totalEventos = grupo.movimientos.length + grupo.rendiciones.length + grupo.producciones.length;

                                    return (
                                        <button
                                            key={fecha}
                                            onClick={() => setSelectedDate(fecha)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                                                isSelected
                                                    ? 'bg-cyan-600/20 border border-cyan-500/50'
                                                    : 'bg-gray-800/50 border border-transparent hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`font-medium ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                                                    {fecha}
                                                </span>
                                                <span className="text-amber-400 font-mono text-sm">
                                                    S/. {grupo.totalMonto.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span className="text-gray-400">{totalEventos} eventos</span>
                                                {grupo.movimientos.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        🚚 {grupo.movimientos.length}
                                                    </span>
                                                )}
                                                {grupo.rendiciones.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        💰 {grupo.rendiciones.length}
                                                    </span>
                                                )}
                                                {grupo.producciones.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        🏭 {grupo.producciones.length}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detalle del día seleccionado */}
                <div className="lg:col-span-2">
                    {selectedDate && diaSeleccionado ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white capitalize">
                                        {formatDate(selectedDate)}
                                    </h2>
                                    <p className="text-gray-500 text-sm">
                                        {diaSeleccionado.movimientos.length + diaSeleccionado.rendiciones.length + diaSeleccionado.producciones.length} eventos
                                        {(pendientes.movimientos.length + pendientes.rendiciones.length + pendientes.producciones.length) > 0 && (
                                            <span className="ml-2 text-yellow-500">
                                                ({pendientes.movimientos.length + pendientes.rendiciones.length + pendientes.producciones.length} sin sincronizar)
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-amber-400 font-bold text-2xl">
                                        S/. {diaSeleccionado.totalMonto.toFixed(2)}
                                    </p>
                                    <p className="text-gray-500 text-xs">Total del día</p>
                                </div>
                            </div>

                            {/* Botones de acción masiva */}
                            {(pendientes.movimientos.length + pendientes.rendiciones.length + pendientes.producciones.length) > 0 && (
                                <div className="flex items-center justify-end gap-3 mb-6 pb-4 border-b border-gray-800">
                                    <span className="text-gray-500 text-sm mr-auto">
                                        Acciones para pendientes:
                                    </span>
                                    <button
                                        onClick={() => {
                                            // Combinar todos los pendientes
                                            const allItems = [
                                                ...pendientes.movimientos,
                                                ...pendientes.rendiciones,
                                                ...pendientes.producciones
                                            ];
                                            if (allItems.length > 0) {
                                                setConfirmBatchAccept({
                                                    isOpen: true,
                                                    tipo: 'movimientos', // Se manejará cada tipo individualmente
                                                    items: allItems
                                                });
                                            }
                                        }}
                                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                                    >
                                        <span>✓</span>
                                        Aceptar todos ({pendientes.movimientos.length + pendientes.rendiciones.length + pendientes.producciones.length})
                                    </button>
                                    <button
                                        onClick={() => {
                                            const allIds = [
                                                ...pendientes.movimientos.map(m => m.id),
                                                ...pendientes.rendiciones.map(r => r.id),
                                                ...pendientes.producciones.map(p => p.id)
                                            ];
                                            if (allIds.length > 0) {
                                                setConfirmBatchDelete({
                                                    isOpen: true,
                                                    tipo: 'movimientos', // Se manejará cada tipo
                                                    items: allIds
                                                });
                                            }
                                        }}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                                    >
                                        <span>🗑️</span>
                                        Eliminar todos
                                    </button>
                                </div>
                            )}

                            {/* Movimientos */}
                            {(filterType === 'all' || filterType === 'movimientos') && diaSeleccionado.movimientos.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">
                                        🚚 Movimientos Logísticos ({diaSeleccionado.movimientos.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.movimientos.map(m => {
                                            const cliente = m.cliente ? getClienteByNombre(m.cliente) : null;
                                            // Usar logo del cliente o del grupo empresarial
                                            const logoUrl = cliente?.logo || cliente?.grupo_logo_url;
                                            return (
                                                <MovimientoCard
                                                    key={m.id}
                                                    movimiento={m}
                                                    onEdit={() => handleEdit('movimiento', m.id)}
                                                    onDelete={() => handleDeleteMovimiento(m.id)}
                                                    onSync={() => handleSync('movimiento', m)}
                                                    clienteLogo={logoUrl}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Rendiciones */}
                            {(filterType === 'all' || filterType === 'rendiciones') && diaSeleccionado.rendiciones.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-3">
                                        💰 Rendiciones y Pagos ({diaSeleccionado.rendiciones.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.rendiciones.map(r => {
                                            const cliente = r.cliente ? getClienteByNombre(r.cliente) : null;
                                            const logoUrl = cliente?.logo || cliente?.grupo_logo_url;
                                            return (
                                                <RendicionCard
                                                    key={r.id}
                                                    rendicion={r}
                                                    onEdit={() => handleEdit('rendicion', r.id)}
                                                    onDelete={() => handleDeleteRendicion(r.id)}
                                                    onSync={() => handleSync('rendicion', r)}
                                                    clienteLogo={logoUrl}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Producciones */}
                            {(filterType === 'all' || filterType === 'produccion') && diaSeleccionado.producciones.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3">
                                        🏭 Producción ({diaSeleccionado.producciones.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.producciones.map(e => {
                                            const cliente = e.cliente ? getClienteByNombre(e.cliente) : null;
                                            const logoUrl = cliente?.logo || cliente?.grupo_logo_url;
                                            return (
                                                <ProduccionCard
                                                    key={e.id}
                                                    evento={e}
                                                    onEdit={() => handleEdit('produccion', e.id)}
                                                    onDelete={() => handleDeleteProduccion(e.id)}
                                                    onSync={() => handleSync('produccion', e)}
                                                    clienteLogo={logoUrl}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                            <div className="text-6xl mb-4">📅</div>
                            <h2 className="text-xl font-bold text-white mb-2">Selecciona una fecha</h2>
                            <p className="text-gray-500">
                                Haz clic en una fecha de la lista para ver los detalles del día
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmación de eliminación */}
            {deleteModal && (
                <ConfirmDeleteModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={confirmDelete}
                    itemType={deleteModal.itemType}
                />
            )}

            {/* Modal de edición */}
            {editModal && (
                <EditarEventoModal
                    isOpen={editModal.isOpen}
                    onClose={() => setEditModal(null)}
                    tipo={editModal.tipo}
                    eventoId={editModal.id}
                />
            )}

            {/* Modal de sincronización */}
            {syncModal && (
                <SincronizarEventoModal
                    isOpen={syncModal.isOpen}
                    onClose={() => setSyncModal(null)}
                    tipo={syncModal.tipo}
                    evento={syncModal.evento}
                />
            )}

            {/* Modal de confirmación de eliminación masiva */}
            {confirmBatchDelete && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onKeyDown={(e) => { if (e.key === 'Escape') setConfirmBatchDelete(null); }}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full">
                        <div className="text-center">
                            <div className="text-5xl mb-4">⚠️</div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Eliminar {confirmBatchDelete.items.length} {confirmBatchDelete.tipo}
                            </h2>
                            <p className="text-gray-400 mb-6">
                                ¿Estás seguro de que deseas eliminar todos los {confirmBatchDelete.tipo} pendientes de sincronizar?
                                <br />
                                <span className="text-red-400 font-bold">Esta acción no se puede deshacer.</span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmBatchDelete(null)}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmBatchDeleteAction}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                                >
                                    Eliminar todos ({confirmBatchDelete.items.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de aceptar masivo */}
            {confirmBatchAccept && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onKeyDown={(e) => { if (e.key === 'Escape' && !isProcessing) setConfirmBatchAccept(null); }}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    <div className="bg-gray-900 border border-green-500/50 rounded-2xl p-6 max-w-md w-full">
                        <div className="text-center">
                            <div className="text-5xl mb-4">✓</div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Aceptar {confirmBatchAccept.items.length} {confirmBatchAccept.tipo}
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Se creará un <span className="text-cyan-400 font-bold">nuevo pedido</span> para cada {confirmBatchAccept.tipo.slice(0, -1)} y se vinculará automáticamente al Dashboard.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmBatchAccept(null)}
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmBatchAcceptAction}
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            Procesando...
                                        </>
                                    ) : (
                                        <>Aceptar todos ({confirmBatchAccept.items.length})</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
