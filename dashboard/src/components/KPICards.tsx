import { useKPIs } from '../hooks/useKPIs';

interface Props {
    onCardClick?: (title: string) => void;
}

export function KPICards({ onCardClick }: Props) {
    const kpis = useKPIs();

    if (!kpis) return null;

    const cards = [
        {
            title: 'Total Pedidos',
            value: kpis.totalPedidos,
            icon: '📦',
            color: 'from-blue-500 to-indigo-600',
        },
        {
            title: 'Pedidos Activos',
            value: kpis.pedidosActivos,
            icon: '🔄',
            color: 'from-cyan-500 to-blue-500',
        },
        {
            title: 'Gastos de Producción',
            value: `S/. ${kpis.montoProduccion.toLocaleString()}`,
            icon: '🏭',
            color: 'from-amber-500 to-orange-600',
        },
        {
            title: 'Alertas',
            value: kpis.alertas,
            icon: '⚠️',
            color: kpis.alertas > 0 ? 'from-red-500 to-pink-600' : 'from-green-500 to-emerald-600',
            action: true
        },
        {
            title: 'Movilidad Hoy',
            value: `S/. ${kpis.movilidadHoy.toFixed(2)}`,
            icon: '🚌',
            color: 'from-purple-500 to-violet-600',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {cards.map((card) => (
                <div
                    key={card.title}
                    onClick={() => onCardClick?.(card.title)}
                    className="glass-card p-4 relative overflow-hidden group hover:scale-105 transition-transform cursor-pointer"
                >
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                    <div className="relative">
                        <span className="text-2xl">{card.icon}</span>
                        <p className="text-gray-400 text-sm mt-2">{card.title}</p>
                        <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
