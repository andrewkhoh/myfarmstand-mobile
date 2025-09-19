# Customer App Technical Architecture

## Overview

This document defines the technical architecture for the extracted customer mobile application, including infrastructure decisions, module organization, and integration patterns.

## Current State Analysis

### Codebase Complexity Assessment

The existing codebase shows sophisticated enterprise-level patterns:

#### ✅ **Strengths Identified**
- **Clean Service Layer**: Core hooks (`useCart`, `useProducts`, `useAuth`) are customer-ready
- **Proper Abstraction**: Database access through well-defined service interfaces
- **Type Safety**: Comprehensive TypeScript usage throughout
- **Query Management**: Sophisticated React Query implementation with cache invalidation

#### ⚠️ **Integration Points to Address**
- **Kiosk System**: Customer screens use `KioskContext` for staff assistance mode
- **Validation Monitor**: 154 files depend on centralized error monitoring
- **Real-time Coordination**: Cross-workflow updates require careful handling
- **Query Key Factory**: Complex caching with cross-module dependencies

## Target Architecture

### Monorepo Structure

```
myfarmstand-monorepo/
├── packages/
│   ├── shared-core/                 # 🔄 Shared infrastructure
│   │   ├── auth/                    # Authentication & basic user management
│   │   ├── products/                # Product catalog & search
│   │   ├── cart/                    # Shopping cart management
│   │   ├── orders/                  # Order creation & tracking
│   │   ├── config/                  # Database & environment config
│   │   ├── utils/                   # Shared utilities & helpers
│   │   └── types/                   # Shared TypeScript definitions
│   │
│   ├── customer-mobile/             # 📱 Customer React Native app
│   │   ├── src/
│   │   │   ├── screens/             # Customer-only screens
│   │   │   ├── navigation/          # Simplified customer navigation
│   │   │   ├── components/          # Customer-specific UI components
│   │   │   ├── config/              # Customer app configuration
│   │   │   └── utils/               # Customer app utilities
│   │   ├── assets/                  # App icons, images, splash screens
│   │   ├── app.config.js            # Expo configuration
│   │   └── package.json             # Customer app dependencies
│   │
│   └── business-web/                # 🌐 Business management web app
│       ├── src/
│       │   ├── modules/
│       │   │   ├── inventory/       # Inventory management
│       │   │   ├── marketing/       # Marketing campaigns & content
│       │   │   ├── executive/       # Analytics & reporting
│       │   │   └── admin/           # User & system administration
│       │   ├── core/
│       │   │   ├── roleManagement/  # Advanced role & permission system
│       │   │   ├── realtimeCoordination/ # Cross-module real-time updates
│       │   │   ├── validationMonitor/    # Error tracking & monitoring
│       │   │   └── kioskSystem/     # In-store staff assistance system
│       │   └── shared/              # Business-specific shared code
│       └── package.json             # Business app dependencies
│
└── docs/                           # 📚 Documentation
    ├── migration-strategy.md
    ├── implementation-plan.md
    ├── technical-architecture.md
    └── database-security.md
```

## Shared Core Package Architecture

### Module Organization

#### Authentication Module
```typescript
packages/shared-core/src/auth/
├── hooks/
│   ├── useAuth.ts              # User authentication state
│   ├── useCurrentUser.ts       # Current user data & profile
│   └── index.ts
├── services/
│   ├── authService.ts          # Supabase auth integration
│   └── index.ts
├── types/
│   ├── auth.types.ts           # Auth-related TypeScript types
│   └── index.ts
└── index.ts                    # Public API exports
```

**Key Features:**
- User registration & login
- Session management
- Profile updates
- Password reset
- **Excluded**: Advanced role management (business app only)

