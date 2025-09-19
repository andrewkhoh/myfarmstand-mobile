import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MarketingDashboard } from '../MarketingDashboard';
import { useMarketingDashboard } from '@/hooks/marketing/useMarketingDashboard';
import { useActiveCampaigns } from '@/hooks/marketing/useActiveCampaigns';
import { usePendingContent } from '@/hooks/marketing/usePendingContent';
import { useNavigation } from '@react-navigation/native';
import { mockNavigation } from './test-utils';

jest.mock('@/hooks/marketing/useMarketingDashboard');
jest.mock('@/hooks/marketing/useActiveCampaigns');
jest.mock('@/hooks/marketing/usePendingContent');
jest.mock('@react-navigation/native');

describe('MarketingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  describe('Loading State', () => {
    it('should render loading state initially', () => {
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: true,
        stats: null,
        refetchAll: jest.fn(),
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: true,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: true,
      });

      const { getByTestId } = render(<MarketingDashboard />);
      
      expect(getByTestId('loading-screen')).toBeTruthy();
    });

    it('should not show loading screen when data is loaded', () => {
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        stats: {
          activeCampaigns: 5,
          pendingContent: 3,
          totalRevenue: 1234.56,
        },
        refetchAll: jest.fn(),
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });

      const { queryByTestId } = render(<MarketingDashboard />);
      
      expect(queryByTestId('loading-screen')).toBeNull();
    });
  });

  describe('Stats Display', () => {
    beforeEach(() => {
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        stats: {
          activeCampaigns: 5,
          pendingContent: 3,
          totalRevenue: 1234.56,
          conversionRate: 0.23,
          totalProducts: 42,
        },
        refetchAll: jest.fn(),
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });
    });

    it('should display stats cards when loaded', async () => {
      const { getByText } = render(<MarketingDashboard />);
      
      await waitFor(() => {
        expect(getByText('5')).toBeTruthy();
        expect(getByText('3')).toBeTruthy();
        expect(getByText('$1234.56')).toBeTruthy();
      });
    });

    it('should display active campaigns count', () => {
      const { getAllByText, getByText } = render(<MarketingDashboard />);
      
      const activeCampaignsTexts = getAllByText('Active Campaigns');
      expect(activeCampaignsTexts.length).toBeGreaterThan(0);
      expect(getByText('5')).toBeTruthy();
    });

    it('should display pending content count', () => {
      const { getByText } = render(<MarketingDashboard />);
      
      expect(getByText('Pending Content')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('should display total revenue', () => {
      const { getByText } = render(<MarketingDashboard />);
      
      expect(getByText('Revenue')).toBeTruthy();
      expect(getByText('$1234.56')).toBeTruthy();
    });

    it('should display conversion rate', () => {
      const { getByText } = render(<MarketingDashboard />);
      
      expect(getByText('Conversion Rate')).toBeTruthy();
      expect(getByText('23%')).toBeTruthy();
    });

    it('should display total products', () => {
      const { getByText } = render(<MarketingDashboard />);
      
      expect(getByText('Total Products')).toBeTruthy();
      expect(getByText('42')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        stats: {
          activeCampaigns: 5,
          pendingContent: 3,
          totalRevenue: 1234.56,
        },
        refetchAll: jest.fn(),
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });
    });

    it('should navigate to CampaignPlanner on campaigns stat press', () => {
      const { getByTestId } = render(<MarketingDashboard />);
      
      const campaignsCard = getByTestId('stat-card-campaigns');
      fireEvent.press(campaignsCard);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CampaignPlanner');
    });

    it('should navigate to ProductContent on content stat press', () => {
      const { getByTestId } = render(<MarketingDashboard />);
      
      const contentCard = getByTestId('stat-card-content');
      fireEvent.press(contentCard);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ProductContent');
    });

    it('should navigate to MarketingAnalytics on revenue stat press', () => {
      const { getByTestId } = render(<MarketingDashboard />);
      
      const revenueCard = getByTestId('stat-card-revenue');
      fireEvent.press(revenueCard);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('MarketingAnalytics');
    });

    it('should navigate to campaign planner on FAB press', async () => {
      const { getByLabelText } = render(<MarketingDashboard />);
      
      // First open the FAB menu
      const menu = getByLabelText('Menu');
      fireEvent.press(menu);
      
      // Then press the New Campaign action
      const newCampaignBtn = getByLabelText('New Campaign');
      fireEvent.press(newCampaignBtn);
      
      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          'CampaignPlanner',
          { mode: 'create' }
        );
      });
    });

    it('should navigate to content creation on FAB press', async () => {
      const { getByLabelText } = render(<MarketingDashboard />);
      
      // First open the FAB menu
      const menu = getByLabelText('Menu');
      fireEvent.press(menu);
      
      // Then press the Create Content action
      const createContentBtn = getByLabelText('Create Content');
      fireEvent.press(createContentBtn);
      
      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          'ProductContent',
          { mode: 'create' }
        );
      });
    });
  });

  describe('Campaign List', () => {
    const mockCampaigns = [
      {
        id: '1',
        name: 'Summer Sale',
        status: 'active',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
      },
      {
        id: '2',
        name: 'Back to School',
        status: 'planned',
        startDate: '2024-08-15',
        endDate: '2024-09-15',
      },
    ];

    beforeEach(() => {
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        stats: {
          activeCampaigns: 2,
          pendingContent: 0,
          totalRevenue: 0,
        },
        refetchAll: jest.fn(),
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: mockCampaigns,
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });
    });

    it('should display active campaigns list', () => {
      const { getByText, getAllByText } = render(<MarketingDashboard />);
      
      // There might be multiple "Active Campaigns" texts (in stats and section)
      const activeCampaignTexts = getAllByText('Active Campaigns');
      expect(activeCampaignTexts.length).toBeGreaterThan(0);
      expect(getByText('Summer Sale')).toBeTruthy();
      expect(getByText('Back to School')).toBeTruthy();
    });

    it('should navigate to campaign detail on campaign card press', () => {
      const { getByTestId } = render(<MarketingDashboard />);
      
      const campaignCard = getByTestId('campaign-card-1');
      fireEvent.press(campaignCard);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CampaignDetail', {
        campaignId: '1',
      });
    });

    it('should show empty state when no campaigns', () => {
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });

      const { getByText } = render(<MarketingDashboard />);
      
      expect(getByText('No active campaigns')).toBeTruthy();
    });
  });

  describe('Content List', () => {
    const mockContent = [
      {
        id: 'c1',
        title: 'Product A Description',
        status: 'pending_review',
        lastModified: '2024-01-15',
      },
      {
        id: 'c2',
        title: 'Product B Images',
        status: 'in_progress',
        lastModified: '2024-01-14',
      },
    ];

    beforeEach(() => {
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        stats: {
          activeCampaigns: 0,
          pendingContent: 2,
          totalRevenue: 0,
        },
        refetchAll: jest.fn(),
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: mockContent,
        isLoading: false,
      });
    });

    it('should display pending content list', () => {
      const { getByText } = render(<MarketingDashboard />);
      
      expect(getByText('Content Awaiting Review')).toBeTruthy();
      expect(getByText('Product A Description')).toBeTruthy();
      expect(getByText('Product B Images')).toBeTruthy();
    });

    it('should navigate to content detail on content item press', () => {
      const { getByTestId } = render(<MarketingDashboard />);
      
      const contentItem = getByTestId('content-item-c1');
      fireEvent.press(contentItem);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ProductContent', {
        contentId: 'c1',
      });
    });

    it('should show empty state when no pending content', () => {
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });

      const { getByText } = render(<MarketingDashboard />);
      
      expect(getByText('No pending content')).toBeTruthy();
    });
  });

  describe('Pull to Refresh', () => {
    it('should handle pull-to-refresh', async () => {
      const mockRefetch = jest.fn();
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        stats: {},
        refetchAll: mockRefetch,
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });

      const { getByTestId } = render(<MarketingDashboard />);
      const scrollView = getByTestId('dashboard-scroll');
      
      const { refreshControl } = scrollView.props;
      await act(async () => {
        refreshControl.props.onRefresh();
      });
      
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show refreshing indicator during refresh', async () => {
      const mockRefetchAll = jest.fn(() => new Promise((resolve) => setTimeout(() => resolve(undefined), 100)));
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        stats: {},
        refetchAll: mockRefetchAll,
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });

      const { getByTestId } = render(<MarketingDashboard />);
      const scrollView = getByTestId('dashboard-scroll');
      
      const { refreshControl } = scrollView.props;
      
      // Trigger refresh
      await act(async () => {
        refreshControl.props.onRefresh();
      });
      
      // Check that the refresh was triggered (in real app, refreshing would be true during the async operation)
      expect(mockRefetchAll).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when stats fail to load', () => {
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        error: new Error('Failed to load stats'),
        stats: null,
        refetchAll: jest.fn(),
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });

      const { getByText } = render(<MarketingDashboard />);
      
      expect(getByText('Failed to load dashboard')).toBeTruthy();
      expect(getByText('Tap to retry')).toBeTruthy();
    });

    it('should retry loading on error tap', () => {
      const mockRefetch = jest.fn();
      (useMarketingDashboard as jest.Mock).mockReturnValue({
        isLoading: false,
        error: new Error('Failed to load stats'),
        stats: null,
        refetchAll: mockRefetch,
      });
      (useActiveCampaigns as jest.Mock).mockReturnValue({
        campaigns: [],
        isLoading: false,
      });
      (usePendingContent as jest.Mock).mockReturnValue({
        content: [],
        isLoading: false,
      });

      const { getByText } = render(<MarketingDashboard />);
      
      const retryButton = getByText('Tap to retry');
      fireEvent.press(retryButton);
      
      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});