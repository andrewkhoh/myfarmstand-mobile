import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the component (doesn't exist yet - RED phase)
jest.mock('../ContentEditor', () => ({
  default: jest.fn(() => null)
}));

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

    it('should apply custom minHeight style', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} minHeight={200} />
      );
      const editor = getByTestId('content-editor');
      expect(editor.props.style).toMatchObject({ minHeight: 200 });
    });

    it('should render with custom styles', () => {
      const customStyle = { backgroundColor: '#f0f0f0', padding: 10 };
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} style={customStyle} />
      );
      const editor = getByTestId('content-editor');
      expect(editor.props.style).toMatchObject(customStyle);
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

    it('should respect maxLength limitation', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} maxLength={10} onChange={onChange} />
      );
      
      const input = getByTestId('content-input');
      fireEvent.changeText(input, 'This is a very long text that exceeds limit');
      
      expect(onChange).toHaveBeenCalledWith('This is a ');
    });

    it('should handle multiline input', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} multiline={true} onChange={onChange} />
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
    it('should show formatting buttons when enabled', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} enableFormatting={true} />
      );
      
      expect(getByTestId('format-bold')).toBeTruthy();
      expect(getByTestId('format-italic')).toBeTruthy();
      expect(getByTestId('format-link')).toBeTruthy();
      expect(getByTestId('format-list')).toBeTruthy();
    });

    it('should apply bold formatting to selected text', () => {
      const onFormat = jest.fn();
      const { getByTestId } = render(
        <ContentEditor 
          {...defaultProps} 
          value="Hello world"
          enableFormatting={true}
          onFormat={onFormat}
        />
      );
      
      const boldButton = getByTestId('format-bold');
      fireEvent.press(boldButton);
      
      expect(onFormat).toHaveBeenCalledWith('bold', expect.any(Object));
    });

    it('should apply italic formatting to selected text', () => {
      const onFormat = jest.fn();
      const { getByTestId } = render(
        <ContentEditor 
          {...defaultProps} 
          value="Hello world"
          enableFormatting={true}
          onFormat={onFormat}
        />
      );
      
      const italicButton = getByTestId('format-italic');
      fireEvent.press(italicButton);
      
      expect(onFormat).toHaveBeenCalledWith('italic', expect.any(Object));
    });

    it('should open link dialog when link button pressed', () => {
      const { getByTestId, getByText } = render(
        <ContentEditor {...defaultProps} enableFormatting={true} />
      );
      
      const linkButton = getByTestId('format-link');
      fireEvent.press(linkButton);
      
      expect(getByText('Add Link')).toBeTruthy();
    });

    it('should insert link with URL and text', async () => {
      const onFormat = jest.fn();
      const { getByTestId, getByPlaceholderText } = render(
        <ContentEditor 
          {...defaultProps} 
          enableFormatting={true}
          onFormat={onFormat}
        />
      );
      
      const linkButton = getByTestId('format-link');
      fireEvent.press(linkButton);
      
      const urlInput = getByPlaceholderText('Enter URL');
      const textInput = getByPlaceholderText('Link text');
      
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.changeText(textInput, 'Example');
      
      const confirmButton = getByTestId('link-confirm');
      fireEvent.press(confirmButton);
      
      await waitFor(() => {
        expect(onFormat).toHaveBeenCalledWith('link', {
          url: 'https://example.com',
          text: 'Example'
        });
      });
    });

    it('should toggle list formatting', () => {
      const onFormat = jest.fn();
      const { getByTestId } = render(
        <ContentEditor 
          {...defaultProps} 
          enableFormatting={true}
          onFormat={onFormat}
        />
      );
      
      const listButton = getByTestId('format-list');
      fireEvent.press(listButton);
      
      expect(onFormat).toHaveBeenCalledWith('list', expect.any(Object));
    });

    it('should disable formatting toolbar when disabled prop is true', () => {
      const { getByTestId } = render(
        <ContentEditor 
          {...defaultProps} 
          enableFormatting={true}
          disabled={true}
        />
      );
      
      const boldButton = getByTestId('format-bold');
      expect(boldButton.props.disabled).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibilityLabel', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} accessibilityLabel="Content input field" />
      );
      
      const input = getByTestId('content-input');
      expect(input.props.accessibilityLabel).toBe('Content input field');
    });

    it('should announce character limit to screen readers', () => {
      const { getByTestId } = render(
        <ContentEditor 
          {...defaultProps} 
          value="Test"
          maxLength={100}
          showCharCount={true}
        />
      );
      
      const charCount = getByTestId('char-count');
      expect(charCount.props.accessibilityLabel).toBe('4 of 100 characters used');
    });

    it('should have appropriate accessibility role', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} />
      );
      
      const input = getByTestId('content-input');
      expect(input.props.accessibilityRole).toBe('text');
    });

    it('should indicate when content is required', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} required={true} />
      );
      
      const input = getByTestId('content-input');
      expect(input.props.accessibilityHint).toContain('required');
    });
  });

  describe('edge cases', () => {
    it('should handle empty value gracefully', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} value={null} />
      );
      
      const input = getByTestId('content-input');
      expect(input.props.value).toBe('');
    });

    it('should handle undefined onChange', () => {
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} onChange={undefined} />
      );
      
      const input = getByTestId('content-input');
      expect(() => {
        fireEvent.changeText(input, 'Text');
      }).not.toThrow();
    });

    it('should handle special characters in content', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} onChange={onChange} />
      );
      
      const input = getByTestId('content-input');
      const specialChars = '!@#$%^&*()_+{}[]|\\:";\'<>?,./';
      fireEvent.changeText(input, specialChars);
      
      expect(onChange).toHaveBeenCalledWith(specialChars);
    });

    it('should handle emoji input', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <ContentEditor {...defaultProps} onChange={onChange} />
      );
      
      const input = getByTestId('content-input');
      fireEvent.changeText(input, 'Hello 👋 World 🌍');
      
      expect(onChange).toHaveBeenCalledWith('Hello 👋 World 🌍');
    });
  });
});