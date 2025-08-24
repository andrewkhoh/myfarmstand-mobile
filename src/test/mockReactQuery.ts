/**
 * Centralized React Query Mock Configuration
 * Provides consistent React Query mocking across all hook tests
 */

// Dynamic React Query mock that can be customized per test
export const createReactQueryMock = (overrides?: any) => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: overrides?.data || null,
    isLoading: overrides?.isLoading || false,
    error: overrides?.error || null,
    refetch: jest.fn(),
    ...overrides?.query,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
    data: null,
    ...overrides?.mutation,
  })),
  useInfiniteQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    ...overrides?.infiniteQuery,
  })),
});

// Default React Query mock for most tests
export const defaultReactQueryMock = createReactQueryMock();