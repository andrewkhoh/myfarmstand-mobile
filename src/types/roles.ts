/**
 * Unified Role Types and Interfaces
 * Single source of truth for all role-related types
 */

// Standardized User Roles - Single source of truth
export enum UserRole {
  CUSTOMER = 'customer',
  INVENTORY_STAFF = 'inventory_staff',
  MARKETING_STAFF = 'marketing_staff',
  EXECUTIVE = 'executive',
  ADMIN = 'admin',
}

// Legacy role support for backwards compatibility
export type LegacyUserRole = 'customer' | 'staff' | 'manager' | 'admin' | 'farmer' | 'vendor';

// Permission resource categories
export enum PermissionResource {
  INVENTORY = 'inventory',
  CONTENT = 'content',
  ANALYTICS = 'analytics',
  USERS = 'users',
  SYSTEM = 'system',
  ORDERS = 'orders',
  PRODUCTS = 'products',
  CAMPAIGNS = 'campaigns',
}

// Permission actions
export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXPORT = 'export',
  APPROVE = 'approve',
  ANALYZE = 'analyze',
  FORECAST = 'forecast',
}

// Standardized permission format: resource:action
export type Permission = `${PermissionResource}:${PermissionAction}`;

// Core role data structure
export interface RoleData {
  id: string;
  userId: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Permission check result
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  fallbackAction?: 'redirect' | 'hide' | 'disable';
  fallbackTarget?: string;
}

// Role hierarchy levels (for privilege comparison)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CUSTOMER]: 1,
  [UserRole.INVENTORY_STAFF]: 2,
  [UserRole.MARKETING_STAFF]: 2,
  [UserRole.EXECUTIVE]: 4,
  [UserRole.ADMIN]: 5,
};

// Default permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.CUSTOMER]: [
    'products:view',
    'orders:view',
    'orders:create',
  ],
  [UserRole.INVENTORY_STAFF]: [
    'products:view',
    'products:update',
    'inventory:view',
    'inventory:manage',
    'orders:view',
    'orders:update',
  ],
  [UserRole.MARKETING_STAFF]: [
    'products:view',
    'content:view',
    'content:create',
    'content:update',
    'campaigns:view',
    'campaigns:create',
    'campaigns:update',
    'analytics:view',
    'orders:view', // For campaign attribution analysis
  ],
  [UserRole.EXECUTIVE]: [
    'products:view',
    'inventory:view',
    'content:view',
    'campaigns:view',
    'analytics:view',
    'analytics:analyze', // Advanced analytics capabilities
    'analytics:forecast', // Predictive analytics
    'analytics:export',
    'orders:view',
    'orders:analyze', // Order analytics and insights
    'users:view',
  ],
  [UserRole.ADMIN]: [
    'products:view',
    'products:manage',
    'inventory:view',
    'inventory:manage',
    'content:view',
    'content:manage',
    'campaigns:view',
    'campaigns:manage',
    'analytics:view',
    'analytics:analyze',
    'analytics:forecast',
    'analytics:manage',
    'orders:view',
    'orders:analyze',
    'orders:manage',
    'users:view',
    'users:manage',
    'system:manage',
  ],
};

// Legacy role mapping for backwards compatibility
export const LEGACY_ROLE_MAPPING: Record<LegacyUserRole, UserRole> = {
  'customer': UserRole.CUSTOMER,
  'staff': UserRole.INVENTORY_STAFF,
  'manager': UserRole.EXECUTIVE,
  'admin': UserRole.ADMIN,
  'farmer': UserRole.INVENTORY_STAFF,
  'vendor': UserRole.MARKETING_STAFF,
};

// Security contexts where role checks are critical
export enum SecurityContext {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  ADMIN_FUNCTIONS = 'admin_functions',
  FINANCIAL_DATA = 'financial_data',
}

// Error types for role/permission failures
export enum RoleErrorType {
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  INVALID_ROLE_TRANSITION = 'INVALID_ROLE_TRANSITION',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export interface RoleError extends Error {
  code: RoleErrorType;
  context: SecurityContext;
  userId?: string;
  requiredPermission?: Permission;
  userRole?: UserRole;
  timestamp: string;
}

// Audit event for role/permission changes
export interface RoleAuditEvent {
  eventType: 'ROLE_ASSIGNED' | 'ROLE_REMOVED' | 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED' | 'ACCESS_DENIED';
  userId: string;
  adminUserId?: string;
  oldRole?: UserRole;
  newRole?: UserRole;
  permission?: Permission;
  context: SecurityContext;
  timestamp: string;
  metadata?: Record<string, any>;
}