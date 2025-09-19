// Business Insights Hook Integration Tests - Using Real React Query
// This tests the actual hook behavior without mocking React Query

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBusinessInsights } from '../useBusinessInsights';
import { SimpleBusinessInsightsService } from '../../../services/executive/simpleBusinessInsightsService';
import { BusinessIntelligenceService } from '../../../services/executive/businessIntelligenceService';

// Mock only the services, not React Query
jest.mock('../../../services/executive/businessIntelligenceService');
jest.mock('../../../services/executive/simpleBusinessInsightsService');

// Mock realtimeService
jest.mock('../../../services/realtimeService', () => ({
  realtimeService: {
    subscribe: jest.fn(() => jest.fn()),
  }
}));

// Mock the user role hook
jest.mock('../../../hooks/role-based/useUserRole', () => ({
  useUserRole: jest.fn(() => ({
    role: 'executive',
    hasPermission: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock useAuth hook
jest.mock('../../useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 'test-user-123' } })
}));

describe('useBusinessInsights Integration Tests', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
        mutations: { retry: false }
      }
    });
    
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('Circuit Breaker Functionality', () => {
    it('should implement circuit breaker for repeated failures', async () => {
      let failureCount = 0;
      
      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockImplementation(() => {
        failureCount++;
        return Promise.reject(new Error('Service unavailable'));
      });

      const { result } = renderHook(
        () => useBusinessInsights({ 
          circuitBreakerEnabled: true,
          useFallback: false // Disable fallback to see error state
        }),
        { wrapper: createWrapper() }
      );

      // Wait for initial query to fail
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First failure
      expect(result.current.isError).toBe(true);
      expect(failureCount).toBe(1);
      
      // Trigger second failure
      await act(async () => {
        try {
          await result.current.refetch();
        } catch (e) {
          // Expected to fail
        }
      });
      
      expect(failureCount).toBe(2);
      
      // Trigger third failure to open circuit
      await act(async () => {
        try {
          await result.current.refetch();
        } catch (e) {
          // Expected to fail
        }
      });
      
      expect(failureCount).toBe(3);
      
      // Circuit should now be open
      await waitFor(() => {
        expect(result.current.circuitState).toBe('open');
      });
      
      expect(result.current.nextRetryAt).toBeDefined();
      expect(result.current.isError).toBe(true);
      
      // Additional refetch attempts should not call the service (circuit is open)
      const previousFailureCount = failureCount;
      await act(async () => {
        try {
          await result.current.refetch();
        } catch (e) {
          // Expected to fail
        }
      });
      
      // Service should not have been called again
      expect(failureCount).toBe(previousFailureCount);
    });

    it('should reset circuit breaker on successful request', async () => {
      let callCount = 0;
      const mockInsights = {
        insights: [{ id: '1', insightType: 'trend', confidenceScore: 0.8 }],
        metadata: { totalInsights: 1 }
      };

      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Service unavailable'));
        }
        return Promise.resolve(mockInsights);
      });

      const { result } = renderHook(
        () => useBusinessInsights({ 
          circuitBreakerEnabled: true,
          useFallback: false
        }),
        { wrapper: createWrapper() }
      );

      // Wait for initial failure
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Second failure
      await act(async () => {
        try {
          await result.current.refetch();
        } catch (e) {}
      });

      // Third attempt should succeed and reset circuit
      const refetchResult = await act(async () => {
        return result.current.refetch();
      });

      // Check that the refetch succeeded
      expect(refetchResult.status).toBe('success');
      
      // Wait for the hook to reflect the success state
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      }, { timeout: 5000 });

      expect(result.current.circuitState).toBe('closed');
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Fallback Data Functionality', () => {
    it('should provide fallback insights during outages', async () => {
      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockRejectedValue(
        new Error('Service outage')
      );

      const { result } = renderHook(
        () => useBusinessInsights({ 
          useFallback: true
        }),
        { wrapper: createWrapper() }
      );

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have fallback data instead of error
      expect(result.current.isError).toBe(false);
      expect(result.current.isUsingFallback).toBe(true);
      
      // Check fallback data structure
      expect(result.current.data).toEqual(expect.objectContaining({
        insights: expect.arrayContaining([
          expect.objectContaining({
            id: 'fallback-1',
            insightType: 'trend',
            description: expect.stringContaining('temporarily unavailable')
          })
        ]),
        metadata: expect.objectContaining({ 
          isFallback: true 
        })
      }));
    });

    it('should not use fallback when explicitly disabled', async () => {
      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const { result } = renderHook(
        () => useBusinessInsights({ 
          useFallback: false
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should show error state, not fallback
      expect(result.current.isError).toBe(true);
      expect(result.current.isUsingFallback).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate related insights when requested', async () => {
      const mockInsights = {
        insights: [{ id: '1', affectedAreas: ['inventory'] }],
        metadata: {}
      };
      
      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockResolvedValue(mockInsights);

      const { result } = renderHook(
        () => useBusinessInsights({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 5000 });

      // Use the actual queryClient from the hook
      const invalidateSpy = jest.fn();
      queryClient.invalidateQueries = invalidateSpy;

      await act(async () => {
        await result.current.invalidateRelatedInsights(['inventory', 'marketing']);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['executive', 'businessInsights'],
        predicate: expect.any(Function)
      });
    });
  });

  describe('Prefetching', () => {
    it('should prefetch predictive insights when requested', async () => {
      const mockInsights = {
        insights: [],
        metadata: {}
      };
      
      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockResolvedValue(mockInsights);

      // Create the wrapper and queryClient first
      const wrapper = createWrapper();
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

      const { result } = renderHook(
        () => useBusinessInsights({ 
          prefetchPredictive: true 
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Wait for useEffect to trigger prefetch
      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith({
          queryKey: ['executive', 'businessInsights', 'predictive'],
          queryFn: expect.any(Function)
        });
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to real-time updates when enabled', async () => {
      const mockInsights = {
        insights: [],
        metadata: {}
      };
      
      (SimpleBusinessInsightsService.getInsights as jest.Mock).mockResolvedValue(mockInsights);

      // Mock realtimeService
      const mockSubscribe = jest.fn(() => jest.fn());
      jest.mock('../../../services/realtimeService', () => ({
        realtimeService: {
          subscribe: mockSubscribe
        }
      }));

      const { result, unmount } = renderHook(
        () => useBusinessInsights({ 
          realtime: true 
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that real-time subscription is set up
      expect(result.current.isRealtime).toBe(true);

      // Clean up should unsubscribe
      unmount();
    });
  });
});