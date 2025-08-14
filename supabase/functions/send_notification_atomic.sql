-- Atomic Notification RPC Function
-- Handles notification sending and logging atomically

CREATE OR REPLACE FUNCTION send_notification_atomic(
  input_notification_type TEXT,
  input_user_id UUID,
  input_order_id UUID DEFAULT NULL,
  input_customer_name TEXT DEFAULT NULL,
  input_customer_email TEXT DEFAULT NULL,
  input_customer_phone TEXT DEFAULT NULL,
  input_message_content TEXT DEFAULT NULL,
  input_delivery_method TEXT DEFAULT 'in_app',
  input_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  notification_id UUID;
  user_profile RECORD;
  order_record RECORD;
  final_message TEXT;
  delivery_success BOOLEAN := FALSE;
  error_message TEXT := NULL;
BEGIN
  -- Generate unique notification ID
  notification_id := gen_random_uuid();
  
  -- Get user profile information if not provided
  IF input_customer_name IS NULL OR input_customer_email IS NULL THEN
    SELECT up.full_name, up.email, up.phone
    INTO user_profile
    FROM user_profiles up
    WHERE up.user_id = input_user_id;
  END IF;
  
  -- Get order information if order_id provided
  IF input_order_id IS NOT NULL THEN
    SELECT o.id, o.total_amount, o.pickup_date, o.pickup_time, o.status
    INTO order_record
    FROM orders o
    WHERE o.id = input_order_id;
  END IF;
  
  -- Build final message content based on notification type
  final_message := CASE input_notification_type
    WHEN 'order_confirmation' THEN
      COALESCE(input_message_content, 
        'Your order #' || SUBSTRING(input_order_id::TEXT FROM 1 FOR 8) || 
        ' has been confirmed. Total: $' || COALESCE(order_record.total_amount::TEXT, '0.00') ||
        '. Pickup: ' || COALESCE(order_record.pickup_date::TEXT, 'TBD') || 
        ' at ' || COALESCE(order_record.pickup_time::TEXT, 'TBD'))
    WHEN 'pickup_ready' THEN
      COALESCE(input_message_content,
        'Your order #' || SUBSTRING(input_order_id::TEXT FROM 1 FOR 8) || 
        ' is ready for pickup! Please arrive during your scheduled time: ' ||
        COALESCE(order_record.pickup_date::TEXT, 'TBD') || 
        ' at ' || COALESCE(order_record.pickup_time::TEXT, 'TBD'))
    WHEN 'pickup_reminder' THEN
      COALESCE(input_message_content,
        'Reminder: Your order #' || SUBSTRING(input_order_id::TEXT FROM 1 FOR 8) || 
        ' is scheduled for pickup today at ' || COALESCE(order_record.pickup_time::TEXT, 'TBD'))
    WHEN 'order_cancelled' THEN
      COALESCE(input_message_content,
        'Your order #' || SUBSTRING(input_order_id::TEXT FROM 1 FOR 8) || 
        ' has been cancelled. Any payment will be refunded within 3-5 business days.')
    WHEN 'payment_failed' THEN
      COALESCE(input_message_content,
        'Payment failed for order #' || SUBSTRING(input_order_id::TEXT FROM 1 FOR 8) || 
        '. Please update your payment method and try again.')
    ELSE
      COALESCE(input_message_content, 'You have a new notification from Farm Stand.')
  END;
  
  -- Create notification log entry
  INSERT INTO notification_log (
    id,
    notification_type,
    user_id,
    order_id,
    customer_name,
    customer_email,
    customer_phone,
    message_content,
    delivery_method,
    status,
    metadata,
    created_at
  ) VALUES (
    notification_id,
    input_notification_type,
    input_user_id,
    input_order_id,
    COALESCE(input_customer_name, user_profile.full_name),
    COALESCE(input_customer_email, user_profile.email),
    COALESCE(input_customer_phone, user_profile.phone),
    final_message,
    input_delivery_method,
    'pending',
    input_metadata,
    NOW()
  );
  
  -- Simulate notification delivery (in real implementation, this would integrate with email/SMS services)
  BEGIN
    -- For in-app notifications, mark as sent immediately
    IF input_delivery_method = 'in_app' THEN
      delivery_success := TRUE;
    -- For email/SMS, this would call external service
    ELSIF input_delivery_method IN ('email', 'sms', 'push') THEN
      -- Placeholder for external service integration
      -- In production, integrate with SendGrid, Twilio, etc.
      delivery_success := TRUE;
    END IF;
    
    -- Update notification status based on delivery result
    UPDATE notification_log 
    SET 
      status = CASE WHEN delivery_success THEN 'sent' ELSE 'failed' END,
      sent_at = CASE WHEN delivery_success THEN NOW() ELSE NULL END,
      error_message = CASE WHEN NOT delivery_success THEN 'Delivery service unavailable' ELSE NULL END
    WHERE id = notification_id;
    
  EXCEPTION WHEN OTHERS THEN
    delivery_success := FALSE;
    error_message := SQLERRM;
    
    -- Update notification with error
    UPDATE notification_log 
    SET 
      status = 'failed',
      error_message = error_message,
      retry_count = retry_count + 1
    WHERE id = notification_id;
  END;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', delivery_success,
    'notification_id', notification_id,
    'message', CASE 
      WHEN delivery_success THEN 'Notification sent successfully'
      ELSE 'Notification delivery failed: ' || COALESCE(error_message, 'Unknown error')
    END,
    'delivery_method', input_delivery_method,
    'notification_type', input_notification_type
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log the notification failure
  INSERT INTO notification_log (
    id,
    notification_type,
    user_id,
    order_id,
    customer_name,
    customer_email,
    customer_phone,
    message_content,
    delivery_method,
    status,
    error_message,
    metadata,
    created_at
  ) VALUES (
    COALESCE(notification_id, gen_random_uuid()),
    input_notification_type,
    input_user_id,
    input_order_id,
    COALESCE(input_customer_name, 'Unknown'),
    COALESCE(input_customer_email, 'unknown@example.com'),
    input_customer_phone,
    'Notification creation failed',
    input_delivery_method,
    'failed',
    'Function error: ' || SQLERRM,
    input_metadata,
    NOW()
  ) ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', FALSE,
    'notification_id', COALESCE(notification_id, gen_random_uuid()),
    'message', 'Notification function failed: ' || SQLERRM,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION send_notification_atomic TO authenticated;
