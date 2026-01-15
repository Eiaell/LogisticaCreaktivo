import { createPortal } from 'react-dom';

export type TipoRequerimiento = 'cotizacion' | 'produccion' | 'movimiento' | 'pago';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (tipo: TipoRequerimiento) => void;
}

const OPCIONES_REQUERIMIENTO = [
    {
        tipo: 'cotizacion' as TipoRequerimiento,
        titulo: 'COTIZACIÓN',
        subtitulo: 'Cliente pide algo, necesito cotizar',
        icono: '📝',
        colorBg: 'from-amber-500 to-orange-600',
        colorBorder: 'border-amber-400/50',
        colorHover: 'hover:border-amber-400',
        colorShadow: 'shadow-amber-500/30',
        colorText: 'text-amber-100',
    },
    {
        tipo: 'produccion' as TipoRequerimiento,
        titulo: 'PRODUCCIÓN',
        subtitulo: 'Ya aprobaron, mando a producir',
        icono: '🏭',
        colorBg: 'from-blue-500 to-indigo-600',
        colorBorder: 'border-blue-400/50',
        colorHover: 'hover:border-blue-400',
        colorShadow: 'shadow-blue-500/30',
        colorText: 'text-blue-100',
    },
    {
        tipo: 'movimiento' as TipoRequerimiento,
        titulo: 'MOVIENDO / COMPRANDO / RECOGIENDO',
        subtitulo: 'Estoy en la calle haciendo algo',
        icono: '🚚',
        colorBg: 'from-emerald-500 to-teal-600',
        colorBorder: 'border-emerald-400/50',
        colorHover: 'hover:border-emerald-400',
        colorShadow: 'shadow-emerald-500/30',
        colorText: 'text-emerald-100',
    },
    {
        tipo: 'pago' as TipoRequerimiento,
        titulo: 'PAGANDO / RINDIENDO',
        subtitulo: 'Pagué algo, necesito rendir',
        icono: '💰',
        colorBg: 'from-purple-500 to-fuchsia-600',
        colorBorder: 'border-purple-400/50',
        colorHover: 'hover:border-purple-400',
        colorShadow: 'shadow-purple-500/30',
        colorText: 'text-purple-100',
    },
];

export function NuevoRequerimientoModal({ isOpen, onClose, onSelect }: Props) {
    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-gray-900/95 border border-gray-700 rounded-3xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-cyan-400 to-purple-400">
                            NUEVO REQUERIMIENTO LOGÍSTICO
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">¿Qué necesitas registrar?</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Options Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {OPCIONES_REQUERIMIENTO.map((opcion) => (
                        <button
                            key={opcion.tipo}
                            onClick={() => onSelect(opcion.tipo)}
                            className={`
                                group relative overflow-hidden
                                bg-gradient-to-br ${opcion.colorBg}
                                border-2 ${opcion.colorBorder} ${opcion.colorHover}
                                rounded-2xl p-6 text-left
                                shadow-lg ${opcion.colorShadow} hover:shadow-xl
                                transform hover:scale-[1.02] active:scale-[0.98]
                                transition-all duration-200
                            `}
                        >
                            {/* Background glow effect */}
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />

                            {/* Content */}
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-200">
                                        {opcion.icono}
                                    </span>
                                    <span className="text-white/30 group-hover:text-white/60 transition-colors text-2xl">
                                        →
                                    </span>
                                </div>
                                <h3 className={`font-black text-lg ${opcion.colorText} mb-1 tracking-wide`}>
                                    {opcion.titulo}
                                </h3>
                                <p className="text-white/70 text-sm">
                                    {opcion.subtitulo}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="px-6 pb-6">
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                        <p className="text-gray-400 text-xs text-center">
                            💡 <span className="text-gray-300">Tip:</span> Selecciona la opción que mejor describe lo que estás haciendo ahora mismo
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
