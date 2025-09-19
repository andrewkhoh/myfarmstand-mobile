# Customer App Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the customer mobile app extraction process, ensuring quality, security, and functionality throughout the migration.

## Testing Objectives

### Primary Goals
1. **Functional Integrity**: All customer features work correctly in isolated app
2. **Security Validation**: No business data accessible from customer app
3. **Performance Verification**: App meets or exceeds performance targets
4. **Integration Testing**: Shared services work correctly across apps
5. **Regression Prevention**: No existing functionality is broken

### Success Criteria
- 100% pass rate on critical customer flows
- Zero business data exposure in customer app
- Bundle size < 30MB (target: 25MB)
- App startup time < 3 seconds (target: 2 seconds)
- 95%+ test coverage on customer-specific code

## Testing Phases

### Phase 1: Pre-Migration Testing (Current State)

#### 1.1 Baseline Functional Testing
Establish baseline performance and functionality of current customer features.

**Test Categories:**
```typescript
// Customer flow tests
describe('Customer Baseline Tests', () => {
  test('User can register and login', async () => {
    // Test current auth flow
  });

  test('User can browse products and categories', async () => {
    // Test current product browsing
  });

  test('User can add items to cart and checkout', async () => {
    // Test current cart and checkout flow
  });

  test('User can view order history', async () => {
    // Test current order tracking
  });
});
```

**Performance Baseline:**
```bash
# Current app metrics
npm run test:performance:baseline
# Expected output:
# Bundle size: ~50MB
# Startup time: ~4-5 seconds
# Memory usage: ~120MB
```

#### 1.2 Security Baseline Testing
Document current security posture and potential exposure.

**Security Tests:**
```typescript
describe('Security Baseline', () => {
  test('Customer user cannot access admin screens', async () => {
    // Verify current role-based access
  });

  test('Customer API calls are properly scoped', async () => {
    // Test current API access patterns
  });

  test('Business data is not exposed to customer context', async () => {
    // Verify current data isolation
  });
});
```

### Phase 2: Shared Core Testing (Foundation)

#### 2.1 Shared Core Module Testing
Test extracted shared modules in isolation.

