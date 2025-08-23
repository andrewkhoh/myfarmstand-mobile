// Minimal test setup for inventory tests in Node environment
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

// Mock React components as simple functions
global.React = {
  createElement: jest.fn(() => ({})),
  useContext: jest.fn(),
  createContext: jest.fn(),
  useState: jest.fn(() => [null, jest.fn()]),
  useEffect: jest.fn(),
  useMemo: jest.fn((fn) => fn()),
  useCallback: jest.fn((fn) => fn),
};

// Mock React Native modules
jest.mock('react-native', () => ({}));

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
}));

// Mock Supabase
jest.mock('../../config/supabase', () => ({
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

// Set timeout
jest.setTimeout(10000);