# VISION.md - Creaactivo Logistics Intelligence System

## Hacia un Sistema de Process Intelligence para Logística

---

## 1. INSPIRACIÓN: ¿Qué es Salonus/Celonis?

Salonus (Celonis) es una plataforma de **Process Intelligence (PI)** que:

1. **Crea un "Digital Twin" vivo del negocio** - Una representación digital en tiempo real de cómo funcionan los procesos reales
2. **Process Mining** - Analiza datos de sistemas para descubrir cómo realmente funcionan los procesos (vs cómo deberían funcionar)
3. **AI Agents con contexto de negocio** - Agentes de IA que entienden TU negocio específico, no respuestas genéricas
4. **Integración multi-sistema** - Conecta ERP, CRM, TMS, WMS y más en una vista unificada
5. **Knowledge Models** - KPIs, benchmarks, reglas de negocio codificadas
6. **Orchestration Engine** - Coordina workflows entre humanos, IA y automatizaciones
7. **Solution Suites** - Paquetes pre-construidos para dominios específicos (supply chain, finance, etc.)

### La frase clave de Salonus:
> "No hay AI sin PI (Process Intelligence)" - La IA necesita el contexto de cómo tu negocio funciona únicamente para ser relevante y efectiva.

---

## 2. ESTADO ACTUAL: ¿Qué tenemos hoy?

### 2.1 Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CREAACTIVO LOGISTICS INTELLIGENCE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   WhatsApp   │───▶│   Whisper    │───▶│   Claude     │───▶│  Supabase  │ │
│  │  (Captura)   │    │ (Transcribe) │    │ (Extracción) │    │  (Storage) │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘ │
│         │                                                           │        │
│         │                                                           ▼        │
│         │            ┌──────────────────────────────────────────────────┐   │
│         │            │              DASHBOARD REACT                      │   │
│         │            │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │   │
│         │            │  │Día a Día│ │  PKLs   │ │ Costos  │ │Clientes │ │   │
│         │            │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │   │
│         │            └──────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    EVENT LOGGER (Celonis-Style)                       │   │
│  │  - JSONL traces con: caseId, activity, timestamp, resource            │   │
│  │  - Process states siguiendo Happy Path                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Módulos Implementados

#### A) Captura de Datos (WhatsApp Bot)
- **Input**: Mensajes de voz y texto vía WhatsApp
- **Transcripción**: Whisper local (faster-whisper)
- **Correcciones**: Sistema de correcciones específicas del negocio (tic→TYC, etc.)
- **Extracción**: Claude API para extraer entidades estructuradas
- **Clasificación**: Tipos de mensaje (acuerdo_produccion, movimiento_movilidad, etc.)

#### B) Dashboard Web (React + Tailwind)
| Módulo | Estado | Descripción |
|--------|--------|-------------|
| **Día a Día** | ✅ Completo | Vista diaria de eventos con calendario interactivo |
| **PKLs** | ✅ Completo | Gestión de procesos logísticos con tasks, costos, proveedores |
| **Costos** | ✅ Básico | Visualización de gastos por PKL |
| **Clientes** | ✅ Básico | Gestión de clientes |
| **Proveedores** | ✅ Básico | Gestión de proveedores con cotizaciones |
| **Movimientos** | ✅ Completo | Entregas, recojos, traslados |
| **Rendiciones** | ✅ Completo | Gastos, pagos, adelantos |
| **Producciones** | ✅ Completo | Órdenes de producción |
| **Compras** | ✅ Nuevo | Registro de compras con IGV |

#### C) Modelo de Datos (PKL v2.0)
```typescript
PKL = {
    pkl_id: "PKL-2026-0001",
    clasificacion: { tipo_operacion, area },
    cliente: { nombre, contacto },
    origen: { canal, descripcion_inicial, fecha_solicitud },
    productos: [],
    proveedores: [{ nombre, cotizaciones[], elegido }],
    estado: { actual, historial[] },
    tasks: [{ tipo, nombre, estado, costo, fecha_completado }],
    costos: { detalle[], moneda },
    alertas: { dias_sin_actividad },
    cierre: { evidencias[] }
}
```

#### D) Event Logger (Celonis-Style)
- **Formato**: JSONL con ontología Celonis
- **Campos**: caseId, activity, timestamp, resource, processState
- **Session Continuity**: 30 minutos de ventana
- **Happy Path**: Cotización → Aprobado → Producción → Listo → Entregado → Cerrado

