-- Temporarily disable RLS on test tables for Phase 2.2 service testing
-- This allows the services to access test data without authentication
-- RLS will be re-enabled for production tables

-- Disable RLS on test tables
ALTER TABLE test_inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_stock_movements DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on test_user_roles since it has data and policies work

-- Insert the test data that should have been inserted with the schema
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

-- Insert sample stock movements for audit trail testing
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

-- Analyze tables for performance
ANALYZE test_inventory_items;
ANALYZE test_stock_movements;