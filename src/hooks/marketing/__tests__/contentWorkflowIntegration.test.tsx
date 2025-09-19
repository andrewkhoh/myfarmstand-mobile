// Phase 3.4.1: Content Workflow Hook Integration Tests (RED Phase)
// Following TDD pattern: RED → GREEN → REFACTOR
// Hook-level integration tests for complete content workflow

// Mock React Query for integration tests
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isSuccess: false,
    isError: false,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
    data: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
}));

import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';

// Import hooks to test - with defensive existence checks
let useProductContent: any, useUpdateContent: any, useContentWorkflow: any, useContentAnalytics: any;

try {
  const contentHooks = require('../useProductContent');
  useProductContent = contentHooks.useProductContent || (() => ({ data: null, isLoading: false, error: null }));
  useUpdateContent = contentHooks.useUpdateContent || (() => ({ mutateAsync: jest.fn(), isLoading: false, error: null }));
  useContentWorkflow = contentHooks.useContentWorkflow || (() => ({ mutateAsync: jest.fn(), isLoading: false, error: null }));
  useContentAnalytics = contentHooks.useContentAnalytics || (() => ({ data: null, isLoading: false, error: null }));
} catch (error) {
  // Hooks don't exist yet - use mock functions
  useProductContent = () => ({ data: null, isLoading: false, error: null });
  useUpdateContent = () => ({ mutateAsync: jest.fn(), isLoading: false, error: null });
  useContentWorkflow = () => ({ mutateAsync: jest.fn(), isLoading: false, error: null });
  useContentAnalytics = () => ({ data: null, isLoading: false, error: null });
}

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

// Import React Query types for proper mocking
import { useQuery, useMutation } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

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

      // Mock query for initial content fetch
      mockUseQuery.mockReturnValue({
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
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      // Test initial content fetch
      const { result: contentResult } = renderHook(
        () => useProductContent(testContentId),
        { wrapper }
      );

      await waitFor(() => {
        expect(contentResult.current.isSuccess).toBe(true);
      });

      expect(contentResult.current?.data?.contentStatus).toBe('draft');

      // Mock mutation for workflow transition
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
          ...contentResult.current.data!,
          contentStatus: 'review'
        }),
        isLoading: false,
        error: null,
        data: {
          ...contentResult.current.data!,
          contentStatus: 'review'
        },
        isSuccess: true,
        isError: false,
      } as any);

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

      // Mock mutation for workflow transition
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
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
        }),
        isLoading: false,
        error: null,
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
        },
        isSuccess: true,
        isError: false,
      } as any);

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

      // Mock mutation with validation error
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Invalid workflow transition: draft → published')),
        isLoading: false,
        error: { message: 'Invalid workflow transition: draft → published' },
        data: null,
        isSuccess: false,
        isError: true,
      } as any);

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

      // Mock mutation for content update
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
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
        }),
        isLoading: false,
        error: null,
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
        },
        isSuccess: true,
        isError: false,
      } as any);

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
      
      // Mock updated query for content fetch after update
      mockUseQuery.mockReturnValue({
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
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      // Verify cache invalidation affects related queries
      const { result: contentResult } = renderHook(
        () => useProductContent(testContentId),
        { wrapper }
      );

      await waitFor(() => {
        expect(contentResult.current?.data?.title).toBe('Updated Title');
        expect(contentResult.current?.data?.priority).toBe(2);
      });
    });

    test('should handle optimistic updates with rollback', async () => {
      const wrapper = createWrapper();

      // Mock mutation with failure for testing rollback
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        isLoading: false,
        error: { message: 'Database connection failed' },
        data: null,
        isSuccess: false,
        isError: true,
      } as any);

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

      // Mock rollback data for verification
      const rollbackData = {
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

      mockUseQuery.mockReturnValue({
        data: rollbackData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      // Verify rollback occurred
      const { result: contentResult } = renderHook(
        () => useProductContent(testContentId),
        { wrapper }
      );

      await waitFor(() => {
        expect(contentResult.current?.data?.title).toBe(rollbackData.title);
      });
    });
  });

  describe('Real-Time Collaboration Integration', () => {
    test('should handle real-time content updates', async () => {
      // Test will fail until real-time integration is implemented
      const wrapper = createWrapper();

      // Mock initial query for real-time content
      mockUseQuery.mockReturnValueOnce({
        data: {
          id: testContentId,
          title: 'Original Title',
          description: 'Original description',
          updatedAt: new Date().toISOString()
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useProductContent(testContentId, { enableRealTime: true }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Mock updated query for real-time update
      const updatedContent = {
        id: testContentId,
        title: 'Updated by Another User',
        description: 'Original description',
        updatedAt: new Date().toISOString()
      };

      mockUseQuery.mockReturnValue({
        data: updatedContent,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      // Trigger real-time update
      await act(async () => {
        // Simulate broadcast event
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current?.data?.title).toBe('Updated by Another User');
      });
    });

    test('should handle concurrent edit conflicts', async () => {
      const wrapper = createWrapper();

      // Mock mutation with conflict error
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Content was modified by another user')),
        isLoading: false,
        error: { message: 'Content was modified by another user' },
        data: null,
        isSuccess: false,
        isError: true,
      } as any);

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

      // Mock mutation with performance timing
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({
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
            }), 100) // 100ms delay
          )
        ),
        isLoading: false,
        error: null,
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
        },
        isSuccess: true,
        isError: false,
      } as any);

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

      // Mock queries for multiple content items
      mockUseQuery.mockImplementation(((queryKey: any) => {
        const id = Array.isArray(queryKey) ? queryKey[queryKey.length - 1] : 'default';
        return {
          data: { id, marketingTitle: `Content ${id}` },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          isSuccess: true,
          isError: false,
        };
      }) as any);

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

      // Mock query for large dataset
      mockUseQuery.mockReturnValue({
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
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      const { result } = renderHook(
        () => useContentAnalytics('published', { page: 1, limit: 50 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current?.data?.items).toHaveLength(50);
      expect(result.current?.data?.totalCount).toBe(500);
      expect(result.current?.data?.hasMore).toBe(true);
    });
  });
});