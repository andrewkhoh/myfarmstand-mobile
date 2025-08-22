# Revised Role-Based Implementation Plan
**Strict Architectural Compliance with Test-First Workflow**

## 🎯 **Core Principles from docs/architectural-patterns-and-best-practices.md**

### **Quality-First Architecture Philosophy**
1. **Fail gracefully** - Systems degrade gracefully rather than crash completely
2. **Validate defensively** - Assume external data can be malformed or incomplete  
3. **User experience first** - Never break the user's workflow due to edge cases
4. **Type safety everywhere** - Leverage TypeScript's strengths throughout
5. **Monitor everything** - Track both successes and failures for production insights

### **Mandatory Pattern Compliance**
- ✅ **Single Validation Pass Principle** (Zod Pattern 1)
- ✅ **Database-First Validation** (Zod Pattern 2) 
- ✅ **Resilient Item Processing** (Zod Pattern 3)
- ✅ **Transformation Schema Architecture** (Zod Pattern 4)
- ✅ **Compile-Time Contract Enforcement** (Schema Contract Pattern 1)
- ✅ **Centralized Query Key Factory** (React Query Pattern 1) - NO DUAL SYSTEMS
- ✅ **User-Isolated Query Keys** (React Query Pattern 2)
- ✅ **ValidationMonitor Integration** throughout all services

---

## 🧪 **Test-First Workflow with Commit Gates**

### **Mandatory Testing Sequence**
```bash
# For EVERY development cycle:

1. Write failing test first
2. Run test → RED (failing)
3. Write minimal code to pass test
4. Run test → GREEN (passing)
5. Refactor if needed
6. Run ALL tests in module
7. Run schema contract validation
8. Run architectural pattern validation
9. ONLY THEN commit

# Pre-commit validation (automatic):
npm run validate:admin           # Schema contracts + patterns
npm run test:services            # Service layer tests
npm run test:hooks              # Hook layer tests
npx tsc --noEmit                # TypeScript validation

# If ANY validation fails → commit blocked
```

### **Commit Gate Enforcement**
```javascript
// .husky/pre-commit (already exists, enhanced)
#!/usr/bin/env sh

echo "🔍 Role-based architecture validation..."

# 1. Schema contract validation (MANDATORY)
echo "🔧 Validating schema contracts..."
npx tsc --noEmit src/schemas/role-based/__contracts__/*.test.ts
if [ $? -ne 0 ]; then
  echo "❌ Schema contracts failed - fix TypeScript errors"
  exit 1
fi

# 2. Architectural pattern validation
echo "🏗️ Validating architectural patterns..."
npm run validate:role-patterns
if [ $? -ne 0 ]; then
  echo "❌ Pattern validation failed"
  exit 1
fi

# 3. Service layer tests
echo "🧪 Running service tests..."
npm run test:services:role-based
if [ $? -ne 0 ]; then
  echo "❌ Service tests failed"
  exit 1
fi

# 4. Hook layer tests  
echo "🎣 Running hook tests..."
npm run test:hooks:role-based
if [ $? -ne 0 ]; then
  echo "❌ Hook tests failed"
  exit 1
fi

echo "✅ All validations passed - commit allowed"
```

---

## 📋 **Phase 1: Core Role Infrastructure (Week 1-2)**

### **Day 1: Database Schema & Contract Foundation**

#### **1.1 Database Schema (Test-First)**
```sql
-- tests/database/role-schema.sql (Test schema first)
-- Create test database structure for validation
CREATE TABLE test_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('inventory_staff', 'marketing_staff', 'executive', 'admin')),
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, role_type)
);

-- Test data insertion
INSERT INTO test_user_roles (user_id, role_type, permissions) VALUES
  ('test-user-1', 'inventory_staff', '["view_inventory", "update_stock"]'),
  ('test-user-2', 'marketing_staff', '["update_product_content", "create_promotions"]');

-- Validate constraints work
-- These should fail:
-- INSERT INTO test_user_roles (user_id, role_type) VALUES ('test-user-1', 'invalid_role');
-- INSERT INTO test_user_roles (user_id, role_type) VALUES ('test-user-1', 'inventory_staff'); -- Duplicate

-- database/role-permissions-schema.sql (Production schema)
-- Copy test schema after validation passes
```

