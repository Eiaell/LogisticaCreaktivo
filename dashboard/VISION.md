# VISION.md - Creaactivo Logistics Intelligence System

## De Registro Operativo a Knowledge Graph Predictivo

---

## 1. NORTE: Que estamos construyendo?

Un sistema que transforma el caos diario de operaciones logisticas (entregas, compras, producciones, pagos, intervenciones) en un **Knowledge Graph** que:

1. **Registra** todo lo que pasa cada dia (hoy)
2. **Conecta** clientes, proveedores, productos, costos y tiempos en relaciones navegables (proximo paso)
3. **Detecta patrones** - que proveedor se retrasa, que cliente cuesta mas, que ruta es ineficiente
4. **Predice riesgos** - "este PKL tiene 80% de probabilidad de retraso basado en el proveedor y tipo de trabajo"
5. **Recomienda acciones** - "usa proveedor B, entrega 2 dias mas rapido para este tipo de producto"

### Inspiracion

- **Celonis/Salonus**: Process Mining - descubrir como realmente funcionan tus procesos vs como deberian funcionar
- **Neo4j Supply Chain (Katrina Nestit)**: Knowledge Graphs donde las relaciones entre entidades ya existen y se consultan en segundos, no se reconstruyen con JOINs cada vez. Risk scoring combinado: riesgo_ruta = riesgo_proveedor + riesgo_producto + riesgo_tiempo

### La frase clave:
> "En tablas no tenemos verbos entre los datos. En grafos, las relaciones SON los datos."
> -- Katrina Nestit, Supply Chain Risk Prediction with Graph Data Technology

---

## 2. ESTADO ACTUAL

### 2.1 Arquitectura

```
WhatsApp (voz/texto)
       |
       v
  Whisper + Claude --> Supabase (PostgreSQL)
                            |
                            v
                    Dashboard React
                    - Dia a Dia (calendario + eventos)
                    - PKLs (procesos logisticos)
                    - Costos, Clientes, Proveedores
                    - Movimientos, Rendiciones, Produccion
                    - Importacion JSON (resumen diario)
```

### 2.2 Modulos Implementados

| Modulo | Estado | Que hace |
|--------|--------|----------|
| Dia a Dia | Completo | Vista diaria de todos los eventos con calendario |
| PKLs | Completo | Proceso logistico completo con tasks, costos, proveedores |
| Movimientos | Completo | Entregas, recojos, traslados, instalaciones, intervenciones |
| Rendiciones | Completo | Gastos, pagos, movilidad, compras de materiales |
| Produccion | Completo | Ordenes de produccion con proveedor |
| Clientes | Basico | Gestion de clientes con fichas |
| Proveedores | Basico | Gestion con cotizaciones |
| Importacion JSON | Completo | Importar resumen diario completo en un paso |
| Event Logger | Basico | Trazas JSONL estilo Celonis |
| Process Graph | Basico | Visualizacion NetworkX + PyVis |

### 2.3 Modelo de Datos (PKL v2.0)

```
DIA (fecha)
  |
  +-- EVENTO (PKL-2026-0024)
  |     |-- cliente: "Grupo Lar"
  |     |-- tipo: intervencion / entrega / produccion / ...
  |     +-- TASKS:
  |           |-- [movimiento] Entrega volantes
  |           |-- [rendicion] Taxi S/.12
  |           +-- [produccion] Impresion banners
  |
  +-- EVENTO (PKL-2026-0025)
        |-- cliente: "TYC"
        +-- TASKS: ...
```

### 2.4 Tipos de Eventos Capturados

| Seccion | Tipos | Datos |
|---------|-------|-------|
| MOVIMIENTO_LOGISTICO | entrega, recojo, compra, traslado, instalacion, intervencion, supervision, mantenimiento, coordinacion | Cliente, proveedor, items, costo_movilidad |
| RENDICION_PAGO | movilidad, compra_material, adelanto_produccion, pago_saldo, gasto_extra, viaticos, caja_chica, caja_diaria | Monto, moneda, comprobante |
| PRODUCCION | orden_produccion | Proveedor, producto, cantidad, precio, especificaciones |

