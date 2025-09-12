// Check what tables exist in the database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    console.log('🔍 Checking available tables...');
    
    // Try to list tables using information_schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%test%' ORDER BY table_name;`
    });
    
    if (error) {
      console.log('ℹ️  RPC method not available, trying direct table queries...');
      
      // Try direct table queries
      const testTables = [
        'test_inventory_items',
        'test_stock_movements', 
        'test_user_roles'
      ];
      
      for (const table of testTables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (tableError) {
            console.log(`❌ Table '${table}' error:`, tableError.message);
          } else {
            console.log(`✅ Table '${table}' exists (${tableData?.length || 0} rows found in sample)`);
          }
        } catch (err) {
          console.log(`❌ Table '${table}' error:`, err.message);
        }
      }
    } else {
      console.log('✅ Available test tables:', data);
    }
    
  } catch (error) {
    console.error('💥 Table check failed:', error);
  }
}

checkTables();