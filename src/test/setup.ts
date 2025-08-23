import '@testing-library/jest-native/extend-expect';

// Load environment variables for test environment
// This ensures EXPO_PUBLIC_CHANNEL_SECRET and other variables are available
import * as dotenv from 'dotenv';
dotenv.config();

// Mock React Native modules
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper'); // Commented out - causing issues

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

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

// Mock broadcast factory completely - must be before any imports that use it
jest.mock('../utils/broadcastFactory', () => {
  const mockBroadcastHelper = {
    send: jest.fn(),
    getAuthorizedChannelNames: jest.fn(() => ['test-channel'])
  };
  
  return {
    createBroadcastHelper: jest.fn(() => mockBroadcastHelper),
    cartBroadcast: mockBroadcastHelper,
    orderBroadcast: {
      send: jest.fn(),
      user: mockBroadcastHelper,
      admin: mockBroadcastHelper
    },
    productBroadcast: mockBroadcastHelper,
    paymentBroadcast: mockBroadcastHelper
  };
});

// React Query is now enabled - no mocking needed for real execution
// Individual tests can mock services as needed

// Mock React Native components
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 812 })) },
  StyleSheet: { create: (styles) => styles },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  // Add other RN components as needed
}));

// Global test timeout
jest.setTimeout(10000);
