import { useState, useMemo, useEffect, useRef } from 'react';
import React from 'react';
import { usePedidos } from '../hooks/useKPIs';
import { useDatabase } from '../context/DatabaseContext';
import { ClienteModal } from './ClienteModal';

export function PedidosTable() {
    // Get shared state
    const pedidos = usePedidos();
    const { updatePedido, addPayment, payments, selectedStateFilter, clientes, updateCliente, uploadLogo } = useDatabase();

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
    const [visibleAdelantosCount, setVisibleAdelantosCount] = useState(0);

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

    const [sortField, setSortField] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');


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
            updatePedido(editingCell.id, { [editingCell.field]: val });
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

    // Derived lists
    const clientesList = useMemo(() => {
        const set = new Set(pedidos.map(p => p.cliente).filter(Boolean));
        return Array.from(set).sort();
    }, [pedidos]);

    const estados = useMemo(() => {
        const set = new Set(pedidos.map(p => p.estado).filter(Boolean));
        return Array.from(set).sort();
    }, [pedidos]);

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
            if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
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
                            <h2 className="text-2xl font-bold text-white">{filterCliente}</h2>
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

            {/* Filters Bar */}
            <div className="flex flex-wrap gap-4 mb-4 items-center bg-gray-900/40 p-3 rounded-lg border border-gray-800">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Buscar global..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm "
                    />
                </div>

                {/* Client Select */}
                <select
                    value={filterCliente}
                    onChange={(e) => setFilterCliente(e.target.value)}
                    className={`px-4 py-2 border rounded-lg focus:outline-none focus:border-cyan-500 text-sm min-w-[200px] ${filterCliente ? 'bg-blue-900/20 border-blue-500 text-blue-200' : 'bg-gray-950 border-gray-700 text-gray-300'}`}
                >
                    <option value="" className="bg-gray-950 text-gray-300">👤 Todos los Clientes</option>
                    {clientesList.map(c => (
                        <option key={c} value={c} className="bg-gray-950 text-gray-300">{c}</option>
                    ))}
                </select>

                <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm text-gray-300"
                >
                    <option value="" className="bg-gray-950 text-gray-300">⚡ Todos los Estados</option>
                    {estados.map(estado => (
                        <option key={estado} value={estado} className="bg-gray-950 text-gray-300">{estado}</option>
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
                                { label: 'Vendedor/a', w: 'w-32' },
                                { label: 'Estado', w: 'w-40' },
                                { label: 'RQ', w: 'w-24' },
                                { label: 'Precio', w: 'w-32' },
                                { label: 'Pagado', w: 'w-32' },
                                { label: 'Saldo', w: 'w-32' },
                                { label: '', w: 'w-10' }
                            ].map((col, idx) => (
                                <React.Fragment key={idx}>
                                    <th className={`p-4 text-left font-medium ${col.w}`}>{col.label}</th>
                                    {col.label === 'Precio' && Array.from({ length: visibleAdelantosCount }).map((_, i) => (
                                        <th key={`adelanto-head-${i}`} className="p-4 text-left font-medium w-32 border-l border-gray-800 bg-gray-900/40 text-emerald-500/80">
                                            Adelanto {i + 1}
                                        </th>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPedidos.map((pedido) => (
                            <React.Fragment key={pedido.id}>
                                <tr
                                    className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors group ${expandedRowId === pedido.id ? 'bg-blue-950/20' : ''}`}
                                >
                                    <td className="p-4 align-middle">
                                        <div
                                            className="flex items-center gap-3 font-bold text-gray-100 hover:text-cyan-400 cursor-pointer transition-colors group/client"
                                            onClick={() => {
                                                setFilterCliente(pedido.cliente);
                                                setShowClienteModal(true);
                                            }}
                                        >
                                            <div className="relative w-8 h-8 flex-shrink-0 bg-gray-900 rounded-full border border-gray-800 overflow-hidden shadow-inner">
                                                {clientes[pedido.cliente]?.logo ? (
                                                    <img
                                                        src={clientes[pedido.cliente].logo}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            console.warn("Logo failed for:", pedido.cliente);
                                                            (e.target as HTMLImageElement).style.opacity = '0';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">
                                                        👤
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col leading-tight">
                                                <span>{pedido.cliente}</span>
                                                <span className="text-[10px] text-gray-500 font-mono font-normal">{pedido.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle hover:text-cyan-400 cursor-pointer transition-colors" onClick={() => handleEditStart(pedido.id, 'descripcion', pedido.descripcion)}>
                                        {editingCell?.id === pedido.id && editingCell?.field === 'descripcion' ? (
                                            <input
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onBlur={handleEditSave}
                                                onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                                                className="bg-gray-950 border border-cyan-500 rounded px-2 py-1 w-full outline-none"
                                            />
                                        ) : (
                                            <div className="truncate max-w-[240px]" title={pedido.descripcion}>{pedido.descripcion}</div>
                                        )}
                                    </td>
                                    <td
                                        className="p-4 align-middle cursor-pointer transition-colors group/seller"
                                        onClick={() => handleEditStart(pedido.id, 'vendedora', pedido.vendedora)}
                                        title="Click para editar vendedor/a"
                                    >
                                        {editingCell?.id === pedido.id && editingCell?.field === 'vendedora' ? (
                                            <input
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onBlur={handleEditSave}
                                                onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                                                className="bg-gray-950 border border-cyan-500 rounded px-2 py-1 w-full outline-none text-cyan-400"
                                            />
                                        ) : (
                                            <div className="text-gray-300 group-hover/seller:text-cyan-400 transition-colors font-medium">
                                                {pedido.vendedora || '(Sin asignar)'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle">
                                        {editingCell?.id === pedido.id && editingCell?.field === 'estado' ? (
                                            <select
                                                autoFocus
                                                value={editValue}
                                                onChange={e => {
                                                    setEditValue(e.target.value);
                                                    const newVal = e.target.value;
                                                    updatePedido(pedido.id, { estado: newVal });
                                                    setEditingCell(null);
                                                }}
                                                onBlur={() => setEditingCell(null)}
                                                className="bg-gray-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white outline-none w-full"
                                            >
                                                <option value="cotizacion">Cotización</option>
                                                <option value="aprobado">Aprobado</option>
                                                <option value="en_produccion">En Producción</option>
                                                <option value="listo_recoger">Listo Recoger</option>
                                                <option value="entregado">Entregado</option>
                                                <option value="cerrado">Cerrado</option>
                                                <option value="cancelado">Cancelado</option>
                                            </select>
                                        ) : (
                                            <span
                                                onClick={() => handleEditStart(pedido.id, 'estado', pedido.estado)}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:ring-1 hover:ring-cyan-500 transition-all
                                                ${pedido.estado === 'cancelado' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                {pedido.estado.replace('_', ' ')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle font-mono text-gray-500 italic">
                                        {pedido.rq_numero || '-'}
                                    </td>
                                    <td className="p-4 align-middle font-mono text-gray-100 group/price">
                                        <div className="flex items-center gap-2">
                                            {editingCell?.id === pedido.id && editingCell?.field === 'precio' ? (
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={handleEditSave}
                                                    onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                                                    className="bg-gray-950 border border-cyan-500 rounded px-2 py-1 w-24 outline-none font-mono"
                                                />
                                            ) : (
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:text-cyan-400 transition-colors"
                                                    onClick={() => handleEditStart(pedido.id, 'precio', pedido.precio)}
                                                >
                                                    <span className="text-gray-500">S/.</span>
                                                    {(pedido.precio || 0).toFixed(2)}
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setVisibleAdelantosCount(prev => prev + 1);
                                                }}
                                                className="opacity-0 group-hover/price:opacity-100 w-5 h-5 bg-emerald-600 hover:bg-emerald-500 rounded text-white flex items-center justify-center text-xs transition-all shadow-lg shadow-emerald-900/20"
                                                title="Mostrar Adelanto"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    {Array.from({ length: visibleAdelantosCount }).map((_, i) => {
                                        const pedidoPayments = payments.filter(pay => pay.pedidoId === pedido.id).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                                        const payment = pedidoPayments[i];
                                        return (
                                            <td key={`adelanto-cell-${pedido.id}-${i}`} className="p-4 align-middle font-mono text-gray-400 border-l border-gray-800/50 bg-gray-900/10">
                                                {payment ? (
                                                    <span className="flex flex-col">
                                                        <span>S/. {payment.monto.toFixed(2)}</span>
                                                        <span className="text-[9px] text-gray-600 truncate max-w-[80px]">{payment.nota}</span>
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="p-4 align-middle font-mono text-emerald-400">
                                        <span className="flex items-center gap-1">
                                            <span className="text-emerald-900">S/.</span>
                                            {(pedido.pagado || 0).toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle font-mono font-bold">
                                        <span className={`flex items-center gap-1 ${(pedido.precio || 0) - (pedido.pagado || 0) > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                            <span className="opacity-30">S/.</span>
                                            {((pedido.precio || 0) - (pedido.pagado || 0)).toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <button
                                            onClick={() => toggleExpand(pedido.id)}
                                            className="w-8 h-8 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors text-gray-500 hover:text-white"
                                        >
                                            {expandedRowId === pedido.id ? '▲' : '▼'}
                                        </button>
                                    </td>
                                </tr>

                                {/* Expanded Row: Payments Detail */}
                                {expandedRowId === pedido.id && (
                                    <tr className="bg-gray-900/30">
                                        <td colSpan={9 + visibleAdelantosCount} className="p-0 border-b border-gray-800">
                                            <div className="p-6 flex flex-col md:flex-row gap-8 animate-in slide-in-from-top-2 duration-200">
                                                {/* Left: Payment List */}
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
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {filteredPedidos.length === 0 && (
                <div className="p-20 text-center flex flex-col items-center">
                    <span className="text-6xl mb-4 grayscale opacity-20">🔍</span>
                    <h3 className="text-gray-400 font-medium">No encontramos pedidos con estos filtros</h3>
                    <p className="text-gray-600 text-sm mt-1">Intenta ajustando los términos de búsqueda</p>
                </div>
            )}

            {showClienteModal && filterCliente && (
                <ClienteModal
                    nombre={filterCliente}
                    isOpen={showClienteModal}
                    onClose={() => setShowClienteModal(false)}
                />
            )}
        </div>
    );
}
