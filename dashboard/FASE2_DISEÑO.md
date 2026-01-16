# FASE 2 - DISEÑO DETALLADO (NO EJECUTAR)

**Estado:** 📋 DISEÑO - NO IMPLEMENTADO
**Fecha:** 2026-01-13
**Prerequisito:** Fase 1 aprobada y congelada

---

## Filosofía de Diseño

### Principios Inmutables
1. **Eventos son append-only** - Nunca UPDATE, solo INSERT
2. **IGV nunca se recalcula** - Se hereda de `producciones.incluye_igv`
3. **Estados cambian por eventos** - No por mutaciones directas
4. **Campos congelados al crear** - Inmutables post-inserción

### Arquitectura de Flujo
```
COTIZACIÓN → PRODUCCIÓN (congelada) → EVENTOS (append-only) → CAMBIOS DE ESTADO
                ↓
              PAGOS (heredan IGV)
```

---

## A. TABLA: `eventos_logisticos`

### Propósito
Registro inmutable de eventos operativos que ocurren durante el ciclo de vida de una producción.

### Características Clave
- **Append-only:** Solo INSERT, nunca UPDATE/DELETE
- **FK obligatoria** a `producciones`
- **Timestamp real** del evento (no `created_at` automático)
- **Actor explícito** (persona, proveedor, sistema)
- **Tipos estrictos** (ENUM)

### Schema Propuesto

```sql
-- Tipo ENUM para eventos
CREATE TYPE evento_tipo AS ENUM (
    -- Flujo de dinero
    'adelanto_pagado',          -- Se pagó adelanto al proveedor
    'saldo_pagado',             -- Se pagó saldo final

    -- Flujo de producción
    'prueba_color',             -- Se hizo prueba de color
    'muestra_fisica',           -- Se entregó muestra física
    'envio_produccion',         -- Se envió orden a producción
    'produccion_lista',         -- Producción terminada (proveedor avisa)

    -- Flujo logístico
    'recojo_programado',        -- Se programó recojo
    'recojo_completado',        -- Se recogió del proveedor
    'entrega_programada',       -- Se programó entrega a cliente
    'entrega_completada',       -- Se entregó al cliente

    -- Incidencias
    'incidencia',               -- Problema genérico
    'retraso',                  -- Retraso en producción
    'defecto_calidad',          -- Defecto de calidad detectado
    'cambio_especificacion'     -- Cliente cambió especificaciones
);

-- Tipo ENUM para actores
CREATE TYPE actor_tipo AS ENUM (
    'usuario',          -- Usuario del sistema (Huber, coordinador)
    'proveedor',        -- Proveedor ejecutó la acción
    'sistema',          -- Evento automático del sistema
    'cliente'           -- Cliente ejecutó la acción
);

-- Tabla de eventos
CREATE TABLE eventos_logisticos (
    -- Identificación
    id TEXT PRIMARY KEY,
    produccion_id TEXT NOT NULL REFERENCES producciones(id) ON DELETE CASCADE,

    -- Tipo de evento
    tipo evento_tipo NOT NULL,

    -- Timestamp REAL del evento (no automático)
    timestamp_evento TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Actor que ejecutó el evento
    actor_tipo actor_tipo NOT NULL,
    actor_nombre TEXT,                  -- Nombre del actor (ej: "Huber", "Patricia Textil")

    -- Detalles del evento
    descripcion TEXT,                   -- Descripción legible
    metadata JSONB DEFAULT '{}',        -- Datos adicionales (ej: {monto: 500, metodo: "yape"})

    -- Ubicación (para eventos logísticos)
    ubicacion_origen TEXT,
    ubicacion_destino TEXT,

    -- Evidencia
    foto_url TEXT,                      -- URL de foto de evidencia
    documento_url TEXT,                 -- URL de documento adjunto

    -- Estado resultante (SI cambia el estado de producción)
    cambia_estado BOOLEAN DEFAULT false,
    nuevo_estado VARCHAR(30),           -- Si cambia_estado=true, nuevo estado de producción

    -- Auditoría (cuándo se REGISTRÓ el evento, no cuándo ocurrió)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT                     -- Usuario que registró el evento
);

-- Índices para consultas frecuentes
CREATE INDEX idx_eventos_produccion ON eventos_logisticos(produccion_id);
CREATE INDEX idx_eventos_tipo ON eventos_logisticos(tipo);
CREATE INDEX idx_eventos_timestamp ON eventos_logisticos(timestamp_evento);
CREATE INDEX idx_eventos_actor ON eventos_logisticos(actor_tipo, actor_nombre);
CREATE INDEX idx_eventos_cambia_estado ON eventos_logisticos(cambia_estado) WHERE cambia_estado = true;

-- Comentarios
COMMENT ON TABLE eventos_logisticos IS 'Registro append-only de eventos del ciclo de vida de producciones';
COMMENT ON COLUMN eventos_logisticos.timestamp_evento IS 'Timestamp REAL del evento (no created_at)';
COMMENT ON COLUMN eventos_logisticos.cambia_estado IS 'TRUE si este evento causa cambio en producciones.estado';
COMMENT ON COLUMN eventos_logisticos.metadata IS 'Datos adicionales en JSONB (ej: monto, método_pago, observaciones)';
```

