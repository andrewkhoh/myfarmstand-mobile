import { SimplifiedSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { createUser, resetAllFactories } from '../../../test/factories';
import { PredictiveAnalyticsService } from '../predictiveAnalyticsService';

// Mock ValidationMonitor
jest.mock('../../../utils/validationMonitor');
const { ValidationMonitor } = require('../../../utils/validationMonitor');

// Mock Supabase
jest.mock('../../../config/supabase', () => ({
  supabase: null // Will be set in beforeEach
}));

describe('PredictiveAnalyticsService', () => {
  let supabaseMock: SimplifiedSupabaseMock;
  const testUser = createUser();
  
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllFactories();
    
    // Create and inject mock
    supabaseMock = new SimplifiedSupabaseMock();
    require('../../../config/supabase').supabase = supabaseMock.createClient();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Helper function to create complete predictive forecast data
  const createMockForecast = (overrides: Partial<any> = {}) => ({
    id: `forecast-${Math.random().toString(36).substr(2, 9)}`,
    forecast_type: 'demand',
    forecast_target: 'inventory_demand',
    forecast_period: '[2024-02-01,2024-02-29)',
    model_type: 'linear_regression',
    forecast_values: {
      predictions: [
        { date: '2024-02-01', value: 1250, confidence: 0.89 },
        { date: '2024-02-02', value: 1180, confidence: 0.87 },
        { date: '2024-02-03', value: 1320, confidence: 0.91 }
      ],
      summary: { average: 1250, trend: 'increasing', volatility: 'low' }
    },
    confidence_intervals: {
      upper_bound: [1350, 1280, 1420],
      lower_bound: [1150, 1080, 1220],
      confidence_level: 0.95
    },
    model_accuracy: 0.87,
    input_features: ['historical_demand', 'seasonal_factors', 'marketing_campaigns'],
    generated_at: '2024-01-15T10:00:00Z',
    expires_at: '2024-03-01T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides
  });


  // Debug test to verify basic mocking
  it('should verify supabase mock is working', async () => {
    const testData = [{ id: 'test-123', forecast_type: 'demand' }];
    supabaseMock.setTableData('predictive_forecasts', testData);
    
    // Direct call to verify mock
    const { supabase } = require('../../../config/supabase');
    const mockResult = await supabase.from('predictive_forecasts').select('*').order('id');
    
    expect(mockResult.data).toEqual(testData);
  });

  describe('generateForecast', () => {
    it('should generate forecast with multiple prediction model support', async () => {
      // Mock forecast generation data
      const mockForecastData = [
        createMockForecast({
          id: 'forecast-1',
          forecast_type: 'demand',
          model_type: 'seasonal_decomposition',
          forecast_values: {
            predictions: Array.from({ length: 30 }, (_, i) => ({
              date: `2024-02-${String(i + 1).padStart(2, '0')}`,
              value: 1200 + Math.sin(i / 7) * 200,
              confidence: 0.85 + Math.random() * 0.1
            })),
            seasonality: {
              weekly_pattern: [1.1, 1.0, 0.9, 0.95, 1.05, 1.2, 1.15],
              monthly_factor: 1.08
            }
          },
          model_accuracy: 0.91
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockForecastData);

      const result = await PredictiveAnalyticsService.generateForecast(
        'demand',
        'inventory_turnover',
        '2024-02-01',
        '2024-02-29',
        {
          model_type: 'seasonal_decomposition',
          include_seasonality: true,
          confidence_level: 0.95
        }
      );

      expect(result.forecastData).toBeDefined();
      expect(result.forecastData.predictions).toHaveLength(30);
      expect(result.modelAccuracy).toBeGreaterThan(0.9);
      expect(result.confidenceIntervals).toBeDefined();
      expect(result.modelType).toBe('seasonal_decomposition');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should support multiple forecasting algorithms', async () => {
      const mockMultiModelData = [
        createMockForecast({
          id: 'multi-model-1',
          model_type: 'ensemble',
          forecast_values: {
            ensemble_results: {
              linear_regression: { accuracy: 0.82, weight: 0.3 },
              seasonal_decomposition: { accuracy: 0.89, weight: 0.4 },
              arima: { accuracy: 0.85, weight: 0.3 }
            },
            combined_prediction: { value: 1275, confidence: 0.92 }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockMultiModelData);

      const result = await PredictiveAnalyticsService.generateForecast(
        'revenue',
        'monthly_revenue',
        '2024-02-01',
        '2024-02-29',
        { 
          model_type: 'ensemble',
          ensemble_methods: ['linear_regression', 'seasonal_decomposition', 'arima']
        }
      );

      expect(result.forecastData.ensembleResults).toBeDefined();
      expect(result.forecastData.combinedPrediction).toBeDefined();
      expect(result.modelAccuracy).toBeGreaterThan(0.9);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('validateModelAccuracy', () => {
    it('should validate model accuracy with statistical validation and confidence intervals', async () => {
      const mockAccuracyData = [
        createMockForecast({
          id: 'accuracy-test-1',
          model_accuracy: 0.87,
          forecast_values: {
            validation_metrics: {
              mae: 45.2, // Mean Absolute Error
              rmse: 67.8, // Root Mean Square Error
              mape: 3.2, // Mean Absolute Percentage Error
              r_squared: 0.87
            },
            cross_validation: {
              folds: 5,
              average_accuracy: 0.85,
              std_deviation: 0.03
            }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockAccuracyData);

      const result = await PredictiveAnalyticsService.validateModelAccuracy(
        'accuracy-test-1',
        {
          validation_method: 'cross_validation',
          test_data_percentage: 0.2,
          include_statistical_tests: true
        }
      );

      expect(result.accuracy).toBe(0.87);
      expect(result.validationMetrics.mae).toBeLessThan(50);
      expect(result.validationMetrics.rSquared).toBeGreaterThan(0.8);
      expect(result.crossValidation.folds).toBe(5);
      expect(result.isStatisticallySignificant).toBe(true);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should detect model overfitting and suggest improvements', async () => {
      const mockOverfittingData = [
        createMockForecast({
          id: 'overfitting-test-1',
          model_accuracy: 0.98, // Too high - likely overfitting
          forecast_values: {
            validation_metrics: {
              training_accuracy: 0.98,
              validation_accuracy: 0.65, // Much lower - overfitting
              test_accuracy: 0.62
            },
            overfitting_indicators: {
              accuracy_gap: 0.33,
              complexity_score: 0.95,
              recommendation: 'reduce_model_complexity'
            }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockOverfittingData);

      const result = await PredictiveAnalyticsService.validateModelAccuracy(
        'overfitting-test-1',
        { detect_overfitting: true }
      );

      expect(result.overfittingDetected).toBe(true);
      expect(result.accuracyGap).toBeGreaterThan(0.3);
      expect(result.recommendations).toContain('reduce_model_complexity');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('updateForecastData', () => {
    it('should update forecast data with model retraining and accuracy tracking', async () => {
      const mockUpdatedForecast = [
        createMockForecast({
          id: 'update-forecast-1',
          model_accuracy: 0.91, // Improved after retraining
          forecast_values: {
            retraining_history: [
              { date: '2024-01-01', accuracy: 0.84 },
              { date: '2024-01-15', accuracy: 0.91 }
            ],
            updated_predictions: true,
            new_input_features: ['market_trends', 'economic_indicators']
          },
          generated_at: '2024-01-15T10:00:00Z'
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockUpdatedForecast);

      const result = await PredictiveAnalyticsService.updateForecastData(
        'update-forecast-1',
        {
          retrain_model: true,
          add_features: ['market_trends', 'economic_indicators'],
          update_period: '2024-01-15,2024-02-15'
        }
      );

      expect(result.modelAccuracy).toBe(0.91);
      expect(result.forecastValues.retrainingHistory).toBeDefined();
      expect(result.forecastValues.newInputFeatures).toContain('market_trends');
      expect(result.generatedAt).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle incremental model updates with performance tracking', async () => {
      const mockIncrementalUpdate = [
        createMockForecast({
          id: 'incremental-1',
          forecast_values: {
            incremental_updates: {
              data_points_added: 150,
              accuracy_change: 0.03,
              processing_time_ms: 1200,
              update_type: 'incremental'
            }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockIncrementalUpdate);

      const result = await PredictiveAnalyticsService.updateForecastData(
        'incremental-1',
        { 
          update_type: 'incremental',
          new_data_points: 150,
          preserve_model_state: true
        }
      );

      expect(result.forecastValues.incrementalUpdates.dataPointsAdded).toBe(150);
      expect(result.forecastValues.incrementalUpdates.processingTimeMs).toBeLessThan(2000);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('getForecastByType', () => {
    it('should get forecasts filtered by type with role-based access control', async () => {
      // Mock role permission check
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(true)
      };

      const mockDemandForecasts = [
        createMockForecast({
          id: 'demand-1',
          forecast_type: 'demand',
          forecast_target: 'product_demand'
        }),
        createMockForecast({
          id: 'demand-2', 
          forecast_type: 'demand',
          forecast_target: 'seasonal_demand'
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockDemandForecasts);

      const result = await PredictiveAnalyticsService.getForecastByType(
        'demand',
        { 
          user_role: 'executive',
          active_only: true,
          sort_by: 'accuracy'
        }
      );

      expect(result).toHaveLength(2);
      expect(result[0].forecastType).toBe('demand');
      expect(result[1].forecastType).toBe('demand');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should enforce role-based access for forecast types', async () => {
      // Mock role permission to fail for restricted access
      const mockRolePermission = require('../../../services/role-based/rolePermissionService');
      mockRolePermission.RolePermissionService = {
        hasPermission: jest.fn().mockResolvedValue(false)
      };

      await expect(
        PredictiveAnalyticsService.getForecastByType(
          'revenue',
          { user_role: 'inventory_staff', user_id: 'user-123' }
        )
      ).rejects.toThrow('Insufficient permissions for revenue forecasting access');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('calculateConfidenceIntervals', () => {
    it('should calculate confidence intervals with statistical analysis', async () => {
      const mockConfidenceData = [
        createMockForecast({
          id: 'confidence-1',
          confidence_intervals: {
            confidence_level: 0.95,
            upper_bound: [1350, 1280, 1420, 1390],
            lower_bound: [1150, 1080, 1220, 1210],
            interval_width: [200, 200, 200, 180],
            statistical_method: 'bootstrap'
          },
          forecast_values: {
            uncertainty_analysis: {
              prediction_variance: 0.12,
              model_uncertainty: 0.08,
              data_uncertainty: 0.04
            }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockConfidenceData);

      const result = await PredictiveAnalyticsService.calculateConfidenceIntervals(
        'confidence-1',
        {
          confidence_level: 0.95,
          method: 'bootstrap',
          iterations: 1000
        }
      );

      expect(result.confidenceLevel).toBe(0.95);
      expect(result.upperBound).toHaveLength(4);
      expect(result.lowerBound).toHaveLength(4);
      expect(result.uncertaintyAnalysis).toBeDefined();
      expect(result.statisticalMethod).toBe('bootstrap');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    it('should handle multiple confidence levels simultaneously', async () => {
      const mockMultiConfidenceData = [
        createMockForecast({
          id: 'multi-confidence-1',
          confidence_intervals: {
            confidence_80: { upper: [1300, 1250], lower: [1200, 1150] },
            confidence_90: { upper: [1320, 1270], lower: [1180, 1130] },
            confidence_95: { upper: [1350, 1300], lower: [1150, 1100] },
            confidence_99: { upper: [1400, 1350], lower: [1100, 1050] }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockMultiConfidenceData);

      const result = await PredictiveAnalyticsService.calculateConfidenceIntervals(
        'multi-confidence-1',
        { confidence_levels: [0.8, 0.9, 0.95, 0.99] }
      );

      expect(result.confidence80).toBeDefined();
      expect(result.confidence95).toBeDefined();
      expect(result.confidence99).toBeDefined();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Integration with Historical Data', () => {
    it('should integrate with historical data for improved predictions', async () => {
      // Mock integration with business metrics
      const mockBusinessMetricsService = require('../businessMetricsService');
      mockBusinessMetricsService.BusinessMetricsService = {
        getMetricsByCategory: jest.fn().mockResolvedValue([
          { metricName: 'inventory_turnover', metricValue: 2.5, metricDate: '2024-01-01' },
          { metricName: 'inventory_turnover', metricValue: 2.8, metricDate: '2024-01-02' }
        ])
      };

      const mockHistoricalForecast = [
        createMockForecast({
          id: 'historical-1',
          input_features: ['historical_metrics', 'seasonal_patterns', 'trend_analysis'],
          forecast_values: {
            historical_integration: {
              data_points_used: 365,
              historical_accuracy: 0.89,
              feature_importance: {
                historical_metrics: 0.45,
                seasonal_patterns: 0.35,
                trend_analysis: 0.20
              }
            }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockHistoricalForecast);

      const result = await PredictiveAnalyticsService.generateForecast(
        'inventory',
        'inventory_optimization',
        '2024-02-01',
        '2024-02-29',
        { 
          integrate_historical_data: true,
          historical_period_days: 365
        }
      );

      expect(result.forecastValues.historicalIntegration).toBeDefined();
      expect(result.forecastValues.historicalIntegration.dataPointsUsed).toBe(365);
      expect(mockBusinessMetricsService.BusinessMetricsService.getMetricsByCategory).toHaveBeenCalled();
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Performance Validation for Forecasting', () => {
    it('should handle complex forecasting operations within performance targets', async () => {
      const mockComplexForecast = [
        createMockForecast({
          id: 'complex-forecast-1',
          forecast_values: {
            complexity_metrics: {
              input_features: 25,
              data_points: 10000,
              model_parameters: 150,
              prediction_horizon_days: 90
            },
            performance_metrics: {
              training_time_ms: 4500,
              prediction_time_ms: 150,
              memory_usage_mb: 45
            }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockComplexForecast);

      const startTime = Date.now();
      const result = await PredictiveAnalyticsService.generateForecast(
        'demand',
        'complex_demand_pattern',
        '2024-02-01',
        '2024-04-30',
        { 
          model_complexity: 'high',
          feature_count: 25,
          prediction_horizon: 90
        }
      );
      const endTime = Date.now();

      expect(result.forecastData).toBeDefined();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(result.forecastValues.performanceMetrics.trainingTimeMs).toBeLessThan(5000);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });

  describe('Forecast Accuracy Monitoring', () => {
    it('should continuously monitor and improve forecast accuracy', async () => {
      const mockAccuracyMonitoring = [
        createMockForecast({
          id: 'accuracy-monitoring-1',
          forecast_values: {
            accuracy_tracking: {
              initial_accuracy: 0.82,
              current_accuracy: 0.89,
              improvement_trend: 'increasing',
              monitoring_period_days: 30,
              accuracy_alerts: {
                threshold: 0.8,
                alert_triggered: false,
                last_check: '2024-01-15T10:00:00Z'
              }
            }
          }
        })
      ];

      supabaseMock.setTableData('predictive_forecasts', mockAccuracyMonitoring);

      const result = await PredictiveAnalyticsService.validateModelAccuracy(
        'accuracy-monitoring-1',
        { 
          enable_continuous_monitoring: true,
          accuracy_threshold: 0.8,
          monitoring_frequency: 'daily'
        }
      );

      expect(result.accuracyTracking).toBeDefined();
      expect(result.accuracyTracking.improvementTrend).toBe('increasing');
      expect(result.accuracyTracking.accuracyAlerts.alertTriggered).toBe(false);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });
  });
});