-- Comprehensive RLS Policy Fix for Farm Stand Mobile App
-- This fixes ALL missing RLS policies that could cause "row violates row-level security policy" errors
-- Run this in your Supabase SQL Editor to fix all potential RLS issues

-- =====================================================
-- 1. USERS TABLE - Missing INSERT policy (already partially fixed)
-- =====================================================

-- Allow users to create their own profile during registration
CREATE POLICY "Users can create own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. CATEGORIES TABLE - Missing staff management policies
-- =====================================================

-- Staff can create new categories
CREATE POLICY "Staff can create categories" ON categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Staff can update categories
CREATE POLICY "Staff can update categories" ON categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Staff can delete categories
CREATE POLICY "Staff can delete categories" ON categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- 3. PRODUCTS TABLE - Missing staff management policies
-- =====================================================

-- Staff can create new products
CREATE POLICY "Staff can create products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Staff can update products
CREATE POLICY "Staff can update products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Staff can delete products
CREATE POLICY "Staff can delete products" ON products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- 4. ORDERS TABLE - Missing DELETE policy
-- =====================================================

-- Staff can delete orders (for cancellations, etc.)
CREATE POLICY "Staff can delete orders" ON orders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- 5. ORDER_ITEMS TABLE - Missing ALL policies except SELECT
-- =====================================================

-- Users can create order items for their own orders
CREATE POLICY "Users can create order items for own orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_id 
            AND user_id = auth.uid()
        )
    );

-- Staff can update order items
CREATE POLICY "Staff can update order items" ON order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Staff can delete order items
CREATE POLICY "Staff can delete order items" ON order_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- =====================================================
-- 6. CART_ITEMS TABLE - Already has "FOR ALL" policy, but let's be explicit
-- =====================================================

-- The existing "Users can manage own cart" policy covers all operations
-- But let's add explicit policies for clarity:

-- Drop the existing broad policy and replace with specific ones
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;

-- Users can view their own cart items
CREATE POLICY "Users can view own cart items" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);

-- Users can add items to their own cart
CREATE POLICY "Users can add to own cart" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart items
CREATE POLICY "Users can update own cart items" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can remove items from their own cart
CREATE POLICY "Users can remove from own cart" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. INVENTORY_LOGS TABLE - Missing INSERT/UPDATE/DELETE policies
-- =====================================================

-- Staff can create inventory logs
CREATE POLICY "Staff can create inventory logs" ON inventory_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Staff can update inventory logs
CREATE POLICY "Staff can update inventory logs" ON inventory_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Staff can delete inventory logs
CREATE POLICY "Staff can delete inventory logs" ON inventory_logs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify all policies are in place:

-- Check all policies for each table:
-- SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;

-- Check specific table policies:
-- SELECT * FROM pg_policies WHERE tablename = 'users';
-- SELECT * FROM pg_policies WHERE tablename = 'categories';
-- SELECT * FROM pg_policies WHERE tablename = 'products';
-- SELECT * FROM pg_policies WHERE tablename = 'orders';
-- SELECT * FROM pg_policies WHERE tablename = 'order_items';
-- SELECT * FROM pg_policies WHERE tablename = 'cart_items';
-- SELECT * FROM pg_policies WHERE tablename = 'inventory_logs';

-- =====================================================
-- 9. SUMMARY OF WHAT THIS FIXES
-- =====================================================
/*
This comprehensive fix addresses the following missing policies:

USERS:
✅ INSERT - Users can create their own profile

CATEGORIES:
❌ INSERT - Staff can create categories
❌ UPDATE - Staff can update categories  
❌ DELETE - Staff can delete categories

PRODUCTS:
❌ INSERT - Staff can create products
❌ UPDATE - Staff can update products
❌ DELETE - Staff can delete products

ORDERS:
❌ DELETE - Staff can delete orders

ORDER_ITEMS:
❌ INSERT - Users can create order items (THE MAIN ISSUE YOU HIT)
❌ UPDATE - Staff can update order items
❌ DELETE - Staff can delete order items

CART_ITEMS:
✅ All operations covered by existing policy (but made more explicit)

INVENTORY_LOGS:
❌ INSERT - Staff can create logs
❌ UPDATE - Staff can update logs
❌ DELETE - Staff can delete logs

Without these policies, users and staff will get "row violates row-level security policy" 
errors when trying to perform these operations in your app.
*/
