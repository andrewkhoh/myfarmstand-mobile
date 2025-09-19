import { MarketingCampaignService, CampaignMetricsUpdate } from '../marketingCampaign.service';
import { MarketingCampaign, CampaignStatus } from '@/schemas/marketing';
import { ServiceError, NotFoundError, ForbiddenError } from '../errors/ServiceError';
import { v4 as uuidv4 } from 'uuid';

describe('MarketingCampaignService', () => {
  let service: MarketingCampaignService;
  
  beforeEach(() => {
    service = new MarketingCampaignService();
  });

  afterEach(() => {
    service.clearMockData();
  });

  const createMockCampaign = (overrides: Partial<MarketingCampaign> = {}): Partial<MarketingCampaign> => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return {
      name: 'Test Campaign',
      description: 'Test campaign description',
      type: 'promotion' as CampaignType,
      status: 'draft' as CampaignStatus,
      startDate: tomorrow,
      endDate: nextWeek,
      budget: 1000,
      targetAudience: {
        segments: ['segment1'],
        filters: {}
      },
      channels: ['email', 'web'],
      content: {
        headline: 'Test Headline',
        body: 'Test Body',
        cta: 'Shop Now',
        images: []
      },
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      },
      discount: 20,
      productIds: [],
      ...overrides
    };
  };

  describe('createCampaign', () => {
    it('should create a new campaign with valid data', async () => {
      const campaignData = createMockCampaign();
      const result = await service.createCampaign(campaignData);
      
      expect(result).toMatchObject({
        name: 'Test Campaign',
        type: 'promotion',
        status: 'draft'
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should validate discount limit', async () => {
      const invalidCampaign = createMockCampaign({ discount: 60 });
      
      await expect(service.createCampaign(invalidCampaign)).rejects.toThrow(
        'Discount cannot exceed 50%'
      );
    });

    it('should validate active campaign date range', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const furtherFutureDate = new Date();
      furtherFutureDate.setDate(furtherFutureDate.getDate() + 10);
      
      const invalidCampaign = createMockCampaign({
        status: 'active',
        startDate: futureDate,
        endDate: furtherFutureDate
      });
      
      await expect(service.createCampaign(invalidCampaign)).rejects.toThrow(
        'Active campaigns must be within their date range'
      );
    });

    it('should validate end date after start date', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const invalidCampaign = createMockCampaign({
        startDate: today,
        endDate: yesterday
      });
      
      await expect(service.createCampaign(invalidCampaign)).rejects.toThrow();
    });

    it('should set default values', async () => {
      const minimalCampaign = {
        name: 'Minimal Campaign',
        description: 'Description',
        type: 'promotion' as CampaignType,
        status: 'draft' as CampaignStatus,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        content: {
          headline: 'Headline',
          body: 'Body'
        }
      };
      
      const result = await service.createCampaign(minimalCampaign);
      
      expect(result.channels).toEqual([]);
      expect(result.productIds).toEqual([]);
      expect(result.metrics.impressions).toBe(0);
    });
  });

  describe('getCampaign', () => {
    it('should retrieve existing campaign', async () => {
      const created = await service.createCampaign(createMockCampaign());
      const retrieved = await service.getCampaign(created.id);
      
      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundError for non-existent campaign', async () => {
      await expect(service.getCampaign('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign properties', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      const updated = await service.updateCampaign(campaign.id, {
        name: 'Updated Campaign',
        discount: 30
      });
      
      expect(updated.name).toBe('Updated Campaign');
      expect(updated.discount).toBe(30);
      expect(updated.updatedAt).not.toEqual(campaign.updatedAt);
    });

    it('should prevent status change for completed campaigns', async () => {
      const campaign = await service.createCampaign(
        createMockCampaign({ status: 'completed' })
      );
      
      await expect(
        service.updateCampaign(campaign.id, { status: 'active' })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete non-active campaign', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      await service.deleteCampaign(campaign.id);
      
      await expect(service.getCampaign(campaign.id)).rejects.toThrow(NotFoundError);
    });

    it('should prevent deletion of active campaigns', async () => {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const campaign = await service.createCampaign(
        createMockCampaign({ 
          status: 'active',
          startDate: today,
          endDate: nextWeek
        })
      );
      
      await expect(service.deleteCampaign(campaign.id)).rejects.toThrow(
        'Cannot delete active campaigns'
      );
    });
  });

  describe('updateStatus', () => {
    it('should allow valid status transitions', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      const updated = await service.updateStatus(campaign.id, 'scheduled');
      
      expect(updated.status).toBe('scheduled');
    });

    it('should reject invalid status transitions', async () => {
      const campaign = await service.createCampaign(
        createMockCampaign({ status: 'completed' })
      );
      
      await expect(
        service.updateStatus(campaign.id, 'draft')
      ).rejects.toThrow(ServiceError);
    });

    it('should validate dates when activating', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      const furtherFutureDate = new Date();
      furtherFutureDate.setDate(furtherFutureDate.getDate() + 20);
      
      const campaign = await service.createCampaign(
        createMockCampaign({ 
          status: 'scheduled',
          startDate: futureDate,
          endDate: furtherFutureDate
        })
      );
      
      await expect(
        service.updateStatus(campaign.id, 'active')
      ).rejects.toThrow('Cannot activate campaign before start date');
    });

    it('should allow pausing active campaigns', async () => {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const campaign = await service.createCampaign(
        createMockCampaign({ 
          status: 'active',
          startDate: today,
          endDate: nextWeek
        })
      );
      
      const updated = await service.updateStatus(campaign.id, 'paused');
      expect(updated.status).toBe('paused');
    });
  });

  describe('updateMetrics', () => {
    it('should increment metrics', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      
      const updated = await service.updateMetrics(campaign.id, {
        impressions: 100,
        clicks: 10,
        conversions: 2,
        revenue: 200
      });
      
      expect(updated.metrics).toEqual({
        impressions: 100,
        clicks: 10,
        conversions: 2,
        revenue: 200
      });
    });

    it('should accumulate metrics on multiple updates', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      
      await service.updateMetrics(campaign.id, { impressions: 100, clicks: 10 });
      const updated = await service.updateMetrics(campaign.id, { impressions: 50, clicks: 5 });
      
      expect(updated.metrics.impressions).toBe(150);
      expect(updated.metrics.clicks).toBe(15);
    });

    it('should validate clicks do not exceed impressions', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      
      await expect(
        service.updateMetrics(campaign.id, { impressions: 10, clicks: 20 })
      ).rejects.toThrow('Clicks cannot exceed impressions');
    });

    it('should validate conversions do not exceed clicks', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      
      await expect(
        service.updateMetrics(campaign.id, { clicks: 10, conversions: 20 })
      ).rejects.toThrow('Conversions cannot exceed clicks');
    });
  });

  describe('calculatePerformance', () => {
    it('should calculate CTR correctly', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      await service.updateMetrics(campaign.id, { impressions: 1000, clicks: 50 });
      
      const performance = await service.calculatePerformance(campaign.id);
      
      expect(performance.ctr).toBe(5);
    });

    it('should calculate conversion rate correctly', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      await service.updateMetrics(campaign.id, { 
        impressions: 1000, 
        clicks: 100, 
        conversions: 10 
      });
      
      const performance = await service.calculatePerformance(campaign.id);
      
      expect(performance.conversionRate).toBe(10);
    });

    it('should calculate ROI correctly', async () => {
      const campaign = await service.createCampaign(
        createMockCampaign({ budget: 1000 })
      );
      await service.updateMetrics(campaign.id, { revenue: 1500 });
      
      const performance = await service.calculatePerformance(campaign.id);
      
      expect(performance.roi).toBe(50);
    });

    it('should handle zero values gracefully', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      
      const performance = await service.calculatePerformance(campaign.id);
      
      expect(performance.ctr).toBe(0);
      expect(performance.conversionRate).toBe(0);
      expect(performance.roi).toBe(0);
      expect(performance.costPerConversion).toBe(0);
    });
  });

  describe('searchCampaigns', () => {
    beforeEach(async () => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      await service.createCampaign(createMockCampaign({
        name: 'Campaign 1',
        type: 'promotion',
        status: 'active',
        channels: ['email'],
        startDate: today,
        endDate: nextWeek
      }));
      
      await service.createCampaign(createMockCampaign({
        name: 'Campaign 2',
        type: 'seasonal',
        status: 'draft',
        channels: ['sms', 'push']
      }));
      
      await service.createCampaign(createMockCampaign({
        name: 'Campaign 3',
        type: 'promotion',
        status: 'scheduled',
        channels: ['email', 'web']
      }));
    });

    it('should filter by type', async () => {
      const results = await service.searchCampaigns({ type: 'promotion' });
      
      expect(results).toHaveLength(2);
      expect(results.every(c => c.type === 'promotion')).toBe(true);
    });

    it('should filter by status', async () => {
      const results = await service.searchCampaigns({ status: 'active' });
      
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('active');
    });

    it('should filter by channels', async () => {
      const results = await service.searchCampaigns({ channels: ['email'] });
      
      expect(results).toHaveLength(2);
    });

    it('should combine multiple filters', async () => {
      const results = await service.searchCampaigns({
        type: 'promotion',
        channels: ['email']
      });
      
      expect(results).toHaveLength(2);
    });
  });

  describe('getActiveCampaigns', () => {
    it('should return only active campaigns within date range', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      await service.createCampaign(createMockCampaign({
        status: 'active',
        startDate: yesterday,
        endDate: tomorrow
      }));
      
      await service.createCampaign(createMockCampaign({
        status: 'draft',
        startDate: tomorrow,
        endDate: nextWeek
      }));
      
      await service.createCampaign(createMockCampaign({
        status: 'scheduled'
      }));
      
      const active = await service.getActiveCampaigns();
      
      expect(active).toHaveLength(1);
    });
  });

  describe('duplicateCampaign', () => {
    it('should create a copy with new name and draft status', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const original = await service.createCampaign(createMockCampaign({
        status: 'active',
        startDate: yesterday,
        endDate: nextWeek,
        metrics: { impressions: 100, clicks: 10, conversions: 2, revenue: 200 }
      }));
      
      const duplicated = await service.duplicateCampaign(original.id, 'Duplicated Campaign');
      
      expect(duplicated.id).not.toBe(original.id);
      expect(duplicated.name).toBe('Duplicated Campaign');
      expect(duplicated.status).toBe('draft');
      expect(duplicated.metrics.impressions).toBe(0);
    });
  });

  describe('extendCampaign', () => {
    it('should extend campaign end date', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      const originalEndDate = campaign.endDate;
      
      const extended = await service.extendCampaign(campaign.id, 7);
      
      const expectedEndDate = new Date(originalEndDate);
      expectedEndDate.setDate(expectedEndDate.getDate() + 7);
      
      expect(extended.endDate.getDate()).toBe(expectedEndDate.getDate());
    });

    it('should not allow extending completed campaigns', async () => {
      const campaign = await service.createCampaign(
        createMockCampaign({ status: 'completed' })
      );
      
      await expect(
        service.extendCampaign(campaign.id, 7)
      ).rejects.toThrow('Cannot extend completed campaigns');
    });
  });

  describe('applyDiscount', () => {
    it('should update campaign discount', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      const updated = await service.applyDiscount(campaign.id, 35);
      
      expect(updated.discount).toBe(35);
    });

    it('should validate discount range', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      
      await expect(
        service.applyDiscount(campaign.id, -5)
      ).rejects.toThrow('Discount must be between 0 and 50');
      
      await expect(
        service.applyDiscount(campaign.id, 51)
      ).rejects.toThrow('Discount must be between 0 and 50');
    });
  });

  describe('addProducts', () => {
    it('should add products to campaign', async () => {
      const campaign = await service.createCampaign(createMockCampaign());
      const productIds = [uuidv4(), uuidv4()];
      const updated = await service.addProducts(campaign.id, productIds);
      
      expect(updated.productIds).toEqual(productIds);
    });

    it('should avoid duplicate products', async () => {
      const prodId1 = uuidv4();
      const prodId2 = uuidv4();
      const campaign = await service.createCampaign(
        createMockCampaign({ productIds: [prodId1] })
      );
      
      const updated = await service.addProducts(campaign.id, [prodId1, prodId2]);
      
      expect(updated.productIds).toEqual([prodId1, prodId2]);
    });
  });

  describe('removeProducts', () => {
    it('should remove products from campaign', async () => {
      const prodId1 = uuidv4();
      const prodId2 = uuidv4();
      const prodId3 = uuidv4();
      const campaign = await service.createCampaign(
        createMockCampaign({ productIds: [prodId1, prodId2, prodId3] })
      );
      
      const updated = await service.removeProducts(campaign.id, [prodId2]);
      
      expect(updated.productIds).toEqual([prodId1, prodId3]);
    });
  });
});