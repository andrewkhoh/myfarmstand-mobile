/**
 * Test Setup Configuration
 * Main entry point for all test configurations
 * Supports different test modes via TestMode enum
 */

import * as dotenv from 'dotenv';
import { 
  applyBaseMocks, 
  setupGlobalCleanup, 
  suppressConsoleWarnings,
  monitoringMocks,
  resetAllMocks 
} from './base-setup';

// Load environment variables
dotenv.config();

// ============================================================================
// TEST MODE CONFIGURATION
// ============================================================================

export enum TestMode {
  DEFAULT = 'default',           // Standard tests with React Query mocked
  RACE_CONDITION = 'race',       // Race condition tests with real React Query
  SERVICE = 'service',           // Service layer tests
  REAL_DB = 'realdb',           // Real database connection tests
  E2E = 'e2e',                  // End-to-end tests
  INTEGRATION = 'integration',   // Integration tests
  PERFORMANCE = 'performance',   // Performance tests
  SECURITY = 'security',        // Security tests
  NAVIGATION = 'navigation',     // Navigation component tests
  MARKETING = 'marketing',       // Marketing campaign tests
  INVENTORY = 'inventory',       // Inventory management tests
  EXECUTIVE = 'executive',       // Executive analytics tests
}

// Get test mode from environment or use default
const getTestMode = (): TestMode => {
  const mode = process.env.TEST_MODE || (global as any).TEST_MODE;
  return (mode as TestMode) || TestMode.DEFAULT;
};

// ============================================================================
// SUPABASE MOCK CONFIGURATIONS
// ============================================================================

function mockSupabaseDefault() {
  const mockSupabaseBase = {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(),
          gte: jest.fn(),
          lte: jest.fn(),
          in: jest.fn(),
        })),
        or: jest.fn(),
        in: jest.fn(),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
      upsert: jest.fn(),
    })),
    rpc: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  };

  jest.mock('../config/supabase', () => ({
    supabase: mockSupabaseBase,
    TABLES: {
      PRODUCTS: 'products',
      CATEGORIES: 'categories',
      ORDERS: 'orders',
      USERS: 'users',
      CART: 'cart',
    }
  }));

  // Export for test access
  (global as any).mockSupabase = mockSupabaseBase;
}

function mockSupabaseForRaceCondition() {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockImplementation((callback) => {
      // Simulate subscription success with real timing for race conditions
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback('SUBSCRIBED');
        }
      }, 50);
      return mockChannel;
    }),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined)
  };

  jest.mock('../config/supabase', () => ({
    supabase: {
      channel: jest.fn().mockReturnValue(mockChannel),
      from: jest.fn(),
      auth: {
        getUser: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn()
      }
    }
  }));
}

// ============================================================================
// REACT QUERY MOCK
// ============================================================================

function mockReactQuery() {
  jest.mock('@tanstack/react-query', () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(),
    useQueryClient: jest.fn(),
    QueryClient: jest.fn(),
    QueryClientProvider: function QueryClientProvider(props: any) {
      return props.children;
    },
  }));
}

// ============================================================================
// SERVICE MOCKS
// ============================================================================

function mockServices() {
  // Mock CartService
  jest.mock('../services/cartService', () => ({
    cartService: {
      getCart: jest.fn(),
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
    }
  }));

  // Mock AuthService
  jest.mock('../services/authService', () => ({
    AuthService: {
      getCurrentUser: jest.fn().mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        address: '123 Test St',
        role: 'customer'
      }),
      isAuthenticated: jest.fn().mockResolvedValue(true),
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      updateProfile: jest.fn(),
      refreshToken: jest.fn(),
      changePassword: jest.fn(),
    }
  }));

  // Mock OrderService
  jest.mock('../services/orderService', () => ({
    getAllOrders: jest.fn(),
    getOrder: jest.fn(),
    getCustomerOrders: jest.fn(),
    getOrderStats: jest.fn(),
    updateOrderStatus: jest.fn(),
    bulkUpdateOrderStatus: jest.fn(),
    createOrder: jest.fn(),
    cancelOrder: jest.fn(),
  }));
}

