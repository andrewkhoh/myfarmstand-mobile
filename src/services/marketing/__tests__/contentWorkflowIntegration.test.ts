// Test Infrastructure Imports
import { createProduct, createUser, resetAllFactories } from "../../test/factories";

/**
 * Content Workflow Integration Test - Following Service Test Pattern (REFERENCE)
 */

// Setup all mocks BEFORE any imports
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  }));
  
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', role: 'marketing_staff' } },
          error: null
        })
      }
    },
    TABLES: {
      PRODUCT_CONTENT: 'product_content',
      PRODUCTS: 'products',
      USERS: 'users'
    }
  };
    TABLES: { /* Add table constants */ }
  };
});

jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

jest.mock('../../../config/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../role-based/rolePermissionService', () => ({
  RolePermissionService: {
    hasPermission: jest.fn().mockResolvedValue(true),
    getUserRole: jest.fn().mockResolvedValue('marketing_staff'),
    checkRoleAccess: jest.fn().mockResolvedValue(true)
  }
}));

// Import AFTER mocks are setup
import { ProductContentService } from '../productContentService';
import { supabase } from '../../../config/supabase';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import { RolePermissionService } from '../../role-based/rolePermissionService';
import type {
  CreateProductContentInput,
  UpdateProductContentInput,
  ContentStatusType
} from '../../../schemas/marketing';

// Get mock references for use in tests
const mockSupabaseFrom = supabase.from as jest.Mock;

