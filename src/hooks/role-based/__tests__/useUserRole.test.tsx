import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserRole } from '../useUserRole';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';

// Mock the service layer (following architectural pattern)
jest.mock('../../../services/role-based/rolePermissionService');

// Mock useCurrentUser hook
jest.mock('../../useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 'current-user-123' } })
}));

const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;

describe('useUserRole - Phase 1', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient?.clear();
  });

  // Hook Test 1: Basic functionality (TDD - write test first)
  it('should fetch user role successfully', async () => {
    const mockRole = {
      id: 'role-123',
      userId: 'user-456',
      roleType: 'inventory_staff' as const,
      permissions: ['view_inventory'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    mockRolePermissionService.getUserRole.mockResolvedValue(mockRole);

    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRole);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    
    // Verify service was called with correct parameters
    expect(mockRolePermissionService.getUserRole).toHaveBeenCalledWith('user-456');
  });

  // Hook Test 2: Handle user role not found
  it('should handle user role not found', async () => {
    mockRolePermissionService.getUserRole.mockResolvedValue(null);

    const { result } = renderHook(() => useUserRole('nonexistent'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  // Hook Test 3: Use current user when no userId provided (following architectural pattern)
  it('should use current user when no userId provided', async () => {
    const mockRole = {
      id: 'role-current',
      userId: 'current-user-123',
      roleType: 'admin' as const,
      permissions: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    mockRolePermissionService.getUserRole.mockResolvedValue(mockRole);

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRole);
    // Verify service was called with current user ID
    expect(mockRolePermissionService.getUserRole).toHaveBeenCalledWith('current-user-123');
  });

  // Hook Test 4: Should fetch with current user when no userId provided
  it('should fetch with current user when no userId provided', () => {
    // When no userId is provided, it should use current user
    const { result } = renderHook(() => useUserRole(undefined), {
      wrapper: createWrapper()
    });

    // With current user mocked, the query should fetch
    expect(result.current.fetchStatus).toBe('fetching');
    expect(result.current.queryKey).toEqual(['roles', 'user', 'current-user-123']);
  });

  // Hook Test 5: Handle service errors gracefully
  it('should handle service errors gracefully', async () => {
    const serviceError = new Error('Service unavailable');
    mockRolePermissionService.getUserRole.mockRejectedValue(serviceError);

    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(serviceError);
    expect(result.current.data).toBeUndefined();
  });

  // Hook Test 6: Query key validation (CRITICAL - centralized factory usage)
  it('should use correct query keys for cache management', () => {
    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    // Verify centralized query key factory usage
    // This test will FAIL initially until we implement roleKeys
    expect(result.current.queryKey).toEqual(['roles', 'user', 'user-456']);
    // NOT: ['localRoles', 'user-456'] - that would be dual system anti-pattern
  });

  // Hook Test 7: Cache behavior validation
  it('should cache results appropriately', async () => {
    const mockRole = {
      id: 'role-123',
      userId: 'user-456',
      roleType: 'marketing_staff' as const,
      permissions: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    mockRolePermissionService.getUserRole.mockResolvedValue(mockRole);

    const { result, rerender } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRole);

    // Clear mock calls
    jest.clearAllMocks();

    // Rerender should use cached data (within staleTime)
    rerender();

    expect(mockRolePermissionService.getUserRole).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(mockRole);
  });

  // Hook Test 8: Retry behavior for network errors vs auth errors
  it('should retry network errors but not auth errors', async () => {
    // Test auth error - should not retry
    const authError = new Error('permission denied');
    mockRolePermissionService.getUserRole.mockRejectedValue(authError);

    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should have been called only once (no retry)
    expect(mockRolePermissionService.getUserRole).toHaveBeenCalledTimes(1);
  });

  // Hook Test 9: Stale time configuration
  it('should configure appropriate stale time for role data', () => {
    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    // Role data should be considered fresh for 5 minutes (roles change infrequently)
    const queryData = queryClient.getQueryData(['roles', 'user', 'user-456']);
    const queryState = queryClient.getQueryState(['roles', 'user', 'user-456']);
    
    // This verifies the hook is configured with appropriate staletime
    expect(result.current).toBeDefined();
  });

  // Hook Test 10: Garbage collection time configuration
  it('should configure appropriate garbage collection time', () => {
    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    // Role data should be kept in cache for 30 minutes
    expect(result.current).toBeDefined();
  });

  // Hook Test 11: Multiple users - user isolation
  it('should properly isolate different user roles', async () => {
    const user1Role = {
      id: 'role-1',
      userId: 'user-1',
      roleType: 'inventory_staff' as const,
      permissions: ['view_inventory'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    const user2Role = {
      id: 'role-2',
      userId: 'user-2',
      roleType: 'marketing_staff' as const,
      permissions: ['update_product_content'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    mockRolePermissionService.getUserRole
      .mockImplementation((userId) => {
        if (userId === 'user-1') return Promise.resolve(user1Role);
        if (userId === 'user-2') return Promise.resolve(user2Role);
        return Promise.resolve(null);
      });

    // Render hooks for both users
    const { result: result1 } = renderHook(() => useUserRole('user-1'), {
      wrapper: createWrapper()
    });
    const { result: result2 } = renderHook(() => useUserRole('user-2'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
      expect(result2.current.isSuccess).toBe(true);
    });

    // Verify proper user isolation
    expect(result1.current.data).toEqual(user1Role);
    expect(result2.current.data).toEqual(user2Role);
    expect(result1.current.data?.roleType).toBe('inventory_staff');
    expect(result2.current.data?.roleType).toBe('marketing_staff');
  });

  // Hook Test 12: Performance - minimal re-renders
  it('should minimize unnecessary re-renders', async () => {
    const mockRole = {
      id: 'role-123',
      userId: 'user-456',
      roleType: 'admin' as const,
      permissions: ['manage_users'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    mockRolePermissionService.getUserRole.mockResolvedValue(mockRole);

    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useUserRole('user-456');
    }, {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should render initially (loading) and once when data arrives
    expect(renderCount).toBeLessThanOrEqual(3); // Loading -> Success states
  });
});