import { 
  marketingCampaignSchema, 
  marketingCampaignTransform,
  validateCampaignLifecycle 
} from '../marketingCampaign.schema';
import { MarketingCampaign } from '../../../types/marketing.types';

describe('MarketingCampaign Schema', () => {
  describe('Basic Validation', () => {
    it('should validate a complete marketing campaign', () => {
      const validCampaign = {
        id: 'camp-001',
        name: 'Spring Sale Campaign',
        description: 'Q2 Spring promotion campaign',
        status: 'planning',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-30'),
        budget: 50000,
        spentBudget: 15000,
        targetAudience: ['b2b', 'enterprise'],
        channels: ['email', 'social', 'display'],
        goals: [
          {
            type: 'conversions',
            target: 1000,
            current: 250,
            unit: 'sales'
          },
          {
            type: 'revenue',
            target: 100000,
            current: 25000,
            unit: 'USD'
          }
        ],
        productIds: ['prod-001', 'prod-002'],
        contentIds: ['content-001', 'content-002'],
        metrics: {
          impressions: 100000,
          clicks: 5000,
          conversions: 250,
          revenue: 25000,
          roi: 1.67,
          ctr: 0.05,
          conversionRate: 0.05,
          avgOrderValue: 100
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: ['spring', 'sale', 'q2']
      };

      const result = marketingCampaignSchema.safeParse(validCampaign);
      expect(result.success).toBe(true);
    });

    it('should reject invalid campaign status', () => {
      const invalidCampaign = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'invalid-status',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 0,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0,
          ctr: 0,
          conversionRate: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should validate budget constraints', () => {
      const negativeBudget = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'planning',
        startDate: new Date(),
        budget: -1000,
        spentBudget: 0,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0,
          ctr: 0,
          conversionRate: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = marketingCampaignSchema.safeParse(negativeBudget);
      expect(result.success).toBe(false);
    });

    it('should validate spent budget does not exceed total budget', () => {
      const overBudget = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'active',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 15000,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0,
          ctr: 0,
          conversionRate: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = marketingCampaignSchema.safeParse(overBudget);
      expect(result.success).toBe(false);
    });

    it('should validate goal structure', () => {
      const invalidGoal = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'planning',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 0,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [
          {
            type: 'invalid-type',
            target: 100,
            current: 0,
            unit: 'items'
          }
        ],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0,
          ctr: 0,
          conversionRate: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = marketingCampaignSchema.safeParse(invalidGoal);
      expect(result.success).toBe(false);
    });

    it('should validate metrics calculations', () => {
      const campaign = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'active',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 5000,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 100000,
          clicks: 5000,
          conversions: 250,
          revenue: 25000,
          roi: 5.0,
          ctr: 0.05,
          conversionRate: 0.05,
          avgOrderValue: 100
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = marketingCampaignSchema.safeParse(campaign);
      expect(result.success).toBe(true);
    });
  });

  describe('Transform Schema', () => {
    it('should transform database data correctly', () => {
      const dbData = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'planning',
        startDate: '2024-04-01T00:00:00Z',
        endDate: '2024-04-30T00:00:00Z',
        budget: 10000,
        spentBudget: 0,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0,
          ctr: 0,
          conversionRate: 0
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-001',
        tags: null
      };

      const result = marketingCampaignTransform.safeParse(dbData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.endDate).toBeInstanceOf(Date);
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.tags).toEqual([]);
      }
    });

    it('should handle null arrays with defaults', () => {
      const dbData = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'planning',
        startDate: '2024-04-01T00:00:00Z',
        budget: 10000,
        spentBudget: 0,
        targetAudience: null,
        channels: null,
        goals: null,
        productIds: null,
        contentIds: null,
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0,
          ctr: 0,
          conversionRate: 0
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-001',
        tags: null
      };

      const result = marketingCampaignTransform.safeParse(dbData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetAudience).toEqual([]);
        expect(result.data.channels).toEqual([]);
        expect(result.data.goals).toEqual([]);
        expect(result.data.productIds).toEqual([]);
        expect(result.data.contentIds).toEqual([]);
        expect(result.data.tags).toEqual([]);
      }
    });
  });

  describe('Campaign Lifecycle Validation', () => {
    it('should allow planning to active transition', () => {
      const campaign: MarketingCampaign = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'planning',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 0,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0,
          ctr: 0,
          conversionRate: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = validateCampaignLifecycle(campaign, 'active');
      expect(result.valid).toBe(true);
    });

    it('should allow active to paused transition', () => {
      const campaign: MarketingCampaign = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'active',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 5000,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 1000,
          clicks: 100,
          conversions: 10,
          revenue: 1000,
          roi: 0.2,
          ctr: 0.1,
          conversionRate: 0.1
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = validateCampaignLifecycle(campaign, 'paused');
      expect(result.valid).toBe(true);
    });

    it('should allow paused to active transition', () => {
      const campaign: MarketingCampaign = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'paused',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 5000,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 1000,
          clicks: 100,
          conversions: 10,
          revenue: 1000,
          roi: 0.2,
          ctr: 0.1,
          conversionRate: 0.1
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = validateCampaignLifecycle(campaign, 'active');
      expect(result.valid).toBe(true);
    });

    it('should prevent completed to active transition', () => {
      const campaign: MarketingCampaign = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'completed',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        budget: 10000,
        spentBudget: 10000,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 10000,
          clicks: 1000,
          conversions: 100,
          revenue: 10000,
          roi: 1.0,
          ctr: 0.1,
          conversionRate: 0.1
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = validateCampaignLifecycle(campaign, 'active');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from completed');
    });

    it('should prevent cancelled to any transition', () => {
      const campaign: MarketingCampaign = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'cancelled',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 2000,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          roi: 0,
          ctr: 0,
          conversionRate: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = validateCampaignLifecycle(campaign, 'active');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from cancelled');
    });

    it('should allow any active status to cancelled', () => {
      const campaign: MarketingCampaign = {
        id: 'camp-001',
        name: 'Campaign',
        description: 'Description',
        status: 'active',
        startDate: new Date(),
        budget: 10000,
        spentBudget: 5000,
        targetAudience: ['b2b'],
        channels: ['email'],
        goals: [],
        productIds: [],
        contentIds: [],
        metrics: {
          impressions: 1000,
          clicks: 100,
          conversions: 10,
          revenue: 1000,
          roi: 0.2,
          ctr: 0.1,
          conversionRate: 0.1
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-001',
        tags: []
      };

      const result = validateCampaignLifecycle(campaign, 'cancelled');
      expect(result.valid).toBe(true);
    });
  });
});