-- Payment System Database Migration
-- Following MyFarmstand Mobile Architectural Patterns & Best Practices
-- 
-- Creates payment tables with proper indexing, constraints, and RLS policies
-- Implements database-first validation patterns and user data isolation

-- Create payment status enum
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing', 
  'succeeded',
  'failed',
  'canceled',
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'disputed'
);

-- Create payment method type enum
CREATE TYPE payment_method_type AS ENUM (
  'card',
  'us_bank_account',
  'sepa_debit',
  'ideal',
  'paypal'
);

-- Create card brand enum
CREATE TYPE card_brand AS ENUM (
  'visa',
  'mastercard', 
  'amex',
  'discover',
  'diners',
  'jcb',
  'unionpay',
  'unknown'
);

-- Create bank account type enum
CREATE TYPE bank_account_type AS ENUM (
  'checking',
  'savings'
);

-- ================================
-- PAYMENTS TABLE
-- ================================

CREATE TABLE IF NOT EXISTS payments (
  -- Primary identifiers
  id TEXT PRIMARY KEY DEFAULT ('payment_' || generate_random_uuid()::text),
  payment_intent_id TEXT UNIQUE NOT NULL, -- Stripe payment intent ID
  
  -- User and order associations (following user isolation pattern)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Payment details
  amount INTEGER NOT NULL CHECK (amount >= 0), -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (length(currency) = 3),
  status payment_status NOT NULL DEFAULT 'pending',
  
  -- Stripe-specific fields
  payment_method_id TEXT, -- Stripe payment method ID
  client_secret TEXT, -- For client-side confirmation
  confirmation_method TEXT DEFAULT 'automatic',
  
  -- Metadata and tracking
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps following established pattern
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);

-- Composite index for user payment history queries
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);

-- ================================
-- PAYMENT METHODS TABLE
-- ================================

CREATE TABLE IF NOT EXISTS payment_methods (
  -- Primary identifiers
  id TEXT PRIMARY KEY DEFAULT ('pm_' || generate_random_uuid()::text),
  
  -- User association (following user isolation pattern)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Payment method details
  type payment_method_type NOT NULL,
  customer_id TEXT, -- Stripe customer ID
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Card-specific fields (nullable for non-card payment methods)
  card_brand card_brand,
  card_last4 TEXT CHECK (card_last4 IS NULL OR length(card_last4) = 4),
  card_exp_month INTEGER CHECK (card_exp_month IS NULL OR (card_exp_month >= 1 AND card_exp_month <= 12)),
  card_exp_year INTEGER CHECK (card_exp_year IS NULL OR card_exp_year >= EXTRACT(year FROM NOW())),
  
  -- Bank account specific fields (nullable for non-bank payment methods)
  bank_account_last4 TEXT CHECK (bank_account_last4 IS NULL OR length(bank_account_last4) = 4),
  bank_account_routing_number TEXT,
  bank_account_account_type bank_account_type,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer_id ON payment_methods(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_default ON payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);

-- ================================
-- WEBHOOK LOGS TABLE (for monitoring)
-- ================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  -- Primary identifier
  id BIGSERIAL PRIMARY KEY,
  
  -- Webhook event details
  event_id TEXT NOT NULL, -- Stripe event ID
  event_type TEXT NOT NULL, -- payment_intent.succeeded, etc.
  
  -- Processing details
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_successfully BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Event data for debugging
  event_data JSONB,
  
  -- Prevent duplicate processing
  UNIQUE(event_id)
);

-- Create indexes for webhook logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_failed ON webhook_logs(processed_successfully, processed_at) WHERE NOT processed_successfully;

-- ================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Following user data isolation patterns
-- ================================

-- Enable RLS on all payment tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- PAYMENTS table RLS policies
-- Users can only access their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can access all payments (for webhooks and admin functions)
CREATE POLICY "Service role full access to payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

-- PAYMENT METHODS table RLS policies
-- Users can only access their own payment methods
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can access all payment methods
CREATE POLICY "Service role full access to payment methods" ON payment_methods
  FOR ALL USING (auth.role() = 'service_role');

-- WEBHOOK LOGS table RLS policies
-- Only service role can access webhook logs (admin/debugging only)
CREATE POLICY "Service role full access to webhook logs" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Admin users can view webhook logs for debugging
CREATE POLICY "Admin users can view webhook logs" ON webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ================================
-- UPDATED_AT TRIGGERS
-- Following established timestamp pattern
-- ================================

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to payment tables
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- ATOMIC FUNCTIONS FOR PAYMENT OPERATIONS
-- Following established atomic operations pattern
-- ================================

