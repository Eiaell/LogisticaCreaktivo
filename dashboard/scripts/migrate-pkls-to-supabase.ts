/**
 * Script to migrate PKLs from JSON to Supabase
 * Run with: npx tsx scripts/migrate-pkls-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import pklsData from '../src/data/pkls.json';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

interface PKLFromJSON {
    pkl_id: string;
    version: string;
    created_at: string;
    updated_at: string;
    clasificacion: {
        tipo_operacion: string;
        area: string;
    };
    cliente: any;
    origen: any;
    productos: any[];
    inputs?: any;
    proveedores: any[];
    estado: {
        actual: string;
        historial: any[];
    };
    tasks: any[];
    eventos_externos: any[];
    costos: any;
    cierre: any;
    alertas: any;
    riesgos_identificados?: any[];
    observaciones?: string;
}

async function migratePKLs() {
    const pkls = pklsData as unknown as PKLFromJSON[];

    console.log(`Migrating ${pkls.length} PKLs to Supabase...`);

    for (const pkl of pkls) {
        try {
            // Insert main PKL record
            const { error: pklError } = await supabase
                .from('pkls')
                .upsert({
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
                }, { onConflict: 'pkl_id' });

            if (pklError) {
                console.error(`Error inserting PKL ${pkl.pkl_id}:`, pklError);
                continue;
            }

            console.log(`✓ PKL ${pkl.pkl_id} inserted`);

            // Insert tasks
            for (const task of pkl.tasks) {
                const { error: taskError } = await supabase
                    .from('pkl_tasks')
                    .upsert({
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
                    }, { onConflict: 'pkl_id,task_id' });

                if (taskError) {
                    console.error(`  Error inserting task ${task.task_id}:`, taskError);
                } else {
                    console.log(`  ✓ Task ${task.task_id}`);
                }
            }

        } catch (err) {
            console.error(`Error processing PKL ${pkl.pkl_id}:`, err);
        }
    }

    console.log('\nMigration complete!');
}

migratePKLs();
