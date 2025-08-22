// Phase 3.3.4: Product Content Hooks Implementation (GREEN Phase)
// Following architectural patterns from docs/architectural-patterns-and-best-practices.md
// Pattern: React Query + centralized factory + ValidationMonitor + role permissions

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { ProductContentService } from '../../services/marketing/productContentService';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { contentKeys } from '../../utils/queryKeyFactory';
import type {
  ProductContentTransform,
  UpdateProductContentInput,
  ContentStatusType
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

interface FileUpload {
  name: string;
  size: number;
  type: string;
  buffer: Buffer;
}

interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
}

// Using centralized query key factory from utils/queryKeyFactory

/**
 * Hook to fetch single product content with transformation and validation
 * Supports role-based access control and caching
 */
export function useProductContent(contentId: string, userId?: string) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: contentKeys.detail(contentId),
    queryFn: async (): Promise<ProductContentTransform> => {
      // Role-based access control
      if (effectiveUserId) {
        const hasPermission = await RolePermissionService.hasPermission(
          effectiveUserId,
          'content_management'
        );
        
        if (!hasPermission) {
          ValidationMonitor.recordValidationError({
            context: 'useProductContent',
            errorCode: 'INSUFFICIENT_PERMISSIONS',
            validationPattern: 'simple_validation',
            errorMessage: 'Insufficient permissions for content access'
          });
          throw new Error('Insufficient permissions for content access');
        }
      }

      const result = await ProductContentService.getProductContent(contentId, effectiveUserId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useProductContent',
          errorCode: 'CONTENT_FETCH_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to fetch content'
        });
        throw new Error(result.error || 'Failed to fetch content');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useProductContent',
        pattern: 'transformation_schema',
        operation: 'getProductContent'
      });

      return result.data;
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch content filtered by workflow status with pagination
 * Supports role-based filtering and workflow state management
 */
export function useContentByStatus(
  status: ContentStatusType,
  pagination: PaginationOptions,
  userId?: string
) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: contentKeys.byStatusPaginated(status, pagination),
    queryFn: async (): Promise<PaginatedResponse<ProductContentTransform>> => {
      if (!effectiveUserId) {
        throw new Error('Authentication required for content access');
      }

      // Role-based access control
      const hasPermission = await RolePermissionService.hasPermission(
        effectiveUserId,
        'content_management'
      );
      
      if (!hasPermission) {
        ValidationMonitor.recordValidationError({
          context: 'useContentByStatus',
          errorCode: 'INSUFFICIENT_PERMISSIONS',
          validationPattern: 'simple_validation',
          errorMessage: 'Insufficient permissions for content access'
        });
        throw new Error('Insufficient permissions for content access');
      }

      const result = await ProductContentService.getContentByStatus(status, pagination, effectiveUserId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useContentByStatus',
          errorCode: 'CONTENT_QUERY_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to fetch content by status'
        });
        throw new Error(result.error || 'Failed to fetch content by status');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useContentByStatus',
        pattern: 'transformation_schema',
        operation: 'getContentByStatus'
      });

      return result.data;
    },
    enabled: !!effectiveUserId && !!status,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for updating product content with optimistic updates and cache invalidation
 * Supports workflow state transitions and business rule validation
 */
export function useUpdateProductContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      contentId,
      updateData,
      userId
    }: {
      contentId: string;
      updateData: UpdateProductContentInput;
      userId: string;
    }): Promise<ProductContentTransform> => {
      const result = await ProductContentService.updateProductContent(contentId, updateData, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useUpdateProductContent',
          errorCode: 'CONTENT_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to update content'
        });
        throw new Error(result.error || 'Failed to update content');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useUpdateProductContent',
        pattern: 'transformation_schema',
        operation: 'updateProductContent'
      });

      return result.data;
    },
    onSuccess: (updatedContent) => {
      // Invalidate related queries using centralized key factory
      queryClient.invalidateQueries({ queryKey: contentKeys.detail(updatedContent.id) });
      queryClient.invalidateQueries({ queryKey: contentKeys.byStatus(updatedContent.contentStatus) });
      queryClient.invalidateQueries({ queryKey: contentKeys.lists() });

      // Optimistic update for immediate UI feedback
      queryClient.setQueryData(contentKeys.detail(updatedContent.id), updatedContent);
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useUpdateProductContent.onError',
        errorCode: 'CONTENT_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Update failed'
      });
    }
  });
}

