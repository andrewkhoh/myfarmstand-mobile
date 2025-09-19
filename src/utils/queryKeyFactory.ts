// Centralized Query Key Factory with User Isolation Support and Fallback Strategies
export type EntityType = 'cart' | 'orders' | 'products' | 'auth' | 'stock' | 'kiosk' | 'notifications' | 'payment' | 'roles' | 'inventory' | 'businessMetrics' | 'businessIntelligence' | 'strategicReports' | 'predictiveForecasts' | 'content' | 'campaigns' | 'bundles' | 'navigation' | 'marketing' | 'decision-support' | 'order-analytics' | 'conversion-funnel' | 'historical-analysis' | 'cross-role-analytics';
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

// Roles query key factory with role-specific methods
const baseRoleKeys = createQueryKeyFactory({ entity: 'roles', isolation: 'user-specific' });

export const roleKeys = {
  ...baseRoleKeys,

  // User role queries
  user: (userId: string) =>
    [...baseRoleKeys.all(), 'user', userId] as const,

  // Current user role
  userRole: (userId: string) =>
    [...baseRoleKeys.all(userId), 'current'] as const,

  // Role permission queries
  permissions: (userId: string) =>
    [...baseRoleKeys.all(), 'user', userId, 'permissions'] as const,

  // Individual permission checks (centralized pattern)
  hasPermission: (userId: string, permission: string) =>
    [...roleKeys.permissions(userId), 'has', permission] as const,

  // Action permission checks (centralized pattern)
  canPerformAction: (userId: string, resource: string, action: string) =>
    [...roleKeys.permissions(userId), 'can', resource, action] as const,

  // Batch permission checks (centralized pattern)
  hasAllPermissions: (userId: string, permissions: string[]) =>
    [...roleKeys.permissions(userId), 'hasAll', permissions.sort().join(',')] as const,

  hasAnyPermission: (userId: string, permissions: string[]) =>
    [...roleKeys.permissions(userId), 'hasAny', permissions.sort().join(',')] as const,

  // All roles list (for admin use)
  allRoles: () =>
    [...baseRoleKeys.all(), 'all'] as const,

  // Role type queries
  roleType: (roleType: string) =>
    [...baseRoleKeys.all(), 'type', roleType] as const
};

// Products query key factory with product-specific methods
const baseProductKeys = createQueryKeyFactory({ entity: 'products', isolation: 'global' });

export const productKeys = {
  ...baseProductKeys,
  
  // Search queries
  search: (searchQuery: string) => 
    [...baseProductKeys.lists(), 'search', searchQuery] as const,
  
  // Category queries
  categories: () => 
    [...baseProductKeys.lists(), 'categories'] as const,
  
  // Products by category
  byCategory: (categoryId: string) => 
    [...baseProductKeys.lists(), 'category', categoryId] as const,
};

// Auth query key factory with auth-specific methods
const baseAuthKeys = createQueryKeyFactory({ entity: 'auth', isolation: 'user-specific' });

export const authKeys = {
  ...baseAuthKeys,
  
  // Auth status queries
  status: () => 
    [...baseAuthKeys.all(), 'status'] as const,
  
  // Profile queries
  profile: (userId?: string) => 
    [...baseAuthKeys.all(), 'profile'] as const,
  
  userProfile: (userId: string) => 
    [...baseAuthKeys.details(userId), 'profile'] as const,
  
  // Settings queries
  settings: () => 
    [...baseAuthKeys.all(), 'settings'] as const,
  
  // Current user query
  currentUser: () => 
    [...baseAuthKeys.all(), 'current-user'] as const,
  
  // User details query
  user: (userId: string) => 
    [...baseAuthKeys.details(userId)] as const,
};

export const stockKeys = createQueryKeyFactory({ entity: 'stock', isolation: 'global' });

// Navigation-specific query key factory with entity-specific methods
const baseNavigationKeys = createQueryKeyFactory({ entity: 'navigation', isolation: 'user-specific' });

