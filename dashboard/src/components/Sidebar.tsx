import type { Cliente, Pedido } from '../types';

interface SidebarProps {
    activeSidebar: 'shortcuts' | 'alerts' | 'recent_orders';
    setActiveSidebar: (view: 'shortcuts' | 'alerts' | 'recent_orders') => void;
    onNewEntity: (type: 'cliente' | 'proveedor') => void;
    recentOrders: Pedido[];
    clientes: Record<string, Cliente>;
}

export function Sidebar({
    activeSidebar,
    setActiveSidebar,
    onNewEntity,
    recentOrders,
    clientes
}: SidebarProps) {

    return (
        <div className="h-full">
            {activeSidebar === 'alerts' && (
                <div className="glass-card p-4 h-full animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-cyan-400">Alertas del Sistema</h3>
                        <button onClick={() => setActiveSidebar('shortcuts')} className="text-gray-500 hover:text-white">✕</button>
                    </div>
                    <div className="space-y-3">
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-sm">
                            <span className="text-green-400 font-bold">✓ Sistema Operativo</span>
                            <p className="text-gray-400">Sin alertas pendientes</p>
                        </div>
                    </div>
                </div>
            )}

            {activeSidebar === 'recent_orders' && (
                <div className="glass-card p-4 h-full animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-blue-400">Pedidos Recientes</h3>
                        <button onClick={() => setActiveSidebar('shortcuts')} className="text-gray-500 hover:text-white">✕</button>
                    </div>
                    <div className="space-y-3">
                        {recentOrders.length > 0 ? recentOrders.map(p => {
                            const clientData = clientes[p.cliente];
                            return (
                                <div key={p.id} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm hover:bg-blue-500/20 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-blue-200 truncate pr-2 flex-1">{p.descripcion?.split(' ')[0] || 'Pedido'}</span>
                                        <span className="text-[10px] text-blue-400 bg-blue-900/50 px-1.5 py-0.5 rounded border border-blue-800/50">{p.estado}</span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        {clientData?.logo ? (
                                            <img src={clientData.logo} alt="Logo" className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/30" />
                                        ) : (
                                            <span className="text-lg leading-none opacity-50">👤</span>
                                        )}
                                        <div className="text-gray-300 text-xs truncate flex-1">{p.cliente}</div>
                                    </div>

                                    <div className="text-right text-xs font-mono text-cyan-300 mt-2 border-t border-blue-500/10 pt-1">
                                        S/.{p.precio?.toFixed(2)}
                                    </div>
                                </div>
                            )
                        }) : <p className="text-gray-500 text-sm">No hay pedidos recientes.</p>}
                    </div>
                </div>
            )}

            {activeSidebar === 'shortcuts' && (
                <div className="flex flex-col gap-4 h-full animate-in fade-in duration-300">
                    <button onClick={() => onNewEntity('cliente')} className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/60 p-6 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all cursor-pointer">
                        <span className="text-4xl group-hover:scale-110 transition-transform mb-2">👤</span>
                        <span className="font-bold text-blue-300 text-lg">Nuevo Cliente</span>
                        <span className="text-xs text-blue-500/60">Agregar al sistema</span>
                    </button>
                    <button onClick={() => onNewEntity('proveedor')} className="flex-1 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 hover:border-purple-500/60 p-6 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all cursor-pointer">
                        <span className="text-4xl group-hover:scale-110 transition-transform mb-2">🏭</span>
                        <span className="font-bold text-purple-300 text-lg">Nuevo Proveedor</span>
                        <span className="text-xs text-purple-500/60">Agregar al sistema</span>
                    </button>
                </div>
            )}
        </div>
    );
}
