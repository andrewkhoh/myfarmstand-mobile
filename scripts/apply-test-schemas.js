#!/usr/bin/env node

/**
 * Apply Phase 1 and Phase 2 test schemas to Supabase database
 * 
 * This script reads the test schema SQL files and executes them against
 * the configured Supabase database using the same configuration as the app.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSqlFile(filePath, description) {
  console.log(`\n📄 Applying ${description}...`);
  console.log(`   File: ${filePath}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`   Executing SQL file as a single transaction...`);
    
    // Try to execute the entire SQL file as one transaction
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`   ❌ Failed to execute SQL:`, error.message);
      console.error(`   ❌ Error details:`, error);
      return false;
    }
    
    console.log(`   ✅ SQL executed successfully`);
    console.log(`✅ ${description} completed`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to apply ${description}:`, error.message);
    
    // If exec_sql doesn't exist, let's try a different approach
    if (error.message.includes('exec_sql')) {
      console.log(`   💡 Trying alternative approach: direct SQL execution...`);
      
      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        const { data, error: sqlError } = await supabase.from('').select('*').limit(0);
        
        if (sqlError) {
          console.log(`   ℹ️  Note: This may require manual execution in Supabase SQL Editor`);
          console.log(`   📝 SQL file path: ${filePath}`);
          return false;
        }
      } catch (altError) {
        console.log(`   ℹ️  Note: Please apply this SQL file manually in Supabase SQL Editor`);
        console.log(`   📝 SQL file path: ${filePath}`);
        return false;
      }
    }
    
    return false;
  }
}

async function main() {
  console.log('🚀 Starting test schema application...\n');
  
  const databaseDir = path.join(__dirname, '..', 'database');
  
  // Apply Phase 1: Role-based permissions
  const phase1Success = await executeSqlFile(
    path.join(databaseDir, 'role-permissions-test-schema.sql'),
    'Phase 1: Role-based permissions test schema'
  );
  
  if (!phase1Success) {
    console.error('❌ Phase 1 failed. Stopping.');
    process.exit(1);
  }
  
  // Apply Phase 2: Inventory operations  
  const phase2Success = await executeSqlFile(
    path.join(databaseDir, 'inventory-test-schema.sql'),
    'Phase 2: Inventory operations test schema'
  );
  
  if (!phase2Success) {
    console.error('❌ Phase 2 failed.');
    process.exit(1);
  }
  
  console.log('\n🎉 All test schemas applied successfully!');
  console.log('\n📝 Summary:');
  console.log('  ✅ Phase 1: Role-based permissions with RLS policies');
  console.log('  ✅ Phase 2: Inventory operations with stock movement audit trail');
  console.log('\n🔍 Next steps:');
  console.log('  - Run Phase 2.2 service tests against real database');
  console.log('  - Validate role-based permissions work in practice');
  console.log('  - Test query performance and indexes');
}

main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});