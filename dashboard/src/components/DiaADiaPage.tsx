import { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import type { MovimientoLogistico, Rendicion, EventoProduccion } from '../types';
import { EditarEventoModal } from './EditarEventoModal';
import { SincronizarEventoModal } from './SincronizarEventoModal';

interface DiaADiaPageProps {
    onBack: () => void;
}

// Nombres de días y meses en español
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_SEMANA_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Componente de Calendario Premium - Inspirado en HeroUI y mejores prácticas
interface CalendarioProps {
    fechasConEventos: Record<string, { movimientos: number; rendiciones: number; producciones: number; totalMonto: number }>;
    selectedDate: string | null;
    onSelectDate: (date: string) => void;
    onClose?: () => void;
}

function CalendarioModerno({ fechasConEventos, selectedDate, onSelectDate, onClose }: CalendarioProps) {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const fechas = Object.keys(fechasConEventos).sort().reverse();
        if (fechas.length > 0) {
            const [year, month] = fechas[0].split('-').map(Number);
            return new Date(year, month - 1, 1);
        }
        return new Date();
    });
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Obtener días del mes
    const getDaysInMonth = useCallback((date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean; dayOfWeek: number }[] = [];

        // Días del mes anterior
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push({ date: dateStr, day, isCurrentMonth: false, isToday: false, dayOfWeek: (startingDay - i - 1 + 7) % 7 });
        }

        // Días del mes actual
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, month, day).getDay();
            days.push({
                date: dateStr,
                day,
                isCurrentMonth: true,
                isToday: dateStr === todayStr,
                dayOfWeek
            });
        }

        // Días del mes siguiente
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = new Date(nextYear, nextMonth, day).getDay();
            days.push({ date: dateStr, day, isCurrentMonth: false, isToday: false, dayOfWeek });
        }

        return days;
    }, [todayStr]);

    const days = getDaysInMonth(currentMonth);

    const goToPrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    const goToToday = () => {
        setCurrentMonth(new Date());
        if (fechasConEventos[todayStr]) {
            onSelectDate(todayStr);
            onClose?.();
        }
    };
    const goToPrevYear = () => setCurrentMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    const goToNextYear = () => setCurrentMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));

    const getEventIndicators = (dateStr: string) => fechasConEventos[dateStr] || null;

    // Calcular estadísticas del mes actual
    const monthStats = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        let totalEventos = 0;
        let totalMonto = 0;
        let diasConEventos = 0;

        Object.entries(fechasConEventos).forEach(([fecha, data]) => {
            const [y, m] = fecha.split('-').map(Number);
            if (y === year && m === month + 1) {
                totalEventos += data.movimientos + data.rendiciones + data.producciones;
                totalMonto += data.totalMonto;
                diasConEventos++;
            }
        });

        return { totalEventos, totalMonto, diasConEventos };
    }, [currentMonth, fechasConEventos]);

    // Información del día hovereado o seleccionado
    const previewDate = hoveredDate || selectedDate;
    const previewData = previewDate ? getEventIndicators(previewDate) : null;

    return (
        <div
            className="w-full max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl"
            style={{
                background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
                border: '1px solid rgba(75, 85, 99, 0.4)',
                backdropFilter: 'blur(20px)'
            }}
        >
            {/* Header Premium */}
            <div
                className="relative p-6 pb-4"
                style={{
                    background: 'linear-gradient(135deg, #0891b2 0%, #6366f1 50%, #8b5cf6 100%)'
                }}
            >
                {/* Patrón decorativo */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Navegación del año */}
                <div className="relative flex items-center justify-between mb-4">
                    <button
                        onClick={goToPrevYear}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
                        title="Año anterior"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setShowYearPicker(!showYearPicker)}
                        className="text-white/90 hover:text-white font-bold text-lg tracking-wider transition-colors px-4 py-1 rounded-lg hover:bg-white/10"
                    >
                        {currentMonth.getFullYear()}
                    </button>

                    <button
                        onClick={goToNextYear}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
                        title="Año siguiente"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Navegación del mes */}
                <div className="relative flex items-center justify-between">
                    <button
                        onClick={goToPrevMonth}
                        className="p-3 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all hover:scale-105 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setShowMonthPicker(!showMonthPicker)}
                        className="text-center group"
                    >
                        <h2 className="text-3xl font-black text-white tracking-tight group-hover:scale-105 transition-transform">
                            {MESES[currentMonth.getMonth()]}
                        </h2>
                    </button>

                    <button
                        onClick={goToNextMonth}
                        className="p-3 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all hover:scale-105 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Estadísticas del mes */}
                <div className="relative flex justify-center gap-6 mt-4 pt-4 border-t border-white/20">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{monthStats.diasConEventos}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wider">Días activos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{monthStats.totalEventos}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wider">Eventos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-amber-300">S/. {monthStats.totalMonto.toFixed(0)}</div>
                        <div className="text-xs text-white/70 uppercase tracking-wider">Total</div>
                    </div>
                </div>

                {/* Selector de mes */}
                {showMonthPicker && (
                    <div className="absolute left-4 right-4 top-full mt-2 p-4 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl z-50 grid grid-cols-3 gap-2">
                        {MESES.map((mes, idx) => (
                            <button
                                key={mes}
                                onClick={() => {
                                    setCurrentMonth(new Date(currentMonth.getFullYear(), idx, 1));
                                    setShowMonthPicker(false);
                                }}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                    currentMonth.getMonth() === idx
                                        ? 'bg-cyan-500 text-white'
                                        : 'text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                {mes.substring(0, 3)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Cuerpo del calendario */}
            <div className="p-6">
                {/* Botón de hoy */}
                <button
                    onClick={goToToday}
                    className="w-full mb-5 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
                    style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        color: '#22d3ee'
                    }}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Ir al día de hoy
                </button>

                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-2 mb-3">
                    {DIAS_SEMANA.map((dia, idx) => (
                        <div
                            key={dia}
                            className={`text-center text-xs font-bold uppercase tracking-wider py-2 rounded-lg ${
                                idx === 0 || idx === 6 ? 'text-rose-400/70' : 'text-gray-500'
                            }`}
                        >
                            {dia}
                        </div>
                    ))}
                </div>

                {/* Grilla de días */}
                <div className="grid grid-cols-7 gap-2">
                    {days.map((dayInfo, index) => {
                        const eventos = getEventIndicators(dayInfo.date);
                        const isSelected = selectedDate === dayInfo.date;
                        const hasEvents = eventos !== null;
                        const isHovered = hoveredDate === dayInfo.date;
                        const isWeekend = dayInfo.dayOfWeek === 0 || dayInfo.dayOfWeek === 6;

                        return (
                            <button
                                key={index}
                                onClick={() => {
                                    if (hasEvents) {
                                        onSelectDate(dayInfo.date);
                                        onClose?.();
                                    }
                                }}
                                onMouseEnter={() => setHoveredDate(dayInfo.date)}
                                onMouseLeave={() => setHoveredDate(null)}
                                disabled={!hasEvents && dayInfo.isCurrentMonth}
                                className={`
                                    relative h-14 rounded-xl flex flex-col items-center justify-center
                                    transition-all duration-200 group
                                    ${!dayInfo.isCurrentMonth ? 'opacity-30' : ''}
                                    ${isSelected
                                        ? 'scale-110 z-10'
                                        : hasEvents
                                            ? 'hover:scale-105 cursor-pointer'
                                            : 'cursor-default'
                                    }
                                `}
                                style={{
                                    background: isSelected
                                        ? 'linear-gradient(135deg, #0891b2 0%, #6366f1 100%)'
                                        : hasEvents
                                            ? isHovered
                                                ? 'rgba(75, 85, 99, 0.6)'
                                                : 'rgba(55, 65, 81, 0.4)'
                                            : 'transparent',
                                    border: isSelected
                                        ? '2px solid rgba(34, 211, 238, 0.6)'
                                        : dayInfo.isToday
                                            ? '2px solid rgba(251, 191, 36, 0.6)'
                                            : hasEvents
                                                ? '1px solid rgba(75, 85, 99, 0.5)'
                                                : '1px solid transparent',
                                    boxShadow: isSelected
                                        ? '0 8px 25px rgba(6, 182, 212, 0.4), 0 4px 10px rgba(0, 0, 0, 0.3)'
                                        : hasEvents && isHovered
                                            ? '0 4px 15px rgba(0, 0, 0, 0.3)'
                                            : 'none'
                                }}
                            >
                                <span
                                    className={`text-base font-semibold ${
                                        isSelected
                                            ? 'text-white'
                                            : dayInfo.isToday
                                                ? 'text-amber-400'
                                                : hasEvents
                                                    ? 'text-white'
                                                    : isWeekend && dayInfo.isCurrentMonth
                                                        ? 'text-rose-400/50'
                                                        : 'text-gray-600'
                                    }`}
                                >
                                    {dayInfo.day}
                                </span>

                                {/* Indicadores de eventos */}
                                {hasEvents && (
                                    <div className="flex gap-1 mt-1">
                                        {eventos.movimientos > 0 && (
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: '#3b82f6' }}
                                                title={`${eventos.movimientos} movimientos`}
                                            />
                                        )}
                                        {eventos.rendiciones > 0 && (
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: '#f97316' }}
                                                title={`${eventos.rendiciones} rendiciones`}
                                            />
                                        )}
                                        {eventos.producciones > 0 && (
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: '#8b5cf6' }}
                                                title={`${eventos.producciones} producciones`}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Badge de hoy */}
                                {dayInfo.isToday && !isSelected && (
                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Preview del día hover/seleccionado */}
                {previewData && previewDate && (
                    <div
                        className="mt-5 p-4 rounded-xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(55, 65, 81, 0.5) 0%, rgba(31, 41, 55, 0.5) 100%)',
                            border: '1px solid rgba(75, 85, 99, 0.5)'
                        }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-white font-semibold">
                                    {DIAS_SEMANA_FULL[new Date(previewDate + 'T12:00:00').getDay()]}
                                </p>
                                <p className="text-gray-400 text-sm">{previewDate}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-amber-400">S/. {previewData.totalMonto.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            {previewData.movimientos > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                                    <span>🚚</span>
                                    <span className="text-blue-400 font-medium">{previewData.movimientos}</span>
                                </div>
                            )}
                            {previewData.rendiciones > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}>
                                    <span>💰</span>
                                    <span className="text-orange-400 font-medium">{previewData.rendiciones}</span>
                                </div>
                            )}
                            {previewData.producciones > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
                                    <span>🏭</span>
                                    <span className="text-violet-400 font-medium">{previewData.producciones}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Leyenda */}
                <div className="mt-5 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center justify-center gap-6 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                            <span className="text-gray-400">Movimientos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                            <span className="text-gray-400">Rendiciones</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                            <span className="text-gray-400">Producción</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Función para formatear fecha
function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00'); // Forzar mediodía para evitar problemas de timezone
    return date.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para obtener fecha en formato YYYY-MM-DD
function getDateKey(dateStr: string): string {
    if (!dateStr) return '';
    // Si ya es YYYY-MM-DD, retornarlo
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Si es un timestamp ISO
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

// Iconos y colores por tipo de movimiento
const MOVIMIENTO_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
    entrega: { icon: '📦', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
    recojo: { icon: '🚚', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
    compra: { icon: '🛒', color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/30' },
    traslado: { icon: '🔄', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/30' },
};

// Iconos y colores por tipo de rendición
const RENDICION_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
    movilidad: { icon: '🚕', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20 border-cyan-500/30' },
    adelanto_produccion: { icon: '💰', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30' },
    pago_saldo: { icon: '✅', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30' },
    gasto_extra: { icon: '📋', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
    compra_material: { icon: '🛍️', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20 border-indigo-500/30' },
};

// Componente para mostrar logo de cliente
function ClienteLogo({ logoUrl, nombre, size = 'md' }: { logoUrl?: string | null; nombre: string; size?: 'sm' | 'md' }) {
    const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={nombre}
                className={`${sizeClasses} rounded-lg object-cover border border-gray-700`}
            />
        );
    }

    // Placeholder con iniciales
    const iniciales = nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    return (
        <div className={`${sizeClasses} rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center`}>
            <span className={`${textSize} font-bold text-gray-400`}>{iniciales}</span>
        </div>
    );
}

// Componente para mostrar un movimiento
function MovimientoCard({ movimiento, onEdit, onDelete, onSync, clienteLogo }: {
    movimiento: MovimientoLogistico;
    onEdit: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
}) {
    const config = MOVIMIENTO_CONFIG[movimiento.tipo] || MOVIMIENTO_CONFIG.traslado;
    const detalle = movimiento.detalle as any;

    // Construir resumen según tipo
    let resumen = '';
    if (detalle?.items && Array.isArray(detalle.items)) {
        resumen = detalle.items.map((i: any) => `${i.cantidad} ${i.producto}`).join(', ');
    } else if (detalle?.origen) {
        resumen = `${detalle.origen}${detalle.destino ? ` → ${detalle.destino}` : ''}`;
        if (detalle.item) resumen += ` (${detalle.item})`;
    }

    return (
        <div className={`border rounded-xl p-4 ${config.bgColor} group relative cursor-pointer hover:border-cyan-500/50 transition-all`} onClick={onEdit}>
            {/* Botones de acción (hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                    title="Editar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
                    title="Eliminar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div className="flex items-start gap-3">
                <div className="text-2xl">{config.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold uppercase text-sm ${config.color}`}>
                            {movimiento.tipo}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                            movimiento.estado === 'completado' ? 'bg-green-500/30 text-green-400' : 'bg-yellow-500/30 text-yellow-400'
                        }`}>
                            {movimiento.estado}
                        </span>
                    </div>

                    {movimiento.cliente && (
                        <div className="flex items-center gap-2">
                            <ClienteLogo logoUrl={clienteLogo} nombre={movimiento.cliente} size="sm" />
                            <span className="text-white font-medium">{movimiento.cliente}</span>
                        </div>
                    )}

                    {resumen && (
                        <p className="text-gray-400 text-sm mt-1">{resumen}</p>
                    )}

                    {movimiento.observaciones && (
                        <p className="text-gray-500 text-xs mt-2 italic">"{movimiento.observaciones}"</p>
                    )}

                    {movimiento.costo_movilidad && Number(movimiento.costo_movilidad) > 0 && (
                        <p className="text-amber-400 font-mono text-sm mt-2">
                            Costo: S/. {Number(movimiento.costo_movilidad).toFixed(2)}
                        </p>
                    )}

                    {/* Botón de sincronización */}
                    {movimiento.pedido_id ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                                ✓ Vinculado a pedido
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            🚀 Sincronizar con Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente para mostrar una rendición
function RendicionCard({ rendicion, onEdit, onDelete, onSync, clienteLogo }: {
    rendicion: Rendicion;
    onEdit: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
}) {
    const config = RENDICION_CONFIG[rendicion.tipo] || RENDICION_CONFIG.gasto_extra;
    const detalle = rendicion.detalle as any;

    return (
        <div className={`border rounded-xl p-4 ${config.bgColor} group relative cursor-pointer hover:border-orange-500/50 transition-all`} onClick={onEdit}>
            {/* Botones de acción (hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                    title="Editar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
                    title="Eliminar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div className="flex items-start gap-3">
                <div className="text-2xl">{config.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold uppercase text-sm ${config.color}`}>
                            {rendicion.tipo.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                            rendicion.estado === 'pagado' ? 'bg-green-500/30 text-green-400' : 'bg-yellow-500/30 text-yellow-400'
                        }`}>
                            {rendicion.estado}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {rendicion.cliente && (
                            <>
                                <ClienteLogo logoUrl={clienteLogo} nombre={rendicion.cliente} size="sm" />
                                <span className="text-cyan-400 text-sm">{rendicion.cliente}</span>
                            </>
                        )}
                        {rendicion.cliente && rendicion.proveedor && (
                            <span className="text-gray-600">→</span>
                        )}
                        {rendicion.proveedor && (
                            <span className="text-orange-400 text-sm">{rendicion.proveedor}</span>
                        )}
                    </div>

                    {detalle?.concepto && (
                        <p className="text-gray-400 text-sm mt-1">{detalle.concepto}</p>
                    )}

                    {rendicion.observaciones && (
                        <p className="text-gray-500 text-xs mt-2 italic">"{rendicion.observaciones}"</p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                            {rendicion.tiene_comprobante && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                                    Con comprobante
                                </span>
                            )}
                        </div>
                        <p className="text-amber-400 font-bold text-lg">
                            S/. {Number(rendicion.monto).toFixed(2)}
                        </p>
                    </div>

                    {/* Botón de sincronización */}
                    {rendicion.pedido_id ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                                ✓ Vinculado a pedido
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            🚀 Sincronizar con Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente para mostrar un evento de producción
function ProduccionCard({ evento, onEdit, onDelete, onSync, clienteLogo }: {
    evento: EventoProduccion;
    onEdit: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
}) {
    const especificaciones = evento.especificaciones as Record<string, any> || {};

    return (
        <div className="border rounded-xl p-4 bg-indigo-500/20 border-indigo-500/30 group relative cursor-pointer hover:border-indigo-500/50 transition-all" onClick={onEdit}>
            {/* Botones de acción (hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                    title="Editar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
                    title="Eliminar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div className="flex items-start gap-3">
                <div className="text-2xl">🏭</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold uppercase text-sm text-indigo-400">
                            Producción
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                            evento.estado === 'completado' ? 'bg-green-500/30 text-green-400' :
                            evento.estado === 'en_produccion' ? 'bg-blue-500/30 text-blue-400' :
                            'bg-yellow-500/30 text-yellow-400'
                        }`}>
                            {evento.estado}
                        </span>
                    </div>

                    <p className="text-white font-medium">{evento.producto}</p>

                    <div className="flex items-center gap-2 mt-1">
                        {evento.cliente && (
                            <ClienteLogo logoUrl={clienteLogo} nombre={evento.cliente} size="sm" />
                        )}
                        <span className="text-cyan-400 text-sm">{evento.cliente}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-orange-400 text-sm">{evento.proveedor}</span>
                    </div>

                    {evento.cantidad && (
                        <p className="text-gray-400 text-sm mt-1">Cantidad: {evento.cantidad}</p>
                    )}

                    {/* Especificaciones */}
                    {Object.keys(especificaciones).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                            {Object.entries(especificaciones).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                    {key}: <span className="text-gray-400">{String(value)}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {evento.observaciones && (
                        <p className="text-gray-500 text-xs mt-2 italic">"{evento.observaciones}"</p>
                    )}

                    {evento.precio_total && (
                        <p className="text-amber-400 font-bold text-lg mt-2">
                            S/. {Number(evento.precio_total).toFixed(2)}
                        </p>
                    )}

                    {/* Botón de sincronización */}
                    {evento.pedido_id ? (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                                ✓ Vinculado a pedido
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            🚀 Sincronizar con Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Modal de confirmación para eliminar
function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemType }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemType: string;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full">
                <div className="text-center">
                    <div className="text-5xl mb-4">🗑️</div>
                    <h2 className="text-xl font-bold text-white mb-2">Eliminar {itemType}</h2>
                    <p className="text-gray-400 mb-6">
                        ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DiaADiaPage({ onBack }: DiaADiaPageProps) {
    const {
        movimientosLogisticos, rendiciones, eventosProduccion,
        deleteMovimientoLogistico, deleteRendicion, deleteEventoProduccion,
        getClienteLogo,
        createPedido, updatePedido, addPayment,
        updateMovimientoLogistico, updateRendicion, updateEventoProduccion,
        createProduccion
    } = useDatabase();

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'movimientos' | 'rendiciones' | 'produccion'>('all');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: string; id: string; itemType: string } | null>(null);
    const [editModal, setEditModal] = useState<{ isOpen: boolean; tipo: 'movimiento' | 'rendicion' | 'produccion'; id: string } | null>(null);
    const [syncModal, setSyncModal] = useState<{
        isOpen: boolean;
        tipo: 'movimiento' | 'rendicion' | 'produccion';
        evento: MovimientoLogistico | Rendicion | EventoProduccion;
    } | null>(null);
    const [confirmBatchDelete, setConfirmBatchDelete] = useState<{
        isOpen: boolean;
        tipo: 'movimientos' | 'rendiciones' | 'producciones';
        items: string[];
    } | null>(null);
    const [confirmBatchAccept, setConfirmBatchAccept] = useState<{
        isOpen: boolean;
        tipo: 'movimientos' | 'rendiciones' | 'producciones';
        items: (MovimientoLogistico | Rendicion | EventoProduccion)[];
    } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    // Agrupar eventos por fecha
    const eventosPorFecha = useMemo(() => {
        const grupos: Record<string, {
            movimientos: MovimientoLogistico[];
            rendiciones: Rendicion[];
            producciones: EventoProduccion[];
            totalMonto: number
        }> = {};

        // Agregar movimientos
        movimientosLogisticos.forEach(m => {
            const fecha = getDateKey(m.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) {
                grupos[fecha] = { movimientos: [], rendiciones: [], producciones: [], totalMonto: 0 };
            }
            grupos[fecha].movimientos.push(m);
            if (m.costo_movilidad) {
                grupos[fecha].totalMonto += Number(m.costo_movilidad);
            }
        });

        // Agregar rendiciones
        rendiciones.forEach(r => {
            const fecha = getDateKey(r.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) {
                grupos[fecha] = { movimientos: [], rendiciones: [], producciones: [], totalMonto: 0 };
            }
            grupos[fecha].rendiciones.push(r);
            grupos[fecha].totalMonto += Number(r.monto);
        });

        // Agregar eventos de producción
        eventosProduccion.forEach(e => {
            const fecha = getDateKey(e.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) {
                grupos[fecha] = { movimientos: [], rendiciones: [], producciones: [], totalMonto: 0 };
            }
            grupos[fecha].producciones.push(e);
            if (e.precio_total) {
                grupos[fecha].totalMonto += Number(e.precio_total);
            }
        });

        return grupos;
    }, [movimientosLogisticos, rendiciones, eventosProduccion]);

    // Fechas ordenadas (más reciente primero)
    const fechasOrdenadas = useMemo(() => {
        return Object.keys(eventosPorFecha).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [eventosPorFecha]);

    // Totales generales
    const totales = useMemo(() => {
        let movimientos = 0;
        let rendicionesCount = 0;
        let produccionesCount = 0;
        let montoTotal = 0;

        Object.values(eventosPorFecha).forEach(grupo => {
            movimientos += grupo.movimientos.length;
            rendicionesCount += grupo.rendiciones.length;
            produccionesCount += grupo.producciones.length;
            montoTotal += grupo.totalMonto;
        });

        return { movimientos, rendiciones: rendicionesCount, producciones: produccionesCount, montoTotal, dias: fechasOrdenadas.length };
    }, [eventosPorFecha, fechasOrdenadas]);

    // Datos del día seleccionado
    const diaSeleccionado = selectedDate ? eventosPorFecha[selectedDate] : null;

    // Handlers para eliminar
    const handleDeleteMovimiento = (id: string) => {
        setDeleteModal({ isOpen: true, type: 'movimiento', id, itemType: 'Movimiento' });
    };

    const handleDeleteRendicion = (id: string) => {
        setDeleteModal({ isOpen: true, type: 'rendicion', id, itemType: 'Rendición' });
    };

    const handleDeleteProduccion = (id: string) => {
        setDeleteModal({ isOpen: true, type: 'produccion', id, itemType: 'Producción' });
    };

    const confirmDelete = () => {
        if (!deleteModal) return;

        switch (deleteModal.type) {
            case 'movimiento':
                deleteMovimientoLogistico(deleteModal.id);
                break;
            case 'rendicion':
                deleteRendicion(deleteModal.id);
                break;
            case 'produccion':
                deleteEventoProduccion(deleteModal.id);
                break;
        }
    };

    // Abrir modal de edición
    const handleEdit = (type: string, id: string) => {
        setEditModal({
            isOpen: true,
            tipo: type as 'movimiento' | 'rendicion' | 'produccion',
            id
        });
    };

    // Abrir modal de sincronización
    const handleSync = (tipo: 'movimiento' | 'rendicion' | 'produccion', evento: MovimientoLogistico | Rendicion | EventoProduccion) => {
        setSyncModal({
            isOpen: true,
            tipo,
            evento
        });
    };

    // Obtener items pendientes de sincronizar (sin pedido_id)
    const getPendientesSinSincronizar = () => {
        if (!diaSeleccionado) return { movimientos: [], rendiciones: [], producciones: [] };
        return {
            movimientos: diaSeleccionado.movimientos.filter(m => !m.pedido_id),
            rendiciones: diaSeleccionado.rendiciones.filter(r => !r.pedido_id),
            producciones: diaSeleccionado.producciones.filter(p => !p.pedido_id)
        };
    };

    const pendientes = getPendientesSinSincronizar();

    const confirmBatchDeleteAction = async () => {
        if (!confirmBatchDelete) return;

        const { items } = confirmBatchDelete;

        // Eliminar cada item según su tipo (detectado por la estructura)
        for (const id of items) {
            // Buscar en qué lista está el id
            if (pendientes.movimientos.some(m => m.id === id)) {
                await deleteMovimientoLogistico(id);
            } else if (pendientes.rendiciones.some(r => r.id === id)) {
                await deleteRendicion(id);
            } else if (pendientes.producciones.some(p => p.id === id)) {
                await deleteEventoProduccion(id);
            }
        }

        setConfirmBatchDelete(null);
    };

    const confirmBatchAcceptAction = async () => {
        if (!confirmBatchAccept) return;

        setIsProcessing(true);
        const { items } = confirmBatchAccept;

        try {
            for (const evento of items) {
                const clienteEvento = 'cliente' in evento ? evento.cliente : '';

                // Detectar tipo de evento
                const isMovimiento = pendientes.movimientos.some(m => m.id === evento.id);
                const isRendicion = pendientes.rendiciones.some(r => r.id === evento.id);
                const isProduccion = pendientes.producciones.some(p => p.id === evento.id);

                // Crear descripción según tipo
                let descripcion = '';
                if (isMovimiento) {
                    const mov = evento as MovimientoLogistico;
                    const detalle = mov.detalle as any;
                    if (detalle?.items) {
                        descripcion = detalle.items.map((i: any) => `${i.cantidad} ${i.producto}`).join(', ');
                    } else {
                        descripcion = mov.observaciones || mov.tipo;
                    }
                } else if (isRendicion) {
                    const rend = evento as Rendicion;
                    const detalle = rend.detalle as any;
                    descripcion = detalle?.concepto || `${rend.tipo.replace('_', ' ')} - S/. ${rend.monto}`;
                } else if (isProduccion) {
                    const prod = evento as EventoProduccion;
                    descripcion = `${prod.producto} x ${prod.cantidad || 1}`;
                }

                // Crear nuevo pedido
                const newPedido = await createPedido({
                    cliente: clienteEvento || 'Sin Cliente',
                    vendedora: 'Logística',
                    descripcion: (descripcion || 'Evento importado').toUpperCase(),
                    estado: 'en_produccion',
                    precio: 0,
                    pagado: 0,
                });

                // Vincular según tipo detectado
                if (isMovimiento) {
                    const mov = evento as MovimientoLogistico;
                    await updateMovimientoLogistico(mov.id, { pedido_id: newPedido.id });
                    if (mov.tipo === 'entrega') {
                        await updatePedido(newPedido.id, { estado: 'entregado' });
                    } else if (mov.tipo === 'recojo') {
                        await updatePedido(newPedido.id, { estado: 'listo' });
                    }
                } else if (isRendicion) {
                    const rend = evento as Rendicion;
                    await updateRendicion(rend.id, { pedido_id: newPedido.id });
                    if (rend.tipo === 'adelanto_produccion' || rend.tipo === 'pago_saldo') {
                        await addPayment(newPedido.id, rend.monto, `Rendición: ${rend.tipo.replace('_', ' ')}`);
                    }
                } else if (isProduccion) {
                    const prod = evento as EventoProduccion;
                    await updateEventoProduccion(prod.id, { pedido_id: newPedido.id });
                    await createProduccion({
                        pedido_id: newPedido.id,
                        proveedor_id: prod.proveedor || 'Sin Proveedor',
                        producto_base: prod.producto,
                        descripcion: prod.observaciones,
                        cantidad_aprobada: prod.cantidad || 1,
                        precio_unitario: prod.precio_unitario || 0,
                        precio_total: prod.precio_total || 0,
                        incluye_igv: false,
                        fecha_aprobacion: prod.fecha,
                        prueba_color: 'na',
                        muestra_fisica: 'na',
                        estado: prod.estado === 'completado' ? 'entregado' : 'en_proceso',
                    });
                }

                console.log(`✅ Evento sincronizado con nuevo pedido ${newPedido.id}`);
            }
        } catch (error) {
            console.error('Error al sincronizar eventos:', error);
        }

        setIsProcessing(false);
        setConfirmBatchAccept(null);
    };

    return (
        <div className="min-h-screen p-3 sm:p-4 md:p-6">
            {/* Header - Responsive */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6 md:mb-8">
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black">
                            <span className="text-cyan-400">📅</span> Día a Día
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">Registro de actividades diarias</p>
                    </div>
                </div>

                {/* Filtros - Responsive */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            filterType === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        Todo
                    </button>
                    <button
                        onClick={() => setFilterType('movimientos')}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            filterType === 'movimientos' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        🚚 <span className="hidden sm:inline">Movimientos</span>
                    </button>
                    <button
                        onClick={() => setFilterType('rendiciones')}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            filterType === 'rendiciones' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        💰 <span className="hidden sm:inline">Rendiciones</span>
                    </button>
                    <button
                        onClick={() => setFilterType('produccion')}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            filterType === 'produccion' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        🏭 <span className="hidden sm:inline">Producción</span>
                    </button>
                </div>
            </header>

            {/* KPIs Resumen - Responsive grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                <div className="bg-gray-900 border border-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 text-center">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{totales.dias}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Días</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 text-center">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-400">{totales.movimientos}</div>
                    <div className="text-[10px] sm:text-xs text-blue-400/70 uppercase tracking-wider">Movimientos</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 text-center">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-400">{totales.rendiciones}</div>
                    <div className="text-[10px] sm:text-xs text-orange-400/70 uppercase tracking-wider">Rendiciones</div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 text-center">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-400">{totales.producciones}</div>
                    <div className="text-[10px] sm:text-xs text-indigo-400/70 uppercase tracking-wider">Producciones</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 text-center col-span-2 sm:col-span-1">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-400">S/. {totales.montoTotal.toFixed(2)}</div>
                    <div className="text-[10px] sm:text-xs text-amber-400/70 uppercase tracking-wider">Monto Total</div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de fechas */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <h2 className="text-lg font-bold text-white mb-4">Fechas</h2>

                        {fechasOrdenadas.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No hay eventos registrados</p>
                                <p className="text-gray-600 text-sm mt-2">Importa un JSON de día a día para comenzar</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {fechasOrdenadas.map(fecha => {
                                    const grupo = eventosPorFecha[fecha];
                                    const isSelected = selectedDate === fecha;
                                    const totalEventos = grupo.movimientos.length + grupo.rendiciones.length + grupo.producciones.length;

                                    return (
                                        <button
                                            key={fecha}
                                            onClick={() => setSelectedDate(isSelected ? null : fecha)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                                                isSelected
                                                    ? 'bg-cyan-600/20 border border-cyan-500/50'
                                                    : 'bg-gray-800/50 border border-transparent hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`font-medium ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                                                    {fecha}
                                                </span>
                                                <span className="text-amber-400 font-mono text-sm">
                                                    S/. {grupo.totalMonto.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span className="text-gray-400">{totalEventos} eventos</span>
                                                {grupo.movimientos.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        🚚 {grupo.movimientos.length}
                                                    </span>
                                                )}
                                                {grupo.rendiciones.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        💰 {grupo.rendiciones.length}
                                                    </span>
                                                )}
                                                {grupo.producciones.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        🏭 {grupo.producciones.length}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detalle del día seleccionado */}
                <div className="lg:col-span-2">
                    {selectedDate && diaSeleccionado ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white capitalize">
                                        {formatDate(selectedDate)}
                                    </h2>
                                    <p className="text-gray-500 text-sm">
                                        {diaSeleccionado.movimientos.length + diaSeleccionado.rendiciones.length + diaSeleccionado.producciones.length} eventos
                                        {(pendientes.movimientos.length + pendientes.rendiciones.length + pendientes.producciones.length) > 0 && (
                                            <span className="ml-2 text-yellow-500">
                                                ({pendientes.movimientos.length + pendientes.rendiciones.length + pendientes.producciones.length} sin sincronizar)
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-amber-400 font-bold text-2xl">
                                        S/. {diaSeleccionado.totalMonto.toFixed(2)}
                                    </p>
                                    <p className="text-gray-500 text-xs">Total del día</p>
                                </div>
                            </div>

                            {/* Botones de acción masiva */}
                            {(pendientes.movimientos.length + pendientes.rendiciones.length + pendientes.producciones.length) > 0 && (
                                <div className="flex items-center justify-end gap-3 mb-6 pb-4 border-b border-gray-800">
                                    <span className="text-gray-500 text-sm mr-auto">
                                        Acciones para pendientes:
                                    </span>
                                    <button
                                        onClick={() => {
                                            // Combinar todos los pendientes
                                            const allItems = [
                                                ...pendientes.movimientos,
                                                ...pendientes.rendiciones,
                                                ...pendientes.producciones
                                            ];
                                            if (allItems.length > 0) {
                                                setConfirmBatchAccept({
                                                    isOpen: true,
                                                    tipo: 'movimientos', // Se manejará cada tipo individualmente
                                                    items: allItems
                                                });
                                            }
                                        }}
                                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                                    >
                                        <span>✓</span>
                                        Aceptar todos ({pendientes.movimientos.length + pendientes.rendiciones.length + pendientes.producciones.length})
                                    </button>
                                    <button
                                        onClick={() => {
                                            const allIds = [
                                                ...pendientes.movimientos.map(m => m.id),
                                                ...pendientes.rendiciones.map(r => r.id),
                                                ...pendientes.producciones.map(p => p.id)
                                            ];
                                            if (allIds.length > 0) {
                                                setConfirmBatchDelete({
                                                    isOpen: true,
                                                    tipo: 'movimientos', // Se manejará cada tipo
                                                    items: allIds
                                                });
                                            }
                                        }}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                                    >
                                        <span>🗑️</span>
                                        Eliminar todos
                                    </button>
                                </div>
                            )}

                            {/* Movimientos */}
                            {(filterType === 'all' || filterType === 'movimientos') && diaSeleccionado.movimientos.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">
                                        🚚 Movimientos Logísticos ({diaSeleccionado.movimientos.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.movimientos.map(m => (
                                                <MovimientoCard
                                                    key={m.id}
                                                    movimiento={m}
                                                    onEdit={() => handleEdit('movimiento', m.id)}
                                                    onDelete={() => handleDeleteMovimiento(m.id)}
                                                    onSync={() => handleSync('movimiento', m)}
                                                    clienteLogo={m.cliente ? getClienteLogo(m.cliente) : null}
                                                />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rendiciones */}
                            {(filterType === 'all' || filterType === 'rendiciones') && diaSeleccionado.rendiciones.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-3">
                                        💰 Rendiciones y Pagos ({diaSeleccionado.rendiciones.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.rendiciones.map(r => (
                                                <RendicionCard
                                                    key={r.id}
                                                    rendicion={r}
                                                    onEdit={() => handleEdit('rendicion', r.id)}
                                                    onDelete={() => handleDeleteRendicion(r.id)}
                                                    onSync={() => handleSync('rendicion', r)}
                                                    clienteLogo={r.cliente ? getClienteLogo(r.cliente) : null}
                                                />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Producciones */}
                            {(filterType === 'all' || filterType === 'produccion') && diaSeleccionado.producciones.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3">
                                        🏭 Producción ({diaSeleccionado.producciones.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.producciones.map(e => (
                                                <ProduccionCard
                                                    key={e.id}
                                                    evento={e}
                                                    onEdit={() => handleEdit('produccion', e.id)}
                                                    onDelete={() => handleDeleteProduccion(e.id)}
                                                    onSync={() => handleSync('produccion', e)}
                                                    clienteLogo={e.cliente ? getClienteLogo(e.cliente) : null}
                                                />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowCalendar(true)}
                            className="w-full bg-gray-900 border border-gray-800 hover:border-cyan-500/50 rounded-xl p-8 text-center transition-all duration-200 hover:bg-gray-800/50 group cursor-pointer"
                        >
                            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-200">📅</div>
                            <h2 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Selecciona una fecha</h2>
                            <p className="text-gray-500">
                                Haz clic en una fecha de la lista para ver los detalles del día
                            </p>
                        </button>
                    )}
                </div>
            </div>

            {/* Modal de confirmación de eliminación */}
            {deleteModal && (
                <ConfirmDeleteModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={confirmDelete}
                    itemType={deleteModal.itemType}
                />
            )}

            {/* Modal de edición */}
            {editModal && (
                <EditarEventoModal
                    isOpen={editModal.isOpen}
                    onClose={() => setEditModal(null)}
                    tipo={editModal.tipo}
                    eventoId={editModal.id}
                />
            )}

            {/* Modal de sincronización */}
            {syncModal && (
                <SincronizarEventoModal
                    isOpen={syncModal.isOpen}
                    onClose={() => setSyncModal(null)}
                    tipo={syncModal.tipo}
                    evento={syncModal.evento}
                />
            )}

            {/* Modal del Calendario */}
            {showCalendar && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowCalendar(false); }}
                >
                    <div className="relative animate-in fade-in zoom-in duration-200">
                        {/* Botón cerrar */}
                        <button
                            onClick={() => setShowCalendar(false)}
                            className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-gray-800 hover:bg-red-600 border border-gray-700 hover:border-red-500 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                        >
                            ✕
                        </button>
                        <CalendarioModerno
                            fechasConEventos={Object.fromEntries(
                                Object.entries(eventosPorFecha).map(([fecha, grupo]) => [
                                    fecha,
                                    {
                                        movimientos: grupo.movimientos.length,
                                        rendiciones: grupo.rendiciones.length,
                                        producciones: grupo.producciones.length,
                                        totalMonto: grupo.totalMonto
                                    }
                                ])
                            )}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            onClose={() => setShowCalendar(false)}
                        />
                    </div>
                </div>
            )}

            {/* Modal de confirmación de eliminación masiva */}
            {confirmBatchDelete && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onKeyDown={(e) => { if (e.key === 'Escape') setConfirmBatchDelete(null); }}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full">
                        <div className="text-center">
                            <div className="text-5xl mb-4">⚠️</div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Eliminar {confirmBatchDelete.items.length} {confirmBatchDelete.tipo}
                            </h2>
                            <p className="text-gray-400 mb-6">
                                ¿Estás seguro de que deseas eliminar todos los {confirmBatchDelete.tipo} pendientes de sincronizar?
                                <br />
                                <span className="text-red-400 font-bold">Esta acción no se puede deshacer.</span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmBatchDelete(null)}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmBatchDeleteAction}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                                >
                                    Eliminar todos ({confirmBatchDelete.items.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de aceptar masivo */}
            {confirmBatchAccept && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onKeyDown={(e) => { if (e.key === 'Escape' && !isProcessing) setConfirmBatchAccept(null); }}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    <div className="bg-gray-900 border border-green-500/50 rounded-2xl p-6 max-w-md w-full">
                        <div className="text-center">
                            <div className="text-5xl mb-4">✓</div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Aceptar {confirmBatchAccept.items.length} {confirmBatchAccept.tipo}
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Se creará un <span className="text-cyan-400 font-bold">nuevo pedido</span> para cada {confirmBatchAccept.tipo.slice(0, -1)} y se vinculará automáticamente al Dashboard.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmBatchAccept(null)}
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmBatchAcceptAction}
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            Procesando...
                                        </>
                                    ) : (
                                        <>Aceptar todos ({confirmBatchAccept.items.length})</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
