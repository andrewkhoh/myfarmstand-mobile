/**
 * Decision Support Service - Enhanced with architectural compliance
 * Following established patterns from docs/architectural-patterns-and-best-practices.md
 */

import { ValidationMonitor } from '../../../utils/validationMonitor';
import { RecommendationEngine } from './recommendationEngine';
import {
  validateExecutiveData,
  validateRecommendationOptions,
  safeValidateRecommendations,
  validateFeedbackData,
  type LearningMetrics
} from '../schemas';

// Service result types following established patterns
export interface DecisionSupportOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: any;
  data?: T;
}

// Create user-friendly error helper (following UX patterns)
const createDecisionSupportError = (
  code: string,
  technicalMessage: string,
  userMessage: string
) => ({
  code,
  message: technicalMessage,
  userMessage,
  timestamp: new Date().toISOString()
});

class DecisionSupportService {
  private recommendationEngine: RecommendationEngine;
  private static instance: DecisionSupportService;

  constructor() {
    this.recommendationEngine = new RecommendationEngine();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DecisionSupportService {
    if (!DecisionSupportService.instance) {
      DecisionSupportService.instance = new DecisionSupportService();
    }
    return DecisionSupportService.instance;
  }

  /**
   * Generate recommendations with full validation pipeline
   * Following Pattern: Direct Service with Validation
   */
  async generateRecommendations(
    data: unknown,
    options?: unknown
  ): Promise<DecisionSupportOperationResult<any[]>> {
    try {
      // Step 1: Input validation with schema pipeline
      const validatedData = validateExecutiveData(data);
      const validatedOptions = options ? validateRecommendationOptions(options) : {};

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'direct_schema_validation',
        operation: 'generateRecommendations',
      });

      // Step 2: Generate recommendations using validated data
      const rawRecommendations = await this.recommendationEngine.generateRecommendations(
        validatedData as any, // Type assertion for legacy engine compatibility
        validatedOptions as any
      );

      // Step 3: Validate output with graceful degradation
      const validatedRecommendations = safeValidateRecommendations(rawRecommendations);

      if (validatedRecommendations.length === 0 && rawRecommendations.length > 0) {
        ValidationMonitor.recordValidationError({
          context: 'DecisionSupportService.generateRecommendations',
          errorMessage: 'All generated recommendations failed validation',
          errorCode: 'RECOMMENDATION_VALIDATION_FAILED'
        });

        return {
          success: false,
          error: createDecisionSupportError(
            'RECOMMENDATION_GENERATION_FAILED',
            'Generated recommendations failed quality validation',
            'Unable to generate valid recommendations with the provided data'
          ),
          message: 'Recommendation generation failed validation'
        };
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'resilient_processing',
        operation: 'recommendationValidation',
      });

