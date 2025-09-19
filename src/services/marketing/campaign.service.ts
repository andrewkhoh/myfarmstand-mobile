import { supabase } from '../../config/supabase';
import { CampaignSchema, CampaignInputSchema } from '../../schemas/marketing/campaign.schema';
import type { MarketingCampaign, CampaignStatus } from '../../types/marketing.types';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { ServiceError, NotFoundError } from './errors/ServiceError';
import { inventoryMarketingBridge } from '../cross-workflow/inventoryMarketingBridge';
import { errorCoordinator, WorkflowError } from '../cross-workflow/errorCoordinator';
import { campaignDependencyValidator } from './campaignDependencyValidator';

export class CampaignService {
  /**
   * Get all campaigns with optional filtering
   */
  async getCampaigns(filters?: {
    status?: CampaignStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<MarketingCampaign[]> {
    try {
      let query = supabase
        .from('marketing_campaigns')
        .select('id, campaign_name, campaign_status, campaign_type, description, start_date, end_date, discount_percentage, target_audience, created_at, updated_at, created_by')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('campaign_status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('start_date', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new ServiceError(`Failed to fetch campaigns: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      // Individual validation with skip-on-error
      const validCampaigns: MarketingCampaign[] = [];
      for (const rawCampaign of data || []) {
        try {
          const campaign = CampaignSchema.parse(rawCampaign);
          validCampaigns.push(campaign);

          ValidationMonitor.recordPatternSuccess({
            service: 'CampaignService',
            pattern: 'transformation_schema',
            operation: 'getCampaigns'
          });
        } catch (error) {
          ValidationMonitor.recordValidationError({
            context: 'CampaignService.getCampaigns',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'CAMPAIGN_VALIDATION_FAILED'
          });
          // Skip invalid campaign and continue
        }
      }

      return validCampaigns;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'CampaignService.getCampaigns',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CAMPAIGN_FETCH_FAILED'
      });
      throw error;
    }
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<MarketingCampaign[]> {
    return this.getCampaigns({ status: 'active' });
  }

  /**
   * Get a single campaign by ID
   */
  async getCampaign(id: string): Promise<MarketingCampaign> {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('id, campaign_name, campaign_status, campaign_type, description, start_date, end_date, discount_percentage, target_audience, created_at, updated_at, created_by')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Campaign', id);
        }
        throw new ServiceError(`Failed to fetch campaign: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const campaign = CampaignSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'CampaignService',
        pattern: 'transformation_schema',
        operation: 'getCampaign'
      });

      return campaign;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'CampaignService.getCampaign',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CAMPAIGN_FETCH_FAILED'
      });
      throw error;
    }
  }

  /**
   * Create a new campaign with inventory validation
   */
  async createCampaign(input: unknown, productIds?: string[]): Promise<MarketingCampaign> {
    try {
      // Validate input
      const validated = CampaignInputSchema.parse(input);

      // Validate campaign dependencies and conflicts
      const dependencyValidation = await campaignDependencyValidator.validateNewCampaign(
        validated,
        productIds
      );

      if (!dependencyValidation.isValid) {
        const criticalConflicts = dependencyValidation.conflicts
          .filter(c => c.severity === 'critical')
          .map(c => c.description)
          .join('; ');

        throw new ServiceError(
          `Campaign creation blocked due to conflicts: ${criticalConflicts}`,
          'CAMPAIGN_DEPENDENCY_CONFLICT',
          400
        );
      }

      // Log warnings if any
      if (dependencyValidation.warnings.length > 0) {
        ValidationMonitor.recordValidationError({
          context: 'CampaignService.createCampaign',
          errorMessage: `Campaign dependency warnings: ${dependencyValidation.warnings.join('; ')}`,
          errorCode: 'CAMPAIGN_DEPENDENCY_WARNING'
        });
      }

      // Validate inventory availability if products are specified
      if (productIds && productIds.length > 0) {
        const bridge = inventoryMarketingBridge(supabase);
        const validationResult = await bridge.validateCampaignInventory(
          'new-campaign', // Temporary ID for new campaign
          productIds,
          validated.startDate,
          validated.endDate || validated.startDate,
          1.5 // Expected demand multiplier
        );

        // Block campaign creation if critical inventory issues
        if (!validationResult.isValid) {
          const errorMessage = validationResult.inventoryIssues
            .map(issue => `${issue.productName}: ${issue.issue} (need ${issue.requiredStock}, have ${issue.currentStock})`)
            .join('; ');

          // Handle error through coordinator
          await errorCoordinator.handleError({
            workflow: 'marketing',
            operation: 'createCampaign',
            errorType: 'business',
            severity: 'high',
            message: errorMessage,
            code: 'CAMPAIGN_CONFLICT',
            context: {
              campaignData: validated,
              productIds,
              inventoryIssues: validationResult.inventoryIssues,
              conflicts: validationResult.conflicts
            },
            timestamp: new Date(),
            relatedWorkflows: ['inventory', 'executive']
          } as WorkflowError);

          throw new ServiceError(
            `Cannot create campaign due to inventory issues: ${errorMessage}`,
            'INVENTORY_VALIDATION_FAILED',
            400
          );
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          ValidationMonitor.recordValidationError({
            context: 'CampaignService.createCampaign',
            errorMessage: `Campaign created with warnings: ${validationResult.warnings.join('; ')}`,
            errorCode: 'CAMPAIGN_WARNINGS'
          });
        }
      }

      // Prepare database record
      const dbRecord = {
        campaign_name: validated.name,
        campaign_status: validated.status,
        campaign_type: 'promotional', // Default for now
        description: validated.description || null,
        start_date: validated.startDate.toISOString(),
        end_date: validated.endDate?.toISOString() || validated.startDate.toISOString(),
        discount_percentage: validated.discountPercentage || null,
        target_audience: validated.targetAudience ? JSON.stringify(validated.targetAudience) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert(dbRecord)
        .select()
        .single();

      if (error) {
        throw new ServiceError(`Failed to create campaign: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const campaign = CampaignSchema.parse(data);

      // Associate products with campaign if provided
      if (productIds && productIds.length > 0 && campaign.id) {
        const productAssociations = productIds.map(productId => ({
          campaign_id: campaign.id,
          product_id: productId
        }));

        await supabase
          .from('campaign_products')
          .insert(productAssociations);

        // Reserve inventory for the campaign
        const bridge = inventoryMarketingBridge(supabase);
        const reservations = productIds.map(productId => ({
          productId,
          quantity: 100 // Default reservation, should be calculated based on campaign type
        }));
        await bridge.reserveInventoryForCampaign(campaign.id, reservations);
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'CampaignService',
        pattern: 'transformation_schema',
        operation: 'createCampaign'
      });

      return campaign;
    } catch (error) {
      if (error instanceof ValidationError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'CampaignService.createCampaign',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CAMPAIGN_CREATE_FAILED'
      });
      throw error;
    }
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(id: string, input: unknown): Promise<MarketingCampaign> {
    try {
      // Validate input
      const validated = CampaignInputSchema.partial().parse(input);

      // Build update object
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (validated.name !== undefined) updates.campaign_name = validated.name;
      if (validated.description !== undefined) updates.description = validated.description;
      if (validated.status !== undefined) updates.campaign_status = validated.status;
      if (validated.startDate !== undefined) updates.start_date = validated.startDate.toISOString();
      if (validated.endDate !== undefined) updates.end_date = validated.endDate.toISOString();
      if (validated.discountPercentage !== undefined) updates.discount_percentage = validated.discountPercentage;
      if (validated.targetAudience !== undefined) {
        updates.target_audience = JSON.stringify(validated.targetAudience);
      }

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Campaign', id);
        }
        throw new ServiceError(`Failed to update campaign: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      const campaign = CampaignSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'CampaignService',
        pattern: 'transformation_schema',
        operation: 'updateCampaign'
      });

      return campaign;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'CampaignService.updateCampaign',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CAMPAIGN_UPDATE_FAILED'
      });
      throw error;
    }
  }

  /**
   * Delete a campaign and release inventory reservations
   */
  async deleteCampaign(id: string): Promise<void> {
    try {
      // Release inventory reservations before deleting
      const bridge = inventoryMarketingBridge(supabase);
      await bridge.releaseInventoryForCampaign(id);

      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Campaign', id);
        }
        throw new ServiceError(`Failed to delete campaign: ${error.message}`, 'DATABASE_ERROR', 500);
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'CampaignService',
        pattern: 'delete_operation',
        operation: 'deleteCampaign'
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;

      ValidationMonitor.recordValidationError({
        context: 'CampaignService.deleteCampaign',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CAMPAIGN_DELETE_FAILED'
      });
      throw error;
    }
  }

  /**
   * Update campaign status with inventory and dependency validation
   */
  async updateCampaignStatus(id: string, status: CampaignStatus): Promise<MarketingCampaign> {
    // If activating a campaign, validate dependencies and inventory
    if (status === 'active') {
      // Check dependencies first
      const depCheck = await this.checkCampaignDependencies(id);
      if (!depCheck.canActivate) {
        throw new ServiceError(
          `Cannot activate campaign: ${depCheck.blockers.join('; ')}`,
          'CAMPAIGN_DEPENDENCY_BLOCKED',
          400
        );
      }

      // Log warnings if any
      if (depCheck.warnings.length > 0) {
        ValidationMonitor.recordValidationError({
          context: 'CampaignService.updateCampaignStatus',
          errorMessage: `Campaign activation warnings: ${depCheck.warnings.join('; ')}`,
          errorCode: 'CAMPAIGN_ACTIVATION_WARNING'
        });
      }
      const campaign = await this.getCampaign(id);

      // Get campaign products
      const { data: campaignProducts } = await supabase
        .from('campaign_products')
        .select('product_id')
        .eq('campaign_id', id);

      if (campaignProducts && campaignProducts.length > 0) {
        const productIds = campaignProducts.map(cp => cp.product_id);
        const bridge = inventoryMarketingBridge(supabase);

        const validationResult = await bridge.validateCampaignInventory(
          id,
          productIds,
          new Date(campaign.startDate),
          new Date(campaign.endDate),
          1.5
        );

        if (!validationResult.isValid) {
          throw new ServiceError(
            `Cannot activate campaign due to inventory issues: ${validationResult.inventoryIssues
              .map(i => i.productName)
              .join(', ')}`,
            'INVENTORY_VALIDATION_FAILED',
            400
          );
        }
      }
    }

    return this.updateCampaign(id, { status });
  }

  /**
   * Get campaign inventory status
   */
  async getCampaignInventoryStatus(id: string) {
    const bridge = inventoryMarketingBridge(supabase);
    return bridge.getCampaignInventoryStatus(id);
  }

  /**
   * Validate campaign products availability
   */
  async validateCampaignProducts(id: string, productIds: string[]) {
    const campaign = await this.getCampaign(id);
    const bridge = inventoryMarketingBridge(supabase);

    return bridge.validateCampaignInventory(
      id,
      productIds,
      new Date(campaign.startDate),
      new Date(campaign.endDate),
      1.5
    );
  }

  /**
   * Check campaign dependencies
   */
  async checkCampaignDependencies(id: string): Promise<{
    canActivate: boolean;
    blockers: string[];
    warnings: string[];
  }> {
    try {
      const campaign = await this.getCampaign(id);
      const dependencies = await campaignDependencyValidator.getCampaignDependencies(id);

      if (!dependencies) {
        return { canActivate: true, blockers: [], warnings: [] };
      }

      const blockers: string[] = [];
      const warnings: string[] = [];

      // Check if required campaigns are completed
      if (dependencies.dependsOn.length > 0) {
        const { data: requiredCampaigns } = await supabase
          .from('marketing_campaigns')
          .select('id, campaign_name, campaign_status')
          .in('id', dependencies.dependsOn);

        for (const required of requiredCampaigns || []) {
          if (required.campaign_status !== 'completed') {
            blockers.push(`Campaign "${required.campaign_name}" must complete first`);
          }
        }
      }

      // Check exclusive campaigns
      if (dependencies.exclusiveWith.length > 0) {
        const { data: exclusiveCampaigns } = await supabase
          .from('marketing_campaigns')
          .select('id, campaign_name, campaign_status')
          .in('id', dependencies.exclusiveWith)
          .eq('campaign_status', 'active');

        for (const exclusive of exclusiveCampaigns || []) {
          blockers.push(`Cannot run while "${exclusive.campaign_name}" is active`);
        }
      }

      // Check timing dependencies
      const now = new Date();
      if (dependencies.requiredAfter.length > 0) {
        const { data: afterCampaigns } = await supabase
          .from('marketing_campaigns')
          .select('id, campaign_name, end_date')
          .in('id', dependencies.requiredAfter);

        for (const after of afterCampaigns || []) {
          const endDate = new Date(after.end_date);
          if (endDate > now) {
            warnings.push(`Should start after "${after.campaign_name}" ends`);
          }
        }
      }

      return {
        canActivate: blockers.length === 0,
        blockers,
        warnings
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'CampaignService.checkCampaignDependencies',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'DEPENDENCY_CHECK_FAILED'
      });
      return { canActivate: false, blockers: ['Failed to check dependencies'], warnings: [] };
    }
  }

  /**
   * Calculate campaign performance metrics
   */
  async getCampaignMetrics(id: string): Promise<{
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roi: number;
    ctr: number;
    conversionRate: number;
  }> {
    try {
      // Verify campaign exists
      const campaign = await this.getCampaign(id);

      // Fetch analytics data from multiple tables
      // Note: These are placeholder queries - actual implementation depends on analytics table structure

      // Get impressions (views)
      const { data: impressionData, error: impressionError } = await supabase
        .from('campaign_impressions')
        .select('count')
        .eq('campaign_id', id)
        .single();

      const impressions = impressionData?.count || 0;

      // Get clicks
      const { data: clickData, error: clickError } = await supabase
        .from('campaign_clicks')
        .select('count')
        .eq('campaign_id', id)
        .single();

      const clicks = clickData?.count || 0;

      // Get conversions (purchases attributed to campaign)
      const { data: conversionData, error: conversionError } = await supabase
        .from('orders')
        .select('id, total')
        .eq('campaign_id', id);

      const conversions = conversionData?.length || 0;
      const revenue = conversionData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

      // Calculate campaign cost (budget spent)
      const campaignCost = campaign.spentBudget || campaign.budget || 0;

      // Calculate derived metrics
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const roi = campaignCost > 0 ? ((revenue - campaignCost) / campaignCost) * 100 : 0;

      const metrics = {
        impressions,
        clicks,
        conversions,
        revenue,
        roi: Math.round(roi * 100) / 100,
        ctr: Math.round(ctr * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };

      ValidationMonitor.recordPatternSuccess({
        service: 'CampaignService',
        pattern: 'metrics_calculation',
        operation: 'getCampaignMetrics'
      });

      return metrics;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'CampaignService.getCampaignMetrics',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'METRICS_CALCULATION_FAILED'
      });

      // Return empty metrics on error (graceful degradation)
      return {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        roi: 0,
        ctr: 0,
        conversionRate: 0,
      };
    }
  }
}

// Export singleton instance
export const campaignService = new CampaignService();