describe('Content Workflow Integration - Refactored Infrastructure', () => {
  let testUserId: string;
  let testProductId: string;
  let testContentId: string;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    testUserId = 'user-123';
    testProductId = 'product-123';
    testContentId = 'content-123';
    
    // Setup default mock responses
    (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(true);
  });

  describe('Complete Content Workflow (draft → review → approved → published)', () => {
    test('should execute complete content lifecycle workflow', async () => {
      // Step 1: Create content in draft state
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'content-1',
            product_id: testProductId,
            marketing_title: 'Test Product Content',
            marketing_description: 'Test description',
            content_status: 'draft',
            content_priority: 1,
            created_at: new Date().toISOString()
          },
          error: null
        })
      });

      const createInput: CreateProductContentInput = {
        productId: testProductId,
        marketingTitle: 'Test Product Content',
        marketingDescription: 'Test description',
        contentPriority: 1
      };

      const createResult = await ProductContentService.createProductContent(createInput, testUserId);
      expect(createResult).toBeDefined();
      expect(createResult.success).toBe(true);
      expect(createResult.data?.contentStatus).toBe('draft');

      // Step 2: Move to review state
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'content-1',
            content_status: 'review',
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });

      const reviewResult = await ProductContentService.updateProductContent(
        'content-1',
        { contentStatus: 'review' as ContentStatusType },
        testUserId
      );
      expect(reviewResult).toBeDefined();
      expect(reviewResult.success).toBe(true);
      expect(reviewResult.data?.contentStatus).toBe('review');

      // Step 3: Approve content
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'content-1',
            content_status: 'approved',
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });

      const approveResult = await ProductContentService.updateProductContent(
        'content-1',
        { contentStatus: 'approved' as ContentStatusType },
        testUserId
      );
      expect(approveResult).toBeDefined();
      expect(approveResult.success).toBe(true);
      expect(approveResult.data?.contentStatus).toBe('approved');

      // Step 4: Publish content
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'content-1',
            content_status: 'published',
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });

      const publishResult = await ProductContentService.updateProductContent(
        'content-1',
        { contentStatus: 'published' as ContentStatusType },
        testUserId
      );
      expect(publishResult).toBeDefined();
      expect(publishResult.success).toBe(true);
      expect(publishResult.data?.contentStatus).toBe('published');

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    test('should prevent invalid workflow transitions', async () => {
      const invalidTransition: UpdateProductContentInput = {
        contentStatus: 'published' as ContentStatusType // Skip review/approval
      };

      await expect(
        ProductContentService.updateProductContent(
          testContentId,
          invalidTransition,
          testUserId
        )
      ).rejects.toThrow('Invalid workflow transition');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });

    test('should handle workflow rollback on errors', async () => {
      // Mock database error
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Content not found' }
        })
      });

      const updateWithError: UpdateProductContentInput = {
        contentStatus: 'approved' as ContentStatusType,
        marketingTitle: 'Updated Title'
      };

      await expect(
        ProductContentService.updateProductContent(
          'non-existent-id',
          updateWithError,
          testUserId
        )
      ).rejects.toThrow('Failed to update content: Content not found');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('Role Permission Enforcement Across Content Lifecycle', () => {
    test('should enforce draft creation permissions', async () => {
      (RolePermissionService.hasPermission as jest.Mock).mockResolvedValue(false);

      const createInput: CreateProductContentInput = {
        productId: testProductId,
        marketingTitle: 'Unauthorized Content',
        marketingDescription: 'Should not be created'
      };

      await expect(
        ProductContentService.createProductContent(createInput, testUserId)
      ).rejects.toThrow('Insufficient permissions');

      expect(RolePermissionService.hasPermission).toHaveBeenCalledWith(
        testUserId,
        'content_create'
      );
    });

    test('should enforce review state permissions', async () => {
      // Different permission for review state
      (RolePermissionService.hasPermission as jest.Mock).mockImplementation(
        async (userId, permission) => {
          return permission !== 'content_review';
        }
      );

      const reviewUpdate: UpdateProductContentInput = {
        contentStatus: 'review' as ContentStatusType
      };

      await expect(
        ProductContentService.updateProductContent(
          testContentId,
          reviewUpdate,
          testUserId
        )
      ).rejects.toThrow('Insufficient permissions');

      expect(RolePermissionService.hasPermission).toHaveBeenCalled();
    });

    test('should enforce approval permissions', async () => {
      // Test approval requires higher permissions
      (RolePermissionService.hasPermission as jest.Mock).mockImplementation(
        async (userId, permission) => {
          return permission !== 'content_approval';
        }
      );

      const approveUpdate: UpdateProductContentInput = {
        contentStatus: 'approved' as ContentStatusType
      };

      await expect(
        ProductContentService.updateProductContent(
          testContentId,
          approveUpdate,
          testUserId
        )
      ).rejects.toThrow('Insufficient permissions');

      expect(RolePermissionService.hasPermission).toHaveBeenCalled();
    });

    test('should enforce publish permissions', async () => {
      (RolePermissionService.hasPermission as jest.Mock).mockImplementation(
        async (userId, permission) => {
          return permission !== 'content_publish';
        }
      );

      const publishUpdate: UpdateProductContentInput = {
        contentStatus: 'published' as ContentStatusType
      };

      await expect(
        ProductContentService.updateProductContent(
          testContentId,
          publishUpdate,
          testUserId
        )
      ).rejects.toThrow('Insufficient permissions');

      expect(RolePermissionService.hasPermission).toHaveBeenCalled();
    });
  });

  describe('File Upload → Content Update → Cache Invalidation Flow', () => {
    test('should integrate file upload with content workflow', async () => {
      // Mock successful file upload
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testContentId,
            image_url: 'https://example.com/test-image.jpg',
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });

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

      expect(uploadResult).toBeDefined();
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data?.imageUrl).toBe('https://example.com/test-image.jpg');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
    });

    test('should handle file upload errors gracefully', async () => {
      const invalidFileData = {
        name: 'test.txt',
        size: 10000000, // Too large
        type: 'text/plain', // Invalid type
        buffer: Buffer.from('invalid-content')
      };

      await expect(
        ProductContentService.uploadContentImage(
          testContentId,
          invalidFileData,
          testUserId
        )
      ).rejects.toThrow('Invalid file type or size');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });

    test('should track upload progress during file operations', async () => {
      // Mock progress tracking
      const progressCallback = jest.fn();
      
      // Mock file upload with progress
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testContentId,
            image_url: 'https://example.com/large-image.jpg',
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });

      const mockFileData = {
        name: 'large-image.jpg',
        size: 5000000,
        type: 'image/jpeg',
        buffer: Buffer.from('large-image-data')
      };
      
      const uploadResult = await ProductContentService.uploadContentImageWithProgress(
        testContentId,
        mockFileData,
        testUserId,
        progressCallback
      );

      expect(uploadResult).toBeDefined();
      expect(uploadResult.success).toBe(true);
      expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({
        progress: expect.any(Number),
        stage: expect.any(String)
      }));
    });
  });

  describe('Collaborative Editing with Conflict Resolution', () => {
    test('should handle concurrent content edits', async () => {
      const user1Update: UpdateProductContentInput = {
        marketingTitle: 'Updated by User 1',
        marketingDescription: 'Description from User 1'
      };

      const user2Update: UpdateProductContentInput = {
        marketingTitle: 'Updated by User 2', 
        marketingDescription: 'Description from User 2'
      };

      // Setup mock for concurrent updates - first succeeds, second conflicts
      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              data: {
                id: testContentId,
                marketing_title: 'Updated by User 1',
                updated_at: new Date().toISOString()
              },
              error: null
            });
          } else {
            return Promise.resolve({
              data: null,
              error: { message: 'Concurrent update conflict' }
            });
          }
        })
      }));

      const [result1, result2] = await Promise.allSettled([
        ProductContentService.updateProductContent(testContentId, user1Update, 'user1'),
        ProductContentService.updateProductContent(testContentId, user2Update, 'user2')
      ]);

      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('rejected');
    });

    test('should provide conflict resolution data', async () => {
      // Mock version conflict response
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { 
            message: 'Version conflict detected',
            details: {
              currentVersion: 'current-version-timestamp',
              attemptedVersion: 'outdated-version-timestamp'
            }
          }
        })
      });

      const conflictUpdate: UpdateProductContentInput = {
        marketingTitle: 'Conflicting Update'
      };

      await expect(
        ProductContentService.updateProductContentWithConflictResolution(
          testContentId,
          conflictUpdate,
          testUserId,
          'outdated-version-timestamp'
        )
      ).rejects.toThrow('Version conflict detected');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Workflow Validation', () => {
    test('should recover from partial workflow failures', async () => {
      // Mock partial success response
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testContentId,
            marketing_title: 'Valid Title',
            content_status: 'review',
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });

      const partialUpdate: UpdateProductContentInput = {
        marketingTitle: 'Valid Title',
        contentStatus: 'review' as ContentStatusType
      };

      const result = await ProductContentService.updateProductContentWithRecovery(
        testContentId,
        partialUpdate,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data?.marketingTitle).toBe('Valid Title');
      expect(result.data?.contentStatus).toBe('review');
    });

    test('should maintain data consistency during errors', async () => {
      // Mock database error
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed - content not found' }
        })
      });

      const errorProneUpdate: UpdateProductContentInput = {
        marketingTitle: 'Update that will fail',
        contentStatus: 'approved' as ContentStatusType
      };

      await expect(
        ProductContentService.updateProductContent(
          'non-existent-id',
          errorProneUpdate,
          testUserId
        )
      ).rejects.toThrow('Failed to update content: Update failed - content not found');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('Performance Validation for Content Operations', () => {
    test('should handle large content datasets efficiently', async () => {
      // Mock paginated response
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: Array.from({ length: 100 }, (_, i) => ({
            id: `content-${i}`,
            marketing_title: `Content ${i}`,
            content_status: 'published'
          })),
          error: null
        })
      });

      const startTime = Date.now();
      
      const result = await ProductContentService.getContentByStatusPaginated(
        'published' as ContentStatusType,
        { page: 1, limit: 100 },
        testUserId
      );

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(100);
      expect(duration).toBeLessThan(5000);
    });

    test('should optimize file upload performance', async () => {
      // Mock file upload response
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testContentId,
            image_url: 'https://example.com/large-file.jpg',
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });

      const largeFileData = {
        name: 'large-file.jpg',
        size: 1000000, // 1MB
        type: 'image/jpeg',
        buffer: Buffer.alloc(1000000)
      };

      const startTime = Date.now();
      
      const result = await ProductContentService.uploadContentImage(
        testContentId,
        largeFileData,
        testUserId
      );

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data?.imageUrl).toBeDefined();
      expect(duration).toBeLessThan(10000);
    });

    test('should validate memory usage during content operations', async () => {
      // Mock content retrieval
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'content-test',
            marketing_title: 'Test Content',
            content_status: 'published'
          },
          error: null
        })
      });

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple content operations
      const operations = Array.from({ length: 10 }, (_, i) => 
        ProductContentService.getProductContent(`content-${i}`, testUserId)
      );

      await Promise.all(operations);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (under 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});