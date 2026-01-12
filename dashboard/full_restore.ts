import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullRestore() {
  console.log('🔄 Iniciando restauración COMPLETA...\n');

  // PASO 1: Clientes ya restaurados
  console.log('📋 Clientes ya restaurados (6)');

  // PASO 2: Restaurar TODOS los proveedores
  console.log('\n🏭 Restaurando proveedores desde proveedores-raw.json...');

  const rawData = JSON.parse(fs.readFileSync('scripts/input/proveedores-raw.json', 'utf-8'));
  const allProveedores: any[] = [];

  // Recolectar todos los proveedores de todas las categorías
  for (const [category, providers] of Object.entries(rawData)) {
    if (Array.isArray(providers)) {
      console.log(`  └─ Categoría: ${category} (${(providers as any[]).length} proveedores)`);
      allProveedores.push(...(providers as any[]));
    }
  }

  console.log(`\n📤 Total proveedores a restaurar: ${allProveedores.length}`);

  let successCount = 0;
  for (const prov of allProveedores) {
    try {
      const proveedorData = {
        nombre: prov.nombre || 'Sin nombre',
        razon_social: prov.nombre || '',
        ruc: prov.ruc || '',
        contacto: prov.contacto || '',
        email: prov.correo || '',
        telefono: prov.contacto || '',
        direccion: prov.direccion || '',
        especialidad: prov.material || '',
        forma_pago: prov.pago || 'contado',
        notas: `Referencia: ${prov.referencia || 'N/A'} | Cuenta: ${prov.cuenta || 'N/A'}`,
        emite_factura: false,
        factor_demora: 0
      };

      const { error } = await supabase.from('proveedores').upsert(proveedorData, { onConflict: 'nombre' });

      if (error) {
        console.error(`  ❌ ${prov.nombre}: ${error.message}`);
      } else {
        successCount++;
        if (successCount % 20 === 0) {
          console.log(`  ✅ ${successCount}/${allProveedores.length} proveedores insertados...`);
        }
      }
    } catch (err: any) {
      console.error(`  ❌ Error con ${prov.nombre}:`, err.message);
    }
  }

  console.log(`\n✅ Restauración completada:`);
  console.log(`   - Clientes: 6 ✅`);
  console.log(`   - Proveedores: ${successCount}/${allProveedores.length} ✅`);
}

fullRestore().catch(console.error);
