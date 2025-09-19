# Customer App Implementation Plan

## Overview

This document provides a detailed, task-by-task breakdown of the customer app migration process. Each phase includes specific deliverables, timeline estimates, and acceptance criteria.

## Phase 1: Foundation Setup (Weeks 1-2)

### 1.1 Create Monorepo Structure (Day 1)

#### Tasks
```bash
# Task 1.1.1: Initialize monorepo
npm install -g lerna
lerna init
mkdir packages apps

# Task 1.1.2: Setup workspace structure
mkdir -p packages/{shared-core,customer-mobile,business-web}
mkdir -p apps/{customer-mobile,business-dashboard}
```

#### Deliverables
- Lerna configuration
- Workspace directory structure
- Package.json with workspace definitions

### 1.2 Extract Shared Core Package (Days 2-8)

#### Task 1.2.1: Core Authentication (2 days)
```typescript
packages/shared-core/src/auth/
├── useAuth.ts           # ✅ Already customer-ready
├── authService.ts       # ✅ Clean API
├── types.ts            # User, AuthState types
└── index.ts
```

**Acceptance Criteria:**
- All auth functions work independently
- No business-specific dependencies
- Type safety maintained

#### Task 1.2.2: Product Management (1 day)
```typescript
packages/shared-core/src/products/
├── useProducts.ts       # ✅ Already customer-ready
├── productService.ts    # ✅ Clean API
├── types.ts            # Product, Category types
└── index.ts
```

**Acceptance Criteria:**
- Product catalog functions work
- No inventory management dependencies
- Category filtering maintained

#### Task 1.2.3: Cart System (2 days)
```typescript
packages/shared-core/src/cart/
├── useCart.ts          # ✅ Already customer-ready
├── cartService.ts      # ✅ Clean API
├── types.ts           # CartState, CartItem types
└── index.ts
```

**Acceptance Criteria:**
- All cart operations functional
- Stock validation works
- Real-time updates preserved

#### Task 1.2.4: Order System (2 days)
```typescript
packages/shared-core/src/orders/
├── useOrders.ts        # Extract from existing
├── orderService.ts     # Extract from existing
├── types.ts           # Order, OrderItem types
└── index.ts
```

**Acceptance Criteria:**
- Customer order creation works
- Order history retrieval works
- No admin order management included

#### Task 1.2.5: Database Config (1 day)
```typescript
packages/shared-core/src/config/
├── supabase.ts         # ✅ Ready to extract
├── queryClient.ts      # ✅ Ready to extract
└── index.ts
```

**Acceptance Criteria:**
- Database connection works
- Environment variables properly loaded
- Query client configured

### 1.3 Simplify Query Key Factory (Day 9)

#### Task 1.3.1: Create Customer-Only Query Keys
```typescript
packages/shared-core/src/utils/
├── customerQueryKeys.ts  # Extract: cartKeys, orderKeys, productKeys, authKeys
├── broadcastFactory.ts   # Simplified version without crypto
└── index.ts
```

**Acceptance Criteria:**
- Query invalidation works for customer features
- No business module dependencies
- Cache performance maintained

### 1.4 Handle Kiosk System Blocker (Days 10-11)

#### Task 1.4.1: Create Customer-Only Kiosk Stub
```typescript
packages/shared-core/src/kiosk/
├── KioskStub.tsx        # Returns empty component for customer app
├── useKioskStub.ts      # Returns disabled kiosk state
└── index.ts
```

**Implementation:**
```typescript
// KioskStub.tsx
export const KioskStaffAuth = () => null;

// useKioskStub.ts
export const useKioskContext = () => ({
  isKioskMode: false,
  sessionId: null,
  staffId: null,
  staffName: null,
  startAuthentication: () => {},
  endSession: () => Promise.resolve(false),
  // ... other stub methods
});
```

**Acceptance Criteria:**
- ShopScreen works without kiosk features
- No errors from missing kiosk context
- Customer experience unaffected

### 1.5 Setup Testing Infrastructure (Days 12-14)

#### Task 1.5.1: Shared Core Tests
```bash
packages/shared-core/
├── __tests__/
│   ├── auth.test.ts
│   ├── cart.test.ts
│   ├── products.test.ts
│   └── orders.test.ts
└── jest.config.js
```

**Acceptance Criteria:**
- All extracted modules have test coverage
- Tests pass in isolation
- No business dependencies in tests

## Phase 2: Customer App Creation (Weeks 3-4)

### 2.1 Initialize Customer Mobile App (Day 15)

#### Task 2.1.1: Create Expo App
```bash
cd packages/customer-mobile
npx create-expo-app --template typescript
npm install @tanstack/react-query @supabase/supabase-js
npm install ../shared-core
```

**Acceptance Criteria:**
- Expo app initializes successfully
- Shared core package imports work
- TypeScript configuration correct

### 2.2 Setup Customer Navigation (Day 16)

#### Task 2.2.1: Simple Tab Navigation
```typescript
packages/customer-mobile/src/navigation/
├── CustomerTabNavigator.tsx  # Only: Shop, Cart, Orders, Profile
├── CustomerStackNavigator.tsx # Only: Product Detail, Checkout
└── index.ts
```

