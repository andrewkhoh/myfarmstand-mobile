import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase FIRST with proper typing
const mockSupabaseClient = {
  from: jest.fn()
};

jest.mock('@/config/supabase', () => ({
  supabase: mockSupabaseClient
}));

// Import the actual service
import { contentService } from '../contentService';

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock chain with proper typing
    const createMockChain = () => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    });
    
    mockSupabaseClient.from.mockImplementation(() => createMockChain());
  });
  
  describe('createContent', () => {
    it('should create content with initial draft state', async () => {
      const mockData = { 
        id: '123', 
        workflow_state: 'draft',
        title: 'Test Content',
        product_id: 'prod123',
        description: 'Test Description'
      };
      
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const result = await contentService.createContent({
        product_id: 'prod123',
        title: 'Test Content',
        description: 'Test Description'
      });
      
      expect(result).toBeDefined();
      expect(result.workflow_state).toBe('draft');
    });

    it('should handle validation errors', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Validation failed' } })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      await expect(contentService.createContent({
        title: 'Test',
        description: 'Test'
      } as any)).rejects.toThrow('Validation failed');
    });

    it('should handle network errors', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Network error'))
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      await expect(contentService.createContent({
        product_id: 'prod123',
        title: 'Test Content'
      } as any)).rejects.toThrow('Network error');
    });
  });
  
  describe('updateContent', () => {
    it('should update content successfully', async () => {
      const mockData = { id: '123', title: 'Updated Title' };
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const result = await contentService.updateContent('123', {
        title: 'Updated Title'
      });
      
      expect(result.title).toBe('Updated Title');
    });
  });
  
  describe('getContent', () => {
    it('should retrieve content by ID', async () => {
      const mockData = { id: '123', title: 'Test Content' };
      
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const result = await contentService.getContent('123');
      expect(result.id).toBe('123');
    });
  });
  
  describe('deleteContent', () => {
    it('should delete content', async () => {
      const mockChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      await expect(contentService.deleteContent('123')).resolves.not.toThrow();
    });
  });
  
  describe('Workflow State Management', () => {
    it('should update workflow state', async () => {
      const mockData = { id: '123', workflow_state: 'review' };
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const result = await contentService.updateWorkflowState('123', 'review');
      expect(result.workflow_state).toBe('review');
    });

    it('should publish content with timestamp', async () => {
      const mockData = { 
        id: '123', 
        workflow_state: 'published', 
        published_at: new Date().toISOString() 
      };
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const result = await contentService.publishContent('123');
      expect(result.workflow_state).toBe('published');
      expect(result.published_at).toBeDefined();
    });

    it('should archive content', async () => {
      const mockData = { id: '123', workflow_state: 'archived' };
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const result = await contentService.archiveContent('123');
      expect(result.workflow_state).toBe('archived');
    });
  });
  
  describe('Content Duplication', () => {
    it('should duplicate content with new product ID', async () => {
      // Mock for getContent
      const mockGetChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: '123', 
            title: 'Original',
            product_id: 'prod123',
            description: 'Test'
          },
          error: null
        })
      };
      
      // Mock for insert
      const mockInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: 'new123', 
            title: 'Copy of Original',
            product_id: 'prod456'
          },
          error: null
        })
      };
      
      mockSupabaseClient.from
        .mockReturnValueOnce(mockGetChain as any)
        .mockReturnValueOnce(mockInsertChain as any);
      
      const result = await contentService.duplicateContent('123', 'prod456');
      expect(result.id).toBe('new123');
      expect(result.title).toContain('Copy of');
    });
  });
  
  describe('Content Search and Filtering', () => {
    it('should search content by keyword', async () => {
      const mockData = [
        { id: '1', title: 'Marketing Guide' },
        { id: '2', title: 'Marketing Strategy' }
      ];
      
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const results = await contentService.searchContent('marketing');
      expect(results).toHaveLength(2);
    });

    it('should filter content by workflow state', async () => {
      const mockData = [
        { id: '1', workflow_state: 'draft' },
        { id: '2', workflow_state: 'draft' }
      ];
      
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const results = await contentService.listContent({
        workflow_state: 'draft'
      });
      expect(results.every((r: any) => r.workflow_state === 'draft')).toBe(true);
    });

    it('should paginate content results', async () => {
      const mockData = Array(10).fill({ id: '1', title: 'Content' });
      
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const results = await contentService.listContent({
        page: 1,
        limit: 10
      });
      expect(results).toHaveLength(10);
    });
  });
  
  describe('Content Versioning', () => {
    it('should retrieve version history', async () => {
      const mockData = [
        { version: 3, updated_at: '2025-01-03' },
        { version: 2, updated_at: '2025-01-02' },
        { version: 1, updated_at: '2025-01-01' }
      ];
      
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const versions = await contentService.getContentVersionHistory('123');
      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(3);
    });

    it('should revert to previous version', async () => {
      // Mock for getting version
      const mockGetChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { 
              id: '123', 
              version: 2, 
              title: 'Previous Title',
              description: 'Previous Desc',
              content: 'Previous Content'
            },
            error: null
          })
        }))
      };
      
      // Mock for updating content
      const mockUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: '123', 
            version: 2, 
            title: 'Previous Title' 
          },
          error: null
        })
      };
      
      mockSupabaseClient.from
        .mockReturnValueOnce(mockGetChain as any)
        .mockReturnValueOnce(mockUpdateChain as any);
      
      const reverted = await contentService.revertToVersion('123', 2);
      expect(reverted.title).toBe('Previous Title');
    });
  });
  
  describe('Bulk Operations', () => {
    it('should perform bulk content updates', async () => {
      const mockData = [
        { id: '1', is_active: false },
        { id: '2', is_active: false },
        { id: '3', is_active: false }
      ];
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const results = await contentService.bulkUpdateContent(
        ['1', '2', '3'],
        { is_active: false }
      );
      expect(results).toHaveLength(3);
      expect(results.every((r: any) => r.is_active === false)).toBe(true);
    });

    it('should handle errors in bulk operations', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: null, error: { message: 'Bulk update failed' } })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      await expect(contentService.bulkUpdateContent(
        ['1', '2', '3'],
        { is_active: false }
      )).rejects.toThrow('Bulk update failed');
    });
  });
  
  describe('Content Association', () => {
    it('should get content by product ID', async () => {
      const mockData = [
        { id: '1', product_id: 'prod123', title: 'Product Content 1' },
        { id: '2', product_id: 'prod123', title: 'Product Content 2' }
      ];
      
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      const content = await contentService.getContentByProductId('prod123');
      expect(content).toHaveLength(2);
      expect(content.every((c: any) => c.product_id === 'prod123')).toBe(true);
    });

    it('should duplicate content with new associations', async () => {
      // Mock for getContent
      const mockGetChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: '123',
            title: 'Original',
            product_id: 'prod123'
          },
          error: null
        })
      };
      
      // Mock for insert
      const mockInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: 'new123',
            title: 'Copy of Original',
            product_id: 'prod456'
          },
          error: null
        })
      };
      
      mockSupabaseClient.from
        .mockReturnValueOnce(mockGetChain as any)
        .mockReturnValueOnce(mockInsertChain as any);
      
      const duplicate = await contentService.duplicateContent('123', 'prod456');
      expect(duplicate.product_id).toBe('prod456');
      expect(duplicate.title).toContain('Copy of');
    });
  });
  
  describe('Validation', () => {
    it('should validate required fields', async () => {
      await expect(contentService.validateContentFields({
        description: 'Missing title and product_id'
      })).rejects.toThrow('Title and product_id are required');
    });

    it('should validate title length', async () => {
      await expect(contentService.validateContentFields({
        title: 'ab',
        product_id: 'prod123'
      })).rejects.toThrow('Title must be between 3 and 200 characters');
    });

    it('should validate workflow state', async () => {
      await expect(contentService.validateContentFields({
        title: 'Valid Title',
        product_id: 'prod123',
        workflow_state: 'invalid'
      })).rejects.toThrow('Invalid workflow state');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      await expect(contentService.getContent('123'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle not found errors', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Content not found' } })
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain as any);
      
      await expect(contentService.getContent('999'))
        .rejects.toThrow('Content not found');
    });
  });
});