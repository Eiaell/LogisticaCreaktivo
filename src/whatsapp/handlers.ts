// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Message Handlers
// ============================================

import { Message } from 'whatsapp-web.js';
import { transcribeAudio, aplicarCorrecciones } from '../services/transcription';
import { extractEntities, generateResponse } from '../services/extraction';
import { processQuery } from '../services/queries';
import {
  agregarAcuerdo,
  agregarMovimiento,
  agregarGasto,
  getUltimoMovimiento,
  getRegistroDia,
  exportarDiaComoTexto,
} from '../services/daily-storage';
import { saveAudio } from '../services/storage';
import {
  guardarEnHistorial,
  guardarCorreccion,
  obtenerUltimaEntrada,
  marcarComoCorregido,
  obtenerEstadisticas,
} from '../services/memoria';
import {
  ExtraccionAcuerdo,
  ExtraccionMovilidad,
  ExtraccionGasto,
  ExtraccionReporte,
  ExtraccionCambioEstado,
  ExtraccionCompleta,
} from '../models/types';
import { logEvent } from '../services/eventLogger';

/**
 * Main message handler - routes to appropriate handler based on message type
 */
export async function handleMessage(msg: Message): Promise<string> {
  try {
    let textToProcess: string;

    // Check if it's an audio message
    if (msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
      console.log('[Handler] Processing audio message');

      // Download the audio
      const media = await msg.downloadMedia();
      if (!media) {
        return 'No pude descargar el audio. Intenta de nuevo.';
      }

      // Save audio for reference
      const audioBuffer = Buffer.from(media.data, 'base64');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const audioFilename = `${timestamp}_audio.ogg`;
      await saveAudio(audioBuffer, audioFilename);

      // Transcribe
      textToProcess = await transcribeAudio(audioBuffer, 'ogg');
      console.log('[Handler] Transcription:', textToProcess);

    } else if (msg.body) {
      // Text message - apply same corrections as audio
      textToProcess = aplicarCorrecciones(msg.body);
      console.log('[Handler] Processing text message:', textToProcess);

      // Check for correction command
      if (textToProcess.toUpperCase().startsWith('CORREGIR:')) {
        return await handleCorreccion(textToProcess);
      }

      // Check for stats command
      if (textToProcess.toUpperCase() === 'STATS' || textToProcess.toUpperCase() === 'ESTADISTICAS') {
        return handleEstadisticas();
      }

    } else {
      // Silently ignore non-audio, non-text messages (images, stickers, etc.)
      return '';
    }

    // Extract entities from the text
    const extraction = await extractEntities(textToProcess);
    console.log('[Handler] Extraction result:', extraction.resultado.tipo);
    console.log('[Handler] Datos extraídos:', JSON.stringify(extraction.resultado, null, 2));

    // Save to history
    guardarEnHistorial(textToProcess, extraction.resultado);

    // Log event to Event Clock
    const artifacts = extractArtifacts(extraction.resultado);
    await logEvent(
      'Usuario',
      `mensaje_${extraction.resultado.tipo}`,
      {
        transcripcion: textToProcess,
        tipo: extraction.resultado.tipo,
        esAudio: msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio'),
      },
      artifacts,
      extraction.resultado.tipo === 'otro' ? 'Mensaje no clasificado' : undefined
    );

    // Route to appropriate handler (still needed for storage)
    await routeExtraction(extraction);

    // Format compact response
    return formatCompactResponse(extraction.resultado, textToProcess);

  } catch (error) {
    console.error('[Handler] Error:', error);
    return 'Ocurrió un error procesando tu mensaje. Intenta de nuevo.';
  }
}

/**
 * Handle correction command
 */
async function handleCorreccion(texto: string): Promise<string> {
  const correccionTexto = texto.substring(9).trim(); // Remove "CORREGIR:"

  if (!correccionTexto) {
    return 'Formato: CORREGIR: [tu correccion aqui]';
  }

  const ultimaEntrada = obtenerUltimaEntrada();
  if (!ultimaEntrada) {
    return 'No hay mensaje anterior para corregir.';
  }

  // Save the correction
  guardarCorreccion(
    ultimaEntrada.transcripcion,
    ultimaEntrada.extraccion,
    correccionTexto
  );

  // Mark the entry as corrected
  marcarComoCorregido(ultimaEntrada.id);

  console.log('[Handler] Correccion guardada para:', ultimaEntrada.transcripcion);

  return `Correccion guardada. Aprendere de esto para el futuro.

Original: "${ultimaEntrada.transcripcion}"
Correccion: ${correccionTexto}`;
}

