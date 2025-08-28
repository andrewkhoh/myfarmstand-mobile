import { supabase } from '../../config/supabase';
import { 
  RolePermissionTransformSchema,
  CreateRolePermissionSchema,
  ROLE_PERMISSIONS,
  type RolePermissionTransform,
  type CreateRolePermissionInput,
  type RoleType
} from '../../schemas/role-based/rolePermission.schemas';
import { ValidationMonitor } from '../../utils/validationMonitor';

// Following docs/architectural-patterns-and-best-practices.md
// Pattern: Direct Supabase + ValidationMonitor + Resilient Processing

export class RolePermissionService {
  private static supabase = supabase;

  /**
   * Get user role (Pattern 1: Direct Supabase with exact fields)
   */
  static async getUserRole(userId: string): Promise<RolePermissionTransform | null> {
    try {
      // Step 1: Fetch with exact database fields (critical for Pattern 2)
      const { data, error } = await this.supabase
        .from('user_roles')
        .select(`
          id, user_id, role_type, permissions, 
          is_active, created_at, updated_at
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      // Step 2: Single validation pass (Pattern 1)
      const transformed = RolePermissionTransformSchema.parse(data);
      
      // Step 3: Monitor success (MANDATORY)
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'transformation_schema',
        operation: 'getUserRole'
      });
      
      return transformed;
      
    } catch (error) {
      // Step 4: Monitor failure, graceful degradation
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.getUserRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ROLE_FETCH_FAILED',
        validationPattern: 'transformation_schema'
      });
      
      return null; // Graceful degradation - UI can handle null
    }
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      
      if (!userRole) return false;
      
      // Get role-based permissions + custom permissions
      const rolePermissions = ROLE_PERMISSIONS[userRole.roleType] || [];
      const customPermissions = userRole.permissions || [];
      
      const hasPermission = (rolePermissions as string[]).includes(permission) || 
                           customPermissions.includes(permission);
      
      // Monitor permission checks for analytics/security
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'simple_input_validation',
        operation: 'hasPermission'
      });
      
      return hasPermission;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.hasPermission',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PERMISSION_CHECK_FAILED',
        validationPattern: 'simple_validation'
      });
      
      return false; // Fail closed for security
    }
  }

  /**
   * Get all user roles (Pattern 3: Resilient Item Processing)  
   */
  static async getAllUserRoles(): Promise<{
    success: RolePermissionTransform[];
    errors: any[];
    totalProcessed: number;
  }> {
    try {
      // Step 1: Fetch all raw data
      const { data: rawRoles, error } = await this.supabase
        .from('user_roles')
        .select(`
          id, user_id, role_type, permissions,
          is_active, created_at, updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Step 2: Resilient processing (Pattern 3 - MANDATORY)
      return await this.processItems(
        rawRoles || [],
        (rawRole) => RolePermissionTransformSchema.parse(rawRole),
        'getAllUserRoles'
      );
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.getAllUserRoles',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BULK_ROLE_FETCH_FAILED',
        validationPattern: 'transformation_schema'
      });
      
      return { success: [], errors: [error], totalProcessed: 0 };
    }
  }

  /**
   * Create user role (Input validation + atomic operation)
   */
  static async createUserRole(input: CreateRolePermissionInput): Promise<RolePermissionTransform | null> {
    try {
      // Step 1: Input validation (Pattern 2)
      const validatedInput = CreateRolePermissionSchema.parse(input);
      
      // Step 2: Atomic database operation
      const { data, error } = await this.supabase
        .from('user_roles')
        .insert({
          user_id: validatedInput.userId,
          role_type: validatedInput.roleType,
          permissions: validatedInput.permissions,
          is_active: true
        })
        .select(`
          id, user_id, role_type, permissions,
          is_active, created_at, updated_at
        `)
        .single();

      if (error) throw error;

      // Step 3: Transform and validate response
      const transformed = RolePermissionTransformSchema.parse(data);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'transformation_schema',
        operation: 'createUserRole'
      });
      
      return transformed;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.createUserRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ROLE_CREATION_FAILED',
        validationPattern: 'transformation_schema'
      });
      
      return null;
    }
  }

  /**
   * Get user permissions (both role-based and custom)
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const userRole = await this.getUserRole(userId);
      
      if (!userRole) return [];
      
      // Combine role-based permissions with custom permissions
      const rolePermissions = ROLE_PERMISSIONS[userRole.roleType] || [];
      const customPermissions = userRole.permissions || [];
      
      // Use Set to ensure unique permissions
      const allPermissions = new Set([
        ...(rolePermissions as string[]),
        ...customPermissions
      ]);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'simple_validation',
        operation: 'getUserPermissions'
      });
      
      return Array.from(allPermissions);
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.getUserPermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PERMISSIONS_FETCH_FAILED',
        validationPattern: 'simple_validation'
      });
      
      return [];
    }
  }

  /**
   * Add a custom permission to user
   */
  static async addPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      
      if (!userRole) return false;
      
      const currentPermissions = userRole.permissions || [];
      
      // Check if permission already exists
      if (currentPermissions.includes(permission)) {
        return true; // Already has permission
      }
      
      const updatedPermissions = [...currentPermissions, permission];
      
      const result = await this.updateUserPermissions(userId, updatedPermissions);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'atomic_operation',
        operation: 'addPermission'
      });
      
      return result !== null;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.addPermission',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ADD_PERMISSION_FAILED',
        validationPattern: 'atomic_operation'
      });
      
      return false;
    }
  }

  /**
   * Remove a custom permission from user
   */
  static async removePermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      
      if (!userRole) return false;
      
      const currentPermissions = userRole.permissions || [];
      const updatedPermissions = currentPermissions.filter(p => p !== permission);
      
      // Only update if permission was actually removed
      if (currentPermissions.length === updatedPermissions.length) {
        return true; // Permission wasn't there anyway
      }
      
      const result = await this.updateUserPermissions(userId, updatedPermissions);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'atomic_operation',
        operation: 'removePermission'
      });
      
      return result !== null;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.removePermission',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'REMOVE_PERMISSION_FAILED',
        validationPattern: 'atomic_operation'
      });
      
      return false;
    }
  }

  /**
   * Get all permissions for a role type (static data)
   */
  static async getAllPermissionsForRole(roleType: RoleType): Promise<string[]> {
    try {
      const permissions = ROLE_PERMISSIONS[roleType] || [];
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'simple_lookup',
        operation: 'getAllPermissionsForRole'
      });
      
      return permissions as string[];
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.getAllPermissionsForRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ROLE_PERMISSIONS_LOOKUP_FAILED',
        validationPattern: 'simple_lookup'
      });
      
      return [];
    }
  }

  /**
   * Check if user has multiple permissions (AND logic)
   */
  static async hasMultiplePermissions(userId: string, permissions: string[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      
      const hasAll = permissions.every(permission => 
        userPermissions.includes(permission)
      );
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'simple_validation',
        operation: 'hasMultiplePermissions'
      });
      
      return hasAll;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.hasMultiplePermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'MULTIPLE_PERMISSION_CHECK_FAILED',
        validationPattern: 'simple_validation'
      });
      
      return false;
    }
  }

  /**
   * Update user permissions (updates custom permissions only)
   */
  static async updateUserPermissions(
    userId: string, 
    permissions: string[]
  ): Promise<RolePermissionTransform | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .update({ 
          permissions,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_active', true)
        .select(`
          id, user_id, role_type, permissions,
          is_active, created_at, updated_at
        `)
        .single();

      if (error) throw error;

      const transformed = RolePermissionTransformSchema.parse(data);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'transformation_schema',
        operation: 'updateUserPermissions'
      });
      
      return transformed;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.updateUserPermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'PERMISSION_UPDATE_FAILED',
        validationPattern: 'transformation_schema'
      });
      
      return null;
    }
  }

  /**
   * Update user role (change role type)
   * Pattern: Atomic operation with validation
   */
  static async updateUserRole(
    userId: string, 
    roleType: RoleType
  ): Promise<RolePermissionTransform | null> {
    try {
      // Validate role type exists
      if (!ROLE_PERMISSIONS[roleType]) {
        throw new Error(`Invalid role type: ${roleType}`);
      }

      const { data, error } = await this.supabase
        .from('user_roles')
        .update({ 
          role_type: roleType,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_active', true)
        .select(`
          id, user_id, role_type, permissions,
          is_active, created_at, updated_at
        `)
        .single();

      if (error) throw error;

      const transformed = RolePermissionTransformSchema.parse(data);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'transformation_schema',
        operation: 'updateUserRole'
      });
      
      return transformed;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.updateUserRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ROLE_UPDATE_FAILED',
        validationPattern: 'transformation_schema'
      });
      
      return null;
    }
  }

  /**
   * Deactivate user role
   * Pattern: Atomic operation with soft delete
   */
  static async deactivateUserRole(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'atomic_operation',
        operation: 'deactivateUserRole'
      });
      
      return true;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RolePermissionService.deactivateUserRole',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ROLE_DEACTIVATION_FAILED',
        validationPattern: 'atomic_operation'
      });
      
      return false;
    }
  }

  /**
   * Resilient item processing (Pattern 3: Resilient Item Processing)
   * Following architectural pattern: process items individually, skip errors
   */
  private static async processItems<T>(
    items: unknown[],
    processor: (item: unknown) => T,
    operation: string
  ): Promise<{ success: T[]; errors: any[]; totalProcessed: number }> {
    const results = { success: [] as T[], errors: [] as any[], totalProcessed: 0 };
    
    for (const item of items) {
      try {
        const processed = processor(item);
        results.success.push(processed);
        results.totalProcessed++;
        
        ValidationMonitor.recordPatternSuccess({
          service: 'rolePermissionService',
          pattern: 'transformation_schema',
          operation
        });
      } catch (error) {
        results.errors.push({ item, error });
        ValidationMonitor.recordValidationError({
          context: `RolePermissionService.${operation}.processItems`,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'ITEM_PROCESSING_FAILED',
          validationPattern: 'transformation_schema'
        });
        // Continue processing other items - don't break entire operation
      }
    }
    
    return results;
  }
}

// Export role types for application use
export type { RoleType, RolePermissionTransform, CreateRolePermissionInput };