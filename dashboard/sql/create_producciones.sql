-- ============================================
-- TABLA: producciones
-- Registro de decisiones de producción
-- Un pedido puede tener múltiples producciones
-- ============================================

CREATE TABLE IF NOT EXISTS producciones (
    -- Identificación
    id TEXT PRIMARY KEY,
    pedido_id TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    cotizacion_id TEXT REFERENCES cotizaciones(id) ON DELETE SET NULL,
    proveedor_id TEXT NOT NULL,

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
    prueba_color VARCHAR(20) DEFAULT 'na',  -- 'pendiente' | 'aprobada' | 'rechazada' | 'na'
    muestra_fisica VARCHAR(20) DEFAULT 'na', -- 'pendiente' | 'aprobada' | 'rechazada' | 'na'
    observaciones_qc TEXT,

    -- Seguimiento operativo
    estado VARCHAR(30) DEFAULT 'en_proceso', -- 'en_proceso' | 'listo' | 'recogido' | 'entregado' | 'problema'
    responsable VARCHAR(100),  -- Persona de logística que da seguimiento
    notas TEXT,

    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_producciones_pedido ON producciones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_producciones_proveedor ON producciones(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_producciones_estado ON producciones(estado);
CREATE INDEX IF NOT EXISTS idx_producciones_fecha ON producciones(fecha_aprobacion);

-- Comentarios
COMMENT ON TABLE producciones IS 'Registro de decisiones de producción - cada fila es una decisión aprobada';
COMMENT ON COLUMN producciones.estado IS 'en_proceso | listo | recogido | entregado | problema';
COMMENT ON COLUMN producciones.prueba_color IS 'pendiente | aprobada | rechazada | na';
COMMENT ON COLUMN producciones.responsable IS 'Persona de logística que ejecuta y da seguimiento';
