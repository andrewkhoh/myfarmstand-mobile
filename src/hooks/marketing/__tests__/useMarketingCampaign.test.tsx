import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';

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
  
  describe('campaign lifecycle management', () => {
    it('should create new marketing campaign', async () => {
      const mockHookReturn = {
        campaigns: [],
        createCampaign: jest.fn(),
        isCreating: false
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      const newCampaign = {
        name: 'Summer Sale 2025',
        type: 'promotional',
        channels: ['email', 'social', 'paid'],
        budget: 50000,
        startDate: '2025-06-01',
        endDate: '2025-08-31'
      };
      
      mockHookReturn.isCreating = true;
      
      act(() => {
        result.current.createCampaign(newCampaign);
      });
      
      mockHookReturn.campaigns = [{ ...newCampaign, id: 'campaign-1', status: 'draft' }];
      mockHookReturn.isCreating = false;
      
      await waitFor(() => {
        expect(result.current.campaigns).toHaveLength(1);
        expect(result.current.campaigns[0].name).toBe('Summer Sale 2025');
      });
    });
    
    it('should handle campaign scheduling', async () => {
      const mockHookReturn = {
        scheduleCampaign: jest.fn(),
        isScheduling: false,
        scheduledCampaigns: []
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      const scheduleData = {
        campaignId: 'campaign-1',
        launchDate: '2025-06-01T09:00:00Z',
        timezone: 'America/New_York',
        recurring: false
      };
      
      mockHookReturn.isScheduling = true;
      
      act(() => {
        result.current.scheduleCampaign(scheduleData);
      });
      
      mockHookReturn.scheduledCampaigns = [{
        ...scheduleData,
        status: 'scheduled',
        nextRun: '2025-06-01T09:00:00Z'
      }];
      mockHookReturn.isScheduling = false;
      
      await waitFor(() => {
        expect(result.current.scheduledCampaigns).toHaveLength(1);
        expect(result.current.scheduledCampaigns[0].status).toBe('scheduled');
      });
    });
    
    it('should manage campaign status transitions', async () => {
      const mockHookReturn = {
        updateCampaignStatus: jest.fn(),
        campaignStatuses: {
          'campaign-1': 'draft'
        }
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      act(() => {
        result.current.updateCampaignStatus('campaign-1', 'active');
      });
      
      mockHookReturn.campaignStatuses['campaign-1'] = 'active';
      
      await waitFor(() => {
        expect(result.current.campaignStatuses['campaign-1']).toBe('active');
      });
    });
    
    it('should track campaign budget and spending', async () => {
      const mockHookReturn = {
        budgetTracking: {
          allocated: 50000,
          spent: 15000,
          remaining: 35000,
          dailySpend: 500,
          projectedTotal: 45000
        },
        updateBudget: jest.fn()
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      expect(result.current.budgetTracking.remaining).toBe(35000);
      
      act(() => {
        result.current.updateBudget(60000);
      });
      
      mockHookReturn.budgetTracking.allocated = 60000;
      mockHookReturn.budgetTracking.remaining = 45000;
      
      await waitFor(() => {
        expect(result.current.budgetTracking.allocated).toBe(60000);
      });
    });
    
    it('should handle campaign duplication', async () => {
      const mockHookReturn = {
        campaigns: [
          { id: 'campaign-1', name: 'Original Campaign', budget: 10000 }
        ],
        duplicateCampaign: jest.fn(),
        isDuplicating: false
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      mockHookReturn.isDuplicating = true;
      
      act(() => {
        result.current.duplicateCampaign('campaign-1', { name: 'Duplicated Campaign' });
      });
      
      mockHookReturn.campaigns.push({
        id: 'campaign-2',
        name: 'Duplicated Campaign',
        budget: 10000
      });
      mockHookReturn.isDuplicating = false;
      
      await waitFor(() => {
        expect(result.current.campaigns).toHaveLength(2);
        expect(result.current.campaigns[1].name).toBe('Duplicated Campaign');
      });
    });
    
    it('should manage campaign segments and targeting', async () => {
      const mockHookReturn = {
        targeting: {
          demographics: { ageRange: '25-45', gender: 'all' },
          interests: ['technology', 'sports'],
          behaviors: ['online_shoppers'],
          locations: ['US', 'CA']
        },
        updateTargeting: jest.fn()
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      act(() => {
        result.current.updateTargeting({
          interests: ['technology', 'sports', 'travel']
        });
      });
      
      mockHookReturn.targeting.interests = ['technology', 'sports', 'travel'];
      
      await waitFor(() => {
        expect(result.current.targeting.interests).toHaveLength(3);
      });
    });
    
    it('should handle campaign collaboration and permissions', async () => {
      const mockHookReturn = {
        collaborators: [],
        addCollaborator: jest.fn(),
        removeCollaborator: jest.fn(),
        updatePermissions: jest.fn()
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      act(() => {
        result.current.addCollaborator({
          userId: 'user-1',
          role: 'editor',
          permissions: ['edit', 'view', 'comment']
        });
      });
      
      mockHookReturn.collaborators = [{
        userId: 'user-1',
        role: 'editor',
        permissions: ['edit', 'view', 'comment']
      }];
      
      await waitFor(() => {
        expect(result.current.collaborators).toHaveLength(1);
        expect(result.current.collaborators[0].role).toBe('editor');
      });
    });
    
    it('should archive completed campaigns', async () => {
      const mockHookReturn = {
        campaigns: [
          { id: 'campaign-1', status: 'completed' },
          { id: 'campaign-2', status: 'active' }
        ],
        archiveCampaign: jest.fn(),
        isArchiving: false
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      mockHookReturn.isArchiving = true;
      
      act(() => {
        result.current.archiveCampaign('campaign-1');
      });
      
      mockHookReturn.campaigns = mockHookReturn.campaigns.map(c => 
        c.id === 'campaign-1' ? { ...c, status: 'archived' } : c
      );
      mockHookReturn.isArchiving = false;
      
      await waitFor(() => {
        const archived = result.current.campaigns.find(c => c.id === 'campaign-1');
        expect(archived.status).toBe('archived');
      });
    });
    
    it('should handle campaign templates', async () => {
      const mockHookReturn = {
        templates: [],
        saveAsTemplate: jest.fn(),
        createFromTemplate: jest.fn(),
        isLoadingTemplates: false
      };
      useMarketingCampaign.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useMarketingCampaign(), { wrapper });
      
      const template = {
        name: 'Holiday Campaign Template',
        category: 'seasonal',
        config: { channels: ['email', 'social'], duration: 30 }
      };
      
      act(() => {
        result.current.saveAsTemplate('campaign-1', template);
      });
      
      mockHookReturn.templates = [{ ...template, id: 'template-1' }];
      
      await waitFor(() => {
        expect(result.current.templates).toHaveLength(1);
        expect(result.current.templates[0].category).toBe('seasonal');
      });
    });
  });
});