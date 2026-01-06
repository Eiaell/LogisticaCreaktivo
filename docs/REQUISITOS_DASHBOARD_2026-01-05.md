# REQUISITOS DEL SISTEMA - DASHBOARD CREAACTIVO
## Fecha: 2026-01-05
## Entrevista: 42 preguntas de descubrimiento

---

## 🎯 PRIORIDAD #1: DASHBOARD INTERACTIVO CON FILTROS Y DRILL-DOWN

---

## 1. FLUJO DEL PROCESO (ACTUALIZADO)

### Inicio del Proceso
- **Trigger**: Ejecutiva (Angélica, Johana, Natalia) contacta a Huber
- **Razón**: Pedir cotización O mandar directamente a producción
- **Nota**: Las ejecutivas son el puente con el cliente final

### Happy Path Completo
```
Contacto Ejecutiva → Cotización → Aprobado → En Producción → Listo para Recoger → Entregado → Cerrado
                                                    ↓
                                          Sub-fases opcionales:
                                          - Diseño (solo algunos productos)
                                          - Prueba de color (solo algunos productos)
```

### Estados Detallados

#### 1. **Cotización**
- Se genera cuando la ejecutiva solicita precio
- Duración: Variable

#### 2. **Aprobado**
- Cliente da el "sí, adelante"
- Se hace el acuerdo con proveedor

#### 3. **En Producción**
- Proveedor está fabricando
- **Sub-fases configurables**:
  - Diseño (si aplica)
  - Prueba de color (si aplica)
  - Fabricación
- **Transición a Listo**: Proveedor avisa por mensaje

#### 4. **Listo para Recoger**
- Producto terminado en local del proveedor
- Esperando que Huber coordine recojo
- **Urgencia afecta prioridad** de recojo
- Puede pasar tiempo variable según urgencia del cliente

#### 5. **Entregado**
- Producto físicamente en manos del cliente final
- Huber manda foto a la ejecutiva
- Cliente confirmó recepción

#### 6. **Cerrado**
- Se asigna número de RQ (documento interno)
- El RQ lo genera la ejecutiva (o Huber si es pedido de Natalia)
- Huber hace overview final

---

## 2. MODELO DE DATOS (ACTUALIZADO)

### 2.1 AcuerdoProduccion (CRÍTICO - Campos Nuevos)

```typescript
interface AcuerdoProduccion {
  // Básicos
  id: string;
  fecha: string;
  proveedor: string;
  producto: string;
  cantidad: number;

  // NUEVOS - Financieros (SIEMPRE requeridos)
  costoTotal: number;
  incluye_IGV: boolean;  // ⚠️ CRÍTICO: "Todos los proveedores, siempre"

  // NUEVOS - Adelanto
  adelanto?: number;
  fecha_pago_adelanto: string;  // ⚠️ Se registra "Al momento del acuerdo"
  // Ejemplo: "Acordé con Patricia 200 polos, adelanto S/.100 pagado hoy"

  // NUEVOS - Cliente
  cliente: {
    empresa: string;           // Ej: "TYC", "MN Foods"
    contacto?: string;         // Persona de contacto
    direccion_entrega?: string;
    telefono?: string;
  };

  // Ejecutiva (NO es un nodo separado, es propiedad)
  ejecutiva: "Angélica" | "Johana" | "Natalia";

  // Fechas
  fechaCompromiso: string;  // Cuándo prometió el proveedor
  fechaEntrega?: string;    // Cuándo se entregó realmente

  // NUEVOS - Especificaciones
  especificaciones: string;  // Detalles técnicos del producto

  // NUEVOS - Tags/Flags
  tags: string[];  // ["requiere_diseño", "requiere_prueba_color"]
  urgente: boolean;  // ⚠️ Afecta priorización de recojo y presión a proveedor

  // Stock (informativo, no afecta flujo)
  tiene_stock?: boolean;  // Casi nunca tienen, todo se fabrica bajo pedido

  // Estado
  estado: EstadoPedido;
  sub_estado?: string;  // "diseño", "prueba_color", "fabricación"

  // RQ (cierre)
  numero_RQ?: string;  // Cuando se asigna, el pedido pasa a "Cerrado"
  precio_cliente?: number;  // Se conoce al cerrar el RQ
}
```

