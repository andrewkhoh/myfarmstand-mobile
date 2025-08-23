/**
 * Cart Factory - Schema-Validated Test Data
 * 
 * Creates valid cart test data that always passes schema validation.
 * Handles cart items, cart state, and various cart operations.
 */

import { z } from 'zod';
import { SchemaFactory } from './base.factory';
import { ProductFactory } from './product.factory';
import { 
  CartItemSchema, 
  CartStateSchema,
  DbCartItemSchema,
  CartSummarySchema
} from '../../schemas/cart.schema';
import type { CartItem, CartState, Product } from '../../types';

export class CartItemFactory extends SchemaFactory<CartItem, any> {
  private productFactory: ProductFactory;

  constructor() {
    super('cart-item');
    this.productFactory = new ProductFactory();
  }

  protected getSchema(): z.ZodSchema<CartItem> {
    return CartItemSchema as z.ZodSchema<CartItem>;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return DbCartItemSchema;
  }

  protected getDefaults(): CartItem {
    return {
      product: this.productFactory.create(),
      quantity: 1
    };
  }

  protected transformToDb(item: CartItem): any {
    return {
      id: this.getNextId(),
      user_id: 'user-1',
      product_id: item.product.id,
      quantity: item.quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Create a cart item with a specific product
   */
  createWithProduct(product: Product, quantity: number = 1): CartItem {
    return this.create({
      product,
      quantity
    });
  }

  /**
   * Create a cart item with maximum quantity
   */
  createMaxQuantity(product?: Product): CartItem {
    const p = product || this.productFactory.create({ stock_quantity: 10 });
    return this.create({
      product: p,
      quantity: p.stock_quantity || 10
    });
  }

  /**
   * Create a cart item for a pre-order product
   */
  createPreOrder(overrides: Partial<CartItem> = {}): CartItem {
    const product = this.productFactory.createPreOrder();
    return this.create({
      product,
      quantity: product.min_pre_order_quantity || 5,
      ...overrides
    });
  }

  /**
   * Create a cart item with low stock
   */
  createLowStock(remainingStock: number = 2): CartItem {
    const product = this.productFactory.create({ stock_quantity: remainingStock });
    return this.create({
      product,
      quantity: 1
    });
  }

  /**
   * Create multiple cart items from products
   */
  createFromProducts(products: Product[]): CartItem[] {
    return products.map(product => this.createWithProduct(product));
  }
}

export class CartStateFactory extends SchemaFactory<CartState, CartState> {
  private cartItemFactory: CartItemFactory;
  private productFactory: ProductFactory;

  constructor() {
    super('cart');
    this.cartItemFactory = new CartItemFactory();
    this.productFactory = new ProductFactory();
  }

  protected getSchema(): z.ZodSchema<CartState> {
    return CartStateSchema as z.ZodSchema<CartState>;
  }

  protected getDbSchema(): z.ZodSchema<CartState> {
    return CartStateSchema; // Same schema
  }

  protected getDefaults(): CartState {
    const items = [this.cartItemFactory.create()];
    return {
      items,
      total: this.calculateTotal(items)
    };
  }

  protected getMinimalDefaults(): Partial<CartState> {
    return {
      items: [],
      total: 0
    };
  }

  /**
   * Calculate total from cart items
   */
  private calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }

  /**
   * Create an empty cart
   */
  createEmpty(): CartState {
    return this.create({
      items: [],
      total: 0
    });
  }

  /**
   * Create a cart with specific items
   */
  createWithItems(items: CartItem[], overrides: Partial<CartState> = {}): CartState {
    const total = this.calculateTotal(items);
    return this.create({
      items,
      total,
      ...overrides
    });
  }

  /**
   * Create a cart with N items
   */
  createWithItemCount(count: number, overrides: Partial<CartState> = {}): CartState {
    const items = Array.from({ length: count }, (_, i) => 
      this.cartItemFactory.create({
        product: this.productFactory.create({
          id: `product-${i + 1}`,
          name: `Product ${i + 1}`,
          price: 10 + i
        }),
        quantity: 1
      })
    );
    
    return this.createWithItems(items, overrides);
  }

  /**
   * Create a cart with a single product
   */
  createSingleItem(product?: Product, quantity: number = 1): CartState {
    const p = product || this.productFactory.create();
    const item = this.cartItemFactory.createWithProduct(p, quantity);
    return this.createWithItems([item]);
  }

  /**
   * Create a cart with multiple quantities of the same product
   */
  createBulkOrder(product?: Product, quantity: number = 10): CartState {
    const p = product || this.productFactory.create({ stock_quantity: quantity + 10 });
    const item = this.cartItemFactory.createWithProduct(p, quantity);
    return this.createWithItems([item]);
  }

  /**
   * Create a cart with mixed product types
   */
  createMixedCart(): CartState {
    const items = [
      this.cartItemFactory.create({
        product: this.productFactory.create({ price: 9.99 }),
        quantity: 2
      }),
      this.cartItemFactory.createPreOrder(),
      this.cartItemFactory.create({
        product: this.productFactory.createOutOfStock(),
        quantity: 1
      })
    ];
    
    return this.createWithItems(items.filter(item => 
      // Filter out invalid items (out of stock, unavailable)
      item.product.is_available && 
      (item.product.stock_quantity === null || item.product.stock_quantity >= item.quantity || item.product.is_pre_order)
    ));
  }

  /**
   * Create a cart at stock limit
   */
  createAtStockLimit(): CartState {
    const product = this.productFactory.create({ stock_quantity: 5 });
    const item = this.cartItemFactory.createWithProduct(product, 5);
    return this.createWithItems([item]);
  }

  /**
   * Create a high-value cart
   */
  createHighValue(totalValue: number = 1000): CartState {
    const itemCount = 5;
    const pricePerItem = totalValue / itemCount;
    
    const items = Array.from({ length: itemCount }, (_, i) =>
      this.cartItemFactory.create({
        product: this.productFactory.create({
          id: `expensive-${i + 1}`,
          name: `Expensive Item ${i + 1}`,
          price: pricePerItem
        }),
        quantity: 1
      })
    );
    
    return this.createWithItems(items);
  }

  /**
   * Create a cart ready for checkout
   */
  createReadyForCheckout(): CartState {
    const items = [
      this.cartItemFactory.create({
        product: this.productFactory.create({
          id: 'checkout-1',
          name: 'Ready Product 1',
          price: 29.99,
          stock_quantity: 100
        }),
        quantity: 2
      }),
      this.cartItemFactory.create({
        product: this.productFactory.create({
          id: 'checkout-2',
          name: 'Ready Product 2',
          price: 19.99,
          stock_quantity: 50
        }),
        quantity: 1
      })
    ];
    
    return this.createWithItems(items);
  }
}

/**
 * Cart Summary Factory (for checkout)
 */
export class CartSummaryFactory extends SchemaFactory<any, any> {
  constructor() {
    super('cart-summary');
  }

