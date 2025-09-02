import { z } from 'zod';

export const FileType = z.enum(['image', 'video', 'document', 'csv', 'pdf']);
export const UploadStatus = z.enum(['pending', 'uploading', 'completed', 'failed']);

export type FileTypeEnum = z.infer<typeof FileType>;
export type UploadStatusEnum = z.infer<typeof UploadStatus>;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'text/csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FileUploadSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileType: FileType,
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
  uploadUrl: z.string().url(),
  uploadStatus: UploadStatus,
  uploadedBy: z.string().uuid(),
  uploadedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional()
}).refine(
  data => {
    if (data.uploadUrl) {
      return data.uploadUrl.startsWith('https://');
    }
    return true;
  },
  {
    message: "Upload URL must use HTTPS",
    path: ['uploadUrl']
  }
).refine(
  data => data.fileSize <= MAX_FILE_SIZE,
  {
    message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    path: ['fileSize']
  }
).refine(
  data => {
    const allAllowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];
    return allAllowedTypes.includes(data.mimeType);
  },
  {
    message: "Invalid mime type for file upload",
    path: ['mimeType']
  }
);

export type FileUpload = z.infer<typeof FileUploadSchema>;

export const FileUploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: FileType,
  mimeType: z.string(),
  fileSize: z.number().int().positive()
}).refine(
  data => data.fileSize <= MAX_FILE_SIZE,
  {
    message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    path: ['fileSize']
  }
);

export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;

export const PreSignedUrlSchema = z.object({
  uploadUrl: z.string().url(),
  uploadId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  headers: z.record(z.string(), z.string()).optional(),
  maxFileSize: z.number().int().positive()
}).refine(
  data => data.uploadUrl.startsWith('https://'),
  {
    message: "Pre-signed URL must use HTTPS",
    path: ['uploadUrl']
  }
);

export type PreSignedUrl = z.infer<typeof PreSignedUrlSchema>;

export const validateFileExtension = (fileName: string, fileType: FileTypeEnum): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  
  const validExtensions: Record<FileTypeEnum, string[]> = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    video: ['mp4', 'webm', 'ogg'],
    document: ['pdf', 'doc', 'docx'],
    csv: ['csv'],
    pdf: ['pdf']
  };
  
  return validExtensions[fileType]?.includes(extension) ?? false;
};

export const FileValidationSchema = z.object({
  fileName: z.string(),
  fileType: FileType,
  fileSize: z.number().int().positive()
}).refine(
  data => validateFileExtension(data.fileName, data.fileType),
  {
    message: "File extension does not match file type",
    path: ['fileName']
  }
);