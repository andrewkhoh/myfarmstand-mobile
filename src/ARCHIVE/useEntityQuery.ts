import { useQuery, useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useCurrentUser } from './useAuth';
import { createQueryKeyFactory, type EntityType, type UserIsolationLevel } from '../utils/queryKeyFactory';
import { createBroadcastHelper, type BroadcastTarget } from '../utils/broadcastFactory';

interface EntityConfig {
  entity: EntityType;
  isolation: UserIsolationLevel;
  target: BroadcastTarget; // Match BroadcastConfig interface
}

// Enhanced error handling interface (following cart pattern)
interface EntityError {
  code: 'AUTHENTICATION_REQUIRED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  entityType?: string;
}

// Enhanced operation result interface (following cart pattern)
interface EntityOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: EntityError;
  data?: T;
}

// Enhanced mutation context interface (following cart pattern)
interface EntityMutationContext<T = any> {
  previousData?: T;
  operationType: string;
  entityType: string;
  metadata?: Record<string, any>;
}

// Enhanced error handling utility (following cart pattern)
const createEntityError = (
  code: EntityError['code'],
  message: string,
  userMessage: string,
  entityType?: string
): EntityError => ({
  code,
  message,
  userMessage,
  entityType,
});

// Enhanced typed query function (following cart pattern)
type EntityQueryFn<T> = (userId?: string) => Promise<T>;

// Centralized Entity Query Hook with User Context (enhanced following cart pattern)
export const useEntityQuery = <T>(
  entityConfig: EntityConfig,
  queryFn: EntityQueryFn<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  const { data: user } = useCurrentUser();
  const queryKeys = createQueryKeyFactory(entityConfig);
  
  // Enhanced authentication guard (following cart pattern)
  if (entityConfig.isolation === 'user-specific' && !user?.id) {
    const authError = createEntityError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to access this data',
      entityConfig.entity
    );
    
    return {
      data: undefined,
      isLoading: false,
      error: authError,
      isError: true,
      isSuccess: false,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      status: 'error' as const,
      fetchStatus: 'idle' as const,
      refetch: () => Promise.resolve({ data: undefined, isLoading: false, error: authError } as any),
    } as any;
  }
  
  return useQuery({
    queryKey: queryKeys.all(user?.id),
    queryFn: () => queryFn(user?.id),
    // Enhanced query configuration (following cart pattern)
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: entityConfig.isolation === 'user-specific' ? !!user?.id : true,
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error) => {
      // Smart retry logic
      if (failureCount < 2) return true;
      // Don't retry on authentication errors
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    ...options
  });
};

// Enhanced typed mutation function (following cart pattern)
type EntityMutationFn<TData, TVariables> = (variables: TVariables) => Promise<TData>;

// Centralized Entity Mutation Hook with Broadcast Support (enhanced following cart pattern)
export const useEntityMutation = <TData, TVariables = any>(
  entityConfig: EntityConfig,
  mutationFn: EntityMutationFn<TData, TVariables>,
  options?: {
    broadcastEvent?: string;
    invalidateKeys?: string[];
    enableOptimisticUpdates?: boolean;
    optimisticUpdateFn?: (variables: TVariables, currentData: any) => any;
    mutation?: Omit<UseMutationOptions<EntityOperationResult<TData>, Error, TVariables, EntityMutationContext<any>>, 'mutationFn'>;
  }
) => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const queryKeys = createQueryKeyFactory(entityConfig);
  const broadcastHelper = createBroadcastHelper(entityConfig);
  
  // Enhanced authentication guard (following cart pattern)
  if (entityConfig.isolation === 'user-specific' && !user?.id) {
    const authError = createEntityError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to perform this action',
      entityConfig.entity
    );
    
    return {
      isPending: false,
      error: authError,
      mutate: () => console.warn(`⚠️ ${entityConfig.entity} operation blocked: User not authenticated`),
      mutateAsync: async (): Promise<EntityOperationResult<TData>> => ({ 
        success: false, 
        error: authError 
      }),
      reset: () => {},
      isIdle: true,
      isError: false,
      isSuccess: false,
      data: undefined,
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle' as const,
    } as any;
  }
  
  return useMutation<EntityOperationResult<TData>, Error, TVariables, EntityMutationContext<any>>({
    mutationFn: async (variables: TVariables): Promise<EntityOperationResult<TData>> => {
      try {
        const result = await mutationFn(variables);
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('authentication')) {
          throw createEntityError(
            'AUTHENTICATION_REQUIRED',
            error.message,
            'Please sign in to perform this action',
            entityConfig.entity
          );
        }
        throw createEntityError(
          'UNKNOWN_ERROR',
          error.message || `Failed to perform ${entityConfig.entity} operation`,
          'Unable to complete the operation. Please try again.',
          entityConfig.entity
        );
      }
    },
    
    // Enhanced optimistic updates (following cart pattern)
    onMutate: async (variables: TVariables): Promise<EntityMutationContext<any>> => {
      if (!options?.enableOptimisticUpdates) {
        return { operationType: 'mutation', entityType: entityConfig.entity };
      }
      
      // Cancel outgoing refetches (following cart pattern)
      const queryKey = queryKeys.all(user?.id);
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot previous value (following cart pattern)
      const previousData = queryClient.getQueryData(queryKey);
      
      // Apply optimistic update if function provided (following cart pattern)
      if (options.optimisticUpdateFn && previousData) {
        const optimisticData = options.optimisticUpdateFn(variables, previousData);
        queryClient.setQueryData(queryKey, optimisticData);
      }
      
      return { 
        previousData, 
        operationType: 'mutation',
        entityType: entityConfig.entity,
        metadata: { variables }
      };
    },
    
    // Enhanced error handling with rollback (following cart pattern)
    onError: (error: any, variables: TVariables, context?: EntityMutationContext<any>) => {
      // Rollback optimistic updates (following cart pattern)
      if (context?.previousData && options?.enableOptimisticUpdates) {
        queryClient.setQueryData(queryKeys.all(user?.id), context.previousData);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error(`❌ ${entityConfig.entity} mutation failed:`, {
        error: error.message,
        userMessage: (error as EntityError).userMessage,
        entityType: entityConfig.entity,
        variables
      });
      
      // Call user's onError if provided
      options?.mutation?.onError?.(error, variables, context);
    },
    
    // Enhanced success handling (following cart pattern)
    onSuccess: async (_result: EntityOperationResult<TData>, variables: TVariables) => {
      // Smart invalidation strategy (following cart pattern)
      const keysToInvalidate = options?.invalidateKeys || [
        queryKeys.all(user?.id),
        queryKeys.lists(user?.id),
        queryKeys.details(user?.id)
      ];
      
      await Promise.all(
        keysToInvalidate.map(key => 
          queryClient.invalidateQueries({ queryKey: key as readonly unknown[] })
        )
      );
      
      // Broadcast success (following cart pattern)
      if (options?.broadcastEvent) {
        try {
          await broadcastHelper.send(options.broadcastEvent, {
            ...variables,
            userId: (variables as any)?.userId || user?.id,
            entityType: entityConfig.entity,
            timestamp: new Date().toISOString()
          });
        } catch (broadcastError) {
          console.warn(`Failed to broadcast ${entityConfig.entity} event:`, broadcastError);
          // Non-blocking - operation was successful
        }
      }
      
      // Call user's onSuccess if provided
      options?.mutation?.onSuccess?.(_result, variables, { 
        operationType: 'mutation', 
        entityType: entityConfig.entity 
      } as EntityMutationContext<any>);
    },
    
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if ((error as EntityError).code === 'AUTHENTICATION_REQUIRED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    
    ...options?.mutation
  });
};

