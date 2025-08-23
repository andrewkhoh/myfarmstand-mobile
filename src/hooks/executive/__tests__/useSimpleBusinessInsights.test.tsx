// Simple Business Insights Hook Tests - Following proven working pattern

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSimpleBusinessInsights } from '../useSimpleBusinessInsights';
import { SimpleBusinessInsightsService } from '../../../services/executive/simpleBusinessInsightsService';
import { useUserRole } from '../../role-based/useUserRole';
import { createWrapper } from '../../../test/test-utils';
import { createMockBusinessInsight } from '../../../test/mockData';

// Mock the service - following the proven pattern
jest.mock('../../../services/executive/simpleBusinessInsightsService');
const mockService = SimpleBusinessInsightsService as jest.Mocked<typeof SimpleBusinessInsightsService>;

// Mock the user role hook - following useCart pattern exactly
jest.mock('../../role-based/useUserRole');
const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;

// Mock the query key factory - following useCart pattern exactly
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    businessInsights: () => ['executive', 'businessInsights'],
  },
}));

describe('useSimpleBusinessInsights Hook', () => {
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

    it('should fetch business insights successfully', async () => {
      const mockInsights = {
        insights: [
          createMockBusinessInsight(),
          createMockBusinessInsight({ id: 'insight-2', insightType: 'trend' })
        ],
        metadata: {
          totalInsights: 2,
          averageConfidence: 0.87,
          generatedAt: '2024-01-15T10:00:00Z'
        }
      };

      mockService.getInsights.mockResolvedValue(mockInsights);

      const { result } = renderHook(() => useSimpleBusinessInsights(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.insights).toEqual(mockInsights.insights);
      expect(result.current.metadata).toEqual(mockInsights.metadata);
      expect(result.current.isSuccess).toBe(true);
      expect(mockService.getInsights).toHaveBeenCalled();
    });

    it('should handle insights with filtering options', async () => {
      const mockFilteredInsights = {
        insights: [
          createMockBusinessInsight({ insightType: 'correlation', confidenceScore: 0.95 })
        ],
        metadata: {
          totalInsights: 1,
          averageConfidence: 0.95,
          generatedAt: '2024-01-15T10:00:00Z'
        }
      };

      mockService.getInsights.mockResolvedValue(mockFilteredInsights);

      const { result } = renderHook(
        () => useSimpleBusinessInsights({
          insightType: 'correlation',
          minConfidence: 0.8,
          impactFilter: ['high']
        }), 
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.insights).toHaveLength(1);
      expect(result.current.insights[0].insightType).toBe('correlation');
      expect(mockService.getInsights).toHaveBeenCalledWith({
        insightType: 'correlation',
        minConfidence: 0.8,
        impactFilter: ['high']
      });
    });

    it('should provide query key for external invalidation', () => {
      const { result } = renderHook(() => useSimpleBusinessInsights(), {
        wrapper: createWrapper(),
      });

      expect(result.current.queryKey).toEqual(['executive', 'businessInsights']);
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
      const { result } = renderHook(() => useSimpleBusinessInsights(), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights).toEqual([]);
      expect(result.current.metadata).toBeUndefined();
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
      const { result } = renderHook(() => useSimpleBusinessInsights(), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights).toEqual([]);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.code).toBe('PERMISSION_DENIED');
    });
  });
});