export const navigationKeys = {
  ...baseNavigationKeys,
  
  // Menu queries
  menus: (userId?: string) => 
    [...baseNavigationKeys.lists(userId), 'menus'] as const,
  
  menu: (role: string, userId?: string) => 
    [...baseNavigationKeys.lists(userId), 'menus', role] as const,
  
  menuWithRefresh: (role: string, refreshTrigger: number, userId?: string) => 
    [...baseNavigationKeys.lists(userId), 'menus', role, refreshTrigger] as const,
  
  // Permission queries
  permissions: (userId?: string) => 
    [...baseNavigationKeys.lists(userId), 'permissions'] as const,
  
  permission: (role: string, screen: string, userId?: string) => 
    [...baseNavigationKeys.lists(userId), 'permissions', role, screen] as const,
  
  // Batch permission queries
  batchPermissions: (role: string, screens: string[], userId?: string) => 
    [...baseNavigationKeys.lists(userId), 'permissions', role, 'batch', ...screens.sort()] as const,
  
  // Navigation state queries
  state: (userId?: string) => 
    [...baseNavigationKeys.all(userId), 'state'] as const,
  
  userState: (userId: string) => 
    [...baseNavigationKeys.all(userId), 'state', userId] as const,
  
  // Navigation history queries
  history: (userId?: string) => 
    [...baseNavigationKeys.all(userId), 'history'] as const,
  
  userHistory: (userId: string) => 
    [...baseNavigationKeys.all(userId), 'history', userId] as const,
  
  // Deep link validation queries
  deepLinks: (userId?: string) => 
    [...baseNavigationKeys.all(userId), 'deep-links'] as const,
  
  deepLink: (link: string, role: string, userId?: string) => 
    [...baseNavigationKeys.all(userId), 'deep-links', role, link] as const,
  
  // Menu customization queries
  menuCustomization: (userId?: string) => 
    ['menu-customization', userId] as const
};

// Inventory-specific query key factory with entity-specific methods
const baseInventoryKeys = createQueryKeyFactory({ entity: 'inventory', isolation: 'user-specific' });

export const inventoryKeys = {
  ...baseInventoryKeys,

  // List queries - for the main inventory list
  list: (userId: string, filters?: any) =>
    [...baseInventoryKeys.lists(userId), filters] as const,

  lists: (userId: string) =>
    [...baseInventoryKeys.lists(userId)] as const,

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
  
  // Availability and Impact queries
  availability: () => 
    [...baseInventoryKeys.all(), 'availability'] as const,
  
  impact: () => 
    [...baseInventoryKeys.all(), 'impact'] as const,
  
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
    [...baseInventoryKeys.stats(userId), 'stock', filters] as const,
  
  // Dashboard-specific keys
  dashboard: (userId?: string) => 
    [...baseInventoryKeys.stats(userId), 'dashboard'] as const,
  
  alerts: (userId?: string) => 
    [...baseInventoryKeys.lists(userId), 'alerts'] as const,
  
  performanceMetrics: (userId?: string) => 
    [...baseInventoryKeys.stats(userId), 'performance'] as const,
  
  realtimeStatus: (userId?: string) =>
    [...baseInventoryKeys.stats(userId), 'realtime-status'] as const,

  // Warehouse-specific items
  warehouseItems: (warehouseId: string, userId?: string) =>
    [...baseInventoryKeys.lists(userId), 'warehouse', warehouseId] as const
};
// Kiosk-specific query key factory with entity-specific methods
const baseKioskKeys = createQueryKeyFactory({ entity: 'kiosk', isolation: 'user-specific' });

