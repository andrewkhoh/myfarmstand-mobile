import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContentUpload } from '../useContentUpload';
import { uploadService } from '@/services/marketing';
import { marketingKeys } from '@/utils/queryKeys';

// Mock the services
jest.mock('@/services/marketing');

describe('useContentUpload', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default mock implementations
    (uploadService.uploadFile as jest.Mock).mockImplementation(
      (formData, config) => {
        // Get the file from formData to extract filename
        const file = formData.get('file') as File;
        const type = formData.get('type') as string;
        
        // Simulate upload progress
        if (config?.onUploadProgress) {
          setTimeout(() => {
            config.onUploadProgress({ loaded: 50, total: 100 });
          }, 50);
          setTimeout(() => {
            config.onUploadProgress({ loaded: 100, total: 100 });
          }, 100);
        }
        
        return Promise.resolve({
          url: `https://cdn.example.com/${file.name}`,
          type: type,
          size: 1024,
          filename: file.name,
        });
      }
    );
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  const mockFile = new File(['test content'], 'test.png', { type: 'image/png' });
  const mockDocument = new File(['document content'], 'test.pdf', { type: 'application/pdf' });
  
  describe('file upload', () => {
    it('should upload image file successfully', async () => {
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadProgress).toBe(0);
      
      await act(async () => {
        result.current.upload({ file: mockFile, type: 'image' });
        jest.runAllTimers(); // Advance timers to complete upload
      });
      
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      }, { timeout: 5000 });
      
      expect(result.current.uploadedFile).toBeDefined();
      expect(result.current.uploadedFile?.type).toBe('image');
      expect(result.current.uploadedFile?.url).toContain('test.png');
    });
    
    it('should upload document file successfully', async () => {
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      await act(async () => {
        result.current.upload({ file: mockDocument, type: 'document' });
        jest.runAllTimers(); // Advance timers to complete upload
      });
      
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      }, { timeout: 5000 });
      
      expect(result.current.uploadedFile).toBeDefined();
      expect(result.current.uploadedFile?.type).toBe('document');
      expect(result.current.uploadedFile?.url).toContain('test.pdf');
    });
    
    it('should track upload progress', async () => {
      let progressCallback: ((event: { loaded: number; total: number }) => void) | undefined;
      
      jest.spyOn(uploadService, 'uploadFile').mockImplementation(async (formData, options) => {
        progressCallback = options?.onUploadProgress;
        
        // Simulate progress updates
        setTimeout(() => progressCallback?.({ loaded: 500, total: 1000 }), 50);
        setTimeout(() => progressCallback?.({ loaded: 1000, total: 1000 }), 100);
        
        return new Promise(resolve => {
          setTimeout(() => resolve({
            url: 'https://cdn.example.com/file.png',
            type: 'image' as const,
            size: 1000,
            filename: 'file.png',
          }), 150);
        });
      });
      
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      await act(async () => {
        result.current.upload({ file: mockFile, type: 'image' });
      });
      
      // Check initial progress
      expect(result.current.uploadProgress).toBe(0);
      
      // Check mid-upload progress
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      
      await waitFor(() => {
        expect(result.current.uploadProgress).toBe(50);
      });
      
      // Check completion
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
    });
    
    it('should update content with uploaded file URL', async () => {
      // Set initial content data
      queryClient.setQueryData(marketingKeys.content.detail('content-1'), {
        id: 'content-1',
        title: 'Test Content',
        description: 'Description',
        workflowState: 'draft',
        imageUrls: [],
        documents: [],
        createdAt: new Date(),
        lastModified: new Date(),
        author: 'Test Author',
      });
      
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      await act(async () => {
        result.current.upload({ file: mockFile, type: 'image' });
        jest.runAllTimers(); // Run timers to complete the upload
      });
      
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
        expect(result.current.uploadedFile).toBeDefined();
      });
      
      const updatedContent = queryClient.getQueryData(marketingKeys.content.detail('content-1')) as any;
      expect(updatedContent).toBeDefined();
      expect(updatedContent.imageUrls).toHaveLength(1);
      expect(updatedContent.imageUrls[0]).toContain('test.png');
    });
    
    it('should handle upload errors', async () => {
      jest.spyOn(uploadService, 'uploadFile').mockRejectedValueOnce(new Error('Upload failed'));
      
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      await act(async () => {
        result.current.upload({ file: mockFile, type: 'image' });
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      
      expect(result.current.error?.message).toBe('Upload failed');
      expect(result.current.uploadProgress).toBe(0);
    });
    
    it('should reset progress on error', async () => {
      jest.spyOn(uploadService, 'uploadFile').mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      await act(async () => {
        result.current.upload({ file: mockFile, type: 'image' });
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      
      expect(result.current.uploadProgress).toBe(0);
    });
    
    it('should support multiple file uploads', async () => {
      queryClient.setQueryData(marketingKeys.content.detail('content-1'), {
        id: 'content-1',
        title: 'Test Content',
        description: 'Description',
        workflowState: 'draft',
        imageUrls: [],
        documents: [],
        createdAt: new Date(),
        lastModified: new Date(),
        author: 'Test Author',
      });
      
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      // Upload first file
      await act(async () => {
        result.current.upload({ file: mockFile, type: 'image' });
      });
      
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
      
      // Upload second file
      const secondFile = new File(['second'], 'second.png', { type: 'image/png' });
      await act(async () => {
        result.current.upload({ file: secondFile, type: 'image' });
      });
      
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
      
      const content = queryClient.getQueryData(marketingKeys.content.detail('content-1')) as any;
      expect(content.imageUrls).toHaveLength(2);
    });
    
    it('should reset progress after successful upload', async () => {
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      await act(async () => {
        result.current.upload({ file: mockFile, type: 'image' });
      });
      
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
      
      expect(result.current.uploadProgress).toBe(100);
      
      // Advance timers to trigger reset
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      expect(result.current.uploadProgress).toBe(0);
    });
    
    it('should cancel upload and reset state', async () => {
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      act(() => {
        result.current.upload({ file: mockFile, type: 'image' });
      });
      
      act(() => {
        result.current.cancelUpload();
      });
      
      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.error).toBeNull();
    });
    
    it('should manually reset progress', async () => {
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      await act(async () => {
        result.current.upload({ file: mockFile, type: 'image' });
      });
      
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
      
      expect(result.current.uploadProgress).toBe(100);
      
      act(() => {
        result.current.resetProgress();
      });
      
      expect(result.current.uploadProgress).toBe(0);
    });
    
    it('should use uploadAsync for promise-based upload', async () => {
      const { result } = renderHook(() => useContentUpload('content-1'), { wrapper });
      
      let uploadResult: any;
      await act(async () => {
        uploadResult = await result.current.uploadAsync({ file: mockFile, type: 'image' });
      });
      
      expect(uploadResult).toBeDefined();
      expect(uploadResult?.type).toBe('image');
    });
  });
});