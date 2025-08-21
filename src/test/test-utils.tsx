import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { User } from '../types';

export const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  
  return Wrapper;
};

export const createWrapperWithUser = (user: User | null) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  // Mock useCurrentUser to return the specified user
  jest.doMock('../hooks/useAuth', () => ({
    useCurrentUser: () => ({
      data: user,
      isLoading: false,
      error: null,
    }),
  }));
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  
  return Wrapper;
};