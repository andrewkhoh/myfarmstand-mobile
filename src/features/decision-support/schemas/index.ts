/**
 * Decision Support Schemas - Zod validation for recommendation engine
 * Following architectural patterns from docs/architectural-patterns-and-best-practices.md
 */

import { z } from 'zod';

// Helper function for user-friendly error creation
const createDecisionSupportError = (
  code: string,
  technicalMessage: string,
  userMessage: string
) => ({
  code,
  message: technicalMessage,
  userMessage,
  timestamp: new Date().toISOString()
});

// Core Executive Data Schemas
export const ExecutiveDataSchema = z.object({
  inventory: z.object({
    currentStock: z.number().min(0),
    dailyDemand: z.number().min(0).optional(),
    leadTime: z.number().min(1).optional(),
    historicalDemand: z.array(z.number().min(0)).optional(),
    leadTimes: z.object({
      mean: z.number().min(1),
      stdDev: z.number().min(0)
    }).optional(),
    avgCost: z.number().min(0).optional(),
    products: z.array(z.object({
      id: z.string().min(1),
      stock: z.number().min(0),
      demandRate: z.number().min(0),
      leadTime: z.number().min(1),
      holdingCost: z.number().min(0).optional(),
      turnoverRate: z.number().min(0).optional()
    })).optional()
  }).optional(),

  marketing: z.object({
    campaigns: z.array(z.object({
      id: z.string().min(1),
      budget: z.number().min(0),
      revenue: z.number().min(0)
    })).optional(),
    channels: z.array(z.object({
      id: z.string().min(1),
      performance: z.number().min(0).optional()
    })).optional(),
    totalSpend: z.number().min(0).optional(),
    newCustomers: z.number().min(0).optional(),
    historical: z.any().optional()
  }).optional(),

  operations: z.object({
    efficiency: z.number().min(0).max(1).optional(),
    actualOutput: z.number().min(0).optional(),
    maxOutput: z.number().min(0).optional(),
    currentCapacity: z.number().min(0).optional(),
    maxCapacity: z.number().min(0).optional(),
    bottlenecks: z.array(z.string()).optional(),
    processes: z.array(z.object({
      id: z.string().min(1),
      throughput: z.number().min(0),
      capacity: z.number().min(0)
    })).optional()
  }).optional(),

  financials: z.object({
    currentRatio: z.number().min(0).optional(),
    debtToEquity: z.number().min(0).optional(),
    receivables: z.number().min(0).optional(),
    inventory: z.number().min(0).optional(),
    payables: z.number().min(0).optional(),
    cashFlows: z.array(z.number()).optional()
  }).optional(),

  customers: z.object({
    churnRate: z.number().min(0).max(1).optional(),
    atRiskCount: z.number().min(0).optional(),
    segments: z.array(z.object({
      id: z.string().min(1),
      count: z.number().min(0).optional(),
      value: z.number().min(0).optional(),
      lastPurchase: z.number().min(0).optional(),
      avgFrequency: z.number().min(0).optional()
    })).optional()
  }).optional()
});

// Recommendation Options Schema
export const RecommendationOptionsSchema = z.object({
  minConfidence: z.number().min(0).max(1).optional(),
  maxRecommendations: z.number().min(1).optional(),
  categories: z.array(z.string()).optional()
});

// Recommendation Action Schema
export const RecommendationActionSchema = z.object({
  type: z.string().min(1),
  parameters: z.record(z.any())
});

// Impact Schema
export const ImpactSchema = z.object({
  revenue: z.number().optional(),
  cost: z.number().optional(),
  efficiency: z.number().optional(),
  risk: z.number().optional(),
  timeframe: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

// Core Recommendation Schema
export const RecommendationSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  action: RecommendationActionSchema,
  impact: ImpactSchema,
  confidence: z.number().min(0).max(1),
  priority: z.enum(['high', 'medium', 'low']),
  supportingData: z.record(z.any()).optional()
});

// Stockout Risk Schema
export const StockoutRiskSchema = z.object({
  probability: z.number().min(0).max(1),
  potentialLoss: z.number().min(0),
  recommendedIncrease: z.number().min(0),
  atRiskProducts: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  history: z.array(z.any())
});

