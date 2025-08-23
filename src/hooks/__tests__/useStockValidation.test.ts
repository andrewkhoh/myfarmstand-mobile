import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { createWrapper } from '../../test/test-utils';
import { useStockValidation } from '../useStockValidation';
import { useCurrentUser } from '../useAuth';
import { useCart } from '../useCart';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { createProduct } from '../../test/factories/product.factory';

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../useCart');
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn(),
  }),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({
          data: [
            { id: 'prod1', stock_quantity: 10, is_pre_order: false },
            { id: 'prod2', stock_quantity: 5, is_pre_order: true, min_pre_order_quantity: 2, max_pre_order_quantity: 20 }
          ],
          error: null
        })
      })
    })
  }
}));


const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer' as const,
};

const mockProduct = createProduct({ id: 'prod1', name: 'Test Product' });

describe('useStockValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);
    mockUseCart.mockReturnValue({
      getCartQuantity: jest.fn().mockReturnValue(0),
    } as any);
  });

  it('should provide stock validation functionality', () => {
    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.validateStock).toBeDefined();
    expect(result.current.getStockInfo).toBeDefined();
    expect(result.current.canAddOneMore).toBeDefined();
    expect(result.current.canAddQuantity).toBeDefined();
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.isRefreshing).toBe('boolean');
  });

  it('should validate stock successfully', async () => {
    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const validation = result.current.validateStock(mockProduct, 1);
    expect(validation.isValid).toBe(true);
    expect(validation.availableStock).toBe(10);
    expect(validation.canAddMore).toBe(true);
  });

  it('should handle insufficient stock', async () => {
    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const validation = result.current.validateStock(mockProduct, 15); // Request more than available
    expect(validation.isValid).toBe(false);
    expect(validation.message).toContain('Only 10 items available');
  });

  it('should provide stock information functions', async () => {
    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const stockInfo = result.current.getStockInfo(mockProduct);
    expect(stockInfo.availableStock).toBe(10);
    expect(stockInfo.currentCartQuantity).toBe(0);
    expect(stockInfo.remainingStock).toBe(10);
    
    expect(result.current.canAddOneMore('prod1')).toBe(true);
    expect(result.current.canAddQuantity(mockProduct, 5)).toBe(true);
    expect(result.current.getRemainingStock('prod1')).toBe(10);
  });

  it('should provide stock status messages', async () => {
    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const message = result.current.getStockStatusMessage(mockProduct);
    expect(message).toBe('10 available');
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should return authentication error state', () => {
      const { result } = renderHook(() => useStockValidation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.stockData).toEqual([]);
      expect((result.current.error as any)?.code).toBe('AUTHENTICATION_REQUIRED');
      expect(result.current.isLoading).toBe(false);
    });

    it('should provide safe no-op functions', () => {
      const { result } = renderHook(() => useStockValidation(), {
        wrapper: createWrapper(),
      });

      const validation = result.current.validateStock(mockProduct, 1);
      expect(validation.isValid).toBe(false);
      expect(validation.message).toBe('Please sign in to validate stock');
      
      expect(result.current.canAddOneMore('prod1')).toBe(false);
      expect(result.current.canAddQuantity(mockProduct, 1)).toBe(false);
    });
  });
});