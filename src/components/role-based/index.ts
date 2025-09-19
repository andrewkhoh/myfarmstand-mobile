/**
 * Unified Role-Based Components - Main Export File
 *
 * Exports the new unified permission-based access control components.
 * Use these for all new role/permission checking in UI components.
 */

// Primary unified permission components - USE THESE
export { PermissionCheck } from './PermissionGate';

// Legacy components - DEPRECATED: Migrate to unified components above
export { PermissionGate } from './PermissionGate';
/**
 * @deprecated Use PermissionCheck instead
 */
export { RoleBasedVisibility } from './RoleBasedVisibility';
export { RoleIndicator } from './RoleIndicator';
// export { RoleBasedButton } from './RoleBasedButton'; // DISABLED - use PermissionCheck
export { AccessControlButton } from './AccessControlButton';
export { PermissionBadge } from './PermissionBadge';

// Legacy compatibility stubs removed - use proper imports in test files

// Re-export unified types
export type { UserRole } from '../../types';

/**
 * MIGRATION GUIDE:
 *
 * OLD (Legacy Role-based):
 * ```typescript
 * import { PermissionGate } from '../components/role-based/PermissionGate';
 *
 * <PermissionGate roles={['admin', 'staff']}>
 *   <AdminContent />
 * </PermissionGate>
 * ```
 *
 * NEW (Permission-based):
 * ```typescript
 * import { PermissionCheck, AdminOnly } from '../components/role-based';
 *
 * <PermissionCheck permission="inventory:manage">
 *   <AdminContent />
 * </PermissionCheck>
 *
 * // OR for simple admin-only content:
 * <AdminOnly>
 *   <AdminContent />
 * </AdminOnly>
 * ```
 *
 * AVAILABLE COMPONENTS:
 *
 * 1. UnifiedPermissionGate - Full-featured permission gate with multiple options
 * 2. PermissionCheck - Simple single permission check
 * 3. AdminOnly - Shorthand for admin-only content
 * 4. StaffOnly - Shorthand for staff+ content
 * 5. GuestOnly - Content for non-authenticated users only
 *
 * PERMISSION FORMAT:
 * Use the format "resource:action" for all permissions:
 * - "inventory:view"
 * - "inventory:manage"
 * - "content:create"
 * - "analytics:export"
 * - etc.
 */