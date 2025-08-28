/**
 * Debug test for RolePermissionService
 */

// Mock setup before imports
let mockSupabaseInstance: any;

jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  mockSupabaseInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockSupabaseInstance.createClient(),
    TABLES: {
      ROLE_PERMISSIONS: 'role_permissions',
    }
  };
});

jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataIntegrity: jest.fn()
  }
}));

import { RolePermissionService } from '../rolePermissionService';

describe('RolePermissionService Debug', () => {
  let service: RolePermissionService;

  beforeEach(() => {
    // Clear mock data
    mockSupabaseInstance.clearAllData();
    
    // Set up test data
    mockSupabaseInstance.setTableData('role_permissions', [
      {
        id: '1',
        role: 'customer',
        permission: 'view_products',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2', 
        role: 'customer',
        permission: 'add_to_cart',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]);
    
    // Initialize service
    const { supabase } = require('../../config/supabase');
    service = new RolePermissionService(supabase);
    
    jest.clearAllMocks();
  });

  it('should be able to create service', () => {
    expect(service).toBeDefined();
  });

  it('should fetch permissions for a role', async () => {
    const result = await service.getRolePermissions('customer');
    
    console.log('Debug - Result:', result);
    console.log('Debug - Table data:', mockSupabaseInstance.getTableData('role_permissions'));
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain('view_products');
    expect(result).toContain('add_to_cart');
  });
});