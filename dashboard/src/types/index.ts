// Database types for the logistics system

// ...
// ...
export interface Cliente {
    id: string;

    // Level 1: Corporate Holding/Group
    grupo_empresarial?: string;           // E.g., "Grupo Lar"
    grupo_empresarial_ruc?: string;       // RUC del grupo (para auditoría)
    grupo_logo_url?: string;              // Logo del grupo empresarial

    // Level 2: Legal Entity (Razón Social)
    razon_social: string;                 // E.g., "Comercial Sendai S.A.C." - PRIMARY KEY
    nombre_comercial?: string;            // E.g., "Sendai" - Marketing name

    // Level 3: Project/Business Unit
    proyecto?: string;                    // E.g., "Proyecto Cantúa"
    proyecto_codigo?: string;             // Project code for internal reference

    // Contact & Identification
    ruc?: string;                         // RUC de la razón social
    direccion?: string;
    contacto?: string;
    telefono?: string;
    email?: string;

    // Commercial Terms (can be inherited from group)
    terminos_comerciales?: string;        // E.g., "Crédito 30 días"
    vendedor_asignado?: string;           // Sales person assignment

    // Status & Classification
    estado: 'activo' | 'inactivo' | 'suspendido';  // Client status
    prioridad: 'alto' | 'medio' | 'bajo';          // Commercial priority
    tipo_cliente: 'corporativo' | 'pyme' | 'individual';

    // Notes & Metadata
    notas?: string;
    logo?: string;                        // Logo URL

    // Documents & Attachments
    documentos?: Documento[];

    // Timestamps
    created_at?: string;
    updated_at?: string;
}

// Documento/Factura vinculado a un cliente
export interface Documento {
    id: string;
    nombre: string;                    // E.g., "Factura #001"
    tipo: 'factura' | 'contrato' | 'cotizacion' | 'otro';
    url: string;                       // URL del documento en storage
    fecha_subida: string;              // ISO timestamp
    descripcion?: string;
    monto?: number;                    // Monto de la factura (si aplica)
}

// Categorías de proveedor disponibles
export const CATEGORIAS_PROVEEDOR = [
    'Logos',
    'Importadores / Merchandising general',
    'Textil',
    'Merchandising pequeño (pines, lanyards, llaveros)',
    'Papelería',
    'Producción gráfica / gran formato',
    'POP y activaciones BTL',
    'Ecológico',
    'Acrílico y loza',
    'Decoración y ambientación',
    'Globos y decoración promocional',
    'Logística y montaje',
    'Personal para eventos',
    'Diseño y servicios creativos',
    'Servicios especiales / ad-hoc'
] as const;

export type CategoriaProveedor = typeof CATEGORIAS_PROVEEDOR[number];

export interface Proveedor {
    id: string;
    // Sección 1 - Identificación
    nombre: string;                    // Nombre comercial (obligatorio)
    razon_social?: string;
    ruc?: string;
    contacto?: string | null;          // Persona de contacto
    telefono?: string;                 // Teléfono / WhatsApp
    email?: string;
    direccion?: string;                // Ubicación (distrito / ciudad)

    // Sección 2 - Tipo y capacidades
    categorias?: string[];             // Múltiples categorías seleccionables
    especialidad: string;              // Legacy: mantener compatibilidad

    // Sección 3 - Condiciones comerciales
    emite_factura?: boolean;
    incluye_igv?: 'si' | 'no' | 'depende'; // FASE 1: Migrado de BOOLEAN a ENUM igv_policy
    forma_pago?: string;               // contado / adelanto / contra entrega / otro
    tiempo_produccion?: number;        // días
    tiempo_entrega?: number;           // días
    minimo_produccion?: string;        // texto libre
    condiciones_pago?: string | null;  // Legacy
    factor_demora: number;             // Legacy

    // Sección 4 - Observaciones
    notas?: string;

