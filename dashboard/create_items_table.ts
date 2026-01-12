import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  try {
    console.log('📋 Creando tabla items_cotizacion...');

    // Usar la función RPC para ejecutar SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS items_cotizacion (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item TEXT NOT NULL,
          proveedor_id TEXT NOT NULL,
          proveedor_nombre TEXT NOT NULL,
          ultima_cotizacion TIMESTAMP WITH TIME ZONE,
          cantidad_pedidos INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(item, proveedor_id)
        );

        CREATE INDEX IF NOT EXISTS idx_items_item ON items_cotizacion(item);
        CREATE INDEX IF NOT EXISTS idx_items_proveedor ON items_cotizacion(proveedor_id);

        ALTER TABLE items_cotizacion DISABLE ROW LEVEL SECURITY;
      `
    });

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Tabla items_cotizacion creada exitosamente');
    }
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

createTable();