/**
 * Hook for uploading content images with progress tracking and security validation
 * Supports file type validation, size limits, and progress callbacks
 */
export function useUploadContentImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      file,
      userId,
      onProgress
    }: {
      productId: string;
      file: FileUpload;
      userId: string;
      onProgress?: (progress: UploadProgress) => void;
    }): Promise<{ imageUrl: string; fileName: string }> => {
      const result = await ProductContentService.uploadContentImage(
        productId,
        file,
        userId,
        onProgress
      );
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useUploadContentImage',
          errorCode: 'IMAGE_UPLOAD_FAILED',
          validationPattern: 'simple_validation',
          errorMessage: result.error || 'Failed to upload image'
        });
        throw new Error(result.error || 'Failed to upload image');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useUploadContentImage',
        pattern: 'simple_validation',
        operation: 'uploadContentImage'
      });

      return result.data;
    },
    onSuccess: () => {
      // Invalidate upload-related queries
      queryClient.invalidateQueries({ queryKey: contentKeys.uploads() });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useUploadContentImage.onError',
        errorCode: 'IMAGE_UPLOAD_FAILED',
        validationPattern: 'simple_validation',
        errorMessage: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  });
}

/**
 * Hook for content workflow state transition management
 * Validates workflow transitions and updates cache accordingly
 */
export function useContentWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      newStatus,
      userId
    }: {
      contentId: string;
      newStatus: ContentStatusType;
      userId: string;
    }): Promise<ProductContentTransform> => {
      const result = await ProductContentService.updateContentStatus(contentId, newStatus, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useContentWorkflow',
          errorCode: 'STATUS_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to update content status'
        });
        throw new Error(result.error || 'Failed to update content status');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useContentWorkflow',
        pattern: 'transformation_schema',
        operation: 'updateContentStatus'
      });

      return result.data;
    },
    onSuccess: (updatedContent, variables) => {
      // Invalidate queries for both old and new status
      queryClient.invalidateQueries({ queryKey: contentKeys.detail(updatedContent.id) });
      queryClient.invalidateQueries({ queryKey: contentKeys.byStatus(updatedContent.contentStatus) });
      queryClient.invalidateQueries({ queryKey: contentKeys.workflow() });
      
      // Update cache with new data
      queryClient.setQueryData(contentKeys.detail(updatedContent.id), updatedContent);
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useContentWorkflow.onError',
        errorCode: 'STATUS_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Workflow update failed'
      });
    }
  });
}

/**
 * Hook for batch content operations with progress tracking
 * Supports resilient processing with skip-on-error pattern
 */
export function useBatchContentOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      updates,
      userId
    }: {
      updates: Array<{ id: string; data: UpdateProductContentInput }>;
      userId: string;
    }): Promise<{
      successCount: number;
      failureCount: number;
      results: Array<{
        id: string;
        success: boolean;
        data?: ProductContentTransform;
        error?: string;
      }>;
    }> => {
      const result = await ProductContentService.batchUpdateContent(updates, userId);
      
      if (!result.success || !result.data) {
        ValidationMonitor.recordValidationError({
          context: 'useBatchContentOperations',
          errorCode: 'BATCH_UPDATE_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: result.error || 'Failed to process batch updates'
        });
        throw new Error(result.error || 'Failed to process batch updates');
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'useBatchContentOperations',
        pattern: 'transformation_schema',
        operation: 'batchUpdateContent'
      });

      return result.data;
    },
    onSuccess: (batchResult) => {
      // Invalidate all content-related queries after batch operations
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
      
      // Update individual content items in cache for successful updates
      batchResult.results.forEach(result => {
        if (result.success && result.data) {
          queryClient.setQueryData(contentKeys.detail(result.id), result.data);
        }
      });
    },
    onError: (error) => {
      ValidationMonitor.recordValidationError({
        context: 'useBatchContentOperations.onError',
        errorCode: 'BATCH_UPDATE_FAILED',
        validationPattern: 'transformation_schema',
        errorMessage: error instanceof Error ? error.message : 'Batch operation failed'
      });
    }
  });
}

// Export query key factory for use in other hooks and components
export { contentKeys };