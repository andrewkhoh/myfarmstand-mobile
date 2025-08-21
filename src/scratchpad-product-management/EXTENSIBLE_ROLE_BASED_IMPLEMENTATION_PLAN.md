# Extensible Role-Based Architecture Implementation Plan
**Building from Product Management Foundation - Option A with Future-Ready Design**

## 🎯 **Strategic Approach**

### **Core Philosophy**
Build complete role-based architecture from the start using proven product management patterns, designed for unlimited future extensibility including executive analytics, additional roles, and cross-functional features.

### **Architecture Foundation**
```
┌─────────────────────────────────────────────────────────┐
│                 🎯 EXECUTIVE TIER                        │
│              (Future: Cross-Role Analytics)             │
├─────────────────────────────────────────────────────────┤
│  📦 INVENTORY OPERATIONS  │  🎨 MARKETING OPERATIONS    │
│    Backend Staff Focus    │   Marketing Staff Focus     │
├─────────────────────────────────────────────────────────┤
│               📊 SHARED DATA FOUNDATION                  │
│    Product Core • Analytics Core • User Management      │
└─────────────────────────────────────────────────────────┘
```

### **Extensibility Design Principles**
1. **Modular Role Architecture**: Easy to add new roles (customer service, logistics, etc.)
2. **Data Layer Abstraction**: Shared services with role-specific extensions
3. **Analytics-Ready Foundation**: Data collection designed for future executive insights
4. **Permission System**: Granular permissions supporting any future role combination
5. **Navigation Scalability**: Architecture supports unlimited role types and hybrid access

---

## 📋 **Implementation Phases with Architectural Compliance**

### **Phase 1: Core Role Infrastructure (Week 1-2)**
**Objective**: Build extensible role foundation using product management patterns
**Tests Target**: 60+ tests | **Commit Gates**: 6 validation layers

```typescript
// Core architecture following docs/architectural-patterns-and-best-practices.md
src/services/role-based/
├── rolePermissionService.ts         // BaseService extension, ValidationMonitor integration
├── roleAnalyticsService.ts          // Analytics foundation with tier separation  
└── roleNavigationService.ts         // Dynamic navigation with permission filtering

src/schemas/role-based/
├── index.ts                         // Clean schema exports
├── rolePermission.schemas.ts        // Database-first validation, transformation schemas
└── __contracts__/                   // MANDATORY compile-time contract enforcement
    └── rolePermission.contracts.test.ts

src/hooks/role-based/
├── useUserRole.ts                   // Centralized query key factory usage
├── useRolePermissions.ts            // User-isolated cache keys
└── useRoleNavigation.ts             // React Query integration
```

#### **Architectural Compliance Requirements**
- ✅ **Zod Patterns**: Single validation pass, database-first, resilient processing, transformation schemas
- ✅ **Schema Contracts**: Compile-time enforcement, TypeScript return annotations
- ✅ **Service Patterns**: Direct Supabase, exact field selection, ValidationMonitor integration
- ✅ **Query Keys**: Centralized factory extension (NO dual systems)
- ✅ **Test-First**: All tests written before implementation, commit gates enforced

#### **Phase 1 Commit Gates**
1. **Schema Contract Validation**: `npx tsc --noEmit src/schemas/role-based/__contracts__/*.test.ts`
2. **Pattern Validation**: `npm run validate:role-patterns`  
3. **Service Testing**: `npm run test:services:role-based` (15+ tests)
4. **Hook Testing**: `npm run test:hooks:role-based` (20+ tests)
5. **Integration Testing**: `npm run test:integration:role-based` (10+ tests)
6. **TypeScript Compilation**: `npx tsc --noEmit --strict`

**Phase 1 Success Criteria**: 60+ tests passing, zero pattern violations, complete ValidationMonitor integration

### **Phase 2: Inventory Operations (Week 3-4)**  
**Objective**: Build inventory-focused admin with strict architectural patterns
**Tests Target**: 95+ tests | **Commit Gates**: Enhanced validation for service extensions

```typescript
// Inventory-specific implementation following Pattern 3: Resilient Item Processing
src/services/role-based/inventory/
├── inventoryRoleService.ts          // Extends BaseRoleService, resilient processing
├── stockAlertService.ts             // Alert algorithms with ValidationMonitor
└── inventoryAnalyticsService.ts     // Operational metrics collection

src/screens/role-based/inventory/
├── InventoryDashboard.tsx           // Error boundaries, graceful degradation
├── StockManagementScreen.tsx        // Optimistic updates with rollback
├── InventoryAlerts.tsx              // Real-time updates, cache invalidation
└── InventoryAnalytics.tsx           // Performance charts, data visualization

src/schemas/role-based/inventory/
├── inventoryRole.schemas.ts         // Database-first validation, null handling
├── stockAlert.schemas.ts            // Alert configuration validation
└── __contracts__/                   // Contract tests for all schemas
    ├── inventoryRole.contracts.test.ts
    └── stockAlert.contracts.test.ts
```