#### E) Process Graph (NetworkX + PyVis)
- **Nodos**: Estados (amarillo), Casos (azul), Recursos (verde), Clientes (púrpura)
- **Visualización**: HTML interactivo
- **Layout**: Jerárquico Left-to-Right

### 2.3 Tipos de Eventos Capturados

| Categoría | Subtipos | Datos Capturados |
|-----------|----------|------------------|
| **Cotización** | Nueva, Revisión | Cliente, proveedor, productos[], precio, IGV |
| **Movimiento** | Traslado, Entrega, Recojo, Instalación | Origen, destino, costo_movilidad |
| **Rendición** | Pago proveedor, Adelanto, Movilidad, Viáticos | Monto, comprobante |
| **Producción** | Impresión, Serigrafía, Confección, Bordado, etc. | Proveedor, producto, estado |
| **Compra** | Material, Insumo, Herramienta, Equipo, Oficina | Monto, IGV |
| **Coordinación** | Proveedor, Cliente, Motorizado, Llamada | Descripción |

---

## 3. GAP ANALYSIS: ¿Qué nos falta para ser como Salonus?

### 3.1 Matriz de Comparación

| Capacidad Salonus | Tenemos | Falta | Prioridad |
|-------------------|---------|-------|-----------|
| Data Ingestion multi-sistema | ⚠️ Solo WhatsApp | Conectores ERP, Excel, APIs | ALTA |
| Process Intelligence Graph | ⚠️ Básico | Relaciones complejas, KPIs dinámicos | ALTA |
| AI Agents con contexto | ⚠️ Claude extrae | Agentes que ACTÚAN, no solo extraen | ALTA |
| Process Mining | ⚠️ Visualización básica | Detección de cuellos de botella, variantes | MEDIA |
| Knowledge Models | ❌ No | Reglas de negocio, benchmarks | MEDIA |
| Process Query Language | ❌ No | Lenguaje para consultas de proceso | MEDIA |
| Orchestration Engine | ❌ No | Automatización de workflows | BAJA |
| Solution Suites | ⚠️ Ad-hoc | Paquetes pre-configurados | BAJA |
| Multi-tenant / Enterprise | ❌ No | Múltiples usuarios/empresas | FUTURA |

### 3.2 Gaps Críticos Detallados

#### GAP 1: Data Ingestion Limitado
**Actual**: Solo WhatsApp como entrada
**Necesario**:
- Importación de Excel/CSV (cotizaciones de proveedores)
- Conexión a sistemas de facturación
- APIs de proveedores de transporte
- Scraping de emails de confirmación

#### GAP 2: Process Intelligence Superficial
**Actual**: Grafo de proceso básico con nodos y estados
**Necesario**:
- **Object-Centric Process Mining**: No solo "casos", sino objetos que interactúan (Pedido ↔ Proveedor ↔ Producción)
- **Conformance Checking**: ¿Mis procesos siguen el modelo ideal?
- **Variant Analysis**: ¿Cuántas variantes de mi proceso existen?
- **Bottleneck Detection**: ¿Dónde se atoran los procesos?

#### GAP 3: AI que Actúa vs AI que Extrae
**Actual**: Claude extrae información de mensajes
**Necesario**:
- AI Agent que PREDICE: "Este PKL tiene 80% de riesgo de retraso"
- AI Agent que RECOMIENDA: "Contacta a proveedor X, tiene mejor tiempo de entrega"
- AI Agent que AUTOMATIZA: "Envié recordatorio automático al proveedor"

#### GAP 4: Knowledge Models Inexistentes
**Actual**: Lógica hardcodeada en el código
**Necesario**:
- **KPIs Definidos**: Tiempo promedio cotización→producción, costo por PKL, etc.
- **Benchmarks**: ¿Cómo me comparo con mis propios históricos?
- **Reglas de Negocio**: "Si cotización > S/5000, requiere aprobación"
- **SLAs**: "Entrega debe ser máximo 48h después de producción lista"

#### GAP 5: Sin Alertas Proactivas
**Actual**: Usuario debe revisar el dashboard
**Necesario**:
- Alertas push: "PKL-2026-0045 lleva 3 días sin actividad"
- Predicciones: "5 PKLs tienen riesgo de no cumplir fecha de entrega"
- Anomalías: "Proveedor X está tardando 40% más que su promedio"

---

