# Role-Based Architecture Implementation Plan

## 📋 Implementation Strategy

Following the established architectural patterns from `docs/architectural-patterns-and-best-practices.md`, this implementation maintains the same rigorous standards:

- ✅ **Test-Driven Development (TDD)** - Write tests first, implement to pass
- ✅ **Schema Contract Management** - Compile-time TypeScript enforcement
- ✅ **Centralized Query Key Factory** - No dual systems, extend existing patterns
- ✅ **Direct Supabase Patterns** - Exact field selection with validation pipelines
- ✅ **Resilient Item Processing** - Skip-on-error with graceful degradation
- ✅ **ValidationMonitor Integration** - Track successes and failures
- ✅ **Pre-commit Contract Enforcement** - Validate before every commit

## 🏗️ Phase Overview

```
Phase 1: Core Data Model Separation (2 weeks)
├── Schema contract validation for role separation
├── Service layer splitting with inheritance patterns
└── Database view creation with backward compatibility

Phase 2: Role Management System (1 week)  
├── User role detection and permission framework
├── Role-based query key factory extensions
└── Permission-based hook architecture

Phase 3: Navigation & UI Architecture (1 week)
├── Role-based navigation with dynamic routing
├── Dashboard separation and role detection
└── Shared component architecture

Phase 4: Inventory Operations (2 weeks)
├── Enhanced stock management with supply chain
├── Inventory tracking and movement history
└── Advanced reporting and analytics

Phase 5: Marketing Operations (3 weeks)
├── Product content management with image upload
├── Bundle and special promotion system
└── Customer communication and push notifications

Phase 6: Cross-Role Analytics & Optimization (1 week)
├── Role-specific analytics and reporting
├── Performance optimization and monitoring
└── Final integration testing and deployment
```

---

## 📅 **PHASE 1: Core Data Model Separation** 
*Duration: 2 weeks | Pattern Focus: Schema Contract Management*

### **Task 1.1: Create Role-Specific Schema Contracts with TDD**
**Priority**: Critical  
**Effort**: 3 days  
**Pattern**: Schema Contract Management (Compile-time enforcement)

**Test-First Implementation**:
```typescript
// src/schemas/__contracts__/roleBasedSchemas.contracts.test.ts
// 1. Contract validation tests (TDD)
const productCoreValidator = (product: DatabaseProduct): ProductCoreContract => {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    // Compile-time validation of core fields
  };
};

const inventoryExtensionValidator = (product: DatabaseProduct): InventoryContract => {
  return {
    ...productCoreValidator(product),
    stock_quantity: product.stock_quantity,
    supplier_id: product.supplier_id,
    // Compile-time validation of inventory fields
  };
};

const marketingExtensionValidator = (product: DatabaseProduct): MarketingContract => {
  return {
    ...productCoreValidator(product),
    image_urls: product.image_urls,
    description: product.description,
    // Compile-time validation of marketing fields
  };
};
```

**Files to Create**:
- `src/schemas/productCore.schema.ts` - Shared base schema
- `src/schemas/productInventory.schema.ts` - Inventory-specific extensions
- `src/schemas/productMarketing.schema.ts` - Marketing-specific extensions
- `src/schemas/__contracts__/roleBasedSchemas.contracts.test.ts` - Contract validation
- `src/schemas/__tests__/roleBasedSchemas.test.ts` - Schema transformation tests

**Validation**: 
- 25+ contract tests ensuring schema alignment
- TypeScript compilation as validation mechanism
- Transform function validation for all role schemas

**Commit Criteria**: All contract tests pass + TypeScript compiles cleanly

---

### **Task 1.2: Implement Service Layer Separation with Direct Supabase Patterns**
**Priority**: Critical  
**Effort**: 4 days  
**Pattern**: Direct Supabase + Service Inheritance

