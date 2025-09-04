import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContentWorkflow } from '../useContentWorkflow';
import { contentWorkflowService } from '@/services/marketing';
import { useUserRole } from '@/utils/useUserRole';

// Mock the services
jest.mock('@/services/marketing');
jest.mock('@/utils/useUserRole', () => ({
  useUserRole: jest.fn(() => 'admin')
}));

describe('useContentWorkflow', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (contentWorkflowService.getContent as jest.Mock).mockResolvedValue({
      id: 'content-1',
      title: 'Sample Marketing Content',
      description: 'This is a sample marketing content',
      workflowState: 'draft',
      imageUrls: [],
      documents: [],
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-15'),
      author: 'John Doe',
      tags: ['marketing', 'product'],
    });
    
    (contentWorkflowService.transitionTo as jest.Mock).mockResolvedValue({
      id: 'content-1',
      title: 'Sample Marketing Content',
      description: 'This is a sample marketing content',
      workflowState: 'review',
      imageUrls: [],
      documents: [],
      createdAt: new Date('2024-01-01'),
      lastModified: new Date(),
      author: 'John Doe',
      tags: ['marketing', 'product'],
    });
    
    (contentWorkflowService.validateTransition as jest.Mock).mockResolvedValue(true);
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  describe('state transitions', () => {
    it('should load content with current workflow state', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.content).toBeDefined();
      });
      
      expect(result.current.content?.workflowState).toBe('draft');
      expect(result.current.content?.id).toBe('content-1');
    });
    
    it.skip('should optimistically update on transition', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      // Store original state
      expect(result.current.content?.workflowState).toBe('draft');
      
      // Start transition
      act(() => {
        result.current.transitionTo({ targetState: 'review' });
      });
      
      // Wait for the optimistic update to be reflected
      await waitFor(() => {
        expect(result.current.content?.workflowState).toBe('review');
      }, { timeout: 3000 });
      
      expect(result.current.isTransitioning).toBe(true);
      
      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isTransitioning).toBe(false);
      });
      
      // Should still have the updated state after completion
      expect(result.current.content?.workflowState).toBe('review');
    });
    
    it.skip('should rollback on transition error', async () => {
      // Mock service to fail
      jest.spyOn(contentWorkflowService, 'transitionTo')
        .mockRejectedValueOnce(new Error('Invalid transition'));
      
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      const originalState = result.current.content?.workflowState;
      
      await act(async () => {
        result.current.transitionTo({ targetState: 'published' });
      });
      
      // Wait for optimistic update to be reflected
      await waitFor(() => {
        expect(result.current.content?.workflowState).toBe('published');
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      
      // Should rollback to original state
      expect(result.current.content?.workflowState).toBe(originalState);
    });
    
    it('should validate state transitions', async () => {
      jest.spyOn(contentWorkflowService, 'validateTransition')
        .mockResolvedValueOnce(false);
      
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      await act(async () => {
        result.current.transitionTo({ targetState: 'approved' });
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      
      expect(result.current.error?.message).toBe('Invalid transition');
    });
    
    it.skip('should handle multiple rapid transitions', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      // Mock the second transition response
      (contentWorkflowService.transitionTo as jest.Mock).mockResolvedValueOnce({
        id: 'content-1',
        title: 'Sample Marketing Content',
        description: 'This is a sample marketing content',
        workflowState: 'review',
        imageUrls: [],
        documents: [],
        createdAt: new Date('2024-01-01'),
        lastModified: new Date(),
        author: 'John Doe',
        tags: ['marketing', 'product'],
      });
      
      // First transition
      await act(async () => {
        result.current.transitionTo({ targetState: 'review' });
      });
      
      // Wait for optimistic update
      await waitFor(() => {
        expect(result.current.content?.workflowState).toBe('review');
      });
      
      // Wait for first to complete
      await waitFor(() => {
        expect(result.current.isTransitioning).toBe(false);
      });
      
      expect(result.current.content?.workflowState).toBe('review');
      
      // Mock the second transition response
      (contentWorkflowService.transitionTo as jest.Mock).mockResolvedValueOnce({
        id: 'content-1',
        title: 'Sample Marketing Content',
        description: 'This is a sample marketing content',
        workflowState: 'approved',
        imageUrls: [],
        documents: [],
        createdAt: new Date('2024-01-01'),
        lastModified: new Date(),
        author: 'John Doe',
        tags: ['marketing', 'product'],
      });
      
      // Second transition
      await act(async () => {
        result.current.transitionTo({ targetState: 'approved' });
      });
      
      // Wait for second optimistic update
      await waitFor(() => {
        expect(result.current.content?.workflowState).toBe('approved');
      });
      
      await waitFor(() => {
        expect(result.current.isTransitioning).toBe(false);
      });
      
      expect(result.current.content?.workflowState).toBe('approved');
    });
    
    it.skip('should update lastModified timestamp on transition', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      const originalTimestamp = result.current.content?.lastModified;
      
      await act(async () => {
        result.current.transitionTo({ targetState: 'review' });
      });
      
      // Wait for timestamp update to be reflected
      await waitFor(() => {
        expect(result.current.content?.lastModified).not.toBe(originalTimestamp);
      });
      
      expect(result.current.content?.lastModified).toBeInstanceOf(Date);
      
      await waitFor(() => {
        expect(result.current.isTransitioning).toBe(false);
      });
    });
    
    it('should invalidate queries after transition', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      await act(async () => {
        result.current.transitionTo({ targetState: 'review' });
      });
      
      await waitFor(() => {
        expect(result.current.isTransitioning).toBe(false);
      });
      
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: expect.arrayContaining(['marketing', 'content', 'detail', 'content-1']),
      });
    });
    
    it('should handle network errors gracefully', async () => {
      jest.spyOn(contentWorkflowService, 'transitionTo')
        .mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(
        () => useContentWorkflow('content-1'),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      await act(async () => {
        result.current.transitionTo({ targetState: 'review' });
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      
      expect(result.current.error?.message).toBe('Network error');
    });
  });
  
  describe('permission checks', () => {
    it('should disable transitions based on user role', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1', { role: 'viewer' }),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      expect(result.current.canTransitionTo('approved')).toBe(false);
      expect(result.current.canTransitionTo('review')).toBe(false);
      expect(result.current.availableTransitions).toEqual([]);
    });
    
    it('should allow editor to transition to review', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1', { role: 'editor' }),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      expect(result.current.canTransitionTo('review')).toBe(true);
      expect(result.current.canTransitionTo('approved')).toBe(false);
      expect(result.current.availableTransitions).toEqual(['review']);
    });
    
    it('should allow manager to approve content', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1', { role: 'manager' }),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      expect(result.current.canTransitionTo('review')).toBe(true);
      expect(result.current.canTransitionTo('approved')).toBe(true);
      expect(result.current.canTransitionTo('published')).toBe(false);
      expect(result.current.availableTransitions).toEqual(['review', 'approved']);
    });
    
    it('should allow admin all transitions', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1', { role: 'admin' }),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      expect(result.current.canTransitionTo('review')).toBe(true);
      expect(result.current.canTransitionTo('approved')).toBe(true);
      expect(result.current.canTransitionTo('published')).toBe(true);
      expect(result.current.canTransitionTo('archived')).toBe(true);
      expect(result.current.availableTransitions).toEqual(['review', 'approved', 'published', 'archived']);
    });
    
    it('should reject transition with insufficient permissions', async () => {
      const { result } = renderHook(
        () => useContentWorkflow('content-1', { role: 'viewer' }),
        { wrapper }
      );
      
      await waitFor(() => expect(result.current.content).toBeDefined());
      
      await act(async () => {
        result.current.transitionTo({ targetState: 'approved' });
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      
      expect(result.current.error?.message).toBe('Insufficient permissions');
    });
  });
});