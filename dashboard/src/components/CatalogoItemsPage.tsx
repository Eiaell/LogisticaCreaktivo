import { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface CatalogoItemsPageProps {
    onBack?: () => void;
}

export function CatalogoItemsPage({ onBack }: CatalogoItemsPageProps) {
    const { lineasPedido, pedidos, getItemsUnicos, getProveedoresPorItem } = useDatabase();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    // Obtener items únicos
    const itemsUnicos = getItemsUnicos();

    // Filtrar items según búsqueda
    const itemsFiltrados = useMemo(() => {
        if (!searchTerm) return itemsUnicos;
        return itemsUnicos.filter((item: string) =>
            item.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [itemsUnicos, searchTerm]);

    // Obtener detalles de líneas para item seleccionado
    const lineasDelItem = useMemo(() => {
        if (!selectedItem) return [];
        return lineasPedido.filter((l: any) => l.item.toLowerCase() === selectedItem.toLowerCase());
    }, [selectedItem, lineasPedido]);

    // Obtener información de pedidos para las líneas
    const detallesLineas = useMemo(() => {
        return lineasDelItem.map((linea: any) => {
            const pedido = pedidos.find(p => p.id === linea.pedido_id);
            return {
                linea,
                pedido,
                cliente: pedido?.cliente || 'Sin cliente',
                estado: pedido?.estado || 'desconocido',
                precio: linea.precio
            };
        });
    }, [lineasDelItem, pedidos]);

    // Estadísticas del item seleccionado
    const stats = useMemo(() => {
        if (!selectedItem) return null;

        const totalPedidos = detallesLineas.length;
        const totalValor = detallesLineas.reduce((sum: number, d: any) => sum + d.precio, 0);
        const proveedoresUnicos = getProveedoresPorItem(selectedItem).length;

        return {
            totalPedidos,
            totalValor,
            proveedoresUnicos
        };
    }, [selectedItem, detallesLineas, getProveedoresPorItem]);

    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
                                title="Volver al Dashboard"
                            >
                                <span className="text-2xl">←</span>
                            </button>
                        )}
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">📦 Catálogo de Items</h1>
                            <p className="text-gray-400">Busca items que se han pedido y ve el histórico</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna izquierda: Búsqueda y lista de items */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Campo de búsqueda */}
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                Buscar Item
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Bolsas, Lanyards, Afiches..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            />
                            <p className="text-xs text-gray-500">
                                {itemsFiltrados.length} item(s) encontrado(s)
                            </p>
                        </div>

                        {/* Lista de items */}
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                            {itemsFiltrados.length === 0 ? (
                                <div className="text-gray-500 text-sm text-center py-8">
                                    No hay items que coincidan
                                </div>
                            ) : (
                                itemsFiltrados.map((item: string) => {
                                    const countPedidos = lineasPedido.filter(
                                        (l: any) => l.item.toLowerCase() === item.toLowerCase()
                                    ).length;

                                    return (
                                        <button
                                            key={item}
                                            onClick={() => setSelectedItem(item)}
                                            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                                                selectedItem === item
                                                    ? 'bg-cyan-600/30 border border-cyan-500 text-cyan-300'
                                                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-750 hover:border-gray-600'
                                            }`}
                                        >
                                            <span className="font-medium">{item}</span>
                                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                                {countPedidos}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Columna derecha: Detalles del item seleccionado */}
                    <div className="lg:col-span-2 space-y-4">
                        {!selectedItem ? (
                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 text-center min-h-96 flex items-center justify-center">
                                <div>
                                    <p className="text-gray-500 text-lg mb-2">👈 Selecciona un item</p>
                                    <p className="text-gray-600 text-sm">para ver el histórico de pedidos y proveedores</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Estadísticas */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-cyan-600/20 border border-cyan-600/50 rounded-lg p-4">
                                        <p className="text-xs text-gray-400 mb-1">Total Pedidos</p>
                                        <p className="text-2xl font-bold text-cyan-400">{stats?.totalPedidos}</p>
                                    </div>
                                    <div className="bg-green-600/20 border border-green-600/50 rounded-lg p-4">
                                        <p className="text-xs text-gray-400 mb-1">Valor Total</p>
                                        <p className="text-2xl font-bold text-green-400">S/. {stats?.totalValor.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-purple-600/20 border border-purple-600/50 rounded-lg p-4">
                                        <p className="text-xs text-gray-400 mb-1">Proveedores</p>
                                        <p className="text-2xl font-bold text-purple-400">{stats?.proveedoresUnicos}</p>
                                    </div>
                                </div>

                                {/* Histórico de pedidos */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-white uppercase">Histórico de Pedidos</h3>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {detallesLineas.length === 0 ? (
                                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center text-gray-500">
                                                Sin pedidos registrados
                                            </div>
                                        ) : (
                                            detallesLineas.map((detalle: any, idx: number) => (
                                                <div
                                                    key={`${detalle.linea.id}-${idx}`}
                                                    className="bg-gray-900 border border-gray-700 rounded-lg p-4"
                                                >
                                                    {/* Header: Cliente + Estado */}
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <p className="font-semibold text-white text-sm">{detalle.cliente}</p>
                                                            <p className="text-xs text-gray-500">Pedido: {detalle.pedido?.id}</p>
                                                        </div>
                                                        <span
                                                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                                                                detalle.estado === 'entregado'
                                                                    ? 'bg-green-600/30 text-green-400'
                                                                    : detalle.estado === 'en_produccion'
                                                                    ? 'bg-amber-600/30 text-amber-400'
                                                                    : 'bg-gray-600/30 text-gray-400'
                                                            }`}
                                                        >
                                                            {detalle.estado}
                                                        </span>
                                                    </div>

                                                    {/* Detalle */}
                                                    <p className="text-xs text-gray-400 mb-3 line-clamp-3">
                                                        {detalle.linea.detalle}
                                                    </p>

                                                    {/* Precio y fecha */}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-cyan-400">
                                                            S/. {detalle.precio.toFixed(2)}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(detalle.linea.created_at).toLocaleDateString('es-PE')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Proveedores que han cotizado (FUTURO) */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-white uppercase">Proveedores que Cotizaron</h3>
                                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center text-gray-500">
                                        <p className="text-xs">Los proveedores aparecerán aquí cuando se asocien cotizaciones</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
