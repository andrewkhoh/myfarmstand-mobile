// Analytics Hooks Central Export
// Following @docs/integration-patterns-and-guidelines.md Hook Layer Structure

export {
  useOrderConversionFunnel,
  useOrderConversionMetrics,
  useCustomerSegmentFunnel,
  useFunnelStageAnalysis
} from './useOrderConversionFunnel';

export {
  useHistoricalOrderAnalysis,
  useOrderTrends,
  useSeasonalPatterns,
  usePredictiveInsights
} from './useHistoricalOrderAnalysis';

export type {
  UseOrderConversionFunnelResult,
  UseOrderConversionFunnelOptions
} from './useOrderConversionFunnel';

export type {
  UseHistoricalOrderAnalysisOptions
} from './useHistoricalOrderAnalysis';