      return {
        success: true,
        data: validatedRecommendations,
        message: `Generated ${validatedRecommendations.length} recommendations`
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'DecisionSupportService.generateRecommendations',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'RECOMMENDATION_GENERATION_ERROR'
      });

      console.error('Failed to generate recommendations:', error);

      return {
        success: false,
        error: error instanceof Error ? error : createDecisionSupportError(
          'UNKNOWN_ERROR',
          'Unknown error during recommendation generation',
          'An unexpected error occurred. Please try again.'
        ),
        message: 'Failed to generate recommendations'
      };
    }
  }

  /**
   * Process feedback with validation
   * Following Pattern: Atomic Operations with Validation
   */
  async processFeedback(feedbackData: unknown): Promise<DecisionSupportOperationResult<void>> {
    try {
      // Step 1: Validate feedback data
      const validatedFeedback = validateFeedbackData(feedbackData);

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'direct_schema_validation',
        operation: 'processFeedback',
      });

      // Step 2: Process feedback through recommendation engine
      this.recommendationEngine.processFeedback(validatedFeedback as any); // Type assertion for legacy engine compatibility

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'atomic_operation',
        operation: 'feedbackProcessing',
      });

      return {
        success: true,
        message: 'Feedback processed successfully'
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'DecisionSupportService.processFeedback',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'FEEDBACK_PROCESSING_ERROR'
      });

      console.error('Failed to process feedback:', error);

      return {
        success: false,
        error: error instanceof Error ? error : createDecisionSupportError(
          'UNKNOWN_ERROR',
          'Unknown error during feedback processing',
          'An unexpected error occurred while processing feedback'
        ),
        message: 'Failed to process feedback'
      };
    }
  }

  /**
   * Track recommendation outcome with validation
   * Following Pattern: Atomic Operations
   */
  async trackOutcome(
    recommendationId: string,
    outcome: unknown
  ): Promise<DecisionSupportOperationResult<void>> {
    try {
      // Basic validation for required parameters
      if (!recommendationId || typeof recommendationId !== 'string') {
        const validationError = createDecisionSupportError(
          'INVALID_RECOMMENDATION_ID',
          'Recommendation ID is required and must be a string',
          'Invalid recommendation reference provided'
        );

        ValidationMonitor.recordValidationError({
          context: 'DecisionSupportService.trackOutcome',
          errorMessage: 'Invalid recommendation ID',
          errorCode: 'INVALID_RECOMMENDATION_ID'
        });

        return {
          success: false,
          error: validationError,
          message: 'Invalid recommendation ID'
        };
      }

      // Track outcome through recommendation engine
      this.recommendationEngine.trackOutcome(recommendationId, outcome);

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'atomic_operation',
        operation: 'outcomeTracking',
      });

      return {
        success: true,
        message: 'Outcome tracked successfully'
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'DecisionSupportService.trackOutcome',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'OUTCOME_TRACKING_ERROR'
      });

      console.error('Failed to track outcome:', error);

      return {
        success: false,
        error: error instanceof Error ? error : createDecisionSupportError(
          'UNKNOWN_ERROR',
          'Unknown error during outcome tracking',
          'An unexpected error occurred while tracking the outcome'
        ),
        message: 'Failed to track outcome'
      };
    }
  }

  /**
   * Get learning metrics with graceful degradation
   * Following Pattern: Graceful Degradation
   */
  async getLearningMetrics(): Promise<DecisionSupportOperationResult<LearningMetrics>> {
    try {
      const metrics = this.recommendationEngine.getLearningMetrics();

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'resilient_processing',
        operation: 'getLearningMetrics',
      });

      return {
        success: true,
        data: metrics,
        message: 'Learning metrics retrieved successfully'
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'DecisionSupportService.getLearningMetrics',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'LEARNING_METRICS_ERROR'
      });

      console.error('Failed to get learning metrics:', error);

      // Graceful degradation - return default metrics
      const defaultMetrics: LearningMetrics = {
        accuracy: 0.5,
        improvement: 0,
        totalFeedback: 0,
        successRate: 0
      };

      return {
        success: true,
        data: defaultMetrics,
        message: 'Returned default learning metrics due to error'
      };
    }
  }

  /**
   * Get outcome history with graceful degradation
   * Following Pattern: Graceful Degradation
   */
  async getOutcomeHistory(): Promise<DecisionSupportOperationResult<Record<string, any>>> {
    try {
      const history = this.recommendationEngine.getOutcomeHistory();

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'resilient_processing',
        operation: 'getOutcomeHistory',
      });

      return {
        success: true,
        data: history,
        message: 'Outcome history retrieved successfully'
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'DecisionSupportService.getOutcomeHistory',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'OUTCOME_HISTORY_ERROR'
      });

      console.error('Failed to get outcome history:', error);

      // Graceful degradation - return empty history
      return {
        success: true,
        data: {},
        message: 'Returned empty outcome history due to error'
      };
    }
  }

  /**
   * Calculate stockout risk with validation
   * Following Pattern: Direct Service with Validation
   */
  async calculateStockoutRisk(inventoryData: unknown): Promise<DecisionSupportOperationResult<any>> {
    try {
      // Validate that inventory data is present
      if (!inventoryData || typeof inventoryData !== 'object') {
        const validationError = createDecisionSupportError(
          'INVALID_INVENTORY_DATA',
          'Inventory data is required for stockout risk calculation',
          'Please provide valid inventory data'
        );

        ValidationMonitor.recordValidationError({
          context: 'DecisionSupportService.calculateStockoutRisk',
          errorMessage: 'Invalid inventory data',
          errorCode: 'INVALID_INVENTORY_DATA'
        });

        return {
          success: false,
          error: validationError,
          message: 'Invalid inventory data provided'
        };
      }

      // Calculate risk using recommendation engine
      const risk = this.recommendationEngine.calculateStockoutRisk(inventoryData as any);

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'direct_schema_validation',
        operation: 'calculateStockoutRisk',
      });

      return {
        success: true,
        data: risk,
        message: 'Stockout risk calculated successfully'
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'DecisionSupportService.calculateStockoutRisk',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'STOCKOUT_RISK_CALCULATION_ERROR'
      });

      console.error('Failed to calculate stockout risk:', error);

      return {
        success: false,
        error: error instanceof Error ? error : createDecisionSupportError(
          'UNKNOWN_ERROR',
          'Unknown error during stockout risk calculation',
          'An unexpected error occurred while calculating risk'
        ),
        message: 'Failed to calculate stockout risk'
      };
    }
  }

  /**
   * Get adjusted confidence with graceful degradation
   * Following Pattern: Graceful Degradation
   */
  async getAdjustedConfidence(
    type: string,
    baseConfidence: number
  ): Promise<DecisionSupportOperationResult<number>> {
    try {
      // Basic parameter validation
      if (!type || typeof baseConfidence !== 'number' || baseConfidence < 0 || baseConfidence > 1) {
        const validationError = createDecisionSupportError(
          'INVALID_CONFIDENCE_PARAMETERS',
          'Type and valid base confidence (0-1) are required',
          'Invalid confidence calculation parameters'
        );

        ValidationMonitor.recordValidationError({
          context: 'DecisionSupportService.getAdjustedConfidence',
          errorMessage: 'Invalid confidence parameters',
          errorCode: 'INVALID_CONFIDENCE_PARAMETERS'
        });

        return {
          success: false,
          error: validationError,
          message: 'Invalid confidence parameters'
        };
      }

      const adjustedConfidence = this.recommendationEngine.getAdjustedConfidence(type, baseConfidence);

      ValidationMonitor.recordPatternSuccess({
        service: 'DecisionSupportService',
        pattern: 'resilient_processing',
        operation: 'getAdjustedConfidence',
      });

      return {
        success: true,
        data: adjustedConfidence,
        message: 'Adjusted confidence calculated successfully'
      };

    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'DecisionSupportService.getAdjustedConfidence',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ADJUSTED_CONFIDENCE_ERROR'
      });

      console.error('Failed to get adjusted confidence:', error);

      // Graceful degradation - return base confidence
      return {
        success: true,
        data: baseConfidence,
        message: 'Returned base confidence due to calculation error'
      };
    }
  }
}

// Export singleton instance
export const decisionSupportService = DecisionSupportService.getInstance();
export { DecisionSupportService };