-- Farm Stand Mobile App - Schema Standardization Migration
-- This migration standardizes all tables to use 'is_available' instead of mixed naming
-- Run this migration in your Supabase SQL Editor AFTER backing up your data

-- =====================================================
-- SCHEMA STANDARDIZATION MIGRATION
-- =====================================================
-- Purpose: Rename 'is_active' columns to 'is_available' for consistency
-- Affected Tables: categories
-- Target: Standardize all tables to use 'is_available' column naming

-- =====================================================
-- STEP 1: BACKUP VERIFICATION
-- =====================================================
-- Before running this migration, ensure you have:
-- 1. Created a backup of your database
-- 2. Tested this migration on a development/staging environment
-- 3. Verified all dependent applications are ready for the change

-- =====================================================
-- STEP 2: RENAME CATEGORIES.IS_ACTIVE TO IS_AVAILABLE
-- =====================================================

-- Check current data before migration (optional verification)
-- SELECT name, is_active, created_at FROM categories ORDER BY name;

-- Rename the column
ALTER TABLE categories RENAME COLUMN is_active TO is_available;

-- =====================================================
-- STEP 3: UPDATE ANY INDEXES OR CONSTRAINTS
-- =====================================================
-- Check for any indexes that might reference the old column name
-- (Most likely none exist, but this ensures completeness)

-- If there were any indexes on is_active, they would be automatically renamed
-- But we can verify with this query (run separately to check):
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'categories';

-- =====================================================
-- STEP 4: VERIFICATION QUERIES
-- =====================================================
-- Run these queries after migration to verify success:

-- Verify column rename was successful
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'categories' AND column_name = 'is_available';

-- Verify no old column exists
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'categories' AND column_name = 'is_active';
-- (This should return no rows)

-- Verify data integrity
-- SELECT name, is_available, created_at FROM categories ORDER BY name;

-- =====================================================
-- STEP 5: SCHEMA CONSISTENCY CHECK
-- =====================================================
-- After migration, both tables should use 'is_available':

-- Categories table: is_available (renamed from is_active)
-- Products table: is_available (already correct)

-- Verify both tables now use consistent naming:
-- SELECT 'categories' as table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'categories' AND column_name = 'is_available'
-- UNION ALL
-- SELECT 'products' as table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' AND column_name = 'is_available';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- After successful migration:
-- 1. Both categories and products tables use 'is_available'
-- 2. All application code can use consistent column naming
-- 3. No more confusion between is_active vs is_available
-- 4. Future development is simplified with unified schema

-- IMPORTANT: Update your application code to use 'is_available' 
-- for categories table queries after running this migration!
