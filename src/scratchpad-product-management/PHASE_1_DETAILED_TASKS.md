# Phase 1: Core Data Model Separation - Detailed Task Breakdown

## 🎯 Phase 1 Overview
Transform the monolithic ProductAdmin model into role-based architecture while maintaining all existing functionality and following established architectural patterns.

**Duration**: 2 weeks  
**Test Target**: 70+ tests across all components  
**Pattern Focus**: Schema Contract Management + Service Inheritance

---

## 📋 **Task 1.1: Create Role-Specific Schema Contracts with TDD**

### **Day 1: Schema Contract Test Suite (TDD)**

**Step 1.1.1**: Create Contract Validation Tests
```typescript
// src/schemas/__contracts__/roleBasedSchemas.contracts.test.ts
describe('Role-based Schema Contracts', () => {
  // Contract Test 1: ProductCore compilation validation
  it('should compile ProductCore contract without errors', () => {
    const contractValidator = (product: DatabaseProduct): ProductCoreContract => {
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        category_id: product.category_id,
        sku: product.sku,
        is_available: product.is_available,
        created_at: product.created_at,
        updated_at: product.updated_at
      };
    };
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Inventory extension validation
  it('should compile InventoryExtension contract without errors', () => {
    const inventoryValidator = (product: DatabaseProduct): InventoryContract => {
      return {
        ...productCoreValidator(product),
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        supplier_id: product.supplier_id,
        cost_price: product.cost_price,
        last_stock_update: product.last_stock_update
      };
    };
    expect(inventoryValidator).toBeDefined();
  });

  // Contract Test 3: Marketing extension validation  
  it('should compile MarketingExtension contract without errors', () => {
    const marketingValidator = (product: DatabaseProduct): MarketingContract => {
      return {
        ...productCoreValidator(product),
        description: product.description,
        image_urls: product.image_urls,
        tags: product.tags,
        is_weekly_special: product.is_weekly_special,
        special_price: product.special_price,
        bundle_items: product.bundle_items
      };
    };
    expect(marketingValidator).toBeDefined();
  });

  // Contract Test 4: Field isolation validation
  it('should ensure inventory fields are not in marketing contract', () => {
    const marketingFields = Object.keys(getMarketingContract());
    const inventoryFields = ['stock_quantity', 'supplier_id', 'cost_price'];
    
    inventoryFields.forEach(field => {
      expect(marketingFields).not.toContain(field);
    });
  });

  // Contract Test 5: Field isolation validation (reverse)
  it('should ensure marketing fields are not in inventory contract', () => {
    const inventoryFields = Object.keys(getInventoryContract());
    const marketingFields = ['description', 'image_urls', 'bundle_items'];
    
    marketingFields.forEach(field => {
      expect(inventoryFields).not.toContain(field);
    });
  });

  // Continue with 15+ contract tests...
});
```

**Test Goal**: 20 contract tests that fail compilation if schemas don't match database.generated.ts

**Step 1.1.2**: Create Schema Type Definitions
```typescript
// src/schemas/types/roleBasedContracts.ts
export interface ProductCoreContract {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  sku: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryContract extends ProductCoreContract {
  stock_quantity: number;
  low_stock_threshold: number;
  supplier_id: string | null;
  cost_price: number | null;
  last_stock_update: string;
}

export interface MarketingContract extends ProductCoreContract {
  description: string;
  image_urls: string[];
  tags: string[];
  is_weekly_special: boolean;
  special_price: number | null;
  bundle_items: string[];
}
```

### **Day 2: Schema Implementation with Zod**

**Step 1.1.3**: Implement ProductCore Schema
```typescript
// src/schemas/productCore.schema.ts
import { z } from 'zod';

export const ProductCoreSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().min(0, 'Price must be positive'),
  category_id: z.string().nullable(),
  sku: z.string().nullable(),
  is_available: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export const ProductCoreCreateSchema = ProductCoreSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const ProductCoreUpdateSchema = ProductCoreCreateSchema.partial();

// Transform function with validation
export function transformProductCore(
  rawProduct: unknown,
  categories?: any[]
): ProductCoreTransform {
  const validated = ProductCoreSchema.parse(rawProduct);
  
  return {
    ...validated,
    category: categories?.find(c => c.id === validated.category_id) || null
  };
}

export type ProductCoreTransform = z.infer<typeof ProductCoreSchema> & {
  category: Category | null;
};
```

