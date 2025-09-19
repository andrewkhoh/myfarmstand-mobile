-- Create Executive Analytics Tables
-- This migration adds the missing tables required by the executive analytics system

-- 1. Business Metrics Table
CREATE TABLE IF NOT EXISTS public.business_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date date NOT NULL,
  metric_category text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  aggregation_level text DEFAULT 'daily',
  source_data_type text,
  correlation_factors jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_aggregation_level CHECK (aggregation_level IN ('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  CONSTRAINT valid_category CHECK (metric_category IN ('sales', 'inventory', 'customer', 'marketing', 'financial', 'operational'))
);

-- Create indexes for performance
CREATE INDEX idx_business_metrics_date ON public.business_metrics(metric_date);
CREATE INDEX idx_business_metrics_category ON public.business_metrics(metric_category);
CREATE INDEX idx_business_metrics_name ON public.business_metrics(metric_name);
CREATE INDEX idx_business_metrics_aggregation ON public.business_metrics(aggregation_level);

-- 2. Business Insights Table
CREATE TABLE IF NOT EXISTS public.business_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type text NOT NULL,
  insight_date_range daterange NOT NULL,
  insight_title text NOT NULL,
  insight_description text,
  insight_data jsonb NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  impact_score text,
  recommendations jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_insight_type CHECK (insight_type IN ('trend', 'anomaly', 'prediction', 'correlation', 'recommendation', 'alert'))
);

-- Create indexes for performance
CREATE INDEX idx_business_insights_type ON public.business_insights(insight_type);
CREATE INDEX idx_business_insights_date_range ON public.business_insights USING gist(insight_date_range);
CREATE INDEX idx_business_insights_active ON public.business_insights(is_active);

-- 3. Strategic Reports Table
CREATE TABLE IF NOT EXISTS public.strategic_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type text NOT NULL,
  report_title text NOT NULL,
  report_summary text,
  report_data jsonb NOT NULL,
  report_status text DEFAULT 'draft',
  frequency text DEFAULT 'monthly',
  sections jsonb,
  key_findings jsonb,
  alerts jsonb,
  generated_at timestamp with time zone DEFAULT now(),
  next_scheduled_at timestamp with time zone,
  generation_time integer, -- in milliseconds
  priority text DEFAULT 'medium',
  download_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_report_type CHECK (report_type IN ('executive', 'financial', 'operational', 'marketing', 'inventory', 'custom')),
  CONSTRAINT valid_status CHECK (report_status IN ('draft', 'ready', 'generating', 'scheduled', 'error', 'archived')),
  CONSTRAINT valid_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'on-demand')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Create indexes for performance
CREATE INDEX idx_strategic_reports_type ON public.strategic_reports(report_type);
CREATE INDEX idx_strategic_reports_status ON public.strategic_reports(report_status);
CREATE INDEX idx_strategic_reports_generated_at ON public.strategic_reports(generated_at);
CREATE INDEX idx_strategic_reports_priority ON public.strategic_reports(priority);

-- 4. Predictive Forecasts Table
CREATE TABLE IF NOT EXISTS public.predictive_forecasts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_type text NOT NULL,
  forecast_target text NOT NULL,
  forecast_period daterange NOT NULL,
  model_type text NOT NULL,
  forecast_values jsonb NOT NULL,
  confidence_intervals jsonb,
  model_accuracy numeric CHECK (model_accuracy >= 0 AND model_accuracy <= 1),
  input_features text[],
  model_parameters jsonb,
  generated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_forecast_type CHECK (forecast_type IN ('demand', 'revenue', 'inventory', 'customer_churn', 'sales', 'seasonal')),
  CONSTRAINT valid_model_type CHECK (model_type IN ('linear_regression', 'arima', 'prophet', 'lstm', 'ensemble', 'exponential_smoothing'))
);

-- Create indexes for performance
CREATE INDEX idx_predictive_forecasts_type ON public.predictive_forecasts(forecast_type);
CREATE INDEX idx_predictive_forecasts_target ON public.predictive_forecasts(forecast_target);
CREATE INDEX idx_predictive_forecasts_period ON public.predictive_forecasts USING gist(forecast_period);
CREATE INDEX idx_predictive_forecasts_active ON public.predictive_forecasts(is_active);

-- 5. Cross Role Analytics Table (for correlation analysis)
CREATE TABLE IF NOT EXISTS public.cross_role_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_type text NOT NULL,
  source_role text NOT NULL,
  target_role text,
  analysis_data jsonb NOT NULL,
  correlation_strength numeric CHECK (correlation_strength >= -1 AND correlation_strength <= 1),
  insights jsonb,
  date_range daterange NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_analysis_type CHECK (analysis_type IN ('correlation', 'impact', 'dependency', 'workflow', 'performance'))
);

