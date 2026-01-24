import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import type { MovimientoLogistico, Rendicion, EventoProduccion, PKL, TaskPKL } from '../types';
import { TIPOS_OPERACION_PKL, ESTADOS_PKL } from '../types';
import { EditarEventoModal } from './EditarEventoModal';
import { SincronizarEventoModal } from './SincronizarEventoModal';

// Función para encontrar el PKL vinculado a un evento
// Optimizada: una sola pasada por todos los PKLs (#10)
function findPKLForEvent(eventId: string, pkls: PKL[], pedidoId?: string): PKL | null {
    // Si hay pedido_id explícito, buscar primero por ID exacto (más rápido)
    if (pedidoId) {
        const pklByPedidoId = pkls.find(pkl => pkl.pkl_id === pedidoId);
        if (pklByPedidoId) {
            return pklByPedidoId;
        }
    }

    // Una sola pasada buscando todas las posibles vinculaciones
    for (const pkl of pkls) {
        // 1. Buscar en tasks por evento_origen_id
        const hasEventoOrigenInTasks = pkl.tasks?.some(task => {
            const taskAny = task as any;
            return taskAny.evento_origen_id === eventId ||
                   taskAny.eventoOrigenId === eventId;
        });
        if (hasEventoOrigenInTasks) {
            return pkl;
        }

        // 2. Buscar en origen.evento_origen_id
        const origenAny = pkl.origen as any;
        if (origenAny?.evento_origen_id === eventId) {
            return pkl;
        }

        // 3. Buscar en eventos_externos
        const hasInEventos = pkl.eventos_externos?.some(ev =>
            (ev as any).evento_id === eventId || (ev as any).id === eventId
        );
        if (hasInEventos) {
            return pkl;
        }
    }

    // NOTA: Se eliminó la auto-detección por cliente + fecha porque causaba
    // que eventos diferentes del mismo cliente se vincularan al mismo PKL.
    // La vinculación ahora solo ocurre cuando hay una relación explícita.

    return null;
}

interface DiaADiaPageProps {
    onBack: () => void;
    onNavigateToPKL?: (pklId: string) => void;
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
    servicio: { icon: '🔧', color: 'text-pink-400', bgColor: 'bg-pink-500/20 border-pink-500/30' },
    solicitud_stock: { icon: '📋', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20 border-cyan-500/30' },
    cotizacion: { icon: '💬', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30' },
    coordinacion: { icon: '📞', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20 border-indigo-500/30' },
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

// Tipo unificado para eventos seleccionables
type EventoSeleccionable = {
    id: string;
    tipo_evento: 'movimiento' | 'rendicion' | 'produccion';
    tipo: string;
    cliente?: string;
    descripcion: string;
    monto?: number;
    fecha: string;
    data: MovimientoLogistico | Rendicion | EventoProduccion;
};

// Componente para mostrar un movimiento
function MovimientoCard({ movimiento, onEdit, onEditDirect, onDelete, onSync, clienteLogo, isSelected, onToggleSelect, linkedPKL, onDecouple, onConvertToTask }: {
    movimiento: MovimientoLogistico;
    onEdit: () => void;
    onEditDirect?: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    linkedPKL?: PKL | null;
    onDecouple?: (pklId: string, eventId: string) => void;
    onConvertToTask?: () => void;
}) {
    const config = MOVIMIENTO_CONFIG[movimiento.tipo] || MOVIMIENTO_CONFIG.traslado;
    const detalle = movimiento.detalle as any;

    // Construir resumen según tipo
    let resumen = '';
    if (detalle?.items && Array.isArray(detalle.items)) {
        resumen = detalle.items.map((i: any) => {
            const producto = i.producto || '';
            const cantidad = i.cantidad;
            // Si cantidad es 1 o el producto ya empieza con número, solo mostrar producto
            if (cantidad === 1 || /^\d/.test(producto)) {
                return producto;
            }
            return `${cantidad} ${producto}`;
        }).join(', ');
    } else if (detalle?.origen) {
        resumen = `${detalle.origen}${detalle.destino ? ` → ${detalle.destino}` : ''}`;
        if (detalle.item) resumen += ` (${detalle.item})`;
    }

    return (
        <div className={`border rounded-xl p-4 ${config.bgColor} group relative cursor-pointer hover:border-cyan-500/50 transition-all ${isSelected ? 'ring-2 ring-cyan-500 border-cyan-500' : ''}`} onClick={onEdit}>
            {/* Botones de acción (hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); (onEditDirect || onEdit)(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                    title="Editar evento (fecha, datos)"
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
                {onConvertToTask && !linkedPKL && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onConvertToTask(); }}
                        className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-purple-600 text-gray-400 hover:text-white transition-colors"
                        title="Convertir a Task de otro PKL"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="flex items-start gap-3">
                {/* Checkbox de selección O badge de PKL vinculado */}
                {linkedPKL ? (
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🔗</span>
                        <span className="text-[10px] font-mono text-purple-400 whitespace-nowrap">{linkedPKL.pkl_id.replace('PKL-', '')}</span>
                    </div>
                ) : onToggleSelect ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                                ? 'bg-cyan-500 border-cyan-500 text-white scale-110'
                                : 'border-gray-500 hover:border-cyan-400 hover:bg-cyan-500/20'
                        }`}
                        title={isSelected ? 'Deseleccionar' : 'Seleccionar para fusionar a PKL'}
                    >
                        {isSelected && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                ) : null}
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
                        {linkedPKL && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-400 border border-purple-500/50">
                                {linkedPKL.pkl_id}
                            </span>
                        )}
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

                    {/* PKL vinculado - mostrar check verde con número */}
                    {linkedPKL && onDecouple ? (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/40">
                                <span className="text-green-400 text-lg">✓</span>
                                <span className="text-green-400 font-bold text-sm">{linkedPKL.pkl_id}</span>
                                <span className="text-green-400/70 text-xs">en Dashboard</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDecouple(linkedPKL.pkl_id, movimiento.id); }}
                                className="px-2 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors text-xs font-medium flex items-center gap-1"
                                title="Desvincular de PKL"
                            >
                                🔓
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            📋 Crear / Vincular PKL
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente para mostrar una rendición
function RendicionCard({ rendicion, onEdit, onEditDirect, onDelete, onSync, clienteLogo, isSelected, onToggleSelect, linkedPKL, onDecouple, onConvertToTask }: {
    rendicion: Rendicion;
    onEdit: () => void;
    onEditDirect?: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    linkedPKL?: PKL | null;
    onDecouple?: (pklId: string, eventId: string) => void;
    onConvertToTask?: () => void;
}) {
    const config = RENDICION_CONFIG[rendicion.tipo] || RENDICION_CONFIG.gasto_extra;
    const detalle = rendicion.detalle as any;

    return (
        <div className={`border rounded-xl p-4 ${config.bgColor} group relative cursor-pointer hover:border-orange-500/50 transition-all ${isSelected ? 'ring-2 ring-orange-500 border-orange-500' : ''}`} onClick={onEdit}>
            {/* Botones de acción (hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); (onEditDirect || onEdit)(); }}
                    className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600 text-gray-400 hover:text-white transition-colors"
                    title="Editar evento (fecha, datos)"
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
                {onConvertToTask && !linkedPKL && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onConvertToTask(); }}
                        className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-purple-600 text-gray-400 hover:text-white transition-colors"
                        title="Convertir a Task de otro PKL"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="flex items-start gap-3">
                {/* Checkbox de selección O badge de PKL vinculado */}
                {linkedPKL ? (
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🔗</span>
                        <span className="text-[10px] font-mono text-purple-400 whitespace-nowrap">{linkedPKL.pkl_id.replace('PKL-', '')}</span>
                    </div>
                ) : onToggleSelect ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                                ? 'bg-orange-500 border-orange-500 text-white scale-110'
                                : 'border-gray-500 hover:border-orange-400 hover:bg-orange-500/20'
                        }`}
                        title={isSelected ? 'Deseleccionar' : 'Seleccionar para fusionar a PKL'}
                    >
                        {isSelected && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                ) : null}
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
                        {linkedPKL && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-400 border border-purple-500/50">
                                {linkedPKL.pkl_id}
                            </span>
                        )}
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

                    {/* PKL vinculado - mostrar check verde con número */}
                    {linkedPKL && onDecouple ? (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/40">
                                <span className="text-green-400 text-lg">✓</span>
                                <span className="text-green-400 font-bold text-sm">{linkedPKL.pkl_id}</span>
                                <span className="text-green-400/70 text-xs">en Dashboard</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDecouple(linkedPKL.pkl_id, rendicion.id); }}
                                className="px-2 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors text-xs font-medium flex items-center gap-1"
                                title="Desvincular de PKL"
                            >
                                🔓
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            📋 Crear / Vincular PKL
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente para mostrar un evento de producción
function ProduccionCard({ evento, onEdit, onDelete, onSync, clienteLogo, isSelected, onToggleSelect, linkedPKL, onDecouple }: {
    evento: EventoProduccion;
    onEdit: () => void;
    onDelete: () => void;
    onSync: () => void;
    clienteLogo?: string | null;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    linkedPKL?: PKL | null;
    onDecouple?: (pklId: string, eventId: string) => void;
}) {
    const especificaciones = evento.especificaciones as Record<string, any> || {};

    return (
        <div className={`border rounded-xl p-4 bg-indigo-500/20 border-indigo-500/30 group relative cursor-pointer hover:border-indigo-500/50 transition-all ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`} onClick={onEdit}>
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
                {/* Checkbox de selección O badge de PKL vinculado */}
                {linkedPKL ? (
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🔗</span>
                        <span className="text-[10px] font-mono text-purple-400 whitespace-nowrap">{linkedPKL.pkl_id.replace('PKL-', '')}</span>
                    </div>
                ) : onToggleSelect ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                                ? 'bg-indigo-500 border-indigo-500 text-white scale-110'
                                : 'border-gray-500 hover:border-indigo-400 hover:bg-indigo-500/20'
                        }`}
                        title={isSelected ? 'Deseleccionar' : 'Seleccionar para fusionar a PKL'}
                    >
                        {isSelected && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                ) : null}
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
                        {linkedPKL && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-400 border border-purple-500/50">
                                {linkedPKL.pkl_id}
                            </span>
                        )}
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

                    {/* PKL vinculado - mostrar check verde con número */}
                    {linkedPKL && onDecouple ? (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/40">
                                <span className="text-green-400 text-lg">✓</span>
                                <span className="text-green-400 font-bold text-sm">{linkedPKL.pkl_id}</span>
                                <span className="text-green-400/70 text-xs">en Dashboard</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDecouple(linkedPKL.pkl_id, evento.id); }}
                                className="px-2 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors text-xs font-medium flex items-center gap-1"
                                title="Desvincular de PKL"
                            >
                                🔓
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            📋 Crear / Vincular PKL
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente para mostrar un PKL en el Día a Día
function PKLCard({ pkl, clienteLogo, onNavigateToPKL, onMergeToPKL }: {
    pkl: PKL;
    clienteLogo: string | null;
    onNavigateToPKL: (pklId: string) => void;
    onMergeToPKL?: (sourcePklId: string) => void;
}) {
    const tipoConfig: Record<string, { color: string; icon: string; bgColor: string }> = {
        'produccion': { color: 'text-indigo-400', icon: '🏭', bgColor: 'border-indigo-500/30 bg-indigo-500/10' },
        'cotizacion': { color: 'text-yellow-400', icon: '💬', bgColor: 'border-yellow-500/30 bg-yellow-500/10' },
        'entrega': { color: 'text-green-400', icon: '📦', bgColor: 'border-green-500/30 bg-green-500/10' },
        'recojo': { color: 'text-blue-400', icon: '🚚', bgColor: 'border-blue-500/30 bg-blue-500/10' },
        'instalacion': { color: 'text-pink-400', icon: '🔧', bgColor: 'border-pink-500/30 bg-pink-500/10' },
        'servicio': { color: 'text-purple-400', icon: '⚙️', bgColor: 'border-purple-500/30 bg-purple-500/10' },
    };

    const tipo = pkl.clasificacion?.tipo_operacion || 'produccion';
    const config = tipoConfig[tipo] || tipoConfig.produccion;

    // Calcular estadísticas del PKL
    const tasksCount = pkl.tasks?.length || 0;
    const tasksCompletados = pkl.tasks?.filter(t => t.estado === 'completado').length || 0;
    const productos = pkl.productos?.map(p => p.descripcion || p.tipo).join(', ') || '-';

    return (
        <div
            className={`border rounded-xl p-4 ${config.bgColor} group relative cursor-pointer hover:border-cyan-500/50 transition-all`}
            onClick={() => onNavigateToPKL(pkl.pkl_id)}
        >
            <div className="flex items-start gap-3">
                {/* Indicador de PKL */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{config.icon}</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded">PKL</span>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header con ID y estado */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-cyan-400 text-sm">{pkl.pkl_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.color} bg-white/10`}>
                            {tipo.toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                            pkl.estado?.actual === 'cerrado_ok' ? 'bg-green-500/30 text-green-400' :
                            pkl.estado?.actual === 'en_produccion' ? 'bg-blue-500/30 text-blue-400' :
                            pkl.estado?.actual === 'cancelado' ? 'bg-red-500/30 text-red-400' :
                            pkl.estado?.actual === 'en_pausa' ? 'bg-yellow-500/30 text-yellow-400' :
                            'bg-gray-500/30 text-gray-400'
                        }`}>
                            {pkl.estado?.actual || 'recibido'}
                        </span>
                    </div>

                    {/* Cliente */}
                    <div className="flex items-center gap-2">
                        <ClienteLogo logoUrl={clienteLogo} nombre={pkl.cliente?.nombre || 'Sin cliente'} size="sm" />
                        <span className="text-white font-medium">{pkl.cliente?.nombre || 'Sin cliente'}</span>
                    </div>

                    {/* Descripción/Productos */}
                    <p className="text-gray-400 text-sm mt-1 truncate">
                        {pkl.origen?.descripcion_inicial || productos}
                    </p>

                    {/* Tasks progress */}
                    {tasksCount > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all"
                                    style={{ width: `${(tasksCompletados / tasksCount) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-gray-500">{tasksCompletados}/{tasksCount}</span>
                        </div>
                    )}

                    {/* Costo total */}
                    {pkl.costos?.total && pkl.costos.total > 0 && (
                        <p className="text-amber-400 font-mono text-sm mt-2">
                            Total: S/. {Number(pkl.costos.total).toFixed(2)}
                        </p>
                    )}
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onNavigateToPKL(pkl.pkl_id); }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 transition-colors text-xs font-medium whitespace-nowrap"
                    >
                        Ver PKL →
                    </button>
                    {onMergeToPKL && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onMergeToPKL(pkl.pkl_id); }}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 transition-colors text-xs font-medium whitespace-nowrap"
                            title="Vincular eventos a este PKL"
                        >
                            🔗 Vincular
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

// Modal para fusionar eventos en un PKL o editar PKL existente
function MergeEventosToPKLModal({ isOpen, onClose, eventos, clientes, onSuccess, existingPKL }: {
    isOpen: boolean;
    onClose: () => void;
    eventos: EventoSeleccionable[];
    clientes: Record<string, any>;
    onSuccess: () => void;
    existingPKL?: PKL | null; // Si se pasa, es modo edición
}) {
    const { createPKL, updatePKL, updatePKLTask, deletePKLTask, createPKLTask, pkls, proveedores } = useDatabase();
    const isEditMode = !!existingPKL;
    const [pklNombre, setPklNombre] = useState('');
    const [selectedCliente, setSelectedCliente] = useState('');
    const [tipoOperacion, setTipoOperacion] = useState<string>('produccion');
    const [isCreating, setIsCreating] = useState(false);

    // Cerrar con ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Tasks manuales adicionales
    const [tasksAdicionales, setTasksAdicionales] = useState<Array<{
        id: string;
        tipo: string;
        descripcion: string;
        monto?: number;
        proveedor?: string;
        cantidad?: number;
        precioUnitario?: number;
        incluyeIgv?: boolean;
    }>>([]);
    const [showAddTask, setShowAddTask] = useState(false);

    // Estado para edición de task existente
    const [editingTask, setEditingTask] = useState<{
        task_id: string;
        tipo: string;
        nombre: string;
        descripcion?: string;
        costo?: number;
        proveedor?: string;
        cantidad?: number;
        precioUnitario?: number;
        incluyeIgv?: boolean;
        esPrecioUnitario?: boolean;
        cotizaciones?: Array<{
            proveedor: string;
            precio: number;
            cantidad?: number;
            esPrecioUnitario?: boolean;
            incluyeIgv: boolean;
            seleccionada?: boolean;
        }>;
    } | null>(null);

    const [newTaskTipo, setNewTaskTipo] = useState('cotizacion');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskMonto, setNewTaskMonto] = useState('');
    const [newTaskProveedor, setNewTaskProveedor] = useState('');
    // Para cotización
    const [newTaskCantidad, setNewTaskCantidad] = useState('');
    const [newTaskPrecioUnitario, setNewTaskPrecioUnitario] = useState('');
    const [newTaskEsPrecioUnitario, setNewTaskEsPrecioUnitario] = useState(true);
    const [newTaskIncluyeIgv, setNewTaskIncluyeIgv] = useState(false);