**Test-First Implementation**:
```typescript
// src/services/__tests__/productCoreService.test.ts
describe('ProductCoreService', () => {
  it('should fetch products with exact field selection', async () => {
    // Test Direct Supabase Pattern (Pattern 1)
    const service = new ProductCoreService();
    const result = await service.getProducts();
    
    expect(supabaseMock.from).toHaveBeenCalledWith('products');
    expect(supabaseMock.select).toHaveBeenCalledWith(
      'id, name, price, category_id, sku, is_available, created_at, updated_at'
    );
  });
  
  it('should use resilient item processing for invalid data', async () => {
    // Test Pattern 3: Skip-on-error
    const invalidData = [validProduct, invalidProduct, validProduct];
    const result = await service.processProducts(invalidData);
    
    expect(result.products).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.success).toBe(true); // Partial success
  });
});

// src/services/__tests__/productInventoryService.test.ts  
describe('ProductInventoryService', () => {
  it('should extend core service with inventory fields', async () => {
    const service = new ProductInventoryService();
    const result = await service.getInventoryProducts();
    
    expect(supabaseMock.select).toHaveBeenCalledWith(
      'id, name, price, category_id, sku, stock_quantity, supplier_id, cost_price, is_available'
    );
  });
});
```

**Files to Create**:
- `src/services/core/productCoreService.ts` - Base service with shared operations
- `src/services/inventory/productInventoryService.ts` - Inventory service extension
- `src/services/marketing/productMarketingService.ts` - Marketing service extension
- `src/services/__tests__/productCoreService.test.ts` - 15+ tests
- `src/services/__tests__/productInventoryService.test.ts` - 12+ tests  
- `src/services/__tests__/productMarketingService.test.ts` - 12+ tests

**Patterns Enforced**:
- Direct Supabase queries with exact field selection
- Service inheritance with proper TypeScript typing
- Resilient item processing in all list operations
- ValidationMonitor integration for success/failure tracking

**Commit Criteria**: 39+ service tests pass + no TypeScript errors

---

### **Task 1.3: Create Database Views and Migration Strategy**
**Priority**: High  
**Effort**: 2 days  
**Pattern**: Database-First Validation

**Test-First Implementation**:
```typescript
// src/database/__tests__/roleBasedViews.test.ts
describe('Role-based Database Views', () => {
  it('should have inventory view with correct fields', async () => {
    const { data } = await supabase.from('inventory_products').select('*').limit(1);
    const product = data[0];
    
    // Validate inventory view structure
    expect(product).toHaveProperty('stock_quantity');
    expect(product).toHaveProperty('supplier_id');
    expect(product).not.toHaveProperty('description'); // Marketing field
  });
  
  it('should have marketing view with correct fields', async () => {
    const { data } = await supabase.from('marketing_products').select('*').limit(1);
    const product = data[0];
    
    // Validate marketing view structure
    expect(product).toHaveProperty('description');
    expect(product).toHaveProperty('image_urls');
    expect(product).not.toHaveProperty('supplier_id'); // Inventory field
  });
});
```

**Files to Create**:
- `database/migrations/role-based-views.sql` - Database views
- `src/database/__tests__/roleBasedViews.test.ts` - View validation tests
- `scripts/migrate-role-separation.js` - Migration script
- `src/config/databaseViews.ts` - View configuration

**Migration Strategy**:
- Create views without breaking existing functionality
- Test backward compatibility with existing ProductAdminService
- Validate data consistency across views

**Commit Criteria**: All view tests pass + backward compatibility maintained

---

## 📅 **PHASE 2: Role Management System**
*Duration: 1 week | Pattern Focus: Centralized Query Keys + User Isolation*

### **Task 2.1: Implement User Role Detection with Schema Validation**
**Priority**: Critical  
**Effort**: 2 days  
**Pattern**: User-Isolated Keys + Transformation Schemas

