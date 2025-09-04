import { ProductBundleService, BundleFilters } from '../productBundle.service';
import { ProductBundle, BundleType } from '@/schemas/marketing';
import { ServiceError, NotFoundError, ValidationError } from '../errors/ServiceError';
import { v4 as uuidv4 } from 'uuid';

describe('ProductBundleService', () => {
  let service: ProductBundleService;
  // Fixed test UUIDs for consistency
  const prodId1 = '11111111-1111-1111-1111-111111111111';
  const prodId2 = '22222222-2222-2222-2222-222222222222';
  const prodId3 = '33333333-3333-3333-3333-333333333333';
  const prodId4 = '44444444-4444-4444-4444-444444444444';
  
  beforeEach(() => {
    service = new ProductBundleService();
    // Set up test product prices with fixed UUIDs
    service.setProductPrice(prodId1, 99.99);
    service.setProductPrice(prodId2, 49.99);
    service.setProductPrice(prodId3, 29.99);
    service.setProductPrice(prodId4, 19.99);
  });

  afterEach(() => {
    service.clearMockData();
  });

  const createMockBundle = (overrides: Partial<ProductBundle> = {}): Partial<ProductBundle> => {
    return {
      name: 'Test Bundle',
      description: 'Test bundle description',
      type: 'fixed' as BundleType,
      products: [
        { productId: prodId1, quantity: 1, isRequired: true },
        { productId: prodId2, quantity: 1, isRequired: true }
      ],
      pricing: {
        basePrice: 149.98,
        discountType: 'percentage',
        discountValue: 10,
        finalPrice: 134.98
      },
      availability: {
        startDate: null,
        endDate: null,
        stockQuantity: null,
        maxPerCustomer: null
      },
      tags: ['test'],
      isActive: true,
      ...overrides
    };
  };

  describe('createBundle', () => {
    it('should create a new bundle with valid data', async () => {
      const bundleData = createMockBundle();
      const result = await service.createBundle(bundleData);
      
      expect(result).toMatchObject({
        name: 'Test Bundle',
        type: 'fixed',
        isActive: true
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should validate minimum products requirement', async () => {
      const invalidBundle = createMockBundle({
        products: [{ productId: 'prod-1', quantity: 1, isRequired: true }]
      });
      
      await expect(service.createBundle(invalidBundle)).rejects.toThrow(ValidationError);
    });

    it('should validate product existence', async () => {
      const invalidBundle = createMockBundle({
        products: [
          { productId: 'non-existent', quantity: 1, isRequired: true },
          { productId: 'prod-2', quantity: 1, isRequired: true }
        ]
      });
      
      await expect(service.createBundle(invalidBundle)).rejects.toThrow(ValidationError);
    });

    it('should validate bundle price does not exceed sum of products', async () => {
      const overpriced = createMockBundle({
        pricing: {
          basePrice: 200,
          discountType: 'percentage',
          discountValue: 10,
          finalPrice: 180
        }
      });
      
      await expect(service.createBundle(overpriced)).rejects.toThrow(
        'Bundle price cannot exceed sum of individual product prices'
      );
    });

    it('should auto-calculate final price based on discount', async () => {
      const bundleData = createMockBundle({
        pricing: {
          basePrice: 100,
          discountType: 'percentage',
          discountValue: 20,
          finalPrice: 0 // Should be recalculated
        }
      });
      
      const result = await service.createBundle(bundleData);
      expect(result.pricing.finalPrice).toBe(80);
    });
  });

  describe('getBundle', () => {
    it('should retrieve existing bundle', async () => {
      const created = await service.createBundle(createMockBundle());
      const retrieved = await service.getBundle(created.id);
      
      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundError for non-existent bundle', async () => {
      await expect(service.getBundle('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateBundle', () => {
    it('should update bundle properties', async () => {
      const bundle = await service.createBundle(createMockBundle());
      const updated = await service.updateBundle(bundle.id, {
        name: 'Updated Bundle',
        isActive: false
      });
      
      expect(updated.name).toBe('Updated Bundle');
      expect(updated.isActive).toBe(false);
      expect(updated.updatedAt).not.toEqual(bundle.updatedAt);
    });

    it('should preserve non-updated fields', async () => {
      const bundle = await service.createBundle(createMockBundle());
      const updated = await service.updateBundle(bundle.id, {
        name: 'Updated Name'
      });
      
      expect(updated.description).toBe(bundle.description);
      expect(updated.type).toBe(bundle.type);
      expect(updated.products).toEqual(bundle.products);
    });
  });

  describe('deleteBundle', () => {
    it('should delete existing bundle', async () => {
      const bundle = await service.createBundle(createMockBundle());
      await service.deleteBundle(bundle.id);
      
      await expect(service.getBundle(bundle.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when deleting non-existent bundle', async () => {
      await expect(service.deleteBundle('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('calculatePricing', () => {
    it('should calculate pricing for given products', async () => {
      const products = [
        { productId: prodId1, quantity: 1 },
        { productId: prodId2, quantity: 2 }
      ];
      
      const pricing = await service.calculatePricing(products);
      
      expect(pricing.basePrice).toBe(199.97); // 99.99 + 49.99*2
      expect(pricing.discountType).toBe('percentage');
      expect(pricing.discountValue).toBe(10);
      expect(pricing.finalPrice).toBe(179.97);
      expect(pricing.savings).toBe(20);
      expect(pricing.savingsPercentage).toBe(10);
    });

    it('should handle products with different quantities', async () => {
      const products = [
        { productId: prodId1, quantity: 2 },
        { productId: prodId3, quantity: 3 }
      ];
      
      const pricing = await service.calculatePricing(products);
      
      expect(pricing.basePrice).toBe(289.95); // 99.99*2 + 29.99*3
    });

    it('should throw error for non-existent products', async () => {
      const products = [
        { productId: 'non-existent', quantity: 1 }
      ];
      
      await expect(service.calculatePricing(products)).rejects.toThrow(ValidationError);
    });
  });

  describe('applyDiscount', () => {
    it('should apply percentage discount', async () => {
      const bundle = await service.createBundle(createMockBundle());
      const discounted = await service.applyDiscount(bundle.id, 'percentage', 25);
      
      expect(discounted.pricing.discountType).toBe('percentage');
      expect(discounted.pricing.discountValue).toBe(25);
      expect(discounted.pricing.finalPrice).toBeCloseTo(112.49, 1); // 149.98 * 0.75
    });

    it('should apply fixed discount', async () => {
      const bundle = await service.createBundle(createMockBundle());
      const discounted = await service.applyDiscount(bundle.id, 'fixed', 50);
      
      expect(discounted.pricing.discountType).toBe('fixed');
      expect(discounted.pricing.discountValue).toBe(50);
      expect(discounted.pricing.finalPrice).toBe(99.98); // 149.98 - 50
    });

    it('should not allow negative discount values', async () => {
      const bundle = await service.createBundle(createMockBundle());
      
      await expect(
        service.applyDiscount(bundle.id, 'percentage', -10)
      ).rejects.toThrow('Discount value cannot be negative');
    });

    it('should not allow percentage discount over 100%', async () => {
      const bundle = await service.createBundle(createMockBundle());
      
      await expect(
        service.applyDiscount(bundle.id, 'percentage', 101)
      ).rejects.toThrow('Percentage discount cannot exceed 100%');
    });

    it('should handle fixed discount greater than base price', async () => {
      const bundle = await service.createBundle(createMockBundle());
      const discounted = await service.applyDiscount(bundle.id, 'fixed', 200);
      
      expect(discounted.pricing.finalPrice).toBe(0.01); // Minimum price to satisfy schema
    });
  });

  describe('searchBundles', () => {
    beforeEach(async () => {
      await service.createBundle(createMockBundle({
        name: 'Bundle 1',
        type: 'fixed',
        isActive: true,
        tags: ['popular', 'sale']
      }));
      
      await service.createBundle(createMockBundle({
        name: 'Bundle 2',
        type: 'flexible',
        isActive: false,
        tags: ['new']
      }));
      
      await service.createBundle(createMockBundle({
        name: 'Bundle 3',
        type: 'bogo',
        isActive: true,
        tags: ['popular'],
        pricing: {
          basePrice: 140,  // Must be less than or equal to sum of products (149.98)
          discountType: 'percentage',
          discountValue: 20,
          finalPrice: 112
        }
      }));
    });

    it('should filter by bundle type', async () => {
      const results = await service.searchBundles({ type: 'fixed' });
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('fixed');
    });

    it('should filter by active status', async () => {
      const results = await service.searchBundles({ isActive: true });
      
      expect(results).toHaveLength(2);
      expect(results.every(b => b.isActive)).toBe(true);
    });

    it('should filter by price range', async () => {
      const results = await service.searchBundles({ minPrice: 100, maxPrice: 120 });
      
      expect(results).toHaveLength(1);
      expect(results[0].pricing.finalPrice).toBe(112);  // Bundle 3 with updated pricing
    });

    it('should filter by tags', async () => {
      const results = await service.searchBundles({ tags: ['popular'] });
      
      expect(results).toHaveLength(2);
      expect(results.every(b => b.tags.includes('popular'))).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const results = await service.searchBundles({
        isActive: true,
        tags: ['sale']  // Only Bundle 1 has 'sale' tag
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bundle 1');
    });

    it('should return all bundles when no filters provided', async () => {
      const results = await service.searchBundles();
      
      expect(results).toHaveLength(3);
    });
  });

  describe('checkAvailability', () => {
    it('should return true for active bundle', async () => {
      const bundle = await service.createBundle(createMockBundle());
      
      const available = await service.checkAvailability(bundle.id);
      
      expect(available).toBe(true);
    });

    it('should return false for inactive bundle', async () => {
      const bundle = await service.createBundle(createMockBundle({ isActive: false }));
      
      const available = await service.checkAvailability(bundle.id);
      
      expect(available).toBe(false);
    });

    it('should check start date constraint', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const bundle = await service.createBundle(createMockBundle({
        availability: {
          startDate: futureDate,
          endDate: null,
          stockQuantity: null,
          maxPerCustomer: null
        }
      }));
      
      const available = await service.checkAvailability(bundle.id);
      
      expect(available).toBe(false);
    });

    it('should check end date constraint', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const bundle = await service.createBundle(createMockBundle({
        availability: {
          startDate: null,
          endDate: pastDate,
          stockQuantity: null,
          maxPerCustomer: null
        }
      }));
      
      const available = await service.checkAvailability(bundle.id);
      
      expect(available).toBe(false);
    });

    it('should check stock availability', async () => {
      const bundle = await service.createBundle(createMockBundle({
        availability: {
          startDate: null,
          endDate: null,
          stockQuantity: 0,
          maxPerCustomer: null
        }
      }));
      
      const available = await service.checkAvailability(bundle.id);
      
      expect(available).toBe(false);
    });
  });

  describe('updateStock', () => {
    it('should increase stock quantity', async () => {
      const bundle = await service.createBundle(createMockBundle({
        availability: {
          startDate: null,
          endDate: null,
          stockQuantity: 10,
          maxPerCustomer: null
        }
      }));
      
      const updated = await service.updateStock(bundle.id, 5);
      
      expect(updated.availability.stockQuantity).toBe(15);
    });

    it('should decrease stock quantity', async () => {
      const bundle = await service.createBundle(createMockBundle({
        availability: {
          startDate: null,
          endDate: null,
          stockQuantity: 10,
          maxPerCustomer: null
        }
      }));
      
      const updated = await service.updateStock(bundle.id, -3);
      
      expect(updated.availability.stockQuantity).toBe(7);
    });

    it('should throw error for insufficient stock', async () => {
      const bundle = await service.createBundle(createMockBundle({
        availability: {
          startDate: null,
          endDate: null,
          stockQuantity: 2,
          maxPerCustomer: null
        }
      }));
      
      await expect(
        service.updateStock(bundle.id, -5)
      ).rejects.toThrow('Insufficient stock available');
    });

    it('should throw error for bundles without stock tracking', async () => {
      const bundle = await service.createBundle(createMockBundle());
      
      await expect(
        service.updateStock(bundle.id, 5)
      ).rejects.toThrow('Cannot update stock for bundle without stock tracking');
    });
  });

  describe('cloneBundle', () => {
    it('should create a copy with new name', async () => {
      const original = await service.createBundle(createMockBundle());
      const cloned = await service.cloneBundle(original.id, 'Cloned Bundle');
      
      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe('Cloned Bundle');
      expect(cloned.products).toEqual(original.products);
      expect(cloned.pricing).toEqual(original.pricing);
    });

    it('should generate new timestamps', async () => {
      const original = await service.createBundle(createMockBundle());
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const cloned = await service.cloneBundle(original.id, 'Cloned Bundle');
      
      expect(cloned.createdAt).not.toEqual(original.createdAt);
      expect(cloned.updatedAt).not.toEqual(original.updatedAt);
    });
  });

  describe('getPopularBundles', () => {
    it('should return limited number of active bundles', async () => {
      for (let i = 0; i < 15; i++) {
        await service.createBundle(createMockBundle({
          name: `Bundle ${i}`,
          isActive: i % 2 === 0
        }));
      }
      
      const popular = await service.getPopularBundles(5);
      
      expect(popular).toHaveLength(5);
      expect(popular.every(b => b.isActive)).toBe(true);
    });

    it('should use default limit of 10', async () => {
      for (let i = 0; i < 15; i++) {
        await service.createBundle(createMockBundle({
          name: `Bundle ${i}`,
          isActive: true
        }));
      }
      
      const popular = await service.getPopularBundles();
      
      expect(popular).toHaveLength(10);
    });
  });
});