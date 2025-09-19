# Customer App Database Security Model

## Overview

This document defines the database security architecture for the customer mobile app, ensuring strict access controls and data isolation between customer and business operations.

## Security Objectives

### Primary Goals
1. **Data Isolation**: Customer app cannot access business-sensitive data
2. **Principle of Least Privilege**: Grant minimum necessary permissions
3. **Row-Level Security**: Users can only access their own data
4. **API Key Separation**: Different keys for customer vs business apps
5. **Audit Trail**: Track all customer app database interactions

### Compliance Requirements
- **PCI DSS**: Payment card data protection
- **GDPR**: Personal data protection and user rights
- **CCPA**: California consumer privacy rights
- **SOC 2**: Security, availability, and confidentiality controls

## Current Database Schema Analysis

### Tables Accessible to Customer App

#### ✅ **Full Read Access**
```sql
-- Public product information
products (
  id, name, description, price, image_url,
  is_available, category_id, created_at, updated_at
)

categories (
  id, name, description, image_url,
  sort_order, is_active, created_at, updated_at
)
```

#### ✅ **Read/Write Access (Own Data Only)**
```sql
-- User profile data
users (
  id, email, name, phone, address,
  created_at, updated_at
)
-- Note: role field excluded from customer access

-- Shopping cart
cart_items (
  id, user_id, product_id, quantity,
  created_at, updated_at
)

-- Customer orders
orders (
  id, user_id, customer_name, customer_email, customer_phone,
  subtotal, tax_amount, total_amount, status,
  pickup_date, pickup_time, delivery_address,
  created_at, updated_at
)

order_items (
  id, order_id, product_id, quantity,
  unit_price, total_price, created_at
)
```

#### ❌ **No Access (Business Only)**
```sql
-- Business management tables
inventory_items
stock_movements
marketing_campaigns
marketing_content
business_metrics
user_roles
user_permissions
kiosk_sessions
audit_logs
```

## Database Role Configuration

### Customer Mobile App Role

#### Role Creation
```sql
-- Create restricted role for customer mobile app
CREATE ROLE customer_mobile_role NOLOGIN;

-- Basic connection permissions
GRANT CONNECT ON DATABASE postgres TO customer_mobile_role;
GRANT USAGE ON SCHEMA public TO customer_mobile_role;
```

#### Read-Only Public Data
```sql
-- Product catalog access
GRANT SELECT ON products TO customer_mobile_role;
GRANT SELECT ON categories TO customer_mobile_role;

-- Sequences for product data (read-only)
GRANT USAGE ON SEQUENCE products_id_seq TO customer_mobile_role;
GRANT USAGE ON SEQUENCE categories_id_seq TO customer_mobile_role;
```

#### User Data Access (Own Data Only)
```sql
-- User profile management
GRANT SELECT, UPDATE ON users TO customer_mobile_role;

-- Shopping cart management
GRANT SELECT, INSERT, UPDATE, DELETE ON cart_items TO customer_mobile_role;
GRANT USAGE ON SEQUENCE cart_items_id_seq TO customer_mobile_role;

-- Order creation and viewing
GRANT SELECT, INSERT ON orders TO customer_mobile_role;
GRANT SELECT, INSERT ON order_items TO customer_mobile_role;
GRANT USAGE ON SEQUENCE orders_id_seq TO customer_mobile_role;
GRANT USAGE ON SEQUENCE order_items_id_seq TO customer_mobile_role;
```

### Business App Role (Comparison)

#### Full Access Role
```sql
-- Business app retains full access
CREATE ROLE business_app_role NOLOGIN;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO business_app_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO business_app_role;
```

## Row Level Security (RLS) Policies

### User Data Protection

#### Users Table
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own profile
CREATE POLICY "customer_own_profile" ON users
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Customer role restriction (read-only on role field)
CREATE POLICY "customer_role_restriction" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM users WHERE id = auth.uid()) -- Cannot change own role
  );
