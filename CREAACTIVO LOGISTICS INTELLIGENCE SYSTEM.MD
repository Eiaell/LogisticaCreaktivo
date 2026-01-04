# CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
## Technical Specification Document v1.0

Proyecto Sistema de Captura y Consulta de Decisiones Logísticas  
Autor Flaco Huber  
Fecha Enero 2026  
Repositorio httpsgithub.comEiaellLogistica-

---

## 1. RESUMEN EJECUTIVO

### 1.1 Problema
El conocimiento operativo de logística en Creaactivo existe exclusivamente en la cabeza del coordinador logístico y en conversaciones dispersas de WhatsApp. No hay sistema de registro que capture
- Acuerdos con proveedores (precios, tiempos, condiciones)
- Razones detrás de decisiones excepcionales
- Historial consultable de operaciones pasadas
- Reportes de movilidad estructurados

### 1.2 Solución
Un bot de WhatsApp que
1. Recibe audios del coordinador logístico capturando información operativa
2. Transcribe y estructura la información automáticamente
3. Persiste en Google Drive como fuente de verdad
4. Responde consultas por voz con respuestas en texto
5. Genera reportes de movilidad y pendientes

### 1.3 Usuario Principal
- Nombre Flaco (Coordinador de Logística)
- Contexto Opera desde campo usando WhatsApp en celular personal
- Modo de interacción Principalmente por voz (maneja frecuentemente)

---

## 2. CONTEXTO OPERATIVO

### 2.1 Estructura Organizacional
```
Natalia (Gerencia) ─── Poder de veto absoluto, aprueba reembolsos
    │
    ├── Angélica (Vendedora) ─── Negocia con clientes, aprueba gastos extras
    │
    ├── Johana (Vendedora) ─── Negocia con clientes, aprueba gastos extras  
    │
    └── Flaco (Logística) ─── Ejecuta, coordina proveedores, gestiona entregas
```

### 2.2 Flujo de Autorización de Gastos
```
Necesidad de motorizadotaxi
         │
         ▼
Flaco solicita a vendedora (WhatsApp)
         │
         ▼
Vendedora aprueba ◄─── CHECKPOINT OBLIGATORIO
         │
         ▼
Flaco adelanta dinero personal
         │
         ▼
Se ejecuta el servicio (inDrive)
         │
         ▼
Flaco reporta gasto a Natalia
         │
         ▼
Natalia reembolsa
         │
         ▼
Vendedora carga al cliente en presupuesto
```

### 2.3 Horizonte de Planificación
- Visibilidad Casi cero - se sabe qué hacer el mismo día
- Fuente de prioridades WhatsApp entre vendedoras y Flaco
- Regla de override Natalia  AngélicaJohana  Orden de llegada

---

## 3. MODELO DE DATOS

### 3.1 Entidad PEDIDO (Unidad Central)
```typescript
interface Pedido {
  id string;                     Generado automáticamente
  cliente string;                Nombre del cliente (ej DHL, Inmobiliaria X)
  vendedora Angélica  Johana  Natalia;
  descripcion string;            Qué se está produciendo
  estado EstadoPedido;
  fechaCompromiso Date;          Cuándo debe entregarse
  rqNumero string;              Número de RQ cuando existe
  createdAt Date;
  updatedAt Date;
  notas string[];                Historial de notascambios
}

type EstadoPedido = 
   cotizacion         Esperando aprobación del cliente
   aprobado           Cliente confirmó, listo para producción
   en_produccion      Con el proveedor
   listo_recoger      Proveedor avisó que terminó
   en_campo           Flaco salió a recogerentregar
   entregado          Cliente recibió
   cerrado;           RQ completo
```

### 3.2 Entidad PROVEEDOR
```typescript
interface Proveedor {
  id string;
  nombre string;                 Nombre o alias (ej Hugo, Imprenta San Juan)
  contacto string;              TeléfonoWhatsApp
  especialidad string[];         Qué produce (ej [polos, bordados])
  condicionesPago string;        Ej 50% adelanto, 50% entrega
  factorDemora number;           Días extra a considerar (0 = cumple, 2 = pedir 2 días antes)
  historialPrecios HistorialPrecio[];
  historialTiempos HistorialTiempo[];
  notas string[];
}

interface HistorialPrecio {
  fecha Date;
  producto string;
  cantidad number;
  precioUnitario number;
  precioTotal number;
}

interface HistorialTiempo {
  fecha Date;
  producto string;
  diasPrometidos number;
  diasReales number;
}
```

