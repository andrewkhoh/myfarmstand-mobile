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
  authKeys,
} from '../useAuth';
import { createWrapper } from '../../test/test-utils';
import { createMockUser, createMockLoginResponse, createMockRegisterResponse, createMockLogoutResponse } from '../../test/mockData';

jest.mock('../../services/authService');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn(),
  }),
}));

const mockUser = createMockUser({ id: '1' });

describe('useAuth hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useLoginMutation', () => {
    it('should successfully login a user', async () => {
      mockAuthService.login.mockResolvedValue(createMockLoginResponse({ user: mockUser }));

      const { result } = renderHook(() => useLoginMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
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
      mockAuthService.register.mockResolvedValue(createMockRegisterResponse({ user: mockUser }));

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
    });
  });

  describe('useLogoutMutation', () => {
    it('should successfully logout a user', async () => {
      mockAuthService.logout.mockResolvedValue(createMockLogoutResponse());

      const { result } = renderHook(() => useLogoutMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
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
      expect(authKeys.all).toEqual(['auth']);
      expect(authKeys.user()).toEqual(['auth', 'user']);
      expect(authKeys.profile('user123')).toEqual(['auth', 'profile', 'user123']);
      expect(authKeys.status()).toEqual(['auth', 'status']);
    });
  });
});