**Step 1.1.4**: Implement Inventory Extension Schema
```typescript
// src/schemas/productInventory.schema.ts
import { ProductCoreSchema } from './productCore.schema';

export const ProductInventorySchema = ProductCoreSchema.extend({
  stock_quantity: z.number().min(0, 'Stock cannot be negative'),
  low_stock_threshold: z.number().min(0, 'Threshold cannot be negative'),
  supplier_id: z.string().nullable(),
  cost_price: z.number().min(0).nullable(),
  last_stock_update: z.string()
});

export const InventoryUpdateSchema = z.object({
  stock_quantity: z.number().min(0).optional(),
  low_stock_threshold: z.number().min(0).optional(),
  supplier_id: z.string().nullable().optional(),
  cost_price: z.number().min(0).nullable().optional()
});

export function transformProductInventory(
  rawProduct: unknown,
  categories?: any[],
  suppliers?: any[]
): ProductInventoryTransform {
  const validated = ProductInventorySchema.parse(rawProduct);
  
  return {
    ...validated,
    category: categories?.find(c => c.id === validated.category_id) || null,
    supplier: suppliers?.find(s => s.id === validated.supplier_id) || null
  };
}

export type ProductInventoryTransform = z.infer<typeof ProductInventorySchema> & {
  category: Category | null;
  supplier: Supplier | null;
};
```

**Step 1.1.5**: Implement Marketing Extension Schema
```typescript
// src/schemas/productMarketing.schema.ts
import { ProductCoreSchema } from './productCore.schema';

export const ProductMarketingSchema = ProductCoreSchema.extend({
  description: z.string(),
  image_urls: z.array(z.string().url()),
  tags: z.array(z.string()),
  is_weekly_special: z.boolean(),
  special_price: z.number().min(0).nullable(),
  special_start_date: z.string().nullable(),
  special_end_date: z.string().nullable(),
  bundle_items: z.array(z.string()),
  seo_title: z.string().optional(),
  seo_description: z.string().optional()
});

export const MarketingUpdateSchema = z.object({
  description: z.string().optional(),
  image_urls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  is_weekly_special: z.boolean().optional(),
  special_price: z.number().min(0).nullable().optional(),
  bundle_items: z.array(z.string()).optional()
});

export function transformProductMarketing(
  rawProduct: unknown,
  categories?: any[]
): ProductMarketingTransform {
  const validated = ProductMarketingSchema.parse(rawProduct);
  
  return {
    ...validated,
    category: categories?.find(c => c.id === validated.category_id) || null
  };
}

export type ProductMarketingTransform = z.infer<typeof ProductMarketingSchema> & {
  category: Category | null;
};
```

### **Day 3: Schema Transform Tests**

**Step 1.1.6**: Create Transform Validation Tests
```typescript
// src/schemas/__tests__/roleBasedTransforms.test.ts
describe('Role-based Transform Functions', () => {
  describe('transformProductCore', () => {
    it('should transform valid product data', () => {
      const rawProduct = {
        id: 'prod-1',
        name: 'Test Product',
        price: 10.99,
        category_id: 'cat-1',
        // ... complete valid data
      };
      
      const result = transformProductCore(rawProduct);
      expect(result.id).toBe('prod-1');
      expect(result.name).toBe('Test Product');
    });

    it('should throw on invalid data', () => {
      const invalidProduct = { id: 'prod-1' }; // Missing required fields
      
      expect(() => transformProductCore(invalidProduct)).toThrow();
    });

    it('should attach category data when provided', () => {
      const categories = [{ id: 'cat-1', name: 'Category 1' }];
      const result = transformProductCore(validProduct, categories);
      
      expect(result.category).toEqual({ id: 'cat-1', name: 'Category 1' });
    });
  });

  describe('transformProductInventory', () => {
    it('should include inventory-specific fields', () => {
      const result = transformProductInventory(validInventoryProduct);
      
      expect(result.stock_quantity).toBeDefined();
      expect(result.supplier_id).toBeDefined();
      expect(typeof result.stock_quantity).toBe('number');
    });

    it('should validate stock quantity is non-negative', () => {
      const invalidStock = { ...validInventoryProduct, stock_quantity: -5 };
      
      expect(() => transformProductInventory(invalidStock)).toThrow();
    });
  });

  describe('transformProductMarketing', () => {
    it('should include marketing-specific fields', () => {
      const result = transformProductMarketing(validMarketingProduct);
      
      expect(result.description).toBeDefined();
      expect(result.image_urls).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should validate image URLs', () => {
      const invalidImages = { 
        ...validMarketingProduct, 
        image_urls: ['not-a-url', 'also-invalid'] 
      };
      
      expect(() => transformProductMarketing(invalidImages)).toThrow();
    });
  });
});
```