#### Products Module
```typescript
packages/shared-core/src/products/
├── hooks/
│   ├── useProducts.ts          # Product catalog queries
│   ├── useCategories.ts        # Category management
│   ├── useProductSearch.ts     # Search functionality
│   └── index.ts
├── services/
│   ├── productService.ts       # Product data API
│   └── index.ts
├── types/
│   ├── product.types.ts        # Product & category types
│   └── index.ts
└── index.ts
```

**Key Features:**
- Product catalog browsing
- Category filtering
- Product search
- Product details & images
- **Excluded**: Inventory management, product creation/editing

#### Cart Module
```typescript
packages/shared-core/src/cart/
├── hooks/
│   ├── useCart.ts              # Cart state management
│   └── index.ts
├── services/
│   ├── cartService.ts          # Cart persistence & sync
│   └── index.ts
├── types/
│   ├── cart.types.ts           # Cart & cart item types
│   └── index.ts
└── index.ts
```

**Key Features:**
- Add/remove items from cart
- Quantity updates
- Stock validation
- Cart persistence
- Real-time cart sync

#### Orders Module
```typescript
packages/shared-core/src/orders/
├── hooks/
│   ├── useOrders.ts            # Customer order history
│   ├── useCheckout.ts          # Checkout process
│   └── index.ts
├── services/
│   ├── orderService.ts         # Order creation & retrieval
│   ├── checkoutService.ts      # Payment & order processing
│   └── index.ts
├── types/
│   ├── order.types.ts          # Order & order item types
│   └── index.ts
└── index.ts
```

**Key Features:**
- Order creation & submission
- Order history for customers
- Order status tracking
- Payment processing
- **Excluded**: Order management, fulfillment, admin operations

### Configuration Module
```typescript
packages/shared-core/src/config/
├── supabase.ts                 # Database client configuration
├── queryClient.ts              # React Query configuration
├── constants.ts                # Shared constants
└── index.ts
```

### Utilities Module
```typescript
packages/shared-core/src/utils/
├── queryKeys/
│   ├── customerQueryKeys.ts    # Query keys for customer features
│   ├── cacheHelpers.ts         # Cache invalidation utilities
│   └── index.ts
├── validation/
│   ├── customerValidation.ts   # Customer-specific validation
│   ├── schemas.ts              # Zod validation schemas
│   └── index.ts
├── formatting/
│   ├── currency.ts             # Price formatting
│   ├── dates.ts                # Date formatting
│   └── index.ts
└── index.ts
```

## Customer Mobile App Architecture

### Screen Organization
```typescript
packages/customer-mobile/src/screens/
├── auth/
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   └── index.ts
├── shop/
│   ├── ShopScreen.tsx
│   ├── ProductDetailScreen.tsx
│   ├── CategoryScreen.tsx
│   └── index.ts
├── cart/
│   ├── CartScreen.tsx
│   ├── CheckoutScreen.tsx
│   └── index.ts
├── orders/
│   ├── MyOrdersScreen.tsx
│   ├── OrderDetailScreen.tsx
│   ├── OrderConfirmationScreen.tsx
│   └── index.ts
├── profile/
│   ├── ProfileScreen.tsx
│   ├── EditProfileScreen.tsx
│   └── index.ts
└── index.ts
```

### Navigation Architecture
```typescript
packages/customer-mobile/src/navigation/
├── CustomerAppNavigator.tsx    # Root navigator
├── CustomerTabNavigator.tsx    # Bottom tab navigation
├── AuthStackNavigator.tsx      # Auth flow navigation
├── ShopStackNavigator.tsx      # Shopping flow navigation
├── types.ts                    # Navigation type definitions
└── index.ts
```

**Navigation Structure:**
```
CustomerAppNavigator
├── AuthStack (when not authenticated)
│   ├── Login
│   └── Register
└── MainTabs (when authenticated)
    ├── Shop
    │   ├── ShopScreen
    │   ├── ProductDetail
    │   └── Category
    ├── Cart
    │   ├── CartScreen
    │   └── Checkout
    ├── Orders
    │   ├── MyOrders
    │   ├── OrderDetail
    │   └── OrderConfirmation
    └── Profile
        ├── ProfileScreen
        └── EditProfile
```