## 4. ROADMAP DE EVOLUCIÓN

### FASE 1: Foundations (Q1 2026) - "Data Completeness"

#### 1.1 Multi-Channel Data Ingestion
```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐ │
│  │WhatsApp │  │  Excel  │  │  Email  │  │  API    │  │Manual │ │
│  │  Bot    │  │ Import  │  │ Parser  │  │Providers│  │ Entry │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └───┬───┘ │
│       │            │            │            │            │     │
│       └────────────┴────────────┴────────────┴────────────┘     │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  UNIFIED EVENT  │                          │
│                    │     STREAM      │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

**Entregables**:
- [ ] Importador de Excel para cotizaciones masivas
- [ ] Parser de emails de confirmación de proveedores
- [ ] Formulario web para entrada manual rápida
- [ ] API REST para integraciones futuras

#### 1.2 Enhanced Process Graph
**Entregables**:
- [ ] Relaciones bidireccionales PKL ↔ Proveedor ↔ Cliente
- [ ] Timeline visual de eventos por PKL
- [ ] Cálculo automático de duraciones entre estados
- [ ] Exportación de métricas a CSV

---

### FASE 2: Intelligence (Q2 2026) - "Process Mining Real"

#### 2.1 Process Mining Features
```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESS MINING ENGINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Process    │    │  Conformance │    │  Bottleneck  │      │
│  │  Discovery   │    │   Checking   │    │  Detection   │      │
│  │              │    │              │    │              │      │
│  │ "Descubre    │    │ "Compara     │    │ "Encuentra   │      │
│  │  cómo fluyen │    │  real vs     │    │  donde se    │      │
│  │  realmente"  │    │  ideal"      │    │  atoran"     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Variant    │    │    Root      │    │    KPI       │      │
│  │   Analysis   │    │    Cause     │    │  Calculator  │      │
│  │              │    │   Analysis   │    │              │      │
│  │ "Cuántas     │    │ "Por qué     │    │ "Métricas    │      │
│  │  formas hay" │    │  falló"      │    │  en tiempo   │      │
│  │              │    │              │    │  real"       │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Entregables**:
- [ ] Descubrimiento automático de variantes de proceso
- [ ] Mapa de calor de tiempos entre estados
- [ ] Detección de loops y retrocesos
- [ ] Dashboard de KPIs en tiempo real

#### 2.2 Knowledge Models
**Entregables**:
- [ ] Definición de KPIs configurables por usuario
- [ ] Sistema de SLAs con alertas
- [ ] Benchmarks históricos automáticos
- [ ] Reglas de negocio editables (sin código)

---

### FASE 3: AI Agents (Q3 2026) - "Inteligencia Activa"

