-- Kiosk Tables for MyFarmstand Mobile
-- Following database schema patterns and nullable field standards

-- Staff PINs Table
CREATE TABLE IF NOT EXISTS staff_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin VARCHAR(4) NOT NULL CHECK (pin ~ '^\d{4}$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(pin)
);

-- Create indexes for staff_pins
CREATE INDEX IF NOT EXISTS idx_staff_pins_pin ON staff_pins (pin);
CREATE INDEX IF NOT EXISTS idx_staff_pins_user_id ON staff_pins (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_pins_active ON staff_pins (is_active);

-- Kiosk Sessions Table
CREATE TABLE IF NOT EXISTS kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  total_sales DECIMAL(10,2) DEFAULT 0.00,
  transaction_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  device_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for kiosk_sessions
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_staff_id ON kiosk_sessions (staff_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_active ON kiosk_sessions (is_active);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_start_time ON kiosk_sessions (session_start);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_device ON kiosk_sessions (device_id);

-- Kiosk Transactions Table (for future implementation)
CREATE TABLE IF NOT EXISTS kiosk_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES kiosk_sessions(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_name VARCHAR(255),
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'digital')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for kiosk_transactions
CREATE INDEX IF NOT EXISTS idx_kiosk_transactions_session_id ON kiosk_transactions (session_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_transactions_customer_id ON kiosk_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_transactions_status ON kiosk_transactions (payment_status);
CREATE INDEX IF NOT EXISTS idx_kiosk_transactions_completed ON kiosk_transactions (completed_at);

-- Kiosk Transaction Items Table (for future implementation)
CREATE TABLE IF NOT EXISTS kiosk_transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES kiosk_transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for kiosk_transaction_items
CREATE INDEX IF NOT EXISTS idx_kiosk_transaction_items_transaction_id ON kiosk_transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_transaction_items_product_id ON kiosk_transaction_items (product_id);

-- Create updated_at triggers for tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_staff_pins_updated_at ON staff_pins;
CREATE TRIGGER update_staff_pins_updated_at 
  BEFORE UPDATE ON staff_pins 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_kiosk_sessions_updated_at ON kiosk_sessions;
CREATE TRIGGER update_kiosk_sessions_updated_at 
  BEFORE UPDATE ON kiosk_sessions 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_kiosk_transactions_updated_at ON kiosk_transactions;
CREATE TRIGGER update_kiosk_transactions_updated_at 
  BEFORE UPDATE ON kiosk_transactions 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE staff_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_transaction_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_pins
DROP POLICY IF EXISTS "Users can view own PIN" ON staff_pins;
CREATE POLICY "Users can view own PIN" ON staff_pins
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
  ));

DROP POLICY IF EXISTS "Staff can authenticate with PIN" ON staff_pins;
CREATE POLICY "Staff can authenticate with PIN" ON staff_pins
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage staff PINs" ON staff_pins;
CREATE POLICY "Admins can manage staff PINs" ON staff_pins
  FOR ALL USING (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
  ));

-- RLS Policies for kiosk_sessions
DROP POLICY IF EXISTS "Staff can view own sessions" ON kiosk_sessions;
CREATE POLICY "Staff can view own sessions" ON kiosk_sessions
  FOR SELECT USING (auth.uid() = staff_id OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
  ));

DROP POLICY IF EXISTS "Staff can create own sessions" ON kiosk_sessions;
CREATE POLICY "Staff can create own sessions" ON kiosk_sessions
  FOR INSERT WITH CHECK (auth.uid() = staff_id);

DROP POLICY IF EXISTS "Staff can update own sessions" ON kiosk_sessions;
CREATE POLICY "Staff can update own sessions" ON kiosk_sessions
  FOR UPDATE USING (auth.uid() = staff_id OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
  ));

-- RLS Policies for kiosk_transactions
DROP POLICY IF EXISTS "Staff can view session transactions" ON kiosk_transactions;
CREATE POLICY "Staff can view session transactions" ON kiosk_transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM kiosk_sessions 
    WHERE kiosk_sessions.id = session_id 
    AND (kiosk_sessions.staff_id = auth.uid() OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    ))
  ));

DROP POLICY IF EXISTS "Staff can create transactions" ON kiosk_transactions;
CREATE POLICY "Staff can create transactions" ON kiosk_transactions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM kiosk_sessions 
    WHERE kiosk_sessions.id = session_id 
    AND kiosk_sessions.staff_id = auth.uid()
    AND kiosk_sessions.is_active = true
  ));

DROP POLICY IF EXISTS "Staff can update session transactions" ON kiosk_transactions;
CREATE POLICY "Staff can update session transactions" ON kiosk_transactions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM kiosk_sessions 
    WHERE kiosk_sessions.id = session_id 
    AND (kiosk_sessions.staff_id = auth.uid() OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    ))
  ));

-- RLS Policies for kiosk_transaction_items
DROP POLICY IF EXISTS "Staff can view transaction items" ON kiosk_transaction_items;
CREATE POLICY "Staff can view transaction items" ON kiosk_transaction_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM kiosk_transactions 
    JOIN kiosk_sessions ON kiosk_sessions.id = kiosk_transactions.session_id
    WHERE kiosk_transactions.id = transaction_id 
    AND (kiosk_sessions.staff_id = auth.uid() OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    ))
  ));

DROP POLICY IF EXISTS "Staff can create transaction items" ON kiosk_transaction_items;
CREATE POLICY "Staff can create transaction items" ON kiosk_transaction_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM kiosk_transactions 
    JOIN kiosk_sessions ON kiosk_sessions.id = kiosk_transactions.session_id
    WHERE kiosk_transactions.id = transaction_id 
    AND kiosk_sessions.staff_id = auth.uid()
    AND kiosk_sessions.is_active = true
  ));

-- Insert sample staff PIN data for testing (optional)
-- Note: In production, PINs should be hashed or encrypted
-- INSERT INTO staff_pins (user_id, pin) 
-- SELECT id, '1234' FROM auth.users 
-- WHERE raw_user_meta_data->>'role' IN ('staff', 'manager', 'admin') 
-- LIMIT 1
-- ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE staff_pins IS 'Staff PIN authentication for kiosk mode';
COMMENT ON TABLE kiosk_sessions IS 'Active kiosk sessions for staff-operated sales';
COMMENT ON TABLE kiosk_transactions IS 'Individual transactions within kiosk sessions';
COMMENT ON TABLE kiosk_transaction_items IS 'Items within kiosk transactions';

COMMENT ON COLUMN staff_pins.pin IS '4-digit numeric PIN for kiosk authentication';
COMMENT ON COLUMN kiosk_sessions.total_sales IS 'Running total of sales during session';
COMMENT ON COLUMN kiosk_sessions.transaction_count IS 'Number of completed transactions';
COMMENT ON COLUMN kiosk_transactions.payment_method IS 'Payment method: cash, card, or digital';
COMMENT ON COLUMN kiosk_transactions.payment_status IS 'Payment status: pending, completed, or failed';