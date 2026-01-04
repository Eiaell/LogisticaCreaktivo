// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Local JSON Storage Service
// ============================================

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Pedido,
  Proveedor,
  AcuerdoProduccion,
  MovimientoMovilidad,
  GastoExtraordinario,
  MatrizCostos,
  DatabaseState,
} from '../models/types';
import { DATA_DIR, DB_FILES, RUTAS_FRECUENTES, PROVEEDORES_INICIALES } from '../config/constants';

// ============================================
// INITIALIZATION
// ============================================

export async function initializeStorage(): Promise<void> {
  // Create data directory if not exists
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(DATA_DIR, 'audios'), { recursive: true });

  // Initialize empty JSON files if they don't exist
  const initialData: Record<string, unknown> = {
    pedidos: [],
    proveedores: PROVEEDORES_INICIALES.map(p => ({
      id: uuidv4(),
      ...p,
      historialPrecios: [],
      historialTiempos: [],
      notas: [],
    })),
    acuerdos: [],
    movilidad: [],
    gastos: [],
    matrizCostos: { rutas: RUTAS_FRECUENTES },
  };

  for (const [key, filePath] of Object.entries(DB_FILES)) {
    try {
      await fs.access(filePath);
    } catch {
      const data = initialData[key as keyof typeof initialData] || [];
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[Storage] Initialized ${key}.json`);
    }
  }
}

// ============================================
// GENERIC READ/WRITE
// ============================================

async function readJSON<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================
// PEDIDOS
// ============================================

export async function getPedidos(): Promise<Pedido[]> {
  return readJSON<Pedido[]>(DB_FILES.pedidos);
}

export async function getPedidoById(id: string): Promise<Pedido | undefined> {
  const pedidos = await getPedidos();
  return pedidos.find(p => p.id === id);
}

export async function getPedidosByCliente(cliente: string): Promise<Pedido[]> {
  const pedidos = await getPedidos();
  return pedidos.filter(p =>
    p.cliente.toLowerCase().includes(cliente.toLowerCase())
  );
}

export async function createPedido(data: Omit<Pedido, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pedido> {
  const pedidos = await getPedidos();
  const newPedido: Pedido = {
    id: uuidv4(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  pedidos.push(newPedido);
  await writeJSON(DB_FILES.pedidos, pedidos);
  return newPedido;
}

export async function updatePedido(id: string, updates: Partial<Pedido>): Promise<Pedido | null> {
  const pedidos = await getPedidos();
  const index = pedidos.findIndex(p => p.id === id);
  if (index === -1) return null;

  pedidos[index] = {
    ...pedidos[index],
    ...updates,
    updatedAt: new Date(),
  };
  await writeJSON(DB_FILES.pedidos, pedidos);
  return pedidos[index];
}

// ============================================
// PROVEEDORES
// ============================================

export async function getProveedores(): Promise<Proveedor[]> {
  return readJSON<Proveedor[]>(DB_FILES.proveedores);
}

export async function getProveedorById(id: string): Promise<Proveedor | undefined> {
  const proveedores = await getProveedores();
  return proveedores.find(p => p.id === id);
}

export async function getProveedorByNombre(nombre: string): Promise<Proveedor | undefined> {
  const proveedores = await getProveedores();
  return proveedores.find(p =>
    p.nombre.toLowerCase() === nombre.toLowerCase()
  );
}

export async function createProveedor(data: Omit<Proveedor, 'id'>): Promise<Proveedor> {
  const proveedores = await getProveedores();
  const newProveedor: Proveedor = {
    id: uuidv4(),
    ...data,
  };
  proveedores.push(newProveedor);
  await writeJSON(DB_FILES.proveedores, proveedores);
  return newProveedor;
}

export async function updateProveedor(id: string, updates: Partial<Proveedor>): Promise<Proveedor | null> {
  const proveedores = await getProveedores();
  const index = proveedores.findIndex(p => p.id === id);
  if (index === -1) return null;

  proveedores[index] = {
    ...proveedores[index],
    ...updates,
  };
  await writeJSON(DB_FILES.proveedores, proveedores);
  return proveedores[index];
}

export async function addPrecioHistorial(
  proveedorId: string,
  precio: { producto: string; cantidad: number; precioUnitario: number; precioTotal: number }
): Promise<void> {
  const proveedores = await getProveedores();
  const index = proveedores.findIndex(p => p.id === proveedorId);
  if (index === -1) return;

  proveedores[index].historialPrecios.push({
    fecha: new Date(),
    ...precio,
  });
  await writeJSON(DB_FILES.proveedores, proveedores);
}

// ============================================
// ACUERDOS DE PRODUCCIÓN
// ============================================

export async function getAcuerdos(): Promise<AcuerdoProduccion[]> {
  return readJSON<AcuerdoProduccion[]>(DB_FILES.acuerdos);
}

export async function getAcuerdoById(id: string): Promise<AcuerdoProduccion | undefined> {
  const acuerdos = await getAcuerdos();
  return acuerdos.find(a => a.id === id);
}

export async function getAcuerdosPendientes(): Promise<AcuerdoProduccion[]> {
  const acuerdos = await getAcuerdos();
  return acuerdos.filter(a => a.estado === 'pendiente' || a.estado === 'listo');
}

export async function getAcuerdosParaHoy(): Promise<AcuerdoProduccion[]> {
  const acuerdos = await getAcuerdos();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return acuerdos.filter(a => {
    const fechaPrometida = new Date(a.fechaPrometida);
    fechaPrometida.setHours(0, 0, 0, 0);
    return fechaPrometida.getTime() === hoy.getTime() && a.estado !== 'recogido';
  });
}

export async function createAcuerdo(data: Omit<AcuerdoProduccion, 'id'>): Promise<AcuerdoProduccion> {
  const acuerdos = await getAcuerdos();
  const newAcuerdo: AcuerdoProduccion = {
    id: uuidv4(),
    ...data,
  };
  acuerdos.push(newAcuerdo);
  await writeJSON(DB_FILES.acuerdos, acuerdos);
  return newAcuerdo;
}

export async function updateAcuerdo(id: string, updates: Partial<AcuerdoProduccion>): Promise<AcuerdoProduccion | null> {
  const acuerdos = await getAcuerdos();
  const index = acuerdos.findIndex(a => a.id === id);
  if (index === -1) return null;

  acuerdos[index] = {
    ...acuerdos[index],
    ...updates,
  };
  await writeJSON(DB_FILES.acuerdos, acuerdos);
  return acuerdos[index];
}

// ============================================
// MOVILIDAD
// ============================================

export async function getMovilidad(): Promise<MovimientoMovilidad[]> {
  return readJSON<MovimientoMovilidad[]>(DB_FILES.movilidad);
}

export async function getMovilidadHoy(): Promise<MovimientoMovilidad[]> {
  const movilidad = await getMovilidad();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return movilidad.filter(m => {
    const fecha = new Date(m.fecha);
    fecha.setHours(0, 0, 0, 0);
    return fecha.getTime() === hoy.getTime();
  });
}

export async function getUltimoMovimiento(): Promise<MovimientoMovilidad | undefined> {
  const movilidad = await getMovilidad();
  if (movilidad.length === 0) return undefined;
  return movilidad[movilidad.length - 1];
}

export async function createMovimiento(data: Omit<MovimientoMovilidad, 'id'>): Promise<MovimientoMovilidad> {
  const movilidad = await getMovilidad();
  const newMovimiento: MovimientoMovilidad = {
    id: uuidv4(),
    ...data,
  };
  movilidad.push(newMovimiento);
  await writeJSON(DB_FILES.movilidad, movilidad);
  return newMovimiento;
}

// ============================================
// GASTOS EXTRAORDINARIOS
// ============================================

export async function getGastos(): Promise<GastoExtraordinario[]> {
  return readJSON<GastoExtraordinario[]>(DB_FILES.gastos);
}

export async function getGastosNoReembolsados(): Promise<GastoExtraordinario[]> {
  const gastos = await getGastos();
  return gastos.filter(g => !g.reembolsado);
}

export async function createGasto(data: Omit<GastoExtraordinario, 'id'>): Promise<GastoExtraordinario> {
  const gastos = await getGastos();
  const newGasto: GastoExtraordinario = {
    id: uuidv4(),
    ...data,
  };
  gastos.push(newGasto);
  await writeJSON(DB_FILES.gastos, gastos);
  return newGasto;
}

export async function marcarGastoReembolsado(id: string): Promise<GastoExtraordinario | null> {
  const gastos = await getGastos();
  const index = gastos.findIndex(g => g.id === id);
  if (index === -1) return null;

  gastos[index] = {
    ...gastos[index],
    reembolsado: true,
    fechaReembolso: new Date(),
  };
  await writeJSON(DB_FILES.gastos, gastos);
  return gastos[index];
}

// ============================================
// MATRIZ DE COSTOS
// ============================================

export async function getMatrizCostos(): Promise<MatrizCostos> {
  return readJSON<MatrizCostos>(DB_FILES.matrizCostos);
}

export async function getCostoRuta(origen: string, destino: string): Promise<number | null> {
  const matriz = await getMatrizCostos();
  const ruta = matriz.rutas.find(r =>
    r.origen.toLowerCase().includes(origen.toLowerCase()) &&
    r.destino.toLowerCase().includes(destino.toLowerCase())
  );
  return ruta?.costoCombi || null;
}

// ============================================
// AUDIO STORAGE
// ============================================

export async function saveAudio(buffer: Buffer, filename: string): Promise<string> {
  const date = new Date();
  const monthDir = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const audioDir = path.join(DATA_DIR, 'audios', monthDir);

  await fs.mkdir(audioDir, { recursive: true });

  const filePath = path.join(audioDir, filename);
  await fs.writeFile(filePath, buffer);

  return filePath;
}

// ============================================
// RESUMEN / ESTADÍSTICAS
// ============================================

export async function getResumenDia(): Promise<{
  acuerdos: number;
  movimientos: number;
  gastos: number;
  totalGastos: number;
}> {
  const [acuerdos, movilidad, gastos] = await Promise.all([
    getAcuerdos(),
    getMovilidadHoy(),
    getGastos(),
  ]);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const acuerdosHoy = acuerdos.filter(a => {
    const fecha = new Date(a.fechaAcuerdo);
    fecha.setHours(0, 0, 0, 0);
    return fecha.getTime() === hoy.getTime();
  });

  const gastosHoy = gastos.filter(g => {
    const fecha = new Date(g.fecha);
    fecha.setHours(0, 0, 0, 0);
    return fecha.getTime() === hoy.getTime();
  });

  return {
    acuerdos: acuerdosHoy.length,
    movimientos: movilidad.length,
    gastos: gastosHoy.length,
    totalGastos: gastosHoy.reduce((sum, g) => sum + g.monto, 0),
  };
}

export async function getPendientesHoy(): Promise<{
  recoger: AcuerdoProduccion[];
  entregar: Pedido[];
  vigilar: AcuerdoProduccion[];
}> {
  const [acuerdos, pedidos] = await Promise.all([
    getAcuerdos(),
    getPedidos(),
  ]);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  // Acuerdos listos para recoger
  const recoger = acuerdos.filter(a =>
    a.estado === 'listo' ||
    (a.estado === 'pendiente' && new Date(a.fechaPrometida) <= hoy)
  );

  // Pedidos para entregar hoy
  const entregar = pedidos.filter(p => {
    if (!p.fechaCompromiso) return false;
    const fecha = new Date(p.fechaCompromiso);
    fecha.setHours(0, 0, 0, 0);
    return fecha.getTime() === hoy.getTime() && p.estado !== 'entregado' && p.estado !== 'cerrado';
  });

  // Acuerdos a vigilar (deberían avisar pronto)
  const vigilar = acuerdos.filter(a => {
    if (a.estado !== 'pendiente') return false;
    const fecha = new Date(a.fechaPrometida);
    return fecha >= hoy && fecha <= manana;
  });

  return { recoger, entregar, vigilar };
}
