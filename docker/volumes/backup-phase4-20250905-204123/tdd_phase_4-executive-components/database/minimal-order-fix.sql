-- MINIMAL FIX: Only the critical policy for order submission
-- Run ONLY this in your Supabase SQL Editor

-- Fix the immediate order submission error
DROP POLICY IF EXISTS "Users can create order items for own orders" ON order_items;

CREATE POLICY "Users can create order items for own orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_id 
            AND user_id = auth.uid()
        )
    );

-- Verify it worked
SELECT 'Policy created successfully!' as result 
WHERE EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' 
    AND policyname = 'Users can create order items for own orders'
    AND cmd = 'INSERT'
);