### Ejemplos de Uso

**Ejemplo 1: Pago de adelanto**
```json
{
  "id": "EVT-1736789123456-XYZ",
  "produccion_id": "PROD-123",
  "tipo": "adelanto_pagado",
  "timestamp_evento": "2026-01-13T10:30:00Z",
  "actor_tipo": "usuario",
  "actor_nombre": "Huber",
  "descripcion": "Adelanto 50% a Patricia Textil",
  "metadata": {
    "monto": 500.00,
    "moneda": "PEN",
    "metodo": "yape",
    "numero_operacion": "OP-123456"
  },
  "cambia_estado": false,
  "nuevo_estado": null
}
```

**Ejemplo 2: Recojo completado (CAMBIA ESTADO)**
```json
{
  "id": "EVT-1736789200000-ABC",
  "produccion_id": "PROD-123",
  "tipo": "recojo_completado",
  "timestamp_evento": "2026-01-15T14:20:00Z",
  "actor_tipo": "usuario",
  "actor_nombre": "Huber",
  "descripcion": "Recogido de Patricia Textil - Jr. Los Pinos 456",
  "ubicacion_origen": "Jr. Los Pinos 456, Cercado de Lima",
  "ubicacion_destino": "Oficina Creaactivo",
  "foto_url": "https://storage/recojo-123.jpg",
  "cambia_estado": true,
  "nuevo_estado": "recogido"
}
```

**Ejemplo 3: Incidencia**
```json
{
  "id": "EVT-1736789300000-ERR",
  "produccion_id": "PROD-123",
  "tipo": "defecto_calidad",
  "timestamp_evento": "2026-01-16T09:00:00Z",
  "actor_tipo": "usuario",
  "actor_nombre": "Angélica",
  "descripcion": "Color no coincide con pantone aprobado",
  "metadata": {
    "pantone_esperado": "485C",
    "pantone_recibido": "186C"
  },
  "cambia_estado": true,
  "nuevo_estado": "problema"
}
```

---

## B. SEPARACIÓN: `pagos` vs `rendiciones`

### Problema Actual
La tabla `pagos` mezcla:
- Pagos a proveedores (ligados a producción)
- Gastos de movilidad (sin producción)
- Rendiciones a coordinador (sin producción)

### Solución Propuesta
Separar en 2 tablas con propósitos distintos.

---

### B.1. TABLA: `pagos` (Flujo de Producción)

**Propósito:** Pagos ligados a PRODUCCIÓN (adelantos, saldos, pagos al proveedor).

