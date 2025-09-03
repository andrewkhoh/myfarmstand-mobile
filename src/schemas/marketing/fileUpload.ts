import { z } from 'zod';

export const FileType = z.enum([
  'image',
  'video',
  'document',
  'spreadsheet',
  'presentation',
  'archive',
  'other'
]);

export type FileTypeType = z.infer<typeof FileType>;

export const UploadStatus = z.enum([
  'pending',
  'uploading',
  'processing',
  'completed',
  'failed'
]);

export type UploadStatusType = z.infer<typeof UploadStatus>;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export const FileMetadataSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
  format: z.string().optional(),
  colorSpace: z.string().optional(),
  bitrate: z.number().positive().optional(),
  frameRate: z.number().positive().optional(),
  pages: z.number().int().positive().optional()
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;

export const FileUploadSchema = z.object({
  id: z.string().uuid({ message: 'File ID must be a valid UUID' }),
  filename: z.string()
    .min(1, { message: 'Filename is required' })
    .max(255, { message: 'Filename must not exceed 255 characters' })
    .regex(/^[^<>:"/\\|?*]+$/, { message: 'Filename contains invalid characters' }),
  originalName: z.string()
    .min(1)
    .max(255),
  mimeType: z.string()
    .min(1, { message: 'MIME type is required' }),
  size: z.number()
    .int()
    .positive({ message: 'File size must be positive' })
    .max(MAX_VIDEO_SIZE, { message: `File size must not exceed ${MAX_VIDEO_SIZE / 1024 / 1024}MB` }),
  type: FileType,
  url: z.string()
    .url({ message: 'File URL must be valid' })
    .refine(
      url => url.startsWith('https://'),
      { message: 'File URL must use HTTPS protocol' }
    ),
  thumbnailUrl: z.string()
    .url()
    .refine(
      url => url.startsWith('https://'),
      { message: 'Thumbnail URL must use HTTPS protocol' }
    )
    .optional(),
  status: UploadStatus,
  metadata: FileMetadataSchema.optional(),
  uploadedBy: z.string().uuid({ message: 'Uploader ID must be a valid UUID' }),
  uploadedAt: z.string().datetime({ message: 'Upload date must be in ISO datetime format' }),
  processingStartedAt: z.string().datetime().optional(),
  processingCompletedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  retryCount: z.number().int().nonnegative().default(0),
  checksum: z.string().optional(),
  contentHash: z.string().optional()
}).refine(
  data => {
    if (data.type === 'image' && !ALLOWED_IMAGE_TYPES.includes(data.mimeType)) {
      return false;
    }
    if (data.type === 'video' && !ALLOWED_VIDEO_TYPES.includes(data.mimeType)) {
      return false;
    }
    return true;
  },
  {
    message: 'Invalid MIME type for file type',
    path: ['mimeType']
  }
).refine(
  data => {
    if (data.type === 'image' && data.size > MAX_IMAGE_SIZE) {
      return false;
    }
    if (data.type === 'video' && data.size > MAX_VIDEO_SIZE) {
      return false;
    }
    if (!['image', 'video'].includes(data.type) && data.size > MAX_FILE_SIZE) {
      return false;
    }
    return true;
  },
  {
    message: 'File size exceeds maximum allowed for this file type',
    path: ['size']
  }
).refine(
  data => {
    if (data.status === 'failed' && !data.error) {
      return false;
    }
    return true;
  },
  {
    message: 'Failed uploads must have an error message',
    path: ['error']
  }
);

export type FileUpload = z.infer<typeof FileUploadSchema>;

export const FileUploadCreateSchema = z.object({
  filename: z.string()
    .min(1)
    .max(255)
    .regex(/^[^<>:"/\\|?*]+$/),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  uploadedBy: z.string().uuid()
});

export type FileUploadCreate = z.infer<typeof FileUploadCreateSchema>;

export const FileUploadUrlSchema = z.object({
  uploadUrl: z.string()
    .url()
    .refine(
      url => url.startsWith('https://'),
      { message: 'Upload URL must use HTTPS protocol' }
    ),
  fileId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  maxSize: z.number().positive(),
  allowedMimeTypes: z.array(z.string()).min(1),
  headers: z.record(z.string()).optional()
});

export type FileUploadUrl = z.infer<typeof FileUploadUrlSchema>;

export const BatchFileUploadSchema = z.object({
  files: z.array(FileUploadCreateSchema)
    .min(1, { message: 'At least one file is required' })
    .max(10, { message: 'Maximum 10 files can be uploaded at once' }),
  category: z.string().optional(),
  tags: z.array(z.string()).default([])
});

export type BatchFileUpload = z.infer<typeof BatchFileUploadSchema>;