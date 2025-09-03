import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMockSupabaseClient } from '@/test/serviceSetup';

// Mock Supabase
jest.mock('@/config/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

// Import the actual service
import { workflowService } from '../workflowService';

describe('WorkflowService', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
  });
  
  describe('State Management', () => {
    it('should create workflow with initial state', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            id: 'wf123',
            entity_id: 'content123',
            current_state: 'draft',
            entity_type: 'content'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await workflowService.createWorkflow({
        entity_id: 'content123',
        entity_type: 'content',
        initial_state: 'draft'
      });
      
      expect(result.current_state).toBe('draft');
      expect(result.entity_type).toBe('content');
    });

    it('should transition workflow state', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            id: 'wf123',
            current_state: 'in_review',
            previous_state: 'draft'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await workflowService.transitionState('wf123', 'in_review');
      expect(result.current_state).toBe('in_review');
      expect(result.previous_state).toBe('draft');
    });

    it('should validate state transitions', async () => {
      await expect(workflowService.validateTransition('draft', 'published'))
        .rejects.toThrow('Invalid state transition');
    });

    it('should get current workflow state', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: 'wf123',
            current_state: 'published',
            updated_at: '2025-01-01T10:00:00Z'
          },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const state = await workflowService.getWorkflowState('wf123');
      expect(state.current_state).toBe('published');
    });

    it('should handle concurrent state transitions', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'State has been modified' }
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      await expect(workflowService.transitionState('wf123', 'in_review', {
        expected_current_state: 'draft'
      })).rejects.toThrow('State has been modified');
    });
  });
  
  describe('Approval Process', () => {
    it('should submit for approval', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            id: 'wf123',
            current_state: 'pending_approval',
            approval_requested_by: 'user123',
            approval_requested_at: '2025-01-01T10:00:00Z'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await workflowService.submitForApproval('wf123', {
        requested_by: 'user123',
        notes: 'Ready for review'
      });
      
      expect(result.current_state).toBe('pending_approval');
      expect(result.approval_requested_by).toBe('user123');
    });

    it('should approve workflow', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            id: 'wf123',
            current_state: 'approved',
            approved_by: 'manager123',
            approved_at: '2025-01-01T11:00:00Z'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await workflowService.approveWorkflow('wf123', {
        approved_by: 'manager123',
        comments: 'Looks good'
      });
      
      expect(result.current_state).toBe('approved');
      expect(result.approved_by).toBe('manager123');
    });

    it('should reject workflow with reason', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            id: 'wf123',
            current_state: 'rejected',
            rejected_by: 'manager123',
            rejection_reason: 'Needs more work'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await workflowService.rejectWorkflow('wf123', {
        rejected_by: 'manager123',
        reason: 'Needs more work'
      });
      
      expect(result.current_state).toBe('rejected');
      expect(result.rejection_reason).toBe('Needs more work');
    });

    it('should get approval queue', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 'wf1', entity_id: 'content1', requested_at: '2025-01-01' },
            { id: 'wf2', entity_id: 'content2', requested_at: '2025-01-02' }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const queue = await workflowService.getApprovalQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].entity_id).toBe('content1');
    });

    it('should enforce approval permissions', async () => {
      await expect(workflowService.approveWorkflow('wf123', {
        approved_by: 'unauthorized_user'
      })).rejects.toThrow('Insufficient permissions');
    });
  });
  
  describe('Workflow History', () => {
    it('should track workflow history', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { state: 'published', timestamp: '2025-01-03T10:00:00Z' },
            { state: 'approved', timestamp: '2025-01-02T15:00:00Z' },
            { state: 'in_review', timestamp: '2025-01-02T10:00:00Z' },
            { state: 'draft', timestamp: '2025-01-01T10:00:00Z' }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const history = await workflowService.getWorkflowHistory('wf123');
      expect(history).toHaveLength(4);
      expect(history[0].state).toBe('published');
    });

    it('should record state transition metadata', async () => {
      const mockChain = {
        insert: jest.fn().mockResolvedValue({
          data: { 
            workflow_id: 'wf123',
            from_state: 'draft',
            to_state: 'in_review',
            transitioned_by: 'user123',
            metadata: { reason: 'Ready for review' }
          },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const transition = await workflowService.recordTransition({
        workflow_id: 'wf123',
        from_state: 'draft',
        to_state: 'in_review',
        user_id: 'user123',
        metadata: { reason: 'Ready for review' }
      });
      
      expect(transition.from_state).toBe('draft');
      expect(transition.to_state).toBe('in_review');
    });
  });
  
  describe('Deadlines and Timers', () => {
    it('should set workflow deadline', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            id: 'wf123',
            deadline: '2025-02-01T00:00:00Z',
            deadline_action: 'auto_approve'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await workflowService.setWorkflowDeadline('wf123', {
        deadline: '2025-02-01T00:00:00Z',
        action: 'auto_approve'
      });
      
      expect(result.deadline).toBe('2025-02-01T00:00:00Z');
      expect(result.deadline_action).toBe('auto_approve');
    });

    it('should get overdue workflows', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: 'wf1', deadline: '2025-01-01', current_state: 'pending_approval' },
            { id: 'wf2', deadline: '2025-01-02', current_state: 'in_review' }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const overdue = await workflowService.getOverdueWorkflows();
      expect(overdue).toHaveLength(2);
    });

    it('should calculate time in state', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            current_state: 'in_review',
            state_entered_at: '2025-01-01T10:00:00Z'
          },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const timeInState = await workflowService.getTimeInState('wf123');
      expect(timeInState).toBeGreaterThan(0);
    });
  });
  
  describe('Bulk Operations', () => {
    it('should perform bulk state transitions', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'wf1', current_state: 'published' },
            { id: 'wf2', current_state: 'published' },
            { id: 'wf3', current_state: 'published' }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const results = await workflowService.bulkTransition(
        ['wf1', 'wf2', 'wf3'],
        'published'
      );
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.current_state === 'published')).toBe(true);
    });

    it('should handle partial bulk failures', async () => {
      const results = await workflowService.bulkTransition(
        ['wf1', 'wf2', 'invalid'],
        'published'
      );
      
      expect(results.failed).toContain('invalid');
      expect(results.succeeded).toHaveLength(2);
    });
  });
  
  describe('Workflow Metrics', () => {
    it('should calculate average approval time', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({
          data: [
            { approval_time_hours: 24 },
            { approval_time_hours: 48 },
            { approval_time_hours: 12 }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const metrics = await workflowService.getWorkflowMetrics({
        entity_type: 'content',
        period: 'monthly'
      });
      
      expect(metrics.avg_approval_time).toBe(28);
    });

    it('should track rejection rates', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({
          data: [
            { current_state: 'approved' },
            { current_state: 'rejected' },
            { current_state: 'approved' },
            { current_state: 'approved' }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const metrics = await workflowService.getWorkflowMetrics({
        entity_type: 'campaign'
      });
      
      expect(metrics.rejection_rate).toBe(0.25);
    });

    it('should identify bottlenecks', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { state: 'pending_approval', avg_time_hours: 72 },
            { state: 'in_review', avg_time_hours: 24 },
            { state: 'draft', avg_time_hours: 12 }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const bottlenecks = await workflowService.identifyBottlenecks();
      expect(bottlenecks[0].state).toBe('pending_approval');
      expect(bottlenecks[0].avg_time_hours).toBe(72);
    });
  });
  
  describe('Archive and Restore', () => {
    it('should archive completed workflows', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            id: 'wf123',
            archived: true,
            archived_at: '2025-01-15T10:00:00Z'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await workflowService.archiveWorkflow('wf123');
      expect(result.archived).toBe(true);
      expect(result.archived_at).toBeDefined();
    });

    it('should restore archived workflows', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ 
            id: 'wf123',
            archived: false,
            current_state: 'draft'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await workflowService.restoreWorkflow('wf123');
      expect(result.archived).toBe(false);
      expect(result.current_state).toBe('draft');
    });

    it('should bulk archive old workflows', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: 'wf1', archived: true },
            { id: 'wf2', archived: true },
            { id: 'wf3', archived: true }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const archived = await workflowService.archiveOldWorkflows({
        older_than_days: 90
      });
      
      expect(archived).toHaveLength(3);
    });
  });
  
  describe('Active Workflows', () => {
    it('should get active workflows by entity type', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 'wf1', entity_type: 'content', current_state: 'in_review' },
            { id: 'wf2', entity_type: 'content', current_state: 'pending_approval' }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const active = await workflowService.getActiveWorkflows({
        entity_type: 'content'
      });
      
      expect(active).toHaveLength(2);
      expect(active.every(w => w.entity_type === 'content')).toBe(true);
    });

    it('should count workflows by state', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { current_state: 'draft', count: 10 },
            { current_state: 'in_review', count: 5 },
            { current_state: 'pending_approval', count: 3 },
            { current_state: 'published', count: 20 }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const counts = await workflowService.getWorkflowCounts();
      expect(counts.draft).toBe(10);
      expect(counts.published).toBe(20);
    });
  });
});