### 3.3 Entidad ACUERDO_PRODUCCION
```typescript
interface AcuerdoProduccion {
  id string;
  pedidoId string;               Referencia al pedido
  proveedorId string;            Referencia al proveedor
  producto string;               Descripción del producto
  cantidad number;
  especificaciones string;       Ej bordado full color, tallas SML 8 cu
  costoTotal number;
  adelanto number;               Monto del adelanto
  porcentajeAdelanto number;     Ej 50
  fechaAcuerdo Date;
  fechaPrometida Date;           Cuándo dijo el proveedor que estará listo
  fechaRealEntrega Date;        Cuándo realmente estuvo listo
  estado pendiente  listo  recogido  problema;
  audioOriginal string;         Referencia al audio de captura
}
```

### 3.4 Entidad MOVIMIENTO_MOVILIDAD
```typescript
interface MovimientoMovilidad {
  id string;
  fecha Date;
  origen string;                 Ej Oficina, Estación Angamos
  destino string;                Ej La Victoria, San Isidro
  costo number;                  En soles
  tipoTransporte metro  combi  taxi  carro_propio;
  proposito string;              Ej Recoger producción para Angélica - papelería
  pedidoId string;              Referencia opcional al pedido
  requiereAprobacion boolean;    True si es taxiinDrive
  aprobadoPor string;           Quién aprobó (si aplica)
}
```

### 3.5 Entidad GASTO_EXTRAORDINARIO
```typescript
interface GastoExtraordinario {
  id string;
  fecha Date;
  tipo motorizado  taxi  material  otro;
  monto number;
  descripcion string;
  pedidoId string;
  aprobadoPor string;            Vendedora que aprobó
  reembolsado boolean;
  fechaReembolso Date;
}
```

### 3.6 Matriz de Costos por Zona (Configuración)
```typescript
interface MatrizCostos {
  rutas {
    origen string;
    destino string;
    costoCombi number;           Costo estándar modo combi
    tiempoEstimado number;       Minutos en hora normal
    tiempoHoraPunta number;      Minutos en hora punta
  }[];
}

 Ejemplo de rutas frecuentes a precargar
const rutasFrecuentes = [
  { origen Oficina Miraflores, destino La Victoria, costoCombi 6.40, tiempoEstimado 40, tiempoHoraPunta 70 },
  { origen Oficina Miraflores, destino San Isidro, costoCombi 3.20, tiempoEstimado 15, tiempoHoraPunta 30 },
  { origen Oficina Miraflores, destino San Borja, costoCombi 4.50, tiempoEstimado 25, tiempoHoraPunta 45 },
  { origen Oficina Miraflores, destino Centro Lima, costoCombi 6.40, tiempoEstimado 50, tiempoHoraPunta 90 },
   ... agregar más según uso real
];
```

---

## 4. ARQUITECTURA DEL SISTEMA

### 4.1 Diagrama de Alto Nivel
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   WhatsApp      │     │   Bot Backend    │     │  Google Drive   │
│   (Usuario)     │────▶│   (Procesador)   │────▶│  (Persistencia) │
│                 │◀────│                  │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌──────────────────┐
        │               │  Whisper API     │
        │               │  (Transcripción) │
        │               └──────────────────┘
        │                       │
        │                       ▼
        │               ┌──────────────────┐
        │               │  Claude API      │
        │               │  (ExtracciónNLU)│
        │               └──────────────────┘
        │
        ▼
┌─────────────────┐
│  Recordatorio   │
│  Fin de Día     │
│  (Cron Job)     │
└─────────────────┘
```

### 4.2 Stack Tecnológico Propuesto
```yaml
WhatsApp Integration
  - whatsapp-web.js (librería Node.js)
  - Alternativa Baileys (más ligero)
  
