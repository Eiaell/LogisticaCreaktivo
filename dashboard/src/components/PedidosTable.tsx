import { useState, useMemo, useEffect, useRef } from 'react';
import React from 'react';
import { usePedidos, usePKLs } from '../hooks/useKPIs';
import { useDatabase } from '../context/DatabaseContext';
import { ClienteModal } from './ClienteModal';
import { NuevoPedidoModal } from './NuevoPedidoModal';
import { CotizacionesModal } from './CotizacionesModal';
import { ConfirmDialog } from './ConfirmDialog';
import { TIPOS_OPERACION_PKL, ESTADOS_PKL, type EstadoPKL, type TipoOperacionPKL } from '../types';

// Map PKL state to pedido-compatible state for filtering
function mapPKLStateToTableState(pklState: string): string {
    const mapping: Record<string, string> = {
        'recibido': 'cotizacion',
        'en_produccion': 'en_produccion',
        'en_curso': 'listo',
        'en_pausa': 'cotizacion',
        'cerrado_ok': 'cerrado',
        'cerrado_parcial': 'cerrado',
        'cancelado': 'cerrado',
    };
    return mapping[pklState] || pklState;
}

// Función para formatear ISO date sin desplazar por zona horaria
const formatDateISO = (isoString: string): string => {
    // Extrae la parte YYYY-MM-DD del ISO string
    return isoString.split('T')[0];
};

// Función para mostrar fecha en formato local
const getLocalDate = (isoString: string): Date => {
    // Parsea ISO string sin asumir UTC
    const partes = isoString.split('T')[0].split('-');
    const year = parseInt(partes[0]);
    const month = parseInt(partes[1]) - 1;
    const day = parseInt(partes[2]);
    return new Date(year, month, day);
};

// Unified row type for both Pedidos and PKLs
interface TableRow {
    id: string;
    type: 'pedido' | 'pkl';
    created_at: string;
    cliente: string;
    descripcion: string;
    descripcion_corta?: string;
    vendedora: string;
    estado: string;
    estadoOriginal?: string; // For PKLs, keep the original state
    rl_numero?: string;
    rq_numero?: string;
    precio?: number;
    pagado?: number;
    fecha_compromiso?: string;
    // PKL-specific fields
    tipoOperacion?: string;
    tipoOperacionLabel?: string;
    tipoOperacionColor?: string;
    costoTotal?: number;
    tasksTotal?: number;
    tasksCompletadas?: number;
}

interface PedidosTableProps {
    onNavigateToPKL?: (pklId: string) => void;
}

