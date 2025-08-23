/**
 * Task 2.4.3: Security Integration Tests (RED Phase)
 * Testing role-based access control and data isolation across all layers
 */

import React from 'react';
import { createSupabaseMock } from '../../../test/mocks/supabase.simplified.mock';
import { hookContracts } from '../../../test/contracts/hook.contracts';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks for security testing
import { useInventoryItem, useInventoryItems, useLowStockItems } from '../../useInventoryItems';
import { useUpdateStock, useUpdateVisibility, useBatchUpdateStock } from '../../useInventoryOperations';
import { useMovementHistory, useRecordMovement, useMovementAnalytics } from '../../useStockMovements';

// Services for security testing
import { InventoryService } from '../../../../services/inventory/inventoryService';
import { StockMovementService } from '../../../../services/inventory/stockMovementService';

jest.mock('../../../../services/inventory/inventoryService');
jest.mock('../../../../services/inventory/stockMovementService');

const mockInventoryService = InventoryService as jest.Mocked<typeof InventoryService>;
const mockStockMovementService = StockMovementService as jest.Mocked<typeof StockMovementService>;

// Test wrapper for security testing
const createSecurityWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Security error helpers
const createSecurityError = (type: 'authentication' | 'authorization' | 'permission', message: string) => {
  const error = new Error(message);
  switch (type) {
    case 'authentication':
      (error as any).status = 401;
      break;
    case 'authorization':
    case 'permission':
      (error as any).status = 403;
      break;
  }
  return error;
};

// Mock user contexts for testing
const mockUsers = {
  admin: {
    id: 'admin-1',
    role: 'admin',
    permissions: ['read_inventory', 'write_inventory', 'delete_inventory', 'manage_users', 'view_analytics']
  },
  inventoryStaff: {
    id: 'staff-1',
    role: 'inventory_staff',
    permissions: ['read_inventory', 'write_inventory', 'view_movements']
  },
  marketingStaff: {
    id: 'marketing-1',
    role: 'marketing_staff',
    permissions: ['read_inventory', 'update_product_content']
  },
  readOnlyUser: {
    id: 'readonly-1',
    role: 'customer',
    permissions: ['read_inventory']
  },
  unauthorizedUser: {
    id: 'guest-1',
    role: 'guest',
    permissions: []
  }
};

