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
    whyMatters: string;
    howToFix: string;
    completed: boolean;
    weight: number;
    category: 'actores' | 'inventario' | 'operaciones' | 'produccion' | 'finanzas';
    currentValue?: string | number;
    targetValue?: string | number;
}

// Información teórica de las 5 capas del gemelo digital
const CAPAS_GEMELO = [
    {
        id: 'actores',
        numero: 1,
        nombre: 'Red de Actores',
        icon: '🌐',
        color: '#8b5cf6', // violet
        descripcion: 'Clientes y proveedores que forman tu cadena de valor',
        queNecesitas: [
            'Base de clientes con datos de contacto completos',
            'Logos para identificación visual rápida',
            'Direcciones de entrega para optimización de rutas',
            'Proveedores categorizados por especialidad',
            'Contactos de proveedores para coordinación'
        ],
        beneficios: 'Permite simular flujos de demanda y asignar automáticamente proveedores óptimos.'
    },
    {
        id: 'inventario',
        numero: 2,
        nombre: 'Pipeline de Pedidos',
        icon: '📦',
        color: '#0891b2', // cyan
        descripcion: 'Pedidos, cotizaciones y su trazabilidad',
        queNecesitas: [
            'Todos los pedidos registrados (cotizaciones a entregas)',
            'Precios definidos para proyecciones financieras',
            'Códigos RL internos para trazabilidad',
            'Códigos RQ del cliente para facturación'
        ],
        beneficios: 'El gemelo aprende patrones de demanda y calcula valor del pipeline en tiempo real.'
    },
    {
        id: 'operaciones',
        numero: 3,
        nombre: 'Operaciones Logísticas',
        icon: '🚚',
        color: '#059669', // emerald
        descripcion: 'Movimientos físicos: entregas, recojos, traslados',
        queNecesitas: [
            'Registro de cada movimiento logístico',
            'Vinculación de movimientos a pedidos',
            'Costos de movilidad por operación',
            'Estados de cada movimiento (pendiente, completado)'
        ],
        beneficios: 'Captura el "pulso" de la operación para calcular tiempos reales y costos por orden.'
    },
    {
        id: 'produccion',
        numero: 4,
        nombre: 'Eventos de Producción',
        icon: '🏭',
        color: '#6366f1', // indigo
        descripcion: 'Fabricación con proveedores y tiempos de proceso',
        queNecesitas: [
            'Órdenes de producción enviadas a proveedores',
            'Pruebas de color y muestras físicas',
            'Tiempos de entrega prometidos',
            'Vinculación a pedidos para seguimiento'
        ],
        beneficios: 'Mide tiempos de fabricación y detecta cuellos de botella en la cadena.'
    },
    {
        id: 'finanzas',
        numero: 5,
        nombre: 'Flujo Financiero',
        icon: '💰',
        color: '#f59e0b', // amber
        descripcion: 'Costos, pagos y rendiciones para calcular márgenes',
        queNecesitas: [
            'Registro de gastos de movilidad',
            'Adelantos a proveedores',
            'Pagos de saldo',
            'Vinculación a pedidos para cálculo de márgenes'
        ],
        beneficios: 'Calcula el margen real de cada pedido y proyecta rentabilidad.'
    }
];