export const kioskKeys = {
  ...baseKioskKeys,
  
  // Kiosk Sessions
  sessions: (userId?: string) => 
    [...baseKioskKeys.lists(userId), 'sessions'] as const,
  
  sessionsList: (filters: any, userId?: string) => 
    [...baseKioskKeys.lists(userId), 'sessions', filters] as const,
  
  session: (sessionId: string, userId?: string) => 
    [...baseKioskKeys.details(userId), 'session', sessionId] as const,
  
  // Kiosk Authentication
  auth: (userId?: string) => 
    [...baseKioskKeys.all(userId), 'auth'] as const,
  
  authList: (userId?: string) => 
    [...baseKioskKeys.lists(userId), 'auth'] as const,
  
  // Kiosk Transactions
  transactions: (sessionId: string, userId?: string) => 
    [...baseKioskKeys.details(userId), 'session', sessionId, 'transactions'] as const,
};
// Notification-specific query key factory with entity-specific methods
const baseNotificationKeys = createQueryKeyFactory({ entity: 'notifications', isolation: 'user-specific' });

export const notificationKeys = {
  ...baseNotificationKeys,
  
  // Preferences queries
  preferences: (userId: string) => 
    [...baseNotificationKeys.details(userId), 'preferences'] as const,
  
  // Type-specific notifications
  byType: (userId: string, type: string) => 
    [...baseNotificationKeys.details(userId), type] as const,
};
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

// Executive Analytics Query Keys - Using standardized factory pattern
const baseExecutiveKeys = createQueryKeyFactory({ entity: 'businessMetrics', isolation: 'user-specific' });

export const executiveAnalyticsKeys = {
  // Use base factory methods
  ...baseExecutiveKeys,

  // Cross-role analytics dashboard
  dashboard: (userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'dashboard'] as const,

  // Cross-entity correlation analysis
  crossCorrelation: (entities: string[], dateRange: string, userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'cross-correlation', entities, dateRange] as const,

  // Executive summary data
  summary: (period: string, userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'summary', period] as const,

  // Strategic insights aggregation
  strategicInsights: (filters: any, userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'strategic-insights', filters] as const,

  // Performance benchmarks
  benchmarks: (category: string, period: string, userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'benchmarks', category, period] as const,

  // Phase 4: Business Analytics Query Keys - Standardized with factory pattern
  businessMetrics: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'businessMetrics', ...(options ? [options] : [])] as const,

  businessInsights: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'businessInsights', ...(options ? [options] : [])] as const,

  strategicReporting: (userId?: string, reportId?: string) =>
    [...baseExecutiveKeys.all(userId), 'strategicReporting', ...(reportId ? [reportId] : [])] as const,

  predictiveAnalytics: (userId?: string, forecastType?: string) =>
    [...baseExecutiveKeys.all(userId), 'predictiveAnalytics', forecastType] as const,

  metricTrends: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'metricTrends', options] as const,

  crossRoleAnalytics: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'crossRoleAnalytics', options] as const,
  
  insightGeneration: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'insightGeneration', options] as const,

  anomalyDetection: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'anomalyDetection', options] as const,

  reportGeneration: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'reportGeneration', options] as const,

  reportScheduling: (userId?: string, type?: string) =>
    [...baseExecutiveKeys.all(userId), 'reportScheduling', type] as const,

  forecastGeneration: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'forecastGeneration', options] as const,

  predictions: (userId?: string, options?: any) =>
    [...baseExecutiveKeys.all(userId), 'predictions', options] as const,

  modelValidation: (userId?: string, modelId?: string) =>
    [...baseExecutiveKeys.all(userId), 'modelValidation', modelId] as const,

  // Specialized sub-keys for complex scenarios
  reportSchedulingAll: (userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'reportScheduling', 'all'] as const,

  modelValidationMonitoring: (userId?: string, modelId?: string) =>
    [...baseExecutiveKeys.all(userId), 'modelValidation', modelId, 'monitoring'] as const,

  modelValidationComparison: (userId?: string, modelId?: string) =>
    [...baseExecutiveKeys.all(userId), 'modelValidation', modelId, 'comparison'] as const,

  strategicReportingFiltered: (userId?: string, reportId?: string) =>
    [...baseExecutiveKeys.all(userId), 'strategicReporting', reportId, 'filtered'] as const,

  // Core executive queries for real-time sync
  metrics: (userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'metrics'] as const,

  insights: (userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'insights'] as const,

  crossRole: (userId?: string) =>
    [...baseExecutiveKeys.all(userId), 'crossRole'] as const,

  all: () =>
    baseExecutiveKeys.all()
};

