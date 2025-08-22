/**
 * Frontend Performance Optimization Utilities
 * Phase 5: Production Readiness - Frontend optimization strategies
 * 
 * Provides code splitting, lazy loading, memoization, and performance monitoring
 * Following patterns from docs/architectural-patterns-and-best-practices.md
 */

import React, { Suspense, lazy, ComponentType, useMemo, useCallback } from 'react';
import { performanceMonitoring } from '../monitoring/performanceMonitoring';

// Performance thresholds for optimization decisions
const PERFORMANCE_THRESHOLDS = {
  componentRenderTime: 16, // 16ms for 60fps
  chunkLoadTime: 1000, // 1 second for code splitting
  imageLoadTime: 500, // 500ms for images
  memoryUsage: 50, // 50MB heap size warning
  bundleSize: 100, // 100KB per chunk warning
};

/**
 * Code Splitting and Lazy Loading Utilities
 */

// Enhanced lazy loading with error boundaries and loading states
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: React.ComponentType,
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(factory);
  
  return (props: React.ComponentProps<T>) => {
    const [error, setError] = React.useState<Error | null>(null);
    const [key, setKey] = React.useState(0);
    
    const retry = useCallback(() => {
      setError(null);
      setKey(prev => prev + 1);
    }, []);
    
    if (error && errorFallback) {
      const ErrorComponent = errorFallback;
      return <ErrorComponent error={error} retry={retry} />;
    }
    
    const LoadingComponent = fallback || (() => <div>Loading...</div>);
    
    return (
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent key={key} {...props} />
      </Suspense>
    );
  };
}

// Preload utility for critical components
export function preloadComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): void {
  // Start loading the component immediately
  factory().catch(error => {
    console.warn('Component preload failed:', error);
  });
}

// Route-based code splitting helper
export const createRouteComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  routeName: string
) => {
  const component = createLazyComponent(
    importFn,
    () => <div>Loading {routeName}...</div>,
    ({ error, retry }) => (
      <div>
        <h3>Failed to load {routeName}</h3>
        <p>{error.message}</p>
        <button onClick={retry}>Retry</button>
      </div>
    )
  );
  
  // Track loading performance
  const startTime = performance.now();
  importFn().then(() => {
    const loadTime = performance.now() - startTime;
    performanceMonitoring.logMetric({
      metricCategory: 'api_response',
      metricName: `route_load_${routeName}`,
      metricValue: loadTime,
      metricUnit: 'milliseconds',
      serviceName: 'frontend-router',
    });
  });
  
  return component;
};

/**
 * React Query Optimization Utilities
 */

// Optimized query configuration factory
export function createOptimizedQueryConfig(
  category: 'frequent' | 'infrequent' | 'realtime' | 'static'
) {
  const configs = {
    frequent: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    infrequent: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    realtime: {
      staleTime: 0, // Always fresh
      gcTime: 1 * 60 * 1000, // 1 minute
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 30 * 1000, // 30 seconds
    },
    static: {
      staleTime: 60 * 60 * 1000, // 1 hour
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  };
  
  return configs[category];
}

// Smart cache invalidation helper
export function createSmartInvalidation(queryClient: any) {
  return {
    // Invalidate related queries based on entity relationships
    invalidateEntity: async (entity: string, id?: string) => {
      const patterns = {
        product: ['products', 'categories', 'inventory'],
        order: ['orders', 'analytics', 'inventory'],
        cart: ['cart', 'products'],
        user: ['user', 'orders', 'analytics'],
      };
      
      const relatedQueries = patterns[entity as keyof typeof patterns] || [entity];
      
      for (const queryKey of relatedQueries) {
        await queryClient.invalidateQueries({
          queryKey: id ? [queryKey, id] : [queryKey],
          exact: false,
        });
      }
    },
    
    // Selective invalidation based on user role
    invalidateByRole: async (userRole: string) => {
      const roleQueries = {
        customer: ['products', 'cart', 'orders'],
        inventory_staff: ['products', 'inventory', 'orders'],
        marketing_staff: ['products', 'analytics', 'campaigns'],
        executive: ['analytics', 'reports'],
        admin: ['users', 'system', 'analytics'],
      };
      
      const queries = roleQueries[userRole as keyof typeof roleQueries] || [];
      
      for (const queryKey of queries) {
        await queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
    },
  };
}

/**
 * Component Performance Optimization
 */

// Enhanced memo with custom comparison
export function createOptimizedMemo<P extends object>(
  Component: React.ComponentType<P>,
  customCompare?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = React.memo(Component, customCompare);
  
  // Add performance monitoring in development
  if (process.env.NODE_ENV === 'development') {
    return React.forwardRef<any, P>((props, ref) => {
      const renderStart = performance.now();
      
      React.useEffect(() => {
        const renderTime = performance.now() - renderStart;
        if (renderTime > PERFORMANCE_THRESHOLDS.componentRenderTime) {
          console.warn(`Slow render detected: ${Component.name} took ${renderTime}ms`);
        }
      });
      
      return <MemoizedComponent ref={ref} {...props} />;
    });
  }
  
  return MemoizedComponent;
}

// Optimized list rendering with virtualization hint
export function createOptimizedList<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  keyExtractor: (item: T, index: number) => string | number,
  options?: {
    virtualize?: boolean;
    threshold?: number;
    windowSize?: number;
  }
) {
  const { virtualize = false, threshold = 100, windowSize = 10 } = options || {};
  
  // Use virtualization for large lists
  if (virtualize || items.length > threshold) {
    return createVirtualizedList(items, renderItem, keyExtractor, windowSize);
  }
  
  // Standard rendering for smaller lists
  return items.map((item, index) => {
    const key = keyExtractor(item, index);
    return <React.Fragment key={key}>{renderItem(item, index)}</React.Fragment>;
  });
}

// Simple virtualization implementation
function createVirtualizedList<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  keyExtractor: (item: T, index: number) => string | number,
  windowSize: number
) {
  return (scrollTop: number, containerHeight: number, itemHeight: number) => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + windowSize,
      items.length
    );
    
    const visibleItems = items.slice(startIndex, endIndex);
    
    return visibleItems.map((item, relativeIndex) => {
      const actualIndex = startIndex + relativeIndex;
      const key = keyExtractor(item, actualIndex);
      return <React.Fragment key={key}>{renderItem(item, actualIndex)}</React.Fragment>;
    });
  };
}

