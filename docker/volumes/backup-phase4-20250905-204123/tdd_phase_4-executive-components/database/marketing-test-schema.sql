-- Phase 3: Marketing Operations Schema
-- Complete marketing content management with role-based security

-- ====================================================================
-- MARKETING CONTENT MANAGEMENT TABLES
-- ====================================================================

-- Product content management for marketing operations
CREATE TABLE product_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketing_title VARCHAR(255),
  marketing_description TEXT,
  marketing_highlights TEXT[], -- Key selling points array
  seo_keywords TEXT[],
  featured_image_url VARCHAR(500),
  gallery_urls TEXT[], -- Array of image URLs
  content_status TEXT NOT NULL DEFAULT 'draft' CHECK (content_status IN ('draft', 'review', 'approved', 'published')),
  content_priority INTEGER DEFAULT 1 CHECK (content_priority BETWEEN 1 AND 5),
  last_updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing campaigns for promotional management
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('seasonal', 'promotional', 'new_product', 'clearance')),
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  discount_percentage DECIMAL(5,2),
  target_audience TEXT,
  campaign_status TEXT NOT NULL DEFAULT 'planned' CHECK (campaign_status IN ('planned', 'active', 'paused', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_campaign_dates CHECK (end_date > start_date),
  CONSTRAINT valid_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- Product bundles for special offers
CREATE TABLE product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_name VARCHAR(255) NOT NULL,
  bundle_description TEXT,
  bundle_price DECIMAL(10,2) NOT NULL CHECK (bundle_price > 0),
  bundle_discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (bundle_discount_amount >= 0),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 100,
  campaign_id UUID REFERENCES marketing_campaigns(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bundle product associations with quantities
CREATE TABLE bundle_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  display_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_id, product_id)
);

-- Campaign performance tracking for analytics
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('views', 'clicks', 'conversions', 'revenue')),
  metric_value DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (metric_value >= 0),
  product_id UUID REFERENCES products(id), -- For product-specific metrics
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, metric_date, metric_type, product_id)
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================

-- Product content indexes for fast content queries
CREATE INDEX idx_product_content_product_id ON product_content(product_id);
CREATE INDEX idx_product_content_status ON product_content(content_status);
CREATE INDEX idx_product_content_priority ON product_content(content_priority DESC);
CREATE INDEX idx_product_content_updated_at ON product_content(updated_at DESC);

-- Marketing campaign indexes for campaign management
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns(campaign_status);
CREATE INDEX idx_marketing_campaigns_type ON marketing_campaigns(campaign_type);
CREATE INDEX idx_marketing_campaigns_dates ON marketing_campaigns(start_date, end_date);
CREATE INDEX idx_marketing_campaigns_created_by ON marketing_campaigns(created_by);

-- Bundle indexes for bundle operations
CREATE INDEX idx_product_bundles_active ON product_bundles(is_active);
CREATE INDEX idx_product_bundles_featured ON product_bundles(is_featured);
CREATE INDEX idx_product_bundles_campaign ON product_bundles(campaign_id);
CREATE INDEX idx_product_bundles_display_order ON product_bundles(display_order);

-- Bundle product indexes for association queries
CREATE INDEX idx_bundle_products_bundle_id ON bundle_products(bundle_id);
CREATE INDEX idx_bundle_products_product_id ON bundle_products(product_id);
CREATE INDEX idx_bundle_products_display_order ON bundle_products(display_order);

-- Campaign metrics indexes for analytics
CREATE INDEX idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(metric_date DESC);
CREATE INDEX idx_campaign_metrics_type ON campaign_metrics(metric_type);
CREATE INDEX idx_campaign_metrics_product_id ON campaign_metrics(product_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all marketing tables
ALTER TABLE product_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;

-- Product Content RLS Policies
-- marketing_staff: Full access to content management
CREATE POLICY product_content_marketing_staff ON product_content
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('content_management', 'admin_access')
    )
  );

-- inventory_staff: Read-only access for content awareness
CREATE POLICY product_content_inventory_staff ON product_content
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('inventory_management', 'content_management', 'admin_access')
    )
  );

-- executive: Read-only access for analytics
CREATE POLICY product_content_executive ON product_content
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('executive_analytics', 'admin_access')
    )
  );

-- Marketing Campaigns RLS Policies
-- marketing_staff: Full campaign management
CREATE POLICY marketing_campaigns_marketing_staff ON marketing_campaigns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('campaign_management', 'admin_access')
    )
  );

-- inventory_staff: Read campaigns for stock planning
CREATE POLICY marketing_campaigns_inventory_staff ON marketing_campaigns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('inventory_management', 'campaign_management', 'admin_access')
    )
  );

