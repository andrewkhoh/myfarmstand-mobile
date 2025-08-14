-- Atomic Pickup Reschedule RPC Function
-- Handles pickup rescheduling operations atomically

CREATE OR REPLACE FUNCTION reschedule_pickup_atomic(
  input_order_id UUID,
  input_user_id UUID,
  input_new_pickup_date DATE,
  input_new_pickup_time TIME,
  input_reason TEXT DEFAULT NULL,
  input_requested_by TEXT DEFAULT 'customer'
) RETURNS JSONB AS $$
DECLARE
  reschedule_id UUID;
  order_record RECORD;
  original_pickup_date DATE;
  original_pickup_time TIME;
  reschedule_success BOOLEAN := FALSE;
  validation_error TEXT := NULL;
BEGIN
  -- Generate unique reschedule ID
  reschedule_id := gen_random_uuid();
  
  -- Get current order information
  SELECT o.id, o.user_id, o.pickup_date, o.pickup_time, o.status
  INTO order_record
  FROM orders o
  WHERE o.id = input_order_id;
  
  -- Validate order exists and belongs to user (unless staff request)
  IF order_record.id IS NULL THEN
    validation_error := 'Order not found';
  ELSIF input_requested_by = 'customer' AND order_record.user_id != input_user_id THEN
    validation_error := 'Order does not belong to user';
  ELSIF order_record.status NOT IN ('confirmed', 'preparing', 'ready') THEN
    validation_error := 'Order cannot be rescheduled in current status: ' || order_record.status;
  END IF;
  
  -- Validate new pickup time is in the future
  IF validation_error IS NULL AND (input_new_pickup_date < CURRENT_DATE OR 
     (input_new_pickup_date = CURRENT_DATE AND input_new_pickup_time <= CURRENT_TIME)) THEN
    validation_error := 'New pickup time must be in the future';
  END IF;
  
  -- Store original pickup time
  original_pickup_date := order_record.pickup_date;
  original_pickup_time := order_record.pickup_time;
  
  -- If validation passed, proceed with reschedule
  IF validation_error IS NULL THEN
    BEGIN
      -- Create reschedule log entry
      INSERT INTO pickup_reschedule_log (
        id,
        order_id,
        user_id,
        original_pickup_date,
        original_pickup_time,
        new_pickup_date,
        new_pickup_time,
        reason,
        requested_by,
        status,
        approved_by,
        approved_at,
        created_at
      ) VALUES (
        reschedule_id,
        input_order_id,
        input_user_id,
        original_pickup_date,
        original_pickup_time,
        input_new_pickup_date,
        input_new_pickup_time,
        input_reason,
        input_requested_by,
        'approved', -- Auto-approve for now, can add approval workflow later
        CASE WHEN input_requested_by = 'staff' THEN input_user_id ELSE NULL END,
        CASE WHEN input_requested_by = 'staff' THEN NOW() ELSE NOW() END,
        NOW()
      );
      
      -- Update order with new pickup time
      UPDATE orders 
      SET 
        pickup_date = input_new_pickup_date,
        pickup_time = input_new_pickup_time,
        updated_at = NOW()
      WHERE id = input_order_id;
      
      -- Reset order status if it was ready (since pickup time changed)
      IF order_record.status = 'ready' THEN
        UPDATE orders 
        SET status = 'preparing'
        WHERE id = input_order_id;
      END IF;
      
      reschedule_success := TRUE;
      
    EXCEPTION WHEN OTHERS THEN
      reschedule_success := FALSE;
      validation_error := 'Database error during reschedule: ' || SQLERRM;
    END;
  END IF;
  
  -- Log the reschedule attempt even if it failed
  IF NOT reschedule_success AND reschedule_id IS NOT NULL THEN
    INSERT INTO pickup_reschedule_log (
      id,
      order_id,
      user_id,
      original_pickup_date,
      original_pickup_time,
      new_pickup_date,
      new_pickup_time,
      reason,
      requested_by,
      status,
      rejection_reason,
      created_at
    ) VALUES (
      reschedule_id,
      input_order_id,
      input_user_id,
      original_pickup_date,
      original_pickup_time,
      input_new_pickup_date,
      input_new_pickup_time,
      input_reason,
      input_requested_by,
      'rejected',
      validation_error,
      NOW()
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', reschedule_success,
    'reschedule_id', reschedule_id,
    'order_id', input_order_id,
    'original_pickup_date', original_pickup_date,
    'original_pickup_time', original_pickup_time,
    'new_pickup_date', input_new_pickup_date,
    'new_pickup_time', input_new_pickup_time,
    'message', CASE 
      WHEN reschedule_success THEN 'Pickup time rescheduled successfully'
      ELSE 'Reschedule failed: ' || COALESCE(validation_error, 'Unknown error')
    END,
    'error', CASE WHEN NOT reschedule_success THEN validation_error ELSE NULL END
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'reschedule_id', COALESCE(reschedule_id, gen_random_uuid()),
    'order_id', input_order_id,
    'message', 'Reschedule function failed: ' || SQLERRM,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reschedule_pickup_atomic TO authenticated;
