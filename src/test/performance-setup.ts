/**
 * Performance Test Setup
 * Phase 5: Production Readiness - Performance testing setup
 * 
 * Sets up performance monitoring and measurement utilities for tests
 */

import { performanceMonitoring } from '../monitoring/performanceMonitoring';

// Mock performance monitoring to avoid actual database writes during tests
jest.mock('../monitoring/performanceMonitoring', () => ({
  performanceMonitoring: {
    logMetric: jest.fn().mockResolvedValue({ success: true }),
    logQueryPerformance: jest.fn().mockResolvedValue({ success: true }),
    logApiResponse: jest.fn().mockResolvedValue({ success: true }),
    logMemoryUsage: jest.fn().mockResolvedValue({ success: true }),
    logCacheEfficiency: jest.fn().mockResolvedValue({ success: true }),
    getMetrics: jest.fn().mockResolvedValue({ success: true, metrics: [] }),
    getPerformanceSummary: jest.fn().mockResolvedValue({ success: true, summary: {} }),
    startTiming: jest.fn(() => ({
      end: jest.fn().mockResolvedValue(undefined)
    })),
    measurePerformance: jest.fn((fn) => fn),
  }
}));

// Global performance utilities for tests
declare global {
  namespace NodeJS {
    interface Global {
      performance: Performance;
      measurePerformance: (fn: () => any) => Promise<{ result: any; time: number }>;
      expectPerformance: (time: number, threshold: number) => void;
    }
  }
}

// Enhanced performance measurement utility
global.measurePerformance = async (fn: () => any) => {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const time = endTime - startTime;
  
  return { result, time };
};

// Performance assertion utility
global.expectPerformance = (time: number, threshold: number) => {
  if (time > threshold) {
    console.warn(`Performance warning: Operation took ${time}ms, threshold was ${threshold}ms`);
  }
  expect(time).toBeLessThan(threshold);
};

// Setup performance monitoring for the test environment
beforeAll(() => {
  // Mock console methods for cleaner test output
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  // Set up performance monitoring
  console.log('Performance test setup complete');
});

// Cleanup after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Final cleanup
afterAll(async () => {
  // Restore console methods
  jest.restoreAllMocks();
  
  // Force cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Performance test cleanup complete');
});

// Export utilities for use in tests
export const performanceTestUtils = {
  measureExecutionTime: async (fn: () => any): Promise<number> => {
    const start = performance.now();
    await fn();
    return performance.now() - start;
  },
  
  measureMemoryUsage: (): number => {
    if (process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  },
  
  simulateLoad: async (operations: number, delay = 10): Promise<void> => {
    const promises = Array.from({ length: operations }, async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
    });
    await Promise.all(promises);
  },
  
  createLargeDataset: (size: number): any[] => {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      data: 'x'.repeat(100), // Some bulk data
    }));
  },
};