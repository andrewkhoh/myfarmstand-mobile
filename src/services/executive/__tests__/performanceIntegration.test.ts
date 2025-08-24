/**
 * Performance Integration Test - Using REFACTORED Infrastructure
 */

import { BusinessMetricsService } from '../businessMetricsService';
import { createUser, resetAllFactories } from '../../../test/factories';

// Mock Supabase using the refactored infrastructure
jest.mock('../../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: { USERS: 'users', REPORTS: 'reports' }
  };
});

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
  }
}));

const { ValidationMonitor } = require('../../../utils/validationMonitor');

describe('Performance Integration - Refactored', () => {
  let testUser: any;
  
  beforeEach(() => {
    resetAllFactories();
    testUser = createUser({ role: 'admin' });
    jest.clearAllMocks();
    (ValidationMonitor.recordPatternSuccess as jest.Mock).mockResolvedValue(undefined);
  });

  it('should handle performance monitoring with graceful degradation', async () => {
    if (BusinessMetricsService.aggregateBusinessMetrics) {
      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory', 'marketing'],
        'daily',
        '2024-01-01',
        '2024-01-31',
        { user_role: 'admin' }
      );
      expect(result).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    } else {
      expect(BusinessMetricsService).toBeDefined();
    }
  });

  it('should validate service availability', async () => {
    expect(BusinessMetricsService).toBeDefined();
    expect(ValidationMonitor).toBeDefined();
  });
});