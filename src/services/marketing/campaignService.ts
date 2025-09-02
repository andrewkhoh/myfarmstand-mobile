import { supabase, ServiceError } from '@/lib/supabase';
import { 
  MarketingCampaignSchema,
  MarketingCampaign,
  MarketingCampaignInput,
  MarketingCampaignInputSchema
} from '@/schemas/marketing';
import { z } from 'zod';

export const campaignService = {
  queryKey: ['campaigns'] as const,

  async getAll(): Promise<MarketingCampaign[]> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('startDate', { ascending: false });
    
    if (error) throw new ServiceError('Failed to fetch campaigns', 'FETCH_ERROR', error);
    return z.array(MarketingCampaignSchema).parse(data || []);
  },

  async getById(id: string): Promise<MarketingCampaign> {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new ServiceError('Campaign not found', 'NOT_FOUND', { id });
      }
      throw new ServiceError('Failed to fetch campaign', 'FETCH_ERROR', error);
    }
    
    return MarketingCampaignSchema.parse(data);
  },

  async checkOverlap(
    startDate: string,
    endDate: string,
    targetProducts: string[],
    excludeCampaignId?: string
  ): Promise<MarketingCampaign[]> {
    let query = supabase
      .from('marketing_campaigns')
      .select('*')
      .lte('startDate', endDate)
      .gte('endDate', startDate)
      .in('status', ['planned', 'active']);

    if (excludeCampaignId) {
      query = query.neq('id', excludeCampaignId);
    }

    const { data, error } = await query;
    
    if (error) throw new ServiceError('Failed to check overlaps', 'FETCH_ERROR', error);
    
    const allCampaigns = z.array(MarketingCampaignSchema).parse(data || []);
    
    return allCampaigns.filter(campaign => 
      campaign.targetProducts.some(productId => 
        targetProducts.includes(productId)
      )
    );
  },

  async create(campaign: MarketingCampaignInput): Promise<MarketingCampaign> {
    const validated = MarketingCampaignInputSchema.parse(campaign);
    
    if (new Date(validated.startDate) >= new Date(validated.endDate)) {
      throw new ServiceError(
        'Campaign end date must be after start date',
        'INVALID_DATES',
        { startDate: validated.startDate, endDate: validated.endDate }
      );
    }

    const overlapping = await this.checkOverlap(
      validated.startDate,
      validated.endDate,
      validated.targetProducts
    );
    
    if (overlapping.length > 0) {
      throw new ServiceError(
        'Campaign dates overlap with existing campaigns',
        'OVERLAP_ERROR',
        { overlapping: overlapping.map(c => ({ id: c.id, name: c.name })) }
      );
    }
    
    const now = new Date().toISOString();
    const id = crypto.randomUUID ? crypto.randomUUID() : 
               `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newCampaign = {
      ...validated,
      id,
      status: validated.status || 'planned',
      createdAt: now,
      updatedAt: now,
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      }
    };

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert(newCampaign)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to create campaign', 'CREATE_ERROR', error);
    return MarketingCampaignSchema.parse(data);
  },

  async update(id: string, updates: Partial<MarketingCampaignInput>): Promise<MarketingCampaign> {
    const existing = await this.getById(id);
    
    if (updates.startDate || updates.endDate || updates.targetProducts) {
      const startDate = updates.startDate || existing.startDate;
      const endDate = updates.endDate || existing.endDate;
      const targetProducts = updates.targetProducts || existing.targetProducts;
      
      if (new Date(startDate) >= new Date(endDate)) {
        throw new ServiceError(
          'Campaign end date must be after start date',
          'INVALID_DATES',
          { startDate, endDate }
        );
      }

      const overlapping = await this.checkOverlap(startDate, endDate, targetProducts, id);
      
      if (overlapping.length > 0) {
        throw new ServiceError(
          'Campaign dates overlap with existing campaigns',
          'OVERLAP_ERROR',
          { overlapping: overlapping.map(c => ({ id: c.id, name: c.name })) }
        );
      }
    }

    const updatedCampaign = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update(updatedCampaign)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to update campaign', 'UPDATE_ERROR', error);
    return MarketingCampaignSchema.parse(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('marketing_campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw new ServiceError('Failed to delete campaign', 'DELETE_ERROR', error);
  },

  async activate(campaignId: string): Promise<MarketingCampaign> {
    const campaign = await this.getById(campaignId);
    
    if (campaign.status !== 'planned') {
      throw new ServiceError(
        'Only planned campaigns can be activated',
        'INVALID_STATUS',
        { currentStatus: campaign.status }
      );
    }
    
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    
    if (startDate > now) {
      throw new ServiceError(
        'Cannot activate campaign before start date',
        'NOT_STARTED',
        { startDate: campaign.startDate }
      );
    }

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update({ 
        status: 'active',
        updatedAt: now.toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to activate campaign', 'UPDATE_ERROR', error);
    return MarketingCampaignSchema.parse(data);
  },

  async pause(campaignId: string): Promise<MarketingCampaign> {
    const campaign = await this.getById(campaignId);
    
    if (campaign.status !== 'active') {
      throw new ServiceError(
        'Only active campaigns can be paused',
        'INVALID_STATUS',
        { currentStatus: campaign.status }
      );
    }

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update({ 
        status: 'paused',
        updatedAt: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to pause campaign', 'UPDATE_ERROR', error);
    return MarketingCampaignSchema.parse(data);
  },

  async complete(campaignId: string): Promise<MarketingCampaign> {
    const campaign = await this.getById(campaignId);
    
    if (!['active', 'paused'].includes(campaign.status)) {
      throw new ServiceError(
        'Only active or paused campaigns can be completed',
        'INVALID_STATUS',
        { currentStatus: campaign.status }
      );
    }

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update({ 
        status: 'completed',
        updatedAt: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to complete campaign', 'UPDATE_ERROR', error);
    return MarketingCampaignSchema.parse(data);
  },

  async getActiveForProduct(productId: string): Promise<MarketingCampaign[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('status', 'active')
      .lte('startDate', now)
      .gte('endDate', now);
    
    if (error) throw new ServiceError('Failed to fetch active campaigns', 'FETCH_ERROR', error);
    
    const allCampaigns = z.array(MarketingCampaignSchema).parse(data || []);
    
    return allCampaigns.filter(campaign =>
      campaign.targetProducts.includes(productId)
    );
  },

  async updateMetrics(
    campaignId: string,
    metrics: Partial<MarketingCampaign['metrics']>
  ): Promise<MarketingCampaign> {
    const campaign = await this.getById(campaignId);
    
    const updatedMetrics = {
      ...campaign.metrics,
      ...metrics,
      roi: metrics?.revenue && campaign.budget > 0 
        ? ((metrics.revenue - campaign.budget) / campaign.budget) * 100 
        : undefined
    };

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update({ 
        metrics: updatedMetrics,
        updatedAt: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to update metrics', 'UPDATE_ERROR', error);
    return MarketingCampaignSchema.parse(data);
  }
};