// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Data Models & Types
// ============================================

// Vendedora types
export type Vendedora = 'Angélica' | 'Johana' | 'Natalia';

// Estado de pedido
export type EstadoPedido =
  | 'cotizacion'      // Esperando aprobación del cliente
  | 'aprobado'        // Cliente confirmó, listo para producción
  | 'en_produccion'   // Con el proveedor
  | 'listo_recoger'   // Proveedor avisó que terminó
  | 'en_campo'        // Flaco salió a recoger/entregar
  | 'entregado'       // Cliente recibió
  | 'cerrado';        // RQ completo

// Tipo de transporte
export type TipoTransporte = 'metro' | 'combi' | 'taxi' | 'carro_propio';

// Tipo de gasto extraordinario
export type TipoGasto = 'motorizado' | 'taxi' | 'material' | 'otro';

// Estado de acuerdo de producción
export type EstadoAcuerdo = 'pendiente' | 'listo' | 'recogido' | 'problema';

// ============================================
// ENTIDAD: PEDIDO (Unidad Central)
// ============================================
export interface Pedido {
  id: string;
  cliente: string;
  vendedora: Vendedora;
  descripcion: string;
  estado: EstadoPedido;
  fechaCompromiso?: Date;
  rqNumero?: string;
  createdAt: Date;
  updatedAt: Date;
  notas: string[];
}

// ============================================
// ENTIDAD: PROVEEDOR
// ============================================
export interface HistorialPrecio {
  fecha: Date;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
}

export interface HistorialTiempo {
  fecha: Date;
  producto: string;
  diasPrometidos: number;
  diasReales: number;
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  especialidad: string[];
  condicionesPago?: string;
  factorDemora: number;
  historialPrecios: HistorialPrecio[];
  historialTiempos: HistorialTiempo[];
  notas: string[];
}

// ============================================
// ENTIDAD: ACUERDO_PRODUCCION
// ============================================
export interface AcuerdoProduccion {
  id: string;
  pedidoId?: string;
  proveedorId: string;
  proveedorNombre: string;
  producto: string;
  cantidad: number;
  especificaciones?: string;
  costoTotal: number;
  adelanto: number;
  porcentajeAdelanto: number;
  fechaAcuerdo: Date;
  fechaPrometida: Date;
  fechaRealEntrega?: Date;
  estado: EstadoAcuerdo;
  audioOriginal?: string;
  cliente?: string;
}

// ============================================
// ENTIDAD: MOVIMIENTO_MOVILIDAD
// ============================================
export interface MovimientoMovilidad {
  id: string;
  fecha: Date;
  origen: string;
  destino: string;
  costo: number;
  tipoTransporte: TipoTransporte;
  proposito: string;
  pedidoId?: string;
  requiereAprobacion: boolean;
  aprobadoPor?: string;
}

// ============================================
// ENTIDAD: GASTO_EXTRAORDINARIO
// ============================================
export interface GastoExtraordinario {
  id: string;
  fecha: Date;
  tipo: TipoGasto;
  monto: number;
  descripcion: string;
  pedidoId?: string;
  aprobadoPor?: string;
  reembolsado: boolean;
  fechaReembolso?: Date;
}

// ============================================
// CONFIGURACIÓN: MATRIZ DE COSTOS
// ============================================
export interface RutaCosto {
  origen: string;
  destino: string;
  costoCombi: number;
  tiempoEstimado: number;
  tiempoHoraPunta: number;
}

export interface MatrizCostos {
  rutas: RutaCosto[];
}

// ============================================
// TIPOS PARA EXTRACCIÓN DE ENTIDADES (Nuevo Sistema)
// ============================================
export type TipoExtraccion =
  | 'solicitud_cotizacion'
  | 'recepcion_cotizacion'
  | 'orden_produccion'
  | 'registro_movilidad'
  | 'otro';

// Producto en solicitud de cotización
export interface ProductoCotizacion {
  descripcion: string | null;
  cantidad: number | null;
  dimensiones: string | null;
  observaciones: string | null;
}

// Tramo de movilidad
export interface TramoMovilidad {
  origen: string | null;
  destino: string | null;
  medio_transporte: string | null;
  costo: number | null;
}

// Condiciones de pago
export interface CondicionesPago {
  adelanto: number | null;
  porcentaje_adelanto: number | null;
  saldo: number | null;
  forma_pago: string | null;
}

