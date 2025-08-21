// Centralized Query Key Factory with User Isolation Support and Fallback Strategies
export type EntityType = 'cart' | 'orders' | 'products' | 'auth' | 'stock' | 'kiosk' | 'notifications' | 'payment' | 'roles' | 'inventory' | 'businessMetrics' | 'businessIntelligence' | 'strategicReports' | 'predictiveForecasts';
export type UserIsolationLevel = 'user-specific' | 'admin-global' | 'global';

interface QueryKeyConfig {
  entity: EntityType;
  isolation: UserIsolationLevel;
}

interface QueryKeyOptions {
  fallbackToGlobal?: boolean;
  includeTimestamp?: boolean;
}

export const createQueryKeyFactory = (config: QueryKeyConfig) => {
  const { entity, isolation } = config;
  
  return {
    // Base keys with fallback support
    all: (userId?: string, options?: QueryKeyOptions) => {
      const base = [entity] as const;
      
      // Primary strategy: user-specific if isolation requires it and userId available
      if (isolation === 'user-specific' && userId) {
        return [...base, userId] as const;
      }
      
      // Fallback strategy: global key if user-specific fails
      if (isolation === 'user-specific' && !userId && options?.fallbackToGlobal) {
        console.warn(`⚠️ ${entity} falling back to global query key (userId unavailable)`);
        return [...base, 'global-fallback'] as const;
      }
      
      // Default: return base key
      return base;
    },
    
    // List operations with fallback
    lists: (userId?: string, options?: QueryKeyOptions) => {
      const baseKey = createQueryKeyFactory(config).all(userId, options);
      return [...baseKey, 'list'] as const;
    },
    
    list: (filters: any, userId?: string, options?: QueryKeyOptions) => {
      const listsKey = createQueryKeyFactory(config).lists(userId, options);
      return [...listsKey, filters] as const;
    },
    
    // Detail operations with fallback
    details: (userId?: string, options?: QueryKeyOptions) => {
      const baseKey = createQueryKeyFactory(config).all(userId, options);
      return [...baseKey, 'detail'] as const;
    },
    
    detail: (id: string, userId?: string, options?: QueryKeyOptions) => {
      const detailsKey = createQueryKeyFactory(config).details(userId, options);
      return [...detailsKey, id] as const;
    },
    
    // Stats operations
    stats: (userId?: string, options?: QueryKeyOptions) => {
      const baseKey = createQueryKeyFactory(config).all(userId, options);
      return [...baseKey, 'stats'] as const;
    },
    
    // Utility: Get all possible keys for invalidation (primary + fallbacks)
    getAllPossibleKeys: (userId?: string) => {
      const keys: unknown[][] = [];
      
      // Primary key
      keys.push([...createQueryKeyFactory(config).all(userId)]);
      
      // Fallback keys for user-specific entities
      if (isolation === 'user-specific') {
        keys.push([...createQueryKeyFactory(config).all(undefined, { fallbackToGlobal: true })]); // Global fallback
        keys.push([entity, 'global-fallback']); // Explicit fallback key
        keys.push([entity]); // Base fallback
      }
      
      return keys;
    },
    
    // Utility: Get invalidation keys with fallback strategy
    getInvalidationKeys: (userId?: string, includeAllFallbacks: boolean = false) => {
      if (includeAllFallbacks) {
        return createQueryKeyFactory(config).getAllPossibleKeys(userId);
      }
      
      // Standard invalidation (primary key only)
      return [createQueryKeyFactory(config).all(userId)];
    }
  };
};

// Pre-configured factories for each entity with fallback support
export const cartKeys = createQueryKeyFactory({ entity: 'cart', isolation: 'user-specific' });
export const orderKeys = createQueryKeyFactory({ entity: 'orders', isolation: 'user-specific' });
export const productKeys = createQueryKeyFactory({ entity: 'products', isolation: 'global' });
export const authKeys = createQueryKeyFactory({ entity: 'auth', isolation: 'user-specific' });
export const stockKeys = createQueryKeyFactory({ entity: 'stock', isolation: 'global' });

// Role-specific query key factory with entity-specific methods
const baseRoleKeys = createQueryKeyFactory({ entity: 'roles', isolation: 'user-specific' });

export const roleKeys = {
  ...baseRoleKeys,
  
  // User role queries
  user: (userId: string) => 
    [...baseRoleKeys.all(), 'user', userId] as const,
  
  // Role permission queries  
  permissions: (userId: string) => 
    [...baseRoleKeys.all(), 'user', userId, 'permissions'] as const,
  
  // All roles list (for admin use)
  allRoles: () => 
    [...baseRoleKeys.all(), 'all'] as const,
  
  // Role type queries
  roleType: (roleType: string) => 
    [...baseRoleKeys.all(), 'type', roleType] as const
};

