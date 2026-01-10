import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ujrhxbwmfylaemkmgwqi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU'
);

async function main() {
    const { data, error } = await supabase.from('proveedores').select('*').limit(1);
    if (error) {
        console.log('Error:', error.message);
    } else if (data && data[0]) {
        console.log('Columnas existentes en proveedores:');
        Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
    } else {
        console.log('Tabla vacía, intentando insertar uno de prueba...');
        const { error: insertError } = await supabase.from('proveedores').insert({
            nombre: 'TEST_DELETE_ME',
            especialidad: 'Test',
            factor_demora: 0
        });
        if (insertError) {
            console.log('Error insert:', insertError.message);
        } else {
            const { data: d2 } = await supabase.from('proveedores').select('*').eq('nombre', 'TEST_DELETE_ME').single();
            if (d2) {
                console.log('Columnas:', Object.keys(d2));
                await supabase.from('proveedores').delete().eq('nombre', 'TEST_DELETE_ME');
            }
        }
    }
}

main();
