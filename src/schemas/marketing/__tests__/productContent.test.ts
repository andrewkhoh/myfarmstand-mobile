import { 
  productContentSchema, 
  productContentTransform,
  validateWorkflowTransition 
} from '../productContent.schema';
import { ProductContent } from '../../../types/marketing.types';

describe('ProductContent Schema', () => {
  describe('Basic Validation', () => {
    it('should validate a complete product content object', () => {
      const validContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Premium Product Title',
        description: 'Detailed product description',
        shortDescription: 'Short desc',
        contentType: 'article',
        workflowState: 'draft',
        imageUrls: ['https://example.com/image1.jpg'],
        videoUrls: ['https://example.com/video1.mp4'],
        seoTitle: 'SEO Optimized Title',
        seoDescription: 'SEO meta description',
        seoKeywords: ['keyword1', 'keyword2'],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        lastModified: new Date(),
        createdBy: 'user-001',
        approvedBy: null,
        version: 1
      };

      const result = productContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
    });

    it('should reject invalid content type', () => {
      const invalidContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'invalid-type',
        workflowState: 'draft',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = productContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });

    it('should reject invalid workflow state', () => {
      const invalidContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'invalid-state',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = productContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });

    it('should require all mandatory fields', () => {
      const incompleteContent = {
        id: 'pc-001',
        title: 'Title'
      };

      const result = productContentSchema.safeParse(incompleteContent);
      expect(result.success).toBe(false);
    });

    it('should handle optional fields correctly', () => {
      const minimalContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'draft',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = productContentSchema.safeParse(minimalContent);
      expect(result.success).toBe(true);
    });
  });

  describe('Transform Schema', () => {
    it('should transform database data correctly', () => {
      const dbData = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'draft',
        imageUrls: null,
        seoKeywords: null,
        targetAudience: 'b2b',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-01T00:00:00Z',
        createdBy: 'user-001',
        version: 1
      };

      const result = productContentTransform.safeParse(dbData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imageUrls).toEqual([]);
        expect(result.data.seoKeywords).toEqual([]);
        expect(result.data.lastModified).toBeInstanceOf(Date);
      }
    });

    it('should handle null arrays with defaults', () => {
      const dbData = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'draft',
        imageUrls: null,
        videoUrls: null,
        seoKeywords: null,
        targetAudience: 'b2b',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-01T00:00:00Z',
        createdBy: 'user-001',
        version: 1
      };

      const result = productContentTransform.safeParse(dbData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imageUrls).toEqual([]);
        expect(result.data.videoUrls).toEqual([]);
        expect(result.data.seoKeywords).toEqual([]);
      }
    });

    it('should parse date strings correctly', () => {
      const dbData = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'published',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
        publishedAt: '2024-01-03T10:00:00Z',
        lastModified: '2024-01-03T10:00:00Z',
        createdBy: 'user-001',
        version: 1
      };

      const result = productContentTransform.safeParse(dbData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
        expect(result.data.publishedAt).toBeInstanceOf(Date);
        expect(result.data.lastModified).toBeInstanceOf(Date);
      }
    });
  });

  describe('Workflow Validation', () => {
    it('should allow valid draft to review transition', () => {
      const content: ProductContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'draft',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = validateWorkflowTransition(content, 'review');
      expect(result.valid).toBe(true);
    });

    it('should allow review to approved transition', () => {
      const content: ProductContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'review',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = validateWorkflowTransition(content, 'approved');
      expect(result.valid).toBe(true);
    });

    it('should allow review back to draft transition', () => {
      const content: ProductContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'review',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = validateWorkflowTransition(content, 'draft');
      expect(result.valid).toBe(true);
    });

    it('should prevent invalid published to review transition', () => {
      const content: ProductContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'published',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = validateWorkflowTransition(content, 'review');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from published');
    });

    it('should prevent direct draft to published transition', () => {
      const content: ProductContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'draft',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = validateWorkflowTransition(content, 'published');
      expect(result.valid).toBe(false);
    });

    it('should allow published to archived transition', () => {
      const content: ProductContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'published',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = validateWorkflowTransition(content, 'archived');
      expect(result.valid).toBe(true);
    });

    it('should prevent transitions from archived state', () => {
      const content: ProductContent = {
        id: 'pc-001',
        productId: 'prod-001',
        title: 'Title',
        description: 'Description',
        contentType: 'article',
        workflowState: 'archived',
        imageUrls: [],
        seoKeywords: [],
        targetAudience: 'b2b',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
        createdBy: 'user-001',
        version: 1
      };

      const result = validateWorkflowTransition(content, 'draft');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from archived');
    });
  });
});