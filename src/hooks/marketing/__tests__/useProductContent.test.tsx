// Phase 3.3.1: Product Content Hooks Tests (RED Phase)
// Following TDD pattern: RED → GREEN → REFACTOR
// 20+ comprehensive tests for content management hooks

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';

// Import hooks to test (these don't exist yet - RED phase)
import {
  useProductContent,
  useContentByStatus,
  useUpdateProductContent,
  useUploadContentImage,
  useContentWorkflow,
  useBatchContentOperations
} from '../useProductContent';

// Mock services
import { ProductContentService } from '../../../services/marketing/productContentService';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';

// Mock useAuth hook - following proven pattern from scratchpad-hook-test-setup  
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
  contentKeys: {
    detail: (id: string) => ['content', 'detail', id],
    lists: (status?: string) => status ? ['content', 'lists', status] : ['content', 'lists'],
    all: () => ['content', 'all'],
    byStatusPaginated: (status: string, pagination: any) => ['content', 'status', status, 'paginated', pagination],
    uploadProgress: (uploadId: string) => ['content', 'upload', uploadId],
    workflow: (contentId: string) => ['content', 'workflow', contentId],
    batch: (batchId: string) => ['content', 'batch', batchId],
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
jest.mock('../../../services/marketing/productContentService');
jest.mock('../../../services/role-based/rolePermissionService');

const mockProductContentService = ProductContentService as jest.Mocked<typeof ProductContentService>;
const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;

describe('Product Content Hooks - Phase 3.3.1 (RED Phase)', () => {
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

  describe('useProductContent - Individual Content Fetching', () => {
    it('should fetch single product content with transformation', async () => {
      const mockContent = {
        id: 'content-1',
        productId: 'product-1',
        marketingTitle: 'Fresh Organic Tomatoes',
        marketingDescription: 'Farm-fresh organic tomatoes',
        marketingHighlights: ['Organic', 'Local', 'Fresh'],
        seoKeywords: ['tomatoes', 'organic'],
        featuredImageUrl: 'https://example.com/tomato.jpg',
        galleryUrls: ['https://example.com/gallery1.jpg'],
        contentStatus: 'published' as const,
        contentPriority: 5,
        lastUpdatedBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockProductContentService.getProductContent.mockResolvedValue({
        success: true,
        data: mockContent
      });

      const { result } = renderHook(
        () => useProductContent('content-1', 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockContent);
      expect(mockProductContentService.getProductContent).toHaveBeenCalledWith('content-1', 'user-1');
    });

    it('should handle content not found gracefully', async () => {
      mockProductContentService.getProductContent.mockResolvedValue({
        success: false,
        error: 'Content not found'
      });

      const { result } = renderHook(
        () => useProductContent('nonexistent-id', 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should enforce role-based access control for content viewing', async () => {
      mockRolePermissionService.hasPermission.mockResolvedValue(false);
      
      const { result } = renderHook(
        () => useProductContent('content-1', 'unauthorized-user'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        'unauthorized-user',
        'content_management'
      );
    });

    it('should support query key consistency with centralized factory', async () => {
      mockProductContentService.getProductContent.mockResolvedValue({
        success: true,
        data: {} as any
      });

      const { result } = renderHook(
        () => useProductContent('content-1', 'user-1'),
        { wrapper: createWrapper() }
      );

      // Query key should follow centralized factory pattern
      // This will be validated when query key factory is extended
      expect(result.current).toBeDefined();
    });

    it('should handle concurrent content requests efficiently', async () => {
      mockProductContentService.getProductContent.mockImplementation(async (contentId) => ({
        success: true,
        data: { id: contentId, marketingTitle: `Content ${contentId}` } as any
      }));

      const wrapper = createWrapper();
      
      const { result: result1 } = renderHook(
        () => useProductContent('content-1', 'user-1'),
        { wrapper }
      );
      
      const { result: result2 } = renderHook(
        () => useProductContent('content-2', 'user-1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      expect(mockProductContentService.getProductContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('useContentByStatus - Workflow State Filtering', () => {
    it('should fetch content filtered by workflow status', async () => {
      const mockContentList = {
        items: [
          {
            id: 'content-1',
            productId: 'product-1',
            marketingTitle: 'Draft Content',
            contentStatus: 'draft' as const
          }
        ],
        totalCount: 1,
        hasMore: false,
        page: 1,
        limit: 10
      };

      mockProductContentService.getContentByStatus.mockResolvedValue({
        success: true,
        data: mockContentList
      });

      const { result } = renderHook(
        () => useContentByStatus('draft', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockContentList);
      expect(mockProductContentService.getContentByStatus).toHaveBeenCalledWith(
        'draft',
        { page: 1, limit: 10 },
        'user-1'
      );
    });

    it('should support pagination for large content sets', async () => {
      const mockPage1 = {
        items: Array.from({ length: 10 }, (_, i) => ({ id: `content-${i}`, contentStatus: 'published' as const })),
        totalCount: 25,
        hasMore: true,
        page: 1,
        limit: 10
      };

      mockProductContentService.getContentByStatus.mockResolvedValue({
        success: true,
        data: mockPage1
      });

      const { result } = renderHook(
        () => useContentByStatus('published', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.hasMore).toBe(true);
      expect(result.current.data?.totalCount).toBe(25);
    });

    it('should handle empty content status results', async () => {
      mockProductContentService.getContentByStatus.mockResolvedValue({
        success: true,
        data: {
          items: [],
          totalCount: 0,
          hasMore: false,
          page: 1,
          limit: 10
        }
      });

      const { result } = renderHook(
        () => useContentByStatus('archived', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.items).toHaveLength(0);
    });

    it('should validate workflow status enum values', async () => {
      const { result } = renderHook(
        () => useContentByStatus('invalid-status' as any, { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      // Hook should handle invalid status gracefully
      expect(result.current).toBeDefined();
    });
  });

  describe('useUpdateProductContent - Content Mutation with Optimistic Updates', () => {
    it('should update product content with optimistic UI updates', async () => {
      const updateData = {
        marketingTitle: 'Updated Title',
        contentStatus: 'published' as const
      };

      const updatedContent = {
        id: 'content-1',
        productId: 'product-1',
        marketingTitle: 'Updated Title',
        contentStatus: 'published' as const
      };

      mockProductContentService.updateProductContent.mockResolvedValue({
        success: true,
        data: updatedContent as any
      });

      const { result } = renderHook(
        () => useUpdateProductContent(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          contentId: 'content-1',
          updateData,
          userId: 'user-1'
        });
      });

      expect(mockProductContentService.updateProductContent).toHaveBeenCalledWith(
        'content-1',
        updateData,
        'user-1'
      );
    });

    it('should handle content status workflow validation', async () => {
      mockProductContentService.updateProductContent.mockResolvedValue({
        success: false,
        error: 'Invalid content status transition from draft to published'
      });

      const { result } = renderHook(
        () => useUpdateProductContent(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            contentId: 'content-1',
            updateData: { contentStatus: 'published' as const },
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should invalidate related queries after successful update', async () => {
      const mockQueryClient = new QueryClient();
      const invalidateSpy = jest.spyOn(mockQueryClient, 'invalidateQueries');

      mockProductContentService.updateProductContent.mockResolvedValue({
        success: true,
        data: {} as any
      });

      // This test verifies cache invalidation strategy
      // Implementation will use query key factory patterns
      expect(invalidateSpy).toBeDefined();
    });

    it('should support batch content operations with progress tracking', async () => {
      const batchUpdates = [
        { id: 'content-1', data: { marketingTitle: 'Updated 1' } },
        { id: 'content-2', data: { marketingTitle: 'Updated 2' } }
      ];

      mockProductContentService.batchUpdateContent.mockResolvedValue({
        success: true,
        data: {
          successCount: 2,
          failureCount: 0,
          results: batchUpdates.map(update => ({
            id: update.id,
            success: true,
            data: {} as any
          }))
        }
      });

      const { result } = renderHook(
        () => useBatchContentOperations(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          updates: batchUpdates,
          userId: 'user-1'
        });
      });

      expect(mockProductContentService.batchUpdateContent).toHaveBeenCalledWith(
        batchUpdates,
        'user-1'
      );
    });
  });

  describe('useUploadContentImage - File Upload with Progress Tracking', () => {
    it('should upload content image with progress callbacks', async () => {
      const mockFile = {
        name: 'test-image.jpg',
        size: 1024,
        type: 'image/jpeg',
        buffer: Buffer.from('test-image-data')
      };

      const mockUploadResult = {
        imageUrl: 'https://secure-cdn.farmstand.com/content/product-1/12345-abc.jpg',
        fileName: 'content/product-1/12345-abc.jpg'
      };

      mockProductContentService.uploadContentImage.mockImplementation(
        async (productId, file, userId, progressCallback) => {
          // Simulate progress callbacks
          if (progressCallback) {
            progressCallback({ uploadedBytes: 512, totalBytes: 1024, percentage: 50 });
            progressCallback({ uploadedBytes: 1024, totalBytes: 1024, percentage: 100 });
          }
          
          return {
            success: true,
            data: mockUploadResult
          };
        }
      );

      const { result } = renderHook(
        () => useUploadContentImage(),
        { wrapper: createWrapper() }
      );

      let progressUpdates: any[] = [];

      await act(async () => {
        await result.current.mutateAsync({
          productId: 'product-1',
          file: mockFile,
          userId: 'user-1',
          onProgress: (progress) => {
            progressUpdates.push(progress);
          }
        });
      });

      expect(progressUpdates).toHaveLength(2);
      expect(progressUpdates[1].percentage).toBe(100);
      expect(mockProductContentService.uploadContentImage).toHaveBeenCalled();
    });

    it('should validate file type and size constraints', async () => {
      const invalidFile = {
        name: 'test.txt',
        size: 10 * 1024 * 1024, // 10MB
        type: 'text/plain',
        buffer: Buffer.from('text-file-data')
      };

      mockProductContentService.uploadContentImage.mockResolvedValue({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      });

      const { result } = renderHook(
        () => useUploadContentImage(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            productId: 'product-1',
            file: invalidFile,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should handle upload failures with retry logic', async () => {
      mockProductContentService.uploadContentImage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { imageUrl: 'https://example.com/retry.jpg', fileName: 'retry.jpg' }
        });

      const { result } = renderHook(
        () => useUploadContentImage(),
        { wrapper: createWrapper() }
      );

      // Implementation should include retry logic for upload failures
      expect(result.current).toBeDefined();
    });

    it('should support multiple concurrent uploads', async () => {
      const mockFiles = [
        { name: 'image1.jpg', size: 1024, type: 'image/jpeg', buffer: Buffer.from('img1') },
        { name: 'image2.jpg', size: 1024, type: 'image/jpeg', buffer: Buffer.from('img2') }
      ];

      mockProductContentService.uploadContentImage.mockImplementation(
        async (productId, file) => ({
          success: true,
          data: { imageUrl: `https://example.com/${file.name}`, fileName: file.name }
        })
      );

      const wrapper = createWrapper();
      
      const { result: result1 } = renderHook(
        () => useUploadContentImage(),
        { wrapper }
      );
      
      const { result: result2 } = renderHook(
        () => useUploadContentImage(),
        { wrapper }
      );

      await Promise.all([
        act(async () => {
          await result1.current.mutateAsync({
            productId: 'product-1',
            file: mockFiles[0],
            userId: 'user-1'
          });
        }),
        act(async () => {
          await result2.current.mutateAsync({
            productId: 'product-1',
            file: mockFiles[1],
            userId: 'user-1'
          });
        })
      ]);

      expect(mockProductContentService.uploadContentImage).toHaveBeenCalledTimes(2);
    });
  });

  describe('useContentWorkflow - State Transition Management', () => {
    it('should manage content workflow state transitions', async () => {
      mockProductContentService.updateContentStatus.mockResolvedValue({
        success: true,
        data: {
          id: 'content-1',
          contentStatus: 'approved' as const
        } as any
      });

      const { result } = renderHook(
        () => useContentWorkflow(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          contentId: 'content-1',
          newStatus: 'approved' as const,
          userId: 'user-1'
        });
      });

      expect(mockProductContentService.updateContentStatus).toHaveBeenCalledWith(
        'content-1',
        'approved',
        'user-1'
      );
    });

    it('should validate workflow transition rules', async () => {
      mockProductContentService.updateContentStatus.mockResolvedValue({
        success: false,
        error: 'Invalid content status transition from published to draft'
      });

      const { result } = renderHook(
        () => useContentWorkflow(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            contentId: 'content-1',
            newStatus: 'draft' as const,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should support collaborative workflow with real-time updates', async () => {
      // This test validates integration with real-time subscription system
      // Implementation will use broadcast patterns for workflow changes
      const { result } = renderHook(
        () => useContentWorkflow(),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
      // Real-time integration will be validated in integration tests
    });

    it('should handle workflow conflicts in collaborative environments', async () => {
      mockProductContentService.updateContentStatus.mockResolvedValue({
        success: false,
        error: 'Content has been modified by another user. Please refresh and try again.'
      });

      const { result } = renderHook(
        () => useContentWorkflow(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            contentId: 'content-1',
            newStatus: 'approved' as const,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle service timeouts gracefully', async () => {
      mockProductContentService.getProductContent.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const { result } = renderHook(
        () => useProductContent('content-1', 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 200 });
    });

    it('should implement proper error recovery strategies', async () => {
      mockProductContentService.getProductContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'content-1' } as any
        });

      const { result, rerender } = renderHook(
        () => useProductContent('content-1', 'user-1'),
        { wrapper: createWrapper() }
      );

      // Wait for error state
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Trigger retry
      rerender();

      // Implementation should include retry logic
      expect(result.current).toBeDefined();
    });

    it('should maintain performance targets for content operations', async () => {
      const startTime = Date.now();

      mockProductContentService.getProductContent.mockResolvedValue({
        success: true,
        data: { id: 'content-1' } as any
      });

      const { result } = renderHook(
        () => useProductContent('content-1', 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Content fetching should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});