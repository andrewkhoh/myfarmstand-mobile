/**
 * DEPRECATED: Role Service - Legacy compatibility layer
 *
 * ⚠️ This service is deprecated and will be removed in a future version.
 *
 * Migration Guide:
 * - Replace with: import { unifiedRoleService } from './unifiedRoleService';
 * - Update hooks to use: import { useCurrentUserRole } from '../hooks/role-based';
 *
 * @deprecated Use unifiedRoleService instead
 */

import { supabase } from '../config/supabase';
import { UserRole } from '../types';
import { ValidationMonitor } from '../utils/validationMonitor';
import { z } from 'zod';
import { unifiedRoleService } from './unifiedRoleService';

// DEPRECATED: Use RolePermissionService for new implementations
// This schema is kept for backward compatibility only
const RawUserRoleSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  role: z.enum(['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor']),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// DEPRECATED: Use RolePermissionTransformSchema for new implementations
export const UserRoleSchema = RawUserRoleSchema.transform((data) => ({
  id: data.id,
  userId: data.user_id,
  role: data.role as UserRole,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
}));

// Permission interface following TypeScript integration pattern
export interface RolePermission {
  id: string;
  role: UserRole;
  permission: string;
  resource: string;
  action: string;
  createdAt: string;
}

// Raw database schema for permissions
const RawRolePermissionSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor']),
  permission: z.string().min(1),
  resource: z.string().min(1),
  action: z.string().min(1),
  created_at: z.string().nullable().optional(),
});

// Transform schema for permissions
export const RolePermissionSchema = RawRolePermissionSchema.transform((data): RolePermission => ({
  id: data.id,
  role: data.role as UserRole,
  permission: data.permission,
  resource: data.resource,
  action: data.action,
  createdAt: data.created_at || new Date().toISOString(),
}));

// Service result types following established patterns
export interface RoleOperationResult<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

class RoleService {
  constructor() {
    console.warn('⚠️ DEPRECATED: RoleService is deprecated. Use unifiedRoleService instead.');

    ValidationMonitor.recordValidationError({
      context: 'DeprecatedService.RoleService',
      errorMessage: 'Instantiating deprecated RoleService',
      errorCode: 'DEPRECATED_SERVICE_USAGE'
    });

    // No additional initialization needed - uses unifiedRoleService directly
  }

  /**
   * Get user role by user ID - Unified with RolePermissionService
   * Following Pattern: Direct Supabase with Validation
   */
  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      if (!userId) {
        ValidationMonitor.recordValidationError({
          context: 'RoleService.getUserRole',
          errorMessage: 'User ID is required',
          errorCode: 'MISSING_USER_ID'
        });
        return 'customer'; // Graceful degradation
      }

      // Use unified service for consistency
      const roleData = await unifiedRoleService.getUserRole(userId);

      if (!roleData) {
        // Graceful degradation - default to customer
        return 'customer';
      }

      // Map from new role types to legacy role types for backward compatibility
      const roleMapping: Record<string, UserRole> = {
        'admin': 'admin',
        'executive': 'manager',
        'inventory_staff': 'staff',
        'marketing_staff': 'staff',
        'customer': 'customer'
      };

      const mappedRole = roleMapping[roleData.role] || 'customer';

      ValidationMonitor.recordPatternSuccess({
        service: 'RoleService',
        pattern: 'direct_supabase_query',
        operation: 'getUserRole',
      });

