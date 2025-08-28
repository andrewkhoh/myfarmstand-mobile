// Basic test to verify SimplifiedSupabaseMock works
const { SimplifiedSupabaseMock } = require('./src/test/mocks/supabase.simplified.mock');

console.log('Testing SimplifiedSupabaseMock...');

try {
  const mock = new SimplifiedSupabaseMock();
  console.log('✓ Mock created');
  
  mock.setTableData('test_table', [
    { id: '1', name: 'Test Item' }
  ]);
  console.log('✓ Table data set');
  
  const client = mock.createClient();
  console.log('✓ Client created');
  
  // Test a simple query
  client.from('test_table')
    .select('*')
    .then(result => {
      console.log('✓ Query executed');
      console.log('Result:', result);
      
      if (result.data && result.data.length === 1) {
        console.log('✅ Basic test passed!');
      } else {
        console.log('❌ Query returned unexpected data');
      }
    })
    .catch(err => {
      console.error('❌ Query failed:', err);
    });
} catch (error) {
  console.error('❌ Test failed:', error);
}