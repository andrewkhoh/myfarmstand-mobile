import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { contentService } from '@/services/marketing/contentService';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface MediaItem {
  id: string;
  url: string;
  type: string;
  name: string;
  size: number;
  folder?: string;
  thumbnail_url?: string;
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  folder?: string;
  optimize?: boolean;
}

interface QueuedUpload {
  file: File;
  priority: number;
  metadata?: Record<string, any>;
}

export function useContentUpload(contentId?: string) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [optimisticGallery, setOptimisticGallery] = useState<MediaItem[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit] = useState(5368709120); // 5GB
  const [retryCount, setRetryCount] = useState(0);
  const [uploadQueue, setUploadQueue] = useState<QueuedUpload[]>([]);

  // Gallery query
  const galleryQuery = useQuery({
    queryKey: marketingKeys.content.uploads(contentId || ''),
    queryFn: async () => {
      if (!contentId) return [];
      return contentService.getGallery?.(contentId) || [];
    },
    enabled: !!contentId
  });

  // Single file upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, options }: { file: File; options?: UploadOptions }) => {
      const onProgress = (progress: UploadProgress) => {
        setUploadProgress(progress.percentage);
        options?.onProgress?.(progress);
      };
      
      return contentService.uploadFile(file, { ...options, onProgress });
    },
    onMutate: async ({ file }) => {
      // Add optimistic item
      const tempItem: MediaItem = {
        id: `temp-${Date.now()}`,
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        size: file.size
      };
      setOptimisticGallery(prev => [...prev, tempItem]);
      return { tempItem };
    },
    onSuccess: (data, variables, context) => {
      // Remove optimistic item and add real one
      setOptimisticGallery(prev => prev.filter(item => item.id !== context?.tempItem.id));
      if (contentId) {
        queryClient.invalidateQueries({ queryKey: marketingKeys.content.uploads(contentId) });
      }
    },
    onError: (error, variables, context) => {
      // Remove optimistic item on error
      setOptimisticGallery(prev => prev.filter(item => item.id !== context?.tempItem.id));
      setUploadProgress(0);
    }
  });

  // Multiple file upload mutation
  const uploadMultipleMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return contentService.uploadMultiple(files);
    },
    onSuccess: () => {
      if (contentId) {
        queryClient.invalidateQueries({ queryKey: marketingKeys.content.uploads(contentId) });
      }
    }
  });

  // Resume upload mutation
  const resumeMutation = useMutation({
    mutationFn: (uploadId: string) => {
      return contentService.resumeUpload(uploadId);
    }
  });

  // Delete media mutation
  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => {
      return contentService.deleteMedia(mediaId);
    },
    onSuccess: () => {
      if (contentId) {
        queryClient.invalidateQueries({ queryKey: marketingKeys.content.uploads(contentId) });
      }
    }
  });

  // Move to folder mutation
  const moveToFolderMutation = useMutation({
    mutationFn: ({ mediaIds, folder }: { mediaIds: string[]; folder: string }) => {
      return contentService.moveToFolder(mediaIds, folder);
    },
    onSuccess: () => {
      if (contentId) {
        queryClient.invalidateQueries({ queryKey: marketingKeys.content.uploads(contentId) });
      }
    }
  });

  // Helper functions
  const uploadFile = useCallback((file: File, options?: UploadOptions) => {
    if (storageUsed + file.size > storageLimit) {
      throw new Error('Storage quota exceeded');
    }
    uploadMutation.mutate({ file, options });
  }, [uploadMutation, storageUsed, storageLimit]);

  const uploadMultiple = useCallback((files: File[]) => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (storageUsed + totalSize > storageLimit) {
      throw new Error('Storage quota exceeded');
    }
    uploadMultipleMutation.mutate(files);
  }, [uploadMultipleMutation, storageUsed, storageLimit]);

  const resumeUpload = useCallback((uploadId: string) => {
    resumeMutation.mutate(uploadId);
  }, [resumeMutation]);

  const cancelUpload = useCallback((uploadId: string) => {
    contentService.cancelUpload?.(uploadId);
  }, []);

  const validateFile = useCallback((file: File) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }
    
    return { valid: true };
  }, []);

  const optimizeImage = useCallback(async (file: File) => {
    if (!contentService.optimizeImage) {
      return { optimized: false, originalSize: file.size, optimizedSize: file.size };
    }
    return contentService.optimizeImage(file);
  }, []);

  const generateThumbnail = useCallback(async (uploadId: string) => {
    if (!contentService.generateThumbnail) {
      return { thumbnail_url: '', dimensions: { width: 0, height: 0 } };
    }
    return contentService.generateThumbnail(uploadId);
  }, []);

  const deleteMedia = useCallback((mediaId: string) => {
    deleteMutation.mutate(mediaId);
  }, [deleteMutation]);

  const moveToFolder = useCallback((mediaIds: string[], folder: string) => {
    moveToFolderMutation.mutate({ mediaIds, folder });
  }, [moveToFolderMutation]);

  const handleDrop = useCallback((event: ProductContent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []) as File[];
    if (files.length === 1) {
      uploadFile(files[0]);
    } else if (files.length > 1) {
      uploadMultiple(files);
    }
  }, [uploadFile, uploadMultiple]);

  const queueUpload = useCallback((upload: QueuedUpload) => {
    setUploadQueue(prev => [...prev, upload].sort((a, b) => b.priority - a.priority));
  }, []);

  const processQueue = useCallback(() => {
    if (uploadQueue.length > 0 && !uploadMutation.isPending) {
      const next = uploadQueue[0];
      setUploadQueue(prev => prev.slice(1));
      uploadFile(next.file);
    }
  }, [uploadQueue, uploadMutation.isPending, uploadFile]);

  const retryUpload = useCallback((uploadId: string) => {
    setRetryCount(prev => prev + 1);
    resumeUpload(uploadId);
  }, [resumeUpload]);

  // Process queue when ready
  useEffect(() => {
    processQueue();
  }, [processQueue]);

  // Storage tracking
  useEffect(() => {
    const calculateStorage = async () => {
      if (!contentService.getStorageUsage) return;
      const usage = try {
   await contentService.getStorageUsage()
 } catch (error) {
   console.error('Operation failed:', error);
 };
      setStorageUsed(usage);
    };
    calculateStorage();
  }, [galleryQuery.data]);

  return {
    // Data
    gallery: [...(galleryQuery.data || []), ...optimisticGallery],
    optimisticGallery,
    uploadProgress,
    storageUsed,
    storageLimit,
    retryCount,
    retryAfter: 60, // Mock retry after for rate limiting
    
    // Actions
    uploadFile,
    uploadMultiple,
    resumeUpload,
    cancelUpload,
    validateFile,
    optimizeImage,
    generateThumbnail,
    deleteMedia,
    moveToFolder,
    handleDrop,
    queueUpload,
    retryUpload,
    
    // Status
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    isLoading: galleryQuery.isLoading,
    error: galleryQuery.error
  };
}