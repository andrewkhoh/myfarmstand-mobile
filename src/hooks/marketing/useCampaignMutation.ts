import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MarketingCampaign } from '@/types/marketing';

interface CreateCampaignData {
  name: string;
  description?: string;
  type: 'email' | 'social' | 'sms' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  startDate: string;
  endDate?: string;
  targetAudience?: string[];
  budget?: number;
}

interface UpdateCampaignData extends Partial<CreateCampaignData> {
  id: string;
}

export const useCampaignMutation = () => {
  const queryClient = useQueryClient();

  const createCampaign = useMutation({
    mutationFn: async (data: CreateCampaignData): Promise<MarketingCampaign> => {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: `campaign_${Date.now()}`,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metrics: {
              impressions: 0,
              clicks: 0,
              conversions: 0,
              revenue: 0,
            },
          } as MarketingCampaign);
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-dashboard'] });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async (data: UpdateCampaignData): Promise<MarketingCampaign> => {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ...data,
            updatedAt: new Date().toISOString(),
          } as MarketingCampaign);
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-dashboard'] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-dashboard'] });
    },
  });

  return {
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
};