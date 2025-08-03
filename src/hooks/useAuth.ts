import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthService } from '../services/authService';
import { User } from '../types';
import { useAuth as useAuthContext } from '../contexts/AuthContext';

// Query keys for auth-related queries
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
};

/**
 * Hook for login mutation with React Query
 */
export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthContext();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      AuthService.login(email, password),
    onSuccess: (data) => {
      if (data.success && data.user) {
        // Update AuthContext state
        setUser(data.user);
        
        // Update React Query cache
        queryClient.setQueryData(authKeys.user(), data.user);
        
        // Invalidate and refetch any auth-related queries
        queryClient.invalidateQueries({ queryKey: authKeys.all });
      }
    },
    onError: (error) => {
      console.error('Login mutation error:', error);
      // Clear any stale auth data
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
  });
};

/**
 * Hook for register mutation with React Query
 */
export const useRegisterMutation = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthContext();

  return useMutation({
    mutationFn: ({
      email,
      password,
      name,
      phone,
      address,
    }: {
      email: string;
      password: string;
      name: string;
      phone: string;
      address: string;
    }) => AuthService.register(email, password, name, phone, address),
    onSuccess: (data) => {
      if (data.success && data.user) {
        // Update AuthContext state
        setUser(data.user);
        
        // Update React Query cache
        queryClient.setQueryData(authKeys.user(), data.user);
        
        // Invalidate and refetch any auth-related queries
        queryClient.invalidateQueries({ queryKey: authKeys.all });
      }
    },
    onError: (error) => {
      console.error('Register mutation error:', error);
      // Clear any stale auth data
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
  });
};

/**
 * Hook for logout mutation with React Query
 */
export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  const { logout: contextLogout } = useAuthContext();

  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => {
      // Update AuthContext state
      contextLogout();
      
      // Clear all React Query cache
      queryClient.clear();
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
      // Even if logout fails, clear local state
      contextLogout();
      queryClient.clear();
    },
  });
};

/**
 * Hook for profile update mutation with React Query
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthContext();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) =>
      AuthService.updateProfile(userId, updates),
    onMutate: async ({ updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: authKeys.user() });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData<User>(authKeys.user());

      // Optimistically update to the new value
      if (previousUser) {
        const optimisticUser = { ...previousUser, ...updates };
        queryClient.setQueryData(authKeys.user(), optimisticUser);
        updateUser(optimisticUser);
      }

      // Return a context object with the snapshotted value
      return { previousUser };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUser) {
        queryClient.setQueryData(authKeys.user(), context.previousUser);
        updateUser(context.previousUser);
      }
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        // Update AuthContext state with server response
        updateUser(data.user);
        
        // Update React Query cache with server response
        queryClient.setQueryData(authKeys.user(), data.user);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
};

/**
 * Hook for getting current user with React Query
 */
export const useCurrentUser = () => {
  const { user, isAuthenticated } = useAuthContext();

  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => AuthService.getCurrentUser(),
    enabled: isAuthenticated, // Only fetch if user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry auth queries
    refetchOnWindowFocus: true, // Revalidate when app becomes active
    initialData: user, // Use AuthContext user as initial data
  });
};

/**
 * Hook for checking authentication status
 */
export const useAuthStatus = () => {
  return useQuery({
    queryKey: [...authKeys.all, 'status'],
    queryFn: () => AuthService.isAuthenticated(),
    staleTime: 0, // Always check auth status
    gcTime: 0, // Don't cache auth status
    retry: false,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook for token refresh mutation
 */
export const useRefreshTokenMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AuthService.refreshToken(),
    onSuccess: () => {
      // Invalidate all queries to refetch with new token
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('Token refresh error:', error);
      // If refresh fails, logout user
      queryClient.clear();
    },
  });
};

/**
 * Combined auth hook that provides all auth operations
 */
export const useAuthOperations = () => {
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const refreshTokenMutation = useRefreshTokenMutation();
  const currentUserQuery = useCurrentUser();
  const authStatusQuery = useAuthStatus();

  return {
    // Mutations
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    refreshToken: refreshTokenMutation.mutateAsync,
    
    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isRefreshingToken: refreshTokenMutation.isPending,
    
    // Query data
    currentUser: currentUserQuery.data,
    isAuthenticated: authStatusQuery.data ?? false,
    
    // Query states
    isLoadingUser: currentUserQuery.isLoading,
    isLoadingAuthStatus: authStatusQuery.isLoading,
    
    // Errors
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    logoutError: logoutMutation.error,
    updateProfileError: updateProfileMutation.error,
    refreshTokenError: refreshTokenMutation.error,
    userError: currentUserQuery.error,
    authStatusError: authStatusQuery.error,
  };
};
