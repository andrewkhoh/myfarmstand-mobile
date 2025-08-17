import '@testing-library/jest-native/extend-expect';

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

// Mock broadcast factory completely
jest.mock('../utils/broadcastFactory', () => ({
  createBroadcastHelper: jest.fn(() => ({
    send: jest.fn(),
    getAuthorizedChannelNames: jest.fn(() => ['test-channel'])
  })),
  cartBroadcast: {
    send: jest.fn(),
    getAuthorizedChannelNames: jest.fn(() => ['cart-test'])
  },
  orderBroadcast: {
    send: jest.fn(),
    user: { getAuthorizedChannelNames: jest.fn(() => ['order-user-test']) },
    admin: { getAuthorizedChannelNames: jest.fn(() => ['order-admin-test']) }
  },
  productBroadcast: {
    send: jest.fn(),
    getAuthorizedChannelNames: jest.fn(() => ['product-test'])
  }
}));

// Mock React Query with proper mock objects
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isLoading: false,
    error: null,
    data: undefined,
    reset: jest.fn(),
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    clear: jest.fn(),
  })),
  QueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    clear: jest.fn(),
  })),
  QueryClientProvider: (props: any) => props.children,
}));

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
