/**
 * Global mocks for React Native environment
 * This file sets up global variables that React Native normally provides
 * but are missing in the test environment
 */

// React Native development flag
global.__DEV__ = false;

// Test environment flag
global.__TEST__ = true;

// React Native globals
global.requestAnimationFrame = (callback) => {
  setTimeout(callback, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Only mock React Native modules if they exist (for jest-expo environment)
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch (e) {
  // Ignore - not in React Native environment
}

// Alert mock
global.alert = jest.fn();

// Console mocks for cleaner test output
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (
    args[0]?.includes?.('Animated') ||
    args[0]?.includes?.('useNativeDriver') ||
    args[0]?.includes?.('Non-serializable values were found')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  if (
    args[0]?.includes?.('Warning:') ||
    args[0]?.includes?.('ReactNative')
  ) {
    return;
  }
  originalError.apply(console, args);
};