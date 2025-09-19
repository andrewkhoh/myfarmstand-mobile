/**
 * useAuth Hook Test - Working Pattern with New Infrastructure
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS
// ============================================================================

// 1. Mock services first (hooks should test hook logic, not service implementation)
jest.mock('../../services/authService', () => ({
  AuthService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    isAuthenticated: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    refreshToken: jest.fn(),
  }
}));

// 2. Mock broadcast factory
jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: jest.fn(() => ({
    send: jest.fn(),
  })),
}));

// 3. Mock validation (if needed)
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
  }
}));

// ============================================================================
// IMPORTS - AFTER MOCKS ARE SET UP
// ============================================================================

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLoginMutation, useAuthStatus } from '../useAuth';
import { AuthService } from '../../services/authService';

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

// ============================================================================
// TEST WRAPPER SETUP
// ============================================================================

// Create a wrapper that provides React Query context
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// ============================================================================
// TESTS
// ============================================================================

describe('useAuth Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useLoginMutation', () => {
    it('should handle successful login', async () => {
      const mockLoginResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      // Wait for hook to be ready
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Test the mutation
      await act(async () => {
        result.current.mutate({ 
          email: 'test@example.com', 
          password: 'password123' 
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.data).toEqual(mockLoginResponse);
    });

    it('should handle login error', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useLoginMutation(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      await act(async () => {
        result.current.mutate({ 
          email: 'test@example.com', 
          password: 'wrongpassword' 
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Invalid credentials');
    });
  });

  describe('useCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUser);
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useAuthStatus', () => {
    it('should return authentication status', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    });

    it('should handle unauthenticated state', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(false);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuthStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(false);
    });
  });
});