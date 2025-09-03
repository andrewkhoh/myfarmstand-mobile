import { 
  productBundleSchema, 
  productBundleTransform,
  calculateBundlePricing
} from '../productBundle.schema';

describe('ProductBundle Schema', () => {
  describe('Basic Validation', () => {
    it('should validate a complete product bundle', () => {
      const validBundle = {
        id: 'bundle-001',
        name: 'Premium Bundle',
        description: 'Complete premium package',
        productIds: ['prod-001', 'prod-002', 'prod-003'],
        pricing: {
          basePrice: 299.99,
          discountType: 'percentage',
          discountValue: 20,
          finalPrice: 239.99,
          savingsAmount: 60,
          savingsPercentage: 20,
          currency: 'USD',
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31'),
          minQuantity: 1,
          maxQuantity: 10
        },
        availability: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          quantity: 100,
          isActive: true
        },
        marketingContent: {
          headline: 'Save 20% with our Premium Bundle',
          features: ['Feature 1', 'Feature 2', 'Feature 3'],
          benefits: ['Benefit 1', 'Benefit 2'],
          targetAudience: 'enterprise'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowState: 'published'
      };

      const result = productBundleSchema.safeParse(validBundle);
      expect(result.success).toBe(true);
    });

    it('should require at least 2 products in bundle', () => {
      const singleProductBundle = {
        id: 'bundle-001',
        name: 'Bundle',
        description: 'Description',
        productIds: ['prod-001'],
        pricing: {
          basePrice: 100,
          discountType: 'fixed',
          discountValue: 10,
          finalPrice: 90,
          savingsAmount: 10,
          savingsPercentage: 10,
          currency: 'USD'
        },
        availability: {
          isActive: true
        },
        marketingContent: {
          headline: 'Bundle',
          features: [],
          benefits: [],
          targetAudience: 'b2b'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowState: 'draft'
      };

      const result = productBundleSchema.safeParse(singleProductBundle);
      expect(result.success).toBe(false);
    });

    it('should validate pricing discount types', () => {
      const invalidDiscountType = {
        id: 'bundle-001',
        name: 'Bundle',
        description: 'Description',
        productIds: ['prod-001', 'prod-002'],
        pricing: {
          basePrice: 100,
          discountType: 'invalid-type',
          discountValue: 10,
          finalPrice: 90,
          savingsAmount: 10,
          savingsPercentage: 10,
          currency: 'USD'
        },
        availability: {
          isActive: true
        },
        marketingContent: {
          headline: 'Bundle',
          features: [],
          benefits: [],
          targetAudience: 'b2b'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowState: 'draft'
      };

      const result = productBundleSchema.safeParse(invalidDiscountType);
      expect(result.success).toBe(false);
    });

    it('should validate percentage discount range', () => {
      const invalidPercentage = {
        id: 'bundle-001',
        name: 'Bundle',
        description: 'Description',
        productIds: ['prod-001', 'prod-002'],
        pricing: {
          basePrice: 100,
          discountType: 'percentage',
          discountValue: 150,
          finalPrice: -50,
          savingsAmount: 150,
          savingsPercentage: 150,
          currency: 'USD'
        },
        availability: {
          isActive: true
        },
        marketingContent: {
          headline: 'Bundle',
          features: [],
          benefits: [],
          targetAudience: 'b2b'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowState: 'draft'
      };

      const result = productBundleSchema.safeParse(invalidPercentage);
      expect(result.success).toBe(false);
    });

    it('should validate final price is not negative', () => {
      const negativePrice = {
        id: 'bundle-001',
        name: 'Bundle',
        description: 'Description',
        productIds: ['prod-001', 'prod-002'],
        pricing: {
          basePrice: 100,
          discountType: 'fixed',
          discountValue: 150,
          finalPrice: -50,
          savingsAmount: 150,
          savingsPercentage: 150,
          currency: 'USD'
        },
        availability: {
          isActive: true
        },
        marketingContent: {
          headline: 'Bundle',
          features: [],
          benefits: [],
          targetAudience: 'b2b'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowState: 'draft'
      };

      const result = productBundleSchema.safeParse(negativePrice);
      expect(result.success).toBe(false);
    });

    it('should validate quantity constraints', () => {
      const invalidQuantity = {
        id: 'bundle-001',
        name: 'Bundle',
        description: 'Description',
        productIds: ['prod-001', 'prod-002'],
        pricing: {
          basePrice: 100,
          discountType: 'fixed',
          discountValue: 10,
          finalPrice: 90,
          savingsAmount: 10,
          savingsPercentage: 10,
          currency: 'USD',
          minQuantity: 10,
          maxQuantity: 5
        },
        availability: {
          isActive: true
        },
        marketingContent: {
          headline: 'Bundle',
          features: [],
          benefits: [],
          targetAudience: 'b2b'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        workflowState: 'draft'
      };

      const result = productBundleSchema.safeParse(invalidQuantity);
      expect(result.success).toBe(false);
    });
  });

  describe('Transform Schema', () => {
    it('should transform database data correctly', () => {
      const dbData = {
        id: 'bundle-001',
        name: 'Bundle',
        description: 'Description',
        productIds: ['prod-001', 'prod-002'],
        pricing: {
          basePrice: 100,
          discountType: 'percentage',
          discountValue: 20,
          finalPrice: 80,
          savingsAmount: 20,
          savingsPercentage: 20,
          currency: 'USD',
          validFrom: '2024-01-01T00:00:00Z',
          validUntil: '2024-12-31T00:00:00Z'
        },
        availability: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T00:00:00Z',
          quantity: 100,
          isActive: true
        },
        marketingContent: {
          headline: 'Bundle',
          features: null,
          benefits: null,
          targetAudience: 'b2b'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        workflowState: 'draft'
      };

      const result = productBundleTransform.safeParse(dbData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pricing.validFrom).toBeInstanceOf(Date);
        expect(result.data.pricing.validUntil).toBeInstanceOf(Date);
        expect(result.data.availability.startDate).toBeInstanceOf(Date);
        expect(result.data.availability.endDate).toBeInstanceOf(Date);
        expect(result.data.marketingContent.features).toEqual([]);
        expect(result.data.marketingContent.benefits).toEqual([]);
      }
    });

    it('should handle null arrays with defaults', () => {
      const dbData = {
        id: 'bundle-001',
        name: 'Bundle',
        description: 'Description',
        productIds: null,
        pricing: {
          basePrice: 100,
          discountType: 'fixed',
          discountValue: 10,
          finalPrice: 90,
          savingsAmount: 10,
          savingsPercentage: 10,
          currency: 'USD'
        },
        availability: {
          isActive: true
        },
        marketingContent: {
          headline: 'Bundle',
          features: null,
          benefits: null,
          targetAudience: 'b2b'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        workflowState: 'draft'
      };

      const result = productBundleTransform.safeParse(dbData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.productIds).toEqual([]);
        expect(result.data.marketingContent.features).toEqual([]);
        expect(result.data.marketingContent.benefits).toEqual([]);
      }
    });
  });

  describe('Pricing Calculations', () => {
    it('should calculate percentage discount correctly', () => {
      const pricing = calculateBundlePricing(
        100,
        'percentage',
        20
      );

      expect(pricing.finalPrice).toBe(80);
      expect(pricing.savingsAmount).toBe(20);
      expect(pricing.savingsPercentage).toBe(20);
    });

    it('should calculate fixed discount correctly', () => {
      const pricing = calculateBundlePricing(
        100,
        'fixed',
        25
      );

      expect(pricing.finalPrice).toBe(75);
      expect(pricing.savingsAmount).toBe(25);
      expect(pricing.savingsPercentage).toBe(25);
    });

    it('should calculate tiered discount correctly', () => {
      const pricing = calculateBundlePricing(
        500,
        'tiered',
        15,
        3
      );

      expect(pricing.finalPrice).toBe(425);
      expect(pricing.savingsAmount).toBe(75);
      expect(pricing.savingsPercentage).toBe(15);
    });

    it('should handle edge case of 100% discount', () => {
      const pricing = calculateBundlePricing(
        100,
        'percentage',
        100
      );

      expect(pricing.finalPrice).toBe(0);
      expect(pricing.savingsAmount).toBe(100);
      expect(pricing.savingsPercentage).toBe(100);
    });

    it('should handle zero base price', () => {
      const pricing = calculateBundlePricing(
        0,
        'percentage',
        20
      );

      expect(pricing.finalPrice).toBe(0);
      expect(pricing.savingsAmount).toBe(0);
      expect(pricing.savingsPercentage).toBe(0);
    });

    it('should prevent negative final price with fixed discount', () => {
      const pricing = calculateBundlePricing(
        100,
        'fixed',
        150
      );

      expect(pricing.finalPrice).toBe(0);
      expect(pricing.savingsAmount).toBe(100);
      expect(pricing.savingsPercentage).toBe(100);
    });

    it('should calculate tiered discount with quantity thresholds', () => {
      const pricing = calculateBundlePricing(
        1000,
        'tiered',
        25,
        5
      );

      expect(pricing.finalPrice).toBe(750);
      expect(pricing.savingsAmount).toBe(250);
      expect(pricing.savingsPercentage).toBe(25);
    });

    it('should apply minimum quantity for tiered discount', () => {
      const pricing = calculateBundlePricing(
        1000,
        'tiered',
        25,
        1
      );

      expect(pricing.finalPrice).toBe(1000);
      expect(pricing.savingsAmount).toBe(0);
      expect(pricing.savingsPercentage).toBe(0);
    });
  });
});