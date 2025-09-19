import { supabase } from '../../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  buildNumber: string;
  apiEndpoint: string;
  enableDebug: boolean;
  enableTelemetry: boolean;
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;
  featureFlags: Record<string, boolean>;
}

export interface EnvironmentHealth {
  api: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    uptime: number;
  };
  database: {
    status: 'healthy' | 'degraded' | 'down';
    connectionCount: number;
    queryTime: number;
  };
  cache: {
    status: 'healthy' | 'degraded' | 'down';
    hitRate: number;
    size: number;
  };
  storage: {
    status: 'healthy' | 'degraded' | 'down';
    usage: number;
    availability: number;
  };
  overall: 'healthy' | 'degraded' | 'down';
}

export interface DeploymentMetrics {
  appVersion: string;
  buildNumber: string;
  environment: string;
  activeUsers: number;
  sessionDuration: number;
  crashRate: number;
  errorRate: number;
  performanceScore: number;
  featureUsage: Record<string, number>;
  lastUpdated: Date;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  audience: {
    percentage: number;
    userIds?: string[];
    segments?: string[];
  };
  conditions?: {
    minVersion?: string;
    maxVersion?: string;
    platforms?: string[];
    countries?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RolloutStrategy {
  name: string;
  phases: Array<{
    percentage: number;
    duration: number; // hours
    criteria?: Record<string, any>;
  }>;
  rollbackThreshold: {
    errorRate?: number;
    crashRate?: number;
    performanceScore?: number;
  };
  monitoring: {
    metrics: string[];
    alertThreshold: Record<string, number>;
  };
}

class DeploymentService {
  private config: DeploymentConfig | null = null;
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeConfig();
    this.loadFeatureFlags();
    this.startHealthMonitoring();
  }

  // Configuration management
  async initializeConfig(): Promise<void> {
    try {
      // Load config from local storage first (for offline capability)
      const storedConfig = await AsyncStorage.getItem('deployment_config');
      if (storedConfig) {
        this.config = JSON.parse(storedConfig);
      }

      // Fetch latest config from server
      const { data, error } = await supabase
        .from('deployment_config')
        .select('*')
        .eq('environment', this.getCurrentEnvironment())
        .single();

      if (!error && data) {
        this.config = {
          environment: data.environment,
          version: data.version,
          buildNumber: data.build_number,
          apiEndpoint: data.api_endpoint,
          enableDebug: data.enable_debug,
          enableTelemetry: data.enable_telemetry,
          enableCrashReporting: data.enable_crash_reporting,
          enablePerformanceMonitoring: data.enable_performance_monitoring,
          featureFlags: data.feature_flags || {}
        };

        // Cache config locally
        await AsyncStorage.setItem('deployment_config', JSON.stringify(this.config));
      }
    } catch (error) {
      console.error('Failed to initialize deployment config:', error);
    }
  }

  getConfig(): DeploymentConfig | null {
    return this.config;
  }

  async updateConfig(updates: Partial<DeploymentConfig>): Promise<void> {
    if (!this.config) return;

    const newConfig = { ...this.config, ...updates };

    try {
      await supabase
        .from('deployment_config')
        .upsert({
          environment: newConfig.environment,
          version: newConfig.version,
          build_number: newConfig.buildNumber,
          api_endpoint: newConfig.apiEndpoint,
          enable_debug: newConfig.enableDebug,
          enable_telemetry: newConfig.enableTelemetry,
          enable_crash_reporting: newConfig.enableCrashReporting,
          enable_performance_monitoring: newConfig.enablePerformanceMonitoring,
          feature_flags: newConfig.featureFlags
        });

      this.config = newConfig;
      await AsyncStorage.setItem('deployment_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to update deployment config:', error);
      throw new Error('Configuration update failed');
    }
  }

  // Feature flags management
  async loadFeatureFlags(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('enabled', true);

      if (!error && data) {
        data.forEach(flag => {
          this.featureFlags.set(flag.name, {
            name: flag.name,
            enabled: flag.enabled,
            description: flag.description,
            audience: flag.audience,
            conditions: flag.conditions,
            createdAt: new Date(flag.created_at),
            updatedAt: new Date(flag.updated_at),
            createdBy: flag.created_by
          });
        });
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }
  }

  isFeatureEnabled(flagName: string, userId?: string, userSegment?: string): boolean {
    const flag = this.featureFlags.get(flagName);
    if (!flag || !flag.enabled) return false;

    // Check version conditions
    if (flag.conditions?.minVersion && this.config?.version) {
      if (this.compareVersions(this.config.version, flag.conditions.minVersion) < 0) {
        return false;
      }
    }

    if (flag.conditions?.maxVersion && this.config?.version) {
      if (this.compareVersions(this.config.version, flag.conditions.maxVersion) > 0) {
        return false;
      }
    }

    // Check user-specific targeting
    if (userId && flag.audience.userIds?.includes(userId)) {
      return true;
    }

    // Check segment targeting
    if (userSegment && flag.audience.segments?.includes(userSegment)) {
      return true;
    }

    // Check percentage rollout
    if (userId) {
      const hash = this.hashUserId(userId, flagName);
      return hash < flag.audience.percentage;
    }

    return Math.random() * 100 < flag.audience.percentage;
  }

  async updateFeatureFlag(flagName: string, updates: Partial<FeatureFlag>): Promise<void> {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({
          enabled: updates.enabled,
          description: updates.description,
          audience: updates.audience,
          conditions: updates.conditions,
          updated_at: new Date().toISOString()
        })
        .eq('name', flagName);

      if (error) throw error;

      // Update local cache
      const existingFlag = this.featureFlags.get(flagName);
      if (existingFlag) {
        this.featureFlags.set(flagName, { ...existingFlag, ...updates });
      }
    } catch (error) {
      console.error('Failed to update feature flag:', error);
      throw new Error('Feature flag update failed');
    }
  }

