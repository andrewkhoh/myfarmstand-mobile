import axios from 'axios';
import type { 
  Content, 
  Campaign, 
  Bundle, 
  ContentStatus, 
  CampaignStatus,
  AnalyticsEvent,
  WorkflowTransition
} from './schema';

const API_BASE = '/api/marketing';

// Content Service
export const contentService = {
  // CRUD Operations
  async getAll(): Promise<Content[]> {
    const { data } = await axios.get(`${API_BASE}/content`);
    return data;
  },

  async getById(id: string): Promise<Content> {
    const { data } = await axios.get(`${API_BASE}/content/${id}`);
    return data;
  },

  async create(content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>): Promise<Content> {
    const { data } = await axios.post(`${API_BASE}/content`, content);
    return data;
  },

  async update(id: string, updates: Partial<Content>): Promise<Content> {
    const { data } = await axios.patch(`${API_BASE}/content/${id}`, updates);
    return data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/content/${id}`);
  },

  // Content Operations
  async search(params: { query?: string; type?: string; tags?: string[] }): Promise<Content[]> {
    const { data } = await axios.get(`${API_BASE}/content/search`, { params });
    return data;
  },

  async getByStatus(status: ContentStatus): Promise<Content[]> {
    const { data } = await axios.get(`${API_BASE}/content`, { params: { status } });
    return data;
  },

  async schedule(id: string, scheduledFor: string): Promise<Content> {
    const { data } = await axios.post(`${API_BASE}/content/${id}/schedule`, { scheduledFor });
    return data;
  },

  async publish(id: string): Promise<Content> {
    const { data } = await axios.post(`${API_BASE}/content/${id}/publish`);
    return data;
  },

  async archive(id: string): Promise<Content> {
    const { data } = await axios.post(`${API_BASE}/content/${id}/archive`);
    return data;
  },

  async duplicate(id: string): Promise<Content> {
    const { data } = await axios.post(`${API_BASE}/content/${id}/duplicate`);
    return data;
  },

  async uploadImage(contentId: string, file: File): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await axios.post(`${API_BASE}/content/${contentId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  async removeImage(contentId: string, imageId: string): Promise<void> {
    await axios.delete(`${API_BASE}/content/${contentId}/images/${imageId}`);
  },

  async updateSEO(id: string, seo: Partial<Content['seo']>): Promise<Content> {
    const { data } = await axios.patch(`${API_BASE}/content/${id}/seo`, seo);
    return data;
  },

  async getVersionHistory(id: string): Promise<Content[]> {
    const { data } = await axios.get(`${API_BASE}/content/${id}/versions`);
    return data;
  },

  async restoreVersion(id: string, versionId: string): Promise<Content> {
    const { data } = await axios.post(`${API_BASE}/content/${id}/versions/${versionId}/restore`);
    return data;
  }
};

// Campaign Service
export const campaignService = {
  // CRUD Operations
  async getAll(): Promise<Campaign[]> {
    const { data } = await axios.get(`${API_BASE}/campaigns`);
    return data;
  },

  async getById(id: string): Promise<Campaign> {
    const { data } = await axios.get(`${API_BASE}/campaigns/${id}`);
    return data;
  },

  async create(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    const { data } = await axios.post(`${API_BASE}/campaigns`, campaign);
    return data;
  },

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data } = await axios.patch(`${API_BASE}/campaigns/${id}`, updates);
    return data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/campaigns/${id}`);
  },

  // Campaign Operations
  async activate(id: string): Promise<Campaign> {
    const { data } = await axios.post(`${API_BASE}/campaigns/${id}/activate`);
    return data;
  },

  async pause(id: string): Promise<Campaign> {
    const { data } = await axios.post(`${API_BASE}/campaigns/${id}/pause`);
    return data;
  },

  async complete(id: string): Promise<Campaign> {
    const { data } = await axios.post(`${API_BASE}/campaigns/${id}/complete`);
    return data;
  },

  async archive(id: string): Promise<Campaign> {
    const { data } = await axios.post(`${API_BASE}/campaigns/${id}/archive`);
    return data;
  },

  async duplicate(id: string): Promise<Campaign> {
    const { data } = await axios.post(`${API_BASE}/campaigns/${id}/duplicate`);
    return data;
  },

  async addContent(id: string, contentIds: string[]): Promise<Campaign> {
    const { data } = await axios.post(`${API_BASE}/campaigns/${id}/content`, { contentIds });
    return data;
  },

  async removeContent(id: string, contentIds: string[]): Promise<Campaign> {
    const { data } = await axios.delete(`${API_BASE}/campaigns/${id}/content`, { 
      data: { contentIds } 
    });
    return data;
  },

  async addBundles(id: string, bundleIds: string[]): Promise<Campaign> {
    const { data } = await axios.post(`${API_BASE}/campaigns/${id}/bundles`, { bundleIds });
    return data;
  },

  async removeBundles(id: string, bundleIds: string[]): Promise<Campaign> {
    const { data } = await axios.delete(`${API_BASE}/campaigns/${id}/bundles`, { 
      data: { bundleIds } 
    });
    return data;
  },

  async getPerformance(id: string): Promise<Campaign['metrics']> {
    const { data } = await axios.get(`${API_BASE}/campaigns/${id}/performance`);
    return data;
  },

  async getByStatus(status: CampaignStatus): Promise<Campaign[]> {
    const { data } = await axios.get(`${API_BASE}/campaigns`, { params: { status } });
    return data;
  },

  async getActive(): Promise<Campaign[]> {
    return this.getByStatus('active');
  },

  async search(params: { query?: string; channels?: string[]; dateRange?: { start: string; end: string } }): Promise<Campaign[]> {
    const { data } = await axios.get(`${API_BASE}/campaigns/search`, { params });
    return data;
  },

  async updateTargeting(id: string, targeting: Campaign['targetAudience']): Promise<Campaign> {
    const { data } = await axios.patch(`${API_BASE}/campaigns/${id}/targeting`, targeting);
    return data;
  },

  async updateBudget(id: string, budget: number): Promise<Campaign> {
    const { data } = await axios.patch(`${API_BASE}/campaigns/${id}/budget`, { budget });
    return data;
  }
};

// Bundle Service  
export const bundleService = {
  // CRUD Operations
  async getAll(): Promise<Bundle[]> {
    const { data } = await axios.get(`${API_BASE}/bundles`);
    return data;
  },

  async getById(id: string): Promise<Bundle> {
    const { data } = await axios.get(`${API_BASE}/bundles/${id}`);
    return data;
  },

  async create(bundle: Omit<Bundle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bundle> {
    const { data } = await axios.post(`${API_BASE}/bundles`, bundle);
    return data;
  },

  async update(id: string, updates: Partial<Bundle>): Promise<Bundle> {
    const { data } = await axios.patch(`${API_BASE}/bundles/${id}`, updates);
    return data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/bundles/${id}`);
  },

  // Bundle Operations
  async activate(id: string): Promise<Bundle> {
    const { data } = await axios.post(`${API_BASE}/bundles/${id}/activate`);
    return data;
  },

  async deactivate(id: string): Promise<Bundle> {
    const { data } = await axios.post(`${API_BASE}/bundles/${id}/deactivate`);
    return data;
  },

  async duplicate(id: string): Promise<Bundle> {
    const { data } = await axios.post(`${API_BASE}/bundles/${id}/duplicate`);
    return data;
  },

  async calculatePricing(id: string, params: { discountPercentage?: number; discountAmount?: number }): Promise<Bundle['pricing']> {
    const { data } = await axios.post(`${API_BASE}/bundles/${id}/calculate-pricing`, params);
    return data;
  },

  async checkAvailability(id: string): Promise<Bundle['availability']> {
    const { data } = await axios.get(`${API_BASE}/bundles/${id}/availability`);
    return data;
  },

  async updateInventory(id: string, quantity: number): Promise<Bundle> {
    const { data } = await axios.patch(`${API_BASE}/bundles/${id}/inventory`, { quantity });
    return data;
  },

  async reserveUnits(id: string, quantity: number): Promise<{ reservationId: string; expiresAt: string }> {
    const { data } = await axios.post(`${API_BASE}/bundles/${id}/reserve`, { quantity });
    return data;
  },

  async releaseReservation(id: string, reservationId: string): Promise<void> {
    await axios.post(`${API_BASE}/bundles/${id}/reservations/${reservationId}/release`);
  },

  async getActive(): Promise<Bundle[]> {
    const { data } = await axios.get(`${API_BASE}/bundles`, { params: { active: true } });
    return data;
  },

  async getFeatured(): Promise<Bundle[]> {
    const { data } = await axios.get(`${API_BASE}/bundles`, { params: { featured: true } });
    return data;
  },

  async search(params: { query?: string; tags?: string[]; priceRange?: { min: number; max: number } }): Promise<Bundle[]> {
    const { data } = await axios.get(`${API_BASE}/bundles/search`, { params });
    return data;
  },

  async addProducts(id: string, products: Bundle['products']): Promise<Bundle> {
    const { data } = await axios.post(`${API_BASE}/bundles/${id}/products`, { products });
    return data;
  },

  async removeProducts(id: string, productIds: string[]): Promise<Bundle> {
    const { data } = await axios.delete(`${API_BASE}/bundles/${id}/products`, { 
      data: { productIds } 
    });
    return data;
  }
};

