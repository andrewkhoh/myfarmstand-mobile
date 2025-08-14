-- =====================================================
-- ADD PAYMENT COLUMNS TO ORDERS TABLE
-- =====================================================
-- Adds missing payment_method and payment_status columns to orders table
-- Required for submit_order_atomic RPC function to work properly

-- Add payment columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) CHECK (payment_method IN ('online', 'cash_on_pickup')),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders (payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);

-- Update existing orders to have default payment values (if any exist)
UPDATE orders 
SET 
    payment_method = 'cash_on_pickup',
    payment_status = 'pending'
WHERE payment_method IS NULL;

-- Add comment to document the change
COMMENT ON COLUMN orders.payment_method IS 'Payment method: online or cash_on_pickup';
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, paid, failed, or refunded';
