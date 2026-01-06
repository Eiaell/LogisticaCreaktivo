// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// SQLite Database Service
// ============================================

import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'logistica.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db: DatabaseType = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// =============================================================================
// SCHEMA DEFINITIONS
// Based on docs/REQUISITOS_DASHBOARD_2026-01-05.md
// =============================================================================

const SCHEMA = `
-- Cases table: Represents a business process instance (pedido/order)
-- ID can be RQ number (when assigned) or auto-generated
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  cliente TEXT NOT NULL,
  cliente_contacto TEXT,
  cliente_direccion TEXT,
  cliente_telefono TEXT,
  ejecutiva TEXT CHECK(ejecutiva IN ('Angélica', 'Johana', 'Natalia', NULL)),
  estado TEXT NOT NULL DEFAULT 'cotizacion' CHECK(estado IN (
    'cotizacion', 'aprobado', 'en_produccion', 'listo_recoger',
    'en_campo', 'entregado', 'cerrado'
  )),
  sub_estado TEXT,
  fecha_creacion TEXT NOT NULL DEFAULT (datetime('now')),
  fecha_compromiso TEXT,
  fecha_entrega TEXT,
  urgente INTEGER NOT NULL DEFAULT 0,
  cerrado INTEGER NOT NULL DEFAULT 0,
  numero_rq TEXT UNIQUE,
  especificaciones TEXT,
  tags TEXT, -- JSON array of tags
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Events table: Celonis-style event log
-- Each event represents an activity in a case
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'Usuario',
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  transcripcion TEXT,
  es_audio INTEGER NOT NULL DEFAULT 0,
  raw_data TEXT, -- JSON with full extraction data
  process_state TEXT,
  reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Artifacts table: Entities related to cases (providers, products, amounts)
CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN (
    'proveedor', 'producto', 'monto', 'adelanto', 'movilidad', 'gasto'
  )),
  valor TEXT NOT NULL,
  cantidad REAL,
  monto REAL,
  incluye_igv INTEGER,
  fecha_pago TEXT,
  meta_data TEXT, -- JSON for additional details
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Providers table: Master data for suppliers
CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  productos TEXT, -- JSON array of products they make
  tiempo_promedio_dias REAL,
  total_pedidos INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Movements table: Transportation/delivery records
CREATE TABLE IF NOT EXISTS movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT,
  fecha TEXT NOT NULL DEFAULT (date('now')),
  origen TEXT,
  destino TEXT NOT NULL,
  tipo_transporte TEXT CHECK(tipo_transporte IN ('taxi', 'moto', 'bus', 'otro')),
  costo REAL NOT NULL DEFAULT 0,
  recogedor TEXT DEFAULT 'Huber',
  proposito TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
);

-- Expenses table: Extraordinary expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT,
  fecha TEXT NOT NULL DEFAULT (date('now')),
  descripcion TEXT NOT NULL,
  monto REAL NOT NULL,
  categoria TEXT CHECK(categoria IN ('motorizado', 'materiales_urgentes', 'otro')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_case_id ON events(case_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_tipo ON events(tipo);
CREATE INDEX IF NOT EXISTS idx_artifacts_case_id ON artifacts(case_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_tipo ON artifacts(tipo);
CREATE INDEX IF NOT EXISTS idx_cases_estado ON cases(estado);
CREATE INDEX IF NOT EXISTS idx_cases_cliente ON cases(cliente);
CREATE INDEX IF NOT EXISTS idx_cases_ejecutiva ON cases(ejecutiva);
CREATE INDEX IF NOT EXISTS idx_cases_fecha_creacion ON cases(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_movements_case_id ON movements(case_id);
CREATE INDEX IF NOT EXISTS idx_movements_fecha ON movements(fecha);
CREATE INDEX IF NOT EXISTS idx_expenses_case_id ON expenses(case_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fecha ON expenses(fecha);
`;

