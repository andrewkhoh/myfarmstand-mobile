import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Mock the screen (doesn't exist yet - RED phase)
const MarketingDashboard = jest.fn(() => null);
jest.mock('../MarketingDashboard', () => ({
  default: jest.fn(() => null)
}));

// Mock all hooks
jest.mock('@/hooks/marketing/useMarketingDashboard', () => ({
  useMarketingDashboard: jest.fn(() => ({
    campaigns: [
      { id: '1', name: 'Summer Sale', status: 'active', conversions: 245 },
      { id: '2', name: 'Back to School', status: 'draft', conversions: 0 },
      { id: '3', name: 'Holiday Special', status: 'scheduled', conversions: 0 }
    ],
    content: [
      { id: '1', title: 'Product Launch Blog', status: 'published', views: 1250 },
      { id: '2', title: 'How-to Guide', status: 'draft', views: 0 }
    ],
    bundles: [
      { id: '1', name: 'Starter Pack', products: 3, discount: 15 },
      { id: '2', name: 'Pro Bundle', products: 5, discount: 25 }
    ],
    metrics: {
      totalRevenue: 45000,
      totalConversions: 450,
      activeCustomers: 1200,
      engagementRate: 3.5
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn()
  }))
}));

jest.mock('@/hooks/marketing/useCampaignActions', () => ({
  useCampaignActions: jest.fn(() => ({
    activateCampaign: jest.fn(),
    pauseCampaign: jest.fn(),
    duplicateCampaign: jest.fn(),
    deleteCampaign: jest.fn()
  }))
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MarketingDashboard', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <MarketingDashboard {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };
  
  describe('Campaign Overview Section', () => {
    it('should display active campaigns count', async () => {
      const { getByText, getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Active Campaigns')).toBeTruthy();
        expect(getByText('1')).toBeTruthy(); // 1 active campaign
      });
    });
    
    it('should render campaign cards', async () => {
      const { getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        const campaignCards = getAllByTestId(/campaign-card-/);
        expect(campaignCards).toHaveLength(3);
      });
    });
    
    it('should display campaign status badges', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('status-badge-active')).toBeTruthy();
        expect(getByTestId('status-badge-draft')).toBeTruthy();
        expect(getByTestId('status-badge-scheduled')).toBeTruthy();
      });
    });
    
    it('should navigate to campaign details on card press', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const campaignCard = getByTestId('campaign-card-0');
        fireEvent.press(campaignCard);
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('CampaignDetails', { 
        campaignId: '1',
        campaignName: 'Summer Sale'
      });
    });
    
    it('should show quick actions menu on long press', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        const campaignCard = getByTestId('campaign-card-0');
        fireEvent.longPress(campaignCard);
      });
      
      expect(getByText('Pause Campaign')).toBeTruthy();
      expect(getByText('Duplicate')).toBeTruthy();
      expect(getByText('View Analytics')).toBeTruthy();
    });
    
    it('should handle campaign pause action', async () => {
      const { getByTestId, getByText } = renderScreen();
      const { pauseCampaign } = require('@/hooks/marketing/useCampaignActions').useCampaignActions();
      
      await waitFor(() => {
        const campaignCard = getByTestId('campaign-card-0');
        fireEvent.longPress(campaignCard);
      });
      
      fireEvent.press(getByText('Pause Campaign'));
      
      expect(pauseCampaign).toHaveBeenCalledWith('1');
    });
  });
  
  describe('Content Management Widget', () => {
    it('should display content statistics', async () => {
      const { getByText, getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Content Library')).toBeTruthy();
        expect(getByTestId('content-count')).toBeTruthy();
        expect(getByText('2 items')).toBeTruthy();
      });
    });
    
    it('should show recent content items', async () => {
      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Product Launch Blog')).toBeTruthy();
        expect(getByText('How-to Guide')).toBeTruthy();
      });
    });
    
    it('should navigate to content editor on item press', async () => {
      const { getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByText('Product Launch Blog'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('ProductContent', {
        contentId: '1',
        mode: 'edit'
      });
    });
    
    it('should show create content button', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const createButton = getByTestId('create-content-button');
        expect(createButton).toBeTruthy();
        fireEvent.press(createButton);
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('ProductContent', {
        mode: 'create'
      });
    });
    
    it('should display content status indicators', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('content-status-published')).toBeTruthy();
        expect(getByTestId('content-status-draft')).toBeTruthy();
      });
    });
  });
  
  describe('Bundle Management Section', () => {
    it('should display bundle cards', async () => {
      const { getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        const bundleCards = getAllByTestId(/bundle-card-/);
        expect(bundleCards).toHaveLength(2);
      });
    });
    
    it('should show bundle discount percentages', async () => {
      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('15% OFF')).toBeTruthy();
        expect(getByText('25% OFF')).toBeTruthy();
      });
    });
    
    it('should navigate to bundle editor', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('bundle-card-0'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('BundleManagement', {
        bundleId: '1'
      });
    });
    
    it('should show create bundle quick action', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const createBundleBtn = getByTestId('quick-action-create-bundle');
        fireEvent.press(createBundleBtn);
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('BundleManagement', {
        mode: 'create'
      });
    });
  });
  
  describe('Analytics Summary Widget', () => {
    it('should display key metrics', async () => {
      const { getByText, getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Analytics Overview')).toBeTruthy();
        expect(getByTestId('metric-revenue')).toBeTruthy();
        expect(getByTestId('metric-conversions')).toBeTruthy();
        expect(getByTestId('metric-customers')).toBeTruthy();
        expect(getByTestId('metric-engagement')).toBeTruthy();
      });
    });
    
    it('should format revenue correctly', async () => {
      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('$45,000')).toBeTruthy();
      });
    });
    
    it('should show metric trends', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('trend-arrow-up')).toBeTruthy();
        expect(getByTestId('trend-percentage')).toBeTruthy();
      });
    });
    
    it('should navigate to full analytics', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-analytics-button'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('MarketingAnalytics');
    });
  });
  
  describe('Quick Actions Bar', () => {
    it('should display all quick action buttons', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('quick-action-new-campaign')).toBeTruthy();
        expect(getByTestId('quick-action-create-content')).toBeTruthy();
        expect(getByTestId('quick-action-create-bundle')).toBeTruthy();
        expect(getByTestId('quick-action-view-calendar')).toBeTruthy();
      });
    });
    
    it('should navigate to campaign planner', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('quick-action-new-campaign'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('CampaignPlanner', {
        mode: 'create'
      });
    });
    
    it('should navigate to calendar view', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('quick-action-view-calendar'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('CampaignPlanner', {
        view: 'calendar'
      });
    });
  });
  
  describe('Pull to Refresh', () => {
    it('should handle pull to refresh gesture', async () => {
      const { getByTestId } = renderScreen();
      const { refetch } = require('@/hooks/marketing/useMarketingDashboard').useMarketingDashboard();
      
      await waitFor(() => {
        const scrollView = getByTestId('dashboard-scroll-view');
        fireEvent(scrollView, 'refresh');
      });
      
      expect(refetch).toHaveBeenCalled();
    });
    
    it('should show refresh indicator', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const scrollView = getByTestId('dashboard-scroll-view');
        fireEvent(scrollView, 'refresh');
        expect(getByTestId('refresh-indicator')).toBeTruthy();
      });
    });
  });
  
  describe('Loading States', () => {
    it('should display loading skeleton', async () => {
      require('@/hooks/marketing/useMarketingDashboard').useMarketingDashboard.mockReturnValue({
        isLoading: true,
        campaigns: [],
        content: [],
        bundles: [],
        metrics: {}
      });
      
      const { getByTestId } = renderScreen();
      
      expect(getByTestId('loading-skeleton')).toBeTruthy();
    });
    
    it('should show shimmer effect on cards', async () => {
      require('@/hooks/marketing/useMarketingDashboard').useMarketingDashboard.mockReturnValue({
        isLoading: true
      });
      
      const { getAllByTestId } = renderScreen();
      
      const shimmers = getAllByTestId('shimmer-placeholder');
      expect(shimmers.length).toBeGreaterThan(0);
    });
  });
  
  describe('Error States', () => {
    it('should display error message', async () => {
      require('@/hooks/marketing/useMarketingDashboard').useMarketingDashboard.mockReturnValue({
        isError: true,
        error: new Error('Failed to load dashboard data'),
        campaigns: [],
        content: [],
        bundles: [],
        metrics: {}
      });
      
      const { getByText } = renderScreen();
      
      expect(getByText('Failed to load dashboard data')).toBeTruthy();
    });
    
    it('should show retry button on error', async () => {
      require('@/hooks/marketing/useMarketingDashboard').useMarketingDashboard.mockReturnValue({
        isError: true,
        error: new Error('Network error'),
        refetch: jest.fn()
      });
      
      const { getByText } = renderScreen();
      const retryButton = getByText('Retry');
      
      fireEvent.press(retryButton);
      
      expect(require('@/hooks/marketing/useMarketingDashboard').useMarketingDashboard().refetch).toHaveBeenCalled();
    });
  });
  
  describe('Empty States', () => {
    it('should show empty state for campaigns', async () => {
      require('@/hooks/marketing/useMarketingDashboard').useMarketingDashboard.mockReturnValue({
        campaigns: [],
        content: [],
        bundles: [],
        metrics: {},
        isLoading: false
      });
      
      const { getByText } = renderScreen();
      
      expect(getByText('No campaigns yet')).toBeTruthy();
      expect(getByText('Create your first campaign')).toBeTruthy();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = renderScreen();
      
      await waitFor(() => {
        expect(getByLabelText('Marketing Dashboard')).toBeTruthy();
        expect(getByLabelText('Campaign Overview Section')).toBeTruthy();
        expect(getByLabelText('Content Management Section')).toBeTruthy();
        expect(getByLabelText('Analytics Summary')).toBeTruthy();
      });
    });
    
    it('should have accessibility hints for actions', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const campaignCard = getByTestId('campaign-card-0');
        expect(campaignCard.props.accessibilityHint).toBe('Tap to view campaign details, long press for more options');
      });
    });
    
    it('should announce screen changes', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('screen-announcement')).toHaveTextContent('Marketing Dashboard loaded');
      });
    });
    
    it('should support screen reader navigation', async () => {
      const { getByRole } = renderScreen();
      
      await waitFor(() => {
        expect(getByRole('header')).toBeTruthy();
        expect(getByRole('button')).toBeTruthy();
      });
    });
  });
});