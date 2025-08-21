# Phase 1: Core Role Infrastructure - Detailed Implementation
**Week 1-2 | Target: 85+ Tests | Foundation for Extensible Role-Based Architecture**

## 🎯 **Phase Objectives**

Build the foundational role-based architecture following product management patterns with:
- Extensible role permission system supporting unlimited future roles
- Analytics data collection foundation for future executive insights  
- Service architecture ready for inventory/marketing/executive extensions
- Comprehensive test coverage ensuring production readiness

---

## 📅 **Daily Implementation Schedule**

### **Day 1-2: Core Role Schema & Contracts**
**Objective**: Database-first schema design with compile-time validation

#### **Task 1.1: Role Permission Database Schema**
```sql
-- database/role-permissions-schema.sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('inventory_staff', 'marketing_staff', 'executive', 'admin')),
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, role_type)
);

-- RLS policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role_type = 'admin' 
      AND ur.is_active = true
    )
  );
```

#### **Task 1.2: Role Schema Contracts (Following Product Management Pattern)**
```typescript
// src/schemas/role-based/rolePermission.schemas.ts
import { z } from 'zod';

// Database contract (exact database shape)
export const RolePermissionDatabaseSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  role_type: z.enum(['inventory_staff', 'marketing_staff', 'executive', 'admin']),
  permissions: z.array(z.string()).nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

export type RolePermissionDatabaseContract = z.infer<typeof RolePermissionDatabaseSchema>;

// Transform schema (database → app format)
export const RolePermissionTransformSchema = RolePermissionDatabaseSchema.transform((data) => ({
  id: data.id,
  userId: data.user_id,
  roleType: data.role_type,
  permissions: data.permissions || [],
  isActive: data.is_active ?? true,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString()
}));

export type RolePermissionTransform = z.infer<typeof RolePermissionTransformSchema>;

// Input validation schema
export const CreateRolePermissionSchema = z.object({
  userId: z.string().min(1),
  roleType: z.enum(['inventory_staff', 'marketing_staff', 'executive', 'admin']),
  permissions: z.array(z.string()).default([])
});

export type CreateRolePermissionInput = z.infer<typeof CreateRolePermissionSchema>;

// Permission definitions (extensible)
export const ROLE_PERMISSIONS = {
  inventory_staff: [
    'view_inventory',
    'update_stock',
    'view_stock_reports',
    'receive_stock',
    'adjust_inventory'
  ],
  marketing_staff: [
    'view_products',
    'update_product_content',
    'create_promotions',
    'manage_bundles',
    'send_notifications',
    'view_marketing_analytics'
  ],
  executive: [
    'view_all_analytics',
    'view_cross_role_insights',
    'generate_strategic_reports',
    'view_business_intelligence'
  ],
  admin: [
    'manage_users',
    'manage_roles',
    'system_administration',
    'view_all_data'
  ]
} as const;
```

