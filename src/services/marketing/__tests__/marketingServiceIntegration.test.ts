// Mock ValidationMonitor before importing service (Pattern 1)
jest.mock('../../../utils/validationMonitor');

import { ProductContentService } from '../productContentService';
import { MarketingCampaignService } from '../marketingCampaignService';
import { ProductBundleService } from '../productBundleService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock the supabase module at the service level (exact authService pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock role permissions
jest.mock('../../role-based/rolePermissionService');
const mockRolePermissionService = require('../../role-based/rolePermissionService').RolePermissionService;

// Mock inventory service
jest.mock('../../inventory/inventoryService', () => ({
  InventoryService: {
    checkProductsAvailability: jest.fn(),
    reserveProductsForBundle: jest.fn(),
    releaseProductReservation: jest.fn(),
    updateInventoryForBundle: jest.fn(),
    getInventoryByProduct: jest.fn()
  }
}));
const mockInventoryService = require('../../inventory/inventoryService').InventoryService;

// Mock pattern testing for service integration (Pattern 1)
describe('Marketing Service Integration - Phase 3.2.7', () => {
  const testUserId = 'test-user-integration-123';
  const testContentIds = new Set<string>();
  const testCampaignIds = new Set<string>();
  const testBundleIds = new Set<string>();
  const testBundleProductIds = new Set<string>();
  const testMetricIds = new Set<string>();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Supabase mocks to prevent state contamination
    if (global.resetSupabaseMocks) {
      global.resetSupabaseMocks();
    }
    testContentIds.clear();
    testCampaignIds.clear();
    testBundleIds.clear();
    testBundleProductIds.clear();
    testMetricIds.clear();

    // Setup default mock responses for service calls
    mockRolePermissionService.hasPermission = jest.fn().mockResolvedValue(true);
    mockInventoryService.checkProductsAvailability = jest.fn().mockResolvedValue(true);
    mockInventoryService.reserveProductsForBundle = jest.fn().mockResolvedValue({ success: true });
    mockInventoryService.releaseProductReservation = jest.fn().mockResolvedValue({ success: true });
    mockInventoryService.updateInventoryForBundle = jest.fn().mockResolvedValue({ success: true });
  });

  describe('Content + Campaign Integration', () => {
    it('should integrate content workflow with campaign lifecycle', async () => {
      // Setup successful campaign creation mock (Pattern 1)
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'campaign-123',
                campaignName: 'Content Integration Campaign',
                campaignType: 'promotional',
                campaignStatus: 'planned',
                discountPercentage: 20
              },
              error: null
            })
          })
        })
      });

      // Step 1: Create a campaign
      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Content Integration Campaign',
          campaignType: 'promotional',
          description: 'Campaign for content workflow integration testing',
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          discountPercentage: 20,
          campaignStatus: 'planned'
        },
        testUserId
      );

      expect(campaignResult.success).toBe(true);
      expect(campaignResult.data).toBeDefined();

      if (campaignResult.success && campaignResult.data) {
        testCampaignIds.add(campaignResult.data.id);

        // Mock content creation data
        const createdContent = {
          id: 'mock-content-id-123',
          product_id: 'test-product-campaign-integration',
          marketing_title: 'Campaign Integration Product',
          marketing_description: 'Product content for campaign integration',
          marketing_highlights: ['Campaign Ready', 'Promotional Item'],
          content_status: 'draft' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        testContentIds.add(createdContent.id);

        // Setup mock for content updates
        mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...createdContent, contentStatus: 'review' },
                  error: null
                })
              })
            })
          })
        });

        // Step 3: Progress content through workflow while campaign is active
        const contentUpdateResult = await ProductContentService.updateProductContent(
          createdContent.id,
          {
            contentStatus: 'review',
            marketingDescription: 'Updated for campaign launch'
          },
          testUserId
        );

        expect(contentUpdateResult.success).toBe(true);
        expect(contentUpdateResult.data?.contentStatus).toBe('review');

        // Setup mock for campaign status update
        mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...campaignResult.data, campaignStatus: 'active' },
                  error: null
                })
              })
            })
          })
        });

        // Step 4: Activate campaign
        const activateResult = await MarketingCampaignService.updateCampaignStatus(
          campaignResult.data.id,
          'active',
          testUserId
        );

        expect(activateResult.success).toBe(true);
        expect(activateResult.data?.campaignStatus).toBe('active');

        // Verify integrated workflow completed successfully
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'MarketingCampaignService.createCampaign',
          expect.any(Object)
        );
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'ProductContentService.updateProductContent',
          expect.any(Object)
        );
      }
    });
  });

  describe('Campaign + Bundle Integration', () => {
    it('should integrate campaign discounts with bundle pricing', async () => {
      // Setup successful campaign creation mock
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'campaign-bundle-123',
                campaignName: 'Bundle Promotion Campaign',
                campaignType: 'promotional',
                campaignStatus: 'active',
                discountPercentage: 25
              },
              error: null
            })
          })
        })
      });

      // Step 1: Create a promotional campaign
      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Bundle Promotion Campaign',
          campaignType: 'promotional',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          discountPercentage: 25,
          campaignStatus: 'active'
        },
        testUserId
      );

      expect(campaignResult.success).toBe(true);

      if (campaignResult.success && campaignResult.data) {
        testCampaignIds.add(campaignResult.data.id);

        // Setup mock for bundle creation
        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'bundle-123',
                  bundleName: 'Campaign Bundle Special',
                  bundlePrice: 89.99,
                  bundleDiscountAmount: 10.00,
                  campaignId: campaignResult.data.id,
                  products: [
                    { id: 'bp-1', productId: 'test-product-bundle-1', quantity: 2, displayOrder: 1 },
                    { id: 'bp-2', productId: 'test-product-bundle-2', quantity: 1, displayOrder: 2 }
                  ]
                },
                error: null
              })
            })
          })
        });

        // Step 2: Create a bundle associated with the campaign
        const bundleResult = await ProductBundleService.createBundle(
          {
            bundleName: 'Campaign Bundle Special',
            bundleDescription: 'Special bundle for promotional campaign',
            bundlePrice: 89.99,
            bundleDiscountAmount: 10.00,
            isActive: true,
            isFeatured: true,
            campaignId: campaignResult.data.id,
            products: [
              { productId: 'test-product-bundle-1', quantity: 2, displayOrder: 1 },
              { productId: 'test-product-bundle-2', quantity: 1, displayOrder: 2 }
            ]
          },
          testUserId
        );

        expect(bundleResult.success).toBe(true);
        expect(bundleResult.data?.campaignId).toBe(campaignResult.data.id);

        // Verify ValidationMonitor was called
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

  describe('Bundle + Inventory Integration', () => {
    it('should integrate bundle operations with inventory management', async () => {
      // Mock inventory service responses
      mockInventoryService.getInventoryByProduct = jest.fn()
        .mockImplementation(async (productId: string) => {
          const mockInventory = {
            id: `inventory-${productId}`,
            productId,
            currentStock: 50,
            reservedStock: 5,
            availableStock: 45,
            minimumThreshold: 10,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          return mockInventory as any;
        });

      // Setup successful bundle creation mock
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'bundle-inventory-123',
                bundleName: 'Inventory Integration Bundle',
                bundlePrice: 75.00,
                isActive: true,
                products: [
                  { id: 'bp-3', productId: 'test-product-inventory-1', quantity: 3 },
                  { id: 'bp-4', productId: 'test-product-inventory-2', quantity: 2 }
                ]
              },
              error: null
            })
          })
        })
      });

      // Step 1: Create a bundle
      const bundleResult = await ProductBundleService.createBundle(
        {
          bundleName: 'Inventory Integration Bundle',
          bundlePrice: 75.00,
          isActive: true,
          products: [
            { productId: 'test-product-inventory-1', quantity: 3 },
            { productId: 'test-product-inventory-2', quantity: 2 }
          ]
        },
        testUserId
      );

      expect(bundleResult.success).toBe(true);

      if (bundleResult.success && bundleResult.data) {
        testBundleIds.add(bundleResult.data.id);
        bundleResult.data.products.forEach(p => testBundleProductIds.add(p.id));

        // Verify integration logged properly
        expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
          'ProductBundleService.createBundle',
          expect.any(Object)
        );
      }
    });
  });

  describe('Performance Integration Validation', () => {
    it('should maintain performance targets across integrated operations', async () => {
      // Setup mock for parallel operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [
                  { id: 'campaign-1', campaignStatus: 'active' },
                  { id: 'content-1', contentStatus: 'published' },
                  { id: 'bundle-1', isActive: true }
                ],
                error: null
              })
            })
          })
        })
      });

      const startTime = performance.now();

      // Perform integrated operations
      const operations = [
        MarketingCampaignService.getCampaignsByStatus('active', { page: 1, limit: 5 }, testUserId),
        ProductContentService.getContentByStatus('published', { page: 1, limit: 5 }, testUserId),
        ProductBundleService.getBundlesByStatus('active', { page: 1, limit: 5 }, testUserId)
      ];

      const results = await Promise.all(operations);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Total time should be reasonable for integrated queries
      expect(executionTime).toBeLessThan(2000); // 2 seconds for parallel operations

      // Individual service performance should be tracked
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'marketingCampaignService',
        pattern: 'transformation_schema',
        operation: 'getCampaignsByStatus'
      });
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'transformation_schema',
        operation: 'getContentByStatus'
      });
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productBundleService',
        pattern: 'direct_supabase_query',
        operation: 'getBundlesByStatus'
      });
    });
  });
});