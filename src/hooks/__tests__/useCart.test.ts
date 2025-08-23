// Mock broadcast factory BEFORE any other imports
jest.mock('../../utils/broadcastFactory', () => {
  const mockBroadcastHelper = {
    send: jest.fn(),
    getAuthorizedChannelNames: jest.fn(() => ['test-channel'])
  };
  
  return {
    createBroadcastHelper: jest.fn(() => mockBroadcastHelper),
    cartBroadcast: mockBroadcastHelper,
    orderBroadcast: {
      send: jest.fn(),
      user: mockBroadcastHelper,
      admin: mockBroadcastHelper
    },
    productBroadcast: mockBroadcastHelper,
    paymentBroadcast: mockBroadcastHelper
  };
});

import { renderHook, waitFor } from '@testing-library/react-native';
import { cartService } from '../../services/cartService';
import { useCart } from '../useCart';
import { useCurrentUser } from '../useAuth';
import { createWrapper } from '../../test/test-utils';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../test/contracts/hook.contracts';

jest.mock('../../services/cartService');
const mockCartService = cartService as jest.Mocked<typeof cartService>;

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/queryKeyFactory', () => ({
  cartKeys: {
    all: (userId: string) => ['cart', userId],
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer' as const,
};

const mockProduct = {
  id: 'product-1',
  name: 'Product 1',
  price: 10.00,
  description: 'Test product',
  unit: 'each',
  category_id: 'cat-1',
  farmer_id: 'farmer-1',
  stock_quantity: 100,
  is_available: true,
};

describe('useCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should fetch cart data successfully', async () => {
      const mockCart = {
        id: 'cart-1',
        user_id: mockUser.id,
        items: [
          {
            id: 'item-1',
            product_id: mockProduct.id,
            quantity: 2,
            price: mockProduct.price,
            product: mockProduct,
          },
        ],
        total: 20.00,
      };
      mockCartService.getCart.mockResolvedValue(mockCart);

      const { result } = renderHook(() => useCart(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(mockCart.items);
      expect(result.current.total).toBe(20);
      
      // Validate contract
      hookContracts.cart.validate('validateCart', mockCart);
    });

    it('should add item to cart successfully', async () => {
      const mockCart = { items: [], total: 0 };
      const updatedCart = {
        items: [
          {
            product: mockProduct,
            quantity: 1,
          },
        ],
        total: 10,
      };

      mockCartService.getCart.mockResolvedValue(mockCart);
      mockCartService.addItem.mockResolvedValue({ success: true });
      mockCartService.getCart.mockResolvedValueOnce(updatedCart);

      const { result } = renderHook(() => useCart(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const product = mockProduct;
      result.current.addItem({ product, quantity: 1 });

      await waitFor(() => {
        expect(result.current.isAddingItem).toBe(false);
      });

      expect(mockCartService.addItem).toHaveBeenCalledWith(product, 1);
    });

    it('should get cart quantity for specific product', async () => {
      const mockCart = {
        items: [
          {
            product: mockProduct,
            quantity: 5,
          },
        ],
        total: 50,
      };
      mockCartService.getCart.mockResolvedValue(mockCart);

      const { result } = renderHook(() => useCart(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getCartQuantity('prod1')).toBe(5);
      expect(result.current.getCartQuantity('prod2')).toBe(0);
    });
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
      const { result } = renderHook(() => useCart(), {
        wrapper: createWrapper(),
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.error?.code).toBe('AUTHENTICATION_REQUIRED');
      expect(result.current.isLoading).toBe(false);
    });
  });
});