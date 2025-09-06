-- Production Monitoring Schema
-- Phase 5: Production Readiness Infrastructure
-- System performance monitoring, error tracking, security audit, and deployment history

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- System performance monitoring
CREATE TABLE IF NOT EXISTS system_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metric_category TEXT NOT NULL CHECK (metric_category IN ('query_performance', 'api_response', 'memory_usage', 'cache_efficiency')),
  metric_name VARCHAR(255) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(50) NOT NULL, -- 'milliseconds', 'bytes', 'percentage', 'count'
  service_name VARCHAR(100) NOT NULL,
  user_role_context TEXT, -- For role-specific performance tracking
  request_context JSONB, -- Request details for debugging
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON system_performance_metrics(metric_timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_service_category ON system_performance_metrics(service_name, metric_category);
CREATE INDEX IF NOT EXISTS idx_performance_role_context ON system_performance_metrics(user_role_context);

-- Error tracking and system health
CREATE TABLE IF NOT EXISTS system_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_timestamp TIMESTAMPTZ DEFAULT NOW(),
  error_level TEXT NOT NULL CHECK (error_level IN ('info', 'warning', 'error', 'critical')),
  error_category TEXT NOT NULL CHECK (error_category IN ('validation', 'permission', 'performance', 'integration', 'security')),
  error_message TEXT NOT NULL,
  error_context JSONB, -- Full error details
  affected_service VARCHAR(100) NOT NULL,
  user_role_context TEXT,
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'resolved', 'ignored')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for error tracking
CREATE INDEX IF NOT EXISTS idx_error_timestamp ON system_error_logs(error_timestamp);
CREATE INDEX IF NOT EXISTS idx_error_service_level ON system_error_logs(affected_service, error_level);
CREATE INDEX IF NOT EXISTS idx_error_resolution_status ON system_error_logs(resolution_status);
CREATE INDEX IF NOT EXISTS idx_error_level ON system_error_logs(error_level);

-- Security audit trail
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_timestamp TIMESTAMPTZ DEFAULT NOW(),
  audit_type TEXT NOT NULL CHECK (audit_type IN ('permission_check', 'role_change', 'data_access', 'security_violation')),
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT NOT NULL,
  resource_accessed TEXT NOT NULL,
  permission_checked TEXT NOT NULL,
  access_granted BOOLEAN NOT NULL,
  access_context JSONB, -- Full context for audit
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for security audit
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_logs(audit_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user_role ON security_audit_logs(user_id, user_role);
CREATE INDEX IF NOT EXISTS idx_audit_access_denied ON security_audit_logs(access_granted) WHERE access_granted = false;
CREATE INDEX IF NOT EXISTS idx_audit_type ON security_audit_logs(audit_type);

-- Deployment and configuration tracking
CREATE TABLE IF NOT EXISTS deployment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_timestamp TIMESTAMPTZ DEFAULT NOW(),
  deployment_version VARCHAR(100) NOT NULL,
  deployment_type TEXT NOT NULL CHECK (deployment_type IN ('schema_migration', 'code_deployment', 'configuration_update', 'rollback')),
  deployment_status TEXT NOT NULL CHECK (deployment_status IN ('started', 'in_progress', 'completed', 'failed', 'rolled_back')),
  deployment_details JSONB NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for deployment history
CREATE INDEX IF NOT EXISTS idx_deployment_timestamp ON deployment_history(deployment_timestamp);
CREATE INDEX IF NOT EXISTS idx_deployment_status ON deployment_history(deployment_status);
CREATE INDEX IF NOT EXISTS idx_deployment_type ON deployment_history(deployment_type);

-- Feature flags and system configuration
CREATE TABLE IF NOT EXISTS system_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(255) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  config_description TEXT,
  config_category TEXT NOT NULL CHECK (config_category IN ('feature_flags', 'performance', 'security', 'monitoring')),
  is_active BOOLEAN DEFAULT true,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  last_updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for system configuration
CREATE INDEX IF NOT EXISTS idx_config_category_env ON system_configuration(config_category, environment);
CREATE INDEX IF NOT EXISTS idx_config_active ON system_configuration(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_config_key ON system_configuration(config_key);

-- RLS Policies for production monitoring tables

-- System performance metrics - allow authenticated users to read their own context, admins can read all
ALTER TABLE system_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_performance_metrics_read_policy" ON system_performance_metrics
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      user_role_context = (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) OR
      (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
    )
  );

CREATE POLICY "system_performance_metrics_insert_policy" ON system_performance_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- System error logs - allow authenticated users to read their own errors, admins can read all
ALTER TABLE system_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_error_logs_read_policy" ON system_error_logs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      user_role_context = (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) OR
      (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
    )
  );

CREATE POLICY "system_error_logs_insert_policy" ON system_error_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "system_error_logs_update_policy" ON system_error_logs
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('admin', 'executive')
  );

-- Security audit logs - only admins can read all, users can't see audit logs
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_audit_logs_read_policy" ON security_audit_logs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "security_audit_logs_insert_policy" ON security_audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Deployment history - admins and executives can read, only admins can write
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deployment_history_read_policy" ON deployment_history
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('admin', 'executive')
  );

CREATE POLICY "deployment_history_write_policy" ON deployment_history
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

