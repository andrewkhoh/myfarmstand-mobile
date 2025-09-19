import { useQuery } from '@tanstack/react-query';
import { contentService } from '../../services/marketing/content.service';

export function usePendingContent() {
  const query = useQuery({
    queryKey: ['content', 'pending'],
    queryFn: () => contentService.getPendingContent(),
    staleTime: 30000,
  });

  return {
    content: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}