```

#### Cart Items Protection
```sql
-- Enable RLS on cart_items table
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own cart items
CREATE POLICY "customer_own_cart" ON cart_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Orders Protection
```sql
-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view and create their own orders only
CREATE POLICY "customer_own_orders" ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "customer_create_orders" ON orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Customers cannot update or delete orders
-- (Order updates handled by business app only)
```

#### Order Items Protection
```sql
-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view/create order items for their own orders
CREATE POLICY "customer_own_order_items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "customer_create_order_items" ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
```

### Business Data Protection

#### Inventory Tables
```sql
-- Completely block customer access to inventory tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_only_inventory" ON inventory_items
  FOR ALL
  USING (false); -- No customer access

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_only_stock_movements" ON stock_movements
  FOR ALL
  USING (false); -- No customer access
```

#### Marketing Tables
```sql
-- Block customer access to marketing tables
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_only_campaigns" ON marketing_campaigns
  FOR ALL
  USING (false); -- No customer access

ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_only_content" ON marketing_content
  FOR ALL
  USING (false); -- No customer access
```

#### Admin Tables
```sql
-- Block customer access to admin tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_only_roles" ON user_roles
  FOR ALL
  USING (false); -- No customer access

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_only_audit" ON audit_logs
  FOR ALL
  USING (false); -- No customer access
```

## API Key Management

### Customer App API Key

#### Supabase Configuration
```sql
-- Create customer-specific API key with restricted permissions
-- This is done through Supabase dashboard:
-- 1. Go to Settings > API
-- 2. Create new service role key
-- 3. Name: "customer-mobile-app"
-- 4. Role: customer_mobile_role
```

#### Environment Variables
```env
# Customer app environment (.env.customer)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_CUSTOMER_KEY=eyJ... # Restricted customer role key
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...     # Public anon key for auth
```

### Business App API Key (Comparison)
```env
# Business app environment (.env.business)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ... # Full service role key
SUPABASE_ANON_KEY=eyJ...    # Public anon key for auth
```

## Authentication & Authorization

### Customer Authentication Flow

#### Supabase Auth Configuration
```typescript
// Customer app Supabase client
export const customerSupabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_CUSTOMER_KEY!,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
      autoRefreshToken: true,
      flowType: 'pkce', // More secure for mobile
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'myfarmstand-customer-mobile',
      },
    },
  }
);
```