```sql
-- Tipo ENUM para tipos de pago
CREATE TYPE pago_tipo AS ENUM (
    'adelanto',             -- Adelanto antes de producir
    'saldo',                -- Saldo al recoger/entregar
    'pago_completo',        -- 100% adelanto (caso especial)
    'pago_post_entrega'     -- Pago después de entregar al cliente
);

-- Tipo ENUM para métodos de pago
CREATE TYPE metodo_pago AS ENUM (
    'efectivo',
    'transferencia',
    'yape',
    'plin',
    'tarjeta',
    'cheque'
);

-- Tabla de pagos (ligados a producción)
CREATE TABLE pagos (
    -- Identificación
    id TEXT PRIMARY KEY,
    produccion_id TEXT NOT NULL REFERENCES producciones(id) ON DELETE CASCADE,
    evento_id TEXT REFERENCES eventos_logisticos(id) ON DELETE SET NULL, -- FK al evento que lo disparó

    -- Tipo de pago
    tipo pago_tipo NOT NULL,

    -- Monto (SIEMPRE heredado de producción)
    monto DECIMAL(10,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'PEN',
    incluye_igv BOOLEAN NOT NULL,       -- HEREDADO de producciones.incluye_igv (INMUTABLE)

    -- Método de pago
    metodo metodo_pago NOT NULL,
    banco VARCHAR(50),
    numero_operacion TEXT,
    numero_cuenta TEXT,

    -- Destinatario
    destinatario TEXT NOT NULL,         -- Proveedor o beneficiario

    -- Evidencia
    comprobante_url TEXT,
    foto_url TEXT,

    -- Detalles
    concepto TEXT,
    nota TEXT,

    -- Auditoría
    fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL, -- Fecha REAL del pago
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- Índices
CREATE INDEX idx_pagos_produccion ON pagos(produccion_id);
CREATE INDEX idx_pagos_tipo ON pagos(tipo);
CREATE INDEX idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX idx_pagos_metodo ON pagos(metodo);

-- Comentarios
COMMENT ON TABLE pagos IS 'Pagos ligados a producción - adelantos, saldos, pagos post-entrega';
COMMENT ON COLUMN pagos.incluye_igv IS 'HEREDADO de producciones.incluye_igv - INMUTABLE';
COMMENT ON COLUMN pagos.evento_id IS 'FK al evento adelanto_pagado o saldo_pagado que lo disparó';
```

**Reglas de Negocio:**
1. **IGV INMUTABLE:** Se hereda de `producciones.incluye_igv` al crear el pago
2. **Múltiples adelantos:** Se pueden hacer N pagos tipo `adelanto`
3. **100% adelanto:** Usar tipo `pago_completo`
4. **Saldo:** Tipo `saldo` (puede ser 0 si ya se pagó 100%)
5. **Post-entrega:** Tipo `pago_post_entrega` (pagos después de entregar al cliente)

**Ejemplo: Adelanto 50%**
```json
{
  "id": "PAG-1736789123456-A",
  "produccion_id": "PROD-123",
  "evento_id": "EVT-1736789123456-XYZ",
  "tipo": "adelanto",
  "monto": 500.00,
  "moneda": "PEN",
  "incluye_igv": false,           // HEREDADO de producciones
  "metodo": "yape",
  "numero_operacion": "OP-123456",
  "destinatario": "Patricia Textil",
  "concepto": "Adelanto 50% - 100 lanyards sublimados",
  "fecha_pago": "2026-01-13T10:30:00Z"
}
```

---

### B.2. TABLA: `rendiciones` (Gastos Sin Producción)

**Propósito:** Gastos operativos SIN producción asociada (movilidad, compras urgentes, viáticos).

