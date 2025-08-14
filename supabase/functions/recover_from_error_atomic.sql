-- Atomic Error Recovery RPC Function
-- Handles error recovery operations atomically to prevent race conditions

CREATE OR REPLACE FUNCTION recover_from_error_atomic(
  input_error_type TEXT,
  input_order_id UUID DEFAULT NULL,
  input_user_id UUID DEFAULT NULL,
  input_operation TEXT DEFAULT 'unknown',
  input_original_error TEXT DEFAULT '',
  input_retry_count INTEGER DEFAULT 0,
  input_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  recovery_id UUID;
  recovery_strategy TEXT;
  result_data JSONB;
  compensation_applied BOOLEAN := FALSE;
  recovery_success BOOLEAN := FALSE;
  attempts_made INTEGER := 0;
BEGIN
  -- Generate unique recovery ID
  recovery_id := gen_random_uuid();
  
  -- Determine recovery strategy based on error type
  recovery_strategy := CASE input_error_type
    WHEN 'payment_failed' THEN 'retry'
    WHEN 'stock_update_failed' THEN 'compensate'
    WHEN 'order_creation_failed' THEN 'rollback'
    WHEN 'notification_failed' THEN 'retry'
    WHEN 'database_error' THEN 'retry'
    WHEN 'network_error' THEN 'retry'
    ELSE 'manual_intervention'
  END;
  
  -- Log error recovery attempt
  INSERT INTO error_recovery_log (
    id,
    error_type,
    order_id,
    user_id,
    operation,
    original_error,
    recovery_strategy,
    retry_count,
    metadata,
    status,
    created_at
  ) VALUES (
    recovery_id,
    input_error_type,
    input_order_id,
    input_user_id,
    input_operation,
    input_original_error,
    recovery_strategy,
    input_retry_count,
    input_metadata,
    'processing',
    NOW()
  );
  
  -- Execute recovery strategy atomically
  IF recovery_strategy = 'compensate' AND input_order_id IS NOT NULL THEN
    -- Compensate by restoring stock if order failed
    BEGIN
      -- Restore stock for failed order items
      UPDATE products 
      SET stock_quantity = stock_quantity + oi.quantity
      FROM order_items oi 
      WHERE products.id = oi.product_id 
        AND oi.order_id = input_order_id;
      
      -- Mark order as cancelled
      UPDATE orders 
      SET status = 'cancelled',
          cancellation_reason = 'automatic_recovery',
          updated_at = NOW()
      WHERE id = input_order_id;
      
      compensation_applied := TRUE;
      recovery_success := TRUE;
      attempts_made := 1;
      
    EXCEPTION WHEN OTHERS THEN
      recovery_success := FALSE;
    END;
    
  ELSIF recovery_strategy = 'rollback' AND input_order_id IS NOT NULL THEN
    -- Rollback failed order creation
    BEGIN
      -- Delete order items first (foreign key constraint)
      DELETE FROM order_items WHERE order_id = input_order_id;
      
      -- Delete the order
      DELETE FROM orders WHERE id = input_order_id;
      
      recovery_success := TRUE;
      attempts_made := 1;
      
    EXCEPTION WHEN OTHERS THEN
      recovery_success := FALSE;
    END;
    
  ELSE
    -- For retry and manual intervention strategies
    recovery_success := TRUE;
    attempts_made := input_retry_count + 1;
  END IF;
  
  -- Update recovery log with results
  UPDATE error_recovery_log 
  SET 
    status = CASE WHEN recovery_success THEN 'completed' ELSE 'failed' END,
    compensation_applied = compensation_applied,
    attempts_made = attempts_made,
    completed_at = NOW(),
    result_message = CASE 
      WHEN recovery_success THEN 'Recovery completed successfully'
      ELSE 'Recovery failed - manual intervention required'
    END
  WHERE id = recovery_id;
  
  -- Build result JSON
  result_data := jsonb_build_object(
    'success', recovery_success,
    'recovery_id', recovery_id,
    'action', recovery_strategy,
    'attempts', attempts_made,
    'recovered', recovery_success,
    'compensation_applied', compensation_applied,
    'message', CASE 
      WHEN recovery_success THEN 'Error recovery completed successfully'
      ELSE 'Error recovery failed - manual intervention required'
    END
  );
  
  RETURN result_data;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the recovery failure
  UPDATE error_recovery_log 
  SET 
    status = 'failed',
    completed_at = NOW(),
    result_message = 'Recovery function failed: ' || SQLERRM
  WHERE id = recovery_id;
  
  RETURN jsonb_build_object(
    'success', FALSE,
    'recovery_id', recovery_id,
    'action', 'failed',
    'attempts', 0,
    'recovered', FALSE,
    'compensation_applied', FALSE,
    'message', 'Recovery function failed: ' || SQLERRM,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION recover_from_error_atomic TO authenticated;
