import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ujrhxbwmfylaemkmgwqi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU'
);

async function addT6C() {
  console.log('➕ Agregando cliente T&C...');

  const { error } = await supabase.from('clientes').upsert({
    nombre: 'T&C',
    razon_social: 'T&C',
    nombre_comercial: 'T&C',
    estado: 'activo',
    prioridad: 'medio',
    tipo_cliente: 'corporativo'
  }, { onConflict: 'nombre' });

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Cliente T&C restaurado');
  }
}

addT6C().catch(console.error);
