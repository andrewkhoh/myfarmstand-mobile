import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
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
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  };
}

export const mockFile = (name: string, size: number = 1024, type: string = 'image/png') => {
  const file = new File(['x'.repeat(size)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

export const waitForNextUpdate = async (ms: number = 100) => {
  await new Promise(resolve => setTimeout(resolve, ms));
};