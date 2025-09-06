export interface ExecutiveData {
  inventory?: InventoryData | null;
  marketing?: MarketingData | null;
  operations?: OperationsData | null;
  financials?: FinancialsData | null;
  customers?: CustomersData | null;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  action: RecommendationAction;
  impact: Impact;
  confidence: number;
  priority: Priority;
  supportingData: Record<string, any>;
  createdAt?: Date;
  expiresAt?: Date;
}

export type RecommendationType = 
  | 'inventory_optimization'
  | 'marketing_optimization'
  | 'operations_optimization'
  | 'financial_optimization'
  | 'customer_retention'
  | 'revenue_opportunity'
  | 'cost_reduction'
  | 'risk_mitigation';

export interface RecommendationAction {
  type: string;
  parameters: Record<string, any>;
  steps?: string[];
  timeline?: string;
}

export interface Impact {
  revenue?: number;
  cost?: number;
  efficiency?: number;
  risk?: number;
  timeframe: string;
  confidence: number;
}

export type Priority = 'high' | 'medium' | 'low';

export interface RecommendationOptions {
  minConfidence?: number;
  maxRecommendations?: number;
  categories?: string[];
  timeHorizon?: number;
  riskTolerance?: number;
}

export interface InventoryData {
  currentStock?: number;
  dailyDemand?: number;
  leadTime?: number;
  products?: InventoryProduct[];
  historicalDemand?: number[];
  leadTimes?: LeadTimeData;
  avgCost?: number;
  totalValue?: number;
}

export interface InventoryProduct {
  id: string;
  stock: number;
  demandRate: number;
  leadTime: number;
  holdingCost?: number;
  turnoverRate?: number;
}

export interface LeadTimeData {
  mean: number;
  stdDev: number;
}

export interface MarketingData {
  campaigns?: MarketingCampaign[];
  totalSpend?: number;
  newCustomers?: number;
  channels?: MarketingChannel[];
  historical?: any;
}

export interface MarketingCampaign {
  id: string;
  budget: number;
  revenue: number;
  impressions?: number;
  conversions?: number;
  roi?: number;
}

export interface CampaignROI {
  id: string;
  budget: number;
  revenue?: number;
  roi: number;
}

export interface MarketingChannel {
  name: string;
  spend: number;
  revenue: number;
  performance?: number;
}

export interface OperationsData {
  processes?: Process[];
  efficiency?: number;
  actualOutput?: number;
  maxOutput?: number;
  currentCapacity?: number;
  maxCapacity?: number;
  bottlenecks?: string[];
}

export interface Process {
  id: string;
  throughput: number;
  capacity: number;
  efficiency?: number;
}

export interface FinancialsData {
  cashFlows?: number[];
  currentRatio?: number;
  debtToEquity?: number;
  cashReserves?: number;
  receivables?: number;
  payables?: number;
  inventory?: number;
  revenue?: number[];
}

export interface CustomersData {
  segments?: CustomerSegment[];
  churnRate?: number;
  atRiskCount?: number;
  totalCustomers?: number;
}

export interface CustomerSegment {
  id: string;
  value?: number;
  count?: number;
  lastPurchase?: number;
  avgFrequency?: number;
  retentionRate?: number;
}

export interface StockoutRisk {
  probability: number;
  potentialLoss: number;
  recommendedIncrease: number;
  atRiskProducts: string[];
  confidence: number;
  history?: any;
}

export interface SimulationModel {
  baseValue: number;
  volatility: number;
  timeHorizon: number;
  iterations?: number;
}

export interface SimulationResult {
  mean: number;
  stdDev: number;
  percentiles: Record<number, number>;
  confidence?: number;
}

export interface TrendAnalysis {
  direction: 'upward' | 'downward' | 'stable';
  strength: number;
  forecast?: number[];
}

export interface SeasonalityAnalysis {
  hasSeasonality: boolean;
  period?: number;
  amplitude?: number;
}

export interface AnomalyDetectionResult {
  index: number;
  type: 'statistical' | 'pattern' | 'predictive';
  severity: 'high' | 'medium' | 'low';
  zScore?: number;
  description?: string;
}

export interface FeedbackData {
  recommendationId: string;
  useful: boolean;
  implemented?: boolean;
  outcome?: 'positive' | 'negative' | 'neutral';
  actualImpact?: number;
  comments?: string;
}

export interface LearningMetrics {
  accuracy: number;
  improvement: number;
  totalFeedback: number;
  successRate: number;
}