// Inventory-specific query key factory with entity-specific methods
const baseInventoryKeys = createQueryKeyFactory({ entity: 'inventory', isolation: 'user-specific' });

export const inventoryKeys = {
  ...baseInventoryKeys,
  
  // Inventory Items
  items: (userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'items'] as const,
  
  item: (itemId: string, userId?: string) => 
    [...baseInventoryKeys.details(userId), 'item', itemId] as const,
  
  itemByProduct: (productId: string, userId?: string) => 
    [...baseInventoryKeys.details(userId), 'product', productId] as const,
  
  // Stock Operations
  lowStock: (filters?: any, userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'low-stock', filters] as const,
  
  visible: (userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'visible'] as const,
  
  active: (userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'active'] as const,
  
  // Stock Movements (Audit Trail)
  movements: (userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'movements'] as const,
  
  movement: (movementId: string, userId?: string) => 
    [...baseInventoryKeys.details(userId), 'movement', movementId] as const,
  
  movementHistory: (inventoryItemId: string, filters?: any, userId?: string) => 
    [...baseInventoryKeys.details(userId), 'item', inventoryItemId, 'movements', filters] as const,
  
  movementsByType: (movementType: string, filters?: any, userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'movements', 'type', movementType, filters] as const,
  
  movementsByUser: (performedBy: string, filters?: any, userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'movements', 'user', performedBy, filters] as const,
  
  movementsByBatch: (batchId: string, userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'movements', 'batch', batchId] as const,
  
  // Analytics
  analytics: (filters?: any, userId?: string) => 
    [...baseInventoryKeys.stats(userId), 'analytics', filters] as const,
  
  stockAnalytics: (filters?: any, userId?: string) => 
    [...baseInventoryKeys.stats(userId), 'stock', filters] as const
};
// Kiosk-specific query key factory with entity-specific methods
const baseKioskKeys = createQueryKeyFactory({ entity: 'kiosk', isolation: 'user-specific' });

export const kioskKeys = {
  ...baseKioskKeys,
  
  // Kiosk Sessions
  sessions: (userId?: string) => 
    [...baseKioskKeys.lists(userId), 'sessions'] as const,
  
  session: (sessionId: string, userId?: string) => 
    [...baseKioskKeys.details(userId), 'session', sessionId] as const,
  
  // Kiosk Authentication
  auth: (userId?: string) => 
    [...baseKioskKeys.all(userId), 'auth'] as const,
  
  // Kiosk Transactions
  transactions: (sessionId: string, userId?: string) => 
    [...baseKioskKeys.details(userId), 'session', sessionId, 'transactions'] as const,
};
export const notificationKeys = createQueryKeyFactory({ entity: 'notifications', isolation: 'user-specific' }); // Notifications are user-specific
// Payment-specific query key factory with entity-specific methods
const basePaymentKeys = createQueryKeyFactory({ entity: 'payment', isolation: 'user-specific' });

export const paymentKeys = {
  ...basePaymentKeys,
  
  // Payment Methods
  paymentMethods: (userId?: string) => 
    [...basePaymentKeys.lists(userId), 'methods'] as const,
  
  paymentMethod: (methodId: string, userId?: string) => 
    [...basePaymentKeys.details(userId), 'method', methodId] as const,
  
  defaultPaymentMethod: (userId?: string) => 
    [...basePaymentKeys.details(userId), 'method', 'default'] as const,
  
  // Payment Intents
  paymentIntents: (userId?: string) => 
    [...basePaymentKeys.lists(userId), 'intents'] as const,
  
  paymentIntent: (intentId: string, userId?: string) => 
    [...basePaymentKeys.details(userId), 'intent', intentId] as const,
  
  paymentIntentsFiltered: (filters: any, userId?: string) => 
    [...basePaymentKeys.lists(userId), 'intents', filters] as const,
  
  // Payment History
  paymentHistory: (userId?: string) => 
    [...basePaymentKeys.lists(userId), 'history'] as const,
  
  paymentHistoryFiltered: (filters: any, userId?: string) => 
    [...basePaymentKeys.lists(userId), 'history', filters] as const,
  
  // Payment Settings
  paymentSettings: (userId?: string) => 
    [...basePaymentKeys.details(userId), 'settings'] as const,
  
  // Specific payment transactions
  payment: (paymentId: string, userId?: string) => 
    [...basePaymentKeys.details(userId), 'payment', paymentId] as const,
  
  // Order-related payments
  orderPayments: (orderId: string, userId?: string) => 
    [...basePaymentKeys.details(userId), 'order', orderId, 'payments'] as const,
  
  // Customer-related payments (for Stripe customer integration)
  customerPayments: (customerId: string, userId?: string) => 
    [...basePaymentKeys.details(userId), 'customer', customerId] as const,
  
  // Webhook and event tracking
  paymentEvents: (paymentId: string, userId?: string) => 
    [...basePaymentKeys.details(userId), 'payment', paymentId, 'events'] as const,
  
  // Real-time status tracking
  paymentStatus: (paymentId: string, userId?: string) => 
    [...basePaymentKeys.details(userId), 'payment', paymentId, 'status'] as const,
};