// Alias for backward compatibility
export const executiveKeys = executiveAnalyticsKeys;

// Phase 3: Marketing Query Key Factories
// Product Content query key factory
const baseContentKeys = createQueryKeyFactory({ entity: 'content', isolation: 'user-specific' });

export const contentKeys = {
  ...baseContentKeys,
  
  // Status-based queries
  byStatus: (status: string, userId?: string) =>
    [...baseContentKeys.lists(userId), 'status', status] as const,
    
  byStatusPaginated: (status: string, pagination: any, userId?: string) =>
    [...baseContentKeys.lists(userId), 'status', status, pagination] as const,
    
  // Product-based queries
  byProduct: (productId: string, userId?: string) =>
    [...baseContentKeys.lists(userId), 'product', productId] as const,
  
  // Content performance tracking
  performance: (contentId: string, userId?: string) =>
    [...baseContentKeys.details(userId), 'content', contentId, 'performance'] as const,
  
  // Content analytics
  analytics: (contentId: string, userId?: string) =>
    [...baseContentKeys.details(userId), 'content', contentId, 'analytics'] as const,
  
  // Workflow states
  workflow: (userId?: string) =>
    [...baseContentKeys.all(userId), 'workflow'] as const,

  workflowState: (contentId: string, userId?: string) =>
    [...baseContentKeys.details(userId), 'content', contentId, 'workflow'] as const,

  // File upload operations
  uploads: (userId?: string) =>
    [...baseContentKeys.all(userId), 'uploads'] as const,

  upload: (uploadId: string, userId?: string) =>
    [...baseContentKeys.details(userId), 'upload', uploadId] as const
};

// Marketing Campaign query key factory
const baseCampaignKeys = createQueryKeyFactory({ entity: 'campaigns', isolation: 'user-specific' });

export const campaignKeys = {
  ...baseCampaignKeys,
  
  // Status-based queries
  byStatus: (status: string, userId?: string) =>
    [...baseCampaignKeys.lists(userId), 'status', status] as const,
    
  byStatusPaginated: (status: string, pagination: any, userId?: string) =>
    [...baseCampaignKeys.lists(userId), 'status', status, pagination] as const,
  
  // Campaign performance tracking
  performance: (campaignId: string, userId?: string) =>
    [...baseCampaignKeys.details(userId), 'campaign', campaignId, 'performance'] as const,
  
  // Campaign analytics  
  analytics: (campaignId: string, userId?: string) =>
    [...baseCampaignKeys.details(userId), 'campaign', campaignId, 'analytics'] as const,
  
  // Campaign metrics
  metrics: (userId?: string) =>
    [...baseCampaignKeys.all(userId), 'metrics'] as const,
  
  // Campaign scheduling
  scheduling: (userId?: string) =>
    [...baseCampaignKeys.all(userId), 'scheduling'] as const
};

// Product Bundle query key factory
const baseBundleKeys = createQueryKeyFactory({ entity: 'bundles', isolation: 'user-specific' });