// 1. SOLICITUD DE COTIZACIÓN
export interface ExtraccionSolicitudCotizacion {
  tipo: 'solicitud_cotizacion';
  tipo_solicitud: 'solicitud_cotizacion';
  cliente: string | null;
  solicitado_por: string | null;
  productos: ProductoCotizacion[];
  fecha_solicitud: string | null;
}

// 2. RECEPCIÓN DE COTIZACIÓN
export interface ExtraccionRecepcionCotizacion {
  tipo: 'recepcion_cotizacion';
  tipo_solicitud: 'recepcion_cotizacion';
  cliente: string | null;
  proveedor: string | null;
  producto: string | null;
  precio_unitario: number | null;
  precio_total: number | null;
  incluye_igv: boolean | null;
  validez_cotizacion: string | null;
  fecha_recepcion: string | null;
}

// 3. ORDEN DE PRODUCCIÓN
export interface ExtraccionOrdenProduccion {
  tipo: 'orden_produccion';
  tipo_solicitud: 'orden_produccion';
  cliente: string | null;
  proveedor: string | null;
  producto: string | null;
  precio_total: number | null;
  incluye_igv: boolean | null;
  condiciones_pago: CondicionesPago;
  fecha_orden: string | null;
}

// 4. REGISTRO DE MOVILIDAD
export interface ExtraccionRegistroMovilidad {
  tipo: 'registro_movilidad';
  tipo_solicitud: 'registro_movilidad';
  fecha: string | null;
  motivo: string | null;
  cliente: string | null;
  tramos: TramoMovilidad[];
  costo_total: number | null;
}

// 5. OTRO (no clasificado)
export interface ExtraccionOtro {
  tipo: 'otro';
  tipo_solicitud: 'otro';
  mensaje: string;
  transcripcion_original?: string;
}

export type ResultadoExtraccion =
  | ExtraccionSolicitudCotizacion
  | ExtraccionRecepcionCotizacion
  | ExtraccionOrdenProduccion
  | ExtraccionRegistroMovilidad
  | ExtraccionOtro;

// ============================================
// TIPOS LEGACY (mantenidos para compatibilidad)
// ============================================
export interface ExtraccionAcuerdo {
  tipo: 'acuerdo_produccion';
  proveedor: string;
  producto: string;
  cantidad: number;
  especificaciones?: string;
  adelanto?: number;
  porcentajeAdelanto?: number;
  costoTotal?: number;
  fechaEntrega?: string;
  cliente?: string;
}

export interface ExtraccionConsulta {
  tipo: 'consulta';
  subtipo: 'historial_precios' | 'historial_tiempos' | 'proveedor' | 'pedido' | 'general';
  proveedor?: string;
  producto?: string;
  cliente?: string;
  pregunta: string;
}

export interface ExtraccionMovilidad {
  tipo: 'movimiento_movilidad';
  origen?: string;
  destino: string;
  costo: number;
  tipoTransporte: TipoTransporte;
  proposito: string;
  pedidoRelacionado?: string;
}

export interface ExtraccionCambioEstado {
  tipo: 'cambio_estado';
  entidad: 'pedido' | 'acuerdo';
  identificador: string;
  nuevoEstado: string;
  notas?: string;
}

export interface ExtraccionGasto {
  tipo: 'registro_gasto';
  tipoGasto: TipoGasto;
  monto: number;
  descripcion: string;
  aprobadoPor?: string;
  pedidoRelacionado?: string;
}

export interface ExtraccionPendientes {
  tipo: 'pendientes';
  fecha?: string;
}

export interface ExtraccionReporte {
  tipo: 'reporte';
  tipoReporte: 'movilidad' | 'gastos' | 'produccion';
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ItemExtraido {
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface PersonaExtraida {
  nombre: string;
  rol: string;
}

export interface MontoExtraido {
  valor: number;
  concepto: string;
}

export interface ExtraccionCompleta {
  resultado: ResultadoExtraccion;
  confianza: number;
  camposFaltantes: string[];
  transcripcionOriginal: string;
}

// ============================================
// TIPOS PARA ALMACENAMIENTO
// ============================================
export interface DatabaseState {
  pedidos: Pedido[];
  proveedores: Proveedor[];
  acuerdos: AcuerdoProduccion[];
  movilidad: MovimientoMovilidad[];
  gastos: GastoExtraordinario[];
  lastUpdated: Date;
}
