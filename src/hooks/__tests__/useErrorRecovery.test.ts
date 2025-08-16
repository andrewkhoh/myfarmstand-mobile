import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { createWrapper } from '../../test/test-utils';
import { ErrorRecoveryService } from '../../services/errorRecoveryService';
import { useErrorRecovery } from '../useErrorRecovery';
import { useCurrentUser } from '../useAuth';
import { createMockUser, createMockErrorRecoveryResult, createMockErrorContext } from '../../test/mockData';

jest.mock('../../services/errorRecoveryService');
const mockErrorRecoveryService = ErrorRecoveryService as jest.Mocked<typeof ErrorRecoveryService>;

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn(),
  }),
}));


const mockUser = createMockUser();

describe('useErrorRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);
  });

  it('should provide error recovery functionality', () => {
    const { result } = renderHook(() => useErrorRecovery(), {
      wrapper: createWrapper(),
    });

    expect(result.current.recoverFromError).toBeDefined();
    expect(result.current.recoverFromErrorAsync).toBeDefined();
    expect(typeof result.current.isRecovering).toBe('boolean');
  });

  it('should recover from error successfully', async () => {
    const mockResult = createMockErrorRecoveryResult({ message: 'Recovery successful' });
    mockErrorRecoveryService.recoverFromError.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useErrorRecovery(), {
      wrapper: createWrapper(),
    });

    const errorData = createMockErrorContext({ orderId: 'order123', errorType: 'payment_failed' });
    result.current.recoverFromError(errorData);

    await waitFor(() => {
      expect(result.current.isRecovering).toBe(false);
    });

    expect(mockErrorRecoveryService.recoverFromError).toHaveBeenCalledWith(errorData);
  });

  it('should handle recovery failure', async () => {
    mockErrorRecoveryService.recoverFromError.mockRejectedValue(new Error('Recovery failed'));

    const { result } = renderHook(() => useErrorRecovery(), {
      wrapper: createWrapper(),
    });

    const errorData = createMockErrorContext({ orderId: 'order123', errorType: 'payment_failed' });
    result.current.recoverFromError(errorData);

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 3000 });

    expect(result.current.error?.message).toContain('Recovery failed');
  });

  it('should provide async recovery operation', async () => {
    const mockResult = createMockErrorRecoveryResult({ message: 'Recovery successful' });
    mockErrorRecoveryService.recoverFromError.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useErrorRecovery(), {
      wrapper: createWrapper(),
    });

    const errorData = { orderId: 'order123', errorType: 'payment_failed' };
    const response = await result.current.recoverFromErrorAsync(errorData);

    expect(response.success).toBe(true);
    expect(mockErrorRecoveryService.recoverFromError).toHaveBeenCalledWith(errorData);
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should block operations when not authenticated', () => {
      const { result } = renderHook(() => useErrorRecovery(), {
        wrapper: createWrapper(),
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      result.current.recoverFromError({ orderId: 'order123', errorType: 'payment_failed' });

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Error recovery operation blocked: User not authenticated');

      consoleSpy.mockRestore();
    });
  });
});