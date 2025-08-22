# Role-Based Admin Architecture Design

## 🎯 Executive Summary

Transform the current monolithic admin system into a role-based architecture with clear separation between **Inventory Operations** and **Marketing Operations**. This design maintains data integrity while providing specialized workflows for different user types.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Dashboard                          │
├─────────────────────────────────────────────────────────────────┤
│  User Role Detection & Navigation                               │
├─────────────────────┬───────────────────────────────────────────┤
│  📦 INVENTORY OPS   │  🎨 MARKETING OPS                        │
│  (Backend Staff)    │  (Marketing Staff)                       │
├─────────────────────┼───────────────────────────────────────────┤
│ Stock Management    │ Content Management                        │
│ Inventory Tracking  │ Bundle & Specials                        │
│ Supply Chain        │ Customer Communications                   │
│ Reports & Alerts    │ Marketing Analytics                       │
├─────────────────────┼───────────────────────────────────────────┤
│     SHARED CORE DATA LAYER                                      │
│ Product Core • Categories • User Management                     │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Data Model Migration Strategy

### Current Monolithic Model Issues
```typescript
// Current: Everything mixed together ❌
interface ProductAdminTransform {
  // Core data
  id: string;
  name: string;
  price: number;
  
  // Stock data (Inventory team)
  stock_quantity: number;
  low_stock_threshold: number;
  supplier_id: string;
  
  // Marketing data (Marketing team)
  image_url: string;
  description: string;
  tags: string[];
  is_weekly_special: boolean;
  bundle_items: string[];
  
  // Mixed concerns!
}
```

### Proposed Role-Based Models ✅

#### 1. **Core Product Model** (Shared)
```typescript
interface ProductCore {
  id: string;
  name: string;
  price: number;
  category_id: string;
  sku: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed/joined data
  category?: CategoryData;
}

// Shared service and schema
export const ProductCoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category_id: z.string().nullable(),
  sku: z.string().nullable(),
  is_available: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});
```

#### 2. **Inventory Model** (Inventory Operations)
```typescript
interface ProductInventory extends ProductCore {
  // Stock management
  stock_quantity: number;
  low_stock_threshold: number;
  reorder_point: number;
  
  // Supply chain
  supplier_id: string;
  supplier_sku: string;
  cost_price: number;
  
  // Tracking
  last_stock_update: string;
  stock_movements: StockMovement[];
  inventory_value: number;
  
  // Alerts
  stock_alerts: StockAlert[];
}

// Inventory-specific service
export const ProductInventorySchema = ProductCoreSchema.extend({
  stock_quantity: z.number().min(0),
  low_stock_threshold: z.number().min(0),
  reorder_point: z.number().min(0),
  supplier_id: z.string().nullable(),
  supplier_sku: z.string().nullable(),
  cost_price: z.number().min(0),
  last_stock_update: z.string(),
  inventory_value: z.number()
});
```

#### 3. **Marketing Model** (Marketing Operations)
```typescript
interface ProductMarketing extends ProductCore {
  // Content management
  images: ProductImage[];
  description: string;
  short_description: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  
  // Promotions
  is_weekly_special: boolean;
  special_price: number | null;
  special_start_date: string | null;
  special_end_date: string | null;
  promotion_message: string | null;
  
  // Bundles
  is_bundle: boolean;
  bundle_items: BundleItem[];
  bundle_discount_type: 'percentage' | 'fixed' | null;
  bundle_discount_value: number | null;
  
  // Marketing campaigns
  campaigns: MarketingCampaign[];
  last_promoted: string | null;
}

// Marketing-specific service
export const ProductMarketingSchema = ProductCoreSchema.extend({
  images: z.array(ProductImageSchema),
  description: z.string(),
  short_description: z.string(),
  tags: z.array(z.string()),
  seo_title: z.string(),
  seo_description: z.string(),
  is_weekly_special: z.boolean(),
  special_price: z.number().nullable(),
  promotion_message: z.string().nullable(),
  is_bundle: z.boolean(),
  bundle_items: z.array(BundleItemSchema)
});
```

