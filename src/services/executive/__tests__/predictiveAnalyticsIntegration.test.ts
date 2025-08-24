import { SimplifiedSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { createUser, resetAllFactories } from '../../../test/factories';
import { PredictiveAnalyticsService } from '../predictiveAnalyticsService';
import { BusinessMetricsService } from '../businessMetricsService';
import { BusinessIntelligenceService } from '../businessIntelligenceService';
import { InventoryService } from '../../inventory/inventoryService';
import { MarketingCampaignService } from '../../marketing/marketingCampaignService';

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const { ValidationMonitor } = require('../../../utils/validationMonitor');

// Mock Supabase
jest.mock('../../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('Predictive Analytics Integration', () => {
  let supabaseMock: SimplifiedSupabaseMock;
  const testUser = createUser();
  
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    
    // Create and inject mock
    supabaseMock = new SimplifiedSupabaseMock();
    require('../../../config/supabase').supabase = supabaseMock.createClient();
  });

  describe('End-to-End Forecasting Pipeline', () => {
    it('should execute complete forecasting pipeline with model validation', async () => {
      // Mock historical data
      const mockHistoricalData = {
        data: [
          { date: '2024-01-01', value: 100000 },
          { date: '2024-01-02', value: 102000 },
          { date: '2024-01-03', value: 98000 },
          { date: '2024-01-04', value: 105000 },
          { date: '2024-01-05', value: 108000 }
        ],
        error: null
      };

      // Mock model validation results
      const mockValidation = {
        data: {
          model_id: 'model-1',
          accuracy: 0.92,
          mape: 8.5,
          rmse: 1250,
          is_valid: true
        },
        error: null
      };

      // Mock forecast generation
      const mockForecast = {
        data: {
          forecast_id: 'forecast-1',
          forecast_value: 112000,
          confidence_interval: [105000, 119000],
          confidence_level: 0.95
        },
        error: null
      };

      supabaseMock.setTableData('historical_metrics', mockHistoricalData.data);
      supabaseMock.setTableData('model_validations', [mockValidation.data]);
      supabaseMock.setTableData('predictive_forecasts', [mockForecast.data]);

      // Execute pipeline
      const forecast = await PredictiveAnalyticsService.generateForecast({
        forecast_type: 'demand',
        time_horizon: 'week',
        include_validation: true
      });

      expect(forecast).toBeDefined();
      expect(forecast.forecastValue).toBe(112000);
      expect(forecast.modelAccuracy).toBeGreaterThan(0.9);
    });

    it('should track and validate predictive model accuracy over time', async () => {
      const mockAccuracyTracking = {
        data: [
          { date: '2024-01-01', predicted: 100000, actual: 98000, accuracy: 0.98 },
          { date: '2024-01-02', predicted: 102000, actual: 103000, accuracy: 0.99 },
          { date: '2024-01-03', predicted: 105000, actual: 104000, accuracy: 0.99 }
        ],
        error: null
      };

      supabaseMock.setTableData('accuracy_tracking', mockAccuracyTracking.data);

      const validation = await PredictiveAnalyticsService.validateModelAccuracy(
        'model-1',
        {
          start_date: '2024-01-01',
          end_date: '2024-01-03'
        }
      );

      expect(validation.averageAccuracy).toBeGreaterThan(0.95);
      expect(validation.isValid).toBe(true);
    });

    it('should trigger model retraining when accuracy degrades', async () => {
      const mockDegradedAccuracy = {
        data: {
          model_id: 'model-1',
          current_accuracy: 0.75,
          threshold_accuracy: 0.85,
          degradation_detected: true,
          retraining_required: true
        },
        error: null
      };

      supabaseMock.setTableData('model_accuracy', [mockDegradedAccuracy.data]);

      const result = await PredictiveAnalyticsService.validateModelAccuracy(
        'model-1',
        { continuous_monitoring: true }
      );

      expect(result.retrainingRequired).toBe(true);
      expect(result.currentAccuracy).toBeLessThan(result.thresholdAccuracy);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: 'model_retraining_triggered'
        })
      );
    });

    it('should integrate historical data from inventory and marketing', async () => {
      // Mock integrated historical data
      const mockInventoryHistory = {
        data: [
          { date: '2024-01-01', inventory_turnover: 2.5 },
          { date: '2024-01-02', inventory_turnover: 2.7 },
          { date: '2024-01-03', inventory_turnover: 2.4 }
        ],
        error: null
      };

      const mockMarketingHistory = {
        data: [
          { date: '2024-01-01', campaign_roi: 3.2 },
          { date: '2024-01-02', campaign_roi: 3.5 },
          { date: '2024-01-03', campaign_roi: 3.1 }
        ],
        error: null
      };

      supabaseMock.setTableData('inventory_metrics', mockInventoryHistory.data);
      supabaseMock.setTableData('marketing_metrics', mockMarketingHistory.data);

      const integratedForecast = await PredictiveAnalyticsService.generateForecast({
        forecast_type: 'integrated',
        data_sources: ['inventory', 'marketing'],
        time_horizon: 'month'
      });

      expect(integratedForecast.dataSources).toContain('inventory');
      expect(integratedForecast.dataSources).toContain('marketing');
      expect(integratedForecast.forecastAccuracy).toBeGreaterThan(0.85);
    });

    it('should generate forecast-based recommendations with validation', async () => {
      const mockForecastRecommendations = {
        data: {
          forecast_id: 'forecast-1',
          recommendations: [
            {
              action: 'Increase inventory by 20%',
              confidence: 0.88,
              expected_impact: 'high',
              risk_level: 'low'
            },
            {
              action: 'Launch targeted marketing campaign',
              confidence: 0.85,
              expected_impact: 'medium',
              risk_level: 'medium'
            }
          ],
          validation_score: 0.91
        },
        error: null
      };

      supabaseMock.setTableData('forecast_recommendations', [mockForecastRecommendations.data]);

      const recommendations = await BusinessIntelligenceService.getInsightRecommendations(
        'forecast-1'
      );

      expect(recommendations.recommendations).toHaveLength(2);
      expect(recommendations.validationScore).toBeGreaterThan(0.9);
      expect(recommendations.recommendations[0].confidence).toBeGreaterThan(0.85);
    });

    it('should validate statistical significance and confidence intervals', async () => {
      const mockStatisticalValidation = {
        data: {
          forecast_id: 'forecast-1',
          point_estimate: 115000,
          confidence_intervals: {
            '95%': { lower: 108000, upper: 122000 },
            '90%': { lower: 110000, upper: 120000 },
            '80%': { lower: 112000, upper: 118000 }
          },
          standard_error: 2500,
          p_value: 0.001,
          is_statistically_significant: true
        },
        error: null
      };

      supabaseMock.setTableData('statistical_validation', [mockStatisticalValidation.data]);

      const intervals = await PredictiveAnalyticsService.calculateConfidenceIntervals(
        'forecast-1',
        { confidence_levels: [0.95, 0.90, 0.80] }
      );

      expect(intervals.intervals['95%'].lower).toBe(108000);
      expect(intervals.intervals['95%'].upper).toBe(122000);
      expect(intervals.isStatisticallySignificant).toBe(true);
      expect(intervals.pValue).toBeLessThan(0.05);
    });
  });

  describe('Forecast Performance and Optimization', () => {
    it('should handle large historical datasets efficiently', async () => {
      const largeDataset = Array(10000).fill(null).map((_, i) => ({
        date: new Date(2024, 0, 1 + Math.floor(i / 100)).toISOString(),
        value: 100000 + Math.random() * 20000
      }));

      supabaseMock.setTableData('large_dataset', largeDataset);

      const startTime = Date.now();
      
      const forecast = await PredictiveAnalyticsService.generateForecast({
        forecast_type: 'demand',
        time_horizon: 'quarter',
        large_dataset_optimization: true
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(forecast).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should optimize model selection based on data characteristics', async () => {
      const mockModelComparison = {
        data: {
          models_evaluated: ['arima', 'prophet', 'lstm', 'xgboost'],
          best_model: 'prophet',
          model_scores: {
            arima: { accuracy: 0.85, processing_time: 100 },
            prophet: { accuracy: 0.92, processing_time: 150 },
            lstm: { accuracy: 0.90, processing_time: 500 },
            xgboost: { accuracy: 0.89, processing_time: 200 }
          },
          selection_criteria: 'accuracy_weighted'
        },
        error: null
      };

      supabaseMock.setTableData('model_comparison', [mockModelComparison.data]);

      const result = await PredictiveAnalyticsService.getForecastByType(
        'demand',
        { auto_model_selection: true }
      );

      expect(result.selectedModel).toBe('prophet');
      expect(result.modelAccuracy).toBeGreaterThan(0.9);
    });

    it('should implement caching for frequently requested forecasts', async () => {
      const forecastParams = {
        forecast_type: 'demand',
        time_horizon: 'month'
      };

      // First call - generates new forecast
      const firstForecast = await PredictiveAnalyticsService.generateForecast(forecastParams);
      
      // Second call - should use cached result
      const secondForecast = await PredictiveAnalyticsService.generateForecast(forecastParams);

      // Verify same forecast returned (from cache)
      expect(firstForecast.forecastId).toBe(secondForecast.forecastId);
      expect(firstForecast.forecastValue).toBe(secondForecast.forecastValue);
    });

    it('should provide real-time forecast updates with minimal latency', async () => {
      const mockRealtimeUpdate = {
        data: {
          forecast_id: 'forecast-realtime',
          original_forecast: 110000,
          updated_forecast: 112000,
          update_reason: 'new_data_available',
          update_timestamp: new Date().toISOString()
        },
        error: null
      };

      supabaseMock.setTableData('realtime_updates', [mockRealtimeUpdate.data]);

      const startTime = Date.now();
      
      const updatedForecast = await PredictiveAnalyticsService.updateForecastData(
        'forecast-realtime',
        { real_time: true }
      );

      const endTime = Date.now();
      const updateLatency = endTime - startTime;

      expect(updatedForecast.updatedForecast).toBe(112000);
      expect(updateLatency).toBeLessThan(1000); // Update within 1 second
    });
  });
});