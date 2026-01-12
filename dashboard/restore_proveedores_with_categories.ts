import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeo de categorías del raw a especialidades en la UI
const categoryMap: Record<string, string> = {
  'LOGOS': 'Logos',
  'IMPORTADORES': 'Importadores / Merchandising general',
  'TEXTIL': 'Textil',
  'PINES': 'Merchandising pequeño (pines, lanyards, llaveros)',
  'PAPELERIA': 'Papelería',
  'ECOLOGICO': 'Ecológico',
  'ACRILICO Y LOZA': 'Acrílico y loza',
  'SERVICIOS': 'Servicios especiales / ad-hoc',
  'DECORACIONES': 'Decoración y ambientación'
};

async function restoreWithCategories() {
  console.log('🔄 Restaurando proveedores CON categorías...\n');

  const rawData = JSON.parse(fs.readFileSync('scripts/input/proveedores-raw.json', 'utf-8'));
  let totalRestored = 0;

  // Primero LIMPIAR todos los proveedores
  console.log('🗑️  Limpiando proveedores previos...');
  const { data: allProvs } = await supabase.from('proveedores').select('nombre');
  if (allProvs && allProvs.length > 0) {
    for (const prov of allProvs) {
      await supabase.from('proveedores').delete().eq('nombre', prov.nombre);
    }
    console.log(`  ✅ ${allProvs.length} proveedores eliminados\n`);
  }

  // Ahora insertar CORRECTAMENTE
  for (const [category, providers] of Object.entries(rawData)) {
    if (Array.isArray(providers)) {
      const especialidad = categoryMap[category] || category;
      console.log(`📁 ${category} → "${especialidad}" (${(providers as any[]).length} proveedores)`);

      for (const prov of (providers as any[])) {
        try {
          const proveedorData = {
            nombre: prov.nombre || 'Sin nombre',
            razon_social: prov.nombre || '',
            ruc: prov.ruc || '',
            contacto: prov.contacto || '',
            email: prov.correo || '',
            telefono: prov.contacto || '',
            direccion: prov.direccion || '',
            especialidad: especialidad,
            categorias: [especialidad],
            forma_pago: prov.pago || 'contado',
            notas: `Referencia: ${prov.referencia || 'N/A'} | Cuenta: ${prov.cuenta || 'N/A'}`,
            emite_factura: false,
            factor_demora: 0
          };

          const { error } = await supabase.from('proveedores').upsert(proveedorData, { onConflict: 'nombre' });

          if (error) {
            console.error(`    ❌ ${prov.nombre}: ${error.message}`);
          } else {
            totalRestored++;
          }
        } catch (err: any) {
          console.error(`    ❌ Error con ${prov.nombre}:`, err.message);
        }
      }
      console.log(`  ✅ Completado\n`);
    }
  }

  console.log(`\n🎉 RESTAURACIÓN COMPLETADA:`);
  console.log(`   Total proveedores restaurados: ${totalRestored}`);
  console.log(`   Con categorías y colores ✨`);
}

restoreWithCategories().catch(console.error);
