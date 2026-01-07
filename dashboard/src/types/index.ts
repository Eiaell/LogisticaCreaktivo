// Database types for the logistics system

export interface Payment {
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
    estado: string;
    fecha_compromiso?: string;
    rq_numero?: string | null;
    created_at: string;
    updated_at: string;
    precio?: number;
    pagado?: number;
    adelanto?: number; // Legacy support
}

export interface Proveedor {
    id: string;
    nombre: string;
    contacto?: string | null;
    telefono?: string;
    direccion?: string;
    notas?: string;
    especialidad: string;
    condiciones_pago?: string | null;
    factor_demora: number;
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
}