// Simulation Schemas
export const SimulationModelSchema = z.object({
  baseValue: z.number(),
  volatility: z.number().min(0),
  timeHorizon: z.number().min(0)
});

export const SimulationResultSchema = z.object({
  mean: z.number(),
  stdDev: z.number().min(0),
  percentiles: z.record(z.number())
});

// Learning and Feedback Schemas
export const FeedbackDataSchema = z.object({
  recommendationId: z.string().min(1),
  useful: z.boolean(),
  outcome: z.enum(['positive', 'negative', 'neutral']),
  actualImpact: z.number().optional(),
  notes: z.string().optional(),
  timestamp: z.string().datetime()
});

export const LearningMetricsSchema = z.object({
  accuracy: z.number().min(0).max(1),
  improvement: z.number(),
  totalFeedback: z.number().min(0),
  successRate: z.number().min(0).max(1)
});

// Trend Analysis Schemas
export const TrendAnalysisSchema = z.object({
  direction: z.enum(['upward', 'downward', 'stable']),
  strength: z.number().min(0).max(1)
});

export const SeasonalityAnalysisSchema = z.object({
  hasSeasonality: z.boolean(),
  period: z.number().min(1).optional()
});

// Transform schemas for TypeScript integration
export type ExecutiveData = z.infer<typeof ExecutiveDataSchema>;
export type RecommendationOptions = z.infer<typeof RecommendationOptionsSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type StockoutRisk = z.infer<typeof StockoutRiskSchema>;
export type SimulationModel = z.infer<typeof SimulationModelSchema>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
export type FeedbackData = z.infer<typeof FeedbackDataSchema>;
export type LearningMetrics = z.infer<typeof LearningMetricsSchema>;
export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;
export type SeasonalityAnalysis = z.infer<typeof SeasonalityAnalysisSchema>;

// Validation utilities following architectural patterns
export const validateExecutiveData = (data: unknown): ExecutiveData => {
  try {
    return ExecutiveDataSchema.parse(data);
  } catch (error) {
    const validationError = createDecisionSupportError(
      'INVALID_EXECUTIVE_DATA',
      `Executive data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'Invalid data format provided for executive analysis'
    );
    throw validationError;
  }
};

export const validateRecommendationOptions = (options: unknown): RecommendationOptions => {
  try {
    return RecommendationOptionsSchema.parse(options);
  } catch (error) {
    const validationError = createDecisionSupportError(
      'INVALID_RECOMMENDATION_OPTIONS',
      `Recommendation options validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'Invalid options provided for recommendation generation'
    );
    throw validationError;
  }
};

export const validateRecommendation = (recommendation: unknown): Recommendation => {
  try {
    return RecommendationSchema.parse(recommendation);
  } catch (error) {
    const validationError = createDecisionSupportError(
      'INVALID_RECOMMENDATION',
      `Recommendation validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'Generated recommendation does not meet quality standards'
    );
    throw validationError;
  }
};

export const validateFeedbackData = (feedback: unknown): FeedbackData => {
  try {
    return FeedbackDataSchema.parse(feedback);
  } catch (error) {
    const validationError = createDecisionSupportError(
      'INVALID_FEEDBACK_DATA',
      `Feedback data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'Invalid feedback format provided'
    );
    throw validationError;
  }
};

// Graceful degradation helpers
export const safeValidateExecutiveData = (data: unknown): { success: boolean; data?: ExecutiveData; error?: any } => {
  try {
    const validatedData = validateExecutiveData(data);
    return { success: true, data: validatedData };
  } catch (error) {
    return { success: false, error };
  }
};

export const safeValidateRecommendations = (recommendations: unknown[]): Recommendation[] => {
  const validRecommendations: Recommendation[] = [];

  for (const rec of recommendations) {
    try {
      const validatedRec = validateRecommendation(rec);
      validRecommendations.push(validatedRec);
    } catch (error) {
      console.warn('Skipping invalid recommendation:', rec, error);
      // Continue processing other recommendations - graceful degradation
    }
  }

  return validRecommendations;
};