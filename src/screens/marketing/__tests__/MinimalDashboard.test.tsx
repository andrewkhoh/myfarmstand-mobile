import React from 'react';
import { marketingService } from '../../../services/marketing/marketingService';

// Mock the marketing service
jest.mock('../../../services/marketing/marketingService');

describe('Minimal MarketingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (marketingService.getCampaigns as jest.Mock).mockResolvedValue([]);
    (marketingService.getAnalytics as jest.Mock).mockResolvedValue({
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalContent: 0,
      publishedContent: 0,
      overallMetrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        roi: 0,
      },
      performance: [],
    });
  });

  it('should have service methods', () => {
    expect(marketingService.getCampaigns).toBeDefined();
    expect(marketingService.getAnalytics).toBeDefined();
  });

  it('should mock service correctly', async () => {
    const campaigns = await marketingService.getCampaigns();
    expect(campaigns).toEqual([]);
    
    const analytics = await marketingService.getAnalytics();
    expect(analytics.totalCampaigns).toBe(0);
  });
});