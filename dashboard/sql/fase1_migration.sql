-- ============================================
-- FASE 1: CORRECCIONES CRÍTICAS
-- Fecha: 2026-01-13
-- Objetivo: Dejar schema base correcto sin borrar datos
-- ============================================

-- ============================================
-- 1. LINEAS_PEDIDO: Agregar nuevas columnas
-- ============================================
-- NO eliminamos columnas legacy (producto, variantes, precio_unitario, subtotal)
-- Agregamos nuevas columnas que el frontend usará

ALTER TABLE lineas_pedido
ADD COLUMN IF NOT EXISTS item TEXT,
ADD COLUMN IF NOT EXISTS detalle TEXT,
ADD COLUMN IF NOT EXISTS precio FLOAT DEFAULT 0;

COMMENT ON COLUMN lineas_pedido.item IS 'Nombre del item (ej: Lanyard, Afiches) - USAR ESTE';
COMMENT ON COLUMN lineas_pedido.detalle IS 'Texto libre con cantidades y especificaciones - USAR ESTE';
COMMENT ON COLUMN lineas_pedido.precio IS 'Precio total de la línea - USAR ESTE';
COMMENT ON COLUMN lineas_pedido.producto IS 'LEGACY - No usar (deprecado en Fase 1, eliminar en Fase 3)';
COMMENT ON COLUMN lineas_pedido.variantes IS 'LEGACY - No usar (deprecado en Fase 1, eliminar en Fase 3)';
COMMENT ON COLUMN lineas_pedido.precio_unitario IS 'LEGACY - No usar (deprecado en Fase 1, eliminar en Fase 3)';
COMMENT ON COLUMN lineas_pedido.subtotal IS 'LEGACY - No usar (deprecado en Fase 1, eliminar en Fase 3)';

-- ============================================
-- 2. PROVEEDORES.INCLUYE_IGV: Migrar BOOLEAN → ENUM
-- ============================================

-- Crear tipo ENUM si no existe
DO $$ BEGIN
    CREATE TYPE igv_policy AS ENUM ('si', 'no', 'depende');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Migrar columna incluye_igv
ALTER TABLE proveedores
  ALTER COLUMN incluye_igv DROP DEFAULT;

-- Migrar datos BOOLEAN → ENUM
ALTER TABLE proveedores
  ALTER COLUMN incluye_igv TYPE igv_policy
  USING (
    CASE
      WHEN incluye_igv::TEXT = 'true' THEN 'si'::igv_policy
      WHEN incluye_igv::TEXT = 'false' THEN 'no'::igv_policy
      ELSE 'depende'::igv_policy
    END
  );

-- Restaurar default
ALTER TABLE proveedores
  ALTER COLUMN incluye_igv SET DEFAULT 'depende'::igv_policy;

COMMENT ON COLUMN proveedores.incluye_igv IS 'Política general de IGV del proveedor: si (siempre incluye) | no (nunca incluye) | depende (varía por cotización)';

-- ============================================
-- 3. PRODUCCIONES: Crear tabla (núcleo operativo)
-- ============================================

CREATE TABLE IF NOT EXISTS producciones (
    -- Identificación
    id TEXT PRIMARY KEY,
    pedido_id TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    cotizacion_id TEXT REFERENCES cotizaciones(id) ON DELETE SET NULL,
    proveedor_id TEXT NOT NULL REFERENCES proveedores(nombre) ON DELETE RESTRICT,

    -- Qué se aprobó
    producto_base VARCHAR(100) NOT NULL,
    variante TEXT,
    descripcion TEXT,
    cantidad_aprobada INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    precio_total DECIMAL(10,2) NOT NULL,
    incluye_igv BOOLEAN DEFAULT false,

    -- Tiempos (llenado progresivo)
    fecha_aprobacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_envio_produccion TIMESTAMP WITH TIME ZONE,
    fecha_compromiso TIMESTAMP WITH TIME ZONE,
    fecha_entrega_real TIMESTAMP WITH TIME ZONE,

    -- Control de calidad
    prueba_color VARCHAR(20) DEFAULT 'na',
    muestra_fisica VARCHAR(20) DEFAULT 'na',
    observaciones_qc TEXT,

    -- Seguimiento operativo
    estado VARCHAR(30) DEFAULT 'en_proceso',
    responsable VARCHAR(100),
    notas TEXT,

    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_producciones_pedido ON producciones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_producciones_proveedor ON producciones(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_producciones_estado ON producciones(estado);
CREATE INDEX IF NOT EXISTS idx_producciones_fecha_aprobacion ON producciones(fecha_aprobacion);
CREATE INDEX IF NOT EXISTS idx_producciones_fecha_compromiso ON producciones(fecha_compromiso);
CREATE INDEX IF NOT EXISTS idx_producciones_fecha_entrega ON producciones(fecha_entrega_real);

-- Comentarios
COMMENT ON TABLE producciones IS 'Núcleo operativo - Registro de decisiones de producción aprobadas';
COMMENT ON COLUMN producciones.estado IS 'en_proceso | listo | recogido | entregado | problema';
COMMENT ON COLUMN producciones.prueba_color IS 'pendiente | aprobada | rechazada | na';
COMMENT ON COLUMN producciones.muestra_fisica IS 'pendiente | aprobada | rechazada | na';
COMMENT ON COLUMN producciones.responsable IS 'Persona de logística que ejecuta y da seguimiento';
COMMENT ON COLUMN producciones.incluye_igv IS 'Decisión final ejecutada - inmutable una vez registrada';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Verificar que las 3 tablas tienen la estructura correcta
DO $$
DECLARE
    lineas_item_exists BOOLEAN;
    proveedores_igv_type TEXT;
    producciones_exists BOOLEAN;
BEGIN
    -- Check lineas_pedido.item exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lineas_pedido' AND column_name = 'item'
    ) INTO lineas_item_exists;

    -- Check proveedores.incluye_igv type
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'proveedores' AND column_name = 'incluye_igv'
    INTO proveedores_igv_type;

    -- Check producciones table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'producciones' AND table_schema = 'public'
    ) INTO producciones_exists;

    -- Report results
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'FASE 1 MIGRATION - VERIFICACIÓN';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'lineas_pedido.item agregada: %', lineas_item_exists;
    RAISE NOTICE 'proveedores.incluye_igv tipo: %', proveedores_igv_type;
    RAISE NOTICE 'producciones tabla creada: %', producciones_exists;
    RAISE NOTICE '=================================================';

    IF NOT lineas_item_exists OR proveedores_igv_type != 'USER-DEFINED' OR NOT producciones_exists THEN
        RAISE EXCEPTION 'Migración incompleta - revisar logs';
    END IF;

    RAISE NOTICE '✅ MIGRACIÓN FASE 1 COMPLETADA EXITOSAMENTE';
END $$;
