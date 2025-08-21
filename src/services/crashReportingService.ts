/**
 * Crash Reporting Service
 * 
 * Lightweight crash reporting for production environments.
 * For more advanced features, consider integrating Sentry or Bugsnag.
 */

import Constants from 'expo-constants';

interface CrashReport {
  timestamp: string;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  context: {
    userId?: string;
    screen?: string;
    action?: string;
  };
  device: {
    platform: string;
    version: string;
    appVersion: string;
  };
}

class CrashReportingService {
  private isEnabled: boolean;
  
  constructor() {
    // Only enable in production or when explicitly enabled
    this.isEnabled = Constants.expoConfig?.extra?.enableCrashReporting === true;
    
    if (this.isEnabled) {
      this.setupGlobalErrorHandlers();
    }
  }
  
  private setupGlobalErrorHandlers() {
    // React Native global error handler
    const ErrorUtils = (global as any).ErrorUtils;
    const originalHandler = ErrorUtils?.getGlobalHandler();
    
    ErrorUtils?.setGlobalHandler((error: Error, isFatal?: boolean) => {
      this.logCrash(error, {
        isFatal,
        context: { action: 'global_error' }
      });
      
      // Call original handler to maintain default behavior
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
    
    // Promise rejection handler
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.logCrash(new Error(event.reason), {
          context: { action: 'unhandled_promise_rejection' }
        });
      });
    }
  }
  
  /**
   * Log a crash or error
   */
  logCrash(error: Error, options: {
    isFatal?: boolean;
    context?: {
      userId?: string;
      screen?: string;
      action?: string;
    };
  } = {}) {
    if (!this.isEnabled) {
      // In development, just log to console
      console.error('🔥 Crash Report (Development Only):', error);
      return;
    }
    
    try {
      const report: CrashReport = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        context: {
          userId: options.context?.userId,
          screen: options.context?.screen,
          action: options.context?.action,
        },
        device: {
          platform: Constants.platform?.ios ? 'ios' : 'android',
          version: Constants.platform?.ios?.platformVersion || Constants.platform?.android?.platformVersion || 'unknown',
          appVersion: Constants.expoConfig?.version || 'unknown',
        },
      };
      
      // In a real implementation, send to your crash reporting service
      this.sendCrashReport(report);
      
    } catch (reportingError) {
      console.error('Failed to log crash:', reportingError);
    }
  }
  
  /**
   * Log a non-fatal error for debugging
   */
  logError(error: Error, context?: { screen?: string; action?: string; userId?: string }) {
    this.logCrash(error, { isFatal: false, context });
  }
  
  /**
   * Log custom analytics/debugging information
   */
  logEvent(event: string, properties?: Record<string, any>) {
    if (!this.isEnabled) {
      console.log('📊 Analytics Event (Dev):', event, properties);
      return;
    }
    
    // In a real implementation, send to your analytics service
    console.log('📊 Analytics Event:', event, properties);
  }
  
  private async sendCrashReport(report: CrashReport) {
    try {
      // Example: Send to your backend or third-party service
      // await fetch('https://your-api.com/crash-reports', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report),
      // });
      
      // For now, just log structured crash reports
      console.error('🔥 CRASH REPORT:', JSON.stringify(report, null, 2));
      
    } catch (error) {
      console.error('Failed to send crash report:', error);
    }
  }
  
  /**
   * Set user context for crash reports
   */
  setUser(userId: string) {
    // Store user context for future crash reports
    // In a real implementation, this would be stored in the crash reporting service
    console.log('📝 Crash reporting user context set:', userId);
  }
  
  /**
   * Clear user context (e.g., on logout)
   */
  clearUser() {
    console.log('🧹 Crash reporting user context cleared');
  }
}

// Export singleton instance
export const crashReporting = new CrashReportingService();

// Export for dependency injection in tests
export default CrashReportingService;