// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// DeepSeek Entity Extraction Service (OpenAI-compatible API)
// ============================================

import OpenAI from 'openai';
import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL } from '../config/constants';
import {
  ExtraccionCompleta,
  ResultadoExtraccion,
  TipoExtraccion,
} from '../models/types';
import { generarEjemplosDeCorrecciones } from './memoria';

const deepseek = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: DEEPSEEK_BASE_URL,
});

const EXTRACTION_PROMPT = `Eres un asistente de logística. Extrae SOLO la información que está EXPLÍCITAMENTE mencionada en el texto.

FECHA ACTUAL: {fecha_actual}

REGLA CRÍTICA: NO INVENTES DATOS. Si algo no se menciona, usa null. NUNCA asumas fechas, cantidades o valores no dichos.
- Para fechas: usa el año actual (2026) a menos que se diga otro año explícitamente.
- Si dicen "lunes 15 de enero", la fecha es 2026-01-15 (no 2024).

El usuario es un coordinador logístico en Lima, Perú. Trabaja con proveedores de materiales promocionales (polos, impresiones, telas, etc.).

VOCABULARIO COMÚN:
- "Mandé a producción" = se hizo un pedido a proveedor
- "Adelanto" = pago parcial inicial (usualmente 50%)
- "Hugo", "Carmen", etc. = nombres de proveedores frecuentes
- "DHL", "Inmobiliaria X" = nombres de clientes
- "combi", "metro", "taxi" = tipos de transporte
- "La Victoria", "San Isidro", "Centro Lima" = zonas de Lima

TIPOS DE MENSAJE QUE PUEDE ENVIAR:
1. acuerdo_produccion - Cuando informa sobre un pedido a proveedor
2. consulta - Cuando pregunta sobre historial, precios, tiempos
3. movimiento_movilidad - Cuando reporta un viaje/traslado
4. cambio_estado - Cuando actualiza el estado de algo
5. registro_gasto - Cuando reporta un gasto extraordinario
6. pendientes - Cuando pregunta qué tiene pendiente
7. reporte - Cuando pide un reporte
8. otro - Cualquier otra cosa (mensajes de prueba, saludos, etc.)

TEXTO A PROCESAR:
{transcripcion}

RESPONDE ÚNICAMENTE CON JSON VÁLIDO (sin markdown, sin explicaciones):
{
  "tipo": "uno_de_los_tipos_mencionados",
  "datos": {
    // SOLO campos mencionados explícitamente. Usa null para lo no mencionado.
  },
  "confianza": 0-100,
  "campos_faltantes": ["lista de campos importantes no mencionados"]
}

EJEMPLOS DE ESTRUCTURA DE DATOS SEGÚN TIPO:

Para acuerdo_produccion:
{
  "tipo": "acuerdo_produccion",
  "datos": {
    "proveedor": "nombre",
    "producto": "descripción del producto",
    "cantidad": 24,
    "especificaciones": "bordado full color, tallas S M L",
    "adelanto": 250,
    "porcentajeAdelanto": 50,
    "costoTotal": 500,
    "fechaEntrega": "2026-01-03",
    "cliente": "DHL"
  }
}

Para consulta:
{
  "tipo": "consulta",
  "datos": {
    "subtipo": "historial_precios|historial_tiempos|proveedor|pedido|general",
    "proveedor": "nombre si aplica",
    "producto": "producto si aplica",
    "cliente": "cliente si aplica",
    "pregunta": "la pregunta original"
  }
}

Para movimiento_movilidad:
{
  "tipo": "movimiento_movilidad",
  "datos": {
    "origen": "lugar de origen (puede ser null si no se menciona)",
    "destino": "lugar de destino",
    "costo": 3.20,
    "tipoTransporte": "metro|combi|taxi|carro_propio",
    "proposito": "motivo del viaje",
    "pedidoRelacionado": "cliente o descripción si aplica"
  }
}

Para registro_gasto:
{
  "tipo": "registro_gasto",
  "datos": {
    "tipoGasto": "motorizado|taxi|material|otro",
    "monto": 15.00,
    "descripcion": "descripción del gasto",
    "aprobadoPor": "nombre de quien aprobó si se menciona",
    "pedidoRelacionado": "cliente o descripción si aplica"
  }
}

Para pendientes:
{
  "tipo": "pendientes",
  "datos": {
    "fecha": "hoy|mañana|fecha específica si se menciona"
  }
}

Para reporte:
{
  "tipo": "reporte",
  "datos": {
    "tipoReporte": "movilidad|gastos|produccion",
    "fechaInicio": "fecha si se menciona",
    "fechaFin": "fecha si se menciona"
  }
}

Para cambio_estado:
{
  "tipo": "cambio_estado",
  "datos": {
    "entidad": "pedido|acuerdo",
    "identificador": "descripción para identificar",
    "nuevoEstado": "el nuevo estado",
    "notas": "notas adicionales"
  }
}

Para otro (SIEMPRE extrae todos los datos estructurados):
{
  "tipo": "otro",
  "datos": {
    "mensaje": "el mensaje original",
    "items": [{"nombre": "producto", "cantidad": 5, "unidad": "unidades"}],
    "personas": [{"nombre": "Hugo", "rol": "proveedor"}],
    "montos": [{"valor": 150, "concepto": "adelanto"}],
    "lugares": [],
    "fechas": []
  }
}`;

/**
 * Extract entities from transcribed text using Claude
 */
