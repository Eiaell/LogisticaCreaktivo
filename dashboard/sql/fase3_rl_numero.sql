-- =============================================
-- FASE 3: Agregar rl_numero (Requisito Logístico)
-- =============================================
--
-- RL (rl_numero): Auto-generado por el sistema, formato RL-YYYY-XXXX
--                 Conecta todo el ciclo logístico (pedido -> cotización -> producción -> entrega)
--
-- RQ (rq_numero): Código INTERNO de la empresa (manual, texto libre)
--                 El usuario lo escribe manualmente, ej: RQ-123, RQ-456
--
-- =============================================

-- 1. Agregar columna rl_numero a pedidos
ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS rl_numero TEXT;

-- 2. Agregar columna rl_numero a cotizaciones
ALTER TABLE cotizaciones
ADD COLUMN IF NOT EXISTS rl_numero TEXT;

-- 3. Agregar columna rl_numero a movimientos_logisticos
ALTER TABLE movimientos_logisticos
ADD COLUMN IF NOT EXISTS rl_numero TEXT;

-- 4. Agregar columna rl_numero a rendiciones
ALTER TABLE rendiciones
ADD COLUMN IF NOT EXISTS rl_numero TEXT;

-- 5. Agregar columna rl_numero a eventos_produccion
ALTER TABLE eventos_produccion
ADD COLUMN IF NOT EXISTS rl_numero TEXT;

-- 6. Crear tabla producciones si no existe (con rl_numero incluido)
CREATE TABLE IF NOT EXISTS producciones (
    id TEXT PRIMARY KEY,
    rl_numero TEXT,
    pedido_id TEXT REFERENCES pedidos(id) ON DELETE SET NULL,
    cotizacion_id TEXT,
    proveedor_id TEXT,
    producto_base TEXT NOT NULL,
    variante TEXT,
    descripcion TEXT,
    cantidad_aprobada INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2),
    precio_total DECIMAL(10,2),
    incluye_igv BOOLEAN DEFAULT FALSE,
    fecha_aprobacion DATE,
    fecha_envio_produccion DATE,
    fecha_compromiso DATE,
    fecha_entrega_real DATE,
    prueba_color VARCHAR(20) DEFAULT 'na',
    muestra_fisica VARCHAR(20) DEFAULT 'na',
    observaciones_qc TEXT,
    estado VARCHAR(20) DEFAULT 'en_proceso',
    responsable TEXT,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Si producciones ya existe, agregar rl_numero
ALTER TABLE producciones
ADD COLUMN IF NOT EXISTS rl_numero TEXT;

-- 8. Crear índices para búsqueda rápida por RL
CREATE INDEX IF NOT EXISTS idx_pedidos_rl ON pedidos(rl_numero);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_rl ON cotizaciones(rl_numero);
CREATE INDEX IF NOT EXISTS idx_producciones_rl ON producciones(rl_numero);
CREATE INDEX IF NOT EXISTS idx_movimientos_rl ON movimientos_logisticos(rl_numero);
CREATE INDEX IF NOT EXISTS idx_rendiciones_rl ON rendiciones(rl_numero);
CREATE INDEX IF NOT EXISTS idx_eventos_prod_rl ON eventos_produccion(rl_numero);

-- 9. Crear índice para RQ (código interno empresa)
CREATE INDEX IF NOT EXISTS idx_pedidos_rq ON pedidos(rq_numero);

-- 10. Políticas RLS para producciones
ALTER TABLE producciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for producciones" ON producciones;
CREATE POLICY "Allow all for producciones" ON producciones FOR ALL USING (true) WITH CHECK (true);

-- 11. Verificación
SELECT 'Columna rl_numero agregada correctamente' AS status;

-- =============================================
-- RESUMEN DE CAMBIOS:
--
-- CAMPOS EN PEDIDOS:
-- - rl_numero: Requisito Logístico (auto, ej: RL-2026-0001) - NUEVO
-- - rq_numero: Código interno empresa (manual, ej: RQ-123) - YA EXISTÍA
--
-- El sistema ahora tiene DOS identificadores:
-- 1. RL: Para tracking interno del sistema (conecta todo el flujo)
-- 2. RQ: Para comunicación interna de la empresa
-- =============================================
