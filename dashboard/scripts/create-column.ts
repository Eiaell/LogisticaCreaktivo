import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc2NTY4MCwiZXhwIjoyMDgzMzQxNjgwfQ.RMHsrxiKcwkvyShlrj4A3u83JNoY5YZWzirFf8LPM4c';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createColumn() {
    console.log('🔄 Intentando crear columna nombre_comercial...');

    // Try using rpc with sql execution
    try {
        const { data, error } = await supabase.rpc('query', {
            query: `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre_comercial TEXT DEFAULT '';`
        });

        if (error) {
            console.log('Error con query:', error);
        } else {
            console.log('✅ Respuesta:', data);
        }
    } catch (err) {
        console.log('Error catch:', err);
    }

    // Intenta una actualización con coalesce para verificar si existe
    console.log('\n🔍 Verificando si columna existe intentando actualizar con NULL...');
    try {
        const { error } = await supabase
            .from('clientes')
            .update({ nombre_comercial: null })
            .eq('nombre', 'DHL SUPPLY CHAIN DE LIMA S.A.C.')
            .is('nombre_comercial', null);

        if (error) {
            if (error.message.includes('does not exist')) {
                console.error('❌ Columna no existe:', error.message);
                console.log('\n⚠️ NECESITAS crear la columna manualmente en Supabase SQL Editor:');
                console.log(`
ALTER TABLE clientes ADD COLUMN nombre_comercial TEXT;
                `);
            } else {
                console.error('Error:', error.message);
            }
        } else {
            console.log('✅ Columna existe!');
        }
    } catch (err: any) {
        console.error('Error:', err?.message);
    }
}

createColumn().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
