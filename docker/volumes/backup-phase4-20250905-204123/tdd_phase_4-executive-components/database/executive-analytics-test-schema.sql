-- Phase 4: Executive Analytics Database Schema
-- Cross-role business intelligence and analytics infrastructure
-- Supports executive, admin, inventory_staff, and marketing_staff roles

-- =====================================================
-- Business Metrics Table - Cross-role data aggregation
-- =====================================================
CREATE TABLE business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_category TEXT NOT NULL CHECK (metric_category IN ('inventory', 'marketing', 'sales', 'operational', 'strategic')),
  metric_name VARCHAR(255) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(50), -- 'currency', 'percentage', 'count', 'ratio'
  aggregation_level TEXT NOT NULL CHECK (aggregation_level IN ('daily', 'weekly', 'monthly', 'quarterly')),
  source_data_type TEXT NOT NULL, -- 'inventory_movement', 'campaign_performance', 'sales_data'
  correlation_factors JSONB, -- For cross-role correlation analysis
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date, metric_category, metric_name, aggregation_level)
);

-- Performance indexes for cross-role queries and aggregation
CREATE INDEX idx_business_metrics_category_date ON business_metrics(metric_category, metric_date);
CREATE INDEX idx_business_metrics_aggregation ON business_metrics(aggregation_level, metric_date);
CREATE INDEX idx_business_metrics_source_type ON business_metrics(source_data_type, metric_date);
CREATE INDEX idx_business_metrics_correlation ON business_metrics USING GIN(correlation_factors);

-- =====================================================
-- Business Intelligence Insights and Correlations
-- =====================================================
CREATE TABLE business_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('correlation', 'trend', 'anomaly', 'recommendation')),
  insight_title VARCHAR(500) NOT NULL,
  insight_description TEXT NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.00 AND 1.00),
  impact_level TEXT NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  affected_areas TEXT[], -- ['inventory', 'marketing', 'sales']
  supporting_data JSONB, -- Raw data supporting the insight
  recommendation_actions TEXT[],
  insight_date_range DATERANGE NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'system', -- 'system', 'manual', 'user_id'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business intelligence indexes
CREATE INDEX idx_business_insights_type_impact ON business_insights(insight_type, impact_level);
CREATE INDEX idx_business_insights_active_date ON business_insights(is_active, insight_date_range);
CREATE INDEX idx_business_insights_affected_areas ON business_insights USING GIN(affected_areas);
CREATE INDEX idx_business_insights_supporting_data ON business_insights USING GIN(supporting_data);

-- =====================================================
-- Strategic Reports Configuration and Generation
-- =====================================================
CREATE TABLE strategic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name VARCHAR(255) NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('performance', 'forecast', 'correlation', 'strategic')),
  report_frequency TEXT NOT NULL CHECK (report_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'on_demand')),
  report_config JSONB NOT NULL, -- Chart types, metrics, filters, etc.
  last_generated_at TIMESTAMPTZ,
  next_generation_at TIMESTAMPTZ,
  is_automated BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategic reports indexes
CREATE INDEX idx_strategic_reports_type_frequency ON strategic_reports(report_type, report_frequency);
CREATE INDEX idx_strategic_reports_automation ON strategic_reports(is_automated, next_generation_at);
CREATE INDEX idx_strategic_reports_config ON strategic_reports USING GIN(report_config);

-- =====================================================
-- Predictive Analytics Models and Forecasts
-- =====================================================
CREATE TABLE predictive_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('demand', 'inventory', 'revenue', 'risk')),
  forecast_target VARCHAR(255) NOT NULL, -- What is being forecasted
  forecast_period DATERANGE NOT NULL,
  model_type VARCHAR(100) NOT NULL, -- 'linear_regression', 'seasonal_decomposition', 'trend_analysis'
  forecast_values JSONB NOT NULL, -- Time series forecast data
  confidence_intervals JSONB, -- Upper/lower bounds
  model_accuracy DECIMAL(5,4), -- R-squared or similar metric
  input_features TEXT[], -- What data was used for prediction
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- When forecast becomes stale
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictive analytics indexes
CREATE INDEX idx_predictive_forecasts_type_period ON predictive_forecasts(forecast_type, forecast_period);
CREATE INDEX idx_predictive_forecasts_expiry ON predictive_forecasts(expires_at);
CREATE INDEX idx_predictive_forecasts_values ON predictive_forecasts USING GIN(forecast_values);
CREATE INDEX idx_predictive_forecasts_confidence ON predictive_forecasts USING GIN(confidence_intervals);

