/**
 * Order Factory - Schema-Validated Test Data
 * 
 * Creates valid order test data that always passes schema validation.
 * Handles complex order structures including items, customer info, and various statuses.
 */

import { z } from 'zod';
import { SchemaFactory } from './base.factory';
import { 
  OrderSchema, 
  OrderItemSchema, 
  CustomerInfoSchema,
  DbOrderItemSchema,
  OrderStatusSchema,
  FulfillmentTypeSchema,
  PaymentMethodSchema,
  PaymentStatusSchema
} from '../../schemas/order.schema';
import type { Order, OrderItem, CustomerInfo } from '../../types';

export class OrderFactory extends SchemaFactory<Order, any> {
  constructor() {
    super('order');
  }

  protected getSchema(): z.ZodSchema<Order> {
    return OrderSchema as z.ZodSchema<Order>;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return OrderSchema; // Orders use same schema for DB
  }

  protected getDefaults(): Order {
    const now = new Date().toISOString();
    return {
      id: this.getNextId(),
      user_id: 'user-1',
      customer_name: 'John Doe',
      customer_email: 'john.doe@example.com',
      customer_phone: '+1234567890',
      order_items: [],
      subtotal: 29.97,
      tax_amount: 2.40,
      total_amount: 32.37,
      fulfillment_type: 'pickup',
      status: 'pending',
      payment_method: 'online',
      payment_status: 'paid',
      notes: null,
      pickup_date: '2025-08-25',
      pickup_time: '14:00',
      delivery_address: null,
      special_instructions: null,
      created_at: now,
      updated_at: now,
      qr_code_data: null
    };
  }

  protected getMinimalDefaults(): Partial<Order> {
    return {
      id: this.getNextId(),
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '+1234567890',
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      fulfillment_type: 'pickup',
      status: 'pending',
      payment_method: null,
      payment_status: null,
      created_at: null,
      updated_at: null
    };
  }

  /**
   * Create an order with items
   */
  createWithItems(items: OrderItem[], overrides: Partial<Order> = {}): Order {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxRate = 0.08; // 8% tax rate
    const tax_amount = Math.round(subtotal * taxRate * 100) / 100;
    const total_amount = subtotal + tax_amount;

    return this.create({
      order_items: items,
      subtotal,
      tax_amount,
      total_amount,
      ...overrides
    });
  }

  /**
   * Create a confirmed order
   */
  createConfirmed(overrides: Partial<Order> = {}): Order {
    return this.create({
      status: 'confirmed',
      payment_status: 'paid',
      ...overrides
    });
  }

  /**
   * Create a ready for pickup order
   */
  createReady(overrides: Partial<Order> = {}): Order {
    return this.create({
      status: 'ready',
      payment_status: 'paid',
      qr_code_data: `QR-${this.getNextId()}`,
      ...overrides
    });
  }

  /**
   * Create a completed order
   */
  createCompleted(overrides: Partial<Order> = {}): Order {
    return this.create({
      status: 'completed',
      payment_status: 'paid',
      ...overrides
    });
  }

  /**
   * Create a cancelled order
   */
  createCancelled(overrides: Partial<Order> = {}): Order {
    return this.create({
      status: 'cancelled',
      payment_status: 'failed',
      ...overrides
    });
  }

  /**
   * Create a delivery order
   */
  createDelivery(overrides: Partial<Order> = {}): Order {
    return this.create({
      fulfillment_type: 'delivery',
      delivery_address: '123 Main St, City, State 12345',
      delivery_date: '2025-08-25',
      delivery_time: '16:00',
      pickup_date: null,
      pickup_time: null,
      ...overrides
    });
  }

  /**
   * Create an order with legacy field format
   */
  createWithLegacyFields(overrides: Partial<Order> = {}): Order {
    const base = this.create(overrides);
    return {
      ...base,
      // Add legacy field mappings
      customerId: base.user_id || undefined,
      customerInfo: {
        name: base.customer_name,
        email: base.customer_email,
        phone: base.customer_phone,
        address: base.delivery_address || undefined
      },
      items: base.order_items,
      tax: base.tax_amount,
      total: base.total_amount,
      fulfillmentType: base.fulfillment_type as any,
      paymentMethod: base.payment_method as any,
      paymentStatus: base.payment_status as any,
      pickupDate: base.pickup_date || undefined,
      pickupTime: base.pickup_time || undefined,
      deliveryAddress: base.delivery_address || undefined,
      specialInstructions: base.special_instructions || undefined,
      createdAt: base.created_at || undefined,
      updatedAt: base.updated_at || undefined
    };
  }

