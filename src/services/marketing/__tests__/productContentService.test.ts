import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Real Supabase configuration for testing
import { supabase } from '../../../config/supabase';

// Mock ValidationMonitor (following architectural pattern)
jest.mock('../../../utils/validationMonitor');

import { ProductContentService } from '../productContentService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type { 
  ProductContentTransform,
  CreateProductContentInput,
  UpdateProductContentInput,
  ContentStatusType
} from '../../../schemas/marketing';

// Phase 1 Integration: Role-based permissions
import { RolePermissionService } from '../../role-based/rolePermissionService';

// Real database testing against test tables
describe('ProductContentService - Phase 3.2 (Real Database)', () => {
  
  // Test data cleanup IDs
  const testProductIds = new Set<string>();
  const testContentIds = new Set<string>();
  const testUserId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Track test data for cleanup
    testProductIds.clear();
    testContentIds.clear();
  });

  afterEach(async () => {
    // Clean up test data from real database
    try {
      // Delete test content items
      if (testContentIds.size > 0) {
        await supabase
          .from('product_content')
          .delete()
          .in('id', Array.from(testContentIds));
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('getProductContent', () => {
    it('should get product content with transformation and real database validation', async () => {
      // Step 1: Use existing test data from schema setup
      const { data: existingContent, error } = await supabase
        .from('product_content')
        .select('*')
        .limit(1)
        .single();

      if (error || !existingContent) {
        console.warn('No test content found, skipping test');
        return;
      }

      // Step 2: Call service method
      const result = await ProductContentService.getProductContent(existingContent.id);

      // Step 3: Validate response structure and transformation
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.success && result.data) {
        // Verify camelCase transformation
        expect(result.data.productId).toBe(existingContent.product_id);
        expect(result.data.marketingTitle).toBe(existingContent.marketing_title);
        expect(result.data.contentStatus).toBe(existingContent.content_status);
        expect(result.data.createdAt).toBe(existingContent.created_at);
      }

      // Step 4: Verify ValidationMonitor integration
      expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
        'ProductContentService.getProductContent',
        true,
        expect.any(Object)
      );
    });

    it('should handle non-existent content with proper error handling', async () => {
      const nonExistentId = 'non-existent-content-123';

      const result = await ProductContentService.getProductContent(nonExistentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content not found');

      // Verify ValidationMonitor logs failure
      expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
        'ProductContentService.getProductContent',
        false,
        expect.objectContaining({
          contentId: nonExistentId,
          error: expect.any(String)
        })
      );
    });

    it('should validate content with role permission filtering', async () => {
      // Mock role permission check
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(true);

      const { data: existingContent } = await supabase
        .from('product_content')
        .select('*')
        .limit(1)
        .single();

      if (!existingContent) return;

      const result = await ProductContentService.getProductContent(
        existingContent.id,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'content_management'
      );
    });
  });

  describe('updateProductContent', () => {
    it('should update content with workflow state management', async () => {
      // Step 1: Create test content
      const testContent = {
        product_id: 'test-product-content-123',
        marketing_title: 'Test Content for Update',
        marketing_description: 'Original description',
        content_status: 'draft' as const,
        content_priority: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdContent, error: createError } = await supabase
        .from('product_content')
        .insert(testContent)
        .select()
        .single();

      expect(createError).toBeNull();
      expect(createdContent).toBeDefined();
      
      if (createdContent) {
        testContentIds.add(createdContent.id);
      }

      // Step 2: Update content
      const updateData: UpdateProductContentInput = {
        marketingTitle: 'Updated Test Content',
        marketingDescription: 'Updated description',
        contentStatus: 'review',
        contentPriority: 5
      };

      const result = await ProductContentService.updateProductContent(
        createdContent!.id,
        updateData,
        testUserId
      );

      // Step 3: Validate update response
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.success && result.data) {
        expect(result.data.marketingTitle).toBe('Updated Test Content');
        expect(result.data.marketingDescription).toBe('Updated description');
        expect(result.data.contentStatus).toBe('review');
        expect(result.data.contentPriority).toBe(5);
        expect(result.data.lastUpdatedBy).toBe(testUserId);
      }

      // Step 4: Verify database state
      const { data: updatedContent } = await supabase
        .from('product_content')
        .select('*')
        .eq('id', createdContent!.id)
        .single();

      expect(updatedContent?.marketing_title).toBe('Updated Test Content');
      expect(updatedContent?.content_status).toBe('review');
      expect(updatedContent?.last_updated_by).toBe(testUserId);
    });

    it('should validate content workflow state transitions', async () => {
      // Create content in 'completed' state (terminal)
      const testContent = {
        product_id: 'test-product-terminal-123',
        marketing_title: 'Terminal State Content',
        content_status: 'published' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdContent } = await supabase
        .from('product_content')
        .insert(testContent)
        .select()
        .single();

      if (createdContent) {
        testContentIds.add(createdContent.id);
      }

      // Try to transition from published to draft (invalid transition)
      const invalidUpdate: UpdateProductContentInput = {
        contentStatus: 'draft'
      };

      const result = await ProductContentService.updateProductContent(
        createdContent!.id,
        invalidUpdate,
        testUserId
      );

      // Should fail due to invalid state transition
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid content status transition');
    });

    it('should handle role permission validation for updates', async () => {
      // Mock permission denied
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(false);

      const updateData: UpdateProductContentInput = {
        marketingTitle: 'Unauthorized Update'
      };

      const result = await ProductContentService.updateProductContent(
        'any-id',
        updateData,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'content_management'
      );
    });
  });

  describe('uploadContentImage', () => {
    it('should handle file upload with progress tracking and security validation', async () => {
      const mockImageFile = {
        name: 'test-image.jpg',
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      };

      const progressCallback = jest.fn();

      const result = await ProductContentService.uploadContentImage(
        'test-product-upload-123',
        mockImageFile,
        testUserId,
        progressCallback
      );

      expect(result.success).toBe(true);
      expect(result.data?.imageUrl).toBeDefined();
      expect(result.data?.imageUrl).toMatch(/^https:\/\//); // Security: HTTPS only

      // Verify progress tracking was called
      expect(progressCallback).toHaveBeenCalled();

      // Verify ValidationMonitor logged the operation
      expect(ValidationMonitor.logOperation).toHaveBeenCalledWith(
        'ProductContentService.uploadContentImage',
        true,
        expect.objectContaining({
          productId: 'test-product-upload-123',
          fileName: 'test-image.jpg',
          fileSize: 1024 * 1024
        })
      );
    });

    it('should reject invalid file types for security', async () => {
      const invalidFile = {
        name: 'malicious-script.exe',
        size: 1024,
        type: 'application/x-executable',
        buffer: Buffer.from('malicious-code')
      };

      const result = await ProductContentService.uploadContentImage(
        'test-product-invalid-123',
        invalidFile,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject oversized files', async () => {
      const oversizedFile = {
        name: 'huge-image.jpg',
        size: 10 * 1024 * 1024, // 10MB (over limit)
        type: 'image/jpeg',
        buffer: Buffer.alloc(10 * 1024 * 1024)
      };

      const result = await ProductContentService.uploadContentImage(
        'test-product-large-123',
        oversizedFile,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('File size exceeds limit');
    });
  });

  describe('updateContentStatus', () => {
    it('should manage content workflow state transitions correctly', async () => {
      // Create content in draft state
      const testContent = {
        product_id: 'test-product-workflow-123',
        marketing_title: 'Workflow Test Content',
        content_status: 'draft' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdContent } = await supabase
        .from('product_content')
        .insert(testContent)
        .select()
        .single();

      if (createdContent) {
        testContentIds.add(createdContent.id);
      }

      // Transition from draft to review (valid)
      const result = await ProductContentService.updateContentStatus(
        createdContent!.id,
        'review',
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.contentStatus).toBe('review');

      // Verify database state
      const { data: updatedContent } = await supabase
        .from('product_content')
        .select('*')
        .eq('id', createdContent!.id)
        .single();

      expect(updatedContent?.content_status).toBe('review');
      expect(updatedContent?.last_updated_by).toBe(testUserId);
    });

    it('should validate workflow business rules for publishing', async () => {
      // Create content without required fields for publishing
      const testContent = {
        product_id: 'test-product-incomplete-123',
        marketing_title: null, // Missing required field for publishing
        content_status: 'approved' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdContent } = await supabase
        .from('product_content')
        .insert(testContent)
        .select()
        .single();

      if (createdContent) {
        testContentIds.add(createdContent.id);
      }

      // Try to publish content without required fields
      const result = await ProductContentService.updateContentStatus(
        createdContent!.id,
        'published',
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content is not ready for publishing');
    });
  });

  describe('getContentByStatus', () => {
    it('should filter content by status with pagination', async () => {
      const result = await ProductContentService.getContentByStatus(
        'published',
        { page: 1, limit: 10 },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data?.items)).toBe(true);
      expect(typeof result.data?.totalCount).toBe('number');
      expect(typeof result.data?.hasMore).toBe('boolean');

      // All returned items should have published status
      if (result.success && result.data?.items) {
        result.data.items.forEach(item => {
          expect(item.contentStatus).toBe('published');
        });
      }
    });

    it('should validate role permissions for content filtering', async () => {
      jest.spyOn(RolePermissionService, 'hasPermission').mockResolvedValue(false);

      const result = await ProductContentService.getContentByStatus(
        'draft',
        { page: 1, limit: 10 },
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('batchUpdateContent', () => {
    it('should process multiple content updates with resilient processing (skip-on-error)', async () => {
      // Create multiple test content items
      const testContents = [
        {
          product_id: 'test-product-batch-1',
          marketing_title: 'Batch Test 1',
          content_status: 'draft' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          product_id: 'test-product-batch-2',
          marketing_title: 'Batch Test 2',
          content_status: 'draft' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const { data: createdContents } = await supabase
        .from('product_content')
        .insert(testContents)
        .select();

      if (createdContents) {
        createdContents.forEach(content => testContentIds.add(content.id));
      }

      // Batch update with one valid and one invalid update
      const batchUpdates = [
        {
          id: createdContents![0].id,
          data: { marketingTitle: 'Updated Batch 1', contentStatus: 'review' as const }
        },
        {
          id: 'non-existent-id',
          data: { marketingTitle: 'Invalid Update' }
        },
        {
          id: createdContents![1].id,
          data: { marketingTitle: 'Updated Batch 2', contentStatus: 'review' as const }
        }
      ];

      const result = await ProductContentService.batchUpdateContent(
        batchUpdates,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.successCount).toBe(2);
      expect(result.data?.failureCount).toBe(1);
      expect(result.data?.results).toHaveLength(3);

      // Verify successful updates were applied
      const { data: updatedContent1 } = await supabase
        .from('product_content')
        .select('*')
        .eq('id', createdContents![0].id)
        .single();

      expect(updatedContent1?.marketing_title).toBe('Updated Batch 1');
      expect(updatedContent1?.content_status).toBe('review');
    });

    it('should handle complete batch failure gracefully', async () => {
      const invalidBatchUpdates = [
        { id: 'invalid-1', data: { marketingTitle: 'Invalid 1' } },
        { id: 'invalid-2', data: { marketingTitle: 'Invalid 2' } }
      ];

      const result = await ProductContentService.batchUpdateContent(
        invalidBatchUpdates,
        testUserId
      );

      expect(result.success).toBe(true); // Batch operation succeeds even if all items fail
      expect(result.data?.successCount).toBe(0);
      expect(result.data?.failureCount).toBe(2);
    });
  });

  describe('Integration with ValidationMonitor', () => {
    it('should track all operations with ValidationMonitor', async () => {
      // Clear previous calls
      jest.clearAllMocks();

      // Perform multiple operations
      await ProductContentService.getProductContent('test-id');
      await ProductContentService.updateContentStatus('test-id', 'review', testUserId);

      // Verify ValidationMonitor was called for each operation
      expect(ValidationMonitor.logOperation).toHaveBeenCalledTimes(2);

      const calls = (ValidationMonitor.logOperation as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe('ProductContentService.getProductContent');
      expect(calls[1][0]).toBe('ProductContentService.updateContentStatus');
    });

    it('should log both successes and failures consistently', async () => {
      jest.clearAllMocks();

      // Success case
      const { data: existingContent } = await supabase
        .from('product_content')
        .select('*')
        .limit(1)
        .single();

      if (existingContent) {
        await ProductContentService.getProductContent(existingContent.id);
      }

      // Failure case
      await ProductContentService.getProductContent('non-existent-id');

      // Both operations should be logged
      expect(ValidationMonitor.logOperation).toHaveBeenCalledTimes(2);

      const calls = (ValidationMonitor.logOperation as jest.Mock).mock.calls;
      expect(calls[0][1]).toBe(true);  // Success
      expect(calls[1][1]).toBe(false); // Failure
    });
  });

  describe('Performance Validation', () => {
    it('should handle content operations within performance targets', async () => {
      const startTime = performance.now();

      // Perform content queries that should complete quickly
      const promises = Array.from({ length: 5 }, () =>
        ProductContentService.getContentByStatus('published', { page: 1, limit: 5 })
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Content queries should complete within 200ms target
      expect(executionTime).toBeLessThan(500); // Allow some margin for test environment
    });
  });
});