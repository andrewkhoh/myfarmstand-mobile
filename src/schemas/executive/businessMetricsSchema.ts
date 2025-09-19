import { z } from 'zod';

// Database schema - matches what comes from Supabase
const RawBusinessMetricSchema = z.object({
  id: z.string().optional(),
  metric_name: z.string(),
  value: z.number(),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  growth_percentage: z.number().nullable().optional(),
  trend: z.enum(['increasing', 'decreasing', 'stable']).nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Transform schema - DB format to App format
export const BusinessMetricTransformSchema = RawBusinessMetricSchema.transform((data) => ({
  id: data.id,
  metricName: data.metric_name,
  value: data.value,
  periodStart: data.period_start || new Date().toISOString(),
  periodEnd: data.period_end || new Date().toISOString(),
  category: data.category || undefined,
  subcategory: data.subcategory || undefined,
  growthPercentage: data.growth_percentage ?? 0,
  trend: data.trend || 'stable',
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
}));

// Business Insights Schema
const RawBusinessInsightSchema = z.object({
  id: z.string(),
  insight_type: z.enum(['correlation', 'trend', 'anomaly', 'recommendation']),
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  impact_level: z.enum(['low', 'medium', 'high', 'critical']),
  affected_metrics: z.array(z.string()).nullable().optional(),
  recommendations: z.array(z.string()).nullable().optional(),
  actionable: z.boolean().nullable().optional(),
  generated_at: z.string(),
  expires_at: z.string().nullable().optional(),
});

export const BusinessInsightTransformSchema = RawBusinessInsightSchema.transform((data) => ({
  id: data.id,
  insightType: data.insight_type,
  title: data.title,
  description: data.description,
  confidence: data.confidence,
  impactLevel: data.impact_level,
  affectedMetrics: data.affected_metrics || [],
  recommendations: data.recommendations || [],
  actionable: data.actionable ?? false,
  generatedAt: data.generated_at,
  expiresAt: data.expires_at || undefined,
}));

// Metrics History Schema for time series data
const RawMetricsHistorySchema = z.object({
  id: z.string().optional(),
  metric_name: z.string(),
  date: z.string(),
  value: z.number(),
  hour_of_day: z.number().nullable().optional(),
  day_of_week: z.number().nullable().optional(),
  is_anomaly: z.boolean().nullable().optional(),
  deviation_score: z.number().nullable().optional(),
});

export const MetricsHistoryTransformSchema = RawMetricsHistorySchema.transform((data) => ({
  id: data.id,
  metricName: data.metric_name,
  date: data.date,
  value: data.value,
  hourOfDay: data.hour_of_day ?? undefined,
  dayOfWeek: data.day_of_week ?? undefined,
  isAnomaly: data.is_anomaly ?? false,
  deviationScore: data.deviation_score ?? 0,
}));

// Aggregated metrics for dashboard
export interface BusinessMetricsData {
  revenue: {
    total: number;
    growth: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  orders: {
    total: number;
    growth: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  customers: {
    total: number;
    growth: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  averageOrderValue?: {
    value: number;
    growth: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  generatedAt: string;
}

// Type exports
export type BusinessMetric = z.infer<typeof BusinessMetricTransformSchema>;
export type BusinessInsight = z.infer<typeof BusinessInsightTransformSchema>;
export type MetricsHistory = z.infer<typeof MetricsHistoryTransformSchema>;