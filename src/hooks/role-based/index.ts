/**
 * Unified Role Management - Main Export File
 *
 * This file exports the new unified role management system.
 * Use these exports for all new code. Legacy imports are maintained
 * for backwards compatibility but should be migrated.
 */

// Primary unified role hooks - USE THESE
export {
  useUnifiedRole,
  useCurrentUserRole,
  useRoleOperations,
  usePermission,
  usePermissions,
  useRoleHierarchy,
  useRoleDebugger,
} from './useUnifiedRole';

// Legacy hooks - DEPRECATED: Migrate to unified hooks above
export { useUserRole } from './useUserRole';
export { useRolePermissions } from './useRolePermissions';

// Permission utilities - DEPRECATED: Use permission-based components instead
export { useCurrentUserPermissions, useCurrentUserHasPermission } from './permissions';

// Re-export unified service
export { unifiedRoleService, UnifiedRoleError } from '../../services/unifiedRoleService';

// Re-export types
export type {
  UserRole,
  Permission,
  RoleData,
  PermissionResult,
  RoleError,
  RoleErrorType,
  SecurityContext,
  RoleAuditEvent,
} from '../../types/roles';

/**
 * MIGRATION GUIDE:
 *
 * OLD (Legacy):
 * ```typescript
 * import { useUserRole } from '../hooks/useUserRole';
 * import { useRolePermissions } from '../hooks/role-based/useRolePermissions';
 *
 * const { role, isAdmin, isStaff } = useUserRole();
 * const { hasPermission } = useRolePermissions();
 * ```
 *
 * NEW (Unified):
 * ```typescript
 * import { useCurrentUserRole } from '../hooks/role-based';
 *
 * const { role, isAdmin, isStaff, hasPermission } = useCurrentUserRole();
 * ```
 *
 * PERMISSION CHECKS:
 *
 * OLD (Role-based):
 * ```typescript
 * if (isAdmin || isStaff) {
 *   // Show admin content
 * }
 * ```
 *
 * NEW (Permission-based):
 * ```typescript
 * // Use PermissionCheck component with permission="inventory:manage"
 * // to wrap admin content
 * ```
 */