  /**
   * Create an order pending payment
   */
  createPendingPayment(overrides: Partial<Order> = {}): Order {
    return this.create({
      payment_status: 'pending',
      payment_method: 'cash_on_pickup',
      status: 'pending',
      ...overrides
    });
  }

  /**
   * Create multiple orders with sequential dates
   */
  createSequentialOrders(count: number, startDate: Date = new Date()): Order[] {
    const orders: Order[] = [];
    const dayInMs = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < count; i++) {
      const orderDate = new Date(startDate.getTime() - (i * dayInMs));
      orders.push(this.create({
        created_at: orderDate.toISOString(),
        updated_at: orderDate.toISOString(),
        pickup_date: new Date(orderDate.getTime() + dayInMs).toISOString().split('T')[0]
      }));
    }
    
    return orders;
  }

  /**
   * Create an order with all optional fields populated
   */
  createComplete(overrides: Partial<Order> = {}): Order {
    return this.create({
      notes: 'Special order for VIP customer',
      special_instructions: 'Please call when ready',
      qr_code_data: `QR-${this.getNextId()}`,
      delivery_address: '456 Oak Ave, Town, State 54321',
      delivery_date: '2025-08-26',
      delivery_time: '18:00',
      ...overrides
    });
  }
}

/**
 * Order Item Factory
 */
export class OrderItemFactory extends SchemaFactory<OrderItem, any> {
  constructor() {
    super('order-item');
  }

  protected getSchema(): z.ZodSchema<OrderItem> {
    return OrderItemSchema as z.ZodSchema<OrderItem>;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return DbOrderItemSchema;
  }

  protected getDefaults(): OrderItem {
    return {
      productId: 'product-1',
      productName: 'Test Product',
      price: 9.99,
      quantity: 3,
      subtotal: 29.97
    };
  }

  protected transformToDb(item: OrderItem): any {
    return {
      id: this.getNextId(),
      product_id: item.productId,
      product_name: item.productName,
      unit_price: item.price,
      quantity: item.quantity,
      total_price: item.subtotal
    };
  }

  /**
   * Create an item with calculated subtotal
   */
  createWithCalculation(overrides: Partial<OrderItem> = {}): OrderItem {
    const base = { ...this.getDefaults(), ...overrides };
    const subtotal = base.price * base.quantity;
    return this.create({ ...base, subtotal });
  }

  /**
   * Create items for a complete order
   */
  createOrderItems(products: Array<{ id: string; name: string; price: number; quantity: number }>): OrderItem[] {
    return products.map(p => this.createWithCalculation({
      productId: p.id,
      productName: p.name,
      price: p.price,
      quantity: p.quantity
    }));
  }
}

/**
 * Customer Info Factory
 */
export class CustomerInfoFactory extends SchemaFactory<CustomerInfo, CustomerInfo> {
  constructor() {
    super('customer');
  }

  protected getSchema(): z.ZodSchema<CustomerInfo> {
    return CustomerInfoSchema as z.ZodSchema<CustomerInfo>;
  }

  protected getDbSchema(): z.ZodSchema<CustomerInfo> {
    return CustomerInfoSchema; // Same schema for DB
  }

  protected getDefaults(): CustomerInfo {
    return {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1987654321',
      address: '789 Pine St, Village, State 13579'
    };
  }

  /**
   * Create customer without address (for pickup orders)
   */
  createForPickup(overrides: Partial<CustomerInfo> = {}): CustomerInfo {
    const { address, ...rest } = this.getDefaults();
    return this.create({ ...rest, ...overrides });
  }

  /**
   * Create customer with address (for delivery orders)
   */
  createForDelivery(overrides: Partial<CustomerInfo> = {}): CustomerInfo {
    return this.create({
      address: '123 Delivery Lane, City, State 24680',
      ...overrides
    });
  }
}

// Export singleton instances for convenience
export const orderFactory = new OrderFactory();
export const orderItemFactory = new OrderItemFactory();
export const customerInfoFactory = new CustomerInfoFactory();

// Export helper functions for quick creation
export const createOrder = (overrides?: Partial<Order>) => orderFactory.create(overrides);
export const createOrderItem = (overrides?: Partial<OrderItem>) => orderItemFactory.create(overrides);
export const createCustomerInfo = (overrides?: Partial<CustomerInfo>) => customerInfoFactory.create(overrides);