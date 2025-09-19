import { supabase } from '../../config/supabase';
import { BundleSchema, BundleInputSchema } from '../../schemas/marketing/bundle.schema';
import type { ProductBundle, WorkflowState } from '../../types/marketing.types';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { ServiceError, NotFoundError } from './errors/ServiceError';

export class BundleService {
  /**
   * Get all bundles with optional filtering
   */
  async getBundles(filters?: {
    isActive?: boolean;
    workflowState?: WorkflowState;
  }): Promise<ProductBundle[]> {
    try {
      let query = supabase
        .from('product_bundles')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.workflowState) {
        query = query.eq('workflow_state', filters.workflowState);
      }

      const { data, error } = await query;

      if (error) {
        throw new ServiceError(`Failed to fetch bundles: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      // Individual validation with skip-on-error
      const validBundles: ProductBundle[] = [];
      for (const rawBundle of data || []) {
        try {
          const bundle = BundleSchema.parse(rawBundle);
          validBundles.push(bundle);

          ValidationMonitor.recordPatternSuccess({
            service: 'BundleService',
            pattern: 'transformation_schema',
            operation: 'getBundles'
          });
        } catch (error) {
          ValidationMonitor.recordValidationError({
            context: 'BundleService.getBundles',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'BUNDLE_VALIDATION_FAILED'
          });
          // Skip invalid bundle and continue
        }
      }

      return validBundles;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'BundleService.getBundles',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BUNDLE_FETCH_FAILED'
      });
      throw error;
    }
  }

  /**
   * Get active bundles
   */
  async getActiveBundles(): Promise<ProductBundle[]> {
    return this.getBundles({ isActive: true });
  }

  /**
   * Get a single bundle by ID
   */
  async getBundle(id: string): Promise<ProductBundle> {
    try {
      const { data, error } = await supabase
        .from('product_bundles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Bundle', id);
        }
        throw new ServiceError(`Failed to fetch bundle: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const bundle = BundleSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'BundleService',
        pattern: 'transformation_schema',
        operation: 'getBundle'
      });

      return bundle;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'BundleService.getBundle',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BUNDLE_FETCH_FAILED'
      });
      throw error;
    }
  }

  /**
   * Create a new bundle
   */
  async createBundle(input: unknown): Promise<ProductBundle> {
    try {
      // Validate input
      const validated = BundleInputSchema.parse(input);

      // Calculate pricing
      const finalPrice = this.calculateFinalPrice(
        validated.pricing.basePrice,
        validated.pricing.discountType,
        validated.pricing.discountValue,
        validated.availability?.quantity
      );

      // Prepare database record
      const dbRecord = {
        name: validated.name,
        description: validated.description || null,
        product_ids: JSON.stringify(validated.productIds),
        base_price: validated.pricing.basePrice,
        discount_type: validated.pricing.discountType,
        discount_value: validated.pricing.discountValue,
        final_price: finalPrice,
        start_date: validated.availability?.startDate?.toISOString() || null,
        end_date: validated.availability?.endDate?.toISOString() || null,
        quantity: validated.availability?.quantity || null,
        is_active: validated.availability?.isActive ?? true,
        headline: validated.marketingContent?.headline || null,
        features: JSON.stringify(validated.marketingContent?.features || []),
        benefits: JSON.stringify(validated.marketingContent?.benefits || []),
        target_audience: validated.marketingContent?.targetAudience || 'b2c',
        workflow_state: validated.workflowState,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('product_bundles')
        .insert(dbRecord)
        .select()
        .single();

      if (error) {
        throw new ServiceError(`Failed to create bundle: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const bundle = BundleSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'BundleService',
        pattern: 'transformation_schema',
        operation: 'createBundle'
      });

      return bundle;
    } catch (error) {
      if (error instanceof ValidationError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'BundleService.createBundle',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BUNDLE_CREATE_FAILED'
      });
      throw error;
    }
  }

  /**
   * Update an existing bundle
   */
  async updateBundle(id: string, input: unknown): Promise<ProductBundle> {
    try {
      // Validate input
      const validated = BundleInputSchema.partial().parse(input);

      // Build update object
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (validated.name !== undefined) updates.name = validated.name;
      if (validated.description !== undefined) updates.description = validated.description;
      if (validated.productIds !== undefined) {
        updates.product_ids = JSON.stringify(validated.productIds);
      }
      if (validated.pricing !== undefined) {
        if (validated.pricing.basePrice !== undefined) {
          updates.base_price = validated.pricing.basePrice;
        }
        if (validated.pricing.discountType !== undefined) {
          updates.discount_type = validated.pricing.discountType;
        }
        if (validated.pricing.discountValue !== undefined) {
          updates.discount_value = validated.pricing.discountValue;
        }
        // Recalculate final price if pricing changed
        if (updates.base_price || updates.discount_type || updates.discount_value) {
          const current = await this.getBundle(id);
          updates.final_price = this.calculateFinalPrice(
            updates.base_price || current.pricing.basePrice,
            updates.discount_type || current.pricing.discountType,
            updates.discount_value !== undefined ? updates.discount_value : current.pricing.discountValue,
            updates.quantity || current.availability.quantity
          );
        }
      }
      if (validated.availability !== undefined) {
        if (validated.availability.startDate !== undefined) {
          updates.start_date = validated.availability.startDate?.toISOString() || null;
        }
        if (validated.availability.endDate !== undefined) {
          updates.end_date = validated.availability.endDate?.toISOString() || null;
        }
        if (validated.availability.quantity !== undefined) {
          updates.quantity = validated.availability.quantity;
        }
        if (validated.availability.isActive !== undefined) {
          updates.is_active = validated.availability.isActive;
        }
      }
      if (validated.marketingContent !== undefined) {
        if (validated.marketingContent.headline !== undefined) {
          updates.headline = validated.marketingContent.headline;
        }
        if (validated.marketingContent.features !== undefined) {
          updates.features = JSON.stringify(validated.marketingContent.features);
        }
        if (validated.marketingContent.benefits !== undefined) {
          updates.benefits = JSON.stringify(validated.marketingContent.benefits);
        }
        if (validated.marketingContent.targetAudience !== undefined) {
          updates.target_audience = validated.marketingContent.targetAudience;
        }
      }
      if (validated.workflowState !== undefined) {
        updates.workflow_state = validated.workflowState;
      }

      const { data, error } = await supabase
        .from('product_bundles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Bundle', id);
        }
        throw new ServiceError(`Failed to update bundle: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const bundle = BundleSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'BundleService',
        pattern: 'transformation_schema',
        operation: 'updateBundle'
      });

      return bundle;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'BundleService.updateBundle',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BUNDLE_UPDATE_FAILED'
      });
      throw error;
    }
  }

  /**
   * Delete a bundle
   */
  async deleteBundle(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_bundles')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Bundle', id);
        }
        throw new ServiceError(`Failed to delete bundle: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'BundleService',
        pattern: 'delete_operation',
        operation: 'deleteBundle'
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'BundleService.deleteBundle',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BUNDLE_DELETE_FAILED'
      });
      throw error;
    }
  }

  /**
   * Activate or deactivate a bundle
   */
  async toggleBundleActive(id: string, isActive: boolean): Promise<ProductBundle> {
    return this.updateBundle(id, { availability: { isActive } });
  }

  /**
   * Calculate bundle pricing information
   */
  async calculateBundlePricing(bundleId: string): Promise<{
    basePrice: number;
    finalPrice: number;
    savings: number;
    savingsPercentage: number;
  }> {
    const bundle = await this.getBundle(bundleId);

    const savings = bundle.pricing.basePrice - bundle.pricing.finalPrice;
    const savingsPercentage = bundle.pricing.basePrice > 0
      ? (savings / bundle.pricing.basePrice) * 100
      : 0;

    return {
      basePrice: bundle.pricing.basePrice,
      finalPrice: bundle.pricing.finalPrice,
      savings,
      savingsPercentage,
    };
  }

  /**
   * Helper to calculate final price based on discount
   */
  private calculateFinalPrice(
    basePrice: number,
    discountType: 'percentage' | 'fixed' | 'tiered',
    discountValue: number,
    quantity?: number
  ): number {
    if (discountType === 'percentage') {
      return basePrice * (1 - discountValue / 100);
    } else if (discountType === 'fixed') {
      return Math.max(0.01, basePrice - discountValue);
    } else {
      // Tiered pricing logic: Higher quantities get better discounts
      // discountValue represents the maximum discount percentage
      const actualQuantity = quantity || 1;

      // Define tier thresholds
      const tiers = [
        { minQty: 1, maxQty: 4, discountMultiplier: 0 },
        { minQty: 5, maxQty: 9, discountMultiplier: 0.3 },
        { minQty: 10, maxQty: 19, discountMultiplier: 0.6 },
        { minQty: 20, maxQty: 49, discountMultiplier: 0.8 },
        { minQty: 50, maxQty: Infinity, discountMultiplier: 1.0 }
      ];

      // Find applicable tier
      const applicableTier = tiers.find(
        tier => actualQuantity >= tier.minQty && actualQuantity <= tier.maxQty
      ) || tiers[0];

      // Calculate tiered discount
      const tieredDiscountPercentage = discountValue * applicableTier.discountMultiplier;
      const discountedPrice = basePrice * (1 - tieredDiscountPercentage / 100);

      // Log for monitoring
      ValidationMonitor.recordPatternSuccess({
        service: 'BundleService',
        pattern: 'tiered_pricing_calculation',
        operation: 'calculateFinalPrice',
        performanceMs: 0
      });

      return Math.max(0.01, discountedPrice);
    }
  }
}

// Export singleton instance
export const bundleService = new BundleService();
export const productBundleService = bundleService; // Alias for compatibility