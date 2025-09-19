import { MarketingAnalyticsService, AnalyticsTimeRange } from '../marketingAnalytics.service';
import { MarketingCampaign, ProductBundle, ProductContent, WorkflowState, BundleType, CampaignStatus } from '@/schemas/marketing';

describe('MarketingAnalyticsService', () => {
  let service: MarketingAnalyticsService;
  
  beforeEach(() => {
    service = new MarketingAnalyticsService();
  });

  afterEach(() => {
    service.clearData();
  });

  const createMockCampaign = (overrides: Partial<MarketingCampaign> = {}): MarketingCampaign => ({
    id: `campaign-${Math.random()}`,
    name: 'Test Campaign',
    description: 'Test Description',
    type: 'promotion' as CampaignType,
    status: 'active' as CampaignStatus,
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    budget: 1000,
    targetAudience: { segments: ['segment1'], filters: {} },
    channels: ['email', 'web'],
    content: {
      headline: 'Test',
      body: 'Test body',
      cta: 'Shop Now',
      images: []
    },
    metrics: {
      impressions: 1000,
      clicks: 100,
      conversions: 10,
      revenue: 500
    },
    discount: 20,
    productIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  const createMockBundle = (overrides: Partial<ProductBundle> = {}): ProductBundle => ({
    id: `bundle-${Math.random()}`,
    name: 'Test Bundle',
    description: 'Test Description',
    type: 'fixed' as BundleType,
    products: [
      { productId: 'prod-1', quantity: 1, isRequired: true },
      { productId: 'prod-2', quantity: 1, isRequired: true }
    ],
    pricing: {
      basePrice: 100,
      discountType: 'percentage',
      discountValue: 20,
      finalPrice: 80
    },
    availability: {
      startDate: null,
      endDate: null,
      stockQuantity: null,
      maxPerCustomer: null
    },
    tags: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  const createMockContent = (overrides: Partial<ProductContent> = {}): ProductContent => ({
    id: `content-${Math.random()}`,
    productId: 'prod-1',
    title: 'Test Content',
    description: 'Test Description',
    shortDescription: 'Short desc',
    features: [],
    specifications: {},
    images: [],
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Desc',
    seoKeywords: [],
    workflowState: 'draft' as WorkflowState,
    publishedAt: null,
    version: 1,
    history: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  describe('getCampaignAnalytics', () => {
    it('should calculate total campaign metrics', async () => {
      const campaigns = [
        createMockCampaign({
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 500 }
        }),
        createMockCampaign({
          metrics: { impressions: 2000, clicks: 150, conversions: 15, revenue: 750 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const analytics = await service.getCampaignAnalytics();
      
      expect(analytics.totalCampaigns).toBe(2);
      expect(analytics.totalImpressions).toBe(3000);
      expect(analytics.totalClicks).toBe(250);
      expect(analytics.totalConversions).toBe(25);
      expect(analytics.totalRevenue).toBe(1250);
    });

    it('should calculate average CTR correctly', async () => {
      const campaigns = [
        createMockCampaign({
          metrics: { impressions: 1000, clicks: 50, conversions: 5, revenue: 250 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const analytics = await service.getCampaignAnalytics();
      
      expect(analytics.averageCTR).toBe(5); // 50/1000 * 100
    });

    it('should calculate average conversion rate correctly', async () => {
      const campaigns = [
        createMockCampaign({
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 500 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const analytics = await service.getCampaignAnalytics();
      
      expect(analytics.averageConversionRate).toBe(10); // 10/100 * 100
    });

    it('should calculate ROI correctly', async () => {
      const campaigns = [
        createMockCampaign({
          budget: 1000,
          metrics: { impressions: 10000, clicks: 500, conversions: 50, revenue: 1500 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const analytics = await service.getCampaignAnalytics();
      
      expect(analytics.averageROI).toBe(50); // (1500-1000)/1000 * 100
    });

    it('should filter by time range', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      
      const campaigns = [
        createMockCampaign({ createdAt: oldDate }),
        createMockCampaign({ createdAt: new Date() })
      ];
      
      service.setCampaigns(campaigns);
      
      const timeRange: AnalyticsTimeRange = {
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date()
      };
      
      const analytics = await service.getCampaignAnalytics(timeRange);
      
      expect(analytics.totalCampaigns).toBe(1);
    });

    it('should handle empty campaigns', async () => {
      service.setCampaigns([]);
      const analytics = await service.getCampaignAnalytics();
      
      expect(analytics.totalCampaigns).toBe(0);
      expect(analytics.averageCTR).toBe(0);
      expect(analytics.averageConversionRate).toBe(0);
      expect(analytics.averageROI).toBe(0);
    });
  });

  describe('getBundleAnalytics', () => {
    it('should calculate bundle metrics', async () => {
      const bundles = [
        createMockBundle({
          isActive: true,
          pricing: { basePrice: 100, discountType: 'percentage', discountValue: 20, finalPrice: 80 }
        }),
        createMockBundle({
          isActive: false,
          pricing: { basePrice: 200, discountType: 'fixed', discountValue: 30, finalPrice: 170 }
        })
      ];
      
      service.setBundles(bundles);
      const analytics = await service.getBundleAnalytics();
      
      expect(analytics.totalBundles).toBe(2);
      expect(analytics.activeBundles).toBe(1);
      expect(analytics.totalSavings).toBe(50); // (100-80) + (200-170)
    });

    it('should calculate average discount correctly', async () => {
      const bundles = [
        createMockBundle({
          pricing: { basePrice: 100, discountType: 'percentage', discountValue: 20, finalPrice: 80 }
        }),
        createMockBundle({
          pricing: { basePrice: 100, discountType: 'percentage', discountValue: 30, finalPrice: 70 }
        })
      ];
      
      service.setBundles(bundles);
      const analytics = await service.getBundleAnalytics();
      
      expect(analytics.averageDiscount).toBe(25); // (20 + 30) / 2
    });

    it('should identify most popular bundle type', async () => {
      const bundles = [
        createMockBundle({ type: 'fixed' }),
        createMockBundle({ type: 'fixed' }),
        createMockBundle({ type: 'flexible' })
      ];
      
      service.setBundles(bundles);
      const analytics = await service.getBundleAnalytics();
      
      expect(analytics.mostPopularType).toBe('fixed');
    });

    it('should calculate average products per bundle', async () => {
      const bundles = [
        createMockBundle({
          products: [
            { productId: 'p1', quantity: 1, isRequired: true },
            { productId: 'p2', quantity: 1, isRequired: true }
          ]
        }),
        createMockBundle({
          products: [
            { productId: 'p1', quantity: 1, isRequired: true },
            { productId: 'p2', quantity: 1, isRequired: true },
            { productId: 'p3', quantity: 1, isRequired: false },
            { productId: 'p4', quantity: 1, isRequired: false }
          ]
        })
      ];
      
      service.setBundles(bundles);
      const analytics = await service.getBundleAnalytics();
      
      expect(analytics.averageProductsPerBundle).toBe(3); // (2 + 4) / 2
    });
  });

  describe('getContentAnalytics', () => {
    it('should calculate content metrics', async () => {
      const content = [
        createMockContent({ workflowState: 'draft' }),
        createMockContent({ workflowState: 'review' }),
        createMockContent({ workflowState: 'published', publishedAt: new Date() })
      ];
      
      service.setContent(content);
      const analytics = await service.getContentAnalytics();
      
      expect(analytics.totalContent).toBe(3);
      expect(analytics.publishedContent).toBe(1);
      expect(analytics.contentByState).toEqual({
        draft: 1,
        review: 1,
        published: 1
      });
    });

    it('should calculate conversion rate', async () => {
      const content = [
        createMockContent({ workflowState: 'draft' }),
        createMockContent({ workflowState: 'draft' }),
        createMockContent({ workflowState: 'published', publishedAt: new Date() })
      ];
      
      service.setContent(content);
      const analytics = await service.getContentAnalytics();
      
      expect(analytics.conversionRate).toBe(33.33); // 1/3 * 100
    });

    it('should calculate average time to publish', async () => {
      const createDate = new Date();
      const publishDate = new Date(createDate.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days later
      
      const content = [
        createMockContent({
          workflowState: 'published',
          createdAt: createDate,
          publishedAt: publishDate
        })
      ];
      
      service.setContent(content);
      const analytics = await service.getContentAnalytics();
      
      expect(analytics.averageTimeToPublish).toBe(5);
    });
  });

  describe('getChannelPerformance', () => {
    it('should aggregate metrics by channel', async () => {
      const campaigns = [
        createMockCampaign({
          channels: ['email'],
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 500 }
        }),
        createMockCampaign({
          channels: ['email'],
          metrics: { impressions: 2000, clicks: 200, conversions: 20, revenue: 1000 }
        }),
        createMockCampaign({
          channels: ['sms'],
          metrics: { impressions: 500, clicks: 50, conversions: 5, revenue: 250 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const performance = await service.getChannelPerformance();
      
      const emailPerf = performance.find(p => p.channel === 'email');
      expect(emailPerf?.impressions).toBe(3000);
      expect(emailPerf?.revenue).toBe(1500);
      
      const smsPerf = performance.find(p => p.channel === 'sms');
      expect(smsPerf?.impressions).toBe(500);
    });

    it('should split metrics across multiple channels', async () => {
      const campaigns = [
        createMockCampaign({
          channels: ['email', 'sms'],
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 500 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const performance = await service.getChannelPerformance();
      
      expect(performance).toHaveLength(2);
      expect(performance[0].impressions).toBe(500); // Split evenly
      expect(performance[1].impressions).toBe(500);
    });

    it('should calculate ROI per channel', async () => {
      const campaigns = [
        createMockCampaign({
          channels: ['email'],
          budget: 100,
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 200 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const performance = await service.getChannelPerformance();
      
      expect(performance[0].roi).toBe(100); // (200-100)/100 * 100
    });
  });

  describe('getRevenueMetrics', () => {
    it('should aggregate revenue by period', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      
      const campaigns = [
        createMockCampaign({
          startDate: yesterday,
          metrics: { impressions: 1000, clicks: 100, conversions: 5, revenue: 250 }
        }),
        createMockCampaign({
          startDate: today,
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 500 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const metrics = await service.getRevenueMetrics('daily');
      
      expect(metrics).toHaveLength(2);
      expect(metrics[0].revenue).toBe(250);
      expect(metrics[1].revenue).toBe(500);
    });

    it('should calculate average order value', async () => {
      const campaigns = [
        createMockCampaign({
          metrics: { impressions: 1000, clicks: 100, conversions: 5, revenue: 500 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const metrics = await service.getRevenueMetrics('monthly');
      
      expect(metrics[0].averageOrderValue).toBe(100); // 500 / 5
    });

    it('should calculate growth between periods', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      
      const campaigns = [
        createMockCampaign({
          startDate: yesterday,
          metrics: { impressions: 1000, clicks: 100, conversions: 5, revenue: 100 }
        }),
        createMockCampaign({
          startDate: today,
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 200 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const metrics = await service.getRevenueMetrics('daily');
      
      expect(metrics[1].growth).toBe(100); // 100% growth
    });
  });

  describe('getTopPerformingCampaigns', () => {
    it('should return campaigns sorted by revenue', async () => {
      const campaigns = [
        createMockCampaign({ name: 'Low', metrics: { ...createMockCampaign().metrics, revenue: 100 } }),
        createMockCampaign({ name: 'High', metrics: { ...createMockCampaign().metrics, revenue: 1000 } }),
        createMockCampaign({ name: 'Medium', metrics: { ...createMockCampaign().metrics, revenue: 500 } })
      ];
      
      service.setCampaigns(campaigns);
      const top = await service.getTopPerformingCampaigns(2);
      
      expect(top).toHaveLength(2);
      expect(top[0].name).toBe('High');
      expect(top[1].name).toBe('Medium');
    });
  });

  describe('getTopPerformingBundles', () => {
    it('should return bundles sorted by savings', async () => {
      const bundles = [
        createMockBundle({
          name: 'Low Savings',
          pricing: { basePrice: 100, discountType: 'fixed', discountValue: 10, finalPrice: 90 }
        }),
        createMockBundle({
          name: 'High Savings',
          pricing: { basePrice: 200, discountType: 'fixed', discountValue: 50, finalPrice: 150 }
        })
      ];
      
      service.setBundles(bundles);
      const top = await service.getTopPerformingBundles();
      
      expect(top[0].name).toBe('High Savings');
    });

    it('should filter only active bundles', async () => {
      const bundles = [
        createMockBundle({ name: 'Active', isActive: true }),
        createMockBundle({ name: 'Inactive', isActive: false })
      ];
      
      service.setBundles(bundles);
      const top = await service.getTopPerformingBundles();
      
      expect(top).toHaveLength(1);
      expect(top[0].name).toBe('Active');
    });
  });

  describe('getConversionFunnel', () => {
    it('should calculate funnel stages', async () => {
      const campaigns = [
        createMockCampaign({
          metrics: { impressions: 10000, clicks: 500, conversions: 50, revenue: 2500 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const funnel = await service.getConversionFunnel();
      
      expect(funnel).toHaveLength(3);
      expect(funnel[0]).toEqual({ stage: 'Impressions', count: 10000, rate: 100 });
      expect(funnel[1]).toEqual({ stage: 'Clicks', count: 500, rate: 5 });
      expect(funnel[2]).toEqual({ stage: 'Conversions', count: 50, rate: 0.5 });
    });

    it('should handle single campaign funnel', async () => {
      const campaigns = [
        createMockCampaign({
          id: 'camp-1',
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 500 }
        }),
        createMockCampaign({
          id: 'camp-2',
          metrics: { impressions: 2000, clicks: 200, conversions: 20, revenue: 1000 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const funnel = await service.getConversionFunnel('camp-1');
      
      expect(funnel[0].count).toBe(1000);
      expect(funnel[1].count).toBe(100);
      expect(funnel[2].count).toBe(10);
    });
  });

  describe('getSegmentPerformance', () => {
    it('should aggregate metrics by segment', async () => {
      const campaigns = [
        createMockCampaign({
          targetAudience: { segments: ['vip'], filters: {} },
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 1000 }
        }),
        createMockCampaign({
          targetAudience: { segments: ['vip', 'new'], filters: {} },
          metrics: { impressions: 500, clicks: 50, conversions: 5, revenue: 500 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const segments = await service.getSegmentPerformance();
      
      const vipSegment = segments.find(s => s.segment === 'vip');
      expect(vipSegment?.campaigns).toBe(2);
      expect(vipSegment?.revenue).toBe(1500);
      expect(vipSegment?.conversions).toBe(15);
      
      const newSegment = segments.find(s => s.segment === 'new');
      expect(newSegment?.campaigns).toBe(1);
      expect(newSegment?.revenue).toBe(500);
    });

    it('should sort segments by revenue', async () => {
      const campaigns = [
        createMockCampaign({
          targetAudience: { segments: ['low'], filters: {} },
          metrics: { impressions: 100, clicks: 10, conversions: 1, revenue: 100 }
        }),
        createMockCampaign({
          targetAudience: { segments: ['high'], filters: {} },
          metrics: { impressions: 1000, clicks: 100, conversions: 10, revenue: 1000 }
        })
      ];
      
      service.setCampaigns(campaigns);
      const segments = await service.getSegmentPerformance();
      
      expect(segments[0].segment).toBe('high');
      expect(segments[1].segment).toBe('low');
    });
  });
});