/**
 * Real Database Setup for Phase 2.2 Service Testing
 * This setup connects to the actual Supabase database instead of using mocks
 */

// Mock expo-constants to use environment variables
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      }
    }
  }
}));

// Mock only non-database utilities
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// DO NOT mock supabase - we want real database connection
// Mock ValidationMonitor for test assertions
jest.mock('../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn(),
  }
}));

// Set longer timeout for real database operations
jest.setTimeout(30000);

// Ensure environment variables are loaded
require('dotenv').config();