Backend
  - Node.js  TypeScript
  - Express o Fastify para API interna
  
Transcripción
  - OpenAI Whisper API
  - Alternativa Whisper local (más privado, más lento)
  
Procesamiento de Lenguaje
  - Claude API (Anthropic)
  - Para extracción de entidades, clasificación de intención, generación de respuestas
  
Persistencia
  - Google Drive API
  - Formato JSON files o Google Sheets
  - Estructura de carpetas en Drive
  
Programación de Tareas
  - node-cron para recordatorio de fin de día
  
Hosting
  - Servidor local (Raspberry Pi  PC siempre encendido)
  - O VPS económico (DigitalOcean, Hetzner)
```

### 4.3 Estructura de Google Drive
```
📁 Logistica_Creaactivo
├── 📁 data
│   ├── pedidos.json
│   ├── proveedores.json
│   ├── acuerdos.json
│   ├── movilidad.json
│   └── gastos.json
├── 📁 audios
│   └── 📁 2026-01
│       ├── 2026-01-15_143022_acuerdo.ogg
│       └── 2026-01-15_180500_movilidad.ogg
├── 📁 reportes
│   └── 📁 movilidad
│       ├── 2026-01-15_movilidad.pdf
│       └── 2026-01-16_movilidad.pdf
└── 📁 config
    ├── matriz_costos.json
    └── proveedores_conocidos.json
```

---

## 5. FLUJOS DE INTERACCIÓN

### 5.1 Flujo Captura de Acuerdo con Proveedor

Trigger Usuario envía audio al bot

Input de ejemplo (audio transcrito)
 Se mandó a producción 24 polos con Hugo, pago de adelanto 50% con 250 soles, bordado full color, tallas S M L ocho de cada una, lo tendrá listo para el jueves 3, para el cliente DHL

Procesamiento
1. Whisper transcribe audio → texto
2. Claude extrae entidades
```json
{
  tipo acuerdo_produccion,
  proveedor Hugo,
  producto polos,
  cantidad 24,
  especificaciones bordado full color, tallas SML, 8 de cada una,
  adelanto 250,
  porcentajeAdelanto 50,
  costoTotal 500,
  fechaEntrega 2026-01-03,
  cliente DHL
}
```
3. Sistema buscacrea proveedor Hugo
4. Sistema buscacrea pedido para DHL
5. Sistema crea AcuerdoProduccion vinculado
6. Guarda audio original como referencia

Output (texto a WhatsApp)
```
✅ Registrado
• 24 polos bordados con Hugo
• Adelanto S. 250 (50%)
• Entrega Jueves 3 enero
• Cliente DHL

¿Algo más
```

### 5.2 Flujo Consulta de Historial

Trigger Usuario envía audio con pregunta

Input de ejemplo (audio transcrito)
 ¿Cuánto me cobró Hugo la última vez por polos bordados

Procesamiento
1. Whisper transcribe
2. Claude clasifica intención `consulta_historial_proveedor`
3. Sistema busca en historialPrecios de proveedor Hugo filtrando por polos
4. Claude genera respuesta natural

Output
```
Hugo te cobró S. 500 por 24 polos bordados el 15 de diciembre (S. 20.83 cu). Antes de eso, el 3 de noviembre cobró S. 450 por 20 polos (S. 22.50 cu).
```

### 5.3 Flujo Registro de Movilidad

Trigger Usuario envía audio describiendo movimiento

Input de ejemplo
 Llegué a La Victoria, 3.20 en metro, vine a recoger telas para el pedido de la inmobiliaria

Procesamiento
1. Transcripción
2. Extracción
```json
{
  tipo movimiento_movilidad,
  destino La Victoria,
  costo 3.20,
  tipoTransporte metro,
  proposito recoger telas para pedido inmobiliaria
}
```
3. Sistema infiere origen del último movimiento registrado
4. Vincula con pedido si encuentra match

Output
```
📍 Registrado Oficina → La Victoria
💰 S. 3.20 (metro)
📦 Recojo telas - Inmobiliaria
```

### 5.4 Flujo Vista de Pendientes del Día

Trigger Usuario pregunta qué tiene pendiente

Input de ejemplo
 ¿Qué tengo pendiente hoy

Procesamiento
1. Sistema filtra
   - Acuerdos con `fechaPrometida = hoy` y `estado = pendiente`
   - Pedidos con `estado = listo_recoger`
   - Pedidos con `estado = aprobado` y `fechaCompromiso` cercana
2. Ordena por ventana horaria  urgencia  cercanía (si hay ubicación)

Output
```
📋 Pendientes hoy (15 enero)

