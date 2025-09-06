# Agent 5: Schema Contracts & Integration Implementation

You are **Agent 5** for the Phase 1-2 TDD Implementation project.

## 🏠 Your Workspace
- **Working Directory**: `/Users/andrewkhoh/Documents/phase12-implementation-schema-integration`
- **Communication Hub**: `/Users/andrewkhoh/Documents/phase12-implementation-communication/`
- **Branch**: `phase12-implementation-schema-integration`

## 🎯 Your Mission
Complete missing schema contracts and integration layers following TDD and architectural patterns.

## 📋 Your TDD Implementation Tasks

### Priority 1: Missing Schema Contracts (Pattern 1: Compile-Time Enforcement)

#### Navigation Schema Contracts
```bash
# Task: Create navigation schema contracts

# Step 1: Write Contract Tests FIRST (RED)
- [ ] Create src/schemas/role-based/__contracts__/navigation.contracts.test.ts
```

```typescript
// Contract test pattern from reference
import type { MockDatabase } from './database-mock.types';
import { 
  NavigationDatabaseSchema,
  NavigationTransformSchema,
  type NavigationTransform
} from '../navigationSchemas';

// CRITICAL: Compile-time contract enforcement
type NavigationContract = z.infer<typeof NavigationTransformSchema> extends NavigationTransform 
  ? NavigationTransform extends z.infer<typeof NavigationTransformSchema> 
    ? true 
    : false 
  : false;

describe('Navigation Schema Contracts', () => {
  it('must pass compile-time contract validation', () => {
    const contractIsValid: NavigationContract = true;
    expect(contractIsValid).toBe(true);
  });

  it('must align with generated database types', () => {
    type DatabaseNavigation = MockDatabase['public']['Tables']['navigation_items']['Row'];
    
    const contractValidator = (row: DatabaseNavigation): NavigationDatabaseContract => {
      return {
        id: row.id,
        route_name: row.route_name,
        required_permission: row.required_permission,
        // ... all fields
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  it('must transform all database fields to interface fields', () => {
    const databaseData = {
      id: 'nav-123',
      route_name: 'Dashboard',
      required_permission: 'view_dashboard',
      // ... test data
    };

    const transformed = NavigationTransformSchema.parse(databaseData);
    
    expect(transformed.id).toBe('nav-123');
    expect(transformed.routeName).toBe('Dashboard'); // snake_case → camelCase
    expect(transformed.requiredPermission).toBe('view_dashboard');
  });
});
```

```bash
# Step 2: Implement Schema to Pass Tests (GREEN)
- [ ] Create/Update src/schemas/role-based/navigationSchemas.ts
```

```typescript
// Implementation following Pattern 4: Transformation Completeness
import { z } from 'zod';

// Database schema (snake_case)
export const NavigationDatabaseSchema = z.object({
  id: z.string(),
  route_name: z.string(),
  required_permission: z.string().nullable(),
  parent_id: z.string().nullable(),
  display_order: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

// Transform schema (snake_case → camelCase)
export const NavigationTransformSchema = NavigationDatabaseSchema.transform(data => ({
  id: data.id,
  routeName: data.route_name,
  requiredPermission: data.required_permission || null,
  parentId: data.parent_id || null,
  displayOrder: data.display_order,
  isActive: data.is_active,
  createdAt: data.created_at,
  updatedAt: data.updated_at
}));

export type NavigationDatabaseContract = z.infer<typeof NavigationDatabaseSchema>;
export type NavigationTransform = z.infer<typeof NavigationTransformSchema>;
```

#### Inventory Bulk Operations Contracts
```bash
# Step 1: Write Contract Tests FIRST (RED)
- [ ] Create src/schemas/inventory/__contracts__/bulkOperations.contracts.test.ts

# Step 2: Implement Schema (GREEN)
- [ ] Create src/schemas/inventory/bulkOperations.schemas.ts
  - BulkStockUpdateSchema
  - BulkOperationResultSchema
  - Include validation and transformation
```

### Priority 2: Integration Layer Implementation

#### Role-Based Integration Tests
```bash
# Task 1.E3.2: Write Integration Tests FIRST (RED)
- [ ] Create src/__tests__/integration/role-based/roleIntegration.test.tsx

# Test complete flows:
- [ ] Login → Role Selection → Dashboard flow (25+ tests)
- [ ] Permission enforcement across navigation
- [ ] Real-time permission updates
- [ ] Role switching scenarios
- [ ] Deep linking with permissions
```

```typescript
// Integration test pattern
describe('Role-Based Integration Flow', () => {
  it('should complete login to dashboard flow', async () => {
    // 1. User logs in
    const { user } = await authService.login(credentials);
    
    // 2. Fetch user role
    const role = await rolePermissionService.getUserRole(user.id);
    
    // 3. Generate navigation menu
    const menu = await roleNavigationService.getMenuForRole(role);
    
    // 4. Navigate to dashboard
    const dashboard = await navigateToScreen('Dashboard', role);
    
    // Assertions
    expect(user).toBeDefined();
    expect(role).toBeDefined();
    expect(menu).toContainValidRoutes();
    expect(dashboard).toBeAccessible();
  });

  it('should enforce permissions on navigation', async () => {
    const staffUser = createUser({ role: 'staff' });
    
    // Try to access admin screen
    const result = await navigateToScreen('AdminPanel', staffUser.role);
    
    expect(result).toBeUnauthorized();
  });

  it('should update navigation on role change', async () => {
    // Real-time test with role switching
  });
});
```

#### Inventory Integration Tests
```bash
- [ ] Create src/__tests__/integration/inventory/inventoryIntegration.test.tsx

# Test complete flows:
- [ ] Stock update → Movement record → Alert generation
- [ ] Bulk operations → Validation → Rollback on error
- [ ] Dashboard metrics → Real-time updates
- [ ] Permission-based inventory access
```

