-- Test Database Schema for Role Permissions
-- This file is used to validate schema structure before production deployment

-- Drop existing test table if exists
DROP TABLE IF EXISTS test_user_roles CASCADE;

-- Create test user_roles table
CREATE TABLE test_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References users(id) in production
  role_type TEXT NOT NULL CHECK (role_type IN ('inventory_staff', 'marketing_staff', 'executive', 'admin')),
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, role_type)
);

-- Insert test data for validation
INSERT INTO test_user_roles (user_id, role_type, permissions) VALUES
  ('11111111-1111-1111-1111-111111111111', 'inventory_staff', '["view_inventory", "update_stock"]'),
  ('22222222-2222-2222-2222-222222222222', 'marketing_staff', '["update_product_content", "create_promotions"]'),
  ('33333333-3333-3333-3333-333333333333', 'executive', '["view_all_analytics"]'),
  ('44444444-4444-4444-4444-444444444444', 'admin', '["manage_users", "manage_roles"]');

-- Test constraint validations
-- These should succeed:
SELECT * FROM test_user_roles WHERE role_type = 'inventory_staff';
SELECT * FROM test_user_roles WHERE permissions IS NULL;
SELECT * FROM test_user_roles WHERE is_active = true;

-- These should fail (commented out for safety):
-- INSERT INTO test_user_roles (user_id, role_type) VALUES ('11111111-1111-1111-1111-111111111111', 'invalid_role'); -- Invalid role_type
-- INSERT INTO test_user_roles (user_id, role_type) VALUES ('11111111-1111-1111-1111-111111111111', 'inventory_staff'); -- Duplicate user+role

-- Validate schema structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'test_user_roles'
ORDER BY ordinal_position;

-- Clean up test data
-- DROP TABLE test_user_roles CASCADE;