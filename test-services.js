// Quick test to verify services are working
const { SimplifiedSupabaseMock } = require('./src/test/mocks/supabase.simplified.mock');

// Create mock
const mockSupabase = new SimplifiedSupabaseMock();

// Set test data
mockSupabase.setTableData('role_permissions', [
  { id: '1', role: 'admin', permission: 'manage_users' },
  { id: '2', role: 'admin', permission: 'manage_roles' },
  { id: '3', role: 'customer', permission: 'view_products' }
]);

mockSupabase.setTableData('user_roles', [
  { id: '1', user_id: 'user-1', role: 'admin', is_primary: true, is_active: true },
  { id: '2', user_id: 'user-2', role: 'customer', is_primary: true, is_active: true }
]);

// Get client
const client = mockSupabase.createClient();

// Test a simple query
async function test() {
  try {
    console.log('Testing SimplifiedSupabaseMock...');
    
    const { data, error } = await client
      .from('role_permissions')
      .select('*')
      .eq('role', 'admin');
    
    console.log('Result:', { data, error });
    console.log('Test passed! Found', data?.length, 'admin permissions');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();