## 🗂️ Service Layer Architecture

### Service Separation Strategy

```typescript
// 1. CORE SERVICE (Shared)
class ProductCoreService {
  async getProduct(id: string): Promise<ProductCore> { }
  async updateProduct(id: string, data: ProductCoreUpdate): Promise<ProductCore> { }
  async deleteProduct(id: string): Promise<void> { }
  async getCategories(): Promise<Category[]> { }
}

// 2. INVENTORY SERVICE (Stock Operations)
class ProductInventoryService extends ProductCoreService {
  async getInventoryData(id: string): Promise<ProductInventory> { }
  async updateStock(id: string, quantity: number, reason: string): Promise<void> { }
  async bulkUpdateStock(updates: BulkStockUpdate[]): Promise<BulkResult> { }
  async getLowStockProducts(threshold?: number): Promise<ProductInventory[]> { }
  async getStockMovements(id: string): Promise<StockMovement[]> { }
  async setStockAlerts(id: string, alerts: StockAlert[]): Promise<void> { }
  async generateInventoryReport(filters: ReportFilters): Promise<InventoryReport> { }
}

// 3. MARKETING SERVICE (Marketing Operations)
class ProductMarketingService extends ProductCoreService {
  async getMarketingData(id: string): Promise<ProductMarketing> { }
  async updateContent(id: string, content: ContentUpdate): Promise<void> { }
  async uploadImages(id: string, images: File[]): Promise<ProductImage[]> { }
  async createWeeklySpecial(id: string, special: WeeklySpecial): Promise<void> { }
  async createBundle(bundle: BundleCreate): Promise<Bundle> { }
  async sendPromotionNotification(campaign: NotificationCampaign): Promise<void> { }
  async getMarketingAnalytics(filters: AnalyticsFilters): Promise<MarketingReport> { }
}
```

### Service File Structure
```
src/services/
├── core/
│   ├── productCoreService.ts         # Shared base operations
│   ├── categoryService.ts            # Category management
│   └── userRoleService.ts            # Role detection
├── inventory/
│   ├── productInventoryService.ts    # Stock operations
│   ├── supplierService.ts            # Supply chain
│   ├── stockMovementService.ts       # Tracking
│   └── inventoryReportService.ts     # Reports
└── marketing/
    ├── productMarketingService.ts    # Content operations
    ├── campaignService.ts            # Marketing campaigns
    ├── bundleService.ts              # Bundle management
    ├── notificationService.ts        # Push notifications
    └── marketingAnalyticsService.ts  # Marketing reports
```

## 🧩 Navigation Architecture

### Role-Based Navigation Structure

