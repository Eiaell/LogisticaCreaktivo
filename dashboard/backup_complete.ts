import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupEverything() {
  console.log('💾 INICIANDO BACKUP COMPLETO...\n');

  try {
    // 1. Descargar clientes
    console.log('📥 Descargando clientes...');
    const { data: clientesData } = await supabase.from('clientes').select('*');
    console.log(`  ✅ ${clientesData?.length || 0} clientes descargados`);

    // 2. Descargar proveedores
    console.log('📥 Descargando proveedores...');
    const { data: proveedoresData } = await supabase.from('proveedores').select('*');
    console.log(`  ✅ ${proveedoresData?.length || 0} proveedores descargados`);

    // 3. Descargar pedidos
    console.log('📥 Descargando pedidos...');
    const { data: pedidosData } = await supabase.from('pedidos').select('*');
    console.log(`  ✅ ${pedidosData?.length || 0} pedidos descargados`);

    // 4. Descargar líneas de pedido
    console.log('📥 Descargando líneas de pedido...');
    const { data: lineasData } = await supabase.from('lineas_pedido').select('*');
    console.log(`  ✅ ${lineasData?.length || 0} líneas descargadas`);

    // 5. Descargar cotizaciones
    console.log('📥 Descargando cotizaciones...');
    const { data: cotizacionesData } = await supabase.from('cotizaciones').select('*');
    console.log(`  ✅ ${cotizacionesData?.length || 0} cotizaciones descargadas`);

    // 6. Crear backup
    const backup = {
      meta: {
        type: 'backup_completo',
        timestamp: new Date().toISOString(),
        version: 1
      },
      clientes: clientesData || [],
      proveedores: proveedoresData || [],
      pedidos: pedidosData || [],
      lineas_pedido: lineasData || [],
      cotizaciones: cotizacionesData || []
    };

    // 7. Guardar en archivo
    const backupPath = path.join(process.cwd(), 'data', `backup_${new Date().toISOString().split('T')[0]}.json`);
    const dir = path.dirname(backupPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`\n✅ BACKUP GUARDADO EN:`);
    console.log(`   📂 ${backupPath}`);
    console.log(`\n📊 RESUMEN:`);
    console.log(`   • Clientes: ${clientesData?.length || 0}`);
    console.log(`   • Proveedores: ${proveedoresData?.length || 0}`);
    console.log(`   • Pedidos: ${pedidosData?.length || 0}`);
    console.log(`   • Líneas: ${lineasData?.length || 0}`);
    console.log(`   • Cotizaciones: ${cotizacionesData?.length || 0}`);
    console.log(`\n🎉 BACKUP COMPLETADO EXITOSAMENTE`);
    console.log(`\nPara restaurar este backup, carga el archivo en el dashboard con "📂 Cargar Datos"`);

  } catch (error) {
    console.error('❌ Error durante backup:', error);
  }
}

backupEverything().catch(console.error);
