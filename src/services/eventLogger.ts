// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Event Clock Logger Service (Celonis-Style)
// Now with SQLite Storage
// ============================================

import fs from 'fs/promises';
import path from 'path';
import {
  createCase,
  createEvent,
  createArtifact,
  createMovement,
  createExpense,
  upsertProvider,
  updateCase,
  getCaseById,
  getEventsByDate as getEventsFromDb,
  type Case,
  type Event,
} from './db';

const TRACES_DIR = path.join(process.cwd(), 'knowledge_base', 'traces');

// =============================================================================
// CELONIS ONTOLOGY: Activity, Timestamp, Resource, Case
// =============================================================================

interface CelonisEvent {
  // Core Celonis fields
  caseId: string;              // Case ID (groups related events)
  activity: string;            // What happened (Activity)
  timestamp: string;           // When it happened (Timestamp)
  resource: string;            // Who did it (Resource)

  // Extended fields
  actor: string;               // Legacy: same as resource
  action: string;              // Legacy: same as activity
  context: Record<string, unknown>;
  artifacts: string[];
  reasoning?: string;

  // Process state tracking
  processState?: string;       // Current state in the Happy Path
}

// Track last case ID for continuity within same session
let lastCaseId: string | null = null;
let lastCaseTimestamp: number = 0;
const CASE_CONTINUITY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Parse artifact strings like "Proveedor:patricia" into structured data
 */
function parseArtifactStrings(artifacts: string[]): {
  proveedor?: string;
  producto?: string;
  cantidad?: number;
  cliente?: string;
  monto?: number;
  destino?: string;
  origen?: string;
} {
  const result: ReturnType<typeof parseArtifactStrings> = {};

  for (const art of artifacts) {
    const colonIndex = art.indexOf(':');
    if (colonIndex === -1) continue;

    const key = art.substring(0, colonIndex).trim().toLowerCase();
    const value = art.substring(colonIndex + 1).trim();

    if (key === 'proveedor') {
      result.proveedor = value;
    } else if (key === 'producto') {
      result.producto = value;
    } else if (key === 'cantidad') {
      result.cantidad = parseInt(value, 10) || undefined;
    } else if (key === 'cliente') {
      result.cliente = value;
    } else if (key.includes('costo') || key === 'monto') {
      const montoMatch = value.match(/[\d.]+/);
      if (montoMatch) {
        result.monto = parseFloat(montoMatch[0]);
      }
    } else if (key === 'destino') {
      result.destino = value;
    } else if (key === 'origen') {
      result.origen = value;
    }
  }

  return result;
}

/**
 * Map process state string to valid Case estado
 */
function mapToEstado(processState: string): Case['estado'] {
  const stateMap: Record<string, Case['estado']> = {
    'cotizacion': 'cotizacion',
    'aprobado': 'aprobado',
    'en_produccion': 'en_produccion',
    'listo_recoger': 'listo_recoger',
    'listo': 'listo_recoger',
    'en_campo': 'en_campo',
    'entregado': 'entregado',
    'cerrado': 'cerrado',
  };

  return stateMap[processState.toLowerCase()] || 'cotizacion';
}

/**
 * Generate a Case ID based on context
 * Priority: explicit > client+provider > session continuity > new case
 */
