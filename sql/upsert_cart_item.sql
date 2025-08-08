-- Atomic cart item upsert function
-- This function safely adds quantity to existing cart items or creates new ones
-- Eliminates race conditions by being truly atomic at the database level

-- Drop existing function first (handles parameter type changes)
DROP FUNCTION IF EXISTS upsert_cart_item;

CREATE OR REPLACE FUNCTION upsert_cart_item(
  input_user_id UUID,
  input_product_id UUID,
  input_quantity_to_add INTEGER
)
RETURNS SETOF cart_items
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to atomically upsert cart item
  -- EXCLUDED.quantity contains the input_quantity_to_add value from the INSERT
  RETURN QUERY
  INSERT INTO cart_items (user_id, product_id, quantity, created_at, updated_at)
  VALUES (input_user_id, input_product_id, input_quantity_to_add, NOW(), NOW())
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET 
    quantity = cart_items.quantity + EXCLUDED.quantity,
    updated_at = NOW()
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_cart_item TO authenticated;
