-- =====================================================
-- SIMPLE SCHEMA INSPECTOR FOR RPC FUNCTION
-- =====================================================
-- Just the essential columns we need for submit_order_atomic

-- Check products table columns
SELECT 'PRODUCTS' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check orders table columns  
SELECT 'ORDERS' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check order_items table columns
SELECT 'ORDER_ITEMS' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'order_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Quick test: Show actual column names in products table
\d products;

-- Quick test: Show actual column names in orders table  
\d orders;

-- Quick test: Show actual column names in order_items table
\d order_items;
