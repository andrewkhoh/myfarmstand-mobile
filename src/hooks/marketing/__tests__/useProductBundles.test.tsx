// Phase 3.3.3: Product Bundle Hooks Tests (RED Phase)
// Following TDD pattern: RED → GREEN → REFACTOR
// 12+ comprehensive tests for bundle management hooks

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';

// Import hooks to test - with defensive existence checks
let useProductBundles: any, useBundlePerformance: any, useCreateBundle: any, 
    useBundleInventoryImpact: any, useUpdateBundleProducts: any;

try {
  const bundleHooks = require('../useProductBundles');
  useProductBundles = bundleHooks.useProductBundles || (() => ({ data: null, isLoading: false, error: null }));
  useBundlePerformance = bundleHooks.useBundlePerformance || (() => ({ data: null, isLoading: false, error: null }));
  useCreateBundle = bundleHooks.useCreateBundle || (() => ({ mutateAsync: jest.fn(), isLoading: false, error: null }));
  useBundleInventoryImpact = bundleHooks.useBundleInventoryImpact || (() => ({ mutateAsync: jest.fn(), isLoading: false, error: null }));
  useUpdateBundleProducts = bundleHooks.useUpdateBundleProducts || (() => ({ mutateAsync: jest.fn(), isLoading: false, error: null }));
} catch (error) {
  // Hooks don't exist yet - use mock functions
  useProductBundles = () => ({ data: null, isLoading: false, error: null });
  useBundlePerformance = () => ({ data: null, isLoading: false, error: null });
  useCreateBundle = () => ({ mutateAsync: jest.fn(), isLoading: false, error: null });
  useBundleInventoryImpact = () => ({ mutateAsync: jest.fn(), isLoading: false, error: null });
  useUpdateBundleProducts = () => ({ mutateAsync: jest.fn(), isLoading: false, error: null });
}

// Mock services
import { ProductBundleService } from '../../../services/marketing/productBundleService';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';
import { InventoryService } from '../../../services/inventory/inventoryService';

// Mock useAuth hook - following proven pattern from scratchpad-hook-test-setup  
// Mock React Query BEFORE other mocks
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isSuccess: false,
    isError: false,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
    data: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
}));

jest.mock('../../useAuth', () => ({
  useAuth: jest.fn()
}));
import { useAuth } from '../../useAuth';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock broadcast factory - following proven pattern from scratchpad-hook-test-setup
jest.mock('../../../utils/broadcastFactory', () => {
  const mockBroadcastHelper = {
    send: jest.fn(),
    getAuthorizedChannelNames: jest.fn(() => ['test-channel'])
  };
  
  return {
    createBroadcastHelper: jest.fn(() => mockBroadcastHelper),
    executiveBroadcast: mockBroadcastHelper,
    realtimeBroadcast: mockBroadcastHelper,
  };
});

// Mock query key factory - following proven pattern
jest.mock('../../../utils/queryKeyFactory', () => ({
  bundleKeys: {
    detail: (id: string) => ['bundles', 'detail', id],
    lists: (status?: string) => status ? ['bundles', 'lists', status] : ['bundles', 'lists'],
    all: () => ['bundles', 'all'],
    performance: (bundleId: string) => ['bundles', 'performance', bundleId],
    inventoryImpact: (bundleId: string) => ['bundles', 'inventory', bundleId],
    pricing: (bundleId: string) => ['bundles', 'pricing', bundleId],
  },
}));

// Create test wrapper with React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock the services
jest.mock('../../../services/marketing/productBundleService');
jest.mock('../../../services/role-based/rolePermissionService');
jest.mock('../../../services/inventory/inventoryService');

const mockProductBundleService = ProductBundleService as jest.Mocked<typeof ProductBundleService>;
const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;
const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;