```sql
-- Tipo ENUM para tipos de rendición
CREATE TYPE rendicion_tipo AS ENUM (
    'movilidad',            -- Transporte (taxi, uber, etc)
    'compra_urgente',       -- Compra ad-hoc (ferretería, papelería)
    'viatico',              -- Alimentación, viáticos
    'servicio',             -- Servicios (impresiones, mensajería)
    'otro'
);

-- Tipo ENUM para estado de reembolso
CREATE TYPE reembolso_estado AS ENUM (
    'pendiente',
    'aprobado',
    'pagado',
    'rechazado'
);

-- Tabla de rendiciones (sin producción)
CREATE TABLE rendiciones (
    -- Identificación
    id TEXT PRIMARY KEY,

    -- Tipo de gasto
    tipo rendicion_tipo NOT NULL,

    -- Monto
    monto DECIMAL(10,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'PEN',

    -- Detalles
    origen TEXT,                        -- Punto A (para movilidad)
    destino TEXT,                       -- Punto B (para movilidad)
    descripcion TEXT NOT NULL,          -- Qué se compró/transportó
    proveedor TEXT,                     -- Proveedor donde se compró (opcional)

    -- Responsable
    responsable TEXT NOT NULL,          -- Quién pagó (Huber, mensajero, etc)

    -- Reembolso
    estado_reembolso reembolso_estado DEFAULT 'pendiente',
    fecha_reembolso TIMESTAMP WITH TIME ZONE,
    metodo_reembolso metodo_pago,
    numero_operacion_reembolso TEXT,

    -- Comprobante
    tiene_comprobante BOOLEAN DEFAULT false,
    tipo_comprobante VARCHAR(20),       -- 'boleta', 'factura', 'ticket', 'ninguno'
    url_comprobante TEXT,
    foto_url TEXT,

    -- Auditoría
    fecha_gasto TIMESTAMP WITH TIME ZONE NOT NULL, -- Fecha REAL del gasto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    aprobado_por TEXT,
    fecha_aprobacion TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_rendiciones_tipo ON rendiciones(tipo);
CREATE INDEX idx_rendiciones_responsable ON rendiciones(responsable);
CREATE INDEX idx_rendiciones_estado ON rendiciones(estado_reembolso);
CREATE INDEX idx_rendiciones_fecha ON rendiciones(fecha_gasto);

-- Comentarios
COMMENT ON TABLE rendiciones IS 'Gastos operativos SIN producción - movilidad, compras, viáticos';
COMMENT ON COLUMN rendiciones.estado_reembolso IS 'Flujo: pendiente → aprobado → pagado';
```

**Ejemplo: Movilidad**
```json
{
  "id": "REN-1736789400000-MOV",
  "tipo": "movilidad",
  "monto": 25.00,
  "moneda": "PEN",
  "origen": "Oficina Creaactivo",
  "destino": "Patricia Textil - Jr. Los Pinos 456",
  "descripcion": "Taxi para recojo de lanyards",
  "responsable": "Huber",
  "estado_reembolso": "pendiente",
  "tiene_comprobante": false,
  "fecha_gasto": "2026-01-15T14:00:00Z"
}
```

**Ejemplo: Compra urgente**
```json
{
  "id": "REN-1736789500000-COM",
  "tipo": "compra_urgente",
  "monto": 15.50,
  "moneda": "PEN",
  "descripcion": "Cinta de embalaje para envío urgente",
  "proveedor": "Ferretería El Sol",
  "responsable": "Huber",
  "estado_reembolso": "aprobado",
  "tiene_comprobante": true,
  "tipo_comprobante": "boleta",
  "url_comprobante": "https://storage/boleta-123.pdf",
  "fecha_gasto": "2026-01-14T11:30:00Z"
}
```

---

## C. REGLAS DE ESTADO

### Principio Fundamental
**Los estados de `producciones` SOLO cambian por eventos, NUNCA por mutaciones directas.**

### Máquina de Estados

```
en_proceso → listo → recogido → entregado
     ↓
  problema (en cualquier punto)
```

### Tabla de Eventos → Cambios de Estado

| Evento | Cambia Estado | Nuevo Estado | Condición |
|--------|---------------|--------------|-----------|
| `prueba_color` | ❌ NO | - | Solo informativo |
| `muestra_fisica` | ❌ NO | - | Solo informativo |
| `adelanto_pagado` | ❌ NO | - | Solo informativo |
| `saldo_pagado` | ❌ NO | - | Solo informativo |
| `envio_produccion` | ✅ SÍ | `en_proceso` | Si estado actual != `problema` |
| `produccion_lista` | ✅ SÍ | `listo` | Si estado actual == `en_proceso` |
| `recojo_completado` | ✅ SÍ | `recogido` | Si estado actual == `listo` |
| `entrega_completada` | ✅ SÍ | `entregado` | Si estado actual == `recogido` |
| `defecto_calidad` | ✅ SÍ | `problema` | Siempre |
| `retraso` | ✅ SÍ | `problema` | Siempre |
| `incidencia` | ⚠️ DEPENDE | `problema` | Solo si es crítica |
| `cambio_especificacion` | ❌ NO | - | Solo informativo |

### Reglas de Transición