/**
 * Handle stats command
 */
function handleEstadisticas(): string {
  const stats = obtenerEstadisticas();

  let resp = `📊 Estadisticas del Bot\n\n`;
  resp += `Total procesados: ${stats.totalProcesados}\n`;
  resp += `Corregidos: ${stats.totalCorregidos}\n`;
  resp += `Exito: ${stats.porcentajeExito}%\n\n`;
  resp += `Tipos mas frecuentes:\n`;

  for (const [tipo, count] of Object.entries(stats.tiposMasFrecuentes)) {
    resp += `• ${tipo}: ${count}\n`;
  }

  return resp;
}

/**
 * Route extraction result to appropriate handler
 */
async function routeExtraction(extraction: ExtraccionCompleta): Promise<string> {
  const { resultado, transcripcionOriginal } = extraction;

  switch (resultado.tipo) {
    case 'acuerdo_produccion':
      return await handleAcuerdoProduccion(resultado, transcripcionOriginal);

    case 'consulta':
      return await processQuery(resultado);

    case 'movimiento_movilidad':
      return await handleMovimiento(resultado, transcripcionOriginal);

    case 'registro_gasto':
      return await handleGasto(resultado, transcripcionOriginal);

    case 'pendientes':
      return await handlePendientes();

    case 'reporte':
      return await handleReporte(resultado);

    case 'cambio_estado':
      return await handleCambioEstado(resultado);

    case 'otro':
    default:
      // Don't respond to unrecognized messages - stay silent
      console.log('[Handler] Mensaje no reconocido, ignorando:', resultado.mensaje || transcripcionOriginal);
      return '';
  }
}

/**
 * Handle production agreement registration
 */
async function handleAcuerdoProduccion(data: ExtraccionAcuerdo, transcripcion: string): Promise<string> {
  // Validate required fields
  if (!data.proveedor || !data.producto) {
    return 'Necesito al menos el nombre del proveedor y qué producto. ¿Puedes repetir?';
  }

  // Parse delivery date (only if explicitly mentioned)
  let fechaTexto = 'pendiente de confirmar';
  if (data.fechaEntrega) {
    const fechaPrometida = parseFechaFlexible(data.fechaEntrega);
    fechaTexto = formatFecha(fechaPrometida);
  }

  // Save to daily file
  await agregarAcuerdo({
    proveedor: data.proveedor,
    producto: data.producto,
    cantidad: data.cantidad || 0,
    especificaciones: data.especificaciones || undefined,
    adelanto: data.adelanto || undefined,
    costoTotal: data.costoTotal || undefined,
    fechaEntrega: fechaTexto,
    cliente: data.cliente || undefined,
    transcripcion,
  });

  // Build response
  let respuesta = '✅ Registrado\n';
  respuesta += `• ${data.cantidad || '?'} ${data.producto} con ${data.proveedor}\n`;

  if (data.especificaciones) {
    respuesta += `• Especificaciones: ${data.especificaciones}\n`;
  }

  if (data.adelanto) {
    respuesta += `• Adelanto: S/. ${data.adelanto}`;
    if (data.porcentajeAdelanto) {
      respuesta += ` (${data.porcentajeAdelanto}%)`;
    }
    respuesta += '\n';
  }

  if (data.costoTotal) {
    respuesta += `• Costo total: S/. ${data.costoTotal}\n`;
  }

  respuesta += `• Entrega: ${fechaTexto}\n`;

  if (data.cliente) {
    respuesta += `• Cliente: ${data.cliente}\n`;
  }

  return respuesta;
}

/**
 * Handle mobility movement registration
 */