-- System configuration - read for authenticated users, write for admins only
ALTER TABLE system_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_configuration_read_policy" ON system_configuration
  FOR SELECT USING (
    auth.role() = 'authenticated' AND is_active = true
  );

CREATE POLICY "system_configuration_write_policy" ON system_configuration
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

-- Insert default production configuration
INSERT INTO system_configuration (config_key, config_value, config_description, config_category, environment) VALUES
  ('performance_monitoring_enabled', '{"enabled": true, "interval_ms": 5000}', 'Enable system performance monitoring', 'monitoring', 'production'),
  ('query_performance_threshold_ms', '{"warning": 200, "critical": 500}', 'Query performance alert thresholds', 'performance', 'production'),
  ('cache_hit_ratio_threshold', '{"warning": 0.85, "critical": 0.75}', 'Cache efficiency alert thresholds', 'performance', 'production'),
  ('security_audit_enabled', '{"enabled": true, "log_all_access": true}', 'Enable comprehensive security auditing', 'security', 'production'),
  ('error_alert_enabled', '{"enabled": true, "critical_immediate": true}', 'Enable error alerting system', 'monitoring', 'production')
ON CONFLICT (config_key) DO NOTHING;

-- Create functions for performance monitoring

-- Function to log performance metrics
CREATE OR REPLACE FUNCTION log_performance_metric(
  p_metric_category TEXT,
  p_metric_name TEXT,
  p_metric_value DECIMAL,
  p_metric_unit TEXT,
  p_service_name TEXT,
  p_user_role_context TEXT DEFAULT NULL,
  p_request_context JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO system_performance_metrics (
    metric_category, metric_name, metric_value, metric_unit,
    service_name, user_role_context, request_context
  ) VALUES (
    p_metric_category, p_metric_name, p_metric_value, p_metric_unit,
    p_service_name, p_user_role_context, p_request_context
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log errors
CREATE OR REPLACE FUNCTION log_system_error(
  p_error_level TEXT,
  p_error_category TEXT,
  p_error_message TEXT,
  p_affected_service TEXT,
  p_error_context JSONB DEFAULT NULL,
  p_user_role_context TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  error_id UUID;
BEGIN
  INSERT INTO system_error_logs (
    error_level, error_category, error_message, affected_service,
    error_context, user_role_context
  ) VALUES (
    p_error_level, p_error_category, p_error_message, p_affected_service,
    p_error_context, p_user_role_context
  ) RETURNING id INTO error_id;
  
  RETURN error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security audit events
CREATE OR REPLACE FUNCTION log_security_audit(
  p_audit_type TEXT,
  p_user_id UUID,
  p_user_role TEXT,
  p_resource_accessed TEXT,
  p_permission_checked TEXT,
  p_access_granted BOOLEAN,
  p_access_context JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO security_audit_logs (
    audit_type, user_id, user_role, resource_accessed,
    permission_checked, access_granted, access_context,
    ip_address, user_agent
  ) VALUES (
    p_audit_type, p_user_id, p_user_role, p_resource_accessed,
    p_permission_checked, p_access_granted, p_access_context,
    p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log deployment events
CREATE OR REPLACE FUNCTION log_deployment_event(
  p_deployment_version TEXT,
  p_deployment_type TEXT,
  p_deployment_status TEXT,
  p_deployment_details JSONB,
  p_performed_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  deployment_id UUID;
BEGIN
  INSERT INTO deployment_history (
    deployment_version, deployment_type, deployment_status,
    deployment_details, performed_by
  ) VALUES (
    p_deployment_version, p_deployment_type, p_deployment_status,
    p_deployment_details, p_performed_by
  ) RETURNING id INTO deployment_id;
  
  RETURN deployment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Performance monitoring views for easier querying

-- Recent performance metrics view
CREATE OR REPLACE VIEW recent_performance_metrics AS
SELECT 
  metric_category,
  metric_name,
  service_name,
  user_role_context,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  COUNT(*) as sample_count,
  metric_unit
FROM system_performance_metrics 
WHERE metric_timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY metric_category, metric_name, service_name, user_role_context, metric_unit
ORDER BY metric_category, service_name, metric_name;

-- Error summary view
CREATE OR REPLACE VIEW error_summary AS
SELECT 
  error_level,
  error_category,
  affected_service,
  user_role_context,
  COUNT(*) as error_count,
  MAX(error_timestamp) as latest_error
FROM system_error_logs 
WHERE error_timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY error_level, error_category, affected_service, user_role_context
ORDER BY error_count DESC, latest_error DESC;

-- Security audit summary view  
CREATE OR REPLACE VIEW security_audit_summary AS
SELECT 
  audit_type,
  user_role,
  resource_accessed,
  access_granted,
  COUNT(*) as access_count,
  MAX(audit_timestamp) as latest_access
FROM security_audit_logs 
WHERE audit_timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY audit_type, user_role, resource_accessed, access_granted
ORDER BY access_count DESC, latest_access DESC;

-- Grant necessary permissions
GRANT SELECT ON recent_performance_metrics TO authenticated;
GRANT SELECT ON error_summary TO authenticated;
GRANT SELECT ON security_audit_summary TO authenticated;

GRANT EXECUTE ON FUNCTION log_performance_metric TO authenticated;
GRANT EXECUTE ON FUNCTION log_system_error TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_audit TO authenticated;
GRANT EXECUTE ON FUNCTION log_deployment_event TO authenticated;