// Initialize schema
db.exec(SCHEMA);

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Case {
  id: string;
  cliente: string;
  cliente_contacto?: string;
  cliente_direccion?: string;
  cliente_telefono?: string;
  ejecutiva?: 'Angélica' | 'Johana' | 'Natalia';
  estado: 'cotizacion' | 'aprobado' | 'en_produccion' | 'listo_recoger' | 'en_campo' | 'entregado' | 'cerrado';
  sub_estado?: string;
  fecha_creacion: string;
  fecha_compromiso?: string;
  fecha_entrega?: string;
  urgente: boolean;
  cerrado: boolean;
  numero_rq?: string;
  especificaciones?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  case_id: string;
  tipo: string;
  actor: string;
  timestamp: string;
  transcripcion?: string;
  es_audio: boolean;
  raw_data?: Record<string, unknown>;
  process_state?: string;
  reasoning?: string;
  created_at: string;
}

export interface Artifact {
  id: number;
  case_id: string;
  tipo: 'proveedor' | 'producto' | 'monto' | 'adelanto' | 'movilidad' | 'gasto';
  valor: string;
  cantidad?: number;
  monto?: number;
  incluye_igv?: boolean;
  fecha_pago?: string;
  meta_data?: Record<string, unknown>;
  created_at: string;
}

export interface Provider {
  id: number;
  nombre: string;
  productos?: string[];
  tiempo_promedio_dias?: number;
  total_pedidos: number;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: number;
  case_id?: string;
  fecha: string;
  origen?: string;
  destino: string;
  tipo_transporte?: 'taxi' | 'moto' | 'bus' | 'otro';
  costo: number;
  recogedor: string;
  proposito?: string;
  created_at: string;
}

export interface Expense {
  id: number;
  case_id?: string;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria?: 'motorizado' | 'materiales_urgentes' | 'otro';
  created_at: string;
}

// =============================================================================
// PREPARED STATEMENTS
// =============================================================================

