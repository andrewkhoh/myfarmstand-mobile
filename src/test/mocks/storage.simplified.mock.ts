/**
 * Simplified Storage Mock
 * 
 * Standalone storage mock for file operations without complex chaining.
 * Manages file storage in memory with simple test helpers.
 */

import { jest } from '@jest/globals';

interface FileObject {
  name: string;
  id: string;
  size: number;
  mimetype: string;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  metadata?: Record<string, any>;
}

interface BucketFile {
  data: Buffer | Blob | string;
  metadata: FileObject;
}

interface StorageOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  simulateNetworkDelay?: number;
}

interface UploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
  metadata?: Record<string, any>;
}

export class SimplifiedStorageMock {
  private buckets: Map<string, Map<string, BucketFile>> = new Map();
  private options: StorageOptions;
  private publicBuckets: Set<string> = new Set(['public']);
  
  constructor(options: StorageOptions = {}) {
    this.options = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      allowedMimeTypes: [],
      simulateNetworkDelay: 0,
      ...options
    };
  }
  
  /**
   * Create a bucket (for testing)
   */
  createBucket(name: string, isPublic: boolean = false) {
    if (!this.buckets.has(name)) {
      this.buckets.set(name, new Map());
    }
    if (isPublic) {
      this.publicBuckets.add(name);
    }
  }
  
  /**
   * Create the mock storage client
   */
  createClient() {
    const self = this;
    
    return {
      from: (bucket: string) => {
        // Auto-create bucket if it doesn't exist
        if (!self.buckets.has(bucket)) {
          self.buckets.set(bucket, new Map());
        }
        
        return {
          /**
           * Upload a file
           */
          upload: jest.fn().mockImplementation(async (
            path: string,
            file: Buffer | Blob | File | string,
            options?: UploadOptions
          ) => {
            // Simulate network delay
            if (self.options.simulateNetworkDelay) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateNetworkDelay)
              );
            }
            
            // Validate file size
            let fileSize = 0;
            if (file instanceof Buffer) {
              fileSize = file.length;
            } else if (file instanceof Blob || file instanceof File) {
              fileSize = file.size;
            } else if (typeof file === 'string') {
              fileSize = Buffer.byteLength(file);
            }
            
            if (fileSize > self.options.maxFileSize!) {
              return {
                data: null,
                error: { 
                  message: `File size ${fileSize} exceeds maximum allowed size ${self.options.maxFileSize}`,
                  statusCode: '413'
                }
              };
            }
            
            // Validate mime type if specified
            const mimeType = options?.contentType || 'application/octet-stream';
            if (self.options.allowedMimeTypes!.length > 0 && 
                !self.options.allowedMimeTypes!.includes(mimeType)) {
              return {
                data: null,
                error: { 
                  message: `File type ${mimeType} is not allowed`,
                  statusCode: '415'
                }
              };
            }
            
            // Check if file exists and upsert is false
            const bucketFiles = self.buckets.get(bucket)!;
            if (bucketFiles.has(path) && !options?.upsert) {
              return {
                data: null,
                error: { 
                  message: 'File already exists',
                  statusCode: '409'
                }
              };
            }
            
            // Store the file
            const fileObject: FileObject = {
              name: path.split('/').pop() || path,
              id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              size: fileSize,
              mimetype: mimeType,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              metadata: options?.metadata
            };
            
            bucketFiles.set(path, {
              data: file,
              metadata: fileObject
            });
            
            return {
              data: {
                path: `${bucket}/${path}`,
                id: fileObject.id,
                fullPath: `${bucket}/${path}`
              },
              error: null
            };
          }),
          
          /**
           * Download a file
           */
          download: jest.fn().mockImplementation(async (path: string) => {
            // Simulate network delay
            if (self.options.simulateNetworkDelay) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateNetworkDelay)
              );
            }
            
            const bucketFiles = self.buckets.get(bucket);
            if (!bucketFiles || !bucketFiles.has(path)) {
              return {
                data: null,
                error: { 
                  message: 'File not found',
                  statusCode: '404'
                }
              };
            }
            
            const file = bucketFiles.get(path)!;
            file.metadata.last_accessed_at = new Date().toISOString();
            
            return {
              data: file.data,
              error: null
            };
          }),
          
          /**
           * List files in a directory
           */
          list: jest.fn().mockImplementation(async (
            path?: string,
            options?: {
              limit?: number;
              offset?: number;
              sortBy?: { column: string; order: 'asc' | 'desc' };
              search?: string;
            }
          ) => {
            // Simulate network delay
            if (self.options.simulateNetworkDelay) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateNetworkDelay)
              );
            }
            
            const bucketFiles = self.buckets.get(bucket);
            if (!bucketFiles) {
              return {
                data: [],
                error: null
              };
            }
            
            let files: FileObject[] = [];
            
            // Filter files by path prefix
            for (const [filePath, file] of bucketFiles.entries()) {
              if (!path || filePath.startsWith(path)) {
                // Apply search filter if provided
                if (options?.search) {
                  if (!filePath.toLowerCase().includes(options.search.toLowerCase())) {
                    continue;
                  }
                }
                files.push({ ...file.metadata });
              }
            }
            
            // Sort files
            if (options?.sortBy) {
              const { column, order } = options.sortBy;
              files.sort((a, b) => {
                const aVal = (a as any)[column];
                const bVal = (b as any)[column];
                const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return order === 'asc' ? result : -result;
              });
            }
            
            // Apply pagination
            const offset = options?.offset || 0;
            const limit = options?.limit || 100;
            files = files.slice(offset, offset + limit);
            
            return {
              data: files,
              error: null
            };
          }),
          
          /**
           * Remove files
           */
          remove: jest.fn().mockImplementation(async (paths: string[]) => {
            // Simulate network delay
            if (self.options.simulateNetworkDelay) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateNetworkDelay)
              );
            }
            
            const bucketFiles = self.buckets.get(bucket);
            if (!bucketFiles) {
              return {
                data: [],
                error: null
              };
            }
            
            const removed: FileObject[] = [];
            for (const path of paths) {
              const file = bucketFiles.get(path);
              if (file) {
                removed.push(file.metadata);
                bucketFiles.delete(path);
              }
            }
            
            return {
              data: removed,
              error: null
            };
          }),
          
          /**
           * Move a file
           */
          move: jest.fn().mockImplementation(async (
            fromPath: string,
            toPath: string
          ) => {
            // Simulate network delay
            if (self.options.simulateNetworkDelay) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateNetworkDelay)
              );
            }
            
            const bucketFiles = self.buckets.get(bucket);
            if (!bucketFiles || !bucketFiles.has(fromPath)) {
              return {
                data: null,
                error: { 
                  message: 'Source file not found',
                  statusCode: '404'
                }
              };
            }
            
            if (bucketFiles.has(toPath)) {
              return {
                data: null,
                error: { 
                  message: 'Destination file already exists',
                  statusCode: '409'
                }
              };
            }
            
            const file = bucketFiles.get(fromPath)!;
            file.metadata.name = toPath.split('/').pop() || toPath;
            file.metadata.updated_at = new Date().toISOString();
            
            bucketFiles.set(toPath, file);
            bucketFiles.delete(fromPath);
            
            return {
              data: { 
                message: 'File moved successfully',
                path: `${bucket}/${toPath}`
              },
              error: null
            };
          }),
          
          /**
           * Copy a file
           */
          copy: jest.fn().mockImplementation(async (
            fromPath: string,
            toPath: string
          ) => {
            // Simulate network delay
            if (self.options.simulateNetworkDelay) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateNetworkDelay)
              );
            }
            
            const bucketFiles = self.buckets.get(bucket);
            if (!bucketFiles || !bucketFiles.has(fromPath)) {
              return {
                data: null,
                error: { 
                  message: 'Source file not found',
                  statusCode: '404'
                }
              };
            }
            
            if (bucketFiles.has(toPath)) {
              return {
                data: null,
                error: { 
                  message: 'Destination file already exists',
                  statusCode: '409'
                }
              };
            }
            
            const sourceFile = bucketFiles.get(fromPath)!;
            const newFile: BucketFile = {
              data: sourceFile.data,
              metadata: {
                ...sourceFile.metadata,
                name: toPath.split('/').pop() || toPath,
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            };
            
            bucketFiles.set(toPath, newFile);
            
            return {
              data: { 
                message: 'File copied successfully',
                path: `${bucket}/${toPath}`
              },
              error: null
            };
          }),
          
          /**
           * Get public URL for a file
           */
          getPublicUrl: (path: string) => {
            const isPublic = self.publicBuckets.has(bucket);
            
            if (!isPublic) {
              return {
                data: null,
                error: { 
                  message: 'Bucket is not public',
                  statusCode: '403'
                }
              };
            }
            
            return {
              data: {
                publicUrl: `https://test-storage.supabase.co/storage/v1/object/public/${bucket}/${path}`
              }
            };
          },
          
          /**
           * Create signed URL for temporary access
           */
          createSignedUrl: jest.fn().mockImplementation(async (
            path: string,
            expiresIn: number,
            options?: { download?: boolean | string }
          ) => {
            // Simulate network delay
            if (self.options.simulateNetworkDelay) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateNetworkDelay)
              );
            }
            
            const bucketFiles = self.buckets.get(bucket);
            if (!bucketFiles || !bucketFiles.has(path)) {
              return {
                data: null,
                error: { 
                  message: 'File not found',
                  statusCode: '404'
                }
              };
            }
            
            const signedUrl = `https://test-storage.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=${Date.now()}&expires=${expiresIn}`;
            
            return {
              data: { signedUrl },
              error: null
            };
          }),
          
          /**
           * Create signed URLs for multiple files
           */
          createSignedUrls: jest.fn().mockImplementation(async (
            paths: string[],
            expiresIn: number,
            options?: { download?: boolean | string }
          ) => {
            // Simulate network delay
            if (self.options.simulateNetworkDelay) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateNetworkDelay)
              );
            }
            
            const bucketFiles = self.buckets.get(bucket);
            if (!bucketFiles) {
              return {
                data: [],
                error: null
              };
            }
            
            const signedUrls = paths.map(path => {
              if (bucketFiles.has(path)) {
                return {
                  path,
                  signedUrl: `https://test-storage.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=${Date.now()}&expires=${expiresIn}`,
                  error: null
                };
              }
              return {
                path,
                signedUrl: null,
                error: 'File not found'
              };
            });
            
            return {
              data: signedUrls,
              error: null
            };
          })
        };
      }
    };
  }
  
  /**
   * Test helper: Add a file directly
   */
  addFile(bucket: string, path: string, data: any, metadata?: Partial<FileObject>) {
    if (!this.buckets.has(bucket)) {
      this.buckets.set(bucket, new Map());
    }
    
    const fileObject: FileObject = {
      name: path.split('/').pop() || path,
      id: `file-${Date.now()}`,
      size: data.length || 0,
      mimetype: metadata?.mimetype || 'application/octet-stream',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...metadata
    };
    
    this.buckets.get(bucket)!.set(path, {
      data,
      metadata: fileObject
    });
  }
  
  /**
   * Test helper: Get all files in a bucket
   */
  getBucketFiles(bucket: string): string[] {
    const bucketFiles = this.buckets.get(bucket);
    return bucketFiles ? Array.from(bucketFiles.keys()) : [];
  }
  
  /**
   * Test helper: Clear all storage
   */
  clearAll() {
    this.buckets.clear();
  }
  
  /**
   * Test helper: Clear a specific bucket
   */
  clearBucket(bucket: string) {
    const bucketFiles = this.buckets.get(bucket);
    if (bucketFiles) {
      bucketFiles.clear();
    }
  }
}

/**
 * Factory function for quick storage mock creation
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const storage = createStorageMock();
 * 
 * // With options
 * const storage = createStorageMock({
 *   maxFileSize: 10 * 1024 * 1024, // 10MB
 *   allowedMimeTypes: ['image/jpeg', 'image/png']
 * });
 * 
 * // Upload a file
 * const result = await storage.from('avatars').upload(
 *   'user-123.jpg',
 *   fileBuffer,
 *   { contentType: 'image/jpeg' }
 * );
 * ```
 */
export const createStorageMock = (options?: StorageOptions) => {
  const mock = new SimplifiedStorageMock(options);
  
  // Create default buckets
  mock.createBucket('avatars', true);
  mock.createBucket('products', true);
  mock.createBucket('documents', false);
  
  return mock.createClient();
};

/**
 * Export the class for advanced usage
 */
export { SimplifiedStorageMock as StorageMock };