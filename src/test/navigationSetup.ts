/**
 * Navigation Test Setup
 * Provides mocks and utilities for testing navigation components
 */

import '@testing-library/jest-native/extend-expect';

// Mock React Native Platform first
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn(options => options.ios || options.default),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  return {
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
});

// Mock React Navigation Stack
jest.mock('@react-navigation/stack', () => ({
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
}));

// Mock React Navigation Bottom Tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
    Group: ({ children }: any) => children,
  }),
}));

// Mock React Navigation Drawer
jest.mock('@react-navigation/drawer', () => ({
  createDrawerNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
    Group: ({ children }: any) => children,
  }),
  DrawerContentScrollView: ({ children }: any) => children,
  DrawerItemList: () => null,
  DrawerItem: () => null,
  useDrawerStatus: jest.fn(() => 'closed'),
}));

// Mock React Native Screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  ScreenContainer: ({ children }: any) => children,
  Screen: ({ children }: any) => children,
  NativeScreen: ({ children }: any) => children,
  ScreenStack: ({ children }: any) => children,
  ScreenStackHeaderConfig: ({ children }: any) => children,
}));

// Mock React Native Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
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
}));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(component => component),
    Directions: {},
    GestureHandlerRootView: View,
  };
});

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
// Commented out - causing module resolution issues
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Navigation test utilities
export const createMockNavigation = () => ({
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
});

export const createMockRoute = (name: string, params: any = {}) => ({
  key: `${name}-key`,
  name,
  params,
  path: undefined,
});

// Role-based navigation mocks
export const mockRoleNavigationService = {
  generateMenuItems: jest.fn(),
  canNavigateTo: jest.fn(),
  getDefaultScreen: jest.fn(),
  handlePermissionDenied: jest.fn(),
  getCachedMenuItems: jest.fn(),
  clearMenuCache: jest.fn(),
  trackNavigation: jest.fn(),
  getNavigationHistory: jest.fn(),
  validateDeepLink: jest.fn(),
  getNavigationState: jest.fn(),
  persistNavigationState: jest.fn(),
};

export const mockNavigationPermissions = {
  customer: ['Home', 'Products', 'Cart', 'Orders', 'Profile'],
  farmer: ['Home', 'Products', 'Inventory', 'Orders', 'Analytics', 'Profile'],
  admin: ['Home', 'Products', 'Inventory', 'Orders', 'Users', 'Analytics', 'Settings', 'Profile'],
  vendor: ['Home', 'Products', 'Inventory', 'Orders', 'Analytics', 'Profile'],
  staff: ['Home', 'Orders', 'Inventory', 'Profile'],
};

// Export all mocks for convenience
export const navigationMocks = {
  createMockNavigation,
  createMockRoute,
  mockRoleNavigationService,
  mockNavigationPermissions,
};