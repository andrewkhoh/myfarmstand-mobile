import { useQuery } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { campaignService } from '@/services/marketing';

export function useActiveCampaigns() {
  return useQuery({
    queryKey: marketingKeys.campaign.active(),
    queryFn: () => campaignService.getActiveCampaigns(),
    staleTime: 30000,
  });
}