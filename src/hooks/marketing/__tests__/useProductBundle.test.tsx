import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest } from '@jest/globals';
import { useProductBundle } from '../useProductBundle';
import { bundleService } from '@/services/marketing/bundleService';

// Mock the bundle service
jest.mock('@/services/marketing/bundleService', () => ({
  bundleService: {
    getBundles: jest.fn(),
    getBundle: jest.fn(),
    createBundle: jest.fn(),
    updateBundle: jest.fn(),
    deleteBundle: jest.fn(),
    activateBundle: jest.fn(),
    deactivateBundle: jest.fn(),
    toggleStatus: jest.fn(),
    setSchedule: jest.fn(),
    getPerformance: jest.fn(),
    compareBundles: jest.fn(),
    getAvailableProducts: jest.fn(),
    subscribeToBundle: jest.fn(() => () => {})
  }
}));

describe('useProductBundle', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('bundle CRUD operations', () => {
    it('should fetch product bundles', async () => {
      const mockBundles = [
        { id: 'bundle-1', name: 'Starter Pack', finalPrice: 99.99, products: [], discount: 0, status: 'active' },
        { id: 'bundle-2', name: 'Professional Suite', finalPrice: 299.99, products: [], discount: 0, status: 'active' },
        { id: 'bundle-3', name: 'Enterprise Package', finalPrice: 999.99, products: [], discount: 0, status: 'active' }
      ];
      
      (bundleService.getBundles as jest.Mock).mockResolvedValue(mockBundles);
      
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.bundles).toHaveLength(3);
      expect(result.current.bundles[1].finalPrice).toBe(299.99);
    });
    
    it('should create new product bundle', async () => {
      const mockBundle = {
        id: 'bundle-new',
        name: 'Holiday Bundle',
        finalPrice: 149.99,
        products: [],
        discount: 25,
        status: 'draft',
        created_at: new Date().toISOString()
      };
      
      (bundleService.createBundle as jest.Mock).mockResolvedValue(mockBundle);
      
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await act(async () => {
        const created = await result.current.createBundle({
          name: 'Holiday Bundle',
          description: 'Special holiday offer',
          products: [],
          finalPrice: 149.99,
          discount: 25
        });
        expect(created.id).toBe('bundle-new');
      });
    });
    
    it('should update bundle configuration', async () => {
      const mockBundle = {
        id: 'bundle-1',
        finalPrice: 89.99,
        discount: 10,
        products: [],
        status: 'active'
      };
      
      (bundleService.updateBundle as jest.Mock).mockResolvedValue(mockBundle);
      
      const { result } = renderHook(() => useProductBundle('bundle-1'), { wrapper });
      
      await act(async () => {
        const updated = await result.current.updateBundle('bundle-1', {
          finalPrice: 89.99,
          discount: 10
        });
        expect(updated.finalPrice).toBe(89.99);
      });
    });
    
    it('should delete product bundle', async () => {
      (bundleService.deleteBundle as jest.Mock).mockResolvedValue(true);
      
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await act(async () => {
        const deleted = await result.current.deleteBundle('bundle-1');
        expect(deleted).toBe(true);
      });
      
      expect(bundleService.deleteBundle).toHaveBeenCalledWith('bundle-1');
    });
    
    it('should add products to bundle', async () => {
      const mockBundle = {
        id: 'bundle-1',
        name: 'Test Bundle',
        products: [],
        discount: 10,
        finalPrice: 100,
        status: 'active'
      };
      
      (bundleService.getBundle as jest.Mock).mockResolvedValue(mockBundle);
      
      const { result } = renderHook(() => useProductBundle('bundle-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const updated = await result.current.addProducts('bundle-1', ['product-4']);
        expect(updated.total_products).toBe(1);
      });
    });
    
    it('should remove products from bundle', async () => {
      const mockBundle = {
        id: 'bundle-1',
        products: [
          { id: 'product-1', name: 'Product 1', price: 50 },
          { id: 'product-2', name: 'Product 2', price: 75 }
        ],
        discount: 10,
        finalPrice: 112.5,
        status: 'active'
      };
      
      (bundleService.getBundle as jest.Mock).mockResolvedValue(mockBundle);
      
      const { result } = renderHook(() => useProductBundle('bundle-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        const updated = await result.current.removeProducts('bundle-1', ['product-2']);
        expect(updated.total_products).toBe(1);
      });
    });
    
    it('should calculate bundle pricing with discounts', async () => {
      const mockBundle = {
        id: 'bundle-1',
        products: [
          { id: 'product-1', price: 50 },
          { id: 'product-2', price: 75 },
          { id: 'product-3', price: 100 }
        ],
        bundle_price: 180,
        total_value: 225,
        savings: 45,
        discount_percentage: 20,
        finalPrice: 180,
        discount: 20,
        status: 'active'
      };
      
      (bundleService.getBundle as jest.Mock).mockResolvedValue(mockBundle);
      
      const { result } = renderHook(() => useProductBundle('bundle-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current?.data?.savings).toBe(45);
      expect(result.current?.data?.discount_percentage).toBe(20);
    });
    
    it('should manage bundle inventory', async () => {
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await act(async () => {
        const inventory = await result.current.updateInventory('bundle-1', {
          available: 50,
          reserved: 10
        });
        expect(inventory.available_stock).toBe(50);
      });
    });
    
    it('should activate and deactivate bundles', async () => {
      (bundleService.toggleStatus as jest.Mock).mockResolvedValue({
        id: 'bundle-1',
        status: 'inactive'
      });
      
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await act(async () => {
        const toggled = await result.current.toggleStatus('bundle-1');
        expect(toggled.status).toBe('inactive');
      });
    });
  });
  
  describe('bundle lifecycle management', () => {
    it('should set bundle availability schedule', async () => {
      (bundleService.setSchedule as jest.Mock).mockResolvedValue({
        bundle_id: 'bundle-1',
        start_date: '2025-03-01',
        end_date: '2025-03-31',
        recurring: false
      });
      
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await act(async () => {
        const scheduled = await result.current.setSchedule('bundle-1', {
          start_date: '2025-03-01',
          end_date: '2025-03-31'
        });
        expect(scheduled.start_date).toBe('2025-03-01');
      });
    });
  });
  
  describe('bundle analytics', () => {
    it('should fetch bundle performance metrics', async () => {
      (bundleService.getPerformance as jest.Mock).mockResolvedValue({
        bundle_id: 'bundle-1',
        units_sold: 150,
        revenue: 14998.50,
        conversion_rate: 3.2,
        avg_order_value: 99.99
      });
      
      const { result } = renderHook(() => useProductBundle('bundle-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await waitFor(() => {
        expect(result.current.performance?.units_sold).toBe(150);
        expect(result.current.performance?.conversion_rate).toBe(3.2);
      });
    });
    
    it('should compare bundle performance', async () => {
      (bundleService.compareBundles as jest.Mock).mockResolvedValue({
        comparison: [
          { bundle_id: 'bundle-1', revenue: 15000, units: 150 },
          { bundle_id: 'bundle-2', revenue: 30000, units: 100 },
          { bundle_id: 'bundle-3', revenue: 50000, units: 50 }
        ],
        best_performer: 'bundle-3'
      });
      
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await act(async () => {
        const comparison = await result.current.compareBundles(['bundle-1', 'bundle-2', 'bundle-3']);
        expect(comparison.best_performer).toBe('bundle-3');
      });
    });
  });
  
  describe('optimistic updates', () => {
    it('should optimistically update bundle price', async () => {
      const mockBundle = {
        id: 'bundle-1',
        name: 'Test Bundle',
        price: 99.99,
        finalPrice: 99.99,
        products: [],
        discount: 0,
        status: 'active'
      };
      
      (bundleService.getBundle as jest.Mock).mockResolvedValue(mockBundle);
      (bundleService.updateBundle as jest.Mock).mockResolvedValue({
        ...mockBundle,
        finalPrice: 89.99
      });
      
      const { result } = renderHook(() => useProductBundle('bundle-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      act(() => {
        result.current.updatePrice(89.99);
      });
      
      // Check optimistic update
      expect(result.current.optimisticData?.finalPrice).toBe(89.99);
    });
    
    it('should rollback on failed price update', async () => {
      const mockBundle = {
        id: 'bundle-1',
        price: 99.99,
        finalPrice: 99.99,
        products: [],
        discount: 0,
        status: 'active'
      };
      
      (bundleService.getBundle as jest.Mock).mockResolvedValue(mockBundle);
      (bundleService.updateBundle as jest.Mock).mockRejectedValue(new Error('Price update failed'));
      
      const { result } = renderHook(() => useProductBundle('bundle-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        try {
          result.current.updatePrice(89.99);
        } catch {
          // Expected error
        }
      });
      
      await waitFor(() => {
        expect(result.current?.data?.finalPrice).toBe(99.99);
      });
    });
  });
  
  describe('error handling', () => {
    it('should handle inventory conflicts', async () => {
      const error = {
        message: 'Insufficient inventory',
        products_unavailable: ['product-2', 'product-3']
      };
      
      (bundleService.createBundle as jest.Mock).mockRejectedValue(error);
      
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.createBundle({
            name: 'New Bundle',
            products: [],
            finalPrice: 100,
            discount: 0
          });
        } catch (error: any) {
          expect(error.products_unavailable).toHaveLength(2);
        }
      });
    });
    
    it('should handle pricing validation errors', async () => {
      const error = {
        message: 'Invalid pricing',
        errors: {
          price: 'Bundle price cannot be negative',
          discount: 'Discount cannot exceed 100%'
        }
      };
      
      (bundleService.updateBundle as jest.Mock).mockRejectedValue(error);
      
      const { result } = renderHook(() => useProductBundle(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.updateBundle('bundle-1', {
            finalPrice: -10,
            discount: 150
          });
        } catch (error: any) {
          expect(error.errors.price).toBeDefined();
          expect(error.errors.discount).toBeDefined();
        }
      });
    });
  });
});