#### **Phase 2 Architectural Requirements**
- ✅ **Service Extensions**: All inventory services extend BaseRoleService
- ✅ **Resilient Processing**: Stock operations use processItems() pattern  
- ✅ **Analytics Integration**: Every inventory action tracked for executive insights
- ✅ **Hook Extensions**: All hooks extend roleKeys factory (no new factories)
- ✅ **Error Handling**: Graceful degradation, never break user workflows

#### **Phase 2 Commit Gates** 
1. **Service Extension Validation**: Verify BaseRoleService inheritance
2. **Resilient Pattern Validation**: Check processItems() usage in bulk operations
3. **Analytics Integration**: Validate RoleAnalyticsService.collectOperationalMetrics() calls
4. **Schema Contract Validation**: All inventory schemas pass contract tests
5. **Hook Integration**: Verify roleKeys extension, no dual systems
6. **Full Test Suite**: 95+ tests across service/hook/screen layers

### **Phase 3: Marketing Operations (Week 5-6)**
**Objective**: Build marketing-focused admin with content management workflows
**Tests Target**: 90+ tests | **Commit Gates**: Content workflow validation

```typescript
// Marketing-specific implementation with ValidationMonitor integration
src/services/role-based/marketing/
├── marketingRoleService.ts          // Marketing workflows, content management
├── contentManagementService.ts      // Content upload/approval workflows  
├── promotionService.ts              // Campaign planning, bundle creation
└── marketingAnalyticsService.ts     // Campaign metrics, engagement tracking

src/screens/role-based/marketing/
├── MarketingDashboard.tsx           // Campaign overview, content status
├── ProductContentScreen.tsx         // Content management interface
├── PromotionPlannerScreen.tsx       // Campaign creation tools
├── BundleManagementScreen.tsx       // Bundle builder interface
└── MarketingAnalytics.tsx           // Campaign performance dashboard

src/schemas/role-based/marketing/
├── marketingRole.schemas.ts         // Marketing data validation
├── contentManagement.schemas.ts     // Content workflow schemas
├── campaignTracking.schemas.ts      // Campaign metrics validation
└── __contracts__/                   // Complete contract coverage
    ├── marketingRole.contracts.test.ts
    ├── contentManagement.contracts.test.ts
    └── campaignTracking.contracts.test.ts
```

#### **Phase 3 Architectural Requirements**
- ✅ **Content Workflow Patterns**: Upload → Review → Approval → Publish
- ✅ **Campaign Tracking**: All campaign actions feed executive analytics
- ✅ **Cross-Role Integration**: Marketing affects inventory stock levels (tracked)
- ✅ **Performance Monitoring**: Content upload, campaign creation all monitored
- ✅ **Mobile Optimization**: Touch-friendly interfaces, image handling

#### **Phase 3 Commit Gates**
1. **Content Workflow Validation**: Multi-step workflow integrity
2. **Cross-Role Analytics**: Marketing-inventory correlation tracking  
3. **Campaign Schema Validation**: All campaign data properly validated
4. **Performance Monitoring**: ValidationMonitor integration complete
5. **Mobile Interface Testing**: Touch interactions, image upload flows
6. **Marketing Test Suite**: 90+ tests covering all workflows

### **Phase 4: Executive Analytics Foundation (Week 7-8)**
**Objective**: Build cross-role analytics with strategic decision support
**Tests Target**: 70+ tests | **Commit Gates**: Cross-role correlation validation

