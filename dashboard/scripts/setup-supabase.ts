import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc2NTY4MCwiZXhwIjoyMDgzMzQxNjgwfQ.RMHsrxiKcwkvyShlrj4A3u83JNoY5YZWzirFf8LPM4c';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const clientsData = {
    "DESARROLLO INMOBILIARIO FT SOCIEDAD ANONIMA CERRADA": "Grupo Lar",
    "DESARROLLO TANGUIS S.A.C.": "DESARROLLO TANGUIS",
    "DESARROLLO INMOBILIARIO FG S.A.C.": "Zendai",
    "DESARROLLO PLAZA GRAU S.A.C.": "Grupo Lar (Cantúa)",
    "DHL SUPPLY CHAIN DE LIMA S.A.C.": "DHL",
    "CLOROX PERU S.A.": "CLOROX"
};

async function setupSupabase() {
    console.log('🔄 Conectando a Supabase con Service Role Key...');

    // Step 1: Create the column if it doesn't exist
    console.log('📋 Creando columna nombre_comercial en tabla clientes...');
    try {
        const { error: createError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE clientes 
                ADD COLUMN IF NOT EXISTS nombre_comercial TEXT DEFAULT '';
            `
        }).catch(() => {
            // Si rpc no funciona, intentar de otra forma
            return { error: null };
        });

        if (createError) {
            console.log('⚠️ No se pudo crear columna vía RPC (puede que ya exista):', createError.message);
        } else {
            console.log('✅ Columna nombre_comercial creada o ya existe');
        }
    } catch (err) {
        console.log('⚠️ RPC no disponible, intentando actualización directa...');
    }

    // Step 2: Update all clients with their nombre_comercial
    console.log('\n📤 Actualizando nombres comerciales en Supabase...');

    for (const [razonSocial, nombreComercial] of Object.entries(clientsData)) {
        try {
            const { error } = await supabase
                .from('clientes')
                .update({ nombre_comercial: nombreComercial })
                .eq('nombre', razonSocial);

            if (error) {
                console.error(`❌ Error actualizando ${razonSocial}:`, error.message);
            } else {
                console.log(`✅ ${razonSocial} → ${nombreComercial}`);
            }
        } catch (err) {
            console.error(`❌ Excepción al actualizar ${razonSocial}:`, err);
        }
    }

    // Step 3: Verify the updates
    console.log('\n🔍 Verificando actualizaciones...');
    try {
        const { data, error } = await supabase
            .from('clientes')
            .select('nombre, nombre_comercial')
            .in('nombre', Object.keys(clientsData));

        if (error) {
            console.error('❌ Error verificando:', error.message);
        } else if (data) {
            console.log('\n📊 Datos en Supabase:');
            data.forEach(c => {
                console.log(`  • ${c.nombre} → ${c.nombre_comercial || '(vacío)'}`);
            });
        }
    } catch (err) {
        console.error('❌ Error en verificación:', err);
    }

    console.log('\n✅ Proceso completado');
}

setupSupabase().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
