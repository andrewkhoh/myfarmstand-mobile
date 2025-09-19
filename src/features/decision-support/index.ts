/**
 * Decision Support Feature - Main export file
 * Following architectural patterns with centralized exports
 */

// Export core hooks
export {
  useGenerateRecommendations,
  useTrackOutcome,
  useProcessFeedback,
  useLearningMetrics,
  useStockoutRisk,
  useAdjustedConfidence
} from './hooks/useDecisionSupport';

// Export services
export {
  decisionSupportService,
  DecisionSupportService,
  type DecisionSupportOperationResult
} from './services/decisionSupportService';

// Export schemas and types
export {
  type ExecutiveData,
  type RecommendationOptions,
  type Recommendation,
  type StockoutRisk,
  type SimulationModel,
  type SimulationResult,
  type FeedbackData,
  type LearningMetrics,
  type TrendAnalysis,
  type SeasonalityAnalysis,
  validateExecutiveData,
  validateRecommendationOptions,
  validateRecommendation,
  validateFeedbackData,
  safeValidateExecutiveData,
  safeValidateRecommendations
} from './schemas';

// Export recommendation engine (legacy compatibility)
export { RecommendationEngine } from './services/recommendationEngine';

// Export query keys
export { decisionSupportKeys } from '../../utils/queryKeyFactory';