// Utility function to get user-specific query key with fallback
export const getUserSpecificKey = (entity: EntityType, userId?: string, ...additionalKeys: string[]) => {
  const factory = createQueryKeyFactory({ entity, isolation: 'user-specific' });
  const baseKey = factory.all(userId, { fallbackToGlobal: !userId });
  return [...baseKey, ...additionalKeys] as const;
};

// Utility function to invalidate all user-specific queries for an entity with fallback support
export const getUserEntityInvalidationKeys = (entity: EntityType, userId?: string, includeFallbacks: boolean = true) => {
  const factory = createQueryKeyFactory({ entity, isolation: 'user-specific' });
  return factory.getInvalidationKeys(userId, includeFallbacks);
};

// Phase 4: Executive Analytics Query Key Factories
// Business Metrics query key factory
const baseBusinessMetricsKeys = createQueryKeyFactory({ entity: 'businessMetrics', isolation: 'user-specific' });

export const businessMetricsKeys = {
  ...baseBusinessMetricsKeys,
  
  // Category-based queries
  category: (category: string, userId?: string) =>
    [...baseBusinessMetricsKeys.lists(userId), 'category', category] as const,
  
  categoryWithFilters: (category: string, filters: any, userId?: string) =>
    [...baseBusinessMetricsKeys.lists(userId), 'category', category, filters] as const,
  
  // Aggregation queries
  aggregation: (categories: string[], aggregationLevel: string, dateRange: string, userId?: string) =>
    [...baseBusinessMetricsKeys.stats(userId), 'aggregation', { categories, aggregationLevel, dateRange }] as const,
  
  // Correlation analysis
  correlation: (category1: string, category2: string, dateRange: string, userId?: string) =>
    [...baseBusinessMetricsKeys.stats(userId), 'correlation', category1, category2, dateRange] as const,
  
  // Trend analysis
  trends: (category: string, metricName: string, dateRange: string, userId?: string) =>
    [...baseBusinessMetricsKeys.stats(userId), 'trends', category, metricName, dateRange] as const,
  
  // Batch operations
  batch: (operation: string, userId?: string) =>
    [...baseBusinessMetricsKeys.all(userId), 'batch', operation] as const
};

// Business Intelligence query key factory
const baseBusinessIntelligenceKeys = createQueryKeyFactory({ entity: 'businessIntelligence', isolation: 'user-specific' });

export const businessIntelligenceKeys = {
  ...baseBusinessIntelligenceKeys,
  
  // Insight type queries
  insightType: (type: string, userId?: string) =>
    [...baseBusinessIntelligenceKeys.lists(userId), 'type', type] as const,
  
  // Impact level queries
  impactLevel: (level: string, userId?: string) =>
    [...baseBusinessIntelligenceKeys.lists(userId), 'impact', level] as const,
  
  // Affected areas queries
  affectedAreas: (areas: string[], userId?: string) =>
    [...baseBusinessIntelligenceKeys.lists(userId), 'areas', areas] as const,
  
  // Active insights
  active: (userId?: string) =>
    [...baseBusinessIntelligenceKeys.lists(userId), 'active'] as const,
  
  // Insight generation
  generation: (parameters: any, userId?: string) =>
    [...baseBusinessIntelligenceKeys.stats(userId), 'generation', parameters] as const,
  
  // Anomaly detection
  anomalies: (dateRange: string, userId?: string) =>
    [...baseBusinessIntelligenceKeys.stats(userId), 'anomalies', dateRange] as const,
  
  // Recommendations
  recommendations: (category: string, userId?: string) =>
    [...baseBusinessIntelligenceKeys.lists(userId), 'recommendations', category] as const
};

// Strategic Reports query key factory  
const baseStrategicReportsKeys = createQueryKeyFactory({ entity: 'strategicReports', isolation: 'user-specific' });

export const strategicReportsKeys = {
  ...baseStrategicReportsKeys,
  
  // Report type queries
  reportType: (type: string, userId?: string) =>
    [...baseStrategicReportsKeys.lists(userId), 'type', type] as const,
  
  // Report frequency queries
  frequency: (frequency: string, userId?: string) =>
    [...baseStrategicReportsKeys.lists(userId), 'frequency', frequency] as const,
  
  // Automated reports
  automated: (userId?: string) =>
    [...baseStrategicReportsKeys.lists(userId), 'automated'] as const,
  
  // Report generation
  generation: (reportId: string, userId?: string) =>
    [...baseStrategicReportsKeys.details(userId), 'generation', reportId] as const,
  
  // Report data
  reportData: (reportId: string, filters: any, userId?: string) =>
    [...baseStrategicReportsKeys.details(userId), 'data', reportId, filters] as const,
  
  // Export operations
  export: (reportId: string, format: string, userId?: string) =>
    [...baseStrategicReportsKeys.details(userId), 'export', reportId, format] as const,
  
  // Schedule operations
  schedule: (reportId: string, userId?: string) =>
    [...baseStrategicReportsKeys.details(userId), 'schedule', reportId] as const
};

