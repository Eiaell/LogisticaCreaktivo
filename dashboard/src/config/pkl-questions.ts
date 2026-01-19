/**
 * PKL Questions Configuration
 *
 * Define las preguntas que el dashboard debe hacer al usuario
 * según el tipo de operación del PKL.
 *
 * Estas preguntas aparecen:
 * 1. Al crear un nuevo PKL (wizard/formulario guiado)
 * 2. En el detalle del PKL como "Información pendiente"
 */

export interface PKLQuestion {
    id: string;
    field: string;              // Campo en el modelo PKL donde se guarda
    label: string;              // Etiqueta visible
    placeholder?: string;       // Texto de ayuda en el input
    type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file' | 'currency';
    required: boolean;
    options?: { value: string; label: string }[];  // Para type: 'select'
    category: 'cliente' | 'producto' | 'proveedor' | 'logistica' | 'costos' | 'fechas' | 'evidencias';
    helpText?: string;          // Tooltip o ayuda adicional
}

export interface PKLQuestionSet {
    tipo_operacion: string;
    label: string;
    description: string;
    questions: PKLQuestion[];
    suggested_tasks: string[];  // Tasks sugeridos para este tipo
}

// ============================================
// PREGUNTAS COMUNES A TODOS LOS TIPOS
// ============================================
const COMMON_QUESTIONS: PKLQuestion[] = [
    {
        id: 'cliente_nombre',
        field: 'cliente.nombre',
        label: '¿Para qué cliente es?',
        placeholder: 'Nombre del cliente',
        type: 'text',
        required: true,
        category: 'cliente',
    },
    {
        id: 'cliente_proyecto',
        field: 'cliente.proyecto',
        label: '¿Es parte de algún proyecto específico?',
        placeholder: 'Nombre del proyecto (opcional)',
        type: 'text',
        required: false,
        category: 'cliente',
    },
    {
        id: 'descripcion',
        field: 'origen.descripcion_inicial',
        label: '¿Qué se necesita?',
        placeholder: 'Describe el requerimiento',
        type: 'textarea',
        required: true,
        category: 'producto',
    },
    {
        id: 'solicitado_por',
        field: 'origen.solicitado_por',
        label: '¿Quién lo solicitó?',
        placeholder: 'Nombre de quien hizo el pedido',
        type: 'text',
        required: false,
        category: 'cliente',
    },
    {
        id: 'fecha_solicitud',
        field: 'origen.fecha_solicitud',
        label: '¿Cuándo llegó el requerimiento?',
        type: 'date',
        required: true,
        category: 'fechas',
    },
];

// ============================================
// PREGUNTAS DE FECHAS (comunes pero opcionales)
// ============================================
const DATE_QUESTIONS: PKLQuestion[] = [
    {
        id: 'fecha_compromiso',
        field: 'fechas.compromiso',
        label: '¿Para cuándo se prometió?',
        type: 'date',
        required: false,
        category: 'fechas',
        helpText: 'Fecha comprometida con el cliente',
    },
    {
        id: 'fecha_entrega_real',
        field: 'fechas.entrega_real',
        label: '¿Cuándo se entregó realmente?',
        type: 'date',
        required: false,
        category: 'fechas',
    },
    {
        id: 'fecha_facturacion',
        field: 'fechas.facturacion',
        label: '¿Cuándo se facturó?',
        type: 'date',
        required: false,
        category: 'fechas',
    },
];