export function PedidosTable({ onNavigateToPKL }: PedidosTableProps) {
    // Get shared state
    const pedidos = usePedidos();
    const pkls = usePKLs();
    const { updatePedido, updatePKL, addPayment, payments, selectedStateFilter, clientes, updateCliente, uploadLogo, deletePedido, deletePedidos, getClienteLogo } = useDatabase();

    // Refs
    const heroFileInputRef = useRef<HTMLInputElement>(null);

    // UI Local state
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterCliente, setFilterCliente] = useState('');
    const [showClienteModal, setShowClienteModal] = useState(false);

    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newAdelantoMonto, setNewAdelantoMonto] = useState('');
    const [newAdelantoNota, setNewAdelantoNota] = useState('');
    const [showNuevoPedidoModal, setShowNuevoPedidoModal] = useState(false);
    const [cotizacionesModalPedidoId, setCotizacionesModalPedidoId] = useState<string | null>(null);

    // Modal de edición de descripción
    const [descripcionModalPedidoId, setDescripcionModalPedidoId] = useState<string | null>(null);
    const [descripcionModalValue, setDescripcionModalValue] = useState('');
    const [descripcionCortaModalValue, setDescripcionCortaModalValue] = useState('');

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'single' | 'batch', ids: string[] } | null>(null);

    // Helpers
    const currentCliente = filterCliente ? clientes[filterCliente] : null;

    const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && filterCliente) {
            const publicUrl = await uploadLogo(file, `cliente-${filterCliente}`);
            if (publicUrl) {
                updateCliente(filterCliente, { logo: publicUrl });
            }
        }
    };

    const sortField = 'created_at';
    const sortDir = 'desc' as const;


    // Sync filter
    useEffect(() => {
        setFilterEstado(selectedStateFilter || '');
    }, [selectedStateFilter]);

    const handleEditStart = (id: string, field: string, value: any) => {
        setEditingCell({ id, field });
        setEditValue(String(value || ''));
    };

    const handleEditSave = () => {
        if (editingCell) {
            let val: string | number = editValue;
            if (['precio'].includes(editingCell.field)) {
                val = Number(val.toString().replace(/[^\d.]/g, ''));
            }

            // Check if this is a PKL edit
            const isPKLEdit = editingCell.id.startsWith('PKL-');

            if (isPKLEdit) {
                // Route PKL edits to updatePKL with proper nested structure
                // TypeScript needs the full type but updatePKL handles partial merges
                if (editingCell.field === 'vendedora') {
                    updatePKL(editingCell.id, { cliente: { ejecutiva_asignada: val.toString() } } as any);
                }
                // Other PKL fields handled elsewhere (cliente dropdown, estado dropdown, tipo dropdown)
            } else {
                // Auto-formatear RL: si es solo número, convertir a RL-YYYY-XXXX
                if (editingCell.field === 'rl_numero' && val) {
                    const valStr = val.toString().trim();
                    // Si es solo dígitos, formatear como RL-YYYY-XXXX
                    if (/^\d+$/.test(valStr)) {
                        const year = new Date().getFullYear();
                        const num = valStr.padStart(4, '0');
                        val = `RL-${year}-${num}`;
                    }
                }
                updatePedido(editingCell.id, { [editingCell.field]: val });
            }
            setEditingCell(null);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedRowId(expandedRowId === id ? null : id);
        setNewAdelantoMonto('');
        setNewAdelantoNota('');
    };

    const handleAddPaymentLocal = (pedidoId: string) => {
        const monto = Number(newAdelantoMonto);
        if (monto > 0) {
            addPayment(pedidoId, monto, newAdelantoNota);
            setNewAdelantoMonto('');
            setNewAdelantoNota('');
        }
    };

    // Selection handlers
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredPedidos.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredPedidos.map(p => p.id)));
        }
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        if (confirmDelete.type === 'single') {
            await deletePedido(confirmDelete.ids[0]);
        } else {
            await deletePedidos(confirmDelete.ids);
        }
        setSelectedIds(new Set());
        setConfirmDelete(null);
    };

    // Derived lists
    const clientesList = useMemo(() => {
        const set = new Set(pedidos.map(p => p.cliente).filter(Boolean));
        const razonSociales = Array.from(set).sort();

        // Map razon_sociales to objects with display names
        return razonSociales.map(razonSocial => {
            const cliente = clientes[razonSocial];
            const displayName = cliente?.nombre_comercial && cliente.nombre_comercial.trim()
                ? cliente.nombre_comercial
                : razonSocial;
            return {
                razonSocial,
                displayName
            };
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [pedidos, clientes]);

    const estados = useMemo(() => {
        const set = new Set(pedidos.map(p => p.estado).filter(Boolean));
        return Array.from(set).sort();
    }, [pedidos]);

    // Convert PKLs to unified table rows
    const pklRows: TableRow[] = useMemo(() => {
        return pkls.map(pkl => {
            const tipoOp = TIPOS_OPERACION_PKL.find(t => t.value === pkl.clasificacion.tipo_operacion);
            return {
                id: pkl.pkl_id,
                type: 'pkl' as const,
                created_at: pkl.created_at,
                cliente: pkl.cliente.nombre,
                descripcion: pkl.origen.descripcion_inicial,
                descripcion_corta: pkl.productos[0]?.descripcion?.slice(0, 30),
                vendedora: pkl.cliente.ejecutiva_asignada || '',
                estado: mapPKLStateToTableState(pkl.estado.actual),
                estadoOriginal: pkl.estado.actual,
                rl_numero: pkl.pkl_id,
                rq_numero: undefined,
                precio: pkl.costos?.total || 0,
                pagado: pkl.costos?.total || 0, // PKLs are typically paid as you go
                tipoOperacion: pkl.clasificacion.tipo_operacion,
                tipoOperacionLabel: tipoOp?.label || pkl.clasificacion.tipo_operacion,
                tipoOperacionColor: tipoOp?.color || 'bg-gray-500',
                costoTotal: pkl.costos?.total || 0,
                tasksTotal: pkl.tasks?.length || 0,
                tasksCompletadas: pkl.tasks?.filter(t => t.estado === 'completado').length || 0,
            };
        });
    }, [pkls]);

    // Convert pedidos to unified table rows
    const pedidoRows: TableRow[] = useMemo(() => {
        return pedidos.map(p => ({
            id: p.id,
            type: 'pedido' as const,
            created_at: p.created_at,
            cliente: p.cliente,
            descripcion: p.descripcion,
            descripcion_corta: p.descripcion_corta,
            vendedora: p.vendedora,
            estado: p.estado,
            rl_numero: p.rl_numero || undefined, // Convert null to undefined
            rq_numero: p.rq_numero || undefined, // Convert null to undefined
            precio: p.precio,
            pagado: p.pagado,
            fecha_compromiso: p.fecha_compromiso,
        }));
    }, [pedidos]);

    // Combined and filtered rows
    const filteredRows = useMemo(() => {
        const allRows = [...pedidoRows, ...pklRows];

        return allRows.filter(row => {
            const matchesSearch = !search ||
                row.id.toLowerCase().includes(search.toLowerCase()) ||
                row.cliente.toLowerCase().includes(search.toLowerCase()) ||
                row.descripcion.toLowerCase().includes(search.toLowerCase());

            const matchesEstado = !filterEstado || row.estado === filterEstado;
            const matchesCliente = !filterCliente || row.cliente === filterCliente;

            return matchesSearch && matchesEstado && matchesCliente;
        }).sort((a, b) => {
            const aVal = a.created_at;
            const bVal = b.created_at;
            return aVal < bVal ? 1 : -1;
        });
    }, [pedidoRows, pklRows, search, filterEstado, filterCliente]);

    // Keep filteredPedidos for backward compatibility (selection, deletion)
    const filteredPedidos = useMemo(() => {
        return pedidos.filter(p => {
            const matchesSearch = !search ||
                p.id.toLowerCase().includes(search.toLowerCase()) ||
                p.cliente.toLowerCase().includes(search.toLowerCase()) ||
                p.descripcion.toLowerCase().includes(search.toLowerCase());

            const matchesEstado = !filterEstado || p.estado === filterEstado;
            const matchesCliente = !filterCliente || p.cliente === filterCliente;

            return matchesSearch && matchesEstado && matchesCliente;
        }).sort((a, b) => {
            const aVal = (a as any)[sortField];
            const bVal = (b as any)[sortField];
            return aVal < bVal ? 1 : -1;
        });
    }, [pedidos, search, filterEstado, filterCliente, sortField, sortDir]);

    return (
        <div className="glass-card overflow-hidden">
            {/* Hero Section for Analytics per Client */}
            {filterCliente && (
                <div className="p-6 bg-gradient-to-br from-blue-600/10 to-transparent border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                            onClick={() => heroFileInputRef.current?.click()}
                            title="Haz clic para subir logo del cliente"
                        >
                            {currentCliente?.logo ? (
                                <img src={currentCliente.logo} alt={filterCliente} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl">👤</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-white font-bold text-center leading-tight">CAMBIAR<br />LOGO</span>
                            </div>
                        </div>
                        <input type="file" ref={heroFileInputRef} className="hidden" accept="image/*" onChange={handleHeroImageUpload} />

                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {currentCliente?.nombre_comercial && currentCliente.nombre_comercial.trim()
                                    ? currentCliente.nombre_comercial
                                    : filterCliente}
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">{filterCliente}</p>
                            <div className="flex gap-4 mt-1">
                                <span className="text-xs text-blue-400">RUC: {currentCliente?.ruc || 'No reg.'}</span>
                                <span className="text-xs text-blue-400">Dir: {currentCliente?.direccion?.slice(0, 20) || 'No reg.'}...</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowClienteModal(true)}
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-xs flex items-center gap-2 transition-all"
                    >
                        <span>Ver Ficha Completa</span>
                        <span className="text-lg">→</span>
                    </button>
                </div>
            )}

            {/* Filters Bar - Responsive */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 mb-4 items-stretch sm:items-center bg-gray-900/40 p-2 sm:p-3 rounded-lg border border-gray-800">
                {/* Top row: Action buttons */}
                <div className="flex gap-2 sm:gap-4">
                    {/* Nuevo Pedido Button */}
                    <button
                        onClick={() => setShowNuevoPedidoModal(true)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-cyan-900/30"
                    >
                        <span className="text-base sm:text-lg">+</span>
                        <span className="hidden xs:inline">Nuevo</span> <span className="hidden sm:inline">Pedido</span>
                    </button>

                    {/* Batch Delete Button */}
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setConfirmDelete({ type: 'batch', ids: Array.from(selectedIds) })}
                            className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center gap-1 sm:gap-2 shadow-lg shadow-red-900/30 animate-in fade-in duration-200"
                        >
                            <span>🗑️</span>
                            <span className="hidden sm:inline">Eliminar</span> ({selectedIds.size})
                        </button>
                    )}
                </div>

                {/* Search input - full width on mobile */}
                <div className="flex-1 min-w-0 sm:min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
                    />
                </div>

                {/* Filters row on mobile */}
                <div className="flex gap-2 w-full sm:w-auto">
                    {/* Client Select */}
                    <select
                        value={filterCliente}
                        onChange={(e) => setFilterCliente(e.target.value)}
                        className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 border rounded-lg focus:outline-none focus:border-cyan-500 text-xs sm:text-sm sm:min-w-[200px] ${filterCliente ? 'bg-blue-900/20 border-blue-500 text-blue-200' : 'bg-gray-950 border-gray-700 text-gray-300'}`}
                    >
                        <option value="" className="bg-gray-950 text-gray-300">Clientes</option>
                        {clientesList.map(c => (
                            <option key={c.razonSocial} value={c.razonSocial} className="bg-gray-950 text-gray-300">{c.displayName}</option>
                        ))}
                    </select>

                    <select
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        className="flex-1 sm:flex-none px-2 sm:px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-xs sm:text-sm text-gray-300"
                    >
                        <option value="" className="bg-gray-950 text-gray-300">Estados</option>
                        {estados.map(estado => (
                            <option key={estado} value={estado} className="bg-gray-950 text-gray-300">{estado}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Mobile Card View - Hidden on md and up */}
            <div className="md:hidden space-y-3">
                {filteredRows.map((row) => {
                    const isPKL = row.type === 'pkl';
                    return (
                        <div
                            key={row.id}
                            className={`p-3 rounded-lg border transition-colors ${
                                isPKL
                                    ? 'bg-cyan-950/20 border-cyan-800/50'
                                    : 'bg-gray-900/50 border-gray-800'
                            }`}
                            onClick={() => isPKL && onNavigateToPKL?.(row.id)}
                        >
                            {/* Header Row: Client + Estado */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {isPKL && (
                                        <span className="text-[10px] font-mono bg-cyan-600/30 text-cyan-300 px-1.5 py-0.5 rounded flex-shrink-0">PKL</span>
                                    )}
                                    <div className="flex items-center gap-2 min-w-0">
                                        {(() => {
                                            const logoUrl = isPKL
                                                ? getClienteLogo(row.cliente)
                                                : (clientes[row.cliente]?.logo || clientes[row.cliente]?.grupo_logo_url);
                                            return logoUrl ? (
                                                <img src={logoUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                            ) : (
                                                <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs flex-shrink-0">
                                                    {isPKL ? '📋' : '👤'}
                                                </span>
                                            );
                                        })()}
                                        <span className="font-medium text-sm truncate">
                                            {clientes[row.cliente]?.nombre_comercial || row.cliente || 'Sin cliente'}
                                        </span>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0
                                    ${row.estado === 'cotizacion' ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/50' :
                                            row.estado === 'aprobado' ? 'bg-green-600/30 text-green-300 border border-green-500/50' :
                                                    row.estado === 'en_produccion' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' :
                                                        row.estado === 'listo' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' :
                                                            row.estado === 'entregado' ? 'bg-teal-600/30 text-teal-300 border border-teal-500/50' :
                                                                row.estado === 'cerrado' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' :
                                                                    'bg-gray-600/30 text-gray-300 border border-gray-500/50'}`}>
                                    {isPKL ? (row.estadoOriginal || row.estado).replace('_', ' ') : row.estado.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-300 truncate mb-2">
                                {row.descripcion_corta || row.descripcion}
                            </p>

                            {/* Footer Row: Date, RL, Type */}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{getLocalDate(row.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                                {isPKL && row.tipoOperacionLabel && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium !text-white ${row.tipoOperacionColor}`}>
                                        {row.tipoOperacionLabel}
                                    </span>
                                )}
                                <span className="font-mono text-cyan-400">{row.rl_numero || row.id.slice(0, 8)}</span>
                            </div>

                            {/* PKL Tasks Progress */}
                            {isPKL && row.tasksTotal && row.tasksTotal > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-800">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">{row.tasksCompletadas}/{row.tasksTotal} tasks</span>
                                        <span className="text-gray-400">S/ {row.costoTotal?.toFixed(2)}</span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-800 rounded-full mt-1">
                                        <div
                                            className="h-1 bg-cyan-500 rounded-full transition-all"
                                            style={{ width: `${((row.tasksCompletadas || 0) / row.tasksTotal) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Table - Hidden on mobile */}
            <div className="overflow-x-auto min-h-[400px] hidden md:block">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                            {/* Checkbox column */}
                            <th className="p-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredPedidos.length > 0 && selectedIds.size === filteredPedidos.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 cursor-pointer"
                                />
                            </th>
                            {[
                                { label: 'Fecha', w: 'w-28' },
                                { label: 'Cliente', w: 'w-48' },
                                { label: 'Tipo', w: 'w-32' },   // Tipo: PKL operation type
                                { label: 'Descripción', w: 'w-56' },
                                { label: 'Vendedor/a', w: 'w-32' },
                                { label: 'Estado', w: 'w-40' },
                                { label: 'RL', w: 'w-32' },     // RL: Requisito Logístico (auto, editable)
                                { label: 'RQ', w: 'w-28' },     // RQ: Código interno (manual)
                                { label: '', w: 'w-10' }
                            ].map((col, idx) => (
                                <th key={idx} className={`p-4 text-left font-medium ${col.w}`}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row) => {
                            const isPKL = row.type === 'pkl';
                            const pedido = !isPKL ? pedidos.find(p => p.id === row.id) : null;

                            return (
                            <React.Fragment key={row.id}>
                                <tr
                                    className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors group ${expandedRowId === row.id ? 'bg-blue-950/20' : ''} ${selectedIds.has(row.id) ? 'bg-cyan-950/20' : ''} ${isPKL ? 'bg-cyan-950/10' : ''}`}
                                >
                                    {/* Row Checkbox */}
                                    <td className="p-4 align-middle">
                                        {isPKL ? (
                                            <span className="text-[10px] font-mono bg-cyan-600/30 text-cyan-300 px-1.5 py-0.5 rounded">PKL</span>
                                        ) : (
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(row.id)}
                                                onChange={() => toggleSelection(row.id)}
                                                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 cursor-pointer"
                                            />
                                        )}
                                    </td>
                                    {/* Fecha */}
                                    <td
                                        className={`p-4 align-middle ${!isPKL ? 'cursor-pointer hover:text-cyan-400' : ''} transition-colors`}
                                        onClick={() => !isPKL && handleEditStart(row.id, 'created_at', formatDateISO(row.created_at))}
                                    >
                                        {!isPKL && editingCell?.id === row.id && editingCell?.field === 'created_at' ? (
                                            <input
                                                type="date"
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onBlur={handleEditSave}
                                                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); } }}
                                                className="bg-gray-950 border border-cyan-500 rounded px-2 py-1 w-full outline-none text-sm"
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-sm">
                                                {getLocalDate(row.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle relative">
                                        {editingCell?.id === row.id && editingCell?.field === 'cliente' ? (
                                            <div className="absolute top-full left-4 mt-1 bg-gray-950 border border-gray-700 rounded-lg shadow-xl z-40 w-64 max-h-72 overflow-y-auto">
                                                <div className="p-2 border-b border-gray-800">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Escape') {
                                                                setEditingCell(null);
                                                                setEditValue('');
                                                            }
                                                        }}
                                                        placeholder="Buscar cliente..."
                                                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:border-cyan-500 outline-none"
                                                    />
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {Object.entries(clientes)
                                                        .filter(([key]) => !editValue || key.toLowerCase().includes(editValue.toLowerCase()) || clientes[key].nombre_comercial?.toLowerCase().includes(editValue.toLowerCase()))
                                                        .map(([razonSocial, cliente]) => (
                                                            <button
                                                                key={razonSocial}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isPKL) {
                                                                        updatePKL(row.id, { cliente: { nombre: razonSocial } } as any);
                                                                    } else {
                                                                        updatePedido(row.id, { cliente: razonSocial });
                                                                    }
                                                                    setEditingCell(null);
                                                                    setEditValue('');
                                                                }}
                                                                className="w-full text-left px-3 py-2 hover:bg-gray-900 border-b border-gray-800 last:border-b-0 transition-colors flex items-center gap-2"
                                                            >
                                                                {cliente.logo ? (
                                                                    <img src={cliente.logo} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                                                                ) : (
                                                                    <span className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-[10px] flex-shrink-0">🏢</span>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs text-gray-300 truncate">{cliente.nombre_comercial || razonSocial}</div>
                                                                    <div className="text-[10px] text-gray-600">{razonSocial}</div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                </div>
                                                <div className="border-t border-gray-800 p-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isPKL) {
                                                                updatePKL(row.id, { cliente: { nombre: '' } } as any);
                                                            } else {
                                                                updatePedido(row.id, { cliente: '' });
                                                            }
                                                            setEditingCell(null);
                                                            setEditValue('');
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-900 rounded transition-colors"
                                                    >
                                                        ✕ Limpiar cliente
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex items-center gap-3 font-bold text-gray-100 transition-colors group/client hover:text-cyan-400 cursor-pointer"
                                                onClick={() => handleEditStart(row.id, 'cliente', row.cliente)}
                                            >
                                                <div className="relative w-8 h-8 flex-shrink-0 bg-gray-900 rounded-full border border-gray-800 overflow-hidden shadow-inner">
                                                    {(() => {
                                                        // For PKLs, use getClienteLogo which searches by name/grupo
                                                        const logoUrl = isPKL
                                                            ? getClienteLogo(row.cliente)
                                                            : (clientes[row.cliente]?.logo || clientes[row.cliente]?.grupo_logo_url);

                                                        if (logoUrl) {
                                                            return (
                                                                <img
                                                                    src={logoUrl}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.opacity = '0';
                                                                    }}
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">
                                                                {isPKL ? '📋' : '⚠️'}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className={row.cliente ? 'text-gray-100' : 'text-gray-500 italic'}>
                                                        {row.cliente
                                                            ? (clientes[row.cliente]?.nombre_comercial && clientes[row.cliente]?.nombre_comercial?.trim()
                                                                ? clientes[row.cliente].nombre_comercial
                                                                : row.cliente)
                                                            : 'Sin cliente'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-mono font-normal">{row.id}</span>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    {/* Tipo - Para PKLs es editable, para Pedidos muestra "-" */}
                                    <td className="p-4 align-middle">
                                        {isPKL ? (
                                            editingCell?.id === row.id && editingCell?.field === 'tipoOperacion' ? (
                                                <div className="absolute z-50">
                                                    <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                                        {TIPOS_OPERACION_PKL.map(tipo => (
                                                            <button
                                                                key={tipo.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    updatePKL(row.id, { clasificacion: { tipo_operacion: tipo.value as TipoOperacionPKL } } as any);
                                                                    setEditingCell(null);
                                                                }}
                                                                className={`block w-full text-left px-3 py-2 border-b border-gray-700 last:border-b-0 text-xs transition-colors hover:bg-gray-800 ${tipo.color} !text-white`}
                                                            >
                                                                {tipo.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span
                                                    onClick={() => handleEditStart(row.id, 'tipoOperacion', row.tipoOperacion || '')}
                                                    className={`text-xs font-medium px-2 py-1 rounded cursor-pointer hover:ring-2 hover:ring-white/30 transition-all !text-white ${row.tipoOperacionColor}`}
                                                >
                                                    {row.tipoOperacionLabel}
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-gray-600 text-xs">-</span>
                                        )}
                                    </td>
                                    <td
                                        className="p-4 align-middle transition-colors hover:text-cyan-400 cursor-pointer"
                                        onClick={() => {
                                            setDescripcionModalPedidoId(row.id);
                                            setDescripcionModalValue(row.descripcion);
                                            setDescripcionCortaModalValue(row.descripcion_corta || '');
                                        }}
                                        title={row.descripcion}
                                    >
                                        <div className="truncate max-w-[220px]">
                                            {row.descripcion_corta || row.descripcion}
                                        </div>
                                        {isPKL && (
                                            <div className="text-[10px] text-gray-500 mt-1">
                                                {row.tasksCompletadas}/{row.tasksTotal} tasks | S/{row.costoTotal}
                                            </div>
                                        )}
                                    </td>
                                    <td
                                        className="p-4 align-middle transition-colors group/seller cursor-pointer"
                                        onClick={() => handleEditStart(row.id, 'vendedora', row.vendedora)}
                                        title="Click para editar vendedor/a"
                                    >
                                        {editingCell?.id === row.id && editingCell?.field === 'vendedora' ? (
                                            <input
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onBlur={handleEditSave}
                                                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); } }}
                                                className="bg-gray-950 border border-cyan-500 rounded px-2 py-1 w-full outline-none text-cyan-400"
                                            />
                                        ) : (
                                            <div className="text-gray-300 transition-colors font-medium group-hover/seller:text-cyan-400">
                                                {row.vendedora || '(Sin asignar)'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle">
                                        {editingCell?.id === row.id && editingCell?.field === 'estado' ? (
                                            <div
                                                className="absolute z-50"
                                                tabIndex={0}
                                                autoFocus
                                                onKeyDown={(e) => { if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); } }}
                                                ref={(el) => el?.focus()}
                                            >
                                                <div className="bg-gray-950 border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                                    {isPKL ? (
                                                        // PKL estados
                                                        ESTADOS_PKL.map(estado => (
                                                            <button
                                                                key={estado.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    updatePKL(row.id, { estado: { actual: estado.value as EstadoPKL } } as any);
                                                                    setEditingCell(null);
                                                                }}
                                                                className={`block w-full text-left px-3 py-2 border-b border-gray-700 last:border-b-0 text-xs font-semibold transition-colors hover:bg-gray-800 ${estado.color} !text-white`}
                                                            >
                                                                {estado.label}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        // Pedido estados
                                                        ['cotizacion', 'aprobado', 'en_produccion', 'listo', 'entregado', 'cerrado'].map(estadoOpt => {
                                                            const colors: Record<string, string> = {
                                                                'cotizacion': 'bg-yellow-600/40 text-yellow-300 border-yellow-500/50 hover:bg-yellow-600/60',
                                                                'aprobado': 'bg-green-600/40 text-green-300 border-green-500/50 hover:bg-green-600/60',
                                                                'en_produccion': 'bg-blue-600/40 text-blue-300 border-blue-500/50 hover:bg-blue-600/60',
                                                                'listo': 'bg-cyan-600/40 text-cyan-300 border-cyan-500/50 hover:bg-cyan-600/60',
                                                                'entregado': 'bg-teal-600/40 text-teal-300 border-teal-500/50 hover:bg-teal-600/60',
                                                                'cerrado': 'bg-gray-600/40 text-gray-300 border-gray-500/50 hover:bg-gray-600/60',
                                                            };
                                                            return (
                                                                <button
                                                                    key={estadoOpt}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newVal = estadoOpt as 'cotizacion' | 'aprobado' | 'en_produccion' | 'listo' | 'entregado' | 'cerrado';
                                                                        updatePedido(row.id, { estado: newVal });
                                                                        setEditingCell(null);
                                                                    }}
                                                                    onKeyDown={(e) => { if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); } }}
                                                                    className={`block w-full text-left px-3 py-2 border-b border-gray-700 last:border-b-0 text-xs font-semibold uppercase tracking-wide transition-colors ${colors[estadoOpt]}`}
                                                                >
                                                                    {estadoOpt === 'cotizacion' ? 'Cotización' :
                                                                     estadoOpt === 'en_produccion' ? 'En Producción' :
                                                                     estadoOpt.charAt(0).toUpperCase() + estadoOpt.slice(1)}
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span
                                                onClick={() => handleEditStart(row.id, 'estado', isPKL ? (row.estadoOriginal || '') : row.estado)}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer hover:ring-1 hover:ring-white/30
                                                ${row.estado === 'cotizacion' ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/50' :
                                                        row.estado === 'aprobado' ? 'bg-green-600/30 text-green-300 border border-green-500/50' :
                                                                row.estado === 'en_produccion' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' :
                                                                    row.estado === 'listo' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' :
                                                                        row.estado === 'entregado' ? 'bg-teal-600/30 text-teal-300 border border-teal-500/50' :
                                                                            row.estado === 'cerrado' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' :
                                                                                'bg-gray-600/30 text-gray-300 border border-gray-500/50'}`}>
                                                {isPKL ? (row.estadoOriginal || row.estado).replace('_', ' ') : row.estado.replace('_', ' ')}
                                            </span>
                                        )}
                                    </td>
                                    {/* RL - Requisito Logístico (editable for pedidos, clickable for PKLs to navigate) */}
                                    <td
                                        className={`p-4 align-middle transition-colors group/rl cursor-pointer`}
                                        onClick={() => {
                                            if (isPKL) {
                                                // Navigate to PKL page with this PKL selected
                                                onNavigateToPKL?.(row.id);
                                            } else {
                                                handleEditStart(row.id, 'rl_numero', row.rl_numero || '');
                                            }
                                        }}
                                        title={isPKL ? "Click para ver detalles del PKL" : "Click para editar RL"}
                                    >
                                        {!isPKL && editingCell?.id === row.id && editingCell?.field === 'rl_numero' ? (
                                            <input
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value.toUpperCase())}
                                                onBlur={handleEditSave}
                                                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); } }}
                                                placeholder="Ej: 25"
                                                className="bg-gray-950 border border-cyan-500 rounded px-2 py-1 w-20 outline-none text-cyan-400 font-mono text-xs"
                                            />
                                        ) : (
                                            <span className={`font-mono text-xs transition-colors ${isPKL ? 'text-cyan-400 font-semibold hover:text-cyan-300 hover:underline' : row.rl_numero ? 'text-cyan-400 font-semibold group-hover/rl:text-cyan-300' : 'text-gray-600 italic'}`}>
                                                {row.rl_numero || '-'}
                                            </span>
                                        )}
                                    </td>
                                    {/* RQ - Código interno empresa (manual, editable) */}
                                    <td
                                        className={`p-4 align-middle transition-colors group/rq ${!isPKL ? 'cursor-pointer' : ''}`}
                                        onClick={() => !isPKL && handleEditStart(row.id, 'rq_numero', row.rq_numero || '')}
                                        title={!isPKL ? "Click para editar RQ" : undefined}
                                    >
                                        {!isPKL && editingCell?.id === row.id && editingCell?.field === 'rq_numero' ? (
                                            <input
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value.toUpperCase())}
                                                onBlur={handleEditSave}
                                                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); } }}
                                                placeholder="RQ-123"
                                                className="bg-gray-950 border border-amber-500 rounded px-2 py-1 w-20 outline-none text-amber-400 font-mono text-xs"
                                            />
                                        ) : (
                                            <span className={`font-mono text-xs transition-colors ${!isPKL ? 'group-hover/rq:text-amber-400' : ''} ${row.rq_numero ? 'text-amber-400' : 'text-gray-600 italic'}`}>
                                                {row.rq_numero || '-'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle">
                                        {!isPKL && (
                                            <button
                                                onClick={() => toggleExpand(row.id)}
                                                className="w-8 h-8 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors text-gray-500 hover:text-white"
                                            >
                                                {expandedRowId === row.id ? '▲' : '▼'}
                                            </button>
                                        )}
                                    </td>
                                </tr>

                                {/* Expanded Row: Payments Detail (only for Pedidos) */}
                                {!isPKL && expandedRowId === row.id && pedido && (
                                    <tr className="bg-gray-900/30">
                                        <td colSpan={10} className="p-0 border-b border-gray-800">
                                            <div className="p-6 flex flex-col md:flex-row gap-8 animate-in slide-in-from-top-2 duration-200">
                                                {/* Resumen Financiero */}
                                                <div className="w-full md:w-56 bg-gradient-to-br from-gray-950 to-gray-900 p-4 rounded-xl border border-gray-700 space-y-4">
                                                    <h4 className="text-xs uppercase font-bold text-gray-400 tracking-widest flex items-center gap-2">
                                                        <span>💰</span> Resumen Financiero
                                                    </h4>
                                                    {/* Precio - Editable */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-gray-500 font-bold">PRECIO TOTAL</label>
                                                        {editingCell?.id === pedido.id && editingCell?.field === 'precio' ? (
                                                            <input
                                                                autoFocus
                                                                type="number"
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onBlur={handleEditSave}
                                                                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); } }}
                                                                className="w-full bg-gray-950 border border-cyan-500 rounded p-2 text-white font-mono text-lg outline-none"
                                                            />
                                                        ) : (
                                                            <div
                                                                onClick={() => handleEditStart(pedido.id, 'precio', pedido.precio || 0)}
                                                                className="text-2xl font-bold text-white font-mono cursor-pointer hover:text-cyan-400 transition-colors"
                                                            >
                                                                S/. {(pedido.precio || 0).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Pagado */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-gray-500 font-bold">PAGADO</label>
                                                        <div className="text-lg font-bold text-emerald-400 font-mono">
                                                            S/. {(pedido.pagado || 0).toFixed(2)}
                                                        </div>
                                                    </div>
                                                    {/* Saldo */}
                                                    <div className="space-y-1 pt-2 border-t border-gray-700">
                                                        <label className="text-[10px] text-gray-500 font-bold">SALDO PENDIENTE</label>
                                                        <div className={`text-xl font-bold font-mono ${(pedido.precio || 0) - (pedido.pagado || 0) > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                                            S/. {((pedido.precio || 0) - (pedido.pagado || 0)).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Payment List */}
                                                <div className="flex-1 space-y-4">
                                                    <h4 className="text-xs uppercase font-bold text-gray-500 tracking-widest flex items-center gap-2">
                                                        <span>💳</span> Historial de Pagos
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {payments.filter(pay => pay.pedidoId === pedido.id).length === 0 ? (
                                                            <div className="text-gray-600 italic text-sm py-2">Sin movimientos registrados</div>
                                                        ) : (
                                                            payments.filter(pay => pay.pedidoId === pedido.id).map(pay => (
                                                                <div key={pay.id} className="flex items-center justify-between p-2 bg-gray-950 rounded border border-gray-800 hover:border-gray-700">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-gray-300 text-sm">{pay.nota}</span>
                                                                        <span className="text-[10px] text-gray-600">{new Date(pay.fecha).toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="font-mono text-emerald-400 font-bold">S/. {pay.monto.toFixed(2)}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Add Payment Form */}
                                                <div className="w-full md:w-80 bg-gray-950/50 p-4 rounded-xl border border-gray-800 space-y-3">
                                                    <h4 className="text-xs uppercase font-bold text-gray-500 tracking-widest">Registrar Pago</h4>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-gray-600 font-bold">Monto (S/.)</label>
                                                        <input
                                                            type="number"
                                                            value={newAdelantoMonto}
                                                            onChange={e => setNewAdelantoMonto(e.target.value)}
                                                            className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none font-mono"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-gray-600 font-bold">Nota / Concepto</label>
                                                        <input
                                                            type="text"
                                                            value={newAdelantoNota}
                                                            onChange={e => setNewAdelantoNota(e.target.value)}
                                                            className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none"
                                                            placeholder="Ej: Adelanto efectivo"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddPaymentLocal(pedido.id)}
                                                        disabled={!newAdelantoMonto || Number(newAdelantoMonto) <= 0}
                                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-bold text-sm transition-colors mt-2"
                                                    >
                                                        Confirmar Pago ↵
                                                    </button>
                                                </div>

                                                {/* Cotizaciones Panel */}
                                                <div className="w-full md:w-48 bg-cyan-950/20 p-4 rounded-xl border border-cyan-900/30 space-y-3">
                                                    <h4 className="text-xs uppercase font-bold text-cyan-400/60 tracking-widest">📋 Cotizaciones</h4>
                                                    <button
                                                        onClick={() => setCotizacionesModalPedidoId(pedido.id)}
                                                        className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 hover:text-white rounded font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <span>➕</span>
                                                        Ver / Agregar
                                                    </button>
                                                </div>

                                                {/* Actions Panel */}
                                                <div className="w-full md:w-48 bg-red-950/20 p-4 rounded-xl border border-red-900/30 space-y-3">
                                                    <h4 className="text-xs uppercase font-bold text-red-400/60 tracking-widest">Acciones</h4>
                                                    <button
                                                        onClick={() => setConfirmDelete({ type: 'single', ids: [pedido.id] })}
                                                        className="w-full py-2 bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white rounded font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <span>🗑️</span>
                                                        Eliminar Pedido
                                                    </button>
                                                    <p className="text-[10px] text-red-400/40 text-center">Esta acción no se puede deshacer</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {filteredRows.length === 0 && (
                <div className="p-8 sm:p-12 md:p-20 text-center flex flex-col items-center">
                    <span className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 grayscale opacity-20">🔍</span>
                    <h3 className="text-gray-400 font-medium text-sm sm:text-base">No encontramos pedidos o PKLs con estos filtros</h3>
                    <p className="text-gray-600 text-xs sm:text-sm mt-1">Intenta ajustando los términos de búsqueda</p>
                </div>
            )}

            {showClienteModal && filterCliente && (
                <ClienteModal
                    nombre={filterCliente}
                    isOpen={showClienteModal}
                    onClose={() => setShowClienteModal(false)}
                />
            )}

            {/* Modal Nuevo Pedido */}
            <NuevoPedidoModal
                isOpen={showNuevoPedidoModal}
                onClose={() => setShowNuevoPedidoModal(false)}
            />

            {/* Modal Cotizaciones */}
            {cotizacionesModalPedidoId && (
                <CotizacionesModal
                    pedidoId={cotizacionesModalPedidoId}
                    onClose={() => setCotizacionesModalPedidoId(null)}
                />
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={confirmDelete !== null}
                title={confirmDelete?.type === 'batch' ? 'Eliminar Pedidos' : 'Eliminar Pedido'}
                message={
                    confirmDelete?.type === 'batch'
                        ? `¿Estás seguro de eliminar ${confirmDelete.ids.length} pedido(s)? Esta acción no se puede deshacer.`
                        : '¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.'
                }
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete(null)}
            />

            {/* Modal Editar Descripción */}
            {descripcionModalPedidoId && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onKeyDown={(e) => { if (e.key === 'Escape') setDescripcionModalPedidoId(null); }}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-xl">📝</span>
                                Editar Descripción
                            </h2>
                            <button
                                onClick={() => setDescripcionModalPedidoId(null)}
                                className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            {/* Título corto (opcional) */}
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide flex items-center gap-2">
                                    Título corto
                                    <span className="text-gray-600 font-normal normal-case">(opcional - se muestra en tabla)</span>
                                </label>
                                <input
                                    type="text"
                                    value={descripcionCortaModalValue}
                                    onChange={(e) => setDescripcionCortaModalValue(e.target.value.toUpperCase())}
                                    placeholder="Ej: LANYARDS EVENTO, POLOS CAMPAÑA..."
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors"
                                    autoFocus
                                />
                                <p className="text-[10px] text-gray-600">
                                    Si lo dejas vacío, se mostrará la descripción completa truncada
                                </p>
                            </div>

                            {/* Descripción completa */}
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                    Descripción completa
                                </label>
                                <textarea
                                    value={descripcionModalValue}
                                    onChange={(e) => setDescripcionModalValue(e.target.value.toUpperCase())}
                                    rows={4}
                                    placeholder="Descripción detallada del pedido..."
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-800">
                            <button
                                onClick={() => setDescripcionModalPedidoId(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (descripcionModalPedidoId) {
                                        const isPKLEdit = descripcionModalPedidoId.startsWith('PKL-');
                                        if (isPKLEdit) {
                                            // PKL: update origen.descripcion_inicial
                                            // Use 'as any' since updatePKL handles partial merges
                                            updatePKL(descripcionModalPedidoId, {
                                                origen: { descripcion_inicial: descripcionModalValue }
                                            } as any);
                                        } else {
                                            // Pedido: update descripcion and descripcion_corta
                                            updatePedido(descripcionModalPedidoId, {
                                                descripcion: descripcionModalValue,
                                                descripcion_corta: descripcionCortaModalValue || undefined
                                            });
                                        }
                                        setDescripcionModalPedidoId(null);
                                    }
                                }}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
