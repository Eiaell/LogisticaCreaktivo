/**
 * Execute SQL via Supabase's SQL endpoint
 * This requires the database password for direct connection
 */

import postgres from 'postgres';

const connectionString = 'postgresql://postgres:All4114all23@db.ujrhxbwmfylaemkmgwqi.supabase.co:5432/postgres';

const sql = postgres(connectionString, {
    ssl: 'require',
});

const migration = `
-- Main PKL table
CREATE TABLE IF NOT EXISTS pkls (
    pkl_id TEXT PRIMARY KEY,
    version TEXT DEFAULT '2.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tipo_operacion TEXT NOT NULL,
    area TEXT DEFAULT 'logistica',
    cliente JSONB NOT NULL,
    origen JSONB NOT NULL,
    productos JSONB DEFAULT '[]'::jsonb,
    inputs JSONB DEFAULT '{}'::jsonb,
    proveedores JSONB DEFAULT '[]'::jsonb,
    estado_actual TEXT NOT NULL,
    estado_historial JSONB DEFAULT '[]'::jsonb,
    eventos_externos JSONB DEFAULT '[]'::jsonb,
    costos JSONB DEFAULT '{"detalle": [], "total": 0, "moneda": "PEN"}'::jsonb,
    cierre JSONB DEFAULT '{"evidencias": []}'::jsonb,
    alertas JSONB DEFAULT '{"dias_sin_actividad": 0, "umbral_pausa_dias": 3}'::jsonb,
    riesgos_identificados JSONB DEFAULT '[]'::jsonb,
    observaciones TEXT
);

-- PKL Tasks table
CREATE TABLE IF NOT EXISTS pkl_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pkl_id TEXT NOT NULL REFERENCES pkls(pkl_id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    orden INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL,
    responsable TEXT NOT NULL,
    proveedor_id TEXT,
    estado TEXT DEFAULT 'pendiente',
    es_happy_path BOOLEAN DEFAULT true,
    bloqueado_por_evento TEXT,
    duracion_min INTEGER,
    costo JSONB,
    ruta JSONB,
    ubicacion TEXT,
    resultado JSONB,
    fecha_completado DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pkl_id, task_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pkls_estado ON pkls(estado_actual);
CREATE INDEX IF NOT EXISTS idx_pkls_tipo ON pkls(tipo_operacion);
CREATE INDEX IF NOT EXISTS idx_pkls_updated ON pkls(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pkl_tasks_pkl_id ON pkl_tasks(pkl_id);
CREATE INDEX IF NOT EXISTS idx_pkl_tasks_estado ON pkl_tasks(estado);
`;

async function runMigration() {
    console.log('Connecting to Supabase Postgres...');

    try {
        // Run each statement separately
        const statements = migration.split(';').filter(s => s.trim().length > 0);

        for (const statement of statements) {
            const trimmed = statement.trim();
            if (trimmed.startsWith('--')) continue;

            console.log('Executing:', trimmed.substring(0, 50) + '...');
            await sql.unsafe(trimmed);
            console.log('✓ Done');
        }

        // Enable RLS
        console.log('Enabling RLS...');
        await sql.unsafe('ALTER TABLE pkls ENABLE ROW LEVEL SECURITY');
        await sql.unsafe('ALTER TABLE pkl_tasks ENABLE ROW LEVEL SECURITY');

        // Create policies (ignore if exists)
        try {
            await sql.unsafe(`CREATE POLICY "Allow all on pkls" ON pkls FOR ALL USING (true) WITH CHECK (true)`);
        } catch (e: any) {
            if (!e.message.includes('already exists')) throw e;
        }
        try {
            await sql.unsafe(`CREATE POLICY "Allow all on pkl_tasks" ON pkl_tasks FOR ALL USING (true) WITH CHECK (true)`);
        } catch (e: any) {
            if (!e.message.includes('already exists')) throw e;
        }

        console.log('\n✅ Migration complete!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await sql.end();
    }
}

runMigration();
