import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockSupabaseClient, createMockLogger } from '@/test/serviceSetup';

// Mock Supabase FIRST
jest.mock('@/config/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: createMockLogger()
}));

// Mock the service (it doesn't exist yet - RED phase)
jest.mock('../contentService', () => ({
  contentService: {
    createContent: jest.fn(),
    updateContent: jest.fn(),
    getContent: jest.fn(),
    deleteContent: jest.fn(),
    listContent: jest.fn(),
    updateWorkflowState: jest.fn(),
    publishContent: jest.fn(),
    scheduleContent: jest.fn(),
    duplicateContent: jest.fn(),
    archiveContent: jest.fn(),
    getContentVersions: jest.fn(),
    revertContent: jest.fn(),
    validateContent: jest.fn(),
    searchContent: jest.fn(),
    bulkUpdateContent: jest.fn()
  }
}));

describe('ContentService', () => {
  let mockSupabase: any;
  let mockLogger: any;
  let contentService: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
    mockLogger = require('@/utils/logger').logger;
    contentService = require('../contentService').contentService;
    
    // Setup default mock behaviors
    setupDefaultMocks();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  function setupDefaultMocks() {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis() as any,
      insert: jest.fn().mockReturnThis() as any,
      update: jest.fn().mockReturnThis() as any,
      delete: jest.fn().mockReturnThis() as any,
      eq: jest.fn().mockReturnThis() as any,
      neq: jest.fn().mockReturnThis() as any,
      in: jest.fn().mockReturnThis() as any,
      order: jest.fn().mockReturnThis() as any,
      limit: jest.fn().mockReturnThis() as any,
      single: jest.fn().mockResolvedValue({ data: null, error: null }) as any,
      execute: jest.fn().mockResolvedValue({ data: [], error: null }) as any
    });
  }
  
  describe('createContent', () => {
    it('should create content with initial draft state', async () => {
      const mockData = {
        product_id: 'prod-123',
        title: 'Marketing Campaign Content',
        description: 'Engaging product description',
        content_type: 'article',
        tags: ['marketing', 'product-launch']
      };
      
      const expectedResult = {
        id: 'content-123',
        ...mockData,
        workflow_state: 'draft',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [expectedResult],
            error: null
          })
        })
      });
      
      // This will fail - service doesn't exist (RED phase)
      const result = await contentService.createContent(mockData);
      
      expect(result).toEqual(expectedResult);
      expect(result.workflow_state).toBe('draft');
      expect(mockSupabase.from).toHaveBeenCalledWith('marketing_contents');
    });
    
    it('should validate required fields', async () => {
      const invalidData = {
        product_id: 'prod-123'
        // Missing required fields
      };
      
      await expect(contentService.createContent(invalidData))
        .rejects.toThrow('Validation error');
    });
    
    it('should handle database errors during creation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      });
      
      await expect(contentService.createContent({ title: 'Test' }))
        .rejects.toThrow('Database operation failed');
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    it('should set metadata fields correctly', async () => {
      const mockData = {
        title: 'Content with metadata',
        description: 'Test description',
        metadata: {
          author: 'John Doe',
          keywords: ['test', 'content'],
          seo_title: 'SEO Optimized Title'
        }
      };
      
      const result = await contentService.createContent(mockData);
      
      expect(result.metadata).toEqual(mockData.metadata);
    });
    
    it('should generate slug from title if not provided', async () => {
      const mockData = {
        title: 'This Is A Test Title',
        description: 'Test content'
      };
      
      const result = await contentService.createContent(mockData);
      
      expect(result.slug).toBe('this-is-a-test-title');
    });
  });
  
  describe('updateContent', () => {
    it('should update existing content', async () => {
      const contentId = 'content-123';
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };
      
      const expectedResult = {
        id: contentId,
        ...updateData,
        updated_at: new Date().toISOString(),
        version: 2
      };
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [expectedResult],
              error: null
            })
          })
        })
      });
      
      const result = await contentService.updateContent(contentId, updateData);
      
      expect(result).toEqual(expectedResult);
      expect(result.version).toBe(2);
    });
    
    it('should handle content not found', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });
      
      await expect(contentService.updateContent('non-existent', {}))
        .rejects.toThrow('Content not found');
    });
    
    it('should validate workflow state transitions', async () => {
      const contentId = 'content-123';
      const invalidUpdate = {
        workflow_state: 'published' // Cannot go directly from draft to published
      };
      
      await expect(contentService.updateContent(contentId, invalidUpdate))
        .rejects.toThrow('Invalid workflow state transition');
    });
    
    it('should increment version on update', async () => {
      const contentId = 'content-123';
      const updateData = { title: 'New Title' };
      
      // First get current version
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: contentId, version: 3 },
              error: null
            })
          })
        })
      });
      
      // Then update with incremented version
      const result = await contentService.updateContent(contentId, updateData);
      
      expect(result.version).toBe(4);
    });
  });
  
  describe('getContent', () => {
    it('should retrieve content by id', async () => {
      const contentId = 'content-123';
      const mockContent = {
        id: contentId,
        title: 'Test Content',
        workflow_state: 'draft',
        created_at: new Date().toISOString()
      };
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null
            })
          })
        })
      });
      
      const result = await contentService.getContent(contentId);
      
      expect(result).toEqual(mockContent);
      expect(mockSupabase.from).toHaveBeenCalledWith('marketing_contents');
    });
    
    it('should return null for non-existent content', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });
      
      const result = await contentService.getContent('non-existent');
      
      expect(result).toBeNull();
    });
    
    it('should include related data when requested', async () => {
      const contentId = 'content-123';
      const options = { includeProduct: true, includeVersions: true };
      
      const result = await contentService.getContent(contentId, options);
      
      expect(result.product).toBeDefined();
      expect(result.versions).toBeInstanceOf(Array);
    });
  });
  
  describe('deleteContent', () => {
    it('should soft delete content', async () => {
      const contentId = 'content-123';
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ id: contentId, deleted_at: new Date().toISOString() }],
              error: null
            })
          })
        })
      });
      
      await contentService.deleteContent(contentId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('marketing_contents');
    });
    
    it('should handle delete of published content', async () => {
      const contentId = 'content-123';
      
      // Get content first to check state
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: contentId, workflow_state: 'published' },
              error: null
            })
          })
        })
      });
      
      await expect(contentService.deleteContent(contentId))
        .rejects.toThrow('Cannot delete published content');
    });
    
    it('should cascade delete related data', async () => {
      const contentId = 'content-123';
      const options = { cascade: true };
      
      await contentService.deleteContent(contentId, options);
      
      // Should delete versions, metadata, etc.
      expect(mockSupabase.from).toHaveBeenCalledTimes(3); // content + versions + metadata
    });
  });
  
  describe('listContent', () => {
    it('should list all content with pagination', async () => {
      const mockContents = [
        { id: '1', title: 'Content 1' },
        { id: '2', title: 'Content 2' }
      ];
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockContents,
                error: null,
                count: 2
              })
            })
          })
        })
      });
      
      const result = await contentService.listContent({ page: 1, limit: 10 });
      
      expect(result.data).toEqual(mockContents);
      expect(result.total).toBe(2);
    });
    
    it('should filter by workflow state', async () => {
      const filters = { workflow_state: 'published' };
      
      await contentService.listContent(filters);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('workflow_state', 'published');
    });
    
    it('should search by title and description', async () => {
      const searchTerm = 'marketing';
      
      await contentService.listContent({ search: searchTerm });
      
      expect(mockSupabase.from().ilike).toHaveBeenCalled();
    });
    
    it('should sort by specified field', async () => {
      const options = { sortBy: 'created_at', sortOrder: 'desc' };
      
      await contentService.listContent(options);
      
      expect(mockSupabase.from().order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });
  
  describe('updateWorkflowState', () => {
    it('should transition from draft to review', async () => {
      const contentId = 'content-123';
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: contentId, workflow_state: 'draft' },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      const result = await contentService.updateWorkflowState(contentId, 'review');
      
      expect(result.workflow_state).toBe('review');
    });
    
    it('should validate state transition rules', async () => {
      const contentId = 'content-123';
      
      // Cannot go from draft directly to published
      await expect(contentService.updateWorkflowState(contentId, 'published'))
        .rejects.toThrow('Invalid state transition');
    });
    
    it('should record state transition history', async () => {
      const contentId = 'content-123';
      
      await contentService.updateWorkflowState(contentId, 'review');
      
      // Should create audit log entry
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_history');
    });
    
    it('should trigger notifications on state change', async () => {
      const contentId = 'content-123';
      
      await contentService.updateWorkflowState(contentId, 'review');
      
      // Should emit event for notification service
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Workflow state changed')
      );
    });
  });
  
  describe('publishContent', () => {
    it('should publish content immediately', async () => {
      const contentId = 'content-123';
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: contentId, workflow_state: 'approved' },
              error: null
            })
          })
        })
      });
      
      const result = await contentService.publishContent(contentId);
      
      expect(result.workflow_state).toBe('published');
      expect(result.published_at).toBeDefined();
    });
    
    it('should only publish approved content', async () => {
      const contentId = 'content-123';
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: contentId, workflow_state: 'draft' },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(contentService.publishContent(contentId))
        .rejects.toThrow('Content must be approved before publishing');
    });
    
    it('should update publish metadata', async () => {
      const contentId = 'content-123';
      const publishOptions = {
        channels: ['website', 'mobile'],
        publish_by: 'user-456'
      };
      
      const result = await contentService.publishContent(contentId, publishOptions);
      
      expect(result.publish_channels).toEqual(publishOptions.channels);
      expect(result.published_by).toBe(publishOptions.publish_by);
    });
  });
  
  describe('scheduleContent', () => {
    it('should schedule content for future publication', async () => {
      const contentId = 'content-123';
      const scheduleDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      
      const result = await contentService.scheduleContent(contentId, scheduleDate);
      
      expect(result.scheduled_publish_at).toBe(scheduleDate);
      expect(result.workflow_state).toBe('scheduled');
    });
    
    it('should validate schedule date is in future', async () => {
      const contentId = 'content-123';
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      
      await expect(contentService.scheduleContent(contentId, pastDate))
        .rejects.toThrow('Schedule date must be in the future');
    });
    
    it('should cancel existing schedule when rescheduling', async () => {
      const contentId = 'content-123';
      const newSchedule = new Date(Date.now() + 172800000).toISOString(); // 2 days
      
      // Content already has a schedule
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { 
                id: contentId, 
                scheduled_publish_at: new Date(Date.now() + 86400000).toISOString() 
              },
              error: null
            })
          })
        })
      });
      
      await contentService.scheduleContent(contentId, newSchedule);
      
      // Should cancel old schedule and create new one
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_jobs');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Network timeout'))
      });
      
      await expect(contentService.getContent('content-123'))
        .rejects.toThrow('Network timeout');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Network timeout')
      );
    });
    
    it('should retry transient failures', async () => {
      let attempts = 0;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Transient error'));
          }
          return Promise.resolve({ data: { id: 'content-123' }, error: null });
        })
      });
      
      const result = await contentService.getContent('content-123');
      
      expect(result).toBeDefined();
      expect(attempts).toBe(3);
    });
    
    it('should sanitize error messages for users', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('FATAL: database "xyz" does not exist'))
      });
      
      await expect(contentService.createContent({}))
        .rejects.toThrow('An error occurred while processing your request');
    });
  });
});