export const bundleKeys = {
  ...baseBundleKeys,
  
  // Status-based queries
  byStatus: (status: string, userId?: string) =>
    [...baseBundleKeys.lists(userId), 'status', status] as const,
    
  byStatusPaginated: (status: string, pagination: any, userId?: string) =>
    [...baseBundleKeys.lists(userId), 'status', status, pagination] as const,
  
  // Bundle performance tracking
  performance: (bundleId: string, userId?: string) =>
    [...baseBundleKeys.details(userId), 'bundle', bundleId, 'performance'] as const,
  
  // Inventory impact tracking
  inventoryImpact: (userId?: string) =>
    [...baseBundleKeys.all(userId), 'inventory-impact'] as const,
    
  inventoryImpactForBundle: (bundleId: string, userId?: string) =>
    [...baseBundleKeys.details(userId), 'bundle', bundleId, 'inventory-impact'] as const,
  
  // Bundle products
  products: (bundleId: string, userId?: string) =>
    [...baseBundleKeys.details(userId), 'bundle', bundleId, 'products'] as const
};

// Marketing Cross-Entity Query Keys
const baseMarketingKeys = createQueryKeyFactory({ entity: 'marketing', isolation: 'user-specific' });

export const marketingKeys = {
  ...baseMarketingKeys,
  
  // Cross-entity marketing operations
  marketing: ['marketing'] as const,
  
  // Cross-entity analytics
  analytics: {
    dashboard: (userId?: string) =>
      [...baseMarketingKeys.all(userId), 'analytics', 'dashboard'] as const,
    all: (userId?: string) =>
      [...baseMarketingKeys.all(userId), 'analytics'] as const,
  },

  // Campaign-specific keys
  campaign: {
    active: (userId?: string) =>
      [...baseMarketingKeys.all(userId), 'campaign', 'active'] as const,
    all: (userId?: string) =>
      [...baseMarketingKeys.all(userId), 'campaign'] as const,
  },

  // Content-specific keys
  content: {
    pending: (userId?: string) =>
      [...baseMarketingKeys.all(userId), 'content', 'pending'] as const,
    all: (userId?: string) =>
      [...baseMarketingKeys.all(userId), 'content'] as const,
    list: (filters?: any, userId?: string) =>
      [...baseMarketingKeys.all(userId), 'content', 'list', filters] as const,
    detail: (contentId: string, userId?: string) =>
      [...baseMarketingKeys.all(userId), 'content', contentId] as const,
  },
  
  // Cross-entity performance tracking
  performance: (userId?: string) => 
    [...baseMarketingKeys.all(userId), 'performance'] as const,
  
  // Cross-entity workflow integration
  crossEntity: (userId?: string) => 
    [...baseMarketingKeys.all(userId), 'cross-entity'] as const,
  
  // Content-campaign associations
  contentCampaigns: (contentId: string, userId?: string) =>
    [...baseMarketingKeys.all(userId), 'content', contentId, 'campaigns'] as const,
  
  // Campaign-bundle associations
  campaignBundles: (campaignId: string, userId?: string) =>
    [...baseMarketingKeys.all(userId), 'campaign', campaignId, 'bundles'] as const,
  
  // Bundle-content associations
  bundleContent: (bundleId: string, userId?: string) =>
    [...baseMarketingKeys.all(userId), 'bundle', bundleId, 'content'] as const
};

// Decision Support query key factory (executive-only access)
const baseDecisionSupportKeys = createQueryKeyFactory({ entity: 'decision-support', isolation: 'user-specific' });

