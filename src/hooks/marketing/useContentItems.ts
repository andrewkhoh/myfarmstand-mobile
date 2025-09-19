import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { marketingKeys } from '../../utils/queryKeyFactory';
import { contentService } from '../../services/marketing/content.service';
import type { ProductContent, WorkflowState } from '../../types/marketing.types';

interface ContentFilters {
  type?: string;
  stage?: WorkflowState;
  search?: string;
}

export function useContentItems(filters?: ContentFilters) {
  // const queryClient = useQueryClient(); // Removed unused variable

  // Get all content items
  const contentQuery = useQuery({
    queryKey: marketingKeys.content.list(filters),
    queryFn: async () => {
      const allContent = await contentService.getAllContent();

      // Apply filters
      let filtered = allContent;

      if (filters?.type) {
        filtered = filtered.filter(c => c.contentType === filters.type!.toLowerCase());
      }

      if (filters?.stage) {
        filtered = filtered.filter(c => c.workflowState === filters.stage);
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(c =>
          c.title.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Group content by workflow stage
  const contentByStage = useMemo(() => {
    const content = contentQuery.data || [];
    return {
      draft: content.filter(c => c.workflowState === 'draft'),
      review: content.filter(c => c.workflowState === 'review'),
      approved: content.filter(c => c.workflowState === 'approved'),
      published: content.filter(c => c.workflowState === 'published'),
    };
  }, [contentQuery.data]);

  // Workflow statistics
  const workflowStats = useMemo(() => ({
    draft: contentByStage.draft.length,
    review: contentByStage.review.length,
    approved: contentByStage.approved.length,
    published: contentByStage.published.length,
    total: contentQuery?.data?.length || 0,
  }), [contentByStage, contentQuery.data]);

  return {
    content: contentQuery.data || [],
    contentByStage,
    workflowStats,
    isLoading: contentQuery.isLoading,
    error: contentQuery.error,
    refetch: contentQuery.refetch,
  };
}

export function useUpdateContentStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: WorkflowState }) => {
      return contentService.transitionTo(id, stage);
    },
    onSuccess: () => {
      // Invalidate all content lists to reflect the change
      queryClient.invalidateQueries({
        queryKey: marketingKeys.content.all()
      });
    },
  });
}

export function useBulkUpdateContentStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, stage }: { ids: string[]; stage: WorkflowState }) => {
      // Process all updates in parallel
      const promises = ids.map(id =>
        contentService.transitionTo(id, stage)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate all content lists to reflect the changes
      queryClient.invalidateQueries({
        queryKey: marketingKeys.content.all()
      });
    },
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentData: Partial<ProductContent>) => {
      return contentService.createContent({
        ...contentData,
        workflowState: 'draft' as WorkflowState,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketingKeys.content.all()
      });
    },
  });
}