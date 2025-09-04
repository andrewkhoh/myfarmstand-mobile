import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { 
  MarketingCampaign,
  CampaignType,
  CampaignStatus,
  marketingCampaignTransform,
  marketingCampaignSchema
} from '@/schemas/marketing';
import { 
  ServiceError, 
  ValidationError, 
  NotFoundError,
  ForbiddenError
} from './errors/ServiceError';

export interface CampaignFilters {
  type?: CampaignType;
  status?: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  channels?: string[];
}

export interface CampaignMetricsUpdate {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;
}

export interface CampaignPerformance {
  campaignId: string;
  ctr: number; // Click-through rate
  conversionRate: number;
  roi: number; // Return on investment
  costPerConversion: number;
}

export class MarketingCampaignService {
  private mockData: Map<string, MarketingCampaign> = new Map();

  async createCampaign(data: unknown): Promise<MarketingCampaign> {
    try {
      const validated = marketingCampaignTransform.parse({
        ...(data as any),
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Additional business validations
      // Only validate date range for active status if we're trying to set status to active
      if (validated.status === 'active') {
        const now = new Date();
        // For active campaigns, the current date must be within the campaign date range
        if (now < validated.startDate || now > validated.endDate) {
          throw new ValidationError(
            'Active campaigns must be within their date range'
          );
        }
      }

      if (validated.discount && validated.discount > 50) {
        throw new ValidationError('Discount cannot exceed 50%');
      }

      this.mockData.set(validated.id, validated);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Campaign validation failed', error.errors);
      }
      throw error;
    }
  }

  async getCampaign(campaignId: string): Promise<MarketingCampaign> {
    const campaign = this.mockData.get(campaignId);
    if (!campaign) {
      throw new NotFoundError('MarketingCampaign', campaignId);
    }
    return campaign;
  }

  async updateCampaign(
    campaignId: string,
    updates: Partial<MarketingCampaign>
  ): Promise<MarketingCampaign> {
    const existing = await this.getCampaign(campaignId);
    
    // Prevent status changes for completed campaigns
    if (existing.status === 'completed' && updates.status && updates.status !== 'completed') {
      throw new ForbiddenError('Cannot change status of completed campaigns');
    }

    // Ensure updatedAt is different from existing by adding 1ms if needed
    const newUpdatedAt = new Date();
    if (newUpdatedAt.getTime() === existing.updatedAt.getTime()) {
      newUpdatedAt.setTime(newUpdatedAt.getTime() + 1);
    }

    const updated = marketingCampaignTransform.parse({
      ...existing,
      ...updates,
      updatedAt: newUpdatedAt
    });

    this.mockData.set(campaignId, updated);
    return updated;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    
    if (campaign.status === 'active') {
      throw new ForbiddenError('Cannot delete active campaigns');
    }
    
    this.mockData.delete(campaignId);
  }

  async updateStatus(
    campaignId: string,
    newStatus: CampaignStatus
  ): Promise<MarketingCampaign> {
    const campaign = await this.getCampaign(campaignId);
    
    // Validate status transitions
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      'draft': ['scheduled', 'cancelled'],
      'scheduled': ['active', 'paused', 'cancelled'],
      'active': ['paused', 'completed', 'cancelled'],
      'paused': ['active', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    const allowedStatuses = validTransitions[campaign.status];
    if (!allowedStatuses.includes(newStatus)) {
      throw new ServiceError(
        `Invalid status transition from ${campaign.status} to ${newStatus}`,
        'INVALID_STATUS_TRANSITION',
        400
      );
    }

    // Auto-activate scheduled campaigns on start date
    if (newStatus === 'active') {
      const now = new Date();
      if (now < campaign.startDate) {
        throw new ValidationError('Cannot activate campaign before start date');
      }
      if (now > campaign.endDate) {
        throw new ValidationError('Cannot activate campaign after end date');
      }
    }

    return await this.updateCampaign(campaignId, { status: newStatus });
  }

  async updateMetrics(
    campaignId: string,
    metrics: CampaignMetricsUpdate
  ): Promise<MarketingCampaign> {
    const campaign = await this.getCampaign(campaignId);
    
    const updatedMetrics = {
      impressions: (campaign.metrics.impressions || 0) + (metrics.impressions || 0),
      clicks: (campaign.metrics.clicks || 0) + (metrics.clicks || 0),
      conversions: (campaign.metrics.conversions || 0) + (metrics.conversions || 0),
      revenue: (campaign.metrics.revenue || 0) + (metrics.revenue || 0)
    };

    // Validate metrics consistency
    const errors = [];
    if (updatedMetrics.clicks > updatedMetrics.impressions) {
      errors.push('Clicks cannot exceed impressions');
    }
    if (updatedMetrics.conversions > updatedMetrics.clicks) {
      errors.push('Conversions cannot exceed clicks');
    }
    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }

    return await this.updateCampaign(campaignId, {
      metrics: updatedMetrics
    });
  }

  async calculatePerformance(campaignId: string): Promise<CampaignPerformance> {
    const campaign = await this.getCampaign(campaignId);
    const { impressions, clicks, conversions, revenue } = campaign.metrics;
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const roi = campaign.budget && campaign.budget > 0 && revenue > 0
      ? ((revenue - campaign.budget) / campaign.budget) * 100 
      : 0;
    const costPerConversion = conversions > 0 && campaign.budget
      ? campaign.budget / conversions
      : 0;

    return {
      campaignId,
      ctr: Math.round(ctr * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      costPerConversion: Math.round(costPerConversion * 100) / 100
    };
  }

  async searchCampaigns(filters: CampaignFilters = {}): Promise<MarketingCampaign[]> {
    let campaigns = Array.from(this.mockData.values());

    if (filters.type) {
      campaigns = campaigns.filter(c => c.type === filters.type);
    }

    if (filters.status) {
      campaigns = campaigns.filter(c => c.status === filters.status);
    }

    if (filters.startDate) {
      campaigns = campaigns.filter(c => c.startDate >= filters.startDate!);
    }

    if (filters.endDate) {
      campaigns = campaigns.filter(c => c.endDate <= filters.endDate!);
    }

    if (filters.channels && filters.channels.length > 0) {
      campaigns = campaigns.filter(c => 
        filters.channels!.some(channel => c.channels.includes(channel as any))
      );
    }

    return campaigns;
  }

  async getActiveCampaigns(): Promise<MarketingCampaign[]> {
    const now = new Date();
    return Array.from(this.mockData.values()).filter(
      c => c.status === 'active' && now >= c.startDate && now <= c.endDate
    );
  }

  async getUpcomingCampaigns(days: number = 7): Promise<MarketingCampaign[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return Array.from(this.mockData.values()).filter(
      c => c.status === 'scheduled' && 
           c.startDate > now && 
           c.startDate <= futureDate
    );
  }

  async duplicateCampaign(
    campaignId: string,
    newName: string
  ): Promise<MarketingCampaign> {
    const original = await this.getCampaign(campaignId);
    
    const duplicated = {
      ...original,
      name: newName,
      status: 'draft' as CampaignStatus,
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      }
    };

    delete (duplicated as any).id;
    
    return await this.createCampaign(duplicated);
  }

  async extendCampaign(
    campaignId: string,
    additionalDays: number
  ): Promise<MarketingCampaign> {
    const campaign = await this.getCampaign(campaignId);
    
    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      throw new ForbiddenError(
        `Cannot extend ${campaign.status} campaigns`
      );
    }

    const newEndDate = new Date(campaign.endDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);
    
    return await this.updateCampaign(campaignId, { endDate: newEndDate });
  }