RECOGER
• Hugo (San Juan de Lurigancho) - 24 polos DHL
• Imprenta Central - Volantes Inmobiliaria X

ENTREGAR
• DHL San Isidro - Merchandising (prometido hoy)

PRODUCCIÓN (vigilar)
• Proveedor telas - debe avisar hoy o mañana
```

### 5.5 Flujo Recordatorio de Fin de Día

Trigger Cron job a las 530 PM

Mensaje automático del bot
```
🕐 Resumen del día - ¿Me faltó algo

Registré hoy
• 2 acuerdos con proveedores
• 4 movimientos de movilidad
• 1 entrega completada

¿Hubo algo más que no capturé Cuéntame en un audio.
```

### 5.6 Flujo Generación de Reporte de Movilidad

Trigger Usuario pide reporte o automático a fin de día

Input
 Dame el reporte de movilidad de hoy

Output PDF o texto formateado con
```
REPORTE DE MOVILIDAD - 15 Enero 2026
Coordinador Flaco

 #  Origen               Destino          Costo   Motivo                          
-----------------------------------------------------------------------------------
 1  Oficina Miraflores   San Isidro       S. 3.20  Entrega DHL merchandising      
 2  San Isidro           La Victoria      S. 3.20  Recojo telas Inmobiliaria      
 3  La Victoria          Centro Lima      S. 3.20  Recojo producción Hugo         
 4  Centro Lima          Oficina          S. 3.20  Retorno                        

TOTAL S. 12.80

---
Aprobado por _____________
Fecha _____________
```

---

## 6. PROCESAMIENTO DE LENGUAJE NATURAL

### 6.1 Prompt de Extracción de Entidades
```markdown
Eres un asistente de logística. Extrae información estructurada del siguiente texto transcrito de un audio.

El usuario es un coordinador logístico en Lima, Perú. Trabaja con proveedores de materiales promocionales (polos, impresiones, telas, etc.).

VOCABULARIO COMÚN
- Mandé a producción = se hizo un pedido a proveedor
- Adelanto = pago parcial inicial (usualmente 50%)
- Hugo, Carmen, etc. = nombres de proveedores frecuentes
- DHL, Inmobiliaria X = nombres de clientes

TEXTO A PROCESAR
{transcripcion}

EXTRAE en JSON
{
  tipo acuerdo_produccion  consulta  movimiento_movilidad  cambio_estado  otro,
  entidades { ... según el tipo ... },
  confianza 0-100,
  campos_faltantes [lista de campos importantes que no se mencionaron]
}
```

### 6.2 Prompt de Respuesta a Consultas
```markdown
Eres el asistente de logística de Flaco. Responde de forma concisa y útil.

CONTEXTO
- Usuario consulta desde WhatsApp mientras trabaja en campo
- Prefiere respuestas cortas y directas
- Usa soles (S.) como moneda

DATOS DISPONIBLES
{datos_relevantes_json}

CONSULTA DEL USUARIO
{consulta}

Responde en texto plano (no markdown). Sé directo. Si no tienes la información, dilo claramente.
```

---

## 7. INTEGRACIONES

### 7.1 WhatsApp Web.js - Configuración Básica
```typescript
 Ejemplo de estructura inicial
import { Client, LocalAuth, Message } from 'whatsapp-web.js';

const client = new Client({
  authStrategy new LocalAuth(),
  puppeteer {
    headless true,
    args ['--no-sandbox']
  }
});

