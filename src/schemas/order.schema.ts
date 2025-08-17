import { z } from 'zod';
import { ProductSchema } from './product.schema';

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
  name: z.string().min(1).transform(name => name.trim()),
  email: z.string().email().transform(email => email.toLowerCase().trim()),
  phone: z.string().min(1),
  address: z.string().optional(),
}).transform((data) => {
  // Ensure name is never empty after trimming
  if (!data.name || data.name.length === 0) {
    throw new Error('Customer name cannot be empty');
  }
  return data;
});

// Database order item schema (from database)
export const DbOrderItemSchema = z.object({
  id: z.string().min(1),
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  unit_price: z.number().min(0),
  quantity: z.number().int().min(1),
  total_price: z.number().min(0),
}).refine((data) => {
  // Validate total_price calculation
  const expectedTotal = data.unit_price * data.quantity;
  const tolerance = 0.01; // Allow for small floating point differences
  return Math.abs(data.total_price - expectedTotal) < tolerance;
}, {
  message: "Total price must equal unit_price × quantity",
  path: ["total_price"],
});

// Application order item schema (mapped from database)
export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  subtotal: z.number().min(0),
  product: ProductSchema.optional(),
}).refine((data) => {
  // Validate subtotal calculation
  const expectedSubtotal = data.price * data.quantity;
  const tolerance = 0.01; // Allow for small floating point differences
  return Math.abs(data.subtotal - expectedSubtotal) < tolerance;
}, {
  message: "Subtotal must equal price × quantity",
  path: ["subtotal"],
});

// Order schema with comprehensive validation
export const OrderSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().nullable().optional(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().min(1),
  order_items: z.array(DbOrderItemSchema).optional(),
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
  delivery_date: z.string().nullable().optional(),
  delivery_time: z.string().nullable().optional(),
  special_instructions: z.string().nullable().optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
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
}).refine((data) => {
  // Validate total calculation if order_items exist
  if (data.order_items && data.order_items.length > 0) {
    const calculatedSubtotal = data.order_items.reduce((sum, item) => sum + item.total_price, 0);
    const tolerance = 0.01; // Allow for small floating point differences
    return Math.abs(data.subtotal - calculatedSubtotal) < tolerance;
  }
  return true;
}, {
  message: "Subtotal must equal sum of order item subtotals",
  path: ["subtotal"],
}).refine((data) => {
  // Validate total = subtotal + tax
  const expectedTotal = data.subtotal + data.tax_amount;
  const tolerance = 0.01;
  return Math.abs(data.total_amount - expectedTotal) < tolerance;
}, {
  message: "Total must equal subtotal + tax",
  path: ["total_amount"],
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
  delivery_date: z.string().optional(),
  delivery_time: z.string().optional(),
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