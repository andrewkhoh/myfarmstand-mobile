// Quick schema inspection script
// Run this in your browser console on Supabase dashboard or in Node.js

const inspectSchema = async () => {
  // This would use your supabase client
  const { createClient } = require('@supabase/supabase-js');
  
  // Replace with your actual Supabase URL and anon key
  const supabase = createClient(
    'YOUR_SUPABASE_URL', 
    'YOUR_SUPABASE_ANON_KEY'
  );

  try {
    // Get products table schema
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (products && products.length > 0) {
      console.log('PRODUCTS TABLE COLUMNS:', Object.keys(products[0]));
    }

    // Get categories table schema  
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(1);
      
    if (categories && categories.length > 0) {
      console.log('CATEGORIES TABLE COLUMNS:', Object.keys(categories[0]));
    }

    // Get orders table schema
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
      
    if (orders && orders.length > 0) {
      console.log('ORDERS TABLE COLUMNS:', Object.keys(orders[0]));
    }

    // Get cart_items table schema
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('*')
      .limit(1);
      
    if (cartItems && cartItems.length > 0) {
      console.log('CART_ITEMS TABLE COLUMNS:', Object.keys(cartItems[0]));
    }

  } catch (error) {
    console.error('Schema inspection error:', error);
  }
};

// Call the function
inspectSchema();