**PERMITIDAS:**
```
en_proceso → listo
listo → recogido
recogido → entregado
* → problema (desde cualquier estado)
problema → en_proceso (si se resuelve)
```

**PROHIBIDAS:**
```
listo → en_proceso (no retroceder)
recogido → listo (no retroceder)
entregado → * (INMUTABLE, terminal)
```

### Implementación en Trigger

```sql
-- Trigger que actualiza estado de producción cuando se inserta evento
CREATE OR REPLACE FUNCTION actualizar_estado_produccion()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si el evento marca cambia_estado = true
    IF NEW.cambia_estado = true AND NEW.nuevo_estado IS NOT NULL THEN
        -- Validar transición
        DECLARE
            estado_actual VARCHAR(30);
        BEGIN
            SELECT estado INTO estado_actual
            FROM producciones
            WHERE id = NEW.produccion_id;

            -- Validar que la transición sea válida
            IF (estado_actual = 'entregado') THEN
                RAISE EXCEPTION 'No se puede cambiar el estado de una producción entregada';
            END IF;

            -- Actualizar estado
            UPDATE producciones
            SET
                estado = NEW.nuevo_estado,
                updated_at = NEW.timestamp_evento
            WHERE id = NEW.produccion_id;

            RAISE NOTICE 'Estado actualizado: % → %', estado_actual, NEW.nuevo_estado;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_estado
    AFTER INSERT ON eventos_logisticos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_estado_produccion();
```

---

## D. CAMPOS CONGELADOS AL CREAR PRODUCCIÓN

### Principio
Una vez creada la `producción`, ciertos campos son **INMUTABLES** porque representan la decisión aprobada.

### Campos CONGELADOS (Inmutables Post-Inserción)

```sql
-- INMUTABLES (no UPDATE permitido):
pedido_id              -- No se puede mover a otro pedido
cotizacion_id          -- No se puede cambiar cotización origen
proveedor_id           -- No se puede cambiar proveedor
producto_base          -- No se puede cambiar producto
cantidad_aprobada      -- No se puede cambiar cantidad aprobada
precio_unitario        -- No se puede cambiar precio unitario
precio_total           -- No se puede cambiar precio total
incluye_igv            -- No se puede cambiar IGV (heredan pagos)
fecha_aprobacion       -- No se puede cambiar fecha de aprobación
```

### Campos MUTABLES (Pueden Cambiar)

```sql
-- MUTABLES (UPDATE permitido):
variante               -- Puede ajustarse (ej: "con gancho" → "sin gancho")
descripcion            -- Puede actualizarse con más detalles
fecha_envio_produccion -- Se llena cuando se envía a producir
fecha_compromiso       -- Puede cambiar si proveedor reprograma
fecha_entrega_real     -- Se llena cuando se entrega
prueba_color           -- Cambia según QC
muestra_fisica         -- Cambia según QC
observaciones_qc       -- Se agregan observaciones
estado                 -- Cambia por eventos (via trigger)
responsable            -- Puede reasignarse
notas                  -- Se pueden agregar notas
updated_at             -- Se actualiza automáticamente
```

### Implementación en Trigger

```sql
-- Trigger que previene UPDATE de campos congelados
CREATE OR REPLACE FUNCTION prevenir_cambios_congelados()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.pedido_id != NEW.pedido_id THEN
        RAISE EXCEPTION 'No se puede cambiar pedido_id (campo congelado)';
    END IF;

    IF OLD.cotizacion_id IS DISTINCT FROM NEW.cotizacion_id THEN
        RAISE EXCEPTION 'No se puede cambiar cotizacion_id (campo congelado)';
    END IF;

    IF OLD.proveedor_id != NEW.proveedor_id THEN
        RAISE EXCEPTION 'No se puede cambiar proveedor_id (campo congelado)';
    END IF;

    IF OLD.producto_base != NEW.producto_base THEN
        RAISE EXCEPTION 'No se puede cambiar producto_base (campo congelado)';
    END IF;

    IF OLD.cantidad_aprobada != NEW.cantidad_aprobada THEN
        RAISE EXCEPTION 'No se puede cambiar cantidad_aprobada (campo congelado)';
    END IF;

    IF OLD.precio_unitario != NEW.precio_unitario THEN
        RAISE EXCEPTION 'No se puede cambiar precio_unitario (campo congelado)';
    END IF;

    IF OLD.precio_total != NEW.precio_total THEN
        RAISE EXCEPTION 'No se puede cambiar precio_total (campo congelado)';
    END IF;

    IF OLD.incluye_igv != NEW.incluye_igv THEN
        RAISE EXCEPTION 'No se puede cambiar incluye_igv (campo congelado - heredan pagos)';
    END IF;

    IF OLD.fecha_aprobacion != NEW.fecha_aprobacion THEN
        RAISE EXCEPTION 'No se puede cambiar fecha_aprobacion (campo congelado)';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevenir_cambios_congelados
    BEFORE UPDATE ON producciones
    FOR EACH ROW
    EXECUTE FUNCTION prevenir_cambios_congelados();
```

