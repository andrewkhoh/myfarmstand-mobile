import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { User } from '../types';
import { createBroadcastHelper } from '../utils/broadcastFactory';

// Enhanced interfaces following cart pattern
interface AuthError {
  code: 'INVALID_CREDENTIALS' | 'USER_EXISTS' | 'WEAK_PASSWORD' | 'NETWORK_ERROR' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  email?: string;
  userId?: string;
}

interface AuthOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: AuthError;
  data?: T;
}

interface AuthMutationContext {
  previousUser?: User | null;
  operationType: 'login' | 'register' | 'logout' | 'update-profile' | 'refresh-token' | 'change-password';
  metadata?: Record<string, any>;
}

// Enhanced error handling utility (following cart pattern)
const createAuthError = (
  code: AuthError['code'],
  message: string,
  userMessage: string,
  metadata?: { email?: string; userId?: string }
): AuthError => ({
  code,
  message,
  userMessage,
  ...metadata,
});

// Query key factory for auth operations (following cart pattern) - removed unused factory

// Broadcast helper for auth events (following cart pattern)
const authBroadcast = createBroadcastHelper({
  entity: 'auth',
  target: 'user-specific'
});

// Enhanced typed query functions (following cart pattern) - removed unused types for cleanup

// Enhanced typed mutation functions (following cart pattern) - removed unused types for cleanup

// Query keys for auth-related queries (enhanced following cart pattern)
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
  status: () => [...authKeys.all, 'status'] as const,
};

/**
 * Enhanced Hook for login mutation with React Query (following cart pattern)
 */
export const useLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthOperationResult<{ user: User; token?: string }>, Error, { email: string; password: string }, AuthMutationContext>({
    mutationFn: async ({ email, password }): Promise<AuthOperationResult<{ user: User; token?: string }>> => {
      try {
        console.log('🔐 Login mutation starting for:', email);
        const result = await AuthService.login(email, password);
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('credentials') || error.message?.includes('password')) {
          throw createAuthError(
            'INVALID_CREDENTIALS',
            error.message,
            'Invalid email or password. Please try again.',
            { email }
          );
        }
        if (error.message?.includes('network') || error.message?.includes('connection')) {
          throw createAuthError(
            'NETWORK_ERROR',
            error.message,
            'Connection failed. Please check your internet and try again.'
          );
        }
        throw createAuthError(
          'UNKNOWN_ERROR',
          error.message || 'Login failed',
          'Unable to sign in. Please try again.'
        );
      }
    },
    onMutate: async ({ email }): Promise<AuthMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: authKeys.user() });
      
      // Snapshot previous value (following cart pattern)
      const previousUser = queryClient.getQueryData<User | null>(authKeys.user());
      
      return { 
        previousUser, 
        operationType: 'login',
        metadata: { email }
      };
    },
    onError: (error: AuthError, variables: { email: string; password: string }, context?: AuthMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousUser !== undefined) {
        queryClient.setQueryData(authKeys.user(), context.previousUser);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Login mutation failed:', {
        error: error.message,
        userMessage: (error as AuthError).userMessage,
        email: variables.email
      });
    },
    onSuccess: async (result: AuthOperationResult<{ user: User; token?: string }>, _variables: { email: string; password: string }) => {
      if (result.success && result.data) {
        console.log('✅ Login successful:', result.data.user.email);
        
        // Set user data in cache
        queryClient.setQueryData(authKeys.user(), result.data.user);
        
        // Broadcast success (following cart pattern)
        await authBroadcast.send('user-logged-in', {
          userId: result.data.user.id,
          email: result.data.user.email,
          timestamp: new Date().toISOString()
        });
      }
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on invalid credentials
      if ((error as AuthError).code === 'INVALID_CREDENTIALS') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
};

/**
 * Enhanced Hook for register mutation with React Query (following cart pattern)
 */
