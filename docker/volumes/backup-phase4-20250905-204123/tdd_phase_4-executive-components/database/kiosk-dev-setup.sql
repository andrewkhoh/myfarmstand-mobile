-- =====================================================
-- KIOSK DEVELOPMENT SETUP
-- =====================================================
-- This script creates test data for kiosk development
-- Run this ONLY on development/test databases, NOT production
-- 
-- Usage: psql $DATABASE_URL -f database/kiosk-dev-setup.sql

-- Create a test user for kiosk authentication
INSERT INTO auth.users (
  id, 
  email, 
  raw_user_meta_data, 
  created_at, 
  updated_at
) VALUES (
  'dev-staff-b8c8-b8c8-b8c8-b8c8b8c8b8c8', 
  'dev-staff@myfarmstand.com',
  '{"role": "staff", "name": "Development Staff"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- Create corresponding user record in public.users table
INSERT INTO users (
  id,
  email,
  name, 
  role,
  created_at,
  updated_at
) VALUES (
  'dev-staff-b8c8-b8c8-b8c8-b8c8b8c8b8c8',
  'dev-staff@myfarmstand.com', 
  'Development Staff',
  'staff',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Create test PIN for development
INSERT INTO staff_pins (
  user_id,
  pin,
  is_active,
  created_at,
  updated_at
) VALUES (
  'dev-staff-b8c8-b8c8-b8c8-b8c8b8c8b8c8',
  '1234',
  true,
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  pin = EXCLUDED.pin,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create additional test PINs for different roles
INSERT INTO auth.users (
  id, 
  email, 
  raw_user_meta_data, 
  created_at, 
  updated_at
) VALUES 
(
  'dev-manager-b8c8-b8c8-b8c8-b8c8b8c8b8c8', 
  'dev-manager@myfarmstand.com',
  '{"role": "manager", "name": "Development Manager"}'::jsonb,
  NOW(),
  NOW()
),
(
  'dev-admin-b8c8-b8c8-b8c8-b8c8b8c8b8c8', 
  'dev-admin@myfarmstand.com',
  '{"role": "admin", "name": "Development Admin"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

INSERT INTO users (
  id,
  email,
  name, 
  role,
  created_at,
  updated_at
) VALUES 
(
  'dev-manager-b8c8-b8c8-b8c8-b8c8b8c8b8c8',
  'dev-manager@myfarmstand.com', 
  'Development Manager',
  'manager',
  NOW(),
  NOW()
),
(
  'dev-admin-b8c8-b8c8-b8c8-b8c8b8c8b8c8',
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

INSERT INTO staff_pins (
  user_id,
  pin,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  'dev-manager-b8c8-b8c8-b8c8-b8c8b8c8b8c8',
  '5678',
  true,
  NOW(),
  NOW()
),
(
  'dev-admin-b8c8-b8c8-b8c8-b8c8b8c8b8c8',
  '9999',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  pin = EXCLUDED.pin,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Display created test accounts
SELECT 
  'KIOSK DEVELOPMENT SETUP COMPLETE' as status,
  sp.pin,
  u.name,
  u.role,
  sp.is_active
FROM staff_pins sp
JOIN users u ON u.id = sp.user_id
WHERE sp.pin IN ('1234', '5678', '9999')
ORDER BY sp.pin;

-- Instructions
SELECT 
  'DEVELOPMENT PINS CREATED' as info,
  'PIN 1234: Development Staff' as staff_login,
  'PIN 5678: Development Manager' as manager_login,
  'PIN 9999: Development Admin' as admin_login;