---

## E. FLUJO COMPLETO DE EJEMPLO

### Escenario: 100 Lanyards para T&C

#### 1. Crear Producción (CONGELADA al crear)
```sql
INSERT INTO producciones (
    id, pedido_id, cotizacion_id, proveedor_id,
    producto_base, variante, descripcion,
    cantidad_aprobada, precio_unitario, precio_total, incluye_igv,
    fecha_aprobacion, estado
) VALUES (
    'PROD-123', 'PED-456', 'COT-789', 'Patricia Textil',
    'lanyard', '2.5cm sublimado con gancho', '100 lanyards personalizados',
    100, 10.00, 1000.00, false,
    '2026-01-13 09:00:00', 'en_proceso'
);
```

#### 2. Evento: Adelanto pagado (NO cambia estado)
```sql
INSERT INTO eventos_logisticos (
    id, produccion_id, tipo, timestamp_evento,
    actor_tipo, actor_nombre, descripcion,
    metadata, cambia_estado, nuevo_estado
) VALUES (
    'EVT-001', 'PROD-123', 'adelanto_pagado', '2026-01-13 10:30:00',
    'usuario', 'Huber', 'Adelanto 50% a Patricia Textil',
    '{"monto": 500.00, "metodo": "yape", "numero_operacion": "OP-123456"}',
    false, null
);

-- Crear pago asociado
INSERT INTO pagos (
    id, produccion_id, evento_id, tipo,
    monto, moneda, incluye_igv,  -- IGV HEREDADO de producción
    metodo, numero_operacion, destinatario, concepto, fecha_pago
) VALUES (
    'PAG-001', 'PROD-123', 'EVT-001', 'adelanto',
    500.00, 'PEN', false,  -- incluye_igv = false (heredado)
    'yape', 'OP-123456', 'Patricia Textil', 'Adelanto 50%', '2026-01-13 10:30:00'
);
```

#### 3. Evento: Envío a producción (CAMBIA estado → en_proceso)
```sql
INSERT INTO eventos_logisticos (
    id, produccion_id, tipo, timestamp_evento,
    actor_tipo, actor_nombre, descripcion,
    cambia_estado, nuevo_estado
) VALUES (
    'EVT-002', 'PROD-123', 'envio_produccion', '2026-01-13 11:00:00',
    'usuario', 'Huber', 'Orden enviada a producción vía WhatsApp',
    true, 'en_proceso'
);
-- Trigger actualiza producciones.estado = 'en_proceso'
```

#### 4. Evento: Producción lista (CAMBIA estado → listo)
```sql
INSERT INTO eventos_logisticos (
    id, produccion_id, tipo, timestamp_evento,
    actor_tipo, actor_nombre, descripcion,
    cambia_estado, nuevo_estado
) VALUES (
    'EVT-003', 'PROD-123', 'produccion_lista', '2026-01-15 14:00:00',
    'proveedor', 'Patricia Textil', 'Producción terminada, lista para recojo',
    true, 'listo'
);
-- Trigger actualiza producciones.estado = 'listo'
```

