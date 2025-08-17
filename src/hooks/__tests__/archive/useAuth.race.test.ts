import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { 
  useLoginMutation, 
  useRegisterMutation, 
  useLogoutMutation,
  useUpdateProfileMutation,
  useCurrentUser,
  useAuthOperations
} from '../useAuth';
import { AuthService } from '../../services/authService';
import { User } from '../../types';

// Mock services
jest.mock('../../services/authService');
jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn().mockResolvedValue(undefined),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['test-channel'])
  })
}));

describe('useAuth Race Condition Tests', () => {
  let queryClient: QueryClient;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '555-0100',
    address: '123 Test St',
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  const mockUser2: User = {
    id: 'user-456',
    email: 'another@example.com',
    name: 'Another User',
    phone: '555-0200',
    address: '456 Test Ave',
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    (AuthService.getCurrentUser as jest.Mock).mockResolvedValue(null);
    (AuthService.isAuthenticated as jest.Mock).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Concurrent Authentication Mutations', () => {
    it('should handle rapid login attempts with same credentials', async () => {
      (AuthService.login as jest.Mock).mockResolvedValue({ user: mockUser, token: 'token-123' });

      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      // Fire multiple login attempts
      const promises = await act(async () => {
        return Promise.all([
          result.current.mutateAsync({ email: 'test@example.com', password: 'password' }),
          result.current.mutateAsync({ email: 'test@example.com', password: 'password' }),
          result.current.mutateAsync({ email: 'test@example.com', password: 'password' })
        ]);
      });

      // All should succeed with same user
      expect(promises).toHaveLength(3);
      promises.forEach(promise => {
        expect(promise.success).toBe(true);
        expect(promise.data?.user.id).toBe('user-123');
      });

      // Service should be called 3 times
      expect(AuthService.login).toHaveBeenCalledTimes(3);
    });

    it('should handle interleaved login/logout operations', async () => {
      (AuthService.login as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ user: mockUser, token: 'token' }), 100))
      );
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);
      (AuthService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const { result: loginResult } = renderHook(() => useLoginMutation(), { wrapper });
      const { result: logoutResult } = renderHook(() => useLogoutMutation(), { wrapper });

      await act(async () => {
        // Start login (slow)
        const loginPromise = loginResult.current.mutateAsync({ 
          email: 'test@example.com', 
          password: 'password' 
        });

        // Immediately logout (should cancel login effect)
        await logoutResult.current.mutateAsync();

        // Let login complete
        jest.advanceTimersByTime(100);
        await loginPromise;
      });

      // User should be logged out despite login completing
      const userQuery = queryClient.getQueryData(['auth', 'user']);
      expect(userQuery).toBeNull();
    });

    it('should handle concurrent login attempts with different users', async () => {
      let callCount = 0;
      (AuthService.login as jest.Mock).mockImplementation((email) => {
        callCount++;
        const user = email === 'test@example.com' ? mockUser : mockUser2;
        return Promise.resolve({ user, token: `token-${callCount}` });
      });

      const { result: result1 } = renderHook(() => useLoginMutation(), { wrapper });
      const { result: result2 } = renderHook(() => useLoginMutation(), { wrapper });

      // Login with different users simultaneously
      await act(async () => {
        const promise1 = result1.current.mutateAsync({ 
          email: 'test@example.com', 
          password: 'password1' 
        });
        const promise2 = result2.current.mutateAsync({ 
          email: 'another@example.com', 
          password: 'password2' 
        });

        await Promise.all([promise1, promise2]);
      });

      // Last login should win
      const currentUser = queryClient.getQueryData(['auth', 'user']) as User;
      expect(currentUser).toBeTruthy();
      expect([mockUser.id, mockUser2.id]).toContain(currentUser.id);
    });
  });

  describe('Registration Race Conditions', () => {
    it('should prevent duplicate registrations', async () => {
      let firstCall = true;
      (AuthService.register as jest.Mock).mockImplementation(() => {
        if (firstCall) {
          firstCall = false;
          return Promise.resolve({ user: mockUser });
        }
        return Promise.reject(new Error('User already exists'));
      });

      const { result } = renderHook(() => useRegisterMutation(), { wrapper });

      const registration = {
        email: 'new@example.com',
        password: 'password',
        name: 'New User',
        phone: '555-0300',
        address: '789 New St'
      };

      // Attempt duplicate registrations
      const results = await act(async () => {
        const promise1 = result.current.mutateAsync(registration).catch(e => e);
        const promise2 = result.current.mutateAsync(registration).catch(e => e);
        
        return Promise.all([promise1, promise2]);
      });

      // One should succeed, one should fail
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => r instanceof Error);
      
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].message).toContain('exists');
    });

    it('should handle register followed by immediate login', async () => {
      (AuthService.register as jest.Mock).mockResolvedValue({ user: mockUser });
      (AuthService.login as jest.Mock).mockResolvedValue({ user: mockUser, token: 'token' });

      const { result: registerResult } = renderHook(() => useRegisterMutation(), { wrapper });
      const { result: loginResult } = renderHook(() => useLoginMutation(), { wrapper });

      await act(async () => {
        // Register
        await registerResult.current.mutateAsync({
          email: 'new@example.com',
          password: 'password',
          name: 'New User',
          phone: '555-0300',
          address: '789 New St'
        });

        // Immediately login
        await loginResult.current.mutateAsync({
          email: 'new@example.com',
          password: 'password'
        });
      });

      // Should be logged in
      const currentUser = queryClient.getQueryData(['auth', 'user']) as User;
      expect(currentUser).toEqual(mockUser);
    });
  });

  describe('Profile Update Race Conditions', () => {
    it('should handle concurrent profile updates', async () => {
      (AuthService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      
      let updateCount = 0;
      (AuthService.updateProfile as jest.Mock).mockImplementation((userId, updates) => {
        updateCount++;
        return Promise.resolve({ 
          user: { ...mockUser, ...updates, version: updateCount } 
        });
      });

      const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

      // Set initial user
      queryClient.setQueryData(['auth', 'user'], mockUser);

      // Concurrent updates
      await act(async () => {
        const promise1 = result.current.mutateAsync({
          userId: mockUser.id,
          updates: { name: 'Updated Name 1' }
        });
        const promise2 = result.current.mutateAsync({
          userId: mockUser.id,
          updates: { phone: '555-9999' }
        });
        const promise3 = result.current.mutateAsync({
          userId: mockUser.id,
          updates: { address: 'New Address' }
        });

        await Promise.all([promise1, promise2, promise3]);
      });

      // All updates should be applied
      expect(updateCount).toBe(3);
      
      // Last update wins in cache
      const currentUser = queryClient.getQueryData(['auth', 'user']) as User & { version: number };
      expect(currentUser.version).toBe(3);
    });

    it('should handle profile update during logout', async () => {
      (AuthService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (AuthService.updateProfile as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ user: mockUser }), 100))
      );
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      const { result: updateResult } = renderHook(() => useUpdateProfileMutation(), { wrapper });
      const { result: logoutResult } = renderHook(() => useLogoutMutation(), { wrapper });

      // Set initial user
      queryClient.setQueryData(['auth', 'user'], mockUser);

      await act(async () => {
        // Start profile update (slow)
        const updatePromise = updateResult.current.mutateAsync({
          userId: mockUser.id,
          updates: { name: 'Updated Name' }
        }).catch(e => e);

        // Immediately logout
        await logoutResult.current.mutateAsync();

        // Let update complete
        jest.advanceTimersByTime(100);
        await updatePromise;
      });

      // User should be null after logout
      const currentUser = queryClient.getQueryData(['auth', 'user']);
      expect(currentUser).toBeNull();
    });

    it('should maintain optimistic updates during network delay', async () => {
      (AuthService.updateProfile as jest.Mock).mockImplementation(
        (userId, updates) => new Promise(resolve => 
          setTimeout(() => resolve({ user: { ...mockUser, ...updates } }), 1000)
        )
      );

      const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

      // Set initial user
      queryClient.setQueryData(['auth', 'user'], mockUser);

      await act(async () => {
        const promise = result.current.mutateAsync({
          userId: mockUser.id,
          updates: { name: 'Optimistic Name' }
        });

        // Check optimistic update immediately
        const optimisticUser = queryClient.getQueryData(['auth', 'user']) as User;
        expect(optimisticUser.name).toBe('Optimistic Name');

        // Fast-forward and complete
        jest.advanceTimersByTime(1000);
        await promise;
      });

      // Final state should match optimistic update
      const finalUser = queryClient.getQueryData(['auth', 'user']) as User;
      expect(finalUser.name).toBe('Optimistic Name');
    });
  });

  describe('Token Refresh Race Conditions', () => {
    it('should handle concurrent token refresh attempts', async () => {
      let refreshCount = 0;
      (AuthService.refreshToken as jest.Mock).mockImplementation(() => {
        refreshCount++;
        return Promise.resolve({ accessToken: `token-${refreshCount}` });
      });

      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      // Multiple components trying to refresh simultaneously
      await act(async () => {
        const promises = Promise.all([
          result.current.refreshTokenAsync(),
          result.current.refreshTokenAsync(),
          result.current.refreshTokenAsync()
        ]);

        await promises;
      });

      // All refresh attempts should complete
      expect(refreshCount).toBe(3);
    });

    it('should handle token refresh during logout', async () => {
      (AuthService.refreshToken as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ accessToken: 'new-token' }), 100))
      );
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      // Set initial user
      queryClient.setQueryData(['auth', 'user'], mockUser);

      await act(async () => {
        // Start token refresh (slow)
        const refreshPromise = result.current.refreshTokenAsync().catch(e => e);

        // Immediately logout
        await result.current.logoutAsync();

        // Let refresh complete
        jest.advanceTimersByTime(100);
        await refreshPromise;
      });

      // User should be null after logout
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Authentication State Consistency', () => {
    it('should maintain consistency across multiple hooks', async () => {
      (AuthService.login as jest.Mock).mockResolvedValue({ user: mockUser, token: 'token' });

      // Multiple component instances
      const { result: result1 } = renderHook(() => useAuthOperations(), { wrapper });
      const { result: result2 } = renderHook(() => useCurrentUser(), { wrapper });
      const { result: result3 } = renderHook(() => useLoginMutation(), { wrapper });

      // Login from one component
      await act(async () => {
        await result3.current.mutateAsync({
          email: 'test@example.com',
          password: 'password'
        });
      });

      // All should see the same user
      await waitFor(() => {
        expect(result1.current.currentUser).toEqual(mockUser);
        expect(result2.current.data).toEqual(mockUser);
      });
    });

    it('should handle rapid login/logout cycles', async () => {
      (AuthService.login as jest.Mock).mockResolvedValue({ user: mockUser, token: 'token' });
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthOperations(), { wrapper });

      // Rapid cycles
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          await result.current.loginAsync({
            email: 'test@example.com',
            password: 'password'
          });
          await result.current.logoutAsync();
        }
      });

      // Should end up logged out
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle authentication check during pending operations', async () => {
      (AuthService.getCurrentUser as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockUser), 500))
      );

      const { result: userResult } = renderHook(() => useCurrentUser(), { wrapper });
      const { result: authResult } = renderHook(() => useAuthOperations(), { wrapper });

      // Start checking current user
      expect(userResult.current.isLoading).toBe(true);

      // Try to perform operations while loading
      act(() => {
        // These should be safe even while loading
        expect(authResult.current.isLoadingUser).toBe(true);
        expect(authResult.current.currentUser).toBeNull();
      });

      // Fast-forward to complete
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(userResult.current.data).toEqual(mockUser);
        expect(authResult.current.currentUser).toEqual(mockUser);
      });
    });
  });

  describe('Error Recovery Race Conditions', () => {
    it('should recover from network errors with retry', async () => {
      let attemptCount = 0;
      (AuthService.login as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ user: mockUser, token: 'token' });
      });

      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      // First attempt fails
      await act(async () => {
        try {
          await result.current.mutateAsync({
            email: 'test@example.com',
            password: 'password'
          });
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      // Second attempt succeeds
      await act(async () => {
        const success = await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password'
        });
        expect(success.success).toBe(true);
      });

      expect(attemptCount).toBe(2);
    });

    it('should handle expired token during operations', async () => {
      (AuthService.getCurrentUser as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(new Error('Token expired'))
        .mockResolvedValueOnce(null);

      const { result, rerender } = renderHook(() => useCurrentUser(), { wrapper });

      // Initial load succeeds
      await waitFor(() => {
        expect(result.current.data).toEqual(mockUser);
      });

      // Force refetch (simulating token expiry)
      await act(async () => {
        result.current.refetch();
      });

      // Should handle error gracefully
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle rollback on failed optimistic update', async () => {
      (AuthService.updateProfile as jest.Mock).mockRejectedValue(new Error('Validation error'));

      const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });

      // Set initial user
      const initialUser = { ...mockUser };
      queryClient.setQueryData(['auth', 'user'], initialUser);

      await act(async () => {
        try {
          await result.current.mutateAsync({
            userId: mockUser.id,
            updates: { name: 'Invalid Name!!!' }
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Should rollback to initial state
      const currentUser = queryClient.getQueryData(['auth', 'user']) as User;
      expect(currentUser).toEqual(initialUser);
    });
  });
});