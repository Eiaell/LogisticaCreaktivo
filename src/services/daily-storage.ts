// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Daily Storage Service - Un archivo por día
// ============================================

import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from '../config/constants';

// Estructura del registro diario
export interface RegistroDiario {
  fecha: string;
  acuerdos: AcuerdoDia[];
  movilidad: MovimientoDia[];
  gastos: GastoDia[];
  notas: NotaDia[];
}

export interface AcuerdoDia {
  hora: string;
  proveedor: string;
  producto: string;
  cantidad: number;
  especificaciones?: string;
  adelanto?: number;
  costoTotal?: number;
  fechaEntrega?: string;
  cliente?: string;
  vendedora?: string;
  transcripcion: string;
}

export interface MovimientoDia {
  hora: string;
  origen: string;
  destino: string;
  costo: number;
  tipoTransporte: string;
  proposito: string;
  transcripcion: string;
}

export interface GastoDia {
  hora: string;
  tipo: string;
  monto: number;
  descripcion: string;
  aprobadoPor?: string;
  transcripcion: string;
}

export interface NotaDia {
  hora: string;
  contenido: string;
  transcripcion: string;
}

// ============================================
// UTILIDADES
// ============================================

function getFechaHoy(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getHoraActual(): string {
  const now = new Date();
  return now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function getArchivoDelDia(fecha?: string): string {
  const f = fecha || getFechaHoy();
  return path.join(DATA_DIR, `${f}.json`);
}

// ============================================
// LECTURA/ESCRITURA
// ============================================

export async function getRegistroDia(fecha?: string): Promise<RegistroDiario> {
  const archivo = getArchivoDelDia(fecha);
  const f = fecha || getFechaHoy();

  try {
    const contenido = await fs.readFile(archivo, 'utf-8');
    return JSON.parse(contenido);
  } catch {
    // Si no existe, crear uno nuevo
    return {
      fecha: f,
      acuerdos: [],
      movilidad: [],
      gastos: [],
      notas: [],
    };
  }
}

async function guardarRegistroDia(registro: RegistroDiario): Promise<void> {
  const archivo = getArchivoDelDia(registro.fecha);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(archivo, JSON.stringify(registro, null, 2), 'utf-8');
}

// ============================================
// AGREGAR REGISTROS
// ============================================

export async function agregarAcuerdo(acuerdo: Omit<AcuerdoDia, 'hora'>): Promise<AcuerdoDia> {
  const registro = await getRegistroDia();
  const nuevoAcuerdo: AcuerdoDia = {
    hora: getHoraActual(),
    ...acuerdo,
  };
  registro.acuerdos.push(nuevoAcuerdo);
  await guardarRegistroDia(registro);
  console.log(`[Storage] Acuerdo guardado en ${registro.fecha}.json`);
  return nuevoAcuerdo;
}

export async function agregarMovimiento(movimiento: Omit<MovimientoDia, 'hora'>): Promise<MovimientoDia> {
  const registro = await getRegistroDia();
  const nuevoMovimiento: MovimientoDia = {
    hora: getHoraActual(),
    ...movimiento,
  };
  registro.movilidad.push(nuevoMovimiento);
  await guardarRegistroDia(registro);
  console.log(`[Storage] Movimiento guardado en ${registro.fecha}.json`);
  return nuevoMovimiento;
}

export async function agregarGasto(gasto: Omit<GastoDia, 'hora'>): Promise<GastoDia> {
  const registro = await getRegistroDia();
  const nuevoGasto: GastoDia = {
    hora: getHoraActual(),
    ...gasto,
  };
  registro.gastos.push(nuevoGasto);
  await guardarRegistroDia(registro);
  console.log(`[Storage] Gasto guardado en ${registro.fecha}.json`);
  return nuevoGasto;
}

export async function agregarNota(nota: Omit<NotaDia, 'hora'>): Promise<NotaDia> {
  const registro = await getRegistroDia();
  const nuevaNota: NotaDia = {
    hora: getHoraActual(),
    ...nota,
  };
  registro.notas.push(nuevaNota);
  await guardarRegistroDia(registro);
  console.log(`[Storage] Nota guardada en ${registro.fecha}.json`);
  return nuevaNota;
}

// ============================================
// CONSULTAS
// ============================================

export async function getResumenDia(fecha?: string): Promise<{
  acuerdos: number;
  movimientos: number;
  gastos: number;
  totalGastos: number;
}> {
  const registro = await getRegistroDia(fecha);
  return {
    acuerdos: registro.acuerdos.length,
    movimientos: registro.movilidad.length,
    gastos: registro.gastos.length,
    totalGastos: registro.gastos.reduce((sum, g) => sum + g.monto, 0),
  };
}

export async function getUltimoMovimiento(fecha?: string): Promise<MovimientoDia | undefined> {
  const registro = await getRegistroDia(fecha);
  return registro.movilidad[registro.movilidad.length - 1];
}

// ============================================
// EXPORTAR A TEXTO PLANO (para Drive)
// ============================================

export async function exportarDiaComoTexto(fecha?: string): Promise<string> {
  const registro = await getRegistroDia(fecha);

  let texto = `REGISTRO LOGÍSTICO - ${formatearFecha(registro.fecha)}\n`;
  texto += '='.repeat(50) + '\n\n';

  // Acuerdos
  if (registro.acuerdos.length > 0) {
    texto += 'ACUERDOS CON PROVEEDORES:\n';
    texto += '-'.repeat(30) + '\n';
    for (const a of registro.acuerdos) {
      texto += `[${a.hora}] ${a.cantidad} ${a.producto} - ${a.proveedor}\n`;
      if (a.especificaciones) texto += `   Especificaciones: ${a.especificaciones}\n`;
      if (a.adelanto) texto += `   Adelanto: S/. ${a.adelanto}\n`;
      if (a.costoTotal) texto += `   Costo total: S/. ${a.costoTotal}\n`;
      if (a.fechaEntrega) texto += `   Entrega: ${a.fechaEntrega}\n`;
      if (a.cliente) texto += `   Cliente: ${a.cliente}\n`;
      texto += `   Original: "${a.transcripcion}"\n\n`;
    }
  }

  // Movilidad
  if (registro.movilidad.length > 0) {
    texto += '\nMOVILIDAD:\n';
    texto += '-'.repeat(30) + '\n';
    let totalMovilidad = 0;
    for (const m of registro.movilidad) {
      texto += `[${m.hora}] ${m.origen} → ${m.destino}\n`;
      texto += `   S/. ${m.costo} (${m.tipoTransporte}) - ${m.proposito}\n`;
      totalMovilidad += m.costo;
    }
    texto += `\nTOTAL MOVILIDAD: S/. ${totalMovilidad.toFixed(2)}\n`;
  }

  // Gastos
  if (registro.gastos.length > 0) {
    texto += '\nGASTOS EXTRAORDINARIOS:\n';
    texto += '-'.repeat(30) + '\n';
    let totalGastos = 0;
    for (const g of registro.gastos) {
      texto += `[${g.hora}] ${g.tipo}: S/. ${g.monto}\n`;
      texto += `   ${g.descripcion}\n`;
      if (g.aprobadoPor) texto += `   Aprobado por: ${g.aprobadoPor}\n`;
      totalGastos += g.monto;
    }
    texto += `\nTOTAL GASTOS: S/. ${totalGastos.toFixed(2)}\n`;
  }

  // Notas
  if (registro.notas.length > 0) {
    texto += '\nNOTAS:\n';
    texto += '-'.repeat(30) + '\n';
    for (const n of registro.notas) {
      texto += `[${n.hora}] ${n.contenido}\n`;
    }
  }

  if (registro.acuerdos.length === 0 && registro.movilidad.length === 0 &&
      registro.gastos.length === 0 && registro.notas.length === 0) {
    texto += 'No hay registros para este día.\n';
  }

  return texto;
}

function formatearFecha(fechaISO: string): string {
  const [year, month, day] = fechaISO.split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dias[fecha.getDay()]} ${day} de ${meses[month - 1]} de ${year}`;
}

// ============================================
// LISTAR ARCHIVOS DISPONIBLES
// ============================================

export async function listarDiasRegistrados(): Promise<string[]> {
  try {
    const archivos = await fs.readdir(DATA_DIR);
    return archivos
      .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