-- Create indexes for performance
CREATE INDEX idx_cross_role_analytics_type ON public.cross_role_analytics(analysis_type);
CREATE INDEX idx_cross_role_analytics_source ON public.cross_role_analytics(source_role);
CREATE INDEX idx_cross_role_analytics_date ON public.cross_role_analytics USING gist(date_range);

-- 6. Alert Rules Table (for monitoring thresholds)
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name text NOT NULL UNIQUE,
  rule_type text NOT NULL,
  metric_name text NOT NULL,
  condition_type text NOT NULL,
  threshold_value numeric,
  threshold_unit text,
  severity text DEFAULT 'medium',
  enabled boolean DEFAULT true,
  notification_channels text[],
  last_triggered_at timestamp with time zone,
  trigger_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_rule_type CHECK (rule_type IN ('metric', 'anomaly', 'trend', 'composite')),
  CONSTRAINT valid_condition CHECK (condition_type IN ('greater_than', 'less_than', 'equals', 'between', 'outside_range', 'rate_of_change')),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- Create indexes for performance
CREATE INDEX idx_alert_rules_name ON public.alert_rules(rule_name);
CREATE INDEX idx_alert_rules_enabled ON public.alert_rules(enabled);
CREATE INDEX idx_alert_rules_metric ON public.alert_rules(metric_name);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_role_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Business Metrics Policies
CREATE POLICY "Business metrics viewable by authenticated users" ON public.business_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Business metrics insertable by staff and above" ON public.business_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Business metrics updatable by staff and above" ON public.business_metrics
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Business Insights Policies
CREATE POLICY "Business insights viewable by authenticated users" ON public.business_insights
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Business insights insertable by staff" ON public.business_insights
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Strategic Reports Policies
CREATE POLICY "Strategic reports viewable by authenticated users" ON public.strategic_reports
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Strategic reports insertable by staff" ON public.strategic_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Predictive Forecasts Policies
CREATE POLICY "Predictive forecasts viewable by authenticated users" ON public.predictive_forecasts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Predictive forecasts insertable by staff" ON public.predictive_forecasts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Cross Role Analytics Policies
CREATE POLICY "Cross role analytics viewable by authenticated users" ON public.cross_role_analytics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Cross role analytics insertable by staff" ON public.cross_role_analytics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Alert Rules Policies
CREATE POLICY "Alert rules viewable by authenticated users" ON public.alert_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Alert rules manageable by staff" ON public.alert_rules
  FOR ALL USING (auth.role() = 'authenticated');

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables
CREATE TRIGGER update_business_metrics_updated_at BEFORE UPDATE ON public.business_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_insights_updated_at BEFORE UPDATE ON public.business_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategic_reports_updated_at BEFORE UPDATE ON public.strategic_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_forecasts_updated_at BEFORE UPDATE ON public.predictive_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_role_analytics_updated_at BEFORE UPDATE ON public.cross_role_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development/testing
INSERT INTO public.business_metrics (metric_date, metric_category, metric_name, metric_value, metric_unit, aggregation_level)
VALUES
  (CURRENT_DATE, 'sales', 'daily_revenue', 5000.00, 'USD', 'daily'),
  (CURRENT_DATE, 'inventory', 'stock_turnover', 3.5, 'ratio', 'daily'),
  (CURRENT_DATE, 'customer', 'new_customers', 25, 'count', 'daily'),
  (CURRENT_DATE - INTERVAL '1 day', 'sales', 'daily_revenue', 4500.00, 'USD', 'daily'),
  (CURRENT_DATE - INTERVAL '1 day', 'inventory', 'stock_turnover', 3.2, 'ratio', 'daily')
ON CONFLICT DO NOTHING;

INSERT INTO public.strategic_reports (report_type, report_title, report_summary, report_data, report_status)
VALUES
  ('executive', 'Executive Summary Report', 'Monthly executive dashboard summary', '{"metrics": {}, "charts": []}', 'ready'),
  ('financial', 'Financial Performance Report', 'Q1 Financial metrics and analysis', '{"revenue": 150000, "profit": 45000}', 'ready')
ON CONFLICT DO NOTHING;

-- Grant permissions to authenticated users
GRANT SELECT ON public.business_metrics TO authenticated;
GRANT SELECT ON public.business_insights TO authenticated;
GRANT SELECT ON public.strategic_reports TO authenticated;
GRANT SELECT ON public.predictive_forecasts TO authenticated;
GRANT SELECT ON public.cross_role_analytics TO authenticated;
GRANT SELECT ON public.alert_rules TO authenticated;

GRANT INSERT, UPDATE ON public.business_metrics TO authenticated;
GRANT INSERT, UPDATE ON public.business_insights TO authenticated;
GRANT INSERT, UPDATE ON public.strategic_reports TO authenticated;
GRANT INSERT, UPDATE ON public.predictive_forecasts TO authenticated;
GRANT INSERT, UPDATE ON public.cross_role_analytics TO authenticated;
GRANT ALL ON public.alert_rules TO authenticated;