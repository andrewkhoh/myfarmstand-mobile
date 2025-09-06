-- Phase 2: Inventory Operations Test Database Schema
-- Following architectural patterns from Phase 1 with role-based RLS integration
-- Role-based access control using user_roles from Phase 1

-- Core inventory stock levels with role-based RLS  
CREATE TABLE test_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL, -- Would reference products(id) in production
  current_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  available_stock INTEGER NOT NULL DEFAULT 0, -- Will be calculated via trigger
  minimum_threshold INTEGER DEFAULT 10,
  maximum_threshold INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  is_visible_to_customers BOOLEAN DEFAULT true,
  last_stock_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business logic constraints
  CHECK (current_stock >= 0),
  CHECK (reserved_stock >= 0),
  CHECK (reserved_stock <= current_stock),
  CHECK (minimum_threshold >= 0),
  CHECK (maximum_threshold > minimum_threshold),
  
  -- Performance indexes will be added below
  UNIQUE(product_id) -- One inventory record per product
);

-- Create trigger function to calculate available_stock automatically
CREATE OR REPLACE FUNCTION calculate_available_stock()
RETURNS TRIGGER AS $$
BEGIN
  NEW.available_stock = NEW.current_stock - NEW.reserved_stock;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate available_stock on INSERT and UPDATE
CREATE TRIGGER trigger_calculate_available_stock
  BEFORE INSERT OR UPDATE ON test_inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_available_stock();

-- Comprehensive stock movement audit trail with role-based RLS
CREATE TABLE test_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES test_inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('restock', 'sale', 'adjustment', 'reservation', 'release')),
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  performed_by UUID, -- Would reference auth.users(id) in production
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  reference_order_id UUID, -- Would reference orders(id) in production
  batch_id UUID, -- For bulk operations tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business logic constraints
  CHECK (quantity_change != 0), -- Must be a real movement
  CHECK (previous_stock >= 0),
  CHECK (new_stock >= 0),
  CHECK (new_stock = previous_stock + quantity_change) -- Ensure calculation consistency
);

-- Enable RLS (Row Level Security) for role-based access control
ALTER TABLE test_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_stock_movements ENABLE ROW LEVEL SECURITY;

-- Phase 1 Integration: RLS Policies using user_roles from Phase 1

-- INVENTORY_STAFF: Full CRUD access to inventory items
CREATE POLICY "inventory_staff_full_inventory_access" ON test_inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM test_user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type = 'inventory_staff' 
      AND ur.is_active = true
    )
  );

-- MARKETING_STAFF: Read access + visibility updates only
CREATE POLICY "marketing_staff_read_inventory" ON test_inventory_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM test_user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type IN ('marketing_staff', 'executive', 'admin')
      AND ur.is_active = true
    )
  );

CREATE POLICY "marketing_staff_visibility_updates" ON test_inventory_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM test_user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type IN ('marketing_staff', 'inventory_staff', 'admin')
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    -- Marketing staff can update visibility fields only
    -- Note: Detailed field-level restrictions would be enforced at application level
    EXISTS (
      SELECT 1 FROM test_user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type IN ('marketing_staff', 'inventory_staff', 'admin')
      AND ur.is_active = true
    )
  );

-- EXECUTIVE: Read-only access for analytics and reporting
CREATE POLICY "executive_read_inventory" ON test_inventory_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM test_user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type IN ('executive', 'admin')
      AND ur.is_active = true
    )
  );

-- ADMIN: Full access to everything
CREATE POLICY "admin_full_inventory_access" ON test_inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM test_user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type = 'admin' 
      AND ur.is_active = true
    )
  );

-- Stock Movements RLS Policies (Audit Trail Security)

-- INVENTORY_STAFF + ADMIN: Full access to stock movements
CREATE POLICY "inventory_staff_movements_access" ON test_stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM test_user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type IN ('inventory_staff', 'admin')
      AND ur.is_active = true
    )
  );

