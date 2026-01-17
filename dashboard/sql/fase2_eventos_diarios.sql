-- ============================================
-- FASE 2: EVENTOS DIARIOS (Resumen día a día)
-- Fecha: 2026-01-16
-- Objetivo: Crear tablas para importar JSON de actividades diarias
-- NOTA: Este script es idempotente (se puede ejecutar múltiples veces)
-- ============================================

-- ============================================
-- 1. MOVIMIENTOS LOGÍSTICOS
-- Entregas, recojos, compras, traslados
-- ============================================

CREATE TABLE IF NOT EXISTS movimientos_logisticos (
    id TEXT PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    cliente TEXT,
    proveedor TEXT,
    pedido_id TEXT REFERENCES pedidos(id) ON DELETE SET NULL,
    detalle JSONB NOT NULL DEFAULT '{}',
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    observaciones TEXT,
    costo_movilidad DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_logisticos(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_logisticos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_cliente ON movimientos_logisticos(cliente);
CREATE INDEX IF NOT EXISTS idx_movimientos_estado ON movimientos_logisticos(estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_pedido ON movimientos_logisticos(pedido_id);

-- ============================================
-- 2. RENDICIONES Y PAGOS
-- ============================================

CREATE TABLE IF NOT EXISTS rendiciones (
    id TEXT PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    cliente TEXT,
    proveedor TEXT,
    pedido_id TEXT REFERENCES pedidos(id) ON DELETE SET NULL,
    produccion_id TEXT REFERENCES producciones(id) ON DELETE SET NULL,
    monto DECIMAL(10,2) NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'PEN',
    detalle JSONB NOT NULL DEFAULT '{}',
    estado VARCHAR(30) NOT NULL DEFAULT 'registrado',
    observaciones TEXT,
    tiene_comprobante BOOLEAN DEFAULT FALSE,
    tipo_comprobante VARCHAR(20),
    numero_comprobante TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rendiciones_fecha ON rendiciones(fecha);
CREATE INDEX IF NOT EXISTS idx_rendiciones_tipo ON rendiciones(tipo);
CREATE INDEX IF NOT EXISTS idx_rendiciones_cliente ON rendiciones(cliente);
CREATE INDEX IF NOT EXISTS idx_rendiciones_proveedor ON rendiciones(proveedor);
CREATE INDEX IF NOT EXISTS idx_rendiciones_estado ON rendiciones(estado);
CREATE INDEX IF NOT EXISTS idx_rendiciones_pedido ON rendiciones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_rendiciones_produccion ON rendiciones(produccion_id);

-- ============================================
-- 3. EVENTOS DE PRODUCCIÓN
-- ============================================

CREATE TABLE IF NOT EXISTS eventos_produccion (
    id TEXT PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'orden_produccion',
    cliente TEXT NOT NULL,
    proveedor TEXT NOT NULL,
    pedido_id TEXT REFERENCES pedidos(id) ON DELETE SET NULL,
    producto TEXT NOT NULL,
    cantidad INTEGER,
    especificaciones JSONB DEFAULT '{}',
    precio_unitario DECIMAL(10,2),
    precio_total DECIMAL(10,2),
    estado VARCHAR(30) NOT NULL DEFAULT 'en_produccion',
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_prod_fecha ON eventos_produccion(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_prod_cliente ON eventos_produccion(cliente);
CREATE INDEX IF NOT EXISTS idx_eventos_prod_proveedor ON eventos_produccion(proveedor);
CREATE INDEX IF NOT EXISTS idx_eventos_prod_estado ON eventos_produccion(estado);

-- ============================================
-- 4. VISTA RESUMEN DIARIO
-- ============================================

CREATE OR REPLACE VIEW v_resumen_diario AS
SELECT
    fecha,
    'MOVIMIENTO_LOGISTICO' as seccion,
    tipo,
    cliente,
    proveedor,
    estado,
    costo_movilidad as monto,
    observaciones,
    created_at
FROM movimientos_logisticos
UNION ALL
SELECT
    fecha,
    'RENDICION_PAGO' as seccion,
    tipo,
    cliente,
    proveedor,
    estado,
    monto,
    observaciones,
    created_at
FROM rendiciones
UNION ALL
SELECT
    fecha,
    'PRODUCCION' as seccion,
    tipo,
    cliente,
    proveedor,
    estado,
    precio_total as monto,
    observaciones,
    created_at
FROM eventos_produccion
ORDER BY fecha DESC, created_at DESC;

-- ============================================
-- 5. RLS Y POLÍTICAS (con manejo de duplicados)
-- ============================================

ALTER TABLE movimientos_logisticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_produccion ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar error de duplicado)
DROP POLICY IF EXISTS "Allow all for movimientos_logisticos" ON movimientos_logisticos;
DROP POLICY IF EXISTS "Allow all for rendiciones" ON rendiciones;
DROP POLICY IF EXISTS "Allow all for eventos_produccion" ON eventos_produccion;

-- Crear políticas
CREATE POLICY "Allow all for movimientos_logisticos" ON movimientos_logisticos
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for rendiciones" ON rendiciones
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for eventos_produccion" ON eventos_produccion
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
    movimientos_exists BOOLEAN;
    rendiciones_exists BOOLEAN;
    eventos_prod_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'movimientos_logisticos' AND table_schema = 'public'
    ) INTO movimientos_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rendiciones' AND table_schema = 'public'
    ) INTO rendiciones_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'eventos_produccion' AND table_schema = 'public'
    ) INTO eventos_prod_exists;

    RAISE NOTICE '=================================================';
    RAISE NOTICE 'FASE 2 MIGRATION - VERIFICACIÓN';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'movimientos_logisticos: %', movimientos_exists;
    RAISE NOTICE 'rendiciones: %', rendiciones_exists;
    RAISE NOTICE 'eventos_produccion: %', eventos_prod_exists;
    RAISE NOTICE '=================================================';

    IF NOT movimientos_exists OR NOT rendiciones_exists OR NOT eventos_prod_exists THEN
        RAISE EXCEPTION 'Migración incompleta - revisar logs';
    END IF;

    RAISE NOTICE 'MIGRACIÓN FASE 2 COMPLETADA EXITOSAMENTE';
END $$;