-- Function to update order payment status atomically
CREATE OR REPLACE FUNCTION update_order_payment_status(
  input_order_id TEXT,
  input_payment_status TEXT,
  input_payment_intent_id TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update order payment status
  UPDATE orders 
  SET 
    payment_status = input_payment_status::order_payment_status,
    payment_intent_id = input_payment_intent_id,
    updated_at = NOW()
  WHERE id = input_order_id;
  
  -- Verify update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', input_order_id;
  END IF;
  
  -- Log the status change for audit trail
  INSERT INTO order_audit_logs (
    order_id, 
    action, 
    details, 
    created_at
  ) VALUES (
    input_order_id,
    'payment_status_updated',
    jsonb_build_object(
      'payment_status', input_payment_status,
      'payment_intent_id', input_payment_intent_id
    ),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record payment transaction atomically
CREATE OR REPLACE FUNCTION record_payment_transaction(
  input_user_id UUID,
  input_amount INTEGER,
  input_currency TEXT,
  input_payment_intent_id TEXT
)
RETURNS TABLE(payment_id TEXT) AS $$
DECLARE
  new_payment_id TEXT;
BEGIN
  -- Generate unique payment ID
  new_payment_id := 'payment_' || generate_random_uuid()::text;
  
  -- Insert payment record
  INSERT INTO payments (
    id,
    payment_intent_id,
    user_id,
    amount,
    currency,
    status,
    created_at
  ) VALUES (
    new_payment_id,
    input_payment_intent_id,
    input_user_id,
    input_amount,
    input_currency,
    'pending',
    NOW()
  );
  
  -- Return the payment ID
  RETURN QUERY SELECT new_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this payment method as default
  IF NEW.is_default = TRUE THEN
    -- Unset all other default payment methods for this user
    UPDATE payment_methods 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_default = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply default payment method trigger
CREATE TRIGGER ensure_single_default_payment_method_trigger
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW 
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- ================================
-- HELPER VIEWS FOR COMMON QUERIES
-- ================================

-- View for user payment history with order details
CREATE OR REPLACE VIEW user_payment_history AS
SELECT 
  p.id,
  p.payment_intent_id,
  p.user_id,
  p.order_id,
  p.amount,
  p.currency,
  p.status,
  p.payment_method_id,
  p.created_at,
  p.updated_at,
  -- Order details if available
  o.total_amount as order_total,
  o.status as order_status,
  o.pickup_date
FROM payments p
LEFT JOIN orders o ON p.order_id = o.id;

-- View for user payment methods with card details
CREATE OR REPLACE VIEW user_payment_methods_detailed AS
SELECT 
  pm.id,
  pm.user_id,
  pm.type,
  pm.is_default,
  pm.created_at,
  -- Card details (if applicable)
  CASE 
    WHEN pm.type = 'card' THEN
      jsonb_build_object(
        'brand', pm.card_brand,
        'last4', pm.card_last4,
        'exp_month', pm.card_exp_month,
        'exp_year', pm.card_exp_year
      )
    ELSE NULL
  END as card_details,
  -- Bank account details (if applicable)  
  CASE
    WHEN pm.type = 'us_bank_account' THEN
      jsonb_build_object(
        'last4', pm.bank_account_last4,
        'account_type', pm.bank_account_account_type
      )
    ELSE NULL
  END as bank_account_details
FROM payment_methods pm;

-- ================================
-- GRANT PERMISSIONS
-- ================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;

-- Grant permissions on views
GRANT SELECT ON user_payment_history TO authenticated;
GRANT SELECT ON user_payment_methods_detailed TO authenticated;

-- Grant sequence permissions for webhook logs
GRANT USAGE, SELECT ON SEQUENCE webhook_logs_id_seq TO service_role;

COMMENT ON TABLE payments IS 'Payment records with Stripe integration following architectural patterns';
COMMENT ON TABLE payment_methods IS 'User payment methods with card and bank account support';
COMMENT ON TABLE webhook_logs IS 'Stripe webhook event processing logs for monitoring';

COMMENT ON INDEX idx_payments_user_created IS 'Optimizes user payment history queries';
COMMENT ON INDEX idx_payments_user_status IS 'Optimizes payment status filtering per user';
COMMENT ON POLICY "Users can view own payments" ON payments IS 'Implements user data isolation pattern';