#### 3.1 Predictive Analytics
```
┌─────────────────────────────────────────────────────────────────┐
│                    AI AGENT LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PREDICTION ENGINE                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │ Delay Risk  │  │ Cost Risk   │  │ Quality     │      │  │
│  │  │ Predictor   │  │ Predictor   │  │ Predictor   │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  RECOMMENDATION ENGINE                    │  │
│  │  "Basado en histórico, el Proveedor A entrega 2 días     │  │
│  │   más rápido para este tipo de trabajo"                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ACTION ENGINE                          │  │
│  │  - Enviar recordatorios automáticos                      │  │
│  │  - Escalar PKLs en riesgo                                │  │
│  │  - Generar reportes automáticos                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Entregables**:
- [ ] Modelo de predicción de retrasos
- [ ] Sistema de recomendación de proveedores
- [ ] Chatbot interno con contexto de todos los PKLs
- [ ] Alertas predictivas vía WhatsApp

#### 3.2 Process Copilot
**Entregables**:
- [ ] Asistente que responde: "¿Cuáles PKLs están en riesgo?"
- [ ] Generación automática de reportes semanales
- [ ] Sugerencias de optimización de rutas/costos
- [ ] Detección de anomalías en gastos

---

### FASE 4: Automation (Q4 2026) - "Orchestration"

#### 4.1 Workflow Automation
**Entregables**:
- [ ] Workflows configurables (ej: "Si producción lista → notificar cliente")
- [ ] Integración con calendarios (Google Calendar)
- [ ] Automatización de seguimientos
- [ ] Escalamiento automático de issues

#### 4.2 Solution Suite: Logística Perú
**Entregables**:
- [ ] Templates pre-configurados para tipos de trabajo comunes
- [ ] Catálogo de proveedores con ratings automáticos
- [ ] Cálculo automático de IGV y documentos tributarios
- [ ] Reportes de cumplimiento SUNAT-ready

---

## 5. MÉTRICAS DE ÉXITO

### KPIs del Sistema
| Métrica | Actual | Meta Q4 2026 |
|---------|--------|--------------|
| Tiempo captura evento | 2 min (manual) | 10 seg (voz) |
| PKLs gestionados/mes | ~50 | 200+ |
| % eventos con costo registrado | 60% | 95% |
| Tiempo promedio cotización→entrega | No medido | Dashboard en tiempo real |
| Alertas proactivas | 0 | 10+/semana |
| Predicciones de riesgo | 0 | Modelo funcional |

### KPIs de Negocio (que el sistema debe medir)
- **Lead Time**: Tiempo desde solicitud hasta entrega
- **On-Time Delivery Rate**: % de entregas a tiempo
- **Cost per PKL**: Costo promedio por proceso
- **Supplier Performance**: Rating de proveedores por tiempo/calidad/costo
- **Process Conformance**: % de PKLs que siguen el happy path

---

## 6. PRINCIPIOS DE DISEÑO

### 6.1 "No AI sin PI"
Antes de agregar más IA, debemos tener datos de proceso completos y limpios.

### 6.2 "Voice-First pero no Voice-Only"
WhatsApp/voz es la entrada principal, pero no la única. El dashboard es igualmente importante.

### 6.3 "Contexto es Rey"
Toda funcionalidad de IA debe tener acceso al contexto completo del negocio:
- Historial del cliente
- Performance del proveedor
- Patrones estacionales
- Costos históricos

### 6.4 "Actionable Insights"
No basta con mostrar datos. Cada insight debe venir con una acción recomendada.

### 6.5 "Progressive Disclosure"
- Usuario básico: Vista simple del día
- Usuario avanzado: Analytics profundos
- Admin: Configuración de reglas y modelos

---

## 7. STACK TECNOLÓGICO PROPUESTO

### Actual
- **Frontend**: React + Tailwind + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **AI**: Claude API (extracción)
- **Voice**: Whisper local
- **Graphs**: NetworkX + PyVis

### Evolución Propuesta
| Capa | Actual | Propuesto |
|------|--------|-----------|
| Process Mining | PyVis básico | PM4Py + Custom engine |
| ML/Predictions | - | Python (scikit-learn) → Supabase Edge Functions |
| Orchestration | - | Temporal.io o n8n |
| Alertas | - | Supabase Realtime + WhatsApp API |
| Knowledge Base | Hardcoded | Supabase + Vector embeddings |

---

## 8. PRÓXIMOS PASOS INMEDIATOS

### Esta Semana
1. [ ] Definir los 5 KPIs más importantes para el negocio
2. [ ] Documentar el "Happy Path" ideal de un PKL
3. [ ] Identificar los 3 cuellos de botella más frecuentes

### Este Mes
1. [ ] Implementar cálculo automático de Lead Time por PKL
2. [ ] Agregar alertas de "PKL sin actividad en X días"
3. [ ] Crear dashboard de KPIs básicos

### Este Trimestre
1. [ ] Importador de Excel para cotizaciones
2. [ ] Sistema de SLAs configurable
3. [ ] Primer modelo predictivo (riesgo de retraso)

---

## 9. CONCLUSIÓN

El sistema actual es una **base sólida** para captura de eventos logísticos. Tenemos:
- ✅ Captura voice-first funcional
- ✅ Modelo de datos flexible (PKL v2.0)
- ✅ Dashboard operativo
- ✅ Event logging estilo Celonis

Para convertirnos en una plataforma de **Process Intelligence** como Salonus, necesitamos:
1. **Más fuentes de datos** (no solo WhatsApp)
2. **Process Mining real** (variantes, cuellos de botella, conformance)
3. **Knowledge Models** (KPIs, SLAs, reglas de negocio)
4. **AI que actúa** (predicciones, recomendaciones, automatización)
5. **Alertas proactivas** (no esperar que el usuario revise)

La clave es que **PI (Process Intelligence) habilita la AI**. Sin entender cómo funciona tu proceso, la IA no puede ayudarte de forma específica.

---

*Documento creado: 2026-01-25*
*Última actualización: 2026-01-25*
*Versión: 1.0*