// ============================================
// COTIZACIÓN (solo_cotizacion)
// ============================================
export const COTIZACION_QUESTIONS: PKLQuestionSet = {
    tipo_operacion: 'solo_cotizacion',
    label: 'Cotización',
    description: 'Solicitud de precio sin producción confirmada',
    questions: [
        ...COMMON_QUESTIONS,
        // Producto
        {
            id: 'producto_tipo',
            field: 'productos[0].tipo',
            label: '¿Qué tipo de producto?',
            placeholder: 'Ej: Lanyard, Caja, Vinilo, Banner',
            type: 'text',
            required: true,
            category: 'producto',
        },
        {
            id: 'producto_cantidad',
            field: 'productos[0].cantidad',
            label: '¿Qué cantidad?',
            placeholder: 'Número de unidades',
            type: 'number',
            required: true,
            category: 'producto',
        },
        // Especificaciones técnicas
        {
            id: 'producto_medidas',
            field: 'productos[0].especificaciones.medidas',
            label: '¿Qué medidas?',
            placeholder: 'Ej: 40x30 cm, A4, 2m x 1m',
            type: 'text',
            required: false,
            category: 'producto',
        },
        {
            id: 'producto_material',
            field: 'productos[0].especificaciones.material',
            label: '¿Qué material?',
            placeholder: 'Ej: Vinilo, Tecnopor, Madera, Tela',
            type: 'text',
            required: false,
            category: 'producto',
        },
        {
            id: 'producto_colores',
            field: 'productos[0].especificaciones.colores',
            label: '¿Colores o acabados especiales?',
            placeholder: 'Ej: Full color, 1 tinta, Pantone 185C',
            type: 'text',
            required: false,
            category: 'producto',
        },
        // Fecha límite
        {
            id: 'fecha_respuesta',
            field: 'fechas.respuesta_cotizacion',
            label: '¿Para cuándo necesita la cotización el cliente?',
            type: 'date',
            required: false,
            category: 'fechas',
            helpText: 'Urgencia de la respuesta',
        },
        // Referencia de precio
        {
            id: 'precio_referencia',
            field: 'costos.precio_referencia',
            label: '¿Hay algún precio de referencia?',
            placeholder: 'Precio anterior o presupuesto del cliente',
            type: 'currency',
            required: false,
            category: 'costos',
        },
    ],
    suggested_tasks: [
        'Solicitar cotización a proveedor',
        'Revisar historial de precios',
        'Preparar cotización para cliente',
        'Enviar cotización',
        'Seguimiento de respuesta',
    ],
};

// ============================================
// PRODUCCIÓN (produccion)
// ============================================
export const PRODUCCION_QUESTIONS: PKLQuestionSet = {
    tipo_operacion: 'produccion',
    label: 'Producción',
    description: 'Trabajo confirmado en proceso de fabricación',
    questions: [
        ...COMMON_QUESTIONS,
        // Producto
        {
            id: 'producto_tipo',
            field: 'productos[0].tipo',
            label: '¿Qué se está produciendo?',
            placeholder: 'Tipo de producto',
            type: 'text',
            required: true,
            category: 'producto',
        },
        {
            id: 'producto_cantidad',
            field: 'productos[0].cantidad',
            label: '¿Qué cantidad?',
            type: 'number',
            required: true,
            category: 'producto',
        },
        {
            id: 'producto_especificaciones',
            field: 'productos[0].descripcion',
            label: 'Especificaciones completas',
            placeholder: 'Medidas, material, colores, acabados...',
            type: 'textarea',
            required: true,
            category: 'producto',
        },
        // Proveedor
        {
            id: 'proveedor_nombre',
            field: 'proveedores[0].nombre',
            label: '¿Qué proveedor lo produce?',
            placeholder: 'Nombre del proveedor',
            type: 'text',
            required: true,
            category: 'proveedor',
        },
        {
            id: 'proveedor_ubicacion',
            field: 'proveedores[0].ubicacion',
            label: '¿Dónde está el proveedor?',
            placeholder: 'Dirección o zona',
            type: 'text',
            required: false,
            category: 'proveedor',
        },
        // Costos
        {
            id: 'costo_produccion',
            field: 'costos.detalle.produccion',
            label: '¿Cuánto cuesta la producción?',
            placeholder: 'Costo acordado con proveedor',
            type: 'currency',
            required: true,
            category: 'costos',
        },
        {
            id: 'adelanto_proveedor',
            field: 'costos.detalle.adelanto',
            label: '¿Cuánto de adelanto se dio?',
            placeholder: 'Monto adelantado',
            type: 'currency',
            required: false,
            category: 'costos',
        },
        {
            id: 'saldo_proveedor',
            field: 'costos.detalle.saldo',
            label: '¿Cuánto falta pagar?',
            placeholder: 'Saldo pendiente',
            type: 'currency',
            required: false,
            category: 'costos',
        },
        // Fechas
        {
            id: 'fecha_entrega_proveedor',
            field: 'fechas.entrega_proveedor',
            label: '¿Cuándo entrega el proveedor?',
            type: 'date',
            required: true,
            category: 'fechas',
        },
        ...DATE_QUESTIONS,
        // Evidencias
        {
            id: 'evidencia_arte',
            field: 'evidencias.arte_aprobado',
            label: '¿El arte está aprobado?',
            type: 'file',
            required: false,
            category: 'evidencias',
            helpText: 'Subir imagen del arte aprobado',
        },
        {
            id: 'evidencia_avance',
            field: 'evidencias.fotos_avance',
            label: '¿Fotos de avance de producción?',
            type: 'file',
            required: false,
            category: 'evidencias',
        },
    ],
    suggested_tasks: [
        'Enviar arte al proveedor',
        'Confirmar recepción de arte',
        'Dar adelanto al proveedor',
        'Solicitar fotos de avance',
        'Aprobar muestra/prueba',
        'Recoger producción',
        'Pagar saldo al proveedor',
        'Verificar calidad',
    ],
};