#### **1.2 Schema Contracts (Following Pattern 1: Compile-Time Contract Enforcement)**
```typescript
// src/schemas/role-based/__contracts__/rolePermission.contracts.test.ts
import { describe, it, expect } from '@jest/globals';
import type { Database } from '../../../types/database.generated';
import { 
  RolePermissionDatabaseSchema, 
  RolePermissionTransformSchema,
  type RolePermissionDatabaseContract,
  type RolePermissionTransform
} from '../rolePermission.schemas';

describe('Role Permission Schema Contracts', () => {
  // Contract Test 1: Database interface alignment (MANDATORY)
  it('must align with generated database types', () => {
    type DatabaseUserRole = Database['public']['Tables']['user_roles']['Row'];
    
    // This function MUST compile - if it doesn't, schema is wrong
    const contractValidator = (row: DatabaseUserRole): RolePermissionDatabaseContract => {
      return {
        id: row.id,                    // ✅ Compile fails if missing
        user_id: row.user_id,          // ✅ Compile fails if missing
        role_type: row.role_type,      // ✅ Compile fails if missing
        permissions: row.permissions,   // ✅ Compile fails if missing
        is_active: row.is_active,      // ✅ Compile fails if missing
        created_at: row.created_at,    // ✅ Compile fails if missing
        updated_at: row.updated_at     // ✅ Compile fails if missing
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Transformation completeness (MANDATORY)
  it('must transform all database fields to interface fields', () => {
    const databaseData: RolePermissionDatabaseContract = {
      id: 'role-123',
      user_id: 'user-456', 
      role_type: 'inventory_staff',
      permissions: ['view_inventory'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const transformed = RolePermissionTransformSchema.parse(databaseData);
    
    // Verify EVERY interface field is populated
    expect(transformed.id).toBe('role-123');
    expect(transformed.userId).toBe('user-456');     // Snake → camel
    expect(transformed.roleType).toBe('inventory_staff'); // Snake → camel  
    expect(transformed.permissions).toEqual(['view_inventory']);
    expect(transformed.isActive).toBe(true);         // Snake → camel
    expect(transformed.createdAt).toBeDefined();     // Snake → camel
    expect(transformed.updatedAt).toBeDefined();     // Snake → camel
  });

  // Contract Test 3: Handle nulls gracefully (Pattern 2: Database-First Validation)
  it('must handle database nulls without breaking', () => {
    const nullData = {
      id: 'test-id',
      user_id: 'test-user',
      role_type: 'admin' as const,
      permissions: null,        // Database allows null
      is_active: null,         // Database allows null
      created_at: null,        // Database allows null
      updated_at: null         // Database allows null
    };

    const result = RolePermissionTransformSchema.parse(nullData);
    
    expect(result.permissions).toEqual([]);              // Null → empty array
    expect(result.isActive).toBe(true);                 // Null → default true
    expect(result.createdAt).toMatch(/\d{4}-\d{2}-\d{2}/); // Null → current timestamp
    expect(result.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}/); // Null → current timestamp
  });

  // Additional contract tests 4-15...
});

// Run this test FIRST: npm test src/schemas/role-based/__contracts__/
// If this fails, DO NOT proceed to service layer
```

