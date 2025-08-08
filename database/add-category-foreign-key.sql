-- Fix for PGRST200 Error: Add category_id foreign key to products table
-- Run this in your Supabase SQL Editor

-- Step 1: Add category_id column with foreign key constraint
ALTER TABLE products 
ADD COLUMN category_id UUID REFERENCES categories(id);

-- Step 2: Populate category_id based on existing category names
-- This matches products.category (VARCHAR) with categories.name
UPDATE products 
SET category_id = categories.id 
FROM categories 
WHERE products.category = categories.name;

-- Step 3: Make category_id NOT NULL after population
ALTER TABLE products 
ALTER COLUMN category_id SET NOT NULL;

-- Step 4: Add index for better performance on category_id lookups
CREATE INDEX idx_products_category_id ON products (category_id);

-- Verification query - check that all products have category_id populated
SELECT 
    p.name,
    p.category as old_category_name,
    c.name as new_category_name,
    p.category_id
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LIMIT 10;

-- Note: The old 'category' VARCHAR column is kept for backward compatibility
-- It can be removed later with: ALTER TABLE products DROP COLUMN category;