// ============================================
// MOVILIDAD (movilidad)
// ============================================
export const MOVILIDAD_QUESTIONS: PKLQuestionSet = {
    tipo_operacion: 'movilidad',
    label: 'Movilidad',
    description: 'Traslado, recojo o entrega de materiales',
    questions: [
        ...COMMON_QUESTIONS,
        // Qué se traslada
        {
            id: 'que_traslada',
            field: 'logistica.descripcion_carga',
            label: '¿Qué se va a trasladar?',
            placeholder: 'Descripción de lo que se mueve',
            type: 'textarea',
            required: true,
            category: 'logistica',
        },
        {
            id: 'cantidad_bultos',
            field: 'logistica.cantidad_bultos',
            label: '¿Cuántos bultos/cajas?',
            placeholder: 'Número de paquetes',
            type: 'number',
            required: false,
            category: 'logistica',
        },
        // Origen
        {
            id: 'origen_direccion',
            field: 'logistica.origen.direccion',
            label: '¿De dónde se recoge?',
            placeholder: 'Dirección de origen',
            type: 'text',
            required: true,
            category: 'logistica',
        },
        {
            id: 'origen_contacto',
            field: 'logistica.origen.contacto',
            label: '¿Con quién coordinar en origen?',
            placeholder: 'Nombre y teléfono',
            type: 'text',
            required: false,
            category: 'logistica',
        },
        // Destino
        {
            id: 'destino_direccion',
            field: 'logistica.destino.direccion',
            label: '¿A dónde se entrega?',
            placeholder: 'Dirección de destino',
            type: 'text',
            required: true,
            category: 'logistica',
        },
        {
            id: 'destino_contacto',
            field: 'logistica.destino.contacto',
            label: '¿Quién recibe en destino?',
            placeholder: 'Nombre y teléfono',
            type: 'text',
            required: false,
            category: 'logistica',
        },
        // Horario
        {
            id: 'fecha_traslado',
            field: 'fechas.traslado',
            label: '¿Qué día?',
            type: 'date',
            required: true,
            category: 'fechas',
        },
        {
            id: 'hora_traslado',
            field: 'logistica.hora',
            label: '¿A qué hora?',
            placeholder: 'Ej: 10:00 AM',
            type: 'text',
            required: false,
            category: 'fechas',
        },
        // Costos
        {
            id: 'costo_transporte',
            field: 'costos.detalle.transporte',
            label: '¿Costo del transporte?',
            placeholder: 'Taxi, courier, etc.',
            type: 'currency',
            required: false,
            category: 'costos',
        },
        {
            id: 'tipo_transporte',
            field: 'logistica.tipo_transporte',
            label: '¿Tipo de transporte?',
            type: 'select',
            required: false,
            category: 'logistica',
            options: [
                { value: 'taxi', label: 'Taxi' },
                { value: 'courier', label: 'Courier' },
                { value: 'personal', label: 'Vehículo propio' },
                { value: 'proveedor', label: 'Proveedor entrega' },
                { value: 'cliente_recoge', label: 'Cliente recoge' },
            ],
        },
    ],
    suggested_tasks: [
        'Coordinar hora de recojo',
        'Confirmar disponibilidad en destino',
        'Solicitar taxi/courier',
        'Recoger material',
        'Entregar en destino',
        'Confirmar recepción',
        'Registrar costo de movilidad',
    ],
};

