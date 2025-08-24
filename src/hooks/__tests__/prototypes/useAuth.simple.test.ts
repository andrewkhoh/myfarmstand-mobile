/**
 * Simple useAuth Test - Testing the import and basic functionality
 */

// Mock AuthService properly
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

// Mock other dependencies
jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn(),
  }),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { AuthService } from '../../services/authService';
import { useLoginMutation } from '../useAuth';
import { createWrapper } from '../../test/test-utils';

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('useAuth - Simple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useLoginMutation should be a function', () => {
    expect(typeof useLoginMutation).toBe('function');
  });

  test('useLoginMutation should work', async () => {
    const loginResponse = {
      success: true,
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };
    
    mockAuthService.login.mockResolvedValue(loginResponse);

    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });
});