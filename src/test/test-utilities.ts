/**
 * Test Utilities
 * Shared test utilities and helpers for all test types
 * Consolidates utilities from 14 different setup files
 */

// ============================================================================
// E2E TEST UTILITIES
// ============================================================================

export const e2eTestUtils = {
  createMockUserSession: (role: string) => ({
    user: { 
      id: `test-${role}`, 
      role, 
      email: `${role}@test.com` 
    },
    session: { 
      token: 'mock-jwt-token', 
      expires: Date.now() + 3600000 
    },
  }),

  simulateNetworkDelay: (ms: number = 100) => 
    new Promise(resolve => setTimeout(resolve, ms)),

  validateWorkflowCompletion: (workflow: any) => {
    expect(workflow.success).toBe(true);
    expect(workflow.duration).toBeLessThan(120000); // 2 minutes max
    expect(workflow.steps.length).toBeGreaterThan(0);
  },

  generateTestData: (type: string, count: number = 10) => {
    const generators: Record<string, () => any[]> = {
      orders: () => Array.from({ length: count }, (_, i) => ({
        id: `test-order-${i}`,
        user_id: `test-user-${i}`,
        total: Math.random() * 100 + 10,
        status: 'completed',
      })),
      products: () => Array.from({ length: count }, (_, i) => ({
        id: `test-product-${i}`,
        name: `Test Product ${i}`,
        price: Math.random() * 50 + 5,
        stock: Math.floor(Math.random() * 100) + 10,
      })),
      users: () => Array.from({ length: count }, (_, i) => ({
        id: `test-user-${i}`,
        email: `test${i}@example.com`,
        role: ['customer', 'inventory_staff', 'admin'][i % 3],
      })),
    };

    return generators[type]?.() || [];
  },
};

// ============================================================================
// INTEGRATION TEST UTILITIES
// ============================================================================

export const integrationTestUtils = {
  createMockServiceChain: (services: string[]) => {
    return services.map(service => ({
      service,
      operation: async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return { service, status: 'success', data: `mock-${service}-data` };
      },
      priority: 'medium' as const,
    }));
  },

  simulateServiceLoad: async (service: string, concurrency: number = 10) => {
    const operations = Array.from({ length: concurrency }, () => 
      new Promise(resolve => setTimeout(resolve, Math.random() * 100))
    );

    const results = await Promise.allSettled(operations);
    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      successRate: results.filter(r => r.status === 'fulfilled').length / results.length,
    };
  },

  validateCrossServiceData: (sourceData: any, targetData: any) => {
    expect(sourceData).toBeDefined();
    expect(targetData).toBeDefined();
    
    if (sourceData.id && targetData.reference_id) {
      expect(targetData.reference_id).toBe(sourceData.id);
    }
    
    return true;
  },

  measureServiceResponseTime: async (serviceCall: () => Promise<any>) => {
    const startTime = performance.now();
    const result = await serviceCall();
    const responseTime = performance.now() - startTime;
    
    return {
      result,
      responseTime,
      isWithinSLA: responseTime < 1000, // 1 second SLA
    };
  },

  simulateNetworkPartition: (affectedServices: string[]) => {
    const mockedServices = new Set(affectedServices);
    
    return {
      isAffected: (service: string) => mockedServices.has(service),
      restore: () => {
        mockedServices.clear();
      },
    };
  },
};

// ============================================================================
// PERFORMANCE TEST UTILITIES
// ============================================================================

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

  benchmarkOperation: async (
    name: string, 
    operation: () => Promise<any>, 
    iterations: number = 10
  ) => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const time = await performanceTestUtils.measureExecutionTime(operation);
      times.push(time);
    }
    
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      name,
      iterations,
      average,
      min,
      max,
      times,
    };
  },
};

// ============================================================================
// SECURITY TEST UTILITIES
// ============================================================================

