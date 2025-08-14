-- =====================================================
-- FIX NOTIFICATION TYPES CONSTRAINT
-- =====================================================
-- Updates notification_logs table constraint to match actual notification types
-- used in NotificationService.ts

-- Drop the existing constraint
ALTER TABLE notification_logs 
DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check;

-- Add the correct constraint with actual notification types from NotificationService
ALTER TABLE notification_logs 
ADD CONSTRAINT notification_logs_notification_type_check 
CHECK (notification_type IN ('order_ready', 'order_confirmed', 'order_cancelled', 'payment_reminder'));

-- Update the comment to reflect actual types
COMMENT ON COLUMN notification_logs.notification_type IS 'Type of notification: order_ready, order_confirmed, order_cancelled, payment_reminder';