#### **1.3 Schema Implementation (Following Pattern 4: Transformation Schema Architecture)**
```typescript
// src/schemas/role-based/rolePermission.schemas.ts
import { z } from 'zod';

// Step 1: Raw database schema (exact database shape)
const RolePermissionDatabaseSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  role_type: z.enum(['inventory_staff', 'marketing_staff', 'executive', 'admin']),
  permissions: z.array(z.string()).nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

export type RolePermissionDatabaseContract = z.infer<typeof RolePermissionDatabaseSchema>;

// Step 2: Transformation schema (DB → App format with return type annotation)
export const RolePermissionTransformSchema = RolePermissionDatabaseSchema.transform((data): RolePermissionTransform => {
  //                                                                                        ^^^^^^^^^^^^^^^^^^^^^
  //                                                                                        CRITICAL: Return type annotation
  //                                                                                        ensures completeness!
  return {
    id: data.id,
    userId: data.user_id,                           // Snake → camel case
    roleType: data.role_type,                       // Snake → camel case
    permissions: data.permissions || [],             // Null-safe default
    isActive: data.is_active ?? true,               // Snake → camel, null-safe default
    createdAt: data.created_at || new Date().toISOString(), // Null-safe default
    updatedAt: data.updated_at || new Date().toISOString()  // Null-safe default
  };
});

// Step 3: Interface definition (must match transformation exactly)
export interface RolePermissionTransform {
  id: string;
  userId: string;
  roleType: 'inventory_staff' | 'marketing_staff' | 'executive' | 'admin';
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Step 4: Input validation schema
export const CreateRolePermissionSchema = z.object({
  userId: z.string().min(1),
  roleType: z.enum(['inventory_staff', 'marketing_staff', 'executive', 'admin']),
  permissions: z.array(z.string()).default([])
});

export type CreateRolePermissionInput = z.infer<typeof CreateRolePermissionSchema>;

// Step 5: Permission definitions (extensible for future roles)
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

// Step 6: Type exports
export type RoleType = keyof typeof ROLE_PERMISSIONS;
export type Permission = string;

// Commit Gate: npm test __contracts__ must pass before proceeding
```

**Commit Gate 1**: Schema contracts + TypeScript compilation must pass
```bash
npm test src/schemas/role-based/__contracts__/
npx tsc --noEmit src/schemas/role-based/
# ✅ All pass → Commit allowed
# ❌ Any fail → Fix before proceeding
```

### **Day 2: Service Layer (Following Pattern 3: Resilient Item Processing)**

#### **2.1 Service Tests First (TDD)**
```typescript
// src/services/role-based/__tests__/rolePermissionService.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RolePermissionService } from '../rolePermissionService';
import { ValidationMonitor } from '../../monitoring/ValidationMonitor';

// Mock dependencies
jest.mock('../../monitoring/ValidationMonitor');

describe('RolePermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: getUserRole success path (write test first, then implement)
  it('should get user role with resilient processing', async () => {
    // This test will FAIL initially - that's expected in TDD
    const mockRoleData = {
      id: 'role-123',
      user_id: 'user-456',
      role_type: 'inventory_staff',
      permissions: ['view_inventory'],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    // Mock Supabase response
    jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue({
      id: 'role-123',
      userId: 'user-456', 
      roleType: 'inventory_staff',
      permissions: ['view_inventory'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });

    const result = await RolePermissionService.getUserRole('user-456');

    // Validate transformation occurred correctly
    expect(result?.userId).toBe('user-456'); // Snake → camel case
    expect(result?.roleType).toBe('inventory_staff');
    
    // Validate monitoring integration
    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
      service: 'rolePermissionService',
      pattern: 'direct_supabase_transformation',
      operation: 'getUserRole'
    });
  });

  // Test 2: Resilient processing with malformed data
  it('should skip invalid items and continue processing', async () => {
    // Test Pattern 3: Resilient Item Processing
    const mockRoleData = [
      { id: '1', user_id: 'user-1', role_type: 'admin' },        // Valid
      { id: '2', invalid: 'data' },                              // Invalid - should be skipped
      { id: '3', user_id: 'user-3', role_type: 'inventory_staff' } // Valid
    ];

    const result = await RolePermissionService.getAllUserRoles();
    
    // Should process valid items, skip invalid ones
    expect(result.success).toHaveLength(2);  // 2 valid items
    expect(result.errors).toHaveLength(1);   // 1 invalid item
    expect(result.totalProcessed).toBe(2);   // Only valid items counted
    
    // Validate error monitoring
    expect(ValidationMonitor.recordValidationError).toHaveBeenCalledTimes(1);
  });

  // Tests 3-15: Additional service behaviors, error scenarios, edge cases
  // Write all tests FIRST, then implement service
});

// Run test first: npm test rolePermissionService.test.ts
// Expected result: ALL TESTS FAIL (no implementation yet)
```