  // Environment health monitoring
  async checkEnvironmentHealth(): Promise<EnvironmentHealth> {
    const startTime = performance.now();

    try {
      // API health check
      const apiHealth = await this.checkApiHealth();

      // Database health check
      const dbHealth = await this.checkDatabaseHealth();

      // Cache health check
      const cacheHealth = await this.checkCacheHealth();

      // Storage health check
      const storageHealth = await this.checkStorageHealth();

      // Determine overall health
      const allHealthy = [apiHealth, dbHealth, cacheHealth, storageHealth]
        .every(h => h.status === 'healthy');

      const anyDown = [apiHealth, dbHealth, cacheHealth, storageHealth]
        .some(h => h.status === 'down');

      const overall = anyDown ? 'down' : allHealthy ? 'healthy' : 'degraded';

      return {
        api: apiHealth,
        database: dbHealth,
        cache: cacheHealth,
        storage: storageHealth,
        overall
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        api: { status: 'down', responseTime: 0, uptime: 0 },
        database: { status: 'down', connectionCount: 0, queryTime: 0 },
        cache: { status: 'down', hitRate: 0, size: 0 },
        storage: { status: 'down', usage: 0, availability: 0 },
        overall: 'down'
      };
    }
  }

  // Deployment metrics collection
  async collectDeploymentMetrics(): Promise<DeploymentMetrics> {
    try {
      const { data: metrics } = await supabase
        .from('deployment_metrics')
        .select('*')
        .eq('environment', this.config?.environment)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (metrics) {
        return {
          appVersion: metrics.app_version,
          buildNumber: metrics.build_number,
          environment: metrics.environment,
          activeUsers: metrics.active_users,
          sessionDuration: metrics.session_duration,
          crashRate: metrics.crash_rate,
          errorRate: metrics.error_rate,
          performanceScore: metrics.performance_score,
          featureUsage: metrics.feature_usage,
          lastUpdated: new Date(metrics.created_at)
        };
      }

      // Return default metrics if none found
      return {
        appVersion: this.config?.version || 'unknown',
        buildNumber: this.config?.buildNumber || 'unknown',
        environment: this.config?.environment || 'unknown',
        activeUsers: 0,
        sessionDuration: 0,
        crashRate: 0,
        errorRate: 0,
        performanceScore: 100,
        featureUsage: {},
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Failed to collect deployment metrics:', error);
      throw new Error('Metrics collection failed');
    }
  }

  async recordDeploymentMetrics(metrics: Partial<DeploymentMetrics>): Promise<void> {
    try {
      await supabase
        .from('deployment_metrics')
        .insert({
          app_version: metrics.appVersion || this.config?.version,
          build_number: metrics.buildNumber || this.config?.buildNumber,
          environment: this.config?.environment,
          active_users: metrics.activeUsers,
          session_duration: metrics.sessionDuration,
          crash_rate: metrics.crashRate,
          error_rate: metrics.errorRate,
          performance_score: metrics.performanceScore,
          feature_usage: metrics.featureUsage,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to record deployment metrics:', error);
    }
  }

  // Rollout management
  async executeRollout(strategy: RolloutStrategy): Promise<void> {
    console.log(`Starting rollout: ${strategy.name}`);

    for (let i = 0; i < strategy.phases.length; i++) {
      const phase = strategy.phases[i];
      console.log(`Executing rollout phase ${i + 1}: ${phase.percentage}%`);

      // Update feature flag percentage
      // This would integrate with your feature flag system

      // Wait for phase duration
      await new Promise(resolve => setTimeout(resolve, phase.duration * 60 * 60 * 1000));

      // Check rollback conditions
      const metrics = await this.collectDeploymentMetrics();

      if (this.shouldRollback(metrics, strategy.rollbackThreshold)) {
        console.log('Rollback threshold exceeded, initiating rollback');
        await this.executeRollback();
        throw new Error('Rollout halted due to quality metrics');
      }
    }

    console.log(`Rollout ${strategy.name} completed successfully`);
  }

  async executeRollback(): Promise<void> {
    console.log('Executing rollback...');

    // This would implement rollback logic:
    // - Revert feature flags
    // - Switch to previous app version
    // - Clear problematic caches
    // - Notify team

    // For now, just disable all non-essential features
    for (const [flagName, flag] of this.featureFlags) {
      if (!this.isEssentialFeature(flagName)) {
        await this.updateFeatureFlag(flagName, { enabled: false });
      }
    }
  }

  // Private helper methods
  private async startHealthMonitoring(): Promise<void> {
    // Check health every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.checkEnvironmentHealth();

        if (health.overall !== 'healthy') {
          console.warn('Environment health degraded:', health);
          // Could trigger alerts here
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 5 * 60 * 1000);
  }

  private getCurrentEnvironment(): string {
    // This would be determined by build configuration
    return __DEV__ ? 'development' : 'production';
  }

  private async checkApiHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; responseTime: number; uptime: number }> {
    try {
      const start = performance.now();
      const { error } = await supabase.from('health_check').select('*').limit(1);
      const responseTime = performance.now() - start;

      return {
        status: error ? 'down' : responseTime > 2000 ? 'degraded' : 'healthy',
        responseTime,
        uptime: 99.9 // This would come from actual monitoring
      };
    } catch {
      return { status: 'down', responseTime: 0, uptime: 0 };
    }
  }

  private async checkDatabaseHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; connectionCount: number; queryTime: number }> {
    try {
      const start = performance.now();
      const { error } = await supabase.from('health_check').select('count').single();
      const queryTime = performance.now() - start;

      return {
        status: error ? 'down' : queryTime > 1000 ? 'degraded' : 'healthy',
        connectionCount: 10, // Mock data
        queryTime
      };
    } catch {
      return { status: 'down', connectionCount: 0, queryTime: 0 };
    }
  }

  private async checkCacheHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; hitRate: number; size: number }> {
    // Mock cache health check
    return {
      status: 'healthy',
      hitRate: 0.85,
      size: 1024 * 1024 * 50 // 50MB
    };
  }

  private async checkStorageHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; usage: number; availability: number }> {
    // Mock storage health check
    return {
      status: 'healthy',
      usage: 0.6, // 60% usage
      availability: 99.99
    };
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  private hashUserId(userId: string, flagName: string): number {
    // Simple hash function for consistent user bucketing
    let hash = 0;
    const str = userId + flagName;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  private shouldRollback(metrics: DeploymentMetrics, threshold: RolloutStrategy['rollbackThreshold']): boolean {
    if (threshold.errorRate && metrics.errorRate > threshold.errorRate) return true;
    if (threshold.crashRate && metrics.crashRate > threshold.crashRate) return true;
    if (threshold.performanceScore && metrics.performanceScore < threshold.performanceScore) return true;
    return false;
  }

  private isEssentialFeature(flagName: string): boolean {
    const essentialFeatures = ['authentication', 'core_navigation', 'data_sync'];
    return essentialFeatures.includes(flagName);
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const deploymentService = new DeploymentService();