// Simple Strategic Reporting Hook Tests - Following proven working pattern

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSimpleStrategicReporting } from '../useSimpleStrategicReporting';
import { SimpleStrategicReportingService } from '../../../services/executive/simpleStrategicReportingService';
import { useUserRole } from '../../role-based/useUserRole';
import { createWrapper } from '../../../test/test-utils';

// Mock the service - following the proven pattern
jest.mock('../../../services/executive/simpleStrategicReportingService');
const mockService = SimpleStrategicReportingService as jest.Mocked<typeof SimpleStrategicReportingService>;

// Mock the user role hook - following useCart pattern exactly
jest.mock('../../role-based/useUserRole');
const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>;

// Mock the query key factory - following useCart pattern exactly
jest.mock('../../../utils/queryKeyFactory', () => ({
  executiveAnalyticsKeys: {
    strategicReporting: () => ['executive', 'strategicReporting'],
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

describe('useSimpleStrategicReporting Hook', () => {
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

    it('should fetch strategic reports successfully', async () => {
      const mockReports = {
        reports: [
          {
            id: 'report-1',
            reportType: 'performance' as const,
            title: 'Q1 2024 Performance Report',
            executiveSummary: 'Strong quarterly performance with 15% revenue growth',
            keyMetrics: {
              revenue: {
                current: 125000,
                previous: 108000,
                change: 15.7,
                trend: 'up' as const
              },
              customers: {
                current: 850,
                previous: 780,
                change: 8.9,
                trend: 'up' as const
              }
            },
            recommendations: [
              {
                priority: 'high' as const,
                category: 'Operations',
                action: 'Expand delivery capacity',
                expectedImpact: 'Increase customer satisfaction by 20%',
                timeline: '3 months'
              }
            ],
            charts: [
              {
                type: 'line' as const,
                title: 'Revenue Trend',
                data: [{ month: 'Jan', value: 40000 }, { month: 'Feb', value: 42000 }]
              }
            ],
            generatedAt: '2024-01-15T10:00:00Z',
            reportPeriod: {
              startDate: '2024-01-01',
              endDate: '2024-03-31'
            }
          }
        ],
        summary: {
          totalReports: 1,
          averageMetricChange: 12.3,
          priorityRecommendations: 3,
          reportPeriod: 'Q1 2024',
          generatedAt: '2024-01-15T10:00:00Z'
        }
      };

      mockService.getReports.mockResolvedValue(mockReports);

      const { result } = renderHook(() => useSimpleStrategicReporting(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.reports).toEqual(mockReports.reports);
      expect(result.current.summary).toEqual(mockReports.summary);
      expect(result.current.isSuccess).toBe(true);
      expect(mockService.getReports).toHaveBeenCalled();
    });

    it('should handle strategic reporting with filtering options', async () => {
      const mockFilteredReports = {
        reports: [
          {
            id: 'report-growth-1',
            reportType: 'growth' as const,
            title: 'Growth Analysis Report',
            executiveSummary: 'Focused growth opportunities in emerging markets',
            keyMetrics: {
              marketShare: {
                current: 12.5,
                previous: 10.2,
                change: 22.5,
                trend: 'up' as const
              }
            },
            recommendations: [
              {
                priority: 'high' as const,
                category: 'Marketing',
                action: 'Target emerging demographics',
                expectedImpact: 'Increase market share by 5%',
                timeline: '6 months'
              }
            ],
            charts: [],
            generatedAt: '2024-01-15T10:00:00Z',
            reportPeriod: {
              startDate: '2023-10-01',
              endDate: '2023-12-31'
            }
          }
        ],
        summary: {
          totalReports: 1,
          averageMetricChange: 22.5,
          priorityRecommendations: 1,
          reportPeriod: 'Q4 2023',
          generatedAt: '2024-01-15T10:00:00Z'
        }
      };

      mockService.getReports.mockResolvedValue(mockFilteredReports);

      const { result } = renderHook(
        () => useSimpleStrategicReporting({
          reportType: 'growth',
          period: 'quarterly',
          includeRecommendations: true,
          departments: ['marketing', 'sales']
        }), 
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.reports).toHaveLength(1);
      expect(result.current.reports[0].reportType).toBe('growth');
      expect(mockService.getReports).toHaveBeenCalledWith({
        reportType: 'growth',
        period: 'quarterly',
        includeRecommendations: true,
        departments: ['marketing', 'sales']
      });
    });

    it('should provide query key for external invalidation', () => {
      const { result } = renderHook(() => useSimpleStrategicReporting(), {
        wrapper: createWrapper(),
      });

      expect(result.current.queryKey).toEqual(['executive', 'strategicReporting']);
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
      const { result } = renderHook(() => useSimpleStrategicReporting(), {
        wrapper: createWrapper(),
      });

      expect(result.current.reports).toEqual([]);
      expect(result.current.summary).toBeUndefined();
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
      const { result } = renderHook(() => useSimpleStrategicReporting(), {
        wrapper: createWrapper(),
      });

      expect(result.current.reports).toEqual([]);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.code).toBe('PERMISSION_DENIED');
    });
  });
});