import { describe, it, expect } from '@jest/globals';
// @ts-expect-error - Schema not implemented yet (RED phase)
import { contentWorkflowSchema } from '../contentWorkflow';

describe('ContentWorkflow Schema', () => {
  describe('Validation', () => {
    it('should validate complete content workflow', () => {
      const valid = {
        id: 'workflow-550e8400-e29b-41d4-a716-446655440000',
        content_id: 'content-123e4567-e89b-12d3-a456-426614174000',
        content_type: 'product_content',
        current_state: 'review',
        previous_state: 'draft',
        assigned_to: 'reviewer_user1',
        assigned_by: 'creator_user1',
        priority: 'high',
        due_date: '2024-06-15T17:00:00Z',
        comments: [
          {
            id: 'comment-001',
            user_id: 'creator_user1',
            message: 'Please review the updated product descriptions',
            created_at: '2024-06-01T10:00:00Z'
          },
          {
            id: 'comment-002',
            user_id: 'reviewer_user1',
            message: 'Reviewing now, will provide feedback shortly',
            created_at: '2024-06-01T11:30:00Z'
          }
        ],
        history: [
          {
            state: 'draft',
            changed_by: 'creator_user1',
            changed_at: '2024-05-30T09:00:00Z',
            reason: 'Initial content creation'
          },
          {
            state: 'review',
            changed_by: 'creator_user1',
            changed_at: '2024-06-01T10:00:00Z',
            reason: 'Ready for review'
          }
        ],
        metadata: {
          review_checklist: ['spelling', 'grammar', 'brand_voice', 'seo_optimization'],
          approval_required_from: ['marketing_lead', 'content_manager'],
          auto_publish: false,
          version: 2
        },
        created_by: 'creator_user1',
        updated_by: 'reviewer_user1',
        created_at: '2024-05-30T09:00:00Z',
        updated_at: '2024-06-01T11:30:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing required field: id', () => {
      const invalid = {
        content_id: 'content-123',
        content_type: 'product_content',
        current_state: 'draft',
        assigned_to: 'user1',
        assigned_by: 'user2',
        priority: 'medium',
        comments: [],
        history: [],
        metadata: {},
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-06-01T10:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid workflow state', () => {
      const invalid = {
        id: 'workflow-123',
        content_id: 'content-123',
        content_type: 'product_content',
        current_state: 'invalid_state',
        assigned_to: 'user1',
        assigned_by: 'user2',
        priority: 'medium',
        comments: [],
        history: [],
        metadata: {},
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-06-01T10:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept all valid workflow states', () => {
      const states = ['draft', 'review', 'approved', 'published', 'archived', 'rejected'];
      
      states.forEach(state => {
        const data = {
          id: 'workflow-123',
          content_id: 'content-456',
          content_type: 'product_content',
          current_state: state,
          assigned_to: 'user1',
          assigned_by: 'user2',
          priority: 'medium',
          comments: [],
          history: [
            {
              state: state,
              changed_by: 'user2',
              changed_at: '2024-06-01T10:00:00Z',
              reason: 'State change test'
            }
          ],
          metadata: {},
          created_by: 'user1',
          updated_by: 'user2',
          created_at: '2024-06-01T10:00:00Z',
          updated_at: '2024-06-01T10:00:00Z'
        };
        
        const result = contentWorkflowSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid priority level', () => {
      const invalid = {
        id: 'workflow-123',
        content_id: 'content-123',
        content_type: 'product_content',
        current_state: 'draft',
        assigned_to: 'user1',
        assigned_by: 'user2',
        priority: 'invalid_priority',
        comments: [],
        history: [],
        metadata: {},
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-06-01T10:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept all valid priority levels', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      
      priorities.forEach(priority => {
        const data = {
          id: 'workflow-123',
          content_id: 'content-456',
          content_type: 'marketing_campaign',
          current_state: 'review',
          assigned_to: 'user1',
          assigned_by: 'user2',
          priority: priority,
          due_date: '2024-06-15T17:00:00Z',
          comments: [],
          history: [],
          metadata: {},
          created_by: 'user1',
          updated_by: 'user1',
          created_at: '2024-06-01T10:00:00Z',
          updated_at: '2024-06-01T10:00:00Z'
        };
        
        const result = contentWorkflowSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('State Transitions', () => {
    it('should validate transition from draft to review', () => {
      const workflow = {
        id: 'workflow-001',
        content_id: 'content-001',
        content_type: 'product_content',
        current_state: 'review',
        previous_state: 'draft',
        assigned_to: 'reviewer1',
        assigned_by: 'creator1',
        priority: 'medium',
        comments: [],
        history: [
          {
            state: 'draft',
            changed_by: 'creator1',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Initial creation'
          },
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-06-01T10:00:00Z',
            reason: 'Submitted for review'
          }
        ],
        metadata: {},
        created_by: 'creator1',
        updated_by: 'creator1',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
    });

    it('should validate transition from review to approved', () => {
      const workflow = {
        id: 'workflow-002',
        content_id: 'content-002',
        content_type: 'marketing_campaign',
        current_state: 'approved',
        previous_state: 'review',
        assigned_to: 'publisher1',
        assigned_by: 'approver1',
        priority: 'high',
        comments: [
          {
            id: 'comment-001',
            user_id: 'approver1',
            message: 'Content approved, ready for publishing',
            created_at: '2024-06-02T14:00:00Z'
          }
        ],
        history: [
          {
            state: 'draft',
            changed_by: 'creator1',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Initial creation'
          },
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-06-01T10:00:00Z',
            reason: 'Submitted for review'
          },
          {
            state: 'approved',
            changed_by: 'approver1',
            changed_at: '2024-06-02T14:00:00Z',
            reason: 'Content meets all requirements'
          }
        ],
        metadata: {
          approved_by: ['marketing_lead', 'content_manager'],
          approval_date: '2024-06-02T14:00:00Z'
        },
        created_by: 'creator1',
        updated_by: 'approver1',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-02T14:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
    });

    it('should validate transition from review to rejected', () => {
      const workflow = {
        id: 'workflow-003',
        content_id: 'content-003',
        content_type: 'product_bundle',
        current_state: 'rejected',
        previous_state: 'review',
        assigned_to: 'creator1',
        assigned_by: 'reviewer1',
        priority: 'low',
        comments: [
          {
            id: 'comment-001',
            user_id: 'reviewer1',
            message: 'Content needs major revisions',
            created_at: '2024-06-02T11:00:00Z'
          }
        ],
        history: [
          {
            state: 'draft',
            changed_by: 'creator1',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Initial creation'
          },
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-06-01T15:00:00Z',
            reason: 'Submitted for review'
          },
          {
            state: 'rejected',
            changed_by: 'reviewer1',
            changed_at: '2024-06-02T11:00:00Z',
            reason: 'Does not meet brand guidelines'
          }
        ],
        metadata: {
          rejection_reasons: ['brand_voice', 'factual_errors', 'formatting'],
          requires_rework: true
        },
        created_by: 'creator1',
        updated_by: 'reviewer1',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-02T11:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
    });

    it('should validate transition from approved to published', () => {
      const workflow = {
        id: 'workflow-004',
        content_id: 'content-004',
        content_type: 'product_content',
        current_state: 'published',
        previous_state: 'approved',
        assigned_to: null,
        assigned_by: 'publisher1',
        priority: 'medium',
        comments: [
          {
            id: 'comment-001',
            user_id: 'publisher1',
            message: 'Content published successfully',
            created_at: '2024-06-03T08:00:00Z'
          }
        ],
        history: [
          {
            state: 'draft',
            changed_by: 'creator1',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Initial creation'
          },
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-06-01T10:00:00Z',
            reason: 'Submitted for review'
          },
          {
            state: 'approved',
            changed_by: 'approver1',
            changed_at: '2024-06-02T14:00:00Z',
            reason: 'Content approved'
          },
          {
            state: 'published',
            changed_by: 'publisher1',
            changed_at: '2024-06-03T08:00:00Z',
            reason: 'Published to production'
          }
        ],
        metadata: {
          published_url: 'https://example.com/products/123',
          publish_date: '2024-06-03T08:00:00Z',
          auto_archive_date: '2024-12-31T23:59:59Z'
        },
        created_by: 'creator1',
        updated_by: 'publisher1',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-03T08:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
    });
  });

  describe('Comments and History', () => {
    it('should validate workflow with multiple comments', () => {
      const workflow = {
        id: 'workflow-comments',
        content_id: 'content-123',
        content_type: 'marketing_campaign',
        current_state: 'review',
        assigned_to: 'reviewer1',
        assigned_by: 'creator1',
        priority: 'high',
        due_date: '2024-06-10T17:00:00Z',
        comments: [
          {
            id: 'comment-001',
            user_id: 'creator1',
            message: 'Please prioritize this review',
            created_at: '2024-06-01T10:00:00Z'
          },
          {
            id: 'comment-002',
            user_id: 'reviewer1',
            message: 'Working on it now',
            created_at: '2024-06-01T11:00:00Z'
          },
          {
            id: 'comment-003',
            user_id: 'reviewer1',
            message: 'Found some issues with the targeting parameters',
            created_at: '2024-06-01T14:00:00Z',
            attachments: ['review-notes.pdf']
          },
          {
            id: 'comment-004',
            user_id: 'creator1',
            message: 'Fixed the issues, please re-review',
            created_at: '2024-06-01T16:00:00Z'
          }
        ],
        history: [
          {
            state: 'draft',
            changed_by: 'creator1',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Initial draft'
          },
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-06-01T10:00:00Z',
            reason: 'Ready for review'
          }
        ],
        metadata: {},
        created_by: 'creator1',
        updated_by: 'creator1',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-01T16:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.comments.length).toBe(4);
      }
    });

    it('should validate comprehensive workflow history', () => {
      const workflow = {
        id: 'workflow-history',
        content_id: 'content-456',
        content_type: 'product_bundle',
        current_state: 'published',
        assigned_to: null,
        assigned_by: 'publisher1',
        priority: 'low',
        comments: [],
        history: [
          {
            state: 'draft',
            changed_by: 'creator1',
            changed_at: '2024-05-20T09:00:00Z',
            reason: 'Initial bundle creation'
          },
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-05-21T10:00:00Z',
            reason: 'Submitted for initial review'
          },
          {
            state: 'rejected',
            changed_by: 'reviewer1',
            changed_at: '2024-05-22T11:00:00Z',
            reason: 'Pricing strategy needs adjustment'
          },
          {
            state: 'draft',
            changed_by: 'creator1',
            changed_at: '2024-05-22T14:00:00Z',
            reason: 'Back to draft for revisions'
          },
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-05-23T09:00:00Z',
            reason: 'Resubmitted with updated pricing'
          },
          {
            state: 'approved',
            changed_by: 'approver1',
            changed_at: '2024-05-24T15:00:00Z',
            reason: 'All requirements met'
          },
          {
            state: 'published',
            changed_by: 'publisher1',
            changed_at: '2024-05-25T08:00:00Z',
            reason: 'Published to live site'
          }
        ],
        metadata: {
          revision_count: 2,
          total_review_time_hours: 48
        },
        created_by: 'creator1',
        updated_by: 'publisher1',
        created_at: '2024-05-20T09:00:00Z',
        updated_at: '2024-05-25T08:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.history.length).toBe(7);
      }
    });
  });

  describe('Transformations', () => {
    it('should transform date strings to Date objects', () => {
      const data = {
        id: 'workflow-123',
        content_id: 'content-123',
        content_type: 'product_content',
        current_state: 'draft',
        assigned_to: 'user1',
        assigned_by: 'user2',
        priority: 'medium',
        due_date: '2024-06-15T17:00:00Z',
        comments: [
          {
            id: 'comment-1',
            user_id: 'user1',
            message: 'Test comment',
            created_at: '2024-06-01T10:00:00Z'
          }
        ],
        history: [
          {
            state: 'draft',
            changed_by: 'user2',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Created'
          }
        ],
        metadata: {},
        created_by: 'user2',
        updated_by: 'user2',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.due_date).toBeInstanceOf(Date);
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
        expect(result.data.comments[0].created_at).toBeInstanceOf(Date);
        expect(result.data.history[0].changed_at).toBeInstanceOf(Date);
      }
    });

    it('should normalize and trim string fields', () => {
      const data = {
        id: '  workflow-123  ',
        content_id: '  content-123  ',
        content_type: 'product_content',
        current_state: 'draft',
        assigned_to: '  user1  ',
        assigned_by: '  user2  ',
        priority: 'medium',
        comments: [
          {
            id: '  comment-1  ',
            user_id: '  user1  ',
            message: '  Test comment  ',
            created_at: '2024-06-01T10:00:00Z'
          }
        ],
        history: [
          {
            state: 'draft',
            changed_by: '  user2  ',
            changed_at: '2024-06-01T09:00:00Z',
            reason: '  Initial creation  '
          }
        ],
        metadata: {},
        created_by: '  user2  ',
        updated_by: '  user2  ',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('workflow-123');
        expect(result.data.content_id).toBe('content-123');
        expect(result.data.assigned_to).toBe('user1');
        expect(result.data.assigned_by).toBe('user2');
        expect(result.data.created_by).toBe('user2');
        expect(result.data.updated_by).toBe('user2');
        expect(result.data.comments[0].id).toBe('comment-1');
        expect(result.data.comments[0].user_id).toBe('user1');
        expect(result.data.comments[0].message).toBe('Test comment');
        expect(result.data.history[0].changed_by).toBe('user2');
        expect(result.data.history[0].reason).toBe('Initial creation');
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface for complete workflow', () => {
      const data = {
        id: 'workflow-complete',
        content_id: 'content-complete',
        content_type: 'marketing_campaign',
        current_state: 'approved',
        previous_state: 'review',
        assigned_to: 'publisher1',
        assigned_by: 'approver1',
        priority: 'urgent',
        due_date: '2024-06-05T17:00:00Z',
        comments: [
          {
            id: 'comment-1',
            user_id: 'reviewer1',
            message: 'Approved with minor changes',
            created_at: '2024-06-03T14:00:00Z'
          }
        ],
        history: [
          {
            state: 'draft',
            changed_by: 'creator1',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Initial creation'
          },
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-06-02T10:00:00Z',
            reason: 'Ready for review'
          },
          {
            state: 'approved',
            changed_by: 'approver1',
            changed_at: '2024-06-03T14:00:00Z',
            reason: 'Content approved'
          }
        ],
        metadata: {
          campaign_id: 'camp-123',
          target_publish_date: '2024-06-05T09:00:00Z'
        },
        created_by: 'creator1',
        updated_by: 'approver1',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-03T14:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(data);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(typeof result.data.id).toBe('string');
        expect(typeof result.data.content_id).toBe('string');
        expect(typeof result.data.content_type).toBe('string');
        expect(typeof result.data.current_state).toBe('string');
        expect(typeof result.data.previous_state).toBe('string');
        expect(typeof result.data.assigned_to).toBe('string');
        expect(typeof result.data.assigned_by).toBe('string');
        expect(typeof result.data.priority).toBe('string');
        expect(result.data.due_date).toBeInstanceOf(Date);
        expect(Array.isArray(result.data.comments)).toBe(true);
        expect(Array.isArray(result.data.history)).toBe(true);
        expect(typeof result.data.metadata).toBe('object');
        expect(typeof result.data.created_by).toBe('string');
        expect(typeof result.data.updated_by).toBe('string');
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow with no comments', () => {
      const data = {
        id: 'workflow-no-comments',
        content_id: 'content-123',
        content_type: 'product_content',
        current_state: 'draft',
        assigned_to: 'user1',
        assigned_by: 'user2',
        priority: 'low',
        comments: [],
        history: [
          {
            state: 'draft',
            changed_by: 'user2',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Created'
          }
        ],
        metadata: {},
        created_by: 'user2',
        updated_by: 'user2',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-01T09:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.comments).toEqual([]);
      }
    });

    it('should handle workflow with null assigned_to (unassigned)', () => {
      const data = {
        id: 'workflow-unassigned',
        content_id: 'content-456',
        content_type: 'product_bundle',
        current_state: 'published',
        previous_state: 'approved',
        assigned_to: null,
        assigned_by: 'publisher1',
        priority: 'medium',
        comments: [],
        history: [
          {
            state: 'published',
            changed_by: 'publisher1',
            changed_at: '2024-06-01T09:00:00Z',
            reason: 'Published'
          }
        ],
        metadata: {},
        created_by: 'creator1',
        updated_by: 'publisher1',
        created_at: '2024-05-30T09:00:00Z',
        updated_at: '2024-06-01T09:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigned_to).toBeNull();
      }
    });

    it('should handle workflow with empty metadata', () => {
      const data = {
        id: 'workflow-no-metadata',
        content_id: 'content-789',
        content_type: 'marketing_campaign',
        current_state: 'review',
        assigned_to: 'reviewer1',
        assigned_by: 'creator1',
        priority: 'high',
        comments: [],
        history: [
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2024-06-01T10:00:00Z',
            reason: 'For review'
          }
        ],
        metadata: {},
        created_by: 'creator1',
        updated_by: 'creator1',
        created_at: '2024-06-01T09:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toEqual({});
      }
    });

    it('should handle workflow with maximum history entries', () => {
      const history = Array.from({ length: 50 }, (_, i) => ({
        state: i % 2 === 0 ? 'draft' : 'review',
        changed_by: `user${i % 3 + 1}`,
        changed_at: `2024-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        reason: `Change ${i + 1}`
      }));
      
      const data = {
        id: 'workflow-max-history',
        content_id: 'content-max',
        content_type: 'product_content',
        current_state: 'draft',
        assigned_to: 'user1',
        assigned_by: 'user2',
        priority: 'low',
        comments: [],
        history: history,
        metadata: { revision_count: 50 },
        created_by: 'user1',
        updated_by: 'user2',
        created_at: '2024-05-01T09:00:00Z',
        updated_at: '2024-06-30T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.history.length).toBe(50);
      }
    });

    it('should handle workflow with past due date', () => {
      const data = {
        id: 'workflow-overdue',
        content_id: 'content-overdue',
        content_type: 'marketing_campaign',
        current_state: 'review',
        assigned_to: 'reviewer1',
        assigned_by: 'creator1',
        priority: 'urgent',
        due_date: '2024-01-01T17:00:00Z', // Past date
        comments: [
          {
            id: 'comment-1',
            user_id: 'manager1',
            message: 'This is overdue, please prioritize',
            created_at: '2024-06-01T10:00:00Z'
          }
        ],
        history: [
          {
            state: 'review',
            changed_by: 'creator1',
            changed_at: '2023-12-15T10:00:00Z',
            reason: 'Submitted for review'
          }
        ],
        metadata: {
          overdue_days: 152,
          escalated: true
        },
        created_by: 'creator1',
        updated_by: 'manager1',
        created_at: '2023-12-15T09:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});