export const securityTestUtils = {
  generateMaliciousInput: (type: 'sql' | 'xss' | 'overflow' | 'special_chars'): string => {
    const inputs = {
      sql: "'; DROP TABLE products; SELECT * FROM users WHERE '1'='1",
      xss: '<script>alert("xss")</script><img src="x" onerror="alert(1)">',
      overflow: 'x'.repeat(10000),
      special_chars: '{}[]();"\':.,<>?/|\\`~!@#$%^&*()_+-=',
    };
    
    return inputs[type];
  },
  
  testRateLimiting: async (operation: () => Promise<any>, attempts = 10): Promise<boolean> => {
    const results = [];
    
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await operation();
        results.push(result);
      } catch (error) {
        if (error instanceof Error && error.message.includes('rate limit')) {
          return true; // Rate limiting is working
        }
        results.push({ error });
      }
    }
    
    // Check if later attempts were blocked
    return results.slice(-3).some(result => 
      result.error && result.error.message?.includes('rate limit')
    );
  },
  
  validateEncryption: (value: string): boolean => {
    // Check if value appears to be encrypted/hashed
    if (!value || value.length < 20) return false;
    
    // Should not contain obvious patterns
    const patterns = [
      /^\d{4}$/, // 4-digit PIN
      /^password/i,
      /^123/,
      /^admin/i,
    ];
    
    return !patterns.some(pattern => pattern.test(value));
  },
  
  simulateSessionAttack: () => ({
    hijacked_session: 'fake-session-token',
    expired_session: 'expired-' + Date.now(),
    malformed_session: 'not-a-valid-jwt',
  }),

  generateSecurityTestCases: () => [
    {
      name: 'SQL Injection',
      input: securityTestUtils.generateMaliciousInput('sql'),
      expectedBehavior: 'sanitized or rejected',
    },
    {
      name: 'XSS Attack',
      input: securityTestUtils.generateMaliciousInput('xss'),
      expectedBehavior: 'escaped or rejected',
    },
    {
      name: 'Buffer Overflow',
      input: securityTestUtils.generateMaliciousInput('overflow'),
      expectedBehavior: 'truncated or rejected',
    },
    {
      name: 'Special Characters',
      input: securityTestUtils.generateMaliciousInput('special_chars'),
      expectedBehavior: 'properly handled',
    },
  ],

  testPermission: (role: string, resource: string, action: string): boolean => {
    const permissions: Record<string, Record<string, string[]>> = {
      customer: {
        products: ['read'],
        orders: ['read', 'create'],
        cart: ['read', 'create', 'update', 'delete'],
      },
      admin: {
        products: ['read', 'create', 'update', 'delete'],
        orders: ['read', 'create', 'update', 'delete'],
        users: ['read', 'create', 'update', 'delete'],
      },
    };
    
    const rolePermissions = permissions[role] || {};
    const resourcePermissions = rolePermissions[resource] || [];
    return resourcePermissions.includes(action);
  },
};

// ============================================================================
// NAVIGATION TEST UTILITIES
// ============================================================================

export const navigationTestUtils = {
  createMockNavigation: () => ({
    navigate: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => true),
    getParent: jest.fn(),
    getState: jest.fn(),
  }),

  createMockRoute: (name: string, params: any = {}) => ({
    key: `${name}-key`,
    name,
    params,
    path: undefined,
  }),

  mockRoleNavigationService: {
    generateMenuItems: jest.fn(),
    canNavigateTo: jest.fn(),
    getDefaultScreen: jest.fn(),
    handlePermissionDenied: jest.fn(),
    getCachedMenuItems: jest.fn(),
    clearMenuCache: jest.fn(),
    trackNavigation: jest.fn(),
    getNavigationHistory: jest.fn(),
    validateDeepLink: jest.fn(),
    getNavigationState: jest.fn(),
    persistNavigationState: jest.fn(),
  },

  mockNavigationPermissions: {
    customer: ['Home', 'Products', 'Cart', 'Orders', 'Profile'],
    farmer: ['Home', 'Products', 'Inventory', 'Orders', 'Analytics', 'Profile'],
    admin: ['Home', 'Products', 'Inventory', 'Orders', 'Users', 'Analytics', 'Settings', 'Profile'],
    vendor: ['Home', 'Products', 'Inventory', 'Orders', 'Analytics', 'Profile'],
    staff: ['Home', 'Orders', 'Inventory', 'Profile'],
  },

  simulateNavigationFlow: async (screens: string[]) => {
    const navigation = navigationTestUtils.createMockNavigation();
    const history: string[] = [];
    
    for (const screen of screens) {
      navigation.navigate(screen);
      history.push(screen);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return {
      navigation,
      history,
      callCount: navigation.navigate.mock.calls.length,
    };
  },
};

// ============================================================================
// RACE CONDITION TEST UTILITIES
// ============================================================================

export const raceConditionTestUtils = {
  createRaceCondition: async (
    operations: Array<() => Promise<any>>,
    delayBetween: number = 10
  ) => {
    const promises = operations.map(async (op, index) => {
      await new Promise(resolve => setTimeout(resolve, index * delayBetween));
      return op();
    });
    
    return Promise.allSettled(promises);
  },

  simulateConcurrentRequests: async (
    request: () => Promise<any>,
    count: number = 5
  ) => {
    const promises = Array.from({ length: count }, () => request());
    const results = await Promise.allSettled(promises);
    
    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results,
    };
  },

  detectRaceCondition: async (
    operation: () => Promise<any>,
    expectedResult: any,
    iterations: number = 10
  ) => {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await operation();
      results.push(result);
    }
    
    const inconsistent = results.some(r => 
      JSON.stringify(r) !== JSON.stringify(expectedResult)
    );
    
    return {
      hasRaceCondition: inconsistent,
      results,
      expectedResult,
    };
  },
};

