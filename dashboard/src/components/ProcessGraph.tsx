import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { useProcessFlow, usePedidos } from '../hooks/useKPIs';
import { useDatabase } from '../context/DatabaseContext';
import { ProveedorModal } from './ProveedorModal'; // Import new modal

export function ProcessGraph() {
    const containerRef = useRef<HTMLDivElement>(null);
    const getFlowData = useProcessFlow();
    const pedidos = usePedidos(); // Get data to show summaries
    const { setSelectedStateFilter, selectedStateFilter } = useDatabase();

    // New state for provider modal
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

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
                        levelSeparation: 150,
                        nodeSpacing: 100,
                    },
                },
                physics: false,
                nodes: {
                    borderWidth: 2,
                    shadow: true,
                    font: { color: '#ffffff', size: 14 }
                },
                edges: {
                    color: { color: '#4b5563' },
                    width: 2,
                    smooth: { enabled: true, type: 'cubicBezier', roundness: 0.5 },
                    arrows: 'to'
                },
                interaction: { hover: true },
            }
        );

        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                setSelectedStateFilter(nodeId === selectedStateFilter ? null : nodeId);
            } else {
                setSelectedStateFilter(null);
            }
        });

        return () => { network.destroy(); };
    }, [getFlowData, setSelectedStateFilter, selectedStateFilter]);

    // Derived Summary List for Selected State
    const selectedItemsSummary = selectedStateFilter ?
        pedidos.filter(p => p.estado === selectedStateFilter || (selectedStateFilter === 'listo_recoger' && p.estado === 'en_campo'))
            .map(p => {
                const firstWord = p.descripcion ? p.descripcion.split(' ')[0] : 'Pedido';
                return {
                    id: p.id,
                    label: firstWord,
                    full: p.descripcion,
                    cliente: p.cliente,
                    proveedor: p.vendedora // Using 'vendedora' field as Provider (based on extraction logic)
                };
            })
        : [];

    return (
        <div className="flex gap-4">
            {/* Graph Container */}
            <div className={`glass-card p-6 mb-8 transition-all duration-300 ${selectedStateFilter ? 'w-2/3' : 'w-full'}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-cyan-400">⚡</span>
                    Process Explorer
                    {selectedStateFilter && <span className="text-gray-500 text-sm font-normal ml-2">Filtered: {selectedStateFilter}</span>}
                </h2>
                <div
                    ref={containerRef}
                    className="w-full h-[300px] bg-gray-900/50 rounded-lg cursor-pointer"
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
                        {selectedItemsSummary.length > 0 ? selectedItemsSummary.map(item => (
                            <div key={item.id} className="bg-gray-800 p-3 rounded border border-gray-700 hover:border-cyan-500/50 transition-colors shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-bold text-cyan-400 text-sm">{item.label}</div>
                                    <div className="text-[10px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                                        {item.cliente?.slice(0, 15)}
                                    </div>
                                </div>

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
                        )) : (
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
