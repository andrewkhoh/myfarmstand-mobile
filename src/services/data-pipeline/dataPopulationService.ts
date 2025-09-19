/**
 * Data Population Service
 * Orchestrates data pipeline to populate business_metrics table
 * Following @docs/architectural-patterns-and-best-practices.md
 */

import { BusinessMetricsPopulator } from './businessMetricsPopulator';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { supabase } from '../../config/supabase';

export interface PopulationStatus {
  isRunning: boolean;
  lastRun: string | null;
  lastSuccess: string | null;
  totalMetrics: number;
  errors: string[];
}

export class DataPopulationService {
  private static isRunning = false;

  /**
   * Initialize business_metrics table with historical data
   */
  static async initializeBusinessMetrics(options: {
    daysBack?: number;
    force?: boolean;
  } = {}): Promise<{ success: boolean; message: string; metrics: number }> {
    const startTime = Date.now();

    try {
      if (this.isRunning) {
        return {
          success: false,
          message: 'Data population is already running',
          metrics: 0
        };
      }

      this.isRunning = true;
      const { daysBack = 90, force = false } = options;

      console.log(`🚀 Initializing business_metrics table with ${daysBack} days of data...`);

      // Check if table already has data
      if (!force) {
        const { count } = await supabase
          .from('business_metrics')
          .select('*', { count: 'exact', head: true });

        if (count && count > 0) {
          console.log(`📊 business_metrics table already has ${count} records`);
          return {
            success: true,
            message: `Table already populated with ${count} metrics. Use force=true to repopulate.`,
            metrics: count
          };
        }
      }

      // Calculate date range
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Populate with order data
      const result = await BusinessMetricsPopulator.populateFromOrders({
        startDate,
        endDate,
        force
      });

      if (result.success) {
        ValidationMonitor.recordPatternSuccess({
          service: 'DataPopulationService',
          pattern: 'batch_process_metrics',
          operation: 'initializeBusinessMetrics',
          performanceMs: Date.now() - startTime
        });

        console.log(`✅ Successfully initialized business_metrics table with ${result.metricsCreated} metrics`);

        return {
          success: true,
          message: `Successfully populated ${result.metricsCreated} business metrics`,
          metrics: result.metricsCreated
        };
      } else {
        throw new Error(`Population failed: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      ValidationMonitor.recordValidationError({
        context: 'DataPopulationService.initializeBusinessMetrics',
        errorCode: 'BUSINESS_METRICS_INIT_FAILED',
        validationPattern: 'batch_process_metrics',
        errorMessage
      });

      console.error('❌ Failed to initialize business_metrics:', errorMessage);

      return {
        success: false,
        message: `Initialization failed: ${errorMessage}`,
        metrics: 0
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get current population status
   */
  static async getPopulationStatus(): Promise<PopulationStatus> {
    try {
      // Check if table has data
      const { count, error: countError } = await supabase
        .from('business_metrics')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        return {
          isRunning: this.isRunning,
          lastRun: null,
          lastSuccess: null,
          totalMetrics: 0,
          errors: [countError.message]
        };
      }

      // Get latest metric date
      const { data: latestMetric, error: latestError } = await supabase
        .from('business_metrics')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        isRunning: this.isRunning,
        lastRun: latestMetric?.created_at || null,
        lastSuccess: latestMetric?.created_at || null,
        totalMetrics: count || 0,
        errors: latestError ? [latestError.message] : []
      };

    } catch (error) {
      return {
        isRunning: this.isRunning,
        lastRun: null,
        lastSuccess: null,
        totalMetrics: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Run incremental population (daily updates)
   */
  static async runIncrementalPopulation(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isRunning) {
        return {
          success: false,
          message: 'Population already running'
        };
      }

      this.isRunning = true;

      console.log('🔄 Running incremental business metrics population...');

      // Populate last 3 days to handle any late orders
      const result = await BusinessMetricsPopulator.populateFromOrders({
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        force: true // Overwrite existing metrics for these days
      });

      return {
        success: result.success,
        message: result.success
          ? `Updated ${result.metricsCreated} metrics`
          : `Failed: ${result.errors.join(', ')}`
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Verify data integrity
   */
  static async verifyDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if we have recent data
      const { data: recentMetrics, error } = await supabase
        .from('business_metrics')
        .select('metric_date')
        .gte('metric_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('metric_date', { ascending: false })
        .limit(1);

      if (error) {
        issues.push(`Failed to query recent metrics: ${error.message}`);
      } else if (!recentMetrics || recentMetrics.length === 0) {
        issues.push('No recent metrics found (last 7 days)');
        recommendations.push('Run incremental population to update recent data');
      }

      // Check for gaps in daily data
      const { data: dailyMetrics, error: dailyError } = await supabase
        .from('business_metrics')
        .select('metric_date')
        .eq('aggregation_level', 'daily')
        .gte('metric_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (!dailyError && dailyMetrics) {
        const dates = dailyMetrics.map(m => m.metric_date);
        const uniqueDates = new Set(dates);

        if (uniqueDates.size < 25) { // Expect most days in last 30 days
          issues.push(`Missing daily metrics for some dates (found ${uniqueDates.size}/30 days)`);
          recommendations.push('Run data population to fill gaps');
        }
      }

      // Check for order data correlation
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { count: orderMetricCount } = await supabase
        .from('business_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('metric_category', 'orders')
        .gte('metric_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (orderCount && orderCount > 0 && (!orderMetricCount || orderMetricCount === 0)) {
        issues.push('Orders exist but no order metrics found');
        recommendations.push('Run business metrics population to sync order data');
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        isValid: false,
        issues: [`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Check database connectivity and permissions']
      };
    }
  }

  /**
   * Auto-fix common data issues
   */
  static async autoFixDataIssues(): Promise<{ success: boolean; fixes: string[]; errors: string[] }> {
    const fixes: string[] = [];
    const errors: string[] = [];

    try {
      // Run verification first
      const verification = await this.verifyDataIntegrity();

      if (verification.isValid) {
        return {
          success: true,
          fixes: ['No issues detected'],
          errors: []
        };
      }

      // Fix missing recent data
      if (verification.issues.some(issue => issue.includes('No recent metrics'))) {
        try {
          const result = await this.runIncrementalPopulation();
          if (result.success) {
            fixes.push('Updated recent metrics');
          } else {
            errors.push(`Failed to update recent metrics: ${result.message}`);
          }
        } catch (error) {
          errors.push(`Auto-fix error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Fix missing order correlation
      if (verification.issues.some(issue => issue.includes('Orders exist but no order metrics'))) {
        try {
          const result = await this.initializeBusinessMetrics({ daysBack: 30, force: true });
          if (result.success) {
            fixes.push('Synchronized order data with business metrics');
          } else {
            errors.push(`Failed to sync order data: ${result.message}`);
          }
        } catch (error) {
          errors.push(`Order sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        fixes,
        errors
      };

    } catch (error) {
      return {
        success: false,
        fixes: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}