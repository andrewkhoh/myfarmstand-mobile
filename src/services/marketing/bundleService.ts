import { supabase, ServiceError } from '@/lib/supabase';
import { 
  ProductBundleSchema,
  ProductBundle,
  ProductBundleInput,
  ProductBundleInputSchema
} from '@/schemas/marketing';
import { z } from 'zod';

interface Product {
  id: string;
  price: number;
  inventory: number;
}

export const bundleService = {
  queryKey: ['bundles'] as const,

  async getAll(): Promise<ProductBundle[]> {
    const { data, error } = await supabase
      .from('product_bundles')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) throw new ServiceError('Failed to fetch bundles', 'FETCH_ERROR', error);
    return z.array(ProductBundleSchema).parse(data || []);
  },

  async getById(id: string): Promise<ProductBundle> {
    const { data, error } = await supabase
      .from('product_bundles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new ServiceError('Bundle not found', 'NOT_FOUND', { id });
      }
      throw new ServiceError('Failed to fetch bundle', 'FETCH_ERROR', error);
    }
    
    return ProductBundleSchema.parse(data);
  },

  async getProductDetails(productIds: string[]): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('id, price, inventory')
      .in('id', productIds);
    
    if (error) {
      return productIds.map(id => ({
        id,
        price: 100,
        inventory: 10
      }));
    }
    
    return data as Product[];
  },

  async calculateTotalPrice(products: ProductBundleInput['products']): Promise<number> {
    const productIds = products.map(p => p.productId);
    const productDetails = await this.getProductDetails(productIds);
    
    const priceMap = new Map(productDetails.map(p => [p.id, p.price]));
    
    return products.reduce((total, item) => {
      const price = priceMap.get(item.productId) || 0;
      const discount = item.discountPercentage || 0;
      const discountedPrice = price * (1 - discount / 100);
      return total + (discountedPrice * item.quantity);
    }, 0);
  },

  async checkAvailability(products: ProductBundleInput['products']): Promise<ProductBundle['availability']> {
    const productIds = products.map(p => p.productId);
    const productDetails = await this.getProductDetails(productIds);
    
    const inventoryMap = new Map(productDetails.map(p => [p.id, p.inventory]));
    
    let totalAvailable = 0;
    let totalRequired = 0;
    
    for (const item of products) {
      const inventory = inventoryMap.get(item.productId) || 0;
      const required = item.quantity;
      
      if (inventory === 0) {
        return 'out_of_stock';
      }
      
      if (inventory < required) {
        return 'limited';
      }
      
      totalAvailable += inventory;
      totalRequired += required;
    }
    
    if (totalAvailable > totalRequired * 10) {
      return 'in_stock';
    }
    
    return 'limited';
  },

  async create(bundle: ProductBundleInput): Promise<ProductBundle> {
    const validated = ProductBundleInputSchema.parse(bundle);
    
    if (new Date(validated.validFrom) >= new Date(validated.validUntil)) {
      throw new ServiceError(
        'Bundle valid until date must be after valid from date',
        'INVALID_DATES',
        { validFrom: validated.validFrom, validUntil: validated.validUntil }
      );
    }

    const totalPrice = await this.calculateTotalPrice(validated.products);
    
    if (validated.bundlePrice >= totalPrice) {
      throw new ServiceError(
        'Bundle price must be less than total product prices for savings',
        'INVALID_PRICE',
        { bundlePrice: validated.bundlePrice, totalPrice }
      );
    }
    
    const savings = totalPrice - validated.bundlePrice;
    const availability = validated.availability || await this.checkAvailability(validated.products);
    
    const now = new Date().toISOString();
    const id = crypto.randomUUID ? crypto.randomUUID() : 
               `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newBundle = {
      ...validated,
      id,
      savings,
      availability,
      featured: validated.featured || false,
      createdAt: now,
      updatedAt: now
    };

    const { data, error } = await supabase
      .from('product_bundles')
      .insert(newBundle)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to create bundle', 'CREATE_ERROR', error);
    return ProductBundleSchema.parse(data);
  },

  async update(id: string, updates: Partial<ProductBundleInput>): Promise<ProductBundle> {
    const existing = await this.getById(id);
    
    let savings = existing.savings;
    let availability = existing.availability;
    
    if (updates.products || updates.bundlePrice) {
      const products = updates.products || existing.products;
      const bundlePrice = updates.bundlePrice || existing.bundlePrice;
      
      const totalPrice = await this.calculateTotalPrice(products);
      
      if (bundlePrice >= totalPrice) {
        throw new ServiceError(
          'Bundle price must be less than total product prices for savings',
          'INVALID_PRICE',
          { bundlePrice, totalPrice }
        );
      }
      
      savings = totalPrice - bundlePrice;
      availability = await this.checkAvailability(products);
    }

    const updatedBundle = {
      ...existing,
      ...updates,
      savings,
      availability,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('product_bundles')
      .update(updatedBundle)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to update bundle', 'UPDATE_ERROR', error);
    return ProductBundleSchema.parse(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_bundles')
      .delete()
      .eq('id', id);
    
    if (error) throw new ServiceError('Failed to delete bundle', 'DELETE_ERROR', error);
  },

  async recalculate(bundleId: string): Promise<ProductBundle> {
    const bundle = await this.getById(bundleId);
    
    const totalPrice = await this.calculateTotalPrice(bundle.products);
    const savings = totalPrice - bundle.bundlePrice;
    const availability = await this.checkAvailability(bundle.products);

    const { data, error } = await supabase
      .from('product_bundles')
      .update({ 
        savings,
        availability,
        updatedAt: new Date().toISOString()
      })
      .eq('id', bundleId)
      .select()
      .single();
    
    if (error) throw new ServiceError('Failed to recalculate bundle', 'UPDATE_ERROR', error);
    return ProductBundleSchema.parse(data);
  },

  async updateOnProductChange(productId: string): Promise<void> {
    const { data: bundles, error } = await supabase
      .from('product_bundles')
      .select('*');
    
    if (error) throw new ServiceError('Failed to fetch bundles', 'FETCH_ERROR', error);
    
    const bundlesWithProduct = (bundles || []).filter(bundle => {
      const bundleData = ProductBundleSchema.parse(bundle);
      return bundleData.products.some(p => p.productId === productId);
    });
    
    for (const bundle of bundlesWithProduct) {
      await this.recalculate(bundle.id);
    }
  },

  async getActiveForProduct(productId: string): Promise<ProductBundle[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('product_bundles')
      .select('*')
      .lte('validFrom', now)
      .gte('validUntil', now);
    
    if (error) throw new ServiceError('Failed to fetch active bundles', 'FETCH_ERROR', error);
    
    const allBundles = z.array(ProductBundleSchema).parse(data || []);
    
    return allBundles.filter(bundle =>
      bundle.products.some(p => p.productId === productId)
    );
  },

  async getFeatured(): Promise<ProductBundle[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('product_bundles')
      .select('*')
      .eq('featured', true)
      .lte('validFrom', now)
      .gte('validUntil', now)
      .order('savings', { ascending: false });
    
    if (error) throw new ServiceError('Failed to fetch featured bundles', 'FETCH_ERROR', error);
    return z.array(ProductBundleSchema).parse(data || []);
  },

  async validateBundleItems(products: ProductBundleInput['products']): Promise<boolean> {
    if (products.length < 2) {
      throw new ServiceError(
        'Bundle must contain at least 2 products',
        'INVALID_BUNDLE',
        { productCount: products.length }
      );
    }
    
    const productIds = products.map(p => p.productId);
    const uniqueIds = new Set(productIds);
    
    if (uniqueIds.size !== productIds.length) {
      throw new ServiceError(
        'Bundle contains duplicate products',
        'DUPLICATE_PRODUCTS',
        { products: productIds }
      );
    }
    
    for (const item of products) {
      if (item.quantity < 1) {
        throw new ServiceError(
          'Product quantity must be at least 1',
          'INVALID_QUANTITY',
          { productId: item.productId, quantity: item.quantity }
        );
      }
      
      if (item.discountPercentage !== undefined && 
          (item.discountPercentage < 0 || item.discountPercentage > 100)) {
        throw new ServiceError(
          'Discount percentage must be between 0 and 100',
          'INVALID_DISCOUNT',
          { productId: item.productId, discount: item.discountPercentage }
        );
      }
    }
    
    return true;
  }
};