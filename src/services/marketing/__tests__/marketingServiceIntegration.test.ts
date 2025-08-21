import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Real Supabase configuration for testing
import { supabase } from '../../../config/supabase';

// Mock ValidationMonitor (following architectural pattern)
jest.mock('../../../utils/validationMonitor');

import { ProductContentService } from '../productContentService';
import { MarketingCampaignService } from '../marketingCampaignService';
import { ProductBundleService } from '../productBundleService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Phase 1 Integration: Role-based permissions
import { RolePermissionService } from '../../role-based/rolePermissionService';

// Phase 2 Integration: Inventory service
import { InventoryService } from '../../inventory/inventoryService';

// Real database testing for service integration
describe('Marketing Service Integration - Phase 3.2.7', () => {
  
  // Test data cleanup IDs
  const testContentIds = new Set<string>();
  const testCampaignIds = new Set<string>();
  const testBundleIds = new Set<string>();
  const testBundleProductIds = new Set<string>();
  const testMetricIds = new Set<string>();
  const testUserId = 'test-user-integration-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Track test data for cleanup
    testContentIds.clear();
    testCampaignIds.clear();
    testBundleIds.clear();
    testBundleProductIds.clear();
    testMetricIds.clear();
  });

  afterEach(async () => {
    // Clean up test data from real database in dependency order
    try {
      // Delete campaign metrics first
      if (testMetricIds.size > 0) {
        await supabase
          .from('campaign_metrics')
          .delete()
          .in('id', Array.from(testMetricIds));
      }

      // Delete bundle products
      if (testBundleProductIds.size > 0) {
        await supabase
          .from('bundle_products')
          .delete()
          .in('id', Array.from(testBundleProductIds));
      }

      // Delete bundles
      if (testBundleIds.size > 0) {
        await supabase
          .from('product_bundles')
          .delete()
          .in('id', Array.from(testBundleIds));
      }

      // Delete content
      if (testContentIds.size > 0) {
        await supabase
          .from('product_content')
          .delete()
          .in('id', Array.from(testContentIds));
      }

      // Delete campaigns last
      if (testCampaignIds.size > 0) {
        await supabase
          .from('marketing_campaigns')
          .delete()
          .in('id', Array.from(testCampaignIds));
      }
    } catch (error) {
      console.warn('Integration cleanup warning:', error);
    }
  });

  describe('Content + Campaign Integration', () => {
    it('should integrate content workflow with campaign lifecycle', async () => {
      // Mock permissions
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

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

        // Step 2: Create content and link to campaign through product
        const testContent = {
          product_id: 'test-product-campaign-integration',
          marketing_title: 'Campaign Integration Product',
          marketing_description: 'Product content for campaign integration',
          marketing_highlights: ['Campaign Ready', 'Promotional Item'],
          content_status: 'draft' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: createdContent } = await supabase
          .from('product_content')
          .insert(testContent)
          .select()
          .single();

        if (createdContent) {
          testContentIds.add(createdContent.id);
        }

        // Step 3: Progress content through workflow while campaign is active
        const contentUpdateResult = await ProductContentService.updateProductContent(
          createdContent!.id,
          {
            contentStatus: 'review',
            marketingDescription: 'Updated for campaign launch'
          },
          testUserId
        );

        expect(contentUpdateResult.success).toBe(true);
        expect(contentUpdateResult.data?.contentStatus).toBe('review');

        // Step 4: Activate campaign
        const activateResult = await MarketingCampaignService.updateCampaignStatus(
          campaignResult.data.id,
          'active',
          testUserId
        );

        expect(activateResult.success).toBe(true);
        expect(activateResult.data?.campaignStatus).toBe('active');

        // Step 5: Publish content for active campaign
        const publishResult = await ProductContentService.updateContentStatus(
          createdContent!.id,
          'published',
          testUserId
        );

        expect(publishResult.success).toBe(true);
        expect(publishResult.data?.contentStatus).toBe('published');

        // Step 6: Record campaign metrics
        const metricsResults = await Promise.all([
          MarketingCampaignService.recordCampaignMetric(
            campaignResult.data.id,
            'views',
            1500,
            'test-product-campaign-integration',
            testUserId
          ),
          MarketingCampaignService.recordCampaignMetric(
            campaignResult.data.id,
            'clicks',
            225,
            'test-product-campaign-integration',
            testUserId
          ),
          MarketingCampaignService.recordCampaignMetric(
            campaignResult.data.id,
            'conversions',
            28,
            'test-product-campaign-integration',
            testUserId
          )
        ]);

        metricsResults.forEach(result => {
          expect(result.success).toBe(true);
          if (result.success && result.data) {
            testMetricIds.add(result.data.id);
          }
        });

        // Verify integrated workflow completed successfully
        expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
          'MarketingCampaignService.createCampaign',
          true,
          expect.any(Object)
        );
        expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
          'ProductContentService.updateContentStatus',
          true,
          expect.any(Object)
        );
      }
    });
  });

  describe('Campaign + Bundle Integration', () => {
    it('should integrate campaign discounts with bundle pricing', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

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

        if (bundleResult.success && bundleResult.data) {
          testBundleIds.add(bundleResult.data.id);
          bundleResult.data.products.forEach(p => testBundleProductIds.add(p.id));

          // Step 3: Calculate effective pricing with campaign discount
          const pricingResult = await ProductBundleService.calculateEffectivePrice(
            bundleResult.data.bundlePrice,
            bundleResult.data.bundleDiscountAmount,
            campaignResult.data.discountPercentage
          );

          expect(pricingResult.success).toBe(true);
          expect(pricingResult.data?.originalPrice).toBe(89.99);
          expect(pricingResult.data?.bundleDiscount).toBe(10.00);
          expect(pricingResult.data?.campaignDiscount).toBe(19.9975); // (89.99-10.00) * 0.25
          expect(pricingResult.data?.finalPrice).toBeCloseTo(59.99, 2);

          // Step 4: Record bundle performance metrics through campaign
          const performanceResult = await MarketingCampaignService.recordCampaignMetric(
            campaignResult.data.id,
            'revenue',
            599.93, // 10 bundles at final price
            undefined,
            testUserId
          );

          expect(performanceResult.success).toBe(true);
          if (performanceResult.success && performanceResult.data) {
            testMetricIds.add(performanceResult.data.id);
          }

          // Verify integration metrics
          const campaignPerformance = await MarketingCampaignService.getCampaignPerformance(
            campaignResult.data.id,
            testUserId
          );

          expect(campaignPerformance.success).toBe(true);
          expect(campaignPerformance.data?.metrics.revenue).toBe(599.93);
        }
      }
    });
  });

  describe('Bundle + Inventory Integration', () => {
    it('should integrate bundle operations with inventory management', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

      // Mock inventory service responses
      jest.spyOn(InventoryService, 'getInventoryByProductId')
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

        // Step 2: Calculate inventory impact for bundle quantity
        const impactResult = await ProductBundleService.calculateInventoryImpact(
          [
            { productId: 'test-product-inventory-1', quantity: 3 },
            { productId: 'test-product-inventory-2', quantity: 2 }
          ],
          10 // Bundle quantity
        );

        expect(impactResult.success).toBe(true);
        expect(impactResult.data?.impact).toEqual([
          { productId: 'test-product-inventory-1', requiredQuantity: 30 }, // 3 * 10
          { productId: 'test-product-inventory-2', requiredQuantity: 20 }  // 2 * 10
        ]);

        // Step 3: Verify inventory availability
        expect(impactResult.data?.availability.isAvailable).toBe(true); // 45 available > 30 and 20 required
        expect(impactResult.data?.availability.shortages).toHaveLength(0);

        // Step 4: Test bundle deactivation due to insufficient inventory
        jest.spyOn(InventoryService, 'getInventoryByProductId')
          .mockImplementation(async (productId: string) => {
            const lowInventory = {
              id: `inventory-${productId}`,
              productId,
              currentStock: 5,
              reservedStock: 3,
              availableStock: 2, // Low availability
              minimumThreshold: 10,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            return lowInventory as any;
          });

        // Try to activate bundle with insufficient inventory
        const deactivateResult = await ProductBundleService.toggleBundleStatus(
          bundleResult.data.id,
          false,
          testUserId
        );

        expect(deactivateResult.success).toBe(true);

        // Try to reactivate with low inventory (should fail)
        const reactivateResult = await ProductBundleService.toggleBundleStatus(
          bundleResult.data.id,
          true,
          testUserId
        );

        expect(reactivateResult.success).toBe(false);
        expect(reactivateResult.error).toContain('Insufficient inventory');

        // Verify integration logged properly
        expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
          'ProductBundleService.toggleBundleStatus',
          false,
          expect.objectContaining({
            error: 'Insufficient inventory'
          })
        );
      }
    });
  });

  describe('Cross-Service Workflow Integration', () => {
    it('should support complete marketing workflow across all services', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

      // Complete workflow: Campaign → Content → Bundle → Performance tracking
      
      // Step 1: Create seasonal campaign
      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Complete Workflow Campaign',
          campaignType: 'seasonal',
          description: 'End-to-end workflow integration test',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          discountPercentage: 15,
          campaignStatus: 'planned'
        },
        testUserId
      );

      expect(campaignResult.success).toBe(true);

      if (campaignResult.success && campaignResult.data) {
        testCampaignIds.add(campaignResult.data.id);

        // Step 2: Create and publish content
        const testContent = {
          product_id: 'test-product-workflow',
          marketing_title: 'Workflow Integration Product',
          marketing_description: 'Complete workflow test product',
          marketing_highlights: ['Workflow Ready', 'Integration Test'],
          seo_keywords: ['workflow', 'integration', 'test'],
          content_status: 'draft' as const,
          content_priority: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: createdContent } = await supabase
          .from('product_content')
          .insert(testContent)
          .select()
          .single();

        if (createdContent) {
          testContentIds.add(createdContent.id);
        }

        // Progress content through workflow
        await ProductContentService.updateContentStatus(
          createdContent!.id,
          'review',
          testUserId
        );

        await ProductContentService.updateContentStatus(
          createdContent!.id,
          'approved',
          testUserId
        );

        const publishResult = await ProductContentService.updateContentStatus(
          createdContent!.id,
          'published',
          testUserId
        );

        expect(publishResult.success).toBe(true);

        // Step 3: Create bundle for campaign
        const bundleResult = await ProductBundleService.createBundle(
          {
            bundleName: 'Workflow Integration Bundle',
            bundleDescription: 'Bundle for complete workflow test',
            bundlePrice: 65.99,
            bundleDiscountAmount: 5.00,
            isActive: true,
            campaignId: campaignResult.data.id,
            products: [
              { productId: 'test-product-workflow', quantity: 1 },
              { productId: 'test-product-workflow-2', quantity: 2 }
            ]
          },
          testUserId
        );

        expect(bundleResult.success).toBe(true);

        if (bundleResult.success && bundleResult.data) {
          testBundleIds.add(bundleResult.data.id);
          bundleResult.data.products.forEach(p => testBundleProductIds.add(p.id));

          // Step 4: Activate campaign
          const activateResult = await MarketingCampaignService.updateCampaignStatus(
            campaignResult.data.id,
            'active',
            testUserId
          );

          expect(activateResult.success).toBe(true);

          // Step 5: Record comprehensive performance metrics
          const metricsPromises = [
            MarketingCampaignService.recordCampaignMetric(
              campaignResult.data.id,
              'views',
              2500,
              'test-product-workflow',
              testUserId
            ),
            MarketingCampaignService.recordCampaignMetric(
              campaignResult.data.id,
              'clicks',
              375,
              'test-product-workflow',
              testUserId
            ),
            MarketingCampaignService.recordCampaignMetric(
              campaignResult.data.id,
              'conversions',
              45,
              'test-product-workflow',
              testUserId
            ),
            MarketingCampaignService.recordCampaignMetric(
              campaignResult.data.id,
              'revenue',
              2969.55, // 45 * 65.99
              undefined,
              testUserId
            )
          ];

          const metricsResults = await Promise.all(metricsPromises);
          metricsResults.forEach(result => {
            expect(result.success).toBe(true);
            if (result.success && result.data) {
              testMetricIds.add(result.data.id);
            }
          });

          // Step 6: Get comprehensive performance analytics
          const performanceResult = await MarketingCampaignService.getCampaignPerformance(
            campaignResult.data.id,
            testUserId
          );

          expect(performanceResult.success).toBe(true);
          expect(performanceResult.data?.metrics.views).toBe(2500);
          expect(performanceResult.data?.metrics.conversions).toBe(45);
          expect(performanceResult.data?.metrics.revenue).toBe(2969.55);
          expect(performanceResult.data?.performance.clickThroughRate).toBeCloseTo(0.15, 2); // 375/2500
          expect(performanceResult.data?.performance.conversionRate).toBeCloseTo(0.12, 2); // 45/375

          // Step 7: Get bundle performance
          const bundlePerformanceResult = await ProductBundleService.getBundlePerformance(
            bundleResult.data.id,
            {
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date().toISOString()
            },
            testUserId
          );

          expect(bundlePerformanceResult.success).toBe(true);

          // Verify complete workflow integration succeeded
          expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
            'MarketingCampaignService.createCampaign',
            true,
            expect.any(Object)
          );
          expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
            'ProductContentService.updateContentStatus',
            true,
            expect.any(Object)
          );
          expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
            'ProductBundleService.createBundle',
            true,
            expect.any(Object)
          );
          expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
            'MarketingCampaignService.getCampaignPerformance',
            true,
            expect.any(Object)
          );
        }
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service failures gracefully across integrations', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

      // Test partial failure scenarios
      
      // Create campaign successfully
      const campaignResult = await MarketingCampaignService.createCampaign(
        {
          campaignName: 'Error Handling Test Campaign',
          campaignType: 'promotional',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          discountPercentage: 20,
          campaignStatus: 'planned'
        },
        testUserId
      );

      expect(campaignResult.success).toBe(true);

      if (campaignResult.success && campaignResult.data) {
        testCampaignIds.add(campaignResult.data.id);

        // Try to create bundle with invalid data (should fail gracefully)
        const invalidBundleResult = await ProductBundleService.createBundle(
          {
            bundleName: 'Invalid Bundle',
            bundlePrice: 20.00,
            bundleDiscountAmount: 25.00, // Invalid: exceeds price
            isActive: true,
            campaignId: campaignResult.data.id,
            products: [
              { productId: 'test-product-invalid', quantity: 1 }
            ]
          },
          testUserId
        );

        expect(invalidBundleResult.success).toBe(false);
        expect(invalidBundleResult.error).toContain('Discount amount cannot exceed bundle price');

        // Campaign should still be functional despite bundle creation failure
        const activateResult = await MarketingCampaignService.updateCampaignStatus(
          campaignResult.data.id,
          'active',
          testUserId
        );

        expect(activateResult.success).toBe(true);

        // Verify error was logged but didn't break the workflow
        expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
          'ProductBundleService.createBundle',
          false,
          expect.any(Object)
        );
        expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
          'MarketingCampaignService.updateCampaignStatus',
          true,
          expect.any(Object)
        );
      }
    });
  });

  describe('Performance Integration Validation', () => {
    it('should maintain performance targets across integrated operations', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

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
      expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
        'MarketingCampaignService.getCampaignsByStatus',
        true,
        expect.any(Object)
      );
      expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
        'ProductContentService.getContentByStatus',
        true,
        expect.any(Object)
      );
      expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
        'ProductBundleService.getBundlesByStatus',
        true,
        expect.any(Object)
      );
    });
  });
});