```typescript
// Executive analytics with business intelligence patterns
src/services/role-based/executive/
├── executiveAnalyticsService.ts     // Cross-role data aggregation
├── businessIntelligenceService.ts   // Correlation analysis, insights
├── strategicReportingService.ts     // Report generation, export
├── predictiveAnalyticsService.ts    // Forecasting algorithms
└── decisionSupportService.ts        // Recommendation engine

src/screens/role-based/executive/
├── ExecutiveDashboard.tsx           // Business overview, strategic KPIs
├── BusinessIntelligence.tsx         // Correlation insights, trend analysis
├── StrategicReports.tsx             // Report builder, export tools
├── PredictiveAnalytics.tsx          // Forecasting dashboard
└── DecisionSupport.tsx              // Recommendation interface

src/schemas/role-based/executive/
├── executiveAnalytics.schemas.ts    // Business metrics validation
├── businessIntelligence.schemas.ts // Correlation data schemas
├── strategicReporting.schemas.ts    // Report configuration schemas
└── __contracts__/                   // Executive data contracts
    ├── executiveAnalytics.contracts.test.ts
    ├── businessIntelligence.contracts.test.ts
    └── strategicReporting.contracts.test.ts
```

#### **Phase 4 Architectural Requirements**
- ✅ **Cross-Role Data Aggregation**: Combine inventory + marketing insights
- ✅ **Business Intelligence**: Correlation analysis, trend detection
- ✅ **Predictive Analytics**: Demand forecasting, risk assessment
- ✅ **Decision Support**: Actionable recommendations, scenario modeling
- ✅ **Strategic Value**: Product profitability, customer lifetime value

#### **Phase 4 Commit Gates**
1. **Cross-Role Integration**: Validate inventory-marketing correlation tracking
2. **Business Intelligence**: Verify insight generation algorithms  
3. **Predictive Analytics**: Test forecasting model accuracy
4. **Strategic Reporting**: Validate report generation and export
5. **Decision Support**: Test recommendation engine logic
6. **Executive Test Suite**: 70+ tests covering all analytics workflows

### **Phase 5: Integration & Production Readiness (Week 9-10)**
**Objective**: System integration, performance optimization, production deployment
**Tests Target**: 50+ tests | **Commit Gates**: Production readiness validation

#### **Integration Requirements**
- ✅ **Performance Optimization**: Query performance, bundle size analysis
- ✅ **Security Audit**: RLS policies, permission enforcement, data access patterns
- ✅ **Cross-Role Workflows**: End-to-end role interactions validated
- ✅ **Analytics Data Flow**: Complete analytics pipeline operational
- ✅ **Production Deployment**: Database migrations, environment configs

#### **Phase 5 Commit Gates**
1. **Performance Benchmarks**: Query response times < 200ms
2. **Security Validation**: Zero critical security findings
3. **Cross-Role Integration**: All role interactions tested
4. **Analytics Pipeline**: Complete data flow validated  
5. **Production Readiness**: Deployment checklist complete
6. **Final Test Suite**: 390+ total tests across all phases

---

## 🧪 **Test-Driven Development Plan with Architectural Compliance**

### **Total Test Target**: 365+ Tests with Strict TDD Workflow

#### **Phase 1: Core Role Infrastructure (60 tests)**
**TDD Workflow**: Schema Contracts → Service Tests → Hook Tests → Integration
```typescript
// Schema Contract Tests (15 tests) - WRITE FIRST
src/schemas/role-based/__contracts__/
└── rolePermission.contracts.test.ts       // 15 tests
    // ✅ Database interface alignment
    // ✅ Transformation completeness validation  
    // ✅ Null handling verification
    // ✅ Type safety enforcement

// Service Layer Tests (15 tests) - WRITE SECOND
src/services/role-based/__tests__/
├── rolePermissionService.test.ts          // 15 tests
    // ✅ Direct Supabase pattern validation
    // ✅ ValidationMonitor integration testing
    // ✅ Resilient processing verification
    // ✅ Error handling and graceful degradation

// Hook Layer Tests (20 tests) - WRITE THIRD  
src/hooks/role-based/__tests__/
├── useUserRole.test.ts                    // 12 tests
├── useRolePermissions.test.ts             // 8 tests
    // ✅ Centralized query key factory usage
    // ✅ User-isolated cache key validation
    // ✅ React Query integration testing
    // ✅ Race condition scenario testing

// Integration Tests (10 tests) - WRITE LAST
src/role-based/__tests__/integration/
├── roleSystemIntegration.test.ts          // 10 tests
    // ✅ End-to-end workflow validation
    // ✅ Permission enforcement testing
    // ✅ Cross-layer integration verification
```

