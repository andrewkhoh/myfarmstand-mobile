import { supabaseClient } from '../../config/supabase';
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
  private static supabase = supabaseClient;

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
        pattern: 'direct_supabase_transformation',
        operation: 'getUserRole'
      });
      
      return transformed;
      
    } catch (error) {
      // Step 4: Monitor failure, graceful degradation
      ValidationMonitor.recordValidationError({
        service: 'rolePermissionService',
        operation: 'getUserRole',
        error: error.message
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
      
      const hasPermission = rolePermissions.includes(permission) || 
                           customPermissions.includes(permission);
      
      // Monitor permission checks for analytics/security
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'permission_check',
        operation: 'hasPermission',
        details: { permission, hasPermission, roleType: userRole.roleType }
      });
      
      return hasPermission;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        service: 'rolePermissionService',
        operation: 'hasPermission',
        error: error.message
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
        service: 'rolePermissionService',
        operation: 'getAllUserRoles',
        error: error.message
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
        pattern: 'create_with_validation',
        operation: 'createUserRole'
      });
      
      return transformed;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        service: 'rolePermissionService',
        operation: 'createUserRole',
        error: error.message
      });
      
      return null;
    }
  }

  /**
   * Update user permissions
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
        pattern: 'update_with_validation',
        operation: 'updateUserPermissions'
      });
      
      return transformed;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        service: 'rolePermissionService',
        operation: 'updateUserPermissions',
        error: error.message
      });
      
      return null;
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
          pattern: 'resilient_item_processing',
          operation
        });
      } catch (error) {
        results.errors.push({ item, error });
        ValidationMonitor.recordValidationError({
          service: 'rolePermissionService',
          operation,
          error: error.message
        });
        // Continue processing other items - don't break entire operation
      }
    }
    
    return results;
  }
}

// Export role types for application use
export type { RoleType, RolePermissionTransform, CreateRolePermissionInput };