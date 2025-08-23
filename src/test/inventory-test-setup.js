// Simple test setup for inventory tests without expo dependencies
import '@testing-library/jest-dom';

// Mock React Native modules that tests might encounter
global.Alert = {
  alert: jest.fn()
};

// Mock AsyncStorage
const mockAsyncStorage = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve())
};

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {}
  }),
  NavigationContainer: ({ children }) => children,
}));

// Mock React Native components and modules
jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles) => styles,
  },
  View: ({ children }) => children,
  Text: ({ children }) => children,
  ScrollView: ({ children }) => children,
  TouchableOpacity: ({ children, onPress }) => ({ children, onPress }),
  Modal: ({ children, visible }) => visible ? children : null,
  Alert: {
    alert: jest.fn()
  },
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: () => ({ width: 375, height: 667 })
  }
}));

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  },
}));

// Set longer timeout for tests
jest.setTimeout(10000);

// Suppress console errors during testing unless debugging
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});