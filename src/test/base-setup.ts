/**
 * Base Test Setup
 * Consolidated mocks and utilities for all test types
 * Part of test refactor - reducing from 14 setup files to 2-3
 */

import '@testing-library/jest-native/extend-expect';

// ============================================================================
// CORE REACT NATIVE MOCKS
// ============================================================================

export const mockReactNative = {
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
  Modal: 'Modal',
};

// ============================================================================
// ASYNC STORAGE MOCK
// ============================================================================

export const mockAsyncStorage = require('@react-native-async-storage/async-storage/jest/async-storage-mock');

// ============================================================================
// REACT NAVIGATION MOCKS
// ============================================================================

export const mockNavigation = {
  useNavigation: () => ({
    navigate: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => true),
    getParent: jest.fn(),
    getState: jest.fn(),
  }),
  useRoute: () => ({
    key: 'test-route-key',
    name: 'TestScreen',
    params: {},
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
  NavigationContainer: ({ children }: any) => children,
  createNavigationContainerRef: jest.fn(() => ({
    current: {
      navigate: jest.fn(),
      dispatch: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      getParent: jest.fn(),
      getState: jest.fn(),
      getRootState: jest.fn(),
      getCurrentRoute: jest.fn(),
      getCurrentOptions: jest.fn(),
      isReady: jest.fn(() => true),
    },
  })),
};

// Stack Navigator Mocks
export const mockStackNavigator = {
  createStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
    Group: ({ children }: any) => children,
  }),
  CardStyleInterpolators: {
    forHorizontalIOS: jest.fn(),
    forVerticalIOS: jest.fn(),
    forModalPresentationIOS: jest.fn(),
    forFadeFromBottomAndroid: jest.fn(),
  },
  HeaderStyleInterpolators: {
    forUIKit: jest.fn(),
    forFade: jest.fn(),
    forSlideLeft: jest.fn(),
    forSlideRight: jest.fn(),
    forSlideUp: jest.fn(),
  },
  TransitionPresets: {
    SlideFromRightIOS: {},
    ModalSlideFromBottomIOS: {},
    ModalPresentationIOS: {},
    FadeFromBottomAndroid: {},
    RevealFromBottomAndroid: {},
    ScaleFromCenterAndroid: {},
    DefaultTransition: {},
    ModalTransition: {},
  },
};

// Bottom Tabs Navigator Mocks
export const mockBottomTabs = {
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
    Group: ({ children }: any) => children,
  }),
};

// Drawer Navigator Mocks
export const mockDrawer = {
  createDrawerNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
    Group: ({ children }: any) => children,
  }),
  DrawerContentScrollView: ({ children }: any) => children,
  DrawerItemList: () => null,
  DrawerItem: () => null,
  useDrawerStatus: jest.fn(() => 'closed'),
};

// ============================================================================
// DATE TIME PICKER MOCK
// ============================================================================

export const mockDateTimePicker = {
  __esModule: true,
  default: (props: any) => {
    const React = require('react');
    return React.createElement('MockDateTimePicker', {
      testID: `datetimepicker-${props.mode}`,
      onPress: () => props.onChange && props.onChange({}, props.value),
    });
  },
};

// ============================================================================
// BROADCAST FACTORY MOCKS
// ============================================================================

export const mockBroadcast = {
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
    user: { 
      send: jest.fn().mockResolvedValue(undefined),
      getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-user-test']) 
    },
    admin: { 
      send: jest.fn().mockResolvedValue(undefined),
      getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-admin-test']) 
    }
  },
  productBroadcast: {
    send: jest.fn().mockResolvedValue(undefined),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['product-test'])
  },
  paymentBroadcast: {
    send: jest.fn().mockResolvedValue(undefined),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['payment-test'])
  }
};

// ============================================================================
// EXPO/REACT NATIVE ADDITIONAL MOCKS
// ============================================================================

export const mockExpoSecureStore = {
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
};

export const mockGestureHandler = (() => {
  const View = 'View';
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    gestureHandlerRootHOC: jest.fn(component => component),
    Directions: {},
  };
})();

export const mockSafeAreaContext = {
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
  useSafeAreaFrame: () => ({
    x: 0,
    y: 0,
    width: 375,
    height: 812,
  }),
  initialWindowMetrics: {
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    frame: { x: 0, y: 0, width: 375, height: 812 },
  },
};

export const mockReanimated = () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
};

// ============================================================================
// MONITORING SERVICE MOCKS
// ============================================================================

