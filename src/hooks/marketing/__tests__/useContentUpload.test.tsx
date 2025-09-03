import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useContentUpload } from '../useContentUpload';
import { fileUploadService } from '@/services/marketing/fileUploadService';

// Mock the file upload service
jest.mock('@/services/marketing/fileUploadService');

describe('useContentUpload', () => {
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
    (fileUploadService.uploadFile as jest.Mock) = jest.fn();
    (fileUploadService.getUploadUrl as jest.Mock) = jest.fn();
    (fileUploadService.completeUpload as jest.Mock) = jest.fn();
    (fileUploadService.cancelUpload as jest.Mock) = jest.fn();
    (fileUploadService.listFiles as jest.Mock) = jest.fn();
    (fileUploadService.deleteFile as jest.Mock) = jest.fn();
    (fileUploadService.batchUpload as jest.Mock) = jest.fn();
    (fileUploadService.getUploadProgress as jest.Mock) = jest.fn();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
  const mockUploadData = {
    id: 'upload-123',
    fileName: 'test.jpg',
    fileSize: 1024,
    contentType: 'image/jpeg',
    uploadUrl: 'https://storage.example.com/upload-123',
    status: 'pending' as const,
    progress: 0,
    createdAt: new Date()
  };
  
  describe('file upload operations', () => {
    it('should upload a single file with progress tracking', async () => {
      (fileUploadService.getUploadUrl as jest.Mock).mockResolvedValue({
        uploadUrl: 'https://storage.example.com/upload',
        uploadId: 'upload-123'
      });
      
      (fileUploadService.uploadFile as jest.Mock).mockImplementation(
        (file, options) => {
          // Simulate progress updates
          options?.onProgress?.({ loaded: 50, total: 100 });
          return Promise.resolve(mockUploadData);
        }
      );
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      let progressUpdate: number = 0;
      await act(async () => {
        await result.current.uploadFile(mockFile, {
          onProgress: (progress) => {
            progressUpdate = progress;
          }
        });
      });
      
      expect(progressUpdate).toBe(50);
      expect(fileUploadService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          onProgress: expect.any(Function)
        })
      );
    });
    
    it('should handle batch file uploads', async () => {
      const files = [
        new File(['content1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'file2.jpg', { type: 'image/jpeg' }),
        new File(['content3'], 'file3.jpg', { type: 'image/jpeg' })
      ];
      
      (fileUploadService.batchUpload as jest.Mock).mockResolvedValue([
        { ...mockUploadData, id: 'upload-1', fileName: 'file1.jpg' },
        { ...mockUploadData, id: 'upload-2', fileName: 'file2.jpg' },
        { ...mockUploadData, id: 'upload-3', fileName: 'file3.jpg' }
      ]);
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      await act(async () => {
        await result.current.batchUpload(files);
      });
      
      expect(fileUploadService.batchUpload).toHaveBeenCalledWith(files);
      expect(result.current.uploadQueue).toHaveLength(3);
    });
    
    it('should validate file size before upload', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      });
      
      const { result } = renderHook(() => useContentUpload({
        maxFileSize: 10 * 1024 * 1024 // 10MB
      }), { wrapper });
      
      const validation = result.current.validateFile(largeFile);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('File size exceeds 10MB limit');
    });
    
    it('should validate file type restrictions', async () => {
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/exe' });
      
      const { result } = renderHook(() => useContentUpload({
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
      }), { wrapper });
      
      const validation = result.current.validateFile(invalidFile);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('File type not allowed');
    });
    
    it('should handle upload cancellation', async () => {
      const abortController = new AbortController();
      
      (fileUploadService.uploadFile as jest.Mock).mockImplementation(
        () => new Promise((resolve, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
          });
        })
      );
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      act(() => {
        result.current.uploadFile(mockFile, { signal: abortController.signal });
      });
      
      await act(async () => {
        result.current.cancelUpload('upload-123');
      });
      
      expect(fileUploadService.cancelUpload).toHaveBeenCalledWith('upload-123');
    });
    
    it('should track upload progress for multiple files', async () => {
      const progressMap = new Map<string, number>();
      
      (fileUploadService.getUploadProgress as jest.Mock).mockImplementation((id) => {
        return progressMap.get(id) || 0;
      });
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      await act(async () => {
        progressMap.set('upload-1', 25);
        progressMap.set('upload-2', 50);
        progressMap.set('upload-3', 75);
        
        result.current.updateProgress('upload-1', 25);
        result.current.updateProgress('upload-2', 50);
        result.current.updateProgress('upload-3', 75);
      });
      
      expect(result.current.getOverallProgress()).toBe(50); // Average progress
    });
    
    it('should handle chunked uploads for large files', async () => {
      const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'large.mp4', {
        type: 'video/mp4'
      });
      
      (fileUploadService.uploadFile as jest.Mock).mockImplementation(
        (file, options) => {
          // Simulate chunked upload
          options?.onChunkComplete?.(1, 4); // 1 of 4 chunks
          options?.onChunkComplete?.(2, 4);
          options?.onChunkComplete?.(3, 4);
          options?.onChunkComplete?.(4, 4);
          return Promise.resolve(mockUploadData);
        }
      );
      
      const { result } = renderHook(() => useContentUpload({
        chunkSize: 5 * 1024 * 1024 // 5MB chunks
      }), { wrapper });
      
      let chunksCompleted = 0;
      await act(async () => {
        await result.current.uploadFile(largeFile, {
          onChunkComplete: () => {
            chunksCompleted++;
          }
        });
      });
      
      expect(chunksCompleted).toBe(4);
    });
    
    it('should manage upload gallery with thumbnails', async () => {
      (fileUploadService.listFiles as jest.Mock).mockResolvedValue([
        { ...mockUploadData, id: 'img-1', thumbnailUrl: 'thumb-1.jpg' },
        { ...mockUploadData, id: 'img-2', thumbnailUrl: 'thumb-2.jpg' },
        { ...mockUploadData, id: 'img-3', thumbnailUrl: 'thumb-3.jpg' }
      ]);
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      await act(async () => {
        await result.current.loadGallery('content-123');
      });
      
      expect(result.current.gallery).toHaveLength(3);
      expect(result.current.gallery[0].thumbnailUrl).toBe('thumb-1.jpg');
    });
    
    it('should handle image optimization during upload', async () => {
      const imageFile = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' });
      
      const { result } = renderHook(() => useContentUpload({
        optimize: true,
        maxDimensions: { width: 1920, height: 1080 }
      }), { wrapper });
      
      await act(async () => {
        await result.current.uploadFile(imageFile, {
          optimize: {
            quality: 0.8,
            format: 'webp'
          }
        });
      });
      
      expect(fileUploadService.uploadFile).toHaveBeenCalledWith(
        imageFile,
        expect.objectContaining({
          optimize: expect.objectContaining({
            quality: 0.8,
            format: 'webp'
          })
        })
      );
    });
    
    it('should retry failed uploads with exponential backoff', async () => {
      let attempts = 0;
      (fileUploadService.uploadFile as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockUploadData);
      });
      
      const { result } = renderHook(() => useContentUpload({
        retryAttempts: 3,
        retryDelay: 100
      }), { wrapper });
      
      await act(async () => {
        await result.current.uploadFile(mockFile);
      });
      
      expect(attempts).toBe(3);
      expect(fileUploadService.uploadFile).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('file management', () => {
    it('should delete uploaded files', async () => {
      (fileUploadService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      await act(async () => {
        await result.current.deleteFile('upload-123');
      });
      
      expect(fileUploadService.deleteFile).toHaveBeenCalledWith('upload-123');
    });
    
    it('should generate secure pre-signed URLs', async () => {
      (fileUploadService.getUploadUrl as jest.Mock).mockResolvedValue({
        uploadUrl: 'https://storage.example.com/secure-upload',
        uploadId: 'upload-456',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      });
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      const { uploadUrl, expiresAt } = await result.current.getPresignedUrl(
        'document.pdf',
        'application/pdf'
      );
      
      expect(uploadUrl).toContain('secure-upload');
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
  
  describe('error handling', () => {
    it('should handle network errors during upload', async () => {
      const error = new Error('Network timeout');
      (fileUploadService.uploadFile as jest.Mock).mockRejectedValue(error);
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.uploadFile(mockFile);
        } catch (err) {
          // Expected error
        }
      });
      
      expect(result.current.uploadError?.message).toBe('Network timeout');
    });
    
    it('should handle quota exceeded errors', async () => {
      (fileUploadService.uploadFile as jest.Mock).mockRejectedValue(
        new Error('Storage quota exceeded')
      );
      
      const { result } = renderHook(() => useContentUpload(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.uploadFile(mockFile);
        } catch (err) {
          // Expected
        }
      });
      
      expect(result.current.uploadError?.message).toContain('quota exceeded');
    });
  });
});