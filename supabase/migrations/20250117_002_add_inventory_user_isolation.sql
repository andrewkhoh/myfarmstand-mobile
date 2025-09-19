-- This migration is now redundant as user_id is added in the create table migration
-- Keeping for documentation purposes

-- The following operations were already done in 001_create_inventory_tables.sql:
-- 1. user_id column added to inventory_items, stock_movements, and inventory_alerts
-- 2. Row Level Security enabled
-- 3. RLS policies created for user isolation
-- 4. Indexes added for performance

-- No additional operations needed