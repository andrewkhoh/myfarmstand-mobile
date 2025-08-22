// Mock ValidationMonitor before importing service (Pattern 1)
jest.mock('../../../utils/validationMonitor');

import { ProductContentService } from '../productContentService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type {
  ProductContentTransform,
  CreateProductContentInput,
  UpdateProductContentInput,
  ContentStatusType
} from '../../../schemas/marketing';

// Mock the supabase module at the service level (AuthService exact pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock role permissions
jest.mock('../../role-based/rolePermissionService');
const mockRolePermissionService = require('../../role-based/rolePermissionService').RolePermissionService;

describe('Content Workflow Integration - Phase 3.4.1 (RED Phase)', () => {
  const testUserId = 'test-user-123';
  const testContentId = 'content-456';
  const testProductId = 'product-789';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns for chainable Supabase queries
    mockSupabase.from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }));
    
    // Default role permission setup
    mockRolePermissionService.hasPermission.mockResolvedValue(true);
  });

  describe('Complete Content Workflow (draft → review → approved → published)', () => {
    test('should execute complete content lifecycle workflow', async () => {
      // Mock successful content creation
      const createdContent = {
        id: testContentId,
        product_id: testProductId,
        marketing_title: 'Test Product Content',
        marketing_description: 'Test description',
        marketing_highlights: null,
        seo_keywords: null,
        featured_image_url: null,
        gallery_urls: null,
        content_status: 'draft',
        content_priority: 1,
        last_updated_by: testUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Setup comprehensive mocks for the entire workflow
      let currentStatus = 'draft';
      
      // Mock for create and update operations
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'product_content') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: createdContent,
                  error: null
                })
              })
            }),
            update: jest.fn().mockImplementation((updateData) => {
              return {
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockImplementation(() => {
                      // Update the status from the update data
                      const newStatus = updateData.content_status || currentStatus;
                      const updatedContent = {
                        ...createdContent,
                        content_status: newStatus,
                        updated_at: new Date().toISOString()
                      };
                      return Promise.resolve({
                        data: updatedContent,
                        error: null
                      });
                    })
                  })
                })
              };
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(() => {
                  const fetchContent = {
                    ...createdContent,
                    content_status: currentStatus
                  };
                  return Promise.resolve({
                    data: fetchContent,
                    error: null
                  });
                })
              })
            })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        };
      });

      // Setup spy on getProductContent to verify it gets called
      const getProductContentSpy = jest.spyOn(ProductContentService, 'getProductContent')
        .mockImplementation(async (contentId) => {
          return {
            success: true,
            data: {
              id: contentId,
              productId: testProductId,
              marketingTitle: 'Test Product Content',
              marketingDescription: 'Test description',
              marketingHighlights: null,
              seoKeywords: null,
              featuredImageUrl: null,
              galleryUrls: null,
              contentStatus: currentStatus as ContentStatusType,
              contentPriority: 1,
              lastUpdatedBy: testUserId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          };
        });

      // Step 1: Create content in draft state
      const createInput: CreateProductContentInput = {
        productId: testProductId,
        marketingTitle: 'Test Product Content',
        marketingDescription: 'Test description',
        contentPriority: 1
      };

      const createResult = await ProductContentService.createProductContent(createInput, testUserId);
      expect(createResult.success).toBe(true);
      expect(createResult.data?.contentStatus).toBe('draft');

      // Step 2: Move to review state
      const reviewUpdate: UpdateProductContentInput = {
        contentStatus: 'review' as ContentStatusType
      };
      
      const reviewResult = await ProductContentService.updateProductContent(
        testContentId, 
        reviewUpdate, 
        testUserId
      );
      currentStatus = 'review'; // Update mock status AFTER the call
      if (!reviewResult.success) {
        console.log('Review result error:', reviewResult.error);
      }
      expect(reviewResult.success).toBe(true);
      expect(reviewResult.data?.contentStatus).toBe('review');

      // Step 3: Approve content
      const approveUpdate: UpdateProductContentInput = {
        contentStatus: 'approved' as ContentStatusType
      };
      
      const approveResult = await ProductContentService.updateProductContent(
        testContentId,
        approveUpdate,
        testUserId
      );
      currentStatus = 'approved'; // Update mock status AFTER the call
      expect(approveResult.success).toBe(true);
      expect(approveResult.data?.contentStatus).toBe('approved');

      // Step 4: Publish content
      const publishUpdate: UpdateProductContentInput = {
        contentStatus: 'published' as ContentStatusType
      };
      
      const publishResult = await ProductContentService.updateProductContent(
        testContentId,
        publishUpdate,
        testUserId
      );
      currentStatus = 'published'; // Update mock status AFTER the call
      expect(publishResult.success).toBe(true);
      expect(publishResult.data?.contentStatus).toBe('published');

      // Verify workflow validation was recorded
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: expect.stringContaining('productContentService'),
        pattern: 'transformation_schema',
        operation: expect.stringContaining('update')
      });

      // Cleanup
      getProductContentSpy.mockRestore();
    });

    test('should prevent invalid workflow transitions', async () => {
      // Test will fail until workflow validation is implemented
      const invalidTransition: UpdateProductContentInput = {
        contentStatus: 'published' as ContentStatusType // Skip review/approval
      };

      const result = await ProductContentService.updateProductContent(
        testContentId,
        invalidTransition,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid workflow transition');
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: expect.stringContaining('workflow'),
        errorCode: 'INVALID_WORKFLOW_TRANSITION',
        validationPattern: 'transformation_schema',
        errorMessage: expect.stringContaining('transition')
      });
    });

    test('should handle workflow rollback on errors', async () => {
      // Test will fail until rollback mechanism is implemented
      const updateWithError: UpdateProductContentInput = {
        contentStatus: 'approved' as ContentStatusType,
        title: '' // Invalid empty title should trigger rollback
      };

      const result = await ProductContentService.updateProductContent(
        testContentId,
        updateWithError,
        testUserId
      );

      expect(result.success).toBe(false);
      
      // Verify content state was not changed
      const contentCheck = await ProductContentService.getProductContent(testContentId, testUserId);
      expect(contentCheck.data?.contentStatus).not.toBe('approved');
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: expect.stringContaining('rollback'),
        errorCode: expect.stringContaining('ROLLBACK'),
        validationPattern: 'transformation_schema',
        errorMessage: expect.stringContaining('error')
      });
    });
  });

  describe('Role Permission Enforcement Across Content Lifecycle', () => {
    test('should enforce draft creation permissions', async () => {
      mockRolePermissionService.hasPermission.mockResolvedValue(false);

      const createInput: CreateProductContentInput = {
        title: 'Unauthorized Content',
        description: 'Should not be created'
      };

      const result = await ProductContentService.createProductContent(createInput, testUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'content_management'
      );
    });

    test('should enforce review state permissions', async () => {
      // Different permission for review state
      mockRolePermissionService.hasPermission
        .mockImplementation(async (userId, permission) => {
          return permission === 'content_management'; // Allow management but not review
        });

      const reviewUpdate: UpdateProductContentInput = {
        contentStatus: 'review' as ContentStatusType
      };

      const result = await ProductContentService.updateProductContent(
        testContentId,
        reviewUpdate,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('review permission');
    });

    test('should enforce approval permissions', async () => {
      // Test approval requires higher permissions
      mockRolePermissionService.hasPermission
        .mockImplementation(async (userId, permission) => {
          return permission !== 'content_approval'; // Deny approval permission
        });

      const approveUpdate: UpdateProductContentInput = {
        contentStatus: 'approved' as ContentStatusType
      };

      const result = await ProductContentService.updateProductContent(
        testContentId,
        approveUpdate,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('approval permission');
      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'content_approval'
      );
    });

    test('should enforce publish permissions', async () => {
      mockRolePermissionService.hasPermission
        .mockImplementation(async (userId, permission) => {
          return permission !== 'content_publish';
        });

      const publishUpdate: UpdateProductContentInput = {
        contentStatus: 'published' as ContentStatusType
      };

      const result = await ProductContentService.updateProductContent(
        testContentId,
        publishUpdate,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('publish permission');
      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'content_publish'
      );
    });
  });

  describe('File Upload → Content Update → Cache Invalidation Flow', () => {
    test('should integrate file upload with content workflow', async () => {
      // Test will fail until file upload integration is implemented
      const mockFileData = {
        name: 'test-image.jpg',
        size: 1024000,
        type: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      };

      const uploadResult = await ProductContentService.uploadContentImage(
        testContentId,
        mockFileData,
        testUserId
      );

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data?.imageUrl).toBeTruthy();
      expect(uploadResult.data?.uploadProgress?.percentage).toBe(100);

      // Verify content was updated with new image URL
      const contentResult = await ProductContentService.getProductContent(testContentId, testUserId);
      expect(contentResult.data?.imageUrl).toBe(uploadResult.data?.imageUrl);

      // Verify cache invalidation was triggered
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: expect.stringContaining('upload'),
        pattern: 'transformation_schema',
        operation: 'uploadContentImage'
      });
    });

    test('should handle file upload errors gracefully', async () => {
      const invalidFileData = {
        name: 'test.txt',
        size: 10000000, // Too large
        type: 'text/plain', // Invalid type
        buffer: Buffer.from('invalid-content')
      };

      const uploadResult = await ProductContentService.uploadContentImage(
        testContentId,
        invalidFileData,
        testUserId
      );

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toMatch(/file (size|type)/i);
      
      // Verify content was not modified
      const contentResult = await ProductContentService.getProductContent(testContentId, testUserId);
      expect(contentResult.data?.imageUrl).toBeFalsy();
    });

    test('should track upload progress during file operations', async () => {
      const mockFileData = {
        name: 'large-image.jpg',
        size: 5000000,
        type: 'image/jpeg',
        buffer: Buffer.from('large-image-data')
      };

      // Mock progress tracking
      const progressCallback = jest.fn();
      
      const uploadResult = await ProductContentService.uploadContentImageWithProgress(
        testContentId,
        mockFileData,
        testUserId,
        progressCallback
      );

      expect(uploadResult.success).toBe(true);
      expect(progressCallback).toHaveBeenCalledWith({
        uploadedBytes: expect.any(Number),
        totalBytes: mockFileData.size,
        percentage: expect.any(Number)
      });
    });
  });

  describe('Collaborative Editing with Conflict Resolution', () => {
    test('should handle concurrent content edits', async () => {
      // Test will fail until conflict resolution is implemented
      const user1Update: UpdateProductContentInput = {
        title: 'Updated by User 1',
        description: 'Description from User 1'
      };

      const user2Update: UpdateProductContentInput = {
        title: 'Updated by User 2', 
        description: 'Description from User 2'
      };

      // Simulate concurrent updates
      const [result1, result2] = await Promise.all([
        ProductContentService.updateProductContent(testContentId, user1Update, 'user1'),
        ProductContentService.updateProductContent(testContentId, user2Update, 'user2')
      ]);

      // One should succeed, one should detect conflict
      const hasConflict = !result1.success || !result2.success;
      expect(hasConflict).toBe(true);

      // Verify conflict resolution was triggered
      if (!result1.success) {
        expect(result1.error).toContain('conflict');
      } else {
        expect(result2.error).toContain('conflict');
      }
    });

    test('should provide conflict resolution data', async () => {
      const conflictUpdate: UpdateProductContentInput = {
        title: 'Conflicting Update'
      };

      // Simulate version conflict
      const result = await ProductContentService.updateProductContentWithConflictResolution(
        testContentId,
        conflictUpdate,
        testUserId,
        'outdated-version-timestamp'
      );

      expect(result.success).toBe(false);
      expect(result.conflictData).toBeTruthy();
      expect(result.conflictData?.currentVersion).toBeTruthy();
      expect(result.conflictData?.conflictingFields).toContain('title');
    });
  });

  describe('Error Recovery Workflow Validation', () => {
    test('should recover from partial workflow failures', async () => {
      // Test will fail until error recovery is implemented
      const partialUpdate: UpdateProductContentInput = {
        title: 'Valid Title',
        contentStatus: 'review' as ContentStatusType,
        invalidField: 'This should cause partial failure' as any
      };

      const result = await ProductContentService.updateProductContentWithRecovery(
        testContentId,
        partialUpdate,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Valid Title');
      expect(result.data?.contentStatus).toBe('review');
      expect(result.warnings).toContain('invalidField');
    });

    test('should maintain data consistency during errors', async () => {
      // Simulate database error during update
      const errorProneUpdate: UpdateProductContentInput = {
        title: 'Update that will fail',
        contentStatus: 'approved' as ContentStatusType
      };

      const result = await ProductContentService.updateProductContent(
        'non-existent-id',
        errorProneUpdate,
        testUserId
      );

      expect(result.success).toBe(false);
      
      // Verify original content was not modified
      const originalContent = await ProductContentService.getProductContent(testContentId, testUserId);
      expect(originalContent.data?.contentStatus).not.toBe('approved');
    });
  });

  describe('Performance Validation for Content Operations', () => {
    test('should handle large content datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Test with large content query
      const result = await ProductContentService.getContentByStatusPaginated(
        'published' as ContentStatusType,
        { page: 1, limit: 100 },
        testUserId
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // Under 2 seconds
      expect(result.data?.items.length).toBeLessThanOrEqual(100);
    });

    test('should optimize file upload performance', async () => {
      const largeFileData = {
        name: 'large-file.jpg',
        size: 10000000, // 10MB
        type: 'image/jpeg',
        buffer: Buffer.alloc(10000000)
      };

      const startTime = Date.now();
      
      const result = await ProductContentService.uploadContentImage(
        testContentId,
        largeFileData,
        testUserId
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Under 10 seconds for 10MB
    });

    test('should validate memory usage during content operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple content operations
      const operations = Array.from({ length: 50 }, (_, i) => 
        ProductContentService.getProductContent(`content-${i}`, testUserId)
      );

      await Promise.all(operations);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (under 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});