/**
 * Image Optimization Utilities
 */

// Lazy loading image component with optimization
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  placeholder?: string;
  quality?: number;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: (error: Error) => void;
}> = ({
  src,
  alt,
  placeholder,
  quality = 80,
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [loadTime, setLoadTime] = React.useState(0);
  
  const handleLoad = useCallback(() => {
    const endTime = performance.now();
    const finalLoadTime = endTime - (loadTime || endTime);
    setIsLoaded(true);
    
    // Track image loading performance
    performanceMonitoring.logMetric({
      metricCategory: 'api_response',
      metricName: 'image_load',
      metricValue: finalLoadTime,
      metricUnit: 'milliseconds',
      serviceName: 'frontend-images',
      requestContext: { src, alt },
    });
    
    onLoad?.();
  }, [loadTime, onLoad, src, alt]);
  
  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  }, [src, onError]);
  
  React.useEffect(() => {
    setLoadTime(performance.now());
  }, [src]);
  
  if (hasError && placeholder) {
    return <img src={placeholder} alt={alt} />;
  }
  
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        opacity: isLoaded ? 1 : 0.5,
        transition: 'opacity 0.3s ease',
      }}
    />
  );
};

/**
 * Memory Management Utilities
 */

// Memory leak detection and prevention
export function createMemoryMonitor() {
  const listeners = new Set<() => void>();
  const timers = new Set<NodeJS.Timeout>();
  const intervals = new Set<NodeJS.Timeout>();
  
  return {
    addListener: (cleanup: () => void) => {
      listeners.add(cleanup);
      return () => listeners.delete(cleanup);
    },
    
    addTimer: (timer: NodeJS.Timeout) => {
      timers.add(timer);
      return () => {
        clearTimeout(timer);
        timers.delete(timer);
      };
    },
    
    addInterval: (interval: NodeJS.Timeout) => {
      intervals.add(interval);
      return () => {
        clearInterval(interval);
        intervals.delete(interval);
      };
    },
    
    cleanup: () => {
      listeners.forEach(cleanup => cleanup());
      timers.forEach(timer => clearTimeout(timer));
      intervals.forEach(interval => clearInterval(interval));
      
      listeners.clear();
      timers.clear();
      intervals.clear();
    },
    
    getStats: () => ({
      listeners: listeners.size,
      timers: timers.size,
      intervals: intervals.size,
    }),
  };
}

// Hook for automatic cleanup
export function useMemoryMonitor() {
  const monitor = useMemo(() => createMemoryMonitor(), []);
  
  React.useEffect(() => {
    return () => monitor.cleanup();
  }, [monitor]);
  
  return monitor;
}

/**
 * Bundle Size Optimization
 */

// Dynamic import helper with error handling
export async function importWithRetry<T>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const startTime = performance.now();
      const result = await importFn();
      const loadTime = performance.now() - startTime;
      
      // Track successful imports
      performanceMonitoring.logMetric({
        metricCategory: 'api_response',
        metricName: 'dynamic_import',
        metricValue: loadTime,
        metricUnit: 'milliseconds',
        serviceName: 'frontend-bundler',
        requestContext: { attempt, retries },
      });
      
      return result;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  
  throw new Error('Import failed after all retries');
}

// Tree shaking helper - exports only used functions
export function createTreeShakeableModule<T extends Record<string, any>>(
  module: T,
  usedExports: Array<keyof T>
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const exportName of usedExports) {
    if (exportName in module) {
      result[exportName] = module[exportName];
    }
  }
  
  return result;
}

/**
 * Performance Monitoring Integration
 */

// Component performance tracker
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name || 'UnknownComponent';
  
  return React.forwardRef<any, P>((props, ref) => {
    const renderCount = React.useRef(0);
    const mountTime = React.useRef(performance.now());
    
    React.useEffect(() => {
      renderCount.current += 1;
      
      // Track mount time
      const currentMountTime = performance.now() - mountTime.current;
      performanceMonitoring.logMetric({
        metricCategory: 'api_response',
        metricName: 'component_mount',
        metricValue: currentMountTime,
        metricUnit: 'milliseconds',
        serviceName: 'frontend-components',
        requestContext: { componentName: name },
      });
    }, []);
    
    React.useEffect(() => {
      return () => {
        // Track unmount and render statistics
        performanceMonitoring.logMetric({
          metricCategory: 'memory_usage',
          metricName: 'component_renders',
          metricValue: renderCount.current,
          metricUnit: 'count',
          serviceName: 'frontend-components',
          requestContext: { componentName: name },
        });
      };
    }, []);
    
    return <Component ref={ref} {...props} />;
  });
}

// Export all optimization utilities
export const frontendOptimization = {
  createLazyComponent,
  preloadComponent,
  createRouteComponent,
  createOptimizedQueryConfig,
  createSmartInvalidation,
  createOptimizedMemo,
  createOptimizedList,
  OptimizedImage,
  createMemoryMonitor,
  useMemoryMonitor,
  importWithRetry,
  createTreeShakeableModule,
  withPerformanceTracking,
  PERFORMANCE_THRESHOLDS,
};