    // Metadata
    logo?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Payment {
    // ...
    id: string;
    pedidoId: string;
    monto: number;
    fecha: string;
    nota?: string;
}

export interface Pedido {
    id: string;
    cliente: string;
    vendedora: string;
    descripcion: string;
    descripcion_corta?: string;      // Título corto opcional para mostrar en tabla
    estado: 'cotizacion' | 'aprobado' | 'aprobado_pendiente_cambios' | 'en_produccion' | 'listo' | 'entregado' | 'cerrado';
    fecha_compromiso?: string;
    rq_numero?: string | null;       // Código INTERNO de la empresa (manual, ej: RQ-123)
    rl_numero?: string | null;       // Requisito Logístico del SISTEMA (auto, ej: RL-2026-0001)
    created_at: string;
    updated_at: string;
    precio?: number;
    pagado?: number;
    adelanto?: number; // Legacy support
    lineas?: LineaPedido[]; // Nueva relación
}

// Línea de producto dentro de un pedido (SIMPLIFICADO)
export interface LineaPedido {
    id: string;
    pedido_id: string;
    item: string;                        // Ej: "Lanyards", "Afiches", "Bolsas"
    detalle: string;                     // Texto libre: cantidades, especificaciones, colores, etc.
    precio: number;                      // Precio total de la línea
    created_at: string;
    updated_at: string;
}

// Historial de Items pedidos (para búsqueda/catálogo)
export interface ItemCotizacion {
    id: string;
    item: string;                        // "Bolsas", "Lanyards", etc.
    proveedor_id: string;                // Proveedor que cotizó
    proveedor_nombre: string;            // Nombre del proveedor
    ultima_cotizacion: string;           // ISO timestamp
    cantidad_pedidos: number;            // Cuántas veces se ha pedido este item
    created_at: string;
}

// Variante de un producto (cantidad + detalles) - DEPRECATED pero mantener por compatibilidad
export interface Variante {
    id: string;                          // UUID
    cantidad: number;                    // Ej: 25 unidades
    descripcion: string;                 // Ej: "con gancho", "con gancho + tip top"
}

// Registro de cambio a una línea de pedido
export interface CambioPedido {
    id: string;
    pedido_id: string;
    linea_id: string;
    campo_modificado: string;            // Ej: "cantidad", "color", "especificaciones"
    valor_anterior: string;              // Valor anterior
    valor_nuevo: string;                 // Valor nuevo
    numero_cambio: number;               // 1, 2, 3... (cantidad de cambios realizados)
    created_at: string;
}



export interface AcuerdoProduccion {
    id: string;
    pedido_id: string | null;
    proveedor_id: string;
    proveedor_nombre: string;
    producto: string;
    cantidad: number;
    especificaciones: string | null;
    costo_total: number | null;
    adelanto: number | null;
    fecha_acuerdo: string;
    fecha_prometida: string;
    estado: string;
}

// Variante de una cotización (una cotización puede tener múltiples variantes)
export interface VarianteCotizacion {
    id: string;
    cotizacion_id: string;           // FK a la cotización
    producto_base: string;           // Campo normalizado OBLIGATORIO: "lanyard", "bolsa", "pin", etc. Para comparaciones de precios
    variante?: string;               // Ej: "con gancho", "con tiptop", "blanco", "rojo" - Diferencias comerciales
    descripcion: string;             // Ej: "Lanyard 2.5cm con gancho + tiptop" - Texto libre SOLO para lectura (no se usa para lógica)
    cantidad: number;                // Cantidad para esta variante
    precio_unitario: number;         // Precio por unidad
    precio_total: number;            // cantidad * precio_unitario (auto-calculado)
    incluye_igv: boolean;            // Si el precio incluye IGV
    tiempo_produccion_dias?: number; // Días de producción para esta variante
    tiempo_entrega_dias?: number;    // Días de entrega para esta variante
    created_at: string;
    updated_at: string;
}

// Cotización de proveedor (puede tener una o más variantes)
export interface Cotizacion {
    id: string;
    rl_numero?: string;              // Requisito Logístico del sistema (RL-YYYY-XXXX)
    pedido_id?: string;              // FK al pedido (para relación)
    proveedor_id: string;            // ID del proveedor (nombre)
    fecha: string;                   // Fecha de la cotización
    descripcion?: string;            // Descripción general (DEPRECADO - usar variantes)
    cantidad?: number;               // DEPRECADO - usar variantes
    precio_unitario?: number;        // DEPRECADO - usar variantes
    precio_total?: number;           // DEPRECADO - usar variantes
    incluye_igv?: boolean;           // DEPRECADO - usar variantes
    moneda: 'PEN' | 'USD';           // Moneda