---

## 3. DONDE ESTAMOS vs DONDE QUEREMOS IR

### El viaje de datos a inteligencia

```
NIVEL 1: REGISTRO          <-- ESTAMOS AQUI
  "Hoy entregue volantes a Grupo Lar"

NIVEL 2: CONEXION           <-- PROXIMO PASO
  "Grupo Lar tiene 12 PKLs, usa 3 proveedores, gasto total S/.15,000"

NIVEL 3: PATRONES           <-- 30+ dias de data
  "Proveedor Dennis tarda en promedio 5 dias, vs Arteck que tarda 3"
  "Los lunes se gasta 40% mas en movilidad"

NIVEL 4: PREDICCION         <-- 90+ dias de data
  "Este PKL tiene 75% probabilidad de retrasarse"
  "Si usas proveedor B ahorras S/.200 y 2 dias"

NIVEL 5: AUTOMATIZACION     <-- 6+ meses de data
  "Envie recordatorio automatico al proveedor que lleva 3 dias sin responder"
  "Generé ruta optima para las 4 entregas de mañana"
```

### Gap Analysis Actualizado

| Capacidad | Tenemos | Falta | Impacto |
|-----------|---------|-------|---------|
| Registro diario de eventos | SI | Consistencia (llenar 30 dias) | CRITICO |
| Knowledge Graph (relaciones) | NO | Grafo Cliente-PKL-Proveedor-Costo | ALTO |
| Analytics basicos | NO | Gasto por cliente, tiempo por proveedor | ALTO |
| Risk scoring | NO | Puntaje de riesgo por PKL/proveedor | MEDIO |
| Alertas proactivas | NO | "PKL sin actividad en 3 dias" | MEDIO |
| Prediccion de retrasos | NO | Modelo basado en historico | FUTURO |
| Recomendacion de proveedores | NO | Ranking por tiempo/costo/calidad | FUTURO |
| Rutas alternativas | NO | Si proveedor X falla, usar Y | FUTURO |

---

## 4. ROADMAP (SIN FECHAS - POR LOGRO)

### FASE 1: "DATA COMPLETENESS" - Llenar el grafo

**Prerequisito para todo lo demas. Sin datos, no hay inteligencia.**

**Objetivo**: 30 dias consecutivos de operacion registrados.

Entregables:
- [x] Sistema de importacion JSON para resumen diario
- [x] Guia completa para generar JSON correcto (GUIA_IMPORTAR_JSON.md)
- [x] Tipos expandidos (intervencion, instalacion, supervision, mantenimiento)
- [ ] Importar los ultimos 30 dias de operacion
- [ ] Validar que cada dia tenga: movimientos + rendiciones + produccion completos
- [ ] Template de importacion rapida (llenar datos crudos, sistema formatea)

**Metrica de exito**: 30 dias con data completa en Supabase.

---

### FASE 2: "KNOWLEDGE GRAPH" - Conectar los datos

**Inspirado en**: Katrina Nestit - las relaciones entre entidades ya deben existir, no reconstruirse con queries.

**Objetivo**: Dashboard que muestre relaciones y metricas basicas.

```
KNOWLEDGE GRAPH LOGISTICO:

  [CLIENTE] --solicita--> [PKL] --produce--> [PROVEEDOR]
      |                     |                     |
      |                     |                     |
  gasto_total          costo_total         tiempo_promedio
  entregas_count       estado              retrasos_count
  pkls_activos         risk_score          calidad_score
```

Entregables:
- [ ] Vista "Analytics" en el dashboard con:
  - Gasto total por cliente (top 5)
  - Gasto en movilidad por semana/mes
  - Proveedores mas usados y su tiempo promedio
  - PKLs activos vs cerrados por mes
  - Costo promedio por tipo de operacion
