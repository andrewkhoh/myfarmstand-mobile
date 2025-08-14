-- Error Recovery Schema Migration
-- Creates tables for atomic error recovery operations

-- Error Recovery Log Table
CREATE TABLE IF NOT EXISTS error_recovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL CHECK (error_type IN (
    'payment_failed',
    'stock_update_failed', 
    'order_creation_failed',
    'notification_failed',
    'database_error',
    'network_error',
    'system_error'
  )),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL DEFAULT 'unknown',
  original_error TEXT,
  recovery_strategy TEXT NOT NULL CHECK (recovery_strategy IN (
    'retry',
    'rollback',
    'compensate',
    'manual_intervention',
    'ignore'
  )),
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN (
    'processing',
    'completed',
    'failed',
    'manual_review'
  )),
  compensation_applied BOOLEAN DEFAULT FALSE,
  attempts_made INTEGER DEFAULT 0,
  result_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Indexes for performance
  INDEX idx_error_recovery_log_error_type ON error_recovery_log(error_type),
  INDEX idx_error_recovery_log_order_id ON error_recovery_log(order_id),
  INDEX idx_error_recovery_log_user_id ON error_recovery_log(user_id),
  INDEX idx_error_recovery_log_status ON error_recovery_log(status),
  INDEX idx_error_recovery_log_created_at ON error_recovery_log(created_at)
);

-- Notification Log Table for atomic notification tracking
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'order_confirmation',
    'pickup_ready',
    'pickup_reminder',
    'order_cancelled',
    'payment_failed',
    'custom'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  message_content TEXT,
  delivery_method TEXT NOT NULL DEFAULT 'in_app' CHECK (delivery_method IN (
    'in_app',
    'email',
    'sms',
    'push'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'delivered',
    'failed',
    'bounced'
  )),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_notification_log_type ON notification_log(notification_type),
  INDEX idx_notification_log_user_id ON notification_log(user_id),
  INDEX idx_notification_log_order_id ON notification_log(order_id),
  INDEX idx_notification_log_status ON notification_log(status),
  INDEX idx_notification_log_created_at ON notification_log(created_at)
);

-- Pickup Reschedule Log Table for atomic reschedule tracking
CREATE TABLE IF NOT EXISTS pickup_reschedule_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_pickup_date DATE,
  original_pickup_time TIME,
  new_pickup_date DATE NOT NULL,
  new_pickup_time TIME NOT NULL,
  reason TEXT,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('customer', 'staff', 'system')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  )),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_pickup_reschedule_order_id ON pickup_reschedule_log(order_id),
  INDEX idx_pickup_reschedule_user_id ON pickup_reschedule_log(user_id),
  INDEX idx_pickup_reschedule_status ON pickup_reschedule_log(status),
  INDEX idx_pickup_reschedule_created_at ON pickup_reschedule_log(created_at)
);

-- No Show Processing Log Table for atomic no-show handling
CREATE TABLE IF NOT EXISTS no_show_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_pickup_date DATE NOT NULL,
  original_pickup_time TIME NOT NULL,
  grace_period_minutes INTEGER DEFAULT 30,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'detected' CHECK (processing_status IN (
    'detected',
    'processing',
    'cancelled',
    'stock_restored',
    'notification_sent',
    'completed',
    'failed'
  )),
  stock_restoration_applied BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT DEFAULT 'no_show_timeout',
  metadata JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  
  -- Indexes for performance
  INDEX idx_no_show_log_order_id ON no_show_log(order_id),
  INDEX idx_no_show_log_user_id ON no_show_log(user_id),
  INDEX idx_no_show_log_status ON no_show_log(processing_status),
  INDEX idx_no_show_log_detected_at ON no_show_log(detected_at)
);

-- Row Level Security (RLS) Policies
ALTER TABLE error_recovery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_reschedule_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_show_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error_recovery_log
CREATE POLICY "Users can view their own error recovery logs" ON error_recovery_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all error recovery logs" ON error_recovery_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- RLS Policies for notification_log
CREATE POLICY "Users can view their own notifications" ON notification_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all notifications" ON notification_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- RLS Policies for pickup_reschedule_log
CREATE POLICY "Users can view their own reschedule requests" ON pickup_reschedule_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reschedule requests" ON pickup_reschedule_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view and manage all reschedule requests" ON pickup_reschedule_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- RLS Policies for no_show_log
CREATE POLICY "Users can view their own no-show records" ON no_show_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all no-show records" ON no_show_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON error_recovery_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pickup_reschedule_log TO authenticated;
GRANT SELECT ON no_show_log TO authenticated;

-- Staff can perform all operations
GRANT ALL ON error_recovery_log TO service_role;
GRANT ALL ON notification_log TO service_role;
GRANT ALL ON pickup_reschedule_log TO service_role;
GRANT ALL ON no_show_log TO service_role;