    // Calcular monto total para cotización
    const calcularMontoTask = () => {
        if (newTaskTipo === 'cotizacion' && newTaskEsPrecioUnitario && newTaskCantidad && newTaskPrecioUnitario) {
            const cant = parseFloat(newTaskCantidad) || 0;
            const precio = parseFloat(newTaskPrecioUnitario) || 0;
            let total = cant * precio;
            if (!newTaskIncluyeIgv) {
                total = total * 1.18; // Agregar IGV
            }
            return total;
        }
        return parseFloat(newTaskMonto) || 0;
    };

    // Cargar datos del PKL existente o auto-detectar desde eventos
    useEffect(() => {
        if (existingPKL) {
            // Modo edición: cargar datos del PKL
            setPklNombre(existingPKL.origen?.descripcion_inicial || existingPKL.pkl_id);

            // Buscar el ID del cliente basado en el nombre guardado
            const clienteNombre = existingPKL.cliente?.nombre || '';
            const clienteId = Object.entries(clientes).find(([_, c]) =>
                c.nombre_comercial === clienteNombre ||
                c.razon_social === clienteNombre ||
                c.nombre_comercial?.toLowerCase() === clienteNombre.toLowerCase() ||
                c.razon_social?.toLowerCase() === clienteNombre.toLowerCase()
            )?.[0] || clienteNombre; // Fallback al nombre si no encuentra ID

            setSelectedCliente(clienteId);
            setTipoOperacion(existingPKL.clasificacion?.tipo_operacion || 'produccion');
        } else if (eventos.length > 0) {
            // Modo creación: auto-detectar desde eventos
            const clienteCounts: Record<string, number> = {};
            eventos.forEach(e => {
                if (e.cliente) {
                    clienteCounts[e.cliente] = (clienteCounts[e.cliente] || 0) + 1;
                }
            });
            const mostCommon = Object.entries(clienteCounts).sort((a, b) => b[1] - a[1])[0];
            if (mostCommon) {
                setSelectedCliente(mostCommon[0]);
            }

            // Auto-generar nombre
            const fecha = eventos[0].fecha;
            const clienteNombre = mostCommon ? mostCommon[0] : 'Varios';
            setPklNombre(`${clienteNombre} - ${fecha}`);

            // Auto-detectar ciclo de operación basado en eventos seleccionados
            const hasProduccion = eventos.some(e => e.tipo_evento === 'produccion');
            const hasEntrega = eventos.some(e => e.tipo === 'entrega');
            const hasRecojo = eventos.some(e => e.tipo === 'recojo');
            const hasCotizacion = eventos.some(e => e.tipo === 'cotizacion');

            if (hasCotizacion && hasProduccion && hasRecojo && hasEntrega) {
                setTipoOperacion('ciclo_completo');
            } else if (hasProduccion && hasRecojo && hasEntrega) {
                setTipoOperacion('produccion_recojo_entrega');
            } else if (hasCotizacion && hasProduccion && hasEntrega && !hasRecojo) {
                setTipoOperacion('cotizacion_produccion_motorizado');
            } else if (hasCotizacion && hasRecojo && hasEntrega) {
                setTipoOperacion('cotizacion_recojo_entrega');
            } else if (hasCotizacion && hasRecojo && !hasEntrega) {
                setTipoOperacion('cotizacion_recojo');
            } else if (hasRecojo && hasEntrega) {
                setTipoOperacion('recojo_entrega');
            } else if (hasEntrega && !hasRecojo) {
                setTipoOperacion('solo_entrega');
            } else if (hasCotizacion) {
                setTipoOperacion('cotizacion');
            } else if (hasProduccion) {
                setTipoOperacion('produccion_recojo_entrega');
            }
        }
    }, [eventos, existingPKL]);