// ============================================================================
// TYPE MAPPERS MOCK
// ============================================================================

function mockTypeMappers() {
  jest.mock('../utils/typeMappers', () => ({
    mapProductFromDB: jest.fn((product) => product),
    mapOrderFromDB: jest.fn(),
    getOrderItems: jest.fn((order) => order.items || []),
    getOrderCustomerInfo: jest.fn((order) => ({ email: order.customer_email })),
    getProductStock: jest.fn(),
    isProductPreOrder: jest.fn((product) => product.is_pre_order || false),
    getProductMinPreOrderQty: jest.fn((product) => product.min_pre_order_quantity || 1),
    getProductMaxPreOrderQty: jest.fn((product) => product.max_pre_order_quantity || 10),
    getOrderCustomerId: jest.fn(),
    getOrderTotal: jest.fn(),
    getOrderFulfillmentType: jest.fn(),
    getOrderPaymentMethod: jest.fn((order) => order.payment_method || 'cash_on_pickup'),
    getOrderPickupDate: jest.fn((order) => order.pickup_date),
    getOrderPickupTime: jest.fn((order) => order.pickup_time),
  }));
}

// ============================================================================
// MONITORING MOCKS
// ============================================================================

function mockMonitoringServices() {
  jest.mock('../monitoring/systemHealth', () => ({
    systemHealth: monitoringMocks.systemHealth
  }));
  
  jest.mock('../monitoring/performanceMonitoring', () => ({
    performanceMonitoring: monitoringMocks.performanceMonitoring
  }));
  
  jest.mock('../monitoring/securityAuditing', () => ({
    securityAuditing: monitoringMocks.securityAuditing
  }));
}

// ============================================================================
// TEST UTILITIES SETUP
// ============================================================================

function setupE2EUtilities() {
  (global as any).e2eTestUtils = {
    setupTestEnvironment: async () => {
      console.log('Setting up E2E test environment...');
    },
    cleanupTestEnvironment: async () => {
      console.log('Cleaning up E2E test environment...');
    },
    simulateUserJourney: async (journey: string) => {
      const journeys: Record<string, any> = {
        'customer_purchase': {
          steps: ['login', 'browse', 'add_to_cart', 'checkout', 'payment'],
          success: true,
          duration: 45000,
        },
        'staff_inventory_update': {
          steps: ['staff_login', 'view_inventory', 'update_stock', 'confirm'],
          success: true,
          duration: 30000,
        },
      };
      return journeys[journey] || { success: false };
    },
    validateSystemState: async () => true,
  };
}

function setupIntegrationUtilities() {
  (global as any).integrationTestUtils = {
    setupService: async (serviceName: string) => ({
      baseUrl: `http://localhost:300${Math.floor(Math.random() * 9)}`,
      timeout: 5000,
      retries: 2,
    }),
    mockServiceResponse: (service: string, method: string, response: any) => {
      const mockKey = `${service}_${method}`;
      (global as any).serviceMocks = (global as any).serviceMocks || {};
      (global as any).serviceMocks[mockKey] = response;
    },
    validateServiceIntegration: async (services: string[]) => true,
    simulateServiceFailure: (service: string) => {
      console.log(`Simulating ${service} failure`);
    },
    restoreServiceMock: (service: string) => {
      if ((global as any).serviceMocks) {
        Object.keys((global as any).serviceMocks)
          .filter(key => key.startsWith(service))
          .forEach(key => delete (global as any).serviceMocks[key]);
      }
    },
  };
}

function setupPerformanceUtilities() {
  (global as any).measurePerformance = async (fn: () => any) => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const time = endTime - startTime;
    return { result, time };
  };

  (global as any).expectPerformance = (time: number, threshold: number) => {
    if (time > threshold) {
      console.warn(`Performance warning: Operation took ${time}ms, threshold was ${threshold}ms`);
    }
    expect(time).toBeLessThan(threshold);
  };
}