### Component Architecture
```typescript
packages/customer-mobile/src/components/
├── ui/                         # Basic UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Text.tsx
│   ├── Input.tsx
│   └── Loading.tsx
├── product/                    # Product-specific components
│   ├── ProductCard.tsx
│   ├── ProductList.tsx
│   ├── CategoryFilter.tsx
│   └── ProductSearch.tsx
├── cart/                       # Cart-specific components
│   ├── CartItem.tsx
│   ├── CartSummary.tsx
│   └── CheckoutForm.tsx
├── order/                      # Order-specific components
│   ├── OrderCard.tsx
│   ├── OrderStatus.tsx
│   └── OrderTimeline.tsx
└── index.ts
```

## Data Flow Architecture

### State Management Pattern

```typescript
// Customer app uses simplified state management
const CustomerApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>
          <CustomerAppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
};
```

### Query Management

#### Simplified Query Keys
```typescript
// Customer-only query keys (simplified from business version)
export const customerQueryKeys = {
  // Authentication
  auth: {
    currentUser: ['auth', 'current-user'] as const,
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    list: (filters?: ProductFilters) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    search: (query: string) => ['products', 'search', query] as const,
  },

  // Cart
  cart: {
    current: (userId: string) => ['cart', userId] as const,
  },

  // Orders
  orders: {
    list: (userId: string) => ['orders', 'list', userId] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  },
};
```

#### Cache Invalidation Strategy
```typescript
// Simplified invalidation (no cross-module complexity)
const invalidateCustomerData = async (userId: string) => {
  await queryClient.invalidateQueries({
    queryKey: customerQueryKeys.cart.current(userId)
  });
  await queryClient.invalidateQueries({
    queryKey: customerQueryKeys.orders.list(userId)
  });
};
```

## Security Architecture

### Database Access Control

#### Customer App Database Role
```sql
-- Restricted role for customer mobile app
CREATE ROLE customer_mobile_role;

-- Read access to public data
GRANT SELECT ON products, categories TO customer_mobile_role;

-- Limited write access to user-specific data
GRANT INSERT, SELECT ON orders, order_items TO customer_mobile_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON cart_items TO customer_mobile_role;

-- User profile access (own data only)
GRANT SELECT, UPDATE ON users TO customer_mobile_role;
```

#### Row Level Security (RLS)
```sql
-- Users can only access their own data
CREATE POLICY "customer_own_data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "customer_own_cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "customer_own_orders" ON orders
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "customer_own_order_items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
```

### API Security

#### Environment Configuration
```typescript
// Customer app environment (restricted)
export const customerConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_CUSTOMER_KEY!, // Restricted key
  apiUrl: process.env.EXPO_PUBLIC_API_URL!,
  appVariant: 'customer' as const,
};

// Supabase client with restricted permissions
export const customerSupabase = createClient(
  customerConfig.supabaseUrl,
  customerConfig.supabaseKey,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
  }
);
```

## Performance Architecture

### Bundle Optimization

#### Metro Configuration
```javascript
// Customer app metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Remove business modules from customer bundle
config.resolver.alias = {
  '@business/inventory': path.resolve(__dirname, 'src/stubs/empty.ts'),
  '@business/marketing': path.resolve(__dirname, 'src/stubs/empty.ts'),
  '@business/executive': path.resolve(__dirname, 'src/stubs/empty.ts'),
  '@business/admin': path.resolve(__dirname, 'src/stubs/empty.ts'),
};

// Enable tree shaking for smaller bundles
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: {
    keep_fnames: false,
  },
};

module.exports = config;
```