#### **2.2 Service Implementation (Following Direct Supabase Pattern)**
```typescript
// src/services/role-based/rolePermissionService.ts
import { BaseService } from '../base/BaseService';
import { 
  RolePermissionTransformSchema,
  CreateRolePermissionSchema,
  ROLE_PERMISSIONS,
  type RolePermissionTransform,
  type CreateRolePermissionInput,
  type RoleType
} from '../../schemas/role-based/rolePermission.schemas';
import { ValidationMonitor } from '../monitoring/ValidationMonitor';
import { TABLES } from '../../constants/database';

export class RolePermissionService extends BaseService {
  /**
   * Get user role (Pattern 1: Direct Supabase with exact fields)
   */
  static async getUserRole(userId: string): Promise<RolePermissionTransform | null> {
    try {
      // Step 1: Fetch with exact database fields (critical for Pattern 2)
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

      // Step 2: Single validation pass (Pattern 1)
      const transformed = RolePermissionTransformSchema.parse(data);
      
      // Step 3: Monitor success (MANDATORY)
      ValidationMonitor.recordPatternSuccess({
        service: 'rolePermissionService',
        pattern: 'direct_supabase_transformation',
        operation: 'getUserRole'
      });
      
      return transformed;
      
    } catch (error) {
      // Step 4: Monitor failure, graceful degradation
      ValidationMonitor.recordValidationError({
        service: 'rolePermissionService',
        operation: 'getUserRole',
        error: error.message
      });
      
      return null; // Graceful degradation - UI can handle null
    }
  }

  /**
   * Get all user roles (Pattern 3: Resilient Item Processing)  
   */
  static async getAllUserRoles(): Promise<{
    success: RolePermissionTransform[];
    errors: any[];
    totalProcessed: number;
  }> {
    try {
      // Step 1: Fetch all raw data
      const { data: rawRoles, error } = await this.supabase
        .from(TABLES.USER_ROLES)
        .select(`
          id, user_id, role_type, permissions,
          is_active, created_at, updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Step 2: Resilient processing (Pattern 3 - MANDATORY)
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
   * Check permission (business logic with monitoring)
   */
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      
      if (!userRole) return false;
      
      // Get role-based permissions + custom permissions
      const rolePermissions = ROLE_PERMISSIONS[userRole.roleType] || [];
      const customPermissions = userRole.permissions || [];
      
      const hasPermission = rolePermissions.includes(permission) || 
                           customPermissions.includes(permission);
      
      // Monitor permission checks for analytics/security
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
   * Create user role (Input validation + atomic operation)
   */
  static async createUserRole(input: CreateRolePermissionInput): Promise<RolePermissionTransform | null> {
    try {
      // Step 1: Input validation (Pattern 2)
      const validatedInput = CreateRolePermissionSchema.parse(input);
      
      // Step 2: Atomic database operation
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

      // Step 3: Transform and validate response
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
}
```

**Commit Gate 2**: Service tests must pass
```bash
npm test src/services/role-based/
# ✅ All 15+ service tests pass → Commit allowed
# ❌ Any fail → Fix implementation
```

### **Day 3: Query Key Factory Extension (Following React Query Pattern 1)**

#### **3.1 Query Key Extension (NO DUAL SYSTEMS)**
```typescript
// src/hooks/queryKeys/roleKeys.ts
// CRITICAL: Extend centralized factory, don't create duplicate

import { createQueryKeyFactory } from '../utils/queryKeyFactory';

// Extend existing factory (NEVER create duplicate)
export const roleKeys = {
  // Base role keys
  all: () => ['roles'] as const,
  
  // User role queries (user-isolated per Pattern 2)
  userRoles: () => [...roleKeys.all(), 'user'] as const,
  userRole: (userId: string | undefined) => 
    [...roleKeys.userRoles(), userId] as const,
    
  // Permission queries
  permissions: () => [...roleKeys.all(), 'permissions'] as const,
  userPermissions: (userId: string | undefined) => 
    [...roleKeys.permissions(), 'user', userId] as const,
  permissionCheck: (userId: string | undefined, permission: string) =>
    [...roleKeys.permissions(), 'check', userId, permission] as const,
    
  // Admin management (admin-specific)
  admin: () => [...roleKeys.all(), 'admin'] as const,
  adminUserRoles: () => [...roleKeys.admin(), 'users'] as const,
  
  // Future extension points (analytics, etc.)
  analytics: () => [...roleKeys.all(), 'analytics'] as const,
  roleAnalytics: (roleType: string) => 
    [...roleKeys.analytics(), roleType] as const
} as const;

// Export factory pattern for consistency
export type RoleKeys = typeof roleKeys;
```

#### **3.2 Role Hook Implementation (TDD)**
```typescript
// src/hooks/role-based/__tests__/useUserRole.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserRole } from '../useUserRole';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';

// Write test first
describe('useUserRole', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Basic functionality (write first, implement after)
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

    jest.spyOn(RolePermissionService, 'getUserRole').mockResolvedValue(mockRole);

    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockRole);
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify query key usage (CRITICAL)
    expect(result.current.queryKey).toEqual(['roles', 'user', 'user-456']);
  });

  // Test 2: Cache behavior validation
  it('should use correct query keys for cache management', async () => {
    const { result } = renderHook(() => useUserRole('user-456'), {
      wrapper: createWrapper()
    });

    // Verify centralized query key factory usage
    expect(result.current.queryKey).toEqual(['roles', 'user', 'user-456']);
    // NOT: ['localRoles', 'user-456'] - that would be dual system anti-pattern
  });

  // Tests 3-12: Error handling, cache invalidation, race conditions...
});