```typescript
// Navigation Types
export type AdminStackParamList = {
  // Main Dashboard
  AdminDashboard: undefined;
  
  // Role Selection
  RoleSelection: undefined;
  
  // Inventory Operations (Backend Staff)
  InventoryDashboard: undefined;
  StockManagement: undefined;
  InventoryTracking: undefined;
  SupplyChainManagement: undefined;
  InventoryReports: undefined;
  StockAlerts: undefined;
  
  // Marketing Operations (Marketing Staff)
  MarketingDashboard: undefined;
  ProductContentManagement: undefined;
  BundleSpecialManagement: undefined;
  CustomerCommunications: undefined;
  MarketingAnalytics: undefined;
  CampaignManagement: undefined;
  
  // Shared Screens
  ProductCore: { id: string };  // Basic product info
  Categories: undefined;
  UserManagement: undefined;
};

// Role-based Navigation Component
export const AdminStackNavigator = () => {
  const { userRole } = useAdminRole();
  
  return (
    <Stack.Navigator initialRouteName="AdminDashboard">
      {/* Main Dashboard */}
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      
      {/* Role Selection */}
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      
      {/* Inventory Operations */}
      {(userRole === 'inventory' || userRole === 'admin') && (
        <Stack.Group screenOptions={{ headerStyle: { backgroundColor: '#059669' } }}>
          <Stack.Screen name="InventoryDashboard" component={InventoryDashboardScreen} />
          <Stack.Screen name="StockManagement" component={StockManagementScreen} />
          <Stack.Screen name="InventoryTracking" component={InventoryTrackingScreen} />
          <Stack.Screen name="SupplyChainManagement" component={SupplyChainScreen} />
          <Stack.Screen name="InventoryReports" component={InventoryReportsScreen} />
        </Stack.Group>
      )}
      
      {/* Marketing Operations */}
      {(userRole === 'marketing' || userRole === 'admin') && (
        <Stack.Group screenOptions={{ headerStyle: { backgroundColor: '#7c3aed' } }}>
          <Stack.Screen name="MarketingDashboard" component={MarketingDashboardScreen} />
          <Stack.Screen name="ProductContentManagement" component={ProductContentScreen} />
          <Stack.Screen name="BundleSpecialManagement" component={BundleSpecialScreen} />
          <Stack.Screen name="CustomerCommunications" component={CustomerCommScreen} />
          <Stack.Screen name="MarketingAnalytics" component={MarketingAnalyticsScreen} />
        </Stack.Group>
      )}
      
      {/* Shared Screens */}
      <Stack.Screen name="ProductCore" component={ProductCoreScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
    </Stack.Navigator>
  );
};
```

### Dashboard Layout

```typescript
// Main Admin Dashboard with Role Cards
export const AdminDashboardScreen = () => {
  const { userRole, permissions } = useAdminRole();
  
  return (
    <Screen>
      <Card style={styles.welcomeCard}>
        <Text variant="heading2">🏪 Farm Admin Dashboard</Text>
        <Text variant="body">Welcome, {user?.name}</Text>
      </Card>
      
      {/* Role-based Quick Access */}
      <View style={styles.roleCards}>
        {permissions.canManageInventory && (
          <RoleCard
            title="📦 Inventory Operations"
            subtitle="Stock • Supply Chain • Reports"
            color="#059669"
            onPress={() => navigation.navigate('InventoryDashboard')}
            stats={inventoryStats}
          />
        )}
        
        {permissions.canManageMarketing && (
          <RoleCard
            title="🎨 Marketing Operations" 
            subtitle="Content • Campaigns • Analytics"
            color="#7c3aed"
            onPress={() => navigation.navigate('MarketingDashboard')}
            stats={marketingStats}
          />
        )}
      </View>
      
      {/* Recent Activity Feed */}
      <RecentActivityFeed />
    </Screen>
  );
};
```

## 🗄️ Database Design Considerations

### Table Structure Strategy

#### Option A: Single Products Table with Role Views ✅ RECOMMENDED
```sql
-- Keep existing products table
CREATE TABLE products (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  price decimal NOT NULL,
  category_id uuid REFERENCES categories(id),
  
  -- Inventory fields
  stock_quantity integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 10,
  supplier_id uuid REFERENCES suppliers(id),
  cost_price decimal,
  
  -- Marketing fields  
  description text,
  image_urls text[],
  tags text[],
  is_weekly_special boolean DEFAULT false,
  special_price decimal,
  special_start_date timestamp,
  special_end_date timestamp,
  
  -- Common fields
  is_available boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Role-based views for clean service layer
CREATE VIEW inventory_products AS 
SELECT 
  id, name, price, category_id, sku,
  stock_quantity, low_stock_threshold, supplier_id, cost_price,
  is_available, created_at, updated_at
FROM products;

CREATE VIEW marketing_products AS
SELECT 
  id, name, price, category_id, sku,
  description, image_urls, tags, 
  is_weekly_special, special_price, special_start_date, special_end_date,
  is_available, created_at, updated_at  
FROM products;
```

