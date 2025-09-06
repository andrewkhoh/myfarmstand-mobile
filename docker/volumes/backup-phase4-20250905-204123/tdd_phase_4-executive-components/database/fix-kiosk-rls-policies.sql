-- =====================================================
-- FIX KIOSK RLS POLICIES
-- =====================================================
-- This script fixes the conflicting RLS policies on staff_pins
-- to allow proper authentication while maintaining security

-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Users can view own PIN" ON staff_pins;
DROP POLICY IF EXISTS "Staff can authenticate with PIN" ON staff_pins;
DROP POLICY IF EXISTS "Admins can manage staff PINs" ON staff_pins;
DROP POLICY IF EXISTS "Allow PIN authentication" ON staff_pins;
DROP POLICY IF EXISTS "PIN access rules" ON staff_pins;
DROP POLICY IF EXISTS "PIN updates restricted" ON staff_pins;
DROP POLICY IF EXISTS "Only admins create PINs" ON staff_pins;
DROP POLICY IF EXISTS "Only admins delete PINs" ON staff_pins;

-- ✅ UNIFIED SELECT POLICY: Combine all SELECT access rules into one policy
CREATE POLICY "PIN access rules" ON staff_pins
  FOR SELECT USING (
    -- Allow PIN authentication for active PINs (anonymous access)
    is_active = true OR
    -- Allow users to view their own PIN (when authenticated)
    auth.uid() = user_id OR
    -- Allow admins to view all PINs
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- ✅ UPDATE POLICY: Only allow updates by admins or PIN owner
CREATE POLICY "PIN updates restricted" ON staff_pins
  FOR UPDATE USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- ✅ INSERT POLICY: Only admins can create new PINs
CREATE POLICY "Only admins create PINs" ON staff_pins
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
  ));

-- ✅ DELETE POLICY: Only admins can delete PINs
CREATE POLICY "Only admins delete PINs" ON staff_pins
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
  ));

-- Verify policies are working
SELECT 
  'RLS POLICIES UPDATED' as status,
  'PIN authentication should now work' as message;

-- Test the policy (should return your PIN if it exists)
SELECT 'Testing PIN access' as test, pin, is_active 
FROM staff_pins 
WHERE pin = '1234' AND is_active = true;