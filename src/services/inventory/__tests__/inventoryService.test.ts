import { SimplifiedSupabaseMock } from '../../../test/serviceSetup';
import { InventoryService } from '../inventoryService';
import { ValidationMonitor } from '../../../utils/validationMonitorAdapter';

// Mock ValidationMonitor Adapter
jest.mock('../../../utils/validationMonitorAdapter', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('InventoryService', () => {
  let mockSupabase: SimplifiedSupabaseMock;
  let service: InventoryService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = new SimplifiedSupabaseMock();
    service = new InventoryService(mockSupabase.client);
    ValidationMonitor.clear();
  });

  describe('getInventoryItem', () => {
    it('should fetch and transform a single inventory item', async () => {
      const mockData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174456',
        warehouse_id: '123e4567-e89b-12d3-a456-426614174789',
        current_stock: 100,
        reserved_stock: 10,
        minimum_stock: 20,
        maximum_stock: 500,
        reorder_point: 30,
        reorder_quantity: 100,
        unit_cost: 25.50,
        last_restocked_at: '2024-01-15T10:00:00Z',
        last_counted_at: '2024-01-20T15:00:00Z',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-20T15:00:00Z',
      };

      mockSupabase.from('inventory_items').select.mockReturnValue({
        ...mockSupabase.from('inventory_items'),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      const result = await service.getInventoryItem('123e4567-e89b-12d3-a456-426614174000');

      expect(result.productId).toBe('123e4567-e89b-12d3-a456-426614174456');
      expect(result.availableStock).toBe(90);
      expect(result.totalValue).toBe(2550);
      expect(result.stockStatus).toBe('normal');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith('inventory-fetch');
    });

    it('should handle not found errors gracefully', async () => {
      const error = new Error('Item not found');
      
      mockSupabase.from('inventory_items').select.mockReturnValue({
        ...mockSupabase.from('inventory_items'),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error }),
        }),
      });

      await expect(service.getInventoryItem('bad-id'))
        .rejects.toThrow('Item not found');
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith('inventory-fetch', error);
    });

    it('should validate inventory item data structure', async () => {
      const invalidData = {
        id: 'not-a-uuid',
        product_id: '123e4567-e89b-12d3-a456-426614174456',
        // Missing required fields
      };

      mockSupabase.from('inventory_items').select.mockReturnValue({
        ...mockSupabase.from('inventory_items'),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: invalidData, error: null }),
        }),
      });

      await expect(service.getInventoryItem('123'))
        .rejects.toThrow();
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    });
  });

  describe('getInventoryItems', () => {
    it('should fetch and transform multiple inventory items', async () => {
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          product_id: '223e4567-e89b-12d3-a456-426614174001',
          warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
          current_stock: 50,
          reserved_stock: 5,
          minimum_stock: 10,
          maximum_stock: 200,
          reorder_point: 15,
          reorder_quantity: 50,
          unit_cost: 10.00,
          last_restocked_at: null,
          last_counted_at: null,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          product_id: '223e4567-e89b-12d3-a456-426614174002',
          warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
          current_stock: 0,
          reserved_stock: 0,
          minimum_stock: 5,
          maximum_stock: 100,
          reorder_point: 10,
          reorder_quantity: 25,
          unit_cost: 20.00,
          last_restocked_at: null,
          last_counted_at: null,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from('inventory_items').select.mockResolvedValue({ 
        data: mockData, 
        error: null 
      });

      const result = await service.getInventoryItems();

      expect(result).toHaveLength(2);
      expect(result[0].availableStock).toBe(45);
      expect(result[0].stockStatus).toBe('normal');
      expect(result[1].stockStatus).toBe('out_of_stock');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith('inventory-list');
    });

    it('should skip invalid items in batch fetch', async () => {
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          product_id: '223e4567-e89b-12d3-a456-426614174001',
          warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
          current_stock: 50,
          reserved_stock: 5,
          minimum_stock: 10,
          maximum_stock: 200,
          reorder_point: 15,
          reorder_quantity: 50,
          unit_cost: 10.00,
          last_restocked_at: null,
          last_counted_at: null,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'invalid-uuid',
          // Invalid/incomplete data
        },
      ];

      mockSupabase.from('inventory_items').select.mockResolvedValue({ 
        data: mockData, 
        error: null 
      });

      const result = await service.getInventoryItems();

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('223e4567-e89b-12d3-a456-426614174001');
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith('inventory-item', expect.any(Error));
    });

    it('should filter by warehouse if provided', async () => {
      const eqMock = jest.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.from('inventory_items').select.mockReturnValue({
        ...mockSupabase.from('inventory_items'),
        eq: eqMock,
      });

      await service.getInventoryItemsByWarehouse('323e4567-e89b-12d3-a456-426614174001');

      expect(mockSupabase.client.from).toHaveBeenCalledWith('inventory_items');
      expect(mockSupabase.from('inventory_items').select).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('warehouse_id', '323e4567-e89b-12d3-a456-426614174001');
    });
  });

  describe('createInventoryItem', () => {
    it('should create a new inventory item', async () => {
      const createData = {
        productId: '423e4567-e89b-12d3-a456-426614174123',
        warehouseId: '323e4567-e89b-12d3-a456-426614174001',
        currentStock: 100,
        reservedStock: 0,
        minimumStock: 20,
        maximumStock: 500,
        reorderPoint: 30,
        reorderQuantity: 100,
        unitCost: 25.50,
      };

      const mockCreated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '423e4567-e89b-12d3-a456-426614174123',
        warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
        current_stock: 100,
        reserved_stock: 0,
        minimum_stock: 20,
        maximum_stock: 500,
        reorder_point: 30,
        reorder_quantity: 100,
        unit_cost: 25.50,
        last_restocked_at: null,
        last_counted_at: null,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from('inventory_items').insert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockCreated, error: null }),
        }),
      });

      const result = await service.createInventoryItem(createData);

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.productId).toBe('423e4567-e89b-12d3-a456-426614174123');
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith('inventory-create');
    });

    it('should validate creation data', async () => {
      const invalidData = {
        productId: 'not-a-uuid',
        currentStock: -10, // Invalid negative stock
      } as any;

      await expect(service.createInventoryItem(invalidData))
        .rejects.toThrow();
    });
  });

  describe('updateInventoryItem', () => {
    it('should update inventory item fields', async () => {
      const updateData = {
        currentStock: 150,
        unitCost: 30.00,
      };

      const mockUpdated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '423e4567-e89b-12d3-a456-426614174123',
        warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
        current_stock: 150,
        reserved_stock: 0,
        minimum_stock: 20,
        maximum_stock: 500,
        reorder_point: 30,
        reorder_quantity: 100,
        unit_cost: 30.00,
        last_restocked_at: null,
        last_counted_at: null,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from('inventory_items').update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
          }),
        }),
      });

      const result = await service.updateInventoryItem('123e4567-e89b-12d3-a456-426614174000', updateData);

      expect(result.currentStock).toBe(150);
      expect(result.unitCost).toBe(30.00);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith('inventory-update');
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');

      mockSupabase.from('inventory_items').update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error }),
          }),
        }),
      });

      await expect(service.updateInventoryItem('123', { currentStock: 100 }))
        .rejects.toThrow('Update failed');
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith('inventory-update', error);
    });
  });

  describe('updateStock', () => {
    it('should atomically update stock with audit trail', async () => {
      const stockUpdate = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 50,
        operation: 'add' as const,
        reason: 'Restock from supplier',
      };

      // Mock getting current stock
      mockSupabase.from('inventory_items').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { current_stock: 100 }, 
            error: null 
          }),
        }),
      });

      // Mock updating stock
      mockSupabase.from('inventory_items').update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: '123e4567-e89b-12d3-a456-426614174000',
                current_stock: 150,
                product_id: '423e4567-e89b-12d3-a456-426614174123',
                warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
                reserved_stock: 0,
                minimum_stock: 20,
                maximum_stock: 500,
                reorder_point: 30,
                reorder_quantity: 100,
                unit_cost: 25.50,
                last_restocked_at: '2024-01-01T00:00:00Z',
                last_counted_at: null,
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              }, 
              error: null 
            }),
          }),
        }),
      });

      // Mock creating audit trail
      mockSupabase.from('stock_movements').insert.mockResolvedValue({ 
        data: {}, 
        error: null 
      });

      const result = await service.updateStock(stockUpdate, 'user-123');

      expect(result.currentStock).toBe(150);
      expect(mockSupabase.client.from).toHaveBeenCalledWith('stock_movements');
    });

    it('should handle subtract operations', async () => {
      const stockUpdate = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 30,
        operation: 'subtract' as const,
        reason: 'Order fulfillment',
      };

      mockSupabase.from('inventory_items').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { current_stock: 100 }, 
            error: null 
          }),
        }),
      });

      mockSupabase.from('inventory_items').update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: '123e4567-e89b-12d3-a456-426614174000',
                current_stock: 70,
                product_id: '423e4567-e89b-12d3-a456-426614174123',
                warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
                reserved_stock: 0,
                minimum_stock: 20,
                maximum_stock: 500,
                reorder_point: 30,
                reorder_quantity: 100,
                unit_cost: 25.50,
                last_restocked_at: null,
                last_counted_at: null,
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              }, 
              error: null 
            }),
          }),
        }),
      });

      mockSupabase.from('stock_movements').insert.mockResolvedValue({ 
        data: {}, 
        error: null 
      });

      const result = await service.updateStock(stockUpdate, 'user-123');

      expect(result.currentStock).toBe(70);
    });

    it('should prevent negative stock', async () => {
      const stockUpdate = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 150,
        operation: 'subtract' as const,
        reason: 'Large order',
      };

      mockSupabase.from('inventory_items').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { current_stock: 100 }, 
            error: null 
          }),
        }),
      });

      await expect(service.updateStock(stockUpdate, 'user-123'))
        .rejects.toThrow('Insufficient stock');
    });
  });

  describe('batchUpdateStock', () => {
    it('should process multiple stock updates resiliently', async () => {
      const updates = [
        {
          inventoryItemId: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 50,
          operation: 'add' as const,
          reason: 'Restock',
        },
        {
          inventoryItemId: '123e4567-e89b-12d3-a456-426614174002',
          quantity: 30,
          operation: 'subtract' as const,
          reason: 'Sale',
        },
      ];

      // First update succeeds
      mockSupabase.from('inventory_items').select.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { current_stock: 100 }, 
            error: null 
          }),
        }),
      });

      mockSupabase.from('inventory_items').update.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: '123e4567-e89b-12d3-a456-426614174001',
                current_stock: 150,
                product_id: '223e4567-e89b-12d3-a456-426614174001',
                warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
                reserved_stock: 0,
                minimum_stock: 20,
                maximum_stock: 500,
                reorder_point: 30,
                reorder_quantity: 100,
                unit_cost: 25.50,
                last_restocked_at: null,
                last_counted_at: null,
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              }, 
              error: null 
            }),
          }),
        }),
      });

      mockSupabase.from('stock_movements').insert.mockResolvedValueOnce({ 
        data: {}, 
        error: null 
      });

      // Second update succeeds
      mockSupabase.from('inventory_items').select.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { current_stock: 100 }, 
            error: null 
          }),
        }),
      });

      mockSupabase.from('inventory_items').update.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: '123e4567-e89b-12d3-a456-426614174002',
                current_stock: 70,
                product_id: '223e4567-e89b-12d3-a456-426614174002',
                warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
                reserved_stock: 0,
                minimum_stock: 20,
                maximum_stock: 500,
                reorder_point: 30,
                reorder_quantity: 100,
                unit_cost: 25.50,
                last_restocked_at: null,
                last_counted_at: null,
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              }, 
              error: null 
            }),
          }),
        }),
      });

      mockSupabase.from('stock_movements').insert.mockResolvedValueOnce({ 
        data: {}, 
        error: null 
      });

      const results = await service.batchUpdateStock(updates, 'user-123');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith('batch-update');
    });

    it('should continue processing on individual failures', async () => {
      const updates = [
        {
          inventoryItemId: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 500,
          operation: 'subtract' as const, // Will fail due to insufficient stock
          reason: 'Large order',
        },
        {
          inventoryItemId: '123e4567-e89b-12d3-a456-426614174002',
          quantity: 30,
          operation: 'add' as const,
          reason: 'Restock',
        },
      ];

      // First update fails
      mockSupabase.from('inventory_items').select.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { current_stock: 100 }, 
            error: null 
          }),
        }),
      });

      // Second update succeeds
      mockSupabase.from('inventory_items').select.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { current_stock: 100 }, 
            error: null 
          }),
        }),
      });

      mockSupabase.from('inventory_items').update.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: '123e4567-e89b-12d3-a456-426614174002',
                current_stock: 130,
                product_id: '223e4567-e89b-12d3-a456-426614174002',
                warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
                reserved_stock: 0,
                minimum_stock: 20,
                maximum_stock: 500,
                reorder_point: 30,
                reorder_quantity: 100,
                unit_cost: 25.50,
                last_restocked_at: null,
                last_counted_at: null,
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              }, 
              error: null 
            }),
          }),
        }),
      });

      mockSupabase.from('stock_movements').insert.mockResolvedValueOnce({ 
        data: {}, 
        error: null 
      });

      const results = await service.batchUpdateStock(updates, 'user-123');

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
      expect(results[1].success).toBe(true);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith('batch-update', expect.any(Error));
    });
  });

  describe('checkLowStock', () => {
    it('should identify items below reorder point', async () => {
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          product_id: '223e4567-e89b-12d3-a456-426614174001',
          warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
          current_stock: 25,
          reserved_stock: 5,
          minimum_stock: 10,
          maximum_stock: 200,
          reorder_point: 30,
          reorder_quantity: 50,
          unit_cost: 10.00,
          last_restocked_at: null,
          last_counted_at: null,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          product_id: '223e4567-e89b-12d3-a456-426614174002',
          warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
          current_stock: 5,
          reserved_stock: 0,
          minimum_stock: 10,
          maximum_stock: 100,
          reorder_point: 15,
          reorder_quantity: 25,
          unit_cost: 20.00,
          last_restocked_at: null,
          last_counted_at: null,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from('inventory_items').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      });

      const result = await service.checkLowStock();

      expect(result).toHaveLength(2);
      expect(result[0].stockStatus).toBe('low');
      expect(result[1].stockStatus).toBe('critical');
    });
  });

  describe('getStockValue', () => {
    it('should calculate total inventory value', async () => {
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          product_id: '223e4567-e89b-12d3-a456-426614174001',
          warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
          current_stock: 100,
          reserved_stock: 0,
          minimum_stock: 10,
          maximum_stock: 200,
          reorder_point: 15,
          reorder_quantity: 50,
          unit_cost: 10.00,
          last_restocked_at: null,
          last_counted_at: null,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          product_id: '223e4567-e89b-12d3-a456-426614174002',
          warehouse_id: '323e4567-e89b-12d3-a456-426614174001',
          current_stock: 50,
          reserved_stock: 0,
          minimum_stock: 5,
          maximum_stock: 100,
          reorder_point: 10,
          reorder_quantity: 25,
          unit_cost: 20.00,
          last_restocked_at: null,
          last_counted_at: null,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from('inventory_items').select.mockReturnValue({
        ...mockSupabase.from('inventory_items'),
        eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await service.getStockValue();

      expect(result.totalValue).toBe(2000);
      expect(result.itemCount).toBe(2);
      expect(result.totalUnits).toBe(150);
    });
  });

  describe('transferStock', () => {
    it('should transfer stock between warehouses', async () => {
      const transfer = {
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174001',
        fromWarehouseId: '323e4567-e89b-12d3-a456-426614174001',
        toWarehouseId: '323e4567-e89b-12d3-a456-426614174002',
        quantity: 30,
      };

      // Mock source item
      mockSupabase.from('inventory_items').select.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: '123e4567-e89b-12d3-a456-426614174001',
                current_stock: 100,
                product_id: '223e4567-e89b-12d3-a456-426614174001',
              }, 
              error: null 
            }),
          }),
        }),
      });

      // Mock destination item check
      mockSupabase.from('inventory_items').select.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { 
                id: '123e4567-e89b-12d3-a456-426614174002',
                current_stock: 50,
              }, 
              error: null 
            }),
          }),
        }),
      });

      // Mock source update
      mockSupabase.from('inventory_items').update.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { current_stock: 70 }, 
              error: null 
            }),
          }),
        }),
      });

      // Mock destination update
      mockSupabase.from('inventory_items').update.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: { current_stock: 80 }, 
              error: null 
            }),
          }),
        }),
      });

      // Mock movement record
      mockSupabase.from('stock_movements').insert.mockResolvedValue({ 
        data: {}, 
        error: null 
      });

      const result = await service.transferStock(transfer, 'user-123');

      expect(result.success).toBe(true);
      expect(result.sourceStock).toBe(70);
      expect(result.destinationStock).toBe(80);
    });
  });
});