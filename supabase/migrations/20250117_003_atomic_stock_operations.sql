-- Create atomic stock update function with optimistic locking
CREATE OR REPLACE FUNCTION update_stock_atomic(
  p_item_id UUID,
  p_user_id UUID,
  p_operation TEXT, -- 'add', 'subtract', 'set'
  p_quantity INTEGER,
  p_reason TEXT DEFAULT 'Stock adjustment',
  p_performed_by UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_stock INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_item_exists BOOLEAN;
BEGIN
  -- Start transaction
  -- Verify user owns the item and lock the row
  SELECT current_stock INTO v_current_stock
  FROM inventory_items
  WHERE id = p_item_id
    AND user_id = p_user_id
  FOR UPDATE NOWAIT; -- Fail fast if row is locked
  
  -- Check if item was found
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT FALSE, 0, 'Item not found or unauthorized'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate new stock based on operation
  CASE p_operation
    WHEN 'add' THEN
      v_new_stock := v_current_stock + p_quantity;
    WHEN 'subtract' THEN
      v_new_stock := v_current_stock - p_quantity;
    WHEN 'set' THEN
      v_new_stock := p_quantity;
    ELSE
      RETURN QUERY
      SELECT FALSE, v_current_stock, 'Invalid operation'::TEXT;
      RETURN;
  END CASE;
  
  -- Validate new stock is not negative
  IF v_new_stock < 0 THEN
    RETURN QUERY
    SELECT FALSE, v_current_stock, 'Insufficient stock'::TEXT;
    RETURN;
  END IF;
  
  -- Update the stock
  UPDATE inventory_items
  SET 
    current_stock = v_new_stock,
    updated_at = NOW()
  WHERE id = p_item_id
    AND user_id = p_user_id;
  
  -- Record the movement
  INSERT INTO stock_movements (
    inventory_item_id,
    user_id,
    movement_type,
    quantity,
    reason,
    performed_by,
    stock_before,
    stock_after,
    created_at
  ) VALUES (
    p_item_id,
    p_user_id,
    p_operation,
    p_quantity,
    p_reason,
    COALESCE(p_performed_by, p_user_id),
    v_current_stock,
    v_new_stock,
    NOW()
  );
  
  -- Check if we need to create/update alerts
  PERFORM check_stock_alerts(p_item_id, p_user_id, v_new_stock);
  
  RETURN QUERY
  SELECT TRUE, v_new_stock, 'Stock updated successfully'::TEXT;
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY
    SELECT FALSE, v_current_stock, 'Item is being updated by another process'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT FALSE, v_current_stock, SQLERRM::TEXT;
END;
$$;

-- Create function to check and generate stock alerts
CREATE OR REPLACE FUNCTION check_stock_alerts(
  p_item_id UUID,
  p_user_id UUID,
  p_current_stock INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_record RECORD;
  v_alert_type TEXT;
  v_severity TEXT;
  v_message TEXT;
BEGIN
  -- Get item details
  SELECT 
    name,
    minimum_stock,
    reorder_point
  INTO v_item_record
  FROM inventory_items
  WHERE id = p_item_id;
  
  -- Determine alert conditions
  IF p_current_stock = 0 THEN
    v_alert_type := 'out_of_stock';
    v_severity := 'critical';
    v_message := format('Item "%s" is out of stock', v_item_record.name);
  ELSIF p_current_stock <= v_item_record.minimum_stock THEN
    v_alert_type := 'low_stock';
    v_severity := 'warning';
    v_message := format('Item "%s" is below minimum stock level (%s/%s)', 
                       v_item_record.name, p_current_stock, v_item_record.minimum_stock);
  ELSIF v_item_record.reorder_point IS NOT NULL AND p_current_stock <= v_item_record.reorder_point THEN
    v_alert_type := 'reorder_needed';
    v_severity := 'low';
    v_message := format('Item "%s" has reached reorder point (%s/%s)', 
                       v_item_record.name, p_current_stock, v_item_record.reorder_point);
  ELSE
    -- No alert needed, mark any existing alerts as resolved
    UPDATE inventory_alerts
    SET 
      acknowledged = TRUE,
      acknowledged_at = NOW(),
      acknowledged_by = p_user_id
    WHERE inventory_item_id = p_item_id
      AND user_id = p_user_id
      AND acknowledged = FALSE;
    RETURN;
  END IF;
  
  -- Check if this alert already exists and is unacknowledged
  IF NOT EXISTS (
    SELECT 1 FROM inventory_alerts
    WHERE inventory_item_id = p_item_id
      AND user_id = p_user_id
      AND alert_type = v_alert_type
      AND acknowledged = FALSE
  ) THEN
    -- Create new alert
    INSERT INTO inventory_alerts (
      inventory_item_id,
      user_id,
      item_name,
      alert_type,
      severity,
      message,
      threshold_value,
      current_value,
      created_at
    ) VALUES (
      p_item_id,
      p_user_id,
      v_item_record.name,
      v_alert_type,
      v_severity,
      v_message,
      CASE 
        WHEN v_alert_type = 'low_stock' THEN v_item_record.minimum_stock
        WHEN v_alert_type = 'reorder_needed' THEN v_item_record.reorder_point
        ELSE 0
      END,
      p_current_stock,
      NOW()
    );
  END IF;
END;
$$;

-- Create batch stock update function
CREATE OR REPLACE FUNCTION batch_update_stock(
  p_updates JSONB,
  p_user_id UUID
)
RETURNS TABLE (
  item_id UUID,
  success BOOLEAN,
  new_stock INTEGER,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_update RECORD;
BEGIN
  FOR v_update IN SELECT * FROM jsonb_to_recordset(p_updates) AS x(
    item_id UUID,
    operation TEXT,
    quantity INTEGER,
    reason TEXT
  )
  LOOP
    RETURN QUERY
    SELECT 
      v_update.item_id,
      r.success,
      r.new_stock,
      r.message
    FROM update_stock_atomic(
      v_update.item_id,
      p_user_id,
      v_update.operation,
      v_update.quantity,
      COALESCE(v_update.reason, 'Batch update'),
      p_user_id
    ) r;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_stock_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION check_stock_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_stock TO authenticated;