#### **Task 1.3: Contract Tests (Compile-Time Validation)**
```typescript
// src/schemas/role-based/__contracts__/rolePermission.contracts.test.ts
import { describe, it, expect } from '@jest/globals';
import type { Database } from '../../../types/database.generated';
import type { RolePermissionDatabaseContract } from '../rolePermission.schemas';

describe('Role Permission Schema Contracts', () => {
  // Test 1: Database interface alignment
  it('should align with generated database types', () => {
    type DatabaseUserRole = Database['public']['Tables']['user_roles']['Row'];
    
    const contractValidator = (row: DatabaseUserRole): RolePermissionDatabaseContract => {
      return {
        id: row.id,              // ✅ Ensures field exists in database
        user_id: row.user_id,    // ✅ Ensures field exists in database  
        role_type: row.role_type, // ✅ Ensures field exists in database
        permissions: row.permissions, // ✅ Ensures field exists in database
        is_active: row.is_active,     // ✅ Ensures field exists in database
        created_at: row.created_at,   // ✅ Ensures field exists in database
        updated_at: row.updated_at    // ✅ Ensures field exists in database
      };
    };
    
    expect(contractValidator).toBeDefined();
  });
  
  // Test 2: Role type validation
  it('should validate role types match system requirements', () => {
    const validRoles = ['inventory_staff', 'marketing_staff', 'executive', 'admin'];
    validRoles.forEach(role => {
      expect(() => {
        RolePermissionDatabaseSchema.parse({
          id: 'test-id',
          user_id: 'user-id', 
          role_type: role,
          permissions: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }).not.toThrow();
    });
  });
  
  // Test 3: Transform schema validation
  it('should transform database format to app format correctly', () => {
    const databaseData = {
      id: 'role-123',
      user_id: 'user-456',
      role_type: 'inventory_staff' as const,
      permissions: ['view_inventory', 'update_stock'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    const transformed = RolePermissionTransformSchema.parse(databaseData);
    
    expect(transformed).toEqual({
      id: 'role-123',
      userId: 'user-456',  // Snake case → camel case
      roleType: 'inventory_staff',  // Snake case → camel case
      permissions: ['view_inventory', 'update_stock'],
      isActive: true,   // Snake case → camel case
      createdAt: '2024-01-01T00:00:00Z',  // Snake case → camel case
      updatedAt: '2024-01-01T00:00:00Z'   // Snake case → camel case
    });
  });
  
  // Test 4: Permission system validation
  it('should validate permission definitions are complete', () => {
    const allRoleTypes = ['inventory_staff', 'marketing_staff', 'executive', 'admin'] as const;
    
    allRoleTypes.forEach(roleType => {
      expect(ROLE_PERMISSIONS[roleType]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[roleType])).toBe(true);
      expect(ROLE_PERMISSIONS[roleType].length).toBeGreaterThan(0);
    });
  });
  
  // Test 5: Schema export validation
  it('should export all required schemas and types', () => {
    expect(RolePermissionDatabaseSchema).toBeDefined();
    expect(RolePermissionTransformSchema).toBeDefined();
    expect(CreateRolePermissionSchema).toBeDefined();
    expect(ROLE_PERMISSIONS).toBeDefined();
  });
});

// Tests 6-15: Edge cases, error scenarios, validation boundaries
describe('Role Permission Schema Edge Cases', () => {
  it('should handle null permissions gracefully', () => {
    const result = RolePermissionTransformSchema.parse({
      id: 'test',
      user_id: 'test',
      role_type: 'admin',
      permissions: null,
      is_active: true,
      created_at: null,
      updated_at: null
    });
    
    expect(result.permissions).toEqual([]);
  });
  
  it('should reject invalid role types', () => {
    expect(() => {
      RolePermissionDatabaseSchema.parse({
        id: 'test',
        user_id: 'test',
        role_type: 'invalid_role',
        permissions: []
      });
    }).toThrow();
  });
  
  it('should handle missing optional fields', () => {
    const result = RolePermissionTransformSchema.parse({
      id: 'test',
      user_id: 'test', 
      role_type: 'admin',
      permissions: undefined,
      is_active: undefined,
      created_at: undefined,
      updated_at: undefined
    });
    
    expect(result.isActive).toBe(true);
    expect(result.permissions).toEqual([]);
  });
  
  // Additional tests 9-15 for comprehensive coverage...
});
```

**Daily Goal**: 15 contract tests passing, schema compilation successful

### **Day 3-4: Role Permission Service**
**Objective**: Build resilient role service following product management patterns

