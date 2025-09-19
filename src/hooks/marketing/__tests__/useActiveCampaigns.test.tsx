import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActiveCampaigns } from '../useActiveCampaigns';
import { campaignService } from '@/services/marketing';

// Mock the services
jest.mock('@/services/marketing');

describe('useActiveCampaigns', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
    
    // Setup default mocks
    (campaignService.getActiveCampaigns as jest.Mock).mockResolvedValue([
      {
        id: 'campaign-1',
        name: 'Summer Sale 2024',
        status: 'active',
        budget: 10000,
        spent: 4500,
        impressions: 150000,
        clicks: 3000,
        conversions: 150,
        roi: 2.5,
      },
      {
        id: 'campaign-2',
        name: 'Product Launch',
        status: 'active',
        budget: 25000,
        spent: 8000,
        impressions: 250000,
        clicks: 5000,
        conversions: 300,
        roi: 3.2,
      },
    ]);
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('should fetch active campaigns', async () => {
    const { result } = renderHook(() => useActiveCampaigns(), { wrapper });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    
    expect(result.current?.data?.length).toBe(2);
    expect(result.current.data?.[0].status).toBe('active');
  });
  
  it('should handle errors', async () => {
    const errorMessage = 'Network error';
    jest.spyOn(campaignService, 'getActiveCampaigns')
      .mockRejectedValueOnce(new Error(errorMessage));
    
    const { result } = renderHook(() => useActiveCampaigns(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    
    expect(result.current.error).toBeDefined();
    expect((result.current.error as Error)?.message).toBe(errorMessage);
  });
  
  it('should use correct cache time', async () => {
    const spy = jest.spyOn(campaignService, 'getActiveCampaigns');
    
    const { result, rerender } = renderHook(() => useActiveCampaigns(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    
    expect(spy).toHaveBeenCalledTimes(1);
    
    // Rerender should use cached data
    rerender();
    
    expect(spy).toHaveBeenCalledTimes(1); // Still only called once due to staleTime
  });
  
  it('should refetch on demand', async () => {
    const spy = jest.spyOn(campaignService, 'getActiveCampaigns');
    
    const { result } = renderHook(() => useActiveCampaigns(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    
    await result.current.refetch();
    
    expect(spy).toHaveBeenCalledTimes(2);
  });
  
  it('should return empty array when no active campaigns', async () => {
    jest.spyOn(campaignService, 'getActiveCampaigns').mockResolvedValueOnce([]);
    
    const { result } = renderHook(() => useActiveCampaigns(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toEqual([]);
  });
});