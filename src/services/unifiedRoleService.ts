/**
 * Unified Role Service
 * Single source of truth for all role and permission operations
 * Consolidates roleService.ts and rolePermissionService.ts
 */

import { supabase } from '../config/supabase';
import { ValidationMonitor } from '../utils/validationMonitor';
import {
  UserRole,
  Permission,
  RoleData,
  PermissionResult,
  RoleError,
  RoleErrorType,
  SecurityContext,
  RoleAuditEvent,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  LEGACY_ROLE_MAPPING,
  LegacyUserRole
} from '../types/roles';
import { z } from 'zod';

// Validation schemas
const RoleDataSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  role: z.string().min(1),
  is_active: z.boolean().default(true),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

const PermissionSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  permission: z.string().min(1),
  created_at: z.string().nullable().optional(),
});

// Custom error class
export class UnifiedRoleError extends Error implements RoleError {
  code: RoleErrorType;
  context: SecurityContext;
  userId?: string;
  requiredPermission?: Permission;
  userRole?: UserRole;
  timestamp: string;

  constructor(
    code: RoleErrorType,
    message: string,
    context: SecurityContext,
    options?: {
      userId?: string;
      requiredPermission?: Permission;
      userRole?: UserRole;
    }
  ) {
    super(message);
    this.name = 'UnifiedRoleError';
    this.code = code;
    this.context = context;
    this.userId = options?.userId;
    this.requiredPermission = options?.requiredPermission;
    this.userRole = options?.userRole;
    this.timestamp = new Date().toISOString();
  }
}

export class UnifiedRoleService {
  private static instance: UnifiedRoleService;
  private roleCache = new Map<string, { data: RoleData; timestamp: number }>();
  private permissionCache = new Map<string, { data: Permission[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): UnifiedRoleService {
    if (!UnifiedRoleService.instance) {
      UnifiedRoleService.instance = new UnifiedRoleService();
    }
    return UnifiedRoleService.instance;
  }

  /**
   * Get user role data - PRIMARY METHOD
   * Replaces both roleService.getUserRole and rolePermissionService.getUserRole
   */
  async getUserRole(userId: string): Promise<RoleData> {
    if (!userId) {
      throw new UnifiedRoleError(
        RoleErrorType.AUTHENTICATION_REQUIRED,
        'User ID is required for role lookup',
        SecurityContext.AUTHENTICATION,
        { userId }
      );
    }

    // Check cache first
    const cacheKey = `role:${userId}`;
    const cached = this.roleCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Query user role from database
      const { data, error } = await supabase
        .from('users')
        .select('id, role, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!data || !data.role) {
        throw new UnifiedRoleError(
          RoleErrorType.ROLE_NOT_FOUND,
          `No role found for user ${userId}`,
          SecurityContext.AUTHORIZATION,
          { userId }
        );
      }

      // Validate and transform data
      const validatedData = RoleDataSchema.parse({
        id: data.id,
        user_id: userId,
        role: data.role,
        is_active: true,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });

      // Convert to standardized format
      const standardizedRole = this.standardizeRole(validatedData.role);
      const roleData: RoleData = {
        id: validatedData.id,
        userId: validatedData.user_id,
        role: standardizedRole,
        permissions: ROLE_PERMISSIONS[standardizedRole] || [],
        isActive: validatedData.is_active,
        createdAt: validatedData.created_at || new Date().toISOString(),
        updatedAt: validatedData.updated_at || new Date().toISOString(),
      };

      // Cache the result
      this.roleCache.set(cacheKey, { data: roleData, timestamp: Date.now() });

      // Log successful role retrieval
      ValidationMonitor.recordPatternSuccess({
        service: 'UnifiedRoleService',
        pattern: 'direct_supabase_query',
        operation: 'getUserRole',
      });

      this.auditEvent({
        eventType: 'ROLE_ASSIGNED',
        userId,
        newRole: roleData.role,
        context: SecurityContext.DATA_ACCESS,
        timestamp: new Date().toISOString(),
      });

      return roleData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      ValidationMonitor.recordValidationError({
        context: 'UnifiedRoleService.getUserRole',
        errorMessage,
        errorCode: 'USER_ROLE_FETCH_FAILED',
      });

      if (error instanceof UnifiedRoleError) {
        throw error;
      }

      throw new UnifiedRoleError(
        RoleErrorType.SYSTEM_ERROR,
        `Failed to retrieve user role: ${errorMessage}`,
        SecurityContext.DATA_ACCESS,
        { userId }
      );
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const roleData = await this.getUserRole(userId);
      const hasPermission = roleData.permissions.includes(permission) ||
                           roleData.role === UserRole.ADMIN; // Admin has all permissions

      this.auditEvent({
        eventType: hasPermission ? 'PERMISSION_GRANTED' : 'ACCESS_DENIED',
        userId,
        permission,
        context: SecurityContext.AUTHORIZATION,
        timestamp: new Date().toISOString(),
        metadata: { userRole: roleData.role },
      });

      return hasPermission;
    } catch (error) {
      // Log permission denial
      this.auditEvent({
        eventType: 'ACCESS_DENIED',
        userId,
        permission,
        context: SecurityContext.AUTHORIZATION,
        timestamp: new Date().toISOString(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return false;
    }
  }

  /**
   * Check permission with detailed result
   */
  async checkPermission(userId: string, permission: Permission): Promise<PermissionResult> {
    try {
      const roleData = await this.getUserRole(userId);
      const hasPermission = roleData.permissions.includes(permission) ||
                           roleData.role === UserRole.ADMIN;

      if (hasPermission) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `User role '${roleData.role}' does not have permission '${permission}'`,
        fallbackAction: 'redirect',
        fallbackTarget: '/unauthorized',
      };
    } catch (error) {
      if (error instanceof UnifiedRoleError && error.code === RoleErrorType.AUTHENTICATION_REQUIRED) {
        return {
          allowed: false,
          reason: 'Authentication required',
          fallbackAction: 'redirect',
          fallbackTarget: '/login',
        };
      }

      return {
        allowed: false,
        reason: 'System error occurred during permission check',
        fallbackAction: 'hide',
      };
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const roleData = await this.getUserRole(userId);
      return roleData.permissions;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'UnifiedRoleService.getUserPermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'USER_PERMISSIONS_FETCH_FAILED',
      });
      return [];
    }
  }

