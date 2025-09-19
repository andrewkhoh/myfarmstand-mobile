-- Complete Inventory Setup Script
-- Run this entire script in Supabase SQL editor

-- Drop existing objects if they exist (for clean setup)
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP FUNCTION IF EXISTS update_stock_atomic CASCADE;
DROP FUNCTION IF EXISTS check_stock_alerts CASCADE;
DROP FUNCTION IF EXISTS batch_update_stock CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Create inventory_items table with user isolation
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  minimum_stock INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  maximum_stock INTEGER NOT NULL DEFAULT 1000 CHECK (maximum_stock >= 0),
  reorder_point INTEGER NOT NULL DEFAULT 10 CHECK (reorder_point >= 0),
  reorder_quantity INTEGER NOT NULL DEFAULT 50 CHECK (reorder_quantity >= 0),
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  last_restocked_at TIMESTAMPTZ,
  last_counted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create stock_movements table for audit trail
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'add', 'subtract', 'set')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  stock_before INTEGER,
  stock_after INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inventory_alerts table
CREATE TABLE inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'reorder_needed', 'overstock')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'low')),
  message TEXT NOT NULL,
  threshold_value INTEGER,
  current_value INTEGER,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_inventory_items_user ON inventory_items(user_id);
CREATE INDEX idx_inventory_items_product ON inventory_items(product_id);
CREATE INDEX idx_inventory_items_warehouse ON inventory_items(warehouse_id);
CREATE INDEX idx_inventory_items_stock_levels ON inventory_items(user_id, current_stock, minimum_stock);
CREATE INDEX idx_inventory_items_active ON inventory_items(user_id, is_active) WHERE is_active = true;

CREATE INDEX idx_stock_movements_item ON stock_movements(inventory_item_id);
CREATE INDEX idx_stock_movements_user ON stock_movements(user_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at DESC);

CREATE INDEX idx_inventory_alerts_item ON inventory_alerts(inventory_item_id);
CREATE INDEX idx_inventory_alerts_user ON inventory_alerts(user_id);
CREATE INDEX idx_inventory_alerts_unack ON inventory_alerts(user_id, acknowledged) WHERE acknowledged = false;

