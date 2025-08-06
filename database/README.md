# Database Setup Instructions

This directory contains SQL scripts to set up and populate your Supabase database for the Farm Stand mobile app.

## Setup Order

1. **First, run the main schema:**
   ```sql
   -- Run this in your Supabase SQL Editor
   -- File: schema.sql
   ```

2. **Then, apply RLS policy fixes:**
   ```sql
   -- Run this in your Supabase SQL Editor
   -- File: fix-rls-policies.sql
   ```

3. **Finally, populate with sample data:**
   ```sql
   -- Run this in your Supabase SQL Editor
   -- File: sample-data.sql
   ```

## Files Description

- **`schema.sql`** - Main database schema with all tables, indexes, and triggers
- **`fix-rls-policies.sql`** - Row Level Security policies for data protection
- **`sample-data.sql`** - Sample categories and products for testing and development

## Sample Data Included

### Categories (5 total)
- Vegetables
- Fruits  
- Dairy & Eggs
- Herbs
- Pantry

### Products (19 total)
- **Vegetables**: Tomatoes, Carrots, Lettuce, Bell Peppers, Spinach, Corn (pre-order), Pumpkins (pre-order)
- **Fruits**: Apples, Strawberries, Blueberries, Peaches (out of stock)
- **Dairy & Eggs**: Farm Fresh Eggs, Organic Milk, Artisan Cheese
- **Herbs**: Fresh Basil, Organic Rosemary, Fresh Cilantro
- **Pantry**: Local Honey, Homemade Jam

## Testing the Integration

After running all SQL scripts, you can test the product service integration:

1. Open the app and navigate to the Shop screen
2. Products should load from the Supabase database
3. Categories should be properly organized
4. Search functionality should work
5. Pre-order items should be marked appropriately

## Troubleshooting

If products don't appear:
1. Check that all SQL scripts ran without errors
2. Verify your `.env` file has correct Supabase credentials
3. Check the app console for any API errors
4. Ensure RLS policies allow reading products and categories

## Environment Variables Required

Make sure your `.env` file contains:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
