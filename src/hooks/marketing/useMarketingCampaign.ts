import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { campaignService } from '@/services/marketing/campaignService';
import { useEffect } from 'react';
import { MarketingCampaign, MarketingContent, CampaignFilter, Product, ProductBundle, WorkflowState, WorkflowConfig, WorkflowResult, WorkflowContext, CalendarEvent } from '@/schemas/marketing';


export interface CampaignData {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  targetAudience: string[];
  channels: string[];
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  metrics?: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  };
}

export function useMarketingCampaign(campaignId?: string) {
  const queryClient = useQueryClient();
  
  // Query for campaign data
  const campaignQuery = useQuery({
    queryKey: marketingKeys.campaigns.detail(campaignId || ''),
    queryFn: async () => {
      if (!campaignId) return null;
      
      // Use service if available, otherwise mock data
      if (campaignService.getCampaign) {
        return campaignService.getCampaign(campaignId);
      }
      
      return {
        id: campaignId,
        name: 'Sample Campaign',
        description: 'Campaign description',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
        budget: 10000,
        targetAudience: ['18-24', '25-34'],
        channels: ['social', 'email'],
        status: 'active' as const,
        metrics: {
          impressions: 50000,
          clicks: 1500,
          conversions: 75,
          spend: 3500
        }
      };
    },
    enabled: !!campaignId,
    staleTime: 30000
  });

  // Save/update campaign mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<CampaignData>) => {
      if (!campaignId) {
        // Create new campaign
        if (campaignService.createCampaign) {
          return campaignService.createCampaign(data);
        }
        return { ...data, id: `campaign-${Date.now()}` };
      }
      
      // Update existing campaign
      if (campaignService.updateCampaign) {
        return campaignService.updateCampaign(campaignId, data);
      }
      return { ...campaignQuery.data, ...data };
    },
    onMutate: async (data) => {
      if (!campaignId) return;
      
      try {

      
        await queryClient.cancelQueries({ 
        queryKey: marketingKeys.campaigns.detail(campaignId) 
      });

      
      } catch (error) {

      
        console.error('Failed to cancel queries:', error);

      
      }
      
      const previousCampaign = queryClient.getQueryData(
        marketingKeys.campaigns.detail(campaignId)
      );
      
      queryClient.setQueryData(
        marketingKeys.campaigns.detail(campaignId),
        (old: MarketingContent | null) => ({ ...old, ...data })
      );
      
      return { previousCampaign };
    },
    onError: (err, variables, context) => {
      if (context?.previousCampaign && campaignId) {
        queryClient.setQueryData(
          marketingKeys.campaigns.detail(campaignId),
          context.previousCampaign
        );
      }
    },
    onSettled: () => {
      if (campaignId) {
        queryClient.invalidateQueries({ 
          queryKey: marketingKeys.campaigns.detail(campaignId) 
        });
      }
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.campaigns.all() 
      });
    }
  });

  // Schedule campaign mutation
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (campaignService.scheduleCampaign) {
        return campaignService.scheduleCampaign(campaignId!);
      }
      return saveMutation.mutateAsync({ status: 'scheduled' });
    },
    onSuccess: () => {
      if (campaignId) {
        queryClient.invalidateQueries({ 
          queryKey: marketingKeys.campaigns.detail(campaignId) 
        });
      }
    }
  });

  // Pause campaign mutation
  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (campaignService.pauseCampaign) {
        return campaignService.pauseCampaign(campaignId!);
      }
      return saveMutation.mutateAsync({ status: 'paused' });
    },
    onSuccess: () => {
      if (campaignId) {
        queryClient.invalidateQueries({ 
          queryKey: marketingKeys.campaigns.detail(campaignId) 
        });
      }
    }
  });

  // Activate campaign mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      if (campaignService.activateCampaign) {
        return campaignService.activateCampaign(campaignId!);
      }
      return saveMutation.mutateAsync({ status: 'active' });
    },
    onSuccess: () => {
      if (campaignId) {
        queryClient.invalidateQueries({ 
          queryKey: marketingKeys.campaigns.detail(campaignId) 
        });
      }
    }
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Campaign ID required');
      
      if (campaignService.deleteCampaign) {
        return campaignService.deleteCampaign(campaignId);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.campaigns.all() 
      });
    }
  });

  // Real-time subscription
  useEffect(() => {
    if (!campaignId) return;
    
    const unsubscribe = campaignService.subscribeToCampaign?.(
      campaignId,
      (update) => {
        queryClient.setQueryData(
          marketingKeys.campaigns.detail(campaignId),
          update
        );
      }
    ) || (() => {});
    
    return () => {
      unsubscribe();
    };
  }, [campaignId, queryClient]);

  return {
    // Data
    campaign: campaignQuery.data,
    data: campaignQuery.data,
    
    // Actions
    saveCampaign: saveMutation.mutate,
    scheduleCampaign: scheduleMutation.mutate,
    pauseCampaign: pauseMutation.mutate,
    activateCampaign: activateMutation.mutate,
    deleteCampaign: deleteMutation.mutate,
    
    // Status
    isLoading: campaignQuery.isLoading,
    error: campaignQuery.error,
    isSaving: saveMutation.isPending,
    isScheduling: scheduleMutation.isPending,
    isPausing: pauseMutation.isPending,
    isActivating: activateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Optimistic state
    isOptimistic: saveMutation.isPending
  };
}