    // Relación a variantes
    variantes?: VarianteCotizacion[]; // Array de variantes

    // Condiciones de pago (aplican a toda la cotización)
    forma_pago: 'contado' | 'adelanto_50' | 'adelanto_70' | 'contra_entrega' | 'credito' | 'otro';
    condiciones_pago_detalle?: string;  // Detalle adicional de condiciones

    // Datos bancarios
    cuenta_bancaria?: string;        // Número de cuenta
    banco?: string;                  // Nombre del banco
    cci?: string;                    // Código interbancario
    yape_plin?: string;              // Número de Yape/Plin

    // Producción (general, si no hay variantes)
    tiempo_produccion?: number;      // Días de producción
    tiempo_entrega?: number;         // Días de entrega después de producción

    // Extras
    prueba_color?: boolean;          // Si ofrece prueba de color
    muestra_fisica?: boolean;        // Si ofrece muestra física

    // Estado y seguimiento
    estado: 'pendiente' | 'aprobada' | 'rechazada' | 'vencida';
    vigencia_dias?: number;          // Días de vigencia de la cotización

    // Notas
    notas?: string;

    // Metadata
    created_at: string;
    updated_at: string;
}

// Histórico de precios por proveedor - INDEPENDIENTE de cotizaciones
// Se crea automáticamente cada vez que se registra una cotización
export interface HistoricoPrecio {
    id: string;
    proveedor_id: string;           // FK al proveedor (por nombre)

    // Producto normalizado (OBLIGATORIO)
    producto_base: string;          // Ej: "lanyard", "bolsa", "pin" - Clave para comparaciones históricas

    // Información adicional del producto
    descripcion: string;            // Ej: "Lanyard 2.5 cm sublimado" - Descripción que ingresó el usuario
    variante?: string;              // Ej: "con tip top", "sin tip top", "blanco", "rojo"

    // Precios y cantidades
    precio_unitario: number;        // Precio por unidad (S/.)
    incluye_igv: boolean;           // Si el precio incluye IGV
    cantidad_referencia?: number;   // Cantidad en la que se cotizó (para comparación)

    // Tiempos
    tiempo_produccion_dias?: number;// Días de producción
    tiempo_entrega_dias?: number;   // Días de entrega

    // Trazabilidad
    pedido_origen_id?: string;      // ID del pedido que originó este histórico
    cotizacion_origen_id?: string;  // ID de la cotización (si la hay)
    fecha_cotizacion: string;       // ISO timestamp de cuándo se cotizó

    // Metadata
    created_at: string;             // Cuándo se registró en el histórico
    updated_at: string;
}

export interface MovimientoMovilidad {
    id: string;
    fecha: string;
    origen: string;
    destino: string;
    costo: number;
    tipo_transporte: string;
    proposito: string;
}

// ============================================
// PRODUCCIÓN - Registro de decisiones de producción
// Un pedido puede tener múltiples producciones
// ============================================
export interface Produccion {
    id: string;
    rl_numero?: string;                   // Requisito Logístico del sistema (RL-YYYY-XXXX)
    pedido_id: string;                    // FK a pedidos(id)
    cotizacion_id?: string;               // FK a cotizaciones(id) - opcional
    proveedor_id: string;                 // Nombre del proveedor

    // Qué se aprobó
    producto_base: string;                // "lanyard", "bolsa", etc.
    variante?: string;                    // "2.5cm sin tip top"
    descripcion?: string;                 // Descripción libre
    cantidad_aprobada: number;
    precio_unitario: number;
    precio_total: number;
    incluye_igv: boolean;

    // Tiempos (llenado progresivo)
    fecha_aprobacion: string;             // Cuando se dio el OK
    fecha_envio_produccion?: string;      // Cuando se mandó a producir
    fecha_compromiso?: string;            // Fecha prometida
    fecha_entrega_real?: string;          // Cuando realmente llegó

    // Control de calidad
    prueba_color: 'pendiente' | 'aprobada' | 'rechazada' | 'na';
    muestra_fisica: 'pendiente' | 'aprobada' | 'rechazada' | 'na';
    observaciones_qc?: string;

    // Seguimiento operativo
    estado: 'en_proceso' | 'listo' | 'recogido' | 'entregado' | 'problema';
    responsable?: string;                 // Persona de logística
    notas?: string;

