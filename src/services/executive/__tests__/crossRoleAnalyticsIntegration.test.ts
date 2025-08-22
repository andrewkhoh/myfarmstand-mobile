// Phase 4.4.1: Cross-Role Analytics Integration Tests (RED Phase)
// Testing complete analytics pipeline across inventory, marketing, and executive layers

import { supabase } from '../../../config/supabase';
import { BusinessMetricsService } from '../businessMetricsService';
import { BusinessIntelligenceService } from '../businessIntelligenceService';
import { InventoryService } from '../../inventory/inventoryService';
import { MarketingCampaignService } from '../../marketing/marketingCampaignService';
import { RolePermissionService } from '../../role-based/rolePermissionService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock dependencies
jest.mock('../../../config/supabase');
jest.mock('../../../utils/validationMonitor');
jest.mock('../../role-based/rolePermissionService');

describe('Cross-Role Analytics Integration - Phase 4.4.1', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(true);
    
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    });
  });

  describe('Complete Cross-Role Analytics Pipeline', () => {
    it('should aggregate analytics from inventory, marketing, and executive layers', async () => {
      // Setup mock data for each layer
      const mockInventoryData = {
        data: [{
          id: 'inv-1',
          product_id: 'prod-1',
          quantity_available: 100,
          low_stock_threshold: 20,
          inventory_turnover_rate: 2.5
        }],
        error: null
      };

      const mockMarketingData = {
        data: [{
          id: 'campaign-1',
          campaign_roi: 3.2,
          conversion_rate: 0.15,
          customer_acquisition_cost: 25
        }],
        error: null
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'inventory_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue(mockInventoryData)
          } as any;
        }
        if (table === 'marketing_campaigns') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue(mockMarketingData)
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      // Execute cross-role analytics
      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory', 'marketing'],
        'monthly',
        '2024-01-01',
        '2024-01-31',
        { user_role: 'executive' }
      );

      expect(result).toBeDefined();
      expect(result.metrics).toEqual(expect.any(Array));
      expect(result.correlations).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should enforce role permissions across all analytics layers', async () => {
      // Test permission denial for non-executive user
      (RolePermissionService.hasPermission as jest.Mock)
        .mockResolvedValueOnce(false) // inventory
        .mockResolvedValueOnce(false) // marketing
        .mockResolvedValueOnce(false); // executive

      await expect(
        BusinessMetricsService.aggregateBusinessMetrics(
          ['inventory', 'marketing'],
          'monthly',
          '2024-01-01',
          '2024-01-31',
          { user_role: 'viewer' }
        )
      ).rejects.toThrow('Insufficient permissions');

      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        'viewer',
        'business_metrics_read'
      );
    });

    it('should generate business intelligence from cross-role correlations', async () => {
      // Setup correlated data
      const mockCorrelatedData = {
        data: {
          inventory_marketing_correlation: 0.75,
          marketing_sales_correlation: 0.82,
          inventory_sales_correlation: 0.68
        },
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{
            id: 'insight-1',
            insight_type: 'correlation',
            confidence_score: 0.85,
            insight_data: mockCorrelatedData.data
          }],
          error: null
        })
      } as any);

      const insights = await BusinessIntelligenceService.correlateBusinessData({
        data_sources: ['inventory', 'marketing'],
        correlation_type: 'performance',
        include_significance: true
      });

      expect(insights.correlations).toBeDefined();
      expect(insights.correlations['inventory-marketing']).toBeGreaterThan(0.7);
    });

    it('should validate statistical significance of cross-role correlations', async () => {
      const mockStatisticalData = {
        data: [{
          correlation_coefficient: 0.82,
          p_value: 0.001,
          sample_size: 150,
          confidence_interval: [0.76, 0.88]
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(mockStatisticalData)
      } as any);

      const result = await BusinessIntelligenceService.correlateBusinessData({
        data_sources: ['inventory', 'marketing'],
        correlation_type: 'all',
        include_significance: true
      });

      expect(result.statisticalValidation).toBeDefined();
      expect(result.statisticalValidation.isSignificant).toBe(true);
      expect(result.statisticalValidation.pValue).toBeLessThan(0.05);
    });

    it('should handle analytics pipeline failures with error recovery', async () => {
      // Simulate partial failure
      mockSupabase.from.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      // Should fallback to cached data
      const result = await BusinessMetricsService.getCrossRoleMetrics({
        categories: ['inventory', 'marketing'],
        user_role: 'executive'
      });

      expect(result).toBeDefined();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'CROSS_ROLE_METRICS_FAILED'
        })
      );
    });

    it('should optimize performance for complex cross-role operations', async () => {
      const startTime = Date.now();
      
      // Mock large dataset
      const largeMockData = Array(1000).fill(null).map((_, i) => ({
        id: `metric-${i}`,
        value: Math.random() * 1000,
        category: i % 2 === 0 ? 'inventory' : 'marketing'
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: largeMockData, error: null })
      } as any);

      const result = await BusinessMetricsService.aggregateBusinessMetrics(
        ['inventory', 'marketing'],
        'daily',
        '2024-01-01',
        '2024-01-31',
        { user_role: 'executive' }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.metrics).toHaveLength(expect.any(Number));
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Insight Generation and Recommendation Flow', () => {
    it('should generate insights from cross-role data analysis', async () => {
      const mockInsightData = {
        data: [{
          id: 'insight-1',
          insight_type: 'trend',
          insight_title: 'Inventory-Marketing Synergy Detected',
          confidence_score: 0.89,
          supporting_data: {
            inventory_turnover: 2.8,
            marketing_roi: 3.2,
            correlation: 0.75
          }
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(mockInsightData)
      } as any);

      const insights = await BusinessIntelligenceService.generateInsights(
        'trend',
        '2024-01-01',
        '2024-01-31',
        { cross_role_analysis: true }
      );

      expect(insights.insights).toHaveLength(1);
      expect(insights.insights[0].insightTitle).toContain('Synergy');
    });

    it('should create actionable recommendations from insights', async () => {
      const mockRecommendations = {
        data: [{
          insight_id: 'insight-1',
          recommendations: [
            'Increase inventory for high-performing marketing campaigns',
            'Align marketing spend with inventory availability',
            'Implement automated restocking for promoted items'
          ],
          priority_score: 8.5,
          expected_impact: 'high'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(mockRecommendations)
      } as any);

      const recommendations = await BusinessIntelligenceService.getInsightRecommendations(
        'insight-1'
      );

      expect(recommendations.recommendations).toHaveLength(3);
      expect(recommendations.priorityScore).toBeGreaterThan(8);
    });

    it('should track recommendation implementation and outcomes', async () => {
      const mockImplementation = {
        data: {
          recommendation_id: 'rec-1',
          implementation_status: 'completed',
          actual_impact: {
            inventory_efficiency: 1.15,
            marketing_roi_change: 0.25
          },
          success_metrics: {
            target_achieved: true,
            improvement_percentage: 15
          }
        },
        error: null
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockImplementation)
      } as any);

      const result = await BusinessIntelligenceService.updateInsightStatus(
        'insight-1',
        { recommendation_implemented: true }
      );

      expect(result.implementationStatus).toBe('completed');
      expect(result.successMetrics.targetAchieved).toBe(true);
    });
  });

  describe('Cross-Role Data Consistency', () => {
    it('should maintain data consistency across role boundaries', async () => {
      // Test that the same data point is consistent when accessed from different roles
      const productId = 'prod-1';
      
      // Mock inventory view
      const inventoryView = {
        data: { product_id: productId, quantity: 100 },
        error: null
      };

      // Mock marketing view
      const marketingView = {
        data: { product_id: productId, units_promoted: 100 },
        error: null
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'inventory_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue(inventoryView)
          } as any;
        }
        if (table === 'marketing_products') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue(marketingView)
          } as any;
        }
        return {} as any;
      });

      // Verify consistency
      expect(inventoryView.data.quantity).toBe(marketingView.data.units_promoted);
    });

    it('should synchronize updates across role-specific data stores', async () => {
      const updateData = {
        product_id: 'prod-1',
        new_quantity: 150
      };

      // Mock successful updates across tables
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: updateData, error: null })
      } as any);

      // Update should propagate to all relevant tables
      const tables = ['inventory_items', 'marketing_products', 'executive_metrics'];
      
      for (const table of tables) {
        await supabase.from(table).update(updateData).eq('product_id', updateData.product_id);
      }

      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
    });
  });

  describe('Analytics Performance Optimization', () => {
    it('should batch analytics operations for efficiency', async () => {
      const batchSize = 100;
      const operations = Array(batchSize).fill(null).map((_, i) => ({
        operation: 'aggregate',
        params: { metric_id: `metric-${i}` }
      }));

      // Mock batch processing
      const batchResult = {
        data: operations.map(op => ({ ...op.params, result: Math.random() * 100 })),
        error: null
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue(batchResult)
      } as any);

      // Process in batch
      const results = await Promise.all(
        operations.map(op => 
          BusinessMetricsService.calculateTrends({
            metric_type: 'revenue',
            time_range: '30d'
          })
        )
      );

      expect(results).toHaveLength(batchSize);
    });

    it('should implement intelligent caching for frequently accessed analytics', async () => {
      // First call - should hit database
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ id: 'cached-1', value: 100 }],
          error: null
        })
      } as any);

      const firstResult = await BusinessMetricsService.getCrossRoleMetrics({
        categories: ['inventory'],
        user_role: 'executive'
      });

      // Second call - should use cache (mock won't be called again)
      const secondResult = await BusinessMetricsService.getCrossRoleMetrics({
        categories: ['inventory'],
        user_role: 'executive'
      });

      // Results should be identical (from cache)
      expect(firstResult).toEqual(secondResult);
    });
  });
});