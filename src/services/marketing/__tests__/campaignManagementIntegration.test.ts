// Test Infrastructure Imports
import { createProduct, createUser, resetAllFactories } from "../../test/factories";

/**
 * Campaign Management Integration Test - Following Service Test Pattern (REFERENCE)
 */

// Setup all mocks BEFORE any imports
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  }));
  
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', role: 'marketing_staff' } },
          error: null
        })
      }
    },
    TABLES: {
      MARKETING_CAMPAIGNS: 'marketing_campaigns',
      PRODUCT_CONTENT: 'product_content',
      PRODUCT_BUNDLES: 'product_bundles',
      PRODUCTS: 'products',
      USERS: 'users'
    }
  };
    TABLES: { /* Add table constants */ }
  };
});

jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

jest.mock('../../role-based/rolePermissionService', () => ({
  RolePermissionService: {
    hasPermission: jest.fn().mockResolvedValue(true),
    getUserRole: jest.fn().mockResolvedValue('marketing_staff'),
    checkRoleAccess: jest.fn().mockResolvedValue(true)
  }
}));

// Import AFTER mocks are setup
import { MarketingCampaignService } from '../marketingCampaignService';
import { ProductContentService } from '../productContentService';
import { ProductBundleService } from '../productBundleService';
import { supabase } from '../../../config/supabase';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import { RolePermissionService } from '../../role-based/rolePermissionService';
import type {
  MarketingCampaignTransform,
  CreateMarketingCampaignInput,
  CampaignStatusType,
  CampaignTypeType
} from '../../../schemas/marketing';

// Get mock references for use in tests
const mockSupabaseFrom = supabase.from as jest.Mock;

