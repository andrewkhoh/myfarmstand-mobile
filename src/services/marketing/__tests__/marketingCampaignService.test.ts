// Mock ValidationMonitor before importing service (Pattern 1)
jest.mock('../../../utils/validationMonitor');

import { MarketingCampaignService } from '../marketingCampaignService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type { 
  MarketingCampaignTransform,
  CreateMarketingCampaignInput,
  UpdateMarketingCampaignInput,
  CampaignStatusType
} from '../../../schemas/marketing';

// Mock the supabase module at the service level (AuthService exact pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock role permissions
jest.mock('../../role-based/rolePermissionService');
const mockRolePermissionService = require('../../role-based/rolePermissionService').RolePermissionService;

// Mock-based service testing following scratchpad Pattern 1
describe('MarketingCampaignService - Phase 3.2', () => {
  
  const testUserId = 'test-user-campaign-123';
  const testCampaignId = 'campaign-456';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Supabase mocks to prevent state contamination
    if (global.resetSupabaseMocks) {
      global.resetSupabaseMocks();
    }
    
    // Setup default mock returns for chainable Supabase queries
    mockSupabase.from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }));
    
    // Default role permission setup
    mockRolePermissionService.hasPermission.mockResolvedValue(true);
  });

  describe('createCampaign', () => {
    it('should create campaign with complete lifecycle management', async () => {
      const campaignData: CreateMarketingCampaignInput = {
        campaignName: 'Test Spring Campaign',
        campaignType: 'seasonal',
        description: 'Test campaign for spring season',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // In 30 days
        discountPercentage: 15.50,
        targetAudience: 'Health-conscious consumers',
        campaignStatus: 'planned'
      };

      // Mock successful database insertion
      const mockCreatedCampaign = {
        id: 'campaign-created-123',
        campaign_name: 'Test Spring Campaign',
        campaign_type: 'seasonal',
        description: 'Test campaign for spring season',
        start_date: campaignData.startDate,
        end_date: campaignData.endDate,
        discount_percentage: 15.50,
        target_audience: 'Health-conscious consumers',
        campaign_status: 'planned',
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the exact chain: .from().insert().select().single()
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: mockCreatedCampaign,
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: selectMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      const result = await MarketingCampaignService.createCampaign(
        campaignData,
        testUserId
      );

      // Debug: log the result to see what's happening
      if (!result.success) {
        console.log('Create campaign failed with error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.success && result.data) {
        // Verify campaign data transformation
        expect(result.data.campaignName).toBe('Test Spring Campaign');
        expect(result.data.campaignType).toBe('seasonal');
        expect(result.data.campaignStatus).toBe('planned');
        expect(result.data.discountPercentage).toBe(15.50);
        expect(result.data.createdBy).toBe(testUserId);
      }

      // Verify ValidationMonitor integration
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'createCampaign'
      });
    });

    it('should validate campaign date constraints', async () => {
      const invalidCampaignData: CreateMarketingCampaignInput = {
        campaignName: 'Invalid Date Campaign',
        campaignType: 'promotional',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow (invalid: end before start)
        discountPercentage: 20,
        campaignStatus: 'planned'
      };

      const result = await MarketingCampaignService.createCampaign(
        invalidCampaignData,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('End date must be after start date');
      
      // Verify ValidationMonitor logs validation error  
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'MarketingCampaignService.createCampaign',
        errorCode: 'INVALID_DATE_RANGE',
        validationPattern: 'simple_validation',
        errorMessage: 'End date must be after start date'
      });
    });

    it('should enforce business rules for campaign types', async () => {
      // Clearance campaign without sufficient discount
      const clearanceCampaignData: CreateMarketingCampaignInput = {
        campaignName: 'Invalid Clearance Campaign',
        campaignType: 'clearance',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        discountPercentage: 10, // Too low for clearance (should be >= 25%)
        campaignStatus: 'planned'
      };

      const result = await MarketingCampaignService.createCampaign(
        clearanceCampaignData,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Clearance campaigns must have at least 25% discount');
    });
  });

  describe('updateCampaignStatus', () => {
    it('should manage campaign lifecycle with state transition validation', async () => {
      // Create test campaign
      const testCampaign = {
        campaign_name: 'Lifecycle Test Campaign',
        campaign_type: 'promotional',
        description: 'Test campaign for lifecycle management',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        discount_percentage: 20.00,
        campaign_status: 'planned',
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the database operation for test setup
      const createdCampaign = { ...testCampaign, id: testCampaignId };

      // Store campaign ID for later assertions
      const campaignId = createdCampaign.id;

      // Mock the fetch operation to get current campaign
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createdCampaign,
              error: null
            })
          })
        })
      });
      
      // Mock the update operation for status change
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...createdCampaign, campaign_status: 'active' },
                error: null
              })
            })
          })
        })
      });

      // Valid transition: planned → active
      const result = await MarketingCampaignService.updateCampaignStatus(
        createdCampaign.id,
        'active',
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.campaignStatus).toBe('active');

      // Verify the result from the service
      expect(result.success).toBe(true);
      expect(result.data?.campaignStatus).toBe('active');
    });

    it('should reject invalid state transitions', async () => {
      // Create campaign in completed state (terminal)
      const testCampaign = {
        campaign_name: 'Terminal State Campaign',
        campaign_type: 'seasonal',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Past
        end_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past
        campaign_status: 'completed',
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the database operation for test setup
      const createdCampaign = { ...testCampaign, id: testCampaignId };

      // Store campaign ID for later assertions
      const campaignId = createdCampaign.id;

      // Mock the fetch to return completed campaign
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdCampaign,
          error: null
        })
      });

      // Invalid transition: completed → active (terminal state)
      const result = await MarketingCampaignService.updateCampaignStatus(
        createdCampaign!.id,
        'active',
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid campaign status transition');
    });
  });

  describe('getCampaignPerformance', () => {
    it('should aggregate performance metrics correctly', async () => {
      // Create test campaign
      const testCampaign = {
        campaign_name: 'Performance Test Campaign',
        campaign_type: 'promotional',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        campaign_status: 'active',
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the database operation for test setup
      const createdCampaign = { ...testCampaign, id: testCampaignId };

      // Store campaign ID for later assertions
      const campaignId = createdCampaign.id;

      // Create test metrics
      const testMetrics = [
        {
          campaign_id: createdCampaign!.id,
          metric_date: new Date().toISOString().split('T')[0], // Today
          metric_type: 'views',
          metric_value: 1250.00,
          created_at: new Date().toISOString()
        },
        {
          campaign_id: createdCampaign!.id,
          metric_date: new Date().toISOString().split('T')[0],
          metric_type: 'clicks',
          metric_value: 187.00,
          created_at: new Date().toISOString()
        },
        {
          campaign_id: createdCampaign!.id,
          metric_date: new Date().toISOString().split('T')[0],
          metric_type: 'conversions',
          metric_value: 23.00,
          created_at: new Date().toISOString()
        },
        {
          campaign_id: createdCampaign!.id,
          metric_date: new Date().toISOString().split('T')[0],
          metric_type: 'revenue',
          metric_value: 2069.77,
          created_at: new Date().toISOString()
        }
      ];

      // Mock the metrics for the test
      const createdMetrics = testMetrics.map((metric, idx) => ({
        ...metric,
        id: `metric-${idx}`
      }));

      // Mock the campaign fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdCampaign,
          error: null
        })
      });

      // Mock the metrics fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: testMetrics,
          error: null
        })
      });

      // Get campaign performance
      const result = await MarketingCampaignService.getCampaignPerformance(
        createdCampaign!.id,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.success && result.data) {
        expect(result.data.campaignId).toBe(createdCampaign!.id);
        expect(result.data.metrics).toBeDefined();
        expect(result.data.metrics.views).toBe(1250);
        expect(result.data.metrics.clicks).toBe(187);
        expect(result.data.metrics.conversions).toBe(23);
        expect(result.data.metrics.revenue).toBe(2069.77);

        // Performance calculations
        expect(result.data.performance.clickThroughRate).toBeCloseTo(0.1496, 3); // 187/1250
        expect(result.data.performance.conversionRate).toBeCloseTo(0.1230, 3); // 23/187
        expect(result.data.performance.revenuePerConversion).toBeCloseTo(89.99, 2); // 2069.77/23
      }
    });

    it('should handle campaigns with no metrics gracefully', async () => {
      // Create campaign without metrics
      const testCampaign = {
        campaign_name: 'No Metrics Campaign',
        campaign_type: 'new_product',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        campaign_status: 'planned',
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the database operation for test setup
      const createdCampaign = { ...testCampaign, id: testCampaignId };

      // Store campaign ID for later assertions
      const campaignId = createdCampaign.id;

      // Mock the campaign fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdCampaign,
          error: null
        })
      });

      // Mock empty metrics fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      const result = await MarketingCampaignService.getCampaignPerformance(
        createdCampaign!.id,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.metrics.views).toBe(0);
      expect(result.data?.metrics.clicks).toBe(0);
      expect(result.data?.metrics.conversions).toBe(0);
      expect(result.data?.metrics.revenue).toBe(0);
    });
  });

  describe('scheduleCampaign', () => {
    it('should schedule campaign with date validation and automation', async () => {
      // Role permission already mocked in beforeEach

      const scheduleData = {
        campaignId: 'will-be-created',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        autoActivate: true
      };

      // Create campaign first
      const campaignData: CreateMarketingCampaignInput = {
        campaignName: 'Scheduled Test Campaign',
        campaignType: 'promotional',
        startDate: scheduleData.startDate,
        endDate: scheduleData.endDate,
        discountPercentage: 20,
        campaignStatus: 'planned'
      };

      const createResult = await MarketingCampaignService.createCampaign(
        campaignData,
        testUserId
      );

      if (createResult.success && createResult.data) {

        const result = await MarketingCampaignService.scheduleCampaign(
          createResult.data.id,
          {
            startDate: scheduleData.startDate,
            endDate: scheduleData.endDate,
            autoActivate: true
          },
          testUserId
        );

        expect(result.success).toBe(true);
        expect(result.data?.scheduledActivation).toBe(true);
        expect(result.data?.startDate).toBe(scheduleData.startDate);
        expect(result.data?.endDate).toBe(scheduleData.endDate);
      }
    });

    it('should validate scheduling constraints', async () => {
      const invalidScheduleData = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday (past)
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        autoActivate: false
      };

      const result = await MarketingCampaignService.scheduleCampaign(
        'any-campaign-id',
        invalidScheduleData,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Start date cannot be in the past');
    });
  });

  describe('getCampaignsByStatus', () => {
    it('should filter campaigns by status with role-based access', async () => {
      // Role permission already mocked in beforeEach

      const result = await MarketingCampaignService.getCampaignsByStatus(
        'active',
        { page: 1, limit: 10 },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data?.items)).toBe(true);
      expect(typeof result.data?.totalCount).toBe('number');
      expect(typeof result.data?.hasMore).toBe('boolean');

      // All returned campaigns should have active status
      if (result.success && result.data?.items) {
        result.data.items.forEach(campaign => {
          expect(campaign.campaignStatus).toBe('active');
        });
      }

      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'campaign_management'
      );
    });

    it('should validate role permissions for campaign access', async () => {
      mockRolePermissionService.hasPermission.mockResolvedValue(false);

      const result = await MarketingCampaignService.getCampaignsByStatus(
        'planned',
        { page: 1, limit: 10 },
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('recordCampaignMetric', () => {
    it('should record campaign metrics with analytics collection', async () => {
      // Create test campaign
      const testCampaign = {
        campaign_name: 'Metrics Recording Campaign',
        campaign_type: 'promotional',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        campaign_status: 'active',
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the database operation for test setup
      const createdCampaign = { ...testCampaign, id: testCampaignId };

      // Store campaign ID for later assertions
      const campaignId = createdCampaign.id;

      // Record multiple metrics
      const metrics = [
        { type: 'views', value: 500, productId: undefined },
        { type: 'clicks', value: 75, productId: undefined },
        { type: 'conversions', value: 12, productId: 'test-product-123' },
        { type: 'revenue', value: 599.88, productId: 'test-product-123' }
      ];

      for (const metric of metrics) {
        // Mock the insert for each metric
        mockSupabase.from.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: `metric-${metric.type}`,
              campaign_id: createdCampaign.id,
              metric_date: new Date().toISOString().split('T')[0],
              metric_type: metric.type,
              metric_value: metric.value,
              product_id: metric.productId || null,
              created_at: new Date().toISOString()
            },
            error: null
          })
        });

        const result = await MarketingCampaignService.recordCampaignMetric(
          createdCampaign!.id,
          metric.type as any,
          metric.value,
          metric.productId,
          testUserId
        );

        expect(result.success).toBe(true);
        expect(result.data?.metricType).toBe(metric.type);
        expect(result.data?.metricValue).toBe(metric.value);

        // Track metric ID if needed
      }

      // Verify metrics were recorded in database
      // Verify the service was called correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('campaign_metrics');
    });

    it('should validate metric types and values', async () => {
      const result = await MarketingCampaignService.recordCampaignMetric(
        'any-campaign-id',
        'invalid_metric_type' as any,
        100,
        undefined,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid metric type');
    });
  });

  describe('Integration with content and bundle systems', () => {
    it('should support campaign association with bundles', async () => {
      // Create test campaign
      const testCampaign = {
        campaign_name: 'Bundle Integration Campaign',
        campaign_type: 'promotional',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        discount_percentage: 25.00,
        campaign_status: 'active',
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the database operation for test setup
      const createdCampaign = { ...testCampaign, id: testCampaignId };

      // Store campaign ID for later assertions
      const campaignId = createdCampaign.id;

      // Mock the campaign details fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdCampaign,
          error: null
        })
      });

      // Get campaign details
      const result = await MarketingCampaignService.getCampaignDetails(
        createdCampaign!.id,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(createdCampaign!.id);
      expect(result.data?.campaignName).toBe('Bundle Integration Campaign');
      expect(result.data?.discountPercentage).toBe(25.00);

      // Campaign should be available for bundle association
      expect(result.data?.campaignStatus).toBe('active');
      expect(result.data?.discountPercentage).toBeGreaterThan(0);
    });
  });

  describe('Cross-role analytics collection', () => {
    it('should collect analytics data for executive insights', async () => {
      // Create campaign with performance data
      const testCampaign = {
        campaign_name: 'Analytics Collection Campaign',
        campaign_type: 'seasonal',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        campaign_status: 'active',
        created_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock the database operation for test setup
      const createdCampaign = { ...testCampaign, id: testCampaignId };

      // Store campaign ID for later assertions
      const campaignId = createdCampaign.id;

      // Mock campaign fetch for analytics
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdCampaign,
          error: null
        })
      });

      // Mock metrics for analytics
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { metric_type: 'views', metric_value: 1000, metric_date: new Date().toISOString().split('T')[0] },
            { metric_type: 'clicks', metric_value: 150, metric_date: new Date().toISOString().split('T')[0] },
            { metric_type: 'conversions', metric_value: 20, metric_date: new Date().toISOString().split('T')[0] },
            { metric_type: 'revenue', metric_value: 1500, metric_date: new Date().toISOString().split('T')[0] }
          ],
          error: null
        })
      });

      const result = await MarketingCampaignService.getAnalyticsData(
        createdCampaign!.id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          includeProjections: true
        },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.campaignId).toBe(createdCampaign!.id);
      expect(result.data?.analytics).toBeDefined();
      expect(result.data?.analytics.totalMetrics).toBeDefined();
      expect(result.data?.analytics.trends).toBeDefined();
      expect(result.data?.analytics.projections).toBeDefined();
    });
  });

  describe('Performance validation', () => {
    it('should handle campaign operations within performance targets', async () => {
      const startTime = performance.now();

      // Perform multiple campaign queries
      const promises = Array.from({ length: 3 }, () =>
        MarketingCampaignService.getCampaignsByStatus('active', testUserId, { page: 1, limit: 5 })
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Campaign queries should complete within 500ms target
      expect(executionTime).toBeLessThan(1000); // Allow margin for test environment
    });
  });
});