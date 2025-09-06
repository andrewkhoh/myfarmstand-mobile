-- =====================================================
-- DATABASE SCHEMA INSPECTOR
-- =====================================================
-- This script inspects the actual database schema to help align
-- RPC functions with the real table structure

-- =====================================================
-- 1. PRODUCTS TABLE INSPECTION
-- =====================================================
SELECT 
    'PRODUCTS TABLE COLUMNS' as inspection_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 2. ORDERS TABLE INSPECTION  
-- =====================================================
SELECT 
    'ORDERS TABLE COLUMNS' as inspection_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 3. ORDER_ITEMS TABLE INSPECTION
-- =====================================================
SELECT 
    'ORDER_ITEMS TABLE COLUMNS' as inspection_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 4. USERS TABLE INSPECTION
-- =====================================================
SELECT 
    'USERS TABLE COLUMNS' as inspection_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 5. CATEGORIES TABLE INSPECTION
-- =====================================================
SELECT 
    'CATEGORIES TABLE COLUMNS' as inspection_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 6. TABLE CONSTRAINTS INSPECTION
-- =====================================================
SELECT 
    'TABLE CONSTRAINTS' as inspection_type,
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public'
AND table_name IN ('products', 'orders', 'order_items', 'users', 'categories')
ORDER BY table_name, constraint_type;

-- =====================================================
-- 7. FOREIGN KEY RELATIONSHIPS
-- =====================================================
SELECT 
    'FOREIGN KEY RELATIONSHIPS' as inspection_type,
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as target_table,
    ccu.column_name as target_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('products', 'orders', 'order_items', 'users', 'categories')
ORDER BY tc.table_name;

-- =====================================================
-- 8. EXISTING FUNCTIONS INSPECTION
-- =====================================================
SELECT 
    'EXISTING FUNCTIONS' as inspection_type,
    routine_name as function_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%order%'
ORDER BY routine_name;

-- =====================================================
-- 9. SAMPLE DATA INSPECTION (First 3 rows of each table)
-- =====================================================
-- Products sample
SELECT 'PRODUCTS SAMPLE DATA' as inspection_type, * FROM products LIMIT 3;

-- Orders sample  
SELECT 'ORDERS SAMPLE DATA' as inspection_type, * FROM orders LIMIT 3;

-- Order items sample
SELECT 'ORDER_ITEMS SAMPLE DATA' as inspection_type, * FROM order_items LIMIT 3;

-- Users sample (excluding sensitive data)
SELECT 
    'USERS SAMPLE DATA' as inspection_type,
    id, email, role, created_at, updated_at 
FROM users LIMIT 3;

-- Categories sample
SELECT 'CATEGORIES SAMPLE DATA' as inspection_type, * FROM categories LIMIT 3;

-- =====================================================
-- 10. SUMMARY REPORT
-- =====================================================
SELECT 
    'SCHEMA SUMMARY' as inspection_type,
    'Table Count' as metric,
    COUNT(*) as value
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('products', 'orders', 'order_items', 'users', 'categories')

UNION ALL

SELECT 
    'SCHEMA SUMMARY' as inspection_type,
    'Total Columns' as metric,
    COUNT(*) as value
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN ('products', 'orders', 'order_items', 'users', 'categories')

UNION ALL

SELECT 
    'SCHEMA SUMMARY' as inspection_type,
    'Custom Functions' as metric,
    COUNT(*) as value
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%order%';