export const useRegisterMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthOperationResult<{ user: User }>, Error, { email: string; password: string; name: string; phone: string; address: string }, AuthMutationContext>({
    mutationFn: async ({
      email,
      password,
      name,
      phone,
      address,
    }): Promise<AuthOperationResult<{ user: User }>> => {
      try {
        const result = await AuthService.register(email, password, name, phone, address);
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('exists') || error.message?.includes('already')) {
          throw createAuthError(
            'USER_EXISTS',
            error.message,
            'An account with this email already exists. Please try signing in instead.',
            { email }
          );
        }
        if (error.message?.includes('password') && error.message?.includes('weak')) {
          throw createAuthError(
            'WEAK_PASSWORD',
            error.message,
            'Password is too weak. Please choose a stronger password.'
          );
        }
        throw createAuthError(
          'UNKNOWN_ERROR',
          error.message || 'Registration failed',
          'Unable to create account. Please try again.'
        );
      }
    },
    onMutate: async ({ email }): Promise<AuthMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: authKeys.user() });
      
      // Snapshot previous value (following cart pattern)
      const previousUser = queryClient.getQueryData<User | null>(authKeys.user());
      
      return { 
        previousUser, 
        operationType: 'register',
        metadata: { email }
      };
    },
    onError: (error: AuthError, variables, context?: AuthMutationContext) => {
      // Rollback on error (following cart pattern)
      if (context?.previousUser !== undefined) {
        queryClient.setQueryData(authKeys.user(), context.previousUser);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Register mutation failed:', {
        error: error.message,
        userMessage: (error as AuthError).userMessage,
        email: variables.email
      });
      
      // Clear any stale auth data on registration failure
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
    onSuccess: async (result: AuthOperationResult<{ user: User }>, _variables) => {
      if (result.success && result.data) {
        // Update React Query cache only
        queryClient.setQueryData(authKeys.user(), result.data.user);
        
        // Smart invalidation strategy (following cart pattern)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: authKeys.all }),
          queryClient.invalidateQueries({ queryKey: authKeys.status() })
        ]);
        
        // Broadcast success (following cart pattern)
        await authBroadcast.send('user-registered', {
          userId: result.data.user.id,
          email: result.data.user.email,
          timestamp: new Date().toISOString()
        });
      }
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on user exists or weak password
      if ((error as AuthError).code === 'USER_EXISTS' || (error as AuthError).code === 'WEAK_PASSWORD') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
};

/**
 * Enhanced Hook for logout mutation with React Query (following cart pattern)
 */
export const useLogoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthOperationResult<void>, Error, undefined, AuthMutationContext>({
    mutationFn: async (): Promise<AuthOperationResult<void>> => {
      console.log('🚪 Simple logout starting...');
      
      try {
        // Force global signout to clear all sessions
        const { supabase } = await import('../config/supabase');
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        
        if (error) {
          console.warn('⚠️ Signout error:', error.message);
        }
        
        // Verify session is cleared
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 After logout - session still exists?', !!session?.user);
        
        console.log('✅ Supabase global signout complete');
        return { success: true };
      } catch (error) {
        console.error('❌ Logout error:', error);
        // Even if signout fails, we'll continue with React Query cleanup
        return { success: true };
      }
    },
    onMutate: async (): Promise<AuthMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: authKeys.user() });
      
      // Snapshot previous value (following cart pattern)
      const previousUser = queryClient.getQueryData<User | null>(authKeys.user());
      
      return { 
        previousUser, 
        operationType: 'logout',
        metadata: {}
      };
    },
    onError: (error: AuthError, _variables: undefined, _context?: AuthMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Logout mutation failed:', {
        error: error.message,
        userMessage: (error as AuthError).userMessage
      });
      
      // Even if logout fails, clear states for security (targeted approach)
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      
      // Clear sensitive data only
      Promise.all([
        queryClient.removeQueries({ queryKey: ['cart'] }),
        queryClient.removeQueries({ queryKey: ['orders'] }),
        queryClient.removeQueries({ queryKey: ['auth'] }),
      ]).catch(error => console.warn('Cache cleanup error:', error));
    },
    onSuccess: (_result: AuthOperationResult<void>, _variables: undefined, context?: AuthMutationContext) => {
      console.log('✅ Logout successful - clearing sensitive data...');
      
      // React Query logout pattern: Preserve observers, clear data
      // 🚨 NEVER: queryClient.clear() - destroys observers, breaks subsequent reactivity
      // ✅ ALWAYS: queryClient.setQueryData(key, value) - preserves observers, maintains reactivity
      queryClient.setQueryData(authKeys.user(), null);
      
      // Security: Clear all sensitive user data while preserving observers where possible
      queryClient.removeQueries({ queryKey: ['cart'] });
      queryClient.removeQueries({ queryKey: ['orders'] }); 
      
      // Clear any other user-specific data (profile, settings, etc.)
      queryClient.removeQueries({ queryKey: ['profile'] });
      queryClient.removeQueries({ queryKey: ['settings'] });
      
      // Note: Keep general product cache - it's not user-specific
      
      console.log('🔒 Sensitive data cleared, auth observers preserved');
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, _error: any) => {
      // Limited retries for logout
      return failureCount < 1;
    },
    retryDelay: 1000,
  });
};

