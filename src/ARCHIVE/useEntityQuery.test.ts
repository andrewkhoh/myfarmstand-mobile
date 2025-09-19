import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from '../../test/test-utils';
import { useEntityQuery } from '../useEntityQuery';
import { useCurrentUser } from '../useAuth';

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/queryKeyFactory', () => ({
  createQueryKeyFactory: () => ({
    all: (userId?: string) => ['entity', userId],
  }),
}));

jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn(),
  }),
}));


const mockUser = { id: 'user123', email: 'test@example.com', name: 'Test User', role: 'customer' as const };
const mockEntityConfig = {
  entity: 'auth' as const,
  isolation: 'user-specific' as const,
  target: 'user-specific' as const,
};
const mockGlobalEntityConfig = {
  entity: 'auth' as const,
  isolation: 'global' as const,
  target: 'global' as const,
};

describe('useEntityQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should fetch entity data successfully for user-specific entities', async () => {
      const mockData = { id: '1', name: 'Test Entity' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useEntityQuery(mockEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockQueryFn).toHaveBeenCalledWith('user123');
    });

    it('should handle query function errors', async () => {
      const mockQueryFn = jest.fn().mockRejectedValue(new Error('Query failed'));

      const { result } = renderHook(
        () => useEntityQuery(mockEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 10000 });

      expect((result.current.error as any)?.message).toBe('Query failed');
    });

    it('should work with global entities without user context', async () => {
      const mockData = { id: '1', name: 'Global Entity' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useEntityQuery(mockGlobalEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockQueryFn).toHaveBeenCalledWith('user123');
    });

    it('should handle empty query results', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue(null);

      const { result } = renderHook(
        () => useEntityQuery(mockEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should provide proper loading states', () => {
      const mockQueryFn = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(
        () => useEntityQuery(mockEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPending).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });

    it('should respect custom options', async () => {
      const mockData = { id: '1', name: 'Test Entity' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);
      const customOptions = {
        staleTime: 5000,
        enabled: false, // This should disable the query
      };

      const { result } = renderHook(
        () => useEntityQuery(mockEntityConfig, mockQueryFn, customOptions),
        { wrapper: createWrapper() }
      );

      // Query should be disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockQueryFn).not.toHaveBeenCalled();
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should return authentication error for user-specific entities', () => {
      const mockQueryFn = jest.fn();

      const { result } = renderHook(
        () => useEntityQuery(mockEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isError).toBe(true);
      expect((result.current.error as any)?.code).toBe('AUTHENTICATION_REQUIRED');
      expect((result.current.error as any)?.entityType).toBe('auth');
      expect(result.current.isLoading).toBe(false);
      expect(mockQueryFn).not.toHaveBeenCalled();
    });

    it('should still work for global entities when not authenticated', async () => {
      const mockData = { id: '1', name: 'Global Entity' };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useEntityQuery(mockGlobalEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockQueryFn).toHaveBeenCalledWith(undefined);
    });

    it('should provide proper error states for user-specific entities', () => {
      const mockQueryFn = jest.fn();

      const { result } = renderHook(
        () => useEntityQuery(mockEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      expect(result.current.status).toBe('error');
      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isLoadingError).toBe(false);
      expect(result.current.isRefetchError).toBe(false);
    });

    it('should provide a safe refetch function that returns error', async () => {
      const mockQueryFn = jest.fn();

      const { result } = renderHook(
        () => useEntityQuery(mockEntityConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      const refetchResult = await result.current.refetch();
      
      expect(refetchResult.error).toBeDefined();
      expect(refetchResult.data).toBeUndefined();
      expect(mockQueryFn).not.toHaveBeenCalled();
    });
  });

  describe('configuration handling', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should handle different entity types', async () => {
      const cartConfig = {
        entity: 'cart' as const,
        isolation: 'user-specific' as const,
        target: 'user-specific' as const,
      };
      const mockData = { items: [], total: 0 };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useEntityQuery(cartConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('should handle different isolation levels', async () => {
      const publicConfig = {
        entity: 'auth' as const,
        isolation: 'public' as const,
        target: 'global' as const,
      };
      const mockData = { publicData: true };
      const mockQueryFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useEntityQuery(publicConfig, mockQueryFn),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
    });
  });
});