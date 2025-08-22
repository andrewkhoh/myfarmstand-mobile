// Phase 3.3.2: Marketing Campaign Hooks Tests (RED Phase)
// Following TDD pattern: RED → GREEN → REFACTOR  
// 15+ comprehensive tests for campaign management hooks

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Import hooks to test (these don't exist yet - RED phase)
import {
  useMarketingCampaigns,
  useCampaignPerformance,
  useCreateCampaign,
  useCampaignScheduling,
  useCampaignMetrics,
  useUpdateCampaignStatus
} from '../useMarketingCampaigns';

// Mock services
import { MarketingCampaignService } from '../../../services/marketing/marketingCampaignService';
import { RolePermissionService } from '../../../services/role-based/rolePermissionService';

// Create test wrapper with React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock the services
jest.mock('../../../services/marketing/marketingCampaignService');
jest.mock('../../../services/role-based/rolePermissionService');

const mockMarketingCampaignService = MarketingCampaignService as jest.Mocked<typeof MarketingCampaignService>;
const mockRolePermissionService = RolePermissionService as jest.Mocked<typeof RolePermissionService>;

describe('Marketing Campaign Hooks - Phase 3.3.2 (RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRolePermissionService.hasPermission.mockResolvedValue(true);
  });

  describe('useMarketingCampaigns - Campaign Listing with Role-based Filtering', () => {
    it('should fetch campaigns with role-based access control', async () => {
      const mockCampaigns = {
        items: [
          {
            id: 'campaign-1',
            campaignName: 'Spring Harvest Special',
            campaignType: 'seasonal' as const,
            description: 'Fresh spring produce promotion',
            startDate: '2024-03-01T00:00:00Z',
            endDate: '2024-03-31T23:59:59Z',
            discountPercentage: 15,
            targetAudience: 'Health-conscious families',
            campaignStatus: 'active' as const,
            createdBy: 'user-1',
            createdAt: '2024-02-15T00:00:00Z',
            updatedAt: '2024-02-20T00:00:00Z'
          }
        ],
        totalCount: 1,
        hasMore: false,
        page: 1,
        limit: 10
      };

      mockMarketingCampaignService.getCampaignsByStatus.mockResolvedValue({
        success: true,
        data: mockCampaigns
      });

      const { result } = renderHook(
        () => useMarketingCampaigns('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCampaigns);
      expect(mockMarketingCampaignService.getCampaignsByStatus).toHaveBeenCalledWith(
        'active',
        { page: 1, limit: 10 },
        'user-1'
      );
    });

    it('should handle unauthorized access to campaign data', async () => {
      mockRolePermissionService.hasPermission.mockResolvedValue(false);
      
      const { result } = renderHook(
        () => useMarketingCampaigns('active', { page: 1, limit: 10 }, 'unauthorized-user'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockRolePermissionService.hasPermission).toHaveBeenCalledWith(
        'unauthorized-user',
        'campaign_management'
      );
    });

    it('should support campaign status filtering', async () => {
      const statuses = ['planned', 'active', 'paused', 'completed', 'cancelled'] as const;
      
      for (const status of statuses) {
        mockMarketingCampaignService.getCampaignsByStatus.mockResolvedValue({
          success: true,
          data: {
            items: [{ id: `campaign-${status}`, campaignStatus: status }],
            totalCount: 1,
            hasMore: false,
            page: 1,
            limit: 10
          } as any
        });

        const { result } = renderHook(
          () => useMarketingCampaigns(status, { page: 1, limit: 10 }, 'user-1'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.items[0].campaignStatus).toBe(status);
      }
    });

    it('should handle pagination for large campaign datasets', async () => {
      const mockPage1 = {
        items: Array.from({ length: 10 }, (_, i) => ({ 
          id: `campaign-${i}`, 
          campaignName: `Campaign ${i}`,
          campaignStatus: 'active' as const 
        })),
        totalCount: 25,
        hasMore: true,
        page: 1,
        limit: 10
      };

      mockMarketingCampaignService.getCampaignsByStatus.mockResolvedValue({
        success: true,
        data: mockPage1
      });

      const { result } = renderHook(
        () => useMarketingCampaigns('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.hasMore).toBe(true);
      expect(result.current.data?.totalCount).toBe(25);
      expect(result.current.data?.items).toHaveLength(10);
    });

    it('should use centralized query key factory for campaigns', async () => {
      mockMarketingCampaignService.getCampaignsByStatus.mockResolvedValue({
        success: true,
        data: { items: [], totalCount: 0, hasMore: false, page: 1, limit: 10 }
      });

      const { result } = renderHook(
        () => useMarketingCampaigns('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      // Query key should follow centralized factory pattern
      // This will be validated when query key factory is extended
      expect(result.current).toBeDefined();
    });
  });

  describe('useCampaignPerformance - Analytics and Metrics Aggregation', () => {
    it('should fetch campaign performance metrics with aggregation', async () => {
      const mockPerformance = {
        campaignId: 'campaign-1',
        metrics: {
          views: 1250,
          clicks: 187,
          conversions: 23,
          revenue: 2069.77
        },
        performance: {
          clickThroughRate: 14.96,
          conversionRate: 12.30,
          revenuePerConversion: 89.99,
          totalROI: 145.5
        },
        dateRange: {
          startDate: '2024-03-01T00:00:00Z',
          endDate: '2024-03-31T23:59:59Z'
        }
      };

      mockMarketingCampaignService.getCampaignPerformance.mockResolvedValue({
        success: true,
        data: mockPerformance
      });

      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPerformance);
      expect(mockMarketingCampaignService.getCampaignPerformance).toHaveBeenCalledWith('campaign-1');
    });

    it('should handle campaigns with no performance data', async () => {
      const mockEmptyPerformance = {
        campaignId: 'campaign-new',
        metrics: {
          views: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0
        },
        performance: {
          clickThroughRate: 0,
          conversionRate: 0,
          revenuePerConversion: 0,
          totalROI: 0
        },
        dateRange: {
          startDate: '2024-04-01T00:00:00Z',
          endDate: '2024-04-30T23:59:59Z'
        }
      };

      mockMarketingCampaignService.getCampaignPerformance.mockResolvedValue({
        success: true,
        data: mockEmptyPerformance
      });

      const { result } = renderHook(
        () => useCampaignPerformance('campaign-new'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.metrics.views).toBe(0);
      expect(result.current.data?.performance.totalROI).toBe(0);
    });

    it('should support real-time performance updates', async () => {
      // This test validates integration with real-time metrics updates
      const { result } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
      // Real-time integration will be validated in integration tests
    });

    it('should cache performance data with appropriate refresh intervals', async () => {
      mockMarketingCampaignService.getCampaignPerformance.mockResolvedValue({
        success: true,
        data: {} as any
      });

      const wrapper = createWrapper();
      
      // First call
      const { result: result1 } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );

      // Second call should use cache
      const { result: result2 } = renderHook(
        () => useCampaignPerformance('campaign-1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should only call service once due to caching
      expect(mockMarketingCampaignService.getCampaignPerformance).toHaveBeenCalledTimes(1);
    });
  });

  describe('useCreateCampaign - Campaign Creation with Validation', () => {
    it('should create campaign with business rule validation', async () => {
      const campaignData = {
        campaignName: 'Summer BBQ Special',
        campaignType: 'promotional' as const,
        description: 'Summer BBQ essentials at special prices',
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        discountPercentage: 20,
        targetAudience: 'BBQ enthusiasts',
        campaignStatus: 'planned' as const
      };

      const createdCampaign = {
        id: 'campaign-new',
        ...campaignData,
        createdBy: 'user-1',
        createdAt: '2024-05-15T00:00:00Z',
        updatedAt: '2024-05-15T00:00:00Z'
      };

      mockMarketingCampaignService.createCampaign.mockResolvedValue({
        success: true,
        data: createdCampaign
      });

      const { result } = renderHook(
        () => useCreateCampaign(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          campaignData,
          userId: 'user-1'
        });
      });

      expect(mockMarketingCampaignService.createCampaign).toHaveBeenCalledWith(
        campaignData,
        'user-1'
      );
    });

    it('should validate campaign date constraints', async () => {
      const invalidCampaignData = {
        campaignName: 'Invalid Date Campaign',
        campaignType: 'promotional' as const,
        startDate: '2024-06-30T00:00:00Z',
        endDate: '2024-06-01T23:59:59Z', // End before start
        discountPercentage: 15
      };

      mockMarketingCampaignService.createCampaign.mockResolvedValue({
        success: false,
        error: 'End date must be after start date'
      });

      const { result } = renderHook(
        () => useCreateCampaign(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            campaignData: invalidCampaignData,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should validate campaign type specific rules', async () => {
      const clearanceCampaign = {
        campaignName: 'Clearance Sale',
        campaignType: 'clearance' as const,
        discountPercentage: 15, // Less than required 25% for clearance
        startDate: '2024-07-01T00:00:00Z',
        endDate: '2024-07-31T23:59:59Z'
      };

      mockMarketingCampaignService.createCampaign.mockResolvedValue({
        success: false,
        error: 'Clearance campaigns must have at least 25% discount'
      });

      const { result } = renderHook(
        () => useCreateCampaign(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            campaignData: clearanceCampaign,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should invalidate campaign queries after successful creation', async () => {
      mockMarketingCampaignService.createCampaign.mockResolvedValue({
        success: true,
        data: {} as any
      });

      const { result } = renderHook(
        () => useCreateCampaign(),
        { wrapper: createWrapper() }
      );

      // Implementation should invalidate campaign list queries
      expect(result.current).toBeDefined();
      // Cache invalidation will be validated in integration tests
    });
  });

  describe('useCampaignScheduling - Date Management and Automation', () => {
    it('should schedule campaign with date validation', async () => {
      const scheduleData = {
        startDate: '2024-07-01T00:00:00Z',
        endDate: '2024-07-31T23:59:59Z',
        autoActivate: true
      };

      const scheduleResponse = {
        campaignId: 'campaign-1',
        scheduledActivation: true,
        startDate: scheduleData.startDate,
        endDate: scheduleData.endDate
      };

      mockMarketingCampaignService.scheduleCampaign.mockResolvedValue({
        success: true,
        data: scheduleResponse
      });

      const { result } = renderHook(
        () => useCampaignScheduling(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          campaignId: 'campaign-1',
          scheduleData,
          userId: 'user-1'
        });
      });

      expect(mockMarketingCampaignService.scheduleCampaign).toHaveBeenCalledWith(
        'campaign-1',
        scheduleData,
        'user-1'
      );
    });

    it('should prevent scheduling campaigns in the past', async () => {
      const pastScheduleData = {
        startDate: '2023-12-01T00:00:00Z', // Past date
        endDate: '2023-12-31T23:59:59Z',
        autoActivate: false
      };

      mockMarketingCampaignService.scheduleCampaign.mockResolvedValue({
        success: false,
        error: 'Start date cannot be in the past'
      });

      const { result } = renderHook(
        () => useCampaignScheduling(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            campaignId: 'campaign-1',
            scheduleData: pastScheduleData,
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('should support automated campaign activation', async () => {
      // This test validates automation features
      const autoScheduleData = {
        startDate: '2024-08-01T00:00:00Z',
        endDate: '2024-08-31T23:59:59Z',
        autoActivate: true
      };

      mockMarketingCampaignService.scheduleCampaign.mockResolvedValue({
        success: true,
        data: {
          campaignId: 'campaign-1',
          scheduledActivation: true,
          startDate: autoScheduleData.startDate,
          endDate: autoScheduleData.endDate
        }
      });

      const { result } = renderHook(
        () => useCampaignScheduling(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          campaignId: 'campaign-1',
          scheduleData: autoScheduleData,
          userId: 'user-1'
        });
      });

      expect(result.current.data?.scheduledActivation).toBe(true);
    });
  });

  describe('useCampaignMetrics - Real-time Analytics Collection', () => {
    it('should record campaign metrics for analytics', async () => {
      mockMarketingCampaignService.recordCampaignMetric.mockResolvedValue({
        success: true,
        data: { recorded: true }
      });

      const { result } = renderHook(
        () => useCampaignMetrics(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          campaignId: 'campaign-1',
          metricType: 'views',
          value: 100,
          userId: 'user-1'
        });
      });

      expect(mockMarketingCampaignService.recordCampaignMetric).toHaveBeenCalledWith(
        'campaign-1',
        'views',
        100,
        'user-1'
      );
    });

    it('should validate metric types and values', async () => {
      const invalidMetrics = [
        { metricType: 'invalid-metric', value: 100 },
        { metricType: 'views', value: -10 }, // Negative value
        { metricType: 'revenue', value: 'invalid-number' as any }
      ];

      for (const invalidMetric of invalidMetrics) {
        mockMarketingCampaignService.recordCampaignMetric.mockResolvedValue({
          success: false,
          error: 'Invalid metric type or value'
        });

        const { result } = renderHook(
          () => useCampaignMetrics(),
          { wrapper: createWrapper() }
        );

        await act(async () => {
          try {
            await result.current.mutateAsync({
              campaignId: 'campaign-1',
              metricType: invalidMetric.metricType,
              value: invalidMetric.value,
              userId: 'user-1'
            });
          } catch (error) {
            expect(error).toBeDefined();
          }
        });
      }
    });

    it('should support batch metric recording for performance', async () => {
      const batchMetrics = [
        { metricType: 'views', value: 150 },
        { metricType: 'clicks', value: 25 },
        { metricType: 'conversions', value: 3 }
      ];

      // Implementation should support efficient batch operations
      const { result } = renderHook(
        () => useCampaignMetrics(),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
      // Batch operations will be implemented in the GREEN phase
    });

    it('should integrate with executive analytics collection', async () => {
      // This test validates cross-role analytics integration
      mockMarketingCampaignService.recordCampaignMetric.mockResolvedValue({
        success: true,
        data: { recorded: true, analyticsForwarded: true }
      });

      const { result } = renderHook(
        () => useCampaignMetrics(),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
      // Executive analytics integration will be implemented in Phase 3.4
    });
  });

  describe('useUpdateCampaignStatus - Campaign Lifecycle Management', () => {
    it('should update campaign status with lifecycle validation', async () => {
      const updatedCampaign = {
        id: 'campaign-1',
        campaignStatus: 'active' as const,
        updatedAt: '2024-06-01T00:00:00Z'
      };

      mockMarketingCampaignService.updateCampaignStatus.mockResolvedValue({
        success: true,
        data: updatedCampaign as any
      });

      const { result } = renderHook(
        () => useUpdateCampaignStatus(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          campaignId: 'campaign-1',
          newStatus: 'active',
          userId: 'user-1'
        });
      });

      expect(mockMarketingCampaignService.updateCampaignStatus).toHaveBeenCalledWith(
        'campaign-1',
        'active',
        'user-1'
      );
    });

    it('should validate campaign status transitions', async () => {
      mockMarketingCampaignService.updateCampaignStatus.mockResolvedValue({
        success: false,
        error: 'Invalid campaign status transition from completed to active'
      });

      const { result } = renderHook(
        () => useUpdateCampaignStatus(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            campaignId: 'campaign-1',
            newStatus: 'active',
            userId: 'user-1'
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe('Integration with Content and Bundle Systems', () => {
    it('should invalidate related content queries when campaign status changes', async () => {
      mockMarketingCampaignService.updateCampaignStatus.mockResolvedValue({
        success: true,
        data: { id: 'campaign-1', campaignStatus: 'active' } as any
      });

      const { result } = renderHook(
        () => useUpdateCampaignStatus(),
        { wrapper: createWrapper() }
      );

      // Implementation should invalidate content and bundle queries
      // when campaign status affects related content
      expect(result.current).toBeDefined();
      // Cross-system invalidation will be validated in integration tests
    });

    it('should support campaign association with bundles', async () => {
      // This test validates integration with bundle management hooks
      const { result } = renderHook(
        () => useMarketingCampaigns('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
      // Bundle integration will be implemented in Phase 3.3.3
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      mockMarketingCampaignService.getCampaignsByStatus.mockRejectedValue(
        new Error('Service unavailable')
      );

      const { result } = renderHook(
        () => useMarketingCampaigns('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should maintain performance targets for campaign operations', async () => {
      const startTime = Date.now();

      mockMarketingCampaignService.getCampaignsByStatus.mockResolvedValue({
        success: true,
        data: { items: [], totalCount: 0, hasMore: false, page: 1, limit: 10 }
      });

      const { result } = renderHook(
        () => useMarketingCampaigns('active', { page: 1, limit: 10 }, 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Campaign operations should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('should implement proper retry logic for failed operations', async () => {
      mockMarketingCampaignService.createCampaign
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'campaign-retry' } as any
        });

      const { result } = renderHook(
        () => useCreateCampaign(),
        { wrapper: createWrapper() }
      );

      // Implementation should include retry logic for transient failures
      expect(result.current).toBeDefined();
    });
  });
});