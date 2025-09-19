// Contract validation for inventory schemas - ENFORCES 100% COMPLIANCE
import { z } from 'zod';
import {
  InventoryItemTransformSchema,
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  StockUpdateSchema,
} from '../inventory';
import type {
  InventoryItem,
  CreateInventoryItem,
  UpdateInventoryItem,
  StockUpdate,
} from '../../types/inventory';

// AssertExact type utility for compile-time validation
type AssertExact<T, U> = T extends U ? (U extends T ? true : false) : false;

// CRITICAL: Contract tests - these MUST compile or deployment fails
type InventoryItemContract = AssertExact<z.infer<typeof InventoryItemTransformSchema>, InventoryItem>;
type CreateInventoryItemContract = AssertExact<z.infer<typeof CreateInventoryItemSchema>, CreateInventoryItem>;
type UpdateInventoryItemContract = AssertExact<z.infer<typeof UpdateInventoryItemSchema>, UpdateInventoryItem>;
type StockUpdateContract = AssertExact<z.infer<typeof StockUpdateSchema>, StockUpdate>;

// Contract enforcement - TypeScript will fail compilation if these are not true
const _inventoryItemContract: InventoryItemContract = true;
const _createInventoryItemContract: CreateInventoryItemContract = true;
const _updateInventoryItemContract: UpdateInventoryItemContract = true;
const _stockUpdateContract: StockUpdateContract = true;

// Field completeness validation - ensures every interface field is populated
type InventoryItemFields = keyof InventoryItem;
type TransformOutputFields = keyof z.infer<typeof InventoryItemTransformSchema>;

// This type will cause compilation error if transformation misses interface fields
type FieldCompletenessCheck = InventoryItemFields extends TransformOutputFields ? true : false;
const _fieldCompletenessCheck: FieldCompletenessCheck = true;

// Runtime validation tests with comprehensive field checking
export const contractTests = {
  testInventoryItemTransformation: () => {
    const sampleDbData = {
      id: 'test-id',
      product_id: 'product-id',
      warehouse_id: 'warehouse-id',
      user_id: 'user-id',
      current_stock: 100,
      reserved_stock: 10,
      minimum_stock: 20,
      maximum_stock: 500,
      reorder_point: 30,
      reorder_quantity: 100,
      unit_cost: 25.50,
      last_restocked_at: '2023-01-01T00:00:00Z',
      last_counted_at: null,
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    const result = InventoryItemTransformSchema.parse(sampleDbData);

    // Verify ALL interface fields are present and correctly typed
    const requiredFields: (keyof InventoryItem)[] = [
      'id', 'productId', 'warehouseId', 'userId', 'currentStock', 'reservedStock',
      'availableStock', 'minimumStock', 'maximumStock', 'reorderPoint', 'reorderQuantity',
      'unitCost', 'totalValue', 'lastRestockedAt', 'lastCountedAt', 'isActive',
      'createdAt', 'updatedAt', 'stockStatus'
    ];

    requiredFields.forEach(field => {
      if (!(field in result)) {
        throw new Error(`CRITICAL: Missing field in transformation: ${field}`);
      }
    });

    // Verify computed fields are calculated correctly
    if (result.availableStock !== result.currentStock - result.reservedStock) {
      throw new Error('CRITICAL: availableStock calculation incorrect');
    }

    if (result.totalValue !== result.currentStock * result.unitCost) {
      throw new Error('CRITICAL: totalValue calculation incorrect');
    }

    if (!result.stockStatus || typeof result.stockStatus !== 'string') {
      throw new Error('CRITICAL: stockStatus not calculated');
    }

    return result;
  },

  testCreateInventoryItemValidation: () => {
    const sampleCreateData = {
      productId: 'product-id',
      warehouseId: 'warehouse-id',
      currentStock: 100,
      reservedStock: 10,
      minimumStock: 20,
      maximumStock: 500,
      reorderPoint: 30,
      reorderQuantity: 100,
      unitCost: 25.50,
    };

    const result = CreateInventoryItemSchema.parse(sampleCreateData);

    // Verify all required fields for creation
    const requiredCreateFields: (keyof CreateInventoryItem)[] = [
      'productId', 'warehouseId', 'currentStock', 'minimumStock',
      'maximumStock', 'reorderPoint', 'reorderQuantity', 'unitCost'
    ];

    requiredCreateFields.forEach(field => {
      if (!(field in result)) {
        throw new Error(`CRITICAL: Missing field in create schema: ${field}`);
      }
    });

    return result;
  },

  testStockUpdateValidation: () => {
    const sampleStockUpdate = {
      inventoryItemId: 'item-id',
      operation: 'add' as const,
      quantity: 50,
      reason: 'Restock from supplier',
    };

    const result = StockUpdateSchema.parse(sampleStockUpdate);

    // Verify operation is valid
    const validOperations = ['add', 'subtract', 'set'];
    if (!validOperations.includes(result.operation)) {
      throw new Error(`CRITICAL: Invalid operation: ${result.operation}`);
    }

    return result;
  },

  // Test error cases to ensure proper validation
  testValidationErrors: () => {
    // Test missing required fields
    try {
      CreateInventoryItemSchema.parse({ productId: 'test' }); // Missing required fields
      throw new Error('CRITICAL: Schema should have failed validation');
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Expected - validation working correctly
      } else {
        throw error;
      }
    }

    // Test invalid stock operation
    try {
      StockUpdateSchema.parse({
        inventoryItemId: 'test',
        operation: 'invalid' as any,
        quantity: 10
      });
      throw new Error('CRITICAL: Schema should have rejected invalid operation');
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Expected - validation working correctly
      } else {
        throw error;
      }
    }
  },
};

// Export contract validation function with detailed reporting
export const validateContracts = () => {
  try {
    console.log('🔍 Running comprehensive contract validation...');

    contractTests.testInventoryItemTransformation();
    console.log('✅ InventoryItem transformation contract validated');

    contractTests.testCreateInventoryItemValidation();
    console.log('✅ CreateInventoryItem contract validated');

    contractTests.testStockUpdateValidation();
    console.log('✅ StockUpdate contract validated');

    contractTests.testValidationErrors();
    console.log('✅ Error validation contracts validated');

    console.log('🎉 ALL INVENTORY SCHEMA CONTRACTS PASS - 100% COMPLIANCE');
    return true;
  } catch (error) {
    console.error('💥 CRITICAL: Schema contract validation FAILED:', error);
    console.error('⚠️  This indicates a schema-interface mismatch that MUST be fixed');
    return false;
  }
};

// Export for pre-commit hook usage
export const preCommitValidation = () => {
  const isValid = validateContracts();
  if (!isValid) {
    console.error('❌ Pre-commit validation FAILED - contracts must pass before commit');
    process.exit(1);
  }
  console.log('✅ Pre-commit validation PASSED');
};