-- =====================================================
-- Kiosk Authentication Setup Script
-- =====================================================
-- This script sets up the complete kiosk authentication system
-- including tables, RLS policies, and test data

-- Drop and recreate staff_pins table to ensure correct structure
DROP TABLE IF EXISTS staff_pins CASCADE;

-- Create staff_pins table
CREATE TABLE staff_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pin VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT pin_length_check CHECK (LENGTH(pin) >= 4)
);

-- Create indexes for fast PIN lookups
CREATE INDEX IF NOT EXISTS idx_staff_pins_pin_active ON staff_pins (pin, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_pins_user_id ON staff_pins (user_id);

-- Create partial unique index to enforce unique active pins per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_pins_unique_active_pin_per_user 
ON staff_pins (user_id, pin) WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE staff_pins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can read staff pins" ON staff_pins;
DROP POLICY IF EXISTS "Admin users can manage staff pins" ON staff_pins;
DROP POLICY IF EXISTS "Staff can read their own pins" ON staff_pins;

-- Create RLS policies for staff_pins table
-- Policy 1: Admin users can read all staff pins (for authentication)
CREATE POLICY "Admin users can read staff pins" ON staff_pins
  FOR SELECT 
  USING (
    -- Check if current user is admin from users table
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
    )
    OR
    -- Or if the pin belongs to the current user
    user_id = auth.uid()
  );

-- Policy 2: Admin users can manage all staff pins
CREATE POLICY "Admin users can manage staff pins" ON staff_pins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
    )
  );

-- Drop and recreate kiosk_sessions table to ensure correct structure
DROP TABLE IF EXISTS kiosk_sessions CASCADE;

-- Create kiosk_sessions table
CREATE TABLE kiosk_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(50) UNIQUE NOT NULL,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_name VARCHAR(255) NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  total_sales DECIMAL(10,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast session lookups
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_session_id ON kiosk_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_staff_user_active ON kiosk_sessions (staff_user_id, is_active) WHERE is_active = true;

-- Create partial unique index to enforce one active session per staff member
CREATE UNIQUE INDEX IF NOT EXISTS idx_kiosk_sessions_unique_active_per_staff 
ON kiosk_sessions (staff_user_id) WHERE is_active = true;

-- Enable RLS for kiosk_sessions
ALTER TABLE kiosk_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing session policies if they exist
DROP POLICY IF EXISTS "Staff can manage their own sessions" ON kiosk_sessions;
DROP POLICY IF EXISTS "Admin can read all sessions" ON kiosk_sessions;

-- Create RLS policies for kiosk_sessions
-- Policy 1: Staff can manage their own sessions
CREATE POLICY "Staff can manage their own sessions" ON kiosk_sessions
  FOR ALL
  USING (
    staff_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
    )
  );

-- Policy 2: Admin can read all sessions
CREATE POLICY "Admin can read all sessions" ON kiosk_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'manager')
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_staff_pins_updated_at ON staff_pins;
CREATE TRIGGER update_staff_pins_updated_at 
  BEFORE UPDATE ON staff_pins 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kiosk_sessions_updated_at ON kiosk_sessions;
CREATE TRIGGER update_kiosk_sessions_updated_at 
  BEFORE UPDATE ON kiosk_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Insert test data
-- =====================================================

-- Insert test PIN for admin user (admin@ex.com)
-- First, deactivate any existing pins for this user
UPDATE staff_pins 
SET is_active = false 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'admin@ex.com' AND role = 'admin'
);

-- Then insert new pin
INSERT INTO staff_pins (user_id, pin, is_active) 
SELECT 
  users.id,
  '1234',
  true
FROM users 
WHERE users.email = 'admin@ex.com'
  AND users.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM staff_pins 
    WHERE staff_pins.user_id = users.id 
    AND staff_pins.pin = '1234' 
    AND staff_pins.is_active = true
  );

-- Insert additional test PINs for other staff if they exist
INSERT INTO staff_pins (user_id, pin, is_active) 
SELECT 
  users.id,
  '5678',
  true
FROM users 
WHERE users.role IN ('staff', 'manager')
  AND users.email != 'admin@ex.com'
  AND NOT EXISTS (
    SELECT 1 FROM staff_pins 
    WHERE staff_pins.user_id = users.id 
    AND staff_pins.pin = '5678' 
    AND staff_pins.is_active = true
  )
LIMIT 1;

-- =====================================================
-- Verification queries
-- =====================================================

-- Check if setup was successful
DO $$
BEGIN
  -- Check tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_pins') THEN
    RAISE EXCEPTION 'staff_pins table was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kiosk_sessions') THEN
    RAISE EXCEPTION 'kiosk_sessions table was not created';
  END IF;
  
  -- Check test data
  IF NOT EXISTS (SELECT 1 FROM staff_pins WHERE pin = '1234' AND is_active = true) THEN
    RAISE WARNING 'Test PIN 1234 was not created - admin@ex.com user might not exist';
  END IF;
  
  RAISE NOTICE 'Kiosk setup completed successfully!';
END $$;

-- Display current staff pins (for verification)
SELECT 
  sp.id,
  u.email,
  u.role,
  sp.pin,
  sp.is_active,
  sp.created_at
FROM staff_pins sp
JOIN users u ON sp.user_id = u.id
ORDER BY u.role, u.email;

-- Display table permissions
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('staff_pins', 'kiosk_sessions');