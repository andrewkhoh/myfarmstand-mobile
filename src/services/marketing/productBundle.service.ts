import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { 
  ProductBundle, 
  BundleType,
  productBundleTransform,
  productBundleSchema 
} from '@/schemas/marketing';
import { 
  ServiceError, 
  ValidationError, 
  NotFoundError,
  DatabaseError
} from './errors/ServiceError';

export interface BundleFilters {
  type?: BundleType;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
}

export interface PricingCalculation {
  basePrice: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  finalPrice: number;
  savings: number;
  savingsPercentage: number;
}

export class ProductBundleService {
  private mockData: Map<string, ProductBundle> = new Map();
  private productPrices: Map<string, number> = new Map();

  constructor() {
    // Initialize will be done by tests
  }

  async createBundle(data: unknown): Promise<ProductBundle> {
    try {
      // Pre-process data to auto-calculate final price if needed
      const processedData = data as any;
      if (processedData.pricing && 
          (processedData.pricing.finalPrice === 0 || !processedData.pricing.finalPrice)) {
        const { discountType, discountValue, basePrice } = processedData.pricing;
        if (discountType === 'percentage') {
          processedData.pricing.finalPrice = basePrice * (1 - discountValue / 100);
        } else {
          processedData.pricing.finalPrice = Math.max(0.01, basePrice - discountValue);
        }
        processedData.pricing.finalPrice = Math.round(processedData.pricing.finalPrice * 100) / 100;
      }

      const validated = productBundleTransform.parse({
        ...processedData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Validate products exist
      for (const product of validated.products) {
        if (!this.productPrices.has(product.productId)) {
          throw new ValidationError(
            `Product ${product.productId} does not exist`
          );
        }
      }

      // Validate pricing logic
      const calculatedBase = await this.calculateBasePrice(validated.products);
      if (validated.pricing.basePrice > calculatedBase) {
        throw new ValidationError(
          'Bundle price cannot exceed sum of individual product prices'
        );
      }

      this.mockData.set(validated.id, validated);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Bundle validation failed', error.errors);
      }
      throw error;
    }
  }

  async getBundle(bundleId: string): Promise<ProductBundle> {
    const bundle = this.mockData.get(bundleId);
    if (!bundle) {
      throw new NotFoundError('ProductBundle', bundleId);
    }
    return bundle;
  }

  async updateBundle(
    bundleId: string,
    updates: Partial<ProductBundle>
  ): Promise<ProductBundle> {
    const existing = await this.getBundle(bundleId);
    
    // Ensure updatedAt is always different by adding 1ms if it would be the same
    const now = new Date();
    const updatedAt = now.getTime() === existing.updatedAt.getTime() 
      ? new Date(now.getTime() + 1)
      : now;
    
    const updated = productBundleTransform.parse({
      ...existing,
      ...updates,
      updatedAt
    });

    this.mockData.set(bundleId, updated);
    return updated;
  }

  async deleteBundle(bundleId: string): Promise<void> {
    const exists = this.mockData.has(bundleId);
    if (!exists) {
      throw new NotFoundError('ProductBundle', bundleId);
    }
    this.mockData.delete(bundleId);
  }

  async calculatePricing(
    products: Array<{ productId: string; quantity: number }>
  ): Promise<PricingCalculation> {
    const basePrice = await this.calculateBasePrice(products);
    
    // Default discount calculation (10% for bundles)
    const discountType = 'percentage' as const;
    const discountValue = 10;
    const finalPrice = basePrice * (1 - discountValue / 100);
    const savings = basePrice - finalPrice;
    const savingsPercentage = (savings / basePrice) * 100;

    return {
      basePrice: Math.round(basePrice * 100) / 100,
      discountType,
      discountValue,
      finalPrice: Math.round(finalPrice * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsPercentage: Math.round(savingsPercentage * 10) / 10
    };
  }

  async applyDiscount(
    bundleId: string,
    discountType: 'percentage' | 'fixed',
    discountValue: number
  ): Promise<ProductBundle> {
    const bundle = await this.getBundle(bundleId);
    
    if (discountValue < 0) {
      throw new ValidationError('Discount value cannot be negative');
    }
    
    if (discountType === 'percentage' && discountValue > 100) {
      throw new ValidationError('Percentage discount cannot exceed 100%');
    }

    const basePrice = bundle.pricing.basePrice;
    let finalPrice: number;
    
    if (discountType === 'percentage') {
      finalPrice = basePrice * (1 - discountValue / 100);
    } else {
      finalPrice = basePrice - discountValue;
    }
    
    // Ensure proper rounding to 2 decimal places
    finalPrice = Math.round(finalPrice * 100) / 100;
    
    // Ensure minimum price of 0.01
    if (finalPrice <= 0) {
      finalPrice = 0.01;
    }

    return await this.updateBundle(bundleId, {
      pricing: {
        ...bundle.pricing,
        discountType,
        discountValue,
        finalPrice
      }
    });
  }

  async searchBundles(filters: BundleFilters = {}): Promise<ProductBundle[]> {
    let bundles = Array.from(this.mockData.values());

    if (filters.type) {
      bundles = bundles.filter(b => b.type === filters.type);
    }

    if (filters.isActive !== undefined) {
      bundles = bundles.filter(b => b.isActive === filters.isActive);
    }

    if (filters.minPrice !== undefined) {
      bundles = bundles.filter(b => b.pricing.finalPrice >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      bundles = bundles.filter(b => b.pricing.finalPrice <= filters.maxPrice!);
    }

    if (filters.tags && filters.tags.length > 0) {
      bundles = bundles.filter(b => 
        filters.tags!.some(tag => b.tags.includes(tag))
      );
    }

    return bundles;
  }

  async checkAvailability(bundleId: string): Promise<boolean> {
    const bundle = await this.getBundle(bundleId);
    
    if (!bundle.isActive) {
      return false;
    }

    const now = new Date();
    const { startDate, endDate, stockQuantity } = bundle.availability;

    if (startDate && now < startDate) {
      return false;
    }

    if (endDate && now > endDate) {
      return false;
    }

    if (stockQuantity !== null && stockQuantity <= 0) {
      return false;
    }

    return true;
  }

  async updateStock(bundleId: string, quantity: number): Promise<ProductBundle> {
    const bundle = await this.getBundle(bundleId);
    
    if (bundle.availability.stockQuantity === null) {
      throw new ServiceError(
        'Cannot update stock for bundle without stock tracking',
        'INVALID_OPERATION',
        400
      );
    }

    const newQuantity = bundle.availability.stockQuantity + quantity;
    
    if (newQuantity < 0) {
      throw new ServiceError(
        'Insufficient stock available',
        'INSUFFICIENT_STOCK',
        400
      );
    }

    return await this.updateBundle(bundleId, {
      availability: {
        ...bundle.availability,
        stockQuantity: newQuantity
      }
    });
  }

  async cloneBundle(bundleId: string, name: string): Promise<ProductBundle> {
    const original = await this.getBundle(bundleId);
    
    const clonedData = {
      ...original,
      id: this.generateId(),
      name,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    delete (clonedData as any).id; // Remove id so it gets generated
    
    return await this.createBundle(clonedData);
  }

  async getPopularBundles(limit: number = 10): Promise<ProductBundle[]> {
    // Mock implementation - would normally query by sales/views
    const bundles = await this.searchBundles({ isActive: true });
    return bundles.slice(0, limit);
  }

  private async calculateBasePrice(
    products: Array<{ productId: string; quantity: number }>
  ): Promise<number> {
    let total = 0;
    
    for (const product of products) {
      const price = this.productPrices.get(product.productId);
      if (!price) {
        throw new ValidationError(`Product ${product.productId} not found`);
      }
      total += price * product.quantity;
    }
    
    return total;
  }

  private generateId(): string {
    return uuidv4();
  }

  clearMockData(): void {
    this.mockData.clear();
  }

  setProductPrice(productId: string, price: number): void {
    this.productPrices.set(productId, price);
  }
}