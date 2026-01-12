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
    incluye_igv?: 'si' | 'no' | 'depende';
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
    estado: 'cotizacion' | 'aprobado' | 'aprobado_pendiente_cambios' | 'en_produccion' | 'listo' | 'entregado' | 'cerrado';
    fecha_compromiso?: string;
    rq_numero?: string | null;
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
    descripcion: string;             // Ej: "Lanyard 2.5cm sin tip top" - Texto libre que ingresa el usuario
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
}