**Test-First Implementation**:
```typescript
// src/services/__tests__/userRoleService.test.ts
describe('UserRoleService', () => {
  it('should validate role assignments with schema', async () => {
    const roleData = { userId: 'test', role: 'inventory_manager' };
    const validated = UserRoleSchema.parse(roleData);
    
    expect(validated.role).toBe('inventory_manager');
    expect(ADMIN_ROLES[validated.role]).toBeDefined();
  });
  
  it('should enforce permission boundaries', async () => {
    const user = { role: 'inventory_staff' };
    const permissions = getUserPermissions(user);
    
    expect(permissions.canManageInventory).toBe(true);
    expect(permissions.canManageMarketing).toBe(false);
  });
});

// src/hooks/__tests__/useAdminRole.test.ts
describe('useAdminRole', () => {
  it('should provide role-based permissions', () => {
    const { result } = renderHook(() => useAdminRole());
    
    expect(result.current.permissions).toHaveProperty('canManageInventory');
    expect(result.current.permissions).toHaveProperty('canManageMarketing');
  });
});
```

**Files to Create**:
- `src/schemas/userRole.schema.ts` - Role validation schemas
- `src/services/userRoleService.ts` - Role management service
- `src/hooks/useAdminRole.ts` - Role detection hook
- `src/types/userRoles.ts` - Role and permission types
- `src/services/__tests__/userRoleService.test.ts` - 10+ tests
- `src/hooks/__tests__/useAdminRole.test.ts` - 8+ tests

**Commit Criteria**: All role tests pass + permission validation working

---

### **Task 2.2: Extend Centralized Query Key Factory for Role Separation**
**Priority**: Critical  
**Effort**: 2 days  
**Pattern**: Centralized Query Key Factory (No Dual Systems)

**Test-First Implementation**:
```typescript
// src/hooks/__tests__/roleBasedQueryKeys.test.ts
describe('Role-based Query Key Factory', () => {
  it('should extend existing productKeys without duplication', () => {
    // Test that we extend, not duplicate
    const inventoryKey = inventoryKeys.products.list({ filters: 'test' });
    const marketingKey = marketingKeys.products.list({ filters: 'test' });
    
    // Both should include base productKeys structure
    expect(inventoryKey).toEqual(['products', 'inventory', 'products', 'list', { filters: 'test' }]);
    expect(marketingKey).toEqual(['products', 'marketing', 'products', 'list', { filters: 'test' }]);
    
    // Should not conflict with each other
    expect(inventoryKey).not.toEqual(marketingKey);
  });
  
  it('should support smart invalidation patterns', () => {
    // Test targeted invalidation
    const allInventoryKeys = inventoryKeys.all();
    const specificProductKey = inventoryKeys.products.detail('123');
    
    expect(isSubKey(specificProductKey, allInventoryKeys)).toBe(true);
  });
});
```

**Files to Create**:
- `src/utils/queryKeyFactory.ts` - Extended factory with role support
- `src/hooks/inventory/useInventoryQueryKeys.ts` - Inventory query keys
- `src/hooks/marketing/useMarketingQueryKeys.ts` - Marketing query keys  
- `src/hooks/__tests__/roleBasedQueryKeys.test.ts` - 12+ tests

**Key Validation**:
- No duplicate key patterns created
- Proper extension of existing productKeys
- Smart invalidation support
- Role isolation maintained

**Commit Criteria**: Query key tests pass + no cache conflicts

---

### **Task 2.3: Create Permission-Based Hook Architecture**
**Priority**: High  
**Effort**: 2 days  
**Pattern**: React Query + User Isolation

**Test-First Implementation**:
```typescript
// src/hooks/inventory/__tests__/useInventoryProducts.test.ts
describe('useInventoryProducts', () => {
  it('should only work for users with inventory permissions', () => {
    const { result } = renderHook(() => useInventoryProducts(), {
      wrapper: createMockProvider({ role: 'marketing_staff' })
    });
    
    expect(result.current.error).toMatchObject({
      message: 'Insufficient permissions for inventory operations'
    });
  });
  
  it('should use inventory-specific query keys', () => {
    const { result } = renderHook(() => useInventoryProducts(), {
      wrapper: createMockProvider({ role: 'inventory_manager' })
    });
    
    expect(mockQueryClient.getQueryData).toHaveBeenCalledWith(
      inventoryKeys.products.list()
    );
  });
});
```

