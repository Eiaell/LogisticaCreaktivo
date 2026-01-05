// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Sistema de Memoria y Aprendizaje
// ============================================

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORIAL_FILE = path.join(DATA_DIR, 'historial.json');
const CORRECCIONES_FILE = path.join(DATA_DIR, 'correcciones.json');

// Tipos
export interface EntradaHistorial {
  id: string;
  fecha: string;
  hora: string;
  transcripcion: string;
  extraccion: any;
  tipo: string;
  corregido?: boolean;
}

export interface Correccion {
  id: string;
  fecha: string;
  transcripcionOriginal: string;
  extraccionIncorrecta: any;
  correccionTexto: string;
  aplicada: boolean;
}

// Inicializar archivos si no existen
function initFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(HISTORIAL_FILE)) {
    fs.writeFileSync(HISTORIAL_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(CORRECCIONES_FILE)) {
    fs.writeFileSync(CORRECCIONES_FILE, JSON.stringify([], null, 2));
  }
}

// Generar ID unico
function generarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================
// HISTORIAL
// ============================================

export function guardarEnHistorial(
  transcripcion: string,
  extraccion: any
): string {
  initFiles();

  const historial: EntradaHistorial[] = JSON.parse(
    fs.readFileSync(HISTORIAL_FILE, 'utf-8')
  );

  const ahora = new Date();
  const entrada: EntradaHistorial = {
    id: generarId(),
    fecha: ahora.toISOString().split('T')[0],
    hora: ahora.toTimeString().split(' ')[0],
    transcripcion,
    extraccion,
    tipo: extraccion.tipo || 'otro',
    corregido: false,
  };

  historial.push(entrada);

  // Mantener solo los ultimos 500 registros
  if (historial.length > 500) {
    historial.splice(0, historial.length - 500);
  }

  fs.writeFileSync(HISTORIAL_FILE, JSON.stringify(historial, null, 2));
  console.log('[Memoria] Guardado en historial:', entrada.id);

  return entrada.id;
}

export function obtenerUltimaEntrada(): EntradaHistorial | null {
  initFiles();

  const historial: EntradaHistorial[] = JSON.parse(
    fs.readFileSync(HISTORIAL_FILE, 'utf-8')
  );

  if (historial.length === 0) return null;
  return historial[historial.length - 1];
}

export function marcarComoCorregido(id: string): void {
  initFiles();

  const historial: EntradaHistorial[] = JSON.parse(
    fs.readFileSync(HISTORIAL_FILE, 'utf-8')
  );

  const entrada = historial.find(e => e.id === id);
  if (entrada) {
    entrada.corregido = true;
    fs.writeFileSync(HISTORIAL_FILE, JSON.stringify(historial, null, 2));
  }
}

// ============================================
// CORRECCIONES
// ============================================

export function guardarCorreccion(
  transcripcionOriginal: string,
  extraccionIncorrecta: any,
  correccionTexto: string
): void {
  initFiles();

  const correcciones: Correccion[] = JSON.parse(
    fs.readFileSync(CORRECCIONES_FILE, 'utf-8')
  );

  const correccion: Correccion = {
    id: generarId(),
    fecha: new Date().toISOString(),
    transcripcionOriginal,
    extraccionIncorrecta,
    correccionTexto,
    aplicada: true,
  };

  correcciones.push(correccion);

  // Mantener solo las ultimas 100 correcciones
  if (correcciones.length > 100) {
    correcciones.splice(0, correcciones.length - 100);
  }

  fs.writeFileSync(CORRECCIONES_FILE, JSON.stringify(correcciones, null, 2));
  console.log('[Memoria] Correccion guardada:', correccion.id);
}

export function obtenerCorrecciones(limite: number = 10): Correccion[] {
  initFiles();

  const correcciones: Correccion[] = JSON.parse(
    fs.readFileSync(CORRECCIONES_FILE, 'utf-8')
  );

  // Devolver las mas recientes
  return correcciones.slice(-limite);
}

// ============================================
// GENERAR EJEMPLOS PARA EL PROMPT
// ============================================

export function generarEjemplosDeCorrecciones(): string {
  const correcciones = obtenerCorrecciones(5);

  if (correcciones.length === 0) {
    return '';
  }

  let ejemplos = '\n\nEJEMPLOS DE CORRECCIONES ANTERIORES (aprende de estos):\n';

  for (const c of correcciones) {
    ejemplos += `- Transcripcion: "${c.transcripcionOriginal}"\n`;
    ejemplos += `  Error: ${JSON.stringify(c.extraccionIncorrecta)}\n`;
    ejemplos += `  Correccion: ${c.correccionTexto}\n\n`;
  }

  return ejemplos;
}

// ============================================
// ESTADISTICAS
// ============================================

export function obtenerEstadisticas(): {
  totalProcesados: number;
  totalCorregidos: number;
  porcentajeExito: number;
  tiposMasFrecuentes: Record<string, number>;
} {
  initFiles();

  const historial: EntradaHistorial[] = JSON.parse(
    fs.readFileSync(HISTORIAL_FILE, 'utf-8')
  );

  const totalProcesados = historial.length;
  const totalCorregidos = historial.filter(e => e.corregido).length;
  const porcentajeExito = totalProcesados > 0
    ? Math.round(((totalProcesados - totalCorregidos) / totalProcesados) * 100)
    : 100;

  const tiposMasFrecuentes: Record<string, number> = {};
  for (const e of historial) {
    tiposMasFrecuentes[e.tipo] = (tiposMasFrecuentes[e.tipo] || 0) + 1;
  }

  return {
    totalProcesados,
    totalCorregidos,
    porcentajeExito,
    tiposMasFrecuentes,
  };
}
