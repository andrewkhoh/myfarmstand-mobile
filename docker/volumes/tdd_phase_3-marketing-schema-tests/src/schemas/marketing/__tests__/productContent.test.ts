import { describe, it, expect } from '@jest/globals';
// @ts-expect-error - Schema not implemented yet (RED phase)
import { productContentSchema } from '../productContent';

describe('ProductContent Schema', () => {
  describe('Validation', () => {
    it('should validate complete product content', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh, locally grown organic tomatoes from our sustainable farm. These heritage variety tomatoes are vine-ripened for optimal flavor.',
        workflow_state: 'draft',
        media_urls: [
          'https://example.com/images/tomatoes-hero.jpg',
          'https://example.com/images/tomatoes-detail.jpg'
        ],
        seo_keywords: ['organic', 'tomatoes', 'local', 'sustainable', 'heirloom'],
        created_by: 'user123',
        updated_by: 'user456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      };
      
      const result = productContentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing required field: id', () => {
      const invalid = {
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh tomatoes',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('id');
      }
    });

    it('should reject missing required field: product_id', () => {
      const invalid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh tomatoes',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for id', () => {
      const invalid = {
        id: 'not-a-uuid',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh tomatoes',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid workflow_state enum value', () => {
      const invalid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh tomatoes',
        workflow_state: 'invalid_state',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept all valid workflow states', () => {
      const states = ['draft', 'review', 'approved', 'published', 'archived'];
      
      states.forEach(state => {
        const data = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          product_id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Product',
          description: 'Test description',
          workflow_state: state,
          media_urls: [],
          seo_keywords: [],
          created_by: 'user123',
          updated_by: 'user123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        };
        
        const result = productContentSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject non-string title', () => {
      const invalid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 12345,
        description: 'Fresh tomatoes',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL in media_urls array', () => {
      const invalid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh tomatoes',
        workflow_state: 'draft',
        media_urls: ['not-a-url', 'https://valid.com/image.jpg'],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Workflow State Transitions', () => {
    it('should validate transition from draft to review', () => {
      const contentInDraft = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const contentInReview = { ...contentInDraft, workflow_state: 'review' };
      
      const draftResult = productContentSchema.safeParse(contentInDraft);
      const reviewResult = productContentSchema.safeParse(contentInReview);
      
      expect(draftResult.success).toBe(true);
      expect(reviewResult.success).toBe(true);
    });

    it('should validate transition from review to approved', () => {
      const content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'approved',
        media_urls: ['https://example.com/image.jpg'],
        seo_keywords: ['keyword1'],
        created_by: 'user123',
        updated_by: 'user456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });

    it('should validate transition from approved to published', () => {
      const content = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'published',
        media_urls: ['https://example.com/image.jpg'],
        seo_keywords: ['keyword1', 'keyword2'],
        created_by: 'user123',
        updated_by: 'user789',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });
  });

  describe('Transformations', () => {
    it('should transform date strings to Date objects for created_at', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product',
        description: 'Description',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.created_at).toBeInstanceOf(Date);
      }
    });

    it('should transform date strings to Date objects for updated_at', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product',
        description: 'Description',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T14:30:45Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });

    it('should normalize and trim string fields', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: '  Product Title  ',
        description: '  Product Description  ',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: ['  keyword  ', '  another  '],
        created_by: '  user123  ',
        updated_by: '  user456  ',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Product Title');
        expect(result.data.description).toBe('Product Description');
        expect(result.data.created_by).toBe('user123');
        expect(result.data.updated_by).toBe('user456');
        expect(result.data.seo_keywords[0]).toBe('keyword');
        expect(result.data.seo_keywords[1]).toBe('another');
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface for complete content', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh, locally grown organic tomatoes',
        workflow_state: 'published',
        media_urls: [
          'https://example.com/images/tomato1.jpg',
          'https://example.com/images/tomato2.jpg'
        ],
        seo_keywords: ['organic', 'tomatoes', 'local'],
        created_by: 'user123',
        updated_by: 'user456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      
      if (result.success) {
        // TypeScript interface checks
        expect(typeof result.data.id).toBe('string');
        expect(typeof result.data.product_id).toBe('string');
        expect(typeof result.data.title).toBe('string');
        expect(typeof result.data.description).toBe('string');
        expect(typeof result.data.workflow_state).toBe('string');
        expect(Array.isArray(result.data.media_urls)).toBe(true);
        expect(Array.isArray(result.data.seo_keywords)).toBe(true);
        expect(typeof result.data.created_by).toBe('string');
        expect(typeof result.data.updated_by).toBe('string');
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });

    it('should ensure all fields are present in parsed result', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Test Product',
        description: 'Test Description',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user1',
        updated_by: 'user2',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const keys = Object.keys(result.data);
        expect(keys).toContain('id');
        expect(keys).toContain('product_id');
        expect(keys).toContain('title');
        expect(keys).toContain('description');
        expect(keys).toContain('workflow_state');
        expect(keys).toContain('media_urls');
        expect(keys).toContain('seo_keywords');
        expect(keys).toContain('created_by');
        expect(keys).toContain('updated_by');
        expect(keys).toContain('created_at');
        expect(keys).toContain('updated_at');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays for media_urls', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product',
        description: 'Description',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: ['keyword'],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.media_urls).toEqual([]);
      }
    });

    it('should handle empty arrays for seo_keywords', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product',
        description: 'Description',
        workflow_state: 'draft',
        media_urls: ['https://example.com/image.jpg'],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.seo_keywords).toEqual([]);
      }
    });

    it('should handle maximum length title (255 characters)', () => {
      const maxTitle = 'a'.repeat(255);
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: maxTitle,
        description: 'Description',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject title exceeding maximum length', () => {
      const tooLongTitle = 'a'.repeat(256);
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: tooLongTitle,
        description: 'Description',
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should handle large description (5000 characters)', () => {
      const largeDescription = 'Lorem ipsum '.repeat(400); // ~4800 chars
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product',
        description: largeDescription,
        workflow_state: 'draft',
        media_urls: [],
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle multiple media URLs (up to 10)', () => {
      const mediaUrls = Array.from({ length: 10 }, (_, i) => 
        `https://example.com/image${i + 1}.jpg`
      );
      
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product',
        description: 'Description',
        workflow_state: 'draft',
        media_urls: mediaUrls,
        seo_keywords: [],
        created_by: 'user123',
        updated_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.media_urls.length).toBe(10);
      }
    });
  });
});