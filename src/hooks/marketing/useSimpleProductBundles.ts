import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { bundleService } from '../../services/marketing/bundle.service';
import type { ProductBundle } from '../../types/marketing.types';

/**
 * Simplified hook for product bundles used by BundleManagementScreen
 * Provides the expected interface without pagination
 */
export function useProductBundles() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bundles', 'all'],
    queryFn: () => bundleService.getBundles(),
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (bundleId: string) => bundleService.deleteBundle(bundleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ bundleId, isActive }: { bundleId: string; isActive: boolean }) =>
      bundleService.updateBundle(bundleId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
    }
  });

  return {
    bundles: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    deleteBundle: (bundleId: string) => deleteMutation.mutate(bundleId),
    toggleBundleActive: (bundleId: string, isActive: boolean) =>
      toggleMutation.mutate({ bundleId, isActive }),
  };
}

export { useProductBundles as useSimpleProductBundles };