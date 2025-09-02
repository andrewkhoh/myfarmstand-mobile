import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { contentService, WorkflowState, ContentData } from '@/services/marketing/contentService';
import { useEffect, useCallback } from 'react';

export function useContentWorkflow(contentId: string) {
  const queryClient = useQueryClient();
  
  // Query for content data
  const contentQuery = useQuery({
    queryKey: marketingKeys.content.workflow(contentId),
    queryFn: () => contentService.getContent(contentId),
    enabled: !!contentId,
    staleTime: 30000
  });
  
  // State transition mutation with optimistic updates
  const transitionMutation = useMutation({
    mutationFn: (toState: WorkflowState) => 
      contentService.transitionWorkflow(contentId, toState),
    onMutate: async (toState) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ 
        queryKey: marketingKeys.content.workflow(contentId) 
      });
      
      // Snapshot previous value
      const previousContent = queryClient.getQueryData<ContentData>(
        marketingKeys.content.workflow(contentId)
      );
      
      // Optimistically update
      if (previousContent) {
        queryClient.setQueryData<ContentData>(
          marketingKeys.content.workflow(contentId),
          {
            ...previousContent,
            workflow_state: toState,
            updated_at: new Date()
          }
        );
      }
      
      return { previousContent };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousContent) {
        queryClient.setQueryData(
          marketingKeys.content.workflow(contentId),
          context.previousContent
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.content.workflow(contentId) 
      });
    }
  });
  
  // Real-time subscription with cleanup
  useEffect(() => {
    if (!contentId) return;
    
    const unsubscribe = contentService.subscribeToWorkflow(
      contentId,
      (update) => {
        queryClient.setQueryData(
          marketingKeys.content.workflow(contentId),
          update
        );
      }
    );
    
    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, [contentId, queryClient]);
  
  // Transition functions
  const transitionToReview = useCallback(() => {
    transitionMutation.mutate('review');
  }, [transitionMutation]);
  
  const transitionToApproved = useCallback(() => {
    transitionMutation.mutate('approved');
  }, [transitionMutation]);
  
  const transitionToPublished = useCallback(() => {
    transitionMutation.mutate('published');
  }, [transitionMutation]);
  
  return {
    data: contentQuery.data,
    isLoading: contentQuery.isLoading,
    error: contentQuery.error,
    
    // State transitions
    transitionToReview,
    transitionToApproved,
    transitionToPublished,
    
    isTransitioning: transitionMutation.isPending,
    transitionError: transitionMutation.error
  };
}