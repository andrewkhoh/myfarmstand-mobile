import { ExtendedMarketingOrchestrator } from '../orchestratorExtended';

describe('Cross-Marketing Integration Tests', () => {
  let orchestrator: ExtendedMarketingOrchestrator;

  beforeEach(() => {
    orchestrator = new ExtendedMarketingOrchestrator();
  });

  describe('Multi-Channel Campaigns', () => {
    it('should coordinate email and blog content in single campaign', async () => {
      const emailContent = await orchestrator.createContent({
        title: 'Email Campaign',
        type: 'email',
        workflowState: 'draft',
        content: 'Email content'
      });

      const blogContent = await orchestrator.createContent({
        title: 'Blog Campaign',
        type: 'blog',
        workflowState: 'draft',
        content: 'Blog content'
      });

      await orchestrator.transitionContent(emailContent.id, 'review');
      await orchestrator.transitionContent(emailContent.id, 'approved');
      await orchestrator.transitionContent(blogContent.id, 'review');
      await orchestrator.transitionContent(blogContent.id, 'approved');

      const campaign = await orchestrator.createCampaign({
        name: 'Multi-Channel Campaign',
        contentIds: [emailContent.id, blogContent.id],
        channels: ['email', 'blog']
      });

      const result = await orchestrator.launchCampaign(campaign.id);
      expect(result.success).toBe(true);
      expect(result.publishedContent).toHaveLength(2);
    });

    it('should sync content across social media platforms', async () => {
      const content = await orchestrator.createContent({
        title: 'Social Media Post',
        type: 'social',
        workflowState: 'draft',
        content: 'Social content',
        platforms: ['twitter', 'facebook', 'linkedin']
      });

      await orchestrator.transitionContent(content.id, 'review');
      await orchestrator.transitionContent(content.id, 'approved');

      const result = await orchestrator.publishToSocialPlatforms(content.id);
      expect(result.publishedPlatforms).toHaveLength(3);
      expect(result.publishedPlatforms).toContain('twitter');
    });

    it('should handle cross-promotion between products', async () => {
      const mainProduct = await orchestrator.createProduct({
        name: 'Main Product',
        price: 100
      });

      const relatedProducts = await Promise.all(
        ['Related 1', 'Related 2'].map(name =>
          orchestrator.createProduct({ name, price: 50 })
        )
      );

      const campaign = await orchestrator.createCrossSellCampaign({
        mainProductId: mainProduct.id,
        relatedProductIds: relatedProducts.map(p => p.id),
        discount: 20
      });

      expect(campaign.products).toHaveLength(3);
      expect(campaign.discount).toBe(20);
    });

    it('should coordinate landing page with ad campaigns', async () => {
      const landingPage = await orchestrator.createContent({
        title: 'Landing Page',
        type: 'landing-page',
        workflowState: 'draft',
        content: 'Landing page content'
      });

      await orchestrator.transitionContent(landingPage.id, 'review');
      await orchestrator.transitionContent(landingPage.id, 'approved');

      const adCampaign = await orchestrator.createAdCampaign({
        name: 'PPC Campaign',
        landingPageId: landingPage.id,
        budget: 5000,
        platforms: ['google', 'facebook']
      });

      const result = await orchestrator.launchAdCampaign(adCampaign.id);
      expect(result.success).toBe(true);
      expect(result.landingPageActive).toBe(true);
    });

    it('should manage affiliate marketing integration', async () => {
      const product = await orchestrator.createProduct({
        name: 'Affiliate Product',
        price: 200
      });

      const affiliateProgram = await orchestrator.createAffiliateProgram({
        productId: product.id,
        commissionRate: 15,
        cookieDuration: 30
      });

      const affiliates = await Promise.all(
        ['Affiliate 1', 'Affiliate 2'].map(name =>
          orchestrator.registerAffiliate({
            name,
            programId: affiliateProgram.id
          })
        )
      );

      expect(affiliates).toHaveLength(2);
      expect(affiliateProgram.commissionRate).toBe(15);
    });
  });

  describe('Customer Journey Integration', () => {
    it('should track customer through complete funnel', async () => {
      const customer = await orchestrator.createCustomer({
        email: 'test@example.com',
        source: 'organic'
      });

      const journey = await orchestrator.trackCustomerJourney(customer.id, [
        { stage: 'awareness', timestamp: new Date() },
        { stage: 'consideration', timestamp: new Date() },
        { stage: 'purchase', timestamp: new Date() }
      ]);

      expect(journey.stages).toHaveLength(3);
      expect(journey.currentStage).toBe('purchase');
    });

    it('should trigger automated campaigns based on behavior', async () => {
      const customer = await orchestrator.createCustomer({
        email: 'behavior@example.com'
      });

      await orchestrator.trackCustomerAction(customer.id, {
        action: 'abandoned_cart',
        products: ['product-1', 'product-2']
      });

      const triggeredCampaigns = await orchestrator.getTriggeredCampaigns(customer.id);
      expect(triggeredCampaigns).toHaveLength(1);
      expect(triggeredCampaigns[0].type).toBe('cart_abandonment');
    });

    it('should personalize content based on segment', async () => {
      const segment = await orchestrator.createCustomerSegment({
        name: 'VIP Customers',
        criteria: { minPurchases: 5, minSpend: 1000 }
      });

      const content = await orchestrator.createPersonalizedContent({
        baseContent: 'Welcome {name}',
        segmentId: segment.id,
        personalization: {
          vip: true,
          discount: 25
        }
      });

      expect(content.personalization?.vip).toBe(true);
      expect(content.personalization?.discount).toBe(25);
    });

    it('should coordinate retention campaigns', async () => {
      const inactiveCustomers = await orchestrator.getInactiveCustomers({
        daysSinceLastPurchase: 90
      });

      const retentionCampaign = await orchestrator.createRetentionCampaign({
        name: 'Win Back Campaign',
        targetCustomers: inactiveCustomers,
        incentive: {
          type: 'discount',
          value: 30
        }
      });

      expect(retentionCampaign.targetCount).toBeGreaterThanOrEqual(0);
      expect(retentionCampaign.incentive.value).toBe(30);
    });

    it('should manage loyalty program integration', async () => {
      const loyaltyProgram = await orchestrator.createLoyaltyProgram({
        name: 'Points Program',
        earnRate: 1,
        redeemRate: 100
      });

      const customer = await orchestrator.createCustomer({
        email: 'loyal@example.com'
      });

      await orchestrator.enrollInLoyaltyProgram(customer.id, loyaltyProgram.id);
      await orchestrator.awardPoints(customer.id, 500, 'Purchase');

      const balance = await orchestrator.getPointsBalance(customer.id);
      expect(balance).toBe(500);
    });
  });

  describe('Marketing Automation', () => {
    it('should execute drip email campaign', async () => {
      const dripCampaign = await orchestrator.createDripCampaign({
        name: 'Onboarding Drip',
        emails: [
          { delay: 0, subject: 'Welcome!' },
          { delay: 3, subject: 'Getting Started' },
          { delay: 7, subject: 'Pro Tips' }
        ]
      });

      const customer = await orchestrator.createCustomer({
        email: 'drip@example.com'
      });

      await orchestrator.enrollInDripCampaign(customer.id, dripCampaign.id);
      const scheduled = await orchestrator.getScheduledEmails(customer.id);

      expect(scheduled).toHaveLength(3);
      expect(scheduled[0].subject).toBe('Welcome!');
    });

    it('should handle A/B testing for campaigns', async () => {
      const variants = await Promise.all(
        ['Variant A', 'Variant B'].map(title =>
          orchestrator.createContent({
            title,
            type: 'email',
            workflowState: 'approved',
            content: `${title} content`
          })
        )
      );

      const abTest = await orchestrator.createABTest({
        name: 'Subject Line Test',
        variants: variants.map(v => v.id),
        metric: 'open_rate',
        sampleSize: 1000
      });

      expect(abTest.variants).toHaveLength(2);
      expect(abTest.metric).toBe('open_rate');
    });

    it('should optimize send times based on engagement', async () => {
      const campaign = await orchestrator.createCampaign({
        name: 'Optimized Campaign'
      });

      const optimization = await orchestrator.optimizeSendTime(campaign.id, {
        targetTimezone: 'America/New_York',
        optimizeFor: 'open_rate'
      });

      expect(optimization.recommendedTime).toBeDefined();
      expect(optimization.confidence).toBeGreaterThan(0);
    });

    it('should manage marketing calendar coordination', async () => {
      const calendar = await orchestrator.createMarketingCalendar({
        year: 2024,
        quarter: 'Q1'
      });

      const events = await Promise.all(
        ['Product Launch', 'Sale Event', 'Webinar'].map(name =>
          orchestrator.addCalendarEvent({
            calendarId: calendar.id,
            name,
            date: new Date(2024, 0, 15)
          })
        )
      );

      expect(events).toHaveLength(3);
      const conflicts = await orchestrator.checkCalendarConflicts(calendar.id);
      expect(conflicts).toHaveLength(3); // All on same date
    });

    it('should integrate with marketing analytics', async () => {
      const campaign = await orchestrator.createCampaign({
        name: 'Analytics Campaign'
      });

      await orchestrator.startAnalyticsTracking(campaign.id);
      
      const metrics = await orchestrator.getCampaignMetrics(campaign.id);
      expect(metrics).toBeDefined();
      expect(metrics.impressions).toBe(0);
      expect(metrics.clicks).toBe(0);
      expect(metrics.conversions).toBe(0);
    });
  });
});