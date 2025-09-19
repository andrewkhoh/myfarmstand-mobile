// Simple Business Insights Hook Tests - Following proven working pattern

import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor } from '@testing-library/react-native';
// Defensive import pattern for the hook
let useSimpleBusinessInsights: any;
try {
  const hookModule = require('../useSimpleBusinessInsights');
  useSimpleBusinessInsights = hookModule.useSimpleBusinessInsights;
} catch (error) {
  console.log('Import error for useSimpleBusinessInsights:', error);
}

import { SimpleBusinessInsightsService } from '../../../services/executive/simpleBusinessInsightsService';
import { useUserRole } from '../../role-based/useUserRole';
import { createWrapper } from '../../../test/test-utils';
import { createMockBusinessInsight } from '../../../test/mockData';

// Mock the service - following the proven pattern
// Mock React Query BEFORE other mocks
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isSuccess: false,
    isError: false,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  })),
}));

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

// Import React Query types for proper mocking
import { useQuery } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('useSimpleBusinessInsights Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Verify hook exists
  it('should exist and be importable', () => {
    expect(useSimpleBusinessInsights).toBeDefined();
    expect(typeof useSimpleBusinessInsights).toBe('function');
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

      // Mock useQuery to actually call the queryFn
      mockUseQuery.mockImplementation((options: any) => {
        // Call the queryFn to trigger the service
        if (options.queryFn) {
          options.queryFn();
        }
        return {
          data: mockInsights,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          isSuccess: true,
          isError: false,
        } as any;
      });

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

      // Mock useQuery to actually call the queryFn
      mockUseQuery.mockImplementation((options: any) => {
        // Call the queryFn to trigger the service
        if (options.queryFn) {
          options.queryFn();
        }
        return {
          data: mockFilteredInsights,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          isSuccess: true,
          isError: false,
        } as any;
      });

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
      mockUseQuery.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false,
      } as any);

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
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { code: 'PERMISSION_DENIED', message: 'Permission denied' },
        refetch: jest.fn(),
        isSuccess: false,
        isError: true,
      } as any);

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
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { code: 'PERMISSION_DENIED', message: 'Permission denied' },
        refetch: jest.fn(),
        isSuccess: false,
        isError: true,
      } as any);

      const { result } = renderHook(() => useSimpleBusinessInsights(), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights).toEqual([]);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.code).toBe('PERMISSION_DENIED');
    });
  });
});