/**
 * Enhanced Hook for profile update mutation with React Query (following cart pattern)
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthOperationResult<{ user: User }>, Error, { userId: string; updates: Partial<User> }, AuthMutationContext>({
    mutationFn: async ({ userId, updates }): Promise<AuthOperationResult<{ user: User }>> => {
      try {
        const result = await AuthService.updateProfile(userId, updates);
        return { success: true, data: result };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('unauthorized')) {
          throw createAuthError(
            'UNAUTHORIZED',
            error.message,
            'Session expired. Please sign in again.',
            { userId }
          );
        }
        if (error.message?.includes('validation')) {
          throw createAuthError(
            'UNKNOWN_ERROR',
            error.message,
            'Invalid profile data. Please check your information.',
            { userId }
          );
        }
        throw createAuthError(
          'UNKNOWN_ERROR',
          error.message || 'Profile update failed',
          'Unable to update profile. Please try again.',
          { userId }
        );
      }
    },
    onMutate: async ({ updates, userId }): Promise<AuthMutationContext> => {
      // Cancel any outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: authKeys.user() });

      // Snapshot the previous value (following cart pattern)
      const previousUser = queryClient.getQueryData<User | null>(authKeys.user());

      // Optimistically update to the new value (following cart pattern)
      if (previousUser) {
        const optimisticUser = { ...previousUser, ...updates };
        queryClient.setQueryData(authKeys.user(), optimisticUser);
      }

      return { 
        previousUser, 
        operationType: 'update-profile',
        metadata: { updates, userId }
      };
    },
    onError: (error: AuthError, variables: { userId: string; updates: Partial<User> }, context?: AuthMutationContext) => {
      // Enhanced rollback on error (following cart pattern)
      if (context?.previousUser !== undefined) {
        queryClient.setQueryData(authKeys.user(), context.previousUser);
      }
      
      // Enhanced error logging (following cart pattern)
      console.error('❌ Update profile failed:', {
        error: error.message,
        userMessage: (error as AuthError).userMessage,
        userId: variables.userId
      });
    },
    onSuccess: async (result: AuthOperationResult<{ user: User }>, variables: { userId: string; updates: Partial<User> }) => {
      if (result.success && result.data) {
        console.log('✅ Profile update successful:', result.data.user.id);
        
        // Update React Query cache with server response (following cart pattern)
        queryClient.setQueryData(authKeys.user(), result.data.user);
        
        // Smart invalidation strategy (following cart pattern)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: authKeys.user() }),
          queryClient.invalidateQueries({ queryKey: authKeys.profile(variables.userId) })
        ]);
        
        // Broadcast success (following cart pattern)
        await authBroadcast.send('user-profile-updated', {
          userId: result.data.user.id,
          timestamp: new Date().toISOString()
        });
      }
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on unauthorized errors
      if ((error as AuthError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    // ✅ NO onSettled - invalidation happens in onSuccess only (following cart pattern)
  });
};

/**
 * Enhanced Hook for password change mutation with React Query (following cart pattern)
 */
