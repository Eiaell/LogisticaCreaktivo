// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Message Handlers (Nuevo Sistema)
// ============================================

import { Message } from 'whatsapp-web.js';
import { transcribeAudio, aplicarCorrecciones } from '../services/transcription';
import { extractEntities } from '../services/extraction';
import { saveAudio } from '../services/storage';
import {
  guardarEnHistorial,
  guardarCorreccion,
  obtenerUltimaEntrada,
  marcarComoCorregido,
  obtenerEstadisticas,
} from '../services/memoria';
import {
  ExtraccionCompleta,
  ExtraccionSolicitudCotizacion,
  ExtraccionRecepcionCotizacion,
  ExtraccionOrdenProduccion,
  ExtraccionRegistroMovilidad,
  ExtraccionOtro,
} from '../models/types';
import {
  guardarSolicitudCotizacion,
  guardarRecepcionCotizacion,
  guardarOrdenProduccion,
  guardarRegistroMovilidad,
  guardarMensajeOtro,
  initializeLogisticsStorage,
} from '../services/logistics-storage';
import { logEvent } from '../services/eventLogger';

// Inicializar storage al cargar el módulo
initializeLogisticsStorage().catch(console.error);

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
    const artifacts = extractArtifactsNew(extraction.resultado);
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

    // Route to appropriate handler and get response
    const response = await routeExtraction(extraction, textToProcess);

    return response;

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
 * Route extraction result to appropriate handler (Nuevo Sistema)
 */
async function routeExtraction(extraction: ExtraccionCompleta, transcripcion: string): Promise<string> {
  const { resultado } = extraction;

  switch (resultado.tipo) {
    case 'solicitud_cotizacion':
      return await handleSolicitudCotizacion(resultado as ExtraccionSolicitudCotizacion, transcripcion);

    case 'recepcion_cotizacion':
      return await handleRecepcionCotizacion(resultado as ExtraccionRecepcionCotizacion, transcripcion);

    case 'orden_produccion':
      return await handleOrdenProduccion(resultado as ExtraccionOrdenProduccion, transcripcion);

    case 'registro_movilidad':
      return await handleRegistroMovilidad(resultado as ExtraccionRegistroMovilidad, transcripcion);

    case 'otro':
    default:
      // Guardar como 'otro' sin responder
      await handleMensajeOtro(resultado as ExtraccionOtro, transcripcion);
      return '';
  }
}

// ============================================
// NUEVOS HANDLERS
// ============================================

/**
 * Handle solicitud de cotización
 */
async function handleSolicitudCotizacion(
  data: ExtraccionSolicitudCotizacion,
  transcripcion: string
): Promise<string> {
  await guardarSolicitudCotizacion(data, transcripcion);
  return JSON.stringify(data, null, 2);
}

/**
 * Handle recepción de cotización
 */
async function handleRecepcionCotizacion(
  data: ExtraccionRecepcionCotizacion,
  transcripcion: string
): Promise<string> {
  await guardarRecepcionCotizacion(data, transcripcion);
  return JSON.stringify(data, null, 2);
}

/**
 * Handle orden de producción
 */
async function handleOrdenProduccion(
  data: ExtraccionOrdenProduccion,
  transcripcion: string
): Promise<string> {
  await guardarOrdenProduccion(data, transcripcion);
  return JSON.stringify(data, null, 2);
}

/**
 * Handle registro de movilidad
 */
async function handleRegistroMovilidad(
  data: ExtraccionRegistroMovilidad,
  transcripcion: string
): Promise<string> {
  await guardarRegistroMovilidad(data, transcripcion);
  return JSON.stringify(data, null, 2);
}

/**
 * Handle mensaje no clasificado
 */
async function handleMensajeOtro(
  data: ExtraccionOtro,
  transcripcion: string
): Promise<void> {
  await guardarMensajeOtro(data, transcripcion);
  console.log('[Handler] Mensaje guardado como "otro":', transcripcion.substring(0, 50));
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Extract artifacts from extraction result for Event Clock logging (Nuevo Sistema)
 */
function extractArtifactsNew(resultado: any): string[] {
  const artifacts: string[] = [];

  // Common fields
  if (resultado.cliente) {
    artifacts.push(`Cliente:${resultado.cliente}`);
  }
  if (resultado.proveedor) {
    artifacts.push(`Proveedor:${resultado.proveedor}`);
  }
  if (resultado.producto) {
    artifacts.push(`Producto:${resultado.producto}`);
  }
  if (resultado.solicitado_por) {
    artifacts.push(`Solicitante:${resultado.solicitado_por}`);
  }

  // Productos (solicitud_cotizacion)
  if (resultado.productos?.length > 0) {
    for (const prod of resultado.productos) {
      if (prod.descripcion) {
        artifacts.push(`Producto:${prod.cantidad || '?'} ${prod.descripcion}`);
      }
    }
  }

  // Precios
  if (resultado.precio_total) {
    artifacts.push(`PrecioTotal:S/.${resultado.precio_total}`);
  }
  if (resultado.precio_unitario) {
    artifacts.push(`PrecioUnitario:S/.${resultado.precio_unitario}`);
  }

  // Condiciones de pago
  if (resultado.condiciones_pago?.adelanto) {
    artifacts.push(`Adelanto:S/.${resultado.condiciones_pago.adelanto}`);
  }

  // Tramos de movilidad
  if (resultado.tramos?.length > 0) {
    for (const tramo of resultado.tramos) {
      if (tramo.destino) {
        artifacts.push(`Tramo:${tramo.origen || '?'}->${tramo.destino}`);
      }
    }
  }
  if (resultado.costo_total) {
    artifacts.push(`CostoTotal:S/.${resultado.costo_total}`);
  }

  return artifacts;
}

/**
 * Extract artifacts from extraction result for Event Clock logging (Legacy)
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
