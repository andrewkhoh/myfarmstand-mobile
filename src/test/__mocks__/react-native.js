/**
 * React Native mock for testing
 * Provides mock implementations of React Native components and APIs
 */

const React = require('react');

// Mock components
const MockView = 'View';
const MockText = 'Text';
const MockImage = 'Image';
const MockScrollView = 'ScrollView';
const MockTouchableOpacity = 'TouchableOpacity';
const MockTouchableHighlight = 'TouchableHighlight';
const MockTouchableWithoutFeedback = 'TouchableWithoutFeedback';
const MockTextInput = 'TextInput';
const MockFlatList = 'FlatList';
const MockSectionList = 'SectionList';
const MockActivityIndicator = 'ActivityIndicator';
const MockButton = 'Button';
const MockSwitch = 'Switch';
const MockSafeAreaView = 'SafeAreaView';
const MockKeyboardAvoidingView = 'KeyboardAvoidingView';
const MockModal = 'Modal';
const MockRefreshControl = 'RefreshControl';

// Mock APIs
const Platform = {
  OS: 'ios',
  Version: 14,
  isPad: false,
  isTV: false,
  isTesting: true,
  select: jest.fn((options) => options.ios || options.default),
};

const Dimensions = {
  get: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  set: jest.fn(),
};

const Alert = {
  alert: jest.fn(),
  prompt: jest.fn(),
};

const Animated = {
  Value: jest.fn(() => ({
    setValue: jest.fn(),
    setOffset: jest.fn(),
    flattenOffset: jest.fn(),
    extractOffset: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn(),
    resetAnimation: jest.fn(),
    interpolate: jest.fn(),
    animate: jest.fn(),
  })),
  ValueXY: jest.fn(() => ({
    setValue: jest.fn(),
    setOffset: jest.fn(),
    flattenOffset: jest.fn(),
    extractOffset: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn(),
    resetAnimation: jest.fn(),
    getLayout: jest.fn(),
    getTranslateTransform: jest.fn(),
  })),
  timing: jest.fn(() => ({
    start: jest.fn((cb) => cb && cb({ finished: true })),
    stop: jest.fn(),
  })),
  spring: jest.fn(() => ({
    start: jest.fn((cb) => cb && cb({ finished: true })),
    stop: jest.fn(),
  })),
  decay: jest.fn(() => ({
    start: jest.fn((cb) => cb && cb({ finished: true })),
    stop: jest.fn(),
  })),
  sequence: jest.fn(),
  parallel: jest.fn(),
  stagger: jest.fn(),
  loop: jest.fn(),
  event: jest.fn(),
  createAnimatedComponent: jest.fn((component) => component),
  View: MockView,
  Text: MockText,
  Image: MockImage,
  ScrollView: MockScrollView,
};

const StyleSheet = {
  create: jest.fn((styles) => styles),
  flatten: jest.fn((style) => style),
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  absoluteFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  hairlineWidth: 1,
};

const Linking = {
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const Keyboard = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  dismiss: jest.fn(),
  scheduleLayoutAnimation: jest.fn(),
};

const InteractionManager = {
  runAfterInteractions: jest.fn((cb) => {
    cb();
    return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
  }),
  createInteractionHandle: jest.fn(),
  clearInteractionHandle: jest.fn(),
  setDeadline: jest.fn(),
};

const LayoutAnimation = {
  configureNext: jest.fn(),
  create: jest.fn(),
  Types: {},
  Properties: {},
  Presets: {
    easeInEaseOut: {},
    linear: {},
    spring: {},
  },
};

const PixelRatio = {
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
  roundToNearestPixel: jest.fn((size) => Math.round(size * 2) / 2),
};

const Share = {
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
};

const Vibration = {
  vibrate: jest.fn(),
  cancel: jest.fn(),
};

const I18nManager = {
  isRTL: false,
  forceRTL: jest.fn(),
  allowRTL: jest.fn(),
  swapLeftAndRightInRTL: jest.fn(),
  doLeftAndRightSwapInRTL: false,
};

const NativeModules = {
  UIManager: {
    RCTView: {
      directEventTypes: {},
    },
  },
  PlatformConstants: {
    forceTouchAvailable: false,
  },
  RNGestureHandlerModule: {
    State: {},
    attachGestureHandler: jest.fn(),
    createGestureHandler: jest.fn(),
    dropGestureHandler: jest.fn(),
    updateGestureHandler: jest.fn(),
  },
  RNCAsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiGet: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
    clear: jest.fn(),
    getAllKeys: jest.fn(),
  },
};

const NativeEventEmitter = jest.fn();

const requireNativeComponent = jest.fn((name) => name);

const processColor = jest.fn((color) => color);

module.exports = {
  // Components
  View: MockView,
  Text: MockText,
  Image: MockImage,
  ScrollView: MockScrollView,
  TouchableOpacity: MockTouchableOpacity,
  TouchableHighlight: MockTouchableHighlight,
  TouchableWithoutFeedback: MockTouchableWithoutFeedback,
  TextInput: MockTextInput,
  FlatList: MockFlatList,
  SectionList: MockSectionList,
  ActivityIndicator: MockActivityIndicator,
  Button: MockButton,
  Switch: MockSwitch,
  SafeAreaView: MockSafeAreaView,
  KeyboardAvoidingView: MockKeyboardAvoidingView,
  Modal: MockModal,
  RefreshControl: MockRefreshControl,
  
  // APIs
  Platform,
  Dimensions,
  Alert,
  Animated,
  StyleSheet,
  Linking,
  AppState,
  Keyboard,
  InteractionManager,
  LayoutAnimation,
  PixelRatio,
  Share,
  Vibration,
  I18nManager,
  NativeModules,
  NativeEventEmitter,
  
  // Functions
  requireNativeComponent,
  processColor,
  
  // Additional exports that might be needed
  findNodeHandle: jest.fn(),
  unstable_batchedUpdates: jest.fn((cb) => cb()),
};