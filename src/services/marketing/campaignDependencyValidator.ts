import { CampaignSchema } from '../../schemas/marketing/campaign.schema';
import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import type { MarketingCampaign } from '../../types/marketing.types';

export interface CampaignConflict {
  type: 'schedule' | 'audience' | 'product' | 'budget' | 'channel';
  severity: 'critical' | 'high' | 'medium' | 'low';
  campaignIds: string[];
  description: string;
  resolution?: string;
}

export interface DependencyValidationResult {
  isValid: boolean;
  conflicts: CampaignConflict[];
  warnings: string[];
  suggestions: string[];
}

export interface CampaignDependency {
  campaignId: string;
  dependsOn: string[];
  exclusiveWith: string[];
  requiredBefore: string[];
  requiredAfter: string[];
}

export class CampaignDependencyValidator {
  private dependencies: Map<string, CampaignDependency> = new Map();

  /**
   * Validate a new campaign against existing campaigns
   */
  async validateNewCampaign(
    campaign: Partial<MarketingCampaign>,
    productIds: string[] = []
  ): Promise<DependencyValidationResult> {
    const conflicts: CampaignConflict[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Get all active and scheduled campaigns
      const { data: existingCampaigns, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .in('campaign_status', ['active', 'scheduled'])
        .order('start_date', { ascending: true });

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'CampaignDependencyValidator.validateNewCampaign',
          errorMessage: error.message,
          errorCode: 'FETCH_CAMPAIGNS_FAILED'
        });
        throw error;
      }

      if (!existingCampaigns || existingCampaigns.length === 0) {
        return { isValid: true, conflicts: [], warnings: [], suggestions: [] };
      }

      // Check schedule conflicts
      const scheduleConflicts = await this.checkScheduleConflicts(
        campaign,
        existingCampaigns
      );
      conflicts.push(...scheduleConflicts);

      // Check audience overlap
      const audienceConflicts = await this.checkAudienceOverlap(
        campaign,
        existingCampaigns
      );
      conflicts.push(...audienceConflicts);

      // Check product conflicts
      if (productIds.length > 0) {
        const productConflicts = await this.checkProductConflicts(
          productIds,
          existingCampaigns,
          campaign.startDate,
          campaign.endDate
        );
        conflicts.push(...productConflicts);
      }

      // Check budget constraints
      const budgetConflicts = await this.checkBudgetConstraints(
        campaign,
        existingCampaigns
      );
      conflicts.push(...budgetConflicts);

      // Check channel conflicts
      const channelConflicts = await this.checkChannelConflicts(
        campaign,
        existingCampaigns
      );
      conflicts.push(...channelConflicts);

      // Generate warnings and suggestions
      if (conflicts.length > 0) {
        warnings.push(`Found ${conflicts.length} potential conflicts with existing campaigns`);

        // Generate suggestions based on conflicts
        const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
        if (criticalConflicts.length > 0) {
          suggestions.push('Consider rescheduling the campaign to avoid critical conflicts');
        }

        const highConflicts = conflicts.filter(c => c.severity === 'high');
        if (highConflicts.length > 0) {
          suggestions.push('Review target audience segmentation to reduce overlap');
        }
      }

