import { renderHook, waitFor } from '@testing-library/react-native';
import * as OrderService from '../../services/orderService';
import {
  useCustomerOrders,
  useOrders,
  useOrder,
  useOrderStats,
  useUserOrders,
  useUpdateOrderStatusMutation,
  useBulkUpdateOrderStatusMutation,
  useOrderOperations,
} from '../useOrders';
import { useCurrentUser } from '../useAuth';
import { createWrapper } from '../../test/test-utils';
import { createMockUser, createMockOrder } from '../../test/mockData';

jest.mock('../../services/orderService');
const mockOrderService = OrderService as jest.Mocked<typeof OrderService>;

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/queryKeyFactory', () => ({
  orderKeys: {
    list: (filters: any) => ['orders', 'list', filters],
    detail: (id: string) => ['orders', 'detail', id],
    stats: () => ['orders', 'stats'],
    all: (userId: string) => ['orders', userId],
  },
}));

const mockUser = createMockUser();
const mockOrder = createMockOrder();

describe('useOrders hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);
  });

  describe('useCustomerOrders', () => {
    it('should fetch customer orders successfully', async () => {
      const mockOrders = [mockOrder];
      mockOrderService.getCustomerOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => useCustomerOrders('test@example.com'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOrders);
      expect(mockOrderService.getCustomerOrders).toHaveBeenCalledWith('test@example.com');
    });

    it('should use current user email when no email provided', async () => {
      const mockOrders = [mockOrder];
      mockOrderService.getCustomerOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => useCustomerOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockOrderService.getCustomerOrders).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('useOrders', () => {
    it('should fetch all orders successfully', async () => {
      const mockOrders = [mockOrder, { ...mockOrder, id: 'order456' }];
      mockOrderService.getAllOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => useOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOrders);
      expect(mockOrderService.getAllOrders).toHaveBeenCalledWith({});
    });
  });

  describe('useOrder', () => {
    it('should fetch single order successfully', async () => {
      mockOrderService.getOrder.mockResolvedValue(mockOrder);

      const { result } = renderHook(() => useOrder('order123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOrder);
      expect(mockOrderService.getOrder).toHaveBeenCalledWith('order123');
    });
  });

  describe('useUpdateOrderStatusMutation', () => {
    it('should update order status successfully', async () => {
      const updatedOrder = { ...mockOrder, status: 'confirmed' };
      mockOrderService.updateOrderStatus.mockResolvedValue({
        success: true,
        order: updatedOrder,
      });

      const { result } = renderHook(() => useUpdateOrderStatusMutation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ orderId: 'order123', status: 'confirmed' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith('order123', 'confirmed');
    });
  });

  describe('useOrderOperations', () => {
    it('should provide all order operations', () => {
      const { result } = renderHook(() => useOrderOperations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.updateOrderStatus).toBeDefined();
      expect(result.current.updateOrderStatusAsync).toBeDefined();
      expect(result.current.bulkUpdateOrderStatus).toBeDefined();
      expect(result.current.bulkUpdateOrderStatusAsync).toBeDefined();
    });

    it('should provide loading states', () => {
      const { result } = renderHook(() => useOrderOperations(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.isUpdatingStatus).toBe('boolean');
      expect(typeof result.current.isBulkUpdating).toBe('boolean');
      expect(typeof result.current.isLoading).toBe('boolean');
    });
  });
});