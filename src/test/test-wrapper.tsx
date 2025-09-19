/**
 * Test Wrapper Component - Provides all necessary context for tests
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a test query client with no retries and immediate garbage collection
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

interface TestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  queryClient = createTestQueryClient()
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Wrapper factory for renderHook
export const createWrapper = (queryClient?: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <TestWrapper queryClient={queryClient}>
      {children}
    </TestWrapper>
  );
};