/**
 * Run PKL migration directly via Supabase client
 * Run with: npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Creating PKL tables...\n');

    // Create pkls table
    const { error: pklsError } = await supabase.rpc('exec_sql', {
        sql: `
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
        `
    });

    if (pklsError) {
        console.log('Note: Could not use exec_sql RPC (expected). Will try direct table creation via insert...');
    }

    // Test if tables exist by trying to select
    const { error: testError } = await supabase.from('pkls').select('pkl_id').limit(1);

    if (testError && testError.code === '42P01') {
        console.log('❌ Tables do not exist. Please run the SQL migration manually in Supabase Dashboard.');
        console.log('\nGo to: https://supabase.com/dashboard/project/ujrhxbwmfylaemkmgwqi/sql/new');
        console.log('And paste the contents of: supabase/migrations/001_create_pkl_tables.sql');
        return false;
    } else if (testError) {
        console.log('Error testing table:', testError.message);
        return false;
    }

    console.log('✓ PKL tables exist!');
    return true;
}

async function migrateData() {
    console.log('\nMigrating PKL data from JSON...\n');

    // Dynamic import for the JSON
    const pklsData = (await import('../src/data/pkls.json', { assert: { type: 'json' } })).default;

    console.log(`Found ${pklsData.length} PKLs to migrate`);

    for (const pkl of pklsData as any[]) {
        try {
            // Check if PKL already exists
            const { data: existing } = await supabase
                .from('pkls')
                .select('pkl_id')
                .eq('pkl_id', pkl.pkl_id)
                .single();

            if (existing) {
                console.log(`⏭️  PKL ${pkl.pkl_id} already exists, skipping`);
                continue;
            }

            // Insert PKL
            const { error: pklError } = await supabase.from('pkls').insert({
                pkl_id: pkl.pkl_id,
                version: pkl.version,
                created_at: pkl.created_at,
                updated_at: pkl.updated_at,
                tipo_operacion: pkl.clasificacion.tipo_operacion,
                area: pkl.clasificacion.area,
                cliente: pkl.cliente,
                origen: pkl.origen,
                productos: pkl.productos,
                inputs: pkl.inputs || {},
                proveedores: pkl.proveedores,
                estado_actual: pkl.estado.actual,
                estado_historial: pkl.estado.historial,
                eventos_externos: pkl.eventos_externos,
                costos: pkl.costos,
                cierre: pkl.cierre,
                alertas: pkl.alertas,
                riesgos_identificados: pkl.riesgos_identificados || [],
                observaciones: pkl.observaciones
            });

            if (pklError) {
                console.error(`❌ Error inserting PKL ${pkl.pkl_id}:`, pklError.message);
                continue;
            }

            console.log(`✓ PKL ${pkl.pkl_id} inserted`);

            // Insert tasks
            for (const task of pkl.tasks) {
                const { error: taskError } = await supabase.from('pkl_tasks').insert({
                    pkl_id: pkl.pkl_id,
                    task_id: task.task_id,
                    orden: task.orden,
                    nombre: task.nombre,
                    descripcion: task.descripcion,
                    tipo: task.tipo,
                    responsable: task.responsable,
                    proveedor_id: task.proveedor_id,
                    estado: task.estado,
                    es_happy_path: task.es_happy_path,
                    bloqueado_por_evento: task.bloqueado_por_evento,
                    duracion_min: task.duracion_min,
                    costo: task.costo,
                    ruta: task.ruta,
                    ubicacion: task.ubicacion,
                    resultado: task.resultado,
                    fecha_completado: task.fecha_completado
                });

                if (taskError) {
                    console.error(`  ❌ Task ${task.task_id}:`, taskError.message);
                } else {
                    console.log(`  ✓ Task ${task.task_id}`);
                }
            }
        } catch (err) {
            console.error(`Error processing PKL ${pkl.pkl_id}:`, err);
        }
    }

    console.log('\n✅ Migration complete!');
}

async function main() {
    const tablesExist = await runMigration();
    if (tablesExist) {
        await migrateData();
    }
}

main();