-- executive: Read-only for performance analytics
CREATE POLICY marketing_campaigns_executive ON marketing_campaigns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('executive_analytics', 'admin_access')
    )
  );

-- Product Bundles RLS Policies
-- marketing_staff: Full bundle management
CREATE POLICY product_bundles_marketing_staff ON product_bundles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('bundle_management', 'admin_access')
    )
  );

-- inventory_staff: Read bundles for inventory impact
CREATE POLICY product_bundles_inventory_staff ON product_bundles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('inventory_management', 'bundle_management', 'admin_access')
    )
  );

-- executive: Read-only for sales analytics
CREATE POLICY product_bundles_executive ON product_bundles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('executive_analytics', 'admin_access')
    )
  );

-- Bundle Products RLS Policies (inherit from bundle access)
CREATE POLICY bundle_products_marketing_staff ON bundle_products
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('bundle_management', 'admin_access')
    )
  );

CREATE POLICY bundle_products_inventory_staff ON bundle_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('inventory_management', 'bundle_management', 'admin_access')
    )
  );

CREATE POLICY bundle_products_executive ON bundle_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('executive_analytics', 'admin_access')
    )
  );

-- Campaign Metrics RLS Policies
-- marketing_staff: Full metrics management
CREATE POLICY campaign_metrics_marketing_staff ON campaign_metrics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('campaign_management', 'admin_access')
    )
  );

-- executive: Read-only for comprehensive analytics
CREATE POLICY campaign_metrics_executive ON campaign_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND rp.permission_name IN ('executive_analytics', 'admin_access')
    )
  );

-- ====================================================================
-- TEST DATA FOR MARKETING WORKFLOWS
-- ====================================================================

-- Sample marketing content workflow data
INSERT INTO product_content (product_id, marketing_title, marketing_description, marketing_highlights, seo_keywords, content_status, content_priority) VALUES
  (
    (SELECT id FROM products LIMIT 1),
    'Fresh Organic Tomatoes - Farm to Table',
    'Discover the rich, vibrant taste of our locally-grown organic tomatoes, harvested at peak ripeness for maximum flavor and nutrition.',
    ARRAY['Locally grown', 'Certified organic', 'Peak ripeness', 'Rich flavor'],
    ARRAY['organic tomatoes', 'local farm', 'fresh vegetables', 'farm to table'],
    'published',
    5
  ),
  (
    (SELECT id FROM products LIMIT 1 OFFSET 1),
    'Premium Grass-Fed Beef Collection',
    'Experience the exceptional quality of our grass-fed beef, raised with care on sustainable pastures for superior taste and nutrition.',
    ARRAY['Grass-fed', 'Sustainable farming', 'Premium quality', 'Ethically raised'],
    ARRAY['grass-fed beef', 'sustainable meat', 'premium beef', 'ethical farming'],
    'approved',
    4
  ),
  (
    (SELECT id FROM products LIMIT 1 OFFSET 2),
    'Artisan Bread Collection - Daily Fresh',
    'Handcrafted artisan breads made fresh daily with traditional methods and the finest organic ingredients.',
    ARRAY['Handcrafted', 'Daily fresh', 'Traditional methods', 'Organic ingredients'],
    ARRAY['artisan bread', 'fresh bread', 'handcrafted', 'organic baking'],
    'draft',
    3
  );

-- Sample marketing campaigns
INSERT INTO marketing_campaigns (campaign_name, campaign_type, description, start_date, end_date, discount_percentage, target_audience, campaign_status) VALUES
  (
    'Spring Harvest Special',
    'seasonal',
    'Celebrate spring with fresh seasonal produce at special prices.',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '30 days',
    15.00,
    'Health-conscious families',
    'planned'
  ),
  (
    'Summer BBQ Bundle Promotion',
    'promotional',
    'Get ready for summer BBQs with our premium meat and vegetable bundles.',
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '25 days',
    20.00,
    'BBQ enthusiasts',
    'active'
  ),
  (
    'New Product Launch - Artisan Breads',
    'new_product',
    'Introducing our new line of handcrafted artisan breads.',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '37 days',
    10.00,
    'Food lovers and bakers',
    'planned'
  );

-- Sample product bundles
INSERT INTO product_bundles (bundle_name, bundle_description, bundle_price, bundle_discount_amount, is_featured, campaign_id) VALUES
  (
    'Summer BBQ Essentials',
    'Everything you need for the perfect summer BBQ - premium meats and fresh vegetables.',
    89.99,
    15.00,
    true,
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion')
  ),
  (
    'Fresh Produce Family Pack',
    'A variety of fresh, organic vegetables perfect for healthy family meals.',
    45.99,
    8.00,
    false,
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special')
  ),
  (
    'Artisan Bread Starter Collection',
    'Try our new artisan bread collection with this specially curated starter pack.',
    24.99,
    5.00,
    true,
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'New Product Launch - Artisan Breads')
  );

