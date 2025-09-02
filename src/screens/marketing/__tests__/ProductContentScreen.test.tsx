import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert, Keyboard } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';

// Mock the screen (doesn't exist yet - RED phase)
const ProductContentScreen = jest.fn(() => null);
jest.mock('../ProductContentScreen', () => ({
  default: jest.fn(() => null)
}));

// Mock content workflow hooks
jest.mock('@/hooks/marketing/useContentWorkflow', () => ({
  useContentWorkflow: jest.fn(() => ({
    currentState: 'draft',
    availableTransitions: ['submit_for_review', 'schedule'],
    transitionTo: jest.fn(),
    history: [
      { state: 'draft', timestamp: '2025-01-15T10:00:00Z', user: 'John Doe' }
    ],
    canEdit: true,
    isTransitioning: false
  }))
}));

jest.mock('@/hooks/marketing/useProductContent', () => ({
  useProductContent: jest.fn(() => ({
    content: {
      id: '1',
      title: 'Summer Collection Launch',
      body: 'Discover our exciting new summer collection...',
      images: ['image1.jpg', 'image2.jpg'],
      seoKeywords: ['summer', 'fashion', 'collection'],
      publishDate: null,
      status: 'draft'
    },
    isLoading: false,
    isError: false,
    save: jest.fn(),
    publish: jest.fn(),
    saveDraft: jest.fn(),
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
    updateSEO: jest.fn()
  }))
}));

jest.mock('@/hooks/marketing/useAutoSave', () => ({
  useAutoSave: jest.fn(() => ({
    lastSaved: new Date().toISOString(),
    isSaving: false,
    isDirty: false,
    triggerSave: jest.fn()
  }))
}));

// Mock image picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn()
}));

// Mock rich text editor
jest.mock('@/components/RichTextEditor', () => ({
  __esModule: true,
  default: jest.fn(({ onChange, value, placeholder }) => null)
}));

// Mock keyboard
jest.spyOn(Keyboard, 'dismiss');

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