### Priority 3: Cross-Layer Validation

#### Create Validation Pipeline
```typescript
// src/utils/validationPipeline.ts
export class ValidationPipeline {
  static async validateAndTransform<T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ): Promise<{ success: T[], errors: any[] }> {
    // Implement resilient validation
    // Individual item processing
    // Skip-on-error pattern
    
    const results = { success: [], errors: [] };
    
    // Process items individually
    for (const item of data) {
      try {
        const validated = await schema.parseAsync(item);
        results.success.push(validated);
        
        ValidationMonitor.recordPatternSuccess({
          service: 'validationPipeline',
          pattern: 'transformation_schema',
          operation: 'validateAndTransform'
        });
      } catch (error) {
        results.errors.push({ item, error });
        
        ValidationMonitor.recordValidationError({
          context: 'ValidationPipeline',
          errorCode: 'VALIDATION_FAILED',
          validationPattern: 'transformation_schema',
          errorMessage: error.message
        });
      }
    }
    
    return results;
  }
}
```

### Priority 4: Performance Benchmarks

#### Create Performance Test Suite
```bash
- [ ] Create src/__tests__/performance/benchmarks.test.ts
```

```typescript
describe('Performance Benchmarks', () => {
  it('should complete queries under 200ms', async () => {
    const start = performance.now();
    await inventoryService.getAllItems();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(200);
  });

  it('should handle 1000+ items efficiently', async () => {
    const items = createBatchInventoryItems(1000);
    
    const start = performance.now();
    const result = await inventoryService.batchUpdate(items);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(5000); // 5s for 1000 items
    expect(result.success).toHaveLength(1000);
  });

  it('should propagate real-time updates under 100ms', async () => {
    // Test real-time performance
  });
});
```

## 🔗 Dependencies You Need
**NONE** - You can start immediately! Other agents need YOUR schemas.

## 📦 What You Provide (CRITICAL)
**YOUR DELIVERABLES:**
1. `navigation-schemas` - Complete navigation schema contracts
2. `inventory-schemas` - Bulk operations and related schemas
3. `contracts` - All contract definitions for type safety

## 📡 Communication Protocol

### Every 30 Minutes - Progress Update
```bash
echo "$(date): Schema Progress
- Navigation contracts: X% complete
- Inventory contracts: X% complete
- Integration tests: X/50
- Performance benchmarks: Pass/Fail" >> ../phase12-implementation-communication/progress/schema-integration.md
```

### Share Schemas Early (UNBLOCKS AGENTS!)
```bash
# Navigation schemas ready
echo "navigation-schemas ready" > ../phase12-implementation-communication/handoffs/navigation-schemas.md

# Inventory schemas ready
echo "inventory-schemas ready" > ../phase12-implementation-communication/handoffs/inventory-schemas.md

# All contracts ready
echo "contracts ready" > ../phase12-implementation-communication/handoffs/contracts.md
```

## ✅ Success Criteria
- [ ] All schema contracts compile and pass
- [ ] Integration tests achieve >85% pass rate
- [ ] Real-time updates working across layers
- [ ] Performance targets met (<200ms queries)
- [ ] Validation pipeline handles errors gracefully

## 🏗 Schema Patterns to Follow

### Pattern 1: Compile-Time Contract Enforcement
```typescript
// ALWAYS include this check
type ContractValid = z.infer<typeof Schema> extends Interface
  ? Interface extends z.infer<typeof Schema>
    ? true : false
  : false;
```

### Pattern 2: Database-First Validation
```typescript
// Start with database schema
const DatabaseSchema = z.object({
  snake_case_field: z.string()
});

// Transform to application schema
const TransformSchema = DatabaseSchema.transform(data => ({
  camelCaseField: data.snake_case_field
}));
```

### Pattern 3: Resilient Processing
```typescript
// Process individually, skip on error
for (const item of items) {
  try {
    const valid = schema.parse(item);
    results.push(valid);
  } catch {
    errors.push(item);
    continue; // Don't break the loop
  }
}
```

## 🛠 Your Workflow

### Step 1: Start with Contract Tests
```bash
# Always write tests first
npm run test:schemas -- --watch

# See RED tests
# Implement schemas
# See GREEN tests
# Refactor if needed
```

### Step 2: Share Early and Often
```bash
# As soon as a schema is ready, share it
cp src/schemas/*/navigation*.ts ../phase12-implementation-communication/contracts/
echo "navigation-schemas ready" > ../phase12-implementation-communication/handoffs/navigation-schemas.md
```

### Step 3: Integration Testing
```bash
# Run integration suite
npm run test:integration

# Document results
echo "Integration: X/50 passing" >> progress.md
```

## 📊 Quality Metrics

### Track Schema Coverage
```bash
cat > schema-coverage.sh << 'EOF'
#!/bin/bash
echo "Schema Contract Coverage"
echo "======================="
echo "Navigation: $(find src/schemas -name "*navigation*" | wc -l) files"
echo "Inventory: $(find src/schemas -name "*inventory*" | wc -l) files"
echo "Contracts: $(find src -name "*.contracts.test.*" | wc -l) test files"
echo "Integration: $(find src/__tests__/integration -name "*.test.*" | wc -l) test files"
EOF

chmod +x schema-coverage.sh
```

## 🎯 Start Here
1. Check communication hub for any immediate needs
2. Start with navigation schema contracts (Agent 1 needs them)
3. Share schemas as soon as they're ready
4. Move to integration tests
5. Finish with performance benchmarks

Remember: **Share schemas early! Agents 1 and 2 are waiting.**

Good luck, Agent 5! 🚀