import { ExtendedMarketingOrchestrator } from '../orchestratorExtended';

describe('Campaign-Bundle Integration Tests', () => {
  let orchestrator: ExtendedMarketingOrchestrator;

  beforeEach(() => {
    orchestrator = new ExtendedMarketingOrchestrator();
  });

  describe('Bundle Creation and Management', () => {
    it('should create product bundle with pricing', async () => {
      const products = await Promise.all(
        ['Product A', 'Product B', 'Product C'].map(name =>
          orchestrator.createProduct({ name, price: 50 })
        )
      );

      const bundle = await orchestrator.createProductBundle({
        name: 'Super Bundle',
        products: products.map(p => ({ id: p.id, quantity: 1, discount: 10 })),
        pricing: {
          originalPrice: 150,
          bundlePrice: 135,
          savings: 15,
          currency: 'USD'
        }
      });

      expect(bundle.products).toHaveLength(3);
      expect(bundle.pricing.savings).toBe(15);
    });

    it('should apply dynamic pricing to bundles', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Dynamic Bundle',
        products: [],
        pricing: {
          originalPrice: 200,
          bundlePrice: 180,
          savings: 20,
          currency: 'USD'
        }
      });

      const updatedBundle = await orchestrator.applyDynamicPricing(bundle.id, {
        algorithm: 'seasonal',
        factor: 1.2
      });

      expect(updatedBundle.pricing.bundlePrice).toBeGreaterThan(180);
    });

    it('should manage bundle inventory', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Limited Bundle',
        products: [],
        availability: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stock: 100
        }
      });

      const reserved = await orchestrator.reserveBundleStock(bundle.id, 10);
      expect(reserved.availableStock).toBe(90);

      const purchased = await orchestrator.completeBundlePurchase(bundle.id, 10);
      expect(purchased.availableStock).toBe(90);
    });

    it('should handle bundle expiration', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Expiring Bundle',
        products: [],
        availability: {
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      });

      const isActive = await orchestrator.isBundleActive(bundle.id);
      expect(isActive).toBe(false);

      const activeBundle = await orchestrator.extendBundleAvailability(bundle.id, 30);
      expect(activeBundle.availability.endDate).toBeInstanceOf(Date);
    });

    it('should create seasonal bundles', async () => {
      const seasonalBundle = await orchestrator.createSeasonalBundle({
        name: 'Holiday Bundle',
        season: 'winter',
        year: 2024,
        products: [],
        autoActivate: true
      });

      expect(seasonalBundle.metadata?.season).toBe('winter');
      expect(seasonalBundle.metadata?.autoActivate).toBe(true);
    });
  });

  describe('Campaign-Bundle Association', () => {
    it('should attach bundles to marketing campaigns', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Campaign Bundle',
        products: []
      });

      const campaign = await orchestrator.createCampaign({
        name: 'Bundle Campaign',
        bundleIds: [bundle.id]
      });

      const associatedBundles = await orchestrator.getCampaignBundles(campaign.id);
      expect(associatedBundles).toHaveLength(1);
      expect(associatedBundles[0].id).toBe(bundle.id);
    });

    it('should track bundle performance in campaigns', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Performance Bundle',
        products: []
      });

      const campaign = await orchestrator.createCampaign({
        name: 'Performance Campaign',
        bundleIds: [bundle.id]
      });

      await orchestrator.launchCampaign(campaign.id);

      const performance = await orchestrator.getBundlePerformance(bundle.id, campaign.id);
      expect(performance).toBeDefined();
      expect(performance.views).toBe(0);
      expect(performance.conversions).toBe(0);
    });

    it('should apply campaign-specific bundle discounts', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Discount Bundle',
        products: [],
        pricing: {
          originalPrice: 100,
          bundlePrice: 90,
          savings: 10,
          currency: 'USD'
        }
      });

      const campaign = await orchestrator.createCampaign({
        name: 'Flash Sale',
        bundleIds: [bundle.id],
        additionalDiscount: 20
      });

      const campaignBundle = await orchestrator.getCampaignBundlePrice(bundle.id, campaign.id);
      expect(campaignBundle.finalPrice).toBe(72); // 90 - 20%
    });

    it('should manage bundle exclusivity for campaigns', async () => {
      const exclusiveBundle = await orchestrator.createProductBundle({
        name: 'VIP Bundle',
        products: [],
        exclusive: true
      });

      const regularCampaign = await orchestrator.createCampaign({
        name: 'Regular Campaign'
      });

      const vipCampaign = await orchestrator.createCampaign({
        name: 'VIP Campaign',
        type: 'vip'
      });

      const regularResult = await orchestrator.addBundleToCampaign(
        exclusiveBundle.id, 
        regularCampaign.id
      );
      expect(regularResult.success).toBe(false);

      const vipResult = await orchestrator.addBundleToCampaign(
        exclusiveBundle.id, 
        vipCampaign.id
      );
      expect(vipResult.success).toBe(true);
    });

    it('should coordinate bundle launches with campaigns', async () => {
      const bundles = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          orchestrator.createProductBundle({
            name: `Launch Bundle ${i}`,
            products: []
          })
        )
      );

      const campaign = await orchestrator.createCampaign({
        name: 'Coordinated Launch',
        bundleIds: bundles.map(b => b.id),
        launchDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const scheduled = await orchestrator.scheduleCampaignLaunch(campaign.id);
      expect(scheduled.bundlesScheduled).toBe(3);
      expect(scheduled.launchDate).toBeInstanceOf(Date);
    });
  });

  describe('Bundle Analytics and Optimization', () => {
    it('should analyze bundle purchase patterns', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Analytics Bundle',
        products: []
      });

      const patterns = await orchestrator.analyzeBundlePurchasePatterns(bundle.id);
      expect(patterns).toBeDefined();
      expect(patterns.peakHours).toBeInstanceOf(Array);
      expect(patterns.popularCombinations).toBeInstanceOf(Array);
    });

    it('should recommend bundle optimizations', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Optimize Bundle',
        products: []
      });

      const recommendations = await orchestrator.getBundleOptimizations(bundle.id);
      expect(recommendations).toBeInstanceOf(Array);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('impact');
        expect(rec).toHaveProperty('suggestion');
      });
    });

    it('should calculate bundle ROI', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'ROI Bundle',
        products: [],
        pricing: {
          originalPrice: 200,
          bundlePrice: 150,
          savings: 50,
          currency: 'USD'
        }
      });

      const campaign = await orchestrator.createCampaign({
        name: 'ROI Campaign',
        bundleIds: [bundle.id],
        budget: { total: 1000, spent: 0, currency: 'USD' }
      });

      const roi = await orchestrator.calculateBundleROI(bundle.id, campaign.id);
      expect(roi).toBeDefined();
      expect(roi.revenue).toBeGreaterThanOrEqual(0);
      expect(roi.cost).toBeGreaterThanOrEqual(0);
      expect(roi.roiPercentage).toBeDefined();
    });

    it('should track bundle conversion funnel', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Funnel Bundle',
        products: []
      });

      const funnel = await orchestrator.getBundleConversionFunnel(bundle.id);
      expect(funnel.stages).toBeInstanceOf(Array);
      expect(funnel.stages).toContain('view');
      expect(funnel.stages).toContain('add_to_cart');
      expect(funnel.stages).toContain('purchase');
    });

    it('should compare bundle performance across campaigns', async () => {
      const bundle = await orchestrator.createProductBundle({
        name: 'Comparison Bundle',
        products: []
      });

      const campaigns = await Promise.all(
        ['Campaign A', 'Campaign B'].map(name =>
          orchestrator.createCampaign({
            name,
            bundleIds: [bundle.id]
          })
        )
      );

      const comparison = await orchestrator.compareBundlePerformance(
        bundle.id,
        campaigns.map(c => c.id)
      );

      expect(comparison.campaigns).toHaveLength(2);
      expect(comparison.bestPerforming).toBeDefined();
    });
  });
});