#### **Phase 2: Inventory Operations (95 tests)**
**TDD Workflow**: Inventory Contracts → Service Extensions → Hook Integration → Screen Components
```typescript
// Schema Contract Tests (15 tests) - WRITE FIRST
src/schemas/role-based/inventory/__contracts__/
├── inventoryRole.contracts.test.ts        // 10 tests
└── stockAlert.contracts.test.ts           // 5 tests
    // ✅ Inventory data transformation validation
    // ✅ Stock alert schema compliance
    // ✅ Analytics data structure verification

// Service Layer Tests (35 tests) - WRITE SECOND
src/services/role-based/inventory/__tests__/
├── inventoryRoleService.test.ts           // 20 tests  
├── stockAlertService.test.ts              // 10 tests
└── inventoryAnalyticsService.test.ts      // 5 tests
    // ✅ BaseRoleService inheritance validation
    // ✅ Resilient processing pattern testing  
    // ✅ Analytics integration verification
    // ✅ Stock alert logic validation

// Hook Integration Tests (20 tests) - WRITE THIRD
src/hooks/role-based/__tests__/
├── useInventoryDashboard.test.ts          // 12 tests
└── useStockAlerts.test.ts                 // 8 tests
    // ✅ roleKeys factory extension validation
    // ✅ Cache invalidation testing
    // ✅ Real-time update handling

// Screen Component Tests (25 tests) - WRITE LAST
src/screens/role-based/inventory/__tests__/
├── InventoryDashboard.test.tsx            // 8 tests
├── StockManagementScreen.test.tsx         // 10 tests  
├── InventoryAlerts.test.tsx               // 4 tests
└── InventoryAnalytics.test.tsx            // 3 tests
    // ✅ Error boundary behavior
    // ✅ Optimistic updates with rollback
    // ✅ Mobile-friendly interactions
```

#### **Phase 3: Marketing Operations (90 tests)**
**TDD Workflow**: Marketing Contracts → Content Services → Campaign Hooks → UI Components
```typescript
// Schema Contract Tests (15 tests) - WRITE FIRST
src/schemas/role-based/marketing/__contracts__/
├── marketingRole.contracts.test.ts        // 5 tests
├── contentManagement.contracts.test.ts    // 5 tests  
└── campaignTracking.contracts.test.ts     // 5 tests
    // ✅ Marketing workflow schemas
    // ✅ Content management validation
    // ✅ Campaign tracking compliance

// Service Layer Tests (35 tests) - WRITE SECOND
src/services/role-based/marketing/__tests__/
├── marketingRoleService.test.ts           // 20 tests
├── contentManagementService.test.ts       // 10 tests
├── promotionService.test.ts               // 5 tests
    // ✅ Content workflow orchestration
    // ✅ Campaign creation validation
    // ✅ Cross-role analytics integration
    // ✅ Performance monitoring verification

// Hook Integration Tests (15 tests) - WRITE THIRD
src/hooks/role-based/__tests__/
├── useMarketingDashboard.test.ts          // 8 tests
└── useContentManagement.test.ts          // 7 tests
    // ✅ Marketing query key validation
    // ✅ Content upload progress tracking
    // ✅ Campaign metric aggregation

// Screen Component Tests (25 tests) - WRITE LAST
src/screens/role-based/marketing/__tests__/
├── MarketingDashboard.test.tsx            // 8 tests
├── ProductContentScreen.test.tsx          // 10 tests
├── PromotionPlannerScreen.test.tsx        // 4 tests
└── BundleManagementScreen.test.tsx        // 3 tests
    // ✅ Content upload interface
    // ✅ Campaign builder functionality
    // ✅ Mobile touch optimization
```

#### **Phase 4: Executive Analytics (70 tests)**  
**TDD Workflow**: Executive Contracts → Cross-Role Services → BI Algorithms → Dashboard Components
```typescript
// Schema Contract Tests (15 tests) - WRITE FIRST
src/schemas/role-based/executive/__contracts__/
├── executiveAnalytics.contracts.test.ts   // 5 tests
├── businessIntelligence.contracts.test.ts // 5 tests
└── strategicReporting.contracts.test.ts   // 5 tests
    // ✅ Business metrics validation
    // ✅ Cross-role correlation schemas
    // ✅ Strategic report structures

// Service Layer Tests (30 tests) - WRITE SECOND
src/services/role-based/executive/__tests__/
├── executiveAnalyticsService.test.ts      // 15 tests
├── businessIntelligenceService.test.ts    // 8 tests
├── strategicReportingService.test.ts      // 4 tests
└── predictiveAnalyticsService.test.ts     // 3 tests
    // ✅ Cross-role data aggregation
    // ✅ Correlation analysis algorithms  
    // ✅ Predictive model accuracy
    // ✅ Decision support logic

// Integration Tests (15 tests) - WRITE THIRD
src/role-based/__tests__/integration/
├── crossRoleAnalytics.test.ts             // 10 tests
└── executiveWorkflows.test.ts             // 5 tests
    // ✅ Inventory-marketing correlation
    // ✅ End-to-end analytics pipeline
    // ✅ Strategic insight generation

// Screen Component Tests (10 tests) - WRITE LAST
src/screens/role-based/executive/__tests__/
├── ExecutiveDashboard.test.tsx            // 4 tests
├── BusinessIntelligence.test.tsx          // 3 tests
└── StrategicReports.test.tsx              // 3 tests
    // ✅ Strategic KPI visualization
    // ✅ Interactive correlation charts
    // ✅ Report generation interface
```

