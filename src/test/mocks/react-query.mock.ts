/**
 * Common React Query Mock Setup
 * 
 * Provides consistent mocking for @tanstack/react-query across all tests.
 * This ensures all hooks that use React Query have proper mock implementations.
 */

import { jest } from '@jest/globals';

// Mock React Query hooks before they're imported
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
  useInfiniteQuery: jest.fn(),
  useQueries: jest.fn(),
  QueryClient: jest.fn().mockImplementation(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    cancelQueries: jest.fn(),
    refetchQueries: jest.fn(),
    removeQueries: jest.fn(),
    resetQueries: jest.fn(),
    clear: jest.fn(),
  })),
  QueryClientProvider: ({ children }: any) => children,
}));

// Export typed mocks for use in tests
export const setupReactQueryMocks = () => {
  const mockQueryClient = {
    invalidateQueries: jest.fn().mockResolvedValue(undefined),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    cancelQueries: jest.fn().mockResolvedValue(undefined),
    refetchQueries: jest.fn().mockResolvedValue(undefined),
    removeQueries: jest.fn(),
    resetQueries: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
  };

  const mockUseQuery = jest.fn().mockReturnValue({
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    refetch: jest.fn(),
    status: 'success',
  });

  const mockUseMutation = jest.fn().mockReturnValue({
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    isError: false,
    isSuccess: false,
    isPending: false,
    error: null,
    data: undefined,
    reset: jest.fn(),
    status: 'idle',
  });

  const mockUseQueryClient = jest.fn().mockReturnValue(mockQueryClient);

  const mockUseInfiniteQuery = jest.fn().mockReturnValue({
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    refetch: jest.fn(),
    status: 'success',
  });

  const mockUseQueries = jest.fn().mockReturnValue([]);

  // Apply mocks to the actual modules
  const reactQuery = require('@tanstack/react-query');
  Object.assign(reactQuery, {
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
    useQueryClient: mockUseQueryClient,
    useInfiniteQuery: mockUseInfiniteQuery,
    useQueries: mockUseQueries,
  });

  return {
    mockQueryClient,
    mockUseQuery,
    mockUseMutation,
    mockUseQueryClient,
    mockUseInfiniteQuery,
    mockUseQueries,
  };
};

// Auto-setup for tests
export const reactQueryMocks = setupReactQueryMocks();