// Predictive Forecasts query key factory
const basePredictiveForecastsKeys = createQueryKeyFactory({ entity: 'predictiveForecasts', isolation: 'user-specific' });

export const predictiveForecastsKeys = {
  ...basePredictiveForecastsKeys,
  
  // Forecast type queries
  forecastType: (type: string, userId?: string) =>
    [...basePredictiveForecastsKeys.lists(userId), 'type', type] as const,
  
  // Model type queries
  modelType: (model: string, userId?: string) =>
    [...basePredictiveForecastsKeys.lists(userId), 'model', model] as const,
  
  // Target-specific forecasts
  target: (target: string, userId?: string) =>
    [...basePredictiveForecastsKeys.lists(userId), 'target', target] as const,
  
  // Active forecasts (not expired)
  active: (userId?: string) =>
    [...basePredictiveForecastsKeys.lists(userId), 'active'] as const,
  
  // Forecast generation
  generation: (parameters: any, userId?: string) =>
    [...basePredictiveForecastsKeys.stats(userId), 'generation', parameters] as const,
  
  // Model accuracy tracking
  accuracy: (modelType: string, userId?: string) =>
    [...basePredictiveForecastsKeys.stats(userId), 'accuracy', modelType] as const,
  
  // Forecast validation
  validation: (forecastId: string, userId?: string) =>
    [...basePredictiveForecastsKeys.details(userId), 'validation', forecastId] as const,
  
  // Confidence intervals
  confidence: (forecastId: string, level: number, userId?: string) =>
    [...basePredictiveForecastsKeys.details(userId), 'confidence', forecastId, level] as const
};

// Executive Analytics Cross-Entity Query Keys
export const executiveAnalyticsKeys = {
  // Cross-role analytics dashboard
  dashboard: (userId?: string) =>
    ['executive', 'dashboard', userId] as const,
  
  // Cross-entity correlation analysis
  crossCorrelation: (entities: string[], dateRange: string, userId?: string) =>
    ['executive', 'cross-correlation', entities, dateRange, userId] as const,
  
  // Executive summary data
  summary: (period: string, userId?: string) =>
    ['executive', 'summary', period, userId] as const,
  
  // Strategic insights aggregation
  strategicInsights: (filters: any, userId?: string) =>
    ['executive', 'strategic-insights', filters, userId] as const,
  
  // Performance benchmarks
  benchmarks: (category: string, period: string, userId?: string) =>
    ['executive', 'benchmarks', category, period, userId] as const
};

// Enhanced invalidation utility that handles offline/fallback scenarios
export const createRobustInvalidation = (queryClient: any) => {
  return {
    invalidateEntity: async (entity: EntityType, userId?: string, options?: {
      includeFallbacks?: boolean;
      retryOnFailure?: boolean;
    }) => {
      const factory = createQueryKeyFactory({ 
        entity, 
        isolation: entity === 'products' || entity === 'stock' ? 'global' : 'user-specific' 
      });
      
      const keys = factory.getInvalidationKeys?.(userId, options?.includeFallbacks ?? true) || [factory.all(userId)];
      const results: Array<{ key: readonly unknown[]; success: boolean; error?: any }> = [];
      
      for (const key of keys) {
        try {
          await queryClient.invalidateQueries({ queryKey: key as readonly unknown[] });
          results.push({ key, success: true });
          console.log(`✅ Invalidated ${entity} query key:`, key);
        } catch (error) {
          results.push({ key, success: false, error });
          console.error(`❌ Failed to invalidate ${entity} query key:`, key, error);
          
          // Retry strategy
          if (options?.retryOnFailure) {
            try {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
              await queryClient.invalidateQueries({ queryKey: key as readonly unknown[] });
              results[results.length - 1] = { key, success: true };
              console.log(`✅ Retry successful for ${entity} query key:`, key);
            } catch (retryError) {
              console.error(`❌ Retry failed for ${entity} query key:`, key, retryError);
            }
          }
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      console.log(`📊 ${entity} invalidation summary: ${successCount}/${totalCount} successful`);
      
      return {
        success: successCount > 0, // Success if at least one invalidation worked
        results,
        summary: { successCount, totalCount }
      };
    }
  };
};
