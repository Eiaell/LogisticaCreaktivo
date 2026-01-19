-- ============================================
-- PKL Tables for Supabase
-- ============================================

-- Main PKL table
CREATE TABLE IF NOT EXISTS pkls (
    pkl_id TEXT PRIMARY KEY,                    -- PKL-YYYY-NNNN
    version TEXT DEFAULT '2.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Clasificacion
    tipo_operacion TEXT NOT NULL,               -- produccion, instalacion, etc.
    area TEXT DEFAULT 'logistica',

    -- Cliente (JSONB for flexibility)
    cliente JSONB NOT NULL,                     -- {nombre, proyecto, contacto, direccion_entrega, ejecutiva_asignada}

    -- Origen
    origen JSONB NOT NULL,                      -- {canal, solicitado_por, fecha_solicitud, descripcion_inicial}

    -- Productos (array)
    productos JSONB DEFAULT '[]'::jsonb,        -- [{producto_id, tipo, cantidad, descripcion, atributos}]

    -- Inputs
    inputs JSONB DEFAULT '{}'::jsonb,           -- {arte_grafico: {fuente, estado, fecha_recepcion, archivo}}

    -- Proveedores (array)
    proveedores JSONB DEFAULT '[]'::jsonb,      -- [{proveedor_id, nombre, alias, servicio, ubicacion, contacto}]

    -- Estado
    estado_actual TEXT NOT NULL,                -- recibido, en_produccion, etc.
    estado_historial JSONB DEFAULT '[]'::jsonb, -- [{estado, fecha, motivo}]

    -- Eventos externos
    eventos_externos JSONB DEFAULT '[]'::jsonb, -- [{evento_id, descripcion, proveedor_id, fecha, ...}]

    -- Costos
    costos JSONB DEFAULT '{"detalle": [], "total": 0, "moneda": "PEN"}'::jsonb,

    -- Cierre
    cierre JSONB DEFAULT '{"evidencias": []}'::jsonb,

    -- Alertas
    alertas JSONB DEFAULT '{"dias_sin_actividad": 0, "umbral_pausa_dias": 3}'::jsonb,

    -- Riesgos
    riesgos_identificados JSONB DEFAULT '[]'::jsonb,

    -- Observaciones
    observaciones TEXT
);

-- PKL Tasks table (separate for better querying and updates)
CREATE TABLE IF NOT EXISTS pkl_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pkl_id TEXT NOT NULL REFERENCES pkls(pkl_id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,                      -- T001, T002, etc.
    orden INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL,                         -- coordinacion_proveedor, movilidad, etc.
    responsable TEXT NOT NULL,
    proveedor_id TEXT,
    estado TEXT DEFAULT 'pendiente',            -- pendiente, en_progreso, completado, cancelado
    es_happy_path BOOLEAN DEFAULT true,
    bloqueado_por_evento TEXT,
    duracion_min INTEGER,
    costo JSONB,                                -- {monto, moneda, concepto, medio_pago, incluye_igv, comprobante}
    ruta JSONB,                                 -- {origen, destino}
    ubicacion TEXT,
    resultado JSONB,                            -- {precio_encontrado, moneda, observaciones}
    fecha_completado DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(pkl_id, task_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pkls_estado ON pkls(estado_actual);
CREATE INDEX IF NOT EXISTS idx_pkls_tipo ON pkls(tipo_operacion);
CREATE INDEX IF NOT EXISTS idx_pkls_updated ON pkls(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pkl_tasks_pkl_id ON pkl_tasks(pkl_id);
CREATE INDEX IF NOT EXISTS idx_pkl_tasks_estado ON pkl_tasks(estado);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_pkls_updated_at ON pkls;
CREATE TRIGGER update_pkls_updated_at
    BEFORE UPDATE ON pkls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pkl_tasks_updated_at ON pkl_tasks;
CREATE TRIGGER update_pkl_tasks_updated_at
    BEFORE UPDATE ON pkl_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, for future auth)
ALTER TABLE pkls ENABLE ROW LEVEL SECURITY;
ALTER TABLE pkl_tasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (no auth)
CREATE POLICY "Allow all on pkls" ON pkls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pkl_tasks" ON pkl_tasks FOR ALL USING (true) WITH CHECK (true);
