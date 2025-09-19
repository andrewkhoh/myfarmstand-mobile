import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useContentWorkflow, 
  useContentUpload,
  useCampaignPerformance,
  useMarketingAnalytics,
  useMarketingDashboard,
  useActiveCampaigns,
  usePendingContent
} from '../index';

// Mock the services
jest.mock('@/services/marketing');

import { analyticsService, campaignService, contentWorkflowService, realtimeService } from '@/services/marketing';

describe('Marketing Hooks - Integration Tests', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    
    // Setup default mocks
    (contentWorkflowService.getContent as jest.Mock).mockResolvedValue({
      id: 'content-1',
      workflowState: 'draft',
      lastModified: new Date('2024-01-15'),
    });
    
    (analyticsService.getMarketingAnalytics as jest.Mock).mockResolvedValue({
      revenue: 125000,
      totalCampaigns: 15,
      activeCampaigns: 3,
      totalContent: 150,
      publishedContent: 85,
      engagement: {
        totalImpressions: 1500000,
        totalClicks: 30000,
        averageCtr: 2.0,
      },
      topPerformingCampaigns: [],
      contentPerformance: [],
    });
    
    (campaignService.getActiveCampaigns as jest.Mock).mockResolvedValue([]);
    (analyticsService.getPendingContent as jest.Mock).mockResolvedValue([]);
    (campaignService.getPerformance as jest.Mock).mockResolvedValue({
      campaignId: 'campaign-1',
      metrics: {},
    });
    (contentWorkflowService.validateTransition as jest.Mock).mockResolvedValue(true);
    (contentWorkflowService.transitionTo as jest.Mock).mockResolvedValue({});
    (uploadService.uploadFile as jest.Mock).mockResolvedValue({});
    (realtimeService.subscribe as jest.Mock).mockReturnValue(jest.fn());
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('Hook Exports', () => {
    it('should export useContentWorkflow', () => {
      expect(useContentWorkflow).toBeDefined();
      expect(typeof useContentWorkflow).toBe('function');
    });
    
    it('should export useContentUpload', () => {
      expect(useContentUpload).toBeDefined();
      expect(typeof useContentUpload).toBe('function');
    });
    
    it('should export useCampaignPerformance', () => {
      expect(useCampaignPerformance).toBeDefined();
      expect(typeof useCampaignPerformance).toBe('function');
    });
    
    it('should export useMarketingAnalytics', () => {
      expect(useMarketingAnalytics).toBeDefined();
      expect(typeof useMarketingAnalytics).toBe('function');
    });
    
    it('should export useMarketingDashboard', () => {
      expect(useMarketingDashboard).toBeDefined();
      expect(typeof useMarketingDashboard).toBe('function');
    });
    
    it('should export useActiveCampaigns', () => {
      expect(useActiveCampaigns).toBeDefined();
      expect(typeof useActiveCampaigns).toBe('function');
    });
    
    it('should export usePendingContent', () => {
      expect(usePendingContent).toBeDefined();
      expect(typeof usePendingContent).toBe('function');
    });
  });
  
  describe('Basic Hook Functionality', () => {
    it('useContentWorkflow should return expected properties', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      expect(result.current).toHaveProperty('content');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('transitionTo');
      expect(result.current).toHaveProperty('isTransitioning');
      expect(result.current).toHaveProperty('canTransitionTo');
      expect(result.current).toHaveProperty('availableTransitions');
    });
    
    it('useContentUpload should return expected properties', () => {
      const { result } = renderHook(
        () => useContentUpload('content-1'),
        { wrapper }
      );
      
      expect(result.current).toHaveProperty('upload');
      expect(result.current).toHaveProperty('uploadAsync');
      expect(result.current).toHaveProperty('isUploading');
      expect(result.current).toHaveProperty('uploadProgress');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('reset');
      expect(result.current).toHaveProperty('resetProgress');
      expect(result.current).toHaveProperty('cancelUpload');
      expect(result.current).toHaveProperty('uploadedFile');
    });
    
    it('useCampaignPerformance should return expected properties', () => {
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      expect(result.current).toHaveProperty('performance');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('realtimeUpdates');
      expect(result.current).toHaveProperty('clearRealtimeUpdates');
      expect(result.current).toHaveProperty('isRealtimeEnabled');
      expect(result.current).toHaveProperty('metrics');
      expect(result.current).toHaveProperty('timeline');
    });
    
    it('useMarketingAnalytics should return expected properties', () => {
      const { result } = renderHook(
        () => useMarketingAnalytics(),
        { wrapper }
      );
      
      expect(result.current).toHaveProperty('analytics');
      expect(result.current).toHaveProperty('activeCampaigns');
      expect(result.current).toHaveProperty('pendingContent');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('aggregatedMetrics');
      expect(result.current).toHaveProperty('performanceTrends');
      expect(result.current).toHaveProperty('contentMetrics');
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('refetchAll');
    });
    
    it('useMarketingDashboard should return expected properties', () => {
      const { result } = renderHook(
        () => useMarketingDashboard(),
        { wrapper }
      );
      
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('performanceTrends');
      expect(result.current).toHaveProperty('topCampaignPerformance');
      expect(result.current).toHaveProperty('activeCampaigns');
      expect(result.current).toHaveProperty('pendingContent');
      expect(result.current).toHaveProperty('topPerformingCampaigns');
      expect(result.current).toHaveProperty('contentPerformance');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('refetchAll');
    });
  });
  
  describe('Hook Initial States', () => {
    it('hooks should have correct initial loading states', () => {
      const contentWorkflowHook = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      expect(contentWorkflowHook.result.current.isLoading).toBe(true);
      
      const uploadHook = renderHook(
        () => useContentUpload('content-1'),
        { wrapper }
      );
      expect(uploadHook.result.current.isUploading).toBe(false);
      expect(uploadHook.result.current.uploadProgress).toBe(0);
      
      const campaignHook = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      expect(campaignHook.result.current.isLoading).toBe(true);
      
      const analyticsHook = renderHook(
        () => useMarketingAnalytics(),
        { wrapper }
      );
      expect(analyticsHook.result.current.isLoading).toBe(true);
    });
    
    it('hooks should have null/undefined initial data', () => {
      const contentWorkflowHook = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      expect(contentWorkflowHook.result.current.content).toBeUndefined();
      
      const uploadHook = renderHook(
        () => useContentUpload('content-1'),
        { wrapper }
      );
      expect(uploadHook.result.current.uploadedFile).toBeUndefined();
      
      const campaignHook = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      expect(campaignHook.result.current.performance).toBeUndefined();
      
      const analyticsHook = renderHook(
        () => useMarketingAnalytics(),
        { wrapper }
      );
      expect(analyticsHook.result.current.analytics).toBeUndefined();
    });
  });
  
  describe('Hook Type Safety', () => {
    it('should accept valid parameters', () => {
      expect(() => {
        renderHook(
          () => useContentWorkflow('content-1', { role: 'admin' }),
          { wrapper }
        );
      }).not.toThrow();
      
      expect(() => {
        renderHook(
          () => useCampaignPerformance('campaign-1', { 
            enableRealtime: false,
            refetchInterval: 5000 
          }),
          { wrapper }
        );
      }).not.toThrow();
      
      expect(() => {
        renderHook(
          () => useMarketingAnalytics({ 
            includeHistorical: true,
            refreshInterval: 30000
          }),
          { wrapper }
        );
      }).not.toThrow();
    });
  });
  
  describe('Hook Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      expect(() => unmount()).not.toThrow();
    });
    
    it('should cleanup multiple hooks on unmount', () => {
      const hook1 = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      const hook2 = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      const hook3 = renderHook(
        () => useMarketingAnalytics(),
        { wrapper }
      );
      
      expect(() => {
        hook1.unmount();
        hook2.unmount();
        hook3.unmount();
      }).not.toThrow();
    });
  });
});