#### Additional Tables for Role-Specific Data
```sql
-- Inventory-specific tables
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES products(id),
  movement_type text CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity integer,
  reason text,
  user_id uuid,
  created_at timestamp DEFAULT now()
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  contact_info jsonb,
  created_at timestamp DEFAULT now()
);

-- Marketing-specific tables
CREATE TABLE marketing_campaigns (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  start_date timestamp,
  end_date timestamp,
  product_ids uuid[],
  campaign_type text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE product_bundles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  bundle_items jsonb, -- [{product_id, quantity, discount}]
  total_discount decimal,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
```

## 🔑 Hook Architecture Migration

### Role-Specific Hook Organization

```typescript
// INVENTORY HOOKS
export const useInventoryProducts = () => { /* ... */ };
export const useStockUpdate = () => { /* ... */ };  
export const useBulkStockUpdate = () => { /* ... */ };
export const useLowStockAlerts = () => { /* ... */ };
export const useInventoryReports = () => { /* ... */ };

// MARKETING HOOKS  
export const useMarketingProducts = () => { /* ... */ };
export const useProductContent = () => { /* ... */ };
export const useWeeklySpecials = () => { /* ... */ };
export const useBundleManagement = () => { /* ... */ };
export const useMarketingCampaigns = () => { /* ... */ };
export const usePushNotifications = () => { /* ... */ };

// SHARED HOOKS
export const useProductCore = () => { /* ... */ };
export const useCategories = () => { /* ... */ };
export const useAdminRole = () => { /* ... */ };
```

### Query Key Factory Extension

```typescript
// Extend existing pattern for role separation
export const inventoryKeys = {
  all: () => [...productKeys.all(), 'inventory'] as const,
  products: () => [...inventoryKeys.all(), 'products'] as const,
  product: (id: string) => [...inventoryKeys.products(), id] as const,
  stock: {
    all: () => [...inventoryKeys.all(), 'stock'] as const,
    movements: (id: string) => [...inventoryKeys.stock.all(), 'movements', id] as const,
    alerts: () => [...inventoryKeys.stock.all(), 'alerts'] as const,
  },
  reports: {
    all: () => [...inventoryKeys.all(), 'reports'] as const,
    inventory: (filters: any) => [...inventoryKeys.reports.all(), 'inventory', filters] as const,
  }
};

export const marketingKeys = {
  all: () => [...productKeys.all(), 'marketing'] as const,
  products: () => [...marketingKeys.all(), 'products'] as const,
  product: (id: string) => [...marketingKeys.products(), id] as const,
  content: {
    all: () => [...marketingKeys.all(), 'content'] as const,
    images: (id: string) => [...marketingKeys.content.all(), 'images', id] as const,
  },
  campaigns: {
    all: () => [...marketingKeys.all(), 'campaigns'] as const,
    active: () => [...marketingKeys.campaigns.all(), 'active'] as const,
  },
  bundles: {
    all: () => [...marketingKeys.all(), 'bundles'] as const,
    active: () => [...marketingKeys.bundles.all(), 'active'] as const,
  }
};
```

## 🎭 User Role Management

### Role Definition System