client.on('message', async (msg Message) = {
   Solo procesar mensajes del número autorizado
  if (msg.from !== FLACO_NUMERO) return;
  
  if (msg.hasMedia && msg.type === 'ptt') {
     Procesar audio
    const media = await msg.downloadMedia();
    await processAudio(media, msg);
  } else if (msg.body) {
     Procesar texto
    await processText(msg.body, msg);
  }
});
```

### 7.2 Google Drive API - Operaciones Básicas
```typescript
 Operaciones necesarias
interface DriveOperations {
   Leer archivo JSON
  readJSON(filename string) Promiseany;
  
   Escribiractualizar archivo JSON  
  writeJSON(filename string, data any) Promisevoid;
  
   Subir archivo de audio
  uploadAudio(buffer Buffer, filename string) Promisestring;
  
   Generar y subir PDF
  uploadPDF(content Buffer, filename string) Promisestring;
}
```

### 7.3 Whisper API - Transcripción
```typescript
async function transcribeAudio(audioBuffer Buffer) Promisestring {
  const formData = new FormData();
  formData.append('file', audioBuffer, 'audio.ogg');
  formData.append('model', 'whisper-1');
  formData.append('language', 'es');
  
  const response = await fetch('httpsapi.openai.comv1audiotranscriptions', {
    method 'POST',
    headers { 'Authorization' `Bearer ${OPENAI_API_KEY}` },
    body formData
  });
  
  const result = await response.json();
  return result.text;
}
```

---

## 8. REGLAS DE NEGOCIO

### 8.1 Priorización de Entregas
```
PRIORIDAD (de mayor a menor)
1. Ventana horaria dura (cliente solo recibe hasta X hora)
2. Urgencia declarada por Natalia
3. Urgencia declarada por vendedora
4. Cercanía geográfica al punto actual
5. Orden de llegada del pedido
```

### 8.2 Escalamiento a Motorizado
```
CONDICIONES para usar motorizadotaxi
1. Flaco no disponible (ya en otra entrega)
2. Carga pesada o voluminosa
3. Múltiples puntos en poco tiempo

REQUISITO OBLIGATORIO
- Aprobación previa de vendedora responsable
- Sin aprobación = Flaco asume costo personal
```

### 8.3 Cálculo de Costos de Movilidad
```
MODO COMBI (default)
- Usar matriz de costos predefinida
- Si ruta no existe en matriz solicitar costo al usuario

MODO TAXI (excepcional)
- Registrar costo real de inDrive
- Marcar que requirió aprobación
- Registrar quién aprobó
```

---

## 9. MVP - ALCANCE FASE 1

### 9.1 Funcionalidades Incluidas
- [ ] Bot WhatsApp funcionando con número de Flaco
- [ ] Recepción y transcripción de audios
- [ ] Extracción de acuerdos con proveedores
- [ ] Almacenamiento en Google Drive (JSON)
- [ ] Consultas básicas por voz (historial de precios)
- [ ] Vista de pendientes del día
- [ ] Recordatorio de fin de día

### 9.2 Funcionalidades Diferidas (Fase 2+)
- [ ] Registro detallado de movilidad paso a paso
- [ ] Generación automática de reporte de movilidad PDF
- [ ] Alertas de riesgo por proveedor
- [ ] Integración con otros usuarios (Angélica, Johana)
- [ ] Dashboard web para visualización
- [ ] Palabra clave asiste para reenvío de mensajes

### 9.3 Criterios de Éxito MVP
1. Flaco puede registrar un acuerdo con proveedor en 30 segundos
2. Flaco puede consultar precio histórico y obtener respuesta en 10 segundos
3. Sistema no pierde información (persistencia confiable)
4. Funciona estable por 1 semana sin intervención

---

## 10. CONFIGURACIÓN INICIAL REQUERIDA

### 10.1 APIs y Credenciales
```yaml
OpenAI
  - API Key para Whisper
  - Costo estimado ~$0.006minuto de audio

Anthropic
  - API Key para Claude
  - Costo estimado ~$0.01-0.03 por interacción

Google
  - Service Account con acceso a Drive
  - OAuth credentials para Drive API
```

### 10.2 Infraestructura
```yaml
Opción A - Local
  - PC o Raspberry Pi 4 siempre encendido
  - Node.js 18+
  - Conexión estable a internet
  
