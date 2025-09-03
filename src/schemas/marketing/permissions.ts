import { z } from 'zod';

export const Permission = z.enum([
  'content:create',
  'content:read',
  'content:update',
  'content:delete',
  'content:publish',
  'content:approve',
  'campaign:create',
  'campaign:read',
  'campaign:update',
  'campaign:delete',
  'campaign:activate',
  'campaign:pause',
  'bundle:create',
  'bundle:read',
  'bundle:update',
  'bundle:delete',
  'bundle:activate',
  'analytics:view',
  'analytics:export',
  'settings:manage',
  'users:manage',
  'roles:manage'
]);

export type PermissionType = z.infer<typeof Permission>;

export const Role = z.enum([
  'admin',
  'manager',
  'editor',
  'reviewer',
  'viewer',
  'marketing_manager',
  'content_creator',
  'campaign_manager'
]);

export type RoleType = z.infer<typeof Role>;

export const ResourceType = z.enum([
  'content',
  'campaign',
  'bundle',
  'analytics',
  'settings',
  'users',
  'roles'
]);

export type ResourceTypeType = z.infer<typeof ResourceType>;

export const ActionType = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'publish',
  'approve',
  'activate',
  'pause',
  'view',
  'export',
  'manage'
]);

export type ActionTypeType = z.infer<typeof ActionType>;

const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, PermissionType[]> = {
  admin: [
    'content:create', 'content:read', 'content:update', 'content:delete', 'content:publish', 'content:approve',
    'campaign:create', 'campaign:read', 'campaign:update', 'campaign:delete', 'campaign:activate', 'campaign:pause',
    'bundle:create', 'bundle:read', 'bundle:update', 'bundle:delete', 'bundle:activate',
    'analytics:view', 'analytics:export',
    'settings:manage', 'users:manage', 'roles:manage'
  ],
  manager: [
    'content:create', 'content:read', 'content:update', 'content:delete', 'content:publish', 'content:approve',
    'campaign:create', 'campaign:read', 'campaign:update', 'campaign:delete', 'campaign:activate', 'campaign:pause',
    'bundle:create', 'bundle:read', 'bundle:update', 'bundle:delete', 'bundle:activate',
    'analytics:view', 'analytics:export'
  ],
  marketing_manager: [
    'campaign:create', 'campaign:read', 'campaign:update', 'campaign:delete', 'campaign:activate', 'campaign:pause',
    'bundle:create', 'bundle:read', 'bundle:update', 'bundle:delete', 'bundle:activate',
    'analytics:view', 'analytics:export'
  ],
  content_creator: [
    'content:create', 'content:read', 'content:update',
    'campaign:read',
    'bundle:read'
  ],
  campaign_manager: [
    'campaign:create', 'campaign:read', 'campaign:update', 'campaign:activate', 'campaign:pause',
    'analytics:view'
  ],
  editor: [
    'content:create', 'content:read', 'content:update',
    'campaign:read',
    'bundle:read'
  ],
  reviewer: [
    'content:read', 'content:approve',
    'campaign:read',
    'bundle:read'
  ],
  viewer: [
    'content:read',
    'campaign:read',
    'bundle:read',
    'analytics:view'
  ]
};

export function hasPermission(role: RoleType, permission: PermissionType): boolean {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
}

export function canPerformAction(role: RoleType, resource: ResourceTypeType, action: ActionTypeType): boolean {
  const permission = `${resource}:${action}` as PermissionType;
  return hasPermission(role, permission);
}

export const RolePermissionsSchema = z.object({
  id: z.string().uuid(),
  role: Role,
  permissions: z.array(Permission)
    .min(1, { message: 'Role must have at least one permission' }),
  customPermissions: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type RolePermissions = z.infer<typeof RolePermissionsSchema>;

export const UserPermissionsSchema = z.object({
  userId: z.string().uuid(),
  role: Role,
  permissions: z.array(Permission),
  additionalPermissions: z.array(Permission).default([]),
  restrictedPermissions: z.array(Permission).default([]),
  effectivePermissions: z.array(Permission),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).refine(
  data => {
    const basePermissions = DEFAULT_ROLE_PERMISSIONS[data.role] || [];
    const effective = [
      ...basePermissions,
      ...data.additionalPermissions
    ].filter(p => !data.restrictedPermissions.includes(p));
    
    return effective.length === data.effectivePermissions.length &&
           effective.every(p => data.effectivePermissions.includes(p));
  },
  {
    message: 'Effective permissions must match calculated permissions'
  }
);

export type UserPermissions = z.infer<typeof UserPermissionsSchema>;

export const PermissionCheckSchema = z.object({
  userId: z.string().uuid(),
  resource: ResourceType,
  action: ActionType,
  resourceId: z.string().uuid().optional(),
  context: z.record(z.unknown()).optional()
});

export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;

export const PermissionGrantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  permission: Permission,
  grantedBy: z.string().uuid(),
  grantedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  reason: z.string().optional(),
  active: z.boolean().default(true)
}).refine(
  data => {
    if (data.expiresAt && new Date(data.expiresAt) <= new Date(data.grantedAt)) {
      return false;
    }
    return true;
  },
  {
    message: 'Expiration date must be after grant date'
  }
);

export type PermissionGrant = z.infer<typeof PermissionGrantSchema>;