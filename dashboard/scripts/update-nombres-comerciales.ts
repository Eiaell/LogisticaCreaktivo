import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

const clientsData = {
    "DESARROLLO INMOBILIARIO FT SOCIEDAD ANONIMA CERRADA": "Grupo Lar",
    "DESARROLLO TANGUIS S.A.C.": "DESARROLLO TANGUIS",
    "DESARROLLO INMOBILIARIO FG S.A.C.": "Zendai",
    "DESARROLLO PLAZA GRAU S.A.C.": "Grupo Lar (Cantúa)",
    "DHL SUPPLY CHAIN DE LIMA S.A.C.": "DHL",
    "CLOROX PERU S.A.": "CLOROX"
};

async function updateNombresComercialesInSupabase() {
    console.log('🔄 Actualizando nombres comerciales en Supabase...');

    for (const [razonSocial, nombreComercial] of Object.entries(clientsData)) {
        try {
            const { error } = await supabase
                .from('clientes')
                .update({ nombre_comercial: nombreComercial })
                .eq('nombre', razonSocial);

            if (error) {
                console.error(`❌ Error actualizando ${razonSocial}:`, error.message);
            } else {
                console.log(`✅ ${razonSocial} -> ${nombreComercial}`);
            }
        } catch (err) {
            console.error(`❌ Excepción al actualizar ${razonSocial}:`, err);
        }
    }

    console.log('✅ Actualización completada');
}

updateNombresComercialesInSupabase().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
