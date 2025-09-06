-- =====================================================
-- MIGRATION: Rename is_active to is_available in staff_pins table
-- =====================================================
-- This script standardizes staff_pins to use is_available like products/categories
-- Kiosk sessions keep is_active (different semantics: active session vs available for use)
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Add new is_available column to staff_pins
ALTER TABLE staff_pins 
ADD COLUMN is_available boolean;

-- 2. Copy data from is_active to is_available for staff_pins
UPDATE staff_pins 
SET is_available = is_active;

-- 3. Drop the old is_active column from staff_pins
ALTER TABLE staff_pins 
DROP COLUMN is_active;

-- 4. Update any indexes that referenced is_active (if they exist)
-- Check for existing indexes first:
-- \d staff_pins
-- If you have an index on is_active, uncomment the following lines:
-- DROP INDEX IF EXISTS idx_staff_pins_is_active;
-- CREATE INDEX idx_staff_pins_is_available ON staff_pins(is_available);

COMMIT;

-- Verify the migration
SELECT 
  '✅ STAFF_PINS MIGRATION COMPLETE' as status,
  COUNT(*) as total_pins,
  COUNT(CASE WHEN is_available = true THEN 1 END) as available_pins,
  COUNT(CASE WHEN is_available = false THEN 1 END) as unavailable_pins,
  COUNT(CASE WHEN is_available IS NULL THEN 1 END) as null_pins
FROM staff_pins;

-- Show updated schema consistency
SELECT 
  'SCHEMA CONSISTENCY CHECK' as info,
  'staff_pins now uses is_available (like products/categories)' as staff_pins_status,
  'kiosk_sessions still uses is_active (different semantics)' as sessions_status;

-- Instructions
SELECT 
  '🎯 NEXT STEPS' as info,
  '1. Run npm run sync-schema to update TypeScript types' as step_1,
  '2. Update application code to use is_available for staff_pins' as step_2;