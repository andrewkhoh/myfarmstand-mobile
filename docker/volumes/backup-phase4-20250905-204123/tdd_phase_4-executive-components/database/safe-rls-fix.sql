-- SAFE RLS Policy Fix for Farm Stand Mobile App
-- This version handles existing policies and only creates missing ones
-- Run this in your Supabase SQL Editor to fix RLS issues safely

-- =====================================================
-- CRITICAL FIX: ORDER_ITEMS INSERT POLICY (Your immediate issue)
-- =====================================================

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Users can create order items for own orders" ON order_items;

-- Create the critical policy for order submission
CREATE POLICY "Users can create order items for own orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_id 
            AND user_id = auth.uid()
        )
    );

-- =====================================================
-- OTHER MISSING POLICIES (Safe creation)
-- =====================================================

-- Order items UPDATE and DELETE policies
DROP POLICY IF EXISTS "Staff can update order items" ON order_items;
CREATE POLICY "Staff can update order items" ON order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Staff can delete order items" ON order_items;
CREATE POLICY "Staff can delete order items" ON order_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Products management policies
DROP POLICY IF EXISTS "Staff can create products" ON products;
CREATE POLICY "Staff can create products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Staff can update products" ON products;
CREATE POLICY "Staff can update products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Categories management policies
DROP POLICY IF EXISTS "Staff can create categories" ON categories;
CREATE POLICY "Staff can create categories" ON categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Staff can update categories" ON categories;
CREATE POLICY "Staff can update categories" ON categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Cart items explicit policies (replace the broad "FOR ALL" policy)
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can add to own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can remove from own cart" ON cart_items;

CREATE POLICY "Users can view own cart items" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own cart" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove from own cart" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- Inventory logs policies
DROP POLICY IF EXISTS "Staff can create inventory logs" ON inventory_logs;
CREATE POLICY "Staff can create inventory logs" ON inventory_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that the critical order_items INSERT policy exists
SELECT 'ORDER_ITEMS INSERT POLICY:' as check_type, 
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_policies 
           WHERE tablename = 'order_items' 
           AND cmd = 'INSERT'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- List all order_items policies
SELECT 'All order_items policies:' as info;
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'order_items' ORDER BY cmd;
