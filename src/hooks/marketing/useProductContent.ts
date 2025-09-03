import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingKeys } from '@/utils/queryKeys';
import { contentService } from '@/services/marketing/contentService';
import { MarketingCampaign, MarketingContent, CampaignFilter, Product, ProductBundle, WorkflowState, WorkflowConfig, WorkflowResult, WorkflowContext, CalendarEvent } from '@/schemas/marketing';

interface ProductContent {
  id: string;
  product_id?: string;
  title: string;
  description?: string;
  content?: string;
  type?: string;
  features?: string[];
  specifications?: Record<string, any>;
  images?: string[];
  videos?: string[];
  status?: 'draft' | 'published' | 'archived' | 'review';
  metadata?: {
    seo_title?: string;
    seo_description?: string;
    keywords?: string[];
  };
  created_at?: Date;
  updated_at?: Date;
}

export function useProductContent(productId?: string) {
  const queryClient = useQueryClient();
  const [optimisticContent, setOptimisticContent] = useState<ProductContent | null>(null);
  const [filter, setFilter] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  
  // Query for product content
  const contentQuery = useQuery({
    queryKey: marketingKeys.content.detail(productId || ''),
    queryFn: async () => {
      if (!productId) return null;
      return contentService.getProductContent?.(productId) || null;
    },
    enabled: !!productId,
    staleTime: 30000
  });
  
  // Query for content list
  const contentListQuery = useQuery({
    queryKey: ['content-list', filter, currentPage],
    queryFn: async () => {
      return contentService.getContentList?.(filter, currentPage) || [];
    },
    enabled: !productId,
    staleTime: 30000
  });

  // Create content mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<ProductContent>) => {
      return contentService.createProductContent?.(data) || 
        Promise.reject(new Error('Create not implemented'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.all() });
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
    }
  });

  // Update content mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductContent> }) => {
      return contentService.updateProductContent?.(id, data) || 
        Promise.reject(new Error('Update not implemented'));
    },
    onMutate: async ({ id, data }) => {
      try {
        await queryClient.cancelQueries({ 
          queryKey: marketingKeys.content.detail(id) 
        });
      } catch (error) {
        console.error('Failed to cancel queries:', error);
      }
      
      const previousContent = queryClient.getQueryData(
        marketingKeys.content.detail(id)
      );
      
      queryClient.setQueryData(
        marketingKeys.content.detail(id),
        (old: ProductContent | null) => ({ ...old, ...data })
      );
      
      return { previousContent };
    },
    onError: (err, variables, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(
          marketingKeys.content.detail(variables.id),
          context.previousContent
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.content.detail(variables.id) 
      });
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
    }
  });

  // Delete content mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return contentService.deleteProductContent?.(id) || 
        Promise.reject(new Error('Delete not implemented'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.all() });
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
    }
  });
  
  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, data }: { ids: string[]; data: Partial<ProductContent> }) => {
      return contentService.bulkUpdateContent?.(ids, data) || 
        Promise.reject(new Error('Bulk update not implemented'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.all() });
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
    }
  });
  
  // Duplicate content mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => {
      return contentService.duplicateContent?.(id) || 
        Promise.reject(new Error('Duplicate not implemented'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.all() });
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
    }
  });
  
  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductContent> }) => {
      return contentService.createVersion?.(id, data) || 
        Promise.reject(new Error('Version creation not implemented'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.all() });
    }
  });

  // Publish content mutation
  const publishMutation = useMutation({
    mutationFn: (id: string) => {
      return contentService.publishProductContent?.(id) || 
        Promise.reject(new Error('Publish not implemented'));
    },
    onMutate: async (id) => {
      try {
        await queryClient.cancelQueries({ 
          queryKey: marketingKeys.content.detail(id) 
        });
      } catch (error) {
        console.error('Failed to cancel queries:', error);
      }
      
      const previousContent = queryClient.getQueryData(
        marketingKeys.content.detail(id)
      );
      
      queryClient.setQueryData(
        marketingKeys.content.detail(id),
        (old: ProductContent | null) => ({ ...old, status: 'published' })
      );
      
      return { previousContent };
    },
    onError: (err, id, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(
          marketingKeys.content.detail(id),
          context.previousContent
        );
      }
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.content.detail(id) 
      });
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
    }
  });

  // Archive content mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => {
      return contentService.archiveProductContent?.(id) || 
        Promise.reject(new Error('Archive not implemented'));
    },
    onMutate: async (id) => {
      try {
        await queryClient.cancelQueries({ 
          queryKey: marketingKeys.content.detail(id) 
        });
      } catch (error) {
        console.error('Failed to cancel queries:', error);
      }
      
      const previousContent = queryClient.getQueryData(
        marketingKeys.content.detail(id)
      );
      
      queryClient.setQueryData(
        marketingKeys.content.detail(id),
        (old: ProductContent | null) => ({ ...old, status: 'archived' })
      );
      
      return { previousContent };
    },
    onError: (err, id, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(
          marketingKeys.content.detail(id),
          context.previousContent
        );
      }
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.content.detail(id) 
      });
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
    }
  });
  
  // Helper functions
  const createContent = useCallback(async (data: Partial<ProductContent>) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);
  
  const updateContent = useCallback(async (id: string, data: Partial<ProductContent>) => {
    return updateMutation.mutateAsync({ id, data });
  }, [updateMutation]);
  
  const deleteContent = useCallback(async (id: string) => {
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation]);
  
  const bulkUpdate = useCallback(async (ids: string[], data: Partial<ProductContent>) => {
    return bulkUpdateMutation.mutateAsync({ ids, data });
  }, [bulkUpdateMutation]);
  
  const duplicateContent = useCallback(async (id: string) => {
    return duplicateMutation.mutateAsync(id);
  }, [duplicateMutation]);
  
  const createVersion = useCallback(async (id: string, data: Partial<ProductContent>) => {
    return createVersionMutation.mutateAsync({ id, data });
  }, [createVersionMutation]);
  
  const fetchPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!productId) return;
    
    const unsubscribe = contentService.subscribeToContent?.(
      productId,
      (update) => {
        queryClient.setQueryData(
          marketingKeys.content.detail(productId),
          update
        );
      }
    ) || (() => {});
    
    return () => {
      unsubscribe();
    };
  }, [productId, queryClient]);
  
  // Calculate pagination
  const totalItems = contentListQuery.data?.length || 0;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    // Data
    data: optimisticContent || contentQuery.data,
    contentList: contentListQuery.data || [],
    optimisticData: optimisticContent,
    
    // Actions
    create: createMutation.mutate,
    createContent,
    update: (id: string, data: Partial<ProductContent>) => 
      updateMutation.mutate({ id, data }),
    updateContent,
    delete: deleteMutation.mutate,
    deleteContent,
    bulkUpdate,
    duplicateContent,
    createVersion,
    publish: publishMutation.mutate,
    archive: archiveMutation.mutate,
    setOptimisticContent,
    setFilter,
    fetchPage,
    
    // Status
    isLoading: contentQuery.isLoading || contentListQuery.isLoading,
    isError: contentQuery.isError || contentListQuery.isError,
    error: contentQuery.error || contentListQuery.error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPublishing: publishMutation.isPending,
    isArchiving: archiveMutation.isPending,
    
    // Pagination
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage
    },
    
    // Optimistic state
    isOptimistic: !!optimisticContent || 
                  updateMutation.isPending || 
                  publishMutation.isPending || 
                  archiveMutation.isPending
  };
}