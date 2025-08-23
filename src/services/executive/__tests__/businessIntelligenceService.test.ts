// Mock ValidationMonitor before importing service (exact authService pattern)
jest.mock('../../../utils/validationMonitor');

import { BusinessIntelligenceService } from '../businessIntelligenceService';
import { ValidationMonitor } from '../../../utils/validationMonitor';

// Mock the supabase module at the service level (exact authService pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock-based service testing (following successful pattern)
describe('BusinessIntelligenceService - Phase 4.2', () => {
  
  // Helper function to create complete business insight data
  const createMockInsight = (overrides: Partial<any> = {}) => ({
    id: `insight-${Math.random().toString(36).substr(2, 9)}`,
    insight_type: 'correlation',
    insight_title: 'Test Business Insight',
    insight_description: 'Test insight description for business intelligence',
    confidence_score: 0.85,
    impact_level: 'high',
    affected_areas: ['inventory', 'marketing'],
    supporting_data: { correlationCoefficient: 0.75, sampleSize: 100 },
    recommendation_actions: ['Increase inventory levels', 'Optimize marketing campaigns'],
    insight_date_range: '[2024-01-01,2024-01-31)',
    generated_by: 'system',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  });

  // Helper function to create complete query chain mocks
  const createQueryChainMock = (data: any[], error: any = null) => {
    const mockMethods = {
      select: jest.fn(),
      in: jest.fn(),
      eq: jest.fn(),
      gte: jest.fn(),
      lte: jest.fn(),
      order: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
      single: jest.fn(),
      range: jest.fn()
    };

    // Chain all methods to return the next method in the chain
    mockMethods.select.mockReturnValue(mockMethods);
    mockMethods.in.mockReturnValue(mockMethods);
    mockMethods.eq.mockReturnValue(mockMethods);
    mockMethods.gte.mockReturnValue(mockMethods);
    mockMethods.lte.mockReturnValue(mockMethods);
    mockMethods.update.mockReturnValue(mockMethods);
    mockMethods.insert.mockReturnValue(mockMethods);
    mockMethods.range.mockReturnValue(mockMethods);
    
    // Terminal methods return the data
    mockMethods.order.mockResolvedValue({ data, error });
    mockMethods.single.mockResolvedValue({ data: data[0] || null, error });
    
    // Also handle direct resolution (in case .order() isn't called)
    Object.assign(mockMethods, { 
      then: (resolve: any) => resolve({ data, error }),
      catch: (reject: any) => error ? reject(error) : Promise.resolve({ data, error })
    });

    return mockMethods;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Supabase mocks to prevent state contamination
    if (global.resetSupabaseMocks) {
      global.resetSupabaseMocks();
    }
  });

  // Debug test to verify basic mocking
  it('should verify supabase mock is working', async () => {
    const testData = [{ id: 'test-123', insight_type: 'correlation' }];
    mockSupabase.from.mockReturnValue(createQueryChainMock(testData));
    
    // Direct call to verify mock
    const mockResult = await mockSupabase.from('business_insights').select('*').order('id');
    
    expect(mockSupabase.from).toHaveBeenCalledWith('business_insights');
    expect(mockResult.data).toEqual(testData);
  });

  describe('generateInsights', () => {
    it('should generate automated insights with confidence scoring', async () => {
      // Mock data for insight generation
      const mockInsights = [
        createMockInsight({
          id: 'insight-1',
          insight_type: 'correlation',
          insight_title: 'Inventory-Marketing Correlation',
          confidence_score: 0.89,
          impact_level: 'high',
          affected_areas: ['inventory', 'marketing'],
          supporting_data: {
            correlationCoefficient: 0.82,
            statisticalSignificance: 0.001,
            sampleSize: 150
          }
        }),
        createMockInsight({
          id: 'insight-2',
          insight_type: 'trend',
          insight_title: 'Seasonal Sales Pattern',
          confidence_score: 0.75,
          impact_level: 'medium',
          affected_areas: ['sales'],
          supporting_data: {
            trendDirection: 'increasing',
            seasonalFactor: 1.2,
            dataPoints: 90
          }
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockInsights));

      const result = await BusinessIntelligenceService.generateInsights(
        'correlation',
        '2024-01-01',
        '2024-01-31'
      );

      expect(result.insights).toBeDefined();
      expect(result.insights).toHaveLength(2);
      expect(result.insights[0].confidenceScore).toBeGreaterThan(0.8);
      expect(result.insights[0].impactLevel).toBe('high');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle insight generation with statistical validation', async () => {
      const mockCorrelationData = [
        createMockInsight({
          id: 'insight-correlation-1',
          insight_type: 'correlation',
          confidence_score: 0.92,
          supporting_data: {
            correlationCoefficient: 0.87,
            statisticalSignificance: 0.0001,
            sampleSize: 200,
            validationTests: ['pearson', 'spearman']
          }
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockCorrelationData));

      const result = await BusinessIntelligenceService.generateInsights(
        'correlation',
        '2024-01-01',
        '2024-01-31',
        { minConfidence: 0.8, includeStatisticalValidation: true }
      );

      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].supportingData.statisticalSignificance).toBeLessThan(0.05);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('getInsightsByImpact', () => {
    it('should get insights filtered by impact level with role-based access control', async () => {
      // Mock role permission check
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(true)
      };

      const mockHighImpactInsights = [
        createMockInsight({
          id: 'insight-high-1',
          impact_level: 'high',
          affected_areas: ['inventory', 'sales'],
          confidence_score: 0.91
        }),
        createMockInsight({
          id: 'insight-high-2',
          impact_level: 'high',
          affected_areas: ['marketing'],
          confidence_score: 0.88
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockHighImpactInsights));

      const result = await BusinessIntelligenceService.getInsightsByImpact(
        'high',
        { user_role: 'executive', user_id: 'user-123' }
      );

      expect(result).toHaveLength(2);
      expect(result[0].impactLevel).toBe('high');
      expect(result[0].confidenceScore).toBeGreaterThan(0.8);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should enforce role restrictions for insight access', async () => {
      // Mock role permission to fail for restricted access
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(false)
      };

      await expect(
        BusinessIntelligenceService.getInsightsByImpact(
          'high',
          { user_role: 'inventory_staff', user_id: 'user-123' }
        )
      ).rejects.toThrow('Insufficient permissions for business intelligence access');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('correlateBusinessData', () => {
    it('should correlate cross-role business data with statistical analysis', async () => {
      const mockCorrelationData = [
        createMockInsight({
          id: 'correlation-1',
          insight_type: 'correlation',
          supporting_data: {
            dataSource1: 'inventory_turnover',
            dataSource2: 'marketing_conversion',
            correlationCoefficient: 0.76,
            pValue: 0.002,
            sampleSize: 180
          }
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockCorrelationData));

      const result = await BusinessIntelligenceService.correlateBusinessData(
        'inventory_turnover',
        'marketing_conversion',
        '2024-01-01',
        '2024-01-31'
      );

      expect(result.correlationStrength).toBeDefined();
      expect(result.statisticalSignificance).toBeLessThan(0.05);
      expect(result.correlationCoefficient).toBeGreaterThan(0.7);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle correlation analysis with insufficient data', async () => {
      const mockError = { message: 'Insufficient data points for correlation analysis', code: 'INSUFFICIENT_DATA' };
      mockSupabase.from.mockReturnValue(createQueryChainMock([], mockError));

      await expect(
        BusinessIntelligenceService.correlateBusinessData(
          'limited_data_source1',
          'limited_data_source2',
          '2024-01-01',
          '2024-01-02'
        )
      ).rejects.toThrow('Insufficient data points for correlation analysis');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('updateInsightStatus', () => {
    it('should update insight status with lifecycle management', async () => {
      const mockUpdatedInsight = [
        createMockInsight({
          id: 'insight-update-1',
          is_active: false,
          updated_at: '2024-01-15T10:00:00Z'
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockUpdatedInsight));

      const result = await BusinessIntelligenceService.updateInsightStatus(
        'insight-update-1',
        { is_active: false, status_reason: 'Insight no longer relevant' }
      );

      expect(result.isActive).toBe(false);
      expect(result.updatedAt).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should validate status update permissions', async () => {
      const mockError = { message: 'Permission denied for insight status update', code: 'PERMISSION_DENIED' };
      mockSupabase.from.mockReturnValue(createQueryChainMock([], mockError));

      await expect(
        BusinessIntelligenceService.updateInsightStatus(
          'restricted-insight-1',
          { is_active: false },
          { user_role: 'inventory_staff' }
        )
      ).rejects.toThrow('Permission denied for insight status update');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('getInsightRecommendations', () => {
    it('should get actionable recommendations from insights', async () => {
      const mockRecommendationInsights = [
        createMockInsight({
          id: 'rec-insight-1',
          insight_type: 'recommendation',
          recommendation_actions: [
            'Increase safety stock levels by 15%',
            'Optimize marketing spend allocation',
            'Implement demand forecasting'
          ],
          confidence_score: 0.87,
          impact_level: 'high'
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockRecommendationInsights));

      const result = await BusinessIntelligenceService.getInsightRecommendations(
        'high',
        { focus_areas: ['inventory', 'marketing'] }
      );

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].actions).toHaveLength(3);
      expect(result.recommendations[0].confidenceScore).toBeGreaterThan(0.8);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should prioritize recommendations by impact and confidence', async () => {
      const mockPrioritizedInsights = [
        createMockInsight({
          id: 'priority-1',
          confidence_score: 0.95,
          impact_level: 'critical',
          recommendation_actions: ['Immediate action required']
        }),
        createMockInsight({
          id: 'priority-2',
          confidence_score: 0.80,
          impact_level: 'high',
          recommendation_actions: ['Schedule for next week']
        }),
        createMockInsight({
          id: 'priority-3',
          confidence_score: 0.70,
          impact_level: 'medium',
          recommendation_actions: ['Consider for future planning']
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockPrioritizedInsights));

      const result = await BusinessIntelligenceService.getInsightRecommendations(
        'all',
        { sort_by_priority: true }
      );

      expect(result.recommendations[0].impactLevel).toBe('critical');
      expect(result.recommendations[0].confidenceScore).toBeGreaterThan(0.9);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('detectAnomalies', () => {
    it('should detect statistical anomalies with alerting', async () => {
      const mockAnomalyInsights = [
        createMockInsight({
          id: 'anomaly-1',
          insight_type: 'anomaly',
          insight_title: 'Unusual Sales Spike Detected',
          confidence_score: 0.94,
          impact_level: 'high',
          supporting_data: {
            anomalyType: 'outlier',
            deviationScore: 3.2,
            threshold: 2.5,
            expectedValue: 1000,
            actualValue: 1800,
            detectionMethod: 'z_score'
          }
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockAnomalyInsights));

      const result = await BusinessIntelligenceService.detectAnomalies(
        'sales',
        '2024-01-01',
        '2024-01-31',
        { sensitivity: 'high', threshold: 2.5 }
      );

      expect(result.anomalies).toBeDefined();
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].deviationScore).toBeGreaterThan(3);
      expect(result.anomalies[0].shouldAlert).toBe(true);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle anomaly detection with configurable thresholds', async () => {
      const mockLowSensitivityData = [];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockLowSensitivityData));

      const result = await BusinessIntelligenceService.detectAnomalies(
        'inventory',
        '2024-01-01',
        '2024-01-31',
        { sensitivity: 'low', threshold: 4.0 }
      );

      expect(result.anomalies).toHaveLength(0);
      expect(result.threshold).toBe(4.0);
      expect(result.sensitivity).toBe('low');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Integration with Business Metrics', () => {
    it('should integrate with business metrics for comprehensive intelligence', async () => {
      // Mock metrics data integration
      const mockMetricsService = require('../businessMetricsService');
      mockMetricsService.BusinessMetricsService = {
        aggregateBusinessMetrics: jest.fn().mockResolvedValue({
          metrics: [{ category: 'inventory', value: 1250 }],
          correlations: { 'inventory-marketing': 0.78 }
        })
      };

      const mockIntegratedInsights = [
        createMockInsight({
          id: 'integrated-1',
          supporting_data: {
            metricsIntegration: true,
            correlatedMetrics: ['inventory_turnover', 'marketing_roi']
          }
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockIntegratedInsights));

      const result = await BusinessIntelligenceService.generateInsights(
        'correlation',
        '2024-01-01',
        '2024-01-31',
        { integrate_metrics: true }
      );

      expect(result.insights[0].supportingData.metricsIntegration).toBe(true);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Cross-role Intelligence Analytics', () => {
    it('should provide intelligence analytics across all roles', async () => {
      // Mock role permission check
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(true)
      };

      const mockCrossRoleInsights = [
        createMockInsight({
          id: 'cross-role-1',
          affected_areas: ['inventory', 'marketing', 'sales'],
          insight_type: 'correlation',
          confidence_score: 0.89
        })
      ];

      mockSupabase.from.mockReturnValue(createQueryChainMock(mockCrossRoleInsights));

      const result = await BusinessIntelligenceService.generateInsights(
        'correlation',
        '2024-01-01',
        '2024-01-31',
        { cross_role_analysis: true, user_role: 'executive' }
      );

      expect(result.insights[0].affectedAreas).toContain('inventory');
      expect(result.insights[0].affectedAreas).toContain('marketing');
      expect(result.insights[0].affectedAreas).toContain('sales');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Performance Validation', () => {
    it('should handle large insight generation operations efficiently', async () => {
      // Setup mock for performance testing
      const largeInsightDataset = Array.from({ length: 500 }, (_, i) => 
        createMockInsight({
          id: `insight-${i+100}`,
          confidence_score: Math.random() * 0.4 + 0.6, // 0.6-1.0 range
          insight_type: 'trend'
        })
      );

      mockSupabase.from.mockReturnValue(createQueryChainMock(largeInsightDataset));

      const startTime = Date.now();
      const result = await BusinessIntelligenceService.generateInsights(
        'trend',
        '2024-01-01',
        '2024-12-31'
      );
      const endTime = Date.now();

      expect(result.insights).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete in under 3 seconds
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });
});