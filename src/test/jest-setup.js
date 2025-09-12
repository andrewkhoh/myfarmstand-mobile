/**
 * Jest Setup for React Native Screen Tests
 * Handles React Native mocking and setup issues
 */

// Define React Native globals
global.__DEV__ = true;
global.__reanimatedWorkletInit = jest.fn();

// Mock React Native Alert
global.Alert = {
  alert: jest.fn()
};

// Mock React Native modules that cause issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return {
    ...RN,
    Alert: {
      alert: jest.fn()
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default)
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 }))
    },
    NativeModules: {
      ...RN.NativeModules,
      RNGestureHandlerModule: {
        attachGestureHandler: jest.fn(),
        createGestureHandler: jest.fn(),
        dropGestureHandler: jest.fn(),
        updateGestureHandler: jest.fn(),
        State: {},
      },
      PlatformConstants: {
        forceTouchAvailable: false,
      },
    },
  };
});

// Mock Expo modules
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => ({
  default: {
    View: require('react-native').View,
    Text: require('react-native').Text,
    createAnimatedComponent: jest.fn(),
    interpolate: jest.fn(),
    Value: jest.fn(),
    event: jest.fn(() => jest.fn()),
    add: jest.fn(),
    eq: jest.fn(),
    set: jest.fn(),
    cond: jest.fn(),
    interpolateColor: jest.fn(),
  },
}));

// Mock Animated helper without requiring the actual file
global.__reanimatedWorkletInit = jest.fn();