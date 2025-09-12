#!/usr/bin/env node

// Quick database inspection tool to debug product data issues
// Usage: node debug-database-products.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase credentials here
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProducts() {
  console.log('🔍 Inspecting products table for data quality issues...\n');

  try {
    // Get all products with detailed information
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching products:', error);
      return;
    }

    console.log(`📊 Total products found: ${products.length}\n`);

    // Analyze data quality
    const issues = [];

    products.forEach((product, index) => {
      const productIssues = [];

      // Check for missing essential fields
      if (!product.id) productIssues.push('Missing ID');
      if (!product.name || product.name.trim() === '') productIssues.push('Missing/empty name');
      if (!product.description || product.description.trim() === '') productIssues.push('Missing/empty description');
      if (product.price === null || product.price === undefined) productIssues.push('Missing price');
      if (!product.category) productIssues.push('Missing category');

      // Check for data type issues
      if (typeof product.name !== 'string' && product.name !== null) productIssues.push(`Name wrong type: ${typeof product.name}`);
      if (typeof product.price !== 'number' && product.price !== null) productIssues.push(`Price wrong type: ${typeof product.price}`);

      if (productIssues.length > 0) {
        issues.push({
          index,
          id: product.id,
          name: product.name,
          price: product.price,
          issues: productIssues,
          fullProduct: product
        });
      }
    });

    if (issues.length === 0) {
      console.log('✅ All products have complete essential data!\n');
    } else {
      console.log(`❌ Found ${issues.length} products with data quality issues:\n`);
      
      issues.forEach(({ index, id, name, price, issues: productIssues, fullProduct }) => {
        console.log(`Product #${index + 1}:`);
        console.log(`  ID: ${id || 'undefined'}`);
        console.log(`  Name: "${name || 'undefined'}"`);
        console.log(`  Price: ${price}`);
        console.log(`  Issues: ${productIssues.join(', ')}`);
        console.log('  Full data:', JSON.stringify(fullProduct, null, 2));
        console.log('');
      });
    }

    // Summary statistics
    console.log('📈 Data Quality Summary:');
    console.log(`  Products with names: ${products.filter(p => p.name && p.name.trim()).length}/${products.length}`);
    console.log(`  Products with prices: ${products.filter(p => p.price !== null && p.price !== undefined).length}/${products.length}`);
    console.log(`  Products available: ${products.filter(p => p.is_available).length}/${products.length}`);
    console.log(`  Products with issues: ${issues.length}/${products.length}`);

    // Show recent products (potential test data)
    console.log('\n📅 Most recent 5 products:');
    products.slice(0, 5).forEach((product, index) => {
      console.log(`  ${index + 1}. "${product.name}" - $${product.price} (${product.created_at})`);
    });

  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

// Run the inspection
inspectProducts();