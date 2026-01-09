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

const EXTRACTION_PROMPT = `Eres un bot de apoyo al área de Logística.
Recibirás mensajes o audios transcritos desde WhatsApp en lenguaje natural.

Tu tarea es:
1. Identificar el tipo de solicitud
2. Extraer toda la información relevante
3. Devolver exclusivamente un JSON válido, sin texto adicional.

Si algún dato no está explícito, devuelve null.
No inventes información.
Usa siempre la estructura definida según el tipo de solicitud.

FECHA ACTUAL: {fecha_actual}

CONTEXTO:
- Usuario: Coordinador logístico en Lima, Perú
- Trabaja con proveedores de materiales promocionales (polos, bolsas, impresiones, telas, vinilos)
- Clientes frecuentes: TYC, DHL, Grupo LAR, etc.
- Vendedoras: Angélica, Johana, Natalia, Patricia

TIPOS DE SOLICITUD:

1. solicitud_cotizacion
   CUÁNDO APLICA: Cuando el mensaje indica que se está pidiendo cotizar algo a un proveedor.
   Palabras clave: "cotización", "cotizar", "mandando a cotizar", "pide cotización"

2. recepcion_cotizacion
   CUÁNDO APLICA: Cuando informas los precios recibidos de proveedores.
   Palabras clave: "me cotizaron", "el precio es", "cuesta", "sale a"

3. orden_produccion
   CUÁNDO APLICA: Cuando indicas que ya se mandó a hacer, se aprobó proveedor, se acordaron pagos.
   Palabras clave: "mandé a producción", "se aprobó", "ya se mandó a hacer", "acordamos"

4. registro_movilidad
   CUÁNDO APLICA: Cuando describes trayectos, pasajes, rutas, gastos de transporte.
   Palabras clave: "fui a", "gasté en pasaje", "de X a Y", "metropolitano", "combi", "taxi"

ESTRUCTURAS JSON POR TIPO:

1. solicitud_cotizacion:
{
  "tipo_solicitud": "solicitud_cotizacion",
  "cliente": null,
  "solicitado_por": null,
  "productos": [
    {
      "descripcion": null,
      "cantidad": null,
      "dimensiones": null,
      "observaciones": null
    }
  ],
  "fecha_solicitud": null
}

EJEMPLO:
Input: "Angélica está mandando a cotizar 300 bolsas de yute de 50 por 70 para el cliente TYC"
Output:
{
  "tipo_solicitud": "solicitud_cotizacion",
  "cliente": "TYC",
  "solicitado_por": "Angélica",
  "productos": [
    {
      "descripcion": "bolsas de yute",
      "cantidad": 300,
      "dimensiones": "50x70",
      "observaciones": null
    }
  ],
  "fecha_solicitud": null
}

2. recepcion_cotizacion:
{
  "tipo_solicitud": "recepcion_cotizacion",
  "cliente": null,
  "proveedor": null,
  "producto": null,
  "precio_unitario": null,
  "precio_total": null,
  "incluye_igv": null,
  "validez_cotizacion": null,
  "fecha_recepcion": null
}

3. orden_produccion:
{
  "tipo_solicitud": "orden_produccion",
  "cliente": null,
  "proveedor": null,
  "producto": null,
  "precio_total": null,
  "incluye_igv": null,
  "condiciones_pago": {
    "adelanto": null,
    "porcentaje_adelanto": null,
    "saldo": null,
    "forma_pago": null
  },
  "fecha_orden": null
}

EJEMPLO:
Input: "Ya se mandó a producción con el proveedor Hugo, el precio es 2500 soles, no incluye IGV, se paga 50% de adelanto y el resto al final"
Output:
{
  "tipo_solicitud": "orden_produccion",
  "cliente": null,
  "proveedor": "Hugo",
  "producto": null,
  "precio_total": 2500,
  "incluye_igv": false,
  "condiciones_pago": {
    "adelanto": 1250,
    "porcentaje_adelanto": 50,
    "saldo": 1250,
    "forma_pago": "al final"
  },
  "fecha_orden": null
}

4. registro_movilidad:
{
  "tipo_solicitud": "registro_movilidad",
  "fecha": null,
  "motivo": null,
  "cliente": null,
  "tramos": [
    {
      "origen": null,
      "destino": null,
      "medio_transporte": null,
      "costo": null
    }
  ],
  "costo_total": null
}

EJEMPLO:
Input: "Hoy viernes 5 de enero salí de oficina a Angamos, se gastó un sol. De Angamos a Estación Central en Metropolitano, 3.20. En Central recogí el pedido y lo llevé al cliente TYC."
Output:
{
  "tipo_solicitud": "registro_movilidad",
  "fecha": "2026-01-05",
  "motivo": "Recoger y entregar pedido",
  "cliente": "TYC",
  "tramos": [
    {
      "origen": "Oficina",
      "destino": "Estación Angamos",
      "medio_transporte": null,
      "costo": 1.00
    },
    {
      "origen": "Estación Angamos",
      "destino": "Estación Central",
      "medio_transporte": "Metropolitano",
      "costo": 3.20
    }
  ],
  "costo_total": 4.20
}

5. Si NO encaja en ninguno de los 4 tipos anteriores:
{
  "tipo_solicitud": "otro",
  "mensaje": "transcripción original del mensaje"
}

MENSAJE A PROCESAR:
{transcripcion}

RESPONDE ÚNICAMENTE CON EL JSON CORRESPONDIENTE (sin markdown, sin explicaciones):`;