**Implementation:**
```typescript
// CustomerTabNavigator.tsx
const Tab = createBottomTabNavigator();

export const CustomerTabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="Shop" component={ShopScreen} />
    <Tab.Screen name="Cart" component={CartScreen} />
    <Tab.Screen name="Orders" component={MyOrdersScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);
```

**Acceptance Criteria:**
- Navigation works between customer screens
- No admin/business tabs visible
- Tab icons and labels correct

### 2.3 Extract Customer Screens (Days 17-18)

#### Task 2.3.1: Copy and Clean Customer Screens
```typescript
packages/customer-mobile/src/screens/
├── ShopScreen.tsx        # Remove kiosk code, use stub
├── CartScreen.tsx        # ✅ Already clean
├── CheckoutScreen.tsx    # ✅ Already clean
├── OrderConfirmationScreen.tsx # ✅ Already clean
├── MyOrdersScreen.tsx    # ✅ Already clean
├── ProfileScreen.tsx     # Remove admin sections
├── LoginScreen.tsx       # ✅ Already clean
├── RegisterScreen.tsx    # ✅ Already clean
└── ProductDetailScreen.tsx # ✅ Already clean
```

**ShopScreen.tsx Changes:**
```typescript
// Before
import { useKioskContext } from '../contexts';
const { startAuthentication, endSession, isKioskMode, sessionId, staffName } = useKioskContext();

// After
import { useKioskContext } from '@shared-core/kiosk';
const { isKioskMode } = useKioskContext(); // Always false in customer app
```

**ProfileScreen.tsx Changes:**
```typescript
// Remove admin sections
{hasStaffAccess && (
  <AdminSection />  // Remove this entire block
)}
```

**Acceptance Criteria:**
- All customer screens work independently
- No business/admin features visible
- Kiosk integration removed/stubbed

### 2.4 Extract Customer Components (Day 19)

#### Task 2.4.1: Copy Customer-Specific Components
```typescript
packages/customer-mobile/src/components/
├── ProductCard.tsx       # ✅ Customer-focused
├── Card.tsx             # ✅ Generic UI
├── Button.tsx           # ✅ Generic UI
├── Screen.tsx           # ✅ Generic UI
├── Text.tsx             # ✅ Generic UI
└── Loading.tsx          # ✅ Generic UI
```

**Acceptance Criteria:**
- UI components work in customer app
- No business-specific styling
- Consistent design system

### 2.5 Customer App Configuration (Days 20-21)

#### Task 2.5.1: Customer-Specific Config
```typescript
packages/customer-mobile/src/config/
├── customerSupabase.ts   # Customer-only database role
├── customerQueryClient.ts # Customer-only cache settings
└── index.ts
```

#### Task 2.5.2: Customer Environment Setup
```env
# packages/customer-mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ... # Customer role key (restricted permissions)
EXPO_PUBLIC_APP_VARIANT=customer
EXPO_PUBLIC_APP_VERSION=1.0.0
```

**Acceptance Criteria:**
- Customer app connects to database
- Restricted permissions work correctly
- Environment variables loaded properly

### 2.6 Customer App Testing (Days 22-28)

#### Task 2.6.1: End-to-End Customer Flow Testing
```typescript
packages/customer-mobile/__tests__/
├── customer-flow.test.ts
├── auth-flow.test.ts
├── cart-flow.test.ts
└── order-flow.test.ts
```

**Test Scenarios:**
1. User registration → browse products → add to cart → checkout → order confirmation
2. User login → view order history → reorder items
3. Product search → category filtering → product details
4. Cart updates → stock validation → checkout flow

**Acceptance Criteria:**
- All customer flows work end-to-end
- No errors from missing business modules
- Performance meets targets (< 3s startup)

## Phase 3: Business App Consolidation (Weeks 5-6)

### 3.1 Reorganize Business Features (Days 29-32)

#### Task 3.1.1: Group Business Modules
```typescript
packages/business-web/src/modules/
├── inventory/           # All inventory screens, hooks, services
│   ├── screens/
│   ├── hooks/
│   ├── services/
│   └── components/
├── marketing/           # All marketing screens, hooks, services
│   ├── screens/
│   ├── hooks/
│   ├── services/
│   └── components/
├── executive/           # All executive screens, hooks, services
│   ├── screens/
│   ├── hooks/
│   ├── services/
│   └── components/
├── admin/              # User management, settings
│   ├── screens/
│   ├── hooks/
│   ├── services/
│   └── components/
└── shared/             # Business-specific shared code
    ├── components/
    ├── hooks/
    └── utils/
```

**Acceptance Criteria:**
- Business modules cleanly separated
- Module boundaries clearly defined
- No circular dependencies

### 3.2 Keep Advanced Features (Days 33-35)

#### Task 3.2.1: Maintain Complex Systems
```typescript
packages/business-web/src/core/
├── roleManagement/      # Full UnifiedRoleService
├── realtimeCoordination/ # Full RealtimeCoordinator
├── validationMonitor/   # Full ValidationMonitor
├── kioskSystem/        # Full KioskContext
└── broadcastSecurity/  # Full cryptographic broadcasts
```