// Run test: npm test useUserRole.test.ts
// Expected: FAIL (no implementation yet)
```

#### **3.3 Hook Implementation**
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
    queryKey: roleKeys.userRole(targetUserId),  // CRITICAL: Use centralized factory
    queryFn: () => RolePermissionService.getUserRole(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,    // 5 minutes (roles change infrequently)
    gcTime: 30 * 60 * 1000,      // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors, retry network errors
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

// Permission convenience hook
export function useRolePermissions(userId?: string) {
  const { data: userRole, ...rest } = useUserRole(userId);
  
  return {
    userRole,
    ...rest,
    
    // Permission checking methods
    hasPermission: (permission: string) => {
      if (!userRole) return false;
      
      const rolePermissions = ROLE_PERMISSIONS[userRole.roleType] || [];
      const customPermissions = userRole.permissions || [];
      
      return rolePermissions.includes(permission) || 
             customPermissions.includes(permission);
    },
    
    // Role convenience methods
    canViewInventory: () => userRole?.roleType === 'inventory_staff' || userRole?.roleType === 'admin',
    canManageMarketing: () => userRole?.roleType === 'marketing_staff' || userRole?.roleType === 'admin',
    canViewExecutive: () => userRole?.roleType === 'executive' || userRole?.roleType === 'admin',
    isAdmin: () => userRole?.roleType === 'admin'
  };
}
```

**Commit Gate 3**: Hook tests + Query key validation must pass
```bash
npm test src/hooks/role-based/
npm run lint:query-keys  # Verify no dual systems created
# ✅ All pass → Commit allowed
```

### **Day 4: Integration Testing & Validation**