      // Check for dependency chains
      const dependencyIssues = await this.checkDependencyChains(campaign, existingCampaigns);
      if (dependencyIssues.length > 0) {
        warnings.push(...dependencyIssues);
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'CampaignDependencyValidator',
        pattern: 'dependency_validation',
        operation: 'validateNewCampaign'
      });

      return {
        isValid: conflicts.filter(c => c.severity === 'critical').length === 0,
        conflicts,
        warnings,
        suggestions
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'CampaignDependencyValidator.validateNewCampaign',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'VALIDATION_FAILED'
      });
      throw error;
    }
  }

  /**
   * Check for schedule conflicts between campaigns
   */
  private async checkScheduleConflicts(
    campaign: Partial<MarketingCampaign>,
    existingCampaigns: any[]
  ): Promise<CampaignConflict[]> {
    const conflicts: CampaignConflict[] = [];

    if (!campaign.startDate || !campaign.endDate) {
      return conflicts;
    }

    const campaignStart = new Date(campaign.startDate);
    const campaignEnd = new Date(campaign.endDate);

    for (const existing of existingCampaigns) {
      const existingStart = new Date(existing.start_date);
      const existingEnd = new Date(existing.end_date);

      // Check for overlap
      if (
        (campaignStart >= existingStart && campaignStart <= existingEnd) ||
        (campaignEnd >= existingStart && campaignEnd <= existingEnd) ||
        (campaignStart <= existingStart && campaignEnd >= existingEnd)
      ) {
        // Determine severity based on campaign type and overlap duration
        const overlapDays = this.calculateOverlapDays(
          campaignStart,
          campaignEnd,
          existingStart,
          existingEnd
        );

        let severity: CampaignConflict['severity'] = 'low';
        if (overlapDays > 14) {
          severity = 'high';
        } else if (overlapDays > 7) {
          severity = 'medium';
        }

        // Check if same campaign type (more severe)
        if (campaign.type === existing.campaign_type) {
          severity = severity === 'low' ? 'medium' : severity === 'medium' ? 'high' : 'critical';
        }

        conflicts.push({
          type: 'schedule',
          severity,
          campaignIds: [existing.id],
          description: `Schedule overlaps with campaign "${existing.campaign_name}" for ${overlapDays} days`,
          resolution: overlapDays > 7
            ? 'Consider adjusting campaign dates to avoid overlap'
            : 'Minor overlap detected, review campaign messaging for consistency'
        });
      }
    }

    return conflicts;
  }

  /**
   * Check for audience overlap between campaigns
   */
  private async checkAudienceOverlap(
    campaign: Partial<MarketingCampaign>,
    existingCampaigns: any[]
  ): Promise<CampaignConflict[]> {
    const conflicts: CampaignConflict[] = [];

    if (!campaign.targetAudience) {
      return conflicts;
    }

    for (const existing of existingCampaigns) {
      if (!existing.target_audience) continue;

      const existingAudience = typeof existing.target_audience === 'string'
        ? JSON.parse(existing.target_audience)
        : existing.target_audience;

      const overlap = this.calculateAudienceOverlap(campaign.targetAudience, existingAudience);

      if (overlap > 0.7) {
        conflicts.push({
          type: 'audience',
          severity: overlap > 0.9 ? 'high' : 'medium',
          campaignIds: [existing.id],
          description: `${Math.round(overlap * 100)}% audience overlap with campaign "${existing.campaign_name}"`,
          resolution: 'Consider segmenting the audience or staggering campaign timing'
        });
      }
    }

    return conflicts;
  }

  /**
   * Check for product conflicts
   */
  private async checkProductConflicts(
    productIds: string[],
    existingCampaigns: any[],
    startDate?: Date,
    endDate?: Date
  ): Promise<CampaignConflict[]> {
    const conflicts: CampaignConflict[] = [];

    // Get products associated with existing campaigns
    const { data: campaignProducts, error } = await supabase
      .from('campaign_products')
      .select('campaign_id, product_id')
      .in('campaign_id', existingCampaigns.map(c => c.id));

    if (error || !campaignProducts) {
      return conflicts;
    }

    // Group products by campaign
    const campaignProductMap = new Map<string, string[]>();
    for (const cp of campaignProducts) {
      const products = campaignProductMap.get(cp.campaign_id) || [];
      products.push(cp.product_id);
      campaignProductMap.set(cp.campaign_id, products);
    }

    // Check for conflicts
    for (const existing of existingCampaigns) {
      const existingProducts = campaignProductMap.get(existing.id) || [];
      const commonProducts = productIds.filter(id => existingProducts.includes(id));

      if (commonProducts.length > 0) {
        const overlapPercentage = (commonProducts.length / productIds.length) * 100;

        conflicts.push({
          type: 'product',
          severity: overlapPercentage > 75 ? 'high' : overlapPercentage > 50 ? 'medium' : 'low',
          campaignIds: [existing.id],
          description: `${commonProducts.length} products already in campaign "${existing.campaign_name}"`,
          resolution: 'Consider using different products or coordinating campaigns'
        });
      }
    }

    return conflicts;
  }

  /**
   * Check budget constraints
   */
  private async checkBudgetConstraints(
    campaign: Partial<MarketingCampaign>,
    existingCampaigns: any[]
  ): Promise<CampaignConflict[]> {
    const conflicts: CampaignConflict[] = [];

    // Get total budget allocation for the period
    const campaignStart = campaign.startDate ? new Date(campaign.startDate) : new Date();
    const campaignEnd = campaign.endDate ? new Date(campaign.endDate) : new Date();

    const overlappingCampaigns = existingCampaigns.filter(existing => {
      const existingStart = new Date(existing.start_date);
      const existingEnd = new Date(existing.end_date);
      return (
        (campaignStart >= existingStart && campaignStart <= existingEnd) ||
        (campaignEnd >= existingStart && campaignEnd <= existingEnd)
      );
    });

    if (overlappingCampaigns.length > 3) {
      conflicts.push({
        type: 'budget',
        severity: 'medium',
        campaignIds: overlappingCampaigns.map(c => c.id),
        description: `${overlappingCampaigns.length} campaigns running simultaneously may strain budget`,
        resolution: 'Review budget allocation across all campaigns'
      });
    }

    return conflicts;
  }

  /**
   * Check channel conflicts
   */
  private async checkChannelConflicts(
    campaign: Partial<MarketingCampaign>,
    existingCampaigns: any[]
  ): Promise<CampaignConflict[]> {
    const conflicts: CampaignConflict[] = [];

    // Check for channel saturation
    const sameTypeCampaigns = existingCampaigns.filter(
      c => c.campaign_type === campaign.type
    );

    if (sameTypeCampaigns.length > 2) {
      conflicts.push({
        type: 'channel',
        severity: 'medium',
        campaignIds: sameTypeCampaigns.map(c => c.id),
        description: `Multiple campaigns of type "${campaign.type}" may cause channel fatigue`,
        resolution: 'Consider diversifying campaign channels or spacing them out'
      });
    }

    return conflicts;
  }

  /**
   * Check dependency chains
   */
  private async checkDependencyChains(
    campaign: Partial<MarketingCampaign>,
    existingCampaigns: any[]
  ): Promise<string[]> {
    const warnings: string[] = [];

    // Check if campaign should follow a specific sequence
    if (campaign.type === 'retention' || campaign.type === 'upsell') {
      const acquisitionCampaigns = existingCampaigns.filter(
        c => c.campaign_type === 'acquisition' || c.campaign_type === 'awareness'
      );

      if (acquisitionCampaigns.length === 0) {
        warnings.push('Retention/upsell campaigns work best after acquisition campaigns');
      }
    }

    return warnings;
  }

  /**
   * Calculate overlap in days between two date ranges
   */
  private calculateOverlapDays(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): number {
    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

    if (overlapStart > overlapEnd) {
      return 0;
    }

    const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Calculate audience overlap percentage
   */
  private calculateAudienceOverlap(audience1: any, audience2: any): number {
    // Simple implementation - can be enhanced with more sophisticated matching
    if (!audience1 || !audience2) return 0;

    let overlapScore = 0;
    let totalChecks = 0;

    // Check age range overlap
    if (audience1.ageRange && audience2.ageRange) {
      totalChecks++;
      if (
        audience1.ageRange.min <= audience2.ageRange.max &&
        audience1.ageRange.max >= audience2.ageRange.min
      ) {
        overlapScore += 1;
      }
    }

    // Check location overlap
    if (audience1.location && audience2.location) {
      totalChecks++;
      if (audience1.location === audience2.location) {
        overlapScore += 1;
      }
    }

    // Check interests overlap
    if (audience1.interests && audience2.interests) {
      totalChecks++;
      const commonInterests = audience1.interests.filter((i: string) =>
        audience2.interests.includes(i)
      );
      if (commonInterests.length > 0) {
        overlapScore += commonInterests.length / Math.max(
          audience1.interests.length,
          audience2.interests.length
        );
      }
    }

    return totalChecks > 0 ? overlapScore / totalChecks : 0;
  }

  /**
   * Set campaign dependencies
   */
  async setCampaignDependencies(
    campaignId: string,
    dependencies: Omit<CampaignDependency, 'campaignId'>
  ): Promise<void> {
    this.dependencies.set(campaignId, {
      campaignId,
      ...dependencies
    });

    // Store in database
    await supabase
      .from('campaign_dependencies')
      .upsert({
        campaign_id: campaignId,
        depends_on: dependencies.dependsOn,
        exclusive_with: dependencies.exclusiveWith,
        required_before: dependencies.requiredBefore,
        required_after: dependencies.requiredAfter,
        updated_at: new Date().toISOString()
      });

    ValidationMonitor.recordPatternSuccess({
      service: 'CampaignDependencyValidator',
      pattern: 'set_dependencies',
      operation: 'setCampaignDependencies'
    });
  }

  /**
   * Get campaign dependencies
   */
  async getCampaignDependencies(campaignId: string): Promise<CampaignDependency | null> {
    // Check cache first
    if (this.dependencies.has(campaignId)) {
      return this.dependencies.get(campaignId)!;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('campaign_dependencies')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (error || !data) {
      return null;
    }

    const dependency: CampaignDependency = {
      campaignId,
      dependsOn: data.depends_on || [],
      exclusiveWith: data.exclusive_with || [],
      requiredBefore: data.required_before || [],
      requiredAfter: data.required_after || []
    };

    this.dependencies.set(campaignId, dependency);
    return dependency;
  }

  /**
   * Validate campaign execution order
   */
  async validateExecutionOrder(campaignIds: string[]): Promise<boolean> {
    for (const campaignId of campaignIds) {
      const deps = await this.getCampaignDependencies(campaignId);
      if (!deps) continue;

      // Check if all dependencies are met
      for (const depId of deps.dependsOn) {
        if (!campaignIds.includes(depId)) {
          return false;
        }
        // Ensure dependency comes before
        if (campaignIds.indexOf(depId) > campaignIds.indexOf(campaignId)) {
          return false;
        }
      }

      // Check exclusivity constraints
      for (const exclusiveId of deps.exclusiveWith) {
        if (campaignIds.includes(exclusiveId)) {
          return false;
        }
      }
    }

    return true;
  }
}

export const campaignDependencyValidator = new CampaignDependencyValidator();