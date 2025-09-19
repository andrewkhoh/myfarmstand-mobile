/**
 * Decision Support Integration Test
 * Testing role-based access control and architectural compliance
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import {
  useGenerateRecommendations,
  useLearningMetrics,
  useStockoutRisk
} from '../hooks/useDecisionSupport';
import type { ExecutiveData } from '../schemas';

// Mock the auth and permissions hooks
jest.mock('../../useAuth', () => ({
  useCurrentUser: jest.fn()
}));

jest.mock('../../role-based/permissions', () => ({
  useCurrentUserHasPermission: jest.fn()
}));

// Mock the ValidationMonitor
jest.mock('../../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordPatternSuccess: jest.fn(),
    recordValidationError: jest.fn()
  }
}));

const { useCurrentUser } = require('../../useAuth');
const { useCurrentUserHasPermission } = require('../../role-based/permissions');

// Test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

// Sample executive data for testing
const sampleExecutiveData: ExecutiveData = {
  inventory: {
    currentStock: 100,
    dailyDemand: 20,
    leadTime: 7,
    products: [
      {
        id: 'product-1',
        stock: 50,
        demandRate: 10,
        leadTime: 5
      }
    ]
  },
  marketing: {
    campaigns: [
      {
        id: 'campaign-1',
        budget: 1000,
        revenue: 2500
      }
    ]
  },
  operations: {
    efficiency: 0.75,
    actualOutput: 850,
    maxOutput: 1000
  }
};

describe('Decision Support Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGenerateRecommendations', () => {
    test('should deny access for unauthenticated users', async () => {
      // Mock unauthenticated user
      useCurrentUser.mockReturnValue({ data: null });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: false,
        isLoading: false
      });

      const { result } = renderHook(
        () => useGenerateRecommendations(sampleExecutiveData),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.error && 'code' in result.current.error && result.current.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(result.current.error && 'userMessage' in result.current.error && result.current.error.userMessage).toContain('executive permissions');
      expect(result.current.recommendations).toEqual([]);
    });

    test('should deny access for users without executive permissions', async () => {
      // Mock authenticated user without executive permissions
      useCurrentUser.mockReturnValue({
        data: { id: 'user-1', role: 'inventory_staff' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: false,
        isLoading: false
      });

      const { result } = renderHook(
        () => useGenerateRecommendations(sampleExecutiveData),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.error && 'code' in result.current.error && result.current.error.code).toBe('PERMISSION_DENIED');
      expect(result.current.error && 'userMessage' in result.current.error && result.current.error.userMessage).toContain('executive permissions');
    });

    test('should allow access for users with executive permissions', async () => {
      // Mock executive user
      useCurrentUser.mockReturnValue({
        data: { id: 'exec-1', role: 'executive' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: true,
        isLoading: false
      });

      const { result } = renderHook(
        () => useGenerateRecommendations(sampleExecutiveData),
        { wrapper: createTestWrapper() }
      );

      // Should not have authentication/permission errors
      expect(result.current.error && 'code' in result.current.error ? result.current.error.code : null).not.toBe('AUTHENTICATION_REQUIRED');
      expect(result.current.error && 'code' in result.current.error ? result.current.error.code : null).not.toBe('PERMISSION_DENIED');
    });

    test('should handle loading state for permissions', async () => {
      // Mock loading permissions
      useCurrentUser.mockReturnValue({
        data: { id: 'user-1', role: 'executive' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: false,
        isLoading: true
      });

      const { result } = renderHook(
        () => useGenerateRecommendations(sampleExecutiveData),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.error && 'code' in result.current.error && result.current.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('useLearningMetrics', () => {
    test('should deny access for users without executive permissions', async () => {
      useCurrentUser.mockReturnValue({
        data: { id: 'user-1', role: 'inventory_staff' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: false,
        isLoading: false
      });

      const { result } = renderHook(
        () => useLearningMetrics(),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.error && 'code' in result.current.error && result.current.error.code).toBe('PERMISSION_DENIED');
      expect(result.current.metrics).toBe(null);
    });

    test('should allow access for executive users', async () => {
      useCurrentUser.mockReturnValue({
        data: { id: 'exec-1', role: 'executive' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: true,
        isLoading: false
      });

      const { result } = renderHook(
        () => useLearningMetrics(),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.error && 'code' in result.current.error ? result.current.error.code : null).not.toBe('PERMISSION_DENIED');
      expect(result.current.error && 'code' in result.current.error ? result.current.error.code : null).not.toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('useStockoutRisk', () => {
    test('should deny access for users without inventory permissions', async () => {
      useCurrentUser.mockReturnValue({
        data: { id: 'user-1', role: 'marketing_staff' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: false,
        isLoading: false
      });

      const { result } = renderHook(
        () => useStockoutRisk(sampleExecutiveData.inventory),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.error && 'code' in result.current.error && result.current.error.code).toBe('PERMISSION_DENIED');
      expect(result.current.risk).toBe(null);
    });

    test('should allow access for users with inventory permissions', async () => {
      useCurrentUser.mockReturnValue({
        data: { id: 'inv-1', role: 'inventory_staff' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: true,
        isLoading: false
      });

      const { result } = renderHook(
        () => useStockoutRisk(sampleExecutiveData.inventory),
        { wrapper: createTestWrapper() }
      );

      expect(result.current.error && 'code' in result.current.error ? result.current.error.code : null).not.toBe('PERMISSION_DENIED');
      expect(result.current.error && 'code' in result.current.error ? result.current.error.code : null).not.toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('Query Key Integration', () => {
    test('should use centralized query keys', async () => {
      useCurrentUser.mockReturnValue({
        data: { id: 'exec-1', role: 'executive' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: true,
        isLoading: false
      });

      const { result } = renderHook(
        () => useGenerateRecommendations(sampleExecutiveData),
        { wrapper: createTestWrapper() }
      );

      // Verify query key follows centralized pattern
      expect(result.current.queryKey).toEqual(
        expect.arrayContaining(['decision-support', 'exec-1'])
      );
    });
  });

  describe('Graceful Degradation', () => {
    test('should provide fallback data for learning metrics errors', async () => {
      useCurrentUser.mockReturnValue({
        data: { id: 'exec-1', role: 'executive' }
      });
      useCurrentUserHasPermission.mockReturnValue({
        hasPermission: true,
        isLoading: false
      });

      // Mock service to simulate error but graceful degradation
      const mockDecisionSupportService = require('../services/decisionSupportService');
      jest.spyOn(mockDecisionSupportService.decisionSupportService, 'getLearningMetrics')
        .mockResolvedValue({
          success: false,
          error: new Error('Service unavailable'),
          message: 'Service error'
        });

      const { result } = renderHook(
        () => useLearningMetrics(),
        { wrapper: createTestWrapper() }
      );

      await waitFor(() => {
        // Should not error out completely - graceful degradation
        expect(result.current.isError).toBe(false);
      });
    });
  });
});

describe('Architectural Compliance', () => {
  test('should follow schema validation patterns', async () => {
    // Test that invalid data is properly validated
    const { validateExecutiveData, validateRecommendationOptions } = require('../schemas');

    // Valid data should pass
    expect(() => validateExecutiveData(sampleExecutiveData)).not.toThrow();

    // Invalid data should throw with user-friendly error
    expect(() => validateExecutiveData({ invalid: 'data' })).toThrow();

    // Valid options should pass
    expect(() => validateRecommendationOptions({ minConfidence: 0.7 })).not.toThrow();

    // Invalid options should throw
    expect(() => validateRecommendationOptions({ minConfidence: 2.0 })).toThrow();
  });

  test('should integrate with ValidationMonitor', async () => {
    const { ValidationMonitor } = require('../../../utils/validationMonitor');
    const { decisionSupportService } = require('../services/decisionSupportService');

    // Test that service operations record validation patterns
    await decisionSupportService.generateRecommendations(sampleExecutiveData, {});

    expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'DecisionSupportService',
        pattern: 'schema_validation_pipeline',
        operation: 'generateRecommendations'
      })
    );
  });

  test('should provide user-friendly error messages', async () => {
    const { decisionSupportService } = require('../services/decisionSupportService');

    // Test that errors have both technical and user messages
    const result = await decisionSupportService.generateRecommendations(null);

    expect(result.success).toBe(false);
    expect(result.error).toHaveProperty('code');
    expect(result.error).toHaveProperty('message'); // Technical message
    expect(result.error).toHaveProperty('userMessage'); // User-friendly message
    expect(result.error).toHaveProperty('timestamp');
  });
});