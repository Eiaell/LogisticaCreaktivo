// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Nuevo Sistema de Storage para Extracciones
// ============================================

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DATA_DIR } from '../config/constants';
import {
  ExtraccionSolicitudCotizacion,
  ExtraccionRecepcionCotizacion,
  ExtraccionOrdenProduccion,
  ExtraccionRegistroMovilidad,
  ExtraccionOtro,
} from '../models/types';

// Archivos de storage
const LOGISTICS_FILES = {
  cotizacionesSolicitadas: path.join(DATA_DIR, 'cotizaciones_solicitadas.json'),
  cotizacionesRecibidas: path.join(DATA_DIR, 'cotizaciones_recibidas.json'),
  ordenesProduccion: path.join(DATA_DIR, 'ordenes_produccion.json'),
  movilidad: path.join(DATA_DIR, 'registros_movilidad.json'),
  otros: path.join(DATA_DIR, 'mensajes_otros.json'),
};

// Tipos con metadatos
interface RegistroBase {
  id: string;
  timestamp: string;
  transcripcion_original: string;
}

export type SolicitudCotizacionRegistro = ExtraccionSolicitudCotizacion & RegistroBase;
export type RecepcionCotizacionRegistro = ExtraccionRecepcionCotizacion & RegistroBase;
export type OrdenProduccionRegistro = ExtraccionOrdenProduccion & RegistroBase;
export type RegistroMovilidadRegistro = ExtraccionRegistroMovilidad & RegistroBase;
export type OtroRegistro = ExtraccionOtro & RegistroBase;

// ============================================
// INICIALIZACIÓN
// ============================================

export async function initializeLogisticsStorage(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  for (const [key, filePath] of Object.entries(LOGISTICS_FILES)) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify([], null, 2), 'utf-8');
      console.log(`[LogisticsStorage] Initialized ${key}.json`);
    }
  }
}

// ============================================
// HELPERS GENÉRICOS
// ============================================

async function readJSON<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeJSON<T>(filePath: string, data: T[]): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function appendRecord<T extends RegistroBase>(filePath: string, record: T): Promise<T> {
  const records = await readJSON<T>(filePath);
  records.push(record);
  await writeJSON(filePath, records);
  return record;
}

// ============================================
// SOLICITUDES DE COTIZACIÓN
// ============================================

export async function guardarSolicitudCotizacion(
  data: ExtraccionSolicitudCotizacion,
  transcripcion: string
): Promise<SolicitudCotizacionRegistro> {
  const registro: SolicitudCotizacionRegistro = {
    ...data,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    transcripcion_original: transcripcion,
  };
  return appendRecord(LOGISTICS_FILES.cotizacionesSolicitadas, registro);
}

export async function getSolicitudesCotizacion(): Promise<SolicitudCotizacionRegistro[]> {
  return readJSON<SolicitudCotizacionRegistro>(LOGISTICS_FILES.cotizacionesSolicitadas);
}

export async function getSolicitudesCotizacionHoy(): Promise<SolicitudCotizacionRegistro[]> {
  const todas = await getSolicitudesCotizacion();
  const hoy = new Date().toISOString().split('T')[0];
  return todas.filter(s => s.timestamp.startsWith(hoy));
}

// ============================================
// COTIZACIONES RECIBIDAS
// ============================================

export async function guardarRecepcionCotizacion(
  data: ExtraccionRecepcionCotizacion,
  transcripcion: string
): Promise<RecepcionCotizacionRegistro> {
  const registro: RecepcionCotizacionRegistro = {
    ...data,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    transcripcion_original: transcripcion,
  };
  return appendRecord(LOGISTICS_FILES.cotizacionesRecibidas, registro);
}

export async function getCotizacionesRecibidas(): Promise<RecepcionCotizacionRegistro[]> {
  return readJSON<RecepcionCotizacionRegistro>(LOGISTICS_FILES.cotizacionesRecibidas);
}

export async function getCotizacionesRecibidasHoy(): Promise<RecepcionCotizacionRegistro[]> {
  const todas = await getCotizacionesRecibidas();
  const hoy = new Date().toISOString().split('T')[0];
  return todas.filter(c => c.timestamp.startsWith(hoy));
}

// ============================================
// ÓRDENES DE PRODUCCIÓN
// ============================================

export async function guardarOrdenProduccion(
  data: ExtraccionOrdenProduccion,
  transcripcion: string
): Promise<OrdenProduccionRegistro> {
  const registro: OrdenProduccionRegistro = {
    ...data,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    transcripcion_original: transcripcion,
  };
  return appendRecord(LOGISTICS_FILES.ordenesProduccion, registro);
}

export async function getOrdenesProduccion(): Promise<OrdenProduccionRegistro[]> {
  return readJSON<OrdenProduccionRegistro>(LOGISTICS_FILES.ordenesProduccion);
}

export async function getOrdenesProduccionHoy(): Promise<OrdenProduccionRegistro[]> {
  const todas = await getOrdenesProduccion();
  const hoy = new Date().toISOString().split('T')[0];
  return todas.filter(o => o.timestamp.startsWith(hoy));
}

// ============================================
// REGISTROS DE MOVILIDAD
// ============================================

export async function guardarRegistroMovilidad(
  data: ExtraccionRegistroMovilidad,
  transcripcion: string
): Promise<RegistroMovilidadRegistro> {
  const registro: RegistroMovilidadRegistro = {
    ...data,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    transcripcion_original: transcripcion,
  };
  return appendRecord(LOGISTICS_FILES.movilidad, registro);
}

export async function getRegistrosMovilidad(): Promise<RegistroMovilidadRegistro[]> {
  return readJSON<RegistroMovilidadRegistro>(LOGISTICS_FILES.movilidad);
}

export async function getRegistrosMovilidadHoy(): Promise<RegistroMovilidadRegistro[]> {
  const todos = await getRegistrosMovilidad();
  const hoy = new Date().toISOString().split('T')[0];
  return todos.filter(r => r.timestamp.startsWith(hoy));
}

// ============================================
// MENSAJES NO CLASIFICADOS (OTRO)
// ============================================

export async function guardarMensajeOtro(
  data: ExtraccionOtro,
  transcripcion: string
): Promise<OtroRegistro> {
  const registro: OtroRegistro = {
    ...data,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    transcripcion_original: transcripcion,
  };
  return appendRecord(LOGISTICS_FILES.otros, registro);
}

export async function getMensajesOtros(): Promise<OtroRegistro[]> {
  return readJSON<OtroRegistro>(LOGISTICS_FILES.otros);
}

// ============================================
// RESUMEN DEL DÍA
// ============================================

export async function getResumenLogisticaHoy(): Promise<{
  solicitudes_cotizacion: number;
  cotizaciones_recibidas: number;
  ordenes_produccion: number;
  registros_movilidad: number;
  otros: number;
}> {
  const [solicitudes, cotizaciones, ordenes, movilidad, otros] = await Promise.all([
    getSolicitudesCotizacionHoy(),
    getCotizacionesRecibidasHoy(),
    getOrdenesProduccionHoy(),
    getRegistrosMovilidadHoy(),
    getMensajesOtros(),
  ]);

  const hoy = new Date().toISOString().split('T')[0];
  const otrosHoy = otros.filter(o => o.timestamp.startsWith(hoy));

  return {
    solicitudes_cotizacion: solicitudes.length,
    cotizaciones_recibidas: cotizaciones.length,
    ordenes_produccion: ordenes.length,
    registros_movilidad: movilidad.length,
    otros: otrosHoy.length,
  };
}