// Analytics Service
export const analyticsService = {
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    await axios.post(`${API_BASE}/analytics/events`, event);
  },

  async getContentAnalytics(contentId: string, startDate: string, endDate: string): Promise<any> {
    const { data } = await axios.get(`${API_BASE}/analytics/content/${contentId}`, {
      params: { startDate, endDate }
    });
    return data;
  },

  async getCampaignAnalytics(campaignId: string, startDate: string, endDate: string): Promise<any> {
    const { data } = await axios.get(`${API_BASE}/analytics/campaigns/${campaignId}`, {
      params: { startDate, endDate }
    });
    return data;
  },

  async getBundleAnalytics(bundleId: string, startDate: string, endDate: string): Promise<any> {
    const { data } = await axios.get(`${API_BASE}/analytics/bundles/${bundleId}`, {
      params: { startDate, endDate }
    });
    return data;
  },

  async getDashboard(params: { startDate: string; endDate: string; channels?: string[] }): Promise<any> {
    const { data } = await axios.get(`${API_BASE}/analytics/dashboard`, { params });
    return data;
  },

  async getConversionFunnel(campaignId: string): Promise<any> {
    const { data } = await axios.get(`${API_BASE}/analytics/campaigns/${campaignId}/funnel`);
    return data;
  },

  async getAttributionReport(params: { startDate: string; endDate: string; model: 'first-touch' | 'last-touch' | 'linear' }): Promise<any> {
    const { data } = await axios.get(`${API_BASE}/analytics/attribution`, { params });
    return data;
  },

  async exportAnalytics(params: { 
    type: 'content' | 'campaign' | 'bundle' | 'dashboard';
    entityId?: string;
    format: 'csv' | 'excel' | 'pdf';
    startDate: string;
    endDate: string;
  }): Promise<{ url: string }> {
    const { data } = await axios.post(`${API_BASE}/analytics/export`, params);
    return data;
  },

  async getRealTimeStats(): Promise<any> {
    const { data } = await axios.get(`${API_BASE}/analytics/realtime`);
    return data;
  },

  async getTopPerformers(params: { 
    type: 'content' | 'campaign' | 'bundle';
    metric: 'views' | 'conversions' | 'revenue';
    limit?: number;
  }): Promise<any[]> {
    const { data } = await axios.get(`${API_BASE}/analytics/top-performers`, { params });
    return data;
  }
};

