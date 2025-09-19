import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { ServiceError, ValidationError } from './errors/ServiceError';

interface UploadOptions {
  bucket?: string;
  folder?: string;
  allowedTypes?: string[];
  maxSizeInMB?: number;
}

interface UploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

export class FileUploadService {
  private readonly defaultBucket = 'marketing-assets';
  private readonly defaultAllowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly defaultMaxSizeInMB = 10;

  /**
   * Upload a single file to Supabase Storage
   */
  async uploadFile(
    file: File | Blob,
    fileName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      const bucket = options?.bucket || this.defaultBucket;
      const folder = options?.folder || 'uploads';
      const allowedTypes = options?.allowedTypes || this.defaultAllowedTypes;
      const maxSizeInMB = options?.maxSizeInMB || this.defaultMaxSizeInMB;

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        throw new ValidationError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        );
      }

      // Validate file size
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB > maxSizeInMB) {
        throw new ValidationError(
          `File size exceeds ${maxSizeInMB}MB limit. Current size: ${fileSizeInMB.toFixed(2)}MB`
        );
      }

      // Generate unique file name
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `${folder}/${uniqueFileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new ServiceError(`Failed to upload file: ${error.message}`, 'UPLOAD_FAILED', 500);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      ValidationMonitor.recordPatternSuccess({
        service: 'FileUploadService',
        pattern: 'file_upload',
        operation: 'uploadFile',
        performanceMs: undefined,
      });

      return {
        url: publicUrl,
        path: data.path,
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'FileUploadService.uploadFile',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'FILE_UPLOAD_FAILED',
      });
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: FileList | File[],
    options?: UploadOptions
  ): Promise<UploadResult[]> {
    const filesArray = Array.from(files);
    const uploadPromises = filesArray.map((file, index) =>
      this.uploadFile(file, file.name || `file_${index}`, options)
    );

    try {
      const results = await Promise.allSettled(uploadPromises);
      const successfulUploads: UploadResult[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value);
        } else {
          console.error(`Failed to upload file ${index}:`, result.reason);
          ValidationMonitor.recordValidationError({
            context: 'FileUploadService.uploadMultiple',
            errorMessage: result.reason?.message || 'Unknown error',
            errorCode: 'FILE_UPLOAD_FAILED',
          });
        }
      });

      return successfulUploads;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'FileUploadService.uploadMultiple',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'MULTIPLE_UPLOAD_FAILED',
      });
      throw error;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string, bucket?: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket || this.defaultBucket)
        .remove([path]);

      if (error) {
        throw new ServiceError(`Failed to delete file: ${error.message}`, 'DELETE_FAILED', 500);
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'FileUploadService',
        pattern: 'file_delete',
        operation: 'deleteFile',
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'FileUploadService.deleteFile',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'FILE_DELETE_FAILED',
      });
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultiple(paths: string[], bucket?: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket || this.defaultBucket)
        .remove(paths);

      if (error) {
        throw new ServiceError(`Failed to delete files: ${error.message}`, 'DELETE_FAILED', 500);
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'FileUploadService',
        pattern: 'file_delete',
        operation: 'deleteMultiple',
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'FileUploadService.deleteMultiple',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'MULTIPLE_DELETE_FAILED',
      });
      throw error;
    }
  }

  /**
   * Get a signed URL for temporary access
   */
  async getSignedUrl(
    path: string,
    expiresIn = 3600,
    bucket?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket || this.defaultBucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new ServiceError(`Failed to create signed URL: ${error.message}`, 'SIGNED_URL_FAILED', 500);
      }

      return data.signedUrl;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'FileUploadService.getSignedUrl',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SIGNED_URL_FAILED',
      });
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(
    folder: string,
    bucket?: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ name: string; size: number; updatedAt: string }[]> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket || this.defaultBucket)
        .list(folder, {
          limit: options?.limit || 100,
          offset: options?.offset || 0,
        });

      if (error) {
        throw new ServiceError(`Failed to list files: ${error.message}`, 'LIST_FAILED', 500);
      }

      return (data || []).map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        updatedAt: file.updated_at || '',
      }));
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'FileUploadService.listFiles',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'LIST_FILES_FAILED',
      });
      throw error;
    }
  }

  /**
   * Validate image dimensions
   */
  async validateImageDimensions(
    file: File,
    requirements?: {
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      aspectRatio?: number;
    }
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const { width, height } = img;

        if (requirements?.minWidth && width < requirements.minWidth) {
          reject(new Error(`Image width must be at least ${requirements.minWidth}px`));
          return;
        }

        if (requirements?.maxWidth && width > requirements.maxWidth) {
          reject(new Error(`Image width must not exceed ${requirements.maxWidth}px`));
          return;
        }

        if (requirements?.minHeight && height < requirements.minHeight) {
          reject(new Error(`Image height must be at least ${requirements.minHeight}px`));
          return;
        }

        if (requirements?.maxHeight && height > requirements.maxHeight) {
          reject(new Error(`Image height must not exceed ${requirements.maxHeight}px`));
          return;
        }

        if (requirements?.aspectRatio) {
          const actualRatio = width / height;
          const tolerance = 0.1;
          if (Math.abs(actualRatio - requirements.aspectRatio) > tolerance) {
            reject(new Error(`Image aspect ratio must be ${requirements.aspectRatio}:1`));
            return;
          }
        }

        resolve(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for validation'));
      };

      img.src = url;
    });
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();