/**
 * Minimal test setup for service testing
 * Only mocks what services actually need
 */

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
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
  },
  TABLES: {
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
  }
}));

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
  mapOrderFromDB: jest.fn((order, items) => ({ ...order, items: items || [] })),
  getOrderItems: jest.fn((order) => order.items || []),
  getOrderCustomerInfo: jest.fn((order) => ({ email: order.customer_email })),
  getProductStock: jest.fn((product) => product.stock_quantity || 0),
}));

// Mock query client
jest.mock('../config/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Set test timeout
jest.setTimeout(10000);