function setupSecurityUtilities() {
  (global as any).securityTestUtils = {
    createMockUser: (role: string) => ({
      id: `test-user-${role}`,
      email: `test-${role}@example.com`,
      role,
    }),
    simulateAttack: async (type: string) => {
      const attacks: Record<string, any> = {
        'sql_injection': "'; DROP TABLE products; --",
        'xss': '<script>alert("xss")</script>',
        'brute_force': Array.from({ length: 10 }, (_, i) => `wrong-password-${i}`),
      };
      return attacks[type] || null;
    },
    validateSecurityResponse: (response: any): boolean => {
      if (response.error) {
        const errorMessage = response.error.message?.toLowerCase() || '';
        return errorMessage.includes('access denied') || 
               errorMessage.includes('unauthorized');
      }
      return false;
    },
  };
}

function setupMarketingUtilities() {
  (global as any).marketingTestUtils = {
    createMockCampaign: (type: string = 'seasonal') => ({
      id: `campaign-${Date.now()}`,
      name: `Test ${type} Campaign`,
      type,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      discount: type === 'flash' ? 50 : 20,
      products: [],
      active: true,
    }),
    createMockPromotion: () => ({
      code: `PROMO${Math.floor(Math.random() * 10000)}`,
      discount: Math.floor(Math.random() * 50) + 10,
      minPurchase: Math.floor(Math.random() * 100) + 20,
      maxUses: 100,
      usedCount: 0,
    }),
    mockCampaignMetrics: () => ({
      impressions: Math.floor(Math.random() * 10000),
      clicks: Math.floor(Math.random() * 1000),
      conversions: Math.floor(Math.random() * 100),
      revenue: Math.random() * 10000,
      roi: Math.random() * 5,
    }),
  };
  
  // Mock marketing-specific services
  jest.mock('../services/campaignService', () => ({
    CampaignService: {
      createCampaign: jest.fn(),
      updateCampaign: jest.fn(),
      getCampaignMetrics: jest.fn(),
      getActiveCampaigns: jest.fn(),
    }
  }));
}

function setupInventoryUtilities() {
  (global as any).inventoryTestUtils = {
    createMockStockMovement: (type: 'in' | 'out' = 'in') => ({
      id: `movement-${Date.now()}`,
      productId: `product-${Math.floor(Math.random() * 100)}`,
      type,
      quantity: Math.floor(Math.random() * 50) + 1,
      reason: type === 'in' ? 'restock' : 'sale',
      timestamp: new Date().toISOString(),
    }),
    createMockBulkOperation: () => ({
      operationId: `bulk-${Date.now()}`,
      type: 'update',
      items: Array.from({ length: 10 }, (_, i) => ({
        productId: `product-${i}`,
        quantity: Math.floor(Math.random() * 100),
      })),
      status: 'pending',
    }),
    mockInventoryAlerts: () => ({
      lowStock: Array.from({ length: 5 }, (_, i) => ({
        productId: `product-${i}`,
        currentStock: Math.floor(Math.random() * 10),
        threshold: 20,
      })),
      outOfStock: [],
      expiringSoon: [],
    }),
  };
  
  // Mock inventory-specific services
  jest.mock('../services/inventoryService', () => ({
    InventoryService: {
      updateStock: jest.fn(),
      bulkUpdateStock: jest.fn(),
      getStockLevels: jest.fn(),
      getInventoryAlerts: jest.fn(),
    }
  }));
}

function setupExecutiveUtilities() {
  (global as any).executiveTestUtils = {
    createMockAnalytics: () => ({
      revenue: {
        daily: Math.random() * 10000,
        weekly: Math.random() * 70000,
        monthly: Math.random() * 300000,
        yearly: Math.random() * 3600000,
      },
      orders: {
        count: Math.floor(Math.random() * 1000),
        averageValue: Math.random() * 200,
        completionRate: 0.85 + Math.random() * 0.1,
      },
      customers: {
        new: Math.floor(Math.random() * 100),
        returning: Math.floor(Math.random() * 500),
        churnRate: Math.random() * 0.1,
      },
    }),
    createMockReport: (type: string = 'monthly') => ({
      id: `report-${Date.now()}`,
      type,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      metrics: {},
      generated: new Date().toISOString(),
    }),
    mockForecast: () => ({
      revenue: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        predicted: Math.random() * 400000,
        confidence: 0.7 + Math.random() * 0.2,
      })),
      growth: Math.random() * 0.3,
    }),
  };
  
  // Mock analytics services
  jest.mock('../services/analyticsService', () => ({
    AnalyticsService: {
      getMetrics: jest.fn(),
      generateReport: jest.fn(),
      getForecast: jest.fn(),
      getKPIs: jest.fn(),
    }
  }));
}

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