#### **Phase 5: Production Integration (40 tests)**
**TDD Workflow**: Performance → Security → E2E → Production Readiness
```typescript
// Performance Tests (15 tests) - WRITE FIRST  
src/role-based/__tests__/performance/
└── roleBasedPerformance.test.ts           // 15 tests
    // ✅ Query response time benchmarks
    // ✅ Bundle size analysis
    // ✅ Memory usage optimization

// Security Tests (10 tests) - WRITE SECOND
src/role-based/__tests__/security/
└── roleBasedSecurity.test.ts              // 10 tests
    // ✅ RLS policy enforcement
    // ✅ Permission boundary testing
    // ✅ Data access pattern validation

// E2E Integration Tests (15 tests) - WRITE THIRD
src/role-based/__tests__/e2e/
├── roleBasedWorkflows.test.ts             // 10 tests
└── analyticsDataFlow.test.ts              // 5 tests
    // ✅ Complete role-based workflows
    // ✅ Cross-role interaction scenarios
    // ✅ Analytics pipeline validation
```

---

## 🏗️ **Service Architecture (Following Product Management Patterns)**

### **Core Service Hierarchy**
```typescript
// Base service layer (shared foundation)
export class BaseRoleService {
  protected static supabase = supabaseClient;
  protected static validationMonitor = ValidationMonitor;
  
  // Resilient processing pattern from product management
  protected static async processItems<T>(
    items: unknown[],
    processor: (item: unknown) => T,
    operation: string
  ): Promise<{ success: T[], errors: any[], totalProcessed: number }> {
    const results = { success: [], errors: [], totalProcessed: 0 };
    
    for (const item of items) {
      try {
        const processed = processor(item);
        results.success.push(processed);
        results.totalProcessed++;
        
        ValidationMonitor.recordPatternSuccess({
          service: this.name,
          pattern: 'resilient_item_processing',
          operation
        });
      } catch (error) {
        results.errors.push({ item, error });
        ValidationMonitor.recordValidationError({
          service: this.name,
          operation,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

// Role-specific service extensions
export class InventoryRoleService extends BaseRoleService {
  // Inventory-specific methods using base patterns
  static async getInventoryDashboard() {
    // Uses resilient processing pattern
    // Collects analytics data for future executive insights
  }
}

export class MarketingRoleService extends BaseRoleService {
  // Marketing-specific methods using base patterns
  static async getMarketingDashboard() {
    // Uses resilient processing pattern  
    // Collects analytics data for future executive insights
  }
}

export class ExecutiveAnalyticsService extends BaseRoleService {
  // Cross-role analytics combining inventory + marketing data
  static async getCrossRoleInsights() {
    const [inventoryData, marketingData] = await Promise.all([
      InventoryRoleService.getAnalyticsData(),
      MarketingRoleService.getAnalyticsData()
    ]);
    
    return this.analyzeCorrelations(inventoryData, marketingData);
  }
}
```

### **Schema Architecture (Following Product Management Patterns)**
```typescript
// Base schema patterns
// src/schemas/role-based/index.ts
export * from './rolePermission.schemas';
export * from './inventory';
export * from './marketing'; 
export * from './executive';

// Role permission schema with transformation
// src/schemas/role-based/rolePermission.schemas.ts
const RolePermissionDatabaseSchema = z.object({
  user_id: z.string().min(1),
  role_type: z.enum(['inventory_staff', 'marketing_staff', 'executive', 'admin']),
  permissions: z.array(z.string()).nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

export const RolePermissionTransformSchema = RolePermissionDatabaseSchema.transform((data) => ({
  userId: data.user_id,
  roleType: data.role_type,
  permissions: data.permissions || [],
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString()
}));

export type RolePermissionTransform = z.infer<typeof RolePermissionTransformSchema>;
```

