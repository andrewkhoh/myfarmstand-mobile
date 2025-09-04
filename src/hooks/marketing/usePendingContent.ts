import { useQuery } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { analyticsService } from '@/services/marketing';

export function usePendingContent() {
  return useQuery({
    queryKey: marketingKeys.content.pending(),
    queryFn: () => analyticsService.getPendingContent(),
    staleTime: 30000,
  });
}