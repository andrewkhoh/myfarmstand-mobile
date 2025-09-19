import { renderHook } from '@testing-library/react';
import { createWrapper, createTestQueryClient } from '../../test/test-wrapper';
import { useUserRole } from '../useUserRole';
import { useRolePermissions } from '../useRolePermissions';
import { UserRole } from '../../../types/auth';

describe('Role-Based Hooks', () => {
  const queryClient = createTestQueryClient();
  const wrapper = createWrapper(queryClient);

  beforeEach(() => {
    queryClient.clear();
  });

  describe('useUserRole', () => {
    it('should return user role information', () => {
      const { result } = renderHook(() => useUserRole(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.role).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });

    it('should provide role checking functions', () => {
      const { result } = renderHook(() => useUserRole(), { wrapper });

      expect(result.current.isRole).toBeDefined();
      expect(typeof result.current.isRole).toBe('function');
    });

    it('should check specific roles', () => {
      const { result } = renderHook(() => useUserRole(), { wrapper });

      // In test environment, these will return false without proper setup
      expect(result.current.isRole(UserRole.ADMIN)).toBe(false);
      expect(result.current.isRole(UserRole.INVENTORY_MANAGER)).toBe(false);
    });
  });

  describe('useRolePermissions', () => {
    it('should provide permission checking', () => {
      const { result } = renderHook(() => useRolePermissions(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.hasPermission).toBeDefined();
      expect(result.current.hasAllPermissions).toBeDefined();
      expect(result.current.hasAnyPermission).toBeDefined();
    });

    it('should check individual permissions', () => {
      const { result } = renderHook(() => useRolePermissions(), { wrapper });

      // Test permission checking functions exist
      expect(typeof result.current.hasPermission).toBe('function');

      // In test environment, these will return false without proper setup
      const canEdit = result.current.hasPermission('inventory.edit');
      expect(typeof canEdit).toBe('boolean');
    });

    it('should check multiple permissions', () => {
      const { result } = renderHook(() => useRolePermissions(), { wrapper });

      // Test hasAllPermissions
      const hasAll = result.current.hasAllPermissions(['inventory.view', 'inventory.edit']);
      expect(typeof hasAll).toBe('boolean');

      // Test hasAnyPermission
      const hasAny = result.current.hasAnyPermission(['inventory.view', 'inventory.edit']);
      expect(typeof hasAny).toBe('boolean');
    });

    it('should provide permissions array', () => {
      const { result } = renderHook(() => useRolePermissions(), { wrapper });

      expect(result.current.permissions).toBeDefined();
      expect(Array.isArray(result.current.permissions)).toBe(true);
    });
  });
});