// ============================================
// PRODUCCIÓN + INSTALACIÓN (produccion_instalacion)
// ============================================
export const PRODUCCION_INSTALACION_QUESTIONS: PKLQuestionSet = {
    tipo_operacion: 'produccion_instalacion',
    label: 'Producción + Instalación',
    description: 'Producción con instalación en sitio del cliente',
    questions: [
        ...PRODUCCION_QUESTIONS.questions,
        // Instalación
        {
            id: 'instalacion_direccion',
            field: 'instalacion.direccion',
            label: '¿Dónde se instala?',
            placeholder: 'Dirección de instalación',
            type: 'text',
            required: true,
            category: 'logistica',
        },
        {
            id: 'instalacion_contacto',
            field: 'instalacion.contacto',
            label: '¿Quién recibe en sitio?',
            placeholder: 'Nombre y teléfono del contacto',
            type: 'text',
            required: true,
            category: 'logistica',
        },
        {
            id: 'instalacion_fecha',
            field: 'fechas.instalacion',
            label: '¿Fecha de instalación?',
            type: 'date',
            required: true,
            category: 'fechas',
        },
        {
            id: 'instalacion_hora',
            field: 'instalacion.hora',
            label: '¿Hora de instalación?',
            placeholder: 'Ej: 9:00 AM',
            type: 'text',
            required: false,
            category: 'fechas',
        },
        {
            id: 'instalacion_herramientas',
            field: 'instalacion.herramientas',
            label: '¿Qué herramientas/materiales llevar?',
            placeholder: 'Escalera, taladro, cinta, etc.',
            type: 'textarea',
            required: false,
            category: 'logistica',
        },
        {
            id: 'instalacion_costo',
            field: 'costos.detalle.instalacion',
            label: '¿Costo de instalación?',
            type: 'currency',
            required: false,
            category: 'costos',
        },
        // Evidencias
        {
            id: 'foto_antes',
            field: 'evidencias.foto_antes',
            label: '¿Foto del lugar ANTES?',
            type: 'file',
            required: false,
            category: 'evidencias',
        },
        {
            id: 'foto_despues',
            field: 'evidencias.foto_despues',
            label: '¿Foto del lugar DESPUÉS?',
            type: 'file',
            required: false,
            category: 'evidencias',
        },
    ],
    suggested_tasks: [
        ...PRODUCCION_QUESTIONS.suggested_tasks,
        'Coordinar fecha de instalación',
        'Confirmar contacto en sitio',
        'Preparar herramientas',
        'Tomar foto ANTES',
        'Realizar instalación',
        'Tomar foto DESPUÉS',
        'Obtener conformidad del cliente',
    ],
};