/**
 * Extract entities from transcribed text using DeepSeek
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

    // Convert to our type structure using the new format
    const resultado = convertToResultado(parsed);

    return {
      resultado,
      confianza: 85, // Default confidence for new system
      camposFaltantes: [],
      transcripcionOriginal: transcription,
    };
  } catch (error) {
    console.error('[Extraction] Error:', error);

    // Return a fallback "otro" type
    return {
      resultado: {
        tipo: 'otro',
        tipo_solicitud: 'otro',
        mensaje: transcription,
      },
      confianza: 0,
      camposFaltantes: ['error_parsing'],
      transcripcionOriginal: transcription,
    };
  }
}

/**
 * Convert parsed data to typed ResultadoExtraccion (Nuevo Sistema)
 */
function convertToResultado(
  parsed: Record<string, unknown>
): ResultadoExtraccion {
  const tipoSolicitud = parsed.tipo_solicitud as string;

  switch (tipoSolicitud) {
    case 'solicitud_cotizacion':
      return {
        tipo: 'solicitud_cotizacion',
        tipo_solicitud: 'solicitud_cotizacion',
        cliente: parsed.cliente as string | null,
        solicitado_por: parsed.solicitado_por as string | null,
        productos: (parsed.productos as Array<{
          descripcion: string | null;
          cantidad: number | null;
          dimensiones: string | null;
          observaciones: string | null;
        }>) || [],
        fecha_solicitud: parsed.fecha_solicitud as string | null,
      };

    case 'recepcion_cotizacion':
      return {
        tipo: 'recepcion_cotizacion',
        tipo_solicitud: 'recepcion_cotizacion',
        cliente: parsed.cliente as string | null,
        proveedor: parsed.proveedor as string | null,
        producto: parsed.producto as string | null,
        precio_unitario: parsed.precio_unitario as number | null,
        precio_total: parsed.precio_total as number | null,
        incluye_igv: parsed.incluye_igv as boolean | null,
        validez_cotizacion: parsed.validez_cotizacion as string | null,
        fecha_recepcion: parsed.fecha_recepcion as string | null,
      };

    case 'orden_produccion':
      return {
        tipo: 'orden_produccion',
        tipo_solicitud: 'orden_produccion',
        cliente: parsed.cliente as string | null,
        proveedor: parsed.proveedor as string | null,
        producto: parsed.producto as string | null,
        precio_total: parsed.precio_total as number | null,
        incluye_igv: parsed.incluye_igv as boolean | null,
        condiciones_pago: (parsed.condiciones_pago as {
          adelanto: number | null;
          porcentaje_adelanto: number | null;
          saldo: number | null;
          forma_pago: string | null;
        }) || {
          adelanto: null,
          porcentaje_adelanto: null,
          saldo: null,
          forma_pago: null,
        },
        fecha_orden: parsed.fecha_orden as string | null,
      };

    case 'registro_movilidad':
      return {
        tipo: 'registro_movilidad',
        tipo_solicitud: 'registro_movilidad',
        fecha: parsed.fecha as string | null,
        motivo: parsed.motivo as string | null,
        cliente: parsed.cliente as string | null,
        tramos: (parsed.tramos as Array<{
          origen: string | null;
          destino: string | null;
          medio_transporte: string | null;
          costo: number | null;
        }>) || [],
        costo_total: parsed.costo_total as number | null,
      };

    default:
      return {
        tipo: 'otro',
        tipo_solicitud: 'otro',
        mensaje: parsed.mensaje as string || '',
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
