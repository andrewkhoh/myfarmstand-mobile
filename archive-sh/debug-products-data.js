#!/usr/bin/env node

/**
 * Debug script to investigate product data quality issues
 * This will help us understand what's in the database vs what the app is receiving
 */

console.log('🔍 Starting product data investigation...\n');

// Add debug logging to console to inspect the actual data
console.log(`
📝 DEBUGGING INSTRUCTIONS:

1. **Check Current Product Data in Browser Console:**
   Open browser dev tools and run this in the console:
   
   // Check what products hook is returning
   const products = window.__REACT_QUERY_CACHE__?.queries?.find(q => 
     q.queryKey?.[0] === 'products'
   )?.state?.data;
   
   console.log('🔍 Raw products from React Query:', products);
   
   // Check for undefined names
   if (products) {
     products.forEach((product, index) => {
       if (!product.name) {
         console.error('❌ Product with undefined name:', {
           index,
           id: product.id,
           allKeys: Object.keys(product),
           fullProduct: product
         });
       }
     });
   }

2. **Check Database Query Directly:**
   If you have access to Supabase dashboard, run this query:
   
   SELECT 
     id, 
     name, 
     description, 
     price,
     CASE 
       WHEN name IS NULL THEN 'NULL'
       WHEN name = '' THEN 'EMPTY'
       ELSE 'OK'
     END as name_status
   FROM products 
   WHERE is_available = true
   ORDER BY created_at DESC;

3. **Add Temporary Logging in ProductService:**
   Add this to productService.ts getProducts() method:
   
   console.log('🔍 Raw DB response:', rawProductsData);
   rawProductsData?.forEach((raw, i) => {
     console.log(\`Product \${i}:\`, {
       id: raw.id,
       name: raw.name,
       nameType: typeof raw.name,
       isNameTruthy: !!raw.name
     });
   });

4. **Possible Root Causes to Check:**

   a) **Database NULL values despite NOT NULL constraint:**
      - Run: SELECT COUNT(*) FROM products WHERE name IS NULL;
      - If > 0, constraint is not enforced or was disabled

   b) **Data transformation error in schema:**
      - Check if ProductSchema.transform is dropping names
      - Check if join with categories is causing issues

   c) **Query filtering issue:**
      - The INNER JOIN with categories might be filtering out products
      - Check if products have invalid category references

   d) **Validation dropping products:**
      - ProductSchema validation might be silently failing
      - Check console for "Invalid product data, skipping" warnings

5. **Quick Test Query:**
   Test with a simpler query to isolate the issue:
   
   const { data, error } = await supabase
     .from('products')
     .select('id, name, description, price')
     .limit(5);
   
   console.log('Simple query result:', data);

**Expected Results:**
- All products should have non-null, non-empty names
- Database schema enforces NOT NULL on name field
- If we're getting undefined names, something is wrong in the data flow

**Next Steps Based on Findings:**
- If DB has NULL names: Fix database constraints and data
- If schema is dropping names: Fix transformation logic  
- If join is causing issues: Adjust query structure
- If validation is failing: Check validation rules

Run these checks and report back what you find! 🕵️‍♂️
`);

console.log('✅ Debug instructions provided. Run the browser console checks to investigate the data flow.\n');