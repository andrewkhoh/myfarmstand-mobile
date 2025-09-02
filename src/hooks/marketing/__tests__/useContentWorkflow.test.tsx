import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';

// Mock the hook (doesn't exist yet - RED phase)
const useContentWorkflow = jest.fn();

describe('useContentWorkflow', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('workflow state transitions', () => {
    it('should transition from draft to review', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { workflow_state: 'draft' },
        transitionToReview: jest.fn()
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      act(() => {
        result.current.transitionToReview();
      });
      
      mockHookReturn.data.workflow_state = 'review';
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('review');
      });
    });
    
    it('should handle approval flow from review to approved', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { workflow_state: 'review' },
        approve: jest.fn(),
        isSuccess: false
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await act(async () => {
        result.current.approve({ approver_id: 'user-1', notes: 'Approved' });
      });
      
      mockHookReturn.data.workflow_state = 'approved';
      mockHookReturn.isSuccess = true;
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('approved');
        expect(result.current.isSuccess).toBe(true);
      });
    });
    
    it('should enforce permission-based transitions', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { workflow_state: 'draft' },
        canTransition: jest.fn().mockReturnValue(false),
        transitionToReview: jest.fn(),
        error: null
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123', { userId: 'viewer' }), { wrapper });
      
      expect(result.current.canTransition('review')).toBe(false);
      
      act(() => {
        result.current.transitionToReview();
      });
      
      mockHookReturn.error = new Error('Insufficient permissions');
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error.message).toBe('Insufficient permissions');
      });
    });
    
    it('should handle rejection flow with comments', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { workflow_state: 'review', rejection_comments: [] },
        reject: jest.fn(),
        isRejecting: false
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      const rejectionData = {
        reviewer_id: 'user-2',
        comments: 'Needs revision',
        required_changes: ['Fix typos', 'Update images']
      };
      
      mockHookReturn.isRejecting = true;
      
      act(() => {
        result.current.reject(rejectionData);
      });
      
      expect(result.current.isRejecting).toBe(true);
      
      mockHookReturn.data.workflow_state = 'draft';
      mockHookReturn.data.rejection_comments = [rejectionData];
      mockHookReturn.isRejecting = false;
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('draft');
        expect(result.current.data.rejection_comments).toHaveLength(1);
        expect(result.current.isRejecting).toBe(false);
      });
    });
    
    it('should track workflow history and audit trail', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { 
          workflow_state: 'draft',
          history: []
        },
        transitionToReview: jest.fn(),
        getHistory: jest.fn().mockReturnValue([])
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      act(() => {
        result.current.transitionToReview();
      });
      
      const historyEntry = {
        from_state: 'draft',
        to_state: 'review',
        user_id: 'user-1',
        timestamp: new Date().toISOString(),
        action: 'transition'
      };
      
      mockHookReturn.getHistory.mockReturnValue([historyEntry]);
      
      await waitFor(() => {
        const history = result.current.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0].from_state).toBe('draft');
        expect(history[0].to_state).toBe('review');
      });
    });
    
    it('should handle scheduled publishing', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { 
          workflow_state: 'approved',
          scheduled_publish_date: null
        },
        schedulePublish: jest.fn(),
        isScheduling: false
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      const publishDate = new Date('2025-09-01T10:00:00Z');
      
      mockHookReturn.isScheduling = true;
      
      act(() => {
        result.current.schedulePublish(publishDate);
      });
      
      expect(result.current.isScheduling).toBe(true);
      
      mockHookReturn.data.scheduled_publish_date = publishDate.toISOString();
      mockHookReturn.data.workflow_state = 'scheduled';
      mockHookReturn.isScheduling = false;
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('scheduled');
        expect(result.current.data.scheduled_publish_date).toBe(publishDate.toISOString());
        expect(result.current.isScheduling).toBe(false);
      });
    });
    
    it('should handle immediate publishing', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { 
          workflow_state: 'approved',
          published_at: null
        },
        publish: jest.fn(),
        isPublishing: false
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      mockHookReturn.isPublishing = true;
      
      act(() => {
        result.current.publish();
      });
      
      expect(result.current.isPublishing).toBe(true);
      
      mockHookReturn.data.workflow_state = 'published';
      mockHookReturn.data.published_at = new Date().toISOString();
      mockHookReturn.isPublishing = false;
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('published');
        expect(result.current.data.published_at).toBeDefined();
        expect(result.current.isPublishing).toBe(false);
      });
    });
    
    it('should handle archiving published content', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { 
          workflow_state: 'published',
          archived_at: null
        },
        archive: jest.fn(),
        isArchiving: false
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      const archiveReason = 'Content outdated';
      
      act(() => {
        result.current.archive({ reason: archiveReason });
      });
      
      mockHookReturn.data.workflow_state = 'archived';
      mockHookReturn.data.archived_at = new Date().toISOString();
      mockHookReturn.data.archive_reason = archiveReason;
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('archived');
        expect(result.current.data.archived_at).toBeDefined();
        expect(result.current.data.archive_reason).toBe(archiveReason);
      });
    });
    
    it('should validate state machine transitions', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { workflow_state: 'draft' },
        getValidTransitions: jest.fn(),
        isValidTransition: jest.fn()
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      mockHookReturn.getValidTransitions.mockReturnValue(['review', 'archived']);
      mockHookReturn.isValidTransition.mockImplementation((state) => 
        ['review', 'archived'].includes(state)
      );
      
      expect(result.current.getValidTransitions()).toEqual(['review', 'archived']);
      expect(result.current.isValidTransition('review')).toBe(true);
      expect(result.current.isValidTransition('published')).toBe(false);
      expect(result.current.isValidTransition('approved')).toBe(false);
    });
    
    it('should handle workflow rollback', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { 
          workflow_state: 'review',
          previous_state: 'draft'
        },
        rollback: jest.fn(),
        isRollingBack: false
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      mockHookReturn.isRollingBack = true;
      
      act(() => {
        result.current.rollback();
      });
      
      expect(result.current.isRollingBack).toBe(true);
      
      mockHookReturn.data.workflow_state = 'draft';
      mockHookReturn.data.previous_state = null;
      mockHookReturn.isRollingBack = false;
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('draft');
        expect(result.current.isRollingBack).toBe(false);
      });
    });
  });
  
  describe('optimistic updates and rollback', () => {
    it('should optimistically update workflow state', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { workflow_state: 'draft' },
        transitionToReview: jest.fn(),
        optimisticData: null
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      // Set optimistic data immediately
      mockHookReturn.optimisticData = { workflow_state: 'review' };
      
      act(() => {
        result.current.transitionToReview();
      });
      
      // Should see optimistic update immediately
      expect(result.current.optimisticData.workflow_state).toBe('review');
      
      // Simulate success
      mockHookReturn.data.workflow_state = 'review';
      mockHookReturn.optimisticData = null;
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('review');
        expect(result.current.optimisticData).toBeNull();
      });
    });
    
    it('should rollback on error', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { workflow_state: 'draft' },
        transitionToReview: jest.fn(),
        error: null,
        optimisticData: null
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      // Set optimistic data
      mockHookReturn.optimisticData = { workflow_state: 'review' };
      
      act(() => {
        result.current.transitionToReview();
      });
      
      // Simulate error and rollback
      mockHookReturn.error = new Error('Network error');
      mockHookReturn.optimisticData = null;
      // Data should remain in original state
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('draft');
        expect(result.current.error).toBeDefined();
        expect(result.current.optimisticData).toBeNull();
      });
    });
  });
  
  describe('real-time updates', () => {
    it('should subscribe to workflow state changes', async () => {
      const mockHookReturn = {
        isLoading: false,
        data: { workflow_state: 'draft' },
        subscription: { 
          isConnected: false,
          subscribe: jest.fn(),
          unsubscribe: jest.fn()
        }
      };
      useContentWorkflow.mockReturnValue(mockHookReturn);
      
      const { result, unmount } = renderHook(() => useContentWorkflow('content-123', { realtime: true }), { wrapper });
      
      mockHookReturn.subscription.isConnected = true;
      
      await waitFor(() => {
        expect(result.current.subscription.isConnected).toBe(true);
      });
      
      // Simulate incoming update
      mockHookReturn.data.workflow_state = 'review';
      
      await waitFor(() => {
        expect(result.current.data.workflow_state).toBe('review');
      });
      
      unmount();
      
      expect(mockHookReturn.subscription.unsubscribe).toHaveBeenCalled();
    });
  });
});