### **Hook Architecture (Following Product Management Patterns)**
```typescript
// Base role hook with React Query integration
// src/hooks/role-based/useUserRole.ts
export function useUserRole(userId?: string) {
  return useQuery({
    queryKey: roleKeys.userRole(userId),
    queryFn: () => RolePermissionService.getUserRole(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000     // 30 minutes
  });
}

// Role-specific dashboard hooks
// src/hooks/role-based/useInventoryDashboard.ts
export function useInventoryDashboard() {
  const { data: userRole } = useUserRole();
  
  return useQuery({
    queryKey: roleKeys.inventoryDashboard(),
    queryFn: () => InventoryRoleService.getInventoryDashboard(),
    enabled: userRole?.roleType === 'inventory_staff' || userRole?.roleType === 'admin',
    staleTime: 2 * 60 * 1000   // 2 minutes for operational data
  });
}

// Executive analytics hook (future-ready)
// src/hooks/role-based/useExecutiveAnalytics.ts  
export function useExecutiveAnalytics() {
  const { data: userRole } = useUserRole();
  
  return useQuery({
    queryKey: roleKeys.executiveAnalytics(),
    queryFn: () => ExecutiveAnalyticsService.getCrossRoleInsights(),
    enabled: userRole?.roleType === 'executive' || userRole?.roleType === 'admin',
    staleTime: 10 * 60 * 1000  // 10 minutes for strategic data
  });
}
```

---

## 🗂️ **Navigation Architecture (Extensible Design)**

### **Role-Based Navigation Structure**
```typescript
// src/navigation/RoleBasedStackNavigator.tsx
export type RoleBasedStackParamList = {
  // Universal screens
  RoleDashboard: undefined;
  UserProfile: undefined;
  
  // Inventory role screens
  InventoryDashboard: undefined;
  StockManagement: undefined;
  InventoryAlerts: undefined;
  InventoryAnalytics: undefined;
  
  // Marketing role screens  
  MarketingDashboard: undefined;
  ProductContent: { productId?: string };
  PromotionPlanner: undefined;
  BundleManagement: undefined;
  MarketingAnalytics: undefined;
  
  // Executive role screens (future-ready)
  ExecutiveDashboard: undefined;
  BusinessIntelligence: undefined;
  StrategicReports: undefined;
  PredictiveAnalytics: undefined;
  
  // Shared screens (accessed by multiple roles)
  ProductCore: { id: string };
  Categories: undefined;
};

export const RoleBasedStackNavigator = () => {
  const { data: userRole } = useUserRole();
  const navigation = useRoleBasedNavigation(userRole);
  
  return (
    <Stack.Navigator>
      {/* Universal screens always available */}
      <Stack.Screen name="RoleDashboard" component={RoleDashboard} />
      
      {/* Conditional screens based on role */}
      {navigation.canAccessInventory && (
        <>
          <Stack.Screen name="InventoryDashboard" component={InventoryDashboard} />
          <Stack.Screen name="StockManagement" component={StockManagement} />
        </>
      )}
      
      {navigation.canAccessMarketing && (
        <>
          <Stack.Screen name="MarketingDashboard" component={MarketingDashboard} />
          <Stack.Screen name="ProductContent" component={ProductContent} />
        </>
      )}
      
      {navigation.canAccessExecutive && (
        <>
          <Stack.Screen name="ExecutiveDashboard" component={ExecutiveDashboard} />
          <Stack.Screen name="BusinessIntelligence" component={BusinessIntelligence} />
        </>
      )}
    </Stack.Navigator>
  );
};
```

### **Dynamic Menu Generation**
```typescript
// src/services/role-based/roleNavigationService.ts
export class RoleNavigationService {
  static generateMenuItems(roleType: RoleType, permissions: string[]): MenuItem[] {
    const baseMenuItems = [
      { title: 'Dashboard', screen: 'RoleDashboard', icon: 'dashboard' }
    ];
    
    const roleMenus = {
      inventory_staff: [
        { title: 'Inventory', screen: 'InventoryDashboard', icon: 'inventory' },
        { title: 'Stock Management', screen: 'StockManagement', icon: 'stock' },
        { title: 'Alerts', screen: 'InventoryAlerts', icon: 'alert' }
      ],
      marketing_staff: [
        { title: 'Marketing', screen: 'MarketingDashboard', icon: 'marketing' },
        { title: 'Content', screen: 'ProductContent', icon: 'content' },
        { title: 'Promotions', screen: 'PromotionPlanner', icon: 'promotion' }
      ],
      executive: [
        { title: 'Executive', screen: 'ExecutiveDashboard', icon: 'executive' },
        { title: 'Business Intelligence', screen: 'BusinessIntelligence', icon: 'analytics' },
        { title: 'Reports', screen: 'StrategicReports', icon: 'reports' }
      ],
      admin: [
        // Admin sees all menus combined
        ...roleMenus.inventory_staff,
        ...roleMenus.marketing_staff,
        ...roleMenus.executive
      ]
    };
    
    return [
      ...baseMenuItems,
      ...(roleMenus[roleType] || [])
    ].filter(item => this.hasPermission(item.screen, permissions));
  }
}
```