export const decisionSupportKeys = {
  ...baseDecisionSupportKeys,

  // Executive data queries
  executiveData: (userId?: string) =>
    [...baseDecisionSupportKeys.all(userId), 'executive-data'] as const,

  executiveDataWithFilters: (filters: any, userId?: string) =>
    [...baseDecisionSupportKeys.all(userId), 'executive-data', filters] as const,

  // Recommendation queries
  recommendations: (userId?: string) =>
    [...baseDecisionSupportKeys.lists(userId), 'recommendations'] as const,

  recommendationsWithOptions: (options: any, userId?: string) =>
    [...baseDecisionSupportKeys.lists(userId), 'recommendations', options] as const,

  recommendation: (recommendationId: string, userId?: string) =>
    [...baseDecisionSupportKeys.details(userId), 'recommendation', recommendationId] as const,

  // Data analysis queries
  inventoryAnalysis: (userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'analysis', 'inventory'] as const,

  marketingAnalysis: (userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'analysis', 'marketing'] as const,

  operationsAnalysis: (userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'analysis', 'operations'] as const,

  financialAnalysis: (userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'analysis', 'financial'] as const,

  customerAnalysis: (userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'analysis', 'customer'] as const,

  // Simulation and modeling
  simulations: (modelType: string, userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'simulations', modelType] as const,

  simulation: (simulationId: string, userId?: string) =>
    [...baseDecisionSupportKeys.details(userId), 'simulation', simulationId] as const,

  // Learning and feedback
  feedback: (recommendationId: string, userId?: string) =>
    [...baseDecisionSupportKeys.details(userId), 'recommendation', recommendationId, 'feedback'] as const,

  learningMetrics: (userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'learning-metrics'] as const,

  // Risk analysis
  riskAssessment: (category: string, userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'risk', category] as const,

  // Trend analysis
  trends: (dataType: string, period: string, userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'trends', dataType, period] as const,

  // Correlation analysis
  correlations: (metrics: string[], userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'correlations', metrics.sort().join(',')] as const,

  // Anomaly detection
  anomalies: (dataType: string, threshold: number, userId?: string) =>
    [...baseDecisionSupportKeys.stats(userId), 'anomalies', dataType, threshold] as const
};

// Order Analytics Query Key Factories (Task 13)
// Order Analytics query key factory
const baseOrderAnalyticsKeys = createQueryKeyFactory({ entity: 'order-analytics', isolation: 'user-specific' });

export const orderAnalyticsKeys = {
  ...baseOrderAnalyticsKeys,

  // Core order analytics queries
  insights: (userId?: string) =>
    [...baseOrderAnalyticsKeys.all(userId), 'insights'] as const,

  insightsWithFilters: (filters: any, userId?: string) =>
    [...baseOrderAnalyticsKeys.all(userId), 'insights', filters] as const,

  // Order workflow metrics
  workflowMetrics: (userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'workflow'] as const,

  workflowMetricsWithFilters: (filters: any, userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'workflow', filters] as const,

  // Order velocity and performance
  velocityMetrics: (userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'velocity'] as const,

  velocityMetricsWithPeriod: (period: string, userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'velocity', period] as const,

  // Pickup capacity analytics
  pickupCapacity: (userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'pickup-capacity'] as const,

  pickupCapacityWithDate: (date: string, userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'pickup-capacity', date] as const,

  // Pickup efficiency metrics
  pickupEfficiency: (userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'pickup-efficiency'] as const,

  pickupEfficiencyWithFilters: (filters: any, userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'pickup-efficiency', filters] as const,

  // Order attribution analytics
  attribution: (userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'attribution'] as const,

  attributionWithSource: (source: string, userId?: string) =>
    [...baseOrderAnalyticsKeys.stats(userId), 'attribution', source] as const
};

// Conversion Funnel Query Key Factory
const baseConversionFunnelKeys = createQueryKeyFactory({ entity: 'conversion-funnel', isolation: 'user-specific' });

