import { useState, useMemo, useEffect } from 'react';
import React from 'react';
import { usePedidos } from '../hooks/useKPIs';
import { useDatabase } from '../context/DatabaseContext';
import { ClienteModal } from './ClienteModal';

export function PedidosTable() {
    // Get shared state
    const pedidos = usePedidos();
    const { updatePedido, addPayment, payments, selectedStateFilter } = useDatabase();

    // UI Local state
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterCliente, setFilterCliente] = useState(''); // New client filter

    const [sortField, setSortField] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Modals
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [newAdelantoMonto, setNewAdelantoMonto] = useState('');
    const [newAdelantoNota, setNewAdelantoNota] = useState('');
    const [showClienteModal, setShowClienteModal] = useState(false);

    // Edit state
    const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

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
                val = Number(val.replace(/[^\d.]/g, ''));
            }
            updatePedido(editingCell.id, { [editingCell.field]: val });
            setEditingCell(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleEditSave();
        else if (e.key === 'Escape') setEditingCell(null);
    };

    const handleEstadoChange = (id: string, newState: string) => {
        updatePedido(id, { estado: newState });
    };

    // --- Payments Logic ---
    const toggleExpandRow = (id: string) => {
        if (expandedRowId === id) {
            setExpandedRowId(null);
        } else {
            setExpandedRowId(id);
            setNewAdelantoMonto('');
            setNewAdelantoNota('');
        }
    };

    const handleAddAdelanto = (pedidoId: string) => {
        const monto = parseFloat(newAdelantoMonto);
        if (!isNaN(monto) && monto > 0) {
            addPayment(pedidoId, monto, newAdelantoNota || `Adelanto`);
            setNewAdelantoMonto('');
            setNewAdelantoNota('');
            // Keep row expanded to see the new payment
        }
    };

    // Helper functions
    const estados = useMemo(() => {
        const unique = [...new Set(pedidos.map(p => p.estado))];
        return unique.filter(Boolean);
    }, [pedidos]);

    const clientesList = useMemo(() => {
        const unique = [...new Set(pedidos.map(p => p.cliente))];
        return unique.filter(Boolean).sort();
    }, [pedidos]);

    const filteredPedidos = useMemo(() => {
        let result = [...pedidos];

        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(p =>
                p.cliente?.toLowerCase().includes(lower) ||
                p.descripcion?.toLowerCase().includes(lower) ||
                p.vendedora?.toLowerCase().includes(lower)
            );
        }

        if (filterEstado) {
            result = result.filter(p => {
                let pState = p.estado;
                if (pState === 'en_campo') pState = 'listo_recoger';
                return pState === filterEstado || p.estado === filterEstado;
            });
        }

        if (filterCliente) {
            result = result.filter(p => p.cliente === filterCliente);
        }

        result.sort((a, b) => {
            const aVal = String((a as any)[sortField] ?? '');
            const bVal = String((b as any)[sortField] ?? '');
            const cmp = aVal.localeCompare(bVal);
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [pedidos, search, filterEstado, filterCliente, sortField, sortDir]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const getEstadoColor = (estado: string) => {
        const colors: Record<string, string> = {
            cotizacion: 'bg-indigo-500/20 text-indigo-300',
            aprobado: 'bg-purple-500/20 text-purple-300',
            en_produccion: 'bg-amber-500/20 text-amber-300',
            listo_recoger: 'bg-emerald-500/20 text-emerald-300',
            entregado: 'bg-green-500/20 text-green-300',
            cerrado: 'bg-gray-500/20 text-gray-300',
        };
        return colors[estado] || 'bg-gray-500/20 text-gray-300';
    };

    const totalVenta = filteredPedidos.reduce((acc, p) => acc + (p.precio || 0), 0);
    const totalCobrado = filteredPedidos.reduce((acc, p) => acc + (p.pagado || 0), 0);

    return (
        <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-cyan-400">📋</span>
                Operational View
            </h2>

            {/* Selected Client Hero Section */}
            {filterCliente && (
                <div className="mb-6 p-4 bg-blue-900/10 border border-blue-500/30 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl border border-blue-500/50">
                            👤
                        </div>
                        <div>
                            <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Cliente Seleccionado</div>
                            <h3 className="text-2xl font-bold text-white">{filterCliente}</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowClienteModal(true)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-105"
                    >
                        <span>Ver Ficha Completa</span>
                        <span className="text-lg">→</span>
                    </button>
                </div>
            )}

            {/* Filters Bar */}
            <div className="flex flex-wrap gap-4 mb-4 items-center bg-gray-900/40 p-3 rounded-lg border border-gray-800">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Buscar global..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
                    />
                </div>

                {/* Client Select */}
                <select
                    value={filterCliente}
                    onChange={(e) => setFilterCliente(e.target.value)}
                    className={`px-4 py-2 border rounded-lg focus:outline-none focus:border-cyan-500 text-sm ${filterCliente ? 'bg-blue-900/20 border-blue-500 text-blue-200' : 'bg-gray-950 border-gray-700 text-gray-300'}`}
                >
                    <option value="">👤 Todos los Clientes</option>
                    {clientesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm text-gray-300"
                >
                    <option value="">⚡ Todos los Estados</option>
                    {estados.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                            {[
                                { label: 'Cliente', w: 'w-48' },
                                { label: 'Descripción', w: 'w-64' },
                                { label: 'Proveedor', w: 'w-32' },
                                { label: 'Estado', w: 'w-32' },
                                { label: 'Precio (Adelantos)', w: 'w-32' },
                                { label: 'Pagado', w: 'w-24' },
                                { label: 'Fecha', w: 'w-32' }
                            ].map((h) => (
                                <th key={h.label} onClick={() => handleSort(h.label.toLowerCase())} className={`text-left py-3 px-4 font-medium ${h.w} cursor-pointer hover:text-cyan-400`}>{h.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPedidos.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-500">No hay pedidos</td></tr>
                        ) : (
                            filteredPedidos.map((pedido) => {
                                const isExpanded = expandedRowId === pedido.id;
                                const myPayments = payments.filter(p => p.pedidoId === pedido.id);

                                return (
                                    <React.Fragment key={pedido.id}>
                                        <tr className={`border-b border-gray-800 ${isExpanded ? 'bg-gray-800/60' : 'hover:bg-gray-800/30'} transition-colors group`}>

                                            {/* CLIENTE */}
                                            <td className="py-2 px-4 cursor-pointer" onDoubleClick={() => handleEditStart(pedido.id, 'cliente', pedido.cliente)}>
                                                {editingCell?.id === pedido.id && editingCell.field === 'cliente' ? (
                                                    <input autoFocus className="bg-gray-900 border border-cyan-500 rounded px-2 w-full"
                                                        value={editValue} onChange={e => setEditValue(e.target.value)}
                                                        onBlur={handleEditSave} onKeyDown={handleKeyDown} />
                                                ) : (
                                                    <span
                                                        className="hover:text-blue-400 hover:underline"
                                                        onClick={(e) => { e.stopPropagation(); setFilterCliente(pedido.cliente); }}
                                                        title="Clic para filtrar por este cliente"
                                                    >
                                                        {pedido.cliente || <span className="text-gray-600 italic">--</span>}
                                                    </span>
                                                )}
                                            </td>

                                            {/* DESCRIPCION */}
                                            <td className="py-2 px-4 cursor-pointer" onDoubleClick={() => handleEditStart(pedido.id, 'descripcion', pedido.descripcion)}>
                                                {editingCell?.id === pedido.id && editingCell.field === 'descripcion' ? (
                                                    <input autoFocus className="bg-gray-900 border border-cyan-500 rounded px-2 w-full"
                                                        value={editValue} onChange={e => setEditValue(e.target.value)}
                                                        onBlur={handleEditSave} onKeyDown={handleKeyDown} />
                                                ) : <div className="truncate max-w-[250px]" title={pedido.descripcion}>{pedido.descripcion}</div>}
                                            </td>

                                            {/* PROVEEDOR (Vendedora) */}
                                            <td className="py-2 px-4 cursor-pointer" onDoubleClick={() => handleEditStart(pedido.id, 'vendedora', pedido.vendedora)}>
                                                {editingCell?.id === pedido.id && editingCell.field === 'vendedora' ? (
                                                    <input autoFocus className="bg-gray-900 border border-cyan-500 rounded px-2 w-full"
                                                        value={editValue} onChange={e => setEditValue(e.target.value)}
                                                        onBlur={handleEditSave} onKeyDown={handleKeyDown} />
                                                ) : pedido.vendedora}
                                            </td>

                                            {/* ESTADO */}
                                            <td className="py-2 px-4">
                                                <select
                                                    value={pedido.estado}
                                                    onChange={(e) => handleEstadoChange(pedido.id, e.target.value)}
                                                    className={`bg-transparent border-none text-xs rounded-full px-2 py-1 cursor-pointer outline-none ${getEstadoColor(pedido.estado)}`}
                                                >
                                                    {estados.map(s => <option key={s} value={s} className="bg-gray-900 text-gray-200">{s}</option>)}
                                                    <option value="entregado" className="bg-gray-900 text-gray-200">entregado</option>
                                                    <option value="cerrado" className="bg-gray-900 text-gray-200">cerrado</option>
                                                </select>
                                            </td>

                                            {/* PRECIO + BOTÓN ADELANTOS */}
                                            <td className="py-2 px-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="cursor-pointer" onDoubleClick={() => handleEditStart(pedido.id, 'precio', pedido.precio)}>
                                                        {editingCell?.id === pedido.id && editingCell.field === 'precio' ? (
                                                            <input autoFocus className="bg-gray-900 border border-cyan-500 rounded px-2 w-20" type="number"
                                                                value={editValue} onChange={e => setEditValue(e.target.value)}
                                                                onBlur={handleEditSave} onKeyDown={handleKeyDown} />
                                                        ) : (
                                                            <span>S/.{pedido.precio?.toFixed(2) || '0.00'}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => toggleExpandRow(pedido.id)}
                                                        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-lg transition-colors
                                                        ${isExpanded ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-cyan-400 hover:bg-cyan-900'}`}
                                                        title="Agregar/Ver Adelantos"
                                                    >
                                                        {isExpanded ? '−' : '+'}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* PAGADO */}
                                            <td className="py-2 px-4 font-medium">
                                                <span className={(pedido.pagado || 0) >= (pedido.precio || 0) ? 'text-green-400' : (pedido.pagado || 0) > 0 ? 'text-amber-400' : 'text-gray-500'}>
                                                    S/.{pedido.pagado?.toFixed(2) || '0.00'}
                                                </span>
                                            </td>

                                            {/* FECHA */}
                                            <td className="py-2 px-4 text-gray-400 text-xs">
                                                {pedido.created_at?.slice(0, 10)}
                                            </td>
                                        </tr>

                                        {/* EXPANDED ROW: PAYMENTS DETAIL */}
                                        {isExpanded && (
                                            <tr className="bg-gray-800/40 border-b border-gray-700">
                                                <td colSpan={7} className="p-4 pl-12">
                                                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                                        <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Historial de Adelantos</h4>

                                                        {/* List Payments */}
                                                        {myPayments.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2 mb-3">
                                                                {myPayments.map((pay, idx) => (
                                                                    <div key={pay.id} className="bg-gray-800 px-3 py-1 rounded border border-gray-600 text-sm flex gap-2 items-center">
                                                                        <span className="text-gray-400 text-xs">Adelanto {idx + 1}:</span>
                                                                        <span className="text-green-400 font-bold">S/.{pay.monto}</span>
                                                                        {pay.nota && <span className="text-gray-500 text-xs italic">({pay.nota})</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500 text-xs italic mb-3">Sin adelantos registrados.</p>
                                                        )}

                                                        {/* Add New Payment Inline */}
                                                        <div className="flex gap-2 items-end">
                                                            <div>
                                                                <div className="text-[10px] text-gray-400 mb-1">Nuevo Monto</div>
                                                                <input
                                                                    type="number"
                                                                    className="bg-gray-950 border border-gray-600 rounded px-2 py-1 text-sm w-24 text-white focus:border-cyan-500 outline-none"
                                                                    placeholder="0.00"
                                                                    value={newAdelantoMonto}
                                                                    onChange={e => setNewAdelantoMonto(e.target.value)}
                                                                    onKeyDown={e => e.key === 'Enter' && handleAddAdelanto(pedido.id)}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    className="bg-gray-950 border border-gray-600 rounded px-2 py-1 text-sm w-48 text-white focus:border-cyan-500 outline-none"
                                                                    placeholder="Nota (opcional)"
                                                                    value={newAdelantoNota}
                                                                    onChange={e => setNewAdelantoNota(e.target.value)}
                                                                    onKeyDown={e => e.key === 'Enter' && handleAddAdelanto(pedido.id)}
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => handleAddAdelanto(pedido.id)}
                                                                disabled={!newAdelantoMonto}
                                                                className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                                                            >
                                                                Agregar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="text-gray-500 text-xs mt-4 flex justify-between border-t border-gray-700 pt-4">
                <span>Total: {filteredPedidos.length} pedidos</span>
                <div className="flex gap-6">
                    <span>Total Venta: <span className="text-cyan-400 font-medium">S/.{totalVenta.toFixed(2)}</span></span>
                    <span>Cobrado: <span className="text-green-400 font-medium">S/.{totalCobrado.toFixed(2)}</span></span>
                    <span>Pendiente: <span className="text-red-400 font-medium">S/.{(totalVenta - totalCobrado).toFixed(2)}</span></span>
                </div>
            </div>

            {/* CLIENTE MODAL */}
            {filterCliente && (
                <ClienteModal
                    nombre={filterCliente}
                    isOpen={showClienteModal}
                    onClose={() => setShowClienteModal(false)}
                />
            )}
        </div>
    );
}
