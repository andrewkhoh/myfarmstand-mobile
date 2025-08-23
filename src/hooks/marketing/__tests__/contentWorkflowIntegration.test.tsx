// Phase 3.4.1: Content Workflow Hook Integration Tests (RED Phase)
// Following TDD pattern: RED → GREEN → REFACTOR
// Hook-level integration tests for complete content workflow

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';

// Import hooks to test
import {
  useProductContent,
  useUpdateContent,
  useContentWorkflow,
  useContentAnalytics
} from '../useProductContent';

// Import centralized query keys
import { contentKeys } from '../../../utils/queryKeyFactory';

// Mock services
import { ProductContentService } from '../../../services/marketing/productContentService';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';

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
jest.mock('../../useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } })
}));

const mockProductContentService = ProductContentService as jest.Mocked<typeof ProductContentService>;
const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;

describe('Content Workflow Hook Integration - Phase 3.4.1 (RED Phase)', () => {
  const testUserId = 'test-user-123';
  const testContentId = 'content-456';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful responses
    mockRolePermissionService.hasPermission.mockResolvedValue(true);
    mockProductContentService.getProductContent.mockResolvedValue({
      success: true,
      data: {
        id: testContentId,
        title: 'Test Content',
        description: 'Test description',
        imageUrl: null,
        videoUrl: null,
        contentStatus: 'draft',
        publishedDate: null,
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByUserId: testUserId
      }
    });
  });

  describe('Complete Content Lifecycle Hook Integration', () => {
    test('should manage complete workflow through hooks', async () => {
      // This test will fail until workflow hooks are implemented
      const wrapper = createWrapper();

      // Test initial content fetch
      const { result: contentResult } = renderHook(
        () => useProductContent(testContentId),
        { wrapper }
      );

      await waitFor(() => {
        expect(contentResult.current.isSuccess).toBe(true);
      });

      expect(contentResult.current.data?.contentStatus).toBe('draft');

      // Test workflow transition hook
      const { result: workflowResult } = renderHook(
        () => useContentWorkflow(),
        { wrapper }
      );

      // Mock workflow transition
      mockProductContentService.updateProductContent.mockResolvedValue({
        success: true,
        data: {
          ...contentResult.current.data!,
          contentStatus: 'review'
        }
      });

      // Execute workflow transition
      await act(async () => {
        await workflowResult.current.mutateAsync({
          contentId: testContentId,
          fromStatus: 'draft',
          toStatus: 'review',
          userId: testUserId
        });
      });

      expect(workflowResult.current.isSuccess).toBe(true);
      expect(mockProductContentService.updateProductContent).toHaveBeenCalledWith(
        testContentId,
        { contentStatus: 'review' },
        testUserId
      );
    });

    test('should invalidate queries during workflow transitions', async () => {
      const wrapper = createWrapper();
      const queryClient = new QueryClient();

      // Spy on query invalidation
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useContentWorkflow(),
        { wrapper }
      );

      mockProductContentService.updateProductContent.mockResolvedValue({
        success: true,
        data: {
          id: testContentId,
          title: 'Updated Content',
          description: 'Updated description',
          imageUrl: null,
          videoUrl: null,
          contentStatus: 'approved',
          publishedDate: null,
          priority: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByUserId: testUserId
        }
      });

      await act(async () => {
        await result.current.mutateAsync({
          contentId: testContentId,
          fromStatus: 'review',
          toStatus: 'approved',
          userId: testUserId
        });
      });

      // Verify proper query invalidation using centralized keys
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: contentKeys.detail(testContentId, testUserId)
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: contentKeys.byStatus('review', testUserId)
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: contentKeys.byStatus('approved', testUserId)
      });
    });

    test('should handle workflow validation errors', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useContentWorkflow(),
        { wrapper }
      );

      // Mock validation error
      mockProductContentService.updateProductContent.mockResolvedValue({
        success: false,
        error: 'Invalid workflow transition: draft → published'
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            contentId: testContentId,
            fromStatus: 'draft',
            toStatus: 'published', // Invalid transition
            userId: testUserId
          });
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain('Invalid workflow transition');
    });
  });

  describe('Cross-Layer Cache Integration', () => {
    test('should coordinate cache invalidation across content layers', async () => {
      // Test will fail until cross-layer integration is implemented
      const wrapper = createWrapper();

      const { result: updateResult } = renderHook(
        () => useUpdateContent(),
        { wrapper }
      );

      mockProductContentService.updateProductContent.mockResolvedValue({
        success: true,
        data: {
          id: testContentId,
          title: 'Updated Title',
          description: 'Updated description',
          imageUrl: null,
          videoUrl: null,
          contentStatus: 'draft',
          publishedDate: null,
          priority: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByUserId: testUserId
        }
      });

      await act(async () => {
        await updateResult.current.mutateAsync({
          contentId: testContentId,
          updates: {
            title: 'Updated Title',
            priority: 2
          },
          userId: testUserId
        });
      });

      expect(updateResult.current.isSuccess).toBe(true);
      
      // Verify cache invalidation affects related queries
      const { result: contentResult } = renderHook(
        () => useProductContent(testContentId),
        { wrapper }
      );

      await waitFor(() => {
        expect(contentResult.current.data?.title).toBe('Updated Title');
        expect(contentResult.current.data?.priority).toBe(2);
      });
    });

    test('should handle optimistic updates with rollback', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useUpdateContent(),
        { wrapper }
      );

      // Mock service failure
      mockProductContentService.updateProductContent.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const originalData = {
        id: testContentId,
        title: 'Original Title',
        description: 'Original description',
        imageUrl: null,
        videoUrl: null,
        contentStatus: 'draft',
        publishedDate: null,
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByUserId: testUserId
      };

      await act(async () => {
        try {
          await result.current.mutateAsync({
            contentId: testContentId,
            updates: {
              title: 'Failed Update'
            },
            userId: testUserId
          });
        } catch (error) {
          // Expected failure
        }
      });

      // Verify rollback occurred
      const { result: contentResult } = renderHook(
        () => useProductContent(testContentId),
        { wrapper }
      );

      await waitFor(() => {
        expect(contentResult.current.data?.title).toBe(originalData.title);
      });
    });
  });

  describe('Real-Time Collaboration Integration', () => {
    test('should handle real-time content updates', async () => {
      // Test will fail until real-time integration is implemented
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useProductContent(testContentId, { enableRealTime: true }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Simulate real-time update from another user
      const updatedContent = {
        ...result.current.data!,
        title: 'Updated by Another User',
        updatedAt: new Date().toISOString()
      };

      // Mock real-time broadcast
      mockProductContentService.getProductContent.mockResolvedValue({
        success: true,
        data: updatedContent
      });

      // Trigger real-time update
      await act(async () => {
        // Simulate broadcast event
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data?.title).toBe('Updated by Another User');
      });
    });

    test('should handle concurrent edit conflicts', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useUpdateContent(),
        { wrapper }
      );

      // Mock conflict detection
      mockProductContentService.updateProductContent.mockResolvedValue({
        success: false,
        error: 'Content was modified by another user',
        conflictData: {
          currentVersion: new Date().toISOString(),
          conflictingFields: ['title', 'description']
        }
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            contentId: testContentId,
            updates: {
              title: 'Conflicting Update'
            },
            userId: testUserId
          });
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain('modified by another user');
    });
  });

  describe('Performance Integration Validation', () => {
    test('should maintain performance during workflow operations', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useContentWorkflow(),
        { wrapper }
      );

      // Mock successful but slow operation
      mockProductContentService.updateProductContent.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: {
              id: testContentId,
              title: 'Performance Test Content',
              description: 'Performance test description',
              imageUrl: null,
              videoUrl: null,
              contentStatus: 'review',
              publishedDate: null,
              priority: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdByUserId: testUserId
            }
          }), 100) // 100ms delay
        )
      );

      const startTime = Date.now();

      await act(async () => {
        await result.current.mutateAsync({
          contentId: testContentId,
          fromStatus: 'draft',
          toStatus: 'review',
          userId: testUserId
        });
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.current.isSuccess).toBe(true);
      expect(duration).toBeLessThan(1000); // Under 1 second
    });

    test('should optimize query key usage for cache efficiency', async () => {
      const wrapper = createWrapper();

      // Test multiple content queries use efficient cache keys
      const contentIds = ['content-1', 'content-2', 'content-3'];
      
      const hooks = contentIds.map(id => 
        renderHook(() => useProductContent(id), { wrapper })
      );

      await Promise.all(
        hooks.map(({ result }) => 
          waitFor(() => expect(result.current.isSuccess).toBe(true))
        )
      );

      // Verify each query uses distinct cache keys
      contentIds.forEach(id => {
        expect(mockProductContentService.getProductContent).toHaveBeenCalledWith(
          id, 
          testUserId
        );
      });
    });

    test('should handle large dataset queries efficiently', async () => {
      const wrapper = createWrapper();

      // Mock large dataset response
      mockProductContentService.getContentByStatusPaginated.mockResolvedValue({
        success: true,
        data: {
          items: Array.from({ length: 50 }, (_, i) => ({
            id: `content-${i}`,
            title: `Content ${i}`,
            description: `Description ${i}`,
            imageUrl: null,
            videoUrl: null,
            contentStatus: 'published',
            publishedDate: new Date().toISOString(),
            priority: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByUserId: testUserId
          })),
          totalCount: 500,
          hasMore: true,
          page: 1,
          limit: 50
        }
      });

      const { result } = renderHook(
        () => useContentAnalytics('published', { page: 1, limit: 50 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.items).toHaveLength(50);
      expect(result.current.data?.totalCount).toBe(500);
      expect(result.current.data?.hasMore).toBe(true);
    });
  });
});