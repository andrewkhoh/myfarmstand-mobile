import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';

import WorkflowIndicator from '../WorkflowIndicator';

describe('WorkflowIndicator', () => {
  const defaultProps = {
    currentState: 'draft',
    onTransition: jest.fn(),
    permissions: {
      canEdit: true,
      canApprove: false,
      canPublish: false
    },
    testID: 'workflow-indicator'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('state display', () => {
    it('should display current workflow state', () => {
      const { getByText } = render(
        <WorkflowIndicator {...defaultProps} currentState="draft" />
      );
      expect(getByText('Draft')).toBeTruthy();
    });
    
    it('should display different workflow states', () => {
      const states = ['draft', 'review', 'approved', 'published'];
      
      states.forEach(state => {
        const { getByText } = render(
          <WorkflowIndicator {...defaultProps} currentState={state} />
        );
        const displayName = state.charAt(0).toUpperCase() + state.slice(1);
        expect(getByText(displayName)).toBeTruthy();
      });
    });
    
    it('should show state icon', () => {
      const { getByTestId } = render(
        <WorkflowIndicator {...defaultProps} currentState="approved" />
      );
      expect(getByTestId('state-icon-approved')).toBeTruthy();
    });
    
    it('should apply state-specific styling', () => {
      const { getByTestId } = render(
        <WorkflowIndicator {...defaultProps} currentState="published" />
      );
      
      const indicator = getByTestId('workflow-indicator');
      expect(indicator.props.style).toMatchObject({
        backgroundColor: expect.any(String)
      });
    });
    
    it('should show workflow progress bar', () => {
      const { getByTestId } = render(
        <WorkflowIndicator {...defaultProps} showProgress={true} />
      );
      expect(getByTestId('workflow-progress')).toBeTruthy();
    });
  });
  
  describe('transition buttons', () => {
    it('should show available transition buttons based on state', () => {
      const { getByText } = render(
        <WorkflowIndicator {...defaultProps} currentState="draft" />
      );
      expect(getByText('Submit for Review')).toBeTruthy();
    });
    
    it('should call onTransition when transition button pressed', () => {
      const onTransition = jest.fn();
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="draft"
          onTransition={onTransition}
        />
      );
      
      const submitButton = getByText('Submit for Review');
      fireEvent.press(submitButton);
      
      expect(onTransition).toHaveBeenCalledWith('review');
    });
    
    it('should show multiple transition options when available', () => {
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="review"
          permissions={{ canEdit: true, canApprove: true, canPublish: false }}
        />
      );
      
      expect(getByText('Approve')).toBeTruthy();
      expect(getByText('Request Changes')).toBeTruthy();
    });
    
    it('should disable transitions based on permissions', () => {
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="approved"
          permissions={{ canEdit: false, canApprove: false, canPublish: false }}
        />
      );
      
      const publishButton = getByText('Publish');
      expect(publishButton.props.disabled).toBe(true);
    });
  });
  
  describe('permission-based rendering', () => {
    it('should hide approve button without approve permission', () => {
      const { queryByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="review"
          permissions={{ canEdit: true, canApprove: false, canPublish: false }}
        />
      );
      
      expect(queryByText('Approve')).toBeFalsy();
    });
    
    it('should show publish button with publish permission', () => {
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="approved"
          permissions={{ canEdit: false, canApprove: false, canPublish: true }}
        />
      );
      
      expect(getByText('Publish')).toBeTruthy();
    });
    
    it('should disable edit actions without edit permission', () => {
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="published"
          permissions={{ canEdit: false, canApprove: false, canPublish: false }}
        />
      );
      
      const unpublishButton = getByText('Unpublish');
      expect(unpublishButton.props.disabled).toBe(true);
    });
  });
  
  describe('workflow history', () => {
    it('should display workflow history when provided', () => {
      const history = [
        { state: 'draft', timestamp: '2025-09-01', user: 'User A' },
        { state: 'review', timestamp: '2025-09-02', user: 'User A' },
        { state: 'approved', timestamp: '2025-09-03', user: 'User B' }
      ];
      
      const { getByText } = render(
        <WorkflowIndicator {...defaultProps} history={history} showHistory={true} />
      );
      
      expect(getByText('User A')).toBeTruthy();
      expect(getByText('User B')).toBeTruthy();
    });
    
    it('should toggle history visibility', () => {
      const history = [
        { state: 'draft', timestamp: '2025-09-01', user: 'User A' }
      ];
      
      const { getByTestId, queryByText } = render(
        <WorkflowIndicator {...defaultProps} history={history} />
      );
      
      const toggleButton = getByTestId('toggle-history');
      
      // History hidden initially
      expect(queryByText('User A')).toBeFalsy();
      
      // Show history
      fireEvent.press(toggleButton);
      expect(queryByText('User A')).toBeTruthy();
    });
  });
  
  describe('state notifications', () => {
    it('should show notification for state changes', () => {
      const { getByText, rerender } = render(
        <WorkflowIndicator {...defaultProps} currentState="draft" />
      );
      
      rerender(
        <WorkflowIndicator {...defaultProps} currentState="review" />
      );
      
      expect(getByText('Status changed to Review')).toBeTruthy();
    });
    
    it('should call onStateChange callback', () => {
      const onStateChange = jest.fn();
      const { rerender } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="draft"
          onStateChange={onStateChange}
        />
      );
      
      rerender(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="review"
          onStateChange={onStateChange}
        />
      );
      
      expect(onStateChange).toHaveBeenCalledWith('draft', 'review');
    });
  });
  
  describe('accessibility', () => {
    it('should have accessible state announcement', () => {
      const { getByTestId } = render(
        <WorkflowIndicator {...defaultProps} currentState="approved" />
      );
      
      const indicator = getByTestId('workflow-indicator');
      expect(indicator.props.accessibilityLabel).toBe('Workflow status: Approved');
    });
    
    it('should announce available actions', () => {
      const { getByText } = render(
        <WorkflowIndicator {...defaultProps} currentState="draft" />
      );
      
      const submitButton = getByText('Submit for Review');
      expect(submitButton.props.accessibilityHint).toBe('Move content to review state');
    });
    
    it('should indicate disabled actions', () => {
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="approved"
          permissions={{ canEdit: false, canApprove: false, canPublish: false }}
        />
      );
      
      const publishButton = getByText('Publish');
      expect(publishButton.props.accessibilityState).toEqual({
        disabled: true
      });
    });
  });
  
  describe('edge cases', () => {
    it('should handle unknown state gracefully', () => {
      const { getByText } = render(
        <WorkflowIndicator {...defaultProps} currentState="unknown" />
      );
      expect(getByText('Unknown')).toBeTruthy();
    });
    
    it('should handle missing permissions object', () => {
      const { getByTestId } = render(
        <WorkflowIndicator currentState="draft" onTransition={jest.fn()} />
      );
      expect(getByTestId('workflow-indicator')).toBeTruthy();
    });
    
    it('should handle empty history array', () => {
      const { getByTestId } = render(
        <WorkflowIndicator {...defaultProps} history={[]} showHistory={true} />
      );
      expect(getByTestId('workflow-indicator')).toBeTruthy();
    });
  });
});