-- =====================================================
-- Decision Support Recommendations and Scenarios
-- =====================================================
CREATE TABLE decision_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name VARCHAR(255) NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('optimization', 'risk_mitigation', 'growth_strategy', 'cost_reduction')),
  current_state JSONB NOT NULL, -- Current business metrics
  proposed_changes JSONB NOT NULL, -- Recommended actions
  projected_outcomes JSONB NOT NULL, -- Expected results
  risk_assessment JSONB, -- Potential risks and mitigations
  implementation_priority TEXT NOT NULL CHECK (implementation_priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_impact DECIMAL(15,2), -- Financial or percentage impact
  implementation_timeline VARCHAR(255), -- "2 weeks", "1 month", etc.
  supporting_insights UUID[], -- References to business_insights
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed', 'rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision support indexes
CREATE INDEX idx_decision_support_type_priority ON decision_support(scenario_type, implementation_priority);
CREATE INDEX idx_decision_support_status ON decision_support(status, created_at);
CREATE INDEX idx_decision_support_insights ON decision_support USING GIN(supporting_insights);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all analytics tables
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_support ENABLE ROW LEVEL SECURITY;

-- Business Metrics RLS Policies
CREATE POLICY "business_metrics_executive_admin_full_access" ON business_metrics
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('executive', 'admin')
        )
    );

CREATE POLICY "business_metrics_inventory_staff_read" ON business_metrics
    FOR SELECT TO authenticated
    USING (
        metric_category = 'inventory'
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name = 'inventory_staff'
        )
    );

CREATE POLICY "business_metrics_marketing_staff_read" ON business_metrics
    FOR SELECT TO authenticated
    USING (
        metric_category = 'marketing'
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name = 'marketing_staff'
        )
    );

-- Business Insights RLS Policies
CREATE POLICY "business_insights_executive_admin_full_access" ON business_insights
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('executive', 'admin')
        )
    );

CREATE POLICY "business_insights_inventory_staff_read" ON business_insights
    FOR SELECT TO authenticated
    USING (
        'inventory' = ANY(affected_areas)
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name = 'inventory_staff'
        )
    );

CREATE POLICY "business_insights_marketing_staff_read" ON business_insights
    FOR SELECT TO authenticated
    USING (
        'marketing' = ANY(affected_areas)
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name = 'marketing_staff'
        )
    );

-- Strategic Reports RLS Policies
CREATE POLICY "strategic_reports_executive_admin_full_access" ON strategic_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('executive', 'admin')
        )
    );

-- Predictive Forecasts RLS Policies
CREATE POLICY "predictive_forecasts_executive_admin_full_access" ON predictive_forecasts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('executive', 'admin')
        )
    );

CREATE POLICY "predictive_forecasts_inventory_staff_read" ON predictive_forecasts
    FOR SELECT TO authenticated
    USING (
        forecast_type IN ('inventory', 'demand')
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name = 'inventory_staff'
        )
    );

-- Decision Support RLS Policies
CREATE POLICY "decision_support_executive_admin_full_access" ON decision_support
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('executive', 'admin')
        )
    );

-- =====================================================
-- Sample Cross-Role Test Data for Business Intelligence
-- =====================================================

-- Sample business metrics data
INSERT INTO business_metrics (metric_date, metric_category, metric_name, metric_value, metric_unit, aggregation_level, source_data_type, correlation_factors) VALUES
-- Inventory metrics
('2024-01-15', 'inventory', 'stock_turnover_rate', 12.5, 'ratio', 'monthly', 'inventory_movement', '{"seasonal_factor": 0.85, "demand_correlation": 0.92}'),
('2024-01-15', 'inventory', 'stockout_incidents', 3, 'count', 'monthly', 'inventory_movement', '{"marketing_campaign_impact": 0.67}'),
('2024-01-15', 'inventory', 'inventory_value', 45000.75, 'currency', 'monthly', 'inventory_movement', '{"cost_efficiency": 0.89}'),

-- Marketing metrics
('2024-01-15', 'marketing', 'campaign_conversion_rate', 8.3, 'percentage', 'monthly', 'campaign_performance', '{"inventory_availability": 0.78, "seasonal_demand": 0.91}'),
('2024-01-15', 'marketing', 'content_engagement_rate', 15.2, 'percentage', 'monthly', 'campaign_performance', '{"customer_retention": 0.84}'),
('2024-01-15', 'marketing', 'marketing_roi', 3.2, 'ratio', 'monthly', 'campaign_performance', '{"sales_correlation": 0.95}'),

-- Sales metrics
('2024-01-15', 'sales', 'monthly_revenue', 125000.50, 'currency', 'monthly', 'sales_data', '{"inventory_turnover": 0.87, "marketing_spend": 0.82}'),
('2024-01-15', 'sales', 'customer_acquisition_cost', 45.25, 'currency', 'monthly', 'sales_data', '{"marketing_efficiency": 0.76}'),
('2024-01-15', 'sales', 'average_order_value', 85.50, 'currency', 'monthly', 'sales_data', '{"product_mix": 0.73}');

-- Sample business insights
INSERT INTO business_insights (insight_type, insight_title, insight_description, confidence_score, impact_level, affected_areas, supporting_data, recommendation_actions, insight_date_range, generated_by) VALUES
('correlation', 'Strong Inventory-Marketing Correlation', 'Marketing campaigns show 78% correlation with inventory availability, suggesting coordinated planning could improve performance.', 0.92, 'high', ARRAY['inventory', 'marketing'], '{"correlation_strength": 0.78, "sample_size": 150, "statistical_significance": 0.95}', ARRAY['Implement inventory-marketing sync meetings', 'Create campaign-inventory dashboard', 'Establish stock level triggers for campaigns'], '[2024-01-01,2024-01-31)', 'system'),