export const mockMonitoring = {
  systemHealth: {
    getSystemHealth: jest.fn().mockResolvedValue({
      success: true,
      health: {
        timestamp: new Date().toISOString(),
        overallHealth: 95,
        services: {},
        performance: {},
        security: {},
        recommendations: [],
      },
    }),
    coordinateOperation: jest.fn().mockImplementation(
      async (operationName, operations, options) => ({
        success: true,
        results: [],
        errors: [],
        performance: {
          totalTime: 500,
          serviceTimings: {},
          throughput: operations.length / 2,
        },
      })
    ),
  },
  performanceMonitoring: {
    logMetric: jest.fn().mockResolvedValue({ success: true }),
    logQueryPerformance: jest.fn().mockResolvedValue({ success: true }),
    logApiResponse: jest.fn().mockResolvedValue({ success: true }),
    logMemoryUsage: jest.fn().mockResolvedValue({ success: true }),
    logCacheEfficiency: jest.fn().mockResolvedValue({ success: true }),
    getMetrics: jest.fn().mockResolvedValue({ success: true, metrics: [] }),
    getPerformanceSummary: jest.fn().mockResolvedValue({ success: true, summary: {} }),
    startTiming: jest.fn(() => ({
      end: jest.fn().mockResolvedValue(undefined)
    })),
    measurePerformance: jest.fn((fn) => fn),
  },
  securityAuditing: {
    logAuditEvent: jest.fn().mockResolvedValue({ success: true }),
    logSecurityViolation: jest.fn().mockResolvedValue({ success: true }),
    validateRLSPolicies: jest.fn().mockResolvedValue({ 
      success: true, 
      results: [], 
      overallCoverage: 0.95 
    }),
    testPermissionBoundaries: jest.fn().mockResolvedValue({ 
      success: true, 
      results: [], 
      passRate: 0.98 
    }),
    monitorAccessPatterns: jest.fn().mockResolvedValue({ 
      success: true, 
      suspiciousActivities: [] 
    }),
    generateComplianceReport: jest.fn().mockResolvedValue({ 
      success: true, 
      report: {
        rlsCoverage: 95,
        permissionBoundaryCompliance: 98,
        securityViolations: 0,
        recommendations: [],
        overallScore: 96.5,
      }
    }),
  },
};

// ============================================================================
// APPLY ALL BASE MOCKS FUNCTION
// ============================================================================

export function applyBaseMocks() {
  // Apply simple fixes first
  require('./simple-fixes');
  
  // React Native
  jest.mock('react-native', () => mockReactNative);
  
  // AsyncStorage
  jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
  
  // React Navigation
  jest.mock('@react-navigation/native', () => mockNavigation);
  jest.mock('@react-navigation/stack', () => mockStackNavigator);
  jest.mock('@react-navigation/bottom-tabs', () => mockBottomTabs);
  jest.mock('@react-navigation/drawer', () => mockDrawer);
  
  // DateTimePicker
  jest.mock('@react-native-community/datetimepicker', () => mockDateTimePicker);
  
  // Broadcast Factory
  jest.mock('../utils/broadcastFactory', () => mockBroadcast);
  
  // Expo Secure Store
  jest.mock('expo-secure-store', () => mockExpoSecureStore);
  
  // Gesture Handler
  jest.mock('react-native-gesture-handler', () => mockGestureHandler);
  
  // Safe Area Context
  jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
  
  // Reanimated
  jest.mock('react-native-reanimated', () => mockReanimated());
  
  // React Native Screens
  jest.mock('react-native-screens', () => ({
    enableScreens: jest.fn(),
    ScreenContainer: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
    NativeScreen: ({ children }: any) => children,
    ScreenStack: ({ children }: any) => children,
    ScreenStackHeaderConfig: ({ children }: any) => children,
  }));
}

// ============================================================================
// GLOBAL TEST UTILITIES
// ============================================================================

export function setupGlobalCleanup() {
  // Set global timeout
  jest.setTimeout(10000);
  
  // Clean up between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    // Clear any pending timers
    jest.clearAllTimers();
    
    // Small delay for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    // Log but don't fail tests for expected scenarios
    if (reason && typeof reason === 'object' && 'message' in reason) {
      const message = (reason as Error).message;
      if (message.includes('Query was cancelled') || 
          message.includes('AbortError') ||
          message.includes('Network error')) {
        // These are expected in some tests
        return;
      }
    }
    console.warn('Unhandled promise rejection:', reason);
  });
}

// ============================================================================
// CONSOLE MOCK UTILITIES
// ============================================================================

export function suppressConsoleWarnings(patterns: RegExp[] = []) {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  const defaultPatterns = [
    /Query data cannot be undefined/,
    /Mutation observer/,
    /Query observer/,
    /Query was cancelled/,
    /update to TestComponent/,
    /was not wrapped in act/,
    /ReactDOM.render is deprecated/,
  ];
  
  const allPatterns = [...defaultPatterns, ...patterns];
  
  console.warn = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string' && 
        allPatterns.some(pattern => pattern.test(message))) {
      return;
    }
    originalWarn(...args);
  };
  
  console.error = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string' && 
        allPatterns.some(pattern => pattern.test(message))) {
      return;
    }
    originalError(...args);
  };
  
  return () => {
    console.warn = originalWarn;
    console.error = originalError;
  };
}

// ============================================================================
// MOCK RESET UTILITIES
// ============================================================================

export function resetAllMocks() {
  // Reset broadcast mocks
  Object.values(broadcastMocks).forEach(mock => {
    if (typeof mock === 'function' && jest.isMockFunction(mock)) {
      mock.mockReset();
    } else if (typeof mock === 'object') {
      Object.values(mock).forEach(innerMock => {
        if (typeof innerMock === 'function' && jest.isMockFunction(innerMock)) {
          innerMock.mockReset();
        }
      });
    }
  });
  
  // Reset monitoring mocks
  Object.values(mockMonitoring).forEach(service => {
    Object.values(service).forEach(method => {
      if (jest.isMockFunction(method)) {
        method.mockReset();
      }
    });
  });
  
  // Clear all other mocks
  jest.clearAllMocks();
}