**Authentication Module Tests:**
```typescript
// packages/shared-core/__tests__/auth.test.ts
describe('Auth Module', () => {
  describe('useAuth hook', () => {
    test('handles user registration flow', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
      });

      expect(result.current.user).toBeDefined();
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('handles login flow', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      expect(result.current.user).toBeDefined();
    });

    test('handles logout flow', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('authService', () => {
    test('makes correct API calls', async () => {
      const mockSupabase = createMockSupabaseClient();
      const service = new AuthService(mockSupabase);

      await service.login('test@example.com', 'password123');

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

**Products Module Tests:**
```typescript
// packages/shared-core/__tests__/products.test.ts
describe('Products Module', () => {
  describe('useProducts hook', () => {
    test('fetches product list correctly', async () => {
      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data.length).toBeGreaterThan(0);
    });

    test('handles product search', async () => {
      const { result } = renderHook(() => useProductSearch());

      await act(async () => {
        result.current.search('tomato');
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.data.every(p =>
          p.name.toLowerCase().includes('tomato')
        )).toBe(true);
      });
    });
  });

  describe('productService', () => {
    test('fetches products from correct endpoint', async () => {
      const mockSupabase = createMockSupabaseClient();
      const service = new ProductService(mockSupabase);

      await service.getProducts();

      expect(mockSupabase.from).toHaveBeenCalledWith('products');
    });

    test('handles product filtering by category', async () => {
      const mockSupabase = createMockSupabaseClient();
      const service = new ProductService(mockSupabase);

      await service.getProductsByCategory('vegetables');

      expect(mockSupabase.from('products').select().eq).toHaveBeenCalledWith(
        'category_id', 'vegetables'
      );
    });
  });
});
```

**Cart Module Tests:**
```typescript
// packages/shared-core/__tests__/cart.test.ts
describe('Cart Module', () => {
  describe('useCart hook', () => {
    test('adds items to cart correctly', async () => {
      const { result } = renderHook(() => useCart());
      const mockProduct = createMockProduct();

      await act(async () => {
        await result.current.addItem({
          product: mockProduct,
          quantity: 2
        });
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
      expect(result.current.total).toBe(mockProduct.price * 2);
    });

    test('updates item quantities', async () => {
      const { result } = renderHook(() => useCart());
      const mockProduct = createMockProduct();

      // Add item first
      await act(async () => {
        await result.current.addItem({
          product: mockProduct,
          quantity: 1
        });
      });

      // Update quantity
      await act(async () => {
        await result.current.updateQuantity({
          productId: mockProduct.id,
          quantity: 3
        });
      });

      expect(result.current.items[0].quantity).toBe(3);
    });

    test('removes items from cart', async () => {
      const { result } = renderHook(() => useCart());
      const mockProduct = createMockProduct();

      // Add item first
      await act(async () => {
        await result.current.addItem({
          product: mockProduct,
          quantity: 1
        });
      });

      // Remove item
      await act(async () => {
        await result.current.removeItem(mockProduct.id);
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('cartService', () => {
    test('validates stock before adding items', async () => {
      const mockSupabase = createMockSupabaseClient();
      const service = new CartService(mockSupabase);
      const mockProduct = createMockProduct({ stock_quantity: 1 });

      // Should succeed
      await expect(service.addItem('user1', {
        product: mockProduct,
        quantity: 1
      })).resolves.toBeDefined();

      // Should fail - not enough stock
      await expect(service.addItem('user1', {
        product: mockProduct,
        quantity: 2
      })).rejects.toThrow('Insufficient stock');
    });
  });
});
```

**Orders Module Tests:**
```typescript
// packages/shared-core/__tests__/orders.test.ts
describe('Orders Module', () => {
  describe('useOrders hook', () => {
    test('fetches user order history', async () => {
      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.data)).toBe(true);
    });
  });

  describe('useCheckout hook', () => {
    test('creates order successfully', async () => {
      const { result } = renderHook(() => useCheckout());
      const mockOrderData = createMockOrderData();

      await act(async () => {
        await result.current.submitOrder(mockOrderData);
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.order).toBeDefined();
    });

    test('handles payment processing', async () => {
      const { result } = renderHook(() => useCheckout());
      const mockPaymentData = createMockPaymentData();

      await act(async () => {
        await result.current.processPayment(mockPaymentData);
      });

      expect(result.current.paymentStatus).toBe('succeeded');
    });
  });
});
```

#### 2.2 Integration Testing for Shared Core
Test interactions between shared modules.

**Cross-Module Integration Tests:**
```typescript
// packages/shared-core/__tests__/integration.test.ts
describe('Shared Core Integration', () => {
  test('complete customer flow: register → browse → cart → checkout', async () => {
    const { result: authResult } = renderHook(() => useAuth());
    const { result: cartResult } = renderHook(() => useCart());
    const { result: checkoutResult } = renderHook(() => useCheckout());

    // 1. Register user
    await act(async () => {
      await authResult.current.register({
        email: 'integration@test.com',
        password: 'password123',
        name: 'Integration Test User'
      });
    });

    expect(authResult.current.isAuthenticated).toBe(true);

    // 2. Add items to cart
    const mockProduct = createMockProduct();
    await act(async () => {
      await cartResult.current.addItem({
        product: mockProduct,
        quantity: 1
      });
    });

    expect(cartResult.current.items).toHaveLength(1);

    // 3. Checkout
    await act(async () => {
      await checkoutResult.current.submitOrder({
        customerInfo: {
          name: 'Integration Test User',
          email: 'integration@test.com',
          phone: '555-0123'
        },
        items: cartResult.current.items,
        fulfillmentType: 'pickup',
        paymentMethod: 'online'
      });
    });

    expect(checkoutResult.current.isSuccess).toBe(true);
    expect(cartResult.current.items).toHaveLength(0); // Cart should be cleared
  });

  test('query key invalidation works across modules', async () => {
    const queryClient = new QueryClient();
    const { result: cartResult } = renderHook(() => useCart());

    // Add item to cart
    await act(async () => {
      await cartResult.current.addItem({
        product: createMockProduct(),
        quantity: 1
      });
    });

    // Verify cart queries are updated
    const cartData = queryClient.getQueryData(
      customerQueryKeys.cart.current('test-user')
    );
    expect(cartData).toBeDefined();
  });
});
```

### Phase 3: Customer App Testing (Isolated)

#### 3.1 Customer App Functional Testing
Test customer app functionality in isolation.

**Screen Navigation Tests:**
```typescript
// packages/customer-mobile/__tests__/navigation.test.tsx
describe('Customer App Navigation', () => {
  test('navigates between main tabs', async () => {
    const { getByText } = render(
      <TestWrapper>
        <CustomerAppNavigator />
      </TestWrapper>
    );

    // Test tab navigation
    fireEvent.press(getByText('Shop'));
    await waitFor(() => {
      expect(getByText('Farm Stand')).toBeTruthy();
    });

    fireEvent.press(getByText('Cart'));
    await waitFor(() => {
      expect(getByText('Your Cart')).toBeTruthy();
    });

    fireEvent.press(getByText('Orders'));
    await waitFor(() => {
      expect(getByText('My Orders')).toBeTruthy();
    });

    fireEvent.press(getByText('Profile'));
    await waitFor(() => {
      expect(getByText('Profile')).toBeTruthy();
    });
  });

  test('handles deep linking correctly', async () => {
    const { getByText } = render(
      <TestWrapper initialRoute="ProductDetail" initialParams={{ productId: 'prod1' }}>
        <CustomerAppNavigator />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Product Details')).toBeTruthy();
    });
  });

  test('auth flow navigation works', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper initialRoute="Login">
        <CustomerAppNavigator />
      </TestWrapper>
    );

    // Should show login screen for unauthenticated user
    expect(getByText('Sign In')).toBeTruthy();

    // Login and verify navigation to main app
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Farm Stand')).toBeTruthy(); // Should navigate to shop
    });
  });
});
```

**Component Integration Tests:**
```typescript
// packages/customer-mobile/__tests__/components.test.tsx
describe('Customer App Components', () => {
  test('ProductCard displays product information correctly', () => {
    const mockProduct = createMockProduct();
    const { getByText } = render(
      <ProductCard
        product={mockProduct}
        onPress={jest.fn()}
        onAddToCart={jest.fn()}
      />
    );

    expect(getByText(mockProduct.name)).toBeTruthy();
    expect(getByText(`$${mockProduct.price.toFixed(2)}`)).toBeTruthy();
  });

  test('CartItem handles quantity updates', async () => {
    const mockItem = createMockCartItem();
    const onUpdateQuantity = jest.fn();

    const { getByTestId } = render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('increment-button'));

    await waitFor(() => {
      expect(onUpdateQuantity).toHaveBeenCalledWith(
        mockItem.product.id,
        mockItem.quantity + 1
      );
    });
  });

  test('CheckoutForm validates required fields', async () => {
    const { getByText, getByTestId } = render(
      <CheckoutForm onSubmit={jest.fn()} />
    );

    // Try to submit without filling required fields
    fireEvent.press(getByText('Place Order'));

    await waitFor(() => {
      expect(getByText('Name is required')).toBeTruthy();
      expect(getByText('Email is required')).toBeTruthy();
      expect(getByText('Phone is required')).toBeTruthy();
    });
  });
});
```

#### 3.2 Customer App Security Testing
Verify customer app cannot access business functionality.

**Security Isolation Tests:**
```typescript
// packages/customer-mobile/__tests__/security.test.ts
describe('Customer App Security', () => {
  test('cannot import business modules', () => {
    expect(() => {
      require('@business/inventory');
    }).toThrow();

    expect(() => {
      require('@business/marketing');
    }).toThrow();

    expect(() => {
      require('@business/executive');
    }).toThrow();
  });

  test('kiosk context returns disabled state', () => {
    const { result } = renderHook(() => useKioskContext());

    expect(result.current.isKioskMode).toBe(false);
    expect(result.current.sessionId).toBeNull();
    expect(result.current.staffId).toBeNull();
  });

  test('API calls use customer-restricted keys', async () => {
    const apiSpy = jest.spyOn(customerSupabase, 'from');

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(apiSpy).toHaveBeenCalledWith('products');

    // Verify using customer API client, not business client
    expect(customerSupabase.supabaseKey).toContain('customer');
  });

  test('user cannot access business data', async () => {
    // Try to query business tables (should fail)
    await expect(
      customerSupabase.from('inventory_items').select()
    ).rejects.toThrow();

    await expect(
      customerSupabase.from('marketing_campaigns').select()
    ).rejects.toThrow();

    await expect(
      customerSupabase.from('user_roles').select()
    ).rejects.toThrow();
  });

  test('user can only access own data', async () => {
    const user1Id = 'user1';
    const user2Id = 'user2';

    // Mock current user as user1
    jest.spyOn(customerSupabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: user1Id } },
      error: null
    });

    // Should be able to access own cart
    const { data: ownCart } = await customerSupabase
      .from('cart_items')
      .select()
      .eq('user_id', user1Id);

    expect(ownCart).toBeDefined();

    // Should not be able to access other user's cart
    const { data: otherCart, error } = await customerSupabase
      .from('cart_items')
      .select()
      .eq('user_id', user2Id);

    expect(otherCart).toEqual([]); // RLS should filter out
    expect(error).toBeNull(); // No error, just empty result
  });
});
```

#### 3.3 Customer App Performance Testing
Verify performance targets are met.

**Performance Tests:**
```typescript
// packages/customer-mobile/__tests__/performance.test.ts
describe('Customer App Performance', () => {
  test('app startup time is under 3 seconds', async () => {
    const startTime = Date.now();

    const { getByText } = render(
      <TestWrapper>
        <CustomerApp />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Farm Stand')).toBeTruthy();
    }, { timeout: 3000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('bundle size is under target', () => {
    // This would be run as part of build process
    const bundleSize = getBundleSize(); // Custom helper
    expect(bundleSize).toBeLessThan(30 * 1024 * 1024); // 30MB
  });

  test('memory usage is optimized', async () => {
    const initialMemory = getMemoryUsage();

    // Navigate through app screens
    const { getByText } = render(
      <TestWrapper>
        <CustomerApp />
      </TestWrapper>
    );

    // Simulate user flow
    fireEvent.press(getByText('Shop'));
    await waitFor(() => expect(getByText('Products')).toBeTruthy());

    fireEvent.press(getByText('Cart'));
    await waitFor(() => expect(getByText('Your Cart')).toBeTruthy());

    const finalMemory = getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
  });

  test('image loading is optimized', async () => {
    const mockProduct = createMockProduct({ image_url: 'https://example.com/image.jpg' });

    const loadStart = Date.now();
    const { getByTestId } = render(
      <ProductCard product={mockProduct} />
    );

    await waitFor(() => {
      expect(getByTestId('product-image')).toBeTruthy();
    });

    const loadTime = Date.now() - loadStart;
    expect(loadTime).toBeLessThan(1000); // Image loads in under 1 second
  });
});
```

### Phase 4: End-to-End Testing (Both Apps)

#### 4.1 Cross-App Integration Testing
Test that customer and business apps work together correctly.

**Data Synchronization Tests:**
```typescript
// __tests__/e2e/cross-app-integration.test.ts
describe('Cross-App Integration', () => {
  test('customer order appears in business app', async () => {
    // Customer app: Place order
    const customerApp = await initializeCustomerApp();
    await customerApp.login('customer@test.com', 'password123');
    await customerApp.addToCart(mockProduct, 2);
    const order = await customerApp.checkout({
      customerInfo: mockCustomerInfo,
      paymentMethod: 'online'
    });

    // Business app: Verify order appears
    const businessApp = await initializeBusinessApp();
    await businessApp.login('admin@test.com', 'admin123');

    const orders = await businessApp.getOrders();
    const customerOrder = orders.find(o => o.id === order.id);

    expect(customerOrder).toBeDefined();
    expect(customerOrder.status).toBe('pending');
    expect(customerOrder.customer_email).toBe('customer@test.com');
  });

  test('inventory updates affect customer product availability', async () => {
    const businessApp = await initializeBusinessApp();
    const customerApp = await initializeCustomerApp();

    // Business app: Update product stock
    await businessApp.login('inventory@test.com', 'password123');
    await businessApp.updateProductStock(mockProduct.id, 0);

    // Customer app: Verify product shows as unavailable
    await customerApp.login('customer@test.com', 'password123');
    const products = await customerApp.getProducts();
    const updatedProduct = products.find(p => p.id === mockProduct.id);

    expect(updatedProduct.stock_quantity).toBe(0);
    expect(updatedProduct.is_available).toBe(false);
  });

  test('real-time updates work correctly', async () => {
    const customerApp = await initializeCustomerApp();
    const businessApp = await initializeBusinessApp();

    await customerApp.login('customer@test.com', 'password123');
    await businessApp.login('admin@test.com', 'admin123');

    // Customer: Place order
    const order = await customerApp.placeOrder(mockOrderData);

    // Business: Update order status
    await businessApp.updateOrderStatus(order.id, 'confirmed');

    // Customer: Verify order status updated in real-time
    await waitFor(() => {
      const customerOrders = customerApp.getOrderHistory();
      const updatedOrder = customerOrders.find(o => o.id === order.id);
      expect(updatedOrder.status).toBe('confirmed');
    });
  });
});
```

#### 4.2 Security Boundary Testing
Verify security boundaries between apps are maintained.

**Security Boundary Tests:**
```typescript
// __tests__/e2e/security-boundaries.test.ts
describe('Security Boundaries', () => {
  test('customer app API key cannot access business endpoints', async () => {
    const customerApiKey = process.env.EXPO_PUBLIC_SUPABASE_CUSTOMER_KEY;
    const supabaseWithCustomerKey = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      customerApiKey
    );

    // Should fail to access business tables
    await expect(
      supabaseWithCustomerKey.from('inventory_items').select()
    ).rejects.toThrow();

    await expect(
      supabaseWithCustomerKey.from('marketing_campaigns').select()
    ).rejects.toThrow();

    await expect(
      supabaseWithCustomerKey.from('user_roles').select()
    ).rejects.toThrow();
  });

  test('business app cannot be accessed with customer credentials', async () => {
    const businessApp = await initializeBusinessApp();

    // Try to login to business app with customer credentials
    await expect(
      businessApp.login('customer@test.com', 'password123')
    ).rejects.toThrow('Insufficient privileges');
  });

  test('customer app handles business API errors gracefully', async () => {
    const customerApp = await initializeCustomerApp();

    // Mock API to return business-specific error
    jest.spyOn(customerApp.api, 'get').mockRejectedValue(
      new Error('Access denied: Insufficient permissions')
    );

    await customerApp.login('customer@test.com', 'password123');

    // Should handle error gracefully, not crash
    await expect(customerApp.getProducts()).resolves.toEqual([]);
  });
});
```

### Phase 5: App Store Preparation Testing

#### 5.1 App Store Review Simulation
Test app against App Store guidelines.

**App Store Compliance Tests:**
```typescript
// __tests__/app-store/compliance.test.ts
describe('App Store Compliance', () => {
  test('app metadata is complete and accurate', () => {
    const appConfig = require('../../packages/customer-mobile/app.config.js');

    expect(appConfig.expo.name).toBeDefined();
    expect(appConfig.expo.description).toBeDefined();
    expect(appConfig.expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(appConfig.expo.icon).toBeDefined();
    expect(appConfig.expo.splash).toBeDefined();
  });

  test('app handles permissions correctly', async () => {
    const { requestPermissionsAsync } = require('expo-location');

    // App should handle permission denials gracefully
    jest.spyOn(requestPermissionsAsync, 'mockResolvedValue').mockResolvedValue({
      status: 'denied'
    });

    const app = await initializeCustomerApp();

    // Should not crash when location permission denied
    await expect(app.getCurrentLocation()).resolves.toBeNull();
  });

  test('app works offline gracefully', async () => {
    const app = await initializeCustomerApp();

    // Simulate offline mode
    jest.spyOn(NetInfo, 'fetch').mockResolvedValue({
      isConnected: false,
      isInternetReachable: false
    });

    await app.login('customer@test.com', 'password123');

    // Should show cached data and appropriate offline messages
    const products = await app.getProducts();
    expect(products).toBeDefined(); // Should return cached data
    expect(app.getOfflineIndicator()).toBe(true);
  });

  test('app handles deep links correctly', async () => {
    const app = await initializeCustomerApp();

    // Test product deep link
    await app.handleDeepLink('myfarmstand://product/prod123');
    expect(app.getCurrentScreen()).toBe('ProductDetail');
    expect(app.getCurrentParams()).toEqual({ productId: 'prod123' });

    // Test invalid deep link
    await app.handleDeepLink('myfarmstand://invalid/link');
    expect(app.getCurrentScreen()).toBe('Shop'); // Should fallback to home
  });
});
```

#### 5.2 Device Compatibility Testing
Test across different devices and OS versions.

**Device Tests:**
```typescript
// __tests__/app-store/device-compatibility.test.ts
describe('Device Compatibility', () => {
  test('app works on iPhone SE (small screen)', async () => {
    setDeviceSize({ width: 375, height: 667 }); // iPhone SE dimensions

    const { getByText } = render(
      <TestWrapper>
        <CustomerApp />
      </TestWrapper>
    );

    // All UI elements should be visible and accessible
    expect(getByText('Farm Stand')).toBeTruthy();
    expect(getByText('Cart')).toBeTruthy();
    expect(getByText('Orders')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
  });

  test('app works on iPad (large screen)', async () => {
    setDeviceSize({ width: 1024, height: 1366 }); // iPad dimensions

    const { getByText } = render(
      <TestWrapper>
        <CustomerApp />
      </TestWrapper>
    );

    // Should adapt layout for larger screen
    expect(getByText('Farm Stand')).toBeTruthy();
    // Verify tablet-specific layout adjustments
  });

  test('app handles different OS versions', async () => {
    // Test iOS 14 compatibility
    setIOSVersion('14.0');
    const app14 = await initializeCustomerApp();
    await expect(app14.initialize()).resolves.toBeDefined();

    // Test iOS 16 compatibility
    setIOSVersion('16.0');
    const app16 = await initializeCustomerApp();
    await expect(app16.initialize()).resolves.toBeDefined();
  });
});
```

## Test Infrastructure

### Testing Tools & Frameworks

#### Core Testing Stack
```json
{
  "dependencies": {
    "@testing-library/react-native": "^11.5.1",
    "@testing-library/jest-native": "^5.4.2",
    "jest": "^29.5.0",
    "react-test-renderer": "^18.2.0",
    "detox": "^20.7.2",
    "jest-expo": "^49.0.0"
  }
}
```

#### Mock Utilities
```typescript
// __tests__/utils/mocks.ts
export const createMockSupabaseClient = () => ({
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
});

export const createMockProduct = (overrides = {}) => ({
  id: 'prod123',
  name: 'Fresh Tomatoes',
  description: 'Locally grown organic tomatoes',
  price: 4.99,
  stock_quantity: 10,
  category_id: 'vegetables',
  image_url: 'https://example.com/tomato.jpg',
  is_available: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
});

export const createMockUser = (overrides = {}) => ({
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
  phone: '555-0123',
  role: 'customer',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
});
```

#### Test Wrapper Component
```typescript
// __tests__/utils/TestWrapper.tsx
export const TestWrapper: React.FC<{
  children: React.ReactNode;
  initialRoute?: string;
  initialParams?: any;
}> = ({ children, initialRoute = 'Shop', initialParams = {} }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer
        initialState={createInitialState(initialRoute, initialParams)}
      >
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );
};
```

### CI/CD Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/customer-app-tests.yml
name: Customer App Tests
on:
  push:
    paths: ['packages/customer-mobile/**', 'packages/shared-core/**']
  pull_request:
    paths: ['packages/customer-mobile/**', 'packages/shared-core/**']

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:customer:unit

      - name: Run integration tests
        run: npm run test:customer:integration

      - name: Generate coverage report
        run: npm run test:customer:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Start test database
        run: docker-compose up -d postgres

      - name: Run E2E tests
        run: npm run test:e2e:customer

      - name: Cleanup
        run: docker-compose down

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run security audit
        run: npm audit

      - name: Run SAST scan
        uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build customer app
        run: npm run build:customer

      - name: Analyze bundle size
        run: npm run analyze:bundle:customer

      - name: Check bundle size limits
        run: |
          BUNDLE_SIZE=$(stat -c%s packages/customer-mobile/dist/main.js)
          MAX_SIZE=$((30 * 1024 * 1024)) # 30MB
          if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
            echo "Bundle size $BUNDLE_SIZE exceeds limit $MAX_SIZE"
            exit 1
          fi
```

## Testing Schedule

### Pre-Migration (Week 0)
- [ ] Establish baseline metrics
- [ ] Set up testing infrastructure
- [ ] Create mock data and utilities

### Phase 1 Testing (Weeks 1-2)
- [ ] Unit tests for shared core modules
- [ ] Integration tests for shared core
- [ ] Performance baseline establishment

### Phase 2 Testing (Weeks 3-4)
- [ ] Customer app functional tests
- [ ] Customer app security tests
- [ ] Customer app performance tests

### Phase 3 Testing (Weeks 5-6)
- [ ] Business app regression tests
- [ ] Cross-app integration tests
- [ ] Security boundary validation

### Phase 4 Testing (Weeks 7-8)
- [ ] End-to-end testing
- [ ] App Store compliance testing
- [ ] Device compatibility testing
- [ ] Final performance validation

## Quality Gates

### Automated Quality Gates
- ✅ 95%+ test coverage on customer-specific code
- ✅ 100% pass rate on critical customer flows
- ✅ Zero security vulnerabilities in customer app
- ✅ Bundle size < 30MB
- ✅ App startup time < 3 seconds
- ✅ All accessibility tests pass

### Manual Quality Gates
- ✅ UX review and approval
- ✅ Security review and approval
- ✅ Performance review and approval
- ✅ App Store submission requirements met

This comprehensive testing strategy ensures the customer app migration maintains quality, security, and performance while providing confidence in the separation of customer and business functionality.