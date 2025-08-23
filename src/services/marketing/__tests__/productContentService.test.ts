// Mock ValidationMonitor before importing service (Pattern 1)
jest.mock('../../../utils/validationMonitor');

import { ProductContentService } from '../productContentService';
import { ValidationMonitor } from '../../../utils/validationMonitor';
import type { 
  UpdateProductContentInput,
  CreateProductContentInput
} from '../../../schemas/marketing';

// Mock the supabase module at the service level (exact authService pattern)
const mockSupabase = require('../../../config/supabase').supabase;

// Mock role permissions
jest.mock('../../role-based/rolePermissionService');
const mockRolePermissionService = require('../../role-based/rolePermissionService').RolePermissionService;

// ProductContentService Tests - Pattern 1 Compliance
describe('ProductContentService - Phase 3.1.2', () => {
  const testUserId = 'test-user-123';
  const testProductId = 'test-product-456';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Supabase mocks to prevent state contamination
    if (global.resetSupabaseMocks) {
      global.resetSupabaseMocks();
    }
    
    // Setup default mock responses for role permissions
    mockRolePermissionService.hasPermission = jest.fn().mockResolvedValue(true);
    
    // Add storage mock for file upload tests
    mockSupabase.storage = {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({
          data: { path: 'content-images/test-file.jpg' },
          error: null
        })),
        remove: jest.fn(() => Promise.resolve({
          data: null,
          error: null
        }))
      }))
    };
  });

  describe('Content Creation', () => {
    it('should create product content with complete field validation', async () => {
      // Setup successful content creation mock (Pattern 1)
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'content-123',
                product_id: testProductId,
                marketing_title: 'Test Product Marketing',
                marketing_description: 'Complete test description for product',
                marketing_highlights: ['Quality', 'Organic', 'Fresh'],
                seo_keywords: ['test', 'product', 'marketing'],
                featured_image_url: null,
                gallery_urls: null,
                content_status: 'draft',
                content_priority: 5,
                last_updated_by: testUserId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      });

      const contentInput: CreateProductContentInput = {
        productId: testProductId,
        marketingTitle: 'Test Product Marketing',
        marketingDescription: 'Complete test description for product',
        marketingHighlights: ['Quality', 'Organic', 'Fresh'],
        seoKeywords: ['test', 'product', 'marketing'],
        contentStatus: 'draft',
        contentPriority: 5
      };

      const result = await ProductContentService.createProductContent(
        contentInput,
        testUserId
      );

      // Debug: log the result to see what's happening
      if (!result.success) {
        console.log('Create content failed with error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.productId).toBe(testProductId);
      expect(result.data?.marketingTitle).toBe('Test Product Marketing');
      expect(result.data?.contentStatus).toBe('draft');

      // Verify ValidationMonitor was called
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'transformation_schema',
        operation: 'createProductContent'
      });
    });

    it('should handle content creation with minimal required fields', async () => {
      // Setup mock for minimal content creation
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'content-minimal-123',
                product_id: testProductId,
                marketing_title: 'Minimal Product',
                marketing_description: null,
                marketing_highlights: null,
                seo_keywords: null,
                featured_image_url: null,
                gallery_urls: null,
                content_status: 'draft',
                content_priority: null,
                last_updated_by: testUserId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      });

      const minimalInput: CreateProductContentInput = {
        productId: testProductId,
        marketingTitle: 'Minimal Product',
        contentStatus: 'draft'
      };

      const result = await ProductContentService.createProductContent(
        minimalInput,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.productId).toBe(testProductId);
      expect(result.data?.marketingTitle).toBe('Minimal Product');

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'transformation_schema',
        operation: 'createProductContent'
      });
    });
  });

  describe('Content Updates', () => {
    it('should update product content with field validation', async () => {
      // Mock the getProductContent call (first database operation)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'content-update-123',
                product_id: testProductId,
                marketing_title: 'Original Product Title',
                marketing_description: 'Original description',
                marketing_highlights: ['Original'],
                seo_keywords: ['original'],
                featured_image_url: null,
                gallery_urls: null,
                content_status: 'draft',
                content_priority: 1,
                last_updated_by: testUserId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      });

      // Setup mock for content update (second database operation)
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'content-update-123',
                  product_id: testProductId,
                  marketing_title: 'Updated Product Title',
                  marketing_description: 'Updated description',
                  marketing_highlights: null,
                  seo_keywords: null,
                  featured_image_url: null,
                  gallery_urls: null,
                  content_status: 'review',
                  content_priority: null,
                  last_updated_by: testUserId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                error: null
              })
            })
          })
        })
      });

      const updateInput: UpdateProductContentInput = {
        marketingTitle: 'Updated Product Title',
        marketingDescription: 'Updated description',
        contentStatus: 'review'
      };

      const result = await ProductContentService.updateProductContent(
        'content-update-123',
        updateInput,
        testUserId
      );

      // Debug: log the result to see what's happening
      if (!result.success) {
        console.log('Update content failed with error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.data?.marketingTitle).toBe('Updated Product Title');
      expect(result.data?.contentStatus).toBe('review');

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'transformation_schema',
        operation: 'updateProductContent'
      });
    });

    it('should update content status with workflow validation', async () => {
      // Setup mock for status update
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'content-status-123',
                  product_id: testProductId,
                  marketing_title: 'Status Update Content',
                  marketing_description: null,
                  marketing_highlights: null,
                  seo_keywords: null,
                  featured_image_url: null,
                  gallery_urls: null,
                  content_status: 'approved',
                  content_priority: null,
                  last_updated_by: testUserId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                error: null
              })
            })
          })
        })
      });

      const result = await ProductContentService.updateContentStatus(
        'content-status-123',
        'approved',
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.contentStatus).toBe('approved');

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        'ProductContentService.updateContentStatus',
        expect.any(Object)
      );
    });
  });

  describe('Content Retrieval', () => {
    it('should get content by product ID', async () => {
      // Setup mock for content retrieval
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'content-retrieve-123',
                product_id: testProductId,
                marketing_title: 'Retrieved Product',
                marketing_description: 'Retrieved description',
                marketing_highlights: ['Quality', 'Fresh'],
                seo_keywords: ['retrieved', 'product'],
                featured_image_url: null,
                gallery_urls: null,
                content_status: 'published',
                content_priority: 3,
                last_updated_by: testUserId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      });

      const result = await ProductContentService.getContentByProductId(
        testProductId,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.productId).toBe(testProductId);
      expect(result.data?.marketingTitle).toBe('Retrieved Product');

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'transformation_schema',
        operation: 'getContentByProductId'
      });
    });

    it('should get content by status with pagination', async () => {
      // Setup mock for status-based retrieval
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'content-1',
                    product_id: 'product-1',
                    marketing_title: 'Content 1',
                    marketing_description: 'Description 1',
                    marketing_highlights: ['Quality'],
                    seo_keywords: ['content', '1'],
                    featured_image_url: null,
                    gallery_urls: null,
                    content_status: 'published',
                    content_priority: 1,
                    last_updated_by: testUserId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  },
                  {
                    id: 'content-2',
                    product_id: 'product-2',
                    marketing_title: 'Content 2',
                    marketing_description: 'Description 2',
                    marketing_highlights: ['Fresh'],
                    seo_keywords: ['content', '2'],
                    featured_image_url: null,
                    gallery_urls: null,
                    content_status: 'published',
                    content_priority: 2,
                    last_updated_by: testUserId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                ],
                error: null
              })
            })
          })
        })
      });

      const result = await ProductContentService.getContentByStatus(
        'published',
        { page: 1, limit: 10 },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.items[0].contentStatus).toBe('published');

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'transformation_schema',
        operation: 'getContentByStatus'
      });
    });
  });

  describe('Content Workflow', () => {
    it('should handle complete content workflow from draft to published', async () => {
      // Setup mock for workflow progression
      const workflowSteps = [
        { content_status: 'draft' },
        { content_status: 'review' },
        { content_status: 'approved' },
        { content_status: 'published' }
      ];

      workflowSteps.forEach((step, index) => {
        mockSupabase.from.mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'content-workflow-123',
                    product_id: testProductId,
                    marketing_title: 'Workflow Content',
                    marketing_description: 'Workflow test description',
                    marketing_highlights: ['Workflow'],
                    seo_keywords: ['workflow', 'test'],
                    featured_image_url: null,
                    gallery_urls: null,
                    content_priority: 1,
                    last_updated_by: testUserId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...step
                  },
                  error: null
                })
              })
            })
          })
        });
      });

      // Progress through workflow
      const contentId = 'content-workflow-123';
      
      const reviewResult = await ProductContentService.updateContentStatus(
        contentId,
        'review',
        testUserId
      );
      expect(reviewResult.success).toBe(true);

      const approveResult = await ProductContentService.updateContentStatus(
        contentId,
        'approved',
        testUserId
      );
      expect(approveResult.success).toBe(true);

      const publishResult = await ProductContentService.updateContentStatus(
        contentId,
        'published',
        testUserId
      );
      expect(publishResult.success).toBe(true);

      // Verify workflow progression was logged
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledTimes(3);
    });
  });

  describe('Content File Management', () => {
    it('should handle content image uploads', async () => {
      // Setup mock for file upload
      const mockFile = new File(['test content'], 'test-image.jpg', { type: 'image/jpeg' });

      const result = await ProductContentService.uploadContentImage(
        'content-file-123',
        mockFile,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.fileName).toMatch(/content\/.*\.jpg$/);
      expect(result.data?.imageUrl).toMatch(/^https:\/\/secure-cdn\.farmstand\.com\/.*\.jpg$/);

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'simple_input_validation',
        operation: 'uploadContentImage'
      });
    });

    it('should handle content image removal', async () => {
      const result = await ProductContentService.removeContentImage(
        'https://secure-cdn.farmstand.com/content-images/test-file.jpg',
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data?.removed).toBe(true);

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'simple_input_validation',
        operation: 'removeContentImage'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle content creation failures gracefully', async () => {
      // Setup mock for creation failure
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Content validation failed', code: 'VALIDATION_ERROR' }
            })
          })
        })
      });

      const invalidInput: CreateProductContentInput = {
        productId: '', // Invalid empty product ID
        marketingTitle: '',
        contentStatus: 'draft'
      };

      const result = await ProductContentService.createProductContent(
        invalidInput,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'ProductContentService.createProductContent',
        errorCode: 'CONTENT_CREATION_FAILED',
        validationPattern: 'content_transformation_schema',
        errorMessage: 'Content validation failed'
      });
    });

    it('should handle content not found scenarios', async () => {
      // Setup mock for not found
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'The result contains 0 rows' }
            })
          })
        })
      });

      const result = await ProductContentService.getContentByProductId(
        'non-existent-product',
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);

      // For PGRST116 (not found), no validation error should be recorded
      expect(ValidationMonitor.recordValidationError).not.toHaveBeenCalled();
    });
  });

  describe('Permission Integration', () => {
    it('should enforce role-based access for content operations', async () => {
      // Setup mock for permission failure
      mockRolePermissionService.hasPermission = jest.fn().mockResolvedValue(false);

      const result = await ProductContentService.createProductContent(
        {
          productId: testProductId,
          marketingTitle: 'Test Content',
          contentStatus: 'draft'
        },
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');

      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'ProductContentService.createProductContent',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        validationPattern: 'content_transformation_schema',
        errorMessage: 'Insufficient permissions for content creation'
      });
    });
  });

  describe('Performance Validation', () => {
    it('should handle large content operations efficiently', async () => {
      // Setup mock for performance testing
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: Array.from({ length: 50 }, (_, i) => ({
                  id: `content-${i}`,
                  product_id: `product-${i}`,
                  marketing_title: `Content ${i}`,
                  marketing_description: `Description ${i}`,
                  marketing_highlights: [`Feature-${i}`],
                  seo_keywords: [`content-${i}`, `product-${i}`],
                  featured_image_url: null,
                  gallery_urls: null,
                  content_status: 'published',
                  content_priority: i % 5 + 1,
                  last_updated_by: testUserId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })),
                error: null
              })
            })
          })
        })
      });

      const startTime = performance.now();

      const result = await ProductContentService.getContentByStatus(
        'published',
        { page: 1, limit: 50 },
        testUserId
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(50);
      expect(executionTime).toBeLessThan(500); // Should complete in under 500ms

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productContentService',
        pattern: 'transformation_schema',
        operation: 'getContentByStatus'
      });
    });
  });
});