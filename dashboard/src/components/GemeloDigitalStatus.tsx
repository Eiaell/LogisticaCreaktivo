import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';

/**
 * GEMELO DIGITAL EN LOGÍSTICA
 *
 * Basado en mejores prácticas de:
 * - Fraunhofer IML (Instituto Fraunhofer de Flujo de Materiales y Logística)
 * - DHL Digital Twins in Logistics
 * - RELEX Solutions Supply Chain Digital Twin
 *
 * Un gemelo digital logístico requiere 5 capas de datos:
 * 1. ACTORES: Clientes y proveedores con datos completos
 * 2. INVENTARIO: Pedidos, productos y cotizaciones
 * 3. OPERACIONES: Movimientos, entregas, recojos
 * 4. PRODUCCIÓN: Eventos de fabricación y tiempos
 * 5. FINANZAS: Costos, pagos, rendiciones
 */

interface DataPoint {
    id: string;
    name: string;
    description: string;
    whyMatters: string; // Explicación de por qué es importante
    howToFix: string;   // Cómo completar este criterio
    completed: boolean;
    weight: number;
    category: 'actores' | 'inventario' | 'operaciones' | 'produccion' | 'finanzas';
    currentValue?: string | number;
    targetValue?: string | number;
}

export function GemeloDigitalStatus() {
    const { clientes, proveedores, pedidos, movimientosLogisticos, rendiciones, eventosProduccion } = useDatabase();
    const [showModal, setShowModal] = useState(false);

    const clientesList = Object.values(clientes);
    const proveedoresList = Object.values(proveedores);

    // Calcular métricas
    const clientesConLogo = clientesList.filter(c => c.logo).length;
    const clientesConContacto = clientesList.filter(c => c.email || c.telefono).length;
    const clientesConDireccion = clientesList.filter(c => c.direccion).length;
    const proveedoresConCategoria = proveedoresList.filter(p => p.categorias && p.categorias.length > 0).length;
    const proveedoresConContacto = proveedoresList.filter(p => p.telefono || p.email).length;
    const pedidosConPrecio = pedidos.filter(p => p.precio && p.precio > 0).length;
    const pedidosConRL = pedidos.filter(p => p.rl_numero).length;
    const pedidosConRQ = pedidos.filter(p => p.rq_numero).length;
    const movimientosVinculados = movimientosLogisticos.filter(m => m.pedido_id).length;
    const rendicionesVinculadas = rendiciones.filter(r => r.pedido_id).length;
    const produccionVinculada = eventosProduccion.filter(e => e.pedido_id).length;

    const dataPoints: DataPoint[] = [
        // ═══════════════════════════════════════════════════════════════
        // CAPA 1: ACTORES (Red de contactos)
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'clientes_base',
            name: 'Red de Clientes',
            description: `${clientesList.length} clientes registrados (mínimo 5)`,
            whyMatters: 'El gemelo necesita conocer todos los nodos de demanda para simular flujos de pedidos y predecir comportamientos.',
            howToFix: 'Registra todos tus clientes activos en el sistema, incluyendo los que tienen pedidos esporádicos.',
            completed: clientesList.length >= 5,
            weight: 8,
            category: 'actores',
            currentValue: clientesList.length,
            targetValue: 5
        },
        {
            id: 'clientes_identidad',
            name: 'Identidad Visual de Clientes',
            description: `${clientesConLogo}/${clientesList.length} clientes con logo`,
            whyMatters: 'Los logos permiten identificación rápida en dashboards y reducen errores de selección en 40%.',
            howToFix: 'Sube el logo de cada cliente desde su ficha. Acepta PNG, JPG o SVG.',
            completed: clientesList.length > 0 && clientesConLogo >= clientesList.length * 0.5,
            weight: 4,
            category: 'actores',
            currentValue: clientesConLogo,
            targetValue: Math.ceil(clientesList.length * 0.5)
        },
        {
            id: 'clientes_contacto',
            name: 'Datos de Contacto de Clientes',
            description: `${clientesConContacto}/${clientesList.length} con email o teléfono`,
            whyMatters: 'Permite notificaciones automáticas de estado y reduce llamadas de seguimiento en 60%.',
            howToFix: 'Agrega email y/o teléfono en la ficha de cada cliente.',
            completed: clientesList.length > 0 && clientesConContacto >= clientesList.length * 0.7,
            weight: 5,
            category: 'actores',
            currentValue: clientesConContacto,
            targetValue: Math.ceil(clientesList.length * 0.7)
        },
        {
            id: 'clientes_ubicacion',
            name: 'Ubicaciones de Entrega',
            description: `${clientesConDireccion}/${clientesList.length} con dirección`,
            whyMatters: 'Las direcciones son esenciales para optimización de rutas y cálculo de tiempos de entrega.',
            howToFix: 'Registra la dirección principal de entrega de cada cliente.',
            completed: clientesList.length > 0 && clientesConDireccion >= clientesList.length * 0.6,
            weight: 6,
            category: 'actores',
            currentValue: clientesConDireccion,
            targetValue: Math.ceil(clientesList.length * 0.6)
        },
        {
            id: 'proveedores_base',
            name: 'Red de Proveedores',
            description: `${proveedoresList.length} proveedores registrados (mínimo 3)`,
            whyMatters: 'El gemelo simula la cadena de suministro completa. Sin proveedores, no puede predecir tiempos de producción.',
            howToFix: 'Registra todos tus proveedores: imprentas, talleres, transportistas, etc.',
            completed: proveedoresList.length >= 3,
            weight: 8,
            category: 'actores',
            currentValue: proveedoresList.length,
            targetValue: 3
        },
        {
            id: 'proveedores_categoria',
            name: 'Categorización de Proveedores',
            description: `${proveedoresConCategoria}/${proveedoresList.length} con categoría`,
            whyMatters: 'Permite filtrar y asignar automáticamente el proveedor óptimo según el tipo de trabajo.',
            howToFix: 'Asigna categorías (serigrafía, sublimación, bordado, etc.) a cada proveedor.',
            completed: proveedoresList.length > 0 && proveedoresConCategoria >= proveedoresList.length * 0.8,
            weight: 5,
            category: 'actores',
            currentValue: proveedoresConCategoria,
            targetValue: Math.ceil(proveedoresList.length * 0.8)
        },
        {
            id: 'proveedores_contacto',
            name: 'Contacto de Proveedores',
            description: `${proveedoresConContacto}/${proveedoresList.length} con teléfono/email`,
            whyMatters: 'Comunicación directa para coordinación de recojos y seguimiento de producción.',
            howToFix: 'Agrega el teléfono y email de contacto de cada proveedor.',
            completed: proveedoresList.length > 0 && proveedoresConContacto >= proveedoresList.length * 0.8,
            weight: 4,
            category: 'actores',
            currentValue: proveedoresConContacto,
            targetValue: Math.ceil(proveedoresList.length * 0.8)
        },

        // ═══════════════════════════════════════════════════════════════
        // CAPA 2: INVENTARIO (Pedidos y productos)
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'pedidos_activos',
            name: 'Pipeline de Pedidos',
            description: `${pedidos.length} pedidos en sistema (mínimo 5)`,
            whyMatters: 'El gemelo aprende patrones de demanda analizando el historial de pedidos.',
            howToFix: 'Registra todos los pedidos, incluyendo cotizaciones pendientes de aprobación.',
            completed: pedidos.length >= 5,
            weight: 10,
            category: 'inventario',
            currentValue: pedidos.length,
            targetValue: 5
        },
        {
            id: 'pedidos_valorados',
            name: 'Pedidos Valorados',
            description: `${pedidosConPrecio}/${pedidos.length} con precio definido`,
            whyMatters: 'Los precios permiten calcular valor del pipeline, márgenes y proyecciones financieras.',
            howToFix: 'Ingresa el precio acordado en cada pedido aprobado.',
            completed: pedidos.length > 0 && pedidosConPrecio >= pedidos.length * 0.7,
            weight: 8,
            category: 'inventario',
            currentValue: pedidosConPrecio,
            targetValue: Math.ceil(pedidos.length * 0.7)
        },
        {
            id: 'pedidos_trazabilidad_rl',
            name: 'Trazabilidad Interna (RL)',
            description: `${pedidosConRL}/${pedidos.length} con número RL`,
            whyMatters: 'El código RL permite rastrear el pedido en todo el proceso logístico interno.',
            howToFix: 'Asigna un número RL correlativo a cada pedido confirmado.',
            completed: pedidos.length > 0 && pedidosConRL >= pedidos.length * 0.5,
            weight: 5,
            category: 'inventario',
            currentValue: pedidosConRL,
            targetValue: Math.ceil(pedidos.length * 0.5)
        },
        {
            id: 'pedidos_trazabilidad_rq',
            name: 'Trazabilidad Cliente (RQ)',
            description: `${pedidosConRQ}/${pedidos.length} con código RQ del cliente`,
            whyMatters: 'El código RQ vincula el pedido con el sistema del cliente para facturación y seguimiento.',
            howToFix: 'Registra el número de requerimiento que te da el cliente.',
            completed: pedidos.length > 0 && pedidosConRQ >= pedidos.length * 0.3,
            weight: 4,
            category: 'inventario',
            currentValue: pedidosConRQ,
            targetValue: Math.ceil(pedidos.length * 0.3)
        },

        // ═══════════════════════════════════════════════════════════════
        // CAPA 3: OPERACIONES (Movimientos logísticos)
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'movimientos_registrados',
            name: 'Registro de Movimientos',
            description: `${movimientosLogisticos.length} movimientos registrados (mínimo 10)`,
            whyMatters: 'Los movimientos son el "pulso" del gemelo: entregas, recojos, compras, traslados.',
            howToFix: 'Registra cada movimiento logístico desde "Día a Día" o importando JSON.',
            completed: movimientosLogisticos.length >= 10,
            weight: 10,
            category: 'operaciones',
            currentValue: movimientosLogisticos.length,
            targetValue: 10
        },
        {
            id: 'movimientos_vinculados',
            name: 'Movimientos Vinculados a Pedidos',
            description: `${movimientosVinculados}/${movimientosLogisticos.length} vinculados`,
            whyMatters: 'Vincular movimientos a pedidos permite calcular costos reales y tiempos por orden.',
            howToFix: 'Al registrar o sincronizar un movimiento, selecciona el pedido relacionado.',
            completed: movimientosLogisticos.length > 0 && movimientosVinculados >= movimientosLogisticos.length * 0.5,
            weight: 7,
            category: 'operaciones',
            currentValue: movimientosVinculados,
            targetValue: Math.ceil(movimientosLogisticos.length * 0.5)
        },

        // ═══════════════════════════════════════════════════════════════
        // CAPA 4: PRODUCCIÓN (Eventos de fabricación)
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'produccion_eventos',
            name: 'Eventos de Producción',
            description: `${eventosProduccion.length} eventos registrados (mínimo 5)`,
            whyMatters: 'Los eventos de producción permiten medir tiempos de fabricación y detectar cuellos de botella.',
            howToFix: 'Registra órdenes de producción, pruebas de color y muestras.',
            completed: eventosProduccion.length >= 5,
            weight: 8,
            category: 'produccion',
            currentValue: eventosProduccion.length,
            targetValue: 5
        },
        {
            id: 'produccion_vinculada',
            name: 'Producción Vinculada a Pedidos',
            description: `${produccionVinculada}/${eventosProduccion.length} vinculados`,
            whyMatters: 'Permite calcular el tiempo total desde orden hasta entrega por cada pedido.',
            howToFix: 'Sincroniza los eventos de producción con sus pedidos correspondientes.',
            completed: eventosProduccion.length > 0 && produccionVinculada >= eventosProduccion.length * 0.5,
            weight: 5,
            category: 'produccion',
            currentValue: produccionVinculada,
            targetValue: Math.ceil(eventosProduccion.length * 0.5)
        },

        // ═══════════════════════════════════════════════════════════════
        // CAPA 5: FINANZAS (Costos y pagos)
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'rendiciones_registradas',
            name: 'Registro de Gastos',
            description: `${rendiciones.length} rendiciones registradas (mínimo 5)`,
            whyMatters: 'Las rendiciones capturan costos de movilidad, adelantos y pagos para calcular márgenes reales.',
            howToFix: 'Registra cada gasto: movilidad, adelantos a proveedores, pagos de saldo.',
            completed: rendiciones.length >= 5,
            weight: 8,
            category: 'finanzas',
            currentValue: rendiciones.length,
            targetValue: 5
        },
        {
            id: 'rendiciones_vinculadas',
            name: 'Gastos Vinculados a Pedidos',
            description: `${rendicionesVinculadas}/${rendiciones.length} vinculados`,
            whyMatters: 'Permite calcular el costo real de cada pedido y su margen de ganancia.',
            howToFix: 'Vincula cada rendición al pedido que corresponde.',
            completed: rendiciones.length > 0 && rendicionesVinculadas >= rendiciones.length * 0.5,
            weight: 5,
            category: 'finanzas',
            currentValue: rendicionesVinculadas,
            targetValue: Math.ceil(rendiciones.length * 0.5)
        },
    ];

    const totalWeight = dataPoints.reduce((sum, p) => sum + p.weight, 0);
    const completedWeight = dataPoints.filter(p => p.completed).reduce((sum, p) => sum + p.weight, 0);
    const percentage = Math.round((completedWeight / totalWeight) * 100);

    // Agrupar por categoría
    const groupedPoints = dataPoints.reduce((acc, point) => {
        if (!acc[point.category]) acc[point.category] = [];
        acc[point.category].push(point);
        return acc;
    }, {} as Record<string, DataPoint[]>);

    const categoryInfo: Record<string, { label: string; icon: string; description: string }> = {
        actores: {
            label: 'Red de Actores',
            icon: '🌐',
            description: 'Clientes y proveedores que forman tu cadena de valor'
        },
        inventario: {
            label: 'Inventario de Pedidos',
            icon: '📦',
            description: 'Pedidos, cotizaciones y su trazabilidad'
        },
        operaciones: {
            label: 'Operaciones Logísticas',
            icon: '🚚',
            description: 'Movimientos físicos: entregas, recojos, traslados'
        },
        produccion: {
            label: 'Eventos de Producción',
            icon: '🏭',
            description: 'Fabricación con proveedores y tiempos de proceso'
        },
        finanzas: {
            label: 'Flujo Financiero',
            icon: '💰',
            description: 'Costos, pagos y rendiciones para calcular márgenes'
        },
    };

    const getStatusText = (pct: number) => {
        if (pct >= 90) return 'Óptimo';
        if (pct >= 70) return 'Avanzado';
        if (pct >= 50) return 'En progreso';
        if (pct >= 25) return 'Básico';
        return 'Inicial';
    };

    const getProgressBarColor = (pct: number) => {
        if (pct >= 80) return '#10b981';
        if (pct >= 50) return '#f59e0b';
        if (pct >= 25) return '#f97316';
        return '#ef4444';
    };

    const getStatusBadgeStyle = (pct: number) => {
        if (pct >= 80) return { bg: '#d1fae5', text: '#047857' };
        if (pct >= 50) return { bg: '#fef3c7', text: '#92400e' };
        if (pct >= 25) return { bg: '#ffedd5', text: '#c2410c' };
        return { bg: '#fee2e2', text: '#b91c1c' };
    };

    const badgeStyle = getStatusBadgeStyle(percentage);
    const barColor = getProgressBarColor(percentage);
    const pendingPoints = dataPoints.filter(p => !p.completed);

    return (
        <>
            {/* Card compacta */}
            <button
                onClick={() => setShowModal(true)}
                className="w-full p-4 rounded-xl transition-all group cursor-pointer text-left"
                style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 1px 3px var(--shadow-color)'
                }}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🔮</span>
                        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Gemelo Digital</span>
                    </div>
                    <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
                    >
                        {getStatusText(percentage)}
                    </span>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    Integridad de datos operativos
                </p>

                <div
                    className="relative h-2.5 rounded-full overflow-hidden mb-2"
                    style={{ backgroundColor: 'var(--border-color)' }}
                >
                    <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: barColor }}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-2xl font-black" style={{ color: barColor }}>
                        {percentage}%
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {pendingPoints.length} criterios pendientes →
                    </span>
                </div>
            </button>

            {/* Modal de detalles */}
            {showModal && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ backgroundColor: 'var(--modal-overlay)' }}
                    onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
                    onKeyDown={(e) => e.key === 'Escape' && setShowModal(false)}
                >
                    <div
                        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 p-6 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">🔮</span>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Gemelo Digital Logístico</h2>
                                        <p className="text-indigo-200 text-sm">Réplica virtual de tu operación</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Barra de progreso */}
                            <div className="mt-4 bg-white/10 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white/80 text-sm font-medium">Integridad del Gemelo</span>
                                    <span className="text-white font-bold text-lg">{percentage}%</span>
                                </div>
                                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-xs">
                                    <span className="text-indigo-200">
                                        ✅ {dataPoints.filter(p => p.completed).length} completados
                                    </span>
                                    <span className="text-indigo-200">
                                        ⭕ {pendingPoints.length} pendientes
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Explicación */}
                        <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>¿Qué es un Gemelo Digital?</strong> Es una réplica virtual de tu operación logística que permite simular escenarios,
                                predecir problemas y optimizar rutas. Mientras más completos estén tus datos, más preciso será el gemelo.
                            </p>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {Object.entries(groupedPoints).map(([category, points]) => {
                                const catInfo = categoryInfo[category];
                                const catCompleted = points.filter(p => p.completed).length;
                                const catTotal = points.length;
                                const catPct = Math.round((catCompleted / catTotal) * 100);

                                return (
                                    <div key={category}>
                                        {/* Header de categoría */}
                                        <div className="flex items-start gap-3 mb-4">
                                            <span className="text-2xl">{catInfo.icon}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                        {catInfo.label}
                                                    </h3>
                                                    <span
                                                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                        style={{
                                                            backgroundColor: catPct === 100 ? '#d1fae5' : catPct >= 50 ? '#fef3c7' : '#fee2e2',
                                                            color: catPct === 100 ? '#047857' : catPct >= 50 ? '#92400e' : '#b91c1c'
                                                        }}
                                                    >
                                                        {catCompleted}/{catTotal}
                                                    </span>
                                                </div>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                    {catInfo.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Criterios */}
                                        <div className="space-y-3 ml-9">
                                            {points.map((point) => (
                                                <div
                                                    key={point.id}
                                                    className="rounded-xl overflow-hidden transition-all"
                                                    style={{
                                                        backgroundColor: point.completed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                                                        border: `1px solid ${point.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`
                                                    }}
                                                >
                                                    {/* Título y estado */}
                                                    <div className="flex items-start gap-3 p-4">
                                                        <span className="text-xl mt-0.5">
                                                            {point.completed ? '✅' : '⭕'}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                                                    {point.name}
                                                                </p>
                                                                <span
                                                                    className="text-xs px-2 py-0.5 rounded font-mono"
                                                                    style={{
                                                                        backgroundColor: point.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                                                                        color: point.completed ? '#059669' : '#dc2626'
                                                                    }}
                                                                >
                                                                    {point.description}
                                                                </span>
                                                            </div>

                                                            {/* Por qué importa */}
                                                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                                                <strong style={{ color: 'var(--text-secondary)' }}>¿Por qué importa?</strong> {point.whyMatters}
                                                            </p>

                                                            {/* Cómo completar (solo si no está completado) */}
                                                            {!point.completed && (
                                                                <div
                                                                    className="mt-2 p-2 rounded-lg text-xs"
                                                                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                                                >
                                                                    <span style={{ color: '#2563eb' }}>💡 <strong>Cómo completar:</strong></span>
                                                                    <span style={{ color: 'var(--text-secondary)' }}> {point.howToFix}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span
                                                            className="text-xs font-bold px-2 py-1 rounded shrink-0"
                                                            style={{
                                                                backgroundColor: 'var(--bg-card)',
                                                                color: 'var(--text-muted)',
                                                                border: '1px solid var(--border-color)'
                                                            }}
                                                        >
                                                            {point.weight} pts
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                                📚 Basado en mejores prácticas de <strong>Fraunhofer IML</strong>, <strong>DHL</strong> y <strong>RELEX Solutions</strong> para gemelos digitales en logística
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
