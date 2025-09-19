import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest } from '@jest/globals';

// Mock the hook (doesn't exist yet - RED phase)
const useMarketingCampaign = jest.fn();

describe('useMarketingCampaign', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('campaign CRUD operations', () => {
    it('should fetch all marketing campaigns', async () => {
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        data: [
          { id: 'campaign-1', name: 'Summer Sale', status: 'active', budget: 10000 },
          { id: 'campaign-2', name: 'Black Friday', status: 'scheduled', budget: 25000 },
          { id: 'campaign-3', name: 'New Year', status: 'draft', budget: 15000 }
        ]
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.data).toHaveLength(3);
      expect(result.current.data[0].name).toBe('Summer Sale');
    });
    
    it('should create new marketing campaign', async () => {
      const createCampaign = jest.fn().mockResolvedValue({
        id: 'campaign-new',
        name: 'Spring Launch',
        status: 'draft',
        created_at: new Date().toISOString()
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        createCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const created = await result.current.createCampaign({
          name: 'Spring Launch',
          budget: 20000,
          start_date: '2025-03-01',
          end_date: '2025-04-30',
          channels: ['email', 'social', 'search']
        });
        expect(created.id).toBe('campaign-new');
      });
    });
    
    it('should update campaign details', async () => {
      const updateCampaign = jest.fn().mockResolvedValue({
        id: 'campaign-1',
        budget: 12000,
        updated_at: new Date().toISOString()
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        updateCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const updated = await result.current.updateCampaign('campaign-1', {
          budget: 12000,
          channels: ['email', 'social', 'search', 'display']
        });
        expect(updated.budget).toBe(12000);
      });
    });
    
    it('should delete campaign', async () => {
      const deleteCampaign = jest.fn().mockResolvedValue({ success: true });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        deleteCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const deleted = await result.current.deleteCampaign('campaign-1');
        expect(deleted.success).toBe(true);
      });
      
      expect(deleteCampaign).toHaveBeenCalledWith('campaign-1');
    });
    
    it('should activate campaign', async () => {
      const activateCampaign = jest.fn().mockResolvedValue({
        id: 'campaign-1',
        status: 'active',
        activated_at: new Date().toISOString()
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        activateCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const activated = await result.current.activateCampaign('campaign-1');
        expect(activated.status).toBe('active');
      });
    });
    
    it('should pause campaign', async () => {
      const pauseCampaign = jest.fn().mockResolvedValue({
        id: 'campaign-1',
        status: 'paused',
        paused_at: new Date().toISOString()
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        pauseCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const paused = await result.current.pauseCampaign('campaign-1');
        expect(paused.status).toBe('paused');
      });
    });
    
    it('should schedule campaign', async () => {
      const scheduleCampaign = jest.fn().mockResolvedValue({
        id: 'campaign-1',
        status: 'scheduled',
        scheduled_start: '2025-03-01T00:00:00Z'
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        scheduleCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const scheduled = await result.current.scheduleCampaign('campaign-1', {
          start_date: '2025-03-01',
          end_date: '2025-03-31'
        });
        expect(scheduled.status).toBe('scheduled');
      });
    });
    
    it('should clone existing campaign', async () => {
      const cloneCampaign = jest.fn().mockResolvedValue({
        id: 'campaign-clone',
        name: 'Summer Sale (Copy)',
        original_id: 'campaign-1'
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        cloneCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const cloned = await result.current.cloneCampaign('campaign-1');
        expect(cloned.original_id).toBe('campaign-1');
      });
    });
  });
  
  describe('campaign management', () => {
    it('should manage campaign budget allocation', async () => {
      const allocateBudget = jest.fn().mockResolvedValue({
        total_budget: 10000,
        allocations: {
          email: 3000,
          social: 4000,
          search: 2000,
          display: 1000
        }
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        allocateBudget
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const allocation = await result.current.allocateBudget('campaign-1', {
          email: 30,
          social: 40,
          search: 20,
          display: 10
        });
        expect(allocation.allocations.social).toBe(4000);
      });
    });
    
    it('should manage campaign audiences', async () => {
      const updateAudience = jest.fn().mockResolvedValue({
        campaign_id: 'campaign-1',
        audiences: [
          { id: 'audience-1', name: '18-24 Tech Enthusiasts', size: 50000 },
          { id: 'audience-2', name: '25-34 Professionals', size: 75000 }
        ]
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        updateAudience
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        const updated = await result.current.updateAudience('campaign-1', ['audience-1', 'audience-2']);
        expect(updated.audiences).toHaveLength(2);
      });
    });
    
    it('should track campaign milestones', async () => {
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        milestones: [
          { id: 'milestone-1', name: 'Launch', date: '2025-03-01', status: 'pending' },
          { id: 'milestone-2', name: '50% Budget', date: '2025-03-15', status: 'pending' },
          { id: 'milestone-3', name: 'Completion', date: '2025-03-31', status: 'pending' }
        ]
      });
      
      const { result } = renderHook(() => useMarketingCampaign('campaign-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.milestones).toHaveLength(3);
      });
    });
  });
  
  describe('optimistic updates', () => {
    it('should optimistically update campaign status', async () => {
      const updateStatus = jest.fn();
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        data: { id: 'campaign-1', status: 'draft' },
        updateStatus,
        optimisticData: { id: 'campaign-1', status: 'active' }
      });
      
      const { result } = renderHook(() => useMarketingCampaign('campaign-1'), { wrapper });
      
      await act(async () => {
        result.current.updateStatus('active');
      });
      
      expect(result.current.optimisticData.status).toBe('active');
    });
    
    it('should rollback on failed status update', async () => {
      const updateStatus = jest.fn().mockRejectedValue(new Error('Update failed'));
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        data: { status: 'draft' },
        updateStatus
      });
      
      const { result } = renderHook(() => useMarketingCampaign('campaign-1'), { wrapper });
      
      await act(async () => {
        try {
          await result.current.updateStatus('active');
        } catch {
          // Expected error
        }
      });
      
      await waitFor(() => {
        expect(result.current.data.status).toBe('draft');
      });
    });
  });
  
  describe('error handling', () => {
    it('should handle budget exceeded errors', async () => {
      const updateCampaign = jest.fn().mockRejectedValue({
        message: 'Budget exceeded',
        available_budget: 5000,
        requested_budget: 10000
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        updateCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.updateCampaign('campaign-1', { budget: 10000 });
        } catch (error: any) {
          expect(error.message).toBe('Budget exceeded');
          expect(error.available_budget).toBe(5000);
        }
      });
    });
    
    it('should handle campaign conflicts', async () => {
      const createCampaign = jest.fn().mockRejectedValue({
        message: 'Campaign conflict',
        conflicting_campaigns: ['campaign-2', 'campaign-3']
      });
      
      useMarketingCampaign.mockReturnValue({
        isLoading: false,
        createCampaign
      });
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.createCampaign({
            name: 'Conflicting Campaign',
            start_date: '2025-03-01',
            end_date: '2025-03-31'
          });
        } catch (error: any) {
          expect(error.conflicting_campaigns).toHaveLength(2);
        }
      });
    });
  });
});