#### 5. Evento: Recojo completado (CAMBIA estado → recogido)
```sql
INSERT INTO eventos_logisticos (
    id, produccion_id, tipo, timestamp_evento,
    actor_tipo, actor_nombre, descripcion,
    ubicacion_origen, ubicacion_destino, foto_url,
    cambia_estado, nuevo_estado
) VALUES (
    'EVT-004', 'PROD-123', 'recojo_completado', '2026-01-15 16:30:00',
    'usuario', 'Huber', 'Recogido de Patricia Textil',
    'Jr. Los Pinos 456, Cercado de Lima', 'Oficina Creaactivo',
    'https://storage/recojo-123.jpg',
    true, 'recogido'
);
-- Trigger actualiza producciones.estado = 'recogido'

-- Crear rendición de movilidad (SIN producción)
INSERT INTO rendiciones (
    id, tipo, monto, moneda,
    origen, destino, descripcion, responsable,
    estado_reembolso, tiene_comprobante, fecha_gasto
) VALUES (
    'REN-001', 'movilidad', 25.00, 'PEN',
    'Oficina Creaactivo', 'Patricia Textil - Jr. Los Pinos 456',
    'Taxi para recojo de lanyards', 'Huber',
    'pendiente', false, '2026-01-15 16:00:00'
);
```

#### 6. Evento: Saldo pagado (NO cambia estado)
```sql
INSERT INTO eventos_logisticos (
    id, produccion_id, tipo, timestamp_evento,
    actor_tipo, actor_nombre, descripcion,
    metadata, cambia_estado, nuevo_estado
) VALUES (
    'EVT-005', 'PROD-123', 'saldo_pagado', '2026-01-15 16:35:00',
    'usuario', 'Huber', 'Pago de saldo 50% al recoger',
    '{"monto": 500.00, "metodo": "efectivo"}',
    false, null
);

-- Crear pago de saldo
INSERT INTO pagos (
    id, produccion_id, evento_id, tipo,
    monto, moneda, incluye_igv,  -- IGV HEREDADO de producción
    metodo, destinatario, concepto, fecha_pago
) VALUES (
    'PAG-002', 'PROD-123', 'EVT-005', 'saldo',
    500.00, 'PEN', false,  -- incluye_igv = false (heredado)
    'efectivo', 'Patricia Textil', 'Saldo 50% al recoger', '2026-01-15 16:35:00'
);
```

#### 7. Evento: Entrega completada (CAMBIA estado → entregado - TERMINAL)
```sql
INSERT INTO eventos_logisticos (
    id, produccion_id, tipo, timestamp_evento,
    actor_tipo, actor_nombre, descripcion,
    ubicacion_origen, ubicacion_destino, foto_url,
    cambia_estado, nuevo_estado
) VALUES (
    'EVT-006', 'PROD-123', 'entrega_completada', '2026-01-16 10:00:00',
    'usuario', 'Angélica', 'Entrega a T&C - Oficina San Isidro',
    'Oficina Creaactivo', 'T&C - Av. Javier Prado 2345, San Isidro',
    'https://storage/entrega-123.jpg',
    true, 'entregado'
);
-- Trigger actualiza producciones.estado = 'entregado' (INMUTABLE)
```

---

## F. VALIDACIONES Y CONSTRAINTS

### Check Constraints

```sql
-- Pagos: monto > 0
ALTER TABLE pagos ADD CONSTRAINT check_monto_positivo CHECK (monto > 0);

-- Rendiciones: monto > 0
ALTER TABLE rendiciones ADD CONSTRAINT check_monto_positivo CHECK (monto > 0);

-- Eventos: timestamp_evento no puede ser futuro
ALTER TABLE eventos_logisticos ADD CONSTRAINT check_timestamp_no_futuro
    CHECK (timestamp_evento <= NOW() + INTERVAL '1 hour'); -- Tolerancia 1h por zonas horarias
```

### Unique Constraints

```sql
-- No permitir duplicar evento del mismo tipo para la misma producción en el mismo timestamp
CREATE UNIQUE INDEX idx_eventos_unique ON eventos_logisticos(produccion_id, tipo, timestamp_evento);
```

---

## G. MIGRACIÓN DE DATOS EXISTENTES

### Pagos Legacy → Nueva Estructura