// ============================================
// COMPRA INTERNA (compra_interna)
// ============================================
export const COMPRA_INTERNA_QUESTIONS: PKLQuestionSet = {
    tipo_operacion: 'compra_interna',
    label: 'Compra Interna',
    description: 'Compra de insumos para uso interno o stock',
    questions: [
        {
            id: 'descripcion',
            field: 'origen.descripcion_inicial',
            label: '¿Qué se compró?',
            placeholder: 'Descripción del insumo',
            type: 'textarea',
            required: true,
            category: 'producto',
        },
        {
            id: 'cantidad',
            field: 'productos[0].cantidad',
            label: '¿Qué cantidad?',
            type: 'number',
            required: true,
            category: 'producto',
        },
        {
            id: 'precio_unitario',
            field: 'costos.detalle.precio_unitario',
            label: '¿Precio unitario?',
            type: 'currency',
            required: false,
            category: 'costos',
        },
        {
            id: 'precio_total',
            field: 'costos.total',
            label: '¿Precio total?',
            type: 'currency',
            required: true,
            category: 'costos',
        },
        {
            id: 'proveedor_tienda',
            field: 'proveedores[0].nombre',
            label: '¿Dónde se compró?',
            placeholder: 'Tienda o proveedor',
            type: 'text',
            required: true,
            category: 'proveedor',
        },
        {
            id: 'fecha_compra',
            field: 'fechas.compra',
            label: '¿Fecha de compra?',
            type: 'date',
            required: true,
            category: 'fechas',
        },
        {
            id: 'tipo_documento',
            field: 'evidencias.tipo_documento',
            label: '¿Tipo de comprobante?',
            type: 'select',
            required: true,
            category: 'evidencias',
            options: [
                { value: 'boleta', label: 'Boleta' },
                { value: 'factura', label: 'Factura' },
                { value: 'ticket', label: 'Ticket' },
                { value: 'sin_documento', label: 'Sin documento' },
            ],
        },
        {
            id: 'numero_documento',
            field: 'evidencias.numero_documento',
            label: '¿Número de comprobante?',
            placeholder: 'Ej: B001-00001234',
            type: 'text',
            required: false,
            category: 'evidencias',
        },
        {
            id: 'foto_documento',
            field: 'evidencias.foto_documento',
            label: '¿Foto del comprobante?',
            type: 'file',
            required: false,
            category: 'evidencias',
            helpText: 'Necesario para rendición de gastos',
        },
        {
            id: 'uso_destino',
            field: 'observaciones',
            label: '¿Para qué cliente/proyecto es?',
            placeholder: 'Uso interno, stock, o cliente específico',
            type: 'text',
            required: false,
            category: 'producto',
        },
    ],
    suggested_tasks: [
        'Realizar compra',
        'Guardar comprobante',
        'Fotografiar documento',
        'Registrar en rendición',
    ],
};

// ============================================
// EXPORTAR CONFIGURACIÓN COMPLETA
// ============================================
export const PKL_QUESTIONS_BY_TYPE: Record<string, PKLQuestionSet> = {
    'solo_cotizacion': COTIZACION_QUESTIONS,
    'produccion': PRODUCCION_QUESTIONS,
    'movilidad': MOVILIDAD_QUESTIONS,
    'produccion_instalacion': PRODUCCION_INSTALACION_QUESTIONS,
    'compra_interna': COMPRA_INTERNA_QUESTIONS,
};

/**
 * Obtiene las preguntas para un tipo de operación específico
 */
export function getQuestionsForType(tipoOperacion: string): PKLQuestionSet | null {
    return PKL_QUESTIONS_BY_TYPE[tipoOperacion] || null;
}

/**
 * Obtiene las preguntas pendientes (sin responder) para un PKL
 */
export function getPendingQuestions(pkl: any, tipoOperacion: string): PKLQuestion[] {
    const questionSet = getQuestionsForType(tipoOperacion);
    if (!questionSet) return [];

    return questionSet.questions.filter(q => {
        if (!q.required) return false;

        // Evaluar si el campo tiene valor
        const value = getNestedValue(pkl, q.field);
        return !value || value === '' || value === null || value === undefined;
    });
}

/**
 * Helper para obtener valor anidado de un objeto
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
        if (current === null || current === undefined) return undefined;
        // Manejar arrays como productos[0]
        const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            const [, arrayKey, index] = arrayMatch;
            return current[arrayKey]?.[parseInt(index)];
        }
        return current[key];
    }, obj);
}

/**
 * Calcula el porcentaje de completitud de un PKL
 */
export function calculateCompleteness(pkl: any, tipoOperacion: string): number {
    const questionSet = getQuestionsForType(tipoOperacion);
    if (!questionSet) return 0;

    const requiredQuestions = questionSet.questions.filter(q => q.required);
    if (requiredQuestions.length === 0) return 100;

    const answeredQuestions = requiredQuestions.filter(q => {
        const value = getNestedValue(pkl, q.field);
        return value && value !== '' && value !== null && value !== undefined;
    });

    return Math.round((answeredQuestions.length / requiredQuestions.length) * 100);
}
