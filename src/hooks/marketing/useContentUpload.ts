import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '../../utils/queryKeyFactory';
import { fileUploadService } from '../../services/marketing';
import type { ProductContent } from '../../types/marketing';

export function useContentUpload(contentId: string) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const queryClient = useQueryClient();
  
  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'image' | 'document' }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contentId', contentId);
      formData.append('type', type);
      
      setUploadProgress(0);
      
      return await fileUploadService.uploadFile(formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total!
          );
          setUploadProgress(progress);
        },
      });
    },
    onSuccess: (data) => {
      // Update content with new file reference
      const queryKey = marketingKeys.content.detail(contentId);
      const currentContent = queryClient.getQueryData<ProductContent>(queryKey);
      
      // Always set data even if no current content exists
      const fieldName = data.type === 'image' ? 'imageUrls' : 'documents';
      const updatedContent = currentContent ? {
        ...currentContent,
        [fieldName]: [
          ...(currentContent[fieldName] || []),
          data.url,
        ],
        lastModified: new Date(),
      } : {
        id: contentId,
        [fieldName]: [data.url],
        lastModified: new Date(),
      } as any;
      
      queryClient.setQueryData(queryKey, updatedContent);
      
      setUploadProgress(100);
      
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 500);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });
  
  const resetProgress = () => {
    setUploadProgress(0);
  };
  
  const cancelUpload = () => {
    uploadMutation.reset();
    setUploadProgress(0);
  };
  
  return {
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadProgress,
    error: uploadMutation.error,
    reset: uploadMutation.reset,
    resetProgress,
    cancelUpload,
    uploadedFile: uploadMutation.data,
  };
}