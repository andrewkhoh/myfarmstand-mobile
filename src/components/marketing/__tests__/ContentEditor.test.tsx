import React, { useState } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import ContentEditor from '../ContentEditor';

describe('ContentEditor', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    placeholder: 'Enter content...',
    maxLength: 5000,
    minHeight: 100,
    testID: 'content-editor'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with placeholder text', () => {
      const { getByPlaceholderText } = render(
        <ContentEditor {...defaultProps} />
      );
      expect(getByPlaceholderText('Enter content...')).toBeTruthy();
    });

    it('should display initial value', () => {
      const { getByText } = render(
        <ContentEditor {...defaultProps} value="Initial content" />
      );
      expect(getByText('Initial content')).toBeTruthy();
    });

    it('should show character count when enabled', () => {
      const { getByText } = render(
        <ContentEditor {...defaultProps} value="Test" showCharCount={true} />
      );
      expect(getByText('4 / 5000')).toBeTruthy();
    });

    it('should apply custom styles', () => {
      const customStyle = { backgroundColor: '#f0f0f0' };
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} style={customStyle} />
      );
      const editor = getByTestId('content-editor');
      expect(editor.props.style).toMatchObject(customStyle);
    });

    it('should set minimum height', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} minHeight={200} />
      );
      const editor = getByTestId('content-editor');
      expect(editor.props.style.minHeight).toBe(200);
    });
  });

  describe('text input', () => {
    it('should call onChange with new text', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} onChange={onChange} />
      );
      
      const input = getByTestId('content-input');
      fireEvent.changeText(input, 'New content');
      
      expect(onChange).toHaveBeenCalledWith('New content');
    });

    it('should respect maxLength constraint', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} maxLength={10} onChange={onChange} />
      );
      
      const input = getByTestId('content-input');
      fireEvent.changeText(input, 'This is way too long');
      
      expect(onChange).toHaveBeenCalledWith('This is wa');
    });

    it('should handle multiline input', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} onChange={onChange} multiline={true} />
      );
      
      const input = getByTestId('content-input');
      fireEvent.changeText(input, 'Line 1\nLine 2\nLine 3');
      
      expect(onChange).toHaveBeenCalledWith('Line 1\nLine 2\nLine 3');
    });

    it('should call onFocus when focused', () => {
      const onFocus = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} onFocus={onFocus} />
      );
      
      const input = getByTestId('content-input');
      fireEvent(input, 'focus');
      
      expect(onFocus).toHaveBeenCalled();
    });

    it('should call onBlur when blurred', () => {
      const onBlur = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} onBlur={onBlur} />
      );
      
      const input = getByTestId('content-input');
      fireEvent(input, 'blur');
      
      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('formatting toolbar', () => {
    it('should show toolbar when enabled', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} showToolbar={true} />
      );
      
      expect(getByTestId('editor-toolbar')).toBeTruthy();
      expect(getByTestId('bold-button')).toBeTruthy();
      expect(getByTestId('italic-button')).toBeTruthy();
      expect(getByTestId('link-button')).toBeTruthy();
    });

    it('should apply bold formatting', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} showToolbar={true} onChange={onChange} value="" />
      );
      
      const boldButton = getByTestId('bold-button');
      fireEvent.press(boldButton);
      
      expect(onChange).toHaveBeenCalledWith('**bold text**');
    });

    it('should apply italic formatting', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} showToolbar={true} onChange={onChange} value="" />
      );
      
      const italicButton = getByTestId('italic-button');
      fireEvent.press(italicButton);
      
      expect(onChange).toHaveBeenCalledWith('*italic text*');
    });

    it('should insert links', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} showToolbar={true} onChange={onChange} value="" />
      );
      
      const linkButton = getByTestId('link-button');
      fireEvent.press(linkButton);
      
      expect(onChange).toHaveBeenCalledWith('[link text](url)');
    });

    it('should handle undo', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} showToolbar={true} onChange={onChange} value="test" />
      );
      
      const undoButton = getByTestId('undo-button');
      fireEvent.press(undoButton);
      
      expect(onChange).toHaveBeenCalledWith('tes');
    });

    it('should handle redo', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} showToolbar={true} onChange={onChange} value="test" />
      );
      
      const redoButton = getByTestId('redo-button');
      fireEvent.press(redoButton);
      
      expect(onChange).toHaveBeenCalledWith('test ');
    });
  });

  describe('accessibility', () => {
    it('should show warning when approaching character limit', () => {
      const { getByTestId, getByText } = render(
        <ContentEditor {...defaultProps} value={'a'.repeat(4501)} maxLength={5000} />
      );
      
      const input = getByTestId('content-input');
      fireEvent(input, 'focus');
      
      expect(getByText('Approaching character limit')).toBeTruthy();
    });

    it('should have accessible toolbar buttons', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} showToolbar={true} />
      );
      
      const boldButton = getByTestId('bold-button');
      expect(boldButton.props.accessibilityLabel).toBe('B');
      expect(boldButton.props.accessibilityRole).toBe('button');
    });

    it('should display content properly', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} value="Test content" />
      );
      
      const display = getByTestId('content-display');
      expect(display.props.children).toBe('Test content');
    });
  });

  describe('error handling', () => {
    it('should display error message when provided', () => {
      const { getByText } = render(
        <ContentEditor {...defaultProps} error="Content is required" />
      );
      
      expect(getByText('Content is required')).toBeTruthy();
    });

    it('should apply error styling when in error state', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} error="Error" />
      );
      
      const editor = getByTestId('content-editor');
      expect(editor.props.style.borderColor).toBe('#ff0000');
    });
  });

  describe('auto-save functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto-save content at specified intervals', async () => {
      const onAutoSave = jest.fn();
      const onChange = jest.fn();
      
      // Create a wrapper component to control the value
      const TestWrapper = () => {
        const [value, setValue] = useState('');
        return (
          <ContentEditor 
            {...defaultProps} 
            value={value}
            onChange={(text) => {
              setValue(text);
              onChange(text);
            }}
            autoSave={true} 
            autoSaveInterval={1000} 
            onAutoSave={onAutoSave} 
          />
        );
      };
      
      const { getByTestId } = render(<TestWrapper />);
      
      const input = getByTestId('content-input');
      
      // Change text to trigger auto-save timer
      fireEvent.changeText(input, 'Auto-save test');
      
      // Verify onChange was called
      expect(onChange).toHaveBeenCalledWith('Auto-save test');
      
      // Fast-forward time to trigger auto-save
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(onAutoSave).toHaveBeenCalledWith('Auto-save test');
    });

    it('should show auto-save indicator', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} autoSave={true} />
      );
      
      expect(getByTestId('auto-save-indicator')).toBeTruthy();
    });
  });
});