function generateCaseId(context: Record<string, unknown>, artifacts: string[]): string {
  // Check for explicit case ID in context
  if (context.caseId) {
    return String(context.caseId);
  }

  if (context.pedidoId) {
    return `PED-${context.pedidoId}`;
  }

  // Extract client and provider from artifacts
  let client: string | null = null;
  let provider: string | null = null;

  for (const art of artifacts) {
    if (art.toLowerCase().startsWith('cliente:')) {
      client = art.split(':')[1].trim();
    } else if (art.toLowerCase().startsWith('proveedor:')) {
      provider = art.split(':')[1].trim();
    }
  }

  // Also check context
  if (!client && context.cliente) {
    client = String(context.cliente);
  }
  if (!provider && context.proveedor) {
    provider = String(context.proveedor);
  }

  // If we have both client and provider, create a deterministic case ID
  if (client && provider) {
    const clientNorm = normalizeForId(client);
    const providerNorm = normalizeForId(provider);
    const dateStr = getTodayDateCompact();
    return `CASE-${clientNorm}-${providerNorm}-${dateStr}`;
  }

  // Check for session continuity (same case within time window)
  const now = Date.now();
  if (lastCaseId && (now - lastCaseTimestamp) < CASE_CONTINUITY_WINDOW_MS) {
    return lastCaseId;
  }

  // Create new case ID
  const dateStr = getTodayDateCompact();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CASE-${dateStr}-${randomPart}`;
}

/**
 * Normalize text for use in IDs (remove accents, uppercase, truncate)
 */
function normalizeForId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3);
}

/**
 * Map action/tipo to process state
 */
function determineProcessState(action: string, context: Record<string, unknown>): string {
  const tipo = context.tipo as string | undefined;

  // Map by tipo first
  if (tipo === 'acuerdo_produccion') return 'en_produccion';
  if (tipo === 'movimiento_movilidad') return 'entregado';
  if (tipo === 'cambio_estado') {
    const nuevoEstado = context.nuevoEstado as string | undefined;
    if (nuevoEstado) return nuevoEstado;
  }
  if (tipo === 'registro_gasto') return 'en_produccion';

  // Map by action
  if (action.includes('acuerdo')) return 'en_produccion';
  if (action.includes('movilidad')) return 'entregado';
  if (action.includes('entrega')) return 'entregado';

  // Default
  return 'en_produccion';
}

/**
 * Initialize the traces directory if it doesn't exist
 */
async function ensureTracesDir(): Promise<void> {
  await fs.mkdir(TRACES_DIR, { recursive: true });
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in compact YYYYMMDD format
 */
function getTodayDateCompact(): string {
  return getTodayDate().replace(/-/g, '');
}

/**
 * Log an event to SQLite (and to JSONL for backward compatibility)
 *
 * @param actor - Who performed the action (Resource in Celonis terms)
 * @param action - What action was performed (Activity in Celonis terms)
 * @param context - Additional context data
 * @param artifacts - Related items/entities (e.g., ["cliente:TYC", "proveedor:Patricia"])
 * @param reasoning - Optional reasoning or notes about the event
 */
export async function logEvent(
  actor: string,
  action: string,
  context: Record<string, unknown>,
  artifacts: string[],
  reasoning?: string
): Promise<void> {
  try {
    // Generate Case ID
    const caseId = generateCaseId(context, artifacts);

    // Update case tracking for continuity
    lastCaseId = caseId;
    lastCaseTimestamp = Date.now();

    // Determine process state
    const processState = determineProcessState(action, context);
    const tipo = (context.tipo as string) || action;

    // Parse artifacts for structured data
    const parsedArtifacts = parseArtifactStrings(artifacts);
    const cliente = parsedArtifacts.cliente || (context.cliente as string) || 'Desconocido';

    // Ensure case exists in SQLite
    const existingCase = getCaseById(caseId);
    if (!existingCase) {
      try {
        createCase({
          id: caseId,
          cliente,
          estado: mapToEstado(processState),
          fecha_creacion: new Date().toISOString(),
        });
        console.log(`[EventLogger] Created case: ${caseId}`);
      } catch (err) {
        // Case might already exist (race condition), ignore
        if (!String(err).includes('UNIQUE constraint')) {
          console.error('[EventLogger] Error creating case:', err);
        }
      }
    } else {
      // Update case state if needed
      try {
        updateCase(caseId, { estado: mapToEstado(processState) });
      } catch (err) {
        console.error('[EventLogger] Error updating case:', err);
      }
    }

    // Create event in SQLite
    try {
      createEvent({
        case_id: caseId,
        tipo,
        actor,
        timestamp: new Date().toISOString(),
        transcripcion: context.transcripcion as string | undefined,
        es_audio: (context.esAudio as boolean) || false,
        raw_data: context,
        process_state: processState,
        reasoning,
      });
    } catch (err) {
      console.error('[EventLogger] Error creating event:', err);
    }

    // Create artifacts in SQLite
    if (parsedArtifacts.proveedor) {
      try {
        createArtifact({
          case_id: caseId,
          tipo: 'proveedor',
          valor: parsedArtifacts.proveedor,
        });
        upsertProvider({ nombre: parsedArtifacts.proveedor });
      } catch (err) {
        // Ignore duplicate artifacts
      }
    }

    if (parsedArtifacts.producto) {
      try {
        createArtifact({
          case_id: caseId,
          tipo: 'producto',
          valor: parsedArtifacts.producto,
          cantidad: parsedArtifacts.cantidad,
        });
      } catch (err) {
        // Ignore duplicate artifacts
      }
    }

    if (parsedArtifacts.monto) {
      try {
        createArtifact({
          case_id: caseId,
          tipo: 'monto',
          valor: `S/.${parsedArtifacts.monto}`,
          monto: parsedArtifacts.monto,
        });
      } catch (err) {
        // Ignore duplicate artifacts
      }
    }

    // Handle movements
    if (tipo === 'movimiento_movilidad') {
      try {
        createMovement({
          case_id: caseId,
          fecha: getTodayDate(),
          destino: parsedArtifacts.destino || parsedArtifacts.proveedor || 'Desconocido',
          origen: parsedArtifacts.origen,
          costo: parsedArtifacts.monto || 0,
          recogedor: 'Huber',
          proposito: context.transcripcion as string | undefined,
        });
      } catch (err) {
        console.error('[EventLogger] Error creating movement:', err);
      }
    }

    // Handle expenses
    if (tipo === 'registro_gasto') {
      try {
        createExpense({
          case_id: caseId,
          fecha: getTodayDate(),
          descripcion: (context.transcripcion as string) || 'Gasto sin descripcion',
          monto: parsedArtifacts.monto || 0,
          categoria: 'otro',
        });
      } catch (err) {
        console.error('[EventLogger] Error creating expense:', err);
      }
    }

    // Also write to JSONL for backward compatibility
    await writeToJsonl(caseId, action, actor, context, artifacts, processState, reasoning);

    console.log(`[EventLogger] Logged: ${action} by ${actor} | Case: ${caseId} | State: ${processState}`);
  } catch (error) {
    console.error('[EventLogger] Error logging event:', error);
  }
}

/**
 * Write event to JSONL file for backward compatibility
 */
async function writeToJsonl(
  caseId: string,
  action: string,
  actor: string,
  context: Record<string, unknown>,
  artifacts: string[],
  processState: string,
  reasoning?: string
): Promise<void> {
  try {
    await ensureTracesDir();

    const entry: CelonisEvent = {
      caseId,
      activity: action,
      timestamp: new Date().toISOString(),
      resource: actor,
      actor,
      action,
      context,
      artifacts,
      processState,
    };

    if (reasoning) {
      entry.reasoning = reasoning;
    }

    const todayFile = path.join(TRACES_DIR, `${getTodayDate()}.jsonl`);
    const line = JSON.stringify(entry) + '\n';

    await fs.appendFile(todayFile, line, 'utf-8');
  } catch (error) {
    console.error('[EventLogger] Error writing to JSONL:', error);
  }
}

/**
 * Get today's trace file path
 */
export function getTodayTraceFile(): string {
  return path.join(TRACES_DIR, `${getTodayDate()}.jsonl`);
}

/**
 * Read today's events from SQLite
 */
export async function getTodayEvents(): Promise<Event[]> {
  try {
    return getEventsFromDb(getTodayDate());
  } catch (error) {
    console.error('[EventLogger] Error getting today events:', error);
    return [];
  }
}

/**
 * Get events grouped by Case ID from SQLite
 */
export async function getEventsByCase(): Promise<Map<string, Event[]>> {
  const events = await getTodayEvents();
  const caseMap = new Map<string, Event[]>();

  for (const event of events) {
    const id = event.case_id || 'UNKNOWN';
    if (!caseMap.has(id)) {
      caseMap.set(id, []);
    }
    caseMap.get(id)!.push(event);
  }

  return caseMap;
}

/**
 * Set the current case ID explicitly (for case continuity)
 */
export function setCurrentCaseId(caseId: string): void {
  lastCaseId = caseId;
  lastCaseTimestamp = Date.now();
}

/**
 * Get the current active case ID
 */
export function getCurrentCaseId(): string | null {
  const now = Date.now();
  if (lastCaseId && (now - lastCaseTimestamp) < CASE_CONTINUITY_WINDOW_MS) {
    return lastCaseId;
  }
  return null;
}

// Re-export types for convenience
export type { CelonisEvent };
