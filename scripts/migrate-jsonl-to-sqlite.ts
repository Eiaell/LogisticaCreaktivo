#!/usr/bin/env npx tsx
// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Migration Script: JSONL to SQLite
// ============================================

import fs from 'fs';
import path from 'path';
import {
  db,
  createCase,
  createEvent,
  createArtifact,
  upsertProvider,
  createMovement,
  createExpense,
  getCaseById,
  transaction,
} from '../src/services/db';

const TRACES_DIR = path.join(process.cwd(), 'knowledge_base', 'traces');

interface JsonlEvent {
  caseId?: string;
  activity?: string;
  timestamp: string;
  resource?: string;
  actor?: string;
  action?: string;
  context: {
    transcripcion?: string;
    tipo?: string;
    esAudio?: boolean;
    cliente?: string;
    proveedor?: string;
    nuevoEstado?: string;
    [key: string]: unknown;
  };
  artifacts?: string[];
  processState?: string;
  reasoning?: string;
}

/**
 * Parse artifact strings like "Proveedor:patricia" into structured data
 */
function parseArtifacts(artifacts: string[]): {
  proveedor?: string;
  producto?: string;
  cantidad?: number;
  cliente?: string;
  monto?: number;
  destino?: string;
  origen?: string;
} {
  const result: ReturnType<typeof parseArtifacts> = {};

  for (const art of artifacts) {
    const [key, value] = art.split(':').map(s => s.trim());
    const keyLower = key.toLowerCase();

    if (keyLower === 'proveedor') {
      result.proveedor = value;
    } else if (keyLower === 'producto') {
      result.producto = value;
    } else if (keyLower === 'cantidad') {
      result.cantidad = parseInt(value, 10) || undefined;
    } else if (keyLower === 'cliente') {
      result.cliente = value;
    } else if (keyLower.includes('costo') || keyLower === 'monto') {
      // Parse monto like "S/.320" or "320"
      const montoMatch = value.match(/[\d.]+/);
      if (montoMatch) {
        result.monto = parseFloat(montoMatch[0]);
      }
    } else if (keyLower === 'destino') {
      result.destino = value;
    } else if (keyLower === 'origen') {
      result.origen = value;
    }
  }

  return result;
}

/**
 * Generate a case ID from event data
 */