const statements = {
  // Cases
  insertCase: db.prepare(`
    INSERT INTO cases (id, cliente, cliente_contacto, cliente_direccion, cliente_telefono,
                       ejecutiva, estado, sub_estado, fecha_creacion, fecha_compromiso,
                       fecha_entrega, urgente, cerrado, numero_rq, especificaciones, tags)
    VALUES (@id, @cliente, @cliente_contacto, @cliente_direccion, @cliente_telefono,
            @ejecutiva, @estado, @sub_estado, @fecha_creacion, @fecha_compromiso,
            @fecha_entrega, @urgente, @cerrado, @numero_rq, @especificaciones, @tags)
  `),

  updateCase: db.prepare(`
    UPDATE cases SET
      cliente = COALESCE(@cliente, cliente),
      cliente_contacto = COALESCE(@cliente_contacto, cliente_contacto),
      cliente_direccion = COALESCE(@cliente_direccion, cliente_direccion),
      cliente_telefono = COALESCE(@cliente_telefono, cliente_telefono),
      ejecutiva = COALESCE(@ejecutiva, ejecutiva),
      estado = COALESCE(@estado, estado),
      sub_estado = COALESCE(@sub_estado, sub_estado),
      fecha_compromiso = COALESCE(@fecha_compromiso, fecha_compromiso),
      fecha_entrega = COALESCE(@fecha_entrega, fecha_entrega),
      urgente = COALESCE(@urgente, urgente),
      cerrado = COALESCE(@cerrado, cerrado),
      numero_rq = COALESCE(@numero_rq, numero_rq),
      especificaciones = COALESCE(@especificaciones, especificaciones),
      tags = COALESCE(@tags, tags),
      updated_at = datetime('now')
    WHERE id = @id
  `),

  getCaseById: db.prepare(`SELECT * FROM cases WHERE id = ?`),

  getCasesByEstado: db.prepare(`SELECT * FROM cases WHERE estado = ? ORDER BY fecha_creacion DESC`),

  getOpenCases: db.prepare(`SELECT * FROM cases WHERE cerrado = 0 ORDER BY urgente DESC, fecha_creacion ASC`),

  getCasesByCliente: db.prepare(`SELECT * FROM cases WHERE cliente = ? ORDER BY fecha_creacion DESC`),

  getCasesByEjecutiva: db.prepare(`SELECT * FROM cases WHERE ejecutiva = ? ORDER BY fecha_creacion DESC`),

  searchCases: db.prepare(`
    SELECT * FROM cases
    WHERE cliente LIKE @query OR id LIKE @query OR especificaciones LIKE @query
    ORDER BY fecha_creacion DESC
    LIMIT @limit
  `),

  // Events
  insertEvent: db.prepare(`
    INSERT INTO events (case_id, tipo, actor, timestamp, transcripcion, es_audio, raw_data, process_state, reasoning)
    VALUES (@case_id, @tipo, @actor, @timestamp, @transcripcion, @es_audio, @raw_data, @process_state, @reasoning)
  `),

  getEventsByCaseId: db.prepare(`SELECT * FROM events WHERE case_id = ? ORDER BY timestamp ASC`),

  getEventsByDate: db.prepare(`
    SELECT * FROM events
    WHERE date(timestamp) = date(?)
    ORDER BY timestamp ASC
  `),

  getEventsByDateRange: db.prepare(`
    SELECT * FROM events
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
  `),

  getRecentEvents: db.prepare(`
    SELECT * FROM events
    ORDER BY timestamp DESC
    LIMIT ?
  `),

  // Artifacts
  insertArtifact: db.prepare(`
    INSERT INTO artifacts (case_id, tipo, valor, cantidad, monto, incluye_igv, fecha_pago, meta_data)
    VALUES (@case_id, @tipo, @valor, @cantidad, @monto, @incluye_igv, @fecha_pago, @meta_data)
  `),

  getArtifactsByCaseId: db.prepare(`SELECT * FROM artifacts WHERE case_id = ? ORDER BY created_at ASC`),

  getArtifactsByTipo: db.prepare(`SELECT * FROM artifacts WHERE tipo = ? ORDER BY created_at DESC`),

  // Providers
  insertProvider: db.prepare(`
    INSERT INTO providers (nombre, productos, tiempo_promedio_dias)
    VALUES (@nombre, @productos, @tiempo_promedio_dias)
    ON CONFLICT(nombre) DO UPDATE SET
      productos = COALESCE(@productos, productos),
      tiempo_promedio_dias = COALESCE(@tiempo_promedio_dias, tiempo_promedio_dias),
      total_pedidos = total_pedidos + 1,
      updated_at = datetime('now')
  `),

  getProviderByName: db.prepare(`SELECT * FROM providers WHERE nombre = ?`),

  getAllProviders: db.prepare(`SELECT * FROM providers ORDER BY total_pedidos DESC`),

  // Movements
  insertMovement: db.prepare(`
    INSERT INTO movements (case_id, fecha, origen, destino, tipo_transporte, costo, recogedor, proposito)
    VALUES (@case_id, @fecha, @origen, @destino, @tipo_transporte, @costo, @recogedor, @proposito)
  `),

  getMovementsByCaseId: db.prepare(`SELECT * FROM movements WHERE case_id = ? ORDER BY fecha DESC`),

  getMovementsByDate: db.prepare(`SELECT * FROM movements WHERE fecha = ? ORDER BY created_at ASC`),

  getMovementsByDateRange: db.prepare(`
    SELECT * FROM movements
    WHERE fecha >= ? AND fecha <= ?
    ORDER BY fecha ASC
  `),

  getTotalMovementCostByDateRange: db.prepare(`
    SELECT SUM(costo) as total FROM movements WHERE fecha >= ? AND fecha <= ?
  `),

  // Expenses
  insertExpense: db.prepare(`
    INSERT INTO expenses (case_id, fecha, descripcion, monto, categoria)
    VALUES (@case_id, @fecha, @descripcion, @monto, @categoria)
  `),

  getExpensesByCaseId: db.prepare(`SELECT * FROM expenses WHERE case_id = ? ORDER BY fecha DESC`),

  getExpensesByDate: db.prepare(`SELECT * FROM expenses WHERE fecha = ? ORDER BY created_at ASC`),

  getExpensesByDateRange: db.prepare(`
    SELECT * FROM expenses
    WHERE fecha >= ? AND fecha <= ?
    ORDER BY fecha ASC
  `),

  getTotalExpensesByDateRange: db.prepare(`
    SELECT SUM(monto) as total FROM expenses WHERE fecha >= ? AND fecha <= ?
  `),

  // Statistics
  getCaseCountByEstado: db.prepare(`
    SELECT estado, COUNT(*) as count FROM cases GROUP BY estado
  `),

  getProviderStats: db.prepare(`
    SELECT p.nombre, p.tiempo_promedio_dias, p.total_pedidos,
           COUNT(DISTINCT a.case_id) as cases_count
    FROM providers p
    LEFT JOIN artifacts a ON a.valor = p.nombre AND a.tipo = 'proveedor'
    GROUP BY p.id
    ORDER BY p.total_pedidos DESC
  `),

  getDailyStats: db.prepare(`
    SELECT
      date(timestamp) as fecha,
      COUNT(*) as eventos,
      COUNT(DISTINCT case_id) as casos
    FROM events
    WHERE timestamp >= ? AND timestamp <= ?
    GROUP BY date(timestamp)
    ORDER BY fecha ASC
  `),
};

