-- =====================================================
-- SUBMIT ORDER ATOMIC RPC FUNCTION
-- =====================================================
-- Atomically creates an order with inventory validation and stock updates
-- This function ensures data consistency and prevents race conditions

-- Drop existing function if it exists to avoid name conflicts
DROP FUNCTION IF EXISTS submit_order_atomic;

CREATE OR REPLACE FUNCTION submit_order_atomic(
    p_order_id UUID,
    p_user_id UUID,
    p_customer_name VARCHAR(255),
    p_customer_email VARCHAR(255),
    p_customer_phone VARCHAR(20),
    p_subtotal DECIMAL(10,2),
    p_tax_amount DECIMAL(10,2),
    p_total_amount DECIMAL(10,2),
    p_fulfillment_type VARCHAR(20),
    p_payment_method VARCHAR(20),
    p_payment_status VARCHAR(20),
    p_order_items JSONB,
    p_delivery_address TEXT DEFAULT NULL,
    p_pickup_date DATE DEFAULT NULL,
    p_pickup_time TIME DEFAULT NULL,
    p_special_instructions TEXT DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_record orders%ROWTYPE;
    v_item JSONB;
    v_product_record products%ROWTYPE;
    v_inventory_conflicts JSONB[] := '{}';
    v_conflict JSONB;
    v_current_stock INTEGER;
    v_requested_qty INTEGER;
    v_order_item_id UUID;
BEGIN
    -- Validate required parameters
    IF p_order_id IS NULL OR p_customer_name IS NULL OR p_customer_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Missing required order information'
        );
    END IF;

    -- Validate payment method
    IF p_payment_method NOT IN ('online', 'cash_on_pickup') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid payment method'
        );
    END IF;

    -- Validate fulfillment type
    IF p_fulfillment_type NOT IN ('pickup', 'delivery') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid fulfillment type'
        );
    END IF;

    -- Validate order items
    IF p_order_items IS NULL OR jsonb_array_length(p_order_items) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order must contain at least one item'
        );
    END IF;

    -- STEP 1: Validate inventory availability for all items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
    LOOP
        -- Get current product stock
        SELECT * INTO v_product_record 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID 
        AND is_available = true;

        IF NOT FOUND THEN
            v_inventory_conflicts := array_append(v_inventory_conflicts, 
                jsonb_build_object(
                    'productId', v_item->>'product_id',
                    'productName', v_item->>'product_name',
                    'requested', (v_item->>'quantity')::INTEGER,
                    'available', 0
                )
            );
            CONTINUE;
        END IF;

        v_current_stock := v_product_record.stock_quantity;
        v_requested_qty := (v_item->>'quantity')::INTEGER;

        -- Check if sufficient stock is available
        IF v_current_stock < v_requested_qty THEN
            v_inventory_conflicts := array_append(v_inventory_conflicts, 
                jsonb_build_object(
                    'productId', v_product_record.id,
                    'productName', v_product_record.name,
                    'requested', v_requested_qty,
                    'available', v_current_stock
                )
            );
        END IF;
    END LOOP;

    -- If inventory conflicts exist, return them without creating the order
    IF array_length(v_inventory_conflicts, 1) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Inventory conflicts detected',
            'inventoryConflicts', to_jsonb(v_inventory_conflicts)
        );
    END IF;

    -- STEP 2: Create the order (all validations passed)
    INSERT INTO orders (
        id,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        subtotal,
        tax_amount,
        total_amount,
        fulfillment_type,
        payment_method,
        payment_status,
        delivery_address,
        pickup_date,
        pickup_time,
        special_instructions,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_order_id,
        p_user_id,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_subtotal,
        p_tax_amount,
        p_total_amount,
        p_fulfillment_type,
        p_payment_method,
        p_payment_status,
        p_delivery_address,
        p_pickup_date,
        p_pickup_time,
        p_special_instructions,
        p_status,
        NOW(),
        NOW()
    ) RETURNING * INTO v_order_record;

    -- STEP 3: Create order items and decrement stock atomically
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
    LOOP
        v_order_item_id := uuid_generate_v4();
        v_requested_qty := (v_item->>'quantity')::INTEGER;

        -- Insert order item
        INSERT INTO order_items (
            id,
            order_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            total_price,
            created_at
        ) VALUES (
            v_order_item_id,
            p_order_id,
            (v_item->>'product_id')::UUID,
            v_item->>'product_name',
            (v_item->>'unit_price')::DECIMAL(10,2),
            v_requested_qty,
            (v_item->>'total_price')::DECIMAL(10,2),
            NOW()
        );

        -- Decrement product stock
        UPDATE products 
        SET 
            stock_quantity = stock_quantity - v_requested_qty,
            updated_at = NOW()
        WHERE id = (v_item->>'product_id')::UUID;

        -- Log inventory change
        INSERT INTO inventory_logs (
            id,
            product_id,
            change_type,
            quantity_change,
            previous_quantity,
            new_quantity,
            reason,
            changed_by,
            created_at
        ) VALUES (
            uuid_generate_v4(),
            (v_item->>'product_id')::UUID,
            'sale',
            -v_requested_qty,
            v_current_stock,
            v_current_stock - v_requested_qty,
            'Order placed - Order ID: ' || p_order_id::TEXT,
            p_user_id,
            NOW()
        );
    END LOOP;

    -- STEP 4: Return success with created order data
    RETURN jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order_record.id,
            'customerId', v_order_record.user_id,
            'customerInfo', jsonb_build_object(
                'name', v_order_record.customer_name,
                'email', v_order_record.customer_email,
                'phone', v_order_record.customer_phone
            ),
            'subtotal', v_order_record.subtotal,
            'taxAmount', v_order_record.tax_amount,
            'totalAmount', v_order_record.total_amount,
            'fulfillmentType', v_order_record.fulfillment_type,
            'paymentMethod', v_order_record.payment_method,
            'paymentStatus', v_order_record.payment_status,
            'status', v_order_record.status,
            'pickupDate', v_order_record.pickup_date,
            'pickupTime', v_order_record.pickup_time,
            'deliveryAddress', v_order_record.delivery_address,
            'specialInstructions', v_order_record.special_instructions,
            'createdAt', v_order_record.created_at,
            'updatedAt', v_order_record.updated_at
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_order_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION submit_order_atomic TO anon;
