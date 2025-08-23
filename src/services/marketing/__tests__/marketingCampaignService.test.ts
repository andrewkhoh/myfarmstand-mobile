import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { createUser, resetAllFactories } from '../../../test/factories';
import { MarketingCampaignService } from '../marketingCampaignService';
import type { 
  CreateMarketingCampaignInput,
  UpdateMarketingCampaignInput,
  CampaignStatusType
} from '../../../schemas/marketing';

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const { ValidationMonitor } = require('../../../utils/validationMonitor');

// Mock role permissions
jest.mock('../../role-based/rolePermissionService');
const { RolePermissionService } = require('../../role-based/rolePermissionService');

// Mock Supabase
jest.mock('../../../config/supabase');
const { supabase } = require('../../../config/supabase');

describe('MarketingCampaignService', () => {
  const testUser = createUser();
  
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    
    // Reset to simplified mock
    const mockClient = createSupabaseMock();
    Object.assign(supabase, mockClient);
    
    // Default role permission setup
    RolePermissionService.hasPermission.mockResolvedValue(true);
  });

  describe('createCampaign', () => {
    it('should create campaign with complete lifecycle management', async () => {
      const campaignData: CreateMarketingCampaignInput = {
        campaignName: 'Test Spring Campaign',
        campaignType: 'seasonal',
        description: 'Test campaign for spring season',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        discountPercentage: 15.50,
        targetAudience: 'Health-conscious consumers',
        campaignStatus: 'planned'
      };

      // Setup mock data
      const mockClient = createSupabaseMock({
        marketing_campaigns: [{
          id: 'campaign-created-123',
          campaign_name: 'Test Spring Campaign',
          campaign_type: 'seasonal',
          description: 'Test campaign for spring season',
          start_date: campaignData.startDate,
          end_date: campaignData.endDate,
          discount_percentage: 15.50,
          target_audience: 'Health-conscious consumers',
          campaign_status: 'planned',
          created_by: testUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.createCampaign(
        campaignData,
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.data?.campaignName).toBe('Test Spring Campaign');
      expect(result.data?.campaignType).toBe('seasonal');
      expect(result.data?.discountPercentage).toBe(15.50);

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
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Before start
        discountPercentage: 20,
        campaignStatus: 'planned'
      };

      const result = await MarketingCampaignService.createCampaign(
        invalidCampaignData,
        testUser.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('End date must be after start date');
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'MarketingCampaignService.createCampaign',
        errorCode: 'INVALID_DATE_RANGE',
        validationPattern: 'simple_validation',
        errorMessage: 'End date must be after start date'
      });
    });

    it('should enforce business rules for campaign types', async () => {
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
        testUser.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Clearance campaigns must have at least 25% discount');
    });
  });

  describe('updateCampaignStatus', () => {
    it('should manage campaign lifecycle with state transition validation', async () => {
      const testCampaign = {
        id: 'campaign-456',
        campaign_name: 'Lifecycle Test Campaign',
        campaign_type: 'promotional',
        description: 'Test campaign for lifecycle management',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        discount_percentage: 20.00,
        campaign_status: 'planned',
        created_by: testUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockClient = createSupabaseMock({
        marketing_campaigns: [testCampaign]
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.updateCampaignStatus(
        testCampaign.id,
        'active',
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.data?.campaignStatus).toBe('active');
    });

    it('should reject invalid state transitions', async () => {
      const completedCampaign = {
        id: 'campaign-completed',
        campaign_name: 'Terminal State Campaign',
        campaign_type: 'seasonal',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        campaign_status: 'completed',
        created_by: testUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockClient = createSupabaseMock({
        marketing_campaigns: [completedCampaign]
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.updateCampaignStatus(
        completedCampaign.id,
        'active',
        testUser.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid campaign status transition');
    });
  });

  describe('getCampaignPerformance', () => {
    it('should aggregate performance metrics correctly', async () => {
      const testCampaign = {
        id: 'campaign-performance',
        campaign_name: 'Performance Test Campaign',
        campaign_type: 'promotional',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        campaign_status: 'active',
        created_by: testUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const testMetrics = [
        {
          id: 'metric-1',
          campaign_id: testCampaign.id,
          metric_date: new Date().toISOString().split('T')[0],
          metric_type: 'views',
          metric_value: 1250.00,
          created_at: new Date().toISOString()
        },
        {
          id: 'metric-2',
          campaign_id: testCampaign.id,
          metric_date: new Date().toISOString().split('T')[0],
          metric_type: 'clicks',
          metric_value: 187.00,
          created_at: new Date().toISOString()
        },
        {
          id: 'metric-3',
          campaign_id: testCampaign.id,
          metric_date: new Date().toISOString().split('T')[0],
          metric_type: 'conversions',
          metric_value: 23.00,
          created_at: new Date().toISOString()
        },
        {
          id: 'metric-4',
          campaign_id: testCampaign.id,
          metric_date: new Date().toISOString().split('T')[0],
          metric_type: 'revenue',
          metric_value: 2069.77,
          created_at: new Date().toISOString()
        }
      ];

      const mockClient = createSupabaseMock({
        marketing_campaigns: [testCampaign],
        campaign_metrics: testMetrics
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.getCampaignPerformance(
        testCampaign.id,
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.data?.campaignId).toBe(testCampaign.id);
      expect(result.data?.metrics.views).toBe(1250);
      expect(result.data?.metrics.clicks).toBe(187);
      expect(result.data?.metrics.conversions).toBe(23);
      expect(result.data?.metrics.revenue).toBe(2069.77);
    });

    it('should handle campaigns with no metrics gracefully', async () => {
      const testCampaign = {
        id: 'campaign-no-metrics',
        campaign_name: 'No Metrics Campaign',
        campaign_type: 'new_product',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        campaign_status: 'planned',
        created_by: testUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockClient = createSupabaseMock({
        marketing_campaigns: [testCampaign],
        campaign_metrics: [] // No metrics
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.getCampaignPerformance(
        testCampaign.id,
        testUser.id
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
      const scheduleData = {
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoActivate: true
      };

      const testCampaign = {
        id: 'campaign-scheduled',
        campaign_name: 'Scheduled Test Campaign',
        campaign_type: 'promotional',
        start_date: scheduleData.startDate,
        end_date: scheduleData.endDate,
        discount_percentage: 20,
        campaign_status: 'planned',
        created_by: testUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockClient = createSupabaseMock({
        marketing_campaigns: [testCampaign]
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.scheduleCampaign(
        testCampaign.id,
        {
          startDate: scheduleData.startDate,
          endDate: scheduleData.endDate,
          autoActivate: true
        },
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.data?.scheduledActivation).toBe(true);
      expect(result.data?.startDate).toBe(scheduleData.startDate);
    });

    it('should validate scheduling constraints', async () => {
      const invalidScheduleData = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        autoActivate: false
      };

      const result = await MarketingCampaignService.scheduleCampaign(
        'any-campaign-id',
        invalidScheduleData,
        testUser.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Start date cannot be in the past');
    });
  });

  describe('getCampaignsByStatus', () => {
    it('should filter campaigns by status with role-based access', async () => {
      const activeCampaigns = [
        {
          id: 'campaign-active-1',
          campaign_name: 'Active Campaign 1',
          campaign_type: 'promotional',
          campaign_status: 'active',
          created_by: testUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'campaign-active-2', 
          campaign_name: 'Active Campaign 2',
          campaign_type: 'seasonal',
          campaign_status: 'active',
          created_by: testUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const mockClient = createSupabaseMock({
        marketing_campaigns: activeCampaigns
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.getCampaignsByStatus(
        'active',
        { page: 1, limit: 10 },
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.items)).toBe(true);
      expect(result.data?.items.every(c => c.campaignStatus === 'active')).toBe(true);
      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUser.id,
        'campaign_management'
      );
    });

    it('should validate role permissions for campaign access', async () => {
      RolePermissionService.hasPermission.mockResolvedValue(false);

      const result = await MarketingCampaignService.getCampaignsByStatus(
        'planned',
        { page: 1, limit: 10 },
        testUser.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('recordCampaignMetric', () => {
    it('should record campaign metrics with analytics collection', async () => {
      const testCampaign = {
        id: 'campaign-metrics',
        campaign_name: 'Metrics Recording Campaign',
        campaign_type: 'promotional',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        campaign_status: 'active',
        created_by: testUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockClient = createSupabaseMock({
        marketing_campaigns: [testCampaign],
        campaign_metrics: []
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.recordCampaignMetric(
        testCampaign.id,
        'views',
        500,
        undefined,
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.data?.metricType).toBe('views');
      expect(result.data?.metricValue).toBe(500);
    });

    it('should validate metric types and values', async () => {
      const result = await MarketingCampaignService.recordCampaignMetric(
        'any-campaign-id',
        'invalid_metric_type' as any,
        100,
        undefined,
        testUser.id
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
        testCampaign.id,
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(testCampaign.id);
      expect(result.data?.campaignName).toBe('Bundle Integration Campaign');
      expect(result.data?.discountPercentage).toBe(25.00);

      // Campaign should be available for bundle association
      expect(result.data?.campaignStatus).toBe('active');
      expect(result.data?.discountPercentage).toBeGreaterThan(0);
    });
  });

  describe('Cross-role analytics collection', () => {
    it('should collect analytics data for executive insights', async () => {
      const testCampaign = {
        id: 'campaign-analytics',
        campaign_name: 'Analytics Collection Campaign',
        campaign_type: 'seasonal',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        campaign_status: 'active',
        created_by: testUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const analyticsMetrics = [
        { id: 'm1', metric_type: 'views', metric_value: 1000, metric_date: new Date().toISOString().split('T')[0] },
        { id: 'm2', metric_type: 'clicks', metric_value: 150, metric_date: new Date().toISOString().split('T')[0] },
        { id: 'm3', metric_type: 'conversions', metric_value: 20, metric_date: new Date().toISOString().split('T')[0] },
        { id: 'm4', metric_type: 'revenue', metric_value: 1500, metric_date: new Date().toISOString().split('T')[0] }
      ];

      const mockClient = createSupabaseMock({
        marketing_campaigns: [testCampaign],
        campaign_metrics: analyticsMetrics
      });
      Object.assign(supabase, mockClient);

      const result = await MarketingCampaignService.getAnalyticsData(
        testCampaign.id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          includeProjections: true
        },
        testUser.id
      );

      expect(result.success).toBe(true);
      expect(result.data?.campaignId).toBe(testCampaign.id);
      expect(result.data?.analytics).toBeDefined();
    });
  });

  describe('Performance validation', () => {
    it('should handle campaign operations within performance targets', async () => {
      const mockClient = createSupabaseMock({
        marketing_campaigns: []
      });
      Object.assign(supabase, mockClient);

      const startTime = performance.now();

      const promises = Array.from({ length: 3 }, () =>
        MarketingCampaignService.getCampaignsByStatus('active', { page: 1, limit: 5 }, testUser.id)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000);
    });
  });
});