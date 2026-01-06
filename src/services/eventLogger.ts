// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Event Clock Logger Service (Celonis-Style)
// ============================================

import fs from 'fs/promises';
import path from 'path';

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
 * Log an event to the daily JSONL file (Celonis-style)
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
    await ensureTracesDir();

    // Generate Case ID
    const caseId = generateCaseId(context, artifacts);

    // Update case tracking for continuity
    lastCaseId = caseId;
    lastCaseTimestamp = Date.now();

    // Determine process state
    const processState = determineProcessState(action, context);

    const entry: CelonisEvent = {
      // Celonis core fields
      caseId,
      activity: action,
      timestamp: new Date().toISOString(),
      resource: actor,

      // Legacy fields (for backward compatibility)
      actor,
      action,
      context,
      artifacts,

      // Process tracking
      processState,
    };

    if (reasoning) {
      entry.reasoning = reasoning;
    }

    const todayFile = path.join(TRACES_DIR, `${getTodayDate()}.jsonl`);
    const line = JSON.stringify(entry) + '\n';

    await fs.appendFile(todayFile, line, 'utf-8');
    console.log(`[EventLogger] Logged: ${action} by ${actor} | Case: ${caseId} | State: ${processState}`);
  } catch (error) {
    console.error('[EventLogger] Error logging event:', error);
  }
}

/**
 * Get today's trace file path
 */
export function getTodayTraceFile(): string {
  return path.join(TRACES_DIR, `${getTodayDate()}.jsonl`);
}

/**
 * Read today's events from the JSONL file
 */
export async function getTodayEvents(): Promise<CelonisEvent[]> {
  try {
    const todayFile = getTodayTraceFile();
    const content = await fs.readFile(todayFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map(line => JSON.parse(line) as CelonisEvent);
  } catch (error) {
    // File might not exist yet
    return [];
  }
}

/**
 * Get events grouped by Case ID
 */
export async function getEventsByCase(): Promise<Map<string, CelonisEvent[]>> {
  const events = await getTodayEvents();
  const caseMap = new Map<string, CelonisEvent[]>();

  for (const event of events) {
    const caseId = event.caseId || 'UNKNOWN';
    if (!caseMap.has(caseId)) {
      caseMap.set(caseId, []);
    }
    caseMap.get(caseId)!.push(event);
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