// Workflow Service
export const workflowService = {
  // Workflow transitions map
  transitions: {
    draft: ['in_review'],
    in_review: ['draft', 'approved'],
    approved: ['scheduled', 'published'],
    scheduled: ['published', 'draft'],
    published: ['archived'],
    archived: ['draft']
  } as Record<ContentStatus, ContentStatus[]>,

  canTransition(from: ContentStatus, to: ContentStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  },

  getAvailableTransitions(status: ContentStatus): ContentStatus[] {
    return this.transitions[status] ?? [];
  },

  async transition(contentId: string, to: ContentStatus, metadata?: { 
    reason?: string; 
    triggeredBy?: string;
  }): Promise<Content> {
    const { data } = await axios.post(`${API_BASE}/workflow/${contentId}/transition`, {
      to,
      ...metadata
    });
    return data;
  },

  async batchTransition(contentIds: string[], to: ContentStatus, metadata?: {
    reason?: string;
    triggeredBy?: string;
  }): Promise<any[]> {
    const { data } = await axios.post(`${API_BASE}/workflow/batch-transition`, {
      contentIds,
      to,
      ...metadata
    });
    return data;
  },

  async getHistory(contentId: string): Promise<WorkflowTransition[]> {
    const { data } = await axios.get(`${API_BASE}/workflow/${contentId}/history`);
    return data;
  },

  async getCurrentState(contentId: string): Promise<{ status: ContentStatus; canTransitionTo: ContentStatus[] }> {
    const { data } = await axios.get(`${API_BASE}/workflow/${contentId}/state`);
    return data;
  },

  async approveContent(contentId: string, approver: string): Promise<Content> {
    return this.transition(contentId, 'approved', { triggeredBy: approver, reason: 'Content approved' });
  },

  async rejectContent(contentId: string, reviewer: string, reason: string): Promise<Content> {
    return this.transition(contentId, 'draft', { triggeredBy: reviewer, reason });
  },

  async scheduleContent(contentId: string, scheduledFor: string): Promise<Content> {
    const { data } = await axios.post(`${API_BASE}/workflow/${contentId}/schedule`, { scheduledFor });
    return data;
  }
};

// Export all services
export default {
  content: contentService,
  campaign: campaignService,
  bundle: bundleService,
  analytics: analyticsService,
  workflow: workflowService
};