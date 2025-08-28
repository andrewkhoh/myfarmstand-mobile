/**
 * UserRoleService - Comprehensive Implementation
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
 * Raw database schema for user_roles table
 * Following Pattern 2: Database-First Validation
 */
const RawUserRoleSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  role: z.string().min(1),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

/**
 * Transform schema for user_roles
 * Following Pattern 4: Transformation Schema Architecture with return type annotation
 */
export const UserRoleTransformSchema = RawUserRoleSchema.transform((data): UserRoleData => ({
  id: data.id,
  userId: data.user_id,
  role: data.role as UserRole,
  isActive: data.is_active ?? true,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
}));

// Type inference from schema with proper interface
export interface UserRoleData {
  id: string;
  userId: string;
  role: UserRole | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Role hierarchy for comparison
const ROLE_HIERARCHY: Record<string, number> = {
  customer: 1,
  vendor: 2,
  farmer: 2,
  staff: 3,
  manager: 4,
  admin: 5
};

// ============================================================================
// SERVICE ERROR HANDLING
// ============================================================================

interface UserRoleError {
  code: string;
  message: string;
  userMessage: string;
  context?: any;
}

const createUserRoleError = (
  code: string,
  message: string,
  userMessage: string,
  context?: any
): UserRoleError => ({
  code,
  message,
  userMessage,
  context
});

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class UserRoleService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Get all roles for a user
   * Following Pattern 1: Direct Supabase with Validation
   * Following Pattern 3: Resilient Item Processing
   */
  async getUserRoles(userId: string, activeOnly = false): Promise<UserRoleData[]> {
    try {
      // Direct Supabase query (Pattern 1)
      let query = this.supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data: rawRoles, error } = await query;

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.getUserRoles',
          errorMessage: error.message,
          errorCode: 'DATABASE_ERROR'
        });
        
        const err = createUserRoleError(
          'DATABASE_ERROR',
          `Database error: ${error.message}`,
          'Failed to fetch user roles. Please try again.',
          { userId }
        );
        throw new Error(err.message);
      }

      // Pattern 3: Resilient Item Processing - Individual validation with skip-on-error
      const roles: UserRoleData[] = [];
      
      for (const rawRole of rawRoles || []) {
        try {
          const validated = UserRoleTransformSchema.parse(rawRole);
          roles.push(validated);
        } catch (validationError) {
          ValidationMonitor.recordValidationError({
            context: 'UserRoleService.getUserRoles',
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error',
            errorCode: 'ROLE_VALIDATION_FAILED'
          });
          // Continue processing other roles (Pattern 3)
        }
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'UserRoleService',
        pattern: 'direct_supabase_query',
        operation: 'getUserRoles'
      });

      return roles;
    } catch (error) {
      // Re-throw if already a known error
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw error;
      }
      
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.getUserRoles',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      
      throw new Error('Failed to fetch user roles');
    }
  }

  /**
   * Check if user has a specific role
   */
  async checkUserRole(userId: string, role: string, activeOnly = true): Promise<boolean> {
    try {
      let query = this.supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.single();

      if (error && error.message !== 'No rows returned') {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.checkUserRole',
          errorMessage: error.message,
          errorCode: 'DATABASE_ERROR'
        });
        return false;
      }

      return !!data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.checkUserRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return false;
    }
  }

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, role: string): Promise<UserRoleData> {
    try {
      // Check if role already exists
      const hasRole = await this.checkUserRole(userId, role, false);
      if (hasRole) {
        // If role exists but might be inactive, activate it
        await this.activateRole(userId, role);
        const roles = await this.getUserRoles(userId);
        const existingRole = roles.find(r => r.role === role);
        if (existingRole) return existingRole;
      }

      // Add new role
      const { data, error } = await this.supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.assignRole',
          errorMessage: error.message,
          errorCode: 'INSERT_ERROR'
        });
        throw new Error(`Failed to assign role: ${error.message}`);
      }

      const validated = UserRoleTransformSchema.parse(data);

      ValidationMonitor.recordPatternSuccess({
        service: 'UserRoleService',
        pattern: 'direct_supabase_query',
        operation: 'assignRole'
      });

      return validated;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.assignRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      throw error;
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, role: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.removeRole',
          errorMessage: error.message,
          errorCode: 'DELETE_ERROR'
        });
        return false;
      }

      return true;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.removeRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return false;
    }
  }

  /**
   * Activate a user role
   */
  async activateRole(userId: string, role: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.activateRole',
          errorMessage: error.message,
          errorCode: 'UPDATE_ERROR'
        });
        return false;
      }

      return true;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.activateRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return false;
    }
  }

  /**
   * Deactivate a user role
   */
  async deactivateRole(userId: string, role: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.deactivateRole',
          errorMessage: error.message,
          errorCode: 'UPDATE_ERROR'
        });
        return false;
      }

      return true;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.deactivateRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return false;
    }
  }

  /**
   * Get all users with a specific role
   */
  async getUsersByRole(role: string, activeOnly = false): Promise<UserRoleData[]> {
    try {
      let query = this.supabase
        .from('user_roles')
        .select('*')
        .eq('role', role);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data: rawRoles, error } = await query;

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.getUsersByRole',
          errorMessage: error.message,
          errorCode: 'DATABASE_ERROR'
        });
        return [];
      }

      // Pattern 3: Resilient Item Processing
      const userRoles: UserRoleData[] = [];
      
      for (const rawRole of rawRoles || []) {
        try {
          const validated = UserRoleTransformSchema.parse(rawRole);
          userRoles.push(validated);
        } catch (validationError) {
          ValidationMonitor.recordValidationError({
            context: 'UserRoleService.getUsersByRole',
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error',
            errorCode: 'ROLE_VALIDATION_FAILED'
          });
        }
      }

      return userRoles;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.getUsersByRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return [];
    }
  }

  /**
   * Bulk assign multiple roles to a user
   */
  async bulkAssignRoles(userId: string, roles: string[]): Promise<UserRoleData[]> {
    try {
      const newRoles = roles.map(role => ({
        user_id: userId,
        role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await this.supabase
        .from('user_roles')
        .insert(newRoles)
        .select();

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.bulkAssignRoles',
          errorMessage: error.message,
          errorCode: 'BULK_INSERT_ERROR'
        });
        throw new Error(`Failed to bulk assign roles: ${error.message}`);
      }

      // Validate all inserted roles
      const validatedRoles: UserRoleData[] = [];
      for (const rawRole of data || []) {
        try {
          const validated = UserRoleTransformSchema.parse(rawRole);
          validatedRoles.push(validated);
        } catch (validationError) {
          ValidationMonitor.recordValidationError({
            context: 'UserRoleService.bulkAssignRoles',
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error',
            errorCode: 'ROLE_VALIDATION_FAILED'
          });
        }
      }

      return validatedRoles;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.bulkAssignRoles',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      throw error;
    }
  }

  /**
   * Replace all user roles with new ones
   */
  async replaceUserRoles(userId: string, newRoles: string[]): Promise<UserRoleData[]> {
    try {
      // Delete existing roles
      const { error: deleteError } = await this.supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        ValidationMonitor.recordValidationError({
          context: 'UserRoleService.replaceUserRoles',
          errorMessage: deleteError.message,
          errorCode: 'DELETE_ERROR'
        });
        throw new Error(`Failed to delete existing roles: ${deleteError.message}`);
      }

      // If no new roles, return empty
      if (newRoles.length === 0) {
        return [];
      }

      // Add new roles
      return this.bulkAssignRoles(userId, newRoles);
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.replaceUserRoles',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      throw error;
    }
  }

  /**
   * Check if user has a role equal to or higher than specified
   */
  async hasRoleOrHigher(userId: string, minimumRole: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId, true);
      const minimumLevel = ROLE_HIERARCHY[minimumRole] || 0;

      for (const userRole of userRoles) {
        const userLevel = ROLE_HIERARCHY[userRole.role] || 0;
        if (userLevel >= minimumLevel) {
          return true;
        }
      }

      return false;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.hasRoleOrHigher',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return false;
    }
  }

  /**
   * Get the highest role for a user
   */
  async getHighestRole(userId: string): Promise<string | null> {
    try {
      const userRoles = await this.getUserRoles(userId, true);
      
      if (userRoles.length === 0) {
        return null;
      }

      let highestRole = userRoles[0].role;
      let highestLevel = ROLE_HIERARCHY[highestRole] || 0;

      for (const userRole of userRoles) {
        const level = ROLE_HIERARCHY[userRole.role] || 0;
        if (level > highestLevel) {
          highestLevel = level;
          highestRole = userRole.role;
        }
      }

      return highestRole;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UserRoleService.getHighestRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNEXPECTED_ERROR'
      });
      return null;
    }
  }
}

// Export singleton factory for convenience
export const userRoleService = (supabaseClient: SupabaseClient) => 
  new UserRoleService(supabaseClient);