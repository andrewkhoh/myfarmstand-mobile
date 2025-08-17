/**
 * useStockValidation Race Condition Tests
 * 
 * Tests for concurrent stock validation operations with Real React Query
 * Following the proven Option A pattern from cart/orders race testing
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStockValidation } from '../useStockValidation';
import { Product } from '../../types';

// Import mocked services (services are mocked, React Query is real)
const mockSupabase = require('../../config/supabase').supabase as jest.Mocked<any>;

// Import mocked cart hook
jest.mock('../useCart', () => ({
  useCart: () => ({
    getCartQuantity: jest.fn().mockImplementation((productId: string) => {
      // Return different quantities for different products to test various scenarios
      if (productId === 'product-1') return 2;
      if (productId === 'product-2') return 5;
      if (productId === 'product-3') return 0;
      return 0;
    })
  })
}));

// Mock products for testing
const mockProduct1: Product = {
  id: 'product-1',
  name: 'Test Product 1',
  description: 'Test product 1',
  price: 10.99,
  category: 'produce',
  unit: 'lb',
  imageUrl: 'https://example.com/product1.jpg',
  farmerId: 'farmer-1',
  stockQuantity: 10,
  isAvailable: true,
  isPreOrder: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockProduct2: Product = {
  id: 'product-2',
  name: 'Test Product 2 (Pre-order)',
  description: 'Test product 2',
  price: 15.99,
  category: 'produce',
  unit: 'kg',
  imageUrl: 'https://example.com/product2.jpg',
  farmerId: 'farmer-1',
  stockQuantity: 20,
  isAvailable: true,
  isPreOrder: true,
  minPreOrderQuantity: 5,
  maxPreOrderQuantity: 15,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockProduct3: Product = {
  id: 'product-3',
  name: 'Test Product 3 (Low Stock)',
  description: 'Test product 3',
  price: 5.99,
  category: 'produce',
  unit: 'each',
  imageUrl: 'https://example.com/product3.jpg',
  farmerId: 'farmer-1',
  stockQuantity: 3,
  isAvailable: true,
  isPreOrder: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Mock stock data response
const mockStockData = [
  {
    id: 'product-1',
    stock_quantity: 10,
    is_pre_order: false,
    min_pre_order_quantity: null,
    max_pre_order_quantity: null,
    is_available: true
  },
  {
    id: 'product-2',
    stock_quantity: 20,
    is_pre_order: true,
    min_pre_order_quantity: 5,
    max_pre_order_quantity: 15,
    is_available: true
  },
  {
    id: 'product-3',
    stock_quantity: 3,
    is_pre_order: false,
    min_pre_order_quantity: null,
    max_pre_order_quantity: null,
    is_available: true
  }
];

describe('useStockValidation Race Condition Tests (Real React Query)', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    // CRITICAL: Use real timers for React Query compatibility
    jest.useRealTimers();
    
    // Fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
        mutations: { retry: false }
      }
    });
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default supabase mock behavior
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      data: mockStockData,
      error: null
    }));
  });

  afterEach(() => {
    queryClient.clear();
  });
  
  // Enhanced wrapper with proper React Query context (following cart pattern)
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('🔧 Setup Verification', () => {
    it('should initialize useStockValidation hook without hanging', async () => {
      const { result } = renderHook(() => useStockValidation(), { wrapper });
      
      // Should initialize immediately without hanging
      expect(result.current).toBeDefined();
      expect(result.current.stockData).toBeDefined();
      expect(result.current.validateStock).toBeDefined();
      
      // Should complete initialization within reasonable time
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });
    });
  });

  describe('🏁 Concurrent Validation Operations', () => {
    it('should handle multiple concurrent stock validations correctly', async () => {
      // Setup mock with realistic delay
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(async () => {
          // Use real short delay for race condition testing
          await new Promise(resolve => setTimeout(resolve, 50));
          return { data: mockStockData, error: null };
        })
      }));

      const { result: validator1 } = renderHook(() => useStockValidation(), { wrapper });
      const { result: validator2 } = renderHook(() => useStockValidation(), { wrapper });
      const { result: validator3 } = renderHook(() => useStockValidation(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(validator1.current.isLoading).toBe(false);
        expect(validator2.current.isLoading).toBe(false);
        expect(validator3.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      // Perform concurrent validations on different products
      const startTime = Date.now();
      
      await act(async () => {
        const validations = await Promise.all([
          validator1.current.validateStock(mockProduct1, 3),
          validator2.current.validateStock(mockProduct2, 5),
          validator3.current.validateStock(mockProduct3, 2)
        ]);

        // All validations should complete successfully
        expect(validations[0].isValid).toBe(true); // Product 1: 2 in cart + 3 requested = 5 <= 10 stock
        expect(validations[1].isValid).toBe(true); // Product 2: 5 in cart + 5 requested = 10 <= 15 max pre-order
        expect(validations[2].isValid).toBe(true); // Product 3: 0 in cart + 2 requested = 2 <= 3 stock
      });

      const endTime = Date.now();
      console.log(`Concurrent validations completed in ${endTime - startTime}ms`);
      
      // All validators should have consistent stock data
      expect(validator1.current.stockData).toEqual(validator2.current.stockData);
      expect(validator2.current.stockData).toEqual(validator3.current.stockData);
    });

    it('should handle rapid validation checks on same product', async () => {
      const { result } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Perform rapid validation checks
      const validationResults: boolean[] = [];
      
      await act(async () => {
        // Rapid-fire validation checks
        for (let i = 1; i <= 5; i++) {
          const validation = result.current.validateStock(mockProduct1, i);
          validationResults.push(validation.isValid);
        }
      });

      // Should have consistent validation results based on stock
      expect(validationResults).toEqual([
        true,  // 2 in cart + 1 = 3 <= 10
        true,  // 2 in cart + 2 = 4 <= 10
        true,  // 2 in cart + 3 = 5 <= 10
        true,  // 2 in cart + 4 = 6 <= 10
        true,  // 2 in cart + 5 = 7 <= 10
      ]);
    });
  });

  describe('⚡ Pre-order vs Regular Stock Races', () => {
    it('should handle concurrent validations mixing pre-order and regular items', async () => {
      const { result } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mix pre-order and regular stock validations
      await act(async () => {
        const [regular1, preOrder, regular2] = await Promise.all([
          result.current.canAddQuantity(mockProduct1, 5),
          result.current.canAddQuantity(mockProduct2, 8),
          result.current.canAddQuantity(mockProduct3, 3)
        ]);

        expect(regular1).toBe(true);  // Product 1: regular stock OK
        expect(preOrder).toBe(true);  // Product 2: within pre-order limits
        expect(regular2).toBe(true);  // Product 3: exactly at stock limit
      });
    });

    it('should maintain consistency when switching between pre-order and regular validation', async () => {
      const { result } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Interleave pre-order and regular stock checks
      const messages: string[] = [];
      
      await act(async () => {
        messages.push(result.current.getStockStatusMessage(mockProduct1));
        messages.push(result.current.getStockStatusMessage(mockProduct2));
        messages.push(result.current.getStockStatusMessage(mockProduct1));
        messages.push(result.current.getStockStatusMessage(mockProduct2));
      });

      // Messages should be consistent for same products
      expect(messages[0]).toBe(messages[2]); // Product 1 messages match
      expect(messages[1]).toBe(messages[3]); // Product 2 messages match
    });
  });

  describe('🔄 Stock Refresh & Cache Invalidation Races', () => {
    it('should handle concurrent stock refresh operations', async () => {
      let refreshCount = 0;
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(async () => {
          refreshCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return { 
            data: mockStockData.map(item => ({
              ...item,
              stock_quantity: item.stock_quantity - refreshCount // Simulate stock changes
            })), 
            error: null 
          };
        })
      }));

      const { result: refresh1 } = renderHook(() => useStockValidation(), { wrapper });
      const { result: refresh2 } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(refresh1.current.isLoading).toBe(false);
        expect(refresh2.current.isLoading).toBe(false);
      });

      // Trigger concurrent refreshes
      await act(async () => {
        await Promise.all([
          refresh1.current.refreshStockAsync(),
          refresh2.current.refreshStockAsync()
        ]);
      });

      // Both should have the latest stock data
      await waitFor(() => {
        expect(refresh1.current.stockData).toEqual(refresh2.current.stockData);
        expect(refresh1.current.isRefreshing).toBe(false);
        expect(refresh2.current.isRefreshing).toBe(false);
      });
    });

    it('should handle validation during stock refresh', async () => {
      let queryCount = 0;
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(async () => {
          queryCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
          return { 
            data: queryCount === 1 ? mockStockData : mockStockData.map(item => ({
              ...item,
              stock_quantity: 1 // Simulate low stock after refresh
            })), 
            error: null 
          };
        })
      }));

      const { result } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start refresh and immediately validate
      await act(async () => {
        const [refreshResult, validationResult] = await Promise.allSettled([
          result.current.refreshStockAsync(),
          result.current.validateStock(mockProduct1, 8)
        ]);

        expect(refreshResult.status).toBe('fulfilled');
        expect(validationResult.status).toBe('fulfilled');
      });

      // After refresh, validation should reflect new stock
      const postRefreshValidation = result.current.validateStock(mockProduct1, 8);
      expect(postRefreshValidation.isValid).toBe(false); // Low stock after refresh
    });
  });

  describe('🎯 State Consistency Across Components', () => {
    it('should maintain consistent stock data across multiple hook instances', async () => {
      const { result: hook1 } = renderHook(() => useStockValidation(), { wrapper });
      const { result: hook2 } = renderHook(() => useStockValidation(), { wrapper });
      const { result: hook3 } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(hook1.current.isLoading).toBe(false);
        expect(hook2.current.isLoading).toBe(false);
        expect(hook3.current.isLoading).toBe(false);
      });

      // All hooks should share the same stock data
      expect(hook1.current.stockData).toEqual(hook2.current.stockData);
      expect(hook2.current.stockData).toEqual(hook3.current.stockData);

      // Remaining stock calculations should be consistent
      const remaining1 = hook1.current.getRemainingStock('product-1');
      const remaining2 = hook2.current.getRemainingStock('product-1');
      const remaining3 = hook3.current.getRemainingStock('product-1');

      expect(remaining1).toBe(remaining2);
      expect(remaining2).toBe(remaining3);
    });

    it('should synchronize validation results across instances', async () => {
      const { result: validator1 } = renderHook(() => useStockValidation(), { wrapper });
      const { result: validator2 } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(validator1.current.isLoading).toBe(false);
        expect(validator2.current.isLoading).toBe(false);
      });

      // Both validators should agree on validation results
      const canAdd1 = validator1.current.canAddOneMore('product-3');
      const canAdd2 = validator2.current.canAddOneMore('product-3');

      expect(canAdd1).toBe(canAdd2);
      expect(canAdd1).toBe(true); // Product 3 has 3 stock, 0 in cart
    });
  });

  describe('🚨 Error Handling & Recovery', () => {
    it('should handle network errors during concurrent validations', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(async () => {
          callCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          if (callCount === 2) {
            return { data: null, error: { message: 'Network error' } };
          }
          return { data: mockStockData, error: null };
        })
      }));

      const { result } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try refresh which will fail on second call
      await act(async () => {
        try {
          await result.current.refreshStockAsync();
        } catch (error) {
          // Expected error
        }
      });

      // Hook should still be functional with cached data
      const validation = result.current.validateStock(mockProduct1, 2);
      expect(validation).toBeDefined();
      expect(validation.availableStock).toBeGreaterThan(0);
    });

    it.skip('should maintain data integrity during partial failures', async () => {
      // First successful load
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockStockData, error: null })
      }));

      const { result: stock1 } = renderHook(() => useStockValidation(), { wrapper });
      const { result: stock2 } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(stock1.current.isLoading).toBe(false);
        expect(stock2.current.isLoading).toBe(false);
      });

      // Get initial stock data
      const initialStockData = stock1.current.stockData;
      expect(initialStockData.length).toBe(3);

      // Setup mock to fail on next call
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      }));

      // Try to refresh - should handle error gracefully
      let refreshError = null;
      await act(async () => {
        try {
          await stock1.current.refreshStockAsync();
        } catch (error) {
          refreshError = error;
        }
      });

      // Should have thrown an error
      expect(refreshError).toBeDefined();
      
      // Stock data should still be available from previous successful load
      expect(stock1.current.stockData.length).toBe(3);
      expect(stock2.current.stockData.length).toBe(3);
      
      // Validation should still work with cached data
      const validation = stock1.current.validateStock(mockProduct1, 2);
      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
      expect(validation.availableStock).toBe(10);
    });
  });

  describe('📊 Complex Validation Scenarios', () => {
    it('should handle mixed cart quantities affecting validation', async () => {
      const { result } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test validation with existing cart quantities
      await act(async () => {
        // Product 1 has 2 in cart, 10 stock
        const validation1 = result.current.validateStock(mockProduct1, 8);
        expect(validation1.isValid).toBe(true); // 2 + 8 = 10, exactly at limit

        const validation2 = result.current.validateStock(mockProduct1, 9);
        expect(validation2.isValid).toBe(false); // 2 + 9 = 11, exceeds stock

        // Product 2 has 5 in cart, max pre-order 15
        const validation3 = result.current.validateStock(mockProduct2, 10);
        expect(validation3.isValid).toBe(true); // 5 + 10 = 15, at pre-order limit

        const validation4 = result.current.validateStock(mockProduct2, 11);
        expect(validation4.isValid).toBe(false); // 5 + 11 = 16, exceeds pre-order
      });
    });

    it('should handle boundary conditions in concurrent validations', async () => {
      const { result } = renderHook(() => useStockValidation(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test exact stock boundaries
      await act(async () => {
        const boundaries = await Promise.all([
          result.current.canAddQuantity(mockProduct3, 3), // Exactly at stock
          result.current.canAddQuantity(mockProduct3, 4), // Over stock
          result.current.canAddQuantity(mockProduct2, 10), // At pre-order max (with cart)
          result.current.canAddQuantity(mockProduct2, 11), // Over pre-order max
        ]);

        expect(boundaries).toEqual([true, false, true, false]);
      });
    });
  });
});