/**
 * Script para subir proveedores normalizados a Supabase
 * Ejecutar: npx tsx scripts/upload-proveedores.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase config
const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SupabaseProveedor {
    nombre: string;
    razon_social: string | null;
    ruc: string | null;
    contacto: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    categorias: string[] | null;
    especialidad: string;
    emite_factura: boolean | null;
    incluye_igv: string | null;
    forma_pago: string | null;
    tiempo_produccion: number | null;
    tiempo_entrega: number | null;
    minimo_produccion: string | null;
    factor_demora: number;
    notas: string | null;
}

async function main() {
    const inputPath = path.join(__dirname, 'output', 'proveedores-normalized.json');

    if (!fs.existsSync(inputPath)) {
        console.error('❌ No se encontró el archivo normalizado. Ejecuta primero transform-proveedores.ts');
        return;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📤 SUBIENDO PROVEEDORES A SUPABASE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const proveedoresRaw: SupabaseProveedor[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    console.log(`📥 Proveedores en archivo: ${proveedoresRaw.length}`);

    // Deduplicar por nombre (mantener el primero, combinar notas si hay duplicados)
    const proveedoresMap = new Map<string, SupabaseProveedor>();
    for (const p of proveedoresRaw) {
        const key = p.nombre.toLowerCase().trim();
        if (!proveedoresMap.has(key)) {
            proveedoresMap.set(key, p);
        } else {
            // Si hay duplicado, combinar categorías en notas
            const existing = proveedoresMap.get(key)!;
            if (p.categorias && existing.categorias) {
                const combined = [...new Set([...existing.categorias, ...p.categorias])];
                existing.categorias = combined;
            }
        }
    }

    const proveedores = Array.from(proveedoresMap.values());
    const duplicados = proveedoresRaw.length - proveedores.length;
    if (duplicados > 0) {
        console.log(`⚠️  Duplicados encontrados y combinados: ${duplicados}`);
    }
    console.log(`📤 Proveedores únicos a subir: ${proveedores.length}`);
    console.log('');

    // Columnas existentes en Supabase:
    // nombre, contacto, telefono, direccion, notas, especialidad, factor_demora, logo_url, created_at
    //
    // Datos adicionales se guardan en notas como JSON-like string

    const dataToUpsert = proveedores.map(p => {
        // Construir notas enriquecidas con todos los datos extra
        const notasParts: string[] = [];

        if (p.ruc) notasParts.push(`RUC: ${p.ruc}`);
        if (p.razon_social) notasParts.push(`Razón Social: ${p.razon_social}`);
        if (p.email) notasParts.push(`Email: ${p.email}`);
        if (p.categorias && p.categorias.length > 0) notasParts.push(`Categorías: ${p.categorias.join(', ')}`);
        if (p.forma_pago) notasParts.push(`Pago: ${p.forma_pago}`);
        if (p.notas) notasParts.push(p.notas);

        return {
            nombre: p.nombre,
            contacto: p.contacto,
            telefono: p.telefono,
            direccion: p.direccion,
            especialidad: p.especialidad,
            factor_demora: p.factor_demora,
            notas: notasParts.length > 0 ? notasParts.join(' | ') : null,
            logo_url: null
        };
    });

    // Hacer upsert en lotes de 50
    const batchSize = 50;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < dataToUpsert.length; i += batchSize) {
        const batch = dataToUpsert.slice(i, i + batchSize);
        console.log(`⏳ Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(dataToUpsert.length / batchSize)} (${batch.length} proveedores)...`);

        const { data, error } = await supabase
            .from('proveedores')
            .upsert(batch, { onConflict: 'nombre' });

        if (error) {
            console.error(`   ❌ Error en lote: ${error.message}`);
            errors += batch.length;
        } else {
            inserted += batch.length;
            console.log(`   ✅ Lote completado`);
        }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`✅ Proveedores insertados/actualizados: ${inserted}`);
    if (errors > 0) {
        console.log(`❌ Errores: ${errors}`);
    }
    console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
