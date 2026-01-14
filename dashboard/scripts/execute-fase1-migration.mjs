import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres.ujrhxbwmfylaemkmgwqi:All4114all23@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString: DATABASE_URL });

async function executeFase1Migration() {
    try {
        await client.connect();
        console.log('✅ Conectado a Supabase\n');

        // Leer el archivo SQL
        const sql = fs.readFileSync('sql/fase1_migration.sql', 'utf8');

        console.log('🚀 Ejecutando migración Fase 1...\n');
        console.log('='.repeat(60));

        // Ejecutar la migración completa
        const result = await client.query(sql);

        console.log('='.repeat(60));
        console.log('\n✅ Migración ejecutada exitosamente\n');

        // Verificar el resultado final
        console.log('🔍 Verificando estructura final...\n');

        // Verificar lineas_pedido
        const lineasCheck = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'lineas_pedido' AND column_name IN ('item', 'detalle', 'precio')
            ORDER BY column_name;
        `);
        console.log('📋 lineas_pedido - Nuevas columnas:');
        lineasCheck.rows.forEach(col => {
            console.log(`  ✓ ${col.column_name.padEnd(15)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Verificar proveedores.incluye_igv
        const proveedoresCheck = await client.query(`
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_name = 'proveedores' AND column_name = 'incluye_igv';
        `);
        console.log('\n🏭 proveedores.incluye_igv:');
        console.log(`  ✓ Tipo: ${proveedoresCheck.rows[0].data_type} (${proveedoresCheck.rows[0].udt_name})`);

        // Verificar tabla producciones
        const produccionesCheck = await client.query(`
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_name = 'producciones' AND table_schema = 'public';
        `);
        console.log('\n🏭 producciones:');
        console.log(`  ✓ Tabla creada: ${produccionesCheck.rows[0].count === '1' ? 'SÍ' : 'NO'}`);

        if (produccionesCheck.rows[0].count === '1') {
            const colsCheck = await client.query(`
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_name = 'producciones';
            `);
            console.log(`  ✓ Columnas: ${colsCheck.rows[0].count}`);

            const idxCheck = await client.query(`
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'producciones'
                ORDER BY indexname;
            `);
            console.log(`  ✓ Índices creados: ${idxCheck.rows.length}`);
            idxCheck.rows.forEach(idx => {
                console.log(`    - ${idx.indexname}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ FASE 1 COMPLETADA - SCHEMA BASE CORRECTO');
        console.log('='.repeat(60));

    } catch (err) {
        console.error('\n❌ ERROR EN MIGRACIÓN:');
        console.error(err.message);
        console.error('\nStack trace:', err.stack);
        process.exit(1);
    } finally {
        await client.end();
    }
}

executeFase1Migration();