### 2.2 MovimientoMovilidad (ACTUALIZADO)

```typescript
interface MovimientoMovilidad {
  id: string;
  fecha: string;

  // Ruta (AMBOS importantes: costo + optimización)
  origen: string;
  destino: string;

  // Transporte (decisión basada en tamaño del paquete)
  tipoTransporte: "taxi" | "moto" | "bus";
  // Lógica: 100 polos = bus, 1000 polos = taxi

  costo: number;

  // ⚠️ NUEVO - Quién hizo el recojo
  recogedor: "Huber" | "Motorizado";  // Moderadamente importante

  proposito: string;
  pedidoId?: string;  // Vinculación con pedido
}
```

### 2.3 GastoExtraordinario (ACTUALIZADO)

```typescript
interface GastoExtraordinario {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria: "motorizado" | "materiales_urgentes" | "otro";

  // Casos frecuentes:
  // - Motorizados para recojos cuando Huber no puede o no vale la pena
  // - Compras urgentes para entrega (ej: cinta doble impacto para foam+caballete)

  pedidoId?: string;
}
```

---

## 3. DASHBOARD - ESPECIFICACIONES DE DISEÑO

### 3.1 Vista Principal

**Periodo por defecto**: MES actual (con selector configurable)

**Estructura Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  🔴 ALERTA: 3 entregas HOY - TYC 3pm | MN Foods 5pm | ...  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📊 RESUMEN EJECUTIVO                                       │
│  • 5 pedidos en producción                                  │
│  • 3 listos para recoger HOY                                │
│  • S/. 450 gastados en movilidad este mes                   │
│  • 8 pedidos abiertos total                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🔍 FILTROS                                                  │
│  [ Cliente ▼ ] [ Proveedor ▼ ] [ Ejecutiva ▼ ]            │
│  [ Estado ▼ ] [ Fecha desde ] [ Fecha hasta ] [ Buscar... ]│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              GRAFO CELONIS INTERACTIVO                      │
│          (Ver especificaciones en sección 3.2)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📊 GRÁFICA: Tiempo Promedio por Proveedor                  │
│  Patricia  ████████ 5.2 días                                │
│  Carlos    ████████████ 7.8 días                            │
│  DHL       ███ 2.1 días                                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Grafo Celonis - Especificaciones Interactivas

#### A) Elementos Visuales

**Nodos de Estado (Amarillo):**
- Forma: Rectángulo
- Texto: Nombre del estado + número de casos en ese estado
- Ejemplo: "En Producción (5)"

**Nodos de Caso/Pedido (Azul):**
- Forma: Círculo
- Tamaño: Basado en costo total (más dinero = más grande)
- Texto: ID del caso + monto
- **Icono ⚠️**: Si es urgente
- **Número visible**: Días en estado actual
- Ejemplo: "⚠️ CASE-TYC-PAT-20260105 | S/.450 | 3d"

**Nodos de Proveedor (Verde):**
- Forma: Diamante
- Texto: Nombre del proveedor

**Nodos de Cliente (Morado):**
- Forma: Elipse
- Texto: Nombre de la empresa

**Nodos de Producto (Naranja):**
- Forma: Elipse
- Texto: Producto + cantidad

**Edges (Conexiones):**
- Grosor: Basado en monto económico
- Color: Heredado del nodo origen

#### B) Interacciones - HOVER (Pasar Mouse)

**Tooltip muestra:**
```
Cliente: TYC
Ejecutiva: Angélica
Estado: En Producción (3 días)
Proveedor: Patricia
Gastos acumulados: S/. 30 (movilidad)
Precio total: S/. 450
```