('trend', 'Declining Stock Turnover Rate', 'Stock turnover rate has decreased by 15% over the last quarter, indicating potential overstocking or demand issues.', 0.87, 'medium', ARRAY['inventory', 'sales'], '{"trend_direction": "declining", "rate_change": -0.15, "confidence_interval": [0.82, 0.92]}', ARRAY['Review demand forecasting models', 'Analyze slow-moving inventory', 'Adjust purchasing strategies'], '[2023-10-01,2024-01-31)', 'system'),

('anomaly', 'Unusual Marketing ROI Spike', 'Marketing ROI increased by 40% in the last two weeks, significantly above normal variance.', 0.94, 'high', ARRAY['marketing', 'sales'], '{"normal_range": [2.8, 3.5], "observed_value": 4.2, "z_score": 2.8}', ARRAY['Analyze successful campaign elements', 'Document best practices', 'Scale successful strategies'], '[2024-01-15,2024-01-31)', 'system');

-- Sample strategic reports
INSERT INTO strategic_reports (report_name, report_type, report_frequency, report_config, is_automated, created_by) VALUES
('Executive Monthly Dashboard', 'performance', 'monthly', '{"charts": ["revenue_trend", "inventory_health", "marketing_performance"], "metrics": ["roi", "turnover", "conversion"], "filters": {"date_range": "last_30_days"}}', true, (SELECT id FROM auth.users LIMIT 1)),
('Quarterly Business Forecast', 'forecast', 'quarterly', '{"models": ["demand_forecast", "revenue_projection"], "confidence_levels": [0.8, 0.9, 0.95], "scenarios": ["conservative", "optimistic", "pessimistic"]}', true, (SELECT id FROM auth.users LIMIT 1)),
('Cross-Role Correlation Analysis', 'correlation', 'weekly', '{"correlations": ["inventory_marketing", "sales_campaigns", "seasonal_demand"], "statistical_tests": ["pearson", "spearman"], "visualization": "heatmap"}', false, (SELECT id FROM auth.users LIMIT 1));

-- Sample predictive forecasts
INSERT INTO predictive_forecasts (forecast_type, forecast_target, forecast_period, model_type, forecast_values, confidence_intervals, model_accuracy, input_features) VALUES
('demand', 'monthly_sales_volume', '[2024-02-01,2024-04-30)', 'seasonal_decomposition', '{"2024-02": 1250, "2024-03": 1380, "2024-04": 1420}', '{"2024-02": {"lower": 1150, "upper": 1350}, "2024-03": {"lower": 1280, "upper": 1480}}', 0.8750, ARRAY['historical_sales', 'seasonal_patterns', 'marketing_spend', 'inventory_levels']),

('inventory', 'optimal_stock_levels', '[2024-02-01,2024-03-31)', 'linear_regression', '{"product_a": 500, "product_b": 750, "product_c": 300}', '{"product_a": {"lower": 450, "upper": 550}, "product_b": {"lower": 700, "upper": 800}}', 0.9200, ARRAY['demand_forecast', 'lead_times', 'safety_stock', 'turnover_rates']),

('revenue', 'quarterly_revenue_projection', '[2024-02-01,2024-04-30)', 'trend_analysis', '{"2024-Q1": 375000, "trend": "increasing", "growth_rate": 0.08}', '{"2024-Q1": {"lower": 350000, "upper": 400000}}', 0.8900, ARRAY['historical_revenue', 'market_trends', 'campaign_performance', 'seasonal_factors']);

-- Sample decision support scenarios
INSERT INTO decision_support (scenario_name, scenario_type, current_state, proposed_changes, projected_outcomes, risk_assessment, implementation_priority, estimated_impact, implementation_timeline, supporting_insights, created_by) VALUES
('Inventory-Marketing Synchronization Initiative', 'optimization', '{"current_correlation": 0.78, "separate_planning": true, "coordination_meetings": 0}', '{"implement_sync_meetings": true, "shared_dashboard": true, "automated_triggers": true}', '{"expected_correlation": 0.90, "efficiency_gain": 0.15, "cost_reduction": 12000}', '{"implementation_risk": "medium", "change_resistance": "low", "technical_complexity": "medium"}', 'high', 12000.00, '6 weeks', ARRAY[(SELECT id FROM business_insights WHERE insight_title = 'Strong Inventory-Marketing Correlation')], (SELECT id FROM auth.users LIMIT 1)),

('Stock Turnover Improvement Program', 'optimization', '{"current_turnover": 12.5, "declining_trend": true, "overstock_value": 15000}', '{"demand_model_upgrade": true, "automated_reordering": true, "clearance_campaigns": true}', '{"target_turnover": 15.0, "overstock_reduction": 10000, "efficiency_gain": 0.20}', '{"demand_prediction_accuracy": "medium", "system_integration": "high", "staff_training": "low"}', 'medium', 10000.00, '8 weeks', ARRAY[(SELECT id FROM business_insights WHERE insight_title = 'Declining Stock Turnover Rate')], (SELECT id FROM auth.users LIMIT 1));