-- OTHER ROLES: Read-only access to stock movements for audit/analytics
CREATE POLICY "other_roles_movements_read" ON test_stock_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM test_user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type IN ('marketing_staff', 'executive', 'admin')
      AND ur.is_active = true
    )
  );

-- Performance Indexes for Common Query Patterns
CREATE INDEX idx_inventory_items_product_id ON test_inventory_items(product_id);
CREATE INDEX idx_inventory_items_active ON test_inventory_items(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_items_visible ON test_inventory_items(is_visible_to_customers) WHERE is_visible_to_customers = true;
CREATE INDEX idx_inventory_items_low_stock ON test_inventory_items(available_stock, minimum_threshold) WHERE available_stock <= minimum_threshold;
CREATE INDEX idx_inventory_items_updated ON test_inventory_items(last_stock_update) WHERE is_active = true;

CREATE INDEX idx_stock_movements_inventory_item ON test_stock_movements(inventory_item_id, performed_at DESC);
CREATE INDEX idx_stock_movements_performed_at ON test_stock_movements(performed_at DESC);
CREATE INDEX idx_stock_movements_performed_by ON test_stock_movements(performed_by, performed_at DESC) WHERE performed_by IS NOT NULL;
CREATE INDEX idx_stock_movements_batch_id ON test_stock_movements(batch_id, performed_at DESC) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_stock_movements_type ON test_stock_movements(movement_type, performed_at DESC);
CREATE INDEX idx_stock_movements_order_ref ON test_stock_movements(reference_order_id) WHERE reference_order_id IS NOT NULL;

-- Sample Test Data for Contract Validation
-- Following Phase 1 patterns for comprehensive test coverage

INSERT INTO test_inventory_items (
  id, product_id, current_stock, reserved_stock, minimum_threshold, maximum_threshold, 
  is_active, is_visible_to_customers, last_stock_update
) VALUES 
-- Normal inventory items (available_stock will be calculated automatically)
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 100, 10, 15, 500, true, true, '2024-01-15T10:00:00Z'), -- available: 90
('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 5, 2, 20, 200, true, false, '2024-01-14T14:30:00Z'), -- available: 3

-- Edge cases for testing
('55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', 0, 0, 10, 100, false, true, '2024-01-10T08:00:00Z'), -- Out of stock, available: 0
('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', 1000, 50, 100, 2000, true, true, '2024-01-16T16:45:00Z'), -- High stock, available: 950
('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 25, 25, 30, 300, true, false, '2024-01-12T12:15:00Z'); -- Fully reserved, available: 0

-- Sample stock movements for audit trail testing (FIXED UUID VALUES)
INSERT INTO test_stock_movements (
  id, inventory_item_id, movement_type, quantity_change, previous_stock, new_stock, 
  reason, performed_by, performed_at, reference_order_id, batch_id
) VALUES
-- Regular movements
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'restock', 50, 50, 100, 'Weekly restock delivery', '11111111-1111-1111-1111-111111111111', '2024-01-15T09:30:00Z', NULL, NULL),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'sale', -5, 100, 95, 'Customer purchase', '11111111-1111-1111-1111-111111111111', '2024-01-15T11:00:00Z', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NULL),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'adjustment', -2, 7, 5, 'Inventory count adjustment', '22222222-2222-2222-2222-222222222222', '2024-01-14T15:00:00Z', NULL, NULL),

-- Batch operation example
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '77777777-7777-7777-7777-777777777777', 'restock', 200, 800, 1000, 'Bulk restock operation', '11111111-1111-1111-1111-111111111111', '2024-01-16T16:00:00Z', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '99999999-9999-9999-9999-999999999999', 'restock', 25, 0, 25, 'Bulk restock operation', '11111111-1111-1111-1111-111111111111', '2024-01-16T16:01:00Z', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Performance validation: Ensure indexes are used efficiently
-- These will be tested in contract and integration tests
ANALYZE test_inventory_items;
ANALYZE test_stock_movements;