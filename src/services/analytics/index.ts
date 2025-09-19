// Analytics Services Central Export
// Following @docs/integration-patterns-and-guidelines.md Service Layer Structure

export {
  OrderAnalyticsService,
  orderAnalyticsService,
  ServiceError,
  DatabaseError,
} from './orderAnalytics.service';

export {
  OrderConversionFunnelService,
  orderConversionFunnelService,
} from './orderConversionFunnel.service';

export {
  HistoricalOrderAnalysisService,
  historicalOrderAnalysisService,
} from './historicalOrderAnalysis.service';

// Re-export types
export type {
  OrderLifecycleStage,
  OrderFunnelData,
  ConversionFunnelMetrics,
  ConversionFunnelOptions
} from './orderConversionFunnel.service';

export type {
  HistoricalDataPoint,
  SeasonalPattern,
  TrendAnalysis,
  Prediction,
  HistoricalAnalysisOptions,
  HistoricalAnalysisResult
} from './historicalOrderAnalysis.service';

// Re-export existing marketing analytics if available
export { marketingAnalyticsService } from '../marketing/analytics.service';