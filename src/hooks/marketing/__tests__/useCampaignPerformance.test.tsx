import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCampaignPerformance } from '../useCampaignPerformance';
import { campaignService, realtimeService } from '@/services/marketing';
import { marketingKeys } from '@/utils/queryKeys';

// Mock the services
jest.mock('@/services/marketing');

describe('useCampaignPerformance', () => {
  let queryClient: QueryClient;
  let unsubscribeSpy: jest.Mock;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    unsubscribeSpy = jest.fn();
    (realtimeService.subscribe as jest.Mock).mockReturnValue(unsubscribeSpy);
    
    // Setup default mock for campaign performance
    (campaignService.getPerformance as jest.Mock).mockResolvedValue({
      campaignId: 'campaign-1',
      metrics: {
        impressions: 150000,
        clicks: 3000,
        conversions: 150,
        ctr: 2.0,
        conversionRate: 5.0,
        cpc: 1.5,
        cpa: 30,
      },
      timeline: [
        {
          timestamp: new Date('2024-06-01'),
          impressions: 50000,
          clicks: 1000,
          conversions: 50,
        },
      ],
    });
    
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('performance data fetching', () => {
    it('should fetch campaign performance data', async () => {
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });
      
      expect(result.current.performance?.campaignId).toBe('campaign-1');
      expect(result.current.metrics).toBeDefined();
      expect(result.current.timeline).toBeDefined();
    });
    
    it('should handle fetch errors gracefully', async () => {
      jest.spyOn(campaignService, 'getPerformance')
        .mockRejectedValueOnce(new Error('Campaign not found'));
      
      const { result } = renderHook(
        () => useCampaignPerformance('invalid-campaign'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBeDefined();
      expect((result.current.error as Error)?.message).toBe('Campaign not found');
      expect(result.current.performance).toBeUndefined();
    });
    
    it('should refetch performance data', async () => {
      const getPerformanceSpy = jest.spyOn(campaignService, 'getPerformance');
      
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });
      
      expect(getPerformanceSpy).toHaveBeenCalledTimes(1);
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(getPerformanceSpy).toHaveBeenCalledTimes(2);
    });
    
    it('should support custom refetch intervals', async () => {
      jest.useFakeTimers();
      const getPerformanceSpy = jest.spyOn(campaignService, 'getPerformance');
      
      renderHook(
        () => useCampaignPerformance('campaign-1', { refetchInterval: 5000 }),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(getPerformanceSpy).toHaveBeenCalledTimes(1);
      });
      
      // Advance time to trigger refetch
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(getPerformanceSpy).toHaveBeenCalledTimes(2);
      });
      
      jest.useRealTimers();
    });
  });
  
  describe('realtime updates', () => {
    it('should subscribe to realtime updates by default', async () => {
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });
      
      expect(realtimeService.subscribe).toHaveBeenCalledWith(
        'campaign:campaign-1:metrics',
        expect.any(Function)
      );
      
      expect(result.current.isRealtimeEnabled).toBe(true);
    });
    
    it('should process realtime metric updates', async () => {
      let capturedCallback: ((update: any) => void) | null = null;
      
      jest.spyOn(realtimeService, 'subscribe').mockImplementation((channel, callback) => {
        capturedCallback = callback;
        return unsubscribeSpy;
      });
      
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });
      
      const initialImpressions = result.current.metrics?.impressions || 0;
      
      // Simulate realtime update
      act(() => {
        capturedCallback?.({
          impressions: 100,
          clicks: 10,
          conversions: 1,
          timestamp: new Date(),
        });
      });
      
      await waitFor(() => {
        expect(result.current.metrics?.impressions).toBe(initialImpressions + 100);
      });
      
      expect(result.current.realtimeUpdates).toHaveLength(1);
    });
    
    it('should accumulate multiple realtime updates', async () => {
      let capturedCallback: ((update: any) => void) | null = null;
      
      jest.spyOn(realtimeService, 'subscribe').mockImplementation((channel, callback) => {
        capturedCallback = callback;
        return unsubscribeSpy;
      });
      
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });
      
      // Send multiple updates
      act(() => {
        capturedCallback?.({
          impressions: 50,
          clicks: 5,
          conversions: 0,
          timestamp: new Date(),
        });
        
        capturedCallback?.({
          impressions: 75,
          clicks: 8,
          conversions: 1,
          timestamp: new Date(),
        });
      });
      
      await waitFor(() => {
        expect(result.current.realtimeUpdates).toHaveLength(2);
      });
    });
    
    it('should update CTR and conversion rate in realtime', async () => {
      let capturedCallback: ((update: any) => void) | null = null;
      
      jest.spyOn(realtimeService, 'subscribe').mockImplementation((channel, callback) => {
        capturedCallback = callback;
        return unsubscribeSpy;
      });
      
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });
      
      const initialCtr = result.current.metrics?.ctr || 0;
      
      act(() => {
        capturedCallback?.({
          impressions: 1000,
          clicks: 50,
          conversions: 5,
          timestamp: new Date(),
        });
      });
      
      await waitFor(() => {
        expect(result.current.metrics?.ctr).not.toBe(initialCtr);
      });
      
      // CTR should be recalculated
      expect(result.current.metrics?.ctr).toBeGreaterThan(0);
      expect(result.current.metrics?.conversionRate).toBeGreaterThan(0);
    });
    
    it('should limit timeline entries to last 50', async () => {
      let capturedCallback: ((update: any) => void) | null = null;
      
      jest.spyOn(realtimeService, 'subscribe').mockImplementation((channel, callback) => {
        capturedCallback = callback;
        return unsubscribeSpy;
      });
      
      // Mock initial data with 45 timeline entries
      const mockTimeline = Array.from({ length: 45 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000),
        impressions: 100,
        clicks: 10,
        conversions: 1,
      }));
      
      jest.spyOn(campaignService, 'getPerformance').mockResolvedValue({
        campaignId: 'campaign-1',
        metrics: {
          impressions: 1000,
          clicks: 100,
          conversions: 10,
          ctr: 10,
          conversionRate: 10,
          cpc: 1,
          cpa: 10,
        },
        timeline: mockTimeline,
      });
      
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.timeline).toHaveLength(45);
      });
      
      // Add 10 more updates
      act(() => {
        for (let i = 0; i < 10; i++) {
          capturedCallback?.({
            impressions: 50,
            clicks: 5,
            conversions: 0,
            timestamp: new Date(),
          });
        }
      });
      
      await waitFor(() => {
        expect(result.current.timeline).toHaveLength(50);
      });
    });
    
    it('should disable realtime when option is false', async () => {
      renderHook(
        () => useCampaignPerformance('campaign-1', { enableRealtime: false }),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(realtimeService.subscribe).not.toHaveBeenCalled();
      });
    });
    
    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(realtimeService.subscribe).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(unsubscribeSpy).toHaveBeenCalled();
    });
    
    it('should clear realtime updates on refetch', async () => {
      let capturedCallback: ((update: any) => void) | null = null;
      
      jest.spyOn(realtimeService, 'subscribe').mockImplementation((channel, callback) => {
        capturedCallback = callback;
        return unsubscribeSpy;
      });
      
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });
      
      // Add realtime update
      act(() => {
        capturedCallback?.({
          impressions: 100,
          clicks: 10,
          conversions: 1,
          timestamp: new Date(),
        });
      });
      
      expect(result.current.realtimeUpdates).toHaveLength(1);
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(result.current.realtimeUpdates).toHaveLength(0);
    });
    
    it('should manually clear realtime updates', async () => {
      let capturedCallback: ((update: any) => void) | null = null;
      
      jest.spyOn(realtimeService, 'subscribe').mockImplementation((channel, callback) => {
        capturedCallback = callback;
        return unsubscribeSpy;
      });
      
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );
      
      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });
      
      // Add realtime update
      act(() => {
        capturedCallback?.({
          impressions: 100,
          clicks: 10,
          conversions: 1,
          timestamp: new Date(),
        });
      });
      
      expect(result.current.realtimeUpdates).toHaveLength(1);
      
      act(() => {
        result.current.clearRealtimeUpdates();
      });
      
      expect(result.current.realtimeUpdates).toHaveLength(0);
    });
  });
});