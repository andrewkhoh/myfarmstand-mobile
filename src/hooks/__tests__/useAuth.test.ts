import { renderHook, waitFor } from '@testing-library/react-native';
import { AuthService } from '../../services/authService';
import {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useCurrentUser,
  useAuthStatus,
  useRefreshTokenMutation,
  useAuthOperations,
} from '../useAuth';
import { authKeys } from '../../utils/queryKeyFactory';
import { createWrapper } from '../../test/test-utils';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../test/contracts/hook.contracts';

jest.mock('../../services/authService');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn(),
  }),
}));

// Create test user with simplified mock
const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer' as const,
  phone: '555-0123',
  address: '123 Test St',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('useAuth hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useLoginMutation', () => {
    it('should successfully login a user', async () => {
      const loginResponse = {
        user: mockUser,
        session: {
          access_token: 'test-token',
          refresh_token: 'refresh-token',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      };
      mockAuthService.login.mockResolvedValue(loginResponse);

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      
      // Validate contract
      hookContracts.auth.validate('validateLogin', loginResponse);
    });

    it('should handle login errors', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ email: 'test@example.com', password: 'wrongpassword' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Invalid credentials');
    });
  });

  describe('useRegisterMutation', () => {
    it('should successfully register a user', async () => {
      const registerResponse = {
        user: mockUser,
        session: {
          access_token: 'test-token',
          refresh_token: 'refresh-token',
        },
      };
      mockAuthService.register.mockResolvedValue(registerResponse);

      const { result } = renderHook(() => useRegisterMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phone: '555-0123',
        address: '123 Test St',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthService.register).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User',
        '555-0123',
        '123 Test St'
      );
      
      // Validate contract
      hookContracts.auth.validate('validateRegister', registerResponse);
    });
  });

  describe('useLogoutMutation', () => {
    it('should successfully logout a user', async () => {
      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Logout now uses supabase.auth.signOut() directly, not AuthService.logout
      expect(result.current.data?.success).toBe(true);
    });
  });

  describe('useCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useAuthStatus', () => {
    it('should return authentication status', async () => {
      mockAuthService.isAuthenticated.mockResolvedValue(true);

      const { result } = renderHook(() => useAuthStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);
    });
  });

  describe('useAuthOperations', () => {
    it('should provide all auth operations', () => {
      const { result } = renderHook(() => useAuthOperations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.login).toBeDefined();
      expect(result.current.register).toBeDefined();
      expect(result.current.logout).toBeDefined();
      expect(result.current.updateProfile).toBeDefined();
      expect(result.current.refreshToken).toBeDefined();
    });

    it('should provide loading states', () => {
      const { result } = renderHook(() => useAuthOperations(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.isLoggingIn).toBe('boolean');
      expect(typeof result.current.isRegistering).toBe('boolean');
      expect(typeof result.current.isLoggingOut).toBe('boolean');
      expect(typeof result.current.isUpdatingProfile).toBe('boolean');
      expect(typeof result.current.isRefreshingToken).toBe('boolean');
      expect(typeof result.current.isLoadingUser).toBe('boolean');
      expect(typeof result.current.isLoadingAuthStatus).toBe('boolean');
    });
  });

  describe('authKeys', () => {
    it('should generate correct query keys', () => {
      expect(authKeys.all()).toEqual(['auth']);
      expect(authKeys.all('user123')).toEqual(['auth', 'user123']);
      expect(authKeys.details('user123')).toEqual(['auth', 'user123', 'detail']);
      expect(authKeys.detail('profile', 'user123')).toEqual(['auth', 'user123', 'detail', 'profile']);
    });
  });
});