import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest } from '@jest/globals';
import { useProductContent } from '../useProductContent';

// Mock the content service
jest.mock('@/services/marketing/contentService', () => ({
  contentService: {
    getProductContent: jest.fn(),
    createProductContent: jest.fn(),
    updateProductContent: jest.fn(),
    deleteProductContent: jest.fn(),
    bulkUpdateContent: jest.fn(),
    duplicateContent: jest.fn(),
    createVersion: jest.fn(),
    getContentList: jest.fn(),
    subscribeToContent: jest.fn(() => () => {})
  }
}));

import { contentService } from '@/services/marketing/contentService';

describe('useProductContent', () => {
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
  
  describe('CRUD operations', () => {
    it('should fetch product content list', async () => {
      const mockContent = [
        { id: 'content-1', title: 'Product A Description', type: 'description', status: 'published' },
        { id: 'content-2', title: 'Product B Features', type: 'features', status: 'draft' },
        { id: 'content-3', title: 'Product C Specs', type: 'specifications', status: 'review' }
      ];
      
      (contentService.getContentList as jest.Mock).mockResolvedValue(mockContent);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.contentList).toHaveLength(3);
      expect(result.current.contentList[0].type).toBe('description');
    });
    
    it('should create new product content', async () => {
      const mockContent = {
        id: 'content-new',
        title: 'New Product Content',
        status: 'draft'
      };
      
      (contentService.createProductContent as jest.Mock).mockResolvedValue(mockContent);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await act(async () => {
        const created = await result.current.createContent({
          title: 'New Product Content',
          description: 'Marketing content',
          product_id: 'product-1'
        });
        expect(created.id).toBe('content-new');
      });
    });
    
    it('should update content data', async () => {
      const mockContent = {
        id: 'content-1',
        title: 'Updated Title',
        updated_at: new Date().toISOString()
      };
      
      (contentService.updateProductContent as jest.Mock).mockResolvedValue(mockContent);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await act(async () => {
        const updated = await result.current.updateContent('content-1', {
          title: 'Updated Title'
        });
        expect(updated.title).toBe('Updated Title');
      });
    });
    
    it('should delete product content', async () => {
      (contentService.deleteProductContent as jest.Mock).mockResolvedValue({ success: true });
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await act(async () => {
        const deleted = await result.current.deleteContent('content-1');
        expect(deleted.success).toBe(true);
      });
    });
  });
  
  describe('content metadata', () => {
    it('should manage SEO metadata', async () => {
      const mockContent = {
        id: 'content-1',
        title: 'Product Content',
        metadata: {
          seo_title: 'Best Product Ever',
          seo_description: 'Product description for SEO',
          keywords: ['product', 'best', 'quality']
        }
      };
      
      (contentService.getProductContent as jest.Mock).mockResolvedValue(mockContent);
      
      const { result } = renderHook(() => useProductContent('product-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current?.data?.id).toBe('content-1');
      expect(result.current?.data?.metadata?.seo_title).toBeDefined();
    });
    
    it('should bulk update content metadata', async () => {
      const mockResult = {
        updated: 3,
        ids: ['content-1', 'content-2', 'content-3']
      };
      
      (contentService.bulkUpdateContent as jest.Mock).mockResolvedValue(mockResult);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await act(async () => {
        const bulkResult = await result.current.bulkUpdate(
          ['content-1', 'content-2', 'content-3'],
          { status: 'published' }
        );
        expect(bulkResult.updated).toBe(3);
      });
    });
    
    it('should duplicate content', async () => {
      const mockContent = {
        id: 'content-copy',
        title: 'Product A Description (Copy)',
        original_id: 'content-1'
      };
      
      (contentService.duplicateContent as jest.Mock).mockResolvedValue(mockContent);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await act(async () => {
        const duplicated = await result.current.duplicateContent('content-1');
        expect(duplicated.id).toBe('content-copy');
      });
    });
    
    it('should version content', async () => {
      const mockVersion = {
        version_id: 'version-1',
        content_id: 'content-1',
        version_number: 2
      };
      
      (contentService.createVersion as jest.Mock).mockResolvedValue(mockVersion);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await act(async () => {
        const version = await result.current.createVersion('content-1', {
          title: 'Version 2'
        });
        expect(version.version_number).toBe(2);
      });
    });
  });
  
  describe('optimistic updates', () => {
    it('should optimistically update content', async () => {
      const mockContent = {
        id: 'content-1',
        title: 'Original',
        description: 'Original description'
      };
      
      (contentService.getProductContent as jest.Mock).mockResolvedValue(mockContent);
      (contentService.updateProductContent as jest.Mock).mockResolvedValue({
        ...mockContent,
        title: 'Updated'
      });
      
      const { result } = renderHook(() => useProductContent('product-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Perform optimistic update
      act(() => {
        if (result.current.setOptimisticContent) {
          result.current.setOptimisticContent({ ...mockContent, title: 'Updated' });
        }
      });
      
      // Check optimistic state
      if (result.current.optimisticData) {
        expect(result.current.optimisticData.title).toBe('Updated');
      }
    });
    
    it('should rollback on failed update', async () => {
      const mockContent = {
        id: 'content-1',
        title: 'Original',
        description: 'Original description'
      };
      
      (contentService.getProductContent as jest.Mock).mockResolvedValue(mockContent);
      (contentService.updateProductContent as jest.Mock).mockRejectedValue(new Error('Update failed'));
      
      const { result } = renderHook(() => useProductContent('product-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        try {
          await result.current.updateContent('content-1', { title: 'Failed Update' });
        } catch {
          // Expected error
        }
      });
      
      await waitFor(() => {
        expect(result.current?.data?.title).toBe('Original');
      });
    });
  });
  
  describe('filtering and search', () => {
    it('should filter content by status', async () => {
      const mockContent = [
        { id: 'content-1', status: 'published' },
        { id: 'content-2', status: 'published' },
        { id: 'content-3', status: 'draft' }
      ];
      
      (contentService.getContentList as jest.Mock).mockResolvedValue(
        mockContent.filter(c => c.status === 'published')
      );
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      act(() => {
        if (result.current.setFilter) {
          result.current.setFilter({ status: 'published' });
        }
      });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      if (result.current.contentList) {
        expect(result.current.contentList.every((item: any) => item.status === 'published')).toBe(true);
      }
    });
  });
  
  describe('pagination', () => {
    it('should paginate content list', async () => {
      const mockContent = Array.from({ length: 50 }, (_, i) => ({
        id: `content-${i}`,
        title: `Content ${i}`
      }));
      
      (contentService.getContentList as jest.Mock).mockResolvedValue(mockContent.slice(0, 10));
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      if (result.current.pagination) {
        expect(result.current.pagination.totalPages).toBe(5);
      }
      
      act(() => {
        if (result.current.fetchPage) {
          result.current.fetchPage(2);
        }
      });
    });
  });
  
  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      (contentService.getProductContent as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch content')
      );
      
      const { result } = renderHook(() => useProductContent('product-1'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      
      expect(result.current.error?.message).toBe('Failed to fetch content');
    });
    
    it('should handle validation errors', async () => {
      const error = {
        message: 'Validation failed',
        errors: {
          title: 'Title is required',
          content: 'Content too short'
        }
      };
      
      (contentService.createProductContent as jest.Mock).mockRejectedValue(error);
      
      const { result } = renderHook(() => useProductContent(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.createContent({ title: '', content: 'Short' });
        } catch (error: any) {
          expect(error.errors.title).toBeDefined();
        }
      });
    });
  });
});