```typescript
export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  resource: 'products' | 'inventory' | 'marketing' | 'analytics' | 'users';
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

// Predefined Roles
export const ADMIN_ROLES = {
  SUPER_ADMIN: {
    id: 'super_admin',
    name: 'Super Administrator',
    permissions: [
      { resource: 'products', actions: ['read', 'write', 'delete', 'admin'] },
      { resource: 'inventory', actions: ['read', 'write', 'delete', 'admin'] },
      { resource: 'marketing', actions: ['read', 'write', 'delete', 'admin'] },
      { resource: 'analytics', actions: ['read', 'write', 'admin'] },
      { resource: 'users', actions: ['read', 'write', 'delete', 'admin'] }
    ]
  },
  
  INVENTORY_MANAGER: {
    id: 'inventory_manager',
    name: 'Inventory Manager',
    permissions: [
      { resource: 'products', actions: ['read', 'write'] },
      { resource: 'inventory', actions: ['read', 'write', 'delete'] },
      { resource: 'analytics', actions: ['read'] }
    ]
  },
  
  MARKETING_MANAGER: {
    id: 'marketing_manager', 
    name: 'Marketing Manager',
    permissions: [
      { resource: 'products', actions: ['read', 'write'] },
      { resource: 'marketing', actions: ['read', 'write', 'delete'] },
      { resource: 'analytics', actions: ['read'] }
    ]
  },
  
  INVENTORY_STAFF: {
    id: 'inventory_staff',
    name: 'Inventory Staff',
    permissions: [
      { resource: 'products', actions: ['read'] },
      { resource: 'inventory', actions: ['read', 'write'] }
    ]
  },
  
  MARKETING_STAFF: {
    id: 'marketing_staff',
    name: 'Marketing Staff', 
    permissions: [
      { resource: 'products', actions: ['read'] },
      { resource: 'marketing', actions: ['read', 'write'] }
    ]
  }
};

// Role Detection Hook
export const useAdminRole = () => {
  const { data: user } = useCurrentUser();
  
  const userRole = useMemo(() => {
    if (!user?.admin_role) return null;
    return ADMIN_ROLES[user.admin_role] || null;
  }, [user]);
  
  const permissions = useMemo(() => ({
    canManageInventory: userRole?.permissions.some(p => 
      p.resource === 'inventory' && p.actions.includes('write')
    ) || false,
    canManageMarketing: userRole?.permissions.some(p => 
      p.resource === 'marketing' && p.actions.includes('write')
    ) || false,
    canViewAnalytics: userRole?.permissions.some(p => 
      p.resource === 'analytics' && p.actions.includes('read')
    ) || false,
    isAdmin: userRole?.permissions.some(p => 
      p.actions.includes('admin')
    ) || false
  }), [userRole]);
  
  return { userRole, permissions };
};
```

## 📱 Screen Architecture by Role

### 📦 Inventory Operations Screens

```typescript
// InventoryDashboardScreen.tsx
export const InventoryDashboardScreen = () => (
  <Screen>
    <InventoryOverviewCards />
    <LowStockAlerts />
    <RecentStockMovements />
    <QuickActions />
  </Screen>
);

// StockManagementScreen.tsx (existing, enhanced)
// Already implemented ✅

// InventoryTrackingScreen.tsx  
export const InventoryTrackingScreen = () => (
  <Screen>
    <StockMovementHistory />
    <InventoryValueTracking />
    <ExpirationDateAlerts />
    <InventoryAdjustments />
  </Screen>
);

// SupplyChainManagementScreen.tsx
export const SupplyChainManagementScreen = () => (
  <Screen>
    <SupplierManagement />
    <PurchaseOrderTracking />
    <DeliveryScheduling />
    <CostAnalysis />
  </Screen>
);
```

### 🎨 Marketing Operations Screens

```typescript
// MarketingDashboardScreen.tsx
export const MarketingDashboardScreen = () => (
  <Screen>
    <MarketingOverviewCards />
    <ActiveCampaigns />
    <WeeklySpecialsStatus />
    <CustomerEngagementMetrics />
  </Screen>
);

// ProductContentManagementScreen.tsx
export const ProductContentManagementScreen = () => (
  <Screen>
    <ProductContentEditor />
    <ImageGalleryManager />
    <SEOOptimization />
    <ContentPreview />
  </Screen>
);

// BundleSpecialManagementScreen.tsx
export const BundleSpecialManagementScreen = () => (
  <Screen>
    <WeeklySpecialsManager />
    <BundleCreator />
    <PromotionalCampaigns />
    <DiscountStrategies />
  </Screen>
);

// CustomerCommunicationScreen.tsx
export const CustomerCommunicationScreen = () => (
  <Screen>
    <PushNotificationCenter />
    <EmailCampaignManager />
    <CustomerSegmentation />
    <MessageTemplates />
  </Screen>
);
```

