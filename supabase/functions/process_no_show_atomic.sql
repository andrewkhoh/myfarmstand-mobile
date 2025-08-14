-- Atomic No-Show Processing RPC Function
-- Handles no-show detection and processing atomically

CREATE OR REPLACE FUNCTION process_no_show_atomic(
  input_order_id UUID,
  input_grace_period_minutes INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  no_show_id UUID;
  order_record RECORD;
  pickup_deadline TIMESTAMPTZ;
  current_time TIMESTAMPTZ := NOW();
  processing_success BOOLEAN := FALSE;
  stock_restored BOOLEAN := FALSE;
  notification_sent BOOLEAN := FALSE;
  error_message TEXT := NULL;
BEGIN
  -- Generate unique no-show processing ID
  no_show_id := gen_random_uuid();
  
  -- Get order information
  SELECT o.id, o.user_id, o.pickup_date, o.pickup_time, o.status, o.total_amount
  INTO order_record
  FROM orders o
  WHERE o.id = input_order_id;
  
  -- Validate order exists
  IF order_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'no_show_id', no_show_id,
      'message', 'Order not found',
      'error', 'Order does not exist'
    );
  END IF;
  
  -- Calculate pickup deadline (pickup time + grace period)
  pickup_deadline := (order_record.pickup_date + order_record.pickup_time + 
                     (input_grace_period_minutes || ' minutes')::INTERVAL);
  
  -- Validate this is actually a no-show (past deadline)
  IF current_time <= pickup_deadline THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'no_show_id', no_show_id,
      'message', 'Order is not yet past pickup deadline',
      'pickup_deadline', pickup_deadline,
      'current_time', current_time
    );
  END IF;
  
  -- Validate order is in a state that can be marked as no-show
  IF order_record.status NOT IN ('confirmed', 'preparing', 'ready') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'no_show_id', no_show_id,
      'message', 'Order cannot be processed as no-show in current status: ' || order_record.status
    );
  END IF;
  
  BEGIN
    -- Create no-show log entry
    INSERT INTO no_show_log (
      id,
      order_id,
      user_id,
      original_pickup_date,
      original_pickup_time,
      grace_period_minutes,
      detected_at,
      processing_status
    ) VALUES (
      no_show_id,
      input_order_id,
      order_record.user_id,
      order_record.pickup_date,
      order_record.pickup_time,
      input_grace_period_minutes,
      current_time,
      'processing'
    );
    
    -- Update order status to cancelled with no-show reason
    UPDATE orders 
    SET 
      status = 'cancelled',
      cancellation_reason = 'no_show_timeout',
      cancelled_at = current_time,
      updated_at = current_time
    WHERE id = input_order_id;
    
    -- Restore stock for all order items atomically
    BEGIN
      UPDATE products 
      SET 
        stock_quantity = stock_quantity + oi.quantity,
        updated_at = current_time
      FROM order_items oi 
      WHERE products.id = oi.product_id 
        AND oi.order_id = input_order_id;
      
      stock_restored := TRUE;
      
      -- Update no-show log with stock restoration success
      UPDATE no_show_log 
      SET 
        processing_status = 'stock_restored',
        stock_restoration_applied = TRUE
      WHERE id = no_show_id;
      
    EXCEPTION WHEN OTHERS THEN
      stock_restored := FALSE;
      error_message := 'Stock restoration failed: ' || SQLERRM;
    END;
    
    -- Create notification for customer about no-show cancellation
    BEGIN
      INSERT INTO notification_log (
        id,
        notification_type,
        user_id,
        order_id,
        message_content,
        delivery_method,
        status,
        created_at
      ) VALUES (
        gen_random_uuid(),
        'order_cancelled',
        order_record.user_id,
        input_order_id,
        'Your order #' || SUBSTRING(input_order_id::TEXT FROM 1 FOR 8) || 
        ' has been automatically cancelled due to no-show. Stock has been restored and any payment will be refunded.',
        'in_app',
        'sent',
        current_time
      );
      
      notification_sent := TRUE;
      
      -- Update no-show log with notification success
      UPDATE no_show_log 
      SET 
        processing_status = 'notification_sent',
        notification_sent = TRUE
      WHERE id = no_show_id;
      
    EXCEPTION WHEN OTHERS THEN
      notification_sent := FALSE;
      -- Don't fail the entire operation if notification fails
    END;
    
    -- Mark no-show processing as completed
    UPDATE no_show_log 
    SET 
      processing_status = 'completed',
      processed_at = current_time,
      metadata = jsonb_build_object(
        'stock_restored', stock_restored,
        'notification_sent', notification_sent,
        'total_amount', order_record.total_amount,
        'processing_duration_ms', EXTRACT(EPOCH FROM (current_time - current_time)) * 1000
      )
    WHERE id = no_show_id;
    
    processing_success := TRUE;
    
  EXCEPTION WHEN OTHERS THEN
    processing_success := FALSE;
    error_message := 'No-show processing failed: ' || SQLERRM;
    
    -- Update no-show log with failure
    UPDATE no_show_log 
    SET 
      processing_status = 'failed',
      processed_at = current_time,
      metadata = jsonb_build_object(
        'error', error_message,
        'stock_restored', stock_restored,
        'notification_sent', notification_sent
      )
    WHERE id = no_show_id;
  END;
  
  -- Return comprehensive result
  RETURN jsonb_build_object(
    'success', processing_success,
    'no_show_id', no_show_id,
    'order_id', input_order_id,
    'pickup_deadline', pickup_deadline,
    'detected_at', current_time,
    'stock_restored', stock_restored,
    'notification_sent', notification_sent,
    'message', CASE 
      WHEN processing_success THEN 'No-show processed successfully - order cancelled and stock restored'
      ELSE 'No-show processing failed: ' || COALESCE(error_message, 'Unknown error')
    END,
    'error', CASE WHEN NOT processing_success THEN error_message ELSE NULL END,
    'grace_period_minutes', input_grace_period_minutes
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Final fallback error handling
  INSERT INTO no_show_log (
    id,
    order_id,
    user_id,
    original_pickup_date,
    original_pickup_time,
    grace_period_minutes,
    detected_at,
    processing_status,
    processed_at,
    metadata
  ) VALUES (
    COALESCE(no_show_id, gen_random_uuid()),
    input_order_id,
    COALESCE(order_record.user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(order_record.pickup_date, CURRENT_DATE),
    COALESCE(order_record.pickup_time, CURRENT_TIME),
    input_grace_period_minutes,
    current_time,
    'failed',
    current_time,
    jsonb_build_object('fatal_error', SQLERRM)
  ) ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', FALSE,
    'no_show_id', COALESCE(no_show_id, gen_random_uuid()),
    'order_id', input_order_id,
    'message', 'No-show processing function failed: ' || SQLERRM,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_no_show_atomic TO authenticated;
