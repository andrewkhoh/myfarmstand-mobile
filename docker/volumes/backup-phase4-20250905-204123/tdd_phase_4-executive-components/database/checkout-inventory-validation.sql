-- Atomic stock decrement function for checkout-time inventory validation
-- This ensures stock updates are atomic and prevents race conditions

CREATE OR REPLACE FUNCTION decrement_product_stock(
    product_id UUID,
    quantity_to_subtract INTEGER
) RETURNS VOID AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT stock INTO current_stock 
    FROM products 
    WHERE id = product_id 
    FOR UPDATE;
    
    -- Check if product exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', product_id;
    END IF;
    
    -- Check if sufficient stock is available
    IF current_stock < quantity_to_subtract THEN
        RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
            product_id, current_stock, quantity_to_subtract;
    END IF;
    
    -- Atomically update the stock
    UPDATE products 
    SET 
        stock = stock - quantity_to_subtract,
        updated_at = NOW()
    WHERE id = product_id;
    
    -- Verify the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update stock for product %', product_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION decrement_product_stock(UUID, INTEGER) TO authenticated;

-- Optional: Create a function to increment stock (for order cancellations/refunds)
CREATE OR REPLACE FUNCTION increment_product_stock(
    product_id UUID,
    quantity_to_add INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Update the stock atomically
    UPDATE products 
    SET 
        stock = stock + quantity_to_add,
        updated_at = NOW()
    WHERE id = product_id;
    
    -- Check if product exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', product_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_product_stock(UUID, INTEGER) TO authenticated;