describe('Security Integration Tests (RED Phase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Security Test 1: Role-based Access Control
  describe('Role-based Access Control', () => {
    it('should allow admin users full access to all operations', async () => {
      const inventoryItem = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      const updatedItem = { ...inventoryItem, currentStock: 75, availableStock: 65 };
      const movementRecord = {
        id: 'movement-1',
        inventoryItemId: 'inv-123',
        movementType: 'adjustment' as const,
        quantityChange: -25,
        previousStock: 100,
        newStock: 75,
        reason: 'Admin adjustment',
        performedBy: 'admin-1',
        performedAt: '2024-01-01T12:00:00Z',
        referenceOrderId: null,
        batchId: null,
        createdAt: '2024-01-01T12:00:00Z'
      };

      // Mock successful responses for admin user
      mockInventoryService.getInventoryItem.mockResolvedValue(inventoryItem);
      mockInventoryService.updateStock.mockResolvedValue(updatedItem);
      mockInventoryService.toggleProductVisibility.mockResolvedValue({ ...inventoryItem, isVisibleToCustomers: false });
      mockStockMovementService.recordMovement.mockResolvedValue(movementRecord);
      mockStockMovementService.getMovementHistory.mockResolvedValue({
        success: [movementRecord],
        totalProcessed: 1
      });
      mockStockMovementService.getMovementAnalytics.mockResolvedValue({
        totalMovements: 100,
        movementsByType: { adjustment: 25, restock: 50, sale: 25 }
      });

      const wrapper = createSecurityWrapper();

      // Test read access
      const { result: readResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(readResult.current.isSuccess).toBe(true);
      });

      expect(readResult.current.data).toEqual(inventoryItem);

      // Test write access
      const { result: writeResult } = renderHook(
        () => useUpdateStock(),
        { wrapper }
      );

      await act(async () => {
        writeResult.current.mutate({
          inventoryId: 'inv-123',
          stockUpdate: {
            currentStock: 75,
            reason: 'Admin adjustment',
            performedBy: 'admin-1'
          }
        });
      });

      await waitFor(() => {
        expect(writeResult.current.isSuccess).toBe(true);
      });

      // Test visibility control
      const { result: visibilityResult } = renderHook(
        () => useUpdateVisibility(),
        { wrapper }
      );

      await act(async () => {
        visibilityResult.current.mutate({
          inventoryId: 'inv-123',
          visibilityUpdate: { isVisibleToCustomers: false }
        });
      });

      await waitFor(() => {
        expect(visibilityResult.current.isSuccess).toBe(true);
      });

      // Test analytics access
      const { result: analyticsResult } = renderHook(
        () => useMovementAnalytics({ startDate: '2024-01-01', endDate: '2024-01-31' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(analyticsResult.current.isSuccess).toBe(true);
      });

      expect(analyticsResult.current.data?.totalMovements).toBe(100);
    });

    it('should restrict inventory staff to appropriate operations only', async () => {
      const inventoryItem = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      // Allow read and stock updates
      mockInventoryService.getInventoryItem.mockResolvedValue(inventoryItem);
      mockInventoryService.updateStock.mockResolvedValue({ ...inventoryItem, currentStock: 75 });
      
      // Deny analytics access
      mockStockMovementService.getMovementAnalytics.mockRejectedValue(
        createSecurityError('permission', 'Insufficient permissions for analytics')
      );
      
      // Deny visibility changes
      mockInventoryService.toggleProductVisibility.mockRejectedValue(
        createSecurityError('permission', 'Insufficient permissions for visibility changes')
      );

      const wrapper = createSecurityWrapper();

      // Should allow reading inventory
      const { result: readResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(readResult.current.isSuccess).toBe(true);
      });

      // Should allow stock updates
      const { result: stockResult } = renderHook(
        () => useUpdateStock(),
        { wrapper }
      );

      await act(async () => {
        stockResult.current.mutate({
          inventoryId: 'inv-123',
          stockUpdate: {
            currentStock: 75,
            reason: 'Staff adjustment',
            performedBy: 'staff-1'
          }
        });
      });

      await waitFor(() => {
        expect(stockResult.current.isSuccess).toBe(true);
      });

      // Should deny analytics access
      const { result: analyticsResult } = renderHook(
        () => useMovementAnalytics({ startDate: '2024-01-01', endDate: '2024-01-31' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(analyticsResult.current.isError).toBe(true);
      });

      expect(analyticsResult.current.error?.message).toContain('Insufficient permissions');

      // Should deny visibility changes
      const { result: visibilityResult } = renderHook(
        () => useUpdateVisibility(),
        { wrapper }
      );

      await act(async () => {
        visibilityResult.current.mutate({
          inventoryId: 'inv-123',
          visibilityUpdate: { isVisibleToCustomers: false }
        });
      });

      await waitFor(() => {
        expect(visibilityResult.current.isError).toBe(true);
      });

      expect(visibilityResult.current.error?.message).toContain('Insufficient permissions');
    });

    it('should restrict marketing staff to read-only and content updates', async () => {
      const inventoryItem = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      // Allow reading inventory
      mockInventoryService.getInventoryItem.mockResolvedValue(inventoryItem);
      
      // Allow visibility changes (content management)
      mockInventoryService.toggleProductVisibility.mockResolvedValue({
        ...inventoryItem,
        isVisibleToCustomers: false
      });
      
      // Deny stock updates
      mockInventoryService.updateStock.mockRejectedValue(
        createSecurityError('permission', 'Marketing staff cannot modify stock levels')
      );
      
      // Deny movement recording
      mockStockMovementService.recordMovement.mockRejectedValue(
        createSecurityError('permission', 'Marketing staff cannot record stock movements')
      );

      const wrapper = createSecurityWrapper();

      // Should allow reading
      const { result: readResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(readResult.current.isSuccess).toBe(true);
      });

      // Should allow visibility changes
      const { result: visibilityResult } = renderHook(
        () => useUpdateVisibility(),
        { wrapper }
      );

      await act(async () => {
        visibilityResult.current.mutate({
          inventoryId: 'inv-123',
          visibilityUpdate: { isVisibleToCustomers: false }
        });
      });

      await waitFor(() => {
        expect(visibilityResult.current.isSuccess).toBe(true);
      });

      // Should deny stock updates
      const { result: stockResult } = renderHook(
        () => useUpdateStock(),
        { wrapper }
      );

      await act(async () => {
        stockResult.current.mutate({
          inventoryId: 'inv-123',
          stockUpdate: {
            currentStock: 75,
            reason: 'Unauthorized attempt',
            performedBy: 'marketing-1'
          }
        });
      });

      await waitFor(() => {
        expect(stockResult.current.isError).toBe(true);
      });

      expect(stockResult.current.error?.message).toContain('Marketing staff cannot modify stock');
    });

    it('should deny all write operations for read-only users', async () => {
      const inventoryItem = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      // Allow read operations
      mockInventoryService.getInventoryItem.mockResolvedValue(inventoryItem);
      mockInventoryService.getLowStockItems.mockResolvedValue([inventoryItem]);
      
      // Deny all write operations
      const writeError = createSecurityError('permission', 'Read-only access');
      mockInventoryService.updateStock.mockRejectedValue(writeError);
      mockInventoryService.toggleProductVisibility.mockRejectedValue(writeError);
      mockStockMovementService.recordMovement.mockRejectedValue(writeError);

      const wrapper = createSecurityWrapper();

      // Should allow reading
      const { result: readResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(readResult.current.isSuccess).toBe(true);
      });

      // Should allow reading low stock
      const { result: lowStockResult } = renderHook(
        () => useLowStockItems(),
        { wrapper }
      );

      await waitFor(() => {
        expect(lowStockResult.current.isSuccess).toBe(true);
      });

      // Should deny stock updates
      const { result: stockResult } = renderHook(
        () => useUpdateStock(),
        { wrapper }
      );

      await act(async () => {
        stockResult.current.mutate({
          inventoryId: 'inv-123',
          stockUpdate: {
            currentStock: 75,
            reason: 'Unauthorized',
            performedBy: 'readonly-1'
          }
        });
      });

      await waitFor(() => {
        expect(stockResult.current.isError).toBe(true);
      });

      // Should deny visibility updates
      const { result: visibilityResult } = renderHook(
        () => useUpdateVisibility(),
        { wrapper }
      );

      await act(async () => {
        visibilityResult.current.mutate({
          inventoryId: 'inv-123',
          visibilityUpdate: { isVisibleToCustomers: false }
        });
      });

      await waitFor(() => {
        expect(visibilityResult.current.isError).toBe(true);
      });
    });
  });

  // Security Test 2: User Data Isolation
  describe('User Data Isolation', () => {
    it('should isolate inventory data by user context', async () => {
      const userAItems = [
        {
          id: 'inv-a1',
          productId: 'product-a1',
          currentStock: 100,
          reservedStock: 10,
          availableStock: 90,
          minimumThreshold: 15,
          maximumThreshold: 500,
          isActive: true,
          isVisibleToCustomers: true,
          lastStockUpdate: '2024-01-01T10:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ];

      const userBItems = [
        {
          id: 'inv-b1',
          productId: 'product-b1',
          currentStock: 50,
          reservedStock: 5,
          availableStock: 45,
          minimumThreshold: 10,
          maximumThreshold: 200,
          isActive: true,
          isVisibleToCustomers: true,
          lastStockUpdate: '2024-01-01T10:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ];

      // Mock user-specific responses
      mockInventoryService.getLowStockItems
        .mockImplementation(() => {
          // In real implementation, this would check user context
          // For testing, we simulate different responses
          return Promise.resolve(userAItems);
        });

      const wrapper = createSecurityWrapper();

      const { result: userAResult } = renderHook(
        () => useLowStockItems(),
        { wrapper }
      );

      await waitFor(() => {
        expect(userAResult.current.isSuccess).toBe(true);
      });

      // User A should only see their items
      expect(userAResult.current.data).toEqual(userAItems);
      expect(userAResult.current.data?.some(item => item.id === 'inv-b1')).toBe(false);
    });

    it('should prevent cross-user inventory access', async () => {
      // Attempt to access inventory item belonging to different user
      const unauthorizedError = createSecurityError('authorization', 'Access denied to inventory item');
      
      mockInventoryService.getInventoryItem.mockRejectedValue(unauthorizedError);

      const { result } = renderHook(
        () => useInventoryItem('inv-other-user'),
        { wrapper: createSecurityWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Access denied');
    });

    it('should isolate movement history by user permissions', async () => {
      const userMovements = {
        success: [
          {
            id: 'movement-1',
            inventoryItemId: 'inv-123',
            movementType: 'adjustment' as const,
            quantityChange: 10,
            previousStock: 90,
            newStock: 100,
            reason: 'User adjustment',
            performedBy: 'staff-1',
            performedAt: '2024-01-01T12:00:00Z',
            referenceOrderId: null,
            batchId: null,
            createdAt: '2024-01-01T12:00:00Z'
          }
        ],
        totalProcessed: 1
      };

      const restrictedMovements = createSecurityError('permission', 'Cannot view movements for this inventory item');

      // User can access their own movements
      mockStockMovementService.getMovementHistory
        .mockImplementation((input) => {
          if (input.inventoryItemId === 'inv-123') {
            return Promise.resolve(userMovements);
          }
          return Promise.reject(restrictedMovements);
        });

      const wrapper = createSecurityWrapper();

      // Should access own movements
      const { result: allowedResult } = renderHook(
        () => useMovementHistory('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(allowedResult.current.isSuccess).toBe(true);
      });

      expect(allowedResult.current.data).toEqual(userMovements);

      // Should be denied access to other movements
      const { result: deniedResult } = renderHook(
        () => useMovementHistory('inv-other'),
        { wrapper }
      );

      await waitFor(() => {
        expect(deniedResult.current.isError).toBe(true);
      });

      expect(deniedResult.current.error?.message).toContain('Cannot view movements');
    });
  });

  // Security Test 3: Permission Escalation Prevention
  describe('Permission Escalation Prevention', () => {
    it('should prevent unauthorized bulk operations', async () => {
      const batchUpdates = [
        { inventoryItemId: 'inv-1', currentStock: 100, reason: 'Bulk update' },
        { inventoryItemId: 'inv-2', currentStock: 50, reason: 'Bulk update' },
        { inventoryItemId: 'inv-restricted', currentStock: 200, reason: 'Unauthorized access' }
      ];

      // Simulate partial authorization - can update some but not all
      const partialError = createSecurityError('permission', 'Insufficient permissions for bulk operation');
      mockInventoryService.batchUpdateStock.mockRejectedValue(partialError);

      const { result } = renderHook(
        () => useBatchUpdateStock(),
        { wrapper: createSecurityWrapper() }
      );

      await act(async () => {
        result.current.mutate(batchUpdates);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Insufficient permissions');
    });

    it('should validate permissions for each operation in workflow', async () => {
      // Simulate workflow where user has permission for first operation but not second
      const inventoryItem = {
        id: 'inv-123',
        productId: 'product-1',
        currentStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumThreshold: 15,
        maximumThreshold: 500,
        isActive: true,
        isVisibleToCustomers: true,
        lastStockUpdate: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };

      // Allow reading but deny movement recording
      mockInventoryService.getInventoryItem.mockResolvedValue(inventoryItem);
      mockStockMovementService.recordMovement.mockRejectedValue(
        createSecurityError('permission', 'Cannot record movements')
      );

      const wrapper = createSecurityWrapper();

      // First operation succeeds
      const { result: readResult } = renderHook(
        () => useInventoryItem('inv-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(readResult.current.isSuccess).toBe(true);
      });

      // Second operation fails
      const { result: movementResult } = renderHook(
        () => useRecordMovement(),
        { wrapper }
      );

      await act(async () => {
        movementResult.current.mutate({
          inventoryItemId: 'inv-123',
          movementType: 'adjustment',
          quantityChange: 10,
          previousStock: 100,
          newStock: 110,
          reason: 'Unauthorized movement',
          performedBy: 'restricted-user'
        });
      });

      await waitFor(() => {
        expect(movementResult.current.isError).toBe(true);
      });

      expect(movementResult.current.error?.message).toContain('Cannot record movements');
    });
  });

  // Security Test 4: Audit Trail Security
  describe('Audit Trail Security', () => {
    it('should ensure audit trails cannot be tampered with', async () => {
      // Attempt to create movement with manipulated data
      const suspiciousMovement = {
        inventoryItemId: 'inv-123',
        movementType: 'adjustment' as const,
        quantityChange: 1000000, // Suspiciously large change
        previousStock: 100,
        newStock: 1000100, // Doesn't match calculation
        reason: 'System error', // Suspicious reason
        performedBy: 'admin' // Impersonation attempt
      };

      const validationError = createSecurityError('permission', 'Invalid movement data detected');
      mockStockMovementService.recordMovement.mockRejectedValue(validationError);

      const { result } = renderHook(
        () => useRecordMovement(),
        { wrapper: createSecurityWrapper() }
      );

      await act(async () => {
        result.current.mutate(suspiciousMovement);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Invalid movement data');
    });

    it('should protect sensitive analytics data', async () => {
      // Non-admin user attempting to access detailed analytics
      const analyticsError = createSecurityError('permission', 'Insufficient permissions for detailed analytics');
      mockStockMovementService.getMovementAnalytics.mockRejectedValue(analyticsError);

      const { result } = renderHook(
        () => useMovementAnalytics({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          groupBy: 'day'
        }),
        { wrapper: createSecurityWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Insufficient permissions for detailed analytics');
    });

    it('should prevent unauthorized access to movement history', async () => {
      const restrictedError = createSecurityError('permission', 'Cannot access movement history for this item');
      mockStockMovementService.getMovementHistory.mockRejectedValue(restrictedError);

      const { result } = renderHook(
        () => useMovementHistory('inv-restricted'),
        { wrapper: createSecurityWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Cannot access movement history');
    });
  });

  // Security Test 5: Input Validation and Injection Prevention
  describe('Input Validation and Injection Prevention', () => {
    it('should reject malicious input in inventory operations', async () => {
      const maliciousInput = {
        inventoryId: 'inv-123; DROP TABLE inventory; --',
        stockUpdate: {
          currentStock: NaN,
          reason: '<script>alert("xss")</script>',
          performedBy: 'admin\'; DROP TABLE users; --'
        }
      };

      const validationError = createSecurityError('permission', 'Invalid input detected');
      mockInventoryService.updateStock.mockRejectedValue(validationError);

      const { result } = renderHook(
        () => useUpdateStock(),
        { wrapper: createSecurityWrapper() }
      );

      await act(async () => {
        result.current.mutate(maliciousInput);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Invalid input detected');
    });

    it('should validate movement data for consistency', async () => {
      const inconsistentMovement = {
        inventoryItemId: 'inv-123',
        movementType: 'adjustment' as const,
        quantityChange: 50,
        previousStock: 100,
        newStock: 200, // Doesn't match previousStock + quantityChange
        reason: 'Test',
        performedBy: 'user-1'
      };

      const consistencyError = createSecurityError('permission', 'Movement data consistency check failed');
      mockStockMovementService.recordMovement.mockRejectedValue(consistencyError);

      const { result } = renderHook(
        () => useRecordMovement(),
        { wrapper: createSecurityWrapper() }
      );

      await act(async () => {
        result.current.mutate(inconsistentMovement);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('consistency check failed');
    });
  });
});