    // Metadata
    created_at: string;
    updated_at: string;
}

// Estados de producción para UI
export const ESTADOS_PRODUCCION = [
    { value: 'en_proceso', label: 'En Proceso', color: 'bg-blue-500', icon: '🔄' },
    { value: 'listo', label: 'Listo', color: 'bg-green-500', icon: '✅' },
    { value: 'recogido', label: 'Recogido', color: 'bg-purple-500', icon: '📦' },
    { value: 'entregado', label: 'Entregado', color: 'bg-emerald-500', icon: '🚚' },
    { value: 'problema', label: 'Problema', color: 'bg-red-500', icon: '⚠️' },
] as const;

// Estados de QC para UI
export const ESTADOS_QC = [
    { value: 'na', label: 'N/A', color: 'text-gray-400' },
    { value: 'pendiente', label: 'Pendiente', color: 'text-yellow-400' },
    { value: 'aprobada', label: 'Aprobada', color: 'text-green-400' },
    { value: 'rechazada', label: 'Rechazada', color: 'text-red-400' },
] as const;

export interface KPIs {
    totalPedidos: number;
    pedidosActivos: number;
    montoProduccion: number;
    alertas: number;
    movilidadHoy: number;
    // New KPIs
    valorPipeline: number;      // Sum of prices of active orders
    tasaConversion: number;     // % of closed orders vs total
    saldoPendiente: number;     // Total price - total paid
    // PKL KPIs
    totalPKLs: number;
    pklsActivos: number;
    costoPKLs: number;
}

// ============================================
// EVENTOS DIARIOS (JSON día a día)
// Estructura para importar resumen de actividades diarias
// ============================================

// Secciones disponibles en el JSON de día a día
export type SeccionEvento = 'MOVIMIENTO_LOGISTICO' | 'RENDICION_PAGO' | 'PRODUCCION';

// Estados posibles de un evento
export type EstadoEvento = 'completado' | 'pendiente' | 'registrado' | 'pagado' | 'en_produccion' | 'en_proceso' | 'rechazado' | 'cancelado';

// ============================================
// MOVIMIENTOS LOGÍSTICOS
// ============================================
export type TipoMovimientoLogistico = 'entrega' | 'recojo' | 'compra' | 'traslado' | 'solicitud_stock' | 'cotizacion' | 'coordinacion';

export interface ItemMovimiento {
    producto: string;
    cantidad: number;
    proveedor?: string;
}

export interface DetalleMovimientoEntrega {
    items: ItemMovimiento[];
}

export interface DetalleMovimientoRecojo {
    origen: string;
    destino?: string;
    item?: string;
    motivo?: string;
    fecha_evento?: string;
}

// Task simple para movimientos/rendiciones (reutiliza estructura de PKL)
export interface TaskEvento {
    task_id: string;
    tipo: string;
    nombre: string;
    descripcion?: string;
    costo?: {
        monto: number;
        moneda: 'PEN' | 'USD';
    };
    estado: 'pendiente' | 'completado';
    fecha_completado?: string;
}

export interface MovimientoLogistico {
    id: string;
    rl_numero?: string;                     // Requisito Logístico del sistema (RL-YYYY-XXXX)
    fecha: string;                          // Fecha del movimiento
    seccion: 'MOVIMIENTO_LOGISTICO';
    tipo: TipoMovimientoLogistico;
    cliente?: string;                       // Cliente asociado
    proveedor?: string;                     // Proveedor asociado
    pedido_id?: string;                     // FK a pedidos (si aplica)

    // Detalle flexible según tipo
    detalle: DetalleMovimientoEntrega | DetalleMovimientoRecojo | Record<string, unknown>;

    estado: EstadoEvento;
    observaciones?: string;

    // Costos asociados
    costo_movilidad?: number;

    // Tasks asociados
    tasks?: TaskEvento[];