-- Enable Row Level Security
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_items
CREATE POLICY "Users can view own inventory items" ON inventory_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory items" ON inventory_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory items" ON inventory_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory items" ON inventory_items
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for stock_movements
CREATE POLICY "Users can view own stock movements" ON stock_movements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock movements" ON stock_movements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for inventory_alerts
CREATE POLICY "Users can view own alerts" ON inventory_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON inventory_alerts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory_items updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create atomic stock update function with optimistic locking
CREATE OR REPLACE FUNCTION update_stock_atomic(
  p_item_id UUID,
  p_user_id UUID,
  p_operation TEXT, -- 'add', 'subtract', 'set'
  p_quantity INTEGER,
  p_reason TEXT DEFAULT 'Stock adjustment',
  p_performed_by UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_stock INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_item_exists BOOLEAN;
BEGIN
  -- Start transaction
  -- Verify user owns the item and lock the row
  SELECT current_stock INTO v_current_stock
  FROM inventory_items
  WHERE id = p_item_id
    AND user_id = p_user_id
  FOR UPDATE NOWAIT; -- Fail fast if row is locked

  -- Check if item was found
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT FALSE, 0, 'Item not found or unauthorized'::TEXT;
    RETURN;
  END IF;

  -- Calculate new stock based on operation
  CASE p_operation
    WHEN 'add' THEN
      v_new_stock := v_current_stock + p_quantity;
    WHEN 'subtract' THEN
      v_new_stock := v_current_stock - p_quantity;
    WHEN 'set' THEN
      v_new_stock := p_quantity;
    ELSE
      RETURN QUERY
      SELECT FALSE, v_current_stock, 'Invalid operation'::TEXT;
      RETURN;
  END CASE;

  -- Validate new stock is not negative
  IF v_new_stock < 0 THEN
    RETURN QUERY
    SELECT FALSE, v_current_stock, 'Insufficient stock'::TEXT;
    RETURN;
  END IF;

  -- Update the stock
  UPDATE inventory_items
  SET
    current_stock = v_new_stock,
    updated_at = NOW()
  WHERE id = p_item_id
    AND user_id = p_user_id;

  -- Record the movement
  INSERT INTO stock_movements (
    inventory_item_id,
    user_id,
    movement_type,
    quantity,
    reason,
    performed_by,
    stock_before,
    stock_after,
    created_at
  ) VALUES (
    p_item_id,
    p_user_id,
    p_operation,
    p_quantity,
    p_reason,
    COALESCE(p_performed_by, p_user_id),
    v_current_stock,
    v_new_stock,
    NOW()
  );

  -- Check if we need to create/update alerts
  PERFORM check_stock_alerts(p_item_id, p_user_id, v_new_stock);

  RETURN QUERY
  SELECT TRUE, v_new_stock, 'Stock updated successfully'::TEXT;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY
    SELECT FALSE, v_current_stock, 'Item is being updated by another process'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT FALSE, v_current_stock, SQLERRM::TEXT;
END;
$$;

-- Create function to check and generate stock alerts
CREATE OR REPLACE FUNCTION check_stock_alerts(
  p_item_id UUID,
  p_user_id UUID,
  p_current_stock INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_record RECORD;
  v_alert_type TEXT;
  v_severity TEXT;
  v_message TEXT;
BEGIN
  -- Get item details
  SELECT
    'Item ' || id as name, -- Using ID as name since we don't have a name field
    minimum_stock,
    reorder_point
  INTO v_item_record
  FROM inventory_items
  WHERE id = p_item_id;

  -- Determine alert conditions
  IF p_current_stock = 0 THEN
    v_alert_type := 'out_of_stock';
    v_severity := 'critical';
    v_message := format('Item "%s" is out of stock', v_item_record.name);
  ELSIF p_current_stock <= v_item_record.minimum_stock THEN
    v_alert_type := 'low_stock';
    v_severity := 'warning';
    v_message := format('Item "%s" is below minimum stock level (%s/%s)',
                       v_item_record.name, p_current_stock, v_item_record.minimum_stock);
  ELSIF v_item_record.reorder_point IS NOT NULL AND p_current_stock <= v_item_record.reorder_point THEN
    v_alert_type := 'reorder_needed';
    v_severity := 'low';
    v_message := format('Item "%s" has reached reorder point (%s/%s)',
                       v_item_record.name, p_current_stock, v_item_record.reorder_point);
  ELSE
    -- No alert needed, mark any existing alerts as resolved
    UPDATE inventory_alerts
    SET
      acknowledged = TRUE,
      acknowledged_at = NOW(),
      acknowledged_by = p_user_id
    WHERE inventory_item_id = p_item_id
      AND user_id = p_user_id
      AND acknowledged = FALSE;
    RETURN;
  END IF;

  -- Check if this alert already exists and is unacknowledged
  IF NOT EXISTS (
    SELECT 1 FROM inventory_alerts
    WHERE inventory_item_id = p_item_id
      AND user_id = p_user_id
      AND alert_type = v_alert_type
      AND acknowledged = FALSE
  ) THEN
    -- Create new alert
    INSERT INTO inventory_alerts (
      inventory_item_id,
      user_id,
      item_name,
      alert_type,
      severity,
      message,
      threshold_value,
      current_value,
      created_at
    ) VALUES (
      p_item_id,
      p_user_id,
      v_item_record.name,
      v_alert_type,
      v_severity,
      v_message,
      CASE
        WHEN v_alert_type = 'low_stock' THEN v_item_record.minimum_stock
        WHEN v_alert_type = 'reorder_needed' THEN v_item_record.reorder_point
        ELSE 0
      END,
      p_current_stock,
      NOW()
    );
  END IF;
END;
$$;

-- Create batch stock update function
CREATE OR REPLACE FUNCTION batch_update_stock(
  p_updates JSONB,
  p_user_id UUID
)
RETURNS TABLE (
  item_id UUID,
  success BOOLEAN,
  new_stock INTEGER,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_update RECORD;
BEGIN
  FOR v_update IN SELECT * FROM jsonb_to_recordset(p_updates) AS x(
    item_id UUID,
    operation TEXT,
    quantity INTEGER,
    reason TEXT
  )
  LOOP
    RETURN QUERY
    SELECT
      v_update.item_id,
      r.success,
      r.new_stock,
      r.message
    FROM update_stock_atomic(
      v_update.item_id,
      p_user_id,
      v_update.operation,
      v_update.quantity,
      COALESCE(v_update.reason, 'Batch update'),
      p_user_id
    ) r;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_stock_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION check_stock_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_stock TO authenticated;

-- Add comment descriptions
COMMENT ON TABLE inventory_items IS 'Stores inventory information for products with user isolation';
COMMENT ON TABLE stock_movements IS 'Audit trail for all stock movements';
COMMENT ON TABLE inventory_alerts IS 'Stock alerts for inventory items';

COMMENT ON COLUMN inventory_items.user_id IS 'Owner of the inventory item for multi-tenant isolation';
COMMENT ON COLUMN inventory_items.current_stock IS 'Current quantity in stock';
COMMENT ON COLUMN inventory_items.reserved_stock IS 'Quantity reserved for pending orders';
COMMENT ON COLUMN inventory_items.minimum_stock IS 'Minimum stock level before alert';
COMMENT ON COLUMN inventory_items.reorder_point IS 'Stock level that triggers reorder';
COMMENT ON COLUMN inventory_items.reorder_quantity IS 'Quantity to order when restocking';

-- Insert sample data for testing (optional - remove in production)
-- Uncomment the lines below if you want to add test data
/*
INSERT INTO inventory_items (
  product_id,
  warehouse_id,
  user_id,
  current_stock,
  reserved_stock,
  minimum_stock,
  maximum_stock,
  reorder_point,
  reorder_quantity,
  unit_cost
) VALUES (
  gen_random_uuid(), -- sample product_id
  gen_random_uuid(), -- sample warehouse_id
  auth.uid(), -- current user
  100,
  10,
  20,
  500,
  30,
  100,
  25.50
);
*/

-- Verify tables were created
SELECT 'Tables created successfully!' as status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('inventory_items', 'stock_movements', 'inventory_alerts')) as tables_created;