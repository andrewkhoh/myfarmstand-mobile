import { renderHook, waitFor } from '@testing-library/react-native';
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  getCategories,
  searchProducts,
} from '../../services/productService';
import {
  useProducts,
  useProduct,
  useProductSearch,
  useProductById,
  useCategories,
  useProductsByCategory,
} from '../useProducts';
import { useCurrentUser } from '../useAuth';
import { createWrapper } from '../../test/test-utils';
import { createSupabaseMock } from '../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../test/contracts/hook.contracts';
import { createProduct } from '../../test/factories/product.factory';

jest.mock('../../services/productService');
const mockGetProducts = getProducts as jest.MockedFunction<typeof getProducts>;
const mockGetProductById = getProductById as jest.MockedFunction<typeof getProductById>;
const mockGetProductsByCategory = getProductsByCategory as jest.MockedFunction<typeof getProductsByCategory>;
const mockGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;
const mockSearchProducts = searchProducts as jest.MockedFunction<typeof searchProducts>;

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/broadcastFactory', () => ({
  productBroadcast: {
    send: jest.fn(),
  },
}));

jest.mock('../../utils/queryKeyFactory', () => ({
  productKeys: {
    lists: () => ['products', 'list'],
    detail: (id: string) => ['products', 'detail', id],
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer' as const,
};

describe('useProducts hooks', () => {
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

    describe('useProducts', () => {
      it('should fetch products successfully', async () => {
        const mockProducts = [
          createProduct({ id: 'prod1', name: 'Product 1', price: 10 }),
          createProduct({ id: 'prod2', name: 'Product 2', price: 20 }),
        ];
        mockGetProducts.mockResolvedValue({
          success: true,
          products: mockProducts,
        });

        const { result } = renderHook(() => useProducts(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockProducts);
        expect(mockGetProducts).toHaveBeenCalled();
        
        // Validate contract
        hookContracts.products.validate('validateProductList', mockProducts);
      });

      it('should handle products fetch error', async () => {
        mockGetProducts.mockRejectedValue(new Error('Failed to fetch products'));

        const { result } = renderHook(() => useProducts(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        }, { timeout: 10000 });

        expect((result.current.error as any)?.message).toContain('Failed to fetch products');
      });
    });

    describe('useProduct', () => {
      it('should fetch single product successfully', async () => {
        const mockProduct = createProduct({ id: 'prod1', name: 'Product 1', price: 10 });
        mockGetProductById.mockResolvedValue({
          success: true,
          product: mockProduct,
        });

        const { result } = renderHook(() => useProduct('prod1'), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockProduct);
        expect(mockGetProductById).toHaveBeenCalledWith('prod1');
      });
    });

    describe('useCategories', () => {
      it('should fetch categories successfully', async () => {
        const mockCategories = [
          { id: 'cat1', name: 'Category 1', isActive: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
          { id: 'cat2', name: 'Category 2', isActive: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        ];
        mockGetCategories.mockResolvedValue({
          success: true,
          categories: mockCategories,
        });

        const { result } = renderHook(() => useCategories(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockCategories);
        expect(mockGetCategories).toHaveBeenCalled();
      });
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

    it('should return authentication error for useProducts', () => {
      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual([]);
      expect((result.current.error as any)?.code).toBe('AUTHENTICATION_REQUIRED');
      expect(result.current.isError).toBe(true);
    });
  });
});