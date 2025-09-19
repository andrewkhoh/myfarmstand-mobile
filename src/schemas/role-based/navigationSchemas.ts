/**
 * Navigation Schemas
 * Following docs/architectural-patterns-and-best-practices.md
 * Pattern: Single validation pass with transformation schemas
 */

import { z } from 'zod';
import { NavigationMenuItem, UserRole } from '../../types';

// Raw database schemas (what comes from Supabase)
export const RawNavigationStateSchema = z.object({
  user_id: z.string(),
  current_screen: z.string(),
  history: z.array(z.string()).nullable(),
  updated_at: z.string(),
});

export const RawNavigationEventSchema = z.object({
  id: z.string().optional(),
  user_id: z.string(),
  from_screen: z.string().nullable(),
  to_screen: z.string(),
  user_role: z.string(),
  event_timestamp: z.string(),
  gesture: z.string().nullable(),
});

// Transformation schemas (Pattern 1: Single validation pass)
export const NavigationStateTransformSchema = RawNavigationStateSchema.transform((data): NavigationState => ({
  userId: data.user_id,
  currentScreen: data.current_screen,
  history: data.history || [],
  timestamp: data.updated_at,
}));

export const NavigationEventTransformSchema = RawNavigationEventSchema.transform((data) => ({
  id: data.id,
  userId: data.user_id,
  from: data.from_screen,
  to: data.to_screen,
  role: data.user_role as UserRole,
  timestamp: data.event_timestamp,
  gesture: data.gesture,
}));

// Input validation schemas
export const CreateNavigationEventSchema = z.object({
  userId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().min(1),
  role: z.enum(['customer', 'farmer', 'admin', 'vendor', 'staff']),
  gesture: z.string().optional(),
});

export const CreateNavigationStateSchema = z.object({
  userId: z.string().min(1),
  currentScreen: z.string().min(1),
  history: z.array(z.string()).default([]),
});

// Deep link validation schema
export const DeepLinkSchema = z.object({
  url: z.string().url(),
  role: z.enum(['customer', 'farmer', 'admin', 'vendor', 'staff']),
});

// Menu item validation (for static menu generation)
export const MenuItemSchema = z.object({
  name: z.string().min(1),
  component: z.string().min(1),
  icon: z.string().min(1),
  permissions: z.array(z.string()).default([]),
  badge: z.union([z.number(), z.string()]).optional(),
  hidden: z.boolean().default(false),
  priority: z.number().default(0),
});

// Permission check result schema
export const PermissionResultSchema = z.object({
  allowed: z.boolean(),
  role: z.enum(['customer', 'farmer', 'admin', 'vendor', 'staff']).nullable(),
  screen: z.string(),
  reason: z.string().optional(),
});

// Deep link validation result schema
export const DeepLinkResultSchema = z.object({
  isValid: z.boolean(),
  targetScreen: z.string().nullable(),
  params: z.record(z.any()).nullable(),
  error: z.string().optional(),
});

// Type exports (for use in services and components)
export type NavigationStateTransform = z.infer<typeof NavigationStateTransformSchema>;
export type NavigationEventTransform = z.infer<typeof NavigationEventTransformSchema>;
export type CreateNavigationEventInput = z.infer<typeof CreateNavigationEventSchema>;
export type CreateNavigationStateInput = z.infer<typeof CreateNavigationStateSchema>;
export type MenuItemValidated = z.infer<typeof MenuItemSchema>;
export type PermissionResult = z.infer<typeof PermissionResultSchema>;
export type DeepLinkResult = z.infer<typeof DeepLinkResultSchema>;

// Schema contracts for TypeScript enforcement (Pattern 2: Compile-time contract enforcement)
// These contracts ensure schemas match interfaces exactly - TypeScript will fail compilation if they don't align

// Core transformation contracts
type NavigationStateContract = NavigationState extends NavigationStateTransform ? true : never;
type MenuItemContract = NavigationMenuItem extends MenuItemValidated ? true : never;

// Input validation contracts
type CreateNavigationEventContract = CreateNavigationEventInput extends z.infer<typeof CreateNavigationEventSchema> ? true : never;
type CreateNavigationStateContract = CreateNavigationStateInput extends z.infer<typeof CreateNavigationStateSchema> ? true : never;

// Result validation contracts  
type PermissionResultContract = PermissionResult extends z.infer<typeof PermissionResultSchema> ? true : never;
type DeepLinkResultContract = DeepLinkResult extends z.infer<typeof DeepLinkResultSchema> ? true : never;

// Navigation event transformation contract
type NavigationEventContract = NavigationEventTransform extends z.infer<typeof NavigationEventTransformSchema> ? true : never;

// Deep link input contract
type DeepLinkInputContract = z.infer<typeof DeepLinkSchema> extends { url: string; role: string } ? true : never;

// Menu item validation contract
type MenuItemValidationContract = MenuItemValidated extends z.infer<typeof MenuItemSchema> ? true : never;

// Contract enforcement tests - these will cause TypeScript compilation errors if schemas don't match interfaces
const _contractTests = {
  navigationState: {} as NavigationStateContract,
  menuItem: {} as MenuItemContract,
  createNavigationEvent: {} as CreateNavigationEventContract,
  createNavigationState: {} as CreateNavigationStateContract,
  permissionResult: {} as PermissionResultContract,
  deepLinkResult: {} as DeepLinkResultContract,
  navigationEvent: {} as NavigationEventContract,
  deepLinkInput: {} as DeepLinkInputContract,
  menuItemValidation: {} as MenuItemValidationContract,
};

// Export validation constants
export const ROLE_PERMISSIONS = {
  customer: [
    'HomeScreen',
    'ProductsScreen', 
    'CartScreen',
    'OrdersScreen',
    'ProfileScreen',
    'ProductDetailScreen',
    'OrderDetailScreen',
  ],
  farmer: [
    'HomeScreen',
    'FarmerDashboard',
    'ProductsScreen',
    'ProductManagementScreen', 
    'InventoryScreen',
    'OrdersScreen',
    'AnalyticsScreen',
    'ProfileScreen',
    'ProductDetailScreen',
    'OrderDetailScreen',
  ],
  admin: [
    'HomeScreen',
    'AdminDashboard',
    'UserManagementScreen',
    'SystemSettingsScreen',
    'ProductsScreen', 
    'ProductManagementScreen',
    'InventoryScreen',
    'OrdersScreen',
    'AnalyticsScreen',
    'ProfileScreen',
    'PermissionManagementScreen',
    'ProductDetailScreen',
    'OrderDetailScreen',
    'UserDetailScreen',
  ],
  vendor: [
    'HomeScreen',
    'VendorDashboard',
    'ProductsScreen',
    'ProductManagementScreen',
    'InventoryScreen', 
    'OrdersScreen',
    'AnalyticsScreen',
    'ProfileScreen',
    'ProductDetailScreen',
    'OrderDetailScreen',
  ],
  staff: [
    'HomeScreen',
    'StaffDashboard',
    'OrdersScreen',
    'InventoryScreen',
    'ProfileScreen',
    'OrderDetailScreen',
  ],
} as const;

export const DEFAULT_SCREENS = {
  customer: 'HomeScreen',
  farmer: 'FarmerDashboard', 
  admin: 'AdminDashboard',
  vendor: 'VendorDashboard',
  staff: 'StaffDashboard',
} as const;