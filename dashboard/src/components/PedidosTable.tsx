import { useState, useMemo } from 'react';
import { usePedidos } from '../hooks/useKPIs';

export function PedidosTable() {
    const pedidos = usePedidos();
    const [search, setSearch] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const estados = useMemo(() => {
        const unique = [...new Set(pedidos.map(p => p.estado))];
        return unique.filter(Boolean);
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
            result = result.filter(p => p.estado === filterEstado);
        }

        result.sort((a, b) => {
            const aVal = String((a as unknown as Record<string, unknown>)[sortField] ?? '');
            const bVal = String((b as unknown as Record<string, unknown>)[sortField] ?? '');
            const cmp = aVal.localeCompare(bVal);
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [pedidos, search, filterEstado, sortField, sortDir]);

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
            en_campo: 'bg-cyan-500/20 text-cyan-300',
            entregado: 'bg-green-500/20 text-green-300',
            cerrado: 'bg-gray-500/20 text-gray-300',
        };
        return colors[estado] || 'bg-gray-500/20 text-gray-300';
    };

    return (
        <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-cyan-400">📋</span>
                Operational View - Pedidos
            </h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Buscar cliente, descripción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 flex-1 min-w-[200px]"
                />
                <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                    <option value="">Todos los estados</option>
                    {estados.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-700">
                            {['Cliente', 'Descripción', 'Vendedora', 'Estado', 'Fecha'].map((header, i) => {
                                const field = ['cliente', 'descripcion', 'vendedora', 'estado', 'created_at'][i];
                                return (
                                    <th
                                        key={header}
                                        onClick={() => handleSort(field)}
                                        className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-cyan-400 transition-colors"
                                    >
                                        {header}
                                        {sortField === field && (
                                            <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPedidos.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">
                                    No hay pedidos que mostrar
                                </td>
                            </tr>
                        ) : (
                            filteredPedidos.map((pedido) => (
                                <tr
                                    key={pedido.id}
                                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                                >
                                    <td className="py-3 px-4 font-medium">{pedido.cliente}</td>
                                    <td className="py-3 px-4 text-gray-300">{pedido.descripcion}</td>
                                    <td className="py-3 px-4 text-gray-400">{pedido.vendedora}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(pedido.estado)}`}>
                                            {pedido.estado}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-400">
                                        {new Date(pedido.created_at).toLocaleDateString('es-PE')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <p className="text-gray-500 text-sm mt-4">
                Mostrando {filteredPedidos.length} de {pedidos.length} pedidos
            </p>
        </div>
    );
}
