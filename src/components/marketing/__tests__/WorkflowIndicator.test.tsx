import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the component (doesn't exist yet - RED phase)
jest.mock('../WorkflowIndicator', () => ({
  default: jest.fn(() => null)
}));

import WorkflowIndicator from '../WorkflowIndicator';

describe('WorkflowIndicator', () => {
  const defaultProps = {
    currentState: 'draft',
    availableTransitions: [],
    onTransition: jest.fn(),
    permissions: {
      canEdit: true,
      canPublish: false,
      canArchive: false
    },
    testID: 'workflow-indicator'
  };

  const workflowStates = {
    draft: { label: 'Draft', color: '#gray' },
    review: { label: 'In Review', color: '#yellow' },
    approved: { label: 'Approved', color: '#green' },
    published: { label: 'Published', color: '#blue' },
    archived: { label: 'Archived', color: '#red' }
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

    it('should apply state-specific styling', () => {
      const { getByTestId } = render(
        <WorkflowIndicator {...defaultProps} currentState="published" />
      );
      
      const stateIndicator = getByTestId('state-indicator');
      expect(stateIndicator.props.style).toMatchObject({
        backgroundColor: expect.stringContaining('blue')
      });
    });

    it('should show state icon', () => {
      const { getByTestId } = render(
        <WorkflowIndicator {...defaultProps} currentState="approved" />
      );
      
      expect(getByTestId('state-icon-approved')).toBeTruthy();
    });

    it('should display state description when provided', () => {
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="review"
          stateDescription="Awaiting manager approval"
        />
      );
      
      expect(getByText('Awaiting manager approval')).toBeTruthy();
    });

    it('should show workflow progress indicator', () => {
      const { getByTestId } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          currentState="review"
          progress={2}
          totalSteps={5}
        />
      );
      
      const progressBar = getByTestId('workflow-progress');
      expect(progressBar.props.style).toMatchObject({
        width: '40%' // 2/5 = 40%
      });
    });
  });

  describe('transition controls', () => {
    it('should display available transition buttons', () => {
      const availableTransitions = [
        { to: 'review', label: 'Send for Review' },
        { to: 'archived', label: 'Archive' }
      ];
      
      const { getByText } = render(
        <WorkflowIndicator {...defaultProps} availableTransitions={availableTransitions} />
      );
      
      expect(getByText('Send for Review')).toBeTruthy();
      expect(getByText('Archive')).toBeTruthy();
    });

    it('should call onTransition when transition button pressed', () => {
      const onTransition = jest.fn();
      const availableTransitions = [
        { to: 'review', label: 'Send for Review' }
      ];
      
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          availableTransitions={availableTransitions}
          onTransition={onTransition}
        />
      );
      
      const transitionButton = getByText('Send for Review');
      fireEvent.press(transitionButton);
      
      expect(onTransition).toHaveBeenCalledWith('review');
    });

    it('should show confirmation dialog for critical transitions', () => {
      const availableTransitions = [
        { to: 'archived', label: 'Archive', requiresConfirmation: true }
      ];
      
      const { getByText } = render(
        <WorkflowIndicator {...defaultProps} availableTransitions={availableTransitions} />
      );
      
      const archiveButton = getByText('Archive');
      fireEvent.press(archiveButton);
      
      expect(getByText('Are you sure you want to archive?')).toBeTruthy();
      expect(getByText('Confirm')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should handle transition with reason input', () => {
      const onTransition = jest.fn();
      const availableTransitions = [
        { to: 'rejected', label: 'Reject', requiresReason: true }
      ];
      
      const { getByText, getByPlaceholderText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          availableTransitions={availableTransitions}
          onTransition={onTransition}
        />
      );
      
      const rejectButton = getByText('Reject');
      fireEvent.press(rejectButton);
      
      const reasonInput = getByPlaceholderText('Enter reason...');
      fireEvent.changeText(reasonInput, 'Content not ready');
      
      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);
      
      expect(onTransition).toHaveBeenCalledWith('rejected', { 
        reason: 'Content not ready' 
      });
    });
  });

  describe('permission-based rendering', () => {
    it('should disable transitions based on permissions', () => {
      const availableTransitions = [
        { to: 'published', label: 'Publish' }
      ];
      
      const { getByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          availableTransitions={availableTransitions}
          permissions={{ canPublish: false }}
        />
      );
      
      const publishButton = getByText('Publish');
      expect(publishButton.props.disabled).toBe(true);
    });

    it('should show permission warning when hovering disabled button', () => {
      const availableTransitions = [
        { to: 'published', label: 'Publish' }
      ];
      
      const { getByText, getByTestId } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          availableTransitions={availableTransitions}
          permissions={{ canPublish: false }}
        />
      );
      
      const publishButton = getByText('Publish');
      fireEvent(publishButton, 'longPress');
      
      expect(getByText('You do not have permission to publish')).toBeTruthy();
    });

    it('should hide admin-only transitions for non-admin users', () => {
      const availableTransitions = [
        { to: 'review', label: 'Send for Review' },
        { to: 'force-publish', label: 'Force Publish', adminOnly: true }
      ];
      
      const { getByText, queryByText } = render(
        <WorkflowIndicator 
          {...defaultProps} 
          availableTransitions={availableTransitions}
          isAdmin={false}
        />
      );
      
      expect(getByText('Send for Review')).toBeTruthy();
      expect(queryByText('Force Publish')).toBeNull();
    });
  });

  describe('workflow history', () => {
    it('should display workflow history when expanded', () => {
      const history = [
        { state: 'draft', timestamp: '2025-08-29T10:00:00', user: 'John Doe' },
        { state: 'review', timestamp: '2025-08-29T11:00:00', user: 'Jane Smith' }
      ];
      
      const { getByTestId, getByText } = render(
        <WorkflowIndicator {...defaultProps} history={history} />
      );
      
      const expandButton = getByTestId('expand-history');
      fireEvent.press(expandButton);
      
      expect(getByText('Draft → Review')).toBeTruthy();
      expect(getByText('by Jane Smith')).toBeTruthy();
    });

    it('should format timestamps in history', () => {
      const history = [
        { state: 'review', timestamp: new Date().toISOString(), user: 'User' }
      ];
      
      const { getByTestId, getByText } = render(
        <WorkflowIndicator {...defaultProps} history={history} />
      );
      
      const expandButton = getByTestId('expand-history');
      fireEvent.press(expandButton);
      
      expect(getByText(/Today at/)).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels for state', () => {
      const { getByTestId } = render(
        <WorkflowIndicator {...defaultProps} currentState="published" />
      );
      
      const stateIndicator = getByTestId('state-indicator');
      expect(stateIndicator.props.accessibilityLabel).toBe('Current state: Published');
    });

    it('should announce state changes', () => {
      const { getByTestId, rerender } = render(
        <WorkflowIndicator {...defaultProps} currentState="draft" />
      );
      
      rerender(
        <WorkflowIndicator {...defaultProps} currentState="review" />
      );
      
      const stateIndicator = getByTestId('state-indicator');
      expect(stateIndicator.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should provide hints for transition buttons', () => {
      const availableTransitions = [
        { to: 'published', label: 'Publish' }
      ];
      
      const { getByText } = render(
        <WorkflowIndicator {...defaultProps} availableTransitions={availableTransitions} />
      );
      
      const publishButton = getByText('Publish');
      expect(publishButton.props.accessibilityHint).toBe('Change workflow state to Published');
    });
  });
});