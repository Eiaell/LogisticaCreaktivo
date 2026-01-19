/**
 * Script para crear los PKLs de los requerimientos pendientes
 * Run with: node scripts/create-pkls-batch.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

// PKLs a crear basados en los requerimientos del usuario
// Saltando #4 (ya implementado) y usando IDs disponibles (0003, 0004, 0005, 0007+)
const pklsToCreate = [
  // #5: Lanyards 25 unidades - Cotización
  {
    pkl_id: "PKL-2026-0003",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Cliente Pendiente",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Lanyards 25 unidades - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "lanyard",
        cantidad: 25,
        descripcion: "Lanyards personalizados"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización de lanyards 25 unidades"
  },

  // #6: Cajas marcianos TYC - Cotización
  {
    pkl_id: "PKL-2026-0004",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "TYC",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Cajas marcianos - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "caja_tecnopor",
        cantidad: null,
        descripcion: "Cajas marcianos (tecnopor)"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización cajas marcianos para TYC"
  },

  // #7: Cajas madera tipo vino TYC - Cotización
  {
    pkl_id: "PKL-2026-0005",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "TYC",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Cajas madera tipo vino - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "caja_madera",
        cantidad: null,
        descripcion: "Cajas madera tipo vino"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización cajas madera tipo vino para TYC"
  },

  // #8: Bolsas tocuyo 300 unidades - Cotización
  {
    pkl_id: "PKL-2026-0007",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Cliente Pendiente",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Bolsas tocuyo 300 unidades - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "bolsa_tocuyo",
        cantidad: 300,
        descripcion: "Bolsas de tocuyo"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización bolsas tocuyo 300 unidades"
  },

  // #9: Set publicitario stock 150 - Cotización
  {
    pkl_id: "PKL-2026-0008",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Cliente Pendiente",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Set publicitario stock 150 unidades - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "set_publicitario",
        cantidad: 150,
        descripcion: "Set publicitario para stock"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización set publicitario 150 unidades para stock"
  },

  // #10: Dado de tela Inmobiliaria Val - Cotización
  {
    pkl_id: "PKL-2026-0009",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Inmobiliaria Val",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Dado de tela - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "dado_tela",
        cantidad: null,
        descripcion: "Dado de tela promocional"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización dado de tela para Inmobiliaria Val"
  },

  // #11: Stretch film - Compra interna
  {
    pkl_id: "PKL-2026-0010",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "compra_interna",
    area: "logistica",
    cliente: {
      nombre: "Interno",
      proyecto: null,
      contacto: null,
      direccion_entrega: "Oficina",
      ejecutiva_asignada: null
    },
    origen: {
      canal: "interno",
      solicitado_por: "Huber",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Stretch film - compra de insumo interno"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "insumo",
        cantidad: null,
        descripcion: "Stretch film"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Compra de stretch film para uso interno"
  },

  // #12: Envío a producción - Producción
  {
    pkl_id: "PKL-2026-0011",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "produccion",
    area: "logistica",
    cliente: {
      nombre: "Cliente Pendiente",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Envío a producción"
    },
    productos: [],
    inputs: {},
    proveedores: [],
    estado_actual: "en_produccion",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" },
      { estado: "en_produccion", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Envío a producción"
  },

  // #13: Entrega prueba color Grupo Lar - Movilidad
  {
    pkl_id: "PKL-2026-0012",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "movilidad",
    area: "logistica",
    cliente: {
      nombre: "Grupo Lar",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Entrega prueba de color a Grupo Lar"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "muestra",
        cantidad: 1,
        descripcion: "Prueba de color"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Entrega de prueba de color a Grupo Lar"
  },

  // #14: Recojo/traslado Grupo Lar - Movilidad
  {
    pkl_id: "PKL-2026-0013",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "movilidad",
    area: "logistica",
    cliente: {
      nombre: "Grupo Lar",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Recojo y traslado para Grupo Lar"
    },
    productos: [],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Recojo y traslado para Grupo Lar"
  },

  // #15: Cotización libretas - Cotización
  {
    pkl_id: "PKL-2026-0014",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Cliente Pendiente",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Cotización de libretas"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "libreta",
        cantidad: null,
        descripcion: "Libretas personalizadas"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización de libretas"
  },

  // #16: Cajas feria navideña Grupo Lar - Cotización
  {
    pkl_id: "PKL-2026-0015",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Grupo Lar",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Cajas para feria navideña - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "caja",
        cantidad: null,
        descripcion: "Cajas para feria navideña"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización cajas feria navideña para Grupo Lar"
  },

  // #17: Cotización impresión editorial - Cotización
  {
    pkl_id: "PKL-2026-0016",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Cliente Pendiente",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Cotización impresión editorial"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "impresion_editorial",
        cantidad: null,
        descripcion: "Impresión editorial"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización impresión editorial"
  },

  // #18: Cajas cartón Grupo Lar - Cotización
  {
    pkl_id: "PKL-2026-0017",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Grupo Lar",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Cajas de cartón - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "caja_carton",
        cantidad: null,
        descripcion: "Cajas de cartón"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización cajas de cartón para Grupo Lar"
  },

  // #19: Roll screen + recojo Grupo Lar - Cotización/Movilidad
  {
    pkl_id: "PKL-2026-0018",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "produccion",
    area: "logistica",
    cliente: {
      nombre: "Grupo Lar",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Roll screen + recojo"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "roll_screen",
        cantidad: 1,
        descripcion: "Roll screen"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Roll screen + recojo para Grupo Lar"
  },

  // #20: Entrega muestra lanyard Lien - Movilidad
  {
    pkl_id: "PKL-2026-0019",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "movilidad",
    area: "logistica",
    cliente: {
      nombre: "Lien",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Entrega muestra de lanyard a Lien"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "muestra",
        cantidad: 1,
        descripcion: "Muestra de lanyard"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Entrega de muestra de lanyard a Lien"
  },

  // #21: Bolsas 3000 unidades - Cotización
  {
    pkl_id: "PKL-2026-0020",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "solo_cotizacion",
    area: "logistica",
    cliente: {
      nombre: "Cliente Pendiente",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Bolsas 3000 unidades - cotización"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "bolsa",
        cantidad: 3000,
        descripcion: "Bolsas"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "recibido",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Cotización bolsas 3000 unidades"
  },

  // #22: Producción lanyards Lien - Producción
  {
    pkl_id: "PKL-2026-0021",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "produccion",
    area: "logistica",
    cliente: {
      nombre: "Lien",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Producción de lanyards para Lien"
    },
    productos: [
      {
        producto_id: "PROD-001",
        tipo: "lanyard",
        cantidad: null,
        descripcion: "Lanyards"
      }
    ],
    inputs: {},
    proveedores: [],
    estado_actual: "en_produccion",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" },
      { estado: "en_produccion", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Producción de lanyards para Lien"
  },

  // #23: Producción Teleperformance + cotizaciones
  {
    pkl_id: "PKL-2026-0022",
    version: "2.0",
    created_at: "2026-01-18",
    updated_at: "2026-01-18",
    tipo_operacion: "produccion",
    area: "logistica",
    cliente: {
      nombre: "Teleperformance",
      proyecto: null,
      contacto: null,
      direccion_entrega: null,
      ejecutiva_asignada: "Angelica"
    },
    origen: {
      canal: "whatsapp",
      solicitado_por: "Angelica",
      fecha_solicitud: "2026-01-18",
      descripcion_inicial: "Producción + cotizaciones para Teleperformance"
    },
    productos: [],
    inputs: {},
    proveedores: [],
    estado_actual: "en_produccion",
    estado_historial: [
      { estado: "recibido", fecha: "2026-01-18" },
      { estado: "en_produccion", fecha: "2026-01-18" }
    ],
    eventos_externos: [],
    costos: { detalle: [], total: 0, moneda: "PEN" },
    cierre: { estado_final: null, fecha_cierre: null, evidencias: [] },
    alertas: { dias_sin_actividad: 0, umbral_pausa_dias: 7 },
    riesgos_identificados: [],
    observaciones: "Producción y cotizaciones para Teleperformance"
  }
];

async function createPKLs() {
  console.log(`Creando ${pklsToCreate.length} PKLs en Supabase...`);

  let successCount = 0;
  let errorCount = 0;

  for (const pkl of pklsToCreate) {
    try {
      const { error } = await supabase
        .from('pkls')
        .upsert(pkl, { onConflict: 'pkl_id' });

      if (error) {
        console.error(`✗ Error en PKL ${pkl.pkl_id}:`, error.message);
        errorCount++;
      } else {
        console.log(`✓ PKL ${pkl.pkl_id} creado - ${pkl.origen.descripcion_inicial}`);
        successCount++;
      }
    } catch (err) {
      console.error(`✗ Error en PKL ${pkl.pkl_id}:`, err);
      errorCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Resumen: ${successCount} PKLs creados, ${errorCount} errores`);
  console.log(`========================================`);
}

createPKLs();
