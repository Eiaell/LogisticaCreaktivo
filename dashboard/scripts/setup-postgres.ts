import { Client } from 'pg';

const client = new Client({
    user: 'postgres.ujrhxbwmfylaemkmgwqi',
    password: 'All4114all23',
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

const clientsData = {
    "DESARROLLO INMOBILIARIO FT SOCIEDAD ANONIMA CERRADA": "Grupo Lar",
    "DESARROLLO TANGUIS S.A.C.": "DESARROLLO TANGUIS",
    "DESARROLLO INMOBILIARIO FG S.A.C.": "Zendai",
    "DESARROLLO PLAZA GRAU S.A.C.": "Grupo Lar (Cantúa)",
    "DHL SUPPLY CHAIN DE LIMA S.A.C.": "DHL",
    "CLOROX PERU S.A.": "CLOROX"
};

async function setupPostgres() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');

        // Step 1: Create the column
        console.log('\n📋 Creando columna nombre_comercial...');
        try {
            await client.query(`
                ALTER TABLE public.clientes
                ADD COLUMN IF NOT EXISTS nombre_comercial TEXT DEFAULT '';
            `);
            console.log('✅ Columna nombre_comercial creada/verificada');
        } catch (err: any) {
            if (err.message.includes('already exists')) {
                console.log('✅ Columna ya existe');
            } else {
                console.error('❌ Error creando columna:', err.message);
            }
        }

        // Step 2: Update all clients
        console.log('\n📤 Actualizando nombres comerciales...');
        for (const [razonSocial, nombreComercial] of Object.entries(clientsData)) {
            try {
                const result = await client.query(
                    'UPDATE public.clientes SET nombre_comercial = $1 WHERE nombre = $2',
                    [nombreComercial, razonSocial]
                );
                console.log(`✅ ${razonSocial} → ${nombreComercial} (${result.rowCount} filas actualizadas)`);
            } catch (err: any) {
                console.error(`❌ Error actualizando ${razonSocial}:`, err.message);
            }
        }

        // Step 3: Verify
        console.log('\n🔍 Verificando actualizaciones...');
        try {
            const result = await client.query(
                "SELECT nombre, nombre_comercial FROM public.clientes WHERE nombre = ANY($1::text[]) ORDER BY nombre",
                [Object.keys(clientsData)]
            );

            console.log('\n📊 Datos en PostgreSQL:');
            result.rows.forEach((row: any) => {
                console.log(`  • ${row.nombre} → ${row.nombre_comercial || '(vacío)'}`);
            });
        } catch (err: any) {
            console.error('❌ Error verificando:', err.message);
        }

        console.log('\n✅ Proceso completado exitosamente');
        await client.end();

    } catch (err: any) {
        console.error('❌ Error fatal:', err.message);
        process.exit(1);
    }
}

setupPostgres();