  async applyDiscount(
    campaignId: string,
    discount: number
  ): Promise<MarketingCampaign> {
    if (discount < 0 || discount > 50) {
      throw new ValidationError('Discount must be between 0 and 50');
    }
    
    return await this.updateCampaign(campaignId, { discount });
  }

  async addProducts(
    campaignId: string,
    productIds: string[]
  ): Promise<MarketingCampaign> {
    const campaign = await this.getCampaign(campaignId);
    
    const uniqueProductIds = Array.from(
      new Set([...campaign.productIds, ...productIds])
    );
    
    return await this.updateCampaign(campaignId, {
      productIds: uniqueProductIds
    });
  }

  async removeProducts(
    campaignId: string,
    productIds: string[]
  ): Promise<MarketingCampaign> {
    const campaign = await this.getCampaign(campaignId);
    
    const remainingProductIds = campaign.productIds.filter(
      id => !productIds.includes(id)
    );
    
    return await this.updateCampaign(campaignId, {
      productIds: remainingProductIds
    });
  }

  async getTopPerformers(limit: number = 10): Promise<CampaignPerformance[]> {
    const campaigns = Array.from(this.mockData.values())
      .filter(c => c.metrics.impressions > 0);
    
    const performances = await Promise.all(
      campaigns.map(c => this.calculatePerformance(c.id))
    );
    
    return performances
      .sort((a, b) => b.roi - a.roi)
      .slice(0, limit);
  }

  async autoScheduleCampaigns(): Promise<MarketingCampaign[]> {
    const now = new Date();
    const scheduledCampaigns = await this.searchCampaigns({ status: 'scheduled' });
    
    const toActivate = scheduledCampaigns.filter(
      c => c.startDate <= now && c.endDate >= now
    );
    
    const activated = await Promise.all(
      toActivate.map(c => this.updateStatus(c.id, 'active'))
    );
    
    return activated;
  }

  async autoCompleteCampaigns(): Promise<MarketingCampaign[]> {
    const now = new Date();
    const activeCampaigns = await this.searchCampaigns({ status: 'active' });
    
    const toComplete = activeCampaigns.filter(c => c.endDate < now);
    
    const completed = await Promise.all(
      toComplete.map(c => this.updateStatus(c.id, 'completed'))
    );
    
    return completed;
  }

  private generateId(): string {
    return uuidv4();
  }

  clearMockData(): void {
    this.mockData.clear();
  }
}