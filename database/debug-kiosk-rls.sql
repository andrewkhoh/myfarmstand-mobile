-- =====================================================
-- DEBUG KIOSK RLS ISSUES
-- =====================================================
-- This script helps debug the RLS access issues

-- 1. Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled,
  forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'staff_pins';

-- 2. Check current policies
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'staff_pins'
ORDER BY policyname;

-- 3. Test direct access to see if data exists
-- This should work even with RLS if you're a superuser/owner
SELECT 
  'Direct table access test' as test,
  pin, 
  is_active,
  user_id,
  created_at
FROM staff_pins 
WHERE pin = '1234'
LIMIT 1;

-- 4. Check if the issue is with auth.uid() context
SELECT 
  'Current auth context' as test,
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 5. Test the policy condition manually
SELECT 
  'Policy condition test' as test,
  pin,
  is_active,
  (is_active = true) as condition_result
FROM staff_pins 
WHERE pin = '1234';

-- 6. If all else fails, temporarily disable RLS for testing
-- UNCOMMENT THE NEXT LINE TO DISABLE RLS (TEMPORARILY FOR DEBUGGING)
-- ALTER TABLE staff_pins DISABLE ROW LEVEL SECURITY;

-- To re-enable later:
-- ALTER TABLE staff_pins ENABLE ROW LEVEL SECURITY;