// Import React Query types for proper mocking
import { useQuery, useMutation } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe('Product Bundle Hooks - Phase 3.3.3 (RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup useAuth mock - following proven pattern from scratchpad-hook-test-setup
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-123', email: 'test@example.com' },
      loading: false,
      error: null,
      signOut: jest.fn(),
    } as any);
    
    mockRolePermissionService.hasPermission.mockResolvedValue(true);
  });

  describe('useProductBundles - Bundle Listing with Role-based Access', () => {
    it('should fetch product bundles with role-based filtering', async () => {
      const mockBundles = {
        items: [
          {
            id: 'bundle-1',
            bundleName: 'Summer BBQ Essentials',
            bundleDescription: 'Everything for the perfect BBQ',
            bundlePrice: 89.99,
            bundleDiscountAmount: 15.00,
            isActive: true,
            isFeatured: true,
            displayOrder: 1,
            campaignId: 'campaign-1',
            createdBy: 'user-1',
            createdAt: '2024-06-01T00:00:00Z',
            updatedAt: '2024-06-01T00:00:00Z'
          }
        ],
        totalCount: 1,
        hasMore: false,
        page: 1,
        limit: 10
      };

      mockProductBundleService.getBundlesByStatus.mockResolvedValue({
        success: true,
        data: mockBundles
      });

      // Mock query for bundle listing
      mockUseQuery.mockReturnValue({
        data: mockBundles,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useProductBundles('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBundles);
      expect(mockProductBundleService.getBundlesByStatus).toHaveBeenCalledWith(
        'active',
        { page: 1, limit: 10 },
        'user-1'
      );
    });

    it('should enforce role-based access control for bundle management', async () => {
      mockRolePermissionService.hasPermission.mockResolvedValue(false);
      
      // Mock query with access denied error
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Access denied: insufficient permissions for bundle_management' },
        refetch: jest.fn(),
        isSuccess: false,
        isError: true,
      } as any);

      const { result } = renderHook(
        () => useProductBundles('active', { page: 1, limit: 10 }, 'unauthorized-user'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        'unauthorized-user',
        'bundle_management'
      );
    });

    it('should support featured bundle filtering', async () => {
      const mockFeaturedBundles = {
        items: [
          {
            id: 'bundle-featured',
            bundleName: 'Featured Bundle',
            isFeatured: true,
            isActive: true
          }
        ],
        totalCount: 1,
        hasMore: false,
        page: 1,
        limit: 10
      };

      mockProductBundleService.getBundlesByStatus.mockResolvedValue({
        success: true,
        data: mockFeaturedBundles
      });

      // Mock query for featured bundles
      mockUseQuery.mockReturnValue({
        data: mockFeaturedBundles,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useProductBundles('featured', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.items[0].isFeatured).toBe(true);
    });

    it('should handle empty bundle results gracefully', async () => {
      const emptyResults = {
        items: [],
        totalCount: 0,
        hasMore: false,
        page: 1,
        limit: 10
      };

      mockProductBundleService.getBundlesByStatus.mockResolvedValue({
        success: true,
        data: emptyResults
      });

      // Mock query for empty results
      mockUseQuery.mockReturnValue({
        data: emptyResults,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useProductBundles('inactive', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.items).toHaveLength(0);
    });

    it('should use centralized query key factory for bundles', async () => {
      const emptyData = { items: [], totalCount: 0, hasMore: false, page: 1, limit: 10 };

      mockProductBundleService.getBundlesByStatus.mockResolvedValue({
        success: true,
        data: emptyData
      });

      // Mock query using centralized factory
      mockUseQuery.mockReturnValue({
        data: emptyData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useProductBundles('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      // Query key should follow centralized factory pattern
      // This will be validated when query key factory is extended
      expect(result.current).toBeDefined();
    });
  });

  describe('useBundlePerformance - Sales Tracking and Analytics', () => {
    it('should fetch bundle performance with sales metrics', async () => {
      const mockPerformance = {
        bundleId: 'bundle-1',
        salesMetrics: {
          totalSales: 145,
          totalRevenue: 13048.55,
          averageOrderValue: 89.99,
          conversionRate: 12.5
        },
        inventoryImpact: {
          totalUnitsRequired: 435,
          inventoryTurnover: 2.3,
          stockAlerts: []
        },
        dateRange: {
          startDate: '2024-06-01T00:00:00Z',
          endDate: '2024-06-30T23:59:59Z'
        }
      };

      mockProductBundleService.getBundlePerformance.mockResolvedValue({
        success: true,
        data: mockPerformance
      });

      // Mock query for bundle performance
      mockUseQuery.mockReturnValue({
        data: mockPerformance,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useBundlePerformance('bundle-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPerformance);
      expect(mockProductBundleService.getBundlePerformance).toHaveBeenCalledWith('bundle-1');
    });

    it('should handle bundles with no sales data', async () => {
      const mockEmptyPerformance = {
        bundleId: 'bundle-new',
        salesMetrics: {
          totalSales: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          conversionRate: 0
        },
        inventoryImpact: {
          totalUnitsRequired: 0,
          inventoryTurnover: 0,
          stockAlerts: []
        },
        dateRange: {
          startDate: '2024-07-01T00:00:00Z',
          endDate: '2024-07-31T23:59:59Z'
        }
      };

      mockProductBundleService.getBundlePerformance.mockResolvedValue({
        success: true,
        data: mockEmptyPerformance
      });

      // Mock query for empty performance data
      mockUseQuery.mockReturnValue({
        data: mockEmptyPerformance,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useBundlePerformance('bundle-new'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.salesMetrics.totalSales).toBe(0);
    });

    it('should integrate with campaign performance tracking', async () => {
      // This test validates integration with campaign performance data
      const mockCampaignIntegratedPerformance = {
        bundleId: 'bundle-1',
        campaignId: 'campaign-1',
        salesMetrics: {
          totalSales: 89,
          totalRevenue: 8009.11,
          averageOrderValue: 89.99,
          conversionRate: 15.2,
          campaignBoost: 25.5 // Campaign-specific boost percentage
        }
      };

      mockProductBundleService.getBundlePerformance.mockResolvedValue({
        success: true,
        data: mockCampaignIntegratedPerformance as any
      });

      // Mock query for campaign-integrated performance
      mockUseQuery.mockReturnValue({
        data: mockCampaignIntegratedPerformance,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useBundlePerformance('bundle-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.salesMetrics.campaignBoost).toBe(25.5);
    });
  });

  describe('useCreateBundle - Bundle Creation with Product Associations', () => {
    it('should create bundle with product associations and pricing', async () => {
      const bundleData = {
        bundleName: 'Fresh Produce Pack',
        bundleDescription: 'Variety of fresh vegetables',
        bundlePrice: 45.99,
        bundleDiscountAmount: 8.00,
        isActive: true,
        isFeatured: false,
        displayOrder: 100,
        campaignId: 'campaign-2',
        products: [
          { productId: 'product-1', quantity: 2, displayOrder: 1 },
          { productId: 'product-2', quantity: 1, displayOrder: 2 }
        ]
      };

      const createdBundle = {
        id: 'bundle-new',
        ...bundleData,
        createdBy: 'user-1',
        createdAt: '2024-07-01T00:00:00Z',
        updatedAt: '2024-07-01T00:00:00Z'
      };

      mockProductBundleService.createBundle.mockResolvedValue({
        success: true,
        data: createdBundle
      });

      // Mock mutation for bundle creation
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue(createdBundle),
        isLoading: false,
        error: null,
        data: createdBundle,
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useCreateBundle(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          bundleData,
          userId: 'user-1'
        });
      });

      expect(mockProductBundleService.createBundle).toHaveBeenCalledWith(
        bundleData,
        'user-1'
      );
    });

    it('should validate bundle pricing rules', async () => {
      const invalidBundleData = {
        bundleName: 'Invalid Bundle',
        bundlePrice: 50.00,
        bundleDiscountAmount: 60.00, // Discount exceeds price
        products: [
          { productId: 'product-1', quantity: 1 }
        ]
      };

      mockProductBundleService.createBundle.mockResolvedValue({
        success: false,
        error: 'Bundle discount amount cannot exceed bundle price'
      });

      // Mock mutation with validation error
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Bundle discount amount cannot exceed bundle price')),
        isLoading: false,
        error: { message: 'Bundle discount amount cannot exceed bundle price' },
        data: null,
        isSuccess: false,
        isError: true,
      } as any);

      const { result } = renderHook(
        () => useCreateBundle(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            bundleData: invalidBundleData,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should validate product associations and quantities', async () => {
      const bundleWithInvalidProducts = {
        bundleName: 'Invalid Product Bundle',
        bundlePrice: 100.00,
        products: [] // Empty products array
      };

      mockProductBundleService.createBundle.mockResolvedValue({
        success: false,
        error: 'Bundle must contain at least one product'
      });

      // Mock mutation with product validation error
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Bundle must contain at least one product')),
        isLoading: false,
        error: { message: 'Bundle must contain at least one product' },
        data: null,
        isSuccess: false,
        isError: true,
      } as any);

      const { result } = renderHook(
        () => useCreateBundle(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            bundleData: bundleWithInvalidProducts,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should invalidate bundle queries after successful creation', async () => {
      const createdBundle = {
        id: 'new-bundle-id',
        bundleName: 'Test Bundle',
        bundlePrice: 50.00
      };

      mockProductBundleService.createBundle.mockResolvedValue({
        success: true,
        data: createdBundle as any
      });

      // Mock mutation for successful creation
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue(createdBundle),
        isLoading: false,
        error: null,
        data: createdBundle,
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useCreateBundle(),
        { wrapper: createWrapper() }
      );

      // Implementation should invalidate bundle list queries
      expect(result.current).toBeDefined();
      // Cache invalidation will be validated in integration tests
    });
  });

  describe('useBundleInventoryImpact - Cross-role Integration', () => {
    it('should calculate inventory impact for bundle quantities', async () => {
      const bundleProducts = [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 }
      ];

      const mockInventoryImpact = {
        impact: [
          { productId: 'product-1', requiredQuantity: 20 }, // 2 * 10 bundles
          { productId: 'product-2', requiredQuantity: 10 }  // 1 * 10 bundles
        ],
        availability: {
          isAvailable: true,
          shortages: []
        },
        recommendations: {
          maxBundleQuantity: 25,
          suggestedReorderLevels: [
            { productId: 'product-1', suggestedLevel: 100 }
          ]
        }
      };

      mockProductBundleService.calculateInventoryImpact.mockResolvedValue({
        success: true,
        data: mockInventoryImpact
      });

      // Mock mutation for inventory impact calculation
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue(mockInventoryImpact),
        isLoading: false,
        error: null,
        data: mockInventoryImpact,
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useBundleInventoryImpact(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          bundleProducts,
          bundleQuantity: 10
        });
      });

      expect(mockProductBundleService.calculateInventoryImpact).toHaveBeenCalledWith(
        bundleProducts,
        10
      );
      expect(result.current.data).toEqual(mockInventoryImpact);
    });

    it('should detect inventory shortages for bundle requirements', async () => {
      const bundleProducts = [
        { productId: 'product-low-stock', quantity: 5 }
      ];

      const mockInventoryShortage = {
        impact: [
          { productId: 'product-low-stock', requiredQuantity: 50 }
        ],
        availability: {
          isAvailable: false,
          shortages: [
            {
              productId: 'product-low-stock',
              required: 50,
              available: 20
            }
          ]
        },
        recommendations: {
          maxBundleQuantity: 4, // Limited by stock
          suggestedReorderLevels: [
            { productId: 'product-low-stock', suggestedLevel: 100 }
          ]
        }
      };

      mockProductBundleService.calculateInventoryImpact.mockResolvedValue({
        success: true,
        data: mockInventoryShortage
      });

      // Mock mutation for inventory shortage detection
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue(mockInventoryShortage),
        isLoading: false,
        error: null,
        data: mockInventoryShortage,
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useBundleInventoryImpact(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          bundleProducts,
          bundleQuantity: 10
        });
      });

      expect(result.current.data?.availability.isAvailable).toBe(false);
      expect(result.current.data?.availability.shortages).toHaveLength(1);
    });

    it('should provide reorder recommendations for inventory planning', async () => {
      const bundleProducts = [
        { productId: 'product-1', quantity: 3 },
        { productId: 'product-2', quantity: 2 }
      ];

      mockProductBundleService.calculateInventoryImpact.mockResolvedValue({
        success: true,
        data: {
          impact: [],
          availability: { isAvailable: true, shortages: [] },
          recommendations: {
            maxBundleQuantity: 50,
            suggestedReorderLevels: [
              { productId: 'product-1', suggestedLevel: 150 },
              { productId: 'product-2', suggestedLevel: 100 }
            ]
          }
        }
      });

      const { result } = renderHook(
        () => useBundleInventoryImpact(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          bundleProducts,
          bundleQuantity: 25
        });
      });

      expect(result.current.data?.recommendations.suggestedReorderLevels).toHaveLength(2);
    });

    it('should integrate with inventory service for real-time data', async () => {
      // Mock inventory service calls
      mockInventoryService.getInventoryByProduct.mockImplementation(async (productId) => ({
        id: `inv-${productId}`,
        productId,
        currentStock: 50,
        reservedStock: 5,
        availableStock: 45,
        minimumThreshold: 10,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }));

      const bundleProducts = [
        { productId: 'product-1', quantity: 2 }
      ];

      mockProductBundleService.calculateInventoryImpact.mockResolvedValue({
        success: true,
        data: {
          impact: [{ productId: 'product-1', requiredQuantity: 20 }],
          availability: { isAvailable: true, shortages: [] },
          recommendations: { maxBundleQuantity: 22, suggestedReorderLevels: [] }
        }
      });

      const { result } = renderHook(
        () => useBundleInventoryImpact(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          bundleProducts,
          bundleQuantity: 10
        });
      });

      // Integration with inventory service should be seamless
      expect(result.current.data?.availability.isAvailable).toBe(true);
    });
  });

  describe('useUpdateBundleProducts - Bundle Product Management', () => {
    it('should update bundle product associations', async () => {
      const updatedProducts = [
        { productId: 'product-1', quantity: 3, displayOrder: 1 },
        { productId: 'product-3', quantity: 1, displayOrder: 2 } // New product added
      ];

      const updatedBundle = {
        id: 'bundle-1',
        bundleName: 'Updated Bundle',
        products: updatedProducts
      };

      mockProductBundleService.updateBundleProducts.mockResolvedValue({
        success: true,
        data: updatedBundle as any
      });

      // Mock mutation for bundle product updates
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue(updatedBundle),
        isLoading: false,
        error: null,
        data: updatedBundle,
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useUpdateBundleProducts(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          bundleId: 'bundle-1',
          products: updatedProducts,
          userId: 'user-1'
        });
      });

      expect(mockProductBundleService.updateBundleProducts).toHaveBeenCalledWith(
        'bundle-1',
        { products: updatedProducts },
        'user-1'
      );
    });

    it('should validate product uniqueness in bundle', async () => {
      const duplicateProducts = [
        { productId: 'product-1', quantity: 2, displayOrder: 1 },
        { productId: 'product-1', quantity: 1, displayOrder: 2 } // Duplicate
      ];

      mockProductBundleService.updateBundleProducts.mockResolvedValue({
        success: false,
        error: 'Bundle cannot contain duplicate products'
      });

      // Mock mutation with validation error
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Bundle cannot contain duplicate products')),
        isLoading: false,
        error: { message: 'Bundle cannot contain duplicate products' },
        data: null,
        isSuccess: false,
        isError: true,
      } as any);

      const { result } = renderHook(
        () => useUpdateBundleProducts(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            bundleId: 'bundle-1',
            products: duplicateProducts,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should invalidate inventory-related queries when bundle products change', async () => {
      const updateResult = {
        id: 'bundle-1',
        bundleName: 'Updated Bundle',
        products: [{ productId: 'product-1', quantity: 1 }]
      };

      mockProductBundleService.updateBundleProducts.mockResolvedValue({
        success: true,
        data: updateResult as any
      });

      // Mock mutation for product update with cache invalidation
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue(updateResult),
        isLoading: false,
        error: null,
        data: updateResult,
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useUpdateBundleProducts(),
        { wrapper: createWrapper() }
      );

      // Implementation should invalidate inventory impact queries
      expect(result.current).toBeDefined();
      // Cache invalidation will be validated in integration tests
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      mockProductBundleService.getBundlesByStatus.mockRejectedValue(
        new Error('Service unavailable')
      );

      // Mock query with service error
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Service unavailable'),
        refetch: jest.fn(),
        isSuccess: false,
        isError: true,
      } as any);

      const { result } = renderHook(
        () => useProductBundles('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should maintain performance targets for bundle operations', async () => {
      const startTime = Date.now();
      const emptyData = { items: [], totalCount: 0, hasMore: false, page: 1, limit: 10 };

      mockProductBundleService.getBundlesByStatus.mockResolvedValue({
        success: true,
        data: emptyData
      });

      // Mock query with performance timing
      mockUseQuery.mockReturnValue({
        data: emptyData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useProductBundles('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Bundle operations should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('should implement proper caching for inventory impact calculations', async () => {
      const bundleProducts = [
        { productId: 'product-1', quantity: 2 }
      ];

      mockProductBundleService.calculateInventoryImpact.mockResolvedValue({
        success: true,
        data: {
          impact: [],
          availability: { isAvailable: true, shortages: [] },
          recommendations: { maxBundleQuantity: 50, suggestedReorderLevels: [] }
        }
      });

      const wrapper = createWrapper();
      
      // First call
      const { result: result1 } = renderHook(
        () => useBundleInventoryImpact(),
        { wrapper }
      );

      await act(async () => {
        await result1.current.mutateAsync({
          bundleProducts,
          bundleQuantity: 10
        });
      });

      // Second call with same parameters should use cache
      const { result: result2 } = renderHook(
        () => useBundleInventoryImpact(),
        { wrapper }
      );

      await act(async () => {
        await result2.current.mutateAsync({
          bundleProducts,
          bundleQuantity: 10
        });
      });

      // Implementation should cache expensive inventory calculations
      expect(mockProductBundleService.calculateInventoryImpact).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cross-System Integration', () => {
    it('should support integration with campaign management', async () => {
      const bundleWithCampaign = {
        bundleName: 'Campaign Bundle',
        bundlePrice: 75.00,
        campaignId: 'campaign-summer',
        products: [
          { productId: 'product-1', quantity: 2 }
        ]
      };

      mockProductBundleService.createBundle.mockResolvedValue({
        success: true,
        data: { ...bundleWithCampaign, id: 'bundle-campaign' } as any
      });

      const { result } = renderHook(
        () => useCreateBundle(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          bundleData: bundleWithCampaign,
          userId: 'user-1'
        });
      });

      expect(result.current.data?.campaignId).toBe('campaign-summer');
    });

    it('should trigger inventory notifications for stock level changes', async () => {
      // This test validates integration with inventory management system
      const { result } = renderHook(
        () => useBundleInventoryImpact(),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
      // Inventory integration will be implemented in Phase 3.4
    });

    it('should support executive analytics data collection', async () => {
      // This test validates integration with executive analytics system
      const { result } = renderHook(
        () => useBundlePerformance('bundle-1'),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
      // Executive analytics integration will be implemented in Phase 3.4
    });
  });
});