import { z } from 'zod';
import { ProductSchema } from './product.schema';
import type { CustomerInfo, OrderItem, Order } from '../types';

// Order status validation
export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'ready', 'completed', 'cancelled']);

// Fulfillment type validation
export const FulfillmentTypeSchema = z.enum(['pickup', 'delivery']);

// Payment method validation
export const PaymentMethodSchema = z.enum(['online', 'cash_on_pickup']);

// Payment status validation
export const PaymentStatusSchema = z.enum(['paid', 'pending', 'failed']);

// Customer info schema
export const CustomerInfoSchema = z.object({
  name: z.string().min(1).transform((name): string => name.trim()),
  email: z.string().email().transform((email): string => email.toLowerCase().trim()),
  phone: z.string().min(1),
  address: z.string().optional(),
}).transform((data): CustomerInfo => {
  // Ensure name is never empty after trimming
  if (!data.name || data.name.length === 0) {
    throw new Error('Customer name cannot be empty');
  }
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address
  };
});

// Database order item schema (from database)
// Removed business logic calculation validation - now handled in service layer
export const DbOrderItemSchema = z.object({
  id: z.string().min(1),
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  unit_price: z.number().min(0),
  quantity: z.number().int().min(1),
  total_price: z.number().min(0),
});

// Application order item schema (mapped from database)
// Removed business logic calculation validation - now handled in service layer
export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  subtotal: z.number().min(0),
  product: ProductSchema.optional(),
});

// Order schema with comprehensive validation
export const OrderSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().nullable().optional(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().min(1),
  order_items: z.array(z.any()).optional(), // Skip validation - RPC function already validated these
  subtotal: z.number().min(0),
  tax_amount: z.number().min(0),
  total_amount: z.number().min(0),
  fulfillment_type: z.string(),
  status: z.string(),
  payment_method: z.string().nullable(),
  payment_status: z.string().nullable(),
  notes: z.string().nullable().optional(),
  pickup_date: z.string().nullable().optional(),
  pickup_time: z.string().nullable().optional(),
  delivery_address: z.string().nullable().optional(),
  special_instructions: z.string().nullable().optional(),
  created_at: z.string().nullable(),    // Database allows null
  updated_at: z.string().nullable(),    // Database allows null
  qr_code_data: z.string().nullable().optional(),
  
  // Legacy field mappings for backward compatibility
  customerId: z.string().optional(),
  customerInfo: CustomerInfoSchema.optional(),
  items: z.array(OrderItemSchema).optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  fulfillmentType: FulfillmentTypeSchema.optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  deliveryAddress: z.string().optional(),
  specialInstructions: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Create order request schema
export const CreateOrderRequestSchema = z.object({
  customerInfo: CustomerInfoSchema,
  items: z.array(OrderItemSchema).min(1, "Order must contain at least one item"),
  fulfillmentType: FulfillmentTypeSchema,
  paymentMethod: PaymentMethodSchema,
  notes: z.string().optional(),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryDate: z.string().optional(),
  deliveryTime: z.string().optional(),
  specialInstructions: z.string().optional(),
}).refine((data) => {
  // Validate delivery orders have delivery address
  if (data.fulfillmentType === 'delivery' && !data.deliveryAddress) {
    return false;
  }
  return true;
}, {
  message: "Delivery orders must include delivery address",
  path: ["deliveryAddress"],
});

// Inventory conflict schema
export const InventoryConflictSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  requested: z.number().int().min(1),
  available: z.number().int().min(0),
});

// Order submission result schema
export const OrderSubmissionResultSchema = z.object({
  success: z.boolean(),
  order: OrderSchema.optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  inventoryConflicts: z.array(InventoryConflictSchema).optional(),
});

// Order statistics schema
export const OrderStatsSchema = z.object({
  totalOrders: z.number().int().min(0),
  totalRevenue: z.number().min(0),
  averageOrderValue: z.number().min(0),
  pendingOrders: z.number().int().min(0),
  completedOrders: z.number().int().min(0),
  cancelledOrders: z.number().int().min(0),
  topProducts: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    totalSold: z.number().int().min(0),
    revenue: z.number().min(0),
  })).optional(),
  revenueByDate: z.array(z.object({
    date: z.string(),
    revenue: z.number().min(0),
    orderCount: z.number().int().min(0),
  })).optional(),
});

// Order update request schema
export const OrderUpdateRequestSchema = z.object({
  status: OrderStatusSchema.optional(),
  notes: z.string().optional(),
  pickup_date: z.string().optional(),
  pickup_time: z.string().optional(),
  special_instructions: z.string().optional(),
});

// Order arrays for bulk operations
export const OrderArraySchema = z.array(OrderSchema);

// Export types inferred from schemas
export type ValidatedOrder = z.infer<typeof OrderSchema>;
export type ValidatedOrderStatus = z.infer<typeof OrderStatusSchema>;
export type ValidatedFulfillmentType = z.infer<typeof FulfillmentTypeSchema>;
export type ValidatedPaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type ValidatedPaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type ValidatedCustomerInfo = z.infer<typeof CustomerInfoSchema>;
export type ValidatedOrderItem = z.infer<typeof OrderItemSchema>;
export type ValidatedCreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type ValidatedOrderSubmissionResult = z.infer<typeof OrderSubmissionResultSchema>;
export type ValidatedInventoryConflict = z.infer<typeof InventoryConflictSchema>;
export type ValidatedOrderStats = z.infer<typeof OrderStatsSchema>;
export type ValidatedOrderUpdateRequest = z.infer<typeof OrderUpdateRequestSchema>;