import { z } from 'zod';

// Following docs/architectural-patterns-and-best-practices.md

// Step 1: Raw database schema (exact database shape)
// Pattern 2: Database-First Validation - handle nulls explicitly
const RolePermissionDatabaseSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  role_type: z.enum(['inventory_staff', 'marketing_staff', 'executive', 'admin']),
  permissions: z.array(z.string()).nullable().optional(),  // Database allows null
  is_active: z.boolean().nullable().optional(),           // Database allows null
  created_at: z.string().nullable().optional(),           // Database allows null
  updated_at: z.string().nullable().optional()            // Database allows null
});

export type RolePermissionDatabaseContract = z.infer<typeof RolePermissionDatabaseSchema>;

// Step 2: Interface definition (must match transformation exactly)
export interface RolePermissionTransform {
  id: string;
  userId: string;
  roleType: 'inventory_staff' | 'marketing_staff' | 'executive' | 'admin';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Step 3: Transformation schema (DB → App format with MANDATORY return type annotation)
// Pattern 4: Transformation Schema Architecture - return type annotation ensures completeness
export const RolePermissionTransformSchema = RolePermissionDatabaseSchema.transform((data): RolePermissionTransform => {
  //                                                                                       ^^^^^^^^^^^^^^^^^^^^^
  //                                                                                       CRITICAL: Return type annotation
  //                                                                                       ensures completeness!
  return {
    id: data.id,
    userId: data.user_id,                           // Snake → camel case
    roleType: data.role_type,                       // Snake → camel case
    permissions: data.permissions || [],             // Null-safe default (Pattern 2)
    isActive: data.is_active ?? true,               // Snake → camel, null-safe default
    createdAt: data.created_at || new Date().toISOString(), // Null-safe default
    updatedAt: data.updated_at || new Date().toISOString()  // Null-safe default
  };
});

// Step 4: Input validation schema
export const CreateRolePermissionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleType: z.enum(['inventory_staff', 'marketing_staff', 'executive', 'admin']),
  permissions: z.array(z.string()).default([])
});

export type CreateRolePermissionInput = z.infer<typeof CreateRolePermissionSchema>;

// Step 5: Permission definitions (extensible for future roles)
// Following Pattern: Role-based permissions with easy extensibility
export const ROLE_PERMISSIONS = {
  inventory_staff: [
    'view_inventory',
    'update_stock', 
    'view_stock_reports',
    'receive_stock',
    'adjust_inventory',
    'inventory_management'
  ],
  marketing_staff: [
    'view_products',
    'update_product_content',
    'create_promotions',
    'manage_bundles', 
    'send_notifications',
    'view_marketing_analytics',
    'content_management',
    'campaign_management'
  ],
  executive: [
    'view_all_analytics',
    'view_cross_role_insights',
    'generate_strategic_reports',
    'view_business_intelligence',
    'executive_analytics'
  ],
  admin: [
    'manage_users',
    'manage_roles',
    'system_administration',
    'view_all_data',
    'content_management',
    'campaign_management',
    'inventory_management',
    'executive_analytics'
  ]
} as const;

// Step 6: Type exports for application use
export type RoleType = keyof typeof ROLE_PERMISSIONS;
export type Permission = string;

// Export the database schema for service layer usage
export { RolePermissionDatabaseSchema };