**Test Goal**: 15+ transform tests validating data processing

**Commit Point**: All schema contract tests pass + TypeScript compiles

---

## 📋 **Task 1.2: Implement Service Layer Separation with Direct Supabase Patterns**

### **Day 4: Base Service with TDD**

**Step 1.2.1**: Create ProductCoreService Tests
```typescript
// src/services/__tests__/productCoreService.test.ts
describe('ProductCoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should use exact field selection (Direct Supabase Pattern)', async () => {
      const service = new ProductCoreService();
      await service.getProducts();
      
      expect(supabaseMock.from).toHaveBeenCalledWith(TABLES.PRODUCTS);
      expect(supabaseMock.select).toHaveBeenCalledWith(
        'id, name, price, category_id, sku, is_available, created_at, updated_at'
      );
    });

    it('should implement resilient item processing (Pattern 3)', async () => {
      const mockData = [
        validProductData,
        invalidProductData, // Missing required fields
        anotherValidProductData
      ];
      
      supabaseMock.from().select().returns({ data: mockData, error: null });
      
      const result = await service.getProducts();
      
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2); // 2 valid, 1 skipped
      expect(result.errors).toHaveLength(1);
      expect(result.userMessage).toContain('2 products loaded, 1 skipped');
    });

    it('should track validation successes with ValidationMonitor', async () => {
      await service.getProducts();
      
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'productCoreService',
        pattern: 'resilient_item_processing',
        operation: 'getProducts'
      });
    });

    it('should track validation errors with ValidationMonitor', async () => {
      supabaseMock.from().select().returns({ 
        data: [invalidProductData], 
        error: null 
      });
      
      await service.getProducts();
      
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        service: 'productCoreService',
        operation: 'getProducts',
        error: expect.any(String)
      });
    });
  });

  describe('getProduct', () => {
    it('should fetch single product with categories', async () => {
      const service = new ProductCoreService();
      await service.getProduct('prod-1');
      
      expect(supabaseMock.from).toHaveBeenCalledWith(TABLES.PRODUCTS);
      expect(supabaseMock.select).toHaveBeenCalledWith(
        'id, name, price, category_id, sku, is_available, created_at, updated_at'
      );
      expect(supabaseMock.eq).toHaveBeenCalledWith('id', 'prod-1');
    });
  });

  describe('updateProduct', () => {
    it('should update with atomic operation pattern', async () => {
      const updateData = { name: 'Updated Name', price: 15.99 };
      const result = await service.updateProduct('prod-1', updateData);
      
      expect(supabaseMock.update).toHaveBeenCalledWith({
        name: 'Updated Name',
        price: 15.99,
        updated_at: expect.any(String)
      });
      expect(BroadcastHelper.sendProductUpdate).toHaveBeenCalled();
    });
  });

  // Continue with 15+ service tests...
});
```

