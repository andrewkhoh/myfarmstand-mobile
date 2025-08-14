-- =====================================================
-- ADD NOTIFICATION LOGS TABLE
-- =====================================================
-- Creates notification_logs table for audit trail of all notifications sent
-- Required for NotificationService logging functionality

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    customer_email VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('order_confirmation', 'pickup_ready', 'pickup_reminder', 'order_cancelled')),
    channels_attempted TEXT[] NOT NULL DEFAULT '{}',
    channels_sent TEXT[] NOT NULL DEFAULT '{}',
    channels_failed TEXT[] NOT NULL DEFAULT '{}',
    template_title TEXT NOT NULL,
    template_body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id ON notification_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_customer_email ON notification_logs (customer_email);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs (notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs (created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notification logs
CREATE POLICY "Users can view their own notification logs" ON notification_logs
    FOR SELECT USING (
        customer_email = auth.jwt() ->> 'email'
    );

-- Policy: Admin/staff can view all notification logs
CREATE POLICY "Admin and staff can view all notification logs" ON notification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'staff', 'manager')
        )
    );

-- Policy: System can insert notification logs (for service account)
CREATE POLICY "System can insert notification logs" ON notification_logs
    FOR INSERT WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE notification_logs IS 'Audit trail of all notifications sent to customers';
COMMENT ON COLUMN notification_logs.order_id IS 'Reference to the order that triggered the notification';
COMMENT ON COLUMN notification_logs.customer_email IS 'Email address of the customer who received the notification';
COMMENT ON COLUMN notification_logs.notification_type IS 'Type of notification: order_confirmation, pickup_ready, pickup_reminder, order_cancelled';
COMMENT ON COLUMN notification_logs.channels_attempted IS 'Array of notification channels that were attempted (push, email, sms)';
COMMENT ON COLUMN notification_logs.channels_sent IS 'Array of notification channels that successfully sent';
COMMENT ON COLUMN notification_logs.channels_failed IS 'Array of notification channels that failed to send';
COMMENT ON COLUMN notification_logs.template_title IS 'The title/subject of the notification that was sent';
COMMENT ON COLUMN notification_logs.template_body IS 'The body content of the notification that was sent';