#### C) Interacciones - CLICK (Panel Lateral)

**Panel de detalles se abre a la derecha, contenido en orden:**

1. **ESPECIFICACIONES (Primero - MÁS IMPORTANTE)**
   ```
   Producto: 200 casacas
   Especificaciones: Talla M, color azul marino, logo bordado
   Tags: [Requiere diseño] [Urgente ⚠️]
   ```

2. **CLIENTE Y ENTREGA**
   ```
   Cliente: TYC - Intradevco
   Contacto: Juan Pérez
   Dirección: Av. Javier Prado 123, San Isidro
   Ejecutiva: Angélica
   Fecha entrega: 2026-01-08 15:00
   ```

3. **COSTOS Y PAGOS**
   ```
   Costo Total: S/. 4,500 (Incluye IGV ✓)
   Adelanto: S/. 1,000 (Pagado: 2026-01-05)
   Saldo pendiente: S/. 3,500
   Gastos movilidad: S/. 30
   Precio al cliente: S/. 5,200 (se conoce al cerrar)
   ```

4. **TIMELINE DEL PEDIDO**
   ```
   2026-01-02  Cotización enviada
   2026-01-03  Aprobado por cliente
   2026-01-03  Acuerdo con Patricia, adelanto pagado
   2026-01-05  En Producción (3 días) ← Estado actual
   2026-01-08  Fecha compromiso entrega
   ```

5. **MOVIMIENTOS Y ACCIONES**
   ```
   • Diseño enviado a Patricia (2026-01-04)
   • Prueba de color aprobada (2026-01-05)
   ```

6. **BOTONES DE ACCIÓN (Edición Completa)**
   ```
   [✏️ Editar Especificaciones]
   [🔄 Cambiar Estado]
   [💰 Registrar Pago]
   [📍 Actualizar Entrega]
   [❌ Cancelar Pedido]
   ```

#### D) Filtros Dinámicos

**Ubicación**: Barra superior del grafo

**Filtros disponibles:**
1. **Cliente** (dropdown multi-select)
   - [ ] TYC
   - [ ] MN Foods
   - [ ] Intradevco
   - ...

2. **Proveedor** (dropdown multi-select)
   - [ ] Patricia
   - [ ] Carlos
   - [ ] DHL
   - ...

3. **Ejecutiva** (dropdown multi-select)
   - [ ] Angélica
   - [ ] Johana
   - [ ] Natalia

4. **Estado** (dropdown multi-select)
   - [ ] Cotización
   - [ ] Aprobado
   - [ ] En Producción
   - [ ] Listo para Recoger
   - [ ] Entregado
   - [ ] Cerrado

5. **Rango de Fechas**
   - Fecha desde: [picker]
   - Fecha hasta: [picker]
   - Presets: [Hoy] [Esta semana] [Este mes]

6. **Búsqueda por texto**
   - Input: "Buscar por nombre, cliente, proveedor..."
   - Busca en: ID caso, nombre cliente, nombre proveedor, ejecutiva

**Comportamiento:**
- Aplicación instantánea (sin botón "Aplicar")
- Contador: "Mostrando 5 de 23 pedidos"
- Botón: [Limpiar filtros]

### 3.3 Edición Completa desde Dashboard

**Requisitos:**
- Auto-guardado instantáneo (sin botón "Guardar")
- Validación en tiempo real
- Sin historial de cambios (no es prioridad)

**Campos editables por sección:**

1. **Especificaciones**
   - Producto (texto libre)
   - Cantidad (número)
   - Especificaciones (textarea)
   - Tags (agregar/quitar chips)
   - Urgente (checkbox)

2. **Cliente**
   - Empresa (texto)
   - Contacto (texto)
   - Dirección (texto)
   - Teléfono (texto)

