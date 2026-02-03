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

        // Set canvas background to match theme
        const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
            const isDark = !document.documentElement.classList.contains('light');
            const context = canvas.getContext('2d');
            if (context) {
                context.fillStyle = isDark ? '#1f2937' : '#ffffff';
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
            <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-0 mb-8 transition-all duration-300 ${selectedStateFilter ? 'w-2/3' : 'w-full'}`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>⚡</span>
                        Process Explorer
                        {selectedStateFilter && <span className="text-gray-500 text-sm font-normal ml-2">Filtered: {selectedStateFilter}</span>}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleZoomOut}
                            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Zoom out"
                        >
                            <span className="text-xl">−</span>
                        </button>
                        <div className="px-3 py-2 bg-gray-900 rounded text-sm text-gray-300 font-medium min-w-[60px] text-center">
                            {Math.round(zoom * 100)}%
                        </div>
                        <button
                            onClick={handleZoomIn}
                            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Zoom in"
                        >
                            <span className="text-xl">+</span>
                        </button>
                        <button
                            onClick={handleZoomFit}
                            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors ml-2 text-sm"
                            title="Fit to view"
                        >
                            🎯
                        </button>
                    </div>
                </div>
                <div
                    ref={containerRef}
                    className="w-full h-[400px] bg-gray-800 rounded-b-lg cursor-grab active:cursor-grabbing"
                />
            </div>

            {/* Detail Panel - Clean List Design */}
            {selectedStateFilter && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm mb-8 w-1/3 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="px-4 py-3 border-b border-gray-700">
                        <h3 className="font-semibold text-white capitalize">{selectedStateFilter.replace('_', ' ')}</h3>
                        <div className="text-xs text-gray-500">{selectedItemsSummary.length} items</div>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] divide-y divide-gray-700/50">
                        {selectedItemsSummary.length > 0 ? selectedItemsSummary.map(item => {
                            const clientDetails = clientes[item.cliente];
                            const isPKL = item.type === 'pkl';

                            return (
                                <div key={item.id} className="px-4 py-3 hover:bg-gray-700/50 transition-colors cursor-pointer">
                                    {/* Header: Logo + Cliente + ID */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {clientDetails?.logo && (
                                                <img src={clientDetails.logo} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                            )}
                                            <span className="font-medium text-white truncate">{item.label}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                                            {isPKL ? item.id.replace('PKL-', '').slice(-9) : item.id.slice(0, 8)}
                                        </span>
                                    </div>

                                    {/* PKL Badge + Tasks */}
                                    {isPKL && 'tipoOperacion' in item && (
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.tipoColor} text-white`}>
                                                {item.tipoOperacion}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {item.tasksCompletadas}/{item.tasksTotal} tasks
                                            </span>
                                        </div>
                                    )}

                                    {/* Description - truncated to 1 line */}
                                    {item.full && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.full}</p>
                                    )}

                                    {/* Provider - subtle link */}
                                    {item.proveedor && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedProvider(item.proveedor); }}
                                            className="text-[11px] text-purple-600 hover:text-purple-700 mt-1.5 flex items-center gap-1"
                                        >
                                            <span className="opacity-60">→</span> {item.proveedor}
                                        </button>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="text-gray-400 italic text-center py-8 text-sm">Sin items en esta etapa</div>
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
