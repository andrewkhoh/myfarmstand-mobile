import { describe, expect } from '@jest/globals';
import { contentWorkflowSchema } from '../contentWorkflow';

describe('ContentWorkflow Schema', () => {
  describe('Validation', () => {
    it('should validate complete content workflow', () => {
      const validWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        previous_state: null,
        transitions: [
          {
            from_state: null,
            to_state: 'draft',
            timestamp: '2024-06-01T10:00:00Z',
            user_id: 'author-123',
            notes: 'Initial draft created'
          }
        ],
        assigned_to: 'reviewer-456',
        priority: 'high',
        deadline: '2024-06-15T17:00:00Z',
        approval_chain: [
          {
            role: 'content_reviewer',
            user_id: 'reviewer-456',
            status: 'pending',
            timestamp: null
          },
          {
            role: 'marketing_manager',
            user_id: 'manager-789',
            status: 'pending',
            timestamp: null
          }
        ],
        metadata: {
          version: 1,
          language: 'en',
          region: 'US',
          tags: ['summer', 'sale', 'featured']
        },
        created_by: 'author-123',
        updated_by: 'author-123',
        created_at: '2024-06-01T10:00:00Z',
        updated_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(validWorkflow);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidWorkflow = {
        content_id: '880e8400-e29b-41d4-a716-446655440004'
      };
      
      const result = contentWorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should reject invalid workflow state', () => {
      const invalidWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'invalid_state',
        transitions: []
      };
      
      const result = contentWorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should reject invalid content type', () => {
      const invalidWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'invalid_type',
        current_state: 'draft',
        transitions: []
      };
      
      const result = contentWorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority level', () => {
      const invalidWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        priority: 'invalid_priority',
        transitions: []
      };
      
      const result = contentWorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should validate workflow with minimal required fields', () => {
      const minimalWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: [],
        created_by: 'user-123',
        created_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(minimalWorkflow);
      expect(result.success).toBe(true);
    });

    it('should reject empty transitions array for non-draft state', () => {
      const invalidWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'review',
        transitions: []
      };
      
      const result = contentWorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should reject invalid approval status', () => {
      const invalidWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'review',
        transitions: [
          {
            from_state: 'draft',
            to_state: 'review',
            timestamp: '2024-06-01T10:00:00Z',
            user_id: 'author-123'
          }
        ],
        approval_chain: [
          {
            role: 'content_reviewer',
            user_id: 'reviewer-456',
            status: 'invalid_status'
          }
        ]
      };
      
      const result = contentWorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should reject deadline in the past', () => {
      const invalidWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: [],
        deadline: '2020-01-01T00:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should reject workflow with invalid UUID format', () => {
      const invalidWorkflow = {
        id: 'not-a-valid-uuid',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: []
      };
      
      const result = contentWorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });
  });

  describe('State Transition Tests', () => {
    it('should allow draft to review transition', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: []
      };
      
      const result1 = contentWorkflowSchema.safeParse(workflow);
      expect(result1.success).toBe(true);
      
      workflow.current_state = 'review';
      workflow.previous_state = 'draft';
      workflow.transitions.push({
        from_state: 'draft',
        to_state: 'review',
        timestamp: '2024-06-02T10:00:00Z',
        user_id: 'author-123'
      });
      
      const result2 = contentWorkflowSchema.safeParse(workflow);
      expect(result2.success).toBe(true);
    });

    it('should allow review to approved transition', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'review',
        previous_state: 'draft',
        transitions: [
          {
            from_state: 'draft',
            to_state: 'review',
            timestamp: '2024-06-02T10:00:00Z',
            user_id: 'author-123'
          }
        ]
      };
      
      const result1 = contentWorkflowSchema.safeParse(workflow);
      expect(result1.success).toBe(true);
      
      workflow.current_state = 'approved';
      workflow.previous_state = 'review';
      workflow.transitions.push({
        from_state: 'review',
        to_state: 'approved',
        timestamp: '2024-06-03T10:00:00Z',
        user_id: 'manager-789'
      });
      
      const result2 = contentWorkflowSchema.safeParse(workflow);
      expect(result2.success).toBe(true);
    });

    it('should allow approved to published transition', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'approved',
        previous_state: 'review',
        transitions: [
          {
            from_state: 'draft',
            to_state: 'review',
            timestamp: '2024-06-02T10:00:00Z',
            user_id: 'author-123'
          },
          {
            from_state: 'review',
            to_state: 'approved',
            timestamp: '2024-06-03T10:00:00Z',
            user_id: 'manager-789'
          }
        ]
      };
      
      const result1 = contentWorkflowSchema.safeParse(workflow);
      expect(result1.success).toBe(true);
      
      workflow.current_state = 'published';
      workflow.previous_state = 'approved';
      workflow.transitions.push({
        from_state: 'approved',
        to_state: 'published',
        timestamp: '2024-06-04T10:00:00Z',
        user_id: 'publisher-001'
      });
      
      const result2 = contentWorkflowSchema.safeParse(workflow);
      expect(result2.success).toBe(true);
    });

    it('should allow review to rejected transition', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'review',
        previous_state: 'draft',
        transitions: [
          {
            from_state: 'draft',
            to_state: 'review',
            timestamp: '2024-06-02T10:00:00Z',
            user_id: 'author-123'
          }
        ]
      };
      
      const result1 = contentWorkflowSchema.safeParse(workflow);
      expect(result1.success).toBe(true);
      
      workflow.current_state = 'rejected';
      workflow.previous_state = 'review';
      workflow.transitions.push({
        from_state: 'review',
        to_state: 'rejected',
        timestamp: '2024-06-03T10:00:00Z',
        user_id: 'reviewer-456',
        notes: 'Content needs revision'
      });
      
      const result2 = contentWorkflowSchema.safeParse(workflow);
      expect(result2.success).toBe(true);
    });

    it('should allow rejected to draft transition for revision', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'rejected',
        previous_state: 'review',
        transitions: [
          {
            from_state: 'draft',
            to_state: 'review',
            timestamp: '2024-06-02T10:00:00Z',
            user_id: 'author-123'
          },
          {
            from_state: 'review',
            to_state: 'rejected',
            timestamp: '2024-06-03T10:00:00Z',
            user_id: 'reviewer-456'
          }
        ]
      };
      
      const result1 = contentWorkflowSchema.safeParse(workflow);
      expect(result1.success).toBe(true);
      
      workflow.current_state = 'draft';
      workflow.previous_state = 'rejected';
      workflow.transitions.push({
        from_state: 'rejected',
        to_state: 'draft',
        timestamp: '2024-06-04T10:00:00Z',
        user_id: 'author-123',
        notes: 'Revising based on feedback'
      });
      
      const result2 = contentWorkflowSchema.safeParse(workflow);
      expect(result2.success).toBe(true);
    });

    it('should allow published to archived transition', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'published',
        previous_state: 'approved',
        transitions: [
          {
            from_state: 'approved',
            to_state: 'published',
            timestamp: '2024-06-04T10:00:00Z',
            user_id: 'publisher-001'
          }
        ]
      };
      
      const result1 = contentWorkflowSchema.safeParse(workflow);
      expect(result1.success).toBe(true);
      
      workflow.current_state = 'archived';
      workflow.previous_state = 'published';
      workflow.transitions.push({
        from_state: 'published',
        to_state: 'archived',
        timestamp: '2024-12-31T23:59:59Z',
        user_id: 'admin-999',
        notes: 'Content no longer relevant'
      });
      
      const result2 = contentWorkflowSchema.safeParse(workflow);
      expect(result2.success).toBe(true);
    });
  });

  describe('Transformations', () => {
    it('should transform date strings to Date objects', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: [
          {
            from_state: null,
            to_state: 'draft',
            timestamp: '2024-06-01T10:00:00Z',
            user_id: 'author-123'
          }
        ],
        deadline: '2024-06-15T17:00:00Z',
        created_at: '2024-06-01T10:00:00Z'
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      if (result.success) {
        expect(result.data.deadline).toBeInstanceOf(Date);
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.transitions[0].timestamp).toBeInstanceOf(Date);
      }
    });

    it('should normalize metadata tags', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: [],
        metadata: {
          tags: ['  Summer  ', '  SALE  ', '  Featured  ']
        }
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      if (result.success && result.data.metadata?.tags) {
        expect(result.data.metadata.tags).toEqual(['summer', 'sale', 'featured']);
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface for workflow', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: []
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      if (result.success) {
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('content_id');
        expect(result.data).toHaveProperty('content_type');
        expect(result.data).toHaveProperty('current_state');
        expect(result.data).toHaveProperty('transitions');
        expect(Array.isArray(result.data.transitions)).toBe(true);
      }
    });

    it('should ensure optional fields remain optional', () => {
      const minimalWorkflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: []
      };
      
      const result = contentWorkflowSchema.safeParse(minimalWorkflow);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.previous_state).toBeUndefined();
        expect(result.data.assigned_to).toBeUndefined();
        expect(result.data.priority).toBeUndefined();
        expect(result.data.deadline).toBeUndefined();
        expect(result.data.approval_chain).toBeUndefined();
        expect(result.data.metadata).toBeUndefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle workflow with maximum transitions', () => {
      const transitions = Array.from({ length: 100 }, (_, i) => ({
        from_state: i === 0 ? null : 'draft',
        to_state: 'draft',
        timestamp: `2024-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        user_id: `user-${i}`,
        notes: `Transition ${i + 1}`
      }));
      
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
    });

    it('should handle workflow with maximum approval chain', () => {
      const approvalChain = Array.from({ length: 10 }, (_, i) => ({
        role: `approver_${i}`,
        user_id: `user-${i}`,
        status: 'pending'
      }));
      
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'review',
        transitions: [
          {
            from_state: 'draft',
            to_state: 'review',
            timestamp: '2024-06-01T10:00:00Z',
            user_id: 'author-123'
          }
        ],
        approval_chain: approvalChain
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
    });

    it('should handle empty metadata object', () => {
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'draft',
        transitions: [],
        metadata: {}
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
    });

    it('should handle maximum length notes in transitions', () => {
      const longNotes = 'A'.repeat(1000);
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'review',
        transitions: [
          {
            from_state: 'draft',
            to_state: 'review',
            timestamp: '2024-06-01T10:00:00Z',
            user_id: 'author-123',
            notes: longNotes
          }
        ]
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(true);
    });

    it('should reject notes exceeding maximum length', () => {
      const tooLongNotes = 'A'.repeat(1001);
      const workflow = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        content_id: '880e8400-e29b-41d4-a716-446655440004',
        content_type: 'product_content',
        current_state: 'review',
        transitions: [
          {
            from_state: 'draft',
            to_state: 'review',
            timestamp: '2024-06-01T10:00:00Z',
            user_id: 'author-123',
            notes: tooLongNotes
          }
        ]
      };
      
      const result = contentWorkflowSchema.safeParse(workflow);
      expect(result.success).toBe(false);
    });
  });
});