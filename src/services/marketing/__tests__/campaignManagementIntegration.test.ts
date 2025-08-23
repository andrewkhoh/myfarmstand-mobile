// Mock ValidationMonitor before importing service (Pattern 1)
jest.mock('../../../utils/validationMonitor');

import { MarketingCampaignService } from '../marketingCampaignService';
import { ProductContentService } from '../productContentService';
import { ProductBundleService } from '../productBundleService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type {
  MarketingCampaignTransform,
  CreateMarketingCampaignInput,
  CampaignStatusType,
  CampaignTypeType
} from '../../../schemas/marketing';

// Mock the supabase module at the service level (exact authService pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock role permissions
jest.mock('../../role-based/rolePermissionService');
const mockRolePermissionService = require('../../role-based/rolePermissionService').RolePermissionService;

// Campaign Management Integration Tests - Pattern 1 Compliance
describe('Campaign Management Integration - Phase 3.4.2', () => {
  const testUserId = 'test-user-123';
  const testCampaignId = 'campaign-456';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses for role permissions
    mockRolePermissionService.hasPermission = jest.fn().mockResolvedValue(true);
  });

  describe('Campaign Lifecycle Management', () => {
    it('should create and manage complete campaign lifecycle', async () => {
      // Setup successful campaign creation mock (Pattern 1)
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'campaign-lifecycle-123',
                campaignName: 'Complete Lifecycle Campaign',
                campaignType: 'promotional',
                campaignStatus: 'planned',
                discountPercentage: 15,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              },
              error: null
            })
          })
        })
      });

      // Step 1: Create campaign
      const createResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Complete Lifecycle Campaign',
          campaignType: 'promotional',
          description: 'Test complete lifecycle management',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          discountPercentage: 15,
          campaignStatus: 'planned'
        },
        testUserId
      );

      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeDefined();

      if (createResult.success && createResult.data) {
        // Setup mock for campaign status update
        mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...createResult.data, campaignStatus: 'active' },
                  error: null
                })
              })
            })
          })
        });

        // Step 2: Activate campaign
        const activateResult = await MarketingCampaignService.updateCampaignStatus(
          createResult.data.id,
          'active',
          testUserId
        );

        expect(activateResult.success).toBe(true);
        expect(activateResult.data?.campaignStatus).toBe('active');

        // Setup mock for campaign completion
        mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...createResult.data, campaignStatus: 'completed' },
                  error: null
                })
              })
            })
          })
        });

        // Step 3: Complete campaign
        const completeResult = await MarketingCampaignService.updateCampaignStatus(
          createResult.data.id,
          'completed',
          testUserId
        );

        expect(completeResult.success).toBe(true);
        expect(completeResult.data?.campaignStatus).toBe('completed');

        // Verify lifecycle management was logged
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'MarketingCampaignService.createCampaign',
          expect.any(Object)
        );
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'MarketingCampaignService.updateCampaignStatus',
          expect.any(Object)
        );
      }
    });
  });

  describe('Campaign Performance Tracking', () => {
    it('should track campaign performance metrics throughout lifecycle', async () => {
      // Setup mock for campaign creation
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'campaign-performance-123',
                campaignName: 'Performance Tracking Campaign',
                campaignType: 'seasonal',
                campaignStatus: 'active'
              },
              error: null
            })
          })
        })
      });

      // Create campaign for performance tracking
      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Performance Tracking Campaign',
          campaignType: 'seasonal',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          campaignStatus: 'active'
        },
        testUserId
      );

      expect(campaignResult.success).toBe(true);

      if (campaignResult.success && campaignResult.data) {
        // Setup mock for metrics recording
        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'metric-123',
                  campaignId: campaignResult.data.id,
                  metricType: 'views',
                  metricValue: 1000
                },
                error: null
              })
            })
          })
        });

        // Record performance metrics
        const metricsResults = await Promise.all([
          MarketingCampaignService.recordCampaignMetric(
            campaignResult.data.id,
            'views',
            1000,
            'test-product-1',
            testUserId
          ),
          MarketingCampaignService.recordCampaignMetric(
            campaignResult.data.id,
            'clicks',
            150,
            'test-product-1',
            testUserId
          ),
          MarketingCampaignService.recordCampaignMetric(
            campaignResult.data.id,
            'conversions',
            25,
            'test-product-1',
            testUserId
          )
        ]);

        metricsResults.forEach(result => {
          expect(result.success).toBe(true);
        });

        // Setup mock for performance analytics
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                { metricType: 'views', metricValue: 1000 },
                { metricType: 'clicks', metricValue: 150 },
                { metricType: 'conversions', metricValue: 25 }
              ],
              error: null
            })
          })
        });

        // Get performance analytics
        const performanceResult = await MarketingCampaignService.getCampaignPerformance(
          campaignResult.data.id,
          testUserId
        );

        expect(performanceResult.success).toBe(true);
        expect(performanceResult.data?.metrics.views).toBe(1000);
        expect(performanceResult.data?.metrics.clicks).toBe(150);
        expect(performanceResult.data?.metrics.conversions).toBe(25);

        // Verify performance tracking was logged
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'MarketingCampaignService.recordCampaignMetric',
          expect.any(Object)
        );
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'MarketingCampaignService.getCampaignPerformance',
          expect.any(Object)
        );
      }
    });
  });

  describe('Campaign Content Integration', () => {
    it('should integrate campaign with content management workflow', async () => {
      // Setup successful campaign creation mock
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'campaign-content-123',
                campaignName: 'Content Integration Campaign',
                campaignType: 'promotional',
                campaignStatus: 'planned'
              },
              error: null
            })
          })
        })
      });

      // Create campaign
      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Content Integration Campaign',
          campaignType: 'promotional',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          campaignStatus: 'planned'
        },
        testUserId
      );

      expect(campaignResult.success).toBe(true);

      if (campaignResult.success && campaignResult.data) {
        // Setup mock for content creation
        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'content-campaign-123',
                  productId: 'test-product-campaign',
                  marketingTitle: 'Campaign Product',
                  contentStatus: 'draft'
                },
                error: null
              })
            })
          })
        });

        // Create content for campaign
        const contentResult = await ProductContentService.createProductContent(
          {
            productId: 'test-product-campaign',
            marketingTitle: 'Campaign Product',
            marketingDescription: 'Product for campaign integration',
            marketingHighlights: ['Campaign Ready'],
            contentStatus: 'draft'
          },
          testUserId
        );

        expect(contentResult.success).toBe(true);

        // Setup mock for content publishing
        mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'content-campaign-123',
                    contentStatus: 'published'
                  },
                  error: null
                })
              })
            })
          })
        });

        // Publish content when campaign becomes active
        const publishResult = await ProductContentService.updateContentStatus(
          'content-campaign-123',
          'published',
          testUserId
        );

        expect(publishResult.success).toBe(true);

        // Verify content integration was logged
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'MarketingCampaignService.createCampaign',
          expect.any(Object)
        );
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'ProductContentService.createProductContent',
          expect.any(Object)
        );
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'ProductContentService.updateContentStatus',
          expect.any(Object)
        );
      }
    });
  });

  describe('Campaign Bundle Integration', () => {
    it('should integrate campaign discounts with product bundles', async () => {
      // Setup successful campaign creation with discount
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'campaign-bundle-123',
                campaignName: 'Bundle Discount Campaign',
                campaignType: 'promotional',
                campaignStatus: 'active',
                discountPercentage: 20
              },
              error: null
            })
          })
        })
      });

      // Create campaign with discount
      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Bundle Discount Campaign',
          campaignType: 'promotional',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          campaignStatus: 'active',
          discountPercentage: 20
        },
        testUserId
      );

      expect(campaignResult.success).toBe(true);

      if (campaignResult.success && campaignResult.data) {
        // Setup mock for bundle creation with campaign
        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'bundle-campaign-123',
                  bundleName: 'Campaign Bundle',
                  bundlePrice: 99.99,
                  bundleDiscountAmount: 10.00,
                  campaignId: campaignResult.data.id,
                  products: [
                    { id: 'bp-1', productId: 'product-1', quantity: 1 },
                    { id: 'bp-2', productId: 'product-2', quantity: 2 }
                  ]
                },
                error: null
              })
            })
          })
        });

        // Create bundle with campaign association
        const bundleResult = await ProductBundleService.createBundle(
          {
            bundleName: 'Campaign Bundle',
            bundleDescription: 'Bundle for campaign discount',
            bundlePrice: 99.99,
            bundleDiscountAmount: 10.00,
            isActive: true,
            campaignId: campaignResult.data.id,
            products: [
              { productId: 'product-1', quantity: 1 },
              { productId: 'product-2', quantity: 2 }
            ]
          },
          testUserId
        );

        expect(bundleResult.success).toBe(true);
        expect(bundleResult.data?.campaignId).toBe(campaignResult.data.id);

        // Verify bundle integration was logged
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'MarketingCampaignService.createCampaign',
          expect.any(Object)
        );
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'ProductBundleService.createBundle',
          expect.any(Object)
        );
      }
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle campaign creation failures gracefully', async () => {
      // Setup mock for campaign creation failure
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Campaign validation failed', code: 'VALIDATION_ERROR' }
            })
          })
        })
      });

      // Attempt to create invalid campaign
      const result = await MarketingCampaignService.createCampaign(
        {
          campaignName: '', // Invalid empty name
          campaignType: 'promotional',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Invalid past end date
          campaignStatus: 'planned'
        },
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('End date must be after start date');

      // Verify error was logged
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'MarketingCampaignService.createCampaign',
        errorCode: 'INVALID_DATE_RANGE',
        validationPattern: 'simple_validation',
        errorMessage: 'End date must be after start date'
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large-scale campaign operations efficiently', async () => {
      // Setup mock for multiple campaign operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: Array.from({ length: 100 }, (_, i) => ({
                  id: `campaign-${i}`,
                  campaignName: `Campaign ${i}`,
                  campaignStatus: 'active'
                })),
                error: null
              })
            })
          })
        })
      });

      const startTime = performance.now();

      // Perform large-scale operation
      const result = await MarketingCampaignService.getCampaignsByStatus(
        'active',
        { page: 1, limit: 100 },
        testUserId
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(100);
      expect(executionTime).toBeLessThan(1000); // Should complete in under 1 second

      // Verify performance was logged
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'MarketingCampaignService.getCampaignsByStatus',
        expect.any(Object)
      );
    });
  });
});