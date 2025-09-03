import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { MarketingDashboard } from '../MarketingDashboard';
import { marketingService } from '../../../services/marketing/marketingService';

// Mock the marketing service
jest.mock('../../../services/marketing/marketingService');

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

describe('MarketingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (marketingService.getCampaigns as jest.Mock).mockResolvedValue([
      {
        id: '1',
        name: 'Spring Sale Campaign',
        description: 'Spring promotional campaign',
        status: 'active',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-04-30'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (marketingService.getAnalytics as jest.Mock).mockResolvedValue({
      totalCampaigns: 2,
      activeCampaigns: 1,
      totalContent: 15,
      publishedContent: 10,
      overallMetrics: {
        impressions: 50000,
        clicks: 2500,
        conversions: 125,
        spend: 1500,
        roi: 250,
      },
      performance: [],
    });
  });

  describe('Rendering', () => {
    it('should render the dashboard', async () => {
      const { getByText, getByTestId } = render(
        <MarketingDashboard navigation={mockNavigation} />
      );
      
      // Initially shows loading
      expect(getByTestId('loading-indicator')).toBeTruthy();
      
      // Wait for content to load
      await waitFor(() => {
        expect(getByText('Marketing Dashboard')).toBeTruthy();
      });
    });

    it('should display analytics summary', async () => {
      const { getByText } = render(
        <MarketingDashboard navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('Active Campaigns')).toBeTruthy();
        expect(getByText('1')).toBeTruthy();
        expect(getByText('Total Content')).toBeTruthy();
        expect(getByText('15')).toBeTruthy();
      });
    });

    it('should display campaign list', async () => {
      const { getByText } = render(
        <MarketingDashboard navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('Spring Sale Campaign')).toBeTruthy();
      });
    });

    it('should show empty state when no campaigns', async () => {
      (marketingService.getCampaigns as jest.Mock).mockResolvedValue([]);
      
      const { getByText } = render(
        <MarketingDashboard navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('No campaigns yet')).toBeTruthy();
      });
    });

    it('should display error state on failure', async () => {
      (marketingService.getCampaigns as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      const { getByText } = render(
        <MarketingDashboard navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
      });
    });
  });

  describe('User Interactions', () => {
    it('should navigate to campaign planner', async () => {
      const { getByTestId } = render(
        <MarketingDashboard navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('create-campaign-button')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('create-campaign-button'));
      
      expect(mockNavigate).toHaveBeenCalledWith('CampaignPlanner');
    });

    it('should navigate to campaign details on press', async () => {
      const { getByText } = render(
        <MarketingDashboard navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('Spring Sale Campaign')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Spring Sale Campaign'));
      
      expect(mockNavigate).toHaveBeenCalledWith('CampaignDetails', {
        campaignId: '1',
      });
    });

    it('should handle pull to refresh', async () => {
      const { getByTestId } = render(
        <MarketingDashboard navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('campaign-list')).toBeTruthy();
      });
      
      const scrollView = getByTestId('campaign-list');
      const refreshControl = scrollView.props.refreshControl;
      
      fireEvent(refreshControl, 'onRefresh');
      
      await waitFor(() => {
        // Service should be called again for refresh
        expect(marketingService.getCampaigns).toHaveBeenCalledTimes(2);
        expect(marketingService.getAnalytics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Service Methods', () => {
    it('should have all required service methods', () => {
      expect(marketingService.getCampaigns).toBeDefined();
      expect(marketingService.getAnalytics).toBeDefined();
      expect(marketingService.createCampaign).toBeDefined();
      expect(marketingService.updateCampaign).toBeDefined();
      expect(marketingService.deleteCampaign).toBeDefined();
      expect(marketingService.getContent).toBeDefined();
      expect(marketingService.createContent).toBeDefined();
    });
  });
});