**Acceptance Criteria:**
- All advanced features preserved
- Complex role management works
- Real-time coordination functional
- Kiosk system fully operational

### 3.3 Business App Testing (Days 36-42)

#### Task 3.3.1: Business Feature Testing
```typescript
packages/business-web/__tests__/
├── inventory-management.test.ts
├── marketing-campaigns.test.ts
├── executive-analytics.test.ts
├── role-management.test.ts
└── cross-module-integration.test.ts
```

**Acceptance Criteria:**
- All business features work correctly
- Cross-module integration preserved
- Role-based access control functional
- Real-time updates working

## Phase 4: Optimization & Deployment (Weeks 7-8)

### 4.1 Security Hardening (Days 43-46)

#### Task 4.1.1: Database Security Model
```sql
-- Customer app role (restricted)
CREATE ROLE customer_mobile_role;
GRANT SELECT ON products, categories TO customer_mobile_role;
GRANT INSERT, SELECT ON orders, order_items, cart_items TO customer_mobile_role;
GRANT SELECT, UPDATE ON users TO customer_mobile_role;

-- Row Level Security for customer app
CREATE POLICY "Users can only access own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own orders" ON orders
  FOR ALL USING (auth.uid() = user_id);

-- Business app role (full access)
CREATE ROLE business_web_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO business_web_role;
```

#### Task 4.1.2: API Security
- Customer app API keys with restricted permissions
- Business app API keys with full permissions
- Environment-specific configurations

**Acceptance Criteria:**
- Customer app cannot access business data
- Business app retains full access
- Row-level security working correctly

### 4.2 Bundle Optimization (Days 47-49)

#### Task 4.2.1: Customer App Optimization
```javascript
// metro.config.js - Customer app
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  // Remove business modules entirely from customer bundle
  '@/modules/business': path.resolve(__dirname, 'src/stubs/empty.ts'),
  '@/services/inventory': path.resolve(__dirname, 'src/stubs/empty.ts'),
  '@/services/marketing': path.resolve(__dirname, 'src/stubs/empty.ts'),
  '@/services/executive': path.resolve(__dirname, 'src/stubs/empty.ts'),
};

module.exports = config;
```

#### Task 4.2.2: Bundle Analysis
```bash
# Analyze bundle sizes
npx expo export --dump-assetmap
npx bundle-analyzer build/static/js/*.js

# Performance testing
npm run test:performance
```

**Acceptance Criteria:**
- Customer app bundle < 30MB
- No business code in customer bundle
- Startup time < 3 seconds
- Memory usage optimized

### 4.3 App Store Preparation (Days 50-52)

#### Task 4.3.1: Customer App Metadata
```json
{
  "expo": {
    "name": "MyFarmstand - Fresh Local Produce",
    "slug": "myfarmstand-customer",
    "description": "Order fresh, local produce for pickup or delivery from your favorite local farm stand",
    "privacy": "unlisted",
    "platforms": ["ios", "android"],
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.myfarmstand.customer",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.myfarmstand.customer",
      "versionCode": 1
    }
  }
}
```

#### Task 4.3.2: App Store Assets
- App icons (all required sizes)
- Screenshots for App Store listing
- App Store description and keywords
- Privacy policy and terms of service

**Acceptance Criteria:**
- All required App Store assets created
- App metadata complete and accurate
- Privacy policy addresses customer data only

### 4.4 Deployment Setup (Days 53-56)

#### Task 4.4.1: CI/CD Pipelines
```yaml
# .github/workflows/customer-app.yml
name: Customer App Deploy
on:
  push:
    paths: ['packages/customer-mobile/**']
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:customer

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx eas build --platform all --non-interactive

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npx eas submit --platform all --latest

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/production'
    steps:
      - run: npx eas submit --platform all --latest --auto-submit
```

#### Task 4.4.2: Environment Management
- Development environment setup
- Staging environment for testing
- Production environment for App Store

**Acceptance Criteria:**
- Automated builds working
- Deployment pipeline functional
- Environment separation working

## Final Deliverables

### Week 8 Final Tasks

#### Task 4.5.1: Documentation
- [ ] User guides for both apps
- [ ] Developer documentation
- [ ] Deployment runbooks
- [ ] Migration completion report

#### Task 4.5.2: Handover
- [ ] Training sessions for team
- [ ] Code review and approval
- [ ] Production deployment
- [ ] App Store submission

## Success Validation

### Customer App Metrics
- [ ] Bundle size < 30MB
- [ ] Startup time < 3 seconds
- [ ] Zero business code in bundle
- [ ] App Store approval within 1 week

### Business App Metrics
- [ ] No functionality lost
- [ ] Performance maintained
- [ ] All integrations working
- [ ] User roles functional

### Overall Success
- [ ] Independent deployment cycles working
- [ ] Security isolation verified
- [ ] Team productivity maintained
- [ ] Customer experience improved