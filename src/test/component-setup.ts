/**
 * Component Test Setup Configuration
 * For testing React Native components with real React Query
 * Following docs/architectural-patterns-and-best-practices.md
 */

import '@testing-library/jest-native/extend-expect';

// Set environment variables for testing
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_CHANNEL_SECRET = 'test-secret';

// Mock Expo modules that cause issues in testing
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
      }
    }
  }
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Mock ValidationMonitor
jest.mock('../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn(),
    recordServiceError: jest.fn(),
    reset: jest.fn(),
  }
}));

// Mock Supabase config to prevent environment errors
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          data: null,
          error: null
        })),
        data: null,
        error: null
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  },
}));

// Mock broadcastFactory to prevent environment errors
jest.mock('../utils/broadcastFactory', () => ({
  createBroadcastHelper: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({ success: true }),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
  cartBroadcast: {
    send: jest.fn().mockResolvedValue({ success: true }),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  productBroadcast: {
    send: jest.fn().mockResolvedValue({ success: true }),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  authBroadcast: {
    send: jest.fn().mockResolvedValue({ success: true }),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  orderBroadcast: {
    send: jest.fn().mockResolvedValue({ success: true }),
    user: { 
      send: jest.fn().mockResolvedValue({ success: true }),
      getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-user-test']) 
    },
    admin: { 
      getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-admin-test']) 
    },
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

// Configure Jest environment
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress specific console warnings during tests
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactTestRenderer') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('Warning: Failed prop type'))
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Async Storage') ||
       args[0].includes('Setting a timer'))
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(10000);

export {};