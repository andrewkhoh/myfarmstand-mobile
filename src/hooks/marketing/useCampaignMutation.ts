import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '../useAuth';

interface CampaignFormData {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  targetAudience: string;
  budget: number;
  selectedProducts: string[];
}

interface CampaignResult {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  targetAudience: string;
  budget: number;
  selectedProducts: string[];
}

export function useCampaignMutation() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const createMutation = useMutation({
    mutationFn: async (campaignData: CampaignFormData): Promise<CampaignResult> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Mock implementation for now - replace with actual service call
      const mockResult: CampaignResult = {
        id: Date.now().toString(),
        name: campaignData.name,
        description: campaignData.description,
        startDate: campaignData.startDate.toISOString(),
        endDate: campaignData.endDate.toISOString(),
        targetAudience: campaignData.targetAudience,
        budget: campaignData.budget,
        selectedProducts: campaignData.selectedProducts
      };

      return mockResult;
    },
    onSuccess: () => {
      // Invalidate campaign lists
      queryClient.invalidateQueries({
        queryKey: ['marketing', 'campaigns']
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      campaignId,
      campaignData
    }: {
      campaignId: string;
      campaignData: CampaignFormData;
    }): Promise<CampaignResult> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Mock implementation for now - replace with actual service call
      const mockResult: CampaignResult = {
        id: campaignId,
        name: campaignData.name,
        description: campaignData.description,
        startDate: campaignData.startDate.toISOString(),
        endDate: campaignData.endDate.toISOString(),
        targetAudience: campaignData.targetAudience,
        budget: campaignData.budget,
        selectedProducts: campaignData.selectedProducts
      };

      return mockResult;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific campaign and lists
      queryClient.invalidateQueries({
        queryKey: ['marketing', 'campaigns', variables.campaignId]
      });
      queryClient.invalidateQueries({
        queryKey: ['marketing', 'campaigns']
      });
    }
  });

  return {
    createCampaign: createMutation.mutateAsync,
    updateCampaign: (campaignId: string, campaignData: CampaignFormData) =>
      updateMutation.mutateAsync({ campaignId, campaignData }),
    isCreating: createMutation.isPending || updateMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error
  };
}