describe('Campaign Management Integration - Refactored Infrastructure', () => {
  let testUserId: string;
  let testCampaignId: string;
  let testProductId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    testUserId = 'user-123';
    testCampaignId = 'campaign-456';
    testProductId = 'product-123';
    
    // Setup default mock responses
    (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(true);
  });

  describe('Campaign Lifecycle Management', () => {
    it('should create and manage complete campaign lifecycle', async () => {
      // Setup mock database responses for campaign creation
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'campaign-1',
            campaign_name: 'Complete Lifecycle Campaign',
            campaign_type: 'promotional',
            description: 'Test complete lifecycle management',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            discount_percentage: 15,
            campaign_status: 'planned',
            created_at: new Date().toISOString()
          },
          error: null
        })
      });

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

      expect(createResult).toBeDefined();
      expect(createResult.success).toBe(true);
      expect(createResult.data?.campaignName).toBe('Complete Lifecycle Campaign');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();

      // Test campaign activation
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'campaign-1',
            campaign_status: 'active'
          },
          error: null
        })
      });

      const activateResult = await MarketingCampaignService.updateCampaignStatus(
        'campaign-1',
        'active',
        testUserId
      );

      expect(activateResult).toBeDefined();
      expect(activateResult.success).toBe(true);
      expect(activateResult.data?.campaignStatus).toBe('active');
    });

    it('should handle campaign pause and resume operations', async () => {
      // Pause campaign
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testCampaignId,
            campaign_status: 'paused'
          },
          error: null
        })
      });

      const pauseResult = await MarketingCampaignService.updateCampaignStatus(
        testCampaignId,
        'paused',
        testUserId
      );

      expect(pauseResult).toBeDefined();
      expect(pauseResult.success).toBe(true);
      expect(pauseResult.data?.campaignStatus).toBe('paused');

      // Resume campaign
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testCampaignId,
            campaign_status: 'active'
          },
          error: null
        })
      });

      const resumeResult = await MarketingCampaignService.updateCampaignStatus(
        testCampaignId,
        'active',
        testUserId
      );

      expect(resumeResult).toBeDefined();
      expect(resumeResult.success).toBe(true);
      expect(resumeResult.data?.campaignStatus).toBe('active');
    });

    it('should validate campaign date constraints', async () => {
      const invalidDateInput: CreateMarketingCampaignInput = {
        campaignName: 'Invalid Date Campaign',
        campaignType: 'promotional',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(), // End before start - invalid
        discountPercentage: 10
      };

      await expect(
        MarketingCampaignService.createCampaign(invalidDateInput, testUserId)
      ).rejects.toThrow('End date must be after start date');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('Campaign Content Integration', () => {
    it('should link campaigns with product content', async () => {
      // Create campaign
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'campaign-2',
            campaign_name: 'Content Integration Campaign',
            campaign_type: 'promotional',
            discount_percentage: 20,
            created_at: new Date().toISOString()
          },
          error: null
        })
      });

      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Content Integration Campaign',
          campaignType: 'promotional',
          discountPercentage: 20
        },
        testUserId
      );

      expect(campaignResult).toBeDefined();
      expect(campaignResult.success).toBe(true);

      // Create content for campaign
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'content-1',
            product_id: testProductId,
            marketing_title: 'Campaign Product Content',
            marketing_description: 'Product content for campaign',
            campaign_id: 'campaign-2',
            created_at: new Date().toISOString()
          },
          error: null
        })
      });

      const contentResult = await ProductContentService.createProductContent(
        {
          productId: testProductId,
          marketingTitle: 'Campaign Product Content',
          marketingDescription: 'Product content for campaign',
          campaignId: 'campaign-2'
        },
        testUserId
      );

      expect(contentResult).toBeDefined();
      expect(contentResult.success).toBe(true);
      expect(contentResult.data?.campaignId).toBe('campaign-2');
    });

    it('should handle campaign content approval workflow', async () => {
      // Update content to approved status
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'content-123',
            content_status: 'approved',
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });

      const contentApprovalResult = await ProductContentService.updateContentStatus(
        'content-123',
        'approved',
        testUserId
      );

      expect(contentApprovalResult).toBeDefined();
      expect(contentApprovalResult.success).toBe(true);
      expect(contentApprovalResult.data?.contentStatus).toBe('approved');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Campaign Bundle Integration', () => {
    it('should create campaigns with associated bundles', async () => {
      // Create campaign
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'campaign-3',
            campaign_name: 'Bundle Campaign',
            campaign_type: 'promotional',
            discount_percentage: 25,
            created_at: new Date().toISOString()
          },
          error: null
        })
      });

      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Bundle Campaign',
          campaignType: 'promotional',
          discountPercentage: 25
        },
        testUserId
      );

      expect(campaignResult).toBeDefined();
      expect(campaignResult.success).toBe(true);

      // Create bundle for campaign
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'bundle-1',
            bundle_name: 'Campaign Bundle',
            bundle_description: 'Bundle for promotional campaign',
            bundle_price: 79.99,
            campaign_id: 'campaign-3',
            created_at: new Date().toISOString()
          },
          error: null
        })
      });

      const bundleResult = await ProductBundleService.createBundle(
        {
          bundleName: 'Campaign Bundle',
          bundleDescription: 'Bundle for promotional campaign',
          bundlePrice: 79.99,
          campaignId: 'campaign-3',
          products: [
            { productId: testProductId, quantity: 2, displayOrder: 1 }
          ]
        },
        testUserId
      );

      expect(bundleResult).toBeDefined();
      expect(bundleResult.success).toBe(true);
      expect(bundleResult.data?.campaignId).toBe('campaign-3');
    });

    it('should handle bundle inventory validation for campaigns', async () => {
      // Mock inventory validation response
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            inventory_available: true,
            bundle_stock: 100
          },
          error: null
        })
      });

      const inventoryValidation = await MarketingCampaignService.validateCampaignInventory(
        testCampaignId,
        {
          checkBundleAvailability: true,
          reserveInventory: false
        },
        testUserId
      );

      expect(inventoryValidation).toBeDefined();
      expect(inventoryValidation.success).toBe(true);
      expect(inventoryValidation.data?.inventoryAvailable).toBe(true);
    });
  });

  describe('Campaign Analytics Integration', () => {
    it('should track campaign performance metrics', async () => {
      // Mock analytics response
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              campaign_id: testCampaignId,
              impressions: 1000,
              clicks: 100,
              conversions: 10,
              revenue: 5000,
              date: '2024-01-01'
            }
          ],
          error: null
        })
      });

      const analyticsResult = await MarketingCampaignService.getCampaignAnalytics(
        testCampaignId,
        {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          includeConversionMetrics: true
        },
        testUserId
      );

      expect(analyticsResult).toBeDefined();
      expect(analyticsResult.success).toBe(true);
      expect(analyticsResult.data?.metrics).toBeDefined();
      expect(analyticsResult.data?.metrics.impressions).toBe(1000);
      expect(analyticsResult.data?.metrics.conversions).toBe(10);
    });

    it('should generate campaign ROI calculations', async () => {
      // Mock ROI calculation response
      const roiResult = await MarketingCampaignService.calculateCampaignROI(
        testCampaignId,
        {
          includeOperationalCosts: true,
          timePeriod: '30d'
        },
        testUserId
      );

      expect(roiResult).toBeDefined();
      expect(roiResult.success).toBe(true);
      expect(roiResult.data?.roi).toBeGreaterThan(0);
      expect(roiResult.data?.totalRevenue).toBeDefined();
    });
  });

  describe('Campaign Error Handling', () => {
    it('should handle campaign creation failures gracefully', async () => {
      // Mock database error
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      });

      const invalidCampaignInput: CreateMarketingCampaignInput = {
        campaignName: '',
        campaignType: 'promotional',
        discountPercentage: 150 // Invalid discount
      };

      await expect(
        MarketingCampaignService.createCampaign(invalidCampaignInput, testUserId)
      ).rejects.toThrow();

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });

    it('should handle campaign status transition validation', async () => {
      // Mock invalid transition error
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid status transition' }
        })
      });

      await expect(
        MarketingCampaignService.updateCampaignStatus(
          testCampaignId,
          'completed',
          testUserId
        )
      ).rejects.toThrow('Invalid status transition');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });

    it('should handle concurrent campaign modifications', async () => {
      // Setup mock for concurrent updates
      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(() => {
          callCount++;
          if (callCount === 1) {
            return {
              data: { id: testCampaignId, campaign_name: 'Updated by User 1' },
              error: null
            };
          } else {
            return {
              data: null,
              error: { message: 'Concurrent update conflict' }
            };
          }
        })
      }));

      const update1Promise = MarketingCampaignService.updateCampaign(
        testCampaignId,
        { campaignName: 'Updated by User 1' },
        'user-1'
      );

      const update2Promise = MarketingCampaignService.updateCampaign(
        testCampaignId,
        { campaignName: 'Updated by User 2' },
        'user-2'
      );

      const [result1, result2] = await Promise.allSettled([update1Promise, update2Promise]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('Permission Integration', () => {
    it('should enforce campaign management permissions', async () => {
      (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(false);

      await expect(
        MarketingCampaignService.createCampaign(
          {
            campaignName: 'Unauthorized Campaign',
            campaignType: 'promotional',
            discountPercentage: 10
          },
          testUserId
        )
      ).rejects.toThrow('Insufficient permissions');

      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'campaign_create'
      );
    });

    it('should enforce campaign status change permissions', async () => {
      // Different permissions for different status changes
      (RolePermissionService.hasPermission as jest.Mock).mockImplementation(
        async (userId, permission) => {
          return permission !== 'campaign_complete';
        }
      );

      await expect(
        MarketingCampaignService.updateCampaignStatus(
          testCampaignId,
          'completed',
          testUserId
        )
      ).rejects.toThrow('Insufficient permissions');

      expect(RolePermissionService.hasPermission).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large campaign queries efficiently', async () => {
      // Mock paginated response
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: Array.from({ length: 100 }, (_, i) => ({
            id: `campaign-${i}`,
            campaign_name: `Campaign ${i}`,
            campaign_status: 'active'
          })),
          error: null
        })
      });

      const startTime = Date.now();

      const result = await MarketingCampaignService.getCampaignsPaginated(
        { page: 1, limit: 100, includeAnalytics: true },
        testUserId
      );

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(100);
      expect(duration).toBeLessThan(5000);
    });

    it('should optimize campaign analytics calculations', async () => {
      const campaignIds = Array.from({ length: 10 }, (_, i) => `campaign-${i}`);
      
      // Mock bulk metrics response
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: campaignIds.map(id => ({
            campaign_id: id,
            roi: Math.random() * 100,
            conversions: Math.floor(Math.random() * 1000),
            revenue: Math.random() * 10000
          })),
          error: null
        })
      });

      const startTime = Date.now();

      const result = await MarketingCampaignService.calculateBulkCampaignMetrics(
        campaignIds,
        {
          includeROI: true,
          includeConversions: true,
          timePeriod: '30d'
        },
        testUserId
      );

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data?.campaignMetrics).toHaveLength(10);
      expect(duration).toBeLessThan(3000);
    });
  });
});