/**
 * Security Test Setup
 * Phase 5: Production Readiness - Security testing setup
 * 
 * Sets up security monitoring and validation utilities for tests
 */

import { securityAuditing } from '../monitoring/securityAuditing';

// Mock security auditing to avoid actual database writes during tests
jest.mock('../monitoring/securityAuditing', () => ({
  securityAuditing: {
    logAuditEvent: jest.fn().mockResolvedValue({ success: true }),
    logSecurityViolation: jest.fn().mockResolvedValue({ success: true }),
    validateRLSPolicies: jest.fn().mockResolvedValue({ 
      success: true, 
      results: [], 
      overallCoverage: 0.95 
    }),
    testPermissionBoundaries: jest.fn().mockResolvedValue({ 
      success: true, 
      results: [], 
      passRate: 0.98 
    }),
    monitorAccessPatterns: jest.fn().mockResolvedValue({ 
      success: true, 
      suspiciousActivities: [] 
    }),
    generateComplianceReport: jest.fn().mockResolvedValue({ 
      success: true, 
      report: {
        rlsCoverage: 95,
        permissionBoundaryCompliance: 98,
        securityViolations: 0,
        recommendations: [],
        overallScore: 96.5,
      }
    }),
  }
}));

// Mock Supabase for security tests
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        ilike: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: { message: 'Validation error' } }),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Access denied' } }),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Invalid credentials' }
      }),
      getSession: jest.fn().mockResolvedValue({ 
        data: { 
          session: { 
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() 
          } 
        }, 
        error: null 
      }),
    },
  },
}));

// Global security utilities for tests
declare global {
  namespace NodeJS {
    interface Global {
      securityTestUtils: {
        createMockUser: (role: string) => any;
        simulateAttack: (type: string) => Promise<any>;
        validateSecurityResponse: (response: any) => boolean;
        testPermission: (role: string, resource: string, action: string) => boolean;
      };
    }
  }
}

// Security test utilities
global.securityTestUtils = {
  createMockUser: (role: string) => ({
    id: `test-user-${role}`,
    email: `test-${role}@example.com`,
    role,
    permissions: getMockPermissions(role),
  }),
  
  simulateAttack: async (type: string) => {
    const attacks = {
      'sql_injection': "'; DROP TABLE products; --",
      'xss': '<script>alert("xss")</script>',
      'brute_force': Array.from({ length: 10 }, (_, i) => `wrong-password-${i}`),
      'privilege_escalation': { role_change: 'admin' },
    };
    
    return attacks[type as keyof typeof attacks] || null;
  },
  
  validateSecurityResponse: (response: any): boolean => {
    // Check if response indicates proper security handling
    if (response.error) {
      const errorMessage = response.error.message?.toLowerCase() || '';
      return errorMessage.includes('access denied') || 
             errorMessage.includes('unauthorized') ||
             errorMessage.includes('forbidden') ||
             errorMessage.includes('validation error');
    }
    return false;
  },
  
  testPermission: (role: string, resource: string, action: string): boolean => {
    const permissions = getMockPermissions(role);
    const resourcePermissions = permissions[resource] || [];
    return resourcePermissions.includes(action);
  },
};

// Mock permission system
function getMockPermissions(role: string): Record<string, string[]> {
  const permissions = {
    customer: {
      products: ['read'],
      orders: ['read', 'create'],
      cart: ['read', 'create', 'update', 'delete'],
    },
    inventory_staff: {
      products: ['read', 'update'],
      orders: ['read', 'update'],
      inventory: ['read', 'create', 'update'],
      analytics: ['read'],
    },
    marketing_staff: {
      products: ['read', 'create', 'update'],
      orders: ['read'],
      inventory: ['read'],
      analytics: ['read', 'create'],
      campaigns: ['read', 'create', 'update', 'delete'],
    },
    executive: {
      products: ['read'],
      orders: ['read'],
      inventory: ['read'],
      analytics: ['read'],
      users: ['read'],
      system_config: ['read'],
    },
    admin: {
      products: ['read', 'create', 'update', 'delete'],
      orders: ['read', 'create', 'update', 'delete'],
      inventory: ['read', 'create', 'update', 'delete'],
      analytics: ['read', 'create', 'update', 'delete'],
      users: ['read', 'create', 'update', 'delete'],
      system_config: ['read', 'create', 'update', 'delete'],
      staff_pins: ['read', 'create', 'update', 'delete'],
    },
  };
  
  return permissions[role as keyof typeof permissions] || {};
}

// Setup security testing environment
beforeAll(() => {
  // Mock console methods for cleaner test output during security tests
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  console.log('Security test setup complete');
});

// Cleanup after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Final cleanup
afterAll(async () => {
  // Restore console methods
  jest.restoreAllMocks();
  
  // Force cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Security test cleanup complete');
});

// Export security test utilities
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
};