export async function extractEntities(
  transcription: string
): Promise<ExtraccionCompleta> {
  try {
    const fechaActual = new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Obtener ejemplos de correcciones anteriores para mejorar la extraccion
    const ejemplosCorrecciones = generarEjemplosDeCorrecciones();

    const prompt = EXTRACTION_PROMPT
      .replace('{fecha_actual}', fechaActual)
      .replace('{transcripcion}', transcription) + ejemplosCorrecciones;

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from response
    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      throw new Error('No text content in response');
    }

    // Parse JSON response (handle markdown code blocks if present)
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // Special handling for tipo "otro" to include extracted entities
    if (parsed.tipo === 'otro') {
      return {
        resultado: {
          tipo: 'otro',
          mensaje: parsed.datos?.mensaje || transcription,
          items: parsed.datos?.items || [],
          personas: parsed.datos?.personas || [],
          montos: parsed.datos?.montos || [],
          lugares: parsed.datos?.lugares || [],
          fechas: parsed.datos?.fechas || [],
        },
        confianza: parsed.confianza || 80,
        camposFaltantes: parsed.campos_faltantes || [],
        transcripcionOriginal: transcription,
      };
    }

    // Convert to our type structure
    const resultado = convertToResultado(parsed.tipo, parsed.datos);

    return {
      resultado,
      confianza: parsed.confianza || 80,
      camposFaltantes: parsed.campos_faltantes || [],
      transcripcionOriginal: transcription,
    };
  } catch (error) {
    console.error('[Extraction] Error:', error);

    // Return a fallback "otro" type
    return {
      resultado: {
        tipo: 'otro',
        mensaje: transcription,
        items: [],
        personas: [],
        montos: [],
        lugares: [],
        fechas: [],
      },
      confianza: 0,
      camposFaltantes: ['error_parsing'],
      transcripcionOriginal: transcription,
    };
  }
}

/**
 * Convert parsed data to typed ResultadoExtraccion
 */
function convertToResultado(
  tipo: TipoExtraccion,
  datos: Record<string, unknown>
): ResultadoExtraccion {
  switch (tipo) {
    case 'acuerdo_produccion':
      return {
        tipo: 'acuerdo_produccion',
        proveedor: datos.proveedor as string || '',
        producto: datos.producto as string || '',
        cantidad: datos.cantidad as number || 0,
        especificaciones: datos.especificaciones as string,
        adelanto: datos.adelanto as number,
        porcentajeAdelanto: datos.porcentajeAdelanto as number,
        costoTotal: datos.costoTotal as number,
        fechaEntrega: datos.fechaEntrega as string,
        cliente: datos.cliente as string,
      };

    case 'consulta':
      return {
        tipo: 'consulta',
        subtipo: (datos.subtipo as string) as 'historial_precios' | 'historial_tiempos' | 'proveedor' | 'pedido' | 'general' || 'general',
        proveedor: datos.proveedor as string,
        producto: datos.producto as string,
        cliente: datos.cliente as string,
        pregunta: datos.pregunta as string || '',
      };

    case 'movimiento_movilidad':
      return {
        tipo: 'movimiento_movilidad',
        origen: datos.origen as string,
        destino: datos.destino as string || '',
        costo: datos.costo as number || 0,
        tipoTransporte: (datos.tipoTransporte as 'metro' | 'combi' | 'taxi' | 'carro_propio') || 'combi',
        proposito: datos.proposito as string || '',
        pedidoRelacionado: datos.pedidoRelacionado as string,
      };

    case 'cambio_estado':
      return {
        tipo: 'cambio_estado',
        entidad: (datos.entidad as 'pedido' | 'acuerdo') || 'pedido',
        identificador: datos.identificador as string || '',
        nuevoEstado: datos.nuevoEstado as string || '',
        notas: datos.notas as string,
      };

    case 'registro_gasto':
      return {
        tipo: 'registro_gasto',
        tipoGasto: (datos.tipoGasto as 'motorizado' | 'taxi' | 'material' | 'otro') || 'otro',
        monto: datos.monto as number || 0,
        descripcion: datos.descripcion as string || '',
        aprobadoPor: datos.aprobadoPor as string,
        pedidoRelacionado: datos.pedidoRelacionado as string,
      };

    case 'pendientes':
      return {
        tipo: 'pendientes',
        fecha: datos.fecha as string,
      };

    case 'reporte':
      return {
        tipo: 'reporte',
        tipoReporte: (datos.tipoReporte as 'movilidad' | 'gastos' | 'produccion') || 'movilidad',
        fechaInicio: datos.fechaInicio as string,
        fechaFin: datos.fechaFin as string,
      };

    default:
      return {
        tipo: 'otro',
        mensaje: datos.mensaje as string || '',
      };
  }
}

/**
 * Generate a natural language response using DeepSeek
 */
export async function generateResponse(
  query: string,
  context: string
): Promise<string> {
  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Eres el asistente de logística de Flaco. Responde de forma concisa y útil.

CONTEXTO:
- Usuario consulta desde WhatsApp mientras trabaja en campo
- Prefiere respuestas cortas y directas
- Usa soles (S/.) como moneda

DATOS DISPONIBLES:
${context}

CONSULTA DEL USUARIO:
${query}

Responde en texto plano (no markdown). Sé directo. Si no tienes la información, dilo claramente.`,
        },
      ],
    });

    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      return 'Lo siento, no pude procesar tu consulta.';
    }

    return textContent.trim();
  } catch (error) {
    console.error('[Response Generation] Error:', error);
    return 'Error al procesar la consulta. Intenta de nuevo.';
  }
}
