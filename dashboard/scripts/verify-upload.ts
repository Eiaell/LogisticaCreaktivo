import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ujrhxbwmfylaemkmgwqi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU'
);

async function verify() {
    const { data, error, count } = await supabase
        .from('proveedores')
        .select('nombre, especialidad, telefono', { count: 'exact' });

    if (error) {
        console.log('Error:', error.message);
        return;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 PROVEEDORES EN SUPABASE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Total: ${count} proveedores`);
    console.log('');

    // Agrupar por especialidad
    const byEspecialidad: Record<string, number> = {};
    data?.forEach(p => {
        byEspecialidad[p.especialidad] = (byEspecialidad[p.especialidad] || 0) + 1;
    });

    console.log('Por categoría:');
    Object.entries(byEspecialidad)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
            console.log(`  ${cat}: ${count}`);
        });

    console.log('');
    console.log('Primeros 15:');
    data?.slice(0, 15).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.nombre} | ${p.telefono || 'Sin tel.'} | ${p.especialidad}`);
    });
}

verify();
