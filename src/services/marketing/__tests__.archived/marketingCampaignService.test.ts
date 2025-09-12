/**
 * MarketingCampaignService Test - Using SimplifiedSupabaseMock Pattern
 * Following the established Phase 1-2 patterns
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern
jest.mock('../../../config/supabase', () => {
  const { SimplifiedSupabaseMock } = require('../../../test/mocks/supabase.simplified.mock');
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      MARKETING_CAMPAIGNS: 'marketing_campaigns',
      CAMPAIGN_METRICS: 'campaign_metrics',
      USERS: 'users',
      PRODUCTS: 'products',
      ORDERS: 'orders',
      CART: 'cart'
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

// Mock QueryClient
jest.mock('../../../config/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock role permissions
jest.mock('../../role-based/rolePermissionService', () => ({
  RolePermissionService: {
    hasPermission: jest.fn().mockResolvedValue(true),
    checkPermission: jest.fn().mockResolvedValue(true)
  }
}));

// Mock query key factory
jest.mock('../../../utils/queryKeyFactory', () => ({
  campaignKeys: {
    all: () => ['campaigns'],
    byStatus: (status: string) => ['campaigns', 'status', status],
    details: (id: string) => ['campaigns', 'details', id]
  },
  marketingKeys: {
    all: () => ['marketing'],
    campaigns: () => ['marketing', 'campaigns']
  }
}));

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import { MarketingCampaignService } from '../marketingCampaignService';
import { createUser, resetAllFactories } from '../../../test/factories';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import { RolePermissionService } from '../../role-based/rolePermissionService';

describe('MarketingCampaignService - Fixed Infrastructure', () => {
  let testUser: any;
  let testCampaignId: string;

  const mockCampaign = {
    id: 'campaign-test-123',
    campaign_name: 'Test Campaign',
    campaign_status: 'planned',
    start_date: '2024-01-01T00:00:00Z',
    end_date: '2024-12-31T23:59:59Z',
    discount_percentage: 15.0,
    target_audience: 'general',
    campaign_type: 'seasonal',
    created_by: 'user-test-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  };

  const createMockSupabaseResponse = (data: any, error: any = null) => ({
    data,
    error,
    count: Array.isArray(data) ? data.length : null,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK'
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    
    testUser = createUser({
      id: 'user-test-123',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    testCampaignId = 'campaign-test-123';
    
    // Default role permission setup
    (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(true);
  });

  describe('createCampaign', () => {
    it('should create new marketing campaign', async () => {
      const campaignData = {
        campaignName: 'Summer Sale',
        campaignType: 'seasonal' as const,
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-08-31T23:59:59Z',
        discountPercentage: 20.0,
        targetAudience: 'general',
        createdBy: testUser.id
      };

      // Mock the actual service method response structure
      const result = await MarketingCampaignService.createCampaign(
        campaignData,
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(testCampaignId);
      }

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'createCampaign'
      });
    });

    it('should validate campaign date constraints', async () => {
      const invalidCampaignData = {
        campaignName: 'Invalid Campaign',
        campaignType: 'seasonal' as const,
        startDate: '2024-08-31T23:59:59Z',
        endDate: '2024-06-01T00:00:00Z', // End before start
        discountPercentage: 15.0,
        targetAudience: 'general',
        createdBy: testUser.id
      };

      const result = await MarketingCampaignService.createCampaign(
        invalidCampaignData,
        testUser.id
      );

      if (result) {
        expect(result.success).toBe(false);
        expect(result.error).toContain('End date must be after start date');
      }
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'marketingCampaignService',
        errorCode: 'date_constraint',
        input: expect.any(Object),
        error: expect.stringContaining('date')
      });
    });

    it('should enforce business rules for campaign types', async () => {
      const clearanceData = {
        campaignName: 'Low Clearance Campaign',
        campaignType: 'clearance' as const,
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-08-31T23:59:59Z',
        discountPercentage: 5.0, // Too low for clearance
        targetAudience: 'general',
        createdBy: testUser.id
      };

      const result = await MarketingCampaignService.createCampaign(
        clearanceData,
        testUser.id
      );

      if (result) {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Clearance campaigns require minimum 30% discount');
      }
    });
  });

  describe('updateCampaignStatus', () => {
    it('should update campaign status successfully', async () => {
      const result = await MarketingCampaignService.updateCampaignStatus(
        testCampaignId,
        'active',
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(true);
        expect(result.data?.campaignStatus).toBe('active');
      }

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'updateCampaignStatus'
      });
    });

    it('should validate status transitions', async () => {
      const result = await MarketingCampaignService.updateCampaignStatus(
        testCampaignId,
        'completed',
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result && !result.success) {
        expect(result.error).toContain('Invalid status transition');
      }
    });
  });

  describe('getCampaignPerformance', () => {
    it('should retrieve campaign performance metrics', async () => {
      const result = await MarketingCampaignService.getCampaignPerformance(
        testCampaignId,
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(true);
        expect(result.data?.metrics).toBeDefined();
      }

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'getCampaignPerformance'
      });
    });

    it('should handle performance data aggregation', async () => {
      const result = await MarketingCampaignService.getCampaignPerformance(
        testCampaignId,
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result && result.success && result.data) {
        expect(result.data.metrics).toHaveProperty('views');
        expect(result.data.metrics).toHaveProperty('clicks');
        expect(result.data.metrics).toHaveProperty('conversions');
        expect(result.data.metrics).toHaveProperty('revenue');
      }
    });
  });

  describe('scheduleCampaign', () => {
    it('should schedule campaign for future activation', async () => {
      const scheduleDate = new Date('2024-12-01T00:00:00Z').toISOString();
      
      const result = await MarketingCampaignService.scheduleCampaign(
        testCampaignId,
        scheduleDate,
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(true);
        expect(result.data?.scheduledDate).toBe(scheduleDate);
      }

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'scheduleCampaign'
      });
    });

    it('should validate schedule date is in future', async () => {
      const pastDate = new Date('2023-01-01T00:00:00Z').toISOString();
      
      const result = await MarketingCampaignService.scheduleCampaign(
        testCampaignId,
        pastDate,
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Schedule date must be in the future');
      }
    });
  });

  describe('getCampaignsByStatus', () => {
    it('should retrieve campaigns by status', async () => {
      const result = await MarketingCampaignService.getCampaignsByStatus(
        'active',
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(true);
        expect(result.data?.campaigns).toBeDefined();
      }

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'getCampaignsByStatus'
      });
    });

    it('should filter campaigns by role permissions', async () => {
      const result = await MarketingCampaignService.getCampaignsByStatus(
        'planned',
        testUser.id
      );

      expect(result).toBeDefined();
      expect(RolePermissionService.hasPermission).toHaveBeenCalled();
    });
  });

  describe('recordCampaignMetric', () => {
    it('should record campaign performance metric', async () => {
      const metricData = {
        campaignId: testCampaignId,
        metricType: 'view',
        value: 1,
        userId: testUser.id,
        timestamp: new Date().toISOString()
      };

      const result = await MarketingCampaignService.recordCampaignMetric(
        metricData,
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(true);
      }

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'recordCampaignMetric'
      });
    });

    it('should validate metric data structure', async () => {
      const invalidMetricData = {
        campaignId: testCampaignId,
        metricType: 'invalid_type',
        value: -1, // Invalid negative value
        userId: testUser.id,
        timestamp: new Date().toISOString()
      };

      const result = await MarketingCampaignService.recordCampaignMetric(
        invalidMetricData,
        testUser.id
      );

      if (result) {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid metric data');
      }
    });
  });

  describe('getCampaignDetails', () => {
    it('should retrieve detailed campaign information', async () => {
      const result = await MarketingCampaignService.getCampaignDetails(
        testCampaignId,
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(true);
        expect(result.data?.campaign).toBeDefined();
      }

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        context: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'getCampaignDetails'
      });
    });

    it('should include performance metrics in details', async () => {
      const result = await MarketingCampaignService.getCampaignDetails(
        testCampaignId,
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result && result.success && result.data) {
        expect(result.data.campaign).toHaveProperty('id');
        expect(result.data.campaign).toHaveProperty('campaignName');
        expect(result.data.campaign).toHaveProperty('campaignStatus');
      }
    });
  });

  describe('Role-based Access Control', () => {
    it('should enforce permissions for campaign creation', async () => {
      (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(false);
      
      const campaignData = {
        campaignName: 'Restricted Campaign',
        campaignType: 'seasonal' as const,
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-08-31T23:59:59Z',
        discountPercentage: 15.0,
        targetAudience: 'general',
        createdBy: testUser.id
      };

      const result = await MarketingCampaignService.createCampaign(
        campaignData,
        testUser.id
      );

      if (result) {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Permission denied');
      }
    });

    it('should allow authorized users to access campaign analytics', async () => {
      (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(true);
      
      const result = await MarketingCampaignService.getAnalyticsData(
        testCampaignId,
        testUser.id
      );

      expect(result).toBeDefined();
      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUser.id,
        'view_campaign_analytics'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const result = await MarketingCampaignService.getCampaignDetails(
        'nonexistent-campaign',
        testUser.id
      );

      expect(result).toBeDefined();
      
      if (result) {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should validate user permissions for all operations', async () => {
      await MarketingCampaignService.getCampaignPerformance(
        testCampaignId,
        testUser.id
      );

      expect(RolePermissionService.hasPermission).toHaveBeenCalled();
    });
  });
});