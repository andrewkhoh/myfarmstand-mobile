import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the component (doesn't exist yet - RED phase)
jest.mock('../ImageUploader', () => ({
  default: jest.fn(() => null)
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
}));

import ImageUploader from '../ImageUploader';

describe('ImageUploader', () => {
  const defaultProps = {
    onImageSelect: jest.fn(),
    onUpload: jest.fn(),
    onError: jest.fn(),
    onProgress: jest.fn(),
    onDelete: jest.fn(),
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB
    acceptedTypes: ['image/jpeg', 'image/png'],
    gallery: [],
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

    it('should show upload options when button pressed', () => {
      const { getByTestId, getByText } = render(
        <ImageUploader {...defaultProps} />
      );
      
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
      
      expect(getByText('Choose from Library')).toBeTruthy();
      expect(getByText('Take Photo')).toBeTruthy();
    });

    it('should open image picker when library option selected', async () => {
      const onImageSelect = jest.fn();
      const { getByTestId, getByText } = render(
        <ImageUploader {...defaultProps} onImageSelect={onImageSelect} />
      );
      
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
      
      const libraryOption = getByText('Choose from Library');
      fireEvent.press(libraryOption);
      
      await waitFor(() => {
        expect(onImageSelect).toHaveBeenCalled();
      });
    });

    it('should open camera when camera option selected', async () => {
      const onImageSelect = jest.fn();
      const { getByTestId, getByText } = render(
        <ImageUploader {...defaultProps} onImageSelect={onImageSelect} />
      );
      
      const uploadButton = getByTestId('upload-button');
      fireEvent.press(uploadButton);
      
      const cameraOption = getByText('Take Photo');
      fireEvent.press(cameraOption);
      
      await waitFor(() => {
        expect(onImageSelect).toHaveBeenCalled();
      });
    });

    it('should display selected image preview', () => {
      const selectedImage = {
        uri: 'file://image.jpg',
        fileName: 'image.jpg',
        fileSize: 1024,
        type: 'image/jpeg'
      };
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} selectedImage={selectedImage} />
      );
      
      const preview = getByTestId('image-preview');
      expect(preview.props.source).toEqual({ uri: 'file://image.jpg' });
    });

    it('should support multiple image selection', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} multiple={true} />
      );
      
      const uploadButton = getByTestId('upload-button');
      expect(uploadButton.props.accessibilityHint).toContain('multiple');
    });
  });

  describe('upload progress', () => {
    it('should show progress bar during upload', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} isUploading={true} />
      );
      
      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('should display upload percentage', () => {
      const { getByText } = render(
        <ImageUploader {...defaultProps} isUploading={true} uploadProgress={45} />
      );
      
      expect(getByText('45%')).toBeTruthy();
    });

    it('should call onProgress with upload updates', async () => {
      const onProgress = jest.fn();
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} onProgress={onProgress} />
      );
      
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
          loaded: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number)
        }));
      });
    });

    it('should show cancel button during upload', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} isUploading={true} />
      );
      
      expect(getByTestId('cancel-upload')).toBeTruthy();
    });

    it('should handle upload cancellation', () => {
      const onCancel = jest.fn();
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} isUploading={true} onCancel={onCancel} />
      );
      
      const cancelButton = getByTestId('cancel-upload');
      fireEvent.press(cancelButton);
      
      expect(onCancel).toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} onError={onError} />
      );
      
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      // Simulate error
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
          message: expect.any(String),
          code: expect.any(String)
        }));
      });
    });

    it('should show error message on upload failure', () => {
      const error = { message: 'Upload failed', code: 'UPLOAD_ERROR' };
      const { getByText } = render(
        <ImageUploader {...defaultProps} error={error} />
      );
      
      expect(getByText('Upload failed')).toBeTruthy();
    });
  });

  describe('gallery management', () => {
    it('should display image gallery', () => {
      const gallery = [
        { id: '1', uri: 'file://image1.jpg', name: 'Image 1' },
        { id: '2', uri: 'file://image2.jpg', name: 'Image 2' }
      ];
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} gallery={gallery} />
      );
      
      expect(getByTestId('gallery-image-1')).toBeTruthy();
      expect(getByTestId('gallery-image-2')).toBeTruthy();
    });

    it('should allow image deletion from gallery', () => {
      const onDelete = jest.fn();
      const gallery = [
        { id: '1', uri: 'file://image1.jpg', name: 'Image 1' }
      ];
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} gallery={gallery} onDelete={onDelete} />
      );
      
      const deleteButton = getByTestId('delete-image-1');
      fireEvent.press(deleteButton);
      
      expect(onDelete).toHaveBeenCalledWith('1');
    });

    it('should support image reordering via drag and drop', () => {
      const onReorder = jest.fn();
      const gallery = [
        { id: '1', uri: 'file://image1.jpg', name: 'Image 1' },
        { id: '2', uri: 'file://image2.jpg', name: 'Image 2' }
      ];
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} gallery={gallery} onReorder={onReorder} />
      );
      
      const image1 = getByTestId('gallery-image-1');
      
      // Simulate drag and drop
      fireEvent(image1, 'dragStart');
      fireEvent(image1, 'dragEnd', { 
        nativeEvent: { 
          pageX: 100, 
          pageY: 200 
        } 
      });
      
      expect(onReorder).toHaveBeenCalledWith(['2', '1']);
    });

    it('should show image count in gallery', () => {
      const gallery = [
        { id: '1', uri: 'file://image1.jpg' },
        { id: '2', uri: 'file://image2.jpg' },
        { id: '3', uri: 'file://image3.jpg' }
      ];
      
      const { getByText } = render(
        <ImageUploader {...defaultProps} gallery={gallery} />
      );
      
      expect(getByText('3 images')).toBeTruthy();
    });

    it('should support gallery pagination', () => {
      const gallery = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        uri: `file://image${i + 1}.jpg`
      }));
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} gallery={gallery} itemsPerPage={10} />
      );
      
      expect(getByTestId('next-page')).toBeTruthy();
      expect(getByTestId('page-indicator')).toBeTruthy();
    });
  });

  describe('file validation', () => {
    it('should validate file size', () => {
      const onError = jest.fn();
      const largeFile = {
        uri: 'file://large.jpg',
        fileSize: 10 * 1024 * 1024 // 10MB
      };
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} onError={onError} selectedImage={largeFile} />
      );
      
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'FILE_TOO_LARGE'
      }));
    });

    it('should validate file type', () => {
      const onError = jest.fn();
      const invalidFile = {
        uri: 'file://document.pdf',
        type: 'application/pdf'
      };
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} onError={onError} selectedImage={invalidFile} />
      );
      
      const uploadButton = getByTestId('start-upload');
      fireEvent.press(uploadButton);
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_FILE_TYPE'
      }));
    });

    it('should show validation errors inline', () => {
      const { getByText } = render(
        <ImageUploader 
          {...defaultProps} 
          validationError="File must be less than 5MB"
        />
      );
      
      expect(getByText('File must be less than 5MB')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} />
      );
      
      const uploadButton = getByTestId('upload-button');
      expect(uploadButton.props.accessibilityLabel).toBe('Upload image');
    });

    it('should announce upload progress to screen readers', () => {
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} isUploading={true} uploadProgress={50} />
      );
      
      const progressBar = getByTestId('progress-bar');
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 50
      });
    });

    it('should provide image descriptions', () => {
      const gallery = [
        { id: '1', uri: 'file://image1.jpg', name: 'Product photo', alt: 'Red shirt front view' }
      ];
      
      const { getByTestId } = render(
        <ImageUploader {...defaultProps} gallery={gallery} />
      );
      
      const image = getByTestId('gallery-image-1');
      expect(image.props.accessibilityLabel).toBe('Red shirt front view');
    });
  });
});