function generateCaseId(event: JsonlEvent): string {
  // Use existing caseId if present
  if (event.caseId) {
    return event.caseId;
  }

  // Extract client and provider
  const parsedArtifacts = parseArtifacts(event.artifacts || []);
  const cliente = parsedArtifacts.cliente || event.context.cliente;
  const proveedor = parsedArtifacts.proveedor || event.context.proveedor;

  if (cliente && proveedor) {
    const dateStr = event.timestamp.split('T')[0].replace(/-/g, '');
    const clienteNorm = normalizeForId(cliente);
    const proveedorNorm = normalizeForId(proveedor);
    return `CASE-${clienteNorm}-${proveedorNorm}-${dateStr}`;
  }

  // Fallback: date + random
  const dateStr = event.timestamp.split('T')[0].replace(/-/g, '');
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

/**
 * Process a single JSONL event and insert into SQLite
 */
function processEvent(event: JsonlEvent, existingCases: Set<string>): void {
  const caseId = generateCaseId(event);
  const parsedArtifacts = parseArtifacts(event.artifacts || []);
  const tipo = event.context.tipo || event.action || event.activity || 'otro';

  // Ensure case exists
  if (!existingCases.has(caseId)) {
    const cliente = parsedArtifacts.cliente || event.context.cliente || 'Desconocido';
    try {
      createCase({
        id: caseId,
        cliente: String(cliente),
        estado: mapProcessStateToEstado(event.processState),
        fecha_creacion: event.timestamp,
      });
      existingCases.add(caseId);
      console.log(`  [+] Created case: ${caseId}`);
    } catch (err) {
      // Case might already exist from a previous run
      if (!String(err).includes('UNIQUE constraint')) {
        console.error(`  [!] Error creating case ${caseId}:`, err);
      }
      existingCases.add(caseId);
    }
  }

  // Create event
  try {
    createEvent({
      case_id: caseId,
      tipo,
      actor: event.actor || event.resource || 'Usuario',
      timestamp: event.timestamp,
      transcripcion: event.context.transcripcion,
      es_audio: event.context.esAudio || false,
      raw_data: event.context,
      process_state: event.processState,
      reasoning: event.reasoning,
    });
  } catch (err) {
    console.error(`  [!] Error creating event:`, err);
  }

  // Create artifacts
  if (parsedArtifacts.proveedor) {
    try {
      createArtifact({
        case_id: caseId,
        tipo: 'proveedor',
        valor: parsedArtifacts.proveedor,
      });
      upsertProvider({ nombre: parsedArtifacts.proveedor });
    } catch (err) {
      // Ignore duplicates
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
      // Ignore duplicates
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
      // Ignore duplicates
    }
  }

  // Handle movements
  if (tipo === 'movimiento_movilidad') {
    try {
      createMovement({
        case_id: caseId,
        fecha: event.timestamp.split('T')[0],
        destino: parsedArtifacts.destino || parsedArtifacts.proveedor || 'Desconocido',
        origen: parsedArtifacts.origen,
        costo: parsedArtifacts.monto || 0,
        recogedor: 'Huber',
        proposito: event.context.transcripcion,
      });
    } catch (err) {
      console.error(`  [!] Error creating movement:`, err);
    }
  }

  // Handle expenses
  if (tipo === 'registro_gasto') {
    try {
      createExpense({
        case_id: caseId,
        fecha: event.timestamp.split('T')[0],
        descripcion: event.context.transcripcion || 'Gasto sin descripción',
        monto: parsedArtifacts.monto || 0,
        categoria: 'otro',
      });
    } catch (err) {
      console.error(`  [!] Error creating expense:`, err);
    }
  }
}

/**
 * Map process state to case estado
 */
function mapProcessStateToEstado(processState?: string): 'cotizacion' | 'aprobado' | 'en_produccion' | 'listo_recoger' | 'en_campo' | 'entregado' | 'cerrado' {
  if (!processState) return 'cotizacion';

  const stateMap: Record<string, 'cotizacion' | 'aprobado' | 'en_produccion' | 'listo_recoger' | 'en_campo' | 'entregado' | 'cerrado'> = {
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
 * Migrate all JSONL files to SQLite
 */
async function migrate(): Promise<void> {
  console.log('========================================');
  console.log('JSONL to SQLite Migration');
  console.log('========================================\n');

  // Check if traces directory exists
  if (!fs.existsSync(TRACES_DIR)) {
    console.log(`Traces directory not found: ${TRACES_DIR}`);
    console.log('Nothing to migrate.');
    return;
  }

  // Get all JSONL files
  const files = fs.readdirSync(TRACES_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .sort();

  if (files.length === 0) {
    console.log('No JSONL files found to migrate.');
    return;
  }

  console.log(`Found ${files.length} JSONL file(s) to migrate:\n`);

  const existingCases = new Set<string>();
  let totalEvents = 0;
  let processedEvents = 0;
  let errors = 0;

  // Process each file
  for (const file of files) {
    const filePath = path.join(TRACES_DIR, file);
    console.log(`Processing: ${file}`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      console.log(`  Found ${lines.length} events`);
      totalEvents += lines.length;

      // Process in transaction for better performance
      transaction(() => {
        for (const line of lines) {
          try {
            const event = JSON.parse(line) as JsonlEvent;

            // Skip "otro" type events that are noise
            if (event.context?.tipo === 'otro' && !event.caseId) {
              continue;
            }

            processEvent(event, existingCases);
            processedEvents++;
          } catch (parseErr) {
            console.error(`  [!] Error parsing line:`, parseErr);
            errors++;
          }
        }
      });

      console.log(`  Processed successfully\n`);
    } catch (fileErr) {
      console.error(`  [!] Error reading file:`, fileErr);
      errors++;
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('Migration Complete');
  console.log('========================================');
  console.log(`Total files processed: ${files.length}`);
  console.log(`Total events found: ${totalEvents}`);
  console.log(`Events migrated: ${processedEvents}`);
  console.log(`Cases created: ${existingCases.size}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nDatabase location: data/logistica.db`);
}

// Run migration
migrate().catch(console.error);