- [ ] Ficha de cliente mejorada: historial completo, gasto acumulado, proveedores asociados
- [ ] Ficha de proveedor mejorada: tiempo promedio, PKLs atendidos, ranking
- [ ] Calculo automatico de Lead Time por PKL (fecha_solicitud -> fecha_cierre)

**Metrica de exito**: Puedes responder "cuanto me cuesta Grupo Lar al mes?" y "quien es mi proveedor mas rapido?" mirando el dashboard.

---

### FASE 3: "RISK INTELLIGENCE" - Detectar y predecir

**Inspirado en**: Risk scoring combinado de Katrina. Combinar multiples factores para un score unico.

**Objetivo**: Cada PKL abierto tiene un risk score visible.

```
RISK SCORE de un PKL:

  risk_score = risk_proveedor     (historial de retrasos: 0-100)
             + risk_complejidad   (num productos, num proveedores: 0-100)
             + risk_tiempo        (dias sin actividad vs promedio: 0-100)
             + risk_costo         (costo actual vs presupuesto: 0-100)
             ___________
             / 4 = SCORE FINAL (0-100)

  0-25:  BAJO     (verde)
  25-50: MEDIO    (amarillo)
  50-75: ALTO     (naranja)
  75-100: CRITICO (rojo)
```

Entregables:
- [ ] Risk score calculado automaticamente para cada PKL abierto
- [ ] Alertas: "PKL-0045 lleva 5 dias sin actividad" (push o en dashboard)
- [ ] Patron detection: "Los pedidos de impresion con Proveedor X tardan 40% mas que el promedio"
- [ ] Vista de "PKLs en riesgo" ordenados por score
- [ ] Historial de riesgo: como evoluciono el risk score de cada PKL

**Metrica de exito**: Ves un PKL en rojo y actuas ANTES de que se retrase, no despues.

---

### FASE 4: "DECISION ENGINE" - Recomendar y actuar

**Objetivo**: El sistema no solo muestra datos, te dice que hacer.

```
MOTOR DE DECISIONES:

  Situacion: Nuevo pedido de impresion para Grupo Lar, 5000 volantes A5

  Sistema dice:
  +--------------------------------------------------+
  | RECOMENDACIONES:                                  |
  |                                                    |
  | Proveedor A (Dennis):                             |
  |   - Precio: S/.105/millar | Total: S/.525         |
  |   - Tiempo estimado: 3 dias                       |
  |   - Confiabilidad: 85% (retraso 1 vez en 7)      |
  |                                                    |
  | Proveedor B (Imprenta Cuche):                     |
  |   - Precio: S/.95/millar | Total: S/.475          |
  |   - Tiempo estimado: 5 dias                       |
  |   - Confiabilidad: 70% (retraso 3 veces en 10)   |
  |                                                    |
  | >> RECOMENDADO: Dennis (mejor balance             |
  |    tiempo/confiabilidad para este cliente)         |
  +--------------------------------------------------+
```

Entregables:
- [ ] Recomendacion de proveedor basada en historial (tiempo, costo, confiabilidad)
- [ ] Estimacion de costo total de un PKL antes de empezar
- [ ] Estimacion de tiempo de entrega basada en historicos
- [ ] Deteccion de anomalias: "Este gasto es 3x mas alto que el promedio para este tipo"
- [ ] Rutas alternativas: "Si proveedor X no puede, estos son tus Plan B y C"

**Metrica de exito**: Antes de crear un PKL, ya sabes cuanto va a costar y cuanto va a tardar.

---

### FASE 5: "AUTOMATION" - El sistema actua solo

**Objetivo**: Reducir trabajo manual, el sistema hace seguimiento por ti.

Entregables:
- [ ] Recordatorios automaticos a proveedores (via WhatsApp) si no responden en X dias
- [ ] Generacion automatica de reporte semanal (costos, PKLs cerrados, pendientes, riesgos)
- [ ] Escalamiento automatico: PKL en rojo notifica al responsable
- [ ] Workflows configurables: "Si produccion lista -> notificar cliente -> programar entrega"
- [ ] Integracion calendario (Google Calendar) para entregas programadas

