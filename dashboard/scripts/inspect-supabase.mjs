import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres.ujrhxbwmfylaemkmgwqi:All4114all23@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString: DATABASE_URL });

async function inspectSupabase() {
    try {
        await client.connect();
        console.log('✅ Conectado a Supabase\n');

        // 1. Listar todas las tablas existentes
        const tablesQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;
        const tablesResult = await client.query(tablesQuery);
        console.log('📋 TABLAS EXISTENTES:');
        console.log('='.repeat(50));
        tablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
        console.log('\n');

        // 2. Para cada tabla, obtener estructura y conteo de registros
        for (const { table_name } of tablesResult.rows) {
            // Estructura de columnas
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position;
            `;
            const columnsResult = await client.query(columnsQuery, [table_name]);

            // Conteo de registros
            const countQuery = `SELECT COUNT(*) as count FROM "${table_name}"`;
            const countResult = await client.query(countQuery);
            const count = countResult.rows[0].count;

            console.log(`📊 TABLA: ${table_name.toUpperCase()} (${count} registros)`);
            console.log('-'.repeat(80));
            columnsResult.rows.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
                console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable} ${defaultVal}`);
            });
            console.log('\n');

            // Si hay registros, mostrar ejemplos
            if (count > 0 && count <= 5) {
                const sampleQuery = `SELECT * FROM "${table_name}" LIMIT 3`;
                const sampleResult = await client.query(sampleQuery);
                console.log(`🔍 Ejemplos de datos:`);
                sampleResult.rows.forEach((row, idx) => {
                    console.log(`  [${idx + 1}]`, JSON.stringify(row, null, 2));
                });
                console.log('\n');
            }
        }

        // 3. Verificar relaciones (foreign keys)
        const fkQuery = `
            SELECT
                tc.table_name AS tabla_origen,
                kcu.column_name AS columna_origen,
                ccu.table_name AS tabla_destino,
                ccu.column_name AS columna_destino
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
            ORDER BY tc.table_name;
        `;
        const fkResult = await client.query(fkQuery);
        if (fkResult.rows.length > 0) {
            console.log('🔗 RELACIONES (FOREIGN KEYS):');
            console.log('='.repeat(80));
            fkResult.rows.forEach(fk => {
                console.log(`  ${fk.tabla_origen}.${fk.columna_origen} → ${fk.tabla_destino}.${fk.columna_destino}`);
            });
        } else {
            console.log('⚠️  No hay foreign keys configuradas');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

inspectSupabase();