---

## 🎨 **Screen Architecture (Role-Specific Design)**

### **Inventory Operations Screens**
```typescript
// src/screens/role-based/inventory/InventoryDashboard.tsx
export const InventoryDashboard = () => {
  const { data: dashboardData } = useInventoryDashboard();
  const { data: lowStockAlerts } = useLowStockAlerts();
  
  return (
    <Screen>
      <ScrollView>
        {/* Inventory-focused widgets */}
        <InventoryOverviewCard data={dashboardData?.overview} />
        <LowStockAlertsList alerts={lowStockAlerts} />
        <RecentStockMovements movements={dashboardData?.recentMovements} />
        <InventoryPerformanceMetrics metrics={dashboardData?.performance} />
        
        {/* Quick actions */}
        <QuickActionGrid>
          <QuickAction title="Receive Stock" screen="ReceiveStock" />
          <QuickAction title="Adjust Inventory" screen="InventoryAdjustment" />
          <QuickAction title="Cycle Count" screen="CycleCount" />
          <QuickAction title="Reports" screen="InventoryReports" />
        </QuickActionGrid>
      </ScrollView>
    </Screen>
  );
};

// src/screens/role-based/inventory/StockManagementScreen.tsx  
export const StockManagementScreen = () => {
  const { data: products } = useInventoryProducts();
  const { mutate: updateStock } = useUpdateStock();
  
  return (
    <Screen>
      <ProductListView 
        products={products}
        renderItem={({ item }) => (
          <InventoryProductCard 
            product={item}
            onUpdateStock={(newStock) => updateStock({ id: item.id, stock: newStock })}
            showStockControls
            showAlertThresholds
          />
        )}
      />
    </Screen>
  );
};
```

### **Marketing Operations Screens**
```typescript
// src/screens/role-based/marketing/MarketingDashboard.tsx
export const MarketingDashboard = () => {
  const { data: dashboardData } = useMarketingDashboard();
  const { data: campaignMetrics } = useCampaignMetrics();
  
  return (
    <Screen>
      <ScrollView>
        {/* Marketing-focused widgets */}
        <CampaignOverviewCard data={dashboardData?.campaigns} />
        <ProductContentStatusCard status={dashboardData?.contentStatus} />
        <PromotionPlannerCard promotions={dashboardData?.upcomingPromotions} />
        <CustomerEngagementMetrics metrics={campaignMetrics} />
        
        {/* Quick actions */}
        <QuickActionGrid>
          <QuickAction title="Content Manager" screen="ProductContent" />
          <QuickAction title="Plan Promotion" screen="PromotionPlanner" />
          <QuickAction title="Create Bundle" screen="BundleManagement" />
          <QuickAction title="Push Notification" screen="PushNotification" />
        </QuickActionGrid>
      </ScrollView>
    </Screen>
  );
};

// src/screens/role-based/marketing/ProductContentScreen.tsx
export const ProductContentScreen = () => {
  const { data: products } = useMarketingProducts();
  const { mutate: updateContent } = useUpdateProductContent();
  
  return (
    <Screen>
      <ProductListView 
        products={products}
        renderItem={({ item }) => (
          <MarketingProductCard 
            product={item}
            onUpdateContent={(content) => updateContent({ id: item.id, ...content })}
            showContentControls
            showMarketingMetrics
          />
        )}
      />
    </Screen>
  );
};
```

