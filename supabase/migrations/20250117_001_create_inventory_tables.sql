-- Create inventory_items table with user isolation
CREATE TABLE IF NOT EXISTS inventory_items (
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
CREATE TABLE IF NOT EXISTS stock_movements (
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
CREATE TABLE IF NOT EXISTS inventory_alerts (
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