**Files to Create**:
- `src/hooks/inventory/useInventoryProducts.ts` - Inventory product hooks
- `src/hooks/marketing/useMarketingProducts.ts` - Marketing product hooks
- `src/hooks/shared/useProductCore.ts` - Shared product operations
- `src/hooks/inventory/__tests__/useInventoryProducts.test.ts` - 10+ tests
- `src/hooks/marketing/__tests__/useMarketingProducts.test.ts` - 10+ tests

**Commit Criteria**: All permission-based hook tests pass

---

## 📅 **PHASE 3: Navigation & UI Architecture**
*Duration: 1 week | Pattern Focus: Graceful Degradation*

### **Task 3.1: Implement Role-Based Navigation with Dynamic Routing**
**Priority**: Critical  
**Effort**: 3 days  
**Pattern**: Graceful Degradation + Error Boundaries

**Test-First Implementation**:
```typescript
// src/navigation/__tests__/roleBasedNavigation.test.ts
describe('Role-based Navigation', () => {
  it('should show inventory screens for inventory users', () => {
    const navigation = renderNavigation({ role: 'inventory_manager' });
    
    expect(navigation.getByText('Stock Management')).toBeVisible();
    expect(navigation.queryByText('Marketing Dashboard')).toBeNull();
  });
  
  it('should gracefully handle role loading errors', () => {
    const navigation = renderNavigation({ roleError: true });
    
    expect(navigation.getByText('Role Selection')).toBeVisible();
    expect(navigation.getByText('Unable to determine permissions')).toBeVisible();
  });
});
```

**Files to Create**:
- `src/navigation/RoleBasedAdminNavigator.tsx` - Main role-based navigator
- `src/navigation/InventoryStackNavigator.tsx` - Inventory screens
- `src/navigation/MarketingStackNavigator.tsx` - Marketing screens
- `src/screens/RoleSelectionScreen.tsx` - Role selection interface
- `src/navigation/__tests__/roleBasedNavigation.test.ts` - 8+ tests

**Commit Criteria**: Navigation tests pass + graceful role error handling

---

### **Task 3.2: Create Role-Specific Dashboards with Error Boundaries**
**Priority**: High  
**Effort**: 2 days  
**Pattern**: Error Boundaries + Graceful Degradation

**Test-First Implementation**:
```typescript
// src/screens/__tests__/InventoryDashboardScreen.test.ts
describe('InventoryDashboardScreen', () => {
  it('should render inventory overview with error boundaries', () => {
    const screen = render(<InventoryDashboardScreen />);
    
    expect(screen.getByText('Inventory Overview')).toBeVisible();
    expect(screen.getByText('Low Stock Alerts')).toBeVisible();
  });
  
  it('should gracefully handle data loading errors', () => {
    const screen = renderWithError(<InventoryDashboardScreen />);
    
    expect(screen.getByText('Unable to load inventory data')).toBeVisible();
    expect(screen.getByText('Try Again')).toBeVisible();
  });
});
```

**Files to Create**:
- `src/screens/InventoryDashboardScreen.tsx` - Inventory dashboard
- `src/screens/MarketingDashboardScreen.tsx` - Marketing dashboard
- `src/components/RoleCard.tsx` - Dashboard role cards
- `src/screens/__tests__/InventoryDashboardScreen.test.ts` - 6+ tests
- `src/screens/__tests__/MarketingDashboardScreen.test.ts` - 6+ tests

**Commit Criteria**: Dashboard tests pass + error boundaries working

---

### **Task 3.3: Implement Shared Component Architecture**
**Priority**: Medium  
**Effort**: 2 days  
**Pattern**: Component Reusability + Error Boundaries

**Files to Create**:
- `src/components/admin/AdminErrorBoundary.tsx` - Admin-specific error handling
- `src/components/admin/RolePermissionGuard.tsx` - Permission-based rendering
- `src/components/admin/AdminLoadingState.tsx` - Consistent loading states
- `src/components/admin/__tests__/` - Component tests

**Commit Criteria**: Shared component tests pass

---

## 📅 **PHASE 4: Inventory Operations Enhancement**
*Duration: 2 weeks | Pattern Focus: Atomic Operations + Broadcasting*

