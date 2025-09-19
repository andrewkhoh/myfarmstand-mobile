import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePendingContent } from '../usePendingContent';
import { analyticsService } from '@/services/marketing';

// Mock the services
jest.mock('@/services/marketing');

describe('usePendingContent', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
    
    // Setup default mocks
    (analyticsService.getPendingContent as jest.Mock).mockResolvedValue([
      {
        id: 'pending-1',
        title: 'New Product Announcement',
        description: 'Upcoming product launch content',
        workflowState: 'review',
        createdAt: new Date('2024-01-10'),
        lastModified: new Date('2024-01-15'),
        author: 'Marketing Team',
      },
      {
        id: 'pending-2',
        title: 'Holiday Campaign Content',
        description: 'Holiday season marketing materials',
        workflowState: 'draft',
        createdAt: new Date('2024-01-12'),
        lastModified: new Date('2024-01-14'),
        author: 'Content Team',
      },
    ]);
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('should fetch pending content', async () => {
    const { result } = renderHook(() => usePendingContent(), { wrapper });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    
    expect(result.current?.data?.length).toBe(2);
    expect(result.current.data?.[0].workflowState).toBe('review');
  });
  
  it('should handle errors', async () => {
    const errorMessage = 'Failed to fetch';
    jest.spyOn(analyticsService, 'getPendingContent')
      .mockRejectedValueOnce(new Error(errorMessage));
    
    const { result } = renderHook(() => usePendingContent(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    
    expect(result.current.error).toBeDefined();
    expect((result.current.error as Error)?.message).toBe(errorMessage);
  });
  
  it('should refetch pending content', async () => {
    const spy = jest.spyOn(analyticsService, 'getPendingContent');
    
    const { result } = renderHook(() => usePendingContent(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    
    expect(spy).toHaveBeenCalledTimes(1);
    
    await result.current.refetch();
    
    expect(spy).toHaveBeenCalledTimes(2);
  });
  
  it('should return empty array when no pending content', async () => {
    jest.spyOn(analyticsService, 'getPendingContent').mockResolvedValueOnce([]);
    
    const { result } = renderHook(() => usePendingContent(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toEqual([]);
  });
  
  it('should use stale time correctly', async () => {
    const spy = jest.spyOn(analyticsService, 'getPendingContent');
    
    const { result, rerender } = renderHook(() => usePendingContent(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    
    expect(spy).toHaveBeenCalledTimes(1);
    
    // Immediate rerender should use cached data
    rerender();
    
    expect(spy).toHaveBeenCalledTimes(1);
  });
});