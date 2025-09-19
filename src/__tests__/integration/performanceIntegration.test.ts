// Phase 3.4.4: Performance Integration Tests (RED Phase)
// Following TDD pattern: RED → GREEN → REFACTOR
// 8+ comprehensive tests for performance validation across marketing operations

import { QueryClient } from '@tanstack/react-query';
import { MarketingCampaignService } from '../../services/marketing/marketingCampaignService';
import { ProductBundleService } from '../../services/marketing/productBundleService';
import { ProductContentService } from '../../services/marketing/productContentService';
import { InventoryService } from '../../services/inventory/inventoryService';
import { BusinessMetricsService } from '../../services/executive/businessMetricsService';
import { createRobustInvalidation } from '../../utils/queryKeyFactory';
import { ValidationMonitor } from '../../utils/validationMonitor';

// Performance testing utilities
class PerformanceTracker {
  private startTime: number = 0;
  private metrics: Array<{ operation: string; duration: number; memoryUsage: number }> = [];

  start(operation: string) {
    this.startTime = Date.now();
    return operation;
  }

  end(operation: string) {
    const duration = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage().heapUsed;
    this.metrics.push({ operation, duration, memoryUsage });
    return { duration, memoryUsage };
  }

  getMetrics() {
    return this.metrics;
  }

  reset() {
    this.metrics = [];
  }
}

// Mock services for performance testing
jest.mock('../../services/inventory/inventoryService');
jest.mock('../../services/executive/businessMetricsService');
jest.mock('../../utils/validationMonitor');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;
const mockBusinessMetricsService = BusinessMetricsService as jest.Mocked<typeof BusinessMetricsService>;
const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

