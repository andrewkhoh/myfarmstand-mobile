-- Create role_permissions table for role-based access control
-- This table defines what permissions each role has

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission)
);

-- Create index for efficient role lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);

-- Insert default permissions for each role
INSERT INTO role_permissions (role, permission) VALUES
  -- Admin permissions (full access)
  ('admin', 'inventory:read'),
  ('admin', 'inventory:write'),
  ('admin', 'inventory:manage'),
  ('admin', 'inventory:delete'),
  ('admin', 'marketing:read'),
  ('admin', 'marketing:write'),
  ('admin', 'marketing:manage'),
  ('admin', 'marketing:delete'),
  ('admin', 'executive:read'),
  ('admin', 'executive:write'),
  ('admin', 'executive:manage'),
  ('admin', 'users:read'),
  ('admin', 'users:write'),
  ('admin', 'users:manage'),
  ('admin', 'orders:read'),
  ('admin', 'orders:write'),
  ('admin', 'orders:manage'),

  -- Executive permissions (analytics and high-level management)
  ('executive', 'inventory:read'),
  ('executive', 'marketing:read'),
  ('executive', 'executive:read'),
  ('executive', 'executive:write'),
  ('executive', 'executive:manage'),
  ('executive', 'orders:read'),
  ('executive', 'users:read'),

  -- Marketing staff permissions
  ('marketing_staff', 'marketing:read'),
  ('marketing_staff', 'marketing:write'),
  ('marketing_staff', 'marketing:manage'),
  ('marketing_staff', 'inventory:read'),
  ('marketing_staff', 'orders:read'),

  -- Inventory staff permissions
  ('inventory_staff', 'inventory:read'),
  ('inventory_staff', 'inventory:write'),
  ('inventory_staff', 'inventory:manage'),
  ('inventory_staff', 'orders:read'),
  ('inventory_staff', 'orders:write'),

  -- Customer permissions (basic read access)
  ('customer', 'orders:read')
ON CONFLICT (role, permission) DO NOTHING;

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_updated_at();