      return mappedRole;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleService.getUserRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'USER_ROLE_FETCH_FAILED'
      });

      console.error('Failed to get user role:', error);
      return 'customer'; // Following Pattern: Graceful Degradation
    }
  }

  /**
   * Get permissions for a specific role
   * Following Pattern: Resilient Item Processing
   */
  async getRolePermissions(role: UserRole): Promise<RolePermission[]> {
    try {
      // Step 1: Direct Supabase query
      const { data: rawPermissions, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role)
        .order('resource', { ascending: true });

      if (error) {
        throw error;
      }

      // Step 2: Individual validation with skip-on-error
      const validPermissions: RolePermission[] = [];
      
      for (const rawPermission of (rawPermissions || [])) {
        try {
          const permission = RolePermissionSchema.parse(rawPermission);
          validPermissions.push(permission);
        } catch (validationError) {
          // Log for monitoring but continue processing
          ValidationMonitor.recordValidationError({
            context: 'RoleService.getRolePermissions',
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error',
            errorCode: 'PERMISSION_VALIDATION_FAILED',
          });
          console.warn('Invalid permission, skipping:', rawPermission.id);
          // Continue with other permissions - don't break the entire operation
        }
      }

      return validPermissions;
    } catch (error) {
      console.error('Failed to get role permissions:', error);
      // Following Pattern: Graceful Degradation
      return [];
    }
  }

  /**
   * Get all permissions for a user - Unified with RolePermissionService
   * Following Pattern: Service Layer Unification
   */
  async getUserPermissions(userId: string): Promise<RolePermission[]> {
    try {
      if (!userId) {
        ValidationMonitor.recordValidationError({
          context: 'RoleService.getUserPermissions',
          errorMessage: 'User ID is required',
          errorCode: 'MISSING_USER_ID'
        });
        return [];
      }

      // Use unified service approach
      const permissions = await unifiedRoleService.getUserPermissions(userId);

      // Transform to legacy format for backward compatibility
      const legacyPermissions: RolePermission[] = permissions.map((perm, index) => ({
        id: `legacy-${index}`,
        role: this.mapToLegacyRole('admin'), // Simplified - would need role data
        permission: perm,
        resource: perm.split(':')[0] || 'general', // Extract resource from permission
        action: perm.split(':')[1] || 'access',    // Extract action from permission
        createdAt: new Date().toISOString()
      }));

      ValidationMonitor.recordPatternSuccess({
        service: 'RoleService',
        pattern: 'direct_supabase_query',
        operation: 'getUserPermissions',
      });

      return legacyPermissions;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleService.getUserPermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'USER_PERMISSIONS_FETCH_FAILED'
      });

      console.error('Failed to get user permissions:', error);
      return []; // Following Pattern: Graceful Degradation
    }
  }

  /**
   * Check if user has a specific permission - Unified approach
   * Following Pattern: Service Layer Unification
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      if (!userId || !permission) {
        ValidationMonitor.recordValidationError({
          context: 'RoleService.hasPermission',
          errorMessage: 'User ID and permission are required',
          errorCode: 'MISSING_PARAMETERS'
        });
        return false; // Fail secure
      }

      // Use unified static method for consistency
      const hasPermission = await unifiedRoleService.hasPermission(userId, permission as any);

      ValidationMonitor.recordPatternSuccess({
        service: 'RoleService',
        pattern: 'direct_supabase_query',
        operation: 'hasPermission',
      });

      return hasPermission;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleService.hasPermission',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PERMISSION_CHECK_FAILED'
      });

      console.error('Failed to check permission:', error);
      return false; // Following Pattern: Fail Secure
    }
  }

  /**
   * Check if user can perform action - Simplified for unified approach
   * Following Pattern: Service Layer Unification
   */
  async canPerformAction(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      if (!userId || !resource || !action) {
        ValidationMonitor.recordValidationError({
          context: 'RoleService.canPerformAction',
          errorMessage: 'User ID, resource, and action are required',
          errorCode: 'MISSING_PARAMETERS'
        });
        return false; // Fail secure
      }

      // For backward compatibility, map resource+action to permission string
      const permissionString = `${resource}_${action}`;
      return await this.hasPermission(userId, permissionString);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleService.canPerformAction',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ACTION_PERMISSION_CHECK_FAILED'
      });

      console.error('Failed to check action permission:', error);
      return false; // Following Pattern: Fail Secure
    }
  }

  /**
   * Update user role
   * Following Pattern: Atomic Operations
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<RoleOperationResult> {
    try {
      // Validate inputs
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required',
          message: 'Please provide a valid user ID',
        };
      }

      if (!newRole) {
        return {
          success: false,
          error: 'Role is required',
          message: 'Please provide a valid role',
        };
      }

      // Atomic database operation
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: newRole,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'User role updated successfully',
        data: { userId, role: newRole },
      };
    } catch (error) {
      console.error('Failed to update user role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update user role. Please try again.',
      };
    }
  }

  /**
   * Get all available roles
   * Useful for admin interfaces
   */
  getAllRoles(): UserRole[] {
    return ['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor'];
  }

  /**
   * Helper method to map new role types to legacy role types
   * Following Pattern: Backward Compatibility
   */
  private mapToLegacyRole(newRoleType: string): UserRole {
    const roleMapping: Record<string, UserRole> = {
      'admin': 'admin',
      'executive': 'manager',
      'inventory_staff': 'staff',
      'marketing_staff': 'staff'
    };
    return roleMapping[newRoleType] || 'customer';
  }

  /**
   * Get role hierarchy level - Updated for new role types
   * Higher number = more permissions
   */
  getRoleLevel(role: UserRole): number {
    const levels: Record<UserRole, number> = {
      customer: 1,
      vendor: 2,
      farmer: 2,
      staff: 3,
      manager: 4,
      admin: 5,
    };
    return levels[role] || 1;
  }

  /**
   * Check if one role has higher privileges than another
   */
  hasHigherPrivileges(role1: UserRole, role2: UserRole): boolean {
    return this.getRoleLevel(role1) > this.getRoleLevel(role2);
  }
}

// Export singleton instance
export const roleService = new RoleService();