  protected getSchema(): z.ZodSchema<any> {
    return CartSummarySchema;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return CartSummarySchema;
  }

  protected getDefaults(): any {
    const items = [
      {
        productId: 'product-1',
        productName: 'Test Product',
        price: 29.99,
        quantity: 2,
        subtotal: 59.98
      }
    ];
    
    const subtotal = 59.98;
    const taxRate = 0.08;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    
    return {
      itemCount: 2,
      subtotal,
      tax,
      total: subtotal + tax,
      items
    };
  }

  /**
   * Create summary from cart state
   */
  createFromCart(cart: CartState): any {
    const items = cart.items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity
    }));
    
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.total;
    const taxRate = 0.08;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    
    return this.create({
      itemCount,
      subtotal,
      tax,
      total: subtotal + tax,
      items
    });
  }

  /**
   * Create an empty summary
   */
  createEmpty(): any {
    return this.create({
      itemCount: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      items: []
    });
  }
}

// Export singleton instances for convenience
export const cartItemFactory = new CartItemFactory();
export const cartStateFactory = new CartStateFactory();
export const cartSummaryFactory = new CartSummaryFactory();

// Export helper functions for quick creation
export const createCartItem = (overrides?: Partial<CartItem>) => cartItemFactory.create(overrides);
export const createCartState = (overrides?: Partial<CartState>) => cartStateFactory.create(overrides);
export const createCartSummary = (overrides?: any) => cartSummaryFactory.create(overrides);