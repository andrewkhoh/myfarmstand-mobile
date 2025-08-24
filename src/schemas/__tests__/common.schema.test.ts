/**
 * Common Schema Tests
 * Following MyFarmstand Mobile Architectural Patterns
 */

import { z } from 'zod';
import {
  ApiResponseSchema,
  PaginatedResponseSchema,
  DataStateSchema,
  ListDataStateSchema,
  BaseErrorSchema,
  AuthErrorSchema,
  MutationErrorSchema,
  ServiceOperationResultSchema,
  ValidationErrorDetailSchema,
  ValidationErrorResponseSchema,
  SuccessResponseSchema,
  ServiceResponseSchema,
  SupabaseRpcResponseSchema,
  DbOperationResultSchema,
  BatchOperationResultSchema,
  HealthCheckResponseSchema,
  CacheResponseSchema,
  SearchResponseSchema,
  FileUploadResponseSchema
} from '../common.schema';

describe('Common Schema Tests', () => {
  // 1️⃣ API Response Schema Tests
  describe('API Response Schema', () => {
    it('should validate successful API response', () => {
      const TestDataSchema = z.object({
        id: z.string(),
        name: z.string()
      });
      
      const ResponseSchema = ApiResponseSchema(TestDataSchema);
      
      const response = {
        data: { id: '123', name: 'Test' },
        success: true,
        message: 'Operation successful'
      };

      const result = ResponseSchema.parse(response);
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('123');
      expect(result.message).toBe('Operation successful');
    });

    it('should validate error API response', () => {
      const ResponseSchema = ApiResponseSchema(z.null());
      
      const response = {
        data: null,
        success: false,
        error: 'Something went wrong'
      };

      const result = ResponseSchema.parse(response);
      
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Something went wrong');
    });

    it('should handle optional fields', () => {
      const ResponseSchema = ApiResponseSchema(z.string());
      
      const response = {
        data: 'test',
        success: true
        // message and error omitted
      };

      const result = ResponseSchema.parse(response);
      
      expect(result.data).toBe('test');
      expect(result.message).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  // 2️⃣ Paginated Response Schema Tests
  describe('Paginated Response Schema', () => {
    it('should validate correct pagination', () => {
      const ItemSchema = z.object({ id: z.string() });
      const PageSchema = PaginatedResponseSchema(ItemSchema);
      
      const response = {
        data: [{ id: '1' }, { id: '2' }, { id: '3' }],
        total: 10,
        page: 1,
        limit: 3,
        hasMore: true,
        totalPages: 4
      };

      const result = PageSchema.parse(response);
      
      expect(result.data).toHaveLength(3);
      expect(result.hasMore).toBe(true);
      expect(result.totalPages).toBe(4);
    });

    it('should validate last page correctly', () => {
      const ItemSchema = z.object({ id: z.string() });
      const PageSchema = PaginatedResponseSchema(ItemSchema);
      
      const response = {
        data: [{ id: '10' }],
        total: 10,
        page: 4,
        limit: 3,
        hasMore: false,
        totalPages: 4
      };

      const result = PageSchema.parse(response);
      
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('should reject invalid totalPages calculation', () => {
      const ItemSchema = z.object({ id: z.string() });
      const PageSchema = PaginatedResponseSchema(ItemSchema);
      
      const response = {
        data: [{ id: '1' }],
        total: 10,
        page: 1,
        limit: 3,
        hasMore: true,
        totalPages: 2 // Should be 4
      };

      expect(() => PageSchema.parse(response))
        .toThrow('Total pages must equal ceil(total / limit)');
    });

    it('should reject invalid hasMore calculation', () => {
      const ItemSchema = z.object({ id: z.string() });
      const PageSchema = PaginatedResponseSchema(ItemSchema);
      
      const response = {
        data: [{ id: '1' }, { id: '2' }, { id: '3' }],
        total: 10,
        page: 1,
        limit: 3,
        hasMore: false, // Should be true
        totalPages: 4
      };

      expect(() => PageSchema.parse(response))
        .toThrow('hasMore must be true when page < totalPages');
    });

    it('should reject invalid data array length', () => {
      const ItemSchema = z.object({ id: z.string() });
      const PageSchema = PaginatedResponseSchema(ItemSchema);
      
      const response = {
        data: [{ id: '1' }, { id: '2' }], // Should have 3 items
        total: 10,
        page: 1,
        limit: 3,
        hasMore: true,
        totalPages: 4
      };

      expect(() => PageSchema.parse(response))
        .toThrow('Data array length must match expected items for current page');
    });
  });

  // 3️⃣ Data State Schema Tests
  describe('Data State Schemas', () => {
    it('should validate loading state', () => {
      const StateSchema = DataStateSchema(z.string());
      
      const state = {
        data: null,
        loading: true,
        error: null
      };

      const result = StateSchema.parse(state);
      
      expect(result.loading).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should validate data loaded state', () => {
      const StateSchema = DataStateSchema(z.object({ id: z.string() }));
      
      const state = {
        data: { id: '123' },
        loading: false,
        error: null,
        lastFetch: new Date()
      };

      const result = StateSchema.parse(state);
      
      expect(result.data?.id).toBe('123');
      expect(result.loading).toBe(false);
      expect(result.lastFetch).toBeInstanceOf(Date);
    });

    it('should validate error state', () => {
      const StateSchema = DataStateSchema(z.string());
      
      const state = {
        data: null,
        loading: false,
        error: 'Failed to fetch'
      };

      const result = StateSchema.parse(state);
      
      expect(result.error).toBe('Failed to fetch');
      expect(result.loading).toBe(false);
    });

    it('should validate list data state', () => {
      const ListSchema = ListDataStateSchema(z.object({ id: z.string() }));
      
      const state = {
        data: [{ id: '1' }, { id: '2' }],
        loading: false,
        error: null,
        hasMore: true,
        page: 1
      };

      const result = ListSchema.parse(state);
      
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.page).toBe(1);
    });
  });

  // 4️⃣ Error Schema Tests
  describe('Error Schemas', () => {
    it('should validate base error', () => {
      const error = {
        message: 'Something went wrong',
        userMessage: 'Please try again later',
        code: 'ERR_001'
      };

      const result = BaseErrorSchema.parse(error);
      
      expect(result.message).toBe('Something went wrong');
      expect(result.userMessage).toBe('Please try again later');
      expect(result.code).toBe('ERR_001');
    });

    it('should validate auth error', () => {
      const error = {
        message: 'Invalid credentials',
        type: 'authentication' as const,
        code: 'AUTH_001'
      };

      const result = AuthErrorSchema.parse(error);
      
      expect(result.message).toBe('Invalid credentials');
      expect(result.type).toBe('authentication');
    });

    it('should validate mutation error', () => {
      const error = {
        message: 'Update failed',
        operationType: 'UPDATE',
        metadata: { entityId: '123', field: 'name' }
      };

      const result = MutationErrorSchema.parse(error);
      
      expect(result.operationType).toBe('UPDATE');
      expect(result.metadata?.entityId).toBe('123');
    });

    it('should validate validation error details', () => {
      const errorDetail = {
        field: 'email',
        message: 'Invalid email format',
        value: 'not-an-email',
        code: 'INVALID_FORMAT'
      };

      const result = ValidationErrorDetailSchema.parse(errorDetail);
      
      expect(result.field).toBe('email');
      expect(result.message).toBe('Invalid email format');
    });

    it('should validate validation error response', () => {
      const response = {
        success: false as const,
        error: 'Validation failed',
        validationErrors: [
          { field: 'email', message: 'Required' },
          { field: 'name', message: 'Too short' }
        ]
      };

      const result = ValidationErrorResponseSchema.parse(response);
      
      expect(result.success).toBe(false);
      expect(result.validationErrors).toHaveLength(2);
    });
  });

  // 5️⃣ Service Operation Schema Tests
  describe('Service Operation Schemas', () => {
    it('should validate successful operation', () => {
      const ResultSchema = ServiceOperationResultSchema(z.object({ id: z.string() }));
      
      const result = {
        success: true,
        data: { id: '123' },
        message: 'Created successfully',
        timestamp: '2025-01-01T00:00:00Z'
      };

      const parsed = ResultSchema.parse(result);
      
      expect(parsed.success).toBe(true);
      expect(parsed.data?.id).toBe('123');
    });

    it('should validate failed operation', () => {
      const ResultSchema = ServiceOperationResultSchema(z.string());
      
      const result = {
        success: false,
        error: 'Operation failed'
      };

      const parsed = ResultSchema.parse(result);
      
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Operation failed');
      expect(parsed.data).toBeUndefined();
    });

    it('should validate success response', () => {
      const SuccessSchema = SuccessResponseSchema(z.object({ id: z.string() }));
      
      const response = {
        success: true as const,
        data: { id: '123' },
        message: 'Success'
      };

      const result = SuccessSchema.parse(response);
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('123');
    });

    it('should validate service response union', () => {
      const ResponseSchema = ServiceResponseSchema(z.object({ id: z.string() }));
      
      // Success case
      const successResponse = {
        success: true as const,
        data: { id: '123' }
      };
      
      const successResult = ResponseSchema.parse(successResponse);
      expect(successResult.success).toBe(true);
      
      // Error case
      const errorResponse = {
        success: false as const,
        error: 'Validation failed',
        validationErrors: [{ field: 'name', message: 'Required' }]
      };
      
      const errorResult = ResponseSchema.parse(errorResponse);
      expect(errorResult.success).toBe(false);
    });
  });

  // 6️⃣ Database Operation Schema Tests
  describe('Database Operation Schemas', () => {
    it('should validate Supabase RPC response', () => {
      const RpcSchema = SupabaseRpcResponseSchema(z.object({ count: z.number() }));
      
      const response = {
        data: { count: 42 },
        error: null
      };

      const result = RpcSchema.parse(response);
      
      expect(result.data?.count).toBe(42);
      expect(result.error).toBeNull();
    });

    it('should validate Supabase error response', () => {
      const RpcSchema = SupabaseRpcResponseSchema(z.any());
      
      const response = {
        data: null,
        error: {
          message: 'Database error',
          details: 'Connection failed',
          hint: 'Check connection string',
          code: 'DB_001'
        }
      };

      const result = RpcSchema.parse(response);
      
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Database error');
    });

    it('should validate DB operation result', () => {
      const DbSchema = DbOperationResultSchema(z.array(z.object({ id: z.string() })));
      
      const result = {
        data: [{ id: '1' }, { id: '2' }],
        error: null,
        count: 2
      };

      const parsed = DbSchema.parse(result);
      
      expect(parsed.data).toHaveLength(2);
      expect(parsed.count).toBe(2);
    });
  });

  // 7️⃣ Batch Operation Schema Tests
  describe('Batch Operation Schema', () => {
    it('should validate successful batch operation', () => {
      const BatchSchema = BatchOperationResultSchema(z.object({ id: z.string() }));
      
      const result = {
        success: true,
        results: [
          { success: true, data: { id: '1' } },
          { success: true, data: { id: '2' } },
          { success: false, error: 'Failed' }
        ],
        totalProcessed: 3,
        successCount: 2,
        errorCount: 1,
        errors: ['Failed to process item 3']
      };

      const parsed = BatchSchema.parse(result);
      
      expect(parsed.totalProcessed).toBe(3);
      expect(parsed.successCount).toBe(2);
      expect(parsed.errorCount).toBe(1);
    });

    it('should reject invalid count calculations', () => {
      const BatchSchema = BatchOperationResultSchema(z.string());
      
      const result = {
        success: true,
        results: [{ success: true, data: 'test' }],
        totalProcessed: 3, // Doesn't match results length
        successCount: 1,
        errorCount: 0 // Success + error != total
      };

      expect(() => BatchSchema.parse(result))
        .toThrow(/Success count \+ error count must equal total processed|Results array length must equal total processed/);
    });
  });

  // 8️⃣ Health Check Schema Tests
  describe('Health Check Schema', () => {
    it('should validate healthy status', () => {
      const health = {
        status: 'healthy' as const,
        timestamp: '2025-01-01T00:00:00Z',
        services: {
          database: { status: 'up' as const, responseTime: 15 },
          cache: { status: 'up' as const, responseTime: 5 },
          api: { status: 'up' as const }
        },
        version: '1.0.0',
        uptime: 3600
      };

      const result = HealthCheckResponseSchema.parse(health);
      
      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('up');
      expect(result.uptime).toBe(3600);
    });

    it('should validate degraded status', () => {
      const health = {
        status: 'degraded' as const,
        timestamp: '2025-01-01T00:00:00Z',
        services: {
          database: { status: 'up' as const },
          cache: { status: 'down' as const, error: 'Connection timeout' }
        }
      };

      const result = HealthCheckResponseSchema.parse(health);
      
      expect(result.status).toBe('degraded');
      expect(result.services.cache.status).toBe('down');
      expect(result.services.cache.error).toBe('Connection timeout');
    });
  });

  // 9️⃣ Cache Response Schema Tests
  describe('Cache Response Schema', () => {
    it('should validate cached response', () => {
      const CacheSchema = CacheResponseSchema(z.object({ value: z.string() }));
      
      const response = {
        data: { value: 'cached data' },
        cached: true,
        cacheKey: 'product:123',
        expiresAt: '2025-01-01T01:00:00Z',
        lastModified: '2025-01-01T00:00:00Z'
      };

      const result = CacheSchema.parse(response);
      
      expect(result.cached).toBe(true);
      expect(result.data.value).toBe('cached data');
      expect(result.cacheKey).toBe('product:123');
    });

    it('should validate fresh response', () => {
      const CacheSchema = CacheResponseSchema(z.string());
      
      const response = {
        data: 'fresh data',
        cached: false
      };

      const result = CacheSchema.parse(response);
      
      expect(result.cached).toBe(false);
      expect(result.data).toBe('fresh data');
    });
  });

  // 🔟 Search Response Schema Tests
  describe('Search Response Schema', () => {
    it('should validate search results', () => {
      const SearchSchema = SearchResponseSchema(z.object({ id: z.string(), name: z.string() }));
      
      const response = {
        results: [
          { id: '1', name: 'Apple' },
          { id: '2', name: 'Banana' }
        ],
        query: 'fruit',
        total: 10,
        page: 1,
        limit: 2,
        hasMore: true,
        facets: {
          category: [
            { value: 'fruits', count: 8 },
            { value: 'vegetables', count: 2 }
          ]
        },
        searchTime: 125
      };

      const result = SearchSchema.parse(response);
      
      expect(result.results).toHaveLength(2);
      expect(result.query).toBe('fruit');
      expect(result.facets?.category).toHaveLength(2);
      expect(result.searchTime).toBe(125);
    });

    it('should handle search without facets', () => {
      const SearchSchema = SearchResponseSchema(z.object({ id: z.string() }));
      
      const response = {
        results: [{ id: '1' }],
        query: 'test',
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false
      };

      const result = SearchSchema.parse(response);
      
      expect(result.facets).toBeUndefined();
      expect(result.searchTime).toBeUndefined();
    });
  });

  // 1️⃣1️⃣ File Upload Response Schema Tests
  describe('File Upload Response Schema', () => {
    it('should validate successful upload', () => {
      const response = {
        success: true,
        file: {
          id: 'file-123',
          filename: 'image-123.jpg',
          originalName: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          url: 'https://example.com/uploads/image-123.jpg',
          uploadedAt: '2025-01-01T00:00:00Z'
        }
      };

      const result = FileUploadResponseSchema.parse(response);
      
      expect(result.success).toBe(true);
      expect(result.file?.id).toBe('file-123');
      expect(result.file?.size).toBe(1024000);
    });

    it('should validate upload error', () => {
      const response = {
        success: false,
        error: 'File too large'
      };

      const result = FileUploadResponseSchema.parse(response);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('File too large');
      expect(result.file).toBeUndefined();
    });
  });
});