3. **Costos**
   - Costo total (número)
   - Incluye IGV (checkbox)
   - Adelanto (número)
   - Fecha pago adelanto (date picker)

4. **Fechas**
   - Fecha compromiso (date picker)
   - Fecha/hora entrega (datetime picker)

5. **Estado**
   - Dropdown con estados disponibles
   - Sub-estado (si aplica)

**Flujo de edición:**
```
Usuario hace click en campo → Campo se vuelve editable → Usuario modifica →
Al perder foco (blur) → Auto-save → Feedback visual (✓ guardado)
```

### 3.4 Configuración de Estados Personalizados

**Ubicación**: Configuración del sistema (icono ⚙️)

**UI Propuesta**:
```
┌─────────────────────────────────────────────────────────┐
│  CONFIGURAR FLUJO DE PROCESO                            │
│                                                         │
│  Happy Path Principal:                                  │
│  ┌──────────┐  ┌─────────┐  ┌─────────────┐           │
│  │Cotización│→ │Aprobado │→ │En Producción│→ ...      │
│  └──────────┘  └─────────┘  └─────────────┘           │
│                                   │                     │
│                                   ├─ Diseño             │
│                                   ├─ Prueba de Color    │
│                                   └─ Fabricación        │
│                                                         │
│  [+ Agregar Estado]  [+ Agregar Sub-fase]              │
│                                                         │
│  Drag & drop para reordenar                            │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Arrastrar estados para reordenar
- Agregar nuevos estados al flujo principal
- Agregar sub-fases a un estado específico
- Renombrar estados existentes
- Eliminar estados (con advertencia si hay datos)

---

## 4. GRÁFICA: TIEMPO PROMEDIO POR PROVEEDOR

### Especificación

**Tipo**: Gráfico de barras horizontales

**Métrica**: Días desde "Acuerdo" hasta "Listo para Recoger"

**Datos**:
```
Patricia   ████████████ 5.2 días (15 pedidos)
Carlos     ████████████████ 7.8 días (8 pedidos)
DHL        ████ 2.1 días (3 pedidos)
```

**Interactividad**:
- Hover: Ver número de pedidos y desviación estándar
- Click en barra: Filtrar el grafo principal por ese proveedor

**Periodo**: Respeta filtro de fechas del dashboard

---

## 5. SISTEMA DE ALERTAS

### 5.1 Banner Rojo Superior

**Condición de activación**: Hay entregas programadas para HOY

**Contenido**:
```
🔴 ENTREGAS HOY: TYC a las 3pm | MN Foods a las 5pm | Intradevco a las 6pm
```

**Interacción**:
- Click en cliente: Abre panel de detalles de ese pedido
- Se mantiene visible en la parte superior (sticky)
- Desaparece automáticamente después de las 11:59pm

### 5.2 Definición de "Pedidos Abiertos"

**Criterio**: Cualquier pedido que NO esté en estado "Cerrado"

**Incluye**:
- Cotización
- Aprobado
- En Producción
- Listo para Recoger
- Entregado (sin RQ asignado)

**Uso**: Revisar diariamente qué quedó pendiente de días/semanas anteriores

---

## 6. EXPORT Y COMPARTIR

### 6.1 Exportar PDF del Grafo

**Formato**: PDF tamaño A3 (landscape)

**Contenido**:
- Grafo visual completo
- Leyenda de colores
- Filtros aplicados (texto)
- Fecha de generación
- Resumen ejecutivo (KPIs del periodo)

**Botón**: "📄 Exportar PDF" en toolbar superior

### 6.2 Exportar Excel/CSV

**Opciones**:
1. **Pedidos**: Tabla con todos los campos de AcuerdoProduccion
2. **Movimientos**: Tabla de movilidad
3. **Gastos**: Tabla de gastos extraordinarios
4. **Completo**: 3 hojas en un solo archivo Excel

**Respeta filtros activos**

**Botón**: "📊 Exportar Datos" → Dropdown con opciones

### 6.3 Link Compartible

**Acceso**: Solo Huber (por ahora)

**Funcionalidad**:
- Genera URL única: `https://dashboard.creaactivo.com/view/abc123xyz`
- **No implementar multi-usuario todavía**
- Preparar arquitectura para futuro (ejecutivas, clientes)