#### **Task 1.4: Role Permission Service**
```typescript
// src/services/role-based/rolePermissionService.ts
import { BaseService } from '../base/BaseService';
import { 
  RolePermissionDatabaseSchema,
  RolePermissionTransformSchema, 
  CreateRolePermissionSchema,
  ROLE_PERMISSIONS,
  type RolePermissionTransform,
  type CreateRolePermissionInput
} from '../../schemas/role-based/rolePermission.schemas';
import { ValidationMonitor } from '../monitoring/ValidationMonitor';
import { TABLES } from '../../constants/database';

export class RolePermissionService extends BaseService {
  /**
   * Get user role with permissions (Pattern 1: Direct Supabase with exact fields)
   */
  static async getUserRole(userId: string): Promise<RolePermissionTransform | null> {
    try {
      // Step 1: Fetch with exact fields (following product management pattern)
      const { data, error } = await this.supabase
        .from(TABLES.USER_ROLES)
        .select(`
          id, user_id, role_type, permissions, 
          is_active, created_at, updated_at
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      // Step 2: Transform and validate (Pattern 3: Resilient processing)
      const transformed = RolePermissionTransformSchema.parse(data);
      
      // Step 3: Track success
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'direct_supabase_transformation',
        operation: 'getUserRole'
      });
      
      return transformed;
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        service: 'rolePermissionService',
        operation: 'getUserRole',
        error: error.message
      });
      
      return null; // Graceful degradation
    }
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      
      if (!userRole) return false;
      
      // Get role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[userRole.roleType] || [];
      const customPermissions = userRole.permissions || [];
      
      // Check both role-based and custom permissions
      const hasPermission = rolePermissions.includes(permission) || 
                           customPermissions.includes(permission);
      
      // Track permission check for analytics
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
   * Create user role (Pattern 2: Input validation)
   */
  static async createUserRole(input: CreateRolePermissionInput): Promise<RolePermissionTransform | null> {
    try {
      // Step 1: Validate input
      const validatedInput = CreateRolePermissionSchema.parse(input);
      
      // Step 2: Insert with database validation
      const { data, error } = await this.supabase
        .from(TABLES.USER_ROLES)
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

      // Step 3: Transform response  
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
   * Get all user roles for admin management
   */
  static async getAllUserRoles(): Promise<{ 
    success: RolePermissionTransform[], 
    errors: any[], 
    totalProcessed: number 
  }> {
    try {
      // Step 1: Fetch all roles
      const { data: rawRoles, error } = await this.supabase
        .from(TABLES.USER_ROLES)
        .select(`
          id, user_id, role_type, permissions,
          is_active, created_at, updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Step 2: Resilient processing (Pattern 3)
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
   * Update user permissions
   */
  static async updateUserPermissions(
    userId: string, 
    permissions: string[]
  ): Promise<RolePermissionTransform | null> {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.USER_ROLES)
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
}

// Export role types for type safety across application
export type RoleType = 'inventory_staff' | 'marketing_staff' | 'executive' | 'admin';
export type Permission = string;
```

#### **Task 1.5: Role Permission Service Tests**
```typescript
// src/services/role-based/__tests__/rolePermissionService.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RolePermissionService } from '../rolePermissionService';
import { ValidationMonitor } from '../../monitoring/ValidationMonitor';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn()
        })),
        single: jest.fn()
      })),
      order: jest.fn(() => ({
        // Additional chaining methods
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }))
};

jest.mock('../../base/BaseService', () => ({
  BaseService: class {
    static supabase = mockSupabase;
    static async processItems(items, processor, operation) {
      const results = { success: [], errors: [], totalProcessed: 0 };
      for (const item of items) {
        try {
          results.success.push(processor(item));
          results.totalProcessed++;
        } catch (error) {
          results.errors.push({ item, error });
        }
      }
      return results;
    }
  }
}));

jest.mock('../../monitoring/ValidationMonitor');

describe('RolePermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return user role when found', async () => {
      const mockRoleData = {
        id: 'role-123',
        user_id: 'user-456',
        role_type: 'inventory_staff',
        permissions: ['view_inventory'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from().select().eq().eq().maybeSingle.mockResolvedValue({
        data: mockRoleData,
        error: null
      });

      const result = await RolePermissionService.getUserRole('user-456');

      expect(result).toEqual({
        id: 'role-123',
        userId: 'user-456',
        roleType: 'inventory_staff',
        permissions: ['view_inventory'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'rolePermissionService',
        pattern: 'direct_supabase_transformation',
        operation: 'getUserRole'
      });
    });

    it('should return null when user role not found', async () => {
      mockSupabase.from().select().eq().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await RolePermissionService.getUserRole('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from().select().eq().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      const result = await RolePermissionService.getUserRole('user-456');
      
      expect(result).toBeNull();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        service: 'rolePermissionService',
        operation: 'getUserRole',
        error: 'Database connection failed'
      });
    });
  });

  describe('hasPermission', () => {
    it('should return true for valid role-based permission', async () => {
      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue({
        id: 'role-123',
        userId: 'user-456',
        roleType: 'inventory_staff',
        permissions: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      const result = await RolePermissionService.hasPermission('user-456', 'view_inventory');
      expect(result).toBe(true);
    });

    it('should return true for valid custom permission', async () => {
      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue({
        id: 'role-123',
        userId: 'user-456',
        roleType: 'inventory_staff',
        permissions: ['custom_permission'],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      const result = await RolePermissionService.hasPermission('user-456', 'custom_permission');
      expect(result).toBe(true);
    });

    it('should return false for invalid permission', async () => {
      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue({
        id: 'role-123',
        userId: 'user-456',
        roleType: 'inventory_staff',
        permissions: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      const result = await RolePermissionService.hasPermission('user-456', 'invalid_permission');
      expect(result).toBe(false);
    });

    it('should return false when user has no role', async () => {
      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(null);

      const result = await RolePermissionService.hasPermission('user-456', 'any_permission');
      expect(result).toBe(false);
    });

    it('should track permission checks for analytics', async () => {
      jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue({
        id: 'role-123',
        userId: 'user-456',
        roleType: 'admin',
        permissions: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      await RolePermissionService.hasPermission('user-456', 'manage_users');

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'rolePermissionService',
        pattern: 'permission_check',
        operation: 'hasPermission',
        details: { permission: 'manage_users', hasPermission: true, roleType: 'admin' }
      });
    });
  });

  describe('createUserRole', () => {
    it('should create user role successfully', async () => {
      const mockCreatedRole = {
        id: 'role-new',
        user_id: 'user-789',
        role_type: 'marketing_staff',
        permissions: ['view_products'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedRole,
        error: null
      });

      const result = await RolePermissionService.createUserRole({
        userId: 'user-789',
        roleType: 'marketing_staff',
        permissions: ['view_products']
      });

      expect(result?.userId).toBe('user-789');
      expect(result?.roleType).toBe('marketing_staff');
    });

    it('should handle creation errors gracefully', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: new Error('Unique constraint violation')
      });

      const result = await RolePermissionService.createUserRole({
        userId: 'user-789',
        roleType: 'admin',
        permissions: []
      });

      expect(result).toBeNull();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });

    it('should validate input before creation', async () => {
      const result = await RolePermissionService.createUserRole({
        userId: '', // Invalid empty string
        roleType: 'admin',
        permissions: []
      });

      expect(result).toBeNull();
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  // Tests 13-15: Additional edge cases and comprehensive coverage
  describe('Edge Cases', () => {
    it('should handle malformed data gracefully', async () => {
      mockSupabase.from().select().eq().eq().maybeSingle.mockResolvedValue({
        data: { invalid: 'data' },
        error: null
      });

      const result = await RolePermissionService.getUserRole('user-456');
      expect(result).toBeNull();
    });

    it('should handle network timeouts', async () => {
      mockSupabase.from().select().eq().eq().maybeSingle.mockRejectedValue(
        new Error('Network timeout')
      );

      const result = await RolePermissionService.getUserRole('user-456');
      expect(result).toBeNull();
    });
  });
});
```

**Daily Goal**: 15 service tests passing, resilient error handling verified

### **Day 5-6: Query Keys & React Query Hooks**  
**Objective**: Extend query key factory and build role-based hooks

#### **Task 1.6: Role Query Keys Extension**
```typescript
// src/hooks/queryKeys/roleKeys.ts
// Following centralized query key factory pattern

export const roleKeys = {
  // Base role keys
  all: () => ['roles'] as const,
  
  // User role queries
  userRoles: () => [...roleKeys.all(), 'user'] as const,
  userRole: (userId: string | undefined) => 
    [...roleKeys.userRoles(), userId] as const,
    
  // Permission queries  
  permissions: () => [...roleKeys.all(), 'permissions'] as const,
  userPermissions: (userId: string | undefined) => 
    [...roleKeys.permissions(), 'user', userId] as const,
  permissionCheck: (userId: string | undefined, permission: string) =>
    [...roleKeys.permissions(), 'check', userId, permission] as const,
    
  // Admin role management
  admin: () => [...roleKeys.all(), 'admin'] as const,
  adminUserRoles: () => [...roleKeys.admin(), 'users'] as const,
  
  // Analytics (future extension point)
  analytics: () => [...roleKeys.all(), 'analytics'] as const,
  roleAnalytics: (roleType: string) => 
    [...roleKeys.analytics(), roleType] as const
} as const;
```

#### **Task 1.7: Role-Based Hooks**
```typescript
// src/hooks/role-based/useUserRole.ts
import { useQuery } from '@tanstack/react-query';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { roleKeys } from '../queryKeys/roleKeys';
import { useCurrentUser } from '../useAuth';

export function useUserRole(userId?: string) {
  const { data: currentUser } = useCurrentUser();
  const targetUserId = userId || currentUser?.id;

  return useQuery({
    queryKey: roleKeys.userRole(targetUserId),
    queryFn: () => RolePermissionService.getUserRole(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,  // 5 minutes (role changes are infrequent)
    gcTime: 30 * 60 * 1000,    // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry permission errors, but retry network errors
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

// src/hooks/role-based/useRolePermissions.ts  
export function useRolePermissions(userId?: string) {
  const { data: userRole } = useUserRole(userId);
  
  return {
    userRole,
    hasPermission: (permission: string) => {
      if (!userRole) return false;
      
      const rolePermissions = ROLE_PERMISSIONS[userRole.roleType] || [];
      const customPermissions = userRole.permissions || [];
      
      return rolePermissions.includes(permission) || 
             customPermissions.includes(permission);
    },
    
    // Convenience methods for common permission checks
    canViewInventory: () => {
      return userRole && (
        userRole.roleType === 'inventory_staff' ||
        userRole.roleType === 'admin'
      );
    },
    
    canManageMarketing: () => {
      return userRole && (
        userRole.roleType === 'marketing_staff' ||
        userRole.roleType === 'admin'
      );
    },
    
    canViewExecutive: () => {
      return userRole && (
        userRole.roleType === 'executive' ||
        userRole.roleType === 'admin'
      );
    },
    
    isAdmin: () => {
      return userRole?.roleType === 'admin';
    }
  };
}

// src/hooks/role-based/useRoleNavigation.ts
export function useRoleNavigation() {
  const { userRole, hasPermission, canViewInventory, canManageMarketing, canViewExecutive } = 
    useRolePermissions();
    
  const navigationItems = useMemo(() => {
    if (!userRole) return [];
    
    const items = [
      { title: 'Dashboard', screen: 'RoleDashboard', icon: 'dashboard', available: true }
    ];
    
    if (canViewInventory()) {
      items.push(
        { title: 'Inventory', screen: 'InventoryDashboard', icon: 'inventory', available: true },
        { title: 'Stock Management', screen: 'StockManagement', icon: 'stock', available: true }
      );
    }
    
    if (canManageMarketing()) {
      items.push(
        { title: 'Marketing', screen: 'MarketingDashboard', icon: 'marketing', available: true },
        { title: 'Content', screen: 'ProductContent', icon: 'content', available: true }
      );
    }
    
    if (canViewExecutive()) {
      items.push(
        { title: 'Executive', screen: 'ExecutiveDashboard', icon: 'executive', available: true },
        { title: 'Business Intelligence', screen: 'BusinessIntelligence', icon: 'analytics', available: true }
      );
    }
    
    return items;
  }, [userRole, canViewInventory, canManageMarketing, canViewExecutive]);
  
  return {
    navigationItems,
    userRole,
    hasPermission
  };
}

// src/hooks/role-based/useAdminRoleManagement.ts (Admin functionality)
export function useAdminRoleManagement() {
  const queryClient = useQueryClient();
  
  const allRolesQuery = useQuery({
    queryKey: roleKeys.adminUserRoles(),
    queryFn: () => RolePermissionService.getAllUserRoles(),
    enabled: true, // Will be protected at component level
    staleTime: 2 * 60 * 1000  // 2 minutes for admin data
  });
  
  const createRoleMutation = useMutation({
    mutationFn: RolePermissionService.createUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.adminUserRoles() });
    }
  });
  
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: string, permissions: string[] }) =>
      RolePermissionService.updateUserPermissions(userId, permissions),
    onSuccess: (data) => {
      if (data) {
        // Update specific user role in cache
        queryClient.setQueryData(roleKeys.userRole(data.userId), data);
        // Invalidate admin list
        queryClient.invalidateQueries({ queryKey: roleKeys.adminUserRoles() });
      }
    }
  });
  
  return {
    allRoles: allRolesQuery.data?.success || [],
    allRolesError: allRolesQuery.error,
    isLoading: allRolesQuery.isLoading,
    createRole: createRoleMutation.mutate,
    updatePermissions: updatePermissionsMutation.mutate,
    isCreating: createRoleMutation.isPending,
    isUpdating: updatePermissionsMutation.isPending
  };
}
```

#### **Task 1.8: Hook Tests**
```typescript
// src/hooks/role-based/__tests__/useUserRole.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserRole } from '../useUserRole';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';

jest.mock('../../../services/role-based/rolePermissionService');
jest.mock('../../useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 'current-user-123' } })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useUserRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch user role successfully', async () => {
    const mockRole = {
      id: 'role-123',
      userId: 'user-456',
      roleType: 'inventory_staff' as const,
      permissions: ['view_inventory'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    (RolePermissionService.getUserRole as jest.Mock).mockResolvedValue(mockRole);

    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockRole);
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle user role not found', async () => {
    (RolePermissionService.getUserRole as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useUserRole('nonexistent'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toBeNull();
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should use current user when no userId provided', async () => {
    const mockRole = {
      id: 'role-current',
      userId: 'current-user-123',
      roleType: 'admin' as const,
      permissions: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    (RolePermissionService.getUserRole as jest.Mock).mockResolvedValue(mockRole);

    const { result } = renderHook(() => useUserRole(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockRole);
    });

    expect(RolePermissionService.getUserRole).toHaveBeenCalledWith('current-user-123');
  });

  it('should not fetch when no userId available', () => {
    const { result } = renderHook(() => useUserRole(undefined), {
      wrapper: createWrapper()
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(RolePermissionService.getUserRole).not.toHaveBeenCalled();
  });

  it('should handle service errors gracefully', async () => {
    (RolePermissionService.getUserRole as jest.Mock).mockRejectedValue(
      new Error('Service unavailable')
    );

    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Service unavailable');
    });
  });

  it('should cache results appropriately', async () => {
    const mockRole = {
      id: 'role-123',
      userId: 'user-456',
      roleType: 'marketing_staff' as const,
      permissions: [],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    (RolePermissionService.getUserRole as jest.Mock).mockResolvedValue(mockRole);

    const { result, rerender } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockRole);
    });

    // Clear mock calls
    jest.clearAllMocks();

    // Rerender should use cached data
    rerender();

    expect(RolePermissionService.getUserRole).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(mockRole);
  });

  // Tests 7-12: Additional hook behavior, error scenarios, and edge cases...
});

// src/hooks/role-based/__tests__/useRolePermissions.test.ts  
describe('useRolePermissions', () => {
  // 10 comprehensive tests for permission logic
  // ...
});

// src/hooks/role-based/__tests__/useRoleNavigation.test.ts
describe('useRoleNavigation', () => {
  // 8 tests for navigation logic  
  // ...
});
```

**Daily Goal**: 30 hook tests passing, React Query integration verified

### **Day 7-8: Analytics Foundation & Navigation Structure**
**Objective**: Build analytics collection foundation and role navigation

#### **Task 1.9: Role Analytics Service**
```typescript
// src/services/role-based/roleAnalyticsService.ts
import { BaseService } from '../base/BaseService';
import { ValidationMonitor } from '../monitoring/ValidationMonitor';

export interface RoleAnalyticsData {
  userId: string;
  roleType: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  tier: 'operational' | 'strategic' | 'executive';
}

export class RoleAnalyticsService extends BaseService {
  /**
   * Collect operational-level analytics (role-specific actions)
   */
  static async collectOperationalMetrics(data: {
    userId: string;
    roleType: string;
    action: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const analyticsData: RoleAnalyticsData = {
        ...data,
        timestamp: new Date().toISOString(),
        tier: 'operational',
        sessionId: this.generateSessionId()
      };
      
      // Store in analytics table (future implementation)
      await this.storeAnalyticsData(analyticsData);
      
      // Track for monitoring
      ValidationMonitor.recordPatternSuccess({
        service: 'roleAnalyticsService',
        pattern: 'operational_analytics',
        operation: 'collectOperationalMetrics',
        details: { roleType: data.roleType, action: data.action }
      });
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        service: 'roleAnalyticsService',
        operation: 'collectOperationalMetrics',
        error: error.message
      });
    }
  }
  
  /**
   * Collect strategic-level analytics (cross-role correlations)
   */
  static async collectStrategicMetrics(data: {
    correlationType: string;
    sourceRole: string;
    targetRole: string;
    impact: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    try {
      const analyticsData: RoleAnalyticsData = {
        userId: 'system', // System-generated correlation
        roleType: 'cross_role',
        action: data.correlationType,
        timestamp: new Date().toISOString(),
        tier: 'strategic',
        metadata: {
          sourceRole: data.sourceRole,
          targetRole: data.targetRole,
          impact: data.impact,
          ...data.metadata
        }
      };
      
      await this.storeAnalyticsData(analyticsData);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'roleAnalyticsService',
        pattern: 'strategic_analytics',
        operation: 'collectStrategicMetrics'
      });
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        service: 'roleAnalyticsService',
        operation: 'collectStrategicMetrics',
        error: error.message
      });
    }
  }
  
  /**
   * Future: Collect executive-level analytics (business intelligence)
   */
  static async collectExecutiveMetrics(data: {
    businessMetric: string;
    value: number;
    context: Record<string, any>;
  }) {
    try {
      const analyticsData: RoleAnalyticsData = {
        userId: 'system',
        roleType: 'executive_intelligence',
        action: data.businessMetric,
        timestamp: new Date().toISOString(),
        tier: 'executive',
        metadata: {
          value: data.value,
          context: data.context
        }
      };
      
      await this.storeAnalyticsData(analyticsData);
      
    } catch (error) {
      ValidationMonitor.recordValidationError({
        service: 'roleAnalyticsService',
        operation: 'collectExecutiveMetrics',
        error: error.message
      });
    }
  }
  
  /**
   * Store analytics data (implementation varies by storage solution)
   */
  private static async storeAnalyticsData(data: RoleAnalyticsData) {
    // Future implementation:
    // - Could store in Supabase analytics table
    // - Could send to external analytics service  
    // - Could store in local state for development
    
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics:', data);
    }
  }
  
  /**
   * Generate session ID for tracking user sessions
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

#### **Task 1.10: Role Navigation Service**
```typescript
// src/services/role-based/roleNavigationService.ts
import { RoleType } from './rolePermissionService';

export interface NavigationItem {
  id: string;
  title: string;
  screen: string;
  icon: string;
  badge?: string;
  available: boolean;
  requiredPermissions?: string[];
  children?: NavigationItem[];
}

export class RoleNavigationService {
  /**
   * Generate navigation items based on role and permissions
   */
  static generateNavigationItems(
    roleType: RoleType, 
    permissions: string[]
  ): NavigationItem[] {
    const baseItems: NavigationItem[] = [
      {
        id: 'dashboard',
        title: 'Dashboard',
        screen: 'RoleDashboard',
        icon: 'dashboard',
        available: true
      }
    ];
    
    const roleSpecificItems = this.getRoleSpecificItems(roleType);
    const filteredItems = roleSpecificItems.filter(item => 
      this.hasRequiredPermissions(item, permissions)
    );
    
    return [...baseItems, ...filteredItems];
  }
  
  /**
   * Get role-specific navigation items
   */
  private static getRoleSpecificItems(roleType: RoleType): NavigationItem[] {
    const items: Record<RoleType, NavigationItem[]> = {
      inventory_staff: [
        {
          id: 'inventory',
          title: 'Inventory',
          screen: 'InventoryDashboard',
          icon: 'inventory',
          available: true,
          children: [
            {
              id: 'stock_management',
              title: 'Stock Management',
              screen: 'StockManagement', 
              icon: 'stock',
              available: true,
              requiredPermissions: ['update_stock']
            },
            {
              id: 'inventory_alerts',
              title: 'Alerts',
              screen: 'InventoryAlerts',
              icon: 'alert',
              available: true,
              requiredPermissions: ['view_inventory']
            },
            {
              id: 'inventory_analytics',
              title: 'Analytics',
              screen: 'InventoryAnalytics',
              icon: 'analytics',
              available: true,
              requiredPermissions: ['view_stock_reports']
            }
          ]
        }
      ],
      
      marketing_staff: [
        {
          id: 'marketing',
          title: 'Marketing',
          screen: 'MarketingDashboard',
          icon: 'marketing',
          available: true,
          children: [
            {
              id: 'product_content',
              title: 'Content',
              screen: 'ProductContent',
              icon: 'content',
              available: true,
              requiredPermissions: ['update_product_content']
            },
            {
              id: 'promotions',
              title: 'Promotions',
              screen: 'PromotionPlanner',
              icon: 'promotion',
              available: true,
              requiredPermissions: ['create_promotions']
            },
            {
              id: 'bundles',
              title: 'Bundles',
              screen: 'BundleManagement',
              icon: 'bundle',
              available: true,
              requiredPermissions: ['manage_bundles']
            },
            {
              id: 'marketing_analytics',
              title: 'Analytics',
              screen: 'MarketingAnalytics',
              icon: 'analytics',
              available: true,
              requiredPermissions: ['view_marketing_analytics']
            }
          ]
        }
      ],
      
      executive: [
        {
          id: 'executive',
          title: 'Executive',
          screen: 'ExecutiveDashboard',
          icon: 'executive',
          available: true,
          children: [
            {
              id: 'business_intelligence',
              title: 'Business Intelligence',
              screen: 'BusinessIntelligence',
              icon: 'analytics',
              available: true,
              requiredPermissions: ['view_cross_role_insights']
            },
            {
              id: 'strategic_reports',
              title: 'Reports',
              screen: 'StrategicReports',
              icon: 'reports',
              available: true,
              requiredPermissions: ['generate_strategic_reports']
            },
            {
              id: 'predictive_analytics',
              title: 'Predictive Analytics',
              screen: 'PredictiveAnalytics',
              icon: 'forecast',
              available: true,
              requiredPermissions: ['view_business_intelligence']
            }
          ]
        }
      ],
      
      admin: [
        // Admin sees all navigation items
        ...this.getRoleSpecificItems('inventory_staff'),
        ...this.getRoleSpecificItems('marketing_staff'),
        ...this.getRoleSpecificItems('executive'),
        {
          id: 'admin',
          title: 'Administration',
          screen: 'AdminPanel',
          icon: 'admin',
          available: true,
          children: [
            {
              id: 'user_management',
              title: 'Users',
              screen: 'UserManagement',
              icon: 'users',
              available: true,
              requiredPermissions: ['manage_users']
            },
            {
              id: 'role_management',
              title: 'Roles',
              screen: 'RoleManagement',
              icon: 'roles',
              available: true,
              requiredPermissions: ['manage_roles']
            }
          ]
        }
      ]
    };
    
    return items[roleType] || [];
  }
  
  /**
   * Check if user has required permissions for navigation item
   */
  private static hasRequiredPermissions(
    item: NavigationItem, 
    userPermissions: string[]
  ): boolean {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }
    
    return item.requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
  }
  
  /**
   * Get quick actions for role (dashboard shortcuts)
   */
  static getQuickActions(roleType: RoleType): NavigationItem[] {
    const quickActions: Record<RoleType, NavigationItem[]> = {
      inventory_staff: [
        { id: 'receive_stock', title: 'Receive Stock', screen: 'ReceiveStock', icon: 'receive', available: true },
        { id: 'adjust_inventory', title: 'Adjust Inventory', screen: 'InventoryAdjustment', icon: 'adjust', available: true },
        { id: 'cycle_count', title: 'Cycle Count', screen: 'CycleCount', icon: 'count', available: true }
      ],
      
      marketing_staff: [
        { id: 'upload_content', title: 'Upload Content', screen: 'UploadContent', icon: 'upload', available: true },
        { id: 'create_promotion', title: 'Create Promotion', screen: 'CreatePromotion', icon: 'create', available: true },
        { id: 'push_notification', title: 'Push Notification', screen: 'PushNotification', icon: 'notification', available: true }
      ],
      
      executive: [
        { id: 'strategic_report', title: 'Generate Report', screen: 'GenerateReport', icon: 'report', available: true },
        { id: 'business_insight', title: 'Business Insights', screen: 'BusinessInsights', icon: 'insight', available: true }
      ],
      
      admin: [
        { id: 'create_user', title: 'Create User', screen: 'CreateUser', icon: 'user_add', available: true },
        { id: 'system_status', title: 'System Status', screen: 'SystemStatus', icon: 'status', available: true }
      ]
    };
    
    return quickActions[roleType] || [];
  }
}
```

**Daily Goal**: Analytics foundation ready, navigation service complete, integration tests passing

---

## 🧪 **Phase 1 Testing Strategy Summary**

### **Test Coverage Breakdown (85 Total Tests)**
- **Schema Contract Tests**: 15 tests
- **Service Layer Tests**: 15 tests  
- **Hook Integration Tests**: 30 tests
- **Navigation Service Tests**: 10 tests
- **Analytics Service Tests**: 5 tests
- **Integration Tests**: 10 tests

### **Quality Gates**
- All contract tests must pass (compile-time validation)
- 90%+ service test coverage with error scenarios
- Hook tests must include race condition scenarios
- Navigation logic must handle all role combinations
- Analytics collection must be verified

### **Success Criteria**
- Role permission system handles all current and future role types
- Service layer follows product management resilient patterns
- Hook layer integrates seamlessly with React Query caching
- Navigation supports unlimited role extensions
- Analytics foundation ready for executive tier implementation
- Zero breaking changes to existing codebase

This phase establishes the bulletproof foundation for extensible role-based architecture while maintaining the high standards of the product management system.