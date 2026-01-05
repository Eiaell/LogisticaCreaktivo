// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Event Clock Logger Service
// ============================================

import fs from 'fs/promises';
import path from 'path';

const TRACES_DIR = path.join(process.cwd(), 'knowledge_base', 'traces');

interface EventLogEntry {
  timestamp: string;
  actor: string;
  action: string;
  context: Record<string, unknown>;
  artifacts: string[];
  reasoning?: string;
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
 * Log an event to the daily JSONL file
 *
 * @param actor - Who performed the action (e.g., "Huber", "Bot", "Sistema")
 * @param action - What action was performed (e.g., "mensaje_recibido", "acuerdo_registrado")
 * @param context - Additional context data
 * @param artifacts - Related items/entities (e.g., ["Proveedor:Carlos", "Producto:100 polos"])
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

    const entry: EventLogEntry = {
      timestamp: new Date().toISOString(),
      actor,
      action,
      context,
      artifacts,
    };

    if (reasoning) {
      entry.reasoning = reasoning;
    }

    const todayFile = path.join(TRACES_DIR, `${getTodayDate()}.jsonl`);
    const line = JSON.stringify(entry) + '\n';

    await fs.appendFile(todayFile, line, 'utf-8');
    console.log(`[EventLogger] Logged: ${action} by ${actor}`);
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
export async function getTodayEvents(): Promise<EventLogEntry[]> {
  try {
    const todayFile = getTodayTraceFile();
    const content = await fs.readFile(todayFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map(line => JSON.parse(line) as EventLogEntry);
  } catch (error) {
    // File might not exist yet
    return [];
  }
}
