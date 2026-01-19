import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { useProcessFlow, usePKLs } from '../hooks/useKPIs';
import { useDatabase } from '../context/DatabaseContext';
import { ProveedorModal } from './ProveedorModal';
import { TIPOS_OPERACION_PKL } from '../types';

// Map PKL states to Process Graph states for filtering
function mapPKLStateToProcessState(pklState: string): string | null {
    const mapping: Record<string, string> = {
        'recibido': 'cotizacion',
        'en_produccion': 'en_produccion',
        'en_curso': 'listo',
        'en_pausa': 'cotizacion',
        'cerrado_ok': 'cerrado',
        'cerrado_parcial': 'cerrado',
        'cancelado': 'cerrado',
    };
    return mapping[pklState] || null;
}

export function ProcessGraph() {
    const containerRef = useRef<HTMLDivElement>(null);
    const networkRef = useRef<Network | null>(null);
    const getFlowData = useProcessFlow();
    const pkls = usePKLs();
    const { pedidos, selectedStateFilter, setSelectedStateFilter, clientes } = useDatabase();

    // New state for provider modal and zoom
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        if (!containerRef.current) return;

        const { nodes, edges } = getFlowData();
        if (nodes.length === 0) return;

        // Highlight selected node
        const nodesWithHighlight = nodes.map(n => {
            if (selectedStateFilter && n.id !== selectedStateFilter) {
                return { ...n, color: { background: '#1f2937', border: '#374151' }, font: { color: '#6b7280' } };
            }
            return n;
        });

        const network = new Network(
            containerRef.current,
            { nodes: nodesWithHighlight, edges },
            {
                layout: {
                    hierarchical: {
                        direction: 'LR',
                        sortMethod: 'directed',
                        levelSeparation: 200,
                        nodeSpacing: 150,
                    },
                },
                physics: false,
                nodes: {
                    borderWidth: 2,
                    shadow: true,
                    font: { color: '#ffffff', size: 14 }
                },
                edges: {
                    color: { color: '#d1d5db' },
                    width: 2,
                    smooth: { enabled: true, type: 'cubicBezier', roundness: 0.5 },
                    arrows: 'to'
                },
                interaction: {
                    hover: true,
                    zoomView: true,
                    dragView: true
                }
            }
        );

        networkRef.current = network;

        // Set canvas background to white
        const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                setSelectedStateFilter(nodeId === selectedStateFilter ? null : nodeId);
            } else {
                setSelectedStateFilter(null);
            }
        });

        // Zoom event listener
        network.on('zoom', () => {
            const scale = network.getScale();
            setZoom(scale);
        });

        return () => { network.destroy(); networkRef.current = null; };
    }, [getFlowData, setSelectedStateFilter, selectedStateFilter]);

    // Derived Summary List for Selected State - Pedidos
    const selectedPedidosSummary = selectedStateFilter ?
        pedidos.filter(p => p.estado === selectedStateFilter)
            .map(p => {
                const firstWord = p.descripcion ? p.descripcion.split(' ')[0] : 'Pedido';
                return {
                    id: p.id,
                    label: firstWord,
                    full: p.descripcion,
                    cliente: p.cliente,
                    proveedor: p.vendedora,
                    type: 'pedido' as const
                };
            })
        : [];

    // Derived Summary List for Selected State - PKLs
    const selectedPKLsSummary = selectedStateFilter ?
        pkls.filter(pkl => mapPKLStateToProcessState(pkl.estado.actual) === selectedStateFilter)
            .map(pkl => {
                const tipoOp = TIPOS_OPERACION_PKL.find(t => t.value === pkl.clasificacion.tipo_operacion);
                return {
                    id: pkl.pkl_id,
                    label: pkl.cliente.nombre,
                    full: pkl.origen.descripcion_inicial,
                    cliente: pkl.cliente.nombre,
                    proveedor: pkl.proveedores[0]?.nombre || null,
                    type: 'pkl' as const,
                    tipoOperacion: tipoOp?.label || pkl.clasificacion.tipo_operacion,
                    tipoColor: tipoOp?.color || 'bg-gray-500',
                    estado: pkl.estado.actual,
                    costoTotal: pkl.costos?.total || 0,
                    tasksTotal: pkl.tasks?.length || 0,
                    tasksCompletadas: pkl.tasks?.filter(t => t.estado === 'completado').length || 0
                };
            })
        : [];

    // Combined list
    const selectedItemsSummary = [...selectedPedidosSummary, ...selectedPKLsSummary];

    const handleZoomIn = () => {
        if (networkRef.current) {
            const currentScale = networkRef.current.getScale();
            networkRef.current.setOptions({ physics: false });
            networkRef.current.moveTo({ scale: Math.min(currentScale * 1.2, 3) });
        }
    };

    const handleZoomOut = () => {
        if (networkRef.current) {
            const currentScale = networkRef.current.getScale();
            networkRef.current.setOptions({ physics: false });
            networkRef.current.moveTo({ scale: Math.max(currentScale / 1.2, 0.3) });
        }
    };

    const handleZoomFit = () => {
        if (networkRef.current) {
            networkRef.current.fit({ animation: true });
        }
    };

    return (
        <div className="flex gap-4">
            {/* Graph Container */}
            <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-0 mb-8 transition-all duration-300 ${selectedStateFilter ? 'w-2/3' : 'w-full'}`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <span>⚡</span>
                        Process Explorer
                        {selectedStateFilter && <span className="text-gray-500 text-sm font-normal ml-2">Filtered: {selectedStateFilter}</span>}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleZoomOut}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
                            title="Zoom out"
                        >
                            <span className="text-xl">−</span>
                        </button>
                        <div className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-700 font-medium min-w-[60px] text-center">
                            {Math.round(zoom * 100)}%
                        </div>
                        <button
                            onClick={handleZoomIn}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
                            title="Zoom in"
                        >
                            <span className="text-xl">+</span>
                        </button>
                        <button
                            onClick={handleZoomFit}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors ml-2 text-sm"
                            title="Fit to view"
                        >
                            🎯
                        </button>
                    </div>
                </div>
                <div
                    ref={containerRef}
                    className="w-full h-[400px] bg-white rounded-b-lg cursor-grab active:cursor-grabbing"
                />
            </div>

            {/* Detail Panel */}
            {selectedStateFilter && (
                <div className="glass-card mb-8 w-1/3 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-gray-700 bg-gray-800/50 rounded-t-lg">
                        <h3 className="font-bold text-lg text-white capitalize">{selectedStateFilter.replace('_', ' ')}</h3>
                        <div className="text-xs text-gray-400">{selectedItemsSummary.length} items activos</div>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[300px] space-y-3">
                        {selectedItemsSummary.length > 0 ? selectedItemsSummary.map(item => {
                            const clientDetails = clientes[item.cliente];
                            const isPKL = item.type === 'pkl';

                            return (
                                <div key={item.id} className={`p-3 rounded border transition-colors shadow-sm ${isPKL ? 'bg-cyan-950/30 border-cyan-700/50 hover:border-cyan-500' : 'bg-gray-800 border-gray-700 hover:border-cyan-500/50'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            {isPKL && (
                                                <span className="text-[10px] font-mono bg-cyan-600/30 text-cyan-300 px-1.5 py-0.5 rounded">PKL</span>
                                            )}
                                            <div className="font-bold text-cyan-400 text-sm">{item.label}</div>
                                        </div>
                                        <div className="text-[10px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                                            {item.id.slice(0, 15)}
                                        </div>
                                    </div>

                                    {/* PKL-specific info */}
                                    {isPKL && 'tipoOperacion' in item && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.tipoColor} text-white`}>
                                                {item.tipoOperacion}
                                            </span>
                                            {item.costoTotal > 0 && (
                                                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                                    S/{item.costoTotal}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">
                                                {item.tasksCompletadas}/{item.tasksTotal} tasks
                                            </span>
                                        </div>
                                    )}

                                    {/* Description */}
                                    {item.full && (
                                        <p className="text-[11px] text-gray-400 mb-2 line-clamp-2">{item.full}</p>
                                    )}

                                    {/* Cliente con Logo */}
                                    {item.cliente && !isPKL && (
                                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-700">
                                            <span className="text-xs text-gray-500">Cliente:</span>
                                            <div className="flex items-center gap-1">
                                                {clientDetails?.logo && (
                                                    <img src={clientDetails.logo} alt="Logo" className="w-4 h-4 rounded-full object-cover" />
                                                )}
                                                <span className="text-xs text-gray-300">{item.cliente}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Provider Link */}
                                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-700">
                                        <span className="text-xs text-gray-500">Prov:</span>
                                        {item.proveedor ? (
                                            <button
                                                onClick={() => setSelectedProvider(item.proveedor)}
                                                className="text-xs text-purple-400 hover:text-purple-300 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                                            >
                                                🏭 {item.proveedor}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-600 italic">No asignado</span>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-gray-500 italic text-center py-4">Sin items en esta etapa</div>
                        )}
                    </div>
                </div>
            )}

            {/* Provider Details Modal */}
            {selectedProvider && (
                <ProveedorModal
                    nombre={selectedProvider}
                    isOpen={true}
                    onClose={() => setSelectedProvider(null)}
                />
            )}
        </div>
    );
}