export const conversionFunnelKeys = {
  ...baseConversionFunnelKeys,

  // Main conversion funnel analysis
  analysis: (userId?: string) =>
    [...baseConversionFunnelKeys.all(userId), 'analysis'] as const,

  analysisWithFilters: (filters: any, userId?: string) =>
    [...baseConversionFunnelKeys.all(userId), 'analysis', filters] as const,

  // Stage-specific metrics
  stage: (stage: string, userId?: string) =>
    [...baseConversionFunnelKeys.stats(userId), 'stage', stage] as const,

  stageWithFilters: (stage: string, filters: any, userId?: string) =>
    [...baseConversionFunnelKeys.stats(userId), 'stage', stage, filters] as const,

  // Customer segment analysis
  segment: (segment: string, userId?: string) =>
    [...baseConversionFunnelKeys.stats(userId), 'segment', segment] as const,

  segmentWithFilters: (segment: string, filters: any, userId?: string) =>
    [...baseConversionFunnelKeys.stats(userId), 'segment', segment, filters] as const,

  // Bottleneck identification
  bottlenecks: (userId?: string) =>
    [...baseConversionFunnelKeys.stats(userId), 'bottlenecks'] as const,

  // Conversion metrics by timeframe
  conversion: (timeframe: string, userId?: string) =>
    [...baseConversionFunnelKeys.stats(userId), 'conversion', timeframe] as const,

  // Funnel optimization recommendations
  optimization: (userId?: string) =>
    [...baseConversionFunnelKeys.stats(userId), 'optimization'] as const
};

// Historical Analysis Query Key Factory
const baseHistoricalAnalysisKeys = createQueryKeyFactory({ entity: 'historical-analysis', isolation: 'user-specific' });

export const historicalAnalysisKeys = {
  ...baseHistoricalAnalysisKeys,

  // Main historical pattern analysis
  patterns: (userId?: string) =>
    [...baseHistoricalAnalysisKeys.all(userId), 'patterns'] as const,

  patternsWithOptions: (options: any, userId?: string) =>
    [...baseHistoricalAnalysisKeys.all(userId), 'patterns', options] as const,

  // Trend analysis
  trends: (userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'trends'] as const,

  trendsWithMetric: (metric: string, userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'trends', metric] as const,

  // Seasonal pattern analysis
  seasonal: (userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'seasonal'] as const,

  seasonalWithGranularity: (granularity: string, userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'seasonal', granularity] as const,

  // Predictive insights
  predictions: (userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'predictions'] as const,

  predictionsWithHorizon: (horizon: number, userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'predictions', horizon] as const,

  // Statistical analysis
  statistics: (userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'statistics'] as const,

  // Anomaly detection
  anomalies: (userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'anomalies'] as const,

  anomaliesWithThreshold: (threshold: number, userId?: string) =>
    [...baseHistoricalAnalysisKeys.stats(userId), 'anomalies', threshold] as const
};

// Cross-Role Analytics Query Key Factory
const baseCrossRoleAnalyticsKeys = createQueryKeyFactory({ entity: 'cross-role-analytics', isolation: 'user-specific' });

export const crossRoleAnalyticsKeys = {
  ...baseCrossRoleAnalyticsKeys,

  // Cross-role dashboard data
  dashboard: (userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.all(userId), 'dashboard'] as const,

  dashboardWithFilters: (filters: any, userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.all(userId), 'dashboard', filters] as const,

  // Cross-entity correlation analysis
  correlations: (entities: string[], userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.stats(userId), 'correlations', entities.sort().join(',')] as const,

  correlationsWithDateRange: (entities: string[], dateRange: string, userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.stats(userId), 'correlations', entities.sort().join(','), dateRange] as const,

  // Role-specific analytics aggregation
  roleAnalytics: (role: string, userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.stats(userId), 'role', role] as const,

  roleAnalyticsWithMetrics: (role: string, metrics: string[], userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.stats(userId), 'role', role, metrics.sort().join(',')] as const,

  // Cross-departmental insights
  departmental: (departments: string[], userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.stats(userId), 'departmental', departments.sort().join(',')] as const,

  // Performance benchmarks across roles
  benchmarks: (benchmark: string, userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.stats(userId), 'benchmarks', benchmark] as const,

  benchmarksWithPeriod: (benchmark: string, period: string, userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.stats(userId), 'benchmarks', benchmark, period] as const,

  // Unified analytics summary
  summary: (userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.all(userId), 'summary'] as const,

  summaryWithScope: (scope: string, userId?: string) =>
    [...baseCrossRoleAnalyticsKeys.all(userId), 'summary', scope] as const
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
