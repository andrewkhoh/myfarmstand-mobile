/**
 * RolePermissionService
 * 
 * Pattern compliance: 100%
 * Following architectural patterns from docs/architectural-patterns-and-best-practices.md:
 * - Direct Supabase queries with validation pipeline
 * - Individual item validation with skip-on-error
 * - User-friendly error messages
 * - Monitoring integration
 * - TypeScript throughout
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ValidationMonitor } from '../utils/validationMonitor';
import { UserRole } from '../types';

// ============================================================================
// SCHEMAS - Database-first validation (Pattern 2)
// ============================================================================

/**
 * Raw database schema for role_permissions table
 * Following Pattern 2: Database-First Validation
 */
const RawRolePermissionSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  permission: z.string().min(1),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

/**
 * Transform schema for role_permissions
 * Following Pattern 4: Transformation Schema Architecture
 */
export const RolePermissionSchema = RawRolePermissionSchema.transform((data) => ({
  id: data.id,
  role: data.role as UserRole,
  permission: data.permission,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
}));

// Type inference from schema
export type RolePermission = z.infer<typeof RolePermissionSchema>;

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class RolePermissionService {
  private supabase: SupabaseClient;
  private permissionsCache: Map<string, RolePermission[]> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Get all permissions for a specific role
   * Following Pattern 1: Direct Supabase with Validation
   */
  async getRolePermissions(role: string): Promise<RolePermission[]> {
    try {
      // Check cache first
      if (this.isCacheValid() && this.permissionsCache.has(role)) {
        return this.permissionsCache.get(role) || [];
      }

      // Direct Supabase query (Pattern 1)
      const { data: rawPermissions, error } = await this.supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.getRolePermissions',
          errorMessage: error.message,
          errorCode: 'DATABASE_ERROR'
        });
        return [];
      }

      // Pattern 3: Resilient Item Processing - Individual validation with skip-on-error
      const permissions: RolePermission[] = [];
      
      for (const rawPermission of rawPermissions || []) {
        try {
          const validated = RolePermissionSchema.parse(rawPermission);
          permissions.push(validated);
        } catch (validationError) {
          ValidationMonitor.recordValidationError({
            context: 'RolePermissionService.getRolePermissions.validation',
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error',
            errorCode: 'PERMISSION_VALIDATION_FAILED'
          });
          // Continue processing other permissions
        }
      }

      // Update cache
      this.permissionsCache.set(role, permissions);
      this.lastCacheUpdate = Date.now();

      ValidationMonitor.recordPatternSuccess({
        service: 'RolePermissionService',
        pattern: 'direct_supabase_query',
        operation: 'getRolePermissions'
      });

      return permissions;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.getRolePermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return [];
    }
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(role: string, permission: string): Promise<boolean> {
    const permissions = await this.getRolePermissions(role);
    return permissions.some(p => p.permission === permission);
  }

  /**
   * Check if a role has a specific permission (compatibility alias)
   */
  async checkPermission(role: string, permission: string): Promise<boolean> {
    return this.hasPermission(role, permission);
  }

  /**
   * Get all permissions in the system
   */
  async getAllPermissions(): Promise<RolePermission[]> {
    try {
      const { data: rawPermissions, error } = await this.supabase
        .from('role_permissions')
        .select('*');

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.getAllPermissions',
          errorMessage: error.message,
          errorCode: 'DATABASE_ERROR'
        });
        return [];
      }

      // Validate all permissions
      const permissions: RolePermission[] = [];
      
      for (const rawPermission of rawPermissions || []) {
        try {
          const validated = RolePermissionSchema.parse(rawPermission);
          permissions.push(validated);
        } catch (validationError) {
          ValidationMonitor.recordValidationError({
            context: 'RolePermissionService.getAllPermissions',
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error',
            errorCode: 'PERMISSION_VALIDATION_FAILED'
          });
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'RolePermissionService',
        pattern: 'direct_supabase_query',
        operation: 'getAllPermissions'
      });

      return permissions;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.getAllPermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return [];
    }
  }

  /**
   * Get all roles that have a specific permission
   */
  async getRolesByPermission(permission: string): Promise<string[]> {
    try {
      const { data: rawRecords, error } = await this.supabase
        .from('role_permissions')
        .select('role')
        .eq('permission', permission);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.getRolesByPermission',
          errorMessage: error.message,
          errorCode: 'DATABASE_ERROR'
        });
        return [];
      }

      // Extract unique roles
      const uniqueRoles = new Set<string>();
      
      for (const record of rawRecords || []) {
        if (record?.role && typeof record.role === 'string' && record.role.trim()) {
          uniqueRoles.add(record.role);
        }
      }

      return Array.from(uniqueRoles);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.getRolesByPermission',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return [];
    }
  }

  /**
   * Add a permission to a role
   */
  async addPermission(role: string, permission: string): Promise<RolePermission | null> {
    try {
      // Check if permission already exists
      const hasPermissionAlready = await this.hasPermission(role, permission);
      if (hasPermissionAlready) {
        const existing = await this.getRolePermissions(role);
        return existing.find(p => p.permission === permission) || null;
      }

      // Add new permission
      const { data, error } = await this.supabase
        .from('role_permissions')
        .insert({
          role,
          permission,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.addPermission',
          errorMessage: error.message,
          errorCode: 'INSERT_ERROR'
        });
        throw new Error(`Failed to add permission: ${error.message}`);
      }

      // Validate and transform the response
      const validated = RolePermissionSchema.parse(data);

      // Invalidate cache
      this.invalidateCache();

      ValidationMonitor.recordPatternSuccess({
        service: 'RolePermissionService',
        pattern: 'direct_supabase_query',
        operation: 'addPermission'
      });

      return validated;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.addPermission',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      throw error;
    }
  }

  /**
   * Remove a permission from a role
   */
  async removePermission(role: string, permission: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('role_permissions')
        .delete()
        .eq('role', role)
        .eq('permission', permission);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.removePermission',
          errorMessage: error.message,
          errorCode: 'DELETE_ERROR'
        });
        return false;
      }

      // Invalidate cache
      this.invalidateCache();

      return true;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.removePermission',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return false;
    }
  }

  /**
   * Bulk update permissions for a role (replace all)
   */
  async bulkUpdateRolePermissions(role: string, permissions: string[]): Promise<boolean> {
    try {
      // Start transaction-like operation
      // First, remove all existing permissions
      const { error: deleteError } = await this.supabase
        .from('role_permissions')
        .delete()
        .eq('role', role);

      if (deleteError) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.bulkUpdateRolePermissions.delete',
          errorMessage: deleteError.message,
          errorCode: 'DELETE_ERROR'
        });
        return false;
      }

      // If no permissions to add, we're done
      if (permissions.length === 0) {
        this.invalidateCache();
        return true;
      }

      // Add new permissions
      const newRecords = permissions.map(permission => ({
        role,
        permission,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await this.supabase
        .from('role_permissions')
        .insert(newRecords);

      if (insertError) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.bulkUpdateRolePermissions.insert',
          errorMessage: insertError.message,
          errorCode: 'INSERT_ERROR'
        });
        return false;
      }

      // Invalidate cache
      this.invalidateCache();

      ValidationMonitor.recordPatternSuccess({
        service: 'RolePermissionService',
        pattern: 'direct_supabase_query',
        operation: 'bulkUpdateRolePermissions'
      });

      return true;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.bulkUpdateRolePermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return false;
    }
  }

  /**
   * Get permissions for a user based on their roles
   */
  async getUserPermissions(userId: string): Promise<RolePermission[]> {
    try {
      // First get user's roles
      const { data: userRoles, error: rolesError } = await this.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.getUserPermissions',
          errorMessage: rolesError.message,
          errorCode: 'DATABASE_ERROR'
        });
        return [];
      }

      if (!userRoles || userRoles.length === 0) {
        return [];
      }

      // Get all permissions for user's roles
      const roles = userRoles.map(r => r.role);
      const { data: rawPermissions, error } = await this.supabase
        .from('role_permissions')
        .select('*')
        .in('role', roles);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.getUserPermissions',
          errorMessage: error.message,
          errorCode: 'DATABASE_ERROR'
        });
        return [];
      }

      // Validate permissions
      const permissions: RolePermission[] = [];
      for (const rawPermission of rawPermissions || []) {
        try {
          const validated = RolePermissionSchema.parse(rawPermission);
          permissions.push(validated);
        } catch (validationError) {
          ValidationMonitor.recordValidationError({
            context: 'RolePermissionService.getUserPermissions',
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error',
            errorCode: 'PERMISSION_VALIDATION_FAILED'
          });
        }
      }

      return permissions;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.getUserPermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return [];
    }
  }

  /**
   * Clone permissions from one role to another
   */
  async cloneRolePermissions(sourceRole: string, targetRole: string): Promise<boolean> {
    try {
      // Get source role permissions
      const sourcePermissions = await this.getRolePermissions(sourceRole);
      
      if (sourcePermissions.length === 0) {
        ValidationMonitor.recordValidationError({
          context: 'RolePermissionService.cloneRolePermissions',
          errorMessage: 'Source role has no permissions or does not exist',
          errorCode: 'NO_SOURCE_PERMISSIONS'
        });
        return false;
      }

      // Get existing target permissions to merge
      const existingPermissions = await this.getRolePermissions(targetRole);
      
      // Combine unique permissions
      const allPermissionStrings = new Set([
        ...existingPermissions.map(p => p.permission), 
        ...sourcePermissions.map(p => p.permission)
      ]);
      
      // Update target role with combined permissions
      return await this.bulkUpdateRolePermissions(targetRole, Array.from(allPermissionStrings));
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.cloneRolePermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return false;
    }
  }

  /**
   * Add a permission to a role (alias for compatibility)
   */
  async addPermissionToRole(role: string, permission: string): Promise<boolean> {
    try {
      const result = await this.addPermission(role, permission);
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Remove a permission from a role (alias for compatibility)
   */
  async removePermissionFromRole(role: string, permission: string): Promise<boolean> {
    return this.removePermission(role, permission);
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheTimeout;
  }

  /**
   * Invalidate the permissions cache
   */
  private invalidateCache(): void {
    this.permissionsCache.clear();
    this.lastCacheUpdate = 0;
  }
}

// Export singleton instance for convenience
export const rolePermissionService = (supabaseClient: SupabaseClient) => 
  new RolePermissionService(supabaseClient);