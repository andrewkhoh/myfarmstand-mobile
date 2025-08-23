import { renderHook, waitFor } from '@testing-library/react-native';
import { NoShowHandlingService } from '../../services/noShowHandlingService';
import { useNoShowHandling } from '../useNoShowHandling';
import { useCurrentUser } from '../useAuth';
import { createWrapper } from '../../test/test-utils';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../test/contracts/hook.contracts';

jest.mock('../../services/noShowHandlingService');
const mockNoShowHandlingService = NoShowHandlingService as jest.Mocked<typeof NoShowHandlingService>;

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/broadcastFactory', () => ({
  orderBroadcast: {
    send: jest.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin' as const,
};

describe('useNoShowHandling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);
  });

  it('should provide no-show handling functionality', () => {
    const { result } = renderHook(() => useNoShowHandling(), {
      wrapper: createWrapper(),
    });

    expect(result.current.processNoShowOrders).toBeDefined();
    expect(result.current.processNoShowOrdersAsync).toBeDefined();
    expect(result.current.processNoShowOrders).toBeDefined();
    expect(result.current.processNoShowOrdersAsync).toBeDefined();
    expect(typeof result.current.isProcessingNoShow).toBe('boolean');
    expect(typeof result.current.isCheckingOverdue).toBe('boolean');
  });

  it('should process no-show orders successfully', async () => {
    const mockResult = {
      success: true,
      processedOrders: [
        {
          orderId: 'order123',
          customerName: 'Test Customer',
          action: 'cancelled' as const,
          stockRestored: true,
          notificationSent: true,
        },
      ],
      errors: [],
      message: 'No-show orders processed',
    };
    mockNoShowHandlingService.processNoShowOrders.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useNoShowHandling(), {
      wrapper: createWrapper(),
    });

    const config = { maxHours: 24, notifyCustomers: true };
    result.current.processNoShowOrders(config);

    await waitFor(() => {
      expect(result.current.isProcessingNoShow).toBe(false);
    });

    expect(mockNoShowHandlingService.processNoShowOrders).toHaveBeenCalledWith(config);
  });

  it('should handle processing failure', async () => {
    mockNoShowHandlingService.processNoShowOrders.mockRejectedValue(new Error('Processing failed'));

    const { result } = renderHook(() => useNoShowHandling(), {
      wrapper: createWrapper(),
    });

    const config = { maxHours: 24, notifyCustomers: true };
    result.current.processNoShowOrders(config);

    await waitFor(() => {
      expect(result.current.processError).toBeTruthy();
    }, { timeout: 3000 });

    expect((result.current.processError as any)?.message).toContain('Processing failed');
  });

  it('should check overdue orders successfully', async () => {
    const mockResult = {
      success: true,
      processedOrders: [],
      errors: [],
      message: 'No overdue orders found',
    };
    mockNoShowHandlingService.processNoShowOrders.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useNoShowHandling(), {
      wrapper: createWrapper(),
    });

    result.current.processNoShowOrders({});

    await waitFor(() => {
      expect(result.current.isProcessingNoShow).toBe(false);
    });

    expect(mockNoShowHandlingService.processNoShowOrders).toHaveBeenCalled();
  });

  it('should provide async operations', async () => {
    const mockResult = createMockNoShowHandlingResult({
      message: 'No-show orders processed'
    });
    mockNoShowHandlingService.processNoShowOrders.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useNoShowHandling(), {
      wrapper: createWrapper(),
    });

    const config = { maxHours: 24, notifyCustomers: true };
    const response = await result.current.processNoShowOrdersAsync(config);

    expect(response.success).toBe(true);
    expect(mockNoShowHandlingService.processNoShowOrders).toHaveBeenCalledWith(config);
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should handle authentication error in mutation', async () => {
      const { result } = renderHook(() => useNoShowHandling(), {
        wrapper: createWrapper(),
      });

      result.current.processNoShowOrders({ maxHours: 24 });

      await waitFor(() => {
        expect(result.current.processError).toBeTruthy();
      });

      expect((result.current.processError as any)?.message).toContain('authenticated');
    });
  });
});