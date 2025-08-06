-- Farm Stand Mobile App - Supabase Database Schema
-- This file contains all the SQL commands to set up the database tables
-- Run these commands in your Supabase SQL Editor

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security (RLS) for all tables
-- This ensures data security and proper access control

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
-- Stores user profiles and role information
-- Links to Supabase Auth users via the id field

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin', 'manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. CATEGORIES TABLE
-- =====================================================
-- Product categories for organizing the catalog

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for categories table
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. PRODUCTS TABLE
-- =====================================================
-- Main product catalog with inventory and pricing

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category VARCHAR(255) NOT NULL, -- References categories.name for flexibility
    image_url TEXT,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    is_available BOOLEAN DEFAULT true,
    is_pre_order BOOLEAN DEFAULT false,
    pre_order_available_date TIMESTAMP WITH TIME ZONE,
    min_pre_order_quantity INTEGER,
    max_pre_order_quantity INTEGER,
    unit VARCHAR(50) DEFAULT 'each', -- e.g., 'lb', 'kg', 'each', 'bunch'
    weight DECIMAL(8,2), -- Weight in specified unit
    sku VARCHAR(100) UNIQUE,
    tags TEXT[], -- Array of tags for enhanced search
    nutrition_info JSONB, -- Flexible nutrition information storage
    seasonal_availability BOOLEAN DEFAULT false,
    is_weekly_special BOOLEAN DEFAULT false,
    is_bundle BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for products table
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for better search performance
CREATE INDEX idx_products_name ON products USING GIN (to_tsvector('english', name));
CREATE INDEX idx_products_description ON products USING GIN (to_tsvector('english', description));
CREATE INDEX idx_products_tags ON products USING GIN (tags);
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_available ON products (is_available);

-- =====================================================
-- 4. ORDERS TABLE
-- =====================================================
-- Customer orders with status tracking

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    
    -- Customer information (stored for order history even if user is deleted)
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Pickup/delivery information
    fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup', 'delivery')),
    pickup_date DATE,
    pickup_time TIME,
    delivery_address TEXT,
    
    -- Additional order details
    special_instructions TEXT,
    notes TEXT, -- Staff notes
    
    -- QR code for pickup verification
    qr_code_data TEXT, -- JSON string with order verification data
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for orders table
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for order queries
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_orders_pickup_date ON orders (pickup_date);

-- =====================================================
-- 5. ORDER_ITEMS TABLE
-- =====================================================
-- Individual items within each order

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL, -- Store name for order history
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for order item queries
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

-- =====================================================
-- 6. CART_ITEMS TABLE
-- =====================================================
-- Persistent shopping cart for logged-in users

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one cart item per product per user
    UNIQUE(user_id, product_id)
);

-- Create updated_at trigger for cart_items table
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for cart queries
CREATE INDEX idx_cart_items_user_id ON cart_items (user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items (product_id);

-- =====================================================
-- 7. INVENTORY_LOGS TABLE (Optional - for tracking)
-- =====================================================
-- Track inventory changes for audit purposes

CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('restock', 'sale', 'adjustment', 'spoilage')),
    quantity_change INTEGER NOT NULL, -- Positive for increase, negative for decrease
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for inventory log queries
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs (product_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs (created_at);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on all tables for security

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and update it
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Categories are publicly readable
CREATE POLICY "Categories are publicly readable" ON categories
    FOR SELECT USING (is_active = true);

-- Products are publicly readable if available
CREATE POLICY "Products are publicly readable" ON products
    FOR SELECT USING (is_available = true);

-- Orders: users can view their own orders, staff can view all
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Users can create orders
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Staff can update order status
CREATE POLICY "Staff can update orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- Order items: readable if user can read the order
CREATE POLICY "Order items readable with order" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_id 
            AND (
                user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() 
                    AND role IN ('staff', 'admin', 'manager')
                )
            )
        )
    );

-- Cart items: users can manage their own cart
CREATE POLICY "Users can manage own cart" ON cart_items
    FOR ALL USING (auth.uid() = user_id);

-- Inventory logs: staff only
CREATE POLICY "Staff can view inventory logs" ON inventory_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('staff', 'admin', 'manager')
        )
    );

-- =====================================================
-- 9. SAMPLE DATA (Optional)
-- =====================================================
-- Insert some sample categories and products for testing

-- Sample Categories
INSERT INTO categories (name, description, image_url, sort_order) VALUES
('Vegetables', 'Fresh, locally grown vegetables', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop', 1),
('Fruits', 'Sweet and fresh seasonal fruits', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop', 2),
('Dairy & Eggs', 'Farm fresh dairy products and eggs', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop', 3),
('Herbs', 'Fresh aromatic herbs', 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400&h=400&fit=crop', 4),
('Grains & Legumes', 'Wholesome grains and legumes', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop', 5);

-- Sample Products
INSERT INTO products (name, description, price, category, image_url, stock_quantity, tags, unit) VALUES
('Organic Tomatoes', 'Fresh, locally grown organic tomatoes. Perfect for salads, cooking, or eating fresh.', 4.99, 'Vegetables', 'https://images.unsplash.com/photo-1546470427-e2c5b8b2e3e3?w=400&h=400&fit=crop', 25, ARRAY['organic', 'local', 'fresh'], 'lb'),
('Sweet Corn', 'Sweet, crispy corn on the cob. Harvested fresh daily.', 0.75, 'Vegetables', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=400&fit=crop', 50, ARRAY['sweet', 'fresh', 'local'], 'each'),
('Farm Fresh Eggs', 'Free-range chicken eggs from happy hens. Rich, golden yolks.', 5.50, 'Dairy & Eggs', 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=400&h=400&fit=crop', 30, ARRAY['free-range', 'fresh', 'local'], 'dozen'),
('Strawberries', 'Sweet, juicy strawberries. Perfect for desserts or snacking.', 6.99, 'Fruits', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=400&fit=crop', 20, ARRAY['sweet', 'juicy', 'seasonal'], 'pint'),
('Fresh Basil', 'Aromatic basil leaves. Perfect for pasta, pizza, and Mediterranean dishes.', 2.99, 'Herbs', 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&h=400&fit=crop', 15, ARRAY['aromatic', 'fresh', 'mediterranean'], 'bunch');

-- =====================================================
-- 10. USEFUL VIEWS (Optional)
-- =====================================================
-- Create helpful views for common queries

-- Order summary view with customer and item details
CREATE VIEW order_summary AS
SELECT 
    o.id,
    o.status,
    o.total_amount,
    o.customer_name,
    o.customer_email,
    o.pickup_date,
    o.pickup_time,
    o.created_at,
    COUNT(oi.id) as item_count,
    STRING_AGG(oi.product_name, ', ') as products
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.status, o.total_amount, o.customer_name, o.customer_email, o.pickup_date, o.pickup_time, o.created_at;

-- Product inventory view with category information
CREATE VIEW product_inventory AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.stock_quantity,
    p.is_available,
    p.category,
    c.name as category_name,
    p.tags,
    p.created_at
FROM products p
LEFT JOIN categories c ON p.category = c.name
WHERE p.is_available = true;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Your Supabase database is now ready for the Farm Stand mobile app!
-- 
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Update your .env file with your Supabase credentials
-- 3. Test the Backend Integration screen in the app
-- 4. Start using real data instead of mock data
--
-- The schema includes:
-- - User management with roles
-- - Product catalog with categories
-- - Order management with status tracking
-- - Shopping cart persistence
-- - Inventory tracking
-- - Row Level Security for data protection
-- - Sample data for testing
-- - Useful views for common queries
