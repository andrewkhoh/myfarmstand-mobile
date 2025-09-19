import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fileUploadService } from '../../services/marketing/fileUpload.service';
import { contentKeys } from '../../utils/queryKeyFactory';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseFileUploadOptions {
  bucket?: string;
  folder?: string;
  allowedTypes?: string[];
  maxSizeInMB?: number;
  onSuccess?: (urls: string[]) => void;
  onError?: (error: Error) => void;
  validateDimensions?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
  };
}

export function useFileUpload(options?: UseFileUploadOptions) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[] | any) => {
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: 100, percentage: 0 });

      const filesArray = Array.from(files);

      // Validate image dimensions if required
      if (options?.validateDimensions) {
        for (const file of filesArray) {
          if (file.type.startsWith('image/')) {
            await fileUploadService.validateImageDimensions(
              file,
              options.validateDimensions
            );
          }
        }
      }

      // Upload files
      const results = await fileUploadService.uploadMultiple(files, {
        bucket: options?.bucket,
        folder: options?.folder,
        allowedTypes: options?.allowedTypes,
        maxSizeInMB: options?.maxSizeInMB,
      });

      setUploadProgress({ loaded: 100, total: 100, percentage: 100 });
      setIsUploading(false);

      return results;
    },
    onSuccess: (data) => {
      const urls = data.map(result => result.url);
      options?.onSuccess?.(urls);

      // Invalidate content queries to refresh with new images
      queryClient.invalidateQueries({
        queryKey: contentKeys.all(),
      });
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
      options?.onError?.(error as Error);
    },
  });

  const uploadSingle = useCallback(
    async (file: File, fileName?: string) => {
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: 100, percentage: 0 });

      try {
        // Validate dimensions if required
        if (options?.validateDimensions && file.type.startsWith('image/')) {
          await fileUploadService.validateImageDimensions(
            file,
            options.validateDimensions
          );
        }

        const result = await fileUploadService.uploadFile(
          file,
          fileName || file.name,
          {
            bucket: options?.bucket,
            folder: options?.folder,
            allowedTypes: options?.allowedTypes,
            maxSizeInMB: options?.maxSizeInMB,
          }
        );

        setUploadProgress({ loaded: 100, total: 100, percentage: 100 });
        setIsUploading(false);

        options?.onSuccess?.([result.url]);

        // Invalidate content queries
        queryClient.invalidateQueries({
          queryKey: contentKeys.all(),
        });

        return result;
      } catch (error) {
        setIsUploading(false);
        setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
        options?.onError?.(error as Error);
        throw error;
      }
    },
    [options, queryClient]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      await fileUploadService.deleteFile(path, options?.bucket);

      // Invalidate content queries
      queryClient.invalidateQueries({
        queryKey: contentKeys.all(),
      });
    },
    [options?.bucket, queryClient]
  );

  const deleteMultiple = useCallback(
    async (paths: string[]) => {
      await fileUploadService.deleteMultiple(paths, options?.bucket);

      // Invalidate content queries
      queryClient.invalidateQueries({
        queryKey: contentKeys.all(),
      });
    },
    [options?.bucket, queryClient]
  );

  return {
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    uploadSingle,
    deleteFile,
    deleteMultiple,
    isUploading: isUploading || uploadMutation.isPending,
    uploadProgress,
    error: uploadMutation.error,
  };
}

/**
 * Hook for content image uploads
 */
export function useContentImageUpload() {
  return useFileUpload({
    bucket: 'marketing-assets',
    folder: 'content',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeInMB: 5,
    validateDimensions: {
      minWidth: 200,
      maxWidth: 4000,
      minHeight: 200,
      maxHeight: 4000,
    },
  });
}

/**
 * Hook for campaign banner uploads
 */
export function useCampaignBannerUpload() {
  return useFileUpload({
    bucket: 'marketing-assets',
    folder: 'campaigns',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeInMB: 3,
    validateDimensions: {
      minWidth: 800,
      maxWidth: 2400,
      aspectRatio: 16 / 9, // Require 16:9 aspect ratio for banners
    },
  });
}