export const useChangePasswordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthOperationResult<void>, Error, { currentPassword: string; newPassword: string }, AuthMutationContext>({
    mutationFn: async ({ currentPassword, newPassword }): Promise<AuthOperationResult<void>> => {
      try {
        await AuthService.changePassword(currentPassword, newPassword);
        return { success: true };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('current password') || error.message?.includes('incorrect')) {
          throw createAuthError(
            'INVALID_CREDENTIALS',
            error.message,
            'Current password is incorrect. Please try again.'
          );
        }
        if (error.message?.includes('weak') || error.message?.includes('strength')) {
          throw createAuthError(
            'WEAK_PASSWORD',
            error.message,
            'New password is too weak. Please choose a stronger password.'
          );
        }
        if (error.message?.includes('unauthorized')) {
          throw createAuthError(
            'UNAUTHORIZED',
            error.message,
            'Session expired. Please sign in again.'
          );
        }
        throw createAuthError(
          'UNKNOWN_ERROR',
          error.message || 'Password change failed',
          'Unable to change password. Please try again.'
        );
      }
    },
    onMutate: async (): Promise<AuthMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: authKeys.user() });
      
      // Snapshot previous value (following cart pattern)
      const previousUser = queryClient.getQueryData<User | null>(authKeys.user());
      
      return { 
        previousUser, 
        operationType: 'change-password',
        metadata: {}
      };
    },
    onError: (error: AuthError, _variables: { currentPassword: string; newPassword: string }, _context?: AuthMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Password change failed:', {
        error: error.message,
        userMessage: (error as AuthError).userMessage
      });
    },
    onSuccess: async (_result: AuthOperationResult<void>) => {
      console.log('✅ Password changed successfully');
      
      // No cache updates needed for password change, but refresh user session
      await queryClient.invalidateQueries({ queryKey: authKeys.user() });
      
      // Broadcast success (following cart pattern)
      await authBroadcast.send('user-password-changed', {
        timestamp: new Date().toISOString()
      });
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on credential or unauthorized errors
      if ((error as AuthError).code === 'INVALID_CREDENTIALS' || (error as AuthError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
};

/**
 * Enhanced Hook for getting current user with React Query (following cart pattern)
 */
export const useCurrentUser = () => {
  const query = useQuery({
    queryKey: authKeys.user(),
    queryFn: async (): Promise<User | null> => {
      try {
        const result = await AuthService.getCurrentUser();
        return result || null;
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('token') || error.message?.includes('expired')) {
          throw createAuthError(
            'TOKEN_EXPIRED',
            error.message,
            'Your session has expired. Please sign in again.'
          );
        }
        if (error.message?.includes('unauthorized')) {
          throw createAuthError(
            'UNAUTHORIZED',
            error.message,
            'Please sign in to continue.'
          );
        }
        throw createAuthError(
          'NETWORK_ERROR',
          error.message || 'Failed to get user',
          'Unable to verify your session. Please try again.'
        );
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message?.includes('token') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  
  return query;
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
 * Enhanced Hook for token refresh mutation with React Query (following cart pattern)
 */
export const useRefreshTokenMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthOperationResult<{ token: string }>, Error, undefined, AuthMutationContext>({
    mutationFn: async (): Promise<AuthOperationResult<{ token: string }>> => {
      try {
        const result = await AuthService.refreshToken();
        return { success: true, data: { token: result.accessToken || '' } };
      } catch (error: any) {
        // Enhanced error classification (following cart pattern)
        if (error.message?.includes('token') || error.message?.includes('expired')) {
          throw createAuthError(
            'TOKEN_EXPIRED',
            error.message,
            'Your session has expired. Please sign in again.'
          );
        }
        if (error.message?.includes('unauthorized')) {
          throw createAuthError(
            'UNAUTHORIZED',
            error.message,
            'Authentication failed. Please sign in again.'
          );
        }
        throw createAuthError(
          'NETWORK_ERROR',
          error.message || 'Token refresh failed',
          'Unable to refresh session. Please sign in again.'
        );
      }
    },
    onMutate: async (): Promise<AuthMutationContext> => {
      // Cancel outgoing refetches (following cart pattern)
      await queryClient.cancelQueries({ queryKey: authKeys.user() });
      
      // Snapshot previous value (following cart pattern)
      const previousUser = queryClient.getQueryData<User | null>(authKeys.user());
      
      return { 
        previousUser, 
        operationType: 'refresh-token',
        metadata: {}
      };
    },
    onError: (error: AuthError, _variables: undefined, _context?: AuthMutationContext) => {
      // Enhanced error logging (following cart pattern)
      console.error('❌ Token refresh failed:', {
        error: error.message,
        userMessage: (error as AuthError).userMessage
      });
      
      // If refresh fails, clear user data for security (following cart pattern)
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.clear();
    },
    onSuccess: async (result: AuthOperationResult<{ token: string }>) => {
      if (result.success && result.data) {
        console.log('✅ Token refresh successful');
        
        // Smart invalidation strategy - invalidate all queries to refetch with new token (following cart pattern)
        await queryClient.invalidateQueries();
        
        // Broadcast success (following cart pattern)
        await authBroadcast.send('user-token-refreshed', {
          timestamp: new Date().toISOString()
        });
      }
    },
    // Enhanced retry logic (following cart pattern)
    retry: (failureCount, error: any) => {
      // Don't retry on token expired or unauthorized
      if ((error as AuthError).code === 'TOKEN_EXPIRED' || (error as AuthError).code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 1; // Limited retries for token refresh
    },
    retryDelay: 1000,
  });
};

/**
 * Enhanced Combined auth hook that provides all auth operations (following cart pattern)
 */
export const useAuthOperations = () => {
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const refreshTokenMutation = useRefreshTokenMutation();
  const currentUserQuery = useCurrentUser();
  const authStatusQuery = useAuthStatus();

  // Enhanced utility functions with useCallback (following cart pattern)
  const getAuthQueryKey = useCallback(() => authKeys.user(), []);
  const getAuthStatusQueryKey = useCallback(() => authKeys.status(), []);

  return {
    // Direct mutation functions (following cart pattern - single source of truth)
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    refreshToken: refreshTokenMutation.mutate,
    
    // Async mutation functions (following cart pattern)
    loginAsync: loginMutation.mutateAsync,
    registerAsync: registerMutation.mutateAsync,
    logoutAsync: logoutMutation.mutateAsync,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    refreshTokenAsync: refreshTokenMutation.mutateAsync,
    
    // Mutation states (following cart pattern)
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isRefreshingToken: refreshTokenMutation.isPending,
    
    // Query data (following cart pattern)
    currentUser: currentUserQuery.data || null,
    isAuthenticated: authStatusQuery.data ?? false,
    
    // Query states (following cart pattern)
    isLoadingUser: currentUserQuery.isLoading,
    isLoadingAuthStatus: authStatusQuery.isLoading,
    
    // Enhanced error states (following cart pattern)
    loginError: loginMutation.error ? createAuthError(
      'UNKNOWN_ERROR',
      loginMutation.error.message,
      'Login failed'
    ) : null,
    registerError: registerMutation.error ? createAuthError(
      'UNKNOWN_ERROR',
      registerMutation.error.message,
      'Registration failed'
    ) : null,
    logoutError: logoutMutation.error ? createAuthError(
      'UNKNOWN_ERROR',
      logoutMutation.error.message,
      'Logout failed'
    ) : null,
    updateProfileError: updateProfileMutation.error ? createAuthError(
      'UNKNOWN_ERROR',
      updateProfileMutation.error.message,
      'Profile update failed'
    ) : null,
    refreshTokenError: refreshTokenMutation.error ? createAuthError(
      'TOKEN_EXPIRED',
      refreshTokenMutation.error.message,
      'Session refresh failed'
    ) : null,
    userError: currentUserQuery.error ? createAuthError(
      'NETWORK_ERROR',
      currentUserQuery.error.message,
      'Unable to load user data'
    ) : null,
    authStatusError: authStatusQuery.error ? createAuthError(
      'NETWORK_ERROR',
      authStatusQuery.error.message,
      'Unable to check authentication status'
    ) : null,
    
    // Query keys for external use (following cart pattern)
    getAuthQueryKey,
    getAuthStatusQueryKey,
  };
};