    const handleCreate = async () => {
        if (!pklNombre.trim()) return;

        setIsCreating(true);
        try {
            const now = new Date().toISOString();
            const year = new Date().getFullYear();

            // Buscar el número más alto existente para evitar duplicados
            const existingNumbers = pkls
                .map(p => {
                    const match = p.pkl_id.match(/PKL-\d{4}-(\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .filter(n => !isNaN(n));
            const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
            const nextNum = maxNum + 1;
            const pklId = `PKL-${year}-${String(nextNum).padStart(4, '0')}`;

            // Crear tasks a partir de los eventos
            const tasksFromEventos = eventos.map((evento, idx) => {
                const tipoEmoji = evento.tipo_evento === 'movimiento' ? '🚚' :
                                 evento.tipo_evento === 'rendicion' ? '💰' : '🏭';
                return {
                    task_id: `TASK-${Date.now()}-${idx}`,
                    nombre: `${tipoEmoji} ${evento.tipo.toUpperCase()}: ${evento.descripcion}`.substring(0, 100),
                    descripcion: evento.descripcion,
                    tipo: evento.tipo || evento.tipo_evento, // Campo requerido por Supabase
                    estado: 'completado' as const,
                    orden: idx + 1,
                    tipo_origen: evento.tipo_evento,
                    evento_origen_id: evento.id,
                    fecha_completado: evento.fecha,
                };
            });

            // Agregar tasks manuales
            const tasksFromManual = tasksAdicionales.map((task, idx) => {
                const tipoEmojis: Record<string, string> = {
                    cotizacion: '💬', coordinacion_proveedor: '📞', compra_insumo: '🛒',
                    pago: '💰', movilidad: '🚚', instalacion: '🔧', cierre: '✅', administrativo: '📋'
                };
                return {
                    task_id: `TASK-${Date.now()}-manual-${idx}`,
                    nombre: `${tipoEmojis[task.tipo] || '📋'} ${task.tipo.toUpperCase()}: ${task.descripcion || task.tipo}`.substring(0, 100),
                    descripcion: task.descripcion || task.tipo,
                    tipo: task.tipo, // Campo requerido por Supabase
                    estado: 'completado' as const,
                    orden: tasksFromEventos.length + idx + 1,
                    tipo_origen: 'manual',
                    fecha_completado: eventos[0]?.fecha || new Date().toISOString().split('T')[0],
                };
            });

            const tasks = [...tasksFromEventos, ...tasksFromManual];

            // Calcular costos (eventos + tasks manuales con monto)
            const totalCostosEventos = eventos.reduce((sum, e) => sum + (e.monto || 0), 0);
            const totalCostosManual = tasksAdicionales.reduce((sum, t) => sum + (t.monto || 0), 0);
            const totalCostos = totalCostosEventos + totalCostosManual;

            const costoDetalleEventos = eventos
                .filter(e => e.monto && e.monto > 0)
                .map(e => ({
                    concepto: `${e.tipo}: ${e.descripcion}`.substring(0, 50),
                    monto: e.monto || 0,
                    fecha: e.fecha,
                }));

            const costoDetalleManual = tasksAdicionales
                .filter(t => t.monto && t.monto > 0)
                .map(t => ({
                    concepto: `${t.tipo}: ${t.descripcion}`.substring(0, 50),
                    monto: t.monto || 0,
                    fecha: eventos[0]?.fecha || new Date().toISOString().split('T')[0],
                }));

            const costoDetalle = [...costoDetalleEventos, ...costoDetalleManual];

            // Crear el PKL
            const newPKL = {
                pkl_id: pklId,
                version: '2.0',
                created_at: eventos[0].fecha + 'T12:00:00.000Z',
                updated_at: now,
                clasificacion: {
                    tipo_operacion: tipoOperacion as any,
                    area: 'logistica' as const,
                },
                cliente: {
                    nombre: selectedCliente
                        ? (clientes[selectedCliente]?.nombre_comercial || clientes[selectedCliente]?.razon_social || selectedCliente)
                        : 'Sin cliente',
                    ejecutiva_asignada: 'Angélica',
                },
                origen: {
                    canal: 'fusion_eventos' as const,
                    fecha_solicitud: eventos[0].fecha,
                    descripcion_inicial: pklNombre,
                },
                productos: eventos
                    .filter(e => e.tipo_evento === 'produccion')
                    .map((e, idx) => ({
                        producto_id: `PROD-${Date.now()}-${idx}`,
                        tipo: 'fusionado',
                        descripcion: e.descripcion,
                        cantidad: 1,
                    })),
                inputs: {},
                proveedores: [] as any[],
                estado: {
                    actual: 'cerrado_ok' as const,
                    historial: [{
                        estado: 'cerrado_ok' as const,
                        fecha: now,
                        motivo: `PKL creado por fusión de ${eventos.length} eventos`,
                    }],
                },
                eventos_externos: eventos.map(e => ({
                    fecha: e.fecha,
                    tipo: e.tipo_evento,
                    descripcion: `[${e.tipo}] ${e.descripcion}`,
                })),
                costos: {
                    moneda: 'PEN' as const,
                    detalle: costoDetalle,
                    total: totalCostos,
                },
                cierre: {
                    evidencias: [],
                },
                alertas: {
                    dias_sin_actividad: 0,
                    umbral_pausa_dias: 3,
                },
                tasks,
                observaciones: `PKL creado por fusión de ${eventos.length} eventos del día ${eventos[0].fecha}`,
            };

            // Crear el PKL
            await createPKL(newPKL as any);

            console.log(`✅ PKL ${pklId} creado con ${tasks.length} tasks`);
            onSuccess();
        } catch (error) {
            console.error('Error creando PKL:', error);
        } finally {
            setIsCreating(false);
        }
    };

    // Handler para guardar cambios en modo edición
    const handleSave = async () => {
        if (!existingPKL) return;

        setIsCreating(true);
        try {
            // Actualizar los datos básicos del PKL
            const clienteNombre = selectedCliente
                ? (clientes[selectedCliente]?.nombre_comercial || clientes[selectedCliente]?.razon_social || selectedCliente)
                : existingPKL.cliente?.nombre || 'Sin cliente';

            await updatePKL(existingPKL.pkl_id, {
                origen: {
                    ...existingPKL.origen,
                    descripcion_inicial: pklNombre,
                },
                cliente: {
                    ...existingPKL.cliente,
                    nombre: clienteNombre,
                },
                clasificacion: {
                    ...existingPKL.clasificacion,
                    tipo_operacion: tipoOperacion as any,
                },
            });

            // Agregar tasks adicionales si hay
            for (let i = 0; i < tasksAdicionales.length; i++) {
                const task = tasksAdicionales[i];
                const tipoEmojis: Record<string, string> = {
                    cotizacion: '💬', coordinacion_proveedor: '📞', compra_insumo: '🛒',
                    pago: '💰', movilidad: '🚚', instalacion: '🔧', cierre: '✅', administrativo: '📋'
                };
                await createPKLTask(existingPKL.pkl_id, {
                    nombre: `${tipoEmojis[task.tipo] || '📋'} ${task.tipo.toUpperCase()}: ${task.descripcion || task.tipo}`.substring(0, 100),
                    descripcion: task.descripcion || task.tipo,
                    tipo: task.tipo as any,
                    estado: 'completado',
                    orden: (existingPKL.tasks?.length || 0) + i + 1,
                    responsable: 'Huber',
                    es_happy_path: false,
                    costo: task.monto ? { monto: task.monto, moneda: 'PEN' } : undefined,
                });
            }

            console.log(`✅ PKL ${existingPKL.pkl_id} actualizado`);
            onSuccess();
        } catch (error) {
            console.error('Error actualizando PKL:', error);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    const clientesList = Object.entries(clientes).map(([key, c]) => ({
        id: key,
        display: c.nombre_comercial || c.razon_social || key
    }));

    // Ciclo de Operación basado en el nivel de involucramiento
    // Mapear TIPOS_OPERACION_PKL a formato con iconos
    const tiposOperacion = TIPOS_OPERACION_PKL.map(t => {
        const icons: Record<string, string> = {
            'ciclo_completo': '🔄',
            'produccion_recojo_entrega': '🏭',
            'cotizacion_recojo_entrega': '💬🚚',
            'cotizacion_recojo': '💬🚚',
            'recojo_entrega': '🚚📦',
            'solo_entrega': '📦',
            'cotizacion_produccion_motorizado': '💬🏭',
            'solo_motorizado': '🛵',
            'cotizacion': '💬',
            'ciclo_completo_instalacion': '🔄🔧',
            'feria_evento': '🎪',
            'compra_insumo': '🛒',
        };
        return {
            value: t.value,
            label: `${icons[t.value] || '📋'} ${t.label}`,
            color: t.color
        };
    });

    return (
        <div
            className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4"
        >
            <div className="liquid-glass liquid-glass-purple rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{isEditMode ? '📋' : '🔗'}</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {isEditMode ? existingPKL?.pkl_id : 'Fusionar Eventos a PKL'}
                                </h2>
                                <p className="text-white/70 text-sm">
                                    {isEditMode
                                        ? `${existingPKL?.tasks?.length || 0} tasks`
                                        : `${eventos.length} eventos seleccionados`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Nombre del PKL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del PKL</label>
                        <input
                            type="text"
                            value={pklNombre}
                            onChange={(e) => setPklNombre(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none"
                            placeholder="Ej: GRUPO LAR - Recojo + Entrega"
                        />
                    </div>

                    {/* Cliente y Tipo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
                            <select
                                value={selectedCliente}
                                onChange={(e) => setSelectedCliente(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="">Seleccionar cliente...</option>
                                {clientesList.map(c => (
                                    <option key={c.id} value={c.id}>{c.display}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Ciclo de Operación</label>
                            <select
                                value={tipoOperacion}
                                onChange={(e) => setTipoOperacion(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none"
                                style={{ colorScheme: 'dark' }}
                            >
                                {tiposOperacion.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Preview de eventos como tasks */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-400">
                                {isEditMode ? 'Tasks' : 'Eventos → Tasks'} ({isEditMode ? (existingPKL?.tasks?.length || 0) : eventos.length + tasksAdicionales.length})
                            </label>
                            <button
                                onClick={() => setShowAddTask(true)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded transition-colors text-xs font-semibold"
                                style={{ color: 'white' }}
                            >
                                + Agregar Task
                            </button>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg max-h-60 overflow-y-auto">
                            {/* En modo edición, mostrar tasks del PKL */}
                            {isEditMode && existingPKL?.tasks?.map((task, idx) => {
                                const tipoEmojis: Record<string, string> = {
                                    cotizacion: '💬', coordinacion_proveedor: '📞', compra_insumo: '🛒',
                                    pago: '💰', movilidad: '🚚', instalacion: '🔧', cierre: '✅', administrativo: '📋',
                                    movimiento: '🚚', rendicion: '💰', orden_produccion: '🏭', produccion: '🏭',
                                    entrega: '📦', recojo: '🚚'
                                };
                                const taskTipo = task.tipo as string;
                                const isProduccion = taskTipo === 'produccion' || taskTipo === 'orden_produccion';
                                const isCotizacion = taskTipo === 'cotizacion';
                                const taskData = task as any;

                                // Obtener costo del task o de pkl.proveedores
                                let displayCosto = taskData.costo?.monto || taskData.costo || undefined;
                                let displayProveedor = taskData.proveedor;
                                if (!displayCosto && (isProduccion || isCotizacion) && existingPKL?.proveedores?.length) {
                                    const provElegido = existingPKL.proveedores.find((p: any) => p.elegido) ||
                                        existingPKL.proveedores.find((p: any) => p.cotizacion?.precio_total);
                                    if (provElegido?.cotizacion?.precio_total) {
                                        displayCosto = Number(provElegido.cotizacion.precio_total);
                                    }
                                    if (!displayProveedor && provElegido?.nombre) {
                                        displayProveedor = provElegido.nombre;
                                    }
                                }

                                return (
                                    <div
                                        key={task.task_id}
                                        className="flex items-center gap-3 p-3 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 cursor-pointer transition-colors"
                                        onClick={() => {
                                            // Cargar datos del task
                                            const editData: any = {
                                                task_id: task.task_id,
                                                tipo: task.tipo || '',
                                                nombre: task.nombre || '',
                                                descripcion: task.descripcion,
                                                costo: taskData.costo?.monto || taskData.costo || undefined,
                                                proveedor: taskData.proveedor,
                                                cantidad: taskData.cantidad,
                                                precioUnitario: taskData.precioUnitario,
                                                esPrecioUnitario: taskData.esPrecioUnitario,
                                                incluyeIgv: taskData.incluyeIgv,
                                                cotizaciones: taskData.cotizaciones || [],
                                            };

                                            // Para tareas de producción, SIEMPRE intentar sincronizar desde pkl.proveedores
                                            // Esto asegura que los datos guardados en PKLPage aparezcan aquí
                                            if ((isProduccion || isCotizacion) && existingPKL?.proveedores?.length) {
                                                // Buscar proveedor elegido o el primero con cotización
                                                const proveedorElegido = existingPKL.proveedores.find((p: any) => p.elegido) ||
                                                    existingPKL.proveedores.find((p: any) => p.cotizacion?.precio_total || p.cotizacion?.precio_unitario) ||
                                                    existingPKL.proveedores[0];

                                                if (proveedorElegido && proveedorElegido.cotizacion) {
                                                    const cot = proveedorElegido.cotizacion;
                                                    const cantidad = Number(cot.cantidad) || 1;
                                                    const precioTotal = Number(cot.precio_total) || 0;
                                                    const precioUnitario = Number(cot.precio_unitario) || (precioTotal / cantidad) || 0;

                                                    // Solo sobrescribir si el task no tiene datos propios
                                                    if (!editData.proveedor) {
                                                        editData.proveedor = proveedorElegido.nombre;
                                                    }
                                                    if (!editData.cantidad && cantidad) {
                                                        editData.cantidad = cantidad;
                                                    }
                                                    if (!editData.precioUnitario && precioUnitario) {
                                                        editData.precioUnitario = precioUnitario;
                                                        editData.esPrecioUnitario = true;
                                                    }
                                                    if (!editData.costo && precioTotal) {
                                                        editData.costo = precioTotal;
                                                    }
                                                    if (editData.incluyeIgv === undefined) {
                                                        editData.incluyeIgv = cot.incluye_igv || false;
                                                    }
                                                } else if (proveedorElegido && !editData.proveedor) {
                                                    // Solo tiene nombre, sin cotización
                                                    editData.proveedor = proveedorElegido.nombre;
                                                }
                                            }

                                            // Si es cotización, importar todos los proveedores del PKL como cotizaciones
                                            if (taskTipo === 'cotizacion' && (!editData.cotizaciones || editData.cotizaciones.length === 0)) {
                                                // Primero intentar desde pkl.proveedores
                                                if (existingPKL?.proveedores?.length) {
                                                    editData.cotizaciones = existingPKL.proveedores.map((p: any) => {
                                                        const cantidad = Number(p.cotizacion?.cantidad) || 1;
                                                        const precioTotal = Number(p.cotizacion?.precio_total) || 0;
                                                        const precioUnitario = Number(p.cotizacion?.precio_unitario) || (precioTotal / cantidad) || 0;
                                                        return {
                                                            proveedor: p.nombre || '',
                                                            precio: precioUnitario, // Siempre usar precio unitario
                                                            cantidad: cantidad,
                                                            esPrecioUnitario: true, // Siempre es unitario
                                                            incluyeIgv: p.cotizacion?.incluye_igv || false,
                                                            seleccionada: p.elegido || false,
                                                        };
                                                    });
                                                } else {
                                                    // Fallback: buscar en tasks de producción
                                                    const produccionTasks = existingPKL?.tasks?.filter(t => {
                                                        const tipo = t.tipo as string;
                                                        return (tipo === 'produccion' || tipo === 'orden_produccion') && ((t as any).proveedor || (t as any).costo);
                                                    }) || [];

                                                    if (produccionTasks.length > 0) {
                                                        editData.cotizaciones = produccionTasks.map(t => {
                                                            const td = t as any;
                                                            return {
                                                                proveedor: td.proveedor || '',
                                                                precio: td.costo?.monto || td.costo || 0,
                                                                cantidad: td.cantidad || 1,
                                                                esPrecioUnitario: td.esPrecioUnitario || false,
                                                                incluyeIgv: td.incluyeIgv || false,
                                                                seleccionada: true,
                                                            };
                                                        });
                                                    }
                                                }
                                            }

                                            setEditingTask(editData);
                                        }}
                                    >
                                        <span className="text-gray-500 text-sm font-mono w-6">{idx + 1}</span>
                                        <span className="text-lg">
                                            {tipoEmojis[task.tipo || ''] || '📋'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">
                                                {task.nombre || task.descripcion}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                {task.tipo?.toUpperCase()} • {task.estado}
                                                {displayProveedor && ` • ${displayProveedor}`}
                                                {displayCosto ? ` • S/. ${Number(displayCosto).toFixed(2)}` : ''}
                                                {taskData.cotizaciones?.length > 0 && ` • ${taskData.cotizaciones.length} cotizaciones`}
                                            </p>
                                        </div>
                                        {(isProduccion || isCotizacion) && (
                                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                                ✏️ Editar
                                            </span>
                                        )}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await deletePKLTask(existingPKL.pkl_id, task.task_id);
                                            }}
                                            className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                            {/* En modo creación, mostrar eventos seleccionados */}
                            {!isEditMode && eventos.map((evento, idx) => (
                                <div key={evento.id} className="flex items-center gap-3 p-3 border-b border-gray-700/50 last:border-0">
                                    <span className="text-gray-500 text-sm font-mono w-6">{idx + 1}</span>
                                    <span className={`text-lg ${
                                        evento.tipo_evento === 'movimiento' ? 'text-blue-400' :
                                        evento.tipo_evento === 'rendicion' ? 'text-orange-400' : 'text-indigo-400'
                                    }`}>
                                        {evento.tipo_evento === 'movimiento' ? '🚚' :
                                         evento.tipo_evento === 'rendicion' ? '💰' : '🏭'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">
                                            {evento.tipo.toUpperCase()}: {evento.descripcion}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            {evento.cliente} • {evento.fecha}
                                            {evento.monto ? ` • S/. ${evento.monto.toFixed(2)}` : ''}
                                        </p>
                                    </div>
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                        ✓ Task
                                    </span>
                                </div>
                            ))}
                            {/* Tasks adicionales agregadas manualmente */}
                            {tasksAdicionales.map((task, idx) => (
                                <div key={task.id} className="flex items-center gap-3 p-3 border-b border-gray-700/50 last:border-0 bg-purple-900/20">
                                    <span className="text-gray-500 text-sm font-mono w-6">{eventos.length + idx + 1}</span>
                                    <span className="text-lg text-purple-400">
                                        {task.tipo === 'movilidad' ? '🚚' : task.tipo === 'cotizacion' ? '💬' : task.tipo === 'pago' ? '💰' : task.tipo === 'coordinacion_proveedor' ? '📞' : task.tipo === 'compra_insumo' ? '🛒' : task.tipo === 'instalacion' ? '🔧' : task.tipo === 'cierre' ? '✅' : '📋'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">
                                            {task.tipo.toUpperCase()}: {task.descripcion}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            {task.proveedor && <span className="text-purple-300">{task.proveedor} • </span>}
                                            {task.cantidad && <span>Cant: {task.cantidad} • </span>}
                                            {task.monto ? <span className="text-amber-400">S/. {task.monto.toFixed(2)}</span> : 'Sin monto'}
                                            {task.incluyeIgv && <span className="text-green-400 ml-1">(inc. IGV)</span>}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setTasksAdicionales(prev => prev.filter(t => t.id !== task.id))}
                                        className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Form para agregar task */}
                        {showAddTask && (
                            <div className="mt-3 p-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-400 dark:border-purple-500/30 rounded-lg space-y-3">
                                {/* Fila 1: Tipo y Descripción */}
                                <div className="flex gap-2">
                                    <select
                                        value={newTaskTipo}
                                        onChange={(e) => setNewTaskTipo(e.target.value)}
                                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                    >
                                        <option value="cotizacion">💬 Cotización</option>
                                        <option value="coordinacion_proveedor">📞 Coordinación</option>
                                        <option value="compra_insumo">🛒 Compra Insumo</option>
                                        <option value="pago">💰 Pago</option>
                                        <option value="movilidad">🚚 Movilidad</option>
                                        <option value="instalacion">🔧 Instalación</option>
                                        <option value="cierre">✅ Cierre</option>
                                        <option value="administrativo">📋 Administrativo</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={newTaskDesc}
                                        onChange={(e) => setNewTaskDesc(e.target.value)}
                                        placeholder="Descripción del task..."
                                        className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                    />
                                </div>

                                {/* Fila 2: Proveedor */}
                                <input
                                    type="text"
                                    value={newTaskProveedor}
                                    onChange={(e) => setNewTaskProveedor(e.target.value)}
                                    placeholder="Proveedor (opcional)"
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                />

                                {/* Fila 3: Precio - cambia según tipo */}
                                {newTaskTipo === 'cotizacion' ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="number"
                                                value={newTaskCantidad}
                                                onChange={(e) => setNewTaskCantidad(e.target.value)}
                                                placeholder="Cantidad"
                                                className="w-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                            />
                                            <span className="text-gray-600 dark:text-gray-400">×</span>
                                            <input
                                                type="number"
                                                value={newTaskPrecioUnitario}
                                                onChange={(e) => setNewTaskPrecioUnitario(e.target.value)}
                                                placeholder={newTaskEsPrecioUnitario ? "Precio unit." : "Total"}
                                                step="0.01"
                                                className="w-28 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                            />
                                            <select
                                                value={newTaskEsPrecioUnitario ? 'unitario' : 'total'}
                                                onChange={(e) => setNewTaskEsPrecioUnitario(e.target.value === 'unitario')}
                                                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-gray-900 dark:text-white text-xs outline-none"
                                            >
                                                <option value="unitario">Precio Unitario</option>
                                                <option value="total">Precio Total</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-400 text-sm cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={newTaskIncluyeIgv}
                                                    onChange={(e) => setNewTaskIncluyeIgv(e.target.checked)}
                                                    className="w-4 h-4 rounded"
                                                />
                                                Precio incluye IGV
                                            </label>
                                            {newTaskCantidad && newTaskPrecioUnitario && (
                                                <div className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                                                    Total: S/. {calcularMontoTask().toFixed(2)}
                                                    {!newTaskIncluyeIgv && <span className="text-gray-500 text-xs ml-1">(+IGV)</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        type="number"
                                        value={newTaskMonto}
                                        onChange={(e) => setNewTaskMonto(e.target.value)}
                                        placeholder="Monto S/. (opcional)"
                                        step="0.01"
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm outline-none"
                                    />
                                )}

                                {/* Botones */}
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => {
                                            setShowAddTask(false);
                                            setNewTaskDesc('');
                                            setNewTaskMonto('');
                                            setNewTaskProveedor('');
                                            setNewTaskCantidad('');
                                            setNewTaskPrecioUnitario('');
                                            setNewTaskIncluyeIgv(false);
                                        }}
                                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-xs rounded"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            const monto = newTaskTipo === 'cotizacion' ? calcularMontoTask() : (parseFloat(newTaskMonto) || undefined);
                                            // Generar descripción automática si está vacía
                                            const descripcion = newTaskDesc.trim() || `${newTaskTipo.charAt(0).toUpperCase() + newTaskTipo.slice(1)}${newTaskProveedor ? ` - ${newTaskProveedor}` : ''}`;
                                            setTasksAdicionales(prev => [...prev, {
                                                id: `manual-${Date.now()}`,
                                                tipo: newTaskTipo,
                                                descripcion: descripcion,
                                                monto: monto,
                                                proveedor: newTaskProveedor.trim() || undefined,
                                                cantidad: newTaskCantidad ? parseFloat(newTaskCantidad) : undefined,
                                                precioUnitario: newTaskPrecioUnitario ? parseFloat(newTaskPrecioUnitario) : undefined,
                                                incluyeIgv: newTaskIncluyeIgv
                                            }]);
                                            setNewTaskDesc('');
                                            setNewTaskMonto('');
                                            setNewTaskProveedor('');
                                            setNewTaskCantidad('');
                                            setNewTaskPrecioUnitario('');
                                            setNewTaskIncluyeIgv(false);
                                            setShowAddTask(false);
                                        }}
                                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded"
                                    >
                                        Agregar Task
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumen de costos */}
                    {(eventos.some(e => e.monto && e.monto > 0) || tasksAdicionales.some(t => t.monto && t.monto > 0)) && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-amber-400 font-medium">Costo total del PKL:</span>
                                <span className="text-amber-400 font-bold text-xl">
                                    S/. {(eventos.reduce((sum, e) => sum + (e.monto || 0), 0) + tasksAdicionales.reduce((sum, t) => sum + (t.monto || 0), 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel de edición de Task */}
                {editingTask && (
                    <div className="mx-6 mb-4 p-4 bg-blue-900/30 border border-blue-500/50 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-blue-400 font-bold flex items-center gap-2">
                                ✏️ Editando: {editingTask.nombre || editingTask.tipo}
                            </h4>
                            <button
                                onClick={() => setEditingTask(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Para PRODUCCIÓN: Campo de costo */}
                        {(editingTask.tipo === 'produccion' || editingTask.tipo === 'orden_produccion') && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <label className="text-gray-400 text-sm block mb-1">Proveedor</label>
                                    <input
                                        type="text"
                                        value={editingTask.proveedor || ''}
                                        onChange={(e) => setEditingTask({...editingTask, proveedor: e.target.value})}
                                        placeholder="Buscar o escribir proveedor..."
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                                        list="proveedores-list"
                                    />
                                    <datalist id="proveedores-list">
                                        {Object.entries(proveedores).map(([key, prov]) => (
                                            <option key={key} value={prov.nombre || key}>
                                                {prov.especialidad ? `${prov.nombre || key} - ${prov.especialidad}` : prov.nombre || key}
                                            </option>
                                        ))}
                                    </datalist>
                                    {Object.keys(proveedores).length > 0 && (
                                        <p className="text-gray-500 text-xs mt-1">
                                            {Object.keys(proveedores).length} proveedores disponibles
                                        </p>
                                    )}
                                </div>

                                {/* Cantidad */}
                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">Cantidad</label>
                                    <input
                                        type="number"
                                        value={editingTask.cantidad || ''}
                                        onChange={(e) => setEditingTask({...editingTask, cantidad: parseInt(e.target.value) || undefined})}
                                        placeholder="1"
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                </div>

                                {/* Precio */}
                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">¿Cuánto costó la producción?</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-amber-400">S/.</span>
                                        <input
                                            type="number"
                                            value={editingTask.esPrecioUnitario ? (editingTask.precioUnitario || '') : (editingTask.costo || '')}
                                            onChange={(e) => {
                                                const valor = parseFloat(e.target.value) || undefined;
                                                if (editingTask.esPrecioUnitario) {
                                                    setEditingTask({...editingTask, precioUnitario: valor});
                                                } else {
                                                    setEditingTask({...editingTask, costo: valor});
                                                }
                                            }}
                                            placeholder="0.00"
                                            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                                        />
                                        <select
                                            value={editingTask.esPrecioUnitario ? 'unitario' : 'total'}
                                            onChange={(e) => setEditingTask({...editingTask, esPrecioUnitario: e.target.value === 'unitario'})}
                                            className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm"
                                        >
                                            <option value="unitario">Por unidad</option>
                                            <option value="total">Total</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Incluye IGV */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="incluyeIgv"
                                        checked={editingTask.incluyeIgv || false}
                                        onChange={(e) => setEditingTask({...editingTask, incluyeIgv: e.target.checked})}
                                        className="accent-green-500 w-4 h-4"
                                    />
                                    <label htmlFor="incluyeIgv" className="text-gray-300 text-sm cursor-pointer">
                                        Precio incluye IGV
                                    </label>
                                </div>

                                {/* Resumen del costo total */}
                                {(editingTask.costo || editingTask.precioUnitario) && (
                                    <div className="p-2 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                                        <p className="text-amber-400 text-sm font-medium">
                                            Costo total: S/. {(() => {
                                                let total = 0;
                                                if (editingTask.esPrecioUnitario && editingTask.precioUnitario) {
                                                    total = editingTask.precioUnitario * (editingTask.cantidad || 1);
                                                } else {
                                                    total = editingTask.costo || 0;
                                                }
                                                if (!editingTask.incluyeIgv) {
                                                    total = total * 1.18;
                                                }
                                                return total.toFixed(2);
                                            })()}
                                            {!editingTask.incluyeIgv && <span className="text-gray-500 text-xs ml-1">(+IGV)</span>}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Para COTIZACIÓN: Múltiples cotizaciones con campos completos */}
                        {editingTask.tipo === 'cotizacion' && (
                            <div className="space-y-3">
                                {/* Botón para importar desde producción si existe */}
                                {existingPKL?.tasks?.some(t => {
                                    const tipo = t.tipo as string;
                                    return (tipo === 'produccion' || tipo === 'orden_produccion') && ((t as any).proveedor || (t as any).costo);
                                }) && (
                                    <button
                                        onClick={() => {
                                            const produccionTasks = existingPKL?.tasks?.filter(t => {
                                                const tipo = t.tipo as string;
                                                return (tipo === 'produccion' || tipo === 'orden_produccion') && ((t as any).proveedor || (t as any).costo);
                                            }) || [];

                                            const nuevasCotizaciones = produccionTasks.map(t => {
                                                const taskData = t as any;
                                                return {
                                                    proveedor: taskData.proveedor || '',
                                                    precio: taskData.costo?.monto || taskData.costo || 0,
                                                    cantidad: taskData.cantidad || 1,
                                                    precioUnitario: taskData.precioUnitario,
                                                    esPrecioUnitario: taskData.esPrecioUnitario || false,
                                                    incluyeIgv: taskData.incluyeIgv || false,
                                                    seleccionada: false,
                                                };
                                            });

                                            // Evitar duplicados
                                            const cotizacionesExistentes = editingTask.cotizaciones || [];
                                            const proveedoresExistentes = new Set(cotizacionesExistentes.map(c => c.proveedor));
                                            const cotizacionesNuevas = nuevasCotizaciones.filter(c => c.proveedor && !proveedoresExistentes.has(c.proveedor));

                                            if (cotizacionesNuevas.length > 0) {
                                                setEditingTask({
                                                    ...editingTask,
                                                    cotizaciones: [...cotizacionesExistentes, ...cotizacionesNuevas]
                                                });
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-300 text-sm rounded-lg transition-colors"
                                    >
                                        📥 Importar proveedores desde Producción
                                    </button>
                                )}

                                <div className="flex items-center justify-between">
                                    <label className="text-gray-400 text-sm">Cotizaciones recibidas:</label>
                                    <button
                                        onClick={() => {
                                            const cotizaciones = editingTask.cotizaciones || [];
                                            setEditingTask({
                                                ...editingTask,
                                                cotizaciones: [...cotizaciones, {
                                                    proveedor: '',
                                                    precio: 0,
                                                    cantidad: 1,
                                                    esPrecioUnitario: true,
                                                    incluyeIgv: false
                                                }]
                                            });
                                        }}
                                        className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                                    >
                                        + Agregar cotización
                                    </button>
                                </div>

                                {(editingTask.cotizaciones || []).length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">No hay cotizaciones. Agrega una.</p>
                                ) : (
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {(editingTask.cotizaciones || []).map((cot, idx) => (
                                            <div key={idx} className={`p-3 rounded-lg border ${cot.seleccionada ? 'bg-green-900/30 border-green-500/50' : 'bg-gray-800/50 border-gray-700'}`}>
                                                {/* Header con radio y proveedor */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="radio"
                                                        name="cotizacion_seleccionada"
                                                        checked={cot.seleccionada || false}
                                                        onChange={() => {
                                                            const newCots = (editingTask.cotizaciones || []).map((c, i) => ({
                                                                ...c,
                                                                seleccionada: i === idx
                                                            }));
                                                            setEditingTask({...editingTask, cotizaciones: newCots});
                                                        }}
                                                        className="accent-green-500 w-4 h-4"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={cot.proveedor}
                                                        onChange={(e) => {
                                                            const newCots = [...(editingTask.cotizaciones || [])];
                                                            newCots[idx] = {...newCots[idx], proveedor: e.target.value};
                                                            setEditingTask({...editingTask, cotizaciones: newCots});
                                                        }}
                                                        placeholder="Nombre del proveedor..."
                                                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                                        list={`proveedores-cot-${idx}`}
                                                    />
                                                    <datalist id={`proveedores-cot-${idx}`}>
                                                        {Object.entries(proveedores).map(([key, prov]) => (
                                                            <option key={key} value={prov.nombre || key} />
                                                        ))}
                                                    </datalist>
                                                    <button
                                                        onClick={() => {
                                                            const newCots = (editingTask.cotizaciones || []).filter((_, i) => i !== idx);
                                                            setEditingTask({...editingTask, cotizaciones: newCots});
                                                        }}
                                                        className="text-red-400 hover:text-red-300 text-sm px-2"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                {/* Cantidad y Precio */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500 text-xs">Cant:</span>
                                                        <input
                                                            type="number"
                                                            value={(cot as any).cantidad || ''}
                                                            onChange={(e) => {
                                                                const newCots = [...(editingTask.cotizaciones || [])];
                                                                (newCots[idx] as any).cantidad = parseInt(e.target.value) || 1;
                                                                setEditingTask({...editingTask, cotizaciones: newCots});
                                                            }}
                                                            placeholder="1"
                                                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                                        />
                                                    </div>
                                                    <span className="text-gray-500">×</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-amber-400 text-sm">S/.</span>
                                                        <input
                                                            type="number"
                                                            value={cot.precio || ''}
                                                            onChange={(e) => {
                                                                const newCots = [...(editingTask.cotizaciones || [])];
                                                                newCots[idx] = {...newCots[idx], precio: parseFloat(e.target.value) || 0};
                                                                setEditingTask({...editingTask, cotizaciones: newCots});
                                                            }}
                                                            placeholder="0.00"
                                                            className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                                        />
                                                    </div>
                                                    <select
                                                        value={(cot as any).esPrecioUnitario ? 'unitario' : 'total'}
                                                        onChange={(e) => {
                                                            const newCots = [...(editingTask.cotizaciones || [])];
                                                            (newCots[idx] as any).esPrecioUnitario = e.target.value === 'unitario';
                                                            setEditingTask({...editingTask, cotizaciones: newCots});
                                                        }}
                                                        className="bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white text-xs"
                                                    >
                                                        <option value="unitario">c/u</option>
                                                        <option value="total">total</option>
                                                    </select>
                                                    <label className="flex items-center gap-1 text-xs text-gray-400 ml-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={cot.incluyeIgv}
                                                            onChange={(e) => {
                                                                const newCots = [...(editingTask.cotizaciones || [])];
                                                                newCots[idx] = {...newCots[idx], incluyeIgv: e.target.checked};
                                                                setEditingTask({...editingTask, cotizaciones: newCots});
                                                            }}
                                                            className="accent-green-500"
                                                        />
                                                        Inc. IGV
                                                    </label>
                                                </div>

                                                {/* Total calculado */}
                                                <div className="mt-2 text-right">
                                                    <span className="text-amber-400 text-sm font-medium">
                                                        Total: S/. {(() => {
                                                            const cantidad = (cot as any).cantidad || 1;
                                                            const esPrecioUnitario = (cot as any).esPrecioUnitario !== false;
                                                            let total = esPrecioUnitario ? (cot.precio * cantidad) : cot.precio;
                                                            if (!cot.incluyeIgv) total *= 1.18;
                                                            return total.toFixed(2);
                                                        })()}
                                                    </span>
                                                    {!cot.incluyeIgv && <span className="text-gray-500 text-xs ml-1">(+IGV)</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {(editingTask.cotizaciones || []).some(c => c.seleccionada) && (
                                    <div className="p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
                                        <p className="text-green-400 text-sm">
                                            ✓ Cotización seleccionada: {(editingTask.cotizaciones || []).find(c => c.seleccionada)?.proveedor} -
                                            S/. {(editingTask.cotizaciones || []).find(c => c.seleccionada)?.precio?.toFixed(2)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botón guardar cambios del task */}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setEditingTask(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                                style={{ color: 'white' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (!existingPKL || !editingTask) return;

                                    // Preparar datos actualizados
                                    const updatedTaskData: any = {
                                        nombre: editingTask.nombre,
                                        descripcion: editingTask.descripcion,
                                    };

                                    if (editingTask.tipo === 'produccion' || editingTask.tipo === 'orden_produccion') {
                                        // Calcular costo total
                                        let costoTotal = 0;
                                        if (editingTask.esPrecioUnitario && editingTask.precioUnitario) {
                                            costoTotal = editingTask.precioUnitario * (editingTask.cantidad || 1);
                                        } else if (editingTask.costo) {
                                            costoTotal = editingTask.costo;
                                        }
                                        // Agregar IGV si no está incluido
                                        if (costoTotal > 0 && !editingTask.incluyeIgv) {
                                            costoTotal = costoTotal * 1.18;
                                        }

                                        if (costoTotal > 0) {
                                            updatedTaskData.costo = { monto: costoTotal, moneda: 'PEN' };
                                        }
                                        if (editingTask.proveedor) {
                                            updatedTaskData.proveedor = editingTask.proveedor;
                                        }
                                        if (editingTask.cantidad) {
                                            updatedTaskData.cantidad = editingTask.cantidad;
                                        }
                                        updatedTaskData.incluyeIgv = editingTask.incluyeIgv;
                                        updatedTaskData.esPrecioUnitario = editingTask.esPrecioUnitario;
                                        updatedTaskData.precioUnitario = editingTask.precioUnitario;
                                    }

                                    if (editingTask.tipo === 'cotizacion') {
                                        updatedTaskData.cotizaciones = editingTask.cotizaciones;
                                        const seleccionada = (editingTask.cotizaciones || []).find(c => c.seleccionada);
                                        if (seleccionada) {
                                            // Calcular el total de la cotización seleccionada
                                            const cantidad = (seleccionada as any).cantidad || 1;
                                            const esPrecioUnitario = (seleccionada as any).esPrecioUnitario !== false;
                                            let total = esPrecioUnitario ? (seleccionada.precio * cantidad) : seleccionada.precio;
                                            if (!seleccionada.incluyeIgv) total *= 1.18;

                                            updatedTaskData.costo = { monto: total, moneda: 'PEN' };
                                            updatedTaskData.proveedor = seleccionada.proveedor;
                                            updatedTaskData.cantidad = cantidad;
                                        }
                                    }

                                    // Actualizar el task usando updatePKLTask para persistir en Supabase
                                    await updatePKLTask(existingPKL.pkl_id, editingTask.task_id, updatedTaskData);
                                    setEditingTask(null);
                                    console.log('✅ Task actualizado y guardado en Supabase');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
                                style={{ color: 'white' }}
                            >
                                💾 Guardar Task
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        {isEditMode ? 'Cerrar' : 'Cancelar'}
                    </button>
                    <button
                        onClick={isEditMode ? handleSave : handleCreate}
                        disabled={isCreating || !pklNombre.trim()}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                        style={{ color: 'white' }}
                    >
                        {isCreating ? (
                            <span className="animate-pulse">{isEditMode ? 'Guardando...' : 'Creando PKL...'}</span>
                        ) : isEditMode ? (
                            <>
                                <span>💾</span>
                                Guardar Cambios
                            </>
                        ) : (
                            <>
                                <span>🔗</span>
                                Crear PKL con {eventos.length + tasksAdicionales.length} tasks
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DiaADiaPage({ onBack, onNavigateToPKL }: DiaADiaPageProps) {
    const {
        movimientosLogisticos, rendiciones, eventosProduccion,
        deleteMovimientoLogistico, deleteRendicion, deleteEventoProduccion,
        getClienteLogo,
        createPedido, updatePedido, addPayment,
        updateMovimientoLogistico, updateRendicion, updateEventoProduccion,
        createProduccion,
        clientes,
        pkls,
        createPKL,
        updatePKL,
        deletePKLTask,
        createPKLTask,
        pklParaMerge,
        setPKLParaMerge,
        mergePKLs,
        convertEventoToTask,
    } = useDatabase();

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'movimientos' | 'rendiciones' | 'produccion'>('all');
    const [expandedPKLs, setExpandedPKLs] = useState<Set<string>>(new Set());
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
    const [selectedEventos, setSelectedEventos] = useState<Set<string>>(new Set());
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeSelectionMode, setMergeSelectionMode] = useState(false);
    const [pklEditModal, setPklEditModal] = useState<{ isOpen: boolean; pkl: PKL | null }>({ isOpen: false, pkl: null });
    const [showVincularPKLModal, setShowVincularPKLModal] = useState(false);
    const [mergePKLModal, setMergePKLModal] = useState<{ isOpen: boolean; sourcePklId: string | null }>({ isOpen: false, sourcePklId: null });
    const [convertToTaskModal, setConvertToTaskModal] = useState<{
        isOpen: boolean;
        eventoTipo: 'movimiento' | 'rendicion' | 'produccion';
        eventoId: string;
    } | null>(null);
    const [editPKLDateModal, setEditPKLDateModal] = useState<{
        isOpen: boolean;
        pkls: PKL[];
        currentDate: string;
    } | null>(null);

    // Resetear PKLs expandidos cuando cambia el día seleccionado
    useEffect(() => {
        setExpandedPKLs(new Set());
    }, [selectedDate]);

    // Tipo para tasks de PKL con info del PKL padre
    type PKLTaskConPKL = {
        task: TaskPKL;
        pkl: PKL;
    };

    // Agrupar eventos por fecha (incluyendo PKLs)
    const eventosPorFecha = useMemo(() => {
        const grupos: Record<string, {
            movimientos: MovimientoLogistico[];
            rendiciones: Rendicion[];
            producciones: EventoProduccion[];
            pklsDelDia: PKL[];
            pklTasks: PKLTaskConPKL[];
            totalMonto: number
        }> = {};

        const initGrupo = () => ({ movimientos: [], rendiciones: [], producciones: [], pklsDelDia: [], pklTasks: [], totalMonto: 0 });

        // Agregar movimientos
        movimientosLogisticos.forEach(m => {
            const fecha = getDateKey(m.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) grupos[fecha] = initGrupo();
            grupos[fecha].movimientos.push(m);
            if (m.costo_movilidad) {
                grupos[fecha].totalMonto += Number(m.costo_movilidad);
            }
        });

        // Agregar rendiciones
        rendiciones.forEach(r => {
            const fecha = getDateKey(r.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) grupos[fecha] = initGrupo();
            grupos[fecha].rendiciones.push(r);
            grupos[fecha].totalMonto += Number(r.monto);
        });

        // Agregar eventos de producción
        eventosProduccion.forEach(e => {
            const fecha = getDateKey(e.fecha);
            if (!fecha) return;
            if (!grupos[fecha]) grupos[fecha] = initGrupo();
            grupos[fecha].producciones.push(e);
            if (e.precio_total) {
                grupos[fecha].totalMonto += Number(e.precio_total);
            }
        });

        // Agregar PKLs y sus tasks por fecha
        pkls.forEach(pkl => {
            const fechasConPKL = new Set<string>();

            // 1. Fecha de solicitud del origen
            const fechaOrigen = pkl.origen?.fecha_solicitud || pkl.created_at;
            const fechaOrigenKey = getDateKey(fechaOrigen);
            if (fechaOrigenKey) fechasConPKL.add(fechaOrigenKey);

            // 2. Agregar tasks del PKL a sus respectivas fechas
            pkl.tasks?.forEach(task => {
                // Usar fecha_completado del task, o la fecha de origen del PKL si no tiene
                const taskFecha = task.fecha_completado || fechaOrigen;
                const taskFechaKey = getDateKey(taskFecha);

                if (taskFechaKey) {
                    if (!grupos[taskFechaKey]) grupos[taskFechaKey] = initGrupo();

                    // Agregar el task con referencia al PKL padre
                    grupos[taskFechaKey].pklTasks.push({ task, pkl });

                    // Agregar el costo del task al total del día
                    if (task.costo) {
                        const monto = typeof task.costo === 'number'
                            ? task.costo
                            : (task.costo.monto || 0);
                        grupos[taskFechaKey].totalMonto += Number(monto);
                    }

                    fechasConPKL.add(taskFechaKey);
                }
            });

            // 3. Fechas de eventos vinculados (movimientos, rendiciones, producciones)
            movimientosLogisticos.forEach(m => {
                if (m.pedido_id === pkl.pkl_id) {
                    const fecha = getDateKey(m.fecha);
                    if (fecha) fechasConPKL.add(fecha);
                }
            });
            rendiciones.forEach(r => {
                if (r.pedido_id === pkl.pkl_id) {
                    const fecha = getDateKey(r.fecha);
                    if (fecha) fechasConPKL.add(fecha);
                }
            });
            eventosProduccion.forEach(e => {
                if (e.pedido_id === pkl.pkl_id) {
                    const fecha = getDateKey(e.fecha);
                    if (fecha) fechasConPKL.add(fecha);
                }
            });

            // Agregar el PKL a todos los días donde tiene actividad (para referencia)
            fechasConPKL.forEach(fecha => {
                if (!grupos[fecha]) grupos[fecha] = initGrupo();
                if (!grupos[fecha].pklsDelDia.some(p => p.pkl_id === pkl.pkl_id)) {
                    grupos[fecha].pklsDelDia.push(pkl);
                }
            });
        });

        return grupos;
    }, [movimientosLogisticos, rendiciones, eventosProduccion, pkls]);

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

    // Toggle selección de evento
    const toggleEventoSelection = (id: string) => {
        setSelectedEventos(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Obtener eventos seleccionados con sus datos
    const eventosSeleccionadosData = useMemo((): EventoSeleccionable[] => {
        const result: EventoSeleccionable[] = [];

        selectedEventos.forEach(id => {
            // Buscar en movimientos
            const mov = movimientosLogisticos.find(m => m.id === id);
            if (mov) {
                const detalle = mov.detalle as any;
                let descripcion = mov.observaciones || '';
                if (detalle?.items?.length) {
                    descripcion = detalle.items.map((i: any) => `${i.cantidad} ${i.producto}`).join(', ');
                }
                result.push({
                    id: mov.id,
                    tipo_evento: 'movimiento',
                    tipo: mov.tipo,
                    cliente: mov.cliente,
                    descripcion,
                    monto: mov.costo_movilidad,
                    fecha: mov.fecha,
                    data: mov
                });
                return;
            }

            // Buscar en rendiciones
            const rend = rendiciones.find(r => r.id === id);
            if (rend) {
                const detalle = rend.detalle as any;
                result.push({
                    id: rend.id,
                    tipo_evento: 'rendicion',
                    tipo: rend.tipo,
                    cliente: rend.cliente,
                    descripcion: detalle?.concepto || rend.observaciones || rend.tipo,
                    monto: rend.monto,
                    fecha: rend.fecha,
                    data: rend
                });
                return;
            }

            // Buscar en producciones
            const prod = eventosProduccion.find(p => p.id === id);
            if (prod) {
                result.push({
                    id: prod.id,
                    tipo_evento: 'produccion',
                    tipo: 'produccion',
                    cliente: prod.cliente,
                    descripcion: `${prod.producto} x ${prod.cantidad || 1}`,
                    monto: prod.precio_total,
                    fecha: prod.fecha,
                    data: prod
                });
            }
        });

        return result;
    }, [selectedEventos, movimientosLogisticos, rendiciones, eventosProduccion]);

    // Handler para desvincular un evento de un PKL
    const handleDecoupleFromPKL = async (pklId: string, eventId: string) => {
        const pkl = pkls.find(p => p.pkl_id === pklId);
        if (!pkl) {
            console.error('PKL no encontrado:', pklId);
            return;
        }

        // Buscar el task que tiene este evento_origen_id
        const taskToDelete = pkl.tasks.find(task => (task as any).evento_origen_id === eventId);

        if (!taskToDelete) {
            console.error('Task no encontrado para evento:', eventId);
            alert('No se encontró el task vinculado a este evento');
            return;
        }

        // Eliminar el task usando deletePKLTask
        await deletePKLTask(pklId, taskToDelete.task_id);
        console.log(`✅ Evento ${eventId} desvinculado de ${pklId} (task: ${taskToDelete.task_id})`);
    };

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

    // Abrir modal de edición - si está vinculado a PKL, abrir modal de PKL
    const handleEdit = (type: string, id: string) => {
        // Buscar si el evento está vinculado a un PKL
        const linkedPKL = pkls.find(pkl =>
            pkl.tasks?.some(task => (task as any).evento_origen_id === id)
        );

        if (linkedPKL) {
            // Abrir modal de PKL en modo edición
            setPklEditModal({ isOpen: true, pkl: linkedPKL });
        } else {
            // Abrir modal de edición normal del evento
            setEditModal({
                isOpen: true,
                tipo: type as 'movimiento' | 'rendicion' | 'produccion',
                id
            });
        }
    };

    // Editar evento directamente (siempre abre modal de evento, ignora PKL)
    const handleEditDirect = (type: string, id: string) => {
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
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-3xl font-black">
                            <span className="text-cyan-400">📅</span> Día a Día
                        </h1>
                        <p className="text-gray-500 text-sm">Registro de actividades diarias</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        Todo
                    </button>
                    <button
                        onClick={() => setFilterType('movimientos')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'movimientos' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        🚚 Movimientos
                    </button>
                    <button
                        onClick={() => setFilterType('rendiciones')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'rendiciones' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        💰 Rendiciones
                    </button>
                    <button
                        onClick={() => setFilterType('produccion')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'produccion' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                        🏭 Producción
                    </button>
                    <div className="border-l border-gray-700 h-8 mx-2"></div>
                    <button
                        onClick={() => {
                            setMergeSelectionMode(!mergeSelectionMode);
                            if (mergeSelectionMode) {
                                setSelectedEventos(new Set());
                            }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                            mergeSelectionMode ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-purple-600/50'
                        }`}
                    >
                        🔗 {mergeSelectionMode ? 'Cancelar fusión' : 'Fusionar eventos'}
                    </button>
                    {/* Botón Seleccionar todo - solo visible cuando hay un día seleccionado */}
                    {selectedDate && diaSeleccionado && (
                        <button
                            onClick={() => {
                                // Obtener todos los eventos del día que NO tienen PKL vinculado
                                const eventosSeleccionables: string[] = [];

                                diaSeleccionado.movimientos.forEach(m => {
                                    const linkedPKL = findPKLForEvent(m.id, pkls, m.pedido_id);
                                    if (!linkedPKL) eventosSeleccionables.push(m.id);
                                });
                                diaSeleccionado.rendiciones.forEach(r => {
                                    const linkedPKL = findPKLForEvent(r.id, pkls, r.pedido_id);
                                    if (!linkedPKL) eventosSeleccionables.push(r.id);
                                });
                                diaSeleccionado.producciones.forEach(p => {
                                    const linkedPKL = findPKLForEvent(p.id, pkls, p.pedido_id);
                                    if (!linkedPKL) eventosSeleccionables.push(p.id);
                                });

                                if (eventosSeleccionables.length > 0) {
                                    // Si ya están todos seleccionados, deseleccionar
                                    const allSelected = eventosSeleccionables.every(id => selectedEventos.has(id));
                                    if (allSelected) {
                                        setSelectedEventos(new Set());
                                    } else {
                                        setSelectedEventos(new Set(eventosSeleccionables));
                                    }
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                (() => {
                                    // Calcular si todos están seleccionados
                                    const eventosSeleccionables: string[] = [];
                                    diaSeleccionado.movimientos.forEach(m => {
                                        if (!findPKLForEvent(m.id, pkls, m.pedido_id)) eventosSeleccionables.push(m.id);
                                    });
                                    diaSeleccionado.rendiciones.forEach(r => {
                                        if (!findPKLForEvent(r.id, pkls, r.pedido_id)) eventosSeleccionables.push(r.id);
                                    });
                                    diaSeleccionado.producciones.forEach(p => {
                                        if (!findPKLForEvent(p.id, pkls, p.pedido_id)) eventosSeleccionables.push(p.id);
                                    });
                                    const allSelected = eventosSeleccionables.length > 0 && eventosSeleccionables.every(id => selectedEventos.has(id));
                                    return allSelected ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-green-600/50';
                                })()
                            }`}
                            title="Seleccionar todos los eventos sin PKL vinculado"
                        >
                            ☑️ Seleccionar todo
                        </button>
                    )}
                </div>
            </header>

            {/* KPIs Resumen */}
            <div className="grid grid-cols-5 gap-4 mb-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white">{totales.dias}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Días</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">{totales.movimientos}</div>
                    <div className="text-xs text-blue-400/70 uppercase tracking-wider">Movimientos</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-orange-400">{totales.rendiciones}</div>
                    <div className="text-xs text-orange-400/70 uppercase tracking-wider">Rendiciones</div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-indigo-400">{totales.producciones}</div>
                    <div className="text-xs text-indigo-400/70 uppercase tracking-wider">Producciones</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-amber-400">S/. {totales.montoTotal.toFixed(2)}</div>
                    <div className="text-xs text-amber-400/70 uppercase tracking-wider">Monto Total</div>
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
                                    const totalEventos = grupo.movimientos.length + grupo.rendiciones.length + grupo.producciones.length + (grupo.pklsDelDia?.length || 0);

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
                                                {grupo.pklsDelDia && grupo.pklsDelDia.length > 0 && (
                                                    <span className="flex items-center gap-1 text-cyan-400">
                                                        📋 {grupo.pklsDelDia.length}
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
                                <div className="flex items-center gap-3">
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
                                    {/* Botón para editar fechas de PKLs del día */}
                                    {diaSeleccionado.pklsDelDia && diaSeleccionado.pklsDelDia.length > 0 && (
                                        <button
                                            onClick={() => setEditPKLDateModal({
                                                isOpen: true,
                                                pkls: diaSeleccionado.pklsDelDia,
                                                currentDate: selectedDate!
                                            })}
                                            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition-colors"
                                            title="Editar fecha de PKLs de este día"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    )}
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
                                        🚚 Eventos Logísticos ({diaSeleccionado.movimientos.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.movimientos.map(m => {
                                            const linkedPKL = findPKLForEvent(m.id, pkls, m.pedido_id);
                                            return (
                                                <MovimientoCard
                                                    key={m.id}
                                                    movimiento={m}
                                                    onEdit={() => handleEdit('movimiento', m.id)}
                                                    onEditDirect={() => handleEditDirect('movimiento', m.id)}
                                                    onDelete={() => handleDeleteMovimiento(m.id)}
                                                    onSync={() => handleSync('movimiento', m)}
                                                    clienteLogo={m.cliente ? getClienteLogo(m.cliente) : null}
                                                    isSelected={selectedEventos.has(m.id)}
                                                    onToggleSelect={linkedPKL ? undefined : () => toggleEventoSelection(m.id)}
                                                    linkedPKL={linkedPKL}
                                                    onDecouple={handleDecoupleFromPKL}
                                                    onConvertToTask={() => setConvertToTaskModal({
                                                        isOpen: true,
                                                        eventoTipo: 'movimiento',
                                                        eventoId: m.id
                                                    })}
                                                />
                                            );
                                        })}
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
                                        {diaSeleccionado.rendiciones.map(r => {
                                            const linkedPKL = findPKLForEvent(r.id, pkls, r.pedido_id);
                                            return (
                                                <RendicionCard
                                                    key={r.id}
                                                    rendicion={r}
                                                    onEdit={() => handleEdit('rendicion', r.id)}
                                                    onEditDirect={() => handleEditDirect('rendicion', r.id)}
                                                    onDelete={() => handleDeleteRendicion(r.id)}
                                                    onSync={() => handleSync('rendicion', r)}
                                                    clienteLogo={r.cliente ? getClienteLogo(r.cliente) : null}
                                                    isSelected={selectedEventos.has(r.id)}
                                                    onToggleSelect={linkedPKL ? undefined : () => toggleEventoSelection(r.id)}
                                                    linkedPKL={linkedPKL}
                                                    onDecouple={handleDecoupleFromPKL}
                                                    onConvertToTask={() => setConvertToTaskModal({
                                                        isOpen: true,
                                                        eventoTipo: 'rendicion',
                                                        eventoId: r.id
                                                    })}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Producciones */}
                            {(filterType === 'all' || filterType === 'produccion') && diaSeleccionado.producciones.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3">
                                        🏭 Producción ({diaSeleccionado.producciones.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.producciones.map(e => {
                                            const linkedPKL = findPKLForEvent(e.id, pkls, e.pedido_id);
                                            return (
                                                <ProduccionCard
                                                    key={e.id}
                                                    evento={e}
                                                    onEdit={() => handleEdit('produccion', e.id)}
                                                    onDelete={() => handleDeleteProduccion(e.id)}
                                                    onSync={() => handleSync('produccion', e)}
                                                    clienteLogo={e.cliente ? getClienteLogo(e.cliente) : null}
                                                    isSelected={selectedEventos.has(e.id)}
                                                    onToggleSelect={linkedPKL ? undefined : () => toggleEventoSelection(e.id)}
                                                    linkedPKL={linkedPKL}
                                                    onDecouple={handleDecoupleFromPKL}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* PKLs del día como eventos con acordeón */}
                            {filterType === 'all' && diaSeleccionado.pklsDelDia && diaSeleccionado.pklsDelDia.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                                        📋 PKLs del Día ({diaSeleccionado.pklsDelDia.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {diaSeleccionado.pklsDelDia.map(pkl => {
                                            const estadoInfo = ESTADOS_PKL.find(e => e.value === pkl.estado.actual);
                                            const tipoInfo = TIPOS_OPERACION_PKL.find(t => t.value === pkl.clasificacion?.tipo_operacion);
                                            const clienteLogo = pkl.cliente?.nombre ? getClienteLogo(pkl.cliente.nombre) : null;

                                            // Filtrar tasks de este PKL que corresponden a ESTE día
                                            const tasksDelDia = pkl.tasks?.filter(task => {
                                                const taskFecha = task.fecha_completado || pkl.origen?.fecha_solicitud || pkl.created_at;
                                                const taskFechaKey = getDateKey(taskFecha);
                                                return taskFechaKey === selectedDate;
                                            }) || [];

                                            const isExpanded = expandedPKLs.has(pkl.pkl_id);

                                            // Calcular monto solo de los tasks de este día
                                            const montoDelDia = tasksDelDia.reduce((sum, task) => {
                                                if (task.costo) {
                                                    const monto = typeof task.costo === 'number' ? task.costo : (task.costo.monto || 0);
                                                    return sum + monto;
                                                }
                                                return sum;
                                            }, 0);

                                            return (
                                                <div
                                                    key={pkl.pkl_id}
                                                    className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors"
                                                >
                                                    {/* Header del PKL - clickeable para expandir/colapsar */}
                                                    <button
                                                        onClick={() => {
                                                            setExpandedPKLs(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(pkl.pkl_id)) {
                                                                    next.delete(pkl.pkl_id);
                                                                } else {
                                                                    next.add(pkl.pkl_id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-full p-4 text-left hover:bg-gray-800/80 transition-colors"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {/* Indicador de expandir */}
                                                            <div className={`w-6 h-6 rounded flex items-center justify-center transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </div>

                                                            {/* Logo del cliente */}
                                                            {clienteLogo ? (
                                                                <img src={clienteLogo} alt={pkl.cliente.nombre} className="w-10 h-10 rounded-lg object-cover" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                                                                    {pkl.cliente.nombre.substring(0, 2).toUpperCase()}
                                                                </div>
                                                            )}

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-white font-medium truncate">
                                                                        {pkl.origen.descripcion_inicial}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1 text-xs">
                                                                    <span className="text-gray-400">{pkl.cliente.nombre}</span>
                                                                    {tipoInfo && (
                                                                        <>
                                                                            <span className="text-gray-600">•</span>
                                                                            <span className="text-gray-500">{tipoInfo.label}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-xs font-mono">
                                                                        {pkl.pkl_id}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-xs text-white ${estadoInfo?.color || 'bg-gray-500'}`}>
                                                                        {estadoInfo?.label || pkl.estado.actual}
                                                                    </span>
                                                                    <span className="text-cyan-400 text-xs font-medium">
                                                                        {tasksDelDia.length} task{tasksDelDia.length !== 1 ? 's' : ''} este día
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Monto del día */}
                                                            {montoDelDia > 0 && (
                                                                <div className="text-right">
                                                                    <span className="text-amber-400 font-mono font-bold">
                                                                        S/. {montoDelDia.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>

                                                    {/* Tasks del día (acordeón) */}
                                                    {isExpanded && tasksDelDia.length > 0 && (
                                                        <div className="border-t border-gray-700 bg-gray-900/50 p-3 space-y-2">
                                                            {tasksDelDia.map(task => {
                                                                const tipoEmojis: Record<string, string> = {
                                                                    cotizacion: '📋', coordinacion_proveedor: '🤝', compra_insumo: '🛒',
                                                                    pago: '💰', movilidad: '🚚', instalacion: '🔧', cierre: '✅', administrativo: '📄'
                                                                };
                                                                const emoji = tipoEmojis[task.tipo] || '📋';
                                                                const monto = task.costo ? (typeof task.costo === 'number' ? task.costo : task.costo.monto) : 0;

                                                                return (
                                                                    <div
                                                                        key={task.task_id}
                                                                        className="flex items-start gap-2 p-2 rounded bg-gray-800/50 border border-gray-700/50"
                                                                    >
                                                                        <span className="text-lg">{emoji}</span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-white text-sm">{task.nombre}</span>
                                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                                                    task.estado === 'completado' ? 'bg-green-500/20 text-green-400' :
                                                                                    task.estado === 'en_progreso' ? 'bg-blue-500/20 text-blue-400' :
                                                                                    task.estado === 'cancelado' ? 'bg-red-500/20 text-red-400' :
                                                                                    'bg-gray-500/20 text-gray-400'
                                                                                }`}>
                                                                                    {task.estado}
                                                                                </span>
                                                                            </div>
                                                                            {task.descripcion && task.descripcion !== task.nombre && (
                                                                                <p className="text-gray-500 text-xs mt-0.5">{task.descripcion}</p>
                                                                            )}
                                                                        </div>
                                                                        {monto > 0 && (
                                                                            <span className="text-amber-400 font-mono text-xs">
                                                                                S/. {monto.toFixed(2)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Link para ver PKL completo */}
                                                            <button
                                                                onClick={() => onNavigateToPKL?.(pkl.pkl_id)}
                                                                className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 py-2 hover:bg-cyan-500/10 rounded transition-colors"
                                                            >
                                                                Ver PKL completo →
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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

            {/* Botón flotante para fusionar eventos seleccionados */}
            {selectedEventos.size > 0 && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom fade-in duration-300">
                    <div className="bg-gray-900 border border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/20 p-4">
                        {/* Mostrar PKL destino si hay uno seleccionado */}
                        {pklParaMerge && (
                            <div className="mb-3 pb-3 border-b border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-purple-400 text-sm">Agregar a:</span>
                                    <span className="font-mono text-cyan-400 text-sm bg-cyan-500/20 px-2 py-0.5 rounded">{pklParaMerge}</span>
                                </div>
                                <button
                                    onClick={() => setPKLParaMerge(null)}
                                    className="text-gray-400 hover:text-white text-xs"
                                    title="Crear nuevo PKL en vez"
                                >
                                    (cambiar)
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-white font-bold">{selectedEventos.size} evento{selectedEventos.size > 1 ? 's' : ''} seleccionado{selectedEventos.size > 1 ? 's' : ''}</span>
                                <span className="text-gray-400 text-xs">
                                    {eventosSeleccionadosData.filter(e => e.tipo_evento === 'movimiento').length > 0 && `${eventosSeleccionadosData.filter(e => e.tipo_evento === 'movimiento').length} mov`}
                                    {eventosSeleccionadosData.filter(e => e.tipo_evento === 'rendicion').length > 0 && ` ${eventosSeleccionadosData.filter(e => e.tipo_evento === 'rendicion').length} rend`}
                                    {eventosSeleccionadosData.filter(e => e.tipo_evento === 'produccion').length > 0 && ` ${eventosSeleccionadosData.filter(e => e.tipo_evento === 'produccion').length} prod`}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedEventos(new Set())}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                title="Limpiar selección"
                            >
                                ✕
                            </button>
                            {pklParaMerge ? (
                                <button
                                    onClick={async () => {
                                        const pkl = pkls.find(p => p.pkl_id === pklParaMerge);
                                        if (!pkl) return;

                                        // Crear tasks para cada evento
                                        const newTasks = eventosSeleccionadosData.map((evento, idx) => {
                                            const tipoEmoji = evento.tipo_evento === 'movimiento' ? '🚚' :
                                                             evento.tipo_evento === 'rendicion' ? '💰' : '🏭';
                                            return {
                                                task_id: `TASK-${Date.now()}-${idx}`,
                                                orden: pkl.tasks.length + idx + 1,
                                                nombre: `${tipoEmoji} ${evento.tipo.toUpperCase()}: ${evento.descripcion}`.substring(0, 100),
                                                descripcion: evento.descripcion,
                                                tipo: evento.tipo_evento === 'movimiento' ? 'logistica' as const :
                                                      evento.tipo_evento === 'rendicion' ? 'administrativo' as const : 'produccion' as const,
                                                responsable: 'Huber',
                                                estado: 'completado' as const,
                                                es_happy_path: true,
                                                tipo_origen: evento.tipo_evento,
                                                evento_origen_id: evento.id,
                                                fecha_completado: evento.fecha,
                                            };
                                        });

                                        // Calcular nuevos costos
                                        const newCostos = eventosSeleccionadosData.reduce((sum, e) => sum + (e.monto || 0), 0);
                                        const newCostoDetalle = eventosSeleccionadosData
                                            .filter(e => e.monto && e.monto > 0)
                                            .map(e => ({
                                                concepto: `${e.tipo}: ${e.descripcion}`.substring(0, 50),
                                                monto: e.monto || 0,
                                                fecha: e.fecha,
                                            }));

                                        // Actualizar PKL
                                        await updatePKL(pklParaMerge, {
                                            tasks: [...pkl.tasks, ...newTasks] as any,
                                            costos: {
                                                ...pkl.costos,
                                                detalle: [...(pkl.costos.detalle || []), ...newCostoDetalle],
                                                total: (pkl.costos.total || 0) + newCostos,
                                            },
                                            updated_at: new Date().toISOString(),
                                        });

                                        setSelectedEventos(new Set());
                                        setPKLParaMerge(null);
                                    }}
                                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                                >
                                    📥 Agregar a {pklParaMerge.replace('PKL-', '')}
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowMergeModal(true)}
                                        className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                                    >
                                        ➕ Crear PKL
                                    </button>
                                    <button
                                        onClick={() => setShowVincularPKLModal(true)}
                                        className="px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                                    >
                                        🔗 Vincular a PKL
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de fusión a PKL */}
            {showMergeModal && (
                <MergeEventosToPKLModal
                    isOpen={showMergeModal}
                    onClose={() => setShowMergeModal(false)}
                    eventos={eventosSeleccionadosData}
                    clientes={clientes}
                    onSuccess={() => {
                        setShowMergeModal(false);
                        setSelectedEventos(new Set());
                        setMergeSelectionMode(false);
                        // Navegar al dashboard principal después de crear PKL exitosamente
                        onBack();
                    }}
                />
            )}

            {/* Modal de edición de PKL */}
            {pklEditModal.isOpen && pklEditModal.pkl && (
                <MergeEventosToPKLModal
                    isOpen={pklEditModal.isOpen}
                    onClose={() => setPklEditModal({ isOpen: false, pkl: null })}
                    eventos={[]}
                    clientes={clientes}
                    onSuccess={() => setPklEditModal({ isOpen: false, pkl: null })}
                    existingPKL={pkls.find(p => p.pkl_id === pklEditModal.pkl?.pkl_id) || pklEditModal.pkl}
                />
            )}

            {/* Modal para vincular eventos a PKL existente o crear nuevo */}
            {showVincularPKLModal && (
                <VincularAPKLModal
                    isOpen={showVincularPKLModal}
                    onClose={() => setShowVincularPKLModal(false)}
                    eventos={eventosSeleccionadosData}
                    pkls={pkls}
                    getClienteLogo={getClienteLogo}
                    onCreateNew={async (pklData) => {
                        // Crear nuevo PKL
                        const year = new Date().getFullYear();
                        const prefix = `PKL-${year}-`;
                        let maxNum = 0;
                        pkls.forEach(pkl => {
                            if (pkl.pkl_id.startsWith(prefix)) {
                                const num = parseInt(pkl.pkl_id.replace(prefix, ''), 10);
                                if (!isNaN(num) && num > maxNum) {
                                    maxNum = num;
                                }
                            }
                        });
                        const newPklId = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
                        const now = new Date().toISOString();
                        // Usar fecha del evento si se proporcionó, sino usar fecha actual
                        const fechaSolicitud = pklData.fecha
                            ? new Date(pklData.fecha + 'T12:00:00').toISOString()
                            : now;

                        const newPKL: PKL = {
                            pkl_id: newPklId,
                            version: '2.0',
                            created_at: now,
                            updated_at: now,
                            origen: {
                                canal: 'otro',
                                fecha_solicitud: fechaSolicitud,
                                descripcion_inicial: pklData.descripcion,
                            },
                            cliente: {
                                nombre: pklData.cliente || 'Sin cliente',
                            },
                            clasificacion: {
                                tipo_operacion: pklData.tipoOperacion as any,
                                area: 'logistica',
                            },
                            productos: [],
                            proveedores: [],
                            estado: {
                                actual: 'recibido',
                                historial: [{
                                    estado: 'recibido',
                                    fecha: now,
                                    motivo: `PKL creado desde Día a Día con ${eventosSeleccionadosData.length} eventos`,
                                }],
                            },
                            tasks: [],
                            eventos_externos: [],
                            costos: {
                                total: 0,
                                detalle: [],
                                moneda: 'PEN',
                            },
                            cierre: {
                                evidencias: [],
                            },
                            alertas: {
                                dias_sin_actividad: 0,
                                umbral_pausa_dias: 3,
                            },
                        };

                        await createPKL(newPKL);
                        return newPklId;
                    }}
                    onSuccess={async (pklId) => {
                        // Vincular eventos seleccionados al PKL
                        const pkl = pkls.find(p => p.pkl_id === pklId);

                        // Crear tasks para cada evento
                        for (const evento of eventosSeleccionadosData) {
                            const tipoEmoji = evento.tipo_evento === 'movimiento' ? '🚚' :
                                             evento.tipo_evento === 'rendicion' ? '💰' : '🏭';
                            const taskTipo = evento.tipo_evento === 'movimiento' ? 'movilidad' :
                                            evento.tipo_evento === 'rendicion' ? 'pago' : 'coordinacion_proveedor';

                            await createPKLTask(pklId, {
                                nombre: `${tipoEmoji} ${evento.descripcion}`.substring(0, 100),
                                descripcion: evento.descripcion,
                                tipo: taskTipo as any,
                                estado: 'completado',
                                orden: (pkl?.tasks?.length || 0) + 1,
                                costo: evento.monto ? { monto: evento.monto, moneda: 'PEN' } : undefined,
                                evento_origen_id: evento.id,
                                responsable: 'Huber',
                                es_happy_path: true,
                            });

                            // Actualizar el evento con el pkl_id
                            if (evento.tipo_evento === 'movimiento') {
                                await updateMovimientoLogistico(evento.id, { pedido_id: pklId });
                            } else if (evento.tipo_evento === 'rendicion') {
                                await updateRendicion(evento.id, { pedido_id: pklId });
                            } else {
                                await updateEventoProduccion(evento.id, { pedido_id: pklId });
                            }
                        }

                        // Actualizar costos del PKL
                        const totalMonto = eventosSeleccionadosData.reduce((sum, e) => sum + (e.monto || 0), 0);
                        if (totalMonto > 0 && pkl) {
                            await updatePKL(pklId, {
                                costos: {
                                    ...pkl.costos,
                                    total: (pkl.costos?.total || 0) + totalMonto,
                                }
                            } as any);
                        }

                        setShowVincularPKLModal(false);
                        setSelectedEventos(new Set());
                        setMergeSelectionMode(false);
                        // Navegar al dashboard principal después de vincular a PKL exitosamente
                        onBack();
                    }}
                />
            )}

            {/* Modal para fusionar PKLs */}
            {mergePKLModal.isOpen && mergePKLModal.sourcePklId && (
                <MergePKLModal
                    isOpen={mergePKLModal.isOpen}
                    onClose={() => setMergePKLModal({ isOpen: false, sourcePklId: null })}
                    sourcePklId={mergePKLModal.sourcePklId}
                    pkls={pkls}
                    getClienteLogo={getClienteLogo}
                    onMerge={async (targetPklId) => {
                        // Fusionar PKL source con target usando mergePKLs
                        await mergePKLs(targetPklId, [mergePKLModal.sourcePklId!]);
                        setMergePKLModal({ isOpen: false, sourcePklId: null });
                    }}
                />
            )}

            {/* Modal para convertir evento a task de otro PKL */}
            {convertToTaskModal?.isOpen && (
                <ConvertToTaskModal
                    isOpen={true}
                    onClose={() => setConvertToTaskModal(null)}
                    eventoTipo={convertToTaskModal.eventoTipo}
                    eventoId={convertToTaskModal.eventoId}
                    pkls={pkls}
                    getClienteLogo={getClienteLogo}
                    onConvert={async (targetPklId) => {
                        await convertEventoToTask(
                            convertToTaskModal.eventoTipo,
                            convertToTaskModal.eventoId,
                            targetPklId
                        );
                        setConvertToTaskModal(null);
                    }}
                />
            )}

            {/* Modal para editar fecha de PKLs del día */}
            {editPKLDateModal?.isOpen && (
                <EditPKLDateModal
                    isOpen={true}
                    pkls={editPKLDateModal.pkls}
                    currentDate={editPKLDateModal.currentDate}
                    onClose={() => setEditPKLDateModal(null)}
                    onSave={async (pklIds, newDate) => {
                        // Actualizar la fecha de todos los PKLs seleccionados
                        // Actualizamos tanto created_at (usado en tabla) como origen.fecha_solicitud
                        const fechaISO = new Date(newDate + 'T12:00:00').toISOString();
                        for (const pklId of pklIds) {
                            const pkl = editPKLDateModal.pkls.find(p => p.pkl_id === pklId);
                            if (pkl) {
                                await updatePKL(pklId, {
                                    created_at: fechaISO,
                                    origen: {
                                        ...pkl.origen,
                                        fecha_solicitud: newDate
                                    }
                                } as any);
                            }
                        }
                        setEditPKLDateModal(null);
                    }}
                />
            )}
        </div>
    );
}

// Modal para editar fecha de PKLs del día
function EditPKLDateModal({ isOpen, pkls, currentDate, onClose, onSave }: {
    isOpen: boolean;
    pkls: PKL[];
    currentDate: string;
    onClose: () => void;
    onSave: (pklIds: string[], newDate: string) => Promise<void>;
}) {
    const [newDate, setNewDate] = useState('');
    const [selectedPkls, setSelectedPkls] = useState<Set<string>>(new Set(pkls.map(p => p.pkl_id)));
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!newDate || selectedPkls.size === 0) return;
        setIsSaving(true);
        try {
            await onSave(Array.from(selectedPkls), newDate);
        } finally {
            setIsSaving(false);
        }
    };

    const togglePkl = (pklId: string) => {
        const next = new Set(selectedPkls);
        if (next.has(pklId)) {
            next.delete(pklId);
        } else {
            next.add(pklId);
        }
        setSelectedPkls(next);
    };

    const selectAll = () => setSelectedPkls(new Set(pkls.map(p => p.pkl_id)));
    const selectNone = () => setSelectedPkls(new Set());

    if (!isOpen) return null;

    // Calcular día de la semana
    const getDayName = (dateStr: string) => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const date = new Date(dateStr + 'T12:00:00');
        return days[date.getDay()];
    };

    const currentDayName = getDayName(currentDate);
    const newDayName = newDate ? getDayName(newDate) : '';
    const isNewSunday = newDayName === 'Domingo';

    return createPortal(
        <div
            className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="liquid-glass liquid-glass-blue rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📅</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">Cambiar Fecha</h2>
                                <p className="text-white/70 text-sm">
                                    {currentDayName}, {new Date(currentDate + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Selección de nueva fecha */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nueva Fecha
                        </label>
                        <input
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>

                    {newDate && (
                        <div className={`p-3 rounded-lg ${isNewSunday ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
                            <p className={`text-sm font-medium ${isNewSunday ? 'text-red-400' : 'text-green-400'}`}>
                                {newDayName}, {new Date(newDate + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            {isNewSunday && (
                                <p className="text-red-400/70 text-xs mt-1">⚠️ Los domingos normalmente no se trabaja</p>
                            )}
                        </div>
                    )}

                    {/* Lista de PKLs para seleccionar */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">
                                PKLs a mover ({selectedPkls.size} de {pkls.length})
                            </label>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-xs text-cyan-400 hover:underline">Todos</button>
                                <button onClick={selectNone} className="text-xs text-gray-400 hover:underline">Ninguno</button>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {pkls.map(pkl => (
                                <label
                                    key={pkl.pkl_id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                        selectedPkls.has(pkl.pkl_id)
                                            ? 'bg-cyan-500/20 border border-cyan-500/50'
                                            : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPkls.has(pkl.pkl_id)}
                                        onChange={() => togglePkl(pkl.pkl_id)}
                                        className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-cyan-400 text-sm">{pkl.pkl_id}</span>
                                        </div>
                                        <p className="text-white text-sm truncate">{pkl.cliente?.nombre}</p>
                                        <p className="text-gray-500 text-xs truncate">{pkl.origen?.descripcion_inicial}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !newDate || selectedPkls.size === 0}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <span className="animate-pulse">Guardando...</span>
                        ) : (
                            <>
                                <span>💾</span>
                                <span>Mover {selectedPkls.size} PKL{selectedPkls.size !== 1 ? 's' : ''}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Generar siguiente PKL ID
function generateNextPKLId(existingPkls: PKL[]): string {
    const year = new Date().getFullYear();
    const prefix = `PKL-${year}-`;
    let maxNum = 0;
    existingPkls.forEach(pkl => {
        if (pkl.pkl_id.startsWith(prefix)) {
            const num = parseInt(pkl.pkl_id.replace(prefix, ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

// Modal para fusionar un PKL con otro
function MergePKLModal({ isOpen, onClose, sourcePklId, pkls, getClienteLogo, onMerge }: {
    isOpen: boolean;
    onClose: () => void;
    sourcePklId: string;
    pkls: PKL[];
    getClienteLogo: (nombre: string) => string | null;
    onMerge: (targetPklId: string) => Promise<void>;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sourcePkl = pkls.find(p => p.pkl_id === sourcePklId);

    // Filtrar PKLs (excluir el source y los cerrados/cancelados)
    const pklsFiltrados = useMemo(() => {
        let filtered = pkls.filter(p =>
            p.pkl_id !== sourcePklId &&
            p.estado.actual !== 'cerrado_ok' &&
            p.estado.actual !== 'cancelado'
        );

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.pkl_id.toLowerCase().includes(query) ||
                p.cliente.nombre.toLowerCase().includes(query) ||
                p.origen.descripcion_inicial.toLowerCase().includes(query)
            );
        }

        return filtered.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ).slice(0, 20);
    }, [pkls, searchQuery, sourcePklId]);

    const handleSubmit = async () => {
        if (!selectedTargetId) return;
        setIsSubmitting(true);
        try {
            await onMerge(selectedTargetId);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !sourcePkl) return null;

    return createPortal(
        <div
            className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="liquid-glass liquid-glass-purple rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🔗</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">Vincular PKL a otro PKL</h2>
                                <p className="text-white/70 text-sm">
                                    Fusionar <span className="font-mono font-bold">{sourcePklId}</span> con otro PKL
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Source PKL Info */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-500/10">
                    <p className="text-xs text-purple-400 uppercase font-bold mb-2">PKL a Fusionar:</p>
                    <div className="flex items-center gap-3">
                        {getClienteLogo(sourcePkl.cliente.nombre) ? (
                            <img src={getClienteLogo(sourcePkl.cliente.nombre)!} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                                {sourcePkl.cliente.nombre.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="text-white font-bold">{sourcePkl.cliente.nombre}</p>
                            <p className="text-gray-400 text-sm truncate">{sourcePkl.origen.descripcion_inicial}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-sm text-gray-400">
                        Selecciona el PKL destino. Los tasks y eventos del PKL origen se transferirán al PKL destino.
                    </p>

                    {/* Búsqueda */}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar PKL por ID, cliente o descripción..."
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:border-purple-500 outline-none"
                    />

                    {/* Lista de PKLs */}
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {pklsFiltrados.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No se encontraron PKLs disponibles</p>
                            </div>
                        ) : (
                            pklsFiltrados.map(pkl => {
                                const pklLogo = getClienteLogo(pkl.cliente.nombre);
                                const estadoInfo = ESTADOS_PKL.find(e => e.value === pkl.estado.actual);

                                return (
                                    <button
                                        key={pkl.pkl_id}
                                        onClick={() => setSelectedTargetId(pkl.pkl_id)}
                                        className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                                            selectedTargetId === pkl.pkl_id
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        {pklLogo ? (
                                            <img src={pklLogo} alt={pkl.cliente.nombre} className="w-10 h-10 rounded object-cover shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                                                {pkl.cliente.nombre.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-purple-600 dark:text-purple-400 text-sm font-bold">{pkl.pkl_id}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${estadoInfo?.color || 'bg-gray-500'} !text-white`}>
                                                    {estadoInfo?.label || pkl.estado.actual}
                                                </span>
                                            </div>
                                            <p className="text-gray-900 dark:text-white font-medium truncate">{pkl.cliente.nombre}</p>
                                            <p className="text-gray-500 text-xs truncate">{pkl.origen.descripcion_inicial}</p>
                                        </div>

                                        {selectedTargetId === pkl.pkl_id && (
                                            <span className="text-purple-500 text-xl">✓</span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedTargetId}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Fusionando...</span>
                        ) : (
                            <>
                                <span>🔗</span>
                                <span>Fusionar PKLs</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Modal para convertir un evento a task de otro PKL
function ConvertToTaskModal({ isOpen, onClose, eventoTipo, eventoId: _eventoId, pkls, getClienteLogo, onConvert }: {
    isOpen: boolean;
    onClose: () => void;
    eventoTipo: 'movimiento' | 'rendicion' | 'produccion';
    eventoId: string;
    pkls: PKL[];
    getClienteLogo: (nombre: string) => string | null;
    onConvert: (targetPklId: string) => Promise<void>;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtrar PKLs activos
    const pklsFiltrados = useMemo(() => {
        let filtered = pkls.filter(p =>
            p.estado.actual !== 'cerrado_ok' &&
            p.estado.actual !== 'cancelado'
        );

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.pkl_id.toLowerCase().includes(query) ||
                p.cliente.nombre.toLowerCase().includes(query) ||
                p.origen.descripcion_inicial.toLowerCase().includes(query)
            );
        }

        return filtered.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ).slice(0, 20);
    }, [pkls, searchQuery]);

    const handleSubmit = async () => {
        if (!selectedTargetId) return;
        setIsSubmitting(true);
        try {
            await onConvert(selectedTargetId);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const tipoLabel = eventoTipo === 'movimiento' ? 'Movimiento' : eventoTipo === 'rendicion' ? 'Rendición' : 'Producción';
    const tipoEmoji = eventoTipo === 'movimiento' ? '🚗' : eventoTipo === 'rendicion' ? '💰' : '🏭';

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="liquid-glass liquid-glass-purple rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📥</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">Convertir a Task</h2>
                                <p className="text-white/70 text-sm">
                                    {tipoEmoji} {tipoLabel} → Task de otro PKL
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                        <p className="text-sm text-purple-300">
                            <strong>¿Qué sucederá?</strong>
                        </p>
                        <ul className="text-sm text-gray-400 mt-2 space-y-1">
                            <li>• El {tipoLabel.toLowerCase()} se convertirá en un <strong>task</strong> del PKL seleccionado</li>
                            <li>• El evento original será eliminado</li>
                            <li>• Seguirá apareciendo en el Día a Día por la fecha del evento</li>
                        </ul>
                    </div>

                    <p className="text-sm text-gray-400">
                        Selecciona el PKL destino donde se creará el task:
                    </p>

                    {/* Búsqueda */}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar PKL por ID, cliente o descripción..."
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:border-purple-500 outline-none"
                    />

                    {/* Lista de PKLs */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {pklsFiltrados.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No se encontraron PKLs disponibles</p>
                            </div>
                        ) : (
                            pklsFiltrados.map(pkl => {
                                const pklLogo = getClienteLogo(pkl.cliente.nombre);
                                const estadoInfo = ESTADOS_PKL.find(e => e.value === pkl.estado.actual);

                                return (
                                    <button
                                        key={pkl.pkl_id}
                                        onClick={() => setSelectedTargetId(pkl.pkl_id)}
                                        className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                                            selectedTargetId === pkl.pkl_id
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        {pklLogo ? (
                                            <img src={pklLogo} alt={pkl.cliente.nombre} className="w-10 h-10 rounded object-cover shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                                                {pkl.cliente.nombre.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-purple-600 dark:text-purple-400 text-sm font-bold">{pkl.pkl_id}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${estadoInfo?.color || 'bg-gray-500'} !text-white`}>
                                                    {estadoInfo?.label || pkl.estado.actual}
                                                </span>
                                            </div>
                                            <p className="text-gray-900 dark:text-white font-medium truncate">{pkl.cliente.nombre}</p>
                                            <p className="text-gray-500 text-xs truncate">{pkl.origen.descripcion_inicial}</p>
                                        </div>

                                        {selectedTargetId === pkl.pkl_id && (
                                            <span className="text-purple-500 text-xl">✓</span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedTargetId}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Convirtiendo...</span>
                        ) : (
                            <>
                                <span>📥</span>
                                <span>Convertir a Task</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Modal para vincular eventos a PKL existente O crear uno nuevo
function VincularAPKLModal({ isOpen, onClose, eventos, pkls, getClienteLogo, onSuccess, onCreateNew }: {
    isOpen: boolean;
    onClose: () => void;
    eventos: EventoSeleccionable[];
    pkls: PKL[];
    getClienteLogo: (nombre: string) => string | null;
    onSuccess: (pklId: string) => Promise<void>;
    onCreateNew?: (pklData: { descripcion: string; cliente: string; tipoOperacion: string; fecha?: string }) => Promise<string>;
}) {
    const [mode, setMode] = useState<'vincular' | 'crear'>('vincular');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPKLId, setSelectedPKLId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado para crear nuevo PKL
    const clienteDetectado = eventos[0]?.cliente || '';
    const [nuevoPKL, setNuevoPKL] = useState({
        descripcion: '',
        cliente: clienteDetectado,
        tipoOperacion: 'ciclo_completo',
        fecha: '' // Fecha opcional
    });

    // Filtrar PKLs
    const pklsFiltrados = useMemo(() => {
        let filtered = pkls.filter(p => p.estado.actual !== 'cerrado_ok' && p.estado.actual !== 'cancelado');

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.pkl_id.toLowerCase().includes(query) ||
                p.cliente.nombre.toLowerCase().includes(query) ||
                p.origen.descripcion_inicial.toLowerCase().includes(query)
            );
        }

        return filtered.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ).slice(0, 20);
    }, [pkls, searchQuery]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (mode === 'crear' && onCreateNew) {
                const newPklId = await onCreateNew(nuevoPKL);
                await onSuccess(newPklId);
            } else if (selectedPKLId) {
                await onSuccess(selectedPKLId);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const nextPklId = generateNextPKLId(pkls);

    return createPortal(
        <div
            className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="liquid-glass liquid-glass-cyan rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className={`bg-gradient-to-r ${mode === 'crear' ? 'from-emerald-600 to-cyan-600' : 'from-cyan-600 to-blue-600'} p-6 rounded-t-2xl`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{mode === 'crear' ? '✨' : '🔗'}</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {mode === 'crear' ? 'Crear Nuevo PKL' : 'Vincular a PKL Existente'}
                                </h2>
                                <p className="text-white/70 text-sm">{eventos.length} evento{eventos.length > 1 ? 's' : ''} seleccionado{eventos.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setMode('vincular')}
                        className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
                            mode === 'vincular'
                                ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-500/10'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        🔗 Vincular a Existente
                    </button>
                    <button
                        onClick={() => setMode('crear')}
                        className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
                            mode === 'crear'
                                ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-500/10'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        ✨ Crear Nuevo PKL
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {mode === 'vincular' ? (
                        <>
                            {/* Búsqueda */}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar PKL por ID, cliente o descripción..."
                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:border-cyan-500 outline-none"
                            />

                            {/* Lista de PKLs */}
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {pklsFiltrados.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No se encontraron PKLs activos</p>
                                    </div>
                                ) : (
                                    pklsFiltrados.map(pkl => {
                                        const pklLogo = getClienteLogo(pkl.cliente.nombre);
                                        const estadoInfo = ESTADOS_PKL.find(e => e.value === pkl.estado.actual);

                                        return (
                                            <button
                                                key={pkl.pkl_id}
                                                onClick={() => setSelectedPKLId(pkl.pkl_id)}
                                                className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                                                    selectedPKLId === pkl.pkl_id
                                                        ? 'border-cyan-500 bg-cyan-500/10'
                                                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                            >
                                                {pklLogo ? (
                                                    <img src={pklLogo} alt={pkl.cliente.nombre} className="w-10 h-10 rounded object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                                                        {pkl.cliente.nombre.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-cyan-600 dark:text-cyan-400 text-sm font-bold">{pkl.pkl_id}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${estadoInfo?.color || 'bg-gray-500'} !text-white`}>
                                                            {estadoInfo?.label || pkl.estado.actual}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-900 dark:text-white font-medium truncate">{pkl.cliente.nombre}</p>
                                                    <p className="text-gray-500 text-xs truncate">{pkl.origen.descripcion_inicial}</p>
                                                </div>

                                                {selectedPKLId === pkl.pkl_id && (
                                                    <span className="text-cyan-500 text-xl">✓</span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        /* Formulario para crear nuevo PKL */
                        <div className="space-y-4">
                            {/* Preview ID */}
                            <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Nuevo ID:</span>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-lg">{nextPklId}</span>
                            </div>

                            {/* Descripción/Nombre del PKL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    Nombre / Descripción del PKL *
                                </label>
                                <input
                                    type="text"
                                    value={nuevoPKL.descripcion}
                                    onChange={(e) => setNuevoPKL(prev => ({ ...prev, descripcion: e.target.value.toUpperCase() }))}
                                    placeholder="Ej: FERIA GRUPO LAR"
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:border-emerald-500 outline-none uppercase text-lg"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-1">Este nombre aparecerá en el Dashboard de PKLs</p>
                            </div>

                            {/* Cliente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    Cliente
                                </label>
                                <input
                                    type="text"
                                    value={nuevoPKL.cliente}
                                    onChange={(e) => setNuevoPKL(prev => ({ ...prev, cliente: e.target.value }))}
                                    placeholder="Nombre del cliente"
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            {/* Tipo de operación */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    Tipo de Operación
                                </label>
                                <select
                                    value={nuevoPKL.tipoOperacion}
                                    onChange={(e) => setNuevoPKL(prev => ({ ...prev, tipoOperacion: e.target.value }))}
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                                >
                                    {TIPOS_OPERACION_PKL.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Fecha (opcional) - auto agrega año a descripción */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    Fecha del Evento <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <input
                                    type="date"
                                    value={nuevoPKL.fecha}
                                    onChange={(e) => {
                                        const newFecha = e.target.value;
                                        setNuevoPKL(prev => {
                                            let descripcion = prev.descripcion;
                                            // Remover año anterior si existe (4 dígitos al final)
                                            descripcion = descripcion.replace(/\s*\d{4}$/, '').trim();
                                            // Agregar nuevo año si hay fecha
                                            if (newFecha) {
                                                const year = new Date(newFecha).getFullYear();
                                                descripcion = `${descripcion} ${year}`;
                                            }
                                            return { ...prev, fecha: newFecha, descripcion };
                                        });
                                    }}
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Al seleccionar fecha, se agrega el año automáticamente al nombre</p>
                            </div>

                            {/* Preview de eventos */}
                            <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    Se vincularán {eventos.length} evento{eventos.length > 1 ? 's' : ''}:
                                </p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {eventos.slice(0, 5).map((ev, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            <span>{ev.tipo_evento === 'movimiento' ? '🚚' : ev.tipo_evento === 'rendicion' ? '💰' : '🏭'}</span>
                                            <span className="text-gray-700 dark:text-gray-300 truncate">{ev.descripcion}</span>
                                            {(ev.monto || 0) > 0 && <span className="text-amber-500 font-mono text-xs">S/.{ev.monto}</span>}
                                        </div>
                                    ))}
                                    {eventos.length > 5 && (
                                        <p className="text-gray-500 text-xs">...y {eventos.length - 5} más</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (mode === 'vincular' && !selectedPKLId) || (mode === 'crear' && !nuevoPKL.descripcion.trim())}
                        className={`flex-1 py-3 bg-gradient-to-r ${mode === 'crear' ? 'from-emerald-600 to-cyan-600' : 'from-cyan-600 to-blue-600'} hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2`}
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">{mode === 'crear' ? 'Creando...' : 'Vinculando...'}</span>
                        ) : mode === 'crear' ? (
                            <>
                                <span>✨</span>
                                <span>Crear PKL y Vincular {eventos.length} evento{eventos.length > 1 ? 's' : ''}</span>
                            </>
                        ) : (
                            <>
                                <span>🔗</span>
                                <span>Vincular {eventos.length} evento{eventos.length > 1 ? 's' : ''}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
