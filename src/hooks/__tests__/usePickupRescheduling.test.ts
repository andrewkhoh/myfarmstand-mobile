import { renderHook, waitFor } from '@testing-library/react-native';
import { PickupReschedulingService } from '../../services/pickupReschedulingService';
import { usePickupRescheduling } from '../usePickupRescheduling';
import { useCurrentUser } from '../useAuth';
import { createWrapper } from '../../test/test-utils';
import { createMockUser, createMockRescheduleRequest } from '../../test/mockData';

jest.mock('../../services/pickupReschedulingService');
const mockPickupReschedulingService = PickupReschedulingService as jest.Mocked<typeof PickupReschedulingService>;

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/broadcastFactory', () => ({
  orderBroadcast: {
    send: jest.fn(),
  },
}));

const mockUser = createMockUser();

describe('usePickupRescheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);
  });

  it('should provide pickup rescheduling functionality', () => {
    const { result } = renderHook(() => usePickupRescheduling(), {
      wrapper: createWrapper(),
    });

    expect(result.current.reschedulePickup).toBeDefined();
    expect(result.current.reschedulePickupAsync).toBeDefined();
    expect(typeof result.current.isRescheduling).toBe('boolean');
  });

  it('should reschedule pickup successfully', async () => {
    const mockResult = { success: true, message: 'Pickup rescheduled' };
    mockPickupReschedulingService.reschedulePickup.mockResolvedValue(mockResult);

    const { result } = renderHook(() => usePickupRescheduling(), {
      wrapper: createWrapper(),
    });

    const rescheduleData = createMockRescheduleRequest();
    result.current.reschedulePickup(rescheduleData);

    await waitFor(() => {
      expect(result.current.isRescheduling).toBe(false);
    });

    expect(mockPickupReschedulingService.reschedulePickup).toHaveBeenCalledWith(rescheduleData);
  });

  it('should handle rescheduling failure', async () => {
    mockPickupReschedulingService.reschedulePickup.mockRejectedValue(new Error('Rescheduling failed'));

    const { result } = renderHook(() => usePickupRescheduling(), {
      wrapper: createWrapper(),
    });

    const rescheduleData = createMockRescheduleRequest();
    result.current.reschedulePickup(rescheduleData);

    await waitFor(() => {
      expect(result.current.rescheduleError).toBeTruthy();
    }, { timeout: 3000 });

    expect(result.current.rescheduleError?.message).toContain('Rescheduling failed');
  });

  it('should provide async rescheduling operation', async () => {
    const mockResult = { success: true, message: 'Pickup rescheduled' };
    mockPickupReschedulingService.reschedulePickup.mockResolvedValue(mockResult);

    const { result } = renderHook(() => usePickupRescheduling(), {
      wrapper: createWrapper(),
    });

    const rescheduleData = createMockRescheduleRequest();
    const response = await result.current.reschedulePickupAsync(rescheduleData);

    expect(response.success).toBe(true);
    expect(mockPickupReschedulingService.reschedulePickup).toHaveBeenCalledWith(rescheduleData);
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
      const { result } = renderHook(() => usePickupRescheduling(), {
        wrapper: createWrapper(),
      });

      result.current.reschedulePickup({ 
        orderId: 'order123', 
        newPickupDate: '2023-12-01',
        newPickupTime: '10:00',
        reason: 'Customer request',
        requestedBy: 'customer' as const
      });

      await waitFor(() => {
        expect(result.current.rescheduleError).toBeTruthy();
      });

      expect(result.current.rescheduleError?.message).toContain('authenticated');
    });
  });
});