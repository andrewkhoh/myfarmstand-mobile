import React, { useEffect, useRef, ComponentType } from 'react';
import { useComponentPerformance, useScreenPerformance } from '../../hooks/performance/usePerformanceMonitor';

// HOC for component render performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: {
    componentName?: string;
    trackProps?: boolean;
    threshold?: number; // ms - only report if render takes longer than this
  }
) {
  const componentName = options?.componentName || WrappedComponent.displayName || WrappedComponent.name || 'UnknownComponent';
  const trackProps = options?.trackProps ?? false;
  const threshold = options?.threshold ?? 0;

  const PerformanceTrackedComponent = (props: P) => {
    const renderStartTime = useRef<number>();
    const { recordComponentRender } = useComponentPerformance(componentName);

    // Start timing before render
    renderStartTime.current = performance.now();

    useEffect(() => {
      // End timing after render is committed
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;

        // Only record if above threshold
        if (renderTime >= threshold) {
          recordComponentRender(
            componentName,
            renderTime,
            trackProps ? props : undefined
          );
        }
      }
    });

    return <WrappedComponent {...props} />;
  };

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${componentName})`;

  return PerformanceTrackedComponent;
}

// HOC for screen transition performance tracking
export function withScreenTracking<P extends object>(
  WrappedComponent: ComponentType<P>,
  screenName: string
) {
  const ScreenTrackedComponent = (props: P) => {
    const { startTransition, endTransition } = useScreenPerformance();
    const mountTime = useRef<number>();

    useEffect(() => {
      // Record screen mount time
      mountTime.current = performance.now();

      // Start transition tracking
      startTransition('previous_screen', screenName);

      return () => {
        // End transition tracking on unmount
        if (mountTime.current) {
          const transitionTime = performance.now() - mountTime.current;
          endTransition(screenName);
        }
      };
    }, []);

    return <WrappedComponent {...props} />;
  };

  ScreenTrackedComponent.displayName = `withScreenTracking(${screenName})`;

  return ScreenTrackedComponent;
}

// HOC for memory usage tracking
export function withMemoryTracking<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: {
    trackOnMount?: boolean;
    trackOnUpdate?: boolean;
    trackOnUnmount?: boolean;
    interval?: number; // ms - periodic tracking interval
  }
) {
  const {
    trackOnMount = true,
    trackOnUpdate = false,
    trackOnUnmount = true,
    interval
  } = options || {};

  const MemoryTrackedComponent = (props: P) => {
    const intervalRef = useRef<NodeJS.Timeout>();

    const recordMemoryUsage = () => {
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory;
        console.log(`Memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      }
    };

    useEffect(() => {
      if (trackOnMount) {
        recordMemoryUsage();
      }

      if (interval && interval > 0) {
        intervalRef.current = setInterval(recordMemoryUsage, interval);
      }

      return () => {
        if (trackOnUnmount) {
          recordMemoryUsage();
        }

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, []);

    useEffect(() => {
      if (trackOnUpdate) {
        recordMemoryUsage();
      }
    });

    return <WrappedComponent {...props} />;
  };

  MemoryTrackedComponent.displayName = `withMemoryTracking(${WrappedComponent.displayName || WrappedComponent.name})`;

  return MemoryTrackedComponent;
}

// Composite HOC that applies multiple performance tracking features
export function withFullPerformanceTracking<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: {
    componentName?: string;
    screenName?: string;
    trackRender?: boolean;
    trackScreen?: boolean;
    trackMemory?: boolean;
    renderThreshold?: number;
    memoryInterval?: number;
  }
) {
  const {
    componentName,
    screenName,
    trackRender = true,
    trackScreen = false,
    trackMemory = false,
    renderThreshold = 16, // 16ms = one frame at 60fps
    memoryInterval = 30000 // 30 seconds
  } = options || {};

  let EnhancedComponent = WrappedComponent;

  // Apply render tracking
  if (trackRender) {
    EnhancedComponent = withPerformanceTracking(EnhancedComponent, {
      componentName,
      threshold: renderThreshold
    });
  }

  // Apply screen tracking
  if (trackScreen && screenName) {
    EnhancedComponent = withScreenTracking(EnhancedComponent, screenName);
  }

  // Apply memory tracking
  if (trackMemory) {
    EnhancedComponent = withMemoryTracking(EnhancedComponent, {
      interval: memoryInterval
    });
  }

  EnhancedComponent.displayName = `withFullPerformanceTracking(${WrappedComponent.displayName || WrappedComponent.name})`;

  return EnhancedComponent;
}

// Hook-based performance tracking for functional components
export function usePerformanceTracker(
  componentName: string,
  options?: {
    trackRender?: boolean;
    trackMemory?: boolean;
    onSlowRender?: (renderTime: number) => void;
    slowRenderThreshold?: number;
  }
) {
  const {
    trackRender = true,
    trackMemory = false,
    onSlowRender,
    slowRenderThreshold = 50
  } = options || {};

  const renderStartTime = useRef<number>();
  const { recordComponentRender } = useComponentPerformance(componentName);

  // Start render timing
  const startRenderTracking = () => {
    if (trackRender) {
      renderStartTime.current = performance.now();
    }
  };

  // End render timing
  const endRenderTracking = () => {
    if (trackRender && renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;

      recordComponentRender(componentName, renderTime);

      if (renderTime > slowRenderThreshold && onSlowRender) {
        onSlowRender(renderTime);
      }

      renderStartTime.current = undefined;
    }
  };

  // Memory tracking
  const trackMemoryUsage = () => {
    if (trackMemory && typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      console.log(`${componentName} memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
  };

  useEffect(() => {
    startRenderTracking();
    trackMemoryUsage();

    return () => {
      endRenderTracking();
    };
  });

  return {
    startRenderTracking,
    endRenderTracking,
    trackMemoryUsage
  };
}

// Performance profiler component
export function PerformanceProfiler({
  id,
  children,
  onRender,
  includeBaseTime = false
}: {
  id: string;
  children: React.ReactNode;
  onRender?: (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => void;
  includeBaseTime?: boolean;
}) {
  const handleRender = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    // Log performance data
    console.log(`Performance [${id}]:`, {
      phase,
      actualDuration: `${actualDuration.toFixed(2)}ms`,
      baseDuration: includeBaseTime ? `${baseDuration.toFixed(2)}ms` : undefined,
      startTime,
      commitTime
    });

    // Call custom handler
    if (onRender) {
      onRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
    }

    // Warn about slow renders
    if (actualDuration > 16) {
      console.warn(`Slow render detected in ${id}: ${actualDuration.toFixed(2)}ms`);
    }
  };

  return (
    <React.Profiler id={id} onRender={handleRender}>
      {children}
    </React.Profiler>
  );
}

// Automatic performance tracking decorator (experimental)
export function performanceTrack(options?: {
  componentName?: string;
  trackRender?: boolean;
  trackMemory?: boolean;
  threshold?: number;
}) {
  return function <P extends object>(WrappedComponent: ComponentType<P>) {
    return withPerformanceTracking(WrappedComponent, options);
  };
}

// Example usage:
// @performanceTrack({ threshold: 20 })
// class MyComponent extends React.Component { ... }

// or

// const MyComponent = performanceTrack()(MyBaseComponent);