### **Executive Analytics Screens (Future-Ready)**
```typescript
// src/screens/role-based/executive/ExecutiveDashboard.tsx
export const ExecutiveDashboard = () => {
  const { data: businessMetrics } = useExecutiveAnalytics();
  const { data: crossRoleInsights } = useCrossRoleInsights();
  
  return (
    <Screen>
      <ScrollView>
        {/* Strategic overview */}
        <BusinessOverviewCard metrics={businessMetrics?.overview} />
        <StrategicKPIGrid kpis={businessMetrics?.kpis} />
        
        {/* Cross-role insights */}
        <CorrelationInsightsCard insights={crossRoleInsights} />
        <ProductProfitabilityMatrix data={businessMetrics?.profitability} />
        
        {/* Predictive analytics */}
        <PredictiveAnalyticsCard predictions={businessMetrics?.predictions} />
        <StrategicRecommendations recommendations={businessMetrics?.recommendations} />
        
        {/* Quick navigation to detailed views */}
        <QuickActionGrid>
          <QuickAction title="Business Intelligence" screen="BusinessIntelligence" />
          <QuickAction title="Strategic Reports" screen="StrategicReports" />
          <QuickAction title="Predictive Models" screen="PredictiveAnalytics" />
        </QuickActionGrid>
      </ScrollView>
    </Screen>
  );
};
```

---

## 📊 **Analytics Data Collection Strategy**

### **Multi-Tier Analytics Architecture**
```typescript
// src/services/role-based/roleAnalyticsService.ts
export class RoleAnalyticsService {
  // Operational tier - role-specific metrics
  static async collectOperationalMetrics(roleType: RoleType, action: string, data: any) {
    const metrics = {
      roleType,
      action,
      timestamp: new Date().toISOString(),
      data,
      tier: 'operational'
    };
    
    await this.storeAnalyticsData(metrics);
  }
  
  // Strategic tier - cross-role correlation data (future executive analytics)
  static async collectStrategicMetrics(correlationData: any) {
    const metrics = {
      type: 'strategic_correlation',
      timestamp: new Date().toISOString(),
      data: correlationData,
      tier: 'strategic'
    };
    
    await this.storeAnalyticsData(metrics);
  }
  
  // Executive tier - business intelligence data
  static async collectExecutiveMetrics(businessData: any) {
    const metrics = {
      type: 'executive_intelligence', 
      timestamp: new Date().toISOString(),
      data: businessData,
      tier: 'executive'
    };
    
    await this.storeAnalyticsData(metrics);
  }
}
```

### **Analytics Collection Points**
```typescript
// Every role action automatically collected
// Inventory actions
InventoryRoleService.updateStock() → RoleAnalyticsService.collectOperationalMetrics()
InventoryRoleService.receiveStock() → RoleAnalyticsService.collectOperationalMetrics()

// Marketing actions  
MarketingRoleService.updateContent() → RoleAnalyticsService.collectOperationalMetrics()
MarketingRoleService.createPromotion() → RoleAnalyticsService.collectOperationalMetrics()

// Cross-role correlations
When inventory action affects marketing metrics → RoleAnalyticsService.collectStrategicMetrics()
When marketing campaign affects stock levels → RoleAnalyticsService.collectStrategicMetrics()

// Executive insights (future)
Business performance calculations → RoleAnalyticsService.collectExecutiveMetrics()
Strategic recommendations → RoleAnalyticsService.collectExecutiveMetrics()
```

---

## 🔧 **Development Workflow**

### **Phase Implementation Process**
1. **Schema First**: Define data contracts following product management patterns
2. **Service Layer**: Build resilient services with validation monitoring
3. **Hook Integration**: Create React Query hooks with proper cache management
4. **Screen Development**: Build role-specific UI with shared component patterns
5. **Test Coverage**: Comprehensive testing at all layers
6. **Integration Testing**: Cross-role functionality validation

### **Quality Gates**
- All schema contracts must pass compile-time validation
- Service layer must achieve 90%+ test coverage
- All hooks must have race condition testing
- Screen components must have accessibility compliance
- Cross-role integration must be validated

### **Extension Process (Future Roles)**
1. Define new role type in core role system
2. Extend base service with role-specific methods
3. Create role-specific schemas and contracts
4. Build role dashboard following established patterns
5. Add navigation and permissions
6. Analytics integration is automatic

---

## 🎯 **Success Metrics**

### **Architecture Quality**
- Zero breaking changes to existing product management foundation
- 100% schema contract compliance across all roles
- 90%+ test coverage across all service layers
- Sub-200ms response time for role-specific dashboards

### **Extensibility Validation**
- New role addition time: Target <1 week
- Executive analytics integration: Target <2 weeks  
- New analytics dimension addition: Target <3 days
- Permission modification: Target <1 day

### **Production Readiness**
- 390+ comprehensive tests across all layers
- Validation monitoring integrated throughout
- Performance benchmarks established
- Security audit completed

This plan builds complete role-based architecture from scratch using proven patterns while designing unlimited extensibility for executive analytics and future role types.