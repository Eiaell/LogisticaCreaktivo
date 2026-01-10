import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

const clientes = [
  // GRUPO LAR - HOLDING PRINCIPAL
  {
    razon_social: 'DESARROLLO INMOBILIARIO FT SOCIEDAD ANONIMA CERRADA',
    nombre_comercial: 'Grupo Lar',
    grupo_empresarial: 'Grupo Lar',
    grupo_empresarial_ruc: '20601881749',
    ruc: '20601881749',
    telefono: null,
    direccion: 'CAL. AMADOR MERINO REYNA 465 DPTO. 1001 SAN ISIDRO LIMA',
    contacto: null,
    email: null,
    estado: 'activo',
    prioridad: 'alto',
    tipo_cliente: 'corporativo',
    proyecto: null,
  },
  // PROYECTO HARA
  {
    razon_social: 'DESARROLLO TANGUIS S.A.C.',
    nombre_comercial: 'DESARROLLO TANGUIS',
    grupo_empresarial: 'Grupo Lar',
    grupo_empresarial_ruc: '20601881749',
    ruc: '20601832161',
    telefono: null,
    direccion: 'CAL. FRANCISCO GRAÑA 155 URB. SANTA CATALINA LIMA LIMA LA VICTORIA',
    contacto: null,
    email: null,
    estado: 'activo',
    prioridad: 'alto',
    tipo_cliente: 'corporativo',
    proyecto: 'Proyecto Hara',
    proyecto_codigo: 'HAR-001',
  },
  // PROYECTO ZENDAI
  {
    razon_social: 'DESARROLLO INMOBILIARIO FG S.A.C.',
    nombre_comercial: 'Zendai',
    grupo_empresarial: 'Grupo Lar',
    grupo_empresarial_ruc: '20601881749',
    ruc: '20603735651',
    telefono: null,
    direccion: null,
    contacto: null,
    email: null,
    estado: 'activo',
    prioridad: 'medio',
    tipo_cliente: 'corporativo',
    proyecto: 'Proyecto Zendai',
    proyecto_codigo: 'ZEN-001',
  },
  // PROYECTO CANTÚA
  {
    razon_social: 'DESARROLLO PLAZA GRAU S.A.C.',
    nombre_comercial: 'Grupo Lar (Cantúa)',
    grupo_empresarial: 'Grupo Lar',
    grupo_empresarial_ruc: '20601881749',
    ruc: '20563177323',
    telefono: null,
    direccion: null,
    contacto: null,
    email: null,
    estado: 'activo',
    prioridad: 'medio',
    tipo_cliente: 'corporativo',
    proyecto: 'Proyecto Cantúa',
    proyecto_codigo: 'CAN-001',
  },
  // DHL - CLIENTE INDEPENDIENTE
  {
    razon_social: 'DHL SUPPLY CHAIN DE LIMA S.A.C.',
    nombre_comercial: 'DHL',
    grupo_empresarial: null,
    grupo_empresarial_ruc: null,
    ruc: '20606158751',
    telefono: null,
    direccion: 'OTR. LOMO DE CORVINA OTR. PROGRAMA AGROPECUARIO VIL LOTE. 19 INT. 82 VILLA EL SALVADOR',
    contacto: null,
    email: null,
    estado: 'activo',
    prioridad: 'alto',
    tipo_cliente: 'corporativo',
    proyecto: null,
  },
  // CLOROX - CLIENTE INDEPENDIENTE
  {
    razon_social: 'CLOROX PERU S.A.',
    nombre_comercial: 'CLOROX',
    grupo_empresarial: null,
    grupo_empresarial_ruc: null,
    ruc: '20264846855',
    telefono: null,
    direccion: 'AV. VICTOR ANDRES BELAUNDE 332 URB. EL ROSARIO INT. 301 OFICINA 301 PISO 3 LIMA LIMA SAN ISIDRO',
    contacto: null,
    email: null,
    estado: 'activo',
    prioridad: 'medio',
    tipo_cliente: 'corporativo',
    proyecto: null,
  },
];

async function seedClientes() {
  console.log('🌱 Insertando clientes en Supabase...');

  // Primero eliminar todos los clientes existentes
  const { error: deleteError } = await supabase.from('clientes').delete().neq('razon_social', '');
  if (deleteError) {
    console.error('Error eliminando clientes:', deleteError);
  } else {
    console.log('✓ Clientes antiguos eliminados');
  }

  // Insertar nuevos clientes
  const { data, error } = await supabase.from('clientes').insert(clientes);

  if (error) {
    console.error('❌ Error insertando clientes:', error);
    return;
  }

  console.log('✅ Clientes insertados correctamente:');
  clientes.forEach(c => {
    console.log(`  - ${c.razon_social} (${c.proyecto || 'Sin proyecto'})`);
  });
}

seedClientes();
