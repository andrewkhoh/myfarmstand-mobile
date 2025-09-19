import { ContentWorkflowService, TransitionOptions } from '../contentWorkflow.service';
import { ProductContent, WorkflowState } from '@/schemas/marketing';
import { ServiceError, NotFoundError, ValidationError } from '../errors/ServiceError';
import { v4 as uuidv4 } from 'uuid';

describe('ContentWorkflowService', () => {
  let service: ContentWorkflowService;
  
  beforeEach(() => {
    service = new ContentWorkflowService();
  });

  afterEach(() => {
    service.clearMockData();
  });

  const createMockContent = (overrides: Partial<ProductContent> = {}): Partial<ProductContent> => ({
    productId: uuidv4(),
    title: 'Test Product',
    description: 'Test Description',
    workflowState: 'draft',
    features: [],
    specifications: {},
    images: [],
    seoKeywords: [],
    history: [],
    publishedAt: null,
    version: 1,
    ...overrides
  });

  describe('createContent', () => {
    it('should create new content with draft state', async () => {
      const contentData = createMockContent();
      const result = await service.createContent(contentData);
      
      expect(result).toMatchObject({
        title: 'Test Product',
        description: 'Test Description',
        workflowState: 'draft',
        publishedAt: null
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate required fields', async () => {
      const invalidData = { title: '' };
      
      await expect(service.createContent(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should set default values for optional fields', async () => {
      const minimalData = {
        productId: uuidv4(),
        title: 'Minimal Product',
        description: 'Minimal Description',
        workflowState: 'draft' as WorkflowState
      };
      
      const result = await service.createContent(minimalData);
      
      expect(result.features).toEqual([]);
      expect(result.specifications).toEqual({});
      expect(result.images).toEqual([]);
      expect(result.history).toEqual([]);
    });
  });

  describe('getContent', () => {
    it('should retrieve existing content', async () => {
      const created = await service.createContent(createMockContent());
      const retrieved = await service.getContent(created.id);
      
      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundError for non-existent content', async () => {
      await expect(service.getContent('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateContent', () => {
    it('should update existing content', async () => {
      const created = await service.createContent(createMockContent());
      const updates = { title: 'Updated Title' };
      
      const updated = await service.updateContent(created.id, updates);
      
      expect(updated.title).toBe('Updated Title');
      expect(updated.updatedAt).not.toEqual(created.updatedAt);
    });

    it('should preserve non-updated fields', async () => {
      const created = await service.createContent(createMockContent());
      const updates = { title: 'Updated Title' };
      
      const updated = await service.updateContent(created.id, updates);
      
      expect(updated.description).toBe(created.description);
      expect(updated.workflowState).toBe(created.workflowState);
    });
  });

  describe('state transitions', () => {
    it('should transition from draft to review with validation', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'draft' }));
      
      const result = await service.transitionTo(content.id, 'review');
      
      expect(result.workflowState).toBe('review');
      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toMatchObject({
        from: 'draft',
        to: 'review'
      });
    });

    it('should reject invalid state transitions', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'published' }));
      
      await expect(
        service.transitionTo(content.id, 'review')
      ).rejects.toThrow(ServiceError);
    });

    it('should enforce role-based transition permissions', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'review' }));
      const user: User = { id: uuidv4(), role: 'viewer' };
      
      await expect(
        service.transitionTo(content.id, 'approved', { user })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to transition to any state', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'review' }));
      const admin: User = { id: uuidv4(), role: 'admin' };
      
      const result = await service.transitionTo(content.id, 'approved', { user: admin });
      
      expect(result.workflowState).toBe('approved');
    });

    it('should set publishedAt when transitioning to published', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'approved' }));
      
      const result = await service.transitionTo(content.id, 'published');
      
      expect(result.workflowState).toBe('published');
      expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it('should track transition history with user info', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'draft' }));
      const userId = uuidv4();
      const user: User = { id: userId, role: 'editor' };
      
      const result = await service.transitionTo(content.id, 'review', { user });
      
      expect(result.history[0]).toMatchObject({
        from: 'draft',
        to: 'review',
        userId: userId
      });
    });

    it('should handle transition with comment', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'draft' }));
      const options: TransitionOptions = {
        user: { id: uuidv4(), role: 'editor' },
        comment: 'Ready for review'
      };
      
      const result = await service.transitionTo(content.id, 'review', options);
      
      expect(result.workflowState).toBe('review');
    });
  });

  describe('bulkTransition', () => {
    it('should transition multiple contents', async () => {
      const content1 = await service.createContent(createMockContent({ workflowState: 'draft' }));
      const content2 = await service.createContent(createMockContent({ workflowState: 'draft' }));
      
      const results = await service.bulkTransition([content1.id, content2.id], 'review');
      
      expect(results).toHaveLength(2);
      expect(results[0].workflowState).toBe('review');
      expect(results[1].workflowState).toBe('review');
    });

    it('should handle partial failures gracefully', async () => {
      const validContent = await service.createContent(createMockContent({ workflowState: 'draft' }));
      const invalidContent = await service.createContent(createMockContent({ workflowState: 'published' }));
      
      const results = await service.bulkTransition(
        [validContent.id, invalidContent.id, 'non-existent-id'],
        'review'
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(validContent.id);
      expect(results[0].workflowState).toBe('review');
    });

    it('should apply user permissions to bulk transitions', async () => {
      const content1 = await service.createContent(createMockContent({ workflowState: 'review' }));
      const content2 = await service.createContent(createMockContent({ workflowState: 'review' }));
      const viewer: User = { id: uuidv4(), role: 'viewer' };
      
      const results = await service.bulkTransition(
        [content1.id, content2.id],
        'approved',
        { user: viewer }
      );
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getContentByState', () => {
    it('should filter content by workflow state', async () => {
      await service.createContent(createMockContent({ workflowState: 'draft' }));
      await service.createContent(createMockContent({ workflowState: 'review' }));
      await service.createContent(createMockContent({ workflowState: 'review' }));
      
      const reviewContent = await service.getContentByState('review');
      
      expect(reviewContent).toHaveLength(2);
      expect(reviewContent.every(c => c.workflowState === 'review')).toBe(true);
    });

    it('should return empty array for state with no content', async () => {
      const publishedContent = await service.getContentByState('published');
      
      expect(publishedContent).toEqual([]);
    });
  });

  describe('getContentHistory', () => {
    it('should return transition history', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'draft' }));
      await service.transitionTo(content.id, 'review');
      
      const history = await service.getContentHistory(content.id);
      
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        from: 'draft',
        to: 'review'
      });
    });

    it('should return empty history for new content', async () => {
      const content = await service.createContent(createMockContent());
      
      const history = await service.getContentHistory(content.id);
      
      expect(history).toEqual([]);
    });

    it('should preserve full history through multiple transitions', async () => {
      const content = await service.createContent(createMockContent({ workflowState: 'draft' }));
      await service.transitionTo(content.id, 'review');
      await service.transitionTo(content.id, 'approved');
      await service.transitionTo(content.id, 'published');
      
      const history = await service.getContentHistory(content.id);
      
      expect(history).toHaveLength(3);
      expect(history.map(h => h.to)).toEqual(['review', 'approved', 'published']);
    });
  });
});