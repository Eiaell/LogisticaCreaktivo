#!/usr/bin/env node
/**
 * Migration script: Add 'banco' column to cotizaciones table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  console.error('Intenta con la ANON_KEY temporalmente...');

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.error('❌ No hay keys disponibles');
    process.exit(1);
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY);

async function migrate() {
  try {
    console.log('🚀 Iniciando migración: agregando columna banco a cotizaciones...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS banco TEXT;`
    });

    if (error) {
      console.error('❌ Error en migración:', error);
      return;
    }

    console.log('✅ Migración completada exitosamente');
    console.log('✅ Columna "banco" agregada a tabla cotizaciones');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

migrate();
