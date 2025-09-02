import { z } from 'zod';

export const UserRole = z.enum(['admin', 'editor', 'viewer', 'contributor', 'moderator']);
export const Permission = z.enum([
  'content.create',
  'content.read',
  'content.update',
  'content.delete',
  'content.publish',
  'content.approve',
  'campaign.create',
  'campaign.read',
  'campaign.update',
  'campaign.delete',
  'campaign.activate',
  'bundle.create',
  'bundle.read',
  'bundle.update',
  'bundle.delete',
  'analytics.view',
  'analytics.export',
  'settings.manage'
]);

export type UserRoleType = z.infer<typeof UserRole>;
export type PermissionType = z.infer<typeof Permission>;

const rolePermissions: Record<UserRoleType, PermissionType[]> = {
  admin: [
    'content.create', 'content.read', 'content.update', 'content.delete', 'content.publish', 'content.approve',
    'campaign.create', 'campaign.read', 'campaign.update', 'campaign.delete', 'campaign.activate',
    'bundle.create', 'bundle.read', 'bundle.update', 'bundle.delete',
    'analytics.view', 'analytics.export', 'settings.manage'
  ],
  editor: [
    'content.create', 'content.read', 'content.update', 'content.publish',
    'campaign.create', 'campaign.read', 'campaign.update',
    'bundle.create', 'bundle.read', 'bundle.update',
    'analytics.view'
  ],
  contributor: [
    'content.create', 'content.read', 'content.update',
    'campaign.read',
    'bundle.read',
    'analytics.view'
  ],
  moderator: [
    'content.read', 'content.update', 'content.approve',
    'campaign.read', 'campaign.update',
    'bundle.read',
    'analytics.view'
  ],
  viewer: [
    'content.read',
    'campaign.read',
    'bundle.read',
    'analytics.view'
  ]
};

export const RolePermissionsSchema = z.object({
  role: UserRole,
  permissions: z.array(Permission)
});

export type RolePermissions = z.infer<typeof RolePermissionsSchema>;

export const UserPermissionsSchema = z.object({
  userId: z.string().uuid(),
  role: UserRole,
  permissions: z.array(Permission),
  customPermissions: z.array(Permission).optional(),
  restrictions: z.array(z.string()).optional()
});

export type UserPermissions = z.infer<typeof UserPermissionsSchema>;

export const hasPermission = (role: UserRoleType, permission: PermissionType): boolean => {
  return rolePermissions[role]?.includes(permission) ?? false;
};

export const PermissionCheckSchema = z.object({
  userId: z.string().uuid(),
  role: UserRole,
  resource: z.string(),
  action: Permission
}).refine(
  data => hasPermission(data.role, data.action),
  {
    message: "User does not have permission for this action",
    path: ['action']
  }
);

export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;

export const ResourceAccessSchema = z.object({
  resourceId: z.string().uuid(),
  resourceType: z.enum(['content', 'campaign', 'bundle']),
  ownerId: z.string().uuid(),
  sharedWith: z.array(z.object({
    userId: z.string().uuid(),
    permission: Permission,
    expiresAt: z.string().datetime().optional()
  })).optional(),
  isPublic: z.boolean().default(false)
});

export type ResourceAccess = z.infer<typeof ResourceAccessSchema>;

export const validateWorkflowPermission = (
  role: UserRoleType,
  currentState: string,
  nextState: string
): boolean => {
  const statePermissions: Record<string, PermissionType> = {
    'review': 'content.update',
    'approved': 'content.approve',
    'published': 'content.publish',
    'archived': 'content.delete'
  };
  
  const requiredPermission = statePermissions[nextState];
  if (!requiredPermission) return false;
  
  return hasPermission(role, requiredPermission);
};

export const WorkflowPermissionSchema = z.object({
  userId: z.string().uuid(),
  role: UserRole,
  contentId: z.string().uuid(),
  currentState: z.string(),
  nextState: z.string()
}).refine(
  data => validateWorkflowPermission(data.role, data.currentState, data.nextState),
  {
    message: "User does not have permission for this workflow transition",
    path: ['nextState']
  }
);