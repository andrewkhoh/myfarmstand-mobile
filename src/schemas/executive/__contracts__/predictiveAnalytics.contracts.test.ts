import { describe, it, expect } from '@jest/globals';
import type { MockDatabase } from './database-mock.types';
import { 
  PredictiveAnalyticsDatabaseSchema, 
  PredictiveAnalyticsTransformSchema,
  CreatePredictiveAnalyticsSchema,
  UpdatePredictiveAnalyticsSchema,
  type PredictiveAnalyticsDatabaseContract,
  type PredictiveAnalyticsTransform
} from '../predictiveAnalytics.schemas';
import type { z } from 'zod';

// Phase 1 Integration: Role-based permissions validation
import { ROLE_PERMISSIONS } from '../../role-based/rolePermission.schemas';

// CRITICAL: Compile-time contract enforcement (Pattern from architectural doc)
// This MUST compile - if it doesn't, schema transformation is incomplete
type PredictiveAnalyticsContract = z.infer<typeof PredictiveAnalyticsTransformSchema> extends PredictiveAnalyticsTransform 
  ? PredictiveAnalyticsTransform extends z.infer<typeof PredictiveAnalyticsTransformSchema> 
    ? true 
    : false 
  : false;

describe('Predictive Analytics Schema Contracts - Phase 4', () => {
  // Contract Test 0: Compile-time contract enforcement (CRITICAL PATTERN)
  it('must pass compile-time contract validation', () => {
    // This test validates that the contract type compiled successfully
    const contractIsValid: PredictiveAnalyticsContract = true;
    expect(contractIsValid).toBe(true);
    
    // If this test compiles, the schema-interface alignment is enforced at compile time
    // If the schema transformation doesn't match the interface exactly, TypeScript compilation will fail
  });

  // Contract Test 1: Database interface alignment (MANDATORY)
  it('must align with generated database types', () => {
    type DatabasePredictiveForecasts = MockDatabase['public']['Tables']['predictive_forecasts']['Row'];
    
    // This function MUST compile - if it doesn't, schema is wrong
    const contractValidator = (row: DatabasePredictiveForecasts): PredictiveAnalyticsDatabaseContract => {
      return {
        id: row.id,                                       // ✅ Compile fails if missing
        forecast_type: row.forecast_type,                 // ✅ Compile fails if missing  
        forecast_target: row.forecast_target,             // ✅ Compile fails if missing
        forecast_period: row.forecast_period,             // ✅ DATERANGE as string
        model_type: row.model_type,                       // ✅ Compile fails if missing
        forecast_values: row.forecast_values,             // ✅ JSONB NOT NULL
        confidence_intervals: row.confidence_intervals,   // ✅ JSONB nullable
        model_accuracy: row.model_accuracy,               // ✅ Nullable decimal
        input_features: row.input_features,               // ✅ TEXT[] array
        generated_at: row.generated_at,                   // ✅ Nullable timestamp
        expires_at: row.expires_at,                       // ✅ Nullable timestamp
        created_at: row.created_at                        // ✅ Nullable timestamp
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Transformation completeness validation (MANDATORY)
  it('must transform all database fields to interface fields', () => {
    const databaseData: PredictiveAnalyticsDatabaseContract = {
      id: 'forecast-123',
      forecast_type: 'demand',
      forecast_target: 'monthly_sales_volume',
      forecast_period: '[2024-02-01,2024-04-30)',
      model_type: 'seasonal_decomposition',
      forecast_values: {
        '2024-02': 1250,
        '2024-03': 1380,
        '2024-04': 1420
      },
      confidence_intervals: {
        '2024-02': { lower: 1150, upper: 1350 },
        '2024-03': { lower: 1280, upper: 1480 }
      },
      model_accuracy: 0.8750,
      input_features: ['historical_sales', 'seasonal_patterns', 'marketing_spend', 'inventory_levels'],
      generated_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-05-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z'
    };

    const transformed = PredictiveAnalyticsTransformSchema.parse(databaseData);
    
    // Verify EVERY interface field is populated (camelCase conversion)
    expect(transformed.id).toBe('forecast-123');
    expect(transformed.forecastType).toBe('demand');                    // Snake → camel
    expect(transformed.forecastTarget).toBe('monthly_sales_volume');    // Snake → camel
    expect(transformed.forecastPeriod).toBe('[2024-02-01,2024-04-30)'); // Snake → camel
    expect(transformed.modelType).toBe('seasonal_decomposition');       // Snake → camel
    expect(transformed.forecastValues).toBeDefined();                   // Snake → camel
    expect(transformed.confidenceIntervals).toBeDefined();              // Snake → camel
    expect(transformed.modelAccuracy).toBe(0.8750);                     // Snake → camel
    expect(transformed.inputFeatures).toHaveLength(4);                  // Snake → camel
    expect(transformed.generatedAt).toBeDefined();                      // Snake → camel
    expect(transformed.expiresAt).toBeDefined();                        // Snake → camel
    expect(transformed.createdAt).toBeDefined();                        // Snake → camel
    
    // Verify types are correct
    expect(typeof transformed.modelAccuracy).toBe('number');
    expect(typeof transformed.forecastValues).toBe('object');
    expect(Array.isArray(transformed.inputFeatures)).toBe(true);
  });

  // Contract Test 3: Forecast model validation with statistical constraints
  it('must validate forecast models with statistical constraints and accuracy tracking', () => {
    const complexForecastModel: PredictiveAnalyticsDatabaseContract = {
      id: 'forecast-456',
      forecast_type: 'revenue',
      forecast_target: 'quarterly_revenue_projection',
      forecast_period: '[2024-02-01,2024-04-30)',
      model_type: 'multivariate_regression',
      forecast_values: {
        methodology: 'ensemble_approach',
        base_models: ['linear_regression', 'random_forest', 'lstm'],
        weighted_predictions: {
          '2024-Q1': {
            linear_regression: 350000,
            random_forest: 365000,
            lstm: 375000,
            ensemble_prediction: 363333
          }
        },
        trend_components: {
          seasonal: 0.15,
          trend: 0.08,
          irregular: 0.03
        },
        model_performance: {
          r_squared: 0.89,
          rmse: 15000,
          mape: 0.045
        }
      },
      confidence_intervals: {
        '2024-Q1': {
          prediction: 363333,
          confidence_80: { lower: 340000, upper: 386000 },
          confidence_90: { lower: 335000, upper: 391000 },
          confidence_95: { lower: 330000, upper: 397000 }
        }
      },
      model_accuracy: 0.8900,
      input_features: [
        'historical_revenue',
        'market_trends', 
        'campaign_performance',
        'seasonal_factors',
        'economic_indicators'
      ],
      generated_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-07-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z'
    };

    const transformed = PredictiveAnalyticsTransformSchema.parse(complexForecastModel);
    
    expect(transformed.forecastValues.methodology).toBe('ensemble_approach');
    expect(transformed.forecastValues.base_models).toHaveLength(3);
    expect(transformed.forecastValues.model_performance.r_squared).toBe(0.89);
    expect(transformed.confidenceIntervals?.['2024-Q1'].confidence_95).toBeDefined();
    expect(transformed.inputFeatures).toContain('economic_indicators');
  });

  // Contract Test 4: Time series forecast data JSONB structure validation
  it('must validate time series forecast data with complex JSONB structures', () => {
    const timeSeriesForecast: PredictiveAnalyticsDatabaseContract = {
      id: 'forecast-time-series',
      forecast_type: 'inventory',
      forecast_target: 'optimal_stock_levels',
      forecast_period: '[2024-02-01,2024-12-31)',
      model_type: 'arima_with_external_regressors',
      forecast_values: {
        time_series_data: {
          '2024-02': {
            product_a: { forecast: 500, trend: 'stable', seasonality: 0.95 },
            product_b: { forecast: 750, trend: 'increasing', seasonality: 1.15 },
            product_c: { forecast: 300, trend: 'decreasing', seasonality: 0.85 }
          },
          '2024-03': {
            product_a: { forecast: 520, trend: 'stable', seasonality: 1.02 },
            product_b: { forecast: 780, trend: 'increasing', seasonality: 1.18 },
            product_c: { forecast: 285, trend: 'decreasing', seasonality: 0.82 }
          }
        },
        model_diagnostics: {
          arima_order: [2, 1, 2],
          seasonal_order: [1, 1, 1],
          aic: 1250.5,
          bic: 1275.8,
          log_likelihood: -620.25,
          residual_analysis: {
            ljung_box_test: { statistic: 15.2, p_value: 0.124 },
            jarque_bera_test: { statistic: 2.8, p_value: 0.247 },
            durbin_watson: 1.95
          }
        },
        external_regressors: {
          marketing_spend: { coefficient: 0.0035, p_value: 0.002 },
          seasonality_index: { coefficient: 0.75, p_value: 0.001 },
          economic_indicator: { coefficient: 0.012, p_value: 0.045 }
        }
      },
      confidence_intervals: {
        '2024-02': {
          product_a: { lower: 450, upper: 550 },
          product_b: { lower: 700, upper: 800 },
          product_c: { lower: 270, upper: 330 }
        },
        '2024-03': {
          product_a: { lower: 470, upper: 570 },
          product_b: { lower: 730, upper: 830 },
          product_c: { lower: 255, upper: 315 }
        }
      },
      model_accuracy: 0.9200,
      input_features: [
        'historical_inventory_levels',
        'demand_patterns',
        'lead_times',
        'safety_stock_requirements',
        'marketing_campaigns',
        'seasonal_trends'
      ],
      generated_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-06-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z'
    };

    const transformed = PredictiveAnalyticsTransformSchema.parse(timeSeriesForecast);
    
    expect(transformed.forecastValues.time_series_data['2024-02'].product_a.forecast).toBe(500);
    expect(transformed.forecastValues.model_diagnostics.arima_order).toEqual([2, 1, 2]);
    expect(transformed.forecastValues.external_regressors.marketing_spend.coefficient).toBe(0.0035);
    expect(transformed.confidenceIntervals?.['2024-02'].product_b.upper).toBe(800);
  });

  // Contract Test 5: Confidence interval validation and statistical constraint enforcement
  it('must validate confidence intervals with statistical constraints', () => {
    const confidenceIntervalForecast: PredictiveAnalyticsDatabaseContract = {
      id: 'forecast-confidence',
      forecast_type: 'risk',
      forecast_target: 'market_volatility_assessment',
      forecast_period: '[2024-01-01,2024-12-31)',
      model_type: 'monte_carlo_simulation',
      forecast_values: {
        simulation_parameters: {
          iterations: 10000,
          time_horizon_days: 365,
          confidence_levels: [0.80, 0.90, 0.95, 0.99]
        },
        risk_metrics: {
          value_at_risk: {
            '80%': -0.05,
            '90%': -0.08,
            '95%': -0.12,
            '99%': -0.18
          },
          expected_shortfall: {
            '80%': -0.07,
            '90%': -0.11,
            '95%': -0.15,
            '99%': -0.22
          },
          maximum_drawdown: {
            expected: -0.15,
            worst_case: -0.35
          }
        }
      },
      confidence_intervals: {
        market_volatility: {
          '80%': { lower: 0.12, upper: 0.25 },
          '90%': { lower: 0.10, upper: 0.28 },
          '95%': { lower: 0.08, upper: 0.32 },
          '99%': { lower: 0.05, upper: 0.38 }
        },
        revenue_impact: {
          '80%': { lower: -0.05, upper: 0.03 },
          '90%': { lower: -0.08, upper: 0.05 },
          '95%': { lower: -0.12, upper: 0.08 },
          '99%': { lower: -0.18, upper: 0.12 }
        }
      },
      model_accuracy: 0.8750,
      input_features: [
        'historical_market_data',
        'volatility_index',
        'economic_indicators',
        'industry_specific_factors',
        'geopolitical_events'
      ],
      generated_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-01-31T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z'
    };

    const transformed = PredictiveAnalyticsTransformSchema.parse(confidenceIntervalForecast);
    
    expect(transformed.forecastValues.simulation_parameters.iterations).toBe(10000);
    expect(transformed.forecastValues.risk_metrics.value_at_risk['95%']).toBe(-0.12);
    expect(transformed.confidenceIntervals?.market_volatility['95%'].upper).toBe(0.32);
    expect(transformed.confidenceIntervals?.revenue_impact['99%'].lower).toBe(-0.18);
  });

  // Contract Test 6: Model type and feature validation
  it('must validate model types and input feature constraints', () => {
    const validForecastTypes: Array<PredictiveAnalyticsDatabaseContract['forecast_type']> = 
      ['demand', 'inventory', 'revenue', 'risk'];
    
    validForecastTypes.forEach(forecastType => {
      const forecastData: PredictiveAnalyticsDatabaseContract = {
        id: `forecast-${forecastType}`,
        forecast_type: forecastType,
        forecast_target: `${forecastType}_prediction`,
        forecast_period: '[2024-01-01,2024-03-31)',
        model_type: `${forecastType}_model`,
        forecast_values: {
          prediction: 100,
          type_specific: forecastType
        },
        confidence_intervals: null,
        model_accuracy: 0.85,
        input_features: [`${forecastType}_history`, 'general_trends'],
        generated_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-04-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      expect(() => PredictiveAnalyticsDatabaseSchema.parse(forecastData)).not.toThrow();
    });
  });

  // Contract Test 7: Forecast expiration and lifecycle management
  it('must validate forecast expiration and lifecycle management', () => {
    const activeValidForecast: PredictiveAnalyticsDatabaseContract = {
      id: 'forecast-active',
      forecast_type: 'demand',
      forecast_target: 'weekly_demand',
      forecast_period: '[2024-01-15,2024-01-21)',
      model_type: 'neural_network',
      forecast_values: {
        predictions: { '2024-01-15': 100, '2024-01-16': 105 },
        status: 'active',
        validity_check: 'passed'
      },
      confidence_intervals: {
        '2024-01-15': { lower: 90, upper: 110 },
        '2024-01-16': { lower: 95, upper: 115 }
      },
      model_accuracy: 0.92,
      input_features: ['recent_sales', 'weather_data', 'promotions'],
      generated_at: '2024-01-14T00:00:00Z',
      expires_at: '2024-01-22T00:00:00Z',
      created_at: '2024-01-14T00:00:00Z'
    };

    const expiredForecast: PredictiveAnalyticsDatabaseContract = {
      id: 'forecast-expired',
      forecast_type: 'revenue',
      forecast_target: 'monthly_revenue',
      forecast_period: '[2023-12-01,2023-12-31)',
      model_type: 'time_series',
      forecast_values: {
        predictions: { '2023-12': 50000 },
        status: 'expired',
        accuracy_validation: 'completed'
      },
      confidence_intervals: {
        '2023-12': { lower: 45000, upper: 55000 }
      },
      model_accuracy: 0.88,
      input_features: ['historical_revenue', 'seasonal_adjustments'],
      generated_at: '2023-11-15T00:00:00Z',
      expires_at: '2024-01-01T00:00:00Z',
      created_at: '2023-11-15T00:00:00Z'
    };

    const activeTransformed = PredictiveAnalyticsTransformSchema.parse(activeValidForecast);
    const expiredTransformed = PredictiveAnalyticsTransformSchema.parse(expiredForecast);
    
    expect(activeTransformed.forecastValues.status).toBe('active');
    expect(expiredTransformed.forecastValues.status).toBe('expired');
    expect(new Date(activeTransformed.expiresAt || '').getTime()).toBeGreaterThan(Date.now() - 86400000); // Within last 24h
    expect(new Date(expiredTransformed.expiresAt || '').getTime()).toBeLessThan(Date.now());
  });

  // Contract Test 8: Create schema validation with required forecast fields
  it('must validate create schema with required forecast fields', () => {
    const createData: z.infer<typeof CreatePredictiveAnalyticsSchema> = {
      forecast_type: 'demand',
      forecast_target: 'daily_sales',
      forecast_period: '[2024-01-01,2024-01-31)',
      model_type: 'linear_regression',
      forecast_values: {
        daily_predictions: { '2024-01-01': 100, '2024-01-02': 105 },
        model_params: { slope: 2.5, intercept: 95 }
      }
    };

    const validated = CreatePredictiveAnalyticsSchema.parse(createData);
    expect(validated.forecast_type).toBe('demand');
    expect(validated.forecast_target).toBe('daily_sales');
    expect(validated.forecast_values.daily_predictions).toBeDefined();
  });
});