---

## 7. CASOS DE USO DOCUMENTADOS

### 7.1 Multi-Proveedor (20-50% de casos)

**Escenario**: TYC pide viniles (Patricia) + polos (Carlos)

**Visualización en el grafo**:
```
                    ┌─────────────┐
                    │  CASE-TYC   │
                    │  20260105   │
                    └─────┬───────┘
                          │
              ┌───────────┴───────────┐
              │                       │
         ┌────▼─────┐           ┌────▼─────┐
         │ Patricia │           │  Carlos  │
         │ (viniles)│           │  (polos) │
         └──────────┘           └──────────┘
```

**Datos**:
- Un solo caso/pedido
- Múltiples nodos de proveedor conectados
- Costos se suman al total del caso

### 7.2 Delegación de Recojo a Motorizado

**Registro**: "Motorizado recogió 100 polos de Carlos, S/. 15"

**Efecto en el grafo**:
- MovimientoMovilidad con `recogedor: "Motorizado"`
- GastoExtraordinario en categoría "motorizado"
- Ambos vinculados al pedido correspondiente

**Visualización**: Tag "🏍️" en el movimiento

### 7.3 Productos que Requieren Diseño

**Registro (por audio)**:
> "Acordé con Patricia 50 viniles para TYC, requiere diseño del logo nuevo"

**Extracción esperada**:
```json
{
  "tipo": "acuerdo_produccion",
  "proveedor": "patricia",
  "producto": "viniles",
  "cantidad": 50,
  "cliente": "TYC",
  "tags": ["requiere_diseño"]
}
```

**Visualización en panel**: Chip amarillo "Requiere Diseño"

### 7.4 Urgencia Alta

**Criterio**: Ejecutiva dice "es urgente" o fecha entrega es mañana

**Efectos**:
1. Campo `urgente: true`
2. Icono ⚠️ en el nodo del grafo
3. Priorización en lista de recojos
4. Huber presiona al proveedor para acelerar

---

## 8. PREGUNTAS RESPONDIDAS - DECISIONES DE DISEÑO

### 8.1 Decisiones sobre Estados

**P: ¿Cuándo pasa de "Producción" a "Listo"?**
R: Cuando el proveedor avisa por mensaje

**P: ¿Cuándo se marca "Entregado"?**
R: Cuando Huber deja el producto en manos del cliente Y manda foto a la ejecutiva

**P: ¿Cuándo se marca "Cerrado"?**
R: Cuando se asigna el número de RQ (documento interno)

### 8.2 Decisiones sobre Roles

**P: ¿Cómo representar a las ejecutivas?**
R: Como propiedad del pedido, NO como nodo separado en el grafo

**P: ¿Quién genera el RQ?**
R: La ejecutiva (Angélica/Johana) o Huber si es pedido de Natalia

### 8.3 Decisiones sobre Transporte

**P: ¿Cómo decides qué transporte usar?**
R: Basado en tamaño del paquete (100 polos=bus, 1000 polos=taxi)

**P: ¿Qué tan importante es saber quién recogió?**
R: Moderadamente importante (para control de costos de motorizados)

### 8.4 Decisiones sobre Tiempos

**P: ¿Qué tan frecuente es que proveedores fallen en fechas?**
R: Raro (menos de 20%), generalmente cumplen

**P: ¿Cuánto tiempo pasa entre "Listo" y recojo?**
R: Varía mucho según urgencia del cliente final

### 8.5 Decisiones sobre Visualización

**P: ¿Qué ves primero al abrir el dashboard?**
R: Panorama general con números clave + opción de drill-down