export function GemeloDigitalStatus() {
    const { clientes, proveedores, pedidos, movimientosLogisticos, rendiciones, eventosProduccion } = useDatabase();
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'teoria' | 'progreso'>('teoria');

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
        // CAPA 1: ACTORES
        {
            id: 'clientes_base',
            name: 'Red de Clientes',
            description: `${clientesList.length} clientes (mín. 5)`,
            whyMatters: 'El gemelo necesita conocer todos los nodos de demanda.',
            howToFix: 'Registra todos tus clientes activos en el sistema.',
            completed: clientesList.length >= 5,
            weight: 8,
            category: 'actores',
            currentValue: clientesList.length,
            targetValue: 5
        },
        {
            id: 'clientes_identidad',
            name: 'Logos de Clientes',
            description: `${clientesConLogo}/${clientesList.length} con logo`,
            whyMatters: 'Identificación visual rápida en dashboards.',
            howToFix: 'Sube el logo desde la ficha del cliente.',
            completed: clientesList.length > 0 && clientesConLogo >= clientesList.length * 0.5,
            weight: 4,
            category: 'actores',
            currentValue: clientesConLogo,
            targetValue: Math.ceil(clientesList.length * 0.5)
        },
        {
            id: 'clientes_contacto',
            name: 'Contacto de Clientes',
            description: `${clientesConContacto}/${clientesList.length} con email/tel`,
            whyMatters: 'Permite notificaciones automáticas de estado.',
            howToFix: 'Agrega email y/o teléfono en cada ficha.',
            completed: clientesList.length > 0 && clientesConContacto >= clientesList.length * 0.7,
            weight: 5,
            category: 'actores',
            currentValue: clientesConContacto,
            targetValue: Math.ceil(clientesList.length * 0.7)
        },
        {
            id: 'clientes_ubicacion',
            name: 'Direcciones de Entrega',
            description: `${clientesConDireccion}/${clientesList.length} con dirección`,
            whyMatters: 'Esencial para optimización de rutas.',
            howToFix: 'Registra la dirección de entrega de cada cliente.',
            completed: clientesList.length > 0 && clientesConDireccion >= clientesList.length * 0.6,
            weight: 6,
            category: 'actores',
            currentValue: clientesConDireccion,
            targetValue: Math.ceil(clientesList.length * 0.6)
        },
        {
            id: 'proveedores_base',
            name: 'Red de Proveedores',
            description: `${proveedoresList.length} proveedores (mín. 3)`,
            whyMatters: 'Simula la cadena de suministro completa.',
            howToFix: 'Registra todos tus proveedores.',
            completed: proveedoresList.length >= 3,
            weight: 8,
            category: 'actores',
            currentValue: proveedoresList.length,
            targetValue: 3
        },
        {
            id: 'proveedores_categoria',
            name: 'Categorías de Proveedores',
            description: `${proveedoresConCategoria}/${proveedoresList.length} categorizados`,
            whyMatters: 'Permite asignación automática óptima.',
            howToFix: 'Asigna categorías a cada proveedor.',
            completed: proveedoresList.length > 0 && proveedoresConCategoria >= proveedoresList.length * 0.8,
            weight: 5,
            category: 'actores',
            currentValue: proveedoresConCategoria,
            targetValue: Math.ceil(proveedoresList.length * 0.8)
        },
        {
            id: 'proveedores_contacto',
            name: 'Contacto de Proveedores',
            description: `${proveedoresConContacto}/${proveedoresList.length} con tel/email`,
            whyMatters: 'Comunicación para coordinación.',
            howToFix: 'Agrega contacto de cada proveedor.',
            completed: proveedoresList.length > 0 && proveedoresConContacto >= proveedoresList.length * 0.8,
            weight: 4,
            category: 'actores',
            currentValue: proveedoresConContacto,
            targetValue: Math.ceil(proveedoresList.length * 0.8)
        },
        // CAPA 2: INVENTARIO
        {
            id: 'pedidos_activos',
            name: 'Pipeline de Pedidos',
            description: `${pedidos.length} pedidos (mín. 5)`,
            whyMatters: 'Aprende patrones de demanda.',
            howToFix: 'Registra todos los pedidos.',
            completed: pedidos.length >= 5,
            weight: 10,
            category: 'inventario',
            currentValue: pedidos.length,
            targetValue: 5
        },
        {
            id: 'pedidos_valorados',
            name: 'Pedidos con Precio',
            description: `${pedidosConPrecio}/${pedidos.length} valorados`,
            whyMatters: 'Calcula valor del pipeline.',
            howToFix: 'Ingresa el precio en cada pedido.',
            completed: pedidos.length > 0 && pedidosConPrecio >= pedidos.length * 0.7,
            weight: 8,
            category: 'inventario',
            currentValue: pedidosConPrecio,
            targetValue: Math.ceil(pedidos.length * 0.7)
        },
        {
            id: 'pedidos_trazabilidad_rl',
            name: 'Códigos RL',
            description: `${pedidosConRL}/${pedidos.length} con RL`,
            whyMatters: 'Trazabilidad interna.',
            howToFix: 'Asigna número RL a cada pedido.',
            completed: pedidos.length > 0 && pedidosConRL >= pedidos.length * 0.5,
            weight: 5,
            category: 'inventario',
            currentValue: pedidosConRL,
            targetValue: Math.ceil(pedidos.length * 0.5)
        },
        {
            id: 'pedidos_trazabilidad_rq',
            name: 'Códigos RQ',
            description: `${pedidosConRQ}/${pedidos.length} con RQ`,
            whyMatters: 'Vinculación con cliente.',
            howToFix: 'Registra el código RQ del cliente.',
            completed: pedidos.length > 0 && pedidosConRQ >= pedidos.length * 0.3,
            weight: 4,
            category: 'inventario',
            currentValue: pedidosConRQ,
            targetValue: Math.ceil(pedidos.length * 0.3)
        },
        // CAPA 3: OPERACIONES
        {
            id: 'movimientos_registrados',
            name: 'Movimientos Logísticos',
            description: `${movimientosLogisticos.length} registrados (mín. 10)`,
            whyMatters: 'Son el pulso del gemelo.',
            howToFix: 'Registra cada movimiento desde Día a Día.',
            completed: movimientosLogisticos.length >= 10,
            weight: 10,
            category: 'operaciones',
            currentValue: movimientosLogisticos.length,
            targetValue: 10
        },
        {
            id: 'movimientos_vinculados',
            name: 'Movimientos Vinculados',
            description: `${movimientosVinculados}/${movimientosLogisticos.length} vinculados`,
            whyMatters: 'Calcula costos por orden.',
            howToFix: 'Vincula cada movimiento a su pedido.',
            completed: movimientosLogisticos.length > 0 && movimientosVinculados >= movimientosLogisticos.length * 0.5,
            weight: 7,
            category: 'operaciones',
            currentValue: movimientosVinculados,
            targetValue: Math.ceil(movimientosLogisticos.length * 0.5)
        },
        // CAPA 4: PRODUCCIÓN
        {
            id: 'produccion_eventos',
            name: 'Eventos de Producción',
            description: `${eventosProduccion.length} eventos (mín. 5)`,
            whyMatters: 'Mide tiempos de fabricación.',
            howToFix: 'Registra órdenes y pruebas de color.',
            completed: eventosProduccion.length >= 5,
            weight: 8,
            category: 'produccion',
            currentValue: eventosProduccion.length,
            targetValue: 5
        },
        {
            id: 'produccion_vinculada',
            name: 'Producción Vinculada',
            description: `${produccionVinculada}/${eventosProduccion.length} vinculados`,
            whyMatters: 'Tiempo total por pedido.',
            howToFix: 'Sincroniza con los pedidos.',
            completed: eventosProduccion.length > 0 && produccionVinculada >= eventosProduccion.length * 0.5,
            weight: 5,
            category: 'produccion',
            currentValue: produccionVinculada,
            targetValue: Math.ceil(eventosProduccion.length * 0.5)
        },
        // CAPA 5: FINANZAS
        {
            id: 'rendiciones_registradas',
            name: 'Registro de Gastos',
            description: `${rendiciones.length} rendiciones (mín. 5)`,
            whyMatters: 'Calcula márgenes reales.',
            howToFix: 'Registra cada gasto.',
            completed: rendiciones.length >= 5,
            weight: 8,
            category: 'finanzas',
            currentValue: rendiciones.length,
            targetValue: 5
        },
        {
            id: 'rendiciones_vinculadas',
            name: 'Gastos Vinculados',
            description: `${rendicionesVinculadas}/${rendiciones.length} vinculados`,
            whyMatters: 'Margen real por pedido.',
            howToFix: 'Vincula cada gasto a su pedido.',
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
                        {pendingPoints.length} pendientes →
                    </span>
                </div>
            </button>

            {/* Modal de detalles */}
            {showModal && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ backgroundColor: 'var(--modal-overlay)' }}
                    onKeyDown={(e) => e.key === 'Escape' && setShowModal(false)}
                >
                    <div
                        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
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

                        {/* Tabs */}
                        <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                            <button
                                onClick={() => setActiveTab('teoria')}
                                className="flex-1 py-3 px-4 text-sm font-medium transition-colors relative"
                                style={{
                                    color: activeTab === 'teoria' ? '#6366f1' : 'var(--text-muted)',
                                    backgroundColor: activeTab === 'teoria' ? 'var(--bg-secondary)' : 'transparent'
                                }}
                            >
                                📚 ¿Qué se necesita?
                                {activeTab === 'teoria' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('progreso')}
                                className="flex-1 py-3 px-4 text-sm font-medium transition-colors relative"
                                style={{
                                    color: activeTab === 'progreso' ? '#10b981' : 'var(--text-muted)',
                                    backgroundColor: activeTab === 'progreso' ? 'var(--bg-secondary)' : 'transparent'
                                }}
                            >
                                📊 Nuestro Progreso
                                {activeTab === 'progreso' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                                )}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'teoria' ? (
                                /* TAB 1: QUÉ SE NECESITA (TEORÍA) */
                                <div className="space-y-6">
                                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                        <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                            ¿Qué es un Gemelo Digital Logístico?
                                        </h3>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            Es una <strong>réplica virtual</strong> de tu operación que permite simular escenarios,
                                            predecir problemas y optimizar rutas. Requiere <strong>5 capas de datos</strong> para funcionar correctamente.
                                        </p>
                                    </div>

                                    {CAPAS_GEMELO.map((capa) => (
                                        <div
                                            key={capa.id}
                                            className="rounded-xl overflow-hidden"
                                            style={{ border: `2px solid ${capa.color}20` }}
                                        >
                                            {/* Header de la capa */}
                                            <div
                                                className="p-4 flex items-center gap-3"
                                                style={{ backgroundColor: `${capa.color}15` }}
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                                                    style={{ backgroundColor: `${capa.color}25` }}
                                                >
                                                    {capa.icon}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="text-xs font-bold px-2 py-0.5 rounded"
                                                            style={{ backgroundColor: capa.color, color: 'white' }}
                                                        >
                                                            CAPA {capa.numero}
                                                        </span>
                                                        <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                            {capa.nombre}
                                                        </h4>
                                                    </div>
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        {capa.descripcion}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Contenido */}
                                            <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--bg-card)' }}>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: capa.color }}>
                                                        ¿Qué datos necesitas?
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {capa.queNecesitas.map((item, idx) => (
                                                            <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                                <span style={{ color: capa.color }}>•</span>
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        <strong style={{ color: 'var(--text-secondary)' }}>Beneficio:</strong> {capa.beneficios}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* TAB 2: NUESTRO PROGRESO */
                                <div className="space-y-6">
                                    {/* Resumen rápido */}
                                    <div className="grid grid-cols-5 gap-2">
                                        {CAPAS_GEMELO.map((capa) => {
                                            const points = groupedPoints[capa.id] || [];
                                            const completed = points.filter(p => p.completed).length;
                                            const total = points.length;
                                            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                                            return (
                                                <div
                                                    key={capa.id}
                                                    className="p-3 rounded-xl text-center"
                                                    style={{
                                                        backgroundColor: `${capa.color}15`,
                                                        border: `1px solid ${capa.color}30`
                                                    }}
                                                >
                                                    <span className="text-2xl">{capa.icon}</span>
                                                    <div className="text-lg font-bold" style={{ color: capa.color }}>{pct}%</div>
                                                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{capa.nombre}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Detalle por capa */}
                                    {CAPAS_GEMELO.map((capa) => {
                                        const points = groupedPoints[capa.id] || [];
                                        const completed = points.filter(p => p.completed).length;
                                        const total = points.length;

                                        return (
                                            <div key={capa.id}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-xl">{capa.icon}</span>
                                                    <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{capa.nombre}</h4>
                                                    <span
                                                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                        style={{
                                                            backgroundColor: completed === total ? '#d1fae5' : completed > 0 ? '#fef3c7' : '#fee2e2',
                                                            color: completed === total ? '#047857' : completed > 0 ? '#92400e' : '#b91c1c'
                                                        }}
                                                    >
                                                        {completed}/{total}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
                                                    {points.map((point) => (
                                                        <div
                                                            key={point.id}
                                                            className="p-3 rounded-lg flex items-start gap-2"
                                                            style={{
                                                                backgroundColor: point.completed ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                                                                border: `1px solid ${point.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`
                                                            }}
                                                        >
                                                            <span className="text-lg shrink-0">{point.completed ? '✅' : '⭕'}</span>
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                                    {point.name}
                                                                </p>
                                                                <p className="text-xs" style={{ color: point.completed ? '#059669' : '#dc2626' }}>
                                                                    {point.description}
                                                                </p>
                                                                {!point.completed && (
                                                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                                        💡 {point.howToFix}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                                📚 Basado en <strong>Fraunhofer IML</strong>, <strong>DHL</strong> y <strong>RELEX Solutions</strong>
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
