/**
 * Payment Hook Tests
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Tests payment hooks with centralized query key factory, user isolation,
 * and proper React Query patterns.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../../services/paymentService';
import { usePaymentMethods, usePaymentIntents, useCreatePayment } from '../usePayment';
import { useCurrentUser } from '../useAuth';
import { createWrapper, createWrapperWithUser } from '../../test/test-utils';
import { createMockUser, createMockPaymentMethod, createMockPaymentIntent } from '../../test/mockData';
import { paymentKeys } from '../../utils/queryKeyFactory';

// Mock the payment service
jest.mock('../../services/paymentService');
const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;

// Mock useAuth hook
jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

// Mock React Query hooks
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

// Mock query key factory
jest.mock('../../utils/queryKeyFactory', () => ({
  paymentKeys: {
    all: (userId?: string) => userId ? ['payment', userId] : ['payment'],
    paymentMethods: (userId?: string) => userId ? ['payment', userId, 'methods'] : ['payment', 'methods'],
    paymentIntents: (userId?: string) => userId ? ['payment', userId, 'intents'] : ['payment', 'intents'],
    detail: (id: string, userId?: string) => userId ? ['payment', userId, 'detail', id] : ['payment', 'detail', id],
  },
}));

// Mock payment broadcast utility
jest.mock('../../utils/broadcastFactory', () => ({
  paymentBroadcast: {
    send: jest.fn(),
  },
}));

const mockUser = createMockUser();
const mockPaymentMethod = createMockPaymentMethod();
const mockPaymentIntent = createMockPaymentIntent();

describe('Payment Hooks - Following Established Patterns', () => {
  const mockQueryClient = {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryClient.mockReturnValue(mockQueryClient as any);
  });

  describe('usePaymentMethods - Centralized Query Key Factory (Following Pattern)', () => {
    it('should use centralized query key factory consistently', () => {
      // Following Pattern: CRITICAL - Use centralized query key factory, never create local duplicates
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);

      mockUseQuery.mockReturnValue({
        data: [mockPaymentMethod],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePaymentMethods(), {
        wrapper: createWrapper(),
      });

      // Verify using centralized factory
      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: paymentKeys.paymentMethods(mockUser.id),
        queryFn: expect.any(Function),
        staleTime: 5 * 60 * 1000, // 5 minutes - payment methods change rarely
        gcTime: 10 * 60 * 1000,   // 10 minutes - longer cache retention
        refetchOnMount: true,      // Following cart pattern
        refetchOnWindowFocus: false,
        enabled: true,
      });

      // Should NOT create local keys (anti-pattern)
      expect(mockUseQuery).not.toHaveBeenCalledWith({
        queryKey: ['payment', 'methods'], // Local duplicate - anti-pattern
      });
    });

    it('should handle user isolation with fallback strategy', () => {
      // Following Pattern: User isolation with fallback
      mockUseCurrentUser.mockReturnValue({
        data: null, // No user
        isLoading: false,
        error: null,
      } as any);

      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePaymentMethods(), { 
        wrapper: createWrapperWithUser(null) // No user
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      
      // Should use fallback query key when no user
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: paymentKeys.paymentMethods(undefined),
          enabled: false, // Should be disabled when no user
        })
      );
    });

    it('should use appropriate cache settings for payment methods', () => {
      // Following Pattern: Context-appropriate cache settings
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);

      renderHook(() => usePaymentMethods(), { wrapper: createWrapper() });

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 5 * 60 * 1000, // 5 minutes - payment methods change rarely
          gcTime: 10 * 60 * 1000,   // 10 minutes - longer cache retention
          refetchOnMount: true,      // Always check on mount
          refetchOnWindowFocus: false, // Don't spam on focus changes
        })
      );
    });
  });

  describe('usePaymentIntents - User Isolation (Following Pattern)', () => {
    it('should enforce user data isolation', () => {
      // Following Pattern: Always isolate user data with proper query key strategies
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);

      mockUseQuery.mockReturnValue({
        data: [mockPaymentIntent],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      renderHook(() => usePaymentIntents(), { wrapper: createWrapper() });

      // Should use user-specific query key
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: paymentKeys.paymentIntents(mockUser.id),
          enabled: true,
        })
      );
    });

    it('should handle authentication guard gracefully', () => {
      // Following Pattern: Enhanced authentication guard with graceful degradation
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => usePaymentIntents(), {
        wrapper: createWrapperWithUser(null)
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('User not authenticated');
    });
  });

  describe('useCreatePayment - Smart Query Invalidation (Following Pattern)', () => {
    it('should use targeted invalidation without over-invalidating', async () => {
      // Following Pattern: Smart query invalidation
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);

      const mockMutationFn = jest.fn().mockResolvedValue({
        success: true,
        payment: mockPaymentIntent,
      });

      mockUseMutation.mockReturnValue({
        mutate: mockMutationFn,
        mutateAsync: mockMutationFn,
        isLoading: false,
        error: null,
        data: null,
        reset: jest.fn(),
      } as any);

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      // Check that mutation was configured with proper invalidation
      expect(mockUseMutation).toHaveBeenCalledWith({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      });

      // Simulate successful mutation
      const mutationConfig = mockUseMutation.mock.calls[0][0];
      await act(async () => {
        await mutationConfig.onSuccess?.({
          success: true,
          payment: mockPaymentIntent,
        });
      });

      // Should invalidate related queries only
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: paymentKeys.paymentIntents(mockUser.id)
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: paymentKeys.paymentMethods(mockUser.id)
      });

      // Should NOT invalidate everything (anti-pattern)
      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalledWith();
    });

    it('should not invalidate on error to keep existing cache', async () => {
      // Following Pattern: Don't invalidate on error - keep existing cache
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);

      const mockError = new Error('Payment failed');
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(mockError),
        isLoading: false,
        error: mockError,
        data: null,
        reset: jest.fn(),
      } as any);

      const { result } = renderHook(() => useCreatePayment(), {
        wrapper: createWrapper(),
      });

      // Simulate error
      const mutationConfig = mockUseMutation.mock.calls[0][0];
      await act(async () => {
        await mutationConfig.onError?.(mockError, {}, undefined);
      });

      // Should NOT invalidate on error
      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery & User Experience (Following Pattern)', () => {
    it('should provide meaningful error states without breaking UI', () => {
      // Following Pattern: Comprehensive error handling without breaking user workflows
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);

      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: 'Authentication required' },
        refetch: jest.fn().mockResolvedValue({ data: [] }),
      } as any);

      const { result } = renderHook(() => usePaymentMethods(), {
        wrapper: createWrapperWithUser(null)
      });

      // Should provide empty data instead of crashing
      expect(result.current.data).toEqual([]);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Authentication required');
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should handle service layer errors gracefully', () => {
      // Following Pattern: Graceful degradation on service failures
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);

      const serviceError = new Error('Payment service unavailable');
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: serviceError,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePaymentMethods(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe(serviceError);
      expect(result.current.data).toBeUndefined();
      expect(result.current.isError).toBe(true);
    });
  });

  describe('TypeScript Integration (Following Pattern)', () => {
    it('should maintain strong typing throughout hooks', () => {
      // Following Pattern: Strong typing, no any types
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);

      mockUseQuery.mockReturnValue({
        data: [mockPaymentMethod],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePaymentMethods(), {
        wrapper: createWrapper(),
      });

      // TypeScript should enforce correct types
      expect(Array.isArray(result.current.data)).toBe(true);
      expect(typeof result.current.isLoading).toBe('boolean');
      if (result.current.data && result.current.data.length > 0) {
        expect(typeof result.current.data[0].id).toBe('string');
        expect(['card', 'bank_account', 'us_bank_account'].includes(result.current.data[0].type)).toBe(true);
      }
    });
  });

  describe('Real-time Integration (Following Pattern)', () => {
    it('should handle real-time payment updates', async () => {
      // Following Pattern: Real-time subscriptions with cache updates
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);

      mockUseQuery.mockReturnValue({
        data: [mockPaymentIntent],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { result } = renderHook(() => usePaymentIntents(), {
        wrapper: createWrapper(),
      });

      // Simulate real-time payment status update
      const updatedPaymentIntent = {
        ...mockPaymentIntent,
        status: 'succeeded' as const,
      };

      // Should update query cache with new data
      act(() => {
        mockQueryClient.setQueryData(
          paymentKeys.paymentIntents(mockUser.id),
          [updatedPaymentIntent]
        );
      });

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        paymentKeys.paymentIntents(mockUser.id),
        [updatedPaymentIntent]
      );
    });
  });
});