#### **4.1 Integration Tests**
```typescript
// src/role-based/__tests__/integration/roleSystemIntegration.test.ts
describe('Role System Integration', () => {
  // Test full workflow: Service → Hook → Permission Check
  it('should handle complete role-based workflow', async () => {
    // Setup: Create user with inventory role
    const createResult = await RolePermissionService.createUserRole({
      userId: 'test-user',
      roleType: 'inventory_staff',
      permissions: []
    });
    
    expect(createResult).toBeTruthy();
    
    // Test: Hook retrieves role correctly
    const { result } = renderHook(() => useUserRole('test-user'), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => {
      expect(result.current.data?.roleType).toBe('inventory_staff');
    });
    
    // Test: Permission checking works
    const hasInventoryPermission = result.current.data && 
      await RolePermissionService.hasPermission('test-user', 'view_inventory');
    
    expect(hasInventoryPermission).toBe(true);
    
    // Test: ValidationMonitor recorded actions
    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledTimes(3);
  });
});
```

#### **4.2 Pattern Validation Scripts**
```javascript
// scripts/validate-role-patterns.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function validateRolePatterns() {
  console.log('🔍 Validating role-based architectural patterns...');
  
  // 1. Validate no dual query key systems
  const hookFiles = fs.readdirSync('src/hooks/role-based/');
  for (const file of hookFiles) {
    const content = fs.readFileSync(path.join('src/hooks/role-based/', file), 'utf8');
    
    // Check for local query key factories (anti-pattern)
    if (content.includes('const localRoleKeys') || content.includes('const roleQueryKeys')) {
      console.error(`❌ Dual query key system detected in ${file}`);
      process.exit(1);
    }
    
    // Verify centralized factory usage
    if (!content.includes('import { roleKeys }') && content.includes('queryKey:')) {
      console.error(`❌ Missing centralized query key factory in ${file}`);
      process.exit(1);
    }
  }
  
  // 2. Validate service patterns
  const serviceFiles = fs.readdirSync('src/services/role-based/');
  for (const file of serviceFiles) {
    const content = fs.readFileSync(path.join('src/services/role-based/', file), 'utf8');
    
    // Check for ValidationMonitor integration
    if (!content.includes('ValidationMonitor.record')) {
      console.error(`❌ Missing ValidationMonitor integration in ${file}`);
      process.exit(1);
    }
    
    // Check for resilient processing
    if (content.includes('getAllUserRoles') && !content.includes('processItems')) {
      console.error(`❌ Missing resilient processing pattern in ${file}`);
      process.exit(1);
    }
  }
  
  // 3. Validate schema contracts
  try {
    execSync('npx tsc --noEmit src/schemas/role-based/__contracts__/*.test.ts');
    console.log('✅ Schema contracts validated');
  } catch (error) {
    console.error('❌ Schema contract validation failed');
    process.exit(1);
  }
  
  console.log('✅ All role-based patterns validated');
}

validateRolePatterns();
```

**Final Commit Gate**: Complete integration validation
```bash
npm run validate:role-patterns     # Pattern compliance
npm test src/role-based/          # Integration tests
npm run test:role-based:all       # All role-based tests
npx tsc --noEmit                  # TypeScript validation

# ✅ All pass → Phase 1 complete, commit allowed
# ❌ Any fail → Fix before proceeding to Phase 2
```

---

## 🎯 **Success Metrics for Phase 1**

### **Test Coverage Requirements**
- ✅ 15+ schema contract tests passing
- ✅ 15+ service layer tests passing  
- ✅ 20+ hook integration tests passing
- ✅ 10+ integration tests passing
- ✅ **Total: 60+ tests minimum**

### **Architectural Compliance**
- ✅ All Zod validation patterns implemented correctly
- ✅ Schema contracts enforce compile-time safety
- ✅ Service layer uses direct Supabase + exact field selection
- ✅ Resilient item processing with graceful degradation
- ✅ ValidationMonitor integration throughout
- ✅ Centralized query key factory (NO dual systems)
- ✅ User-isolated cache keys

### **Quality Gates**
- ✅ Pre-commit hooks prevent violations
- ✅ TypeScript compilation with strict settings
- ✅ Zero manual type assertions (`as any`, `as Product`)
- ✅ Complete transformation schema coverage
- ✅ Database-interface alignment verified

This revised plan strictly follows the architectural guidelines with mandatory test-first workflow and commit gates ensuring production-ready code at every step.