function loadEnvironmentVariables() {
  // Ensure critical environment variables are set
  if (!process.env.EXPO_PUBLIC_CHANNEL_SECRET) {
    process.env.EXPO_PUBLIC_CHANNEL_SECRET = 'test-secret-key-for-jest-only-a1b2c3d4e5f6789012345678901234567890abcdef';
  }
}

function setupRaceConditionEnvironment() {
  // Don't mock React Query for race condition tests
  
  // Mock services but not React Query
  mockServices();
  
  // Mock Supabase with race condition support
  mockSupabaseForRaceCondition();
  
  // Set longer timeout for race condition tests
  jest.setTimeout(20000);
  
  // Add helper for creating cart errors
  (global as any).createCartError = (
    code: string,
    message: string,
    userMessage: string,
    metadata: any = {}
  ) => ({
    code,
    message,
    userMessage,
    ...metadata
  });
}

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

export function setupTests(mode?: TestMode) {
  const testMode = mode || getTestMode();
  
  console.log(`Setting up tests in ${testMode} mode`);
  
  // Always load environment variables
  loadEnvironmentVariables();
  
  // Always apply base mocks
  applyBaseMocks();
  
  // Configure based on test mode
  switch(testMode) {
    case TestMode.RACE_CONDITION:
      setupRaceConditionEnvironment();
      break;
      
    case TestMode.SERVICE:
      mockSupabaseDefault();
      mockTypeMappers();
      mockServices();
      break;
      
    case TestMode.REAL_DB:
      // Don't mock Supabase - use real database
      // Mock expo-constants to use environment variables
      jest.mock('expo-constants', () => ({
        default: {
          expoConfig: {
            extra: {
              supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
              supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
            }
          }
        }
      }));
      jest.setTimeout(30000); // Longer timeout for real DB
      break;
      
    case TestMode.E2E:
      mockMonitoringServices();
      mockSupabaseDefault();
      setupE2EUtilities();
      break;
      
    case TestMode.INTEGRATION:
      mockMonitoringServices();
      mockSupabaseDefault();
      setupIntegrationUtilities();
      break;
      
    case TestMode.PERFORMANCE:
      mockMonitoringServices();
      mockSupabaseDefault();
      setupPerformanceUtilities();
      break;
      
    case TestMode.SECURITY:
      mockMonitoringServices();
      mockSupabaseDefault();
      setupSecurityUtilities();
      break;
      
    case TestMode.NAVIGATION:
      mockReactQuery();
      mockSupabaseDefault();
      break;
      
    case TestMode.MARKETING:
      // Marketing campaign tests
      mockSupabaseDefault();
      mockServices();
      setupMarketingUtilities();
      break;
      
    case TestMode.INVENTORY:
      // Inventory management tests
      mockSupabaseDefault();
      mockServices();
      setupInventoryUtilities();
      break;
      
    case TestMode.EXECUTIVE:
      // Executive analytics tests
      mockSupabaseDefault();
      mockServices();
      setupExecutiveUtilities();
      break;
      
    default:
      // Standard setup
      mockReactQuery();
      mockSupabaseDefault();
      mockServices();
      break;
  }
  
  // Apply console suppression
  suppressConsoleWarnings();
  
  // Setup global cleanup
  setupGlobalCleanup();
  
  // Add reset utility to global
  (global as any).resetAllMocks = resetAllMocks;
}

// ============================================================================
// AUTO-SETUP (runs when imported)
// ============================================================================

// Automatically setup tests when this file is imported
setupTests();