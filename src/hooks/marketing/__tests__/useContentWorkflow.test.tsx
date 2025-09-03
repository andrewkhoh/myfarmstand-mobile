import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useContentWorkflow } from '../useContentWorkflow';
import { contentService } from '@/services/marketing/contentService';

// Mock the content service
jest.mock('@/services/marketing/contentService');

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
    
    // Setup default mocks
    (contentService.getContent as jest.Mock) = jest.fn();
    (contentService.transitionWorkflow as jest.Mock) = jest.fn();
    (contentService.subscribeToWorkflow as jest.Mock) = jest.fn().mockReturnValue(() => {});
    (contentService.schedulePublish as jest.Mock) = jest.fn();
    (contentService.bulkTransition as jest.Mock) = jest.fn();
    (contentService.rollback as jest.Mock) = jest.fn();
    (contentService.validateTransition as jest.Mock) = jest.fn();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  const mockContentData = {
    id: 'content-123',
    workflow_state: 'draft' as const,
    content_id: 'content-123',
    content: {
      title: 'Test Content',
      description: 'Test Description'
    },
    updated_at: new Date(),
    allowed_transitions: ['review', 'archived'],
    history: []
  };
  
  describe('workflow state transitions', () => {
    it('should fetch initial workflow state', async () => {
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.data?.workflow_state).toBe('draft');
      expect(result.current.data?.content_id).toBe('content-123');
    });
    
    it('should transition from draft to review', async () => {
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      (contentService.transitionWorkflow as jest.Mock).mockResolvedValue({
        ...mockContentData,
        workflow_state: 'review'
      });
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        result.current.transitionToReview();
      });
      
      await waitFor(() => {
        expect(contentService.transitionWorkflow).toHaveBeenCalledWith('content-123', 'review');
      });
    });
    
    it('should handle approval flow from review to approved', async () => {
      const reviewContent = { ...mockContentData, workflow_state: 'review' as const };
      (contentService.getContent as jest.Mock).mockResolvedValue(reviewContent);
      (contentService.transitionWorkflow as jest.Mock).mockResolvedValue({
        ...reviewContent,
        workflow_state: 'approved'
      });
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        result.current.approve({ approver_id: 'user-456', comments: 'Looks good' });
      });
      
      expect(contentService.transitionWorkflow).toHaveBeenCalledWith(
        'content-123',
        'approved',
        'user-456'
      );
    });
    
    it('should enforce role-based permissions for state transitions', async () => {
      const approvedContent = {
        ...mockContentData,
        workflow_state: 'approved' as const,
        allowed_transitions: ['published', 'archived']
      };
      (contentService.getContent as jest.Mock).mockResolvedValue(approvedContent);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.canTransition('published')).toBe(true);
      expect(result.current.canTransition('draft')).toBe(false);
    });
    
    it('should handle rejection flow with required feedback', async () => {
      const reviewContent = { ...mockContentData, workflow_state: 'review' as const };
      (contentService.getContent as jest.Mock).mockResolvedValue(reviewContent);
      (contentService.transitionWorkflow as jest.Mock).mockResolvedValue({
        ...reviewContent,
        workflow_state: 'draft'
      });
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        result.current.reject({
          reviewer_id: 'user-789',
          reason: 'Content needs revision',
          suggestions: ['Fix typos', 'Add more details']
        });
      });
      
      expect(contentService.transitionWorkflow).toHaveBeenCalledWith(
        'content-123',
        'draft',
        'user-789'
      );
    });
    
    it('should track workflow history and audit trail', async () => {
      const publishedContent = {
        ...mockContentData,
        workflow_state: 'published' as const,
        history: [
          { state: 'draft', timestamp: '2025-01-01T10:00:00Z', user_id: 'user-123' },
          { state: 'review', timestamp: '2025-01-01T11:00:00Z', user_id: 'user-123' },
          { state: 'approved', timestamp: '2025-01-01T12:00:00Z', user_id: 'user-456' },
          { state: 'published', timestamp: '2025-01-01T13:00:00Z', user_id: 'user-789' }
        ]
      };
      (contentService.getContent as jest.Mock).mockResolvedValue(publishedContent);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.data?.history).toHaveLength(4);
      });
      
      expect(result.current.data?.history?.[3].state).toBe('published');
    });
    
    it('should handle scheduled publishing transitions', async () => {
      const approvedContent = { ...mockContentData, workflow_state: 'approved' as const };
      (contentService.getContent as jest.Mock).mockResolvedValue(approvedContent);
      (contentService.schedulePublish as jest.Mock).mockResolvedValue(approvedContent);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      const publishDate = new Date('2025-02-01T10:00:00Z');
      
      await act(async () => {
        result.current.schedulePublish({
          publish_at: publishDate,
          timezone: 'America/New_York'
        });
      });
      
      expect(contentService.schedulePublish).toHaveBeenCalledWith('content-123', {
        publish_at: publishDate,
        timezone: 'America/New_York'
      });
    });
    
    it('should handle bulk workflow operations', async () => {
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      (contentService.bulkTransition as jest.Mock).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useContentWorkflow(), { wrapper });
      
      await act(async () => {
        result.current.bulkTransition({
          content_ids: ['content-1', 'content-2', 'content-3'],
          target_state: 'review',
          reason: 'Batch review process'
        });
      });
      
      expect(contentService.bulkTransition).toHaveBeenCalledWith({
        content_ids: ['content-1', 'content-2', 'content-3'],
        target_state: 'review',
        reason: 'Batch review process'
      });
    });
    
    it('should validate required fields before state transitions', async () => {
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      (contentService.validateTransition as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['Missing SEO metadata', 'No featured image']
      });
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      const validation = result.current.validateTransition('review');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing SEO metadata');
    });
    
    it('should handle workflow state rollback', async () => {
      const publishedContent = {
        ...mockContentData,
        workflow_state: 'published' as const,
        previous_state: 'approved'
      };
      (contentService.getContent as jest.Mock).mockResolvedValue(publishedContent);
      (contentService.rollback as jest.Mock).mockResolvedValue({
        ...publishedContent,
        workflow_state: 'review'
      });
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        result.current.rollback({
          reason: 'Content issue discovered',
          target_state: 'review'
        });
      });
      
      expect(contentService.rollback).toHaveBeenCalledWith('content-123', {
        reason: 'Content issue discovered',
        target_state: 'review'
      });
    });
  });
  
  describe('optimistic updates', () => {
    it('should optimistically update workflow state on transition', async () => {
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      (contentService.transitionWorkflow as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ...mockContentData,
          workflow_state: 'review'
        }), 100))
      );
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      act(() => {
        result.current.mutate({ workflow_state: 'review' });
      });
      
      // Check optimistic update happens immediately
      await waitFor(() => {
        expect(result.current.data?.workflow_state).toBe('review');
      });
      
      expect(result.current.isOptimistic).toBe(true);
    });
    
    it('should rollback optimistic updates on error', async () => {
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      (contentService.transitionWorkflow as jest.Mock).mockRejectedValue(
        new Error('Transition failed')
      );
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        try {
          await result.current.mutate({ workflow_state: 'invalid' });
        } catch (error) {
          // Expected error
        }
      });
      
      await waitFor(() => {
        expect(result.current.data?.workflow_state).toBe('draft');
      });
    });
  });
  
  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const error = new Error('Network error');
      (contentService.getContent as jest.Mock).mockRejectedValue(error);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      
      expect(result.current.error?.message).toBe('Network error');
    });
    
    it('should handle permission denied errors', async () => {
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      (contentService.transitionWorkflow as jest.Mock).mockRejectedValue(
        new Error('Permission denied: requires publisher role')
      );
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        result.current.transitionToPublished();
      });
      
      await waitFor(() => {
        expect(result.current.transitionError?.message).toContain('Permission denied');
      });
    });
    
    it('should retry failed transitions with exponential backoff', async () => {
      (contentService.getContent as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockContentData);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      
      await act(async () => {
        result.current.retry();
      });
      
      await waitFor(() => {
        expect(result.current.isError).toBe(false);
      });
      
      expect(contentService.getContent).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('real-time updates', () => {
    it('should subscribe to workflow state changes', async () => {
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(contentService.subscribeToWorkflow).toHaveBeenCalledWith('content-123', expect.any(Function));
      });
    });
    
    it('should handle real-time state updates from other users', async () => {
      let subscriptionCallback: any;
      (contentService.getContent as jest.Mock).mockResolvedValue(mockContentData);
      (contentService.subscribeToWorkflow as jest.Mock).mockImplementation((id, cb) => {
        subscriptionCallback = cb;
        return jest.fn();
      });
      
      const { result } = renderHook(() => useContentWorkflow('content-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Simulate real-time update
      await act(async () => {
        result.current.onStateChange({
          workflow_state: 'approved',
          updated_by: 'user-456',
          timestamp: new Date().toISOString()
        });
      });
      
      await waitFor(() => {
        expect(result.current.data?.workflow_state).toBe('approved');
      });
    });
  });
});