import { describe, it, expect } from '@jest/globals';
import { productContentSchema } from '../productContent';

describe('ProductContent Schema', () => {
  describe('Validation', () => {
    it('should validate complete product content with all fields', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Organic Heirloom Tomatoes',
        description: 'Fresh, locally grown organic heirloom tomatoes from sustainable farms',
        short_description: 'Fresh organic tomatoes',
        workflow_state: 'draft',
        media_urls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        video_urls: ['https://example.com/video1.mp4'],
        thumbnail_url: 'https://example.com/thumb.jpg',
        seo_keywords: ['organic', 'tomatoes', 'local', 'sustainable'],
        seo_description: 'Buy fresh organic heirloom tomatoes from local farms',
        metadata: {
          origin: 'California',
          harvest_date: '2024-01-15',
          certification: 'USDA Organic'
        },
        tags: ['organic', 'vegetables', 'fresh'],
        created_by: 'user123',
        updated_by: 'user456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        published_at: null,
        archived_at: null
      };
      
      const result = productContentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields only', () => {
      const minimalData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should reject missing product_id', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('product_id');
      }
    });

    it('should reject missing title', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty title string', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: '',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for id', () => {
      const invalidData = {
        id: 'not-a-uuid',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for product_id', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: 'invalid-product-id',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid media URLs', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        media_urls: ['not-a-url', 'also-not-a-url'],
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-array media_urls', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        media_urls: 'https://example.com/image.jpg',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept empty media_urls array', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        media_urls: [],
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Workflow State Validation', () => {
    it('should accept draft state', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept review state', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'review',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept approved state', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'approved',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept published state', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'published',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        published_at: '2024-01-03T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept archived state', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'archived',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        archived_at: '2024-01-04T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid workflow state', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'invalid_state',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing workflow state', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Transformations', () => {
    it('should transform created_at string to Date object', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      if (result.success) {
        expect(result.data.created_at).toBeInstanceOf(Date);
      }
    });

    it('should transform updated_at string to Date object', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      if (result.success) {
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });

    it('should transform published_at string to Date object when present', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'published',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        published_at: '2024-01-03T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      if (result.success) {
        expect(result.data.published_at).toBeInstanceOf(Date);
      }
    });

    it('should handle null published_at correctly', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        published_at: null
      };
      
      const result = productContentSchema.safeParse(data);
      if (result.success) {
        expect(result.data.published_at).toBeNull();
      }
    });

    it('should trim whitespace from title', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: '  Product Title  ',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      if (result.success) {
        expect(result.data.title).toBe('Product Title');
      }
    });

    it('should trim whitespace from description', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: '  Product description  ',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      if (result.success) {
        expect(result.data.description).toBe('Product description');
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface for complete data', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        short_description: 'Short desc',
        workflow_state: 'draft',
        media_urls: ['https://example.com/image.jpg'],
        video_urls: ['https://example.com/video.mp4'],
        thumbnail_url: 'https://example.com/thumb.jpg',
        seo_keywords: ['keyword1', 'keyword2'],
        seo_description: 'SEO description',
        metadata: { key: 'value' },
        tags: ['tag1', 'tag2'],
        created_by: 'user123',
        updated_by: 'user456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        published_at: null,
        archived_at: null
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('product_id');
        expect(result.data).toHaveProperty('title');
        expect(result.data).toHaveProperty('description');
        expect(result.data).toHaveProperty('workflow_state');
        expect(result.data).toHaveProperty('created_at');
      }
    });

    it('should preserve optional field types when present', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        seo_keywords: ['keyword1', 'keyword2'],
        metadata: { custom: 'data' },
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      if (result.success) {
        expect(Array.isArray(result.data.seo_keywords)).toBe(true);
        expect(typeof result.data.metadata).toBe('object');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum length title', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'A'.repeat(200),
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject title exceeding maximum length', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'A'.repeat(201),
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should handle maximum length description', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'A'.repeat(5000),
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject description exceeding maximum length', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'A'.repeat(5001),
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should handle empty arrays for optional array fields', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        media_urls: [],
        video_urls: [],
        seo_keywords: [],
        tags: [],
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle large arrays for media_urls', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        media_urls: Array(100).fill('https://example.com/image.jpg'),
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle complex metadata objects', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        metadata: {
          origin: 'California',
          harvest_date: '2024-01-15',
          certifications: ['USDA Organic', 'Fair Trade'],
          nutritional_info: {
            calories: 25,
            protein: 1.5,
            vitamins: ['A', 'C', 'K']
          }
        },
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle special characters in text fields', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product™ with émojis 🍅 and symbols ©',
        description: 'Description with "quotes" and \'smart quotes\' and line\nbreaks',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format for created_at', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: 'not-a-date'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should handle timestamps with microseconds', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Product Title',
        description: 'Product description',
        workflow_state: 'draft',
        created_by: 'user123',
        created_at: '2024-01-01T00:00:00.123456Z'
      };
      
      const result = productContentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});