// ============================================================================
// GENERAL TEST UTILITIES
// ============================================================================

export const generalTestUtils = {
  waitForCondition: async (
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<boolean> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return false;
  },

  createMockData: <T>(
    factory: (index: number) => T,
    count: number = 10
  ): T[] => {
    return Array.from({ length: count }, (_, i) => factory(i));
  },

  randomDelay: (min: number = 10, max: number = 100): Promise<void> => {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  expectToThrowAsync: async (
    asyncFn: () => Promise<any>,
    errorMessage?: string
  ) => {
    let error: Error | null = null;
    
    try {
      await asyncFn();
    } catch (e) {
      error = e as Error;
    }
    
    expect(error).not.toBeNull();
    if (errorMessage) {
      expect(error?.message).toContain(errorMessage);
    }
  },

  mockConsole: () => {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };
    
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  },
};

// ============================================================================
// MARKETING TEST UTILITIES
// ============================================================================

export const marketingTestUtils = {
  createCampaignScenario: (type: 'seasonal' | 'flash' | 'loyalty' = 'seasonal') => ({
    campaign: {
      id: `campaign-${Date.now()}`,
      type,
      name: `${type} Campaign Test`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      rules: [],
    },
    expectedMetrics: {
      reach: type === 'flash' ? 1000 : 5000,
      engagement: type === 'flash' ? 0.15 : 0.08,
      conversion: type === 'loyalty' ? 0.12 : 0.05,
    },
  }),
  
  simulateCampaignPerformance: async (campaignId: string, days: number = 7) => {
    const metrics = [];
    for (let i = 0; i < days; i++) {
      metrics.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        impressions: Math.floor(Math.random() * 1000) + 500,
        clicks: Math.floor(Math.random() * 100) + 20,
        conversions: Math.floor(Math.random() * 20) + 5,
      });
    }
    return metrics;
  },
};

// ============================================================================
// INVENTORY TEST UTILITIES  
// ============================================================================

export const inventoryTestUtils = {
  createStockScenario: (scenario: 'low' | 'normal' | 'overstock' = 'normal') => {
    const baseStock = scenario === 'low' ? 10 : scenario === 'overstock' ? 500 : 100;
    return Array.from({ length: 20 }, (_, i) => ({
      productId: `product-${i}`,
      currentStock: Math.floor(baseStock * (0.5 + Math.random())),
      minStock: 20,
      maxStock: 200,
      reorderPoint: 30,
    }));
  },
  
  simulateBulkStockUpdate: (items: number = 50) => {
    const updates = Array.from({ length: items }, (_, i) => ({
      productId: `product-${i}`,
      adjustment: Math.floor(Math.random() * 100) - 50,
      reason: ['sale', 'restock', 'damage', 'return'][Math.floor(Math.random() * 4)],
    }));
    
    return {
      batchId: `batch-${Date.now()}`,
      updates,
      timestamp: new Date().toISOString(),
    };
  },
};

// ============================================================================
// EXECUTIVE/ANALYTICS TEST UTILITIES
// ============================================================================

export const executiveTestUtils = {
  generateMockDashboard: () => ({
    kpis: {
      revenue: { value: 125000, change: 0.12, target: 130000 },
      orders: { value: 850, change: 0.08, target: 900 },
      customers: { value: 320, change: 0.15, target: 350 },
      avgOrderValue: { value: 147, change: 0.03, target: 150 },
    },
    charts: {
      revenueTimeline: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        value: 3000 + Math.random() * 2000,
      })),
      categoryBreakdown: [
        { category: 'Produce', value: 45000, percentage: 0.36 },
        { category: 'Dairy', value: 30000, percentage: 0.24 },
        { category: 'Meat', value: 25000, percentage: 0.20 },
        { category: 'Other', value: 25000, percentage: 0.20 },
      ],
    },
    alerts: [],
  }),
  
  simulateBusinessMetrics: (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const multiplier = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    return {
      revenue: 5000 * multiplier + Math.random() * 1000 * multiplier,
      orders: 50 * multiplier + Math.floor(Math.random() * 10 * multiplier),
      newCustomers: 10 * multiplier + Math.floor(Math.random() * 5 * multiplier),
      churn: Math.random() * 0.05,
      satisfaction: 4.2 + Math.random() * 0.5,
    };
  },
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const testUtils = {
  e2e: e2eTestUtils,
  integration: integrationTestUtils,
  performance: performanceTestUtils,
  security: securityTestUtils,
  navigation: navigationTestUtils,
  raceCondition: raceConditionTestUtils,
  general: generalTestUtils,
  marketing: marketingTestUtils,
  inventory: inventoryTestUtils,
  executive: executiveTestUtils,
};