    // Metadata
    created_at: string;
    updated_at: string;
}

// ============================================
// RENDICIONES Y PAGOS
// ============================================
export type TipoRendicion = 'movilidad' | 'adelanto_produccion' | 'pago_saldo' | 'gasto_extra' | 'compra_material' | 'caja_diaria';

export interface DetalleRendicionMovilidad {
    concepto: string;
    monto: number;
    moneda: 'PEN' | 'USD';
    comprobante?: string;
}

export interface DetalleRendicionAdelanto {
    porcentaje: number;
    monto_pagado: number;
    moneda: 'PEN' | 'USD';
    incluye_igv: boolean;
    factura_requerida: boolean;
}

export interface Rendicion {
    id: string;
    rl_numero?: string;                     // Requisito Logístico del sistema (RL-YYYY-XXXX)
    fecha: string;                          // Fecha de la rendición
    seccion: 'RENDICION_PAGO';
    tipo: TipoRendicion;
    cliente?: string;                       // Cliente asociado
    proveedor?: string;                     // Proveedor asociado
    pedido_id?: string;                     // FK a pedidos (si aplica)
    produccion_id?: string;                 // FK a producciones (si aplica)

    // Detalle flexible según tipo
    detalle: DetalleRendicionMovilidad | DetalleRendicionAdelanto | Record<string, unknown>;

    // Montos
    monto: number;
    moneda: 'PEN' | 'USD';

    estado: EstadoEvento;
    observaciones?: string;

    // Comprobantes
    tiene_comprobante: boolean;
    tipo_comprobante?: 'boleta' | 'factura' | 'recibo' | 'ninguno';
    numero_comprobante?: string;

    // Metadata
    created_at: string;
    updated_at: string;
}

// ============================================
// EVENTOS DE PRODUCCIÓN (del JSON día a día)
// Se vincula con la tabla producciones existente
// ============================================
export interface DetalleProduccion {
    producto: string;
    cantidad_total?: number;
    cantidad?: number;
    especificaciones?: Record<string, unknown>;
    precio_por_millar_sin_igv?: number;
    precio_unitario?: number;
}

export interface EventoProduccion {
    id: string;
    rl_numero?: string;                     // Requisito Logístico del sistema (RL-YYYY-XXXX)
    fecha: string;
    seccion: 'PRODUCCION';
    tipo: 'orden_produccion';
    cliente: string;
    proveedor: string;
    pedido_id?: string;                     // FK a pedidos (si aplica)

    // Detalle del producto (campos directos para la DB)
    producto: string;
    cantidad?: number;
    especificaciones?: Record<string, unknown>;
    precio_unitario?: number;
    precio_total?: number;

    estado: EstadoEvento;
    observaciones?: string;

