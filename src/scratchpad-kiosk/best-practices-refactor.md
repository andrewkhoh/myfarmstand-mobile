# Best Practices Refactor for Auth Hooks

## Current Implementation Issues

### 1. **Manual Auth Guards** ❌
```typescript
// Current: Manual auth guard in every hook
export const useCategories = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const query = useQuery({ /* ... */ });
  
  // 🔒 Authentication guard - applied after all hooks are called
  if (!user?.id) {
    return {
      data: [],
      isLoading: false,
      error: authError,
      // ... 20+ properties manually defined
    } as any;
  }
  
  return { ...query };
};
```

### 2. **Repeated Fallback Objects** ❌
Every hook defines the same fallback object structure.

## Recommended Best Practices Solution

### 1. **Use React Query's Built-in Enabled Guard** ✅
```typescript
export const useCategories = () => {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: productQueryKeys.categories,
    queryFn: async () => {
      const response = await getCategories();
      if (!response.success) {
        throw createProductError(
          'NETWORK_ERROR',
          response.error || 'Failed to fetch categories',
          'Unable to load categories. Please try again.'
        );
      }
      return response.categories || [];
    },
    enabled: !!user?.id,  // ✅ React Query handles conditional execution
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error.message?.includes('authentication')) return false;
      return failureCount < 2;
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await getCategories();
      if (!response.success) {
        throw createProductError('NETWORK_ERROR', response.error, 'Refresh failed');
      }
      return { success: true, categories: response.categories };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productQueryKeys.categories });
      if (user?.id) {
        await productBroadcast.send('categories-refreshed', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }
    },
  });

  // ✅ Simple conditional return based on auth state
  if (!user?.id) {
    return {
      ...query,
      data: [],
      error: createProductError(
        'AUTHENTICATION_REQUIRED',
        'User not authenticated',
        'Please sign in to view categories'
      ),
      isError: true,
      isRefreshing: false,
      refreshCategories: () => console.warn('⚠️ Authentication required'),
      refreshCategoriesAsync: async () => ({ 
        success: false, 
        error: createProductError('AUTHENTICATION_REQUIRED', 'Not authenticated', 'Please sign in') 
      }),
      getCategoriesQueryKey: () => ['categories', 'unauthenticated'],
    };
  }

  return {
    ...query,
    isRefreshing: refreshMutation.isPending,
    refreshCategories: refreshMutation.mutate,
    refreshCategoriesAsync: refreshMutation.mutateAsync,
    getCategoriesQueryKey: useCallback(() => productQueryKeys.categories, [user.id]),
  };
};
```

### 2. **Reusable Auth Guard Factory** ✅
```typescript
// utils/withAuthGuard.ts
import { createProductError } from '../services/productService';

interface AuthGuardOptions<T> {
  fallbackData: T;
  errorMessage?: string;
  requiredPermissions?: string[];
}

export const withAuthGuard = <T>(
  hook: (user: User) => T,
  options: AuthGuardOptions<Partial<T>>
) => {
  const { data: user } = useCurrentUser();
  
  if (!user?.id) {
    const authError = createProductError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      options.errorMessage || 'Please sign in to continue'
    );
    
    return {
      ...options.fallbackData,
      error: authError,
      isError: true,
    } as T;
  }
  
  // Check permissions if required
  if (options.requiredPermissions?.length > 0) {
    const userRole = user.raw_user_meta_data?.role;
    if (!userRole || !options.requiredPermissions.includes(userRole)) {
      const permissionError = createProductError(
        'INSUFFICIENT_PERMISSIONS',
        `User role '${userRole}' insufficient`,
        'You do not have permission to access this feature'
      );
      
      return {
        ...options.fallbackData,
        error: permissionError,
        isError: true,
      } as T;
    }
  }
  
  return hook(user);
};

// Usage:
export const useCategories = () => withAuthGuard(
  (user) => {
    const queryClient = useQueryClient();
    const query = useQuery({
      queryKey: productQueryKeys.categories,
      queryFn: () => getCategories(),
      enabled: true, // Always enabled since auth is handled by wrapper
    });
    
    return { ...query, /* other properties */ };
  },
  {
    fallbackData: {
      data: [],
      isLoading: false,
      isRefreshing: false,
      refreshCategories: () => {},
      refreshCategoriesAsync: async () => ({ success: false, error: null }),
    },
    errorMessage: 'Please sign in to view categories'
  }
);
```

### 3. **Consistent Error Handling** ✅
```typescript
// utils/createQueryWithAuth.ts
export const createQueryWithAuth = <T>(
  queryKey: QueryKey,
  queryFn: QueryFunction<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  const { data: user } = useCurrentUser();
  
  return useQuery({
    queryKey,
    queryFn,
    enabled: !!user?.id && (options?.enabled ?? true),
    ...options,
  });
};

// Usage:
export const useCategories = () => {
  const { data: user } = useCurrentUser();
  const query = createQueryWithAuth(
    productQueryKeys.categories,
    () => getCategories(),
    {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error.message?.includes('authentication')) return false;
        return failureCount < 2;
      },
    }
  );
  
  // Simple auth fallback
  return !user?.id 
    ? { ...query, data: [], error: authError }
    : query;
};
```

## Benefits of Best Practices Approach

### ✅ **Performance**
- React Query's `enabled` prevents unnecessary network requests
- No manual state management for auth states

### ✅ **Maintainability** 
- Reusable auth patterns
- Consistent error handling
- Less code duplication

### ✅ **Type Safety**
- No `as any` casting needed
- Proper TypeScript inference
- Consistent interfaces

### ✅ **React Query Philosophy**
- Leverages built-in conditional query execution
- Proper cache invalidation strategies
- Follows React Query patterns

## Current Status: Working but Not Optimal

The current fixes are **functionally correct** and follow React Hooks rules, but could benefit from the refactoring above for better:
- Code reusability
- Type safety  
- Performance optimization
- Maintenance burden reduction