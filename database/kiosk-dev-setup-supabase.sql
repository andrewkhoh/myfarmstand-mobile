-- =====================================================
-- KIOSK DEVELOPMENT SETUP (Supabase SQL Editor Version)
-- =====================================================
-- This script creates test data for kiosk development
-- Optimized for Supabase SQL Editor (no direct auth.users access)
-- Run this in Supabase SQL Editor

-- Create test users in public.users table
INSERT INTO users (
  id,
  email,
  name, 
  role,
  created_at,
  updated_at
) VALUES 
(
  'b8c8b8c8-b8c8-4b8c-8b8c-b8c8b8c8b8c1',
  'dev-staff@myfarmstand.com', 
  'Development Staff',
  'staff',
  NOW(),
  NOW()
),
(
  'b8c8b8c8-b8c8-4b8c-8b8c-b8c8b8c8b8c2',
  'dev-manager@myfarmstand.com', 
  'Development Manager',
  'manager',
  NOW(),
  NOW()
),
(
  'b8c8b8c8-b8c8-4b8c-8b8c-b8c8b8c8b8c3',
  'dev-admin@myfarmstand.com', 
  'Development Admin',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Create test PINs for development
INSERT INTO staff_pins (
  user_id,
  pin,
  is_available,
  created_at,
  updated_at
) VALUES 
(
  'b8c8b8c8-b8c8-4b8c-8b8c-b8c8b8c8b8c1',
  '1234',
  true,
  NOW(),
  NOW()
),
(
  'b8c8b8c8-b8c8-4b8c-8b8c-b8c8b8c8b8c2',
  '5678',
  true,
  NOW(),
  NOW()
),
(
  'b8c8b8c8-b8c8-4b8c-8b8c-b8c8b8c8b8c3',
  '9999',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  pin = EXCLUDED.pin,
  is_available = EXCLUDED.is_available,
  updated_at = NOW();

-- Display created test accounts
SELECT 
  'KIOSK DEVELOPMENT SETUP COMPLETE' as status,
  sp.pin,
  u.name,
  u.role,
  sp.is_available
FROM staff_pins sp
JOIN users u ON u.id = sp.user_id
WHERE sp.pin IN ('1234', '5678', '9999')
ORDER BY sp.pin;

-- Instructions
SELECT 
  '🎯 DEVELOPMENT PINS READY' as info,
  'PIN 1234: Development Staff' as staff_login,
  'PIN 5678: Development Manager' as manager_login,
  'PIN 9999: Development Admin' as admin_login;