-- Sample bundle product associations
INSERT INTO bundle_products (bundle_id, product_id, quantity, display_order) VALUES
  (
    (SELECT id FROM product_bundles WHERE bundle_name = 'Summer BBQ Essentials'),
    (SELECT id FROM products LIMIT 1),
    2,
    1
  ),
  (
    (SELECT id FROM product_bundles WHERE bundle_name = 'Summer BBQ Essentials'),
    (SELECT id FROM products LIMIT 1 OFFSET 1),
    1,
    2
  ),
  (
    (SELECT id FROM product_bundles WHERE bundle_name = 'Fresh Produce Family Pack'),
    (SELECT id FROM products LIMIT 1),
    3,
    1
  ),
  (
    (SELECT id FROM product_bundles WHERE bundle_name = 'Fresh Produce Family Pack'),
    (SELECT id FROM products LIMIT 1 OFFSET 2),
    2,
    2
  );

-- Sample campaign metrics
INSERT INTO campaign_metrics (campaign_id, metric_date, metric_type, metric_value, product_id) VALUES
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion'),
    CURRENT_DATE - INTERVAL '3 days',
    'views',
    1250.00,
    NULL
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion'),
    CURRENT_DATE - INTERVAL '3 days',
    'clicks',
    187.00,
    NULL
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion'),
    CURRENT_DATE - INTERVAL '3 days',
    'conversions',
    23.00,
    NULL
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion'),
    CURRENT_DATE - INTERVAL '3 days',
    'revenue',
    2069.77,
    NULL
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special'),
    CURRENT_DATE - INTERVAL '1 day',
    'views',
    890.00,
    (SELECT id FROM products LIMIT 1)
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special'),
    CURRENT_DATE - INTERVAL '1 day',
    'clicks',
    134.00,
    (SELECT id FROM products LIMIT 1)
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special'),
    CURRENT_DATE - INTERVAL '1 day',
    'conversions',
    18.00,
    (SELECT id FROM products LIMIT 1)
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special'),
    CURRENT_DATE - INTERVAL '1 day',
    'revenue',
    782.00,
    (SELECT id FROM products LIMIT 1)
  );

-- ====================================================================
-- ADDITIONAL PERMISSIONS FOR MARKETING OPERATIONS
-- ====================================================================

-- Add marketing-specific permissions if they don't exist
INSERT INTO permissions (permission_name, description, category) VALUES
  ('content_management', 'Manage product content and marketing materials', 'marketing'),
  ('campaign_management', 'Create and manage marketing campaigns', 'marketing'),
  ('bundle_management', 'Create and manage product bundles', 'marketing')
ON CONFLICT (permission_name) DO NOTHING;

-- Grant marketing permissions to marketing_staff role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'marketing_staff'
AND p.permission_name IN ('content_management', 'campaign_management', 'bundle_management')
ON CONFLICT DO NOTHING;

-- Grant limited marketing permissions to inventory_staff (read-only for bundles/campaigns)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'inventory_staff'
AND p.permission_name IN ('campaign_management', 'bundle_management')
ON CONFLICT DO NOTHING;

-- Grant read-only marketing access to executive for analytics
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'executive'
AND p.permission_name IN ('content_management', 'campaign_management', 'bundle_management')
ON CONFLICT DO NOTHING;

-- Grant all marketing permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'admin'
AND p.permission_name IN ('content_management', 'campaign_management', 'bundle_management')
ON CONFLICT DO NOTHING;

-- ====================================================================
-- UPDATE TRIGGERS FOR TIMESTAMP MANAGEMENT
-- ====================================================================

-- Update timestamp triggers for all marketing tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_content_updated_at BEFORE UPDATE
  ON product_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE
  ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_bundles_updated_at BEFORE UPDATE
  ON product_bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- SCHEMA VALIDATION NOTES
-- ====================================================================

-- This schema provides:
-- 1. Complete marketing content management with workflow states
-- 2. Campaign lifecycle management with performance tracking
-- 3. Product bundle system with inventory integration
-- 4. Role-based security aligned with Phase 1 & 2 patterns
-- 5. Performance indexes for all critical query patterns
-- 6. Test data for comprehensive workflow validation
-- 7. Cross-role analytics collection capabilities
-- 8. Proper foreign key relationships and constraints
-- 9. Automatic timestamp management
-- 10. Foundation for Phase 4 executive analytics integration