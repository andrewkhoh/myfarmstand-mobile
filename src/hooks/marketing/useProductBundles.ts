// Phase 3.3.6: Product Bundle Hooks Implementation (GREEN Phase)
// Following architectural patterns from docs/architectural-patterns-and-best-practices.md
// Pattern: React Query + centralized factory + ValidationMonitor + role permissions + inventory integration

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { bundleService } from '../../services/marketing';
import { unifiedRoleService } from '../../services/unifiedRoleService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { bundleKeys, inventoryKeys } from '../../utils/queryKeyFactory';
import type {
  ProductBundleTransform,
  CreateProductBundleInput,
  BundleProductInput,
  UpdateBundleProductsInput
} from '../../schemas/marketing';

// Standard hook response patterns
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

// Bundle performance types
interface BundlePerformance {
  bundleId: string;
  salesMetrics: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
    campaignBoost?: number;
  };
  inventoryImpact: {
    totalUnitsRequired: number;
    inventoryTurnover: number;
    stockAlerts: Array<{ productId: string; level: string }>;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Inventory impact types
interface InventoryImpactResponse {
  impact: Array<{ productId: string; requiredQuantity: number }>;
  availability: {
    isAvailable: boolean;
    shortages: Array<{
      productId: string;
      required: number;
      available: number;
    }>;
  };
  recommendations: {
    maxBundleQuantity: number;
    suggestedReorderLevels: Array<{
      productId: string;
      suggestedLevel: number;
    }>;
  };
}

// Using centralized query key factory from utils/queryKeyFactory

/**
 * Hook to fetch product bundles with role-based access control
 * Supports status filtering and pagination
 */
export function useProductBundles(
  status: string,
  pagination: PaginationOptions,
  userId?: string
) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  const query = useQuery({
    queryKey: bundleKeys.byStatusPaginated(status, pagination),
    queryFn: async (): Promise<PaginatedResponse<ProductBundleTransform>> => {
      if (!effectiveUserId) {
        throw new Error('Authentication required for bundle access');
      }

      // Role-based access control
      const hasPermission = await unifiedRoleService.hasPermission(
        effectiveUserId,
        'bundle_management'
      );

      if (!hasPermission) {
        ValidationMonitor.recordValidationError({
          context: 'useProductBundles',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          validationPattern: 'simple_validation',
          errorMessage: 'Insufficient permissions for bundle access'
        });
        throw new Error('Insufficient permissions for bundle access');
      }

      const result = await bundleService.getBundlesByStatus(status, pagination, effectiveUserId);

      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useProductBundles',
          errorCode: 'BUNDLE_QUERY_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to fetch bundles'
        });
        throw new Error(result.error || 'Failed to fetch bundles');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useProductBundles',
        pattern: 'transformation_schema',
        operation: 'getBundlesByStatus'
      });

      return result.data;
    },
    enabled: !!effectiveUserId && !!status,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    bundles: query?.data?.items || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    totalCount: query?.data?.totalCount || 0,
    hasMore: query?.data?.hasMore || false,
  };
}

/**
 * Hook to fetch bundle performance with sales tracking and analytics
 * Supports campaign integration and inventory impact analysis
 */
export function useBundlePerformance(bundleId: string) {
  return useQuery({
    queryKey: bundleKeys.performance(bundleId),
    queryFn: async (): Promise<BundlePerformance> => {
      const result = await bundleService.getBundlePerformance(bundleId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useBundlePerformance',
          errorCode: 'BUNDLE_PERFORMANCE_QUERY_FAILED',
          validationPattern: 'direct_schema',
          errorMessage: result.error || 'Failed to fetch bundle performance'
        });
        throw new Error(result.error || 'Failed to fetch bundle performance');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useBundlePerformance',
        pattern: 'direct_supabase_query',
        operation: 'getBundlePerformance'
      });

      return result.data;
    },
    enabled: !!bundleId,
    staleTime: 5 * 60 * 1000, // 5 minutes for performance data
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 15 * 60 * 1000, // Auto-refresh every 15 minutes
  });
}

/**
 * Hook for creating product bundles with product associations
 * Supports bundle pricing validation and product relationship management
 */
export function useCreateBundle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bundleData,
      userId
    }: {
      bundleData: CreateProductBundleInput;
      userId: string;
    }): Promise<ProductBundleTransform> => {
      const result = await bundleService.createBundle(bundleData, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useCreateBundle',
          errorCode: 'BUNDLE_CREATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to create bundle'
        });
        throw new Error(result.error || 'Failed to create bundle');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useCreateBundle',
        pattern: 'transformation_schema',
        operation: 'createBundle'
      });

      return result.data;
    },
    onSuccess: (createdBundle) => {
      // Invalidate bundle lists to include new bundle
      queryClient.invalidateQueries({ queryKey: bundleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bundleKeys.byStatus('active') });
      
      // Set new bundle in cache
      queryClient.setQueryData(bundleKeys.detail(createdBundle.id), createdBundle);
      
      // Invalidate inventory impact queries as new bundle affects inventory
      queryClient.invalidateQueries({ queryKey: bundleKeys.inventoryImpact() });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useCreateBundle.onError',
        errorCode: 'BUNDLE_CREATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Bundle creation failed'
      });
    }
  });
}

/**
 * Hook for calculating bundle inventory impact with cross-role integration
 * Integrates with inventory service for real-time stock calculations
 */
