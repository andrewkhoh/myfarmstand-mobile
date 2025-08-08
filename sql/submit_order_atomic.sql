-- Atomic Order Submission Function
-- Combines order creation, item insertion, and stock updates in a single transaction
-- Eliminates race conditions between inventory validation and stock updates

CREATE OR REPLACE FUNCTION submit_order_atomic(
  p_order_id UUID,
  p_user_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_subtotal DECIMAL(10,2),
  p_tax_amount DECIMAL(10,2),
  p_total_amount DECIMAL(10,2),
  p_fulfillment_type TEXT,
  p_order_items JSONB, -- Array of {product_id, product_name, unit_price, quantity, total_price}
  p_delivery_address TEXT DEFAULT NULL,
  p_pickup_date TEXT DEFAULT NULL,
  p_pickup_time TEXT DEFAULT NULL,
  p_special_instructions TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item JSONB;
  v_product_stock INTEGER;
  v_requested_quantity INTEGER;
  v_product_name TEXT;
  v_order_item_id UUID;
  v_conflicts JSONB[] := '{}';
  v_conflict JSONB;
  v_result JSONB;
BEGIN
  -- Step 1: Validate inventory for all items before making any changes
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    -- Get current stock for this product
    SELECT stock_quantity, name INTO v_product_stock, v_product_name
    FROM products 
    WHERE id = (v_item->>'product_id')::UUID;
    
    -- Check if product exists
    IF v_product_stock IS NULL THEN
      v_conflict := jsonb_build_object(
        'productId', v_item->>'product_id',
        'productName', COALESCE(v_item->>'product_name', 'Unknown Product'),
        'requested', (v_item->>'quantity')::INTEGER,
        'available', 0
      );
      v_conflicts := array_append(v_conflicts, v_conflict);
      CONTINUE;
    END IF;
    
    v_requested_quantity := (v_item->>'quantity')::INTEGER;
    
    -- Check if sufficient stock available
    IF v_product_stock < v_requested_quantity THEN
      v_conflict := jsonb_build_object(
        'productId', v_item->>'product_id',
        'productName', v_product_name,
        'requested', v_requested_quantity,
        'available', v_product_stock
      );
      v_conflicts := array_append(v_conflicts, v_conflict);
    END IF;
  END LOOP;
  
  -- If any conflicts found, return them without creating order
  IF array_length(v_conflicts, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Inventory conflicts detected',
      'inventoryConflicts', array_to_json(v_conflicts)::jsonb
    );
  END IF;
  
  -- Step 2: All validations passed - proceed with atomic order creation
  
  -- Insert order record
  INSERT INTO orders (
    id, user_id, customer_name, customer_email, customer_phone,
    delivery_address, pickup_date, pickup_time, special_instructions,
    subtotal, tax_amount, total_amount, fulfillment_type, status,
    created_at, updated_at
  ) VALUES (
    p_order_id, p_user_id, p_customer_name, p_customer_email, p_customer_phone,
    p_delivery_address, p_pickup_date::DATE, p_pickup_time::TIME, p_special_instructions,
    p_subtotal, p_tax_amount, p_total_amount, p_fulfillment_type, p_status,
    NOW(), NOW()
  );
  
  -- Step 3: Insert order items and update stock atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_order_item_id := gen_random_uuid();
    
    -- Insert order item
    INSERT INTO order_items (
      id, order_id, product_id, product_name, unit_price, quantity, total_price
    ) VALUES (
      v_order_item_id,
      p_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'unit_price')::DECIMAL(10,2),
      (v_item->>'quantity')::INTEGER,
      (v_item->>'total_price')::DECIMAL(10,2)
    );
    
    -- Atomically decrement product stock
    -- This will fail if stock becomes negative, rolling back entire transaction
    UPDATE products 
    SET 
      stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER,
      updated_at = NOW()
    WHERE id = (v_item->>'product_id')::UUID
    AND stock_quantity >= (v_item->>'quantity')::INTEGER; -- Ensure no negative stock
    
    -- Check if stock update succeeded (affected 1 row)
    IF NOT FOUND THEN
      -- This should not happen due to validation above, but safety check
      RAISE EXCEPTION 'Failed to update stock for product %: insufficient inventory', v_item->>'product_name';
    END IF;
  END LOOP;
  
  -- Step 4: Return success with order details
  SELECT jsonb_build_object(
    'success', true,
    'order', row_to_json(orders.*)
  ) INTO v_result
  FROM orders 
  WHERE id = p_order_id;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Any error rolls back the entire transaction
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order submission failed: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION submit_order_atomic TO authenticated;
