// Business Metrics Hook Tests - Following useCart patterns exactly
// Clean implementation demonstrating proper executive hook testing

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useBusinessMetrics } from '../useBusinessMetrics';
import { SimpleBusinessMetricsService } from '../../../services/executive/simpleBusinessMetricsService';
import { useUserRole } from '../../role-based/useUserRole';
import { createWrapper } from '../../../test/test-utils';

// Mock the service - following useCart pattern exactly  
jest.mock('../../../services/executive/simpleBusinessMetricsService');
const mockService = SimpleBusinessMetricsService as jest.Mocked<typeof SimpleBusinessMetricsService>;

// Mock the user role hook - following useCart pattern exactly
jest.mock('../../role-based/useUserRole');
const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;

// Mock the query key factory - following useCart pattern exactly
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    businessMetrics: () => ['executive', 'businessMetrics'],
  },
}));

// Mock broadcast factory - following proven pattern
jest.mock('../../../utils/broadcastFactory', () => {
  const mockBroadcastHelper = {
    send: jest.fn(),
    getAuthorizedChannelNames: jest.fn(() => ['test-channel'])
  };
  
  return {
    createBroadcastHelper: jest.fn(() => mockBroadcastHelper),
    executiveBroadcast: mockBroadcastHelper,
    realtimeBroadcast: mockBroadcastHelper,
  };
});

describe('useBusinessMetrics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user has executive role', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: 'executive',
        hasPermission: jest.fn().mockResolvedValue(true)
      } as any);
    });

    it('should fetch business metrics successfully', async () => {
      const mockMetrics = {
        totalRevenue: 125000,
        customerCount: 850,
        orderCount: 420,
        averageOrderValue: 297.62,
        topSellingProducts: ['Product A', 'Product B'],
        generatedAt: '2024-01-15T10:00:00Z'
      };

      mockService.getMetrics.mockResolvedValue(mockMetrics);

      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metrics).toEqual(mockMetrics);
      expect(result.current.isSuccess).toBe(true);
      expect(mockService.getMetrics).toHaveBeenCalled();
    });

    it('should handle metrics with options', async () => {
      const mockFilteredMetrics = {
        totalRevenue: 45000,
        customerCount: 320,
        orderCount: 150,
        averageOrderValue: 300.00,
        topSellingProducts: ['Seasonal Product'],
        generatedAt: '2024-01-15T10:00:00Z'
      };

      mockService.getMetrics.mockResolvedValue(mockFilteredMetrics);

      const { result } = renderHook(
        () => useBusinessMetrics({
          dateRange: '2024-01-01,2024-01-31',
          category: 'revenue'
        }), 
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.metrics).toEqual(mockFilteredMetrics);
      expect(mockService.getMetrics).toHaveBeenCalledWith({
        dateRange: '2024-01-01,2024-01-31',
        category: 'revenue'
      });
    });

    it('should provide query key for external invalidation', () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper(),
      });

      expect(result.current.queryKey).toEqual(['executive', 'businessMetrics']);
    });
  });

  describe('when user lacks executive role', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: 'staff',
        hasPermission: jest.fn().mockResolvedValue(false)
      } as any);
    });

    it('should return permission denied error', () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper(),
      });

      expect(result.current.metrics).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.code).toBe('PERMISSION_DENIED');
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({
        role: null,
        hasPermission: jest.fn().mockResolvedValue(false)
      } as any);
    });

    it('should return permission denied error', () => {
      const { result } = renderHook(() => useBusinessMetrics(), {
        wrapper: createWrapper(),
      });

      expect(result.current.metrics).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.code).toBe('PERMISSION_DENIED');
    });
  });
});