export function useBundleInventoryImpact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bundleProducts,
      bundleQuantity
    }: {
      bundleProducts: BundleProductInput[];
      bundleQuantity: number;
    }): Promise<InventoryImpactResponse> => {
      const result = await bundleService.calculateInventoryImpact(bundleProducts, bundleQuantity);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useBundleInventoryImpact',
          errorCode: 'INVENTORY_CALCULATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to calculate inventory impact'
        });
        throw new Error(result.error || 'Failed to calculate inventory impact');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useBundleInventoryImpact',
        pattern: 'transformation_schema',
        operation: 'calculateInventoryImpact'
      });

      return result.data;
    },
    onSuccess: (impactData, variables) => {
      // Cache inventory impact data for performance
      const cacheKey = `${variables.bundleProducts.map(p => p.productId).join('-')}-${variables.bundleQuantity}`;
      queryClient.setQueryData(
        [...bundleKeys.inventoryImpact(), cacheKey],
        impactData
      );
      
      // Invalidate inventory-related queries for cross-system integration
      queryClient.invalidateQueries({ queryKey: inventoryKeys.availability() });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useBundleInventoryImpact.onError',
        errorCode: 'INVENTORY_CALCULATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Inventory calculation failed'
      });
    }
  });
}

/**
 * Hook for updating bundle product associations
 * Supports product relationship management and validation
 */
export function useUpdateBundleProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bundleId,
      products,
      userId
    }: {
      bundleId: string;
      products: BundleProductInput[];
      userId: string;
    }): Promise<ProductBundleTransform> => {
      const updateData: UpdateBundleProductsInput = { products };
      const result = await bundleService.updateBundleProducts(bundleId, updateData, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useUpdateBundleProducts',
          errorCode: 'BUNDLE_PRODUCTS_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to update bundle products'
        });
        throw new Error(result.error || 'Failed to update bundle products');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useUpdateBundleProducts',
        pattern: 'transformation_schema',
        operation: 'updateBundleProducts'
      });

      return result.data;
    },
    onSuccess: (updatedBundle, variables) => {
      // Update bundle and products cache
      queryClient.setQueryData(bundleKeys.detail(updatedBundle.id), updatedBundle);
      queryClient.invalidateQueries({ queryKey: bundleKeys.products(variables.bundleId) });
      
      // Invalidate inventory impact queries when products change
      queryClient.invalidateQueries({ queryKey: bundleKeys.inventoryImpact() });
      queryClient.invalidateQueries({ queryKey: bundleKeys.inventoryImpactForBundle(variables.bundleId) });
      
      // Invalidate performance data as product changes affect metrics
      queryClient.invalidateQueries({ queryKey: bundleKeys.performance(variables.bundleId) });
      
      // Cross-system integration: invalidate inventory queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.impact() });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useUpdateBundleProducts.onError',
        errorCode: 'BUNDLE_PRODUCTS_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Bundle products update failed'
      });
    }
  });
}

/**
 * Hook for toggling bundle status (active/inactive)
 * Integrates with inventory availability checking
 */
export function useToggleBundleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bundleId,
      isActive,
      userId
    }: {
      bundleId: string;
      isActive: boolean;
      userId: string;
    }): Promise<ProductBundleTransform> => {
      const result = await bundleService.toggleBundleStatus(bundleId, { isActive }, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useToggleBundleStatus',
          errorCode: 'BUNDLE_STATUS_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to update bundle status'
        });
        throw new Error(result.error || 'Failed to update bundle status');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useToggleBundleStatus',
        pattern: 'transformation_schema',
        operation: 'toggleBundleStatus'
      });

      return result.data;
    },
    onSuccess: (updatedBundle, variables) => {
      // Update bundle cache and invalidate status-based queries
      queryClient.setQueryData(bundleKeys.detail(updatedBundle.id), updatedBundle);
      queryClient.invalidateQueries({ queryKey: bundleKeys.byStatus('active') });
      queryClient.invalidateQueries({ queryKey: bundleKeys.byStatus('inactive') });
      
      // If bundle is being activated, check inventory impact
      if (variables.isActive) {
        queryClient.invalidateQueries({ queryKey: bundleKeys.inventoryImpactForBundle(variables.bundleId) });
      }
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useToggleBundleStatus.onError',
        errorCode: 'BUNDLE_STATUS_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Bundle status update failed'
      });
    }
  });
}

/**
 * Hook for calculating bundle discount pricing
 * Supports dynamic pricing and campaign integration
 */
export function useBundleDiscountCalculation() {
  return useMutation({
    mutationFn: async ({
      bundleId,
      campaignId
    }: {
      bundleId: string;
      campaignId?: string;
    }): Promise<{
      originalPrice: number;
      discountAmount: number;
      finalPrice: number;
      totalSavings: number;
      savingsPercentage: number;
      hasMeaningfulSavings: boolean;
    }> => {
      const result = await bundleService.calculateBundleDiscount(bundleId, campaignId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useBundleDiscountCalculation',
          errorCode: 'DISCOUNT_CALCULATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to calculate bundle discount'
        });
        throw new Error(result.error || 'Failed to calculate bundle discount');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useBundleDiscountCalculation',
        pattern: 'transformation_schema',
        operation: 'calculateBundleDiscount'
      });

      return result.data;
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useBundleDiscountCalculation.onError',
        errorCode: 'DISCOUNT_CALCULATION_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Discount calculation failed'
      });
    }
  });
}

// Export query key factory for use in other hooks and components
export { bundleKeys };