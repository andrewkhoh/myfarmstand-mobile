import { useQuery } from '@tanstack/react-query';
import { campaignService } from '../../services/marketing/campaign.service';
import type { MarketingCampaign } from '../../types/marketing.types';

export function useActiveCampaigns() {
  const query = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: () => campaignService.getActiveCampaigns(),
    staleTime: 30000,
  });

  return {
    campaigns: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}