    // Metadata
    created_at: string;
    updated_at: string;
}

// ============================================
// RESUMEN DIARIO (JSON completo)
// ============================================
export interface EventoDiaGenerico {
    seccion: SeccionEvento;
    tipo: string;
    cliente?: string;
    proveedor?: string;
    detalle: Record<string, unknown>;
    estado: string;
    observaciones?: string;
}

export interface ResumenDiario {
    fecha: string;
    eventos_dia: EventoDiaGenerico[];
}

// Estados para UI de movimientos logísticos
export const TIPOS_MOVIMIENTO = [
    { value: 'entrega', label: 'Entrega', color: 'bg-green-500', icon: '📦' },
    { value: 'recojo', label: 'Recojo', color: 'bg-blue-500', icon: '🚚' },
    { value: 'compra', label: 'Compra', color: 'bg-amber-500', icon: '🛒' },
    { value: 'traslado', label: 'Traslado', color: 'bg-purple-500', icon: '🔄' },
    { value: 'servicio', label: 'Servicio en Sitio', color: 'bg-pink-500', icon: '🔧' },
    { value: 'solicitud_stock', label: 'Solicitud Stock', color: 'bg-cyan-500', icon: '📋' },
    { value: 'cotizacion', label: 'Cotización', color: 'bg-yellow-500', icon: '💬' },
    { value: 'coordinacion', label: 'Coordinación', color: 'bg-indigo-500', icon: '📞' },
] as const;

// Estados para UI de rendiciones
export const TIPOS_RENDICION = [
    { value: 'movilidad', label: 'Movilidad', color: 'bg-cyan-500', icon: '🚕' },
    { value: 'adelanto_produccion', label: 'Adelanto Producción', color: 'bg-orange-500', icon: '💰' },
    { value: 'pago_saldo', label: 'Pago Saldo', color: 'bg-emerald-500', icon: '✅' },
    { value: 'gasto_extra', label: 'Gasto Extra', color: 'bg-red-500', icon: '📋' },
    { value: 'compra_material', label: 'Compra Material', color: 'bg-indigo-500', icon: '🛍️' },
    { value: 'caja_diaria', label: 'Caja Diaria', color: 'bg-amber-500', icon: '💵' },
] as const;

// ============================================
// PKL - PRIMARY KEY LOGÍSTICA
// Unidad mínima de ejecución logística end-to-end
// ============================================

// Tipos de operacion PKL (Ciclos de Operación) - Organizados por grupos
export const TIPOS_OPERACION_PKL = [
    { value: 'ciclo_completo', label: 'Ciclo Completo (C+P+R+E)', color: 'bg-emerald-700' },
    { value: 'produccion_recojo_entrega', label: 'Produccion + Recojo + Entrega', color: 'bg-blue-700' },
    { value: 'cotizacion_recojo_entrega', label: 'Cotizacion + Recojo + Entrega', color: 'bg-sky-700' },
    { value: 'cotizacion_recojo', label: 'Cotizacion + Recojo', color: 'bg-teal-700' },
    { value: 'recojo_entrega', label: 'Recojo + Entrega', color: 'bg-cyan-700' },
    { value: 'solo_entrega', label: 'Solo Entrega', color: 'bg-green-700' },
    { value: 'cotizacion_produccion_motorizado', label: 'Cotizacion + Produccion + Motorizado', color: 'bg-indigo-700' },
    { value: 'solo_motorizado', label: 'Solo Motorizado', color: 'bg-rose-700' },
    { value: 'solo_cotizacion', label: 'Solo Cotizacion', color: 'bg-yellow-600' },
    { value: 'ciclo_completo_instalacion', label: 'Ciclo Completo + Instalacion', color: 'bg-purple-700' },
    { value: 'feria_evento', label: 'Feria/Evento', color: 'bg-orange-700' },
    { value: 'compra_insumo', label: 'Compra Insumo', color: 'bg-amber-700' },
    { value: 'compra_interna', label: 'Compra Interna', color: 'bg-amber-700' },
    { value: 'movilidad', label: 'Movilidad', color: 'bg-cyan-700' },
    { value: 'produccion', label: 'Produccion', color: 'bg-blue-700' },
] as const;

// Grupos de operación para mejor visualización en dropdowns
export const GRUPOS_OPERACION_PKL = [
    {
        grupo: 'CICLO COMPLETO',
        color: 'text-emerald-500',
        tipos: ['ciclo_completo', 'ciclo_completo_instalacion']
    },
    {
        grupo: 'CON PRODUCCIÓN',
        color: 'text-blue-500',
        tipos: ['produccion_recojo_entrega', 'cotizacion_produccion_motorizado', 'produccion']
    },
    {
        grupo: 'CON COTIZACIÓN',
        color: 'text-yellow-500',
        tipos: ['cotizacion_recojo_entrega', 'cotizacion_recojo', 'solo_cotizacion']
    },
    {
        grupo: 'LOGÍSTICA',
        color: 'text-cyan-500',
        tipos: ['recojo_entrega', 'solo_entrega', 'solo_motorizado', 'movilidad']
    },
    {
        grupo: 'ESPECIALES',
        color: 'text-orange-500',
        tipos: ['feria_evento', 'compra_insumo', 'compra_interna']
    },
] as const;

export type TipoOperacionPKL = typeof TIPOS_OPERACION_PKL[number]['value'];

// Estados del PKL
export const ESTADOS_PKL = [
    { value: 'recibido', label: 'Recibido', color: 'bg-sky-700' },
    { value: 'cotizado', label: 'Cotizado', color: 'bg-teal-700' },
    { value: 'en_produccion', label: 'En Produccion', color: 'bg-blue-700' },
    { value: 'para_recoger', label: 'Para Recoger', color: 'bg-cyan-700' },
    { value: 'en_pausa', label: 'En Pausa', color: 'bg-yellow-600' },
    { value: 'cerrado_ok', label: 'Cerrado OK', color: 'bg-green-700' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-red-700' },
] as const;

export type EstadoPKL = typeof ESTADOS_PKL[number]['value'];

// Tipos de Task
export const TIPOS_TASK_PKL = [
    { value: 'cotizacion', label: 'Cotizacion', color: 'bg-yellow-500' },
    { value: 'coordinacion_proveedor', label: 'Coordinacion Proveedor', color: 'bg-blue-500' },
    { value: 'compra_insumo', label: 'Compra Insumo', color: 'bg-amber-500' },
    { value: 'pago', label: 'Pago', color: 'bg-green-500' },
    { value: 'movilidad', label: 'Movilidad', color: 'bg-cyan-500' },
    { value: 'instalacion', label: 'Instalacion', color: 'bg-purple-500' },
    { value: 'cierre', label: 'Cierre', color: 'bg-emerald-500' },
    { value: 'administrativo', label: 'Administrativo', color: 'bg-gray-500' },
] as const;

export type TipoTaskPKL = typeof TIPOS_TASK_PKL[number]['value'];

// Contacto del cliente
export interface ContactoPKL {
    nombre?: string;
    telefono?: string;
    email?: string;
}

// Cliente del PKL
export interface ClientePKL {
    nombre: string;
    proyecto?: string;
    contacto?: ContactoPKL;
    direccion_entrega?: string;
    ejecutiva_asignada?: string;
}

// Origen del PKL
export interface OrigenPKL {
    canal: 'whatsapp' | 'email' | 'telefono' | 'presencial' | 'otro';
    solicitado_por?: string;
    fecha_solicitud: string;
    descripcion_inicial: string;
    evento_origen_id?: string; // ID del evento del Día a Día que originó este PKL
}

// Producto del PKL
export interface ProductoPKL {
    producto_id: string;
    tipo: string;
    cantidad?: number;
    descripcion: string;
    atributos?: Record<string, unknown>;
}

// Input (arte gráfico, etc.)
export interface InputPKL {
    fuente?: string;
    estado?: 'pendiente' | 'recibido' | 'aprobado';
    fecha_recepcion?: string;
    archivo?: string;
}

// Proveedor del PKL
// Cotización de un proveedor en PKL
export interface CotizacionProveedorPKL {
    descripcion: string;           // Qué se cotizó
    cantidad?: number;             // Cantidad cotizada
    precio_unitario?: number;      // Precio por unidad
    precio_total: number;          // Precio total cotizado
    incluye_igv?: boolean;         // Si el precio incluye IGV
    tiempo_entrega?: string;       // Tiempo de entrega estimado
    notas?: string;                // Notas adicionales
    fecha_cotizacion?: string;     // Fecha de la cotización
}

export interface ProveedorPKL {
    proveedor_id: string;
    nombre: string;
    alias?: string;
    servicio?: string;
    ubicacion?: string;
    contacto?: string;
    // Cotizaciones (múltiples por proveedor)
    cotizaciones?: CotizacionProveedorPKL[];
    // Backward compatibility: cotizacion singular (deprecated, usar cotizaciones)
    cotizacion?: CotizacionProveedorPKL;
    // Si este proveedor fue elegido para el trabajo
    elegido?: boolean;
}

// Historial de estado
export interface HistorialEstadoPKL {
    estado: EstadoPKL;
    fecha: string;
    motivo?: string;
}

// Costo de un task
export interface CostoTaskPKL {
    monto: number;
    moneda: 'PEN' | 'USD';
    concepto?: string;
    medio_pago?: 'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro';
    incluye_igv?: boolean;
    comprobante?: 'factura' | 'boleta' | 'recibo' | 'ninguno';
}

// Ruta de movilidad
export interface RutaTaskPKL {
    origen: string;
    destino: string;
}

// Resultado de cotización
export interface ResultadoCotizacionPKL {
    precio_encontrado?: number;
    moneda?: 'PEN' | 'USD';
    observaciones?: string;
}

// Ítem de cotización (para cotizaciones con múltiples líneas)
export interface ItemCotizacionPKL {
    item_id: string;               // UUID único
    codigo?: string;               // Código del proveedor (ej: ME-0117)
    descripcion: string;           // Descripción del producto
    cantidad: number;              // Cantidad
    unidad?: string;               // UNI, MLL, etc.
    precio_unitario: number;       // Precio por unidad
    precio_total: number;          // cantidad * precio_unitario
}

// Cotización individual (para comparar proveedores)
export interface CotizacionProveedor {
    proveedor: string;
    precio: number;
    cantidad?: number;
    esPrecioUnitario?: boolean;
    incluyeIgv: boolean;
    seleccionada?: boolean;
}

// Task del PKL
export interface TaskPKL {
    task_id: string;
    orden: number;
    nombre: string;
    descripcion?: string;
    tipo: TipoTaskPKL;
    responsable: string;
    proveedor_id?: string;
    estado: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado';
    es_happy_path: boolean;
    bloqueado_por_evento?: string;
    duracion_min?: number;
    costo?: CostoTaskPKL;
    ruta?: RutaTaskPKL;
    ubicacion?: string;
    resultado?: ResultadoCotizacionPKL;
    fecha_completado?: string;
    // Ítems de cotización (para tasks tipo cotización con múltiples líneas)
    items_cotizacion?: ItemCotizacionPKL[];
    // Referencia a evento externo que originó este task (desde Día a Día)
    evento_origen_id?: string;
    // Campos adicionales para producción/cotización
    proveedor?: string;              // Nombre del proveedor (string directo)
    cantidad?: number;               // Cantidad de unidades
    precioUnitario?: number;         // Precio por unidad
    esPrecioUnitario?: boolean;      // Si el precio ingresado es por unidad o total
    incluyeIgv?: boolean;            // Si el precio incluye IGV
    cotizaciones?: CotizacionProveedor[];  // Lista de cotizaciones de proveedores
}

// Evento externo
export interface EventoExternoPKL {
    evento_id: string;
    descripcion: string;
    proveedor_id?: string;
    fecha: string;
    duracion_esperada?: string;
    duracion_real?: string;
    impacta_estado?: EstadoPKL;
}

// Detalle de costo
export interface DetalleCostoPKL {
    concepto: string;
    monto: number;
    task_id?: string;
    incluye_igv?: boolean;
}

// Resumen de costos
export interface CostosPKL {
    detalle: DetalleCostoPKL[];
    total?: number;
    moneda: 'PEN' | 'USD';
    nota?: string;
}

// Evidencia de cierre
export interface EvidenciaPKL {
    tipo: 'foto_entrega' | 'firma' | 'guia_remision' | 'mensaje_confirmacion';
    archivo?: string;
    fecha?: string;
    descripcion?: string;
}

// Cierre del PKL
export interface CierrePKL {
    estado_final?: EstadoPKL;
    fecha_cierre?: string;
    evidencias: EvidenciaPKL[];
    confirmado_por?: string;
}

// Alertas del PKL
export interface AlertasPKL {
    dias_sin_actividad: number;
    umbral_pausa_dias: number;
}

// Riesgo identificado
export interface RiesgoPKL {
    descripcion: string;
    mitigacion?: string;
    costo_referencia?: string;
}

// ============================================
// PKL - Entidad principal
// ============================================
export interface PKL {
    pkl_id: string;                           // PKL-YYYY-NNNN
    version: string;                          // "2.0"
    created_at: string;
    updated_at: string;

    // Clasificación
    clasificacion: {
        tipo_operacion: TipoOperacionPKL;
        area: 'logistica';                    // Preparado para expandir
    };

    // Cliente
    cliente: ClientePKL;

    // Origen del requerimiento
    origen: OrigenPKL;

    // Productos
    productos: ProductoPKL[];

    // Inputs (arte, archivos, etc.)
    inputs?: {
        arte_grafico?: InputPKL;
        [key: string]: InputPKL | undefined;
    };

    // Proveedores involucrados
    proveedores: ProveedorPKL[];

    // Estado actual e historial
    estado: {
        actual: EstadoPKL;
        historial: HistorialEstadoPKL[];
    };

    // Tasks ejecutados
    tasks: TaskPKL[];

    // Eventos externos (de terceros)
    eventos_externos: EventoExternoPKL[];

    // Costos
    costos: CostosPKL;

    // Cierre
    cierre: CierrePKL;

    // Alertas
    alertas: AlertasPKL;

    // Riesgos identificados (opcional)
    riesgos_identificados?: RiesgoPKL[];

    // Observaciones generales
    observaciones?: string;

    // PKL padre (para vinculación jerárquica)
    parent_pkl_id?: string;
}