**P: ¿Tiempo real o manual?**
R: Moderadamente importante (auto-refresh cada 2-3 min o botón refrescar)

### 8.6 Decisiones sobre Dispositivos

**P: ¿Desde dónde usas el sistema?**
R: WhatsApp (celular) para registrar → Computadora (dashboard) para revisar/ajustar

---

## 9. STACK TECNOLÓGICO RECOMENDADO

### Frontend Dashboard
- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui + Tailwind CSS
- **Grafo**: React Flow o Vis.js (compatible con Celonis-style)
- **Charts**: Recharts o Apache ECharts
- **State Management**: Zustand (ligero, suficiente para este caso)

### Backend API
- **Runtime**: Node.js + Express (o Next.js API routes)
- **Real-time**: Socket.IO (para auto-refresh del dashboard)
- **File Storage**: Mantener JSON + migrar gradualmente a DB

### Base de Datos (Migración Futura)
- **Opción 1**: SQLite (local, fácil setup, suficiente para un usuario)
- **Opción 2**: PostgreSQL (si queremos escalar a multi-usuario)
- **Mantener JSONL** para event log (Celonis-style)

### Autenticación (Futuro)
- NextAuth.js con magic links (para compartir con ejecutivas)

---

## 10. ROADMAP SUGERIDO

### Fase 1: MVP Dashboard (2-3 semanas)
- [ ] Migrar de HTML estático a React/Next.js
- [ ] Vista de resumen ejecutivo con KPIs
- [ ] Grafo Celonis básico (sin interactividad)
- [ ] Filtros simples (cliente, estado)
- [ ] Gráfica de barras (tiempo por proveedor)

### Fase 2: Interactividad (1-2 semanas)
- [ ] Hover tooltips
- [ ] Click → Panel de detalles
- [ ] Filtros dinámicos completos
- [ ] Búsqueda por texto
- [ ] Auto-refresh cada 3 min

### Fase 3: Edición Completa (2 semanas)
- [ ] Edición inline de campos
- [ ] Auto-guardado
- [ ] Cambio de estados
- [ ] Validaciones en tiempo real

### Fase 4: Features Avanzados (2 semanas)
- [ ] Configurador de estados (UI)
- [ ] Export PDF/Excel
- [ ] Banner de alertas
- [ ] Tags y sub-fases

### Fase 5: Optimización (1 semana)
- [ ] Migración a base de datos
- [ ] Performance optimization
- [ ] Mobile responsive
- [ ] Tests automatizados

---

## 11. MÉTRICAS DE ÉXITO

### KPIs del Sistema
1. **Reducción de tiempo en revisión diaria**: De 30 min a <5 min
2. **0 entregas olvidadas**: Alertas evitan olvidos
3. **Decisión de proveedor**: Basada en datos (gráfica de tiempos)
4. **Visibilidad**: Saber estado de todos los pedidos en <10 segundos

### Métricas de Negocio a Trackear
- Tiempo promedio por proveedor (objetivo: <5 días)
- Gasto mensual en movilidad (detectar anomalías)
- Tasa de cumplimiento de proveedores (objetivo: >95%)
- Pedidos cerrados por semana (productividad)

---

## 12. NOTAS FINALES

### Limitaciones Conocidas Aceptadas
- **No hay margen de ganancia por pedido**: Huber no maneja esa info
- **Cancelaciones son raras**: No necesita proceso especial
- **Comparaciones temporales**: Solo para reportes especiales, no dashboard diario
- **Stock no afecta flujo**: Informativo, casi nunca aplica

### Áreas Futuras (No Prioridad Ahora)
- Multi-usuario con permisos (ejecutivas, clientes)
- App móvil nativa
- Integración con sistema ERP/contable
- Predicción de tiempos con ML
- Detección automática de anomalías

---

**Documento generado a partir de 42 preguntas de descubrimiento**
**Próximo paso**: Validar con Huber y comenzar implementación según prioridad elegida
