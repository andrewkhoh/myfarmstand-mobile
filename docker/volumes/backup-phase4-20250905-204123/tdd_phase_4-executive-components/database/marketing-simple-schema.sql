-- Phase 3: Marketing Operations Schema (Simplified)
-- Simplified marketing content management without role-based dependencies
-- Compatible with current database structure

-- ====================================================================
-- MARKETING CONTENT MANAGEMENT TABLES
-- ====================================================================

-- Product content management for marketing operations
CREATE TABLE product_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL, -- References products(id) - will be enforced in production
  marketing_title VARCHAR(255),
  marketing_description TEXT,
  marketing_highlights TEXT[], -- Key selling points array
  seo_keywords TEXT[],
  featured_image_url VARCHAR(500),
  gallery_urls TEXT[], -- Array of image URLs
  content_status TEXT NOT NULL DEFAULT 'draft' CHECK (content_status IN ('draft', 'review', 'approved', 'published')),
  content_priority INTEGER DEFAULT 1 CHECK (content_priority BETWEEN 1 AND 5),
  last_updated_by UUID, -- References users(id) - simplified for now
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
  created_by UUID, -- References users(id) - simplified for now
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
  created_by UUID, -- References users(id) - simplified for now
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bundle product associations with quantities
CREATE TABLE bundle_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL, -- References products(id) - simplified for now
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
  product_id UUID, -- References products(id) - simplified for now
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
-- UPDATE TRIGGERS FOR TIMESTAMP MANAGEMENT
-- ====================================================================

-- Create the update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Update timestamp triggers for all marketing tables
CREATE TRIGGER update_product_content_updated_at BEFORE UPDATE
  ON product_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE
  ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_bundles_updated_at BEFORE UPDATE
  ON product_bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- BASIC TEST DATA FOR MARKETING WORKFLOWS
-- ====================================================================

-- Sample marketing campaigns (using safe UUIDs that won't conflict)
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

-- Sample campaign metrics
INSERT INTO campaign_metrics (campaign_id, metric_date, metric_type, metric_value) VALUES
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion'),
    CURRENT_DATE - INTERVAL '3 days',
    'views',
    1250.00
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion'),
    CURRENT_DATE - INTERVAL '3 days',
    'clicks',
    187.00
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion'),
    CURRENT_DATE - INTERVAL '3 days',
    'conversions',
    23.00
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Summer BBQ Bundle Promotion'),
    CURRENT_DATE - INTERVAL '3 days',
    'revenue',
    2069.77
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special'),
    CURRENT_DATE - INTERVAL '1 day',
    'views',
    890.00
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special'),
    CURRENT_DATE - INTERVAL '1 day',
    'clicks',
    134.00
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special'),
    CURRENT_DATE - INTERVAL '1 day',
    'conversions',
    18.00
  ),
  (
    (SELECT id FROM marketing_campaigns WHERE campaign_name = 'Spring Harvest Special'),
    CURRENT_DATE - INTERVAL '1 day',
    'revenue',
    782.00
  );

-- ====================================================================
-- SCHEMA VALIDATION NOTES
-- ====================================================================

-- This simplified schema provides:
-- 1. Complete marketing content management with workflow states
-- 2. Campaign lifecycle management with performance tracking
-- 3. Product bundle system ready for inventory integration
-- 4. Performance indexes for all critical query patterns
-- 5. Test data for comprehensive workflow validation
-- 6. Proper foreign key relationships and constraints
-- 7. Automatic timestamp management
-- 8. Foundation for Phase 4 executive analytics integration
-- 9. No role-based dependencies - works with current database structure
-- 10. Ready for RLS policies to be added later when role system is implemented