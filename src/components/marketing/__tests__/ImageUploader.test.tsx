import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
  ImagePickerResponse: jest.fn()
}));

import ImageUploader from '../ImageUploader';

describe('ImageUploader', () => {
  const defaultProps = {
    onUpload: jest.fn(),
    onError: jest.fn(),
    onDelete: jest.fn(),
    onProgress: jest.fn(),
    maxSize: 5242880, // 5MB
    acceptedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    multiple: false,
    testID: 'image-uploader'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('upload interface', () => {
    it('should show upload button', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      expect(getByTestId('upload-button')).toBeTruthy();
    });
    
    it('should show upload button with custom text', () => {
      const { getByText } = render(
        <ImageUploader {...defaultProps} uploadButtonText="Choose Image" />
      );
      expect(getByText('Choose Image')).toBeTruthy();
    });
    
    it('should open image picker on button press', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
      
      expect(require('react-native-image-picker').launchImageLibrary).toHaveBeenCalled();
    });
    
    it('should display selected image preview', async () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      
      // Simulate selecting an image
      const mockImage = { uri: 'file://test.jpg', type: 'image/jpeg', size: 1000 };
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        const preview = getByTestId('image-preview');
        expect(preview.props.source.uri).toBe('file://test.jpg');
      });
    });
    
    it('should show camera option when enabled', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} allowCamera={true} />
      );
      
      expect(getByTestId('camera-button')).toBeTruthy();
    });
    
    it('should launch camera on camera button press', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} allowCamera={true} />
      );
      
      const cameraButton = getByTestId('camera-button');
      fireEvent.press(cameraButton);
      
      expect(require('react-native-image-picker').launchCamera).toHaveBeenCalled();
    });
  });
  
  describe('upload progress', () => {
    it('should show progress bar during upload', async () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      
      // Start upload
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(getByTestId('progress-bar')).toBeTruthy();
      });
    });
    
    it('should display upload percentage', async () => {
      const { getByTestId, getByText } = render(
        <ImageUploader {...defaultProps} />
      );
      
      // Start upload
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(getByText('50%')).toBeTruthy();
      });
    });
    
    it('should call onProgress with upload progress', async () => {
      const onProgress = jest.fn();
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} onProgress={onProgress} />
      );
      
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith({
          loaded: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number)
        });
      });
    });
    
    it('should handle upload errors gracefully', async () => {
      const onError = jest.fn();
      const { getByTestId, getByText } = render(
        <ImageUploader {...defaultProps} onError={onError} />
      );
      
      // Simulate upload error
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(getByText('Upload failed')).toBeTruthy();
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
    
    it('should show retry button on error', async () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      
      // Simulate upload error
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(getByTestId('retry-button')).toBeTruthy();
      });
    });
    
    it('should allow canceling upload', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      
      // Start upload
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      const cancelButton = getByTestId('cancel-upload');
      fireEvent.press(cancelButton);
      
      expect(getByTestId('upload-button')).toBeTruthy();
    });
  });
  
  describe('gallery management', () => {
    it('should display image gallery when multiple is true', () => {
      const images = [
        { id: '1', uri: 'file://image1.jpg' },
        { id: '2', uri: 'file://image2.jpg' }
      ];
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} multiple={true} images={images} />
      );
      
      expect(getByTestId('image-gallery')).toBeTruthy();
      expect(getByTestId('gallery-image-1')).toBeTruthy();
      expect(getByTestId('gallery-image-2')).toBeTruthy();
    });
    
    it('should allow image deletion from gallery', () => {
      const onDelete = jest.fn();
      const images = [
        { id: '1', uri: 'file://image1.jpg' }
      ];
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} images={images} onDelete={onDelete} />
      );
      
      const deleteButton = getByTestId('delete-image-1');
      fireEvent.press(deleteButton);
      
      expect(onDelete).toHaveBeenCalledWith('1');
    });
    
    it('should support image reordering via drag and drop', () => {
      const onReorder = jest.fn();
      const images = [
        { id: '1', uri: 'file://image1.jpg' },
        { id: '2', uri: 'file://image2.jpg' }
      ];
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} images={images} onReorder={onReorder} />
      );
      
      const image1 = getByTestId('gallery-image-1');
      
      // Simulate drag and drop
      fireEvent(image1, 'dragStart');
      fireEvent(image1, 'dragEnd', { nativeEvent: { x: 100, y: 200 } });
      
      expect(onReorder).toHaveBeenCalledWith(['2', '1']);
    });
    
    it('should show image count indicator', () => {
      const images = [
        { id: '1', uri: 'file://image1.jpg' },
        { id: '2', uri: 'file://image2.jpg' }
      ];
      
      const { getByText } = render(
        <ImageUploader {...defaultProps} multiple={true} images={images} maxImages={5} />
      );
      
      expect(getByText('2 / 5 images')).toBeTruthy();
    });
    
    it('should disable upload when max images reached', () => {
      const images = Array(5).fill(null).map((_, i) => ({
        id: String(i),
        uri: `file://image${i}.jpg`
      }));
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} multiple={true} images={images} maxImages={5} />
      );
      
      const uploadButton = getByTestId('upload-button');
      expect(uploadButton.props.disabled).toBe(true);
    });
  });
  
  describe('validation', () => {
    it('should validate file size', async () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} maxSize={1000} onError={onError} />
      );
      
      // Select large file
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('size')
          })
        );
      });
    });
    
    it('should validate file type', async () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <ImageUploader 
          {...defaultProps} 
          acceptedTypes={['image/jpeg']}
          onError={onError}
        />
      );
      
      // Select wrong file type
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('type')
          })
        );
      });
    });
    
    it('should show validation error messages', async () => {
      const { getByTestId, getByText } = render(
        <ImageUploader {...defaultProps} maxSize={1000} />
      );
      
      // Select large file
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(getByText(/file size exceeds/i)).toBeTruthy();
      });
    });
  });
  
  describe('accessibility', () => {
    it('should have proper accessibilityLabel for upload button', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      
      const uploadButton = getByTestId('upload-button');
      expect(uploadButton.props.accessibilityLabel).toBe('Upload image');
    });
    
    it('should announce upload progress to screen readers', async () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        const progressBar = getByTestId('progress-bar');
        expect(progressBar.props.accessibilityValue).toEqual({
          min: 0,
          max: 100,
          now: expect.any(Number)
        });
      });
    });
    
    it('should provide accessibility hints for gallery images', () => {
      const images = [{ id: '1', uri: 'file://image1.jpg' }];
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} images={images} />
      );
      
      const galleryImage = getByTestId('gallery-image-1');
      expect(galleryImage.props.accessibilityHint).toBe('Double tap to view, long press to delete');
    });
  });
});
