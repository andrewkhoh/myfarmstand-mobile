// Phase 4: Executive Analytics Schema Index
// Clean exports for all executive analytics schemas
// Following Phase 1, 2, 3 patterns for consistent module structure

// Business Metrics exports
export {
  BusinessMetricsDatabaseSchema,
  BusinessMetricsTransformSchema,
  CreateBusinessMetricsSchema,
  UpdateBusinessMetricsSchema,
  type BusinessMetricsDatabaseContract,
  type CreateBusinessMetricsContract,
  type UpdateBusinessMetricsContract,
  type BusinessMetricsTransform,
  BUSINESS_METRICS_CONSTANTS,
  METRIC_CATEGORIES,
  AGGREGATION_LEVELS
} from './businessMetrics.schemas';

// Business Intelligence exports
export {
  BusinessIntelligenceDatabaseSchema,
  BusinessIntelligenceTransformSchema,
  CreateBusinessIntelligenceSchema,
  UpdateBusinessIntelligenceSchema,
  type BusinessIntelligenceDatabaseContract,
  type CreateBusinessIntelligenceContract,
  type UpdateBusinessIntelligenceContract,
  type BusinessIntelligenceTransform,
  BUSINESS_INTELLIGENCE_CONSTANTS,
  INSIGHT_TYPES,
  IMPACT_LEVELS,
  AFFECTED_AREAS
} from './businessIntelligence.schemas';

// Strategic Reporting exports
export {
  StrategicReportingDatabaseSchema,
  StrategicReportingTransformSchema,
  CreateStrategicReportingSchema,
  UpdateStrategicReportingSchema,
  type StrategicReportingDatabaseContract,
  type CreateStrategicReportingContract,
  type UpdateStrategicReportingContract,
  type StrategicReportingTransform,
  STRATEGIC_REPORTING_CONSTANTS,
  REPORT_TYPES,
  REPORT_FREQUENCIES
} from './strategicReporting.schemas';

// Predictive Analytics exports
export {
  PredictiveAnalyticsDatabaseSchema,
  PredictiveAnalyticsTransformSchema,
  CreatePredictiveAnalyticsSchema,
  UpdatePredictiveAnalyticsSchema,
  type PredictiveAnalyticsDatabaseContract,
  type CreatePredictiveAnalyticsContract,
  type UpdatePredictiveAnalyticsContract,
  type PredictiveAnalyticsTransform,
  PREDICTIVE_ANALYTICS_CONSTANTS,
  FORECAST_TYPES,
  MODEL_TYPES
} from './predictiveAnalytics.schemas';

// Unified executive analytics constants
export const EXECUTIVE_ANALYTICS_CONSTANTS = {
  // Aggregated from all schemas
  ALL_METRIC_CATEGORIES: [
    ...METRIC_CATEGORIES,
    ...AFFECTED_AREAS
  ] as const,
  
  ALL_AGGREGATION_LEVELS: AGGREGATION_LEVELS,
  
  ALL_INSIGHT_TYPES: INSIGHT_TYPES,
  
  ALL_IMPACT_LEVELS: IMPACT_LEVELS,
  
  ALL_REPORT_TYPES: REPORT_TYPES,
  
  ALL_REPORT_FREQUENCIES: REPORT_FREQUENCIES,
  
  ALL_FORECAST_TYPES: FORECAST_TYPES,
  
  ALL_MODEL_TYPES: MODEL_TYPES,
  
  // Cross-schema relationships
  ANALYTICS_FLOW: {
    DATA_COLLECTION: 'business_metrics',
    INTELLIGENCE_GENERATION: 'business_insights', 
    STRATEGIC_REPORTING: 'strategic_reports',
    PREDICTIVE_MODELING: 'predictive_forecasts'
  } as const,
  
  // Role-based access patterns
  ROLE_ACCESS_PATTERNS: {
    executive: ['all_analytics', 'strategic_insights', 'predictive_models'],
    admin: ['all_analytics', 'system_metrics', 'configuration_access'],
    inventory_staff: ['inventory_metrics', 'inventory_insights', 'inventory_forecasts'],
    marketing_staff: ['marketing_metrics', 'marketing_insights', 'campaign_forecasts']
  } as const,
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    MAX_METRICS_PER_QUERY: 1000,
    MAX_INSIGHTS_PER_REQUEST: 100,
    MAX_FORECAST_PERIOD_DAYS: 365,
    CACHE_TTL_SECONDS: 3600
  } as const
} as const;

// Type unions for cross-schema usage
export type AllMetricCategories = typeof EXECUTIVE_ANALYTICS_CONSTANTS.ALL_METRIC_CATEGORIES[number];
export type AllInsightTypes = typeof EXECUTIVE_ANALYTICS_CONSTANTS.ALL_INSIGHT_TYPES[number];
export type AllReportTypes = typeof EXECUTIVE_ANALYTICS_CONSTANTS.ALL_REPORT_TYPES[number];
export type AllForecastTypes = typeof EXECUTIVE_ANALYTICS_CONSTANTS.ALL_FORECAST_TYPES[number];