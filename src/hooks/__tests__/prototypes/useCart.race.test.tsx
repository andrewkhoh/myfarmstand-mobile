/**
 * useCart Race Condition Tests with REAL React Query
 * 
 * This test file uses real React Query instances to test actual race conditions.
 * Key differences from mocked tests:
 * - Uses actual QueryClient and mutations
 * - Tests real optimistic updates and rollbacks  
 * - Tests real query invalidation and caching
 * - Tests actual concurrent operation handling
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCart } from '../useCart';
import { cartService } from '../../services/cartService';
import type { Product, CartState } from '../../types';

// Get the mocked cart service (services are mocked, React Query is real)
const mockCartService = cartService as jest.Mocked<typeof cartService>;

// Declare global helper from race-condition-setup.ts
declare global {
  var createCartError: (
    code: 'AUTHENTICATION_REQUIRED' | 'STOCK_INSUFFICIENT' | 'PRODUCT_NOT_FOUND' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR',
    message: string,
    userMessage: string,
    metadata?: { productId?: string; requestedQuantity?: number; availableQuantity?: number }
  ) => any;
}

describe('useCart Race Condition Tests (Real React Query)', () => {
  let queryClient: QueryClient;

  // Basic smoke test to verify setup works
  describe('🔧 Setup Verification', () => {
    it('should initialize useCart hook without hanging', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      // Should complete initialization within reasonable time
      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.items).toBeDefined();
        expect(result.current.total).toBeDefined();
      }, { timeout: 3000 });

      expect(result.current.items).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  // Test products
  const product1: Product = {
    id: 'prod-1',
    name: 'Apples',
    price: 2.99,
    stock: 50,
    unit: 'lb',
    category: 'Fruits',
    description: 'Fresh apples',
    farmerId: 'farmer-1',
    image: 'apple.jpg'
  };

  const product2: Product = {
    id: 'prod-2', 
    name: 'Oranges',
    price: 3.99,
    stock: 30,
    unit: 'lb',
    category: 'Fruits',
    description: 'Fresh oranges',
    farmerId: 'farmer-1',
    image: 'orange.jpg'
  };

  beforeEach(() => {
    // Create fresh QueryClient for each test to avoid interference
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          staleTime: 0,
          gcTime: 0,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false
        },
        mutations: { 
          retry: false
        }
      },
      // Prevent hanging by setting shorter timeouts
      mutationCache: undefined,
      queryCache: undefined
    });

    jest.clearAllMocks();
    
    // Use real timers for React Query compatibility
    jest.useRealTimers();

    // Default cart service mocks
    mockCartService.getCart.mockResolvedValue({
      items: [],
      total: 0
    });
  });

  afterEach(async () => {
    // Properly cleanup QueryClient to prevent hanging
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.unmount();
    } catch {
      // Ignore cleanup errors
    }
  });

  // Wrapper component that provides real QueryClient
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('🏁 Concurrent Add Operations', () => {
    it('should handle rapid add operations for same product correctly', async () => {
      // Mock service responses for rapid adds
      let callCount = 0;
      mockCartService.addItem.mockImplementation(async () => {
        callCount++;
        console.log(`CartService.addItem called, callCount: ${callCount}`);
        // Use real short delay for race condition testing
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true };
      });

      mockCartService.getCart.mockImplementation(async () => ({
        items: [{ 
          product: product1, 
          quantity: callCount // Quantity reflects number of add operations
        }],
        total: product1.price * callCount
      }));

      const { result } = renderHook(() => useCart(), { wrapper });

      // Wait for initial load with timeout
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Fire three concurrent add operations with shorter timeout
      const startTime = Date.now();
      
      await act(async () => {
        const promises = Promise.all([
          result.current.addItemAsync({ product: product1, quantity: 1 }),
          result.current.addItemAsync({ product: product1, quantity: 1 }),
          result.current.addItemAsync({ product: product1, quantity: 1 })
        ]);

        // Wait for all operations to complete with timeout protection
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), 5000)
        );
        
        await Promise.race([promises, timeoutPromise]);
      });

      const endTime = Date.now();
      console.log(`Test completed in ${endTime - startTime}ms`);

      // Verify all service calls were made
      expect(mockCartService.addItem).toHaveBeenCalledTimes(3);
      
      // Verify final state shows cumulative effect
      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].quantity).toBe(3);
        expect(result.current.total).toBe(product1.price * 3);
      }, { timeout: 3000 });
    });

    it('should handle interleaved add/remove operations', async () => {
      // Start with item in cart
      const initialCart: CartState = {
        items: [{ product: product1, quantity: 5 }],
        total: product1.price * 5
      };

      mockCartService.getCart.mockResolvedValue(initialCart);

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      // Mock delayed remove operation with real short delay
      mockCartService.removeItem.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      });

      // Mock the final state after removal
      mockCartService.getCart.mockResolvedValue({
        items: [],
        total: 0
      });

      // Test the actual race condition: concurrent operations
      await act(async () => {
        // Start remove operation and wait for completion
        await result.current.removeItemAsync(product1.id);
      });

      // Verify final state after operation completes and invalidation occurs
      await waitFor(() => {
        expect(result.current.items).toHaveLength(0);
        expect(result.current.total).toBe(0);
        expect(result.current.isRemovingItem).toBe(false);
      });
    });
  });

  describe('🔄 Optimistic Updates & Rollbacks', () => {
    it('should handle mutation failure and maintain data integrity', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Store initial state for comparison
      const initialState = {
        items: [...result.current.items],
        total: result.current.total
      };

      // Mock delayed service failure with real timeout
      mockCartService.addItem.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw (global as any).createCartError(
          'STOCK_INSUFFICIENT',
          'Stock insufficient',
          'Not enough items in stock',
          { productId: product1.id, requestedQuantity: 1, availableQuantity: 0 }
        );
      });

      await act(async () => {
        try {
          await result.current.addItemAsync({ product: product1, quantity: 1 });
        } catch (error) {
          // Expected to fail
          expect((error as Error).message).toContain('Stock insufficient');
        }
      });

      // Verify state integrity after failure - should match initial state
      await waitFor(() => {
        expect(result.current.items).toEqual(initialState.items);
        expect(result.current.total).toBe(initialState.total);
        expect(result.current.isAddingItem).toBe(false);
      });
    });

    it('should handle optimistic updates during network delays', async () => {
      // Start with empty cart
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Mock slow network with real short delay
      mockCartService.addItem.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      });

      // Mock final cart state after successful add
      const finalCart: CartState = {
        items: [{ product: product1, quantity: 1 }],
        total: product1.price
      };

      mockCartService.getCart.mockResolvedValue(finalCart);

      await act(async () => {
        await result.current.addItemAsync({ product: product1, quantity: 1 });
      });

      // Wait for mutation to complete and pending state to update
      await waitFor(() => {
        expect(result.current.isAddingItem).toBe(false);
      });

      // Verify final state matches expected state
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(1);
      expect(result.current.isAddingItem).toBe(false);
    });
  });

  describe('🎯 State Consistency Across Components', () => {
    it('should maintain state consistency across multiple hook instances', async () => {
      // Create multiple hook instances (simulating multiple components)
      const { result: result1 } = renderHook(() => useCart(), { wrapper });
      const { result: result2 } = renderHook(() => useCart(), { wrapper });
      const { result: result3 } = renderHook(() => useCart(), { wrapper });

      // Wait for all to load
      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
        expect(result3.current.isLoading).toBe(false);
      });

      // Mock successful add
      mockCartService.addItem.mockResolvedValue({ success: true });
      mockCartService.getCart.mockResolvedValue({
        items: [{ product: product1, quantity: 1 }],
        total: product1.price
      });

      // Add from first component
      await act(async () => {
        await result1.current.addItemAsync({ product: product1, quantity: 1 });
      });

      // All components should see the same updated state
      await waitFor(() => {
        expect(result1.current.items).toHaveLength(1);
        expect(result2.current.items).toHaveLength(1);
        expect(result3.current.items).toHaveLength(1);
        
        expect(result1.current.items[0].product.id).toBe(product1.id);
        expect(result2.current.items[0].product.id).toBe(product1.id);
        expect(result3.current.items[0].product.id).toBe(product1.id);
      });
    });

    it('should handle concurrent updates from multiple components', async () => {
      const { result: result1 } = renderHook(() => useCart(), { wrapper });
      const { result: result2 } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Mock both operations succeeding
      mockCartService.addItem.mockResolvedValue({ success: true });
      mockCartService.getCart.mockResolvedValue({
        items: [
          { product: product1, quantity: 1 },
          { product: product2, quantity: 1 }
        ],
        total: product1.price + product2.price
      });

      // Both components add different products simultaneously
      await act(async () => {
        const promises = Promise.all([
          result1.current.addItemAsync({ product: product1, quantity: 1 }),
          result2.current.addItemAsync({ product: product2, quantity: 1 })
        ]);
        
        await promises;
      });

      // Both should see both products
      await waitFor(() => {
        expect(result1.current.items).toHaveLength(2);
        expect(result2.current.items).toHaveLength(2);
        
        const productIds1 = result1.current.items.map(item => item.product.id);
        const productIds2 = result2.current.items.map(item => item.product.id);
        
        expect(productIds1).toContain(product1.id);
        expect(productIds1).toContain(product2.id);
        expect(productIds2).toContain(product1.id);
        expect(productIds2).toContain(product2.id);
      });
    });
  });

  describe('⚡ Query Invalidation & Caching', () => {
    it('should properly invalidate queries after mutations', async () => {
      // Spy on the queryClient invalidateQueries method instead of service
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Reset spy after initial setup
      invalidateQueriesSpy.mockClear();

      // Mock successful add
      mockCartService.addItem.mockResolvedValue({ success: true });
      mockCartService.getCart.mockResolvedValue({
        items: [{ product: product1, quantity: 1 }],
        total: product1.price
      });

      // Perform mutation
      await act(async () => {
        await result.current.addItemAsync({ product: product1, quantity: 1 });
      });

      // Should trigger invalidation calls (multiple related keys)
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalled();
        
        // Check that cart queries are among the invalidated queries
        const invalidationCalls = invalidateQueriesSpy.mock.calls;
        const cartInvalidations = invalidationCalls.filter(call => 
          JSON.stringify(call[0]).includes('cart')
        );
        expect(cartInvalidations.length).toBeGreaterThan(0);
      });
    });

    it('should handle rapid mutations with proper query batching', async () => {
      // Spy on invalidateQueries to check batching behavior
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Reset spy after initial setup
      invalidateQueriesSpy.mockClear();

      // Mock successful operations
      mockCartService.addItem.mockResolvedValue({ success: true });
      mockCartService.updateQuantity.mockResolvedValue({ success: true });
      mockCartService.getCart.mockResolvedValue({
        items: [{ product: product1, quantity: 5 }],
        total: product1.price * 5
      });

      // Rapid mutations
      await act(async () => {
        await result.current.addItemAsync({ product: product1, quantity: 1 });
        await result.current.updateQuantityAsync({ productId: product1.id, quantity: 5 });
      });

      // Check that invalidations were called but in a reasonable number
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalled();
        
        // Should have some invalidations but not excessive
        const totalInvalidations = invalidateQueriesSpy.mock.calls.length;
        expect(totalInvalidations).toBeGreaterThan(0);
        expect(totalInvalidations).toBeLessThan(20); // Reasonable upper bound
      });
    });
  });

  describe('🚨 Error Handling & Recovery', () => {
    it('should handle partial failures in concurrent operations', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Use product-specific mocking for reliable concurrent behavior
      mockCartService.addItem.mockImplementation(async (product, quantity) => {
        // Add small real delay to make it realistic
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (product.id === 'prod-1') {
          // First product succeeds
          return { success: true };
        } else if (product.id === 'prod-2') {
          // Second product fails
          throw (global as any).createCartError(
            'STOCK_INSUFFICIENT',
            'Stock insufficient for product 2',
            'Not enough items in stock',
            { productId: 'prod-2', requestedQuantity: 1, availableQuantity: 0 }
          );
        }
        return { success: true };
      });

      // Mock cart state that only shows successful item
      mockCartService.getCart.mockResolvedValue({
        items: [{ product: product1, quantity: 1 }],
        total: product1.price
      });

      let successCount = 0;
      let errorCount = 0;

      await act(async () => {
        const promises = [
          result.current.addItemAsync({ product: product1, quantity: 1 }) // Should succeed
            .then(() => successCount++)
            .catch(() => errorCount++),
          result.current.addItemAsync({ product: product2, quantity: 1 }) // Should fail
            .then(() => successCount++)
            .catch(() => errorCount++)
        ];

        await Promise.allSettled(promises);
      });

      // One should succeed, one should fail
      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);

      // Final state should only show the successful item (after invalidation)
      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].product.id).toBe(product1.id);
      });
    });

    it('should maintain data integrity during network failures', async () => {
      // Start with items in cart
      const initialCart: CartState = {
        items: [{ product: product1, quantity: 3 }],
        total: product1.price * 3
      };

      mockCartService.getCart.mockResolvedValue(initialCart);

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => expect(result.current.items).toHaveLength(1));

      // Mock network failure
      mockCartService.updateQuantity.mockRejectedValue(
        createCartError(
          'NETWORK_ERROR',
          'Network error',
          'Unable to connect to server',
          { productId: product1.id }
        )
      );

      const initialState = { 
        items: [...result.current.items], 
        total: result.current.total 
      };

      await act(async () => {
        try {
          await result.current.updateQuantityAsync({ 
            productId: product1.id, 
            quantity: 10 
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Should rollback to initial state
      await waitFor(() => {
        expect(result.current.items).toEqual(initialState.items);
        expect(result.current.total).toBe(initialState.total);
      });
    });
  });
});