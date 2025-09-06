-- QUICK FIX for Order Items RLS Policy Error
-- Run this immediately in Supabase SQL Editor to fix order submission

-- Add INSERT policy for order_items to allow users to create order items for their own orders
CREATE POLICY "Users can create order items for own orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_id 
            AND user_id = auth.uid()
        )
    );

-- Verify the policy was created
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'order_items' AND cmd = 'INSERT';
