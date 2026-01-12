import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreBackup() {
  console.log('🔄 Restaurando backup de clientes...');
  
  const clientes = [
    {
      nombre: "DESARROLLO INMOBILIARIO FT SOCIEDAD ANONIMA CERRADA",
      razon_social: "DESARROLLO INMOBILIARIO FT SOCIEDAD ANONIMA CERRADA",
      nombre_comercial: "Grupo Lar",
      grupo_empresarial: "Grupo Lar",
      grupo_empresarial_ruc: "20601881749",
      ruc: "20601881749",
      direccion: "CAL. AMADOR MERINO REYNA 465 DPTO. 1001 SAN ISIDRO LIMA",
      estado: "activo",
      prioridad: "alto",
      tipo_cliente: "corporativo"
    },
    {
      nombre: "DESARROLLO TANGUIS S.A.C.",
      razon_social: "DESARROLLO TANGUIS S.A.C.",
      nombre_comercial: "DESARROLLO TANGUIS",
      grupo_empresarial: "Grupo Lar",
      grupo_empresarial_ruc: "20601881749",
      ruc: "20601832161",
      direccion: "CAL. FRANCISCO GRAÑA 155 URB. SANTA CATALINA LIMA LIMA LA VICTORIA",
      proyecto: "Proyecto Hara",
      proyecto_codigo: "HAR-001",
      estado: "activo",
      prioridad: "alto",
      tipo_cliente: "corporativo"
    },
    {
      nombre: "DESARROLLO INMOBILIARIO FG S.A.C.",
      razon_social: "DESARROLLO INMOBILIARIO FG S.A.C.",
      nombre_comercial: "Zendai",
      grupo_empresarial: "Grupo Lar",
      grupo_empresarial_ruc: "20601881749",
      ruc: "20603735651",
      proyecto: "Proyecto Zendai",
      proyecto_codigo: "ZEN-001",
      estado: "activo",
      prioridad: "medio",
      tipo_cliente: "corporativo"
    },
    {
      nombre: "DESARROLLO PLAZA GRAU S.A.C.",
      razon_social: "DESARROLLO PLAZA GRAU S.A.C.",
      nombre_comercial: "Grupo Lar (Cantúa)",
      grupo_empresarial: "Grupo Lar",
      grupo_empresarial_ruc: "20601881749",
      ruc: "20563177323",
      proyecto: "Proyecto Cantúa",
      proyecto_codigo: "CAN-001",
      estado: "activo",
      prioridad: "medio",
      tipo_cliente: "corporativo"
    },
    {
      nombre: "DHL SUPPLY CHAIN DE LIMA S.A.C.",
      razon_social: "DHL SUPPLY CHAIN DE LIMA S.A.C.",
      nombre_comercial: "DHL",
      ruc: "20606158751",
      direccion: "OTR. LOMO DE CORVINA OTR. PROGRAMA AGROPECUARIO VIL LOTE. 19 INT. 82 VILLA EL SALVADOR",
      estado: "activo",
      prioridad: "alto",
      tipo_cliente: "corporativo"
    },
    {
      nombre: "CLOROX PERU S.A.",
      razon_social: "CLOROX PERU S.A.",
      nombre_comercial: "CLOROX",
      ruc: "20264846855",
      direccion: "AV. VICTOR ANDRES BELAUNDE 332 URB. EL ROSARIO INT. 301 OFICINA 301 PISO 3 LIMA LIMA SAN ISIDRO",
      estado: "activo",
      prioridad: "medio",
      tipo_cliente: "corporativo"
    }
  ];

  for (const cliente of clientes) {
    try {
      const { error } = await supabase.from('clientes').upsert(cliente, { onConflict: 'nombre' });
      if (error) {
        console.error(`❌ Error insertando ${cliente.nombre}:`, error.message);
      } else {
        console.log(`✅ ${cliente.nombre} restaurado`);
      }
    } catch (err: any) {
      console.error(`❌ Error:`, err.message);
    }
  }

  console.log('✅ Restauración completada');
}

restoreBackup();
