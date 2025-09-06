-- Farm Stand Mobile App - Sample Data
-- This file contains sample data to populate the database for testing
-- Run these commands in your Supabase SQL Editor after running schema.sql

-- =====================================================
-- SAMPLE CATEGORIES DATA
-- =====================================================

INSERT INTO categories (id, name, description, image_url, sort_order, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Vegetables', 'Fresh, locally grown vegetables', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop', 1, true),
('550e8400-e29b-41d4-a716-446655440002', 'Fruits', 'Sweet and fresh seasonal fruits', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop', 2, true),
('550e8400-e29b-41d4-a716-446655440003', 'Dairy & Eggs', 'Farm fresh dairy products and eggs', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop', 3, true),
('550e8400-e29b-41d4-a716-446655440004', 'Herbs', 'Fresh aromatic herbs', 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400&h=400&fit=crop', 4, true),
('550e8400-e29b-41d4-a716-446655440005', 'Pantry', 'Preserved goods and pantry staples', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop', 5, true);

-- =====================================================
-- SAMPLE PRODUCTS DATA
-- =====================================================

INSERT INTO products (id, name, description, price, category, image_url, stock_quantity, is_available, unit, weight, sku, tags) VALUES
-- Vegetables
('650e8400-e29b-41d4-a716-446655440001', 'Organic Tomatoes', 'Fresh, locally grown organic tomatoes. Perfect for salads, cooking, or eating fresh. Grown without pesticides or chemicals.', 3.99, 'Vegetables', 'https://images.unsplash.com/photo-1546470427-e5ac89cd0b31?w=400&h=400&fit=crop', 25, true, 'lb', 1.0, 'VEG-TOM-001', ARRAY['organic', 'fresh', 'local', 'vine-ripened']),
('650e8400-e29b-41d4-a716-446655440002', 'Fresh Carrots', 'Crisp and sweet carrots, perfect for snacking or cooking. Rich in beta-carotene and vitamins.', 2.49, 'Vegetables', 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop', 30, true, 'bunch', 1.5, 'VEG-CAR-001', ARRAY['fresh', 'local', 'crunchy', 'healthy']),
('650e8400-e29b-41d4-a716-446655440003', 'Organic Lettuce', 'Fresh organic lettuce heads, perfect for salads and sandwiches. Crisp and flavorful.', 1.99, 'Vegetables', 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=400&fit=crop', 20, true, 'head', 0.8, 'VEG-LET-001', ARRAY['organic', 'fresh', 'crisp', 'salad']),
('650e8400-e29b-41d4-a716-446655440004', 'Bell Peppers', 'Colorful bell peppers - red, yellow, and green. Sweet and crunchy, perfect for cooking or raw.', 4.99, 'Vegetables', 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=400&fit=crop', 18, true, 'lb', 1.2, 'VEG-PEP-001', ARRAY['colorful', 'sweet', 'crunchy', 'vitamin-c']),
('650e8400-e29b-41d4-a716-446655440005', 'Fresh Spinach', 'Tender baby spinach leaves, perfect for salads or cooking. Rich in iron and vitamins.', 3.49, 'Vegetables', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop', 15, true, 'bag', 0.5, 'VEG-SPI-001', ARRAY['baby', 'tender', 'iron-rich', 'healthy']),

-- Fruits
('650e8400-e29b-41d4-a716-446655440006', 'Fresh Apples', 'Crisp and sweet apples, perfect for snacking or baking. Locally grown and picked fresh.', 2.99, 'Fruits', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop', 40, true, 'lb', 1.0, 'FRU-APP-001', ARRAY['crisp', 'sweet', 'local', 'fresh-picked']),
('650e8400-e29b-41d4-a716-446655440007', 'Organic Strawberries', 'Sweet and juicy organic strawberries. Perfect for desserts, smoothies, or eating fresh.', 5.99, 'Fruits', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=400&fit=crop', 12, true, 'pint', 1.0, 'FRU-STR-001', ARRAY['organic', 'sweet', 'juicy', 'seasonal']),
('650e8400-e29b-41d4-a716-446655440008', 'Fresh Blueberries', 'Plump and sweet blueberries, packed with antioxidants. Great for baking or snacking.', 6.49, 'Fruits', 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400&h=400&fit=crop', 8, true, 'pint', 0.75, 'FRU-BLU-001', ARRAY['antioxidants', 'sweet', 'plump', 'superfood']),
('650e8400-e29b-41d4-a716-446655440009', 'Seasonal Peaches', 'Juicy and fragrant peaches, perfect for summer. Sweet and delicious when ripe.', 4.49, 'Fruits', 'https://images.unsplash.com/photo-1629828874514-d8e6d0ca4664?w=400&h=400&fit=crop', 0, false, 'lb', 1.0, 'FRU-PEA-001', ARRAY['seasonal', 'juicy', 'fragrant', 'summer']),

-- Dairy & Eggs
('650e8400-e29b-41d4-a716-446655440010', 'Farm Fresh Eggs', 'Free-range eggs from our happy hens. Rich, golden yolks and excellent for any meal.', 4.99, 'Dairy & Eggs', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop', 24, true, 'dozen', 1.5, 'DAI-EGG-001', ARRAY['free-range', 'fresh', 'golden-yolk', 'protein']),
('650e8400-e29b-41d4-a716-446655440011', 'Organic Milk', 'Fresh organic whole milk from grass-fed cows. Rich, creamy, and delicious.', 5.49, 'Dairy & Eggs', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop', 10, true, 'half-gallon', 4.0, 'DAI-MIL-001', ARRAY['organic', 'grass-fed', 'whole', 'creamy']),
('650e8400-e29b-41d4-a716-446655440012', 'Artisan Cheese', 'Handcrafted cheese made from local milk. Aged to perfection with rich, complex flavors.', 8.99, 'Dairy & Eggs', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop', 6, true, 'wedge', 0.5, 'DAI-CHE-001', ARRAY['artisan', 'handcrafted', 'aged', 'local']),

-- Herbs
('650e8400-e29b-41d4-a716-446655440013', 'Fresh Basil', 'Aromatic fresh basil, perfect for cooking, pesto, or garnishing. Grown in our greenhouse.', 2.99, 'Herbs', 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=400&h=400&fit=crop', 22, true, 'bunch', 0.2, 'HER-BAS-001', ARRAY['aromatic', 'fresh', 'greenhouse', 'pesto']),
('650e8400-e29b-41d4-a716-446655440014', 'Organic Rosemary', 'Fragrant organic rosemary sprigs. Perfect for roasting, grilling, or infusing oils.', 3.49, 'Herbs', 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=400&h=400&fit=crop', 18, true, 'bunch', 0.15, 'HER-ROS-001', ARRAY['organic', 'fragrant', 'roasting', 'infusing']),
('650e8400-e29b-41d4-a716-446655440015', 'Fresh Cilantro', 'Fresh cilantro with bright, citrusy flavor. Essential for Mexican, Asian, and Mediterranean dishes.', 1.99, 'Herbs', 'https://images.unsplash.com/photo-1583119022894-e2e7b7e7e7e7?w=400&h=400&fit=crop', 25, true, 'bunch', 0.1, 'HER-CIL-001', ARRAY['fresh', 'citrusy', 'mexican', 'asian']),

-- Pantry
('650e8400-e29b-41d4-a716-446655440016', 'Local Honey', 'Pure, raw honey from local beehives. Unfiltered and unpasteurized for maximum flavor and benefits.', 12.99, 'Pantry', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop', 15, true, 'jar', 1.0, 'PAN-HON-001', ARRAY['raw', 'local', 'unfiltered', 'pure']),
('650e8400-e29b-41d4-a716-446655440017', 'Homemade Jam', 'Artisan strawberry jam made from our fresh berries. No artificial preservatives.', 7.99, 'Pantry', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400&h=400&fit=crop', 8, true, 'jar', 0.75, 'PAN-JAM-001', ARRAY['artisan', 'homemade', 'strawberry', 'preservative-free']);

-- Add some pre-order items for testing
INSERT INTO products (id, name, description, price, category, image_url, stock_quantity, is_available, is_pre_order, pre_order_available_date, min_pre_order_quantity, unit, weight, sku, tags) VALUES
('650e8400-e29b-41d4-a716-446655440018', 'Summer Corn (Pre-Order)', 'Sweet summer corn, available for pre-order. Will be ready for pickup in July.', 3.99, 'Vegetables', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=400&fit=crop', 0, true, true, '2024-07-15 00:00:00+00', 6, 'ears', 2.0, 'VEG-COR-001', ARRAY['sweet', 'summer', 'pre-order', 'seasonal']),
('650e8400-e29b-41d4-a716-446655440019', 'Pumpkins (Pre-Order)', 'Large carving pumpkins, available for pre-order for fall season.', 8.99, 'Vegetables', 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=400&fit=crop', 0, true, true, '2024-10-01 00:00:00+00', 1, 'each', 10.0, 'VEG-PUM-001', ARRAY['carving', 'fall', 'pre-order', 'seasonal']);
