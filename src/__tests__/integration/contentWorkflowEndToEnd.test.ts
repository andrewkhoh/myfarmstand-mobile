// Phase 3.4.1: Content Workflow End-to-End Integration Tests (RED Phase)
// Following TDD pattern: RED → GREEN → REFACTOR
// Complete stack integration tests: Database → Service → Hook → UI workflow

import { QueryClient } from '@tanstack/react-query';
import { ProductContentService } from '../../services/marketing/productContentService';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { contentKeys, createRobustInvalidation } from '../../utils/queryKeyFactory';
import type {
  ProductContentTransform,
  CreateProductContentInput,
  UpdateProductContentInput,
  ContentStatusType
} from '../../schemas/marketing';

// Integration test setup - tests the full stack without mocks
describe('Content Workflow End-to-End Integration - Phase 3.4.1 (RED Phase)', () => {
  let queryClient: QueryClient;
  let invalidationHelper: ReturnType<typeof createRobustInvalidation>;
  
  const testUserId = 'integration-test-user';
  const testUserEmail = 'integration@test.com';

  beforeAll(async () => {
    // Set up real QueryClient for integration testing
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0
        },
        mutations: {
          retry: false
        }
      }
    });

    invalidationHelper = createRobustInvalidation(queryClient);
  });

  beforeEach(async () => {
    // Clear query cache between tests
    queryClient.clear();
    
    // Reset validation monitor state
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up test data and connections
    queryClient.clear();
  });

  describe('Complete Workflow Integration (Schema → Service → Hook)', () => {
    test('should execute complete content creation and workflow progression', async () => {
      // This test will fail until complete integration is implemented
      
      // Step 1: Verify user permissions (real permission check)
      const hasCreatePermission = await RolePermissionService.hasPermission(
        testUserId,
        'content_management'
      );
      expect(hasCreatePermission).toBe(true);

      // Step 2: Create content through service layer
      const createInput: CreateProductContentInput = {
        title: 'End-to-End Test Content',
        description: 'Testing complete workflow integration',
        priority: 1
      };

      const createResult = await ProductContentService.createProductContent(
        createInput,
        testUserId
      );

      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeTruthy();
      expect(createResult?.data?.contentStatus).toBe('draft');

      const contentId = createResult.data!.id;

      // Step 3: Cache the created content using centralized query keys
      queryClient.setQueryData(
        contentKeys.detail(contentId, testUserId),
        createResult.data
      );

      // Step 4: Verify query key factory integration
      const cachedContent = queryClient.getQueryData(
        contentKeys.detail(contentId, testUserId)
      ) as ProductContentTransform;

      expect(cachedContent).toBeTruthy();
      expect(cachedContent.id).toBe(contentId);

      // Step 5: Test workflow progression through service
      const workflowTransitions: Array<{
        toStatus: ContentStatusType;
        requiredPermission: string;
      }> = [
        { toStatus: 'review', requiredPermission: 'content_management' },
        { toStatus: 'approved', requiredPermission: 'content_approval' },
        { toStatus: 'published', requiredPermission: 'content_publish' }
      ];

      let currentContent = createResult.data;

      for (const transition of workflowTransitions) {
        // Verify permission for transition
        const hasPermission = await RolePermissionService.hasPermission(
          testUserId,
          transition.requiredPermission
        );
        expect(hasPermission).toBe(true);

        // Execute transition
        const updateResult = await ProductContentService.updateProductContent(
          contentId,
          { contentStatus: transition.toStatus },
          testUserId
        );

        expect(updateResult.success).toBe(true);
        expect(updateResult?.data?.contentStatus).toBe(transition.toStatus);

        // Update cache with new status
        queryClient.setQueryData(
          contentKeys.detail(contentId, testUserId),
          updateResult.data
        );

        // Invalidate status-based queries
        await invalidationHelper.invalidateEntity('content', testUserId, {
          includeFallbacks: true,
          retryOnFailure: true
        });

        currentContent = updateResult.data!;
      }

      // Step 6: Verify final published state
      expect(currentContent.contentStatus).toBe('published');
      expect(currentContent.publishedDate).toBeTruthy();

      // Step 7: Verify ValidationMonitor tracked the complete workflow
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: expect.stringContaining('ProductContentService'),
        pattern: 'transformation_schema',
        operation: expect.stringContaining('create')
      });

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: expect.stringContaining('ProductContentService'),
        pattern: 'transformation_schema',
        operation: expect.stringContaining('update')
      });
    });

    test('should handle workflow validation errors across the stack', async () => {
      // Create test content
      const createInput: CreateProductContentInput = {
        title: 'Validation Test Content',
        description: 'Testing error handling'
      };

      const createResult = await ProductContentService.createProductContent(
        createInput,
        testUserId
      );
      expect(createResult.success).toBe(true);

      const contentId = createResult.data!.id;

      // Test invalid workflow transition
      const invalidTransition: UpdateProductContentInput = {
        contentStatus: 'published' // Skip review and approval
      };

      const updateResult = await ProductContentService.updateProductContent(
        contentId,
        invalidTransition,
        testUserId
      );

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('Invalid workflow transition');

      // Verify ValidationMonitor captured the error
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: expect.stringContaining('workflow'),
        errorCode: 'INVALID_WORKFLOW_TRANSITION',
        validationPattern: 'transformation_schema',
        errorMessage: expect.stringContaining('transition')
      });

      // Verify content state wasn't changed
      const verifyResult = await ProductContentService.getProductContent(
        contentId,
        testUserId
      );
      expect(verifyResult?.data?.contentStatus).toBe('draft');
    });
  });

  describe('Cross-Layer Cache Coordination', () => {
    test('should coordinate cache invalidation across all layers', async () => {
      // Create and cache content
      const createInput: CreateProductContentInput = {
        title: 'Cache Coordination Test',
        description: 'Testing cache invalidation'
      };

      const createResult = await ProductContentService.createProductContent(
        createInput,
        testUserId
      );
      const contentId = createResult.data!.id;

      // Cache content at multiple query key levels
      queryClient.setQueryData(
        contentKeys.detail(contentId, testUserId),
        createResult.data
      );
      
      queryClient.setQueryData(
        contentKeys.byStatus('draft', testUserId),
        { items: [createResult.data], totalCount: 1, hasMore: false, page: 1, limit: 10 }
      );

      // Update content through service
      const updateResult = await ProductContentService.updateProductContent(
        contentId,
        { title: 'Updated Cache Test', contentStatus: 'review' },
        testUserId
      );

      expect(updateResult.success).toBe(true);

      // Manually trigger cache invalidation (simulating hook onSuccess)
      await queryClient.invalidateQueries({
        queryKey: contentKeys.detail(contentId, testUserId)
      });
      
      await queryClient.invalidateQueries({
        queryKey: contentKeys.byStatus('draft', testUserId)
      });
      
      await queryClient.invalidateQueries({
        queryKey: contentKeys.byStatus('review', testUserId)
      });

      // Verify cache was properly invalidated
      const cachedDetail = queryClient.getQueryData(
        contentKeys.detail(contentId, testUserId)
      );
      expect(cachedDetail).toBeUndefined();

      const cachedDraftList = queryClient.getQueryData(
        contentKeys.byStatus('draft', testUserId)
      );
      expect(cachedDraftList).toBeUndefined();
    });

    test('should handle cache invalidation failures gracefully', async () => {
      // Test robust invalidation helper with simulated failures
      const contentId = 'test-content-123';

      // Spy on queryClient methods to simulate failures
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
        .mockRejectedValueOnce(new Error('Cache invalidation failed'))
        .mockResolvedValueOnce(undefined);

      const result = await invalidationHelper.invalidateEntity(
        'content',
        testUserId,
        { includeFallbacks: true, retryOnFailure: true }
      );

      expect(result.success).toBe(true); // Should succeed on retry
      expect(result.summary.successCount).toBeGreaterThan(0);
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2); // Initial failure + retry
    });
  });

  describe('File Upload Integration with Workflow', () => {
    test('should integrate file upload with content workflow', async () => {
      // This test will fail until file upload integration is implemented
      
      // Create content for file attachment
      const createInput: CreateProductContentInput = {
        title: 'File Upload Test Content',
        description: 'Testing file upload integration'
      };

      const createResult = await ProductContentService.createProductContent(
        createInput,
        testUserId
      );
      const contentId = createResult.data!.id;

      // Test file upload
      const mockFileData = {
        name: 'test-image.jpg',
        size: 1024000,
        type: 'image/jpeg',
        buffer: Buffer.from('mock-image-data')
      };

      const uploadResult = await ProductContentService.uploadContentImage(
        contentId,
        mockFileData,
        testUserId
      );

      expect(uploadResult.success).toBe(true);
      expect(uploadResult?.data?.imageUrl).toBeTruthy();

      // Verify content was updated with image URL
      const updatedContent = await ProductContentService.getProductContent(
        contentId,
        testUserId
      );
      expect(updatedContent?.data?.imageUrl).toBe(uploadResult?.data?.imageUrl);

      // Test workflow progression with attached file
      const reviewResult = await ProductContentService.updateProductContent(
        contentId,
        { contentStatus: 'review' },
        testUserId
      );

      expect(reviewResult.success).toBe(true);
      expect(reviewResult?.data?.imageUrl).toBeTruthy(); // Image preserved through workflow
    });

    test('should handle file upload errors without affecting content state', async () => {
      const createInput: CreateProductContentInput = {
        title: 'File Error Test Content',
        description: 'Testing file upload error handling'
      };

      const createResult = await ProductContentService.createProductContent(
        createInput,
        testUserId
      );
      const contentId = createResult.data!.id;

      // Test invalid file upload
      const invalidFileData = {
        name: 'invalid.exe',
        size: 50000000, // Too large
        type: 'application/exe', // Invalid type
        buffer: Buffer.from('invalid-content')
      };

      const uploadResult = await ProductContentService.uploadContentImage(
        contentId,
        invalidFileData,
        testUserId
      );

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toMatch(/file (size|type)/i);

      // Verify content state wasn't affected by failed upload
      const contentCheck = await ProductContentService.getProductContent(
        contentId,
        testUserId
      );
      expect(contentCheck?.data?.imageUrl).toBeFalsy();
      expect(contentCheck?.data?.contentStatus).toBe('draft'); // Unchanged
    });
  });

  describe('Performance and Reliability Integration', () => {
    test('should maintain performance under load', async () => {
      // Test concurrent content operations
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        ProductContentService.createProductContent(
          {
            title: `Concurrent Content ${i}`,
            description: `Performance test content ${i}`,
            priority: i % 5 + 1
          },
          testUserId
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentOperations);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = results.filter(r => r.success).length;

      expect(successCount).toBe(10);
      expect(duration).toBeLessThan(5000); // Under 5 seconds for 10 operations

      // Test workflow operations on all created content
      const workflowOperations = results
        .filter(r => r.success && r.data)
        .map(r => 
          ProductContentService.updateProductContent(
            r.data!.id,
            { contentStatus: 'review' },
            testUserId
          )
        );

      const workflowResults = await Promise.all(workflowOperations);
      const workflowSuccessCount = workflowResults.filter(r => r.success).length;

      expect(workflowSuccessCount).toBe(10);
    });

    test('should handle database connection issues gracefully', async () => {
      // Simulate database connectivity issues
      const problematicInput: CreateProductContentInput = {
        title: 'Connection Test',
        description: 'Testing connection reliability'
      };

      // Mock potential connection failure (this would be implemented in real integration)
      const result = await ProductContentService.createProductContent(
        problematicInput,
        'non-existent-user' // This should cause a foreign key constraint error
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      // Verify ValidationMonitor captured the database error
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: expect.stringContaining('ProductContentService'),
        errorCode: expect.stringContaining('DATABASE'),
        validationPattern: 'transformation_schema',
        errorMessage: expect.stringContaining('error')
      });
    });

    test('should validate memory usage during complex workflows', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform complex workflow operations
      const operations = [];
      
      for (let i = 0; i < 20; i++) {
        // Create content
        const createOp = ProductContentService.createProductContent(
          {
            title: `Memory Test Content ${i}`,
            description: `Testing memory usage ${i}`,
            priority: 1
          },
          testUserId
        );
        operations.push(createOp);
      }

      const createResults = await Promise.all(operations);
      
      // Perform workflow transitions
      const workflowOps = createResults
        .filter(r => r.success && r.data)
        .map(r => 
          ProductContentService.updateProductContent(
            r.data!.id,
            { contentStatus: 'review' },
            testUserId
          )
        );

      await Promise.all(workflowOps);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (under 100MB for 20 operations)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});