  /**
   * Update user role (admin function)
   */
  async updateUserRole(userId: string, newRole: UserRole, adminUserId?: string): Promise<void> {
    if (!userId || !newRole) {
      throw new UnifiedRoleError(
        RoleErrorType.AUTHENTICATION_REQUIRED,
        'User ID and role are required',
        SecurityContext.ADMIN_FUNCTIONS
      );
    }

    try {
      // Get current role for audit
      const currentRoleData = await this.getUserRole(userId);

      // Update in database
      const { error } = await supabase
        .from('users')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Clear cache
      this.clearUserCache(userId);

      // Audit the role change
      this.auditEvent({
        eventType: 'ROLE_ASSIGNED',
        userId,
        adminUserId,
        oldRole: currentRoleData.role,
        newRole,
        context: SecurityContext.ADMIN_FUNCTIONS,
        timestamp: new Date().toISOString(),
      });

      ValidationMonitor.recordPatternSuccess({
        service: 'UnifiedRoleService',
        pattern: 'direct_supabase_query',
        operation: 'updateUserRole',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      ValidationMonitor.recordValidationError({
        context: 'UnifiedRoleService.updateUserRole',
        errorMessage,
        errorCode: 'USER_ROLE_UPDATE_FAILED',
      });

      throw new UnifiedRoleError(
        RoleErrorType.SYSTEM_ERROR,
        `Failed to update user role: ${errorMessage}`,
        SecurityContext.ADMIN_FUNCTIONS,
        { userId, userRole: newRole }
      );
    }
  }

  /**
   * Check if one role has higher privileges than another
   */
  hasHigherPrivileges(role1: UserRole, role2: UserRole): boolean {
    return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
  }

  /**
   * Get all available roles
   */
  getAllRoles(): UserRole[] {
    return Object.values(UserRole);
  }

  /**
   * Convert legacy role to standardized role
   */
  private standardizeRole(legacyRole: string): UserRole {
    // Direct match for new roles
    if (Object.values(UserRole).includes(legacyRole as UserRole)) {
      return legacyRole as UserRole;
    }

    // Legacy role mapping
    const mapped = LEGACY_ROLE_MAPPING[legacyRole as LegacyUserRole];
    if (mapped) {
      return mapped;
    }

    // Default fallback - but throw error instead of defaulting to customer
    throw new UnifiedRoleError(
      RoleErrorType.ROLE_NOT_FOUND,
      `Unknown role: ${legacyRole}`,
      SecurityContext.AUTHORIZATION
    );
  }

  /**
   * Clear user cache
   */
  private clearUserCache(userId: string): void {
    this.roleCache.delete(`role:${userId}`);
    this.permissionCache.delete(`permissions:${userId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.roleCache.clear();
    this.permissionCache.clear();
  }

  /**
   * Audit role/permission events
   */
  private auditEvent(event: RoleAuditEvent): void {
    // Log to ValidationMonitor for consistency with existing patterns
    ValidationMonitor.recordPatternSuccess({
      service: 'UnifiedRoleService',
      pattern: 'atomic_operation',
      operation: event.eventType,
    });

    // In production, you might send this to a dedicated audit service
    if (__DEV__) {
      console.info('🔐 Role Audit Event:', event);
    }

    // TODO: Send to audit service in production
    // auditService.logEvent(event);
  }

  /**
   * Legacy compatibility methods
   */

  // For backwards compatibility with existing roleService usage
  async canPerformAction(userId: string, resource: string, action: string): Promise<boolean> {
    const permission = `${resource}:${action}` as Permission;
    return this.hasPermission(userId, permission);
  }

  // Legacy role check
  async hasRole(userId: string, role: UserRole | LegacyUserRole): Promise<boolean> {
    try {
      const roleData = await this.getUserRole(userId);
      const standardizedRole = typeof role === 'string' && role in LEGACY_ROLE_MAPPING
        ? LEGACY_ROLE_MAPPING[role as LegacyUserRole]
        : role as UserRole;

      return roleData.role === standardizedRole;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const unifiedRoleService = UnifiedRoleService.getInstance();