async function handleMovimiento(data: ExtraccionMovilidad, transcripcion: string): Promise<string> {
  // Get origin from last movement if not specified
  let origen = data.origen;
  if (!origen) {
    const ultimo = await getUltimoMovimiento();
    origen = ultimo?.destino || 'Oficina Miraflores';
  }

  // Validate transport type
  const tipoTransporte = data.tipoTransporte || 'combi';
  const requiereAprobacion = tipoTransporte === 'taxi';

  // Save to daily file
  await agregarMovimiento({
    origen,
    destino: data.destino,
    costo: data.costo,
    tipoTransporte,
    proposito: data.proposito,
    transcripcion,
  });

  let respuesta = `📍 Registrado: ${origen} → ${data.destino}\n`;
  respuesta += `💰 S/. ${data.costo.toFixed(2)} (${tipoTransporte})\n`;
  respuesta += `📦 ${data.proposito}`;

  if (requiereAprobacion) {
    respuesta += '\n\n⚠️ Este gasto requiere aprobación de vendedora.';
  }

  return respuesta;
}

/**
 * Handle extraordinary expense registration
 */
async function handleGasto(data: ExtraccionGasto, transcripcion: string): Promise<string> {
  // Save to daily file
  await agregarGasto({
    tipo: data.tipoGasto,
    monto: data.monto,
    descripcion: data.descripcion,
    aprobadoPor: data.aprobadoPor || undefined,
    transcripcion,
  });

  let respuesta = `💸 Gasto registrado\n`;
  respuesta += `• Tipo: ${data.tipoGasto}\n`;
  respuesta += `• Monto: S/. ${data.monto.toFixed(2)}\n`;
  respuesta += `• ${data.descripcion}\n`;

  if (data.aprobadoPor) {
    respuesta += `• Aprobado por: ${data.aprobadoPor}\n`;
  } else {
    respuesta += '\n⚠️ Recuerda reportar este gasto a Natalia para reembolso.';
  }

  return respuesta;
}

/**
 * Handle pending items request - show today's summary
 */
async function handlePendientes(): Promise<string> {
  const registro = await getRegistroDia();

  let respuesta = `📋 Registro de hoy (${registro.fecha}):\n\n`;

  if (registro.acuerdos.length > 0) {
    respuesta += `ACUERDOS (${registro.acuerdos.length}):\n`;
    for (const a of registro.acuerdos) {
      respuesta += `• [${a.hora}] ${a.cantidad} ${a.producto} - ${a.proveedor}\n`;
    }
    respuesta += '\n';
  }

  if (registro.movilidad.length > 0) {
    respuesta += `MOVILIDAD (${registro.movilidad.length}):\n`;
    for (const m of registro.movilidad) {
      respuesta += `• [${m.hora}] ${m.origen} → ${m.destino} S/.${m.costo}\n`;
    }
    respuesta += '\n';
  }

  if (registro.gastos.length > 0) {
    respuesta += `GASTOS (${registro.gastos.length}):\n`;
    for (const g of registro.gastos) {
      respuesta += `• [${g.hora}] ${g.tipo}: S/.${g.monto}\n`;
    }
  }

  if (registro.acuerdos.length === 0 && registro.movilidad.length === 0 && registro.gastos.length === 0) {
    respuesta += 'No hay registros todavía.';
  }

  return respuesta;
}

/**
 * Handle report requests
 */
async function handleReporte(data: ExtraccionReporte): Promise<string> {
  // For now, just return today's text export
  return await exportarDiaComoTexto();
}

/**
 * Handle status change requests
 */
async function handleCambioEstado(data: ExtraccionCambioEstado): Promise<string> {
  // With daily storage, status changes are less relevant
  // Just acknowledge and note it
  return `📝 Nota: ${data.nuevoEstado} para ${data.identificador}`;
}

/**
 * Map natural language status to enum value
 */
function mapEstadoAcuerdo(estado: string): 'pendiente' | 'listo' | 'recogido' | 'problema' {
  const lower = estado.toLowerCase();

  if (lower.includes('listo') || lower.includes('terminado') || lower.includes('acabado')) {
    return 'listo';
  }
  if (lower.includes('recogido') || lower.includes('recogí') || lower.includes('tengo')) {
    return 'recogido';
  }
  if (lower.includes('problema') || lower.includes('demora') || lower.includes('retraso')) {
    return 'problema';
  }

  return 'pendiente';
}

/**
 * Parse flexible date strings
 */