**Step 1.2.2**: Implement ProductCoreService
```typescript
// src/services/core/productCoreService.ts
import { supabase, TABLES } from '../../config/supabase';
import { BroadcastHelper } from '../../utils/broadcastHelper';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { 
  ProductCoreSchema,
  ProductCoreCreateSchema,
  ProductCoreUpdateSchema,
  transformProductCore,
  type ProductCoreTransform 
} from '../../schemas/productCore.schema';

export class ProductCoreService {
  /**
   * Get all products with resilient processing (Pattern 3)
   */
  async getProducts(): Promise<{
    success: boolean;
    products: ProductCoreTransform[];
    errors: Array<{ id: string; error: string }>;
    userMessage?: string;
  }> {
    try {
      // Step 1: Direct Supabase query with exact fields (Pattern 1)
      const { data: rawProducts, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('id, name, price, category_id, sku, is_available, created_at, updated_at');

      if (error) {
        ValidationMonitor.recordValidationError({
          service: 'productCoreService',
          operation: 'getProducts',
          error: error.message
        });
        
        return {
          success: false,
          products: [],
          errors: [{ id: 'database', error: error.message }]
        };
      }

      // Step 2: Fetch categories separately for resilience
      const { data: categories } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id, name, description');

      // Step 3: Resilient item processing (Pattern 3)
      const products: ProductCoreTransform[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const rawProduct of rawProducts || []) {
        try {
          const product = transformProductCore(rawProduct, categories || []);
          products.push(product);
          
          // Track success
          ValidationMonitor.recordPatternSuccess({
            service: 'productCoreService',
            pattern: 'resilient_item_processing',
            operation: 'getProducts',
            details: { productId: product.id }
          });
        } catch (validationError) {
          const errorMessage = validationError instanceof Error 
            ? validationError.message 
            : 'Unknown validation error';
          
          errors.push({
            id: rawProduct?.id || 'unknown',
            error: errorMessage
          });
          
          // Track error
          ValidationMonitor.recordValidationError({
            service: 'productCoreService',
            operation: 'getProducts',
            error: errorMessage,
            details: { productId: rawProduct?.id }
          });
        }
      }

      const userMessage = errors.length > 0
        ? `${products.length} products loaded, ${errors.length} skipped due to validation errors`
        : undefined;

      return {
        success: products.length > 0,
        products,
        errors,
        userMessage
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        service: 'productCoreService',
        operation: 'getProducts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        products: [],
        errors: [{ id: 'service', error: 'Service error occurred' }]
      };
    }
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: string): Promise<{
    success: boolean;
    product?: ProductCoreTransform;
    error?: string;
  }> {
    try {
      const { data: rawProduct, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('id, name, price, category_id, sku, is_available, created_at, updated_at')
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const { data: categories } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id, name, description');

      const product = transformProductCore(rawProduct, categories || []);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'productCoreService',
        pattern: 'direct_supabase_query',
        operation: 'getProduct',
        details: { productId: id }
      });

      return { success: true, product };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      ValidationMonitor.recordValidationError({
        service: 'productCoreService',
        operation: 'getProduct',
        error: errorMessage,
        details: { productId: id }
      });
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update product with atomic operation
   */
  async updateProduct(id: string, data: any): Promise<{
    success: boolean;
    product?: ProductCoreTransform;
    error?: string;
  }> {
    try {
      // Validate update data
      const validatedData = ProductCoreUpdateSchema.parse(data);
      
      // Atomic update
      const { data: updatedProduct, error } = await supabase
        .from(TABLES.PRODUCTS)
        .update({
          ...validatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Broadcast update
      await BroadcastHelper.sendProductUpdate('product-updated', {
        productId: id,
        product: updatedProduct,
        operation: 'core-update'
      });

      const { data: categories } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id, name, description');

      const product = transformProductCore(updatedProduct, categories || []);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'productCoreService',
        pattern: 'atomic_operation',
        operation: 'updateProduct',
        details: { productId: id }
      });

      return { success: true, product };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      ValidationMonitor.recordValidationError({
        service: 'productCoreService',
        operation: 'updateProduct',
        error: errorMessage,
        details: { productId: id }
      });
      
      return { success: false, error: errorMessage };
    }
  }
}

export default new ProductCoreService();
```

### **Day 5: Inventory Service Extension**

**Step 1.2.3**: Create Inventory Service Tests
```typescript
// src/services/__tests__/productInventoryService.test.ts
describe('ProductInventoryService', () => {
  describe('getInventoryProducts', () => {
    it('should extend core service with inventory fields', async () => {
      const service = new ProductInventoryService();
      await service.getInventoryProducts();
      
      expect(supabaseMock.select).toHaveBeenCalledWith(
        'id, name, price, category_id, sku, is_available, created_at, updated_at, stock_quantity, low_stock_threshold, supplier_id, cost_price, last_stock_update'
      );
    });

    it('should include supplier information', async () => {
      const result = await service.getInventoryProducts();
      
      expect(result.products[0]).toHaveProperty('supplier');
      expect(result.products[0].supplier).toHaveProperty('name');
    });
  });

  describe('updateStock', () => {
    it('should update stock with tracking', async () => {
      const result = await service.updateStock('prod-1', 50, 'Inventory restock');
      
      expect(supabaseMock.update).toHaveBeenCalledWith({
        stock_quantity: 50,
        last_stock_update: expect.any(String),
        updated_at: expect.any(String)
      });
      
      // Should create stock movement record
      expect(supabaseMock.insert).toHaveBeenCalledWith({
        product_id: 'prod-1',
        movement_type: 'in',
        quantity: expect.any(Number),
        reason: 'Inventory restock'
      });
    });
  });

  // Continue with 12+ inventory service tests...
});
```