#### JWT Token Claims
```sql
-- Custom claims function for customer app
CREATE OR REPLACE FUNCTION auth.get_customer_claims(user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_role TEXT;
  claims JSON;
BEGIN
  -- Get user role (but don't expose admin roles to customer app)
  SELECT
    CASE
      WHEN role IN ('admin', 'manager', 'staff') THEN 'customer' -- Downgrade for security
      ELSE role
    END
  INTO user_role
  FROM users
  WHERE id = user_id;

  -- Build restricted claims for customer app
  claims := json_build_object(
    'role', COALESCE(user_role, 'customer'),
    'app_context', 'customer_mobile'
  );

  RETURN claims;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Session Management

#### Customer Session Validation
```typescript
// Customer app session validation
export const validateCustomerSession = async () => {
  const { data: { session }, error } = await customerSupabase.auth.getSession();

  if (error || !session) {
    throw new Error('Invalid customer session');
  }

  // Verify this is a customer session
  const claims = session.user?.user_metadata;
  if (claims?.app_context !== 'customer_mobile') {
    throw new Error('Invalid session context');
  }

  return session;
};
```

## Data Encryption

### Sensitive Data Protection

#### Customer PII Encryption
```sql
-- Install pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt customer PII
CREATE OR REPLACE FUNCTION encrypt_customer_pii(data TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use environment variable for encryption key
  RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt customer PII (restricted access)
CREATE OR REPLACE FUNCTION decrypt_customer_pii(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Payment Data Security
```sql
-- Payment information table (PCI DSS compliant)
CREATE TABLE customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL, -- Stripe token, not actual card data
  card_last_four TEXT, -- Only last 4 digits
  card_brand TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for payment methods
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_own_payment_methods" ON customer_payment_methods
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant access to customer app
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_payment_methods TO customer_mobile_role;
```

## Audit & Monitoring

### Customer App Audit Trail

#### Audit Log Configuration
```sql
-- Customer-specific audit trail
CREATE TABLE customer_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  app_context TEXT DEFAULT 'customer_mobile',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_customer_audit_user_id ON customer_audit_logs(user_id);
CREATE INDEX idx_customer_audit_created_at ON customer_audit_logs(created_at);

-- RLS: Users can view their own audit logs
ALTER TABLE customer_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_own_audit_logs" ON customer_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Grant read access to customer app
GRANT SELECT ON customer_audit_logs TO customer_mobile_role;
```

#### Audit Trigger Functions
```sql
-- Function to log customer app actions
CREATE OR REPLACE FUNCTION log_customer_action()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
  old_values JSONB;
  new_values JSONB;
BEGIN
  -- Get user ID from current session
  user_id_val := auth.uid();

  -- Skip if no user context (shouldn't happen in customer app)
  IF user_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Prepare audit data
  IF TG_OP = 'DELETE' THEN
    old_values := to_jsonb(OLD);
    new_values := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
  ELSE -- INSERT
    old_values := NULL;
    new_values := to_jsonb(NEW);
  END IF;

  -- Insert audit record
  INSERT INTO customer_audit_logs (
    user_id, action, table_name, record_id,
    old_values, new_values
  ) VALUES (
    user_id_val, TG_OP, TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    old_values, new_values
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to customer-accessible tables
CREATE TRIGGER audit_cart_items
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION log_customer_action();

CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_customer_action();

CREATE TRIGGER audit_user_updates
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION log_customer_action();
```

### Security Monitoring

#### Failed Access Attempts
```sql
-- Log failed customer app access attempts
CREATE TABLE customer_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'failed_login', 'unauthorized_access', 'rate_limit'
  user_id UUID REFERENCES users(id),
  email TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for security analysis
CREATE INDEX idx_customer_security_events_type ON customer_security_events(event_type);
CREATE INDEX idx_customer_security_events_ip ON customer_security_events(ip_address);
CREATE INDEX idx_customer_security_events_created_at ON customer_security_events(created_at);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_customer_security_event(
  event_type TEXT,
  user_id UUID DEFAULT NULL,
  email TEXT DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO customer_security_events (
    event_type, user_id, email, ip_address, user_agent, details
  ) VALUES (
    event_type, user_id, email, ip_address, user_agent, details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Backup & Recovery

### Customer Data Backup Strategy

#### Point-in-Time Recovery
```sql
-- Enable point-in-time recovery for customer data
-- (Configured at database level in Supabase dashboard)

-- Customer data backup verification
CREATE OR REPLACE FUNCTION verify_customer_data_integrity()
RETURNS TABLE(
  table_name TEXT,
  record_count BIGINT,
  last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'users'::TEXT,
    COUNT(*)::BIGINT,
    MAX(updated_at)
  FROM users
  WHERE role = 'customer'

  UNION ALL

  SELECT
    'cart_items'::TEXT,
    COUNT(*)::BIGINT,
    MAX(updated_at)
  FROM cart_items

  UNION ALL

  SELECT
    'orders'::TEXT,
    COUNT(*)::BIGINT,
    MAX(updated_at)
  FROM orders

  UNION ALL

  SELECT
    'order_items'::TEXT,
    COUNT(*)::BIGINT,
    MAX(created_at)
  FROM order_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Data Retention Policies
```sql
-- Function to clean up old customer data (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_customer_data()
RETURNS VOID AS $$
BEGIN
  -- Delete old audit logs (keep 7 years for compliance)
  DELETE FROM customer_audit_logs
  WHERE created_at < NOW() - INTERVAL '7 years';

  -- Delete old security events (keep 2 years)
  DELETE FROM customer_security_events
  WHERE created_at < NOW() - INTERVAL '2 years';

  -- Delete abandoned carts (keep 30 days)
  DELETE FROM cart_items
  WHERE updated_at < NOW() - INTERVAL '30 days';

  -- Archive old completed orders (move to archive table after 5 years)
  -- Implementation depends on specific business requirements
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (using pg_cron extension if available)
-- SELECT cron.schedule('cleanup-customer-data', '0 2 * * 0', 'SELECT cleanup_old_customer_data();');
```

## Compliance & Privacy

### GDPR Compliance

#### Data Subject Rights
```sql
-- Function to export all customer data (GDPR Article 20)
CREATE OR REPLACE FUNCTION export_customer_data(customer_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  customer_data JSONB;
BEGIN
  -- Build complete customer data export
  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'name', name,
        'phone', phone,
        'address', address,
        'created_at', created_at,
        'updated_at', updated_at
      )
      FROM users WHERE id = customer_user_id
    ),
    'orders', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'total_amount', o.total_amount,
          'status', o.status,
          'created_at', o.created_at,
          'items', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price
              )
            )
            FROM order_items oi WHERE oi.order_id = o.id
          )
        )
      )
      FROM orders o WHERE o.user_id = customer_user_id
    ),
    'audit_trail', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'action', action,
          'table_name', table_name,
          'created_at', created_at
        )
      )
      FROM customer_audit_logs WHERE user_id = customer_user_id
    )
  ) INTO customer_data;

  RETURN customer_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete all customer data (GDPR Article 17 - Right to erasure)
CREATE OR REPLACE FUNCTION delete_customer_data(customer_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete in correct order to respect foreign key constraints
  DELETE FROM order_items WHERE order_id IN (
    SELECT id FROM orders WHERE user_id = customer_user_id
  );
  DELETE FROM orders WHERE user_id = customer_user_id;
  DELETE FROM cart_items WHERE user_id = customer_user_id;
  DELETE FROM customer_payment_methods WHERE user_id = customer_user_id;
  DELETE FROM customer_audit_logs WHERE user_id = customer_user_id;
  DELETE FROM customer_security_events WHERE user_id = customer_user_id;
  DELETE FROM users WHERE id = customer_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Security Testing & Validation

### Penetration Testing Checklist

#### Database Security Tests
- [ ] Verify customer app cannot access business tables
- [ ] Test RLS policies prevent cross-user data access
- [ ] Validate API key restrictions work correctly
- [ ] Test SQL injection protection
- [ ] Verify encryption of sensitive data
- [ ] Test authentication bypass attempts
- [ ] Validate audit logging captures all actions

#### Application Security Tests
- [ ] Test customer app with business API keys (should fail)
- [ ] Verify customer cannot escalate to admin privileges
- [ ] Test data export/import functions
- [ ] Validate session management security
- [ ] Test rate limiting and DOS protection

### Monitoring & Alerting

#### Security Alert Configuration
```sql
-- Function to check for security anomalies
CREATE OR REPLACE FUNCTION check_customer_security_anomalies()
RETURNS TABLE(
  alert_type TEXT,
  user_id UUID,
  details TEXT,
  severity INTEGER
) AS $$
BEGIN
  -- Multiple failed login attempts
  RETURN QUERY
  SELECT
    'multiple_failed_logins'::TEXT,
    cse.user_id,
    format('User %s had %s failed login attempts in the last hour',
           cse.email, COUNT(*)),
    3::INTEGER
  FROM customer_security_events cse
  WHERE cse.event_type = 'failed_login'
    AND cse.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY cse.user_id, cse.email
  HAVING COUNT(*) >= 5;

  -- Suspicious access patterns
  RETURN QUERY
  SELECT
    'suspicious_access'::TEXT,
    cal.user_id,
    format('User accessed from %s different IP addresses in last 24 hours',
           COUNT(DISTINCT cal.ip_address)),
    2::INTEGER
  FROM customer_audit_logs cal
  WHERE cal.created_at > NOW() - INTERVAL '24 hours'
    AND cal.ip_address IS NOT NULL
  GROUP BY cal.user_id
  HAVING COUNT(DISTINCT cal.ip_address) >= 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This comprehensive database security model ensures that the customer mobile app operates in a secure, isolated environment while maintaining access to necessary data for a great user experience. The security measures protect both customer data and business-sensitive information while enabling compliance with relevant privacy regulations.