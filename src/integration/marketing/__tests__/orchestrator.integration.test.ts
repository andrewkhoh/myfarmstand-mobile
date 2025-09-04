import { MarketingIntegrationOrchestrator } from '../orchestrator';
import { ContentWorkflowStateMachine } from '../stateMachine';

describe('Marketing Integration Orchestrator', () => {
  let orchestrator: MarketingIntegrationOrchestrator;
  
  beforeEach(() => {
    orchestrator = new MarketingIntegrationOrchestrator();
  });

  describe('Content Workflow Integration', () => {
    it('should create and transition content through workflow', async () => {
      const content = await orchestrator.createContent({
        title: 'Test Content',
        type: 'blog',
        workflowState: 'draft',
        content: 'Test content body'
      });

      expect(content.workflowState).toBe('draft');
      
      const reviewed = await orchestrator.transitionContent(content.id, 'review');
      expect(reviewed.workflowState).toBe('review');
      
      const approved = await orchestrator.transitionContent(content.id, 'approved');
      expect(approved.workflowState).toBe('approved');
    });

    it('should handle invalid workflow transitions', async () => {
      const content = await orchestrator.createContent({
        title: 'Test Content',
        type: 'blog',
        workflowState: 'draft',
        content: 'Test content body'
      });

      await expect(
        orchestrator.transitionContent(content.id, 'published')
      ).rejects.toThrow();
    });

    it('should batch publish multiple content items', async () => {
      const contents = await Promise.all([
        orchestrator.createContent({
          title: 'Content 1',
          type: 'blog',
          workflowState: 'draft',
          content: 'Content 1 body'
        }),
        orchestrator.createContent({
          title: 'Content 2',
          type: 'email',
          workflowState: 'draft',
          content: 'Content 2 body'
        })
      ]);

      for (const content of contents) {
        await orchestrator.transitionContent(content.id, 'review');
        await orchestrator.transitionContent(content.id, 'approved');
      }

      const campaign = await orchestrator.createCampaign({
        name: 'Test Campaign',
        contentIds: contents.map(c => c.id)
      });

      const result = await orchestrator.launchCampaign(campaign.id);
      
      expect(result.success).toBe(true);
      expect(result.publishedContent).toHaveLength(2);
      expect(result.publishedContent?.every(c => c.workflowState === 'published')).toBe(true);
    });
  });

  describe('Campaign Launch Integration', () => {
    it('should successfully launch campaign with approved content', async () => {
      const content = await orchestrator.createContent({
        title: 'Campaign Content',
        type: 'blog',
        workflowState: 'draft',
        content: 'Campaign content'
      });

      await orchestrator.transitionContent(content.id, 'review');
      await orchestrator.transitionContent(content.id, 'approved');

      const campaign = await orchestrator.createCampaign({
        name: 'Launch Test Campaign',
        contentIds: [content.id]
      });

      const result = await orchestrator.launchCampaign(campaign.id);
      
      expect(result.success).toBe(true);
      expect(result.campaign?.status).toBe('active');
      expect(result.publishedContent).toHaveLength(1);
    });

    it('should fail to launch campaign with unapproved content', async () => {
      const content = await orchestrator.createContent({
        title: 'Draft Content',
        type: 'blog',
        workflowState: 'draft',
        content: 'Draft content'
      });

      const campaign = await orchestrator.createCampaign({
        name: 'Invalid Launch Campaign',
        contentIds: [content.id]
      });

      const result = await orchestrator.launchCampaignWithContent({
        campaignId: campaign.id,
        contentIds: [content.id]
      });
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('not approved');
    });

    it('should launch campaign with bundles', async () => {
      const content = await orchestrator.createContent({
        title: 'Bundle Campaign Content',
        type: 'email',
        workflowState: 'draft',
        content: 'Bundle promotion'
      });

      await orchestrator.transitionContent(content.id, 'review');
      await orchestrator.transitionContent(content.id, 'approved');

      const campaign = await orchestrator.createCampaign({
        name: 'Bundle Campaign',
        contentIds: [content.id]
      });

      const result = await orchestrator.launchCampaignWithContent({
        campaignId: campaign.id,
        contentIds: [content.id],
        bundleIds: ['bundle-1', 'bundle-2']
      });
      
      expect(result.success).toBe(true);
      expect(result.bundlesApplied).toBe(2);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete marketing workflow from content creation to campaign launch', async () => {
      const contents = await Promise.all(
        ['Product Launch', 'Feature Update', 'Customer Story'].map(title =>
          orchestrator.createContent({
            title,
            type: 'blog',
            workflowState: 'draft',
            content: `${title} content`
          })
        )
      );

      for (const content of contents) {
        await orchestrator.transitionContent(content.id, 'review');
        await orchestrator.transitionContent(content.id, 'approved');
      }

      const campaign = await orchestrator.createCampaign({
        name: 'Q1 Marketing Campaign',
        description: 'Complete marketing campaign for Q1',
        contentIds: contents.map(c => c.id),
        budget: { total: 50000, spent: 0, currency: 'USD' }
      });

      const launchResult = await orchestrator.launchCampaign(campaign.id);
      
      expect(launchResult.success).toBe(true);
      expect(launchResult.campaign?.status).toBe('active');
      expect(launchResult.publishedContent).toHaveLength(3);
      expect(launchResult.publishedContent?.every(c => c.workflowState === 'published')).toBe(true);
    });

    it('should handle partial content approval scenarios', async () => {
      const contents = await Promise.all([
        orchestrator.createContent({
          title: 'Approved Content',
          type: 'blog',
          workflowState: 'draft',
          content: 'Approved content'
        }),
        orchestrator.createContent({
          title: 'Draft Content',
          type: 'email',
          workflowState: 'draft',
          content: 'Draft content'
        })
      ]);

      await orchestrator.transitionContent(contents[0].id, 'review');
      await orchestrator.transitionContent(contents[0].id, 'approved');

      const campaign = await orchestrator.createCampaign({
        name: 'Mixed Content Campaign',
        contentIds: contents.map(c => c.id)
      });

      const result = await orchestrator.launchCampaignWithContent({
        campaignId: campaign.id,
        contentIds: contents.map(c => c.id)
      });
      
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('not approved');
    });
  });

  describe('State Machine Integration', () => {
    it('should validate state transitions using state machine', () => {
      const stateMachine = new ContentWorkflowStateMachine('draft');
      
      expect(stateMachine.canTransition('review')).toBe(true);
      expect(stateMachine.canTransition('published')).toBe(false);
      
      stateMachine.transition('review');
      expect(stateMachine.getCurrentState()).toBe('review');
      
      expect(stateMachine.canTransition('approved')).toBe(true);
      expect(stateMachine.canTransition('published')).toBe(false);
    });

    it('should get available transitions for current state', () => {
      const stateMachine = new ContentWorkflowStateMachine('review');
      const available = stateMachine.getAvailableTransitions();
      
      expect(available).toContain('approved');
      expect(available).toContain('draft');
      expect(available).toContain('archived');
      expect(available).not.toContain('published');
    });

    it('should reset state machine to initial state', async () => {
      const stateMachine = new ContentWorkflowStateMachine('draft');
      
      await stateMachine.transition('review');
      await stateMachine.transition('approved');
      expect(stateMachine.getCurrentState()).toBe('approved');
      
      stateMachine.reset();
      expect(stateMachine.getCurrentState()).toBe('draft');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing content gracefully', async () => {
      const result = await orchestrator.launchCampaignWithContent({
        campaignId: 'non-existent',
        contentIds: ['missing-content']
      });
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle campaign activation errors', async () => {
      const campaign = await orchestrator.createCampaign({
        name: 'Error Test Campaign',
        status: 'completed'
      });

      const result = await orchestrator.launchCampaign(campaign.id);
      
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Cannot activate');
    });

    it('should rollback on transaction failure', async () => {
      const content = await orchestrator.createContent({
        title: 'Rollback Test',
        type: 'blog',
        workflowState: 'draft',
        content: 'Test'
      });

      await orchestrator.transitionContent(content.id, 'review');
      await orchestrator.transitionContent(content.id, 'approved');

      const invalidContentId = 'a0000000-0000-4000-8000-999999999999';
      const campaign = await orchestrator.createCampaign({
        name: 'Rollback Campaign',
        contentIds: [content.id, invalidContentId]
      });

      const result = await orchestrator.launchCampaignWithContent({
        campaignId: campaign.id,
        contentIds: [content.id, invalidContentId]
      });
      
      expect(result.success).toBe(false);
    });
  });
});