**Metrica de exito**: Pasas menos de 30 min al dia en tareas administrativas de seguimiento.

---

## 5. METRICAS CLAVE DEL SISTEMA

### Lo que debe medir (KPIs de negocio)

| Metrica | Que mide | Por que importa |
|---------|----------|-----------------|
| Lead Time | Dias desde solicitud hasta entrega | Velocidad del servicio |
| On-Time Delivery Rate | % entregas a tiempo | Confiabilidad |
| Costo por PKL | Gasto total por proceso | Rentabilidad |
| Supplier Performance | Tiempo/costo/retrasos por proveedor | Elegir mejor proveedor |
| Movilidad mensual | Gasto total en transporte | Control de costos |
| PKLs en riesgo | Cuantos PKLs tienen score > 50 | Proactividad |
| Process Conformance | % PKLs que siguen el happy path | Eficiencia del proceso |

### Lo que nos mide a nosotros (KPIs del sistema)

| Metrica | Hoy | Meta |
|---------|-----|------|
| Dias con data completa | ~5 | 30+ consecutivos |
| PKLs gestionados | ~15 | 50+ activos |
| % eventos con costo registrado | ~60% | 95% |
| Tiempo registrar un dia | 15+ min | 5 min (JSON import) |
| Alertas proactivas | 0 | 5+/semana |
| Predicciones de riesgo | 0 | Score en cada PKL |

---

## 6. PRINCIPIOS DE DISENO

### "Primero datos, despues inteligencia"
Sin 30 dias de data limpia, cualquier analytics es humo. Prioridad #1: llenar datos consistentemente.

### "Las relaciones son los datos" (Knowledge Graph)
No basta registrar eventos sueltos. El valor esta en las CONEXIONES: cliente-PKL-proveedor-costo-tiempo. Modelar como grafo, no como tablas aisladas.

### "Risk scoring combinado"
Nunca un solo factor. Siempre combinar: proveedor + complejidad + tiempo + costo = risk score. Como en supply chain: riesgo_ruta = riesgo_puerto_origen + riesgo_puerto_destino + probabilidad_disrupcion.

### "Rutas alternativas siempre"
Ante cualquier riesgo, el sistema debe tener pre-calculado el Plan B. Proveedor alternativo, ruta alternativa, fecha alternativa.

### "Actionable, no informativo"
No mostrar "el proveedor tardo 5 dias". Mostrar "el proveedor tardo 5 dias, **2 mas que su promedio. Considerar alternativa para proxima vez.**"

### "Voice-first pero no voice-only"
WhatsApp/voz es una entrada mas. El dashboard web y la importacion JSON son igualmente importantes.

---

## 7. STACK TECNOLOGICO

### Actual
- **Frontend**: React + Tailwind + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **AI**: Claude API (extraccion de entidades)
- **Voice**: Whisper local (faster-whisper)
- **Graphs**: NetworkX + PyVis (basico)

### Evolucion Propuesta (por fase)

| Capa | Fase 1 | Fase 2-3 | Fase 4-5 |
|------|--------|----------|----------|
| Data | Supabase | + Views/Functions | + Edge Functions |
| Analytics | - | Queries SQL + charts | + ML predictions |
| Graphs | PyVis basico | D3.js / React Flow | Neo4j (si escala) |
| Alertas | - | Dashboard badges | WhatsApp Bot + Push |
| AI | Claude (extraccion) | + Claude (analisis) | + Claude (agentes) |

---

## 8. PROXIMO PASO INMEDIATO

**Llenar 30 dias de data.**

Todo lo demas depende de esto. Usar la guia (GUIA_IMPORTAR_JSON.md) para importar cada dia. Una vez completo, el sistema tendra suficiente informacion para empezar Fase 2 (analytics y knowledge graph).

---

*Documento creado: 2026-01-25*
*Ultima actualizacion: 2026-01-28*
*Version: 2.0 - Incorpora insights de Knowledge Graphs y Supply Chain Risk Prediction*
