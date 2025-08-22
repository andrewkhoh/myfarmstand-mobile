// Phase 3.4.2: Campaign Management Integration Tests (RED Phase)
// Following TDD pattern: RED → GREEN → REFACTOR
// 12+ comprehensive tests for campaign management workflow integration

import { MarketingCampaignService } from '../marketingCampaignService';
import { ProductContentService } from '../productContentService';
import { ProductBundleService } from '../productBundleService';
import { RolePermissionService } from '../../role-based/rolePermissionService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type {
  MarketingCampaignTransform,
  CreateMarketingCampaignInput,
  CampaignStatusType,
  CampaignTypeType
} from '../../../schemas/marketing';

// Mock external services for isolated testing
jest.mock('../../role-based/rolePermissionService');
jest.mock('../../../utils/validationMonitor');
jest.mock('../productContentService');
jest.mock('../productBundleService');

const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;
const mockProductContentService = ProductContentService as jest.Mocked<typeof ProductContentService>;
const mockProductBundleService = ProductBundleService as jest.Mocked<typeof ProductBundleService>;

describe('Campaign Management Integration - Phase 3.4.2 (RED Phase)', () => {
  const testUserId = 'test-user-123';
  const testCampaignId = 'campaign-456';
  const testContentId = 'content-789';
  const testBundleId = 'bundle-012';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default role permission setup
    mockRolePermissionService.hasPermission.mockResolvedValue(true);
    mockValidationMonitor.recordPatternSuccess.mockImplementation(() => {});
    mockValidationMonitor.recordValidationError.mockImplementation(() => {});
  });

  describe('Campaign Creation → Content Association → Performance Tracking Flow', () => {
    test('should execute complete campaign lifecycle with content integration', async () => {
      // This test will fail until campaign-content integration is implemented
      
      // Step 1: Create marketing campaign
      const campaignInput: CreateMarketingCampaignInput = {
        campaignName: 'Summer Promotion 2024',
        campaignType: 'seasonal' as CampaignTypeType,
        description: 'Summer seasonal promotion with content and bundles',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        discountPercentage: 25
      };

      const campaignResult = await MarketingCampaignService.createCampaign(
        campaignInput,
        testUserId
      );
      expect(campaignResult.success).toBe(true);
      expect(campaignResult.data?.campaignStatus).toBe('draft');

      const campaignId = campaignResult.data!.id;

      // Step 2: Associate content with campaign
      mockProductContentService.associateContentWithCampaign.mockResolvedValue({
        success: true,
        data: {
          campaignId,
          contentIds: [testContentId],
          associatedAt: new Date().toISOString()
        }
      });

      const contentAssociation = await ProductContentService.associateContentWithCampaign(
        campaignId,
        [testContentId],
        testUserId
      );
      expect(contentAssociation.success).toBe(true);

      // Step 3: Associate bundle with campaign
      mockProductBundleService.associateBundleWithCampaign.mockResolvedValue({
        success: true,
        data: {
          campaignId,
          bundleIds: [testBundleId],
          associatedAt: new Date().toISOString()
        }
      });

      const bundleAssociation = await ProductBundleService.associateBundleWithCampaign(
        campaignId,
        [testBundleId],
        testUserId
      );
      expect(bundleAssociation.success).toBe(true);

      // Step 4: Activate campaign
      const activationResult = await MarketingCampaignService.updateCampaignStatus(
        campaignId,
        'active' as CampaignStatusType,
        testUserId
      );
      expect(activationResult.success).toBe(true);
      expect(activationResult.data?.campaignStatus).toBe('active');

      // Step 5: Track campaign performance
      const performanceResult = await MarketingCampaignService.getCampaignPerformance(
        campaignId
      );
      expect(performanceResult.success).toBe(true);
      expect(performanceResult.data?.campaignId).toBe(campaignId);

      // Verify cross-system integration was tracked
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: expect.stringContaining('MarketingCampaignService'),
        pattern: 'transformation_schema',
        operation: expect.stringContaining('create')
      });
    });

    test('should handle campaign-content association failures gracefully', async () => {
      // Create campaign first
      const campaignInput: CreateMarketingCampaignInput = {
        campaignName: 'Failed Association Test',
        campaignType: 'promotional' as CampaignTypeType,
        description: 'Testing association failure handling'
      };

      const campaignResult = await MarketingCampaignService.createCampaign(
        campaignInput,
        testUserId
      );
      expect(campaignResult.success).toBe(true);

      const campaignId = campaignResult.data!.id;

      // Mock content association failure
      mockProductContentService.associateContentWithCampaign.mockResolvedValue({
        success: false,
        error: 'Content not found or insufficient permissions'
      });

      const contentAssociation = await ProductContentService.associateContentWithCampaign(
        campaignId,
        ['non-existent-content'],
        testUserId
      );

      expect(contentAssociation.success).toBe(false);
      expect(contentAssociation.error).toContain('Content not found');

      // Verify campaign remains in valid state despite association failure
      const campaignCheck = await MarketingCampaignService.getCampaign(campaignId, testUserId);
      expect(campaignCheck.success).toBe(true);
      expect(campaignCheck.data?.campaignStatus).toBe('draft');
    });

    test('should validate campaign performance metrics integration', async () => {
      // Test will fail until performance tracking integration is implemented
      const campaignId = testCampaignId;

      // Mock performance data with cross-system metrics
      const mockPerformanceData = {
        campaignId,
        metrics: {
          views: 1250,
          clicks: 89,
          conversions: 12,
          revenue: 340.50
        },
        performance: {
          clickThroughRate: 7.12,
          conversionRate: 13.48,
          revenuePerConversion: 28.38,
          totalROI: 145.2
        },
        contentMetrics: {
          contentViews: 980,
          contentShares: 23,
          engagementRate: 12.4
        },
        bundleMetrics: {
          bundleSales: 8,
          bundleRevenue: 240.00,
          averageBundleValue: 30.00
        },
        dateRange: {
          startDate: '2024-06-01',
          endDate: '2024-06-30'
        }
      };

      // Mock the enhanced performance method
      const performanceResult = await MarketingCampaignService.getCampaignPerformanceWithCrossMetrics(
        campaignId
      );

      expect(performanceResult.success).toBe(true);
      expect(performanceResult.data?.metrics).toBeTruthy();
      expect(performanceResult.data?.contentMetrics).toBeTruthy();
      expect(performanceResult.data?.bundleMetrics).toBeTruthy();
      expect(performanceResult.data?.performance.totalROI).toBeGreaterThan(100);
    });
  });

  describe('Campaign Lifecycle Management with Status Transitions', () => {
    test('should enforce campaign lifecycle validation rules', async () => {
      // Test will fail until lifecycle validation is implemented
      const campaignInput: CreateMarketingCampaignInput = {
        campaignName: 'Lifecycle Test Campaign',
        campaignType: 'clearance' as CampaignTypeType,
        description: 'Testing campaign lifecycle management'
      };

      const campaignResult = await MarketingCampaignService.createCampaign(
        campaignInput,
        testUserId
      );
      const campaignId = campaignResult.data!.id;

      // Test valid lifecycle transitions
      const validTransitions: Array<{
        from: CampaignStatusType;
        to: CampaignStatusType;
        shouldSucceed: boolean;
      }> = [
        { from: 'draft', to: 'active', shouldSucceed: true },
        { from: 'active', to: 'paused', shouldSucceed: true },
        { from: 'paused', to: 'active', shouldSucceed: true },
        { from: 'active', to: 'completed', shouldSucceed: true },
        { from: 'draft', to: 'completed', shouldSucceed: false }, // Invalid: skip active
        { from: 'completed', to: 'active', shouldSucceed: false }, // Invalid: reactivate completed
      ];

      for (const transition of validTransitions) {
        const result = await MarketingCampaignService.updateCampaignStatus(
          campaignId,
          transition.to,
          testUserId
        );

        if (transition.shouldSucceed) {
          expect(result.success).toBe(true);
          expect(result.data?.campaignStatus).toBe(transition.to);
        } else {
          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid status transition');
        }
      }
    });

    test('should handle campaign scheduling with date validation', async () => {
      const campaignInput: CreateMarketingCampaignInput = {
        campaignName: 'Scheduled Campaign',
        campaignType: 'promotional' as CampaignTypeType,
        description: 'Testing campaign scheduling',
        startDate: '2024-12-01',
        endDate: '2024-12-31'
      };

      const campaignResult = await MarketingCampaignService.createCampaign(
        campaignInput,
        testUserId
      );
      const campaignId = campaignResult.data!.id;

      // Test campaign scheduling
      const scheduleData = {
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        autoActivate: true
      };

      const scheduleResult = await MarketingCampaignService.scheduleCampaign(
        campaignId,
        scheduleData,
        testUserId
      );

      expect(scheduleResult.success).toBe(true);
      expect(scheduleResult.data?.scheduledActivation).toBe(true);
      expect(scheduleResult.data?.startDate).toBe('2024-12-01');

      // Test invalid date scheduling
      const invalidScheduleData = {
        startDate: '2024-12-31',
        endDate: '2024-12-01', // End before start
        autoActivate: false
      };

      const invalidResult = await MarketingCampaignService.scheduleCampaign(
        campaignId,
        invalidScheduleData,
        testUserId
      );

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('End date must be after start date');
    });

    test('should integrate campaign status changes with bundle system', async () => {
      // Test will fail until bundle integration is implemented
      const campaignId = testCampaignId;

      // Mock bundle integration response
      mockProductBundleService.updateBundlesForCampaignStatus.mockResolvedValue({
        success: true,
        data: {
          updatedBundles: [testBundleId],
          statusChanges: [{
            bundleId: testBundleId,
            oldStatus: 'inactive',
            newStatus: 'active',
            reason: 'Campaign activation'
          }]
        }
      });

      // Activate campaign and verify bundle integration
      const activationResult = await MarketingCampaignService.updateCampaignStatus(
        campaignId,
        'active' as CampaignStatusType,
        testUserId
      );

      expect(activationResult.success).toBe(true);

      // Verify bundle service was called for status sync
      expect(mockProductBundleService.updateBundlesForCampaignStatus).toHaveBeenCalledWith(
        campaignId,
        'active',
        testUserId
      );
    });
  });

  describe('Campaign Metrics Collection and Aggregation', () => {
    test('should record and aggregate campaign metrics in real-time', async () => {
      // Test will fail until real-time metrics collection is implemented
      const campaignId = testCampaignId;

      // Test various metric types
      const metricTests = [
        { type: 'view', value: 1 },
        { type: 'click', value: 1 },
        { type: 'conversion', value: 1 },
        { type: 'revenue', value: 25.99 }
      ];

      for (const metric of metricTests) {
        const recordResult = await MarketingCampaignService.recordCampaignMetric(
          campaignId,
          metric.type,
          metric.value,
          testUserId
        );

        expect(recordResult.success).toBe(true);
      }

      // Test metric aggregation
      const aggregationResult = await MarketingCampaignService.aggregateCampaignMetrics(
        campaignId,
        {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          granularity: 'daily'
        }
      );

      expect(aggregationResult.success).toBe(true);
      expect(aggregationResult.data?.totalViews).toBeGreaterThan(0);
      expect(aggregationResult.data?.totalClicks).toBeGreaterThan(0);
      expect(aggregationResult.data?.totalConversions).toBeGreaterThan(0);
      expect(aggregationResult.data?.totalRevenue).toBeGreaterThan(0);
    });

    test('should handle batch metric recording for performance', async () => {
      const campaignId = testCampaignId;

      // Test batch metric recording
      const batchMetrics = [
        { campaignId, metricType: 'view', value: 50, timestamp: '2024-06-01T10:00:00Z' },
        { campaignId, metricType: 'view', value: 75, timestamp: '2024-06-01T11:00:00Z' },
        { campaignId, metricType: 'click', value: 5, timestamp: '2024-06-01T10:30:00Z' },
        { campaignId, metricType: 'conversion', value: 2, timestamp: '2024-06-01T12:00:00Z' }
      ];

      const batchResult = await MarketingCampaignService.recordBatchCampaignMetrics(
        batchMetrics,
        testUserId
      );

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.recordedCount).toBe(4);
      expect(batchResult.data?.failedCount).toBe(0);

      // Verify performance tracking
      expect(batchResult.data?.processingTime).toBeLessThan(1000); // Under 1 second
    });

    test('should validate metric data and handle errors gracefully', async () => {
      const campaignId = testCampaignId;

      // Test invalid metric data
      const invalidMetrics = [
        { type: 'invalid_type', value: 10 }, // Invalid metric type
        { type: 'revenue', value: -50 }, // Negative revenue
        { type: 'view', value: 'not_a_number' as any }, // Invalid value type
      ];

      for (const metric of invalidMetrics) {
        const result = await MarketingCampaignService.recordCampaignMetric(
          campaignId,
          metric.type,
          metric.value,
          testUserId
        );

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      }

      // Verify validation monitoring
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: expect.stringContaining('metric'),
        errorCode: expect.stringContaining('INVALID'),
        validationPattern: 'direct_schema',
        errorMessage: expect.stringContaining('validation')
      });
    });
  });

  describe('Integration with Content and Bundle Systems', () => {
    test('should coordinate campaign activation with content publishing', async () => {
      // Test will fail until content-campaign coordination is implemented
      const campaignId = testCampaignId;

      // Mock content service coordination
      mockProductContentService.activateContentForCampaign.mockResolvedValue({
        success: true,
        data: {
          activatedContent: [testContentId],
          publishedContent: [testContentId],
          scheduledContent: []
        }
      });

      // Activate campaign and verify content coordination
      const activationResult = await MarketingCampaignService.activateCampaignWithContent(
        campaignId,
        testUserId
      );

      expect(activationResult.success).toBe(true);
      expect(activationResult.data?.campaignStatus).toBe('active');
      expect(activationResult.data?.associatedContent?.length).toBeGreaterThan(0);

      // Verify content service integration
      expect(mockProductContentService.activateContentForCampaign).toHaveBeenCalledWith(
        campaignId,
        testUserId
      );
    });

    test('should handle campaign-bundle discount synchronization', async () => {
      const campaignId = testCampaignId;

      // Mock bundle discount synchronization
      mockProductBundleService.syncBundleDiscountsWithCampaign.mockResolvedValue({
        success: true,
        data: {
          updatedBundles: [testBundleId],
          discountChanges: [{
            bundleId: testBundleId,
            oldDiscount: 10,
            newDiscount: 25,
            effectiveDate: '2024-06-01'
          }]
        }
      });

      // Update campaign discount and verify bundle sync
      const discountUpdate = await MarketingCampaignService.updateCampaignDiscount(
        campaignId,
        25, // New discount percentage
        testUserId
      );

      expect(discountUpdate.success).toBe(true);

      // Verify bundle service integration
      expect(mockProductBundleService.syncBundleDiscountsWithCampaign).toHaveBeenCalledWith(
        campaignId,
        25,
        testUserId
      );
    });

    test('should aggregate cross-system performance data', async () => {
      // Test will fail until cross-system aggregation is implemented
      const campaignId = testCampaignId;

      // Mock cross-system performance data
      mockProductContentService.getContentPerformanceForCampaign.mockResolvedValue({
        success: true,
        data: {
          campaignId,
          contentMetrics: {
            totalViews: 1200,
            totalShares: 45,
            engagementRate: 8.5
          }
        }
      });

      mockProductBundleService.getBundlePerformanceForCampaign.mockResolvedValue({
        success: true,
        data: {
          campaignId,
          bundleMetrics: {
            bundleSales: 15,
            bundleRevenue: 450.00,
            conversionRate: 12.5
          }
        }
      });

      // Get aggregated performance data
      const performanceResult = await MarketingCampaignService.getAggregatedCampaignPerformance(
        campaignId
      );

      expect(performanceResult.success).toBe(true);
      expect(performanceResult.data?.campaignMetrics).toBeTruthy();
      expect(performanceResult.data?.contentMetrics).toBeTruthy();
      expect(performanceResult.data?.bundleMetrics).toBeTruthy();
      expect(performanceResult.data?.overallROI).toBeGreaterThan(0);
    });
  });

  describe('Cross-Role Analytics Data Collection', () => {
    test('should collect campaign data for executive analytics', async () => {
      // Test will fail until executive analytics integration is implemented
      const campaignId = testCampaignId;

      // Mock executive analytics data collection
      const analyticsResult = await MarketingCampaignService.collectExecutiveAnalyticsData(
        campaignId,
        {
          includeRevenueBreakdown: true,
          includeCustomerSegmentation: true,
          includeProductPerformance: true,
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          }
        }
      );

      expect(analyticsResult.success).toBe(true);
      expect(analyticsResult.data?.revenueBreakdown).toBeTruthy();
      expect(analyticsResult.data?.customerSegmentation).toBeTruthy();
      expect(analyticsResult.data?.productPerformance).toBeTruthy();
      expect(analyticsResult.data?.executiveInsights.length).toBeGreaterThan(0);

      // Verify analytics data format for executive consumption
      expect(analyticsResult.data?.executiveInsights[0]).toHaveProperty('insight');
      expect(analyticsResult.data?.executiveInsights[0]).toHaveProperty('impact');
      expect(analyticsResult.data?.executiveInsights[0]).toHaveProperty('recommendation');
    });

    test('should handle role-based analytics access control', async () => {
      const campaignId = testCampaignId;

      // Test different role permissions for analytics
      const roleTests = [
        { role: 'marketing_manager', hasAccess: true },
        { role: 'marketing_analyst', hasAccess: true },
        { role: 'executive', hasAccess: true },
        { role: 'basic_user', hasAccess: false }
      ];

      for (const roleTest of roleTests) {
        mockRolePermissionService.hasPermission.mockImplementation(
          async (userId, permission) => {
            return permission === 'campaign_analytics' && roleTest.hasAccess;
          }
        );

        const result = await MarketingCampaignService.getCampaignAnalytics(
          campaignId,
          testUserId
        );

        if (roleTest.hasAccess) {
          expect(result.success).toBe(true);
          expect(result.data?.analytics).toBeTruthy();
        } else {
          expect(result.success).toBe(false);
          expect(result.error).toContain('permission');
        }
      }
    });
  });
});