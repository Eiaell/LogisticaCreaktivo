import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Error: faltan credenciales de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function migrate() {
  try {
    console.log('🚀 Verificando estructura de tabla cotizaciones...');

    // Intentar insertar una cotización de prueba con el campo banco
    // para ver si la columna existe
    const { error: checkError } = await supabase
      .from('cotizaciones')
      .select('banco')
      .limit(1);

    if (checkError && checkError.code === 'PGRST116') {
      console.log('⚠️  Columna "banco" no existe en cotizaciones');
      console.log('📋 Para agregar la columna, ejecuta manualmente en Supabase SQL Editor:');
      console.log('');
      console.log('  ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS banco TEXT;');
      console.log('');
      process.exit(0);
    }

    if (checkError) {
      console.error('❌ Error al verificar:', checkError.message);
      process.exit(1);
    }

    console.log('✅ Columna "banco" ya existe en cotizaciones');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

migrate();