describe('Performance Integration - Phase 3.4.4 (RED Phase)', () => {
  let queryClient: QueryClient;
  let invalidationHelper: ReturnType<typeof createRobustInvalidation>;
  let performanceTracker: PerformanceTracker;
  
  const testUserId = 'perf-test-user-123';

  beforeAll(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0
        }
      }
    });
    invalidationHelper = createRobustInvalidation(queryClient);
    performanceTracker = new PerformanceTracker();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    performanceTracker.reset();
    queryClient.clear();
    
    // Mock successful responses for performance testing
    mockValidationMonitor.recordPatternSuccess.mockImplementation(() => {});
    mockValidationMonitor.recordValidationError.mockImplementation(() => {});
  });

  describe('Large Content Dataset Handling Across All Layers', () => {
    test('should handle large content queries efficiently', async () => {
      // This test will fail until large dataset optimization is implemented
      
      const operation = performanceTracker.start('large_content_query');

      // Mock large dataset response
      const largeContentDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `content-${i}`,
        title: `Content Item ${i}`,
        description: `Description for content item ${i}`,
        imageUrl: `https://example.com/image-${i}.jpg`,
        videoUrl: null,
        contentStatus: i % 4 === 0 ? 'published' : 'draft',
        publishedDate: i % 4 === 0 ? new Date().toISOString() : null,
        priority: (i % 5) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByUserId: testUserId
      }));

      // Test service layer performance
      const serviceResult = await ProductContentService.getContentWithPerformanceOptimization(
        {
          status: 'published',
          pagination: { page: 1, limit: 100 },
          includeMetrics: true,
          enableCaching: true
        },
        testUserId
      );

      const serviceMetrics = performanceTracker.end(operation);

      expect(serviceResult.success).toBe(true);
      expect(serviceResult?.data?.items.length).toBeLessThanOrEqual(100);
      expect(serviceResult?.data?.performanceMetrics).toBeTruthy();

      // Performance assertions
      expect(serviceMetrics.duration).toBeLessThan(2000); // Under 2 seconds
      expect(serviceMetrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Under 50MB

      // Test query caching efficiency
      const cacheOperation = performanceTracker.start('cache_efficiency');
      
      const cachedResult = await ProductContentService.getContentWithPerformanceOptimization(
        {
          status: 'published',
          pagination: { page: 1, limit: 100 },
          includeMetrics: true,
          enableCaching: true
        },
        testUserId
      );

      const cacheMetrics = performanceTracker.end(cacheOperation);

      expect(cachedResult.success).toBe(true);
      expect(cacheMetrics.duration).toBeLessThan(100); // Cache hit should be under 100ms
    });

    test('should optimize content transformation performance', async () => {
      const operation = performanceTracker.start('content_transformation');

      // Test transformation of large dataset
      const rawContentData = Array.from({ length: 500 }, (_, i) => ({
        id: `raw-content-${i}`,
        title: `Raw Content ${i}`,
        content_status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by_user_id: testUserId
      }));

      const transformationResult = await ProductContentService.transformContentBatch(
        rawContentData,
        { 
          enableParallelProcessing: true,
          batchSize: 50,
          optimizeMemoryUsage: true
        }
      );

      const transformMetrics = performanceTracker.end(operation);

      expect(transformationResult.success).toBe(true);
      expect(transformationResult?.data?.transformedCount).toBe(500);
      expect(transformationResult?.data?.failedCount).toBe(0);

      // Performance assertions
      expect(transformMetrics.duration).toBeLessThan(3000); // Under 3 seconds for 500 items
      expect(transformationResult?.data?.averageTransformTime).toBeLessThan(10); // Under 10ms per item
    });

    test('should handle concurrent content operations efficiently', async () => {
      // Test concurrent operations performance
      const concurrentOperations = Array.from({ length: 20 }, (_, i) => ({
        operation: `concurrent_content_${i}`,
        data: {
          title: `Concurrent Content ${i}`,
          description: `Performance test content ${i}`,
          priority: (i % 5) + 1
        }
      }));

      const operation = performanceTracker.start('concurrent_content_ops');

      const concurrentResults = await Promise.all(
        concurrentOperations.map(op => 
          ProductContentService.createProductContentWithPerformanceTracking(
            op.data,
            testUserId,
            { trackMetrics: true }
          )
        )
      );

      const concurrentMetrics = performanceTracker.end(operation);

      const successCount = concurrentResults.filter(r => r.success).length;
      expect(successCount).toBe(20);
      expect(concurrentMetrics.duration).toBeLessThan(5000); // Under 5 seconds for 20 operations

      // Check for performance degradation
      const averageOperationTime = concurrentMetrics.duration / 20;
      expect(averageOperationTime).toBeLessThan(250); // Under 250ms per operation on average
    });
  });

  describe('File Upload Performance with Progress Tracking', () => {
    test('should optimize large file upload performance', async () => {
      // Test will fail until file upload optimization is implemented
      
      const operation = performanceTracker.start('large_file_upload');

      // Mock large file data
      const largeFileData = {
        name: 'large-content-image.jpg',
        size: 10 * 1024 * 1024, // 10MB
        type: 'image/jpeg',
        buffer: Buffer.alloc(10 * 1024 * 1024, 'test-data')
      };

      const progressUpdates: Array<{ percentage: number; timestamp: number }> = [];
      const progressCallback = (progress: { percentage: number }) => {
        progressUpdates.push({
          percentage: progress.percentage,
          timestamp: Date.now()
        });
      };

      const uploadResult = await ProductContentService.uploadLargeContentFileWithOptimization(
        'content-123',
        largeFileData,
        testUserId,
        {
          progressCallback,
          chunkSize: 1024 * 1024, // 1MB chunks
          enableCompression: true,
          maxRetries: 3
        }
      );

      const uploadMetrics = performanceTracker.end(operation);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult?.data?.fileUrl).toBeTruthy();
      expect(uploadResult?.data?.compressionRatio).toBeGreaterThan(0);

      // Performance assertions
      expect(uploadMetrics.duration).toBeLessThan(15000); // Under 15 seconds for 10MB
      expect(progressUpdates.length).toBeGreaterThan(5); // Multiple progress updates
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);

      // Check upload speed
      const uploadSpeedMBps = largeFileData.size / (uploadMetrics.duration / 1000) / (1024 * 1024);
      expect(uploadSpeedMBps).toBeGreaterThan(0.5); // At least 0.5 MB/s
    });

    test('should handle multiple file uploads concurrently', async () => {
      const operation = performanceTracker.start('concurrent_file_uploads');

      // Multiple smaller files
      const fileUploads = Array.from({ length: 5 }, (_, i) => ({
        contentId: `content-upload-${i}`,
        fileData: {
          name: `file-${i}.jpg`,
          size: 2 * 1024 * 1024, // 2MB each
          type: 'image/jpeg',
          buffer: Buffer.alloc(2 * 1024 * 1024, `test-data-${i}`)
        }
      }));

      const uploadResults = await Promise.all(
        fileUploads.map(upload => 
          ProductContentService.uploadContentFileWithThrottling(
            upload.contentId,
            upload.fileData,
            testUserId,
            { maxConcurrentUploads: 3 }
          )
        )
      );

      const uploadMetrics = performanceTracker.end(operation);

      const successCount = uploadResults.filter(r => r.success).length;
      expect(successCount).toBe(5);
      expect(uploadMetrics.duration).toBeLessThan(20000); // Under 20 seconds for 5x2MB files

      // Verify throttling worked (not all uploads at once)
      const totalSize = 5 * 2 * 1024 * 1024; // 10MB total
      const uploadSpeedMBps = totalSize / (uploadMetrics.duration / 1000) / (1024 * 1024);
      expect(uploadSpeedMBps).toBeLessThan(2.0); // Throttled to reasonable speed
    });

    test('should optimize file upload error recovery', async () => {
      const operation = performanceTracker.start('upload_error_recovery');

      const problematicFileData = {
        name: 'error-prone-file.jpg',
        size: 5 * 1024 * 1024, // 5MB
        type: 'image/jpeg',
        buffer: Buffer.alloc(5 * 1024 * 1024, 'error-test-data')
      };

      // Mock upload with retries
      const uploadResult = await ProductContentService.uploadFileWithRetryStrategy(
        'content-error-test',
        problematicFileData,
        testUserId,
        {
          maxRetries: 3,
          retryDelayMs: 100,
          enableCircuitBreaker: true,
          timeoutMs: 10000
        }
      );

      const errorRecoveryMetrics = performanceTracker.end(operation);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult?.data?.retryCount).toBeLessThanOrEqual(3);
      expect(errorRecoveryMetrics.duration).toBeLessThan(12000); // Under 12 seconds with retries
    });
  });

  describe('Campaign Metric Aggregation Performance', () => {
    test('should aggregate campaign metrics efficiently', async () => {
      // Test will fail until metric aggregation optimization is implemented
      
      const operation = performanceTracker.start('metric_aggregation');

      // Mock large metric dataset
      const metricData = Array.from({ length: 10000 }, (_, i) => ({
        campaignId: `campaign-${Math.floor(i / 100)}`, // 100 campaigns
        metricType: ['view', 'click', 'conversion', 'revenue'][i % 4],
        value: Math.random() * 100,
        timestamp: new Date(Date.now() - i * 60000).toISOString() // Every minute
      }));

      const aggregationResult = await MarketingCampaignService.aggregateMetricsWithPerformanceOptimization(
        {
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          },
          granularity: 'daily',
          enableParallelProcessing: true,
          cacheResults: true,
          includeTrends: true
        },
        testUserId
      );

      const aggregationMetrics = performanceTracker.end(operation);

      expect(aggregationResult.success).toBe(true);
      expect(aggregationResult?.data?.aggregatedMetrics).toBeTruthy();
      expect(aggregationResult?.data?.processingTime).toBeLessThan(5000);

      // Performance assertions
      expect(aggregationMetrics.duration).toBeLessThan(3000); // Under 3 seconds for 10k metrics
      expect(aggregationResult?.data?.metricsProcessed).toBe(10000);
      expect(aggregationResult?.data?.performanceStats.averageProcessingTime).toBeLessThan(1);
    });

    test('should handle real-time metric updates efficiently', async () => {
      const operation = performanceTracker.start('realtime_metric_updates');

      // Simulate high-frequency metric updates
      const realtimeUpdates = Array.from({ length: 1000 }, (_, i) => ({
        campaignId: 'high-traffic-campaign',
        metricType: 'view',
        value: 1,
        timestamp: new Date().toISOString()
      }));

      const updateResults = await Promise.all(
        realtimeUpdates.map(update => 
          MarketingCampaignService.recordMetricWithBatching(
            update.campaignId,
            update.metricType,
            update.value,
            testUserId,
            { enableBatching: true, batchSize: 50, flushIntervalMs: 1000 }
          )
        )
      );

      const realtimeMetrics = performanceTracker.end(operation);

      const successCount = updateResults.filter(r => r.success).length;
      expect(successCount).toBe(1000);
      expect(realtimeMetrics.duration).toBeLessThan(5000); // Under 5 seconds for 1000 updates

      // Check batching efficiency
      const averageUpdateTime = realtimeMetrics.duration / 1000;
      expect(averageUpdateTime).toBeLessThan(5); // Under 5ms per update with batching
    });

    test('should optimize cross-campaign performance analysis', async () => {
      const operation = performanceTracker.start('cross_campaign_analysis');

      const analysisResult = await MarketingCampaignService.performCrossCampaignAnalysisWithOptimization(
        {
          campaignIds: Array.from({ length: 50 }, (_, i) => `campaign-${i}`),
          analysisTypes: ['performance', 'correlation', 'trends', 'forecasting'],
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          },
          enableParallelProcessing: true,
          cacheIntermediateResults: true
        },
        testUserId
      );

      const analysisMetrics = performanceTracker.end(operation);

      expect(analysisResult.success).toBe(true);
      expect(analysisResult?.data?.analysisResults).toBeTruthy();
      expect(analysisResult?.data?.campaignsAnalyzed).toBe(50);

      // Performance assertions
      expect(analysisMetrics.duration).toBeLessThan(10000); // Under 10 seconds for 50 campaigns
      expect(analysisResult?.data?.performanceStats.averageAnalysisTime).toBeLessThan(200);
    });
  });

  describe('Cache Efficiency with Complex Invalidation Patterns', () => {
    test('should optimize query cache performance', async () => {
      const operation = performanceTracker.start('cache_optimization');

      // Set up complex cache hierarchy
      const cacheOperations = [
        // Campaign queries
        () => queryClient.setQueryData(['campaigns', 'list'], { items: [], totalCount: 0 }),
        () => queryClient.setQueryData(['campaigns', 'status', 'active'], { items: [], totalCount: 0 }),
        () => queryClient.setQueryData(['campaigns', 'detail', 'campaign-1'], { id: 'campaign-1' }),
        
        // Content queries
        () => queryClient.setQueryData(['content', 'list'], { items: [], totalCount: 0 }),
        () => queryClient.setQueryData(['content', 'status', 'published'], { items: [], totalCount: 0 }),
        
        // Bundle queries
        () => queryClient.setQueryData(['bundles', 'list'], { items: [], totalCount: 0 }),
        () => queryClient.setQueryData(['bundles', 'status', 'active'], { items: [], totalCount: 0 }),
      ];

      // Execute cache operations
      cacheOperations.forEach(op => op());

      // Test complex invalidation pattern
      const invalidationResult = await invalidationHelper.invalidateEntity(
        'campaigns',
        testUserId,
        {
          includeFallbacks: true,
          retryOnFailure: true,
          cascadeInvalidation: true
        }
      );

      const cacheMetrics = performanceTracker.end(operation);

      expect(invalidationResult.success).toBe(true);
      expect(invalidationResult.summary.successCount).toBeGreaterThan(0);
      expect(cacheMetrics.duration).toBeLessThan(1000); // Under 1 second for cache operations
    });

    test('should handle cache memory pressure efficiently', async () => {
      const operation = performanceTracker.start('cache_memory_pressure');

      // Fill cache with large amount of data
      const cacheLoadOperations = Array.from({ length: 1000 }, (_, i) => 
        queryClient.setQueryData(
          ['performance-test', `item-${i}`],
          {
            id: `item-${i}`,
            data: Array.from({ length: 100 }, (_, j) => ({
              field: `value-${j}`,
              timestamp: new Date().toISOString()
            }))
          }
        )
      );

      // Execute cache loading
      cacheLoadOperations.forEach(op => op());

      // Test cache cleanup performance
      const cleanupResult = await MarketingCampaignService.optimizeCacheMemoryUsage(
        {
          maxMemoryUsageMB: 100,
          cleanupStrategy: 'lru',
          preserveCriticalQueries: true
        }
      );

      const memoryMetrics = performanceTracker.end(operation);

      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult?.data?.memoryFreed).toBeGreaterThan(0);
      expect(memoryMetrics.memoryUsage).toBeLessThan(150 * 1024 * 1024); // Under 150MB
    });

    test('should optimize cross-entity cache coordination', async () => {
      const operation = performanceTracker.start('cross_entity_cache');

      // Test coordinated cache updates across entities
      const coordinationResult = await MarketingCampaignService.coordinateCrossEntityCacheUpdates(
        {
          campaignUpdate: { campaignId: 'campaign-1', status: 'active' },
          affectedContent: ['content-1', 'content-2'],
          affectedBundles: ['bundle-1'],
          enableOptimisticUpdates: true,
          batchInvalidations: true
        },
        testUserId
      );

      const coordinationMetrics = performanceTracker.end(operation);

      expect(coordinationResult.success).toBe(true);
      expect(coordinationResult?.data?.updatedEntities.length).toBeGreaterThan(0);
      expect(coordinationMetrics.duration).toBeLessThan(500); // Under 500ms for coordination
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should manage memory during intensive operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const operation = performanceTracker.start('memory_management');

      // Perform memory-intensive operations
      const intensiveOperations = [
        ProductContentService.processLargeContentBatch(
          Array.from({ length: 500 }, (_, i) => ({ id: `content-${i}` })),
          testUserId
        ),
        MarketingCampaignService.generateComprehensiveAnalytics(
          Array.from({ length: 20 }, (_, i) => `campaign-${i}`),
          testUserId
        ),
        ProductBundleService.calculateComplexInventoryImpact(
          Array.from({ length: 100 }, (_, i) => ({ bundleId: `bundle-${i}` })),
          testUserId
        )
      ];

      await Promise.all(intensiveOperations);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryMetrics = performanceTracker.end(operation);

      // Memory management assertions
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // Under 200MB increase
      expect(memoryMetrics.duration).toBeLessThan(15000); // Under 15 seconds

      // Test garbage collection efficiency
      global.gc && global.gc();
      const postGCMemory = process.memoryUsage().heapUsed;
      const memoryRecovered = finalMemory - postGCMemory;
      expect(memoryRecovered).toBeGreaterThan(memoryIncrease * 0.5); // At least 50% recovery
    });

    test('should handle resource cleanup efficiently', async () => {
      const operation = performanceTracker.start('resource_cleanup');

      // Create resources that need cleanup
      const resourceOperations = await Promise.all([
        ProductContentService.createTemporaryProcessingResources(50),
        MarketingCampaignService.createAnalyticsWorkspace(testUserId),
        ProductBundleService.createInventoryCalculationCache(100)
      ]);

      // Test resource cleanup
      const cleanupResult = await MarketingCampaignService.cleanupAllTemporaryResources(
        testUserId,
        { forceCleanup: true, timeoutMs: 5000 }
      );

      const cleanupMetrics = performanceTracker.end(operation);

      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult?.data?.resourcesCleanedUp).toBeGreaterThan(0);
      expect(cleanupMetrics.duration).toBeLessThan(6000); // Under 6 seconds including timeout
    });
  });

  afterAll(() => {
    // Output performance summary
    const allMetrics = performanceTracker.getMetrics();
    console.log('Performance Test Summary:', {
      totalOperations: allMetrics.length,
      averageDuration: allMetrics.reduce((sum, m) => sum + m.duration, 0) / allMetrics.length,
      maxDuration: Math.max(...allMetrics.map(m => m.duration)),
      totalMemoryUsage: allMetrics.reduce((sum, m) => sum + m.memoryUsage, 0)
    });
  });
});