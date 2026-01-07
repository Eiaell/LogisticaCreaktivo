import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { useProcessFlow } from '../hooks/useKPIs';

export function ProcessGraph() {
    const containerRef = useRef<HTMLDivElement>(null);
    const getFlowData = useProcessFlow();

    useEffect(() => {
        if (!containerRef.current) return;

        const { nodes, edges } = getFlowData();

        if (nodes.length === 0) return;

        // Use plain arrays instead of DataSet for type compatibility
        const network = new Network(
            containerRef.current,
            { nodes, edges },
            {
                layout: {
                    hierarchical: {
                        direction: 'LR',
                        sortMethod: 'directed',
                        levelSeparation: 180,
                        nodeSpacing: 100,
                    },
                },
                physics: false,
                nodes: {
                    borderWidth: 2,
                    shadow: {
                        enabled: true,
                        color: 'rgba(0,0,0,0.3)',
                        size: 10,
                    },
                },
                edges: {
                    color: { color: '#4b5563', highlight: '#06b6d4' },
                    width: 2,
                    smooth: {
                        enabled: true,
                        type: 'cubicBezier',
                        roundness: 0.5,
                    },
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 100,
                },
            }
        );

        return () => {
            network.destroy();
        };
    }, [getFlowData]);

    return (
        <div className="glass-card p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-cyan-400">⚡</span>
                Process Explorer
            </h2>
            <div
                ref={containerRef}
                className="w-full h-[300px] bg-gray-900/50 rounded-lg"
            />
        </div>
    );
}
