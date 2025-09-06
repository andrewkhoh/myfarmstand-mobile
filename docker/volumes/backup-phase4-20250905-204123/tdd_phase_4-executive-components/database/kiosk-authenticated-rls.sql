-- =====================================================
-- KIOSK AUTHENTICATED RLS POLICIES
-- =====================================================
-- Proper security model: Only authenticated users can access kiosk PINs
-- Kiosk flow: User signs in normally → enters PIN → gets kiosk session

-- Re-enable RLS
ALTER TABLE staff_pins ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Users can view own PIN" ON staff_pins;
DROP POLICY IF EXISTS "Staff can authenticate with PIN" ON staff_pins;
DROP POLICY IF EXISTS "Admins can manage staff PINs" ON staff_pins;
DROP POLICY IF EXISTS "Allow PIN authentication" ON staff_pins;
DROP POLICY IF EXISTS "PIN access rules" ON staff_pins;
DROP POLICY IF EXISTS "PIN updates restricted" ON staff_pins;
DROP POLICY IF EXISTS "Only admins create PINs" ON staff_pins;
DROP POLICY IF EXISTS "Only admins delete PINs" ON staff_pins;
DROP POLICY IF EXISTS "PIN authentication access" ON staff_pins;

-- ✅ AUTHENTICATED USERS ONLY: Can check their own PIN or admin access
CREATE POLICY "Authenticated PIN access" ON staff_pins
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Users can check their own PIN
      auth.uid() = user_id OR
      -- Admins can view all PINs
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
      )
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

-- Verify policies
SELECT 
  'AUTHENTICATED RLS POLICIES APPLIED' as status,
  'Users must be signed in to use kiosk PINs' as security_model;

-- Test (only works if you're signed in as the user who owns PIN 1234)
SELECT 
  'Testing authenticated PIN access' as test,
  pin, 
  is_active,
  CASE 
    WHEN auth.uid() = user_id THEN 'Own PIN - Access Granted'
    ELSE 'Not your PIN - Access Denied'
  END as access_result
FROM staff_pins 
WHERE pin = '1234' AND is_active = true;