// =============================================================================
// DATABASE FUNCTIONS
// =============================================================================

// Cases
export function createCase(caseData: Partial<Case> & { id: string; cliente: string }): Database.RunResult {
  return statements.insertCase.run({
    id: caseData.id,
    cliente: caseData.cliente,
    cliente_contacto: caseData.cliente_contacto || null,
    cliente_direccion: caseData.cliente_direccion || null,
    cliente_telefono: caseData.cliente_telefono || null,
    ejecutiva: caseData.ejecutiva || null,
    estado: caseData.estado || 'cotizacion',
    sub_estado: caseData.sub_estado || null,
    fecha_creacion: caseData.fecha_creacion || new Date().toISOString(),
    fecha_compromiso: caseData.fecha_compromiso || null,
    fecha_entrega: caseData.fecha_entrega || null,
    urgente: caseData.urgente ? 1 : 0,
    cerrado: caseData.cerrado ? 1 : 0,
    numero_rq: caseData.numero_rq || null,
    especificaciones: caseData.especificaciones || null,
    tags: caseData.tags ? JSON.stringify(caseData.tags) : null,
  });
}

export function updateCase(id: string, updates: Partial<Case>): Database.RunResult {
  return statements.updateCase.run({
    id,
    cliente: updates.cliente || null,
    cliente_contacto: updates.cliente_contacto || null,
    cliente_direccion: updates.cliente_direccion || null,
    cliente_telefono: updates.cliente_telefono || null,
    ejecutiva: updates.ejecutiva || null,
    estado: updates.estado || null,
    sub_estado: updates.sub_estado || null,
    fecha_compromiso: updates.fecha_compromiso || null,
    fecha_entrega: updates.fecha_entrega || null,
    urgente: updates.urgente !== undefined ? (updates.urgente ? 1 : 0) : null,
    cerrado: updates.cerrado !== undefined ? (updates.cerrado ? 1 : 0) : null,
    numero_rq: updates.numero_rq || null,
    especificaciones: updates.especificaciones || null,
    tags: updates.tags ? JSON.stringify(updates.tags) : null,
  });
}

export function getCaseById(id: string): Case | undefined {
  const row = statements.getCaseById.get(id) as Record<string, unknown> | undefined;
  return row ? parseCase(row) : undefined;
}

export function getCasesByEstado(estado: Case['estado']): Case[] {
  const rows = statements.getCasesByEstado.all(estado) as Record<string, unknown>[];
  return rows.map(parseCase);
}

export function getOpenCases(): Case[] {
  const rows = statements.getOpenCases.all() as Record<string, unknown>[];
  return rows.map(parseCase);
}

export function getCasesByCliente(cliente: string): Case[] {
  const rows = statements.getCasesByCliente.all(cliente) as Record<string, unknown>[];
  return rows.map(parseCase);
}

export function getCasesByEjecutiva(ejecutiva: string): Case[] {
  const rows = statements.getCasesByEjecutiva.all(ejecutiva) as Record<string, unknown>[];
  return rows.map(parseCase);
}

export function searchCases(query: string, limit = 50): Case[] {
  const rows = statements.searchCases.all({ query: `%${query}%`, limit }) as Record<string, unknown>[];
  return rows.map(parseCase);
}

function parseCase(row: Record<string, unknown>): Case {
  return {
    ...row,
    urgente: Boolean(row.urgente),
    cerrado: Boolean(row.cerrado),
    tags: row.tags ? JSON.parse(row.tags as string) : undefined,
  } as Case;
}

// Events
export function createEvent(eventData: Omit<Event, 'id' | 'created_at'>): Database.RunResult {
  return statements.insertEvent.run({
    case_id: eventData.case_id,
    tipo: eventData.tipo,
    actor: eventData.actor || 'Usuario',
    timestamp: eventData.timestamp || new Date().toISOString(),
    transcripcion: eventData.transcripcion || null,
    es_audio: eventData.es_audio ? 1 : 0,
    raw_data: eventData.raw_data ? JSON.stringify(eventData.raw_data) : null,
    process_state: eventData.process_state || null,
    reasoning: eventData.reasoning || null,
  });
}