### **Task 4.1: Enhanced Stock Management with Supply Chain Integration**
**Priority**: High  
**Effort**: 4 days  
**Pattern**: Atomic Operations + ValidationMonitor

**Test-First Implementation**:
```typescript
// src/services/__tests__/supplierService.test.ts
describe('SupplierService', () => {
  it('should create supplier with atomic operations', async () => {
    const supplier = await supplierService.createSupplier(supplierData);
    
    expect(supplier.success).toBe(true);
    expect(BroadcastHelper.sendSupplierUpdate).toHaveBeenCalled();
    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
      service: 'supplierService',
      pattern: 'atomic_operation',
      operation: 'createSupplier'
    });
  });
});
```

**Files to Create**:
- `src/services/inventory/supplierService.ts` - Supplier management
- `src/services/inventory/stockMovementService.ts` - Stock tracking
- `src/screens/SupplyChainManagementScreen.tsx` - Supply chain interface
- `src/schemas/supplier.schema.ts` - Supplier validation
- Tests for all new services and screens

**Commit Criteria**: All inventory enhancement tests pass

---

### **Task 4.2: Inventory Tracking and Movement History**
**Priority**: High  
**Effort**: 3 days  
**Pattern**: Resilient Processing + Direct Supabase

**Files to Create**:
- `src/screens/InventoryTrackingScreen.tsx` - Movement history
- `src/services/inventory/inventoryReportService.ts` - Reporting
- `src/hooks/inventory/useStockMovements.ts` - Movement hooks
- Comprehensive test suites

**Commit Criteria**: Tracking tests pass + reporting functional

---

### **Task 4.3: Advanced Reporting and Analytics**
**Priority**: Medium  
**Effort**: 3 days  
**Pattern**: Performance Optimization + Caching

**Files to Create**:
- `src/screens/InventoryReportsScreen.tsx` - Report interface
- `src/services/inventory/analyticsService.ts` - Analytics
- `src/components/inventory/ReportCharts.tsx` - Visualization
- Performance and analytics tests

**Commit Criteria**: All reporting tests pass

---

## 📅 **PHASE 5: Marketing Operations Implementation**
*Duration: 3 weeks | Pattern Focus: Content Management + Real-time Updates*

### **Task 5.1: Product Content Management with Image Upload**
**Priority**: Critical  
**Effort**: 5 days  
**Pattern**: File Upload + Content Validation

**Test-First Implementation**:
```typescript
// src/services/__tests__/imageUploadService.test.ts
describe('ImageUploadService', () => {
  it('should upload images with validation and optimization', async () => {
    const result = await imageService.uploadProductImages(files);
    
    expect(result.success).toBe(true);
    expect(result.images).toHaveLength(files.length);
    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();
  });
});
```

**Files to Create**:
- `src/services/marketing/imageUploadService.ts` - Image management
- `src/screens/ProductContentManagementScreen.tsx` - Content editor
- `src/components/marketing/ImageGalleryManager.tsx` - Image interface
- `src/schemas/productContent.schema.ts` - Content validation
- Comprehensive test suites for content management

**Commit Criteria**: Content management tests pass + image upload functional

---

### **Task 5.2: Bundle and Special Promotion System**
**Priority**: High  
**Effort**: 4 days  
**Pattern**: Complex Data Structures + Validation

**Files to Create**:
- `src/services/marketing/bundleService.ts` - Bundle management
- `src/services/marketing/promotionService.ts` - Promotion system
- `src/screens/BundleSpecialManagementScreen.tsx` - Promotion interface
- `src/schemas/bundle.schema.ts` - Bundle validation
- Bundle and promotion test suites

**Commit Criteria**: Bundle/promotion tests pass

---

### **Task 5.3: Customer Communication and Push Notifications**
**Priority**: High  
**Effort**: 6 days  
**Pattern**: External Service Integration + Broadcasting

