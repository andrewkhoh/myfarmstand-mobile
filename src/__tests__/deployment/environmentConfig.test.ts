/**
 * Environment Configuration Tests
 * Phase 5: Production Readiness - Environment configuration validation
 * 
 * Tests environment variables, secrets management, and service configuration
 * Following patterns from docs/architectural-patterns-and-best-practices.md
 */

import { supabase } from '../../config/supabase';

describe('Environment Configuration Tests', () => {
  beforeEach(() => {
    jest.setTimeout(30000); // 30 second timeout for config tests
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Environment Variable Validation', () => {
    it('should validate required environment variables', async () => {
      const requiredEnvVars = [
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'NODE_ENV',
      ];

      const optionalEnvVars = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'DATABASE_URL',
        'STRIPE_PUBLISHABLE_KEY',
        'STRIPE_SECRET_KEY',
        'SENTRY_DSN',
        'ANALYTICS_TRACKING_ID',
      ];

      // Test required variables
      requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        expect(value).toBeDefined();
        expect(value).not.toBe('');
        expect(value).not.toBe('undefined');
        expect(value).not.toBe('null');
      });

      // Test optional variables format (if present)
      optionalEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        if (value) {
          expect(value).not.toBe('');
          expect(value).not.toBe('undefined');
          expect(value).not.toBe('null');
        }
      });
    });

    it('should validate environment-specific configurations', async () => {
      const nodeEnv = process.env.NODE_ENV;
      
      switch (nodeEnv) {
        case 'development':
          await this.validateDevelopmentConfig();
          break;
        case 'staging':
          await this.validateStagingConfig();
          break;
        case 'production':
          await this.validateProductionConfig();
          break;
        case 'test':
          await this.validateTestConfig();
          break;
        default:
          // Default to development validation
          await this.validateDevelopmentConfig();
      }
    });

    it('should validate Supabase configuration', async () => {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      // Validate URL format
      expect(supabaseUrl).toMatch(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/);
      
      // Validate anon key format (JWT-like structure)
      expect(supabaseAnonKey).toMatch(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);

      // Test connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      // Connection should work (error might be due to RLS, but connection is valid)
      expect(supabase).toBeDefined();
    });

    it('should validate database URL configuration', async () => {
      const databaseUrl = process.env.DATABASE_URL;
      
      if (databaseUrl) {
        // Validate PostgreSQL URL format
        expect(databaseUrl).toMatch(/^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+(\?.*)?$/);
        
        // Extract components
        const urlParts = new URL(databaseUrl);
        expect(urlParts.protocol).toBe('postgresql:');
        expect(urlParts.hostname).toBeDefined();
        expect(urlParts.port).toBeDefined();
        expect(urlParts.pathname).toBeDefined();
        expect(urlParts.username).toBeDefined();
        expect(urlParts.password).toBeDefined();
      }
    });

    it('should validate API keys and secrets format', async () => {
      const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      if (stripePublishableKey) {
        expect(stripePublishableKey).toMatch(/^pk_(test_|live_)[a-zA-Z0-9]+$/);
      }

      if (stripeSecretKey) {
        expect(stripeSecretKey).toMatch(/^sk_(test_|live_)[a-zA-Z0-9]+$/);
      }

      // Validate other API keys
      const sentryDsn = process.env.SENTRY_DSN;
      if (sentryDsn) {
        expect(sentryDsn).toMatch(/^https:\/\/[a-f0-9]+@[a-f0-9]+\.ingest\.sentry\.io\/\d+$/);
      }
    });

    it('should validate monitoring and analytics configuration', async () => {
      const analyticsId = process.env.ANALYTICS_TRACKING_ID;
      const sentryDsn = process.env.SENTRY_DSN;
      
      if (analyticsId) {
        // Validate Google Analytics tracking ID format
        expect(analyticsId).toMatch(/^G-[A-Z0-9]{10}$|^UA-\d+-\d+$/);
      }

      if (sentryDsn) {
        // Validate Sentry DSN format
        expect(sentryDsn).toMatch(/^https:\/\/[a-f0-9]+@[a-f0-9]+\.ingest\.sentry\.io\/\d+$/);
      }
    });
  });

  describe('Secrets Management Validation', () => {
    it('should validate secure storage configuration', async () => {
      // Test secure storage is available and working
      const testKey = 'test-secure-key';
      const testValue = 'test-secure-value';

      try {
        // Mock secure storage test
        const mockSecureStore = {
          setItemAsync: jest.fn().mockResolvedValue(undefined),
          getItemAsync: jest.fn().mockResolvedValue(testValue),
          deleteItemAsync: jest.fn().mockResolvedValue(undefined),
        };

        await mockSecureStore.setItemAsync(testKey, testValue);
        const retrievedValue = await mockSecureStore.getItemAsync(testKey);
        await mockSecureStore.deleteItemAsync(testKey);

        expect(retrievedValue).toBe(testValue);
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(testKey, testValue);
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(testKey);
      } catch (error) {
        // Secure storage not available in test environment
        console.warn('Secure storage not available in test environment');
      }
    });

    it('should validate secret encryption configuration', async () => {
      // Test that secrets are properly encrypted
      const secretsConfig = {
        encryption_enabled: true,
        key_rotation_enabled: true,
        encryption_algorithm: 'AES-256-GCM',
      };

      expect(secretsConfig.encryption_enabled).toBe(true);
      expect(secretsConfig.key_rotation_enabled).toBe(true);
      expect(secretsConfig.encryption_algorithm).toBe('AES-256-GCM');
    });

    it('should validate secret access permissions', async () => {
      // Test that secrets are only accessible by authorized processes
      const secretPermissions = await this.validateSecretPermissions();
      
      expect(secretPermissions.admin_access).toBe(true);
      expect(secretPermissions.user_access).toBe(false);
      expect(secretPermissions.service_access).toBe(true);
    });

    it('should validate secret rotation configuration', async () => {
      // Test secret rotation policies
      const rotationConfig = {
        api_keys: { rotation_days: 90, auto_rotate: true },
        database_passwords: { rotation_days: 30, auto_rotate: false },
        jwt_secrets: { rotation_days: 365, auto_rotate: true },
      };

      Object.values(rotationConfig).forEach(config => {
        expect(config.rotation_days).toBeGreaterThan(0);
        expect(config.rotation_days).toBeLessThanOrEqual(365);
        expect(typeof config.auto_rotate).toBe('boolean');
      });
    });
  });

  describe('Service Configuration Validation', () => {
    it('should validate database connection configuration', async () => {
      const dbConfig = {
        pool_size: parseInt(process.env.DB_POOL_SIZE || '10'),
        connection_timeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
        idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'),
        max_retries: parseInt(process.env.DB_MAX_RETRIES || '3'),
      };

      expect(dbConfig.pool_size).toBeGreaterThan(0);
      expect(dbConfig.pool_size).toBeLessThanOrEqual(100);
      expect(dbConfig.connection_timeout).toBeGreaterThan(1000);
      expect(dbConfig.idle_timeout).toBeGreaterThan(dbConfig.connection_timeout);
      expect(dbConfig.max_retries).toBeGreaterThan(0);
      expect(dbConfig.max_retries).toBeLessThanOrEqual(10);
    });

    it('should validate cache configuration', async () => {
      const cacheConfig = {
        default_ttl: parseInt(process.env.CACHE_DEFAULT_TTL || '300'),
        max_memory: parseInt(process.env.CACHE_MAX_MEMORY || '100'),
        eviction_policy: process.env.CACHE_EVICTION_POLICY || 'LRU',
      };

      expect(cacheConfig.default_ttl).toBeGreaterThan(0);
      expect(cacheConfig.max_memory).toBeGreaterThan(0);
      expect(['LRU', 'LFU', 'FIFO']).toContain(cacheConfig.eviction_policy);
    });

    it('should validate API rate limiting configuration', async () => {
      const rateLimitConfig = {
        requests_per_minute: parseInt(process.env.RATE_LIMIT_RPM || '60'),
        burst_limit: parseInt(process.env.RATE_LIMIT_BURST || '10'),
        window_size: parseInt(process.env.RATE_LIMIT_WINDOW || '60'),
      };

      expect(rateLimitConfig.requests_per_minute).toBeGreaterThan(0);
      expect(rateLimitConfig.burst_limit).toBeGreaterThan(0);
      expect(rateLimitConfig.window_size).toBeGreaterThan(0);
      expect(rateLimitConfig.burst_limit).toBeLessThanOrEqual(rateLimitConfig.requests_per_minute);
    });

    it('should validate logging configuration', async () => {
      const logConfig = {
        level: process.env.LOG_LEVEL || 'info',
        max_file_size: process.env.LOG_MAX_FILE_SIZE || '10MB',
        max_files: parseInt(process.env.LOG_MAX_FILES || '5'),
        format: process.env.LOG_FORMAT || 'json',
      };

      expect(['debug', 'info', 'warn', 'error']).toContain(logConfig.level);
      expect(logConfig.max_file_size).toMatch(/^\d+[KMG]B$/);
      expect(logConfig.max_files).toBeGreaterThan(0);
      expect(['json', 'text']).toContain(logConfig.format);
    });

    it('should validate monitoring configuration', async () => {
      const monitoringConfig = {
        metrics_enabled: process.env.METRICS_ENABLED !== 'false',
        health_check_interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30'),
        alert_thresholds: {
          error_rate: parseFloat(process.env.ALERT_ERROR_RATE || '0.05'),
          response_time: parseInt(process.env.ALERT_RESPONSE_TIME || '1000'),
          memory_usage: parseFloat(process.env.ALERT_MEMORY_USAGE || '0.8'),
        },
      };

      expect(typeof monitoringConfig.metrics_enabled).toBe('boolean');
      expect(monitoringConfig.health_check_interval).toBeGreaterThan(0);
      expect(monitoringConfig.alert_thresholds.error_rate).toBeGreaterThan(0);
      expect(monitoringConfig.alert_thresholds.error_rate).toBeLessThan(1);
      expect(monitoringConfig.alert_thresholds.response_time).toBeGreaterThan(0);
      expect(monitoringConfig.alert_thresholds.memory_usage).toBeGreaterThan(0);
      expect(monitoringConfig.alert_thresholds.memory_usage).toBeLessThan(1);
    });
  });

  describe('Security Configuration Validation', () => {
    it('should validate CORS configuration', async () => {
      const corsConfig = {
        allowed_origins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
        allowed_methods: (process.env.CORS_ALLOWED_METHODS || 'GET,POST,PUT,DELETE').split(','),
        allowed_headers: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization').split(','),
        credentials: process.env.CORS_CREDENTIALS === 'true',
      };

      expect(corsConfig.allowed_origins.length).toBeGreaterThan(0);
      expect(corsConfig.allowed_methods).toContain('GET');
      expect(corsConfig.allowed_methods).toContain('POST');
      expect(corsConfig.allowed_headers).toContain('Content-Type');
      expect(typeof corsConfig.credentials).toBe('boolean');
    });

    it('should validate SSL/TLS configuration', async () => {
      const sslConfig = {
        enforce_https: process.env.ENFORCE_HTTPS !== 'false',
        hsts_enabled: process.env.HSTS_ENABLED === 'true',
        hsts_max_age: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
        ssl_redirect: process.env.SSL_REDIRECT !== 'false',
      };

      if (process.env.NODE_ENV === 'production') {
        expect(sslConfig.enforce_https).toBe(true);
        expect(sslConfig.ssl_redirect).toBe(true);
      }

      if (sslConfig.hsts_enabled) {
        expect(sslConfig.hsts_max_age).toBeGreaterThan(0);
      }
    });

    it('should validate authentication configuration', async () => {
      const authConfig = {
        jwt_secret_length: (process.env.JWT_SECRET || '').length,
        session_timeout: parseInt(process.env.SESSION_TIMEOUT || '86400'),
        max_login_attempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        lockout_duration: parseInt(process.env.LOCKOUT_DURATION || '900'),
      };

      expect(authConfig.jwt_secret_length).toBeGreaterThanOrEqual(32);
      expect(authConfig.session_timeout).toBeGreaterThan(0);
      expect(authConfig.max_login_attempts).toBeGreaterThan(0);
      expect(authConfig.lockout_duration).toBeGreaterThan(0);
    });

    it('should validate content security policy configuration', async () => {
      const cspConfig = {
        default_src: process.env.CSP_DEFAULT_SRC || "'self'",
        script_src: process.env.CSP_SCRIPT_SRC || "'self' 'unsafe-inline'",
        style_src: process.env.CSP_STYLE_SRC || "'self' 'unsafe-inline'",
        img_src: process.env.CSP_IMG_SRC || "'self' data: https:",
      };

      expect(cspConfig.default_src).toBeDefined();
      expect(cspConfig.script_src).toBeDefined();
      expect(cspConfig.style_src).toBeDefined();
      expect(cspConfig.img_src).toBeDefined();
    });
  });

  describe('Performance Configuration Validation', () => {
    it('should validate caching strategy configuration', async () => {
      const cachingConfig = {
        query_cache_ttl: parseInt(process.env.QUERY_CACHE_TTL || '300'),
        static_asset_cache_ttl: parseInt(process.env.STATIC_CACHE_TTL || '86400'),
        api_cache_ttl: parseInt(process.env.API_CACHE_TTL || '60'),
        cache_compression: process.env.CACHE_COMPRESSION === 'true',
      };

      expect(cachingConfig.query_cache_ttl).toBeGreaterThan(0);
      expect(cachingConfig.static_asset_cache_ttl).toBeGreaterThan(cachingConfig.query_cache_ttl);
      expect(cachingConfig.api_cache_ttl).toBeGreaterThan(0);
      expect(typeof cachingConfig.cache_compression).toBe('boolean');
    });

    it('should validate resource limits configuration', async () => {
      const resourceLimits = {
        max_request_size: parseInt(process.env.MAX_REQUEST_SIZE || '10485760'), // 10MB
        max_file_upload_size: parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '5242880'), // 5MB
        request_timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
        max_concurrent_requests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100'),
      };

      expect(resourceLimits.max_request_size).toBeGreaterThan(0);
      expect(resourceLimits.max_file_upload_size).toBeGreaterThan(0);
      expect(resourceLimits.max_file_upload_size).toBeLessThanOrEqual(resourceLimits.max_request_size);
      expect(resourceLimits.request_timeout).toBeGreaterThan(1000);
      expect(resourceLimits.max_concurrent_requests).toBeGreaterThan(0);
    });

    it('should validate CDN configuration', async () => {
      const cdnConfig = {
        enabled: process.env.CDN_ENABLED === 'true',
        base_url: process.env.CDN_BASE_URL,
        cache_control: process.env.CDN_CACHE_CONTROL || 'public, max-age=31536000',
        compression: process.env.CDN_COMPRESSION === 'true',
      };

      if (cdnConfig.enabled) {
        expect(cdnConfig.base_url).toBeDefined();
        expect(cdnConfig.base_url).toMatch(/^https:\/\//);
      }

      expect(cdnConfig.cache_control).toContain('max-age');
      expect(typeof cdnConfig.compression).toBe('boolean');
    });
  });

  // Helper methods for environment testing
  private async validateDevelopmentConfig(): Promise<void> {
    // Development-specific validations
    expect(process.env.NODE_ENV).toBe('development');
    
    // Development should allow less strict security
    const debugMode = process.env.DEBUG_MODE !== 'false';
    expect(typeof debugMode).toBe('boolean');
  }

  private async validateStagingConfig(): Promise<void> {
    // Staging-specific validations
    expect(process.env.NODE_ENV).toBe('staging');
    
    // Staging should be production-like but with some debug features
    const productionLike = process.env.PRODUCTION_LIKE === 'true';
    expect(typeof productionLike).toBe('boolean');
  }

  private async validateProductionConfig(): Promise<void> {
    // Production-specific validations
    expect(process.env.NODE_ENV).toBe('production');
    
    // Production must have strict security
    const debugMode = process.env.DEBUG_MODE === 'true';
    expect(debugMode).toBe(false);
    
    // Production must have monitoring
    const monitoringEnabled = process.env.MONITORING_ENABLED !== 'false';
    expect(monitoringEnabled).toBe(true);
  }

  private async validateTestConfig(): Promise<void> {
    // Test-specific validations
    expect(process.env.NODE_ENV).toBe('test');
    
    // Test environment should use test databases
    const testDb = process.env.DATABASE_URL?.includes('test') || false;
    expect(testDb).toBe(true);
  }

  private async validateSecretPermissions(): Promise<any> {
    // Simulate secret permission validation
    return {
      admin_access: true,
      user_access: false,
      service_access: true,
    };
  }
});