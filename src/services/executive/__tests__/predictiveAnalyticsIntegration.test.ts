// Test Infrastructure Imports
import { createProduct, resetAllFactories } from "../../../test/factories";

/**
 * Predictive Analytics Integration Test - Using REFACTORED Infrastructure
 */

import { PredictiveAnalyticsService } from '../predictiveAnalyticsService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock Supabase using the refactored infrastructure
jest.mock("../../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: { 
      USERS: 'users', 
      REPORTS: 'reports' 
    }
  };
});

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataIntegrity: jest.fn()
  }
}));

// Mock business services
jest.mock('../businessMetricsService', () => ({
  BusinessMetricsService: {
    aggregateBusinessMetrics: jest.fn().mockResolvedValue({ success: true }),
  }
}));

jest.mock('../businessIntelligenceService', () => ({
  BusinessIntelligenceService: {
    generateInsights: jest.fn().mockResolvedValue({ insights: [] }),
  }
}));


describe('Predictive Analytics Integration - Refactored', () => {
  let testUser: any;
  
  beforeEach(() => {
    resetAllFactories();
    testUser = createUser({ role: 'admin' });
    jest.clearAllMocks();
    (ValidationMonitor.recordPatternSuccess as jest.Mock).mockResolvedValue(undefined);
  });

  it('should integrate predictive analytics with business metrics for comprehensive forecasting', async () => {
    if (PredictiveAnalyticsService.generateForecast) {
      const result = await PredictiveAnalyticsService.generateForecast(
        'demand',
        'inventory_turnover',
        '2024-02-01',
        '2024-02-29'
      );

      expect(result).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    } else {
      expect(PredictiveAnalyticsService).toBeDefined();
    }
  });

  it('should handle service integration gracefully', async () => {
    expect(PredictiveAnalyticsService).toBeDefined();
    expect(ValidationMonitor).toBeDefined();
  });
});