// Specialized hooks for common patterns

// User-specific entity query (cart, orders, auth) - enhanced with useCallback (following cart pattern)
export const useUserEntityQuery = <T>(
  entity: EntityType,
  queryFn: EntityQueryFn<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  const memoizedQueryFn = useCallback(queryFn, [entity]);
  
  return useEntityQuery(
    { entity, isolation: 'user-specific', target: 'user-specific' },
    memoizedQueryFn,
    options
  );
};

// Global entity query (products, stock) - enhanced with useCallback (following cart pattern)
export const useGlobalEntityQuery = <T>(
  entity: EntityType,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  const memoizedQueryFn = useCallback(() => queryFn(), [entity]);
  
  return useEntityQuery(
    { entity, isolation: 'global', target: 'global' },
    memoizedQueryFn,
    options
  );
};

// User-specific entity mutation with automatic broadcast - enhanced (following cart pattern)
export const useUserEntityMutation = <TData, TVariables extends { userId?: string }>(
  entity: EntityType,
  mutationFn: EntityMutationFn<TData, TVariables>,
  broadcastEvent: string,
  options?: {
    invalidateKeys?: string[];
    enableOptimisticUpdates?: boolean;
    optimisticUpdateFn?: (variables: TVariables, currentData: any) => any;
    mutation?: Omit<UseMutationOptions<EntityOperationResult<TData>, Error, TVariables, EntityMutationContext<any>>, 'mutationFn'>;
  }
) => {
  return useEntityMutation(
    { entity, isolation: 'user-specific', target: 'user-specific' },
    mutationFn,
    {
      broadcastEvent,
      enableOptimisticUpdates: options?.enableOptimisticUpdates ?? false,
      optimisticUpdateFn: options?.optimisticUpdateFn,
      ...options
    }
  );
};

// Global entity mutation with automatic broadcast - enhanced (following cart pattern)
export const useGlobalEntityMutation = <TData, TVariables = any>(
  entity: EntityType,
  mutationFn: EntityMutationFn<TData, TVariables>,
  broadcastEvent: string,
  options?: {
    invalidateKeys?: string[];
    enableOptimisticUpdates?: boolean;
    optimisticUpdateFn?: (variables: TVariables, currentData: any) => any;
    mutation?: Omit<UseMutationOptions<EntityOperationResult<TData>, Error, TVariables, EntityMutationContext<any>>, 'mutationFn'>;
  }
) => {
  return useEntityMutation(
    { entity, isolation: 'global', target: 'global' },
    mutationFn,
    {
      broadcastEvent,
      enableOptimisticUpdates: options?.enableOptimisticUpdates ?? false,
      optimisticUpdateFn: options?.optimisticUpdateFn,
      ...options
    }
  );
};