#### Code Splitting Strategy
```typescript
// Lazy loading for non-critical screens
const ProfileScreen = lazy(() => import('./screens/profile/ProfileScreen'));
const OrderHistoryScreen = lazy(() => import('./screens/orders/OrderHistoryScreen'));

// Critical path screens loaded immediately
import ShopScreen from './screens/shop/ShopScreen';
import CartScreen from './screens/cart/CartScreen';
```

### Caching Strategy

#### React Query Configuration
```typescript
// Customer app query client (optimized for mobile)
export const customerQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      cacheTime: 10 * 60 * 1000,    // 10 minutes
      retry: 2,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
```

## Integration Patterns

### Kiosk System Integration

#### Customer App Stub Implementation
```typescript
// packages/customer-mobile/src/kiosk/KioskStub.ts
export const useKioskContext = () => ({
  isKioskMode: false,
  sessionId: null,
  staffId: null,
  staffName: null,
  isLoading: false,
  error: null,

  // Stub methods (no-op for customer app)
  startAuthentication: () => {},
  hideAuthentication: () => {},
  authenticateStaff: async () => false,
  endSession: async () => false,
  getSessionInfo: () => ({
    isActive: false,
    sessionId: null,
    staffName: null,
    totalSales: 0,
    transactionCount: 0,
  }),
});

export const KioskStaffAuth = () => null;
```

### Real-time Updates

#### Simplified Real-time for Customer App
```typescript
// Customer app real-time (simplified)
export const useCustomerRealtime = () => {
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe only to customer-relevant updates
    const subscription = customerSupabase
      .channel(`customer:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cart_items',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Invalidate cart queries
        queryClient.invalidateQueries({
          queryKey: customerQueryKeys.cart.current(user.id)
        });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Invalidate order queries
        queryClient.invalidateQueries({
          queryKey: customerQueryKeys.orders.list(user.id)
        });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);
};
```

## Monitoring & Analytics

### Error Tracking

#### Customer App Error Monitoring
```typescript
// Simplified error monitoring for customer app
interface CustomerError {
  code: string;
  message: string;
  userMessage: string;
  context: 'auth' | 'cart' | 'orders' | 'products';
  userId?: string;
}

export const customerErrorTracker = {
  logError: (error: CustomerError) => {
    // Log to customer-specific error tracking
    console.error('[Customer App Error]', error);

    // Send to analytics service (customer events only)
    if (process.env.EXPO_PUBLIC_ANALYTICS_KEY) {
      // Analytics implementation
    }
  },

  logEvent: (event: string, properties?: Record<string, any>) => {
    // Customer app analytics events
    console.log('[Customer App Event]', event, properties);
  }
};
```

### Performance Monitoring

#### Customer App Performance Metrics
```typescript
// Performance monitoring for customer app
export const customerPerformanceMonitor = {
  trackScreenLoad: (screenName: string, loadTime: number) => {
    console.log(`[Performance] ${screenName} loaded in ${loadTime}ms`);
  },

  trackAPICall: (endpoint: string, duration: number, success: boolean) => {
    console.log(`[API] ${endpoint} - ${duration}ms - ${success ? 'success' : 'error'}`);
  },

  trackBundleSize: (bundleSize: number) => {
    console.log(`[Bundle] Customer app bundle size: ${bundleSize}MB`);
  }
};
```

## Deployment Architecture

### Build Configuration

#### Customer App Build Settings
```json
{
  "expo": {
    "name": "MyFarmstand - Fresh Local Produce",
    "slug": "myfarmstand-customer",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "bundleIdentifier": "com.myfarmstand.customer",
      "buildNumber": "1",
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.myfarmstand.customer",
      "versionCode": 1
    },
    "extra": {
      "eas": {
        "projectId": "customer-app-project-id"
      }
    }
  }
}
```

#### EAS Build Configuration
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDEFGHIJ"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

This technical architecture ensures a clean separation between customer and business functionality while maintaining the sophisticated features that make the platform valuable. The customer app will be lean, secure, and optimized for App Store deployment, while the business app retains all advanced capabilities.