export function getEventsByCaseId(caseId: string): Event[] {
  const rows = statements.getEventsByCaseId.all(caseId) as Record<string, unknown>[];
  return rows.map(parseEvent);
}

export function getEventsByDate(date: string): Event[] {
  const rows = statements.getEventsByDate.all(date) as Record<string, unknown>[];
  return rows.map(parseEvent);
}

export function getEventsByDateRange(startDate: string, endDate: string): Event[] {
  const rows = statements.getEventsByDateRange.all(startDate, endDate) as Record<string, unknown>[];
  return rows.map(parseEvent);
}

export function getRecentEvents(limit = 100): Event[] {
  const rows = statements.getRecentEvents.all(limit) as Record<string, unknown>[];
  return rows.map(parseEvent);
}

function parseEvent(row: Record<string, unknown>): Event {
  return {
    ...row,
    es_audio: Boolean(row.es_audio),
    raw_data: row.raw_data ? JSON.parse(row.raw_data as string) : undefined,
  } as Event;
}

// Artifacts
export function createArtifact(artifactData: Omit<Artifact, 'id' | 'created_at'>): Database.RunResult {
  return statements.insertArtifact.run({
    case_id: artifactData.case_id,
    tipo: artifactData.tipo,
    valor: artifactData.valor,
    cantidad: artifactData.cantidad || null,
    monto: artifactData.monto || null,
    incluye_igv: artifactData.incluye_igv !== undefined ? (artifactData.incluye_igv ? 1 : 0) : null,
    fecha_pago: artifactData.fecha_pago || null,
    meta_data: artifactData.meta_data ? JSON.stringify(artifactData.meta_data) : null,
  });
}

export function getArtifactsByCaseId(caseId: string): Artifact[] {
  const rows = statements.getArtifactsByCaseId.all(caseId) as Record<string, unknown>[];
  return rows.map(parseArtifact);
}

export function getArtifactsByTipo(tipo: Artifact['tipo']): Artifact[] {
  const rows = statements.getArtifactsByTipo.all(tipo) as Record<string, unknown>[];
  return rows.map(parseArtifact);
}

function parseArtifact(row: Record<string, unknown>): Artifact {
  return {
    ...row,
    incluye_igv: row.incluye_igv !== null ? Boolean(row.incluye_igv) : undefined,
    meta_data: row.meta_data ? JSON.parse(row.meta_data as string) : undefined,
  } as Artifact;
}

// Providers
export function upsertProvider(providerData: Partial<Provider> & { nombre: string }): Database.RunResult {
  return statements.insertProvider.run({
    nombre: providerData.nombre,
    productos: providerData.productos ? JSON.stringify(providerData.productos) : null,
    tiempo_promedio_dias: providerData.tiempo_promedio_dias || null,
  });
}

export function getProviderByName(nombre: string): Provider | undefined {
  const row = statements.getProviderByName.get(nombre) as Record<string, unknown> | undefined;
  return row ? parseProvider(row) : undefined;
}

export function getAllProviders(): Provider[] {
  const rows = statements.getAllProviders.all() as Record<string, unknown>[];
  return rows.map(parseProvider);
}

function parseProvider(row: Record<string, unknown>): Provider {
  return {
    ...row,
    productos: row.productos ? JSON.parse(row.productos as string) : undefined,
  } as Provider;
}

// Movements
export function createMovement(movementData: Omit<Movement, 'id' | 'created_at'>): Database.RunResult {
  return statements.insertMovement.run({
    case_id: movementData.case_id || null,
    fecha: movementData.fecha || new Date().toISOString().split('T')[0],
    origen: movementData.origen || null,
    destino: movementData.destino,
    tipo_transporte: movementData.tipo_transporte || null,
    costo: movementData.costo || 0,
    recogedor: movementData.recogedor || 'Huber',
    proposito: movementData.proposito || null,
  });
}

export function getMovementsByCaseId(caseId: string): Movement[] {
  const rows = statements.getMovementsByCaseId.all(caseId) as unknown[];
  return rows as Movement[];
}