describe('ProductContentScreen', () => {
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
  
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <ProductContentScreen {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };
  
  describe('Content Editor', () => {
    it('should render title input field', async () => {
      const { getByTestId, getByPlaceholderText } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('content-title-input')).toBeTruthy();
        expect(getByPlaceholderText('Enter content title')).toBeTruthy();
      });
    });
    
    it('should handle title changes', async () => {
      const { getByTestId } = renderScreen();
      const { saveDraft } = require('@/hooks/marketing/useProductContent').useProductContent();
      
      await waitFor(() => {
        const titleInput = getByTestId('content-title-input');
        fireEvent.changeText(titleInput, 'New Product Launch');
      });
      
      await waitFor(() => {
        expect(saveDraft).toHaveBeenCalledWith({ title: 'New Product Launch' });
      });
    });
    
    it('should render rich text editor', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('rich-text-editor')).toBeTruthy();
      });
    });
    
    it('should show formatting toolbar', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('format-bold')).toBeTruthy();
        expect(getByTestId('format-italic')).toBeTruthy();
        expect(getByTestId('format-underline')).toBeTruthy();
        expect(getByTestId('format-heading')).toBeTruthy();
        expect(getByTestId('format-list')).toBeTruthy();
        expect(getByTestId('format-link')).toBeTruthy();
      });
    });
    
    it('should apply text formatting', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const boldButton = getByTestId('format-bold');
        fireEvent.press(boldButton);
        expect(getByTestId('rich-text-editor').props.style).toContainEqual(
          expect.objectContaining({ fontWeight: 'bold' })
        );
      });
    });
    
    it('should handle content body changes', async () => {
      const { getByTestId } = renderScreen();
      const { saveDraft } = require('@/hooks/marketing/useProductContent').useProductContent();
      
      await waitFor(() => {
        const editor = getByTestId('rich-text-editor');
        fireEvent(editor, 'onChangeText', 'New content body text');
      });
      
      expect(saveDraft).toHaveBeenCalledWith({ body: 'New content body text' });
    });
    
    it('should show character count', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('character-count')).toBeTruthy();
        expect(getByText(/\d+ characters/)).toBeTruthy();
      });
    });
  });
  
  describe('Image Management', () => {
    it('should display image gallery', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('image-gallery')).toBeTruthy();
        const images = getAllByTestId(/image-item-/);
        expect(images).toHaveLength(2);
      });
    });
    
    it('should open image picker on add button press', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const addImageButton = getByTestId('add-image-button');
        fireEvent.press(addImageButton);
      });
      
      expect(getByTestId('image-source-modal')).toBeTruthy();
    });
    
    it('should handle camera selection', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      (ImagePicker.launchCamera as jest.Mock).mockImplementation((options, callback) => {
        callback({ assets: [{ uri: 'camera-image.jpg' }] });
      });
      
      await waitFor(() => {
        fireEvent.press(getByTestId('add-image-button'));
        fireEvent.press(getByText('Take Photo'));
      });
      
      expect(ImagePicker.launchCamera).toHaveBeenCalled();
    });
    
    it('should handle gallery selection', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      (ImagePicker.launchImageLibrary as jest.Mock).mockImplementation((options, callback) => {
        callback({ assets: [{ uri: 'gallery-image.jpg' }] });
      });
      
      await waitFor(() => {
        fireEvent.press(getByTestId('add-image-button'));
        fireEvent.press(getByText('Choose from Gallery'));
      });
      
      expect(ImagePicker.launchImageLibrary).toHaveBeenCalled();
    });
    
    it('should show upload progress', async () => {
      const { getByTestId } = renderScreen();
      const { uploadImage } = require('@/hooks/marketing/useProductContent').useProductContent();
      
      uploadImage.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
      
      await waitFor(() => {
        expect(getByTestId('upload-progress')).toBeTruthy();
        expect(getByTestId('progress-bar')).toBeTruthy();
      });
    });
    
    it('should handle image deletion', async () => {
      const { getByTestId } = renderScreen();
      const { deleteImage } = require('@/hooks/marketing/useProductContent').useProductContent();
      
      await waitFor(() => {
        const deleteButton = getByTestId('delete-image-0');
        fireEvent.press(deleteButton);
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Image',
        'Are you sure you want to delete this image?',
        expect.any(Array)
      );
      
      // Simulate confirmation
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      alertCall[2][1].onPress(); // Press "Delete" button
      
      expect(deleteImage).toHaveBeenCalledWith('image1.jpg');
    });
    
    it('should reorder images with drag and drop', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const image1 = getByTestId('image-item-0');
        fireEvent(image1, 'onDragStart');
        fireEvent(image1, 'onDragEnd', { index: 1 });
      });
      
      expect(getByTestId('image-item-0').props.source).toContain('image2.jpg');
    });
    
    it('should preview image on tap', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const image = getByTestId('image-item-0');
        fireEvent.press(image);
      });
      
      expect(getByTestId('image-preview-modal')).toBeTruthy();
      expect(getByTestId('preview-image')).toBeTruthy();
    });
  });
  
  describe('SEO Management', () => {
    it('should display SEO keywords section', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('seo-section')).toBeTruthy();
        expect(getByText('SEO Keywords')).toBeTruthy();
      });
    });
    
    it('should show existing keywords as chips', async () => {
      const { getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        const keywordChips = getAllByTestId(/keyword-chip-/);
        expect(keywordChips).toHaveLength(3);
      });
    });
    
    it('should add new keyword', async () => {
      const { getByTestId } = renderScreen();
      const { updateSEO } = require('@/hooks/marketing/useProductContent').useProductContent();
      
      await waitFor(() => {
        const keywordInput = getByTestId('keyword-input');
        fireEvent.changeText(keywordInput, 'new-keyword');
        fireEvent.submitEditing(keywordInput);
      });
      
      expect(updateSEO).toHaveBeenCalledWith({
        keywords: ['summer', 'fashion', 'collection', 'new-keyword']
      });
    });
    
    it('should remove keyword on chip delete', async () => {
      const { getByTestId } = renderScreen();
      const { updateSEO } = require('@/hooks/marketing/useProductContent').useProductContent();
      
      await waitFor(() => {
        const deleteButton = getByTestId('delete-keyword-0');
        fireEvent.press(deleteButton);
      });
      
      expect(updateSEO).toHaveBeenCalledWith({
        keywords: ['fashion', 'collection']
      });
    });
    
    it('should show keyword suggestions', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        const keywordInput = getByTestId('keyword-input');
        fireEvent.changeText(keywordInput, 'sum');
      });
      
      expect(getByText('summer sale')).toBeTruthy();
      expect(getByText('summer collection')).toBeTruthy();
    });
    
    it('should validate keyword length', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        const keywordInput = getByTestId('keyword-input');
        fireEvent.changeText(keywordInput, 'a');
        fireEvent.submitEditing(keywordInput);
      });
      
      expect(getByText('Keyword must be at least 2 characters')).toBeTruthy();
    });
  });
  
  describe('Content Workflow', () => {
    it('should display current workflow state', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('workflow-status')).toBeTruthy();
        expect(getByText('Draft')).toBeTruthy();
      });
    });
    
    it('should show available transitions', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('workflow-actions')).toBeTruthy();
        expect(getByText('Submit for Review')).toBeTruthy();
        expect(getByText('Schedule')).toBeTruthy();
      });
    });
    
    it('should handle submit for review', async () => {
      const { getByText } = renderScreen();
      const { transitionTo } = require('@/hooks/marketing/useContentWorkflow').useContentWorkflow();
      
      await waitFor(() => {
        fireEvent.press(getByText('Submit for Review'));
      });
      
      expect(transitionTo).toHaveBeenCalledWith('submit_for_review');
    });
    
    it('should show workflow history', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('workflow-history-button'));
      });
      
      expect(getByTestId('workflow-history-modal')).toBeTruthy();
      expect(getByText('Draft - John Doe')).toBeTruthy();
    });
    
    it('should disable editing when not permitted', async () => {
      require('@/hooks/marketing/useContentWorkflow').useContentWorkflow.mockReturnValue({
        canEdit: false,
        currentState: 'published'
      });
      
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const titleInput = getByTestId('content-title-input');
        expect(titleInput.props.editable).toBe(false);
      });
    });
    
    it('should show transition loading state', async () => {
      require('@/hooks/marketing/useContentWorkflow').useContentWorkflow.mockReturnValue({
        isTransitioning: true
      });
      
      const { getByTestId } = renderScreen();
      
      expect(getByTestId('transition-spinner')).toBeTruthy();
    });
  });
  
  describe('Auto-save Functionality', () => {
    it('should display auto-save indicator', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('autosave-indicator')).toBeTruthy();
        expect(getByText(/Last saved/)).toBeTruthy();
      });
    });
    
    it('should trigger auto-save on content change', async () => {
      const { getByTestId } = renderScreen();
      const { triggerSave } = require('@/hooks/marketing/useAutoSave').useAutoSave();
      
      await waitFor(() => {
        const titleInput = getByTestId('content-title-input');
        fireEvent.changeText(titleInput, 'Updated Title');
      });
      
      await waitFor(() => {
        expect(triggerSave).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
    
    it('should show saving indicator', async () => {
      require('@/hooks/marketing/useAutoSave').useAutoSave.mockReturnValue({
        isSaving: true,
        lastSaved: null
      });
      
      const { getByTestId, getByText } = renderScreen();
      
      expect(getByTestId('saving-spinner')).toBeTruthy();
      expect(getByText('Saving...')).toBeTruthy();
    });
    
    it('should show dirty state indicator', async () => {
      require('@/hooks/marketing/useAutoSave').useAutoSave.mockReturnValue({
        isDirty: true,
        lastSaved: new Date().toISOString()
      });
      
      const { getByTestId } = renderScreen();
      
      expect(getByTestId('unsaved-changes-indicator')).toBeTruthy();
    });
  });
  
  describe('Publishing Options', () => {
    it('should show publish button when in draft', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('publish-button')).toBeTruthy();
      });
    });
    
    it('should open scheduling modal', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('schedule-button'));
      });
      
      expect(getByTestId('schedule-modal')).toBeTruthy();
      expect(getByText('Schedule Publication')).toBeTruthy();
    });
    
    it('should handle date selection for scheduling', async () => {
      const { getByTestId } = renderScreen();
      const { publish } = require('@/hooks/marketing/useProductContent').useProductContent();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('schedule-button'));
        const datePicker = getByTestId('schedule-date-picker');
        fireEvent(datePicker, 'onDateChange', new Date('2025-02-01'));
        fireEvent.press(getByTestId('confirm-schedule'));
      });
      
      expect(publish).toHaveBeenCalledWith({
        scheduledDate: expect.any(Date)
      });
    });
    
    it('should validate required fields before publishing', async () => {
      require('@/hooks/marketing/useProductContent').useProductContent.mockReturnValue({
        content: { title: '', body: '' }
      });
      
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('publish-button'));
      });
      
      expect(getByText('Title is required')).toBeTruthy();
      expect(getByText('Content body is required')).toBeTruthy();
    });
  });
  
  describe('Navigation', () => {
    it('should show back button in header', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('back-button')).toBeTruthy();
      });
    });
    
    it('should confirm before leaving with unsaved changes', async () => {
      require('@/hooks/marketing/useAutoSave').useAutoSave.mockReturnValue({
        isDirty: true
      });
      
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('back-button'));
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before leaving?',
        expect.any(Array)
      );
    });
    
    it('should navigate to preview screen', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('preview-button'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('ContentPreview', {
        content: expect.any(Object)
      });
    });
  });
  
  describe('Loading and Error States', () => {
    it('should show loading state', async () => {
      require('@/hooks/marketing/useProductContent').useProductContent.mockReturnValue({
        isLoading: true
      });
      
      const { getByTestId } = renderScreen();
      
      expect(getByTestId('content-loading')).toBeTruthy();
    });
    
    it('should display error message', async () => {
      require('@/hooks/marketing/useProductContent').useProductContent.mockReturnValue({
        isError: true,
        error: new Error('Failed to load content')
      });
      
      const { getByText } = renderScreen();
      
      expect(getByText('Failed to load content')).toBeTruthy();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = renderScreen();
      
      await waitFor(() => {
        expect(getByLabelText('Content Title')).toBeTruthy();
        expect(getByLabelText('Content Body Editor')).toBeTruthy();
        expect(getByLabelText('Add Image')).toBeTruthy();
        expect(getByLabelText('SEO Keywords')).toBeTruthy();
      });
    });
    
    it('should announce state changes', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const announcement = getByTestId('screen-reader-announcement');
        fireEvent.press(getByTestId('publish-button'));
        expect(announcement).toHaveTextContent('Content published successfully');
      });
    });
    
    it('should support keyboard navigation', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const titleInput = getByTestId('content-title-input');
        expect(titleInput.props.accessibilityRole).toBe('text');
        expect(titleInput.props.accessibilityHint).toBe('Enter the title for your content');
      });
    });
  });
});