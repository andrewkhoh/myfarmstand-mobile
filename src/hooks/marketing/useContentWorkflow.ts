import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useState, useRef } from 'react';
import { contentService } from '../../services/marketing/content.service';
import { contentKeys } from '../../utils/queryKeyFactory';
import { useUserRole } from '../role-based/useUserRole';
import type { WorkflowState, ProductContent, UserRole } from '../../types/marketing';

interface UseContentWorkflowOptions {
  role?: UserRole;
}

export function useContentWorkflow(
  contentId: string,
  options?: UseContentWorkflowOptions
) {
  const queryClient = useQueryClient();
  const userRole = options?.role || useUserRole();
  const optimisticUpdateApplied = useRef(false);
  const [permissionError, setPermissionError] = useState<Error | null>(null);
  
  // Permission matrix
  const permissions: Record<UserRole, WorkflowState[]> = {
    viewer: [],
    editor: ['review'],
    manager: ['review', 'approved'],
    admin: ['review', 'approved', 'published', 'archived'],
  };
  
  const contentQuery = useQuery({
    queryKey: contentKeys.detail(contentId),
    queryFn: () => contentService.getContent(contentId),
    staleTime: 30000,
  });
  
  const canTransitionTo = useCallback((targetState: WorkflowState): boolean => {
    return permissions[userRole]?.includes(targetState) ?? false;
  }, [userRole]);
  
  const transitionMutation = useMutation({
    mutationFn: async ({ targetState }: { targetState: WorkflowState }) => {
      // Validate state transition on the server side
      const currentState = contentQuery?.data?.workflowState;
      if (currentState) {
        const isValid = await contentService.validateTransition(
          contentId,
          currentState,
          targetState
        );

        if (!isValid) {
          throw new Error('Invalid transition');
        }
      }

      return contentService.transitionTo(contentId, targetState);
    },
    onMutate: async ({ targetState }) => {
      // Check permissions first - throw early if not allowed
      if (!canTransitionTo(targetState)) {
        throw new Error('Insufficient permissions');
      }
      
      // Cancel any outgoing queries
      await queryClient.cancelQueries({ 
        queryKey: contentKeys.detail(contentId) 
      });
      
      // Snapshot the previous value
      const previousContent = queryClient.getQueryData<ProductContent>(
        contentKeys.detail(contentId)
      );
      
      // Mark that we've already applied the optimistic update
      optimisticUpdateApplied.current = false;
      
      // Return a context object with the snapshot for rollback
      return { previousContent };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, roll back the optimistic update
      if (context?.previousContent) {
        queryClient.setQueryData<ProductContent>(
          contentKeys.detail(contentId),
          context.previousContent
        );
      }
      optimisticUpdateApplied.current = false;
    },
    onSuccess: (data) => {
      // Update with the server response
      queryClient.setQueryData<ProductContent>(
        contentKeys.detail(contentId),
        data
      );
      optimisticUpdateApplied.current = false;
    },
    onSettled: () => {
      optimisticUpdateApplied.current = false;
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: contentKeys.detail(contentId) 
      });
    },
  });
  
  // Custom transition function that applies optimistic update synchronously
  const transitionTo = useCallback((params: { targetState: WorkflowState }) => {
    // Clear previous permission error
    setPermissionError(null);
    
    // Check permissions first
    if (!canTransitionTo(params.targetState)) {
      // Set error immediately
      const error = new Error('Insufficient permissions');
      setPermissionError(error);
      return;
    }
    
    // Apply optimistic update synchronously
    if (!optimisticUpdateApplied.current) {
      const currentContent = queryClient.getQueryData<ProductContent>(
        contentKeys.detail(contentId)
      );
      
      if (currentContent) {
        queryClient.setQueryData<ProductContent>(
          contentKeys.detail(contentId),
          {
            ...currentContent,
            workflowState: params.targetState,
            lastModified: new Date(),
          }
        );
        optimisticUpdateApplied.current = true;
      }
    }
    
    // Then trigger the mutation
    transitionMutation.mutate(params);
  }, [canTransitionTo, transitionMutation, queryClient, contentId]);

  return {
    content: contentQuery.data,
    isLoading: contentQuery.isLoading,
    error: contentQuery.error || transitionMutation.error || permissionError,
    transitionTo,
    transitionToAsync: transitionMutation.mutateAsync,
    isTransitioning: transitionMutation.isPending,
    canTransitionTo,
    availableTransitions: permissions[userRole] || [],
    refetch: contentQuery.refetch,
  };
}