function parseFechaFlexible(fechaStr: string): Date {
  const hoy = new Date();
  const lower = fechaStr.toLowerCase();

  // Handle relative dates
  if (lower.includes('hoy')) {
    return hoy;
  }
  if (lower.includes('mañana')) {
    hoy.setDate(hoy.getDate() + 1);
    return hoy;
  }
  if (lower.includes('pasado')) {
    hoy.setDate(hoy.getDate() + 2);
    return hoy;
  }

  // Handle day names
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  for (let i = 0; i < dias.length; i++) {
    if (lower.includes(dias[i])) {
      const diaActual = hoy.getDay();
      let diasHasta = i - diaActual;
      if (diasHasta <= 0) diasHasta += 7;
      hoy.setDate(hoy.getDate() + diasHasta);
      return hoy;
    }
  }

  // Try to parse as ISO date (YYYY-MM-DD) - add noon to avoid timezone issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0); // Noon local time
  }

  // Try to parse as date
  const parsed = new Date(fechaStr + 'T12:00:00');
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Extract numbers that might be day of month
  const numMatch = fechaStr.match(/\d+/);
  if (numMatch) {
    const dia = parseInt(numMatch[0], 10);
    if (dia >= 1 && dia <= 31) {
      hoy.setDate(dia);
      // If the day has passed, assume next month
      if (hoy < new Date()) {
        hoy.setMonth(hoy.getMonth() + 1);
      }
      return hoy;
    }
  }

  // Default: 3 days from now
  hoy.setDate(hoy.getDate() + 3);
  return hoy;
}

/**
 * Format date for display
 */
function formatFecha(fecha: Date): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  return `${dias[fecha.getDay()]} ${fecha.getDate()} ${meses[fecha.getMonth()]}`;
}

/**
 * Format response as compact JSON for LLM consumption
 */
function formatCompactResponse(resultado: any, transcripcion: string): string {
  let resp = `📝 "${transcripcion}"\n\n`;

  if (resultado.tipo === 'otro') {
    // Build compact JSON object
    const compact: any = { tipo: 'otro' };

    if (resultado.items?.length > 0) {
      compact.items = resultado.items.map((i: any) => `${i.cantidad} ${i.nombre}`);
    }

    if (resultado.personas?.length > 0) {
      compact.personas = resultado.personas.map((p: any) => ({ [p.nombre]: p.rol }));
    }

    if (resultado.montos?.length > 0) {
      compact.montos = resultado.montos.map((m: any) => m.valor);
    }

    if (resultado.lugares?.length > 0) {
      compact.lugares = resultado.lugares;
    }

    if (resultado.fechas?.length > 0) {
      compact.fechas = resultado.fechas;
    }

    resp += JSON.stringify(compact);
  } else {
    // For other types, compact JSON (no indentation)
    resp += JSON.stringify(resultado);
  }

  return resp;
}

/**
 * Extract artifacts from extraction result for Event Clock logging
 */
function extractArtifacts(resultado: any): string[] {
  const artifacts: string[] = [];

  // Add type-specific artifacts
  if (resultado.proveedor) {
    artifacts.push(`Proveedor:${resultado.proveedor}`);
  }
  if (resultado.producto) {
    artifacts.push(`Producto:${resultado.producto}`);
  }
  if (resultado.cantidad) {
    artifacts.push(`Cantidad:${resultado.cantidad}`);
  }
  if (resultado.cliente) {
    artifacts.push(`Cliente:${resultado.cliente}`);
  }
  if (resultado.destino) {
    artifacts.push(`Destino:${resultado.destino}`);
  }
  if (resultado.origen) {
    artifacts.push(`Origen:${resultado.origen}`);
  }
  if (resultado.monto || resultado.costo) {
    artifacts.push(`Monto:S/.${resultado.monto || resultado.costo}`);
  }
  if (resultado.costoTotal) {
    artifacts.push(`CostoTotal:S/.${resultado.costoTotal}`);
  }
  if (resultado.adelanto) {
    artifacts.push(`Adelanto:S/.${resultado.adelanto}`);
  }

  // For 'otro' type, extract generic items
  if (resultado.items?.length > 0) {
    for (const item of resultado.items) {
      artifacts.push(`Item:${item.cantidad} ${item.nombre}`);
    }
  }
  if (resultado.personas?.length > 0) {
    for (const persona of resultado.personas) {
      artifacts.push(`Persona:${persona.nombre}`);
    }
  }
  if (resultado.lugares?.length > 0) {
    for (const lugar of resultado.lugares) {
      artifacts.push(`Lugar:${lugar}`);
    }
  }

  return artifacts;
}