## 🚀 Migration Implementation Plan

### Phase 1: Data Model Migration (1-2 weeks)
1. **Create Role-Specific Schemas** 
   - Extract inventory-specific fields
   - Extract marketing-specific fields  
   - Define shared core schema

2. **Update Service Layer**
   - Split ProductAdminService into specialized services
   - Create service base classes
   - Implement role-specific query patterns

3. **Create Database Views**
   - Inventory-focused views
   - Marketing-focused views
   - Maintain backward compatibility

### Phase 2: Navigation & Role Management (1 week)
1. **Implement Role Detection**
   - User role management system
   - Permission-based navigation
   - Role selection interface

2. **Create Role-Based Navigation**
   - Separate navigation stacks
   - Role-specific screen groups
   - Shared screen access

### Phase 3: Inventory Screens Enhancement (1-2 weeks)
1. **Enhance Existing Stock Management**
   - Add inventory-specific features
   - Supply chain integration
   - Advanced reporting

2. **Create New Inventory Screens**
   - Inventory tracking
   - Supply chain management
   - Inventory reports and alerts

### Phase 4: Marketing Screens Implementation (2-3 weeks)
1. **Product Content Management**
   - Image upload and management
   - Content editing interface
   - SEO optimization tools

2. **Bundle & Special Management** 
   - Weekly specials interface
   - Bundle creation tools
   - Promotional campaign management

3. **Customer Communication Hub**
   - Push notification center
   - Campaign management
   - Customer segmentation

### Phase 5: Analytics & Optimization (1 week)
1. **Role-Specific Analytics**
   - Inventory performance metrics
   - Marketing campaign analytics
   - Cross-role insights

2. **System Optimization**
   - Performance tuning
   - Error handling enhancement
   - User experience polish

## ✅ Migration Benefits

### 🎯 **Immediate Benefits**
- ✅ **Clear role separation** - No more confusion about who manages what
- ✅ **Specialized workflows** - Each role gets optimized interface
- ✅ **Better security** - Permission-based access control
- ✅ **Reduced complexity** - Focused feature sets per role

### 📈 **Long-term Benefits**  
- ✅ **Scalable architecture** - Easy to add new roles/features
- ✅ **Better maintenance** - Clear boundaries reduce bugs
- ✅ **User satisfaction** - Role-specific optimization
- ✅ **Analytics insights** - Role-based usage tracking

### 🔧 **Technical Benefits**
- ✅ **Cleaner code** - Separation of concerns
- ✅ **Better testing** - Role-specific test suites  
- ✅ **Faster development** - Clear feature ownership
- ✅ **Easier onboarding** - Role-focused documentation

## 💡 Key Design Decisions

### 1. **Single Database, Multiple Views**
**Decision**: Keep unified products table with role-based views  
**Rationale**: Maintains data consistency while providing clean service layer separation  
**Benefit**: No data duplication, easier migrations

### 2. **Service Inheritance Pattern**
**Decision**: Use base ProductCoreService with role-specific extensions  
**Rationale**: Share common operations while specializing role-specific logic  
**Benefit**: DRY principle, consistent patterns

### 3. **Permission-Based Navigation**
**Decision**: Dynamic navigation based on user permissions  
**Rationale**: Flexible role assignment without code changes  
**Benefit**: Easy role management, secure access

### 4. **Gradual Migration Strategy**  
**Decision**: Migrate in phases while maintaining existing functionality  
**Rationale**: Minimize disruption to current operations  
**Benefit**: Continuous delivery, reduced risk

This role-based architecture provides a clear path forward while leveraging the existing strong foundation we've built. The data models can indeed be easily migrated, and the separation will create much better user experiences for each role type.

Would you like me to start implementing this architecture, beginning with Phase 1 (Data Model Migration)?