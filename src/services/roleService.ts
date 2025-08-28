/**
 * Role Service - User role and permissions management
 * Following established architectural patterns from docs/architectural-patterns-and-best-practices.md
 */

import { supabase } from '../config/supabase';
import { UserRole } from '../types';
import { ValidationMonitor } from '../utils/validationMonitor';
import { z } from 'zod';

// Following Pattern: Database-First Validation
const RawUserRoleSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  role: z.enum(['customer', 'staff', 'manager', 'admin', 'farmer', 'vendor']),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Following Pattern: Transformation Schema Architecture
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
  /**
   * Get user role by user ID
   * Following Pattern: Direct Supabase with Validation
   */
  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Step 1: Direct Supabase query
      const { data: rawRoleData, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Handle not found gracefully
        if (error.code === 'PGRST116') {
          // Default to customer role if no role found
          return 'customer';
        }
        throw error;
      }

      // Step 2: Validate and transform
      try {
        const roleData = UserRoleSchema.parse(rawRoleData);
        
        // Record success for monitoring
        ValidationMonitor.recordPatternSuccess({
          service: 'RoleService',
          pattern: 'transformation_schema',
          operation: 'getUserRole',
        });

        return roleData.role;
      } catch (validationError) {
        // Record validation error
        ValidationMonitor.recordValidationError({
          context: 'RoleService.getUserRole',
          errorMessage: validationError instanceof Error ? validationError.message : 'Unknown validation error',
          errorCode: 'USER_ROLE_VALIDATION_FAILED',
        });

        // Default to customer role on validation failure
        return 'customer';
      }
    } catch (error) {
      console.error('Failed to get user role:', error);
      // Following Pattern: Graceful Degradation
      return 'customer'; // Default role on error
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
   * Get all permissions for a user (by their user ID)
   * Combines user role lookup with permission retrieval
   */
  async getUserPermissions(userId: string): Promise<RolePermission[]> {
    try {
      // Step 1: Get user role
      const userRole = await this.getUserRole(userId);
      
      if (!userRole) {
        return [];
      }

      // Step 2: Get permissions for that role
      return await this.getRolePermissions(userRole);
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has a specific permission
   * Following Pattern: User-Friendly Error Messages
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.some(p => p.permission === permission);
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false; // Fail secure - deny if error
    }
  }

  /**
   * Check if user has permission for a specific resource and action
   */
  async canPerformAction(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.some(p => 
        p.resource === resource && 
        (p.action === action || p.action === '*')
      );
    } catch (error) {
      console.error('Failed to check action permission:', error);
      return false; // Fail secure
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
   * Get role hierarchy level
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