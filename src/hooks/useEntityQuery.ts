import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useCurrentUser } from './useAuth';
import { createQueryKeyFactory, type EntityType, type UserIsolationLevel } from '../utils/queryKeyFactory';
import { createBroadcastHelper, type BroadcastTarget } from '../utils/broadcastFactory';

interface EntityConfig {
  entity: EntityType;
  isolation: UserIsolationLevel;
  target: BroadcastTarget; // Match BroadcastConfig interface
}

// Centralized Entity Query Hook with User Context
export const useEntityQuery = <T>(
  entityConfig: EntityConfig,
  queryFn: (userId?: string) => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  const { data: user } = useCurrentUser();
  const queryKeys = createQueryKeyFactory(entityConfig);
  
  return useQuery({
    queryKey: queryKeys.all(user?.id),
    queryFn: () => queryFn(user?.id),
    enabled: entityConfig.isolation === 'user-specific' ? !!user : true,
    ...options
  });
};

// Centralized Entity Mutation Hook with Broadcast Support
export const useEntityMutation = <TData, TVariables = any>(
  entityConfig: EntityConfig,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    broadcastEvent?: string;
    invalidateKeys?: string[];
    mutation?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>;
  }
) => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const queryKeys = createQueryKeyFactory(entityConfig);
  const broadcastHelper = createBroadcastHelper(entityConfig);
  
  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      // Send broadcast if event specified
      if (options?.broadcastEvent) {
        await broadcastHelper.send(options.broadcastEvent, {
          ...variables,
          userId: (variables as any)?.userId || user?.id,
          data
        });
      }
      
      // Invalidate specified keys or default to all entity keys
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
      
      // Call user's onSuccess if provided
      options?.mutation?.onSuccess?.(data, variables, undefined);
    },
    onError: (error, variables, context) => {
      console.error(`❌ ${entityConfig.entity} mutation failed:`, error);
      options?.mutation?.onError?.(error, variables, context);
    },
    ...options?.mutation
  });
};

// Specialized hooks for common patterns

// User-specific entity query (cart, orders, auth)
export const useUserEntityQuery = <T>(
  entity: EntityType,
  queryFn: (userId?: string) => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  return useEntityQuery(
    { entity, isolation: 'user-specific', target: 'user-specific' },
    queryFn,
    options
  );
};

// Global entity query (products, stock)
export const useGlobalEntityQuery = <T>(
  entity: EntityType,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  return useEntityQuery(
    { entity, isolation: 'global', target: 'global' },
    () => queryFn(),
    options
  );
};

// User-specific entity mutation with automatic broadcast
export const useUserEntityMutation = <TData, TVariables extends { userId?: string }>(
  entity: EntityType,
  mutationFn: (variables: TVariables) => Promise<TData>,
  broadcastEvent: string,
  options?: {
    invalidateKeys?: string[];
    mutation?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>;
  }
) => {
  return useEntityMutation(
    { entity, isolation: 'user-specific', target: 'user-specific' },
    mutationFn,
    {
      broadcastEvent,
      ...options
    }
  );
};

// Global entity mutation with automatic broadcast
export const useGlobalEntityMutation = <TData, TVariables = any>(
  entity: EntityType,
  mutationFn: (variables: TVariables) => Promise<TData>,
  broadcastEvent: string,
  options?: {
    invalidateKeys?: string[];
    mutation?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>;
  }
) => {
  return useEntityMutation(
    { entity, isolation: 'global', target: 'global' },
    mutationFn,
    {
      broadcastEvent,
      ...options
    }
  );
};
