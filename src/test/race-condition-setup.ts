/**
 * Race Condition Test Setup
 * 
 * This setup file is specifically for race condition testing with REAL React Query.
 * Key differences from regular setup:
 * - Does NOT mock React Query (uses real instances)
 * - Mocks only services and external dependencies
 * - Enables JSX and React DOM testing
 */

import '@testing-library/jest-native/extend-expect';

// Mock React Native modules (but keep React Query real)
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 812 })) },
  StyleSheet: { create: (styles: any) => styles },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock broadcast factory
jest.mock('../utils/broadcastFactory', () => ({
  createBroadcastHelper: jest.fn(() => ({
    send: jest.fn().mockResolvedValue(undefined),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['test-channel'])
  })),
  cartBroadcast: {
    send: jest.fn().mockResolvedValue(undefined),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['cart-test'])
  },
  orderBroadcast: {
    send: jest.fn().mockResolvedValue(undefined),
    user: { getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-user-test']) },
    admin: { getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-admin-test']) }
  },
  productBroadcast: {
    send: jest.fn().mockResolvedValue(undefined),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['product-test'])
  }
}));

// Mock Supabase for real-time testing
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockImplementation((callback) => {
    // Simulate subscription success with real timing for race conditions
    setTimeout(() => {
      if (typeof callback === 'function') {
        callback('SUBSCRIBED');
      }
    }, 50);
    return mockChannel;
  }),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../config/supabase', () => ({
  supabase: {
    channel: jest.fn().mockReturnValue(mockChannel),
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

// Mock CartService (but NOT React Query - we want real React Query for race condition testing)
// Helper to create CartError objects that match the interface in useCart.ts
const createCartError = (
  code: 'AUTHENTICATION_REQUIRED' | 'STOCK_INSUFFICIENT' | 'PRODUCT_NOT_FOUND' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR',
  message: string,
  userMessage: string,
  metadata: { productId?: string; requestedQuantity?: number; availableQuantity?: number } = {}
) => ({
  code,
  message,
  userMessage,
  ...metadata
});

jest.mock('../services/cartService', () => ({
  cartService: {
    getCart: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
  }
}));

// Mock AuthService with authenticated user by default
jest.mock('../services/authService', () => ({
  AuthService: {
    getCurrentUser: jest.fn().mockResolvedValue({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890',
      address: '123 Test St',
      role: 'customer'
    }),
    isAuthenticated: jest.fn().mockResolvedValue(true),
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateProfile: jest.fn(),
    refreshToken: jest.fn(),
    changePassword: jest.fn(),
  }
}));

// Mock OrderService (for race condition testing)
jest.mock('../services/orderService', () => ({
  getAllOrders: jest.fn(),
  getOrder: jest.fn(),
  getCustomerOrders: jest.fn(),
  getOrderStats: jest.fn(),
  updateOrderStatus: jest.fn(),
  bulkUpdateOrderStatus: jest.fn(),
  createOrder: jest.fn(),
  cancelOrder: jest.fn(),
}));

// Conditional useAuth mock - only for non-useAuth race tests
// This allows useAuth race tests to use real useAuth while other tests get mocked auth
const testFilePath = expect.getState().testPath || '';
const isUseAuthRaceTest = testFilePath.includes('useAuth.race.test');

if (!isUseAuthRaceTest) {
  // Mock useAuth hooks to provide authenticated user for race condition tests (except useAuth tests)
  jest.mock('../hooks/useAuth', () => ({
    useCurrentUser: () => ({
      data: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        address: '123 Test St',
        role: 'customer'
      },
      isLoading: false,
      isError: false,
      error: null
    }),
    useLoginMutation: jest.fn(),
    useLogoutMutation: jest.fn(),
    useRegisterMutation: jest.fn(),
    useUpdateProfileMutation: jest.fn(),
    useChangePasswordMutation: jest.fn(),
    useRefreshTokenMutation: jest.fn(),
    useAuthOperations: jest.fn()
  }));
} else {
  // For useAuth race tests, don't mock useAuth hooks - let them use real implementation
  // but still mock AuthService for service-level testing
  console.log('🔧 useAuth race test detected - using real useAuth hooks with mocked AuthService');
}

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => {
      return React.createElement('MockDateTimePicker', {
        testID: `datetimepicker-${props.mode}`,
        onPress: () => props.onChange && props.onChange({}, props.value),
      });
    },
  };
});

// IMPORTANT: Do NOT mock React Query - we want real instances for race condition testing
// React Query will be imported and used normally in tests

// Global test settings
jest.setTimeout(20000); // Longer timeout for race condition tests

// Handle unhandled promise rejections (common in race condition tests)
process.on('unhandledRejection', (reason, promise) => {
  // Log but don't fail tests for expected race condition scenarios
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as Error).message;
    if (message.includes('Query was cancelled') || 
        message.includes('AbortError') ||
        message.includes('Network error')) {
      // These are expected in race condition tests
      return;
    }
  }
  console.warn('Unhandled promise rejection:', reason);
});

// Clean up between tests
beforeEach(() => {
  jest.clearAllMocks();
  // Clear any pending timers
  jest.clearAllTimers();
});

afterEach(() => {
  // Only clean up timers if fake timers are being used
  try {
    if (jest.isMockFunction(setTimeout)) {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  } catch {
    // Ignore timer cleanup errors
  }
});

// Export helper for use in race condition tests
(global as any).createCartError = createCartError;

// Add console warnings for potential race condition issues
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.warn = (...args: any[]) => {
  // Filter out React Query warnings that are expected during race condition testing
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('Query data cannot be undefined') ||
    message.includes('Mutation observer') ||
    message.includes('Query observer') ||
    message.includes('Query was cancelled')
  )) {
    return; // Suppress expected React Query warnings during race condition tests
  }
  originalConsoleWarn(...args);
};

console.error = (...args: any[]) => {
  // Filter out expected React Query errors during race condition testing
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('Query was cancelled') ||
    message.includes('AbortError') ||
    message.includes('Network request failed') ||
    message.includes('update to TestComponent') ||
    message.includes('was not wrapped in act')
  )) {
    return; // Suppress expected errors during race condition tests
  }
  originalConsoleError(...args);
};