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
            title: 'PKLs Activos',
            value: `${kpis.pklsActivos}/${kpis.totalPKLs}`,
            icon: '📋',
            color: kpis.pklsActivos > 0 ? 'from-cyan-600 to-blue-700' : 'from-gray-500 to-gray-600',
        },
        {
            title: 'Valor Pipeline',
            value: `S/. ${kpis.valorPipeline.toLocaleString()}`,
            icon: '💰',
            color: 'from-emerald-500 to-teal-600',
        },
        {
            title: 'Costo PKLs',
            value: `S/. ${kpis.costoPKLs.toLocaleString()}`,
            icon: '💵',
            color: 'from-amber-500 to-yellow-600',
        },
        {
            title: 'Tasa Conversión',
            value: `${kpis.tasaConversion.toFixed(1)}%`,
            icon: '📈',
            color: kpis.tasaConversion >= 50 ? 'from-green-500 to-emerald-600' : 'from-amber-500 to-orange-600',
        },
        {
            title: 'Movilidad Hoy',
            value: `S/. ${kpis.movilidadHoy.toLocaleString()}`,
            icon: '🚕',
            color: 'from-cyan-500 to-teal-600',
        },
        {
            title: 'Alertas',
            value: kpis.alertas,
            icon: '⚠️',
            color: kpis.alertas > 0 ? 'from-red-500 to-pink-600' : 'from-green-500 to-emerald-600',
            action: true
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            {cards.map((card) => (
                <div
                    key={card.title}
                    onClick={() => onCardClick?.(card.title)}
                    className="glass-card p-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 cursor-pointer hover:shadow-xl active:scale-100"
                >
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-10 group-hover:opacity-15 transition-all duration-200`} />
                    <div className="relative">
                        <span className="text-3xl block mb-3 transition-transform duration-200 group-hover:scale-110">{card.icon}</span>
                        <p className="text-gray-400 text-xs font-medium mt-2 uppercase tracking-wider leading-tight">{card.title}</p>
                        <p className="text-2xl font-bold mt-2 leading-none tracking-tight">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
