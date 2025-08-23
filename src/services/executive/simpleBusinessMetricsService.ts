// Simple Business Metrics Service - Separated for clean testing
// This demonstrates the correct service structure for executive analytics

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
  generatedAt: string;
}

export interface UseBusinessMetricsOptions {
  dateRange?: string;
  category?: string;
  refreshInterval?: number;
}

export class SimpleBusinessMetricsService {
  static async getMetrics(options?: UseBusinessMetricsOptions): Promise<BusinessMetricsData> {
    // This will be mocked in tests - real implementation would call Supabase
    throw new Error('Service not implemented - should be mocked in tests');
  }
}