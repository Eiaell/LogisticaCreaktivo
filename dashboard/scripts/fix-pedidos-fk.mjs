import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres.ujrhxbwmfylaemkmgwqi:All4114all23@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString: DATABASE_URL });

async function fixPedidosFK() {
    try {
        await client.connect();
        console.log('✅ Conectado a Supabase\n');

        // Encontrar el nombre de la FK
        const fkQuery = `
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'pedidos'
            AND constraint_type = 'FOREIGN KEY';
        `;
        const fkResult = await client.query(fkQuery);

        console.log('📋 Foreign keys encontradas en pedidos:');
        fkResult.rows.forEach(row => console.log('  -', row.constraint_name));

        // Eliminar la FK que apunta a clientes
        for (const row of fkResult.rows) {
            const constraintName = row.constraint_name;

            // Verificar si esta FK es la que apunta a clientes
            const checkQuery = `
                SELECT ccu.table_name as foreign_table
                FROM information_schema.constraint_column_usage ccu
                WHERE ccu.constraint_name = $1;
            `;
            const checkResult = await client.query(checkQuery, [constraintName]);

            if (checkResult.rows[0]?.foreign_table === 'clientes') {
                console.log(`\n🔧 Eliminando FK: ${constraintName}`);
                await client.query(`ALTER TABLE pedidos DROP CONSTRAINT "${constraintName}"`);
                console.log('✅ FK eliminada exitosamente');
            }
        }

        // Verificar resultado
        const verifyQuery = `
            SELECT tc.constraint_name, ccu.table_name as foreign_table
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'pedidos'
            AND tc.constraint_type = 'FOREIGN KEY';
        `;
        const verifyResult = await client.query(verifyQuery);

        console.log('\n📊 FKs restantes en pedidos:');
        if (verifyResult.rows.length === 0) {
            console.log('  (ninguna - pedidos ya no tiene FKs)');
        } else {
            verifyResult.rows.forEach(row => {
                console.log(`  - ${row.constraint_name} → ${row.foreign_table}`);
            });
        }

        console.log('\n✅ Ahora pedidos.cliente_nombre puede ser vacío o un cliente nuevo');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

fixPedidosFK();
