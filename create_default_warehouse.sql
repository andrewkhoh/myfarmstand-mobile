-- Create warehouses table and default warehouse for single-location farm stand
-- This resolves the warehouse_id constraint issues in inventory_items table

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger for warehouses
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouses_updated_at();

-- Insert warehouses for stock room and farmstand locations
INSERT INTO warehouses (id, name, description, is_active, is_default) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Stock Room', 'Back storage area for produce inventory', true, true),
  ('00000000-0000-0000-0000-000000000002', 'Farmstand', 'Customer-facing display area for produce sales', true, false)
ON CONFLICT (id) DO NOTHING;

-- First, update ALL existing inventory_items to use default warehouse (Stock Room)
-- This handles both NULL values and invalid warehouse_id references
UPDATE inventory_items
SET warehouse_id = '00000000-0000-0000-0000-000000000001'
WHERE warehouse_id IS NULL
   OR warehouse_id NOT IN (
     SELECT id FROM warehouses
     WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
   );

-- Now it's safe to add the foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inventory_items_warehouse_id_fkey'
  ) THEN
    ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
  END IF;
END $$;

-- Ensure warehouse_id is NOT NULL going forward (if not already set)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items'
    AND column_name = 'warehouse_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE inventory_items ALTER COLUMN warehouse_id SET NOT NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_warehouse_id ON inventory_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_default ON warehouses(is_default);

-- Add RLS policies if enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'warehouses'
    AND rowsecurity = true
  ) THEN
    -- Create policies for warehouses table
    CREATE POLICY "Public read access for warehouses" ON warehouses FOR SELECT USING (true);
    CREATE POLICY "Authenticated users can manage warehouses" ON warehouses FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

COMMENT ON TABLE warehouses IS 'Warehouse locations for inventory management';
COMMENT ON COLUMN warehouses.is_default IS 'Indicates the default warehouse for single-location operations';