export function getMovementsByDate(date: string): Movement[] {
  const rows = statements.getMovementsByDate.all(date) as unknown[];
  return rows as Movement[];
}

export function getMovementsByDateRange(startDate: string, endDate: string): Movement[] {
  const rows = statements.getMovementsByDateRange.all(startDate, endDate) as unknown[];
  return rows as Movement[];
}

export function getTotalMovementCost(startDate: string, endDate: string): number {
  const result = statements.getTotalMovementCostByDateRange.get(startDate, endDate) as { total: number | null };
  return result.total || 0;
}

// Expenses
export function createExpense(expenseData: Omit<Expense, 'id' | 'created_at'>): Database.RunResult {
  return statements.insertExpense.run({
    case_id: expenseData.case_id || null,
    fecha: expenseData.fecha || new Date().toISOString().split('T')[0],
    descripcion: expenseData.descripcion,
    monto: expenseData.monto,
    categoria: expenseData.categoria || null,
  });
}

export function getExpensesByCaseId(caseId: string): Expense[] {
  const rows = statements.getExpensesByCaseId.all(caseId) as unknown[];
  return rows as Expense[];
}

export function getExpensesByDate(date: string): Expense[] {
  const rows = statements.getExpensesByDate.all(date) as unknown[];
  return rows as Expense[];
}

export function getExpensesByDateRange(startDate: string, endDate: string): Expense[] {
  const rows = statements.getExpensesByDateRange.all(startDate, endDate) as unknown[];
  return rows as Expense[];
}

export function getTotalExpenses(startDate: string, endDate: string): number {
  const result = statements.getTotalExpensesByDateRange.get(startDate, endDate) as { total: number | null };
  return result.total || 0;
}

// Statistics
export function getCaseCountByEstado(): Record<string, number> {
  const rows = statements.getCaseCountByEstado.all() as { estado: string; count: number }[];
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.estado] = row.count;
  }
  return result;
}

export function getProviderStats(): Array<{
  nombre: string;
  tiempo_promedio_dias: number | null;
  total_pedidos: number;
  cases_count: number;
}> {
  return statements.getProviderStats.all() as Array<{
    nombre: string;
    tiempo_promedio_dias: number | null;
    total_pedidos: number;
    cases_count: number;
  }>;
}

export function getDailyStats(startDate: string, endDate: string): Array<{
  fecha: string;
  eventos: number;
  casos: number;
}> {
  return statements.getDailyStats.all(startDate, endDate) as Array<{
    fecha: string;
    eventos: number;
    casos: number;
  }>;
}

// =============================================================================
// TRANSACTION HELPERS
// =============================================================================

export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}

// =============================================================================
// CASE ID GENERATION HELPERS
// =============================================================================

/**
 * Generate or find a case ID based on context
 * Priority: explicit caseId > RQ number > client+provider > new case
 */
export function findOrCreateCaseId(
  context: { caseId?: string; cliente?: string; proveedor?: string; numero_rq?: string },
  createIfNotFound = true
): string {
  // 1. Explicit case ID
  if (context.caseId) {
    return context.caseId;
  }

  // 2. RQ number as case ID
  if (context.numero_rq) {
    const existingCase = getCaseById(context.numero_rq);
    if (existingCase) return existingCase.id;
    if (createIfNotFound && context.cliente) {
      createCase({ id: context.numero_rq, cliente: context.cliente });
      return context.numero_rq;
    }
  }

  // 3. Find existing case by client+provider combination
  if (context.cliente && context.proveedor) {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const caseId = `CASE-${normalizeForId(context.cliente)}-${normalizeForId(context.proveedor)}-${dateStr}`;

    const existingCase = getCaseById(caseId);
    if (existingCase) return existingCase.id;

    if (createIfNotFound) {
      createCase({ id: caseId, cliente: context.cliente });
      return caseId;
    }
  }

  // 4. Generate new case ID
  if (createIfNotFound && context.cliente) {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const caseId = `CASE-${dateStr}-${randomPart}`;
    createCase({ id: caseId, cliente: context.cliente });
    return caseId;
  }

  // Fallback
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CASE-${dateStr}-${randomPart}`;
}

function normalizeForId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3);
}

// =============================================================================
// DATABASE INSTANCE EXPORT
// =============================================================================

export { db };

// Close database on process exit
process.on('exit', () => db.close());
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
