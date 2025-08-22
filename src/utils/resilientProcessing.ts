// Phase 3.5.4: Resilient Processing Patterns
// Following docs/architectural-patterns-and-best-practices.md Pattern 3: Resilient Item Processing
// Pattern: Process collections item-by-item with graceful degradation

import { ValidationMonitor } from './validationMonitor';
import { MarketingErrorMessageService } from './marketingErrorMessages';
import type { MarketingErrorCode } from './marketingErrorMessages';

export interface ProcessingResult<T> {
  success: boolean;
  processedItems: T[];
  failedItems: Array<{
    item: unknown;
    error: string;
    index: number;
  }>;
  warnings: string[];
  summary: {
    totalItems: number;
    successCount: number;
    failureCount: number;
    warningCount: number;
  };
}

export interface ProcessingOptions {
  continueOnError?: boolean;
  maxFailures?: number;
  logContext: string;
  errorCode: MarketingErrorCode;
}

/**
 * Resilient item processing utility for marketing operations
 * Follows architectural pattern: individual validation with skip-on-error
 */
export class ResilientProcessor {
  /**
   * Process array items with individual validation and error isolation
   */
  static async processItems<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number) => Promise<TOutput> | TOutput,
    options: ProcessingOptions
  ): Promise<ProcessingResult<TOutput>> {
    const processedItems: TOutput[] = [];
    const failedItems: Array<{ item: TInput; error: string; index: number }> = [];
    const warnings: string[] = [];
    
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3; // Circuit breaker pattern

    for (let index = 0; index < items.length; index++) {
      const item = items[index];

      try {
        // Process individual item
        const result = await processor(item, index);
        processedItems.push(result);
        consecutiveFailures = 0; // Reset consecutive failure counter
        
      } catch (error) {
        consecutiveFailures++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
        
        // Log individual item failure
        ValidationMonitor.recordValidationError({
          context: `${options.logContext}.processItem[${index}]`,
          errorCode: options.errorCode,
          validationPattern: 'direct_schema',
          errorMessage: `Item processing failed: ${errorMessage}`
        });

        failedItems.push({
          item,
          error: errorMessage,
          index
        });

        // Check circuit breaker
        if (consecutiveFailures >= maxConsecutiveFailures) {
          warnings.push(`Circuit breaker triggered: ${maxConsecutiveFailures} consecutive failures detected`);
          
          if (!options.continueOnError) {
            break;
          }
        }

        // Check max failures threshold
        if (options.maxFailures && failedItems.length >= options.maxFailures) {
          warnings.push(`Maximum failure limit reached: ${options.maxFailures} failures`);
          
          if (!options.continueOnError) {
            break;
          }
        }

        // Continue processing other items (resilient pattern)
        continue;
      }
    }

    const summary = {
      totalItems: items.length,
      successCount: processedItems.length,
      failureCount: failedItems.length,
      warningCount: warnings.length
    };

    // Record overall processing metrics
    ValidationMonitor.recordPatternSuccess({
      service: 'resilientProcessor',
      pattern: 'resilient_item_processing',
      operation: options.logContext,
      metadata: summary
    });

    return {
      success: processedItems.length > 0, // Success if at least one item processed
      processedItems,
      failedItems,
      warnings,
      summary
    };
  }

  /**
   * Process bundle products with inventory validation
   */
  static async processBundleProducts(
    products: Array<{ productId: string; quantity: number }>,
    inventoryValidator: (productId: string, quantity: number) => Promise<boolean>
  ): Promise<ProcessingResult<{ productId: string; quantity: number; validated: boolean }>> {
    return this.processItems(
      products,
      async (product, index) => {
        // Individual product validation with error isolation
        const isValid = await inventoryValidator(product.productId, product.quantity);
        
        if (!isValid) {
          throw new Error(`Product ${product.productId} has insufficient inventory for quantity ${product.quantity}`);
        }

        return {
          ...product,
          validated: true
        };
      },
      {
        continueOnError: true,
        maxFailures: 10, // Allow up to 10 products to fail in a large bundle
        logContext: 'BundleService.validateBundleProducts',
        errorCode: 'INVENTORY_VALIDATION_FAILED'
      }
    );
  }

  /**
   * Process campaign content associations with validation
   */
  static async processCampaignContent(
    contentIds: string[],
    contentValidator: (contentId: string) => Promise<{ id: string; status: string; title: string }>
  ): Promise<ProcessingResult<{ id: string; status: string; title: string; validated: boolean }>> {
    return this.processItems(
      contentIds,
      async (contentId, index) => {
        const content = await contentValidator(contentId);
        
        // Validate content is ready for campaign association
        if (content.status !== 'approved' && content.status !== 'published') {
          throw new Error(`Content "${content.title}" must be approved or published before campaign association`);
        }

        return {
          ...content,
          validated: true
        };
      },
      {
        continueOnError: true,
        maxFailures: 5, // Allow some content to fail in large campaigns
        logContext: 'CampaignService.validateCampaignContent',
        errorCode: 'CONTENT_FETCH_FAILED'
      }
    );
  }

  /**
   * Process marketing metrics with error isolation
   */
  static async processMarketingMetrics(
    metrics: Array<{ campaignId: string; metricType: string; value: number; date: string }>,
    metricsRecorder: (metric: any) => Promise<void>
  ): Promise<ProcessingResult<{ campaignId: string; metricType: string; recorded: boolean }>> {
    return this.processItems(
      metrics,
      async (metric, index) => {
        // Validate metric before recording
        if (metric.value < 0) {
          throw new Error(`Invalid metric value: ${metric.value}. Metrics cannot be negative.`);
        }

        if (!metric.campaignId || !metric.metricType) {
          throw new Error('Missing required metric fields: campaignId and metricType are required');
        }

        await metricsRecorder(metric);

        return {
          campaignId: metric.campaignId,
          metricType: metric.metricType,
          recorded: true
        };
      },
      {
        continueOnError: true, // Continue recording other metrics even if some fail
        maxFailures: 50, // Allow many metrics to fail in batch operations
        logContext: 'CampaignService.recordBatchMetrics',
        errorCode: 'CAMPAIGN_CREATION_FAILED'
      }
    );
  }

  /**
   * Get user-friendly summary of processing results
   */
  static getProcessingSummary<T>(result: ProcessingResult<T>, entityType: string): string {
    const { summary } = result;
    
    if (summary.failureCount === 0) {
      return MarketingErrorMessageService.getSuccessMessage('processed', entityType as any);
    }

    if (summary.successCount === 0) {
      return `All ${entityType} processing failed. Please check the individual error details and try again.`;
    }

    return `Processed ${summary.successCount} of ${summary.totalItems} ${entityType} successfully. ${summary.failureCount} items had errors and were skipped.`;
  }

  /**
   * Create actionable recommendations based on failure patterns
   */
  static getFailureRecommendations<T>(result: ProcessingResult<T>): string[] {
    const recommendations: string[] = [];
    const { failedItems, summary } = result;

    // High failure rate
    if (summary.failureCount / summary.totalItems > 0.5) {
      recommendations.push('High failure rate detected. Check system connectivity and data quality.');
    }

    // Specific error pattern analysis
    const errorPatterns = new Map<string, number>();
    failedItems.forEach(item => {
      const errorType = item.error.split(':')[0]; // Get error prefix
      errorPatterns.set(errorType, (errorPatterns.get(errorType) || 0) + 1);
    });

    // Most common error
    const mostCommonError = Array.from(errorPatterns.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonError && mostCommonError[1] > summary.totalItems * 0.3) {
      recommendations.push(`Most common issue: ${mostCommonError[0]}. Focus on resolving this error type first.`);
    }

    // Circuit breaker recommendations
    if (result.warnings.some(w => w.includes('Circuit breaker'))) {
      recommendations.push('Multiple consecutive failures detected. Check system health before retrying.');
    }

    return recommendations;
  }
}