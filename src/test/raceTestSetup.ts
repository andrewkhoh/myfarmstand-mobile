// Minimal setup for race condition tests
import '@testing-library/jest-native/extend-expect';

// Only mock React Native components, not React Query
jest.mock('react-native', () => {
  const RN = {
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
  };
  return RN;
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
}));

// Global test timeout
jest.setTimeout(15000);