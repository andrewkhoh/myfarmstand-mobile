import { ExtendedMarketingOrchestrator } from '../orchestratorExtended';
import { ContentWorkflowStateMachine } from '../stateMachine';

describe('Content Workflow Integration Tests', () => {
  let orchestrator: ExtendedMarketingOrchestrator;

  beforeEach(() => {
    orchestrator = new ExtendedMarketingOrchestrator();
  });

  describe('Content Creation and Management', () => {
    it('should create content with all required fields', async () => {
      const content = await orchestrator.createContent({
        title: 'Complete Test Content',
        type: 'blog',
        workflowState: 'draft',
        content: 'Detailed content body',
        author: 'Test Author',
        tags: ['marketing', 'test'],
        metadata: {
          seoTitle: 'SEO Title',
          seoDescription: 'SEO Description',
          keywords: ['keyword1', 'keyword2']
        }
      });

      expect(content).toBeDefined();
      expect(content.title).toBe('Complete Test Content');
      expect(content.type).toBe('blog');
      expect(content.workflowState).toBe('draft');
    });

    it('should handle bulk content creation', async () => {
      const contents = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          orchestrator.createContent({
            title: `Bulk Content ${i}`,
            type: i % 2 === 0 ? 'blog' : 'email',
            workflowState: 'draft',
            content: `Bulk content body ${i}`
          })
        )
      );

      expect(contents).toHaveLength(10);
      expect(contents.filter(c => c.type === 'blog')).toHaveLength(5);
      expect(contents.filter(c => c.type === 'email')).toHaveLength(5);
    });

    it('should update content metadata', async () => {
      const content = await orchestrator.createContent({
        title: 'Metadata Test',
        type: 'blog',
        workflowState: 'draft',
        content: 'Test'
      });

      const updated = await orchestrator.updateContentMetadata(content.id, {
        lastModified: new Date(),
        version: 2,
        reviewComments: 'Needs revision'
      });

      expect(updated.metadata?.version).toBe(2);
      expect(updated.metadata?.reviewComments).toBe('Needs revision');
    });

    it('should validate content before state transitions', async () => {
      const content = await orchestrator.createContent({
        title: '', // Invalid - empty title
        type: 'blog',
        workflowState: 'draft',
        content: ''
      });

      await expect(
        orchestrator.transitionContent(content.id, 'review')
      ).rejects.toThrow('Content validation failed');
    });

    it('should support content versioning', async () => {
      const content = await orchestrator.createContent({
        title: 'Versioned Content',
        type: 'blog',
        workflowState: 'draft',
        content: 'Version 1',
        version: 1
      });

      const v2 = await orchestrator.createContentVersion(content.id, {
        content: 'Version 2',
        version: 2
      });

      expect(v2.version).toBe(2);
      expect(v2.content).toBe('Version 2');
    });
  });

  describe('Workflow State Transitions', () => {
    it('should track transition history', async () => {
      const content = await orchestrator.createContent({
        title: 'History Test',
        type: 'blog',
        workflowState: 'draft',
        content: 'Test'
      });

      await orchestrator.transitionContent(content.id, 'review');
      await orchestrator.transitionContent(content.id, 'approved');

      const history = await orchestrator.getTransitionHistory(content.id);
      expect(history).toHaveLength(2);
      expect(history[0].from).toBe('draft');
      expect(history[0].to).toBe('review');
      expect(history[1].from).toBe('review');
      expect(history[1].to).toBe('approved');
    });

    it('should enforce approval requirements', async () => {
      const content = await orchestrator.createContent({
        title: 'Approval Test',
        type: 'blog',
        workflowState: 'review',
        content: 'Test'
      });

      const result = await orchestrator.requestApproval(content.id, {
        reviewerId: 'reviewer-123',
        comments: 'Looks good',
        approved: true
      });

      expect(result.workflowState).toBe('approved');
    });

    it('should handle rejection workflow', async () => {
      const content = await orchestrator.createContent({
        title: 'Rejection Test',
        type: 'blog',
        workflowState: 'review',
        content: 'Test'
      });

      const result = await orchestrator.requestApproval(content.id, {
        reviewerId: 'reviewer-123',
        comments: 'Needs changes',
        approved: false
      });

      expect(result.workflowState).toBe('draft');
    });

    it('should support scheduled publishing', async () => {
      const content = await orchestrator.createContent({
        title: 'Scheduled Content',
        type: 'blog',
        workflowState: 'draft',
        content: 'Test'
      });

      await orchestrator.transitionContent(content.id, 'review');
      await orchestrator.transitionContent(content.id, 'approved');

      const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await orchestrator.schedulePublishing(content.id, scheduledDate);

      expect(result.scheduledPublishDate).toEqual(scheduledDate);
      expect(result.workflowState).toBe('approved'); // Still approved, not published yet
    });

    it('should handle emergency unpublishing', async () => {
      const content = await orchestrator.createContent({
        title: 'Emergency Content',
        type: 'blog',
        workflowState: 'draft',
        content: 'Test'
      });

      await orchestrator.transitionContent(content.id, 'review');
      await orchestrator.transitionContent(content.id, 'approved');
      await orchestrator.transitionContent(content.id, 'published');

      const result = await orchestrator.emergencyUnpublish(content.id, 'Legal issue');
      expect(result.workflowState).toBe('archived');
      expect(result.metadata?.unpublishReason).toBe('Legal issue');
    });
  });

  describe('Content Templates', () => {
    it('should create content from template', async () => {
      const template = await orchestrator.createContentTemplate({
        name: 'Blog Template',
        type: 'blog',
        defaultContent: 'Template content',
        defaultMetadata: {
          category: 'marketing'
        }
      });

      const content = await orchestrator.createContentFromTemplate(template.id, {
        title: 'New Blog Post'
      });

      expect(content.content).toBe('Template content');
      expect(content.metadata?.category).toBe('marketing');
    });

    it('should manage template library', async () => {
      const templates = await Promise.all(
        ['Blog', 'Email', 'Landing Page'].map(name =>
          orchestrator.createContentTemplate({
            name: `${name} Template`,
            type: name.toLowerCase().replace(' ', '-')
          })
        )
      );

      const library = await orchestrator.getTemplateLibrary();
      expect(library).toHaveLength(3);
    });
  });

  describe('Content Analytics', () => {
    it('should track content performance metrics', async () => {
      const content = await orchestrator.createContent({
        title: 'Analytics Test',
        type: 'blog',
        workflowState: 'draft',
        content: 'Test'
      });

      await orchestrator.transitionContent(content.id, 'review');
      await orchestrator.transitionContent(content.id, 'approved');
      await orchestrator.transitionContent(content.id, 'published');

      const metrics = await orchestrator.getContentMetrics(content.id);
      expect(metrics).toBeDefined();
      expect(metrics.views).toBe(0);
      expect(metrics.engagement).toBe(0);
    });

    it('should generate content reports', async () => {
      const contents = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          orchestrator.createContent({
            title: `Report Content ${i}`,
            type: 'blog',
            workflowState: 'draft',
            content: 'Test'
          })
        )
      );

      const report = await orchestrator.generateContentReport({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        contentIds: contents.map(c => c.id)
      });

      expect(report.totalContent).toBe(5);
      expect(report.contentByState.draft).toBe(5);
    });
  });
});