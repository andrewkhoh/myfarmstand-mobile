import {
  ExecutiveData,
  InventoryData,
  MarketingData,
  OperationsData,
  FinancialsData,
  CustomersData,
  InventoryProduct,
  MarketingCampaign,
  Process,
  CustomerSegment
} from '../types';

export function generateExecutiveData(overrides?: Partial<ExecutiveData>): ExecutiveData {
  return {
    inventory: generateInventoryData(),
    marketing: generateMarketingData(),
    operations: generateOperationsData(),
    financials: generateFinancialsData(),
    customers: generateCustomersData(),
    ...overrides
  };
}

export function generateInventoryData(overrides?: any): InventoryData {
  const defaults: InventoryData = {
    currentStock: 500,
    dailyDemand: 50,
    leadTime: 7,
    products: overrides?.products || [
      { id: 'prod-1', stock: 100, demandRate: 10, leadTime: 5, holdingCost: 2, turnoverRate: 12 },
      { id: 'prod-2', stock: 200, demandRate: 20, leadTime: 7, holdingCost: 3, turnoverRate: 8 },
      { id: 'prod-3', stock: 150, demandRate: 15, leadTime: 6, holdingCost: 2.5, turnoverRate: 10 }
    ],
    historicalDemand: [45, 50, 48, 52, 55, 49, 51, 53],
    leadTimes: { mean: 7, stdDev: 1.5 },
    avgCost: 25,
    totalValue: 12500
  };

  return { ...defaults, ...overrides };
}

export function generateMarketingData(overrides?: any): MarketingData {
  const defaults: MarketingData = {
    campaigns: overrides?.campaigns || [
      { id: 'camp-1', budget: 2000, revenue: 5000, impressions: 10000, conversions: 50 },
      { id: 'camp-2', budget: 3000, revenue: 7500, impressions: 15000, conversions: 75 },
      { id: 'camp-3', budget: 1500, revenue: 2250, impressions: 8000, conversions: 30 }
    ],
    totalSpend: 6500,
    newCustomers: 155,
    channels: [
      { name: 'social', spend: 2000, revenue: 5000, performance: 2.5 },
      { name: 'email', spend: 1500, revenue: 4500, performance: 3.0 },
      { name: 'search', spend: 3000, revenue: 6000, performance: 2.0 }
    ],
    historical: {
      monthlySpend: [5000, 5500, 6000, 6500],
      monthlyRevenue: [12000, 13000, 14500, 15000]
    }
  };

  return { ...defaults, ...overrides };
}

export function generateOperationsData(overrides?: any): OperationsData {
  const defaults: OperationsData = {
    processes: overrides?.processes || [
      { id: 'proc-1', throughput: 100, capacity: 120, efficiency: 0.83 },
      { id: 'proc-2', throughput: 95, capacity: 100, efficiency: 0.95 },
      { id: 'proc-3', throughput: 110, capacity: 150, efficiency: 0.73 }
    ],
    efficiency: 0.75,
    actualOutput: 850,
    maxOutput: 1133,
    currentCapacity: 750,
    maxCapacity: 1000,
    bottlenecks: overrides?.bottlenecks || []
  };

  return { ...defaults, ...overrides };
}

export function generateFinancialsData(overrides?: any): FinancialsData {
  const defaults: FinancialsData = {
    cashFlows: [10000, -5000, 15000, -3000, 12000, 8000],
    currentRatio: 1.5,
    debtToEquity: 0.8,
    cashReserves: 50000,
    receivables: 45000,
    payables: 30000,
    inventory: 40000,
    revenue: [100000, 110000, 125000, 140000]
  };

  return { ...defaults, ...overrides };
}

export function generateCustomersData(overrides?: any): CustomersData {
  const defaults: CustomersData = {
    segments: overrides?.segments || [
      { id: 'premium', value: 5000, count: 100, lastPurchase: 15, avgFrequency: 20, retentionRate: 0.9 },
      { id: 'regular', value: 1000, count: 500, lastPurchase: 25, avgFrequency: 30, retentionRate: 0.75 },
      { id: 'basic', value: 200, count: 2000, lastPurchase: 45, avgFrequency: 60, retentionRate: 0.6 }
    ],
    churnRate: 0.1,
    atRiskCount: 250,
    totalCustomers: 2600
  };

  return { ...defaults, ...overrides };
}

export function generateRandomData(min: number, max: number, count: number): number[] {
  return Array(count).fill(0).map(() => 
    Math.random() * (max - min) + min
  );
}

export function generateTimeSeriesData(
  baseValue: number = 100,
  trend: number = 0.02,
  volatility: number = 0.1,
  length: number = 100
): number[] {
  const data: number[] = [baseValue];
  
  for (let i = 1; i < length; i++) {
    const trendComponent = data[i - 1] * (1 + trend);
    const randomComponent = data[i - 1] * volatility * (Math.random() - 0.5) * 2;
    data.push(trendComponent + randomComponent);
  }
  
  return data;
}

export function generateSeasonalData(
  baseValue: number = 100,
  period: number = 4,
  amplitude: number = 20,
  length: number = 16
): number[] {
  const data: number[] = [];
  
  for (let i = 0; i < length; i++) {
    const seasonalComponent = amplitude * Math.sin(2 * Math.PI * i / period);
    data.push(baseValue + seasonalComponent);
  }
  
  return data;
}