**Step 1.2.4**: Implement Inventory Service
```typescript
// src/services/inventory/productInventoryService.ts
import { ProductCoreService } from '../core/productCoreService';
import { 
  ProductInventorySchema,
  transformProductInventory,
  type ProductInventoryTransform 
} from '../../schemas/productInventory.schema';

export class ProductInventoryService extends ProductCoreService {
  /**
   * Get all products with inventory data
   */
  async getInventoryProducts(): Promise<{
    success: boolean;
    products: ProductInventoryTransform[];
    errors: Array<{ id: string; error: string }>;
    userMessage?: string;
  }> {
    try {
      // Extended field selection for inventory
      const { data: rawProducts, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id, name, price, category_id, sku, is_available, created_at, updated_at,
          stock_quantity, low_stock_threshold, supplier_id, cost_price, last_stock_update
        `);

      if (error) {
        ValidationMonitor.recordValidationError({
          service: 'productInventoryService',
          operation: 'getInventoryProducts',
          error: error.message
        });
        
        return {
          success: false,
          products: [],
          errors: [{ id: 'database', error: error.message }]
        };
      }

      // Fetch related data
      const [categoriesResponse, suppliersResponse] = await Promise.all([
        supabase.from(TABLES.CATEGORIES).select('id, name, description'),
        supabase.from(TABLES.SUPPLIERS).select('id, name, contact_info')
      ]);

      // Resilient processing with inventory transform
      const products: ProductInventoryTransform[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const rawProduct of rawProducts || []) {
        try {
          const product = transformProductInventory(
            rawProduct,
            categoriesResponse.data || [],
            suppliersResponse.data || []
          );
          products.push(product);
          
          ValidationMonitor.recordPatternSuccess({
            service: 'productInventoryService',
            pattern: 'resilient_item_processing',
            operation: 'getInventoryProducts',
            details: { productId: product.id }
          });
        } catch (validationError) {
          const errorMessage = validationError instanceof Error 
            ? validationError.message 
            : 'Unknown validation error';
          
          errors.push({
            id: rawProduct?.id || 'unknown',
            error: errorMessage
          });
          
          ValidationMonitor.recordValidationError({
            service: 'productInventoryService',
            operation: 'getInventoryProducts',
            error: errorMessage,
            details: { productId: rawProduct?.id }
          });
        }
      }

      return {
        success: products.length > 0,
        products,
        errors,
        userMessage: errors.length > 0 
          ? `${products.length} products loaded, ${errors.length} had inventory data issues`
          : undefined
      };
    } catch (error) {
      return {
        success: false,
        products: [],
        errors: [{ id: 'service', error: 'Inventory service error' }]
      };
    }
  }

  /**
   * Update stock quantity with movement tracking
   */
  async updateStock(
    productId: string, 
    newQuantity: number, 
    reason: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get current stock for movement calculation
      const { data: currentProduct } = await supabase
        .from(TABLES.PRODUCTS)
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      const currentStock = currentProduct?.stock_quantity || 0;
      const movementQuantity = newQuantity - currentStock;
      const movementType = movementQuantity > 0 ? 'in' : 'out';

      // Atomic operation: Update stock and create movement record
      const { error: updateError } = await supabase
        .from(TABLES.PRODUCTS)
        .update({
          stock_quantity: newQuantity,
          last_stock_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Create movement record
      const { error: movementError } = await supabase
        .from(TABLES.STOCK_MOVEMENTS)
        .insert({
          product_id: productId,
          movement_type: movementType,
          quantity: Math.abs(movementQuantity),
          reason,
          created_at: new Date().toISOString()
        });

      if (movementError) {
        console.warn('Stock updated but movement record failed:', movementError);
      }

      // Broadcast update
      await BroadcastHelper.sendProductUpdate('stock-updated', {
        productId,
        newStock: newQuantity,
        oldStock: currentStock,
        operation: 'inventory-update'
      });

      ValidationMonitor.recordPatternSuccess({
        service: 'productInventoryService',
        pattern: 'atomic_operation',
        operation: 'updateStock',
        details: { productId, newQuantity, reason }
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      ValidationMonitor.recordValidationError({
        service: 'productInventoryService',
        operation: 'updateStock',
        error: errorMessage,
        details: { productId, newQuantity }
      });
      
      return { success: false, error: errorMessage };
    }
  }
}

export default new ProductInventoryService();
```

### **Day 6: Marketing Service Extension**

**Step 1.2.5**: Create Marketing Service Tests
```typescript
// src/services/__tests__/productMarketingService.test.ts
describe('ProductMarketingService', () => {
  describe('getMarketingProducts', () => {
    it('should extend core service with marketing fields', async () => {
      const service = new ProductMarketingService();
      await service.getMarketingProducts();
      
      expect(supabaseMock.select).toHaveBeenCalledWith(
        'id, name, price, category_id, sku, is_available, created_at, updated_at, description, image_urls, tags, is_weekly_special, special_price, bundle_items'
      );
    });

    it('should handle special pricing logic', async () => {
      const result = await service.getMarketingProducts();
      
      const specialProduct = result.products.find(p => p.is_weekly_special);
      expect(specialProduct?.special_price).toBeLessThan(specialProduct?.price);
    });
  });

  describe('updateContent', () => {
    it('should update marketing content with validation', async () => {
      const contentData = {
        description: 'Updated description',
        tags: ['organic', 'fresh'],
        image_urls: ['https://example.com/image1.jpg']
      };
      
      const result = await service.updateContent('prod-1', contentData);
      
      expect(supabaseMock.update).toHaveBeenCalledWith({
        description: 'Updated description',
        tags: ['organic', 'fresh'],
        image_urls: ['https://example.com/image1.jpg'],
        updated_at: expect.any(String)
      });
    });
  });

  // Continue with 12+ marketing service tests...
});
```

**Step 1.2.6**: Implement Marketing Service
```typescript
// src/services/marketing/productMarketingService.ts
import { ProductCoreService } from '../core/productCoreService';
import { 
  ProductMarketingSchema,
  transformProductMarketing,
  type ProductMarketingTransform 
} from '../../schemas/productMarketing.schema';

export class ProductMarketingService extends ProductCoreService {
  /**
   * Get all products with marketing data
   */
  async getMarketingProducts(): Promise<{
    success: boolean;
    products: ProductMarketingTransform[];
    errors: Array<{ id: string; error: string }>;
    userMessage?: string;
  }> {
    try {
      // Extended field selection for marketing
      const { data: rawProducts, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select(`
          id, name, price, category_id, sku, is_available, created_at, updated_at,
          description, image_urls, tags, is_weekly_special, special_price, 
          special_start_date, special_end_date, bundle_items, seo_title, seo_description
        `);

      if (error) {
        ValidationMonitor.recordValidationError({
          service: 'productMarketingService',
          operation: 'getMarketingProducts',
          error: error.message
        });
        
        return {
          success: false,
          products: [],
          errors: [{ id: 'database', error: error.message }]
        };
      }

      // Fetch categories for content context
      const { data: categories } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id, name, description');

      // Resilient processing with marketing transform
      const products: ProductMarketingTransform[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const rawProduct of rawProducts || []) {
        try {
          const product = transformProductMarketing(
            rawProduct,
            categories || []
          );
          products.push(product);
          
          ValidationMonitor.recordPatternSuccess({
            service: 'productMarketingService',
            pattern: 'resilient_item_processing',
            operation: 'getMarketingProducts',
            details: { productId: product.id }
          });
        } catch (validationError) {
          const errorMessage = validationError instanceof Error 
            ? validationError.message 
            : 'Unknown validation error';
          
          errors.push({
            id: rawProduct?.id || 'unknown',
            error: errorMessage
          });
          
          ValidationMonitor.recordValidationError({
            service: 'productMarketingService',
            operation: 'getMarketingProducts',
            error: errorMessage,
            details: { productId: rawProduct?.id }
          });
        }
      }

      return {
        success: products.length > 0,
        products,
        errors,
        userMessage: errors.length > 0 
          ? `${products.length} products loaded, ${errors.length} had content issues`
          : undefined
      };
    } catch (error) {
      return {
        success: false,
        products: [],
        errors: [{ id: 'service', error: 'Marketing service error' }]
      };
    }
  }

  /**
   * Update product marketing content
   */
  async updateContent(
    productId: string, 
    contentData: any
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Validate marketing data
      const validatedData = MarketingUpdateSchema.parse(contentData);
      
      // Atomic content update
      const { error } = await supabase
        .from(TABLES.PRODUCTS)
        .update({
          ...validatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      // Broadcast content update
      await BroadcastHelper.sendProductUpdate('content-updated', {
        productId,
        contentData: validatedData,
        operation: 'marketing-update'
      });

      ValidationMonitor.recordPatternSuccess({
        service: 'productMarketingService',
        pattern: 'atomic_operation',
        operation: 'updateContent',
        details: { productId }
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      ValidationMonitor.recordValidationError({
        service: 'productMarketingService',
        operation: 'updateContent',
        error: errorMessage,
        details: { productId }
      });
      
      return { success: false, error: errorMessage };
    }
  }
}

export default new ProductMarketingService();
```

**Commit Point**: All service layer tests pass (39+ tests) + TypeScript compiles cleanly

---

## 📋 **Task 1.3: Create Database Views and Migration Strategy**

### **Day 7: Database View Creation**

**Step 1.3.1**: Create Database Views
```sql
-- database/migrations/role-based-views.sql

-- Inventory Products View
CREATE OR REPLACE VIEW inventory_products AS 
SELECT 
  id, name, price, category_id, sku, is_available, created_at, updated_at,
  stock_quantity, low_stock_threshold, supplier_id, cost_price, last_stock_update
FROM products;

-- Marketing Products View  
CREATE OR REPLACE VIEW marketing_products AS
SELECT 
  id, name, price, category_id, sku, is_available, created_at, updated_at,
  description, image_urls, tags, is_weekly_special, special_price, 
  special_start_date, special_end_date, bundle_items, seo_title, seo_description
FROM products;

-- Core Products View (shared fields only)
CREATE OR REPLACE VIEW core_products AS
SELECT 
  id, name, price, category_id, sku, is_available, created_at, updated_at
FROM products;

-- Grant appropriate permissions
GRANT SELECT ON inventory_products TO inventory_role;
GRANT SELECT ON marketing_products TO marketing_role;
GRANT SELECT ON core_products TO authenticated;
```

**Step 1.3.2**: Create View Validation Tests
```typescript
// src/database/__tests__/roleBasedViews.test.ts
describe('Role-based Database Views', () => {
  describe('inventory_products view', () => {
    it('should include all inventory fields', async () => {
      const { data } = await supabase.from('inventory_products').select('*').limit(1);
      const product = data?.[0];
      
      expect(product).toHaveProperty('stock_quantity');
      expect(product).toHaveProperty('supplier_id');
      expect(product).toHaveProperty('cost_price');
      expect(product).not.toHaveProperty('description'); // Marketing field
    });

    it('should return consistent data with products table', async () => {
      const [viewData, tableData] = await Promise.all([
        supabase.from('inventory_products').select('id, name, stock_quantity').limit(5),
        supabase.from('products').select('id, name, stock_quantity').limit(5)
      ]);
      
      expect(viewData.data).toEqual(tableData.data);
    });
  });

  describe('marketing_products view', () => {
    it('should include all marketing fields', async () => {
      const { data } = await supabase.from('marketing_products').select('*').limit(1);
      const product = data?.[0];
      
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('image_urls');
      expect(product).toHaveProperty('tags');
      expect(product).not.toHaveProperty('stock_quantity'); // Inventory field
    });

    it('should handle special pricing correctly', async () => {
      const { data } = await supabase
        .from('marketing_products')
        .select('*')
        .eq('is_weekly_special', true)
        .limit(1);
      
      const specialProduct = data?.[0];
      if (specialProduct) {
        expect(specialProduct.special_price).toBeLessThan(specialProduct.price);
      }
    });
  });

  describe('core_products view', () => {
    it('should include only shared fields', async () => {
      const { data } = await supabase.from('core_products').select('*').limit(1);
      const product = data?.[0];
      
      // Should have core fields
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      
      // Should not have role-specific fields
      expect(product).not.toHaveProperty('stock_quantity');
      expect(product).not.toHaveProperty('description');
    });
  });
});
```

### **Day 8: Migration Script and Backward Compatibility**

**Step 1.3.3**: Create Migration Script
```javascript
// scripts/migrate-role-separation.js
const { createClient } = require('@supabase/supabase-js');

async function migrateRoleSeparation() {
  console.log('🚀 Starting role-based architecture migration...');
  
  // Step 1: Validate existing data
  console.log('📊 Validating existing product data...');
  const { data: products } = await supabase.from('products').select('*').limit(100);
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (const product of products) {
    try {
      // Test transform functions
      transformProductCore(product);
      transformProductInventory(product);
      transformProductMarketing(product);
      validCount++;
    } catch (error) {
      console.warn(`Product ${product.id} has validation issues:`, error.message);
      invalidCount++;
    }
  }
  
  console.log(`✅ Valid products: ${validCount}`);
  console.log(`⚠️  Products with issues: ${invalidCount}`);
  
  // Step 2: Create database views
  console.log('🗄️  Creating database views...');
  const viewSQL = fs.readFileSync('./database/migrations/role-based-views.sql', 'utf8');
  await supabase.rpc('exec_sql', { sql: viewSQL });
  
  // Step 3: Test backward compatibility
  console.log('🔄 Testing backward compatibility...');
  const oldService = new ProductAdminService();
  const oldResult = await oldService.getAllProducts();
  
  const newCoreService = new ProductCoreService();
  const newResult = await newCoreService.getProducts();
  
  console.log(`Old service returned ${oldResult.products?.length || 0} products`);
  console.log(`New service returned ${newResult.products?.length || 0} products`);
  
  if (oldResult.products?.length !== newResult.products?.length) {
    console.error('❌ Backward compatibility test failed!');
    process.exit(1);
  }
  
  console.log('✅ Migration completed successfully!');
}

migrateRoleSeparation().catch(console.error);
```

**Step 1.3.4**: Validate Migration
```typescript
// src/database/__tests__/migrationValidation.test.ts
describe('Migration Validation', () => {
  it('should maintain backward compatibility with ProductAdminService', async () => {
    const oldService = new ProductAdminService();
    const newCoreService = new ProductCoreService();
    
    const [oldResult, newResult] = await Promise.all([
      oldService.getAllProducts(),
      newCoreService.getProducts()
    ]);
    
    expect(newResult.products).toHaveLength(oldResult.products?.length || 0);
    
    // Core fields should match
    const oldProduct = oldResult.products?.[0];
    const newProduct = newResult.products?.[0];
    
    if (oldProduct && newProduct) {
      expect(newProduct.id).toBe(oldProduct.id);
      expect(newProduct.name).toBe(oldProduct.name);
      expect(newProduct.price).toBe(oldProduct.price);
    }
  });

  it('should provide role-specific data access', async () => {
    const inventoryService = new ProductInventoryService();
    const marketingService = new ProductMarketingService();
    
    const [inventoryResult, marketingResult] = await Promise.all([
      inventoryService.getInventoryProducts(),
      marketingService.getMarketingProducts()
    ]);
    
    expect(inventoryResult.products[0]).toHaveProperty('stock_quantity');
    expect(marketingResult.products[0]).toHaveProperty('description');
    
    // Should access same core products
    expect(inventoryResult.products).toHaveLength(marketingResult.products.length);
  });

  it('should validate view consistency', async () => {
    const [inventoryView, marketingView, coreView] = await Promise.all([
      supabase.from('inventory_products').select('id').limit(10),
      supabase.from('marketing_products').select('id').limit(10),
      supabase.from('core_products').select('id').limit(10)
    ]);
    
    const inventoryIds = inventoryView.data?.map(p => p.id).sort();
    const marketingIds = marketingView.data?.map(p => p.id).sort();
    const coreIds = coreView.data?.map(p => p.id).sort();
    
    expect(inventoryIds).toEqual(marketingIds);
    expect(marketingIds).toEqual(coreIds);
  });
});
```

**Final Commit**: All migration tests pass + database views created + backward compatibility validated

---

## 📊 **Phase 1 Success Metrics**

### **Test Coverage Requirements**
- ✅ **Schema Contracts**: 20+ tests ensuring compile-time validation
- ✅ **Service Layer**: 39+ tests validating Direct Supabase patterns
- ✅ **Database Views**: 8+ tests ensuring view consistency
- ✅ **Migration**: 5+ tests validating backward compatibility
- ✅ **Total**: 70+ tests all passing

### **Architecture Compliance Checklist**
- ✅ **Schema Contract Management**: TypeScript compilation enforces alignment
- ✅ **Direct Supabase Patterns**: Exact field selection implemented
- ✅ **Resilient Item Processing**: Skip-on-error in all list operations
- ✅ **ValidationMonitor Integration**: Success/failure tracking in all services
- ✅ **Service Inheritance**: Clean extension pattern without duplication
- ✅ **Backward Compatibility**: Existing functionality maintained

### **Deliverables**
1. **Schemas**: 3 role-specific schemas with contracts and tests
2. **Services**: 3 service classes with inheritance and 39+ tests
3. **Database**: Role-based views with migration script
4. **Migration**: Backward compatible transition strategy
5. **Documentation**: Implementation details and validation results

This detailed breakdown ensures that Phase 1 follows the established TDD and architectural patterns while creating a solid foundation for the role-based architecture.