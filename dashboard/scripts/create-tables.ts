/**
 * Create PKL tables using Supabase REST API with service role
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujrhxbwmfylaemkmgwqi.supabase.co';
// Using anon key - we'll create tables via SQL editor approach
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcmh4YndtZnlsYWVta21nd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjU2ODAsImV4cCI6MjA4MzM0MTY4MH0.pEBU4tgILH4wwFSloipQo4cXi9Rz-Mfkjcwm8rnDtxU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data to insert - this will create the table structure if we use the right approach
async function testConnection() {
    console.log('Testing Supabase connection...');

    const { data, error } = await supabase.from('pedidos').select('id').limit(1);

    if (error) {
        console.log('Connection test error:', error.message);
    } else {
        console.log('✓ Connected to Supabase successfully');
        console.log('Sample pedido:', data);
    }
}

testConnection();