```sql
-- Migrar pagos existentes a nueva tabla
-- NOTA: Solo si hay datos en tabla pagos legacy

INSERT INTO pagos (
    id, produccion_id, evento_id, tipo,
    monto, moneda, incluye_igv,
    metodo, destinatario, concepto, nota, fecha_pago,
    created_at
)
SELECT
    id,
    pedido_id,  -- ASUMIR que pedido_id se mapea a produccion_id (REVISAR MANUALMENTE)
    null,       -- No hay evento_id legacy
    'adelanto', -- ASUMIR que todos son adelantos (REVISAR MANUALMENTE)
    monto,
    'PEN',
    false,      -- ASUMIR false (REVISAR MANUALMENTE)
    'efectivo', -- ASUMIR efectivo (REVISAR MANUALMENTE)
    'Proveedor', -- PLACEHOLDER (REVISAR MANUALMENTE)
    nota,
    nota,
    fecha,
    fecha
FROM pagos_legacy;
```

**⚠️ ADVERTENCIA:** Esta migración requiere REVISIÓN MANUAL porque:
- `pedido_id` NO es lo mismo que `produccion_id`
- No hay información de `tipo` de pago
- No hay información de `metodo` de pago
- No hay información de `incluye_igv`

---

## H. RESUMEN DE CAMBIOS PROPUESTOS

### Nuevas Tablas (3)
1. ✅ `eventos_logisticos` - Registro append-only de eventos
2. ✅ `pagos` (NUEVA) - Pagos ligados a producción
3. ✅ `rendiciones` - Gastos sin producción

### Nuevos Tipos ENUM (5)
1. `evento_tipo` - Tipos de eventos logísticos
2. `actor_tipo` - Tipos de actores
3. `pago_tipo` - Tipos de pago
4. `metodo_pago` - Métodos de pago
5. `rendicion_tipo` - Tipos de rendición
6. `reembolso_estado` - Estados de reembolso

### Nuevos Triggers (2)
1. `trigger_actualizar_estado` - Actualiza `producciones.estado` cuando se inserta evento con `cambia_estado=true`
2. `trigger_prevenir_cambios_congelados` - Previene UPDATE de campos congelados en `producciones`

### Índices Nuevos (15+)
- 6 en `eventos_logisticos`
- 4 en `pagos`
- 4 en `rendiciones`

---

## I. PLAN DE EJECUCIÓN (CUANDO SE APRUEBE)

### Orden de Ejecución
1. Crear tipos ENUM
2. Crear tabla `eventos_logisticos`
3. Crear tabla `pagos` (NUEVA)
4. Crear tabla `rendiciones`
5. Crear triggers
6. Migrar datos legacy (REVISAR MANUAL)
7. Actualizar frontend (`DatabaseContext.tsx`)
8. Testing exhaustivo

### Scripts a Preparar
- `sql/fase2_migration.sql` - Script completo
- `scripts/execute-fase2-migration.mjs` - Executor
- `scripts/migrate-pagos-legacy.mjs` - Migración de datos legacy

---

## J. PREGUNTAS ABIERTAS PARA APROBAR FASE 2

1. ⚠️ **¿Migrar datos de `pagos` legacy?**
   - Actualmente hay 0 registros, pero si existieran, ¿cómo mapear a la nueva estructura?

2. ⚠️ **¿Eventos retroactivos?**
   - ¿Permitir registrar eventos con `timestamp_evento` en el pasado?
   - ¿Cuál es el límite? (ej: máximo 30 días atrás)

3. ⚠️ **¿Soft delete en eventos?**
   - ¿Permitir "borrar" eventos (soft delete con `deleted_at`)?
   - ¿O son 100% inmutables (ni UPDATE ni DELETE)?

4. ⚠️ **¿Eventos automáticos del sistema?**
   - ¿Crear eventos automáticamente cuando se crea una producción?
   - ¿Crear eventos automáticamente cuando se hace un pago?

5. ⚠️ **¿Notificaciones?**
   - ¿Trigger que envíe notificaciones cuando cambia el estado?
   - ¿Integración con WhatsApp/Email?

---

**Estado:** 📋 DISEÑO COMPLETO - ESPERANDO APROBACIÓN PARA FASE 2

**Siguiente paso:** Revisar este diseño y aprobar para proceder con implementación.