**Files to Create**:
- `src/services/marketing/notificationService.ts` - Push notifications
- `src/services/marketing/campaignService.ts` - Campaign management
- `src/screens/CustomerCommunicationScreen.tsx` - Communication hub
- `src/schemas/notification.schema.ts` - Notification validation
- Communication and campaign test suites

**Commit Criteria**: All communication tests pass + notifications working

---

## 📅 **PHASE 6: Cross-Role Analytics & Optimization**
*Duration: 1 week | Pattern Focus: Performance + Monitoring*

### **Task 6.1: Role-Specific Analytics and Reporting**
**Priority**: Medium  
**Effort**: 3 days  
**Pattern**: Data Aggregation + Visualization

**Files to Create**:
- `src/screens/MarketingAnalyticsScreen.tsx` - Marketing metrics
- `src/services/analytics/crossRoleAnalyticsService.ts` - Cross-role insights
- `src/components/analytics/AnalyticsDashboard.tsx` - Shared components
- Analytics test suites

**Commit Criteria**: Analytics tests pass + metrics functional

---

### **Task 6.2: Performance Optimization and Monitoring Enhancement**
**Priority**: High  
**Effort**: 2 days  
**Pattern**: Query Optimization + ValidationMonitor

**Test-First Implementation**:
```typescript
// src/__tests__/performance/roleBasedPerformance.test.ts
describe('Role-based Performance', () => {
  it('should maintain query performance across roles', async () => {
    const startTime = Date.now();
    const result = await inventoryService.getAllProducts();
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // 1 second max
    expect(result.products.length).toBeGreaterThan(0);
  });
});
```

**Files to Create**:
- Performance test suites
- Query optimization utilities
- Enhanced ValidationMonitor integration
- Performance monitoring dashboards

**Commit Criteria**: Performance tests pass + monitoring enhanced

---

### **Task 6.3: Final Integration Testing and Deployment Preparation**
**Priority**: Critical  
**Effort**: 2 days  
**Pattern**: End-to-End Testing + Deployment

**Files to Create**:
- `src/__tests__/integration/roleBasedWorkflows.test.ts` - E2E tests
- `scripts/validate-role-architecture.js` - Architecture validation
- `docs/ROLE_BASED_DEPLOYMENT.md` - Deployment guide
- Final integration test suites

**Commit Criteria**: All integration tests pass + deployment ready

---

## 📊 **Implementation Metrics**

### **Test Coverage Targets**
```
Schema Contracts:     40+ tests (compile-time validation)
Service Layer:        80+ tests (business logic validation)  
Hook Layer:          50+ tests (React Query integration)
Component Layer:     60+ tests (UI behavior validation)
Integration:         25+ tests (end-to-end workflows)
Performance:         15+ tests (optimization validation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Target:        270+ tests
```

### **Code Quality Metrics**
- ✅ 0 TypeScript errors across all phases
- ✅ 100% schema contract validation
- ✅ ValidationMonitor integration in all services
- ✅ Error boundaries in all major components
- ✅ Pre-commit validation for each commit

### **Architecture Compliance Checklist**
- ✅ **Schema Contract Management**: Compile-time validation enforced
- ✅ **Centralized Query Keys**: No dual systems created
- ✅ **Direct Supabase Patterns**: Exact field selection used
- ✅ **Resilient Processing**: Skip-on-error implemented
- ✅ **Graceful Degradation**: Never breaks user workflows
- ✅ **ValidationMonitor**: Success/failure tracking integrated
- ✅ **User Experience Priority**: Role-optimized interfaces

## 🚀 **Delivery Schedule**

**Week 1-2**: Phase 1 (Data Model Separation)  
**Week 3**: Phase 2 (Role Management)  
**Week 4**: Phase 3 (Navigation & UI)  
**Week 5-6**: Phase 4 (Inventory Operations)  
**Week 7-9**: Phase 5 (Marketing Operations)  
**Week 10**: Phase 6 (Analytics & Optimization)

**Total Duration**: 10 weeks with comprehensive testing and validation

This implementation plan maintains the same high standards and architectural rigor as the original product management system while systematically building the role-based architecture. Each phase delivers working, tested functionality that can be committed and deployed incrementally.