Opción B - VPS
  - DigitalOceanHetzner básico (~$5mes)
  - Ubuntu 22.04
  - Node.js 18+
```

### 10.3 Datos Iniciales a Cargar
```yaml
Proveedores conocidos
  - Hugo (polos, bordados)
  - [Agregar otros proveedores frecuentes]

Clientes frecuentes
  - DHL
  - [Agregar inmobiliarias y otros]

Matriz de costos
  - Rutas frecuentes Miraflores ↔ distritos de Lima
```

---

## 11. COMANDOS PARA CLAUDE CODE

### 11.1 Iniciar Proyecto
```bash
# Crear estructura de proyecto
mkdir logistica-creaactivo
cd logistica-creaactivo
npm init -y
npm install typescript whatsapp-web.js @anthropic-aisdk googleapis node-cron
npm install -D @typesnode ts-node
```

### 11.2 Estructura de Archivos Sugerida
```
logistica-creaactivo
├── src
│   ├── index.ts              # Entry point
│   ├── whatsapp
│   │   ├── client.ts         # WhatsApp client setup
│   │   └── handlers.ts       # Message handlers
│   ├── services
│   │   ├── transcription.ts  # Whisper integration
│   │   ├── extraction.ts     # Claude entity extraction
│   │   ├── storage.ts        # Google Drive operations
│   │   └── queries.ts        # Query processing
│   ├── models
│   │   └── types.ts          # TypeScript interfaces
│   └── config
│       └── constants.ts      # Configuration
├── data
│   └── matriz_costos.json    # Initial cost matrix
├── .env                      # API keys (gitignored)
├── tsconfig.json
└── package.json
```

### 11.3 Instrucción Principal para Claude Code
```
Construye un bot de WhatsApp para gestión logística según el spec LOGISTICA_SPEC.md.

PRIORIDAD DE IMPLEMENTACIÓN
1. Setup básico de WhatsApp Web.js con autenticación
2. Recepción de audios y transcripción con Whisper
3. Extracción de entidades con Claude API
4. Persistencia en archivos JSON locales (antes de Drive)
5. Consultas básicas de historial
6. Integración con Google Drive
7. Recordatorio de fin de día

NOTAS
- Usuario principal número de WhatsApp de Flaco
- Toda interacción es en español
- Respuestas deben ser concisas (usuario en campo)
- Audios son la entrada principal, texto la salida principal
```

---

## 12. GLOSARIO

 Término  Definición 
---------------------
 Pedido  Unidad de trabajo completa para un cliente 
 RQ  Control interno de Creaactivo (documento contable) 
 En campo  Flaco está fuera de oficina haciendo entregasrecojos 
 Motorizado  Servicio de delivery externo (inDrive) 
 Adelanto  Pago parcial inicial al proveedor (usualmente 50%) 
 Factor de demora  Días extra que se pide a un proveedor conocido por demorar 
 Modo combi  Cobrar movilidad a tarifa de transporte público 
 Modo taxi  Cobrar movilidad a tarifa real (requiere aprobación) 

---

## 13. NOTAS FINALES

### Decisiones de Diseño Clave
1. Audio como entrada principal El usuario está en campo manejando, no puede escribir
2. Texto como salida Puede leer cuando tenga un momento, no necesita audio
3. Google Drive como persistencia Familiar para el usuario, fácil de inspeccionar manualmente
4. MVP solo para Flaco Simplifica permisos y flujos, escalar después
5. Sin integración directa a WhatsApp de terceros Privacidad del número personal

### Riesgos Identificados
1. WhatsApp Web.js puede ser bloqueado Tener plan B (Telegram)
2. Costos de API pueden escalar Monitorear uso de Whisper y Claude
3. Dependencia de conectividad El bot necesita internet estable

### Métricas de Éxito Post-MVP
- Tiempo promedio de registro de acuerdo
- Consultas exitosas vs fallidas
- Información recuperada vs perdida
- Satisfacción del usuario (Flaco)

---

Documento generado a partir de entrevista de extracción de conocimiento tácito.
Listo para implementación con Claude Code.