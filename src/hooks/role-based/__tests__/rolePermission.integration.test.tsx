import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserRole } from '../useUserRole';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';
import { 
  RolePermissionTransformSchema,
  CreateRolePermissionSchema,
  ROLE_PERMISSIONS
} from '../../../schemas/role-based/rolePermission.schemas';

// Mock ValidationMonitor (following architectural pattern)
jest.mock('../../../utils/validationMonitor');

// Mock Supabase config for integration testing
jest.mock('../../../config/supabase', () => ({
  supabaseClient: {
    from: jest.fn()
  }
}));

// Mock useCurrentUser for hook integration
jest.mock('../../useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 'integration-user-123' } })
}));

import { supabaseClient } from '../../../config/supabase';
import { ValidationMonitor } from '../../../utils/validationMonitor';

const mockSupabase = supabaseClient as jest.Mocked<typeof supabaseClient>;

describe('Role Permission Integration Tests - Phase 1', () => {
  let queryClient: QueryClient;
  
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false }, 
        mutations: { retry: false } 
      }
    });
    return ({ children }: { children: any }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  // Helper function to create proper mock chains
  const setupMockChain = (finalMethod: string, mockResult: any) => {
    const mockFinal = jest.fn().mockResolvedValue(mockResult);
    const createChainLink = () => ({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: mockFinal,
      single: mockFinal
    });
    
    mockSupabase.from.mockReturnValue(createChainLink() as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient?.clear();
  });

  // Integration Test 1: Complete end-to-end flow (Database → Service → Hook)
  it('should handle complete end-to-end role fetching flow', async () => {
    // Step 1: Mock database response with snake_case fields
    const mockDatabaseResponse = {
      id: 'integration-role-123',
      user_id: 'integration-user-456',
      role_type: 'inventory_staff',
      permissions: ['view_inventory', 'update_stock'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    setupMockChain('maybeSingle', {
      data: mockDatabaseResponse,
      error: null
    });

    // Step 2: Use hook (which calls service, which transforms schema)
    const { result } = renderHook(() => useUserRole('integration-user-456'), {
      wrapper: createWrapper()
    });

    // Step 3: Wait for complete flow to finish
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Step 4: Verify the complete transformation chain worked
    const transformedResult = result.current.data;
    
    // Verify schema transformation (snake_case → camelCase)
    expect(transformedResult?.id).toBe('integration-role-123');
    expect(transformedResult?.userId).toBe('integration-user-456');  // user_id → userId
    expect(transformedResult?.roleType).toBe('inventory_staff');      // role_type → roleType
    expect(transformedResult?.permissions).toEqual(['view_inventory', 'update_stock']);
    expect(transformedResult?.isActive).toBe(true);                  // is_active → isActive
    expect(transformedResult?.createdAt).toBeDefined();              // created_at → createdAt
    expect(transformedResult?.updatedAt).toBeDefined();              // updated_at → updatedAt

    // Step 5: Verify service layer was called correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');

    // Step 6: Verify ValidationMonitor tracked the success
    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
      service: 'rolePermissionService',
      pattern: 'transformation_schema',
      operation: 'getUserRole'
    });

    // Step 7: Verify query key factory integration
    expect(result.current.queryKey).toEqual(['roles', 'user', 'integration-user-456']);
  });

  // Integration Test 2: Permission checking with role-based permissions
  it('should integrate role-based permission checking end-to-end', async () => {
    // Step 1: Mock user role in database
    const mockInventoryStaffRole = {
      id: 'perm-test-123',
      user_id: 'perm-user-456',
      role_type: 'inventory_staff',
      permissions: ['custom_permission'], // Custom permission in addition to role-based
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    setupMockChain('maybeSingle', {
      data: mockInventoryStaffRole,
      error: null
    });

    // Step 2: Test role-based permission (should have view_inventory from ROLE_PERMISSIONS)
    const hasRolePermission = await RolePermissionService.hasPermission('perm-user-456', 'view_inventory');
    expect(hasRolePermission).toBe(true);

    // Step 3: Test custom permission
    const hasCustomPermission = await RolePermissionService.hasPermission('perm-user-456', 'custom_permission');
    expect(hasCustomPermission).toBe(true);

    // Step 4: Test non-existent permission
    const hasInvalidPermission = await RolePermissionService.hasPermission('perm-user-456', 'non_existent_permission');
    expect(hasInvalidPermission).toBe(false);

    // Step 5: Verify permission constants are properly integrated
    expect(ROLE_PERMISSIONS.inventory_staff).toContain('view_inventory');
    expect(ROLE_PERMISSIONS.inventory_staff).toContain('update_stock');
  });

  // Integration Test 3: Error handling across all layers
  it('should handle errors gracefully across schema, service, and hook layers', async () => {
    // Step 1: Mock database error
    setupMockChain('maybeSingle', {
      data: null,
      error: new Error('Database connection failed')
    });

    // Step 2: Test service layer error handling
    const serviceResult = await RolePermissionService.getUserRole('error-user-456');
    expect(serviceResult).toBeNull(); // Graceful degradation

    // Step 3: Test hook layer error handling
    const { result } = renderHook(() => useUserRole('error-user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      // Hook should handle service errors gracefully
      expect(result.current.data).toBeNull();
    });

    // Step 4: Verify error was recorded by ValidationMonitor
    expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
      context: 'RolePermissionService.getUserRole',
      errorMessage: 'Database connection failed',
      errorCode: 'ROLE_FETCH_FAILED',
      validationPattern: 'transformation_schema'
    });
  });

  // Integration Test 4: Schema validation with malformed data
  it('should handle malformed data through validation pipeline', async () => {
    // Step 1: Mock malformed database response
    const malformedData = {
      id: 'malformed-123',
      user_id: 'test-user',
      role_type: 'inventory_staff',
      permissions: 'not-an-array', // Wrong type - should be array
      is_active: 'not-a-boolean',  // Wrong type - should be boolean
      created_at: 'invalid-date',   // Invalid date format
      updated_at: null
    };

    setupMockChain('maybeSingle', {
      data: malformedData,
      error: null
    });

    // Step 2: Service should handle validation failure gracefully
    const result = await RolePermissionService.getUserRole('malformed-user');
    expect(result).toBeNull();

    // Step 3: Verify validation error was recorded
    expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
  });

  // Integration Test 5: Create role flow (Input schema → Service → Database schema)
  it('should handle role creation with input validation end-to-end', async () => {
    // Step 1: Valid input (follows CreateRolePermissionSchema)
    const validInput = {
      userId: 'create-user-789',
      roleType: 'marketing_staff' as const,
      permissions: ['view_products', 'update_product_content']
    };

    // Step 2: Mock database creation response
    const mockCreatedRole = {
      id: 'created-role-123',
      user_id: 'create-user-789',
      role_type: 'marketing_staff',
      permissions: ['view_products', 'update_product_content'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: mockCreatedRole,
      error: null
    });

    // Step 3: Create role through service
    const result = await RolePermissionService.createUserRole(validInput);

    // Step 4: Verify complete transformation
    expect(result?.userId).toBe('create-user-789');
    expect(result?.roleType).toBe('marketing_staff');
    expect(result?.permissions).toEqual(['view_products', 'update_product_content']);

    // Step 5: Verify success was recorded
    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
      service: 'rolePermissionService',
      pattern: 'transformation_schema',
      operation: 'createUserRole'
    });
  });

  // Integration Test 6: Resilient processing with mixed valid/invalid data
  it('should handle resilient processing with partial failures', async () => {
    // Step 1: Mock mixed data (some valid, some invalid)
    const mixedRoleData = [
      {
        id: 'valid-1',
        user_id: 'user-1',
        role_type: 'inventory_staff',
        permissions: ['view_inventory'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'invalid-1',
        invalid_field: 'bad data'
        // Missing required fields
      },
      {
        id: 'valid-2',
        user_id: 'user-2',
        role_type: 'marketing_staff',
        permissions: [],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    mockSupabase.from().select().order.mockResolvedValue({
      data: mixedRoleData,
      error: null
    });

    // Step 2: Process through resilient service method
    const result = await RolePermissionService.getAllUserRoles();

    // Step 3: Verify resilient processing worked
    expect(result.success).toHaveLength(2);  // 2 valid items processed
    expect(result.errors).toHaveLength(1);   // 1 invalid item skipped
    expect(result.totalProcessed).toBe(2);   // Only valid items counted

    // Step 4: Verify valid items were transformed correctly
    expect(result.success[0].userId).toBe('user-1');
    expect(result.success[0].roleType).toBe('inventory_staff');
    expect(result.success[1].userId).toBe('user-2');
    expect(result.success[1].roleType).toBe('marketing_staff');
  });

  // Integration Test 7: Cache invalidation integration
  it('should integrate with React Query cache management correctly', async () => {
    // Step 1: Set up initial data
    const mockRole = {
      id: 'cache-role-123',
      user_id: 'cache-user-456',
      role_type: 'executive',
      permissions: ['view_all_analytics'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    setupMockChain('maybeSingle', {
      data: mockRole,
      error: null
    });

    // Step 2: Initial fetch
    const { result } = renderHook(() => useUserRole('cache-user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Step 3: Verify data is cached
    const cachedData = queryClient.getQueryData(['roles', 'user', 'cache-user-456']);
    expect(cachedData).toBeDefined();

    // Step 4: Verify query key structure for proper cache management
    expect(result.current.queryKey).toEqual(['roles', 'user', 'cache-user-456']);
  });

  // Integration Test 8: Type safety across all layers
  it('should maintain type safety from database to hook interface', async () => {
    const mockTypedRole = {
      id: 'type-safe-123',
      user_id: 'type-user-456',
      role_type: 'admin' as const,
      permissions: ['manage_users', 'view_all_analytics'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    setupMockChain('maybeSingle', {
      data: mockTypedRole,
      error: null
    });

    const { result } = renderHook(() => useUserRole('type-user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // TypeScript should enforce these types
    const roleData = result.current.data;
    if (roleData) {
      expect(typeof roleData.id).toBe('string');
      expect(typeof roleData.userId).toBe('string');
      expect(typeof roleData.roleType).toBe('string');
      expect(Array.isArray(roleData.permissions)).toBe(true);
      expect(typeof roleData.isActive).toBe('boolean');
      expect(typeof roleData.createdAt).toBe('string');
      expect(typeof roleData.updatedAt).toBe('string');
    }
  });

  // Integration Test 9: Permission constant integration
  it('should properly integrate permission constants with service layer', async () => {
    // Test that all role types have defined permissions
    const allRoleTypes = ['inventory_staff', 'marketing_staff', 'executive', 'admin'] as const;
    
    allRoleTypes.forEach(roleType => {
      expect(ROLE_PERMISSIONS[roleType]).toBeDefined();
      expect(ROLE_PERMISSIONS[roleType].length).toBeGreaterThan(0);
    });

    // Test specific permission mappings
    expect(ROLE_PERMISSIONS.inventory_staff).toContain('view_inventory');
    expect(ROLE_PERMISSIONS.marketing_staff).toContain('update_product_content');
    expect(ROLE_PERMISSIONS.executive).toContain('view_all_analytics');
    expect(ROLE_PERMISSIONS.admin).toContain('manage_users');
  });

  // Integration Test 10: Current user integration with hook
  it('should integrate current user detection with role fetching', async () => {
    // Since we mocked useCurrentUser to return 'integration-user-123'
    const mockCurrentUserRole = {
      id: 'current-role-123',
      user_id: 'integration-user-123',
      role_type: 'inventory_staff',
      permissions: [],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    setupMockChain('maybeSingle', {
      data: mockCurrentUserRole,
      error: null
    });

    // Call hook without userId - should use current user
    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should fetch current user's role
    expect(result.current.data?.userId).toBe('integration-user-123');
    expect(result.current.queryKey).toEqual(['roles', 'user', 'integration-user-123']);
  });
});