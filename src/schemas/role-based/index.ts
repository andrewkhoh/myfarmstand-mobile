// Role-based schema exports
// Following architectural pattern: Clean, organized schema exports

export {
  RolePermissionDatabaseSchema,
  RolePermissionTransformSchema,
  CreateRolePermissionSchema,
  ROLE_PERMISSIONS,
  type RolePermissionDatabaseContract,
  type RolePermissionTransform,
  type CreateRolePermissionInput,
  type RoleType,
  type Permission
} from './rolePermission.schemas';

// Future role-based schema exports will go here:
// export * from './inventory';
// export * from './marketing';  
// export * from './executive';