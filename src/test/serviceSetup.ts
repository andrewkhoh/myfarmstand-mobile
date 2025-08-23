/**
 * Minimal test setup for service testing
 * Only mocks what services actually need
 */

// Mock Supabase with proper isolation support
const mockSupabaseBase = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    updateUser: jest.fn(),
    refreshSession: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(),
        gte: jest.fn(),
        lte: jest.fn(),
        in: jest.fn(),
      })),
      or: jest.fn(),
      in: jest.fn(),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
    upsert: jest.fn(),
  })),
  rpc: jest.fn(),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
};

jest.mock('../config/supabase', () => ({
  supabase: mockSupabaseBase,
  TABLES: {
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
  }
}));

// Export mock reset utility for test isolation
global.resetSupabaseMocks = () => {
  // Reset all Supabase method mocks to prevent state contamination
  Object.values(mockSupabaseBase.auth).forEach(mockFn => {
    if (jest.isMockFunction(mockFn)) {
      mockFn.mockReset();
    }
  });
  
  mockSupabaseBase.from.mockReset();
  mockSupabaseBase.rpc.mockReset();
  mockSupabaseBase.channel.mockReset();
  
  // Restore default implementations
  mockSupabaseBase.from.mockImplementation(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(),
        gte: jest.fn(),
        lte: jest.fn(),
        in: jest.fn(),
      })),
      or: jest.fn(),
      in: jest.fn(),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
    upsert: jest.fn(),
  }));
  
  mockSupabaseBase.channel.mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }));
};

// Mock storage - only what services actually use
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock platform detection - minimal
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock broadcast utilities
jest.mock('../utils/broadcastFactory', () => ({
  sendOrderBroadcast: jest.fn().mockResolvedValue({ success: true }),
  cartBroadcast: {
    send: jest.fn().mockResolvedValue({ success: true }),
  },
  SecureChannelNameGenerator: {
    generateSecureChannelName: jest.fn(() => 'secure-channel-name'),
  },
}));

// Mock type mappers
jest.mock('../utils/typeMappers', () => ({
  mapProductFromDB: jest.fn((product) => product),
  mapOrderFromDB: jest.fn(),
  getOrderItems: jest.fn((order) => order.items || []),
  getOrderCustomerInfo: jest.fn((order) => ({ email: order.customer_email })),
  getProductStock: jest.fn(),
  isProductPreOrder: jest.fn((product) => product.is_pre_order || false),
  getProductMinPreOrderQty: jest.fn((product) => product.min_pre_order_quantity || 1),
  getProductMaxPreOrderQty: jest.fn((product) => product.max_pre_order_quantity || 10),
  getOrderCustomerId: jest.fn(),
  getOrderTotal: jest.fn(),
  getOrderFulfillmentType: jest.fn(),
  getOrderPaymentMethod: jest.fn((order) => order.payment_method || 'cash_on_pickup'),
  getOrderPickupDate: jest.fn((order) => order.pickup_date),
  getOrderPickupTime: jest.fn((order) => order.pickup_time),
}));

// Mock query client
jest.mock('../config/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Pickup rescheduling service should not be mocked globally to allow proper testing

// Order service should not be mocked globally to allow proper testing

// Notification service should not be mocked globally to allow proper testing

// Stock restoration service should not be mocked globally to allow proper testing

// Set test timeout
jest.setTimeout(10000);