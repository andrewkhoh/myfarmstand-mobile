-- Fix for Order Items RLS Policy Issue
-- This adds the missing INSERT policy for order_items table
-- Run this in your Supabase SQL Editor to fix the order creation error

-- Add INSERT policy for order_items to allow users to create order items for their own orders
CREATE POLICY "Users can create order items for own orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_id 
            AND user_id = auth.uid()
        )
    );

-- Also add UPDATE policy for order_items in case we need to modify quantities during order processing
CREATE POLICY "Staff can update order items" ON order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Add DELETE policy for order_items (staff only, for order modifications)
CREATE POLICY "Staff can delete order items" ON order_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Verify the policies are working by checking if they exist
-- You can run this query to see all policies for order_items:
-- SELECT * FROM pg_policies WHERE tablename = 'order_items';
