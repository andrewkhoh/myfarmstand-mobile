// Order Analytics Schemas - Following @docs/architectural-patterns-and-best-practices.md
// Pattern: Database-First Validation & Transformation Schema Architecture

import { z } from 'zod';

// Step 1: Raw database schema (input validation only)
// Based on database.generated.ts orders table structure
const RawOrderSchema = z.object({
  id: z.string().min(1),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  customer_email: z.string(),
  customer_name: z.string(),
  customer_phone: z.string(),
  delivery_address: z.string().nullable().optional(),
  fulfillment_type: z.string(),
  notes: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  pickup_date: z.string().nullable().optional(),
  pickup_time: z.string().nullable().optional(),
  qr_code_data: z.string().nullable().optional(),
  special_instructions: z.string().nullable().optional(),
  status: z.string(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  user_id: z.string().nullable().optional(),
});

// Raw order items schema
const RawOrderItemSchema = z.object({
  id: z.string().min(1),
  created_at: z.string().nullable().optional(),
  order_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.number(),
  total_price: z.number(),
  unit_price: z.number(),
});

// Raw pickup reschedule log schema
const RawPickupRescheduleLogSchema = z.object({
  id: z.string().min(1),
  created_at: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  order_id: z.string(),
  new_pickup_date: z.string(),
  new_pickup_time: z.string(),
  original_pickup_date: z.string().nullable().optional(),
  original_pickup_time: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  request_status: z.string(),
});

// Raw no-show handling schema (if exists)
const RawNoShowLogSchema = z.object({
  id: z.string().min(1),
  order_id: z.string(),
  notification_sent: z.boolean().nullable().optional(),
  original_pickup_date: z.string(),
  original_pickup_time: z.string(),
  processed_at: z.string().nullable().optional(),
  processing_status: z.string(),
}).optional();

// Step 2: Aggregated raw order analytics schema
const RawOrderAnalyticsSchema = z.object({
  // Core order data
  ...RawOrderSchema.shape,
  // Related data
  order_items: z.array(RawOrderItemSchema).optional().default([]),
  pickup_reschedule_log: z.array(RawPickupRescheduleLogSchema).optional().default([]),
  no_show_log: RawNoShowLogSchema.nullable().optional(),
});

// Step 3: Transformation schemas (DB → App format)
export const OrderAnalyticsTransformSchema = RawOrderAnalyticsSchema.transform((data) => ({
  // Core order data with proper camelCase transformation
  orderId: data.id,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),

  // Customer information
  customer: {
    email: data.customer_email,
    name: data.customer_name,
    phone: data.customer_phone,
    userId: data.user_id || null,
  },

  // Order details
  orderDetails: {
    fulfillmentType: data.fulfillment_type,
    deliveryAddress: data.delivery_address || null,
    notes: data.notes || null,
    specialInstructions: data.special_instructions || null,
    qrCodeData: data.qr_code_data || null,
  },

  // Payment information
  payment: {
    method: data.payment_method || 'unknown',
    status: data.payment_status || 'pending',
    subtotal: data.subtotal,
    taxAmount: data.tax_amount,
    totalAmount: data.total_amount,
  },

  // Pickup information
  pickup: {
    scheduledDate: data.pickup_date || null,
    scheduledTime: data.pickup_time || null,
    hasReschedules: (data.pickup_reschedule_log?.length || 0) > 0,
    rescheduleCount: data.pickup_reschedule_log?.length || 0,
    rescheduleHistory: data.pickup_reschedule_log?.map(log => ({
      id: log.id,
      requestedDate: log.new_pickup_date,
      requestedTime: log.new_pickup_time,
      originalDate: log.original_pickup_date || null,
      originalTime: log.original_pickup_time || null,
      reason: log.reason || null,
      status: log.request_status,
      approvedAt: log.approved_at || null,
      rejectionReason: log.rejection_reason || null,
    })) || [],
  },

  // Order status and workflow
  workflow: {
    currentStatus: data.status,
    isCompleted: data.status === 'completed',
    isPending: data.status === 'pending',
    isProcessing: data.status === 'processing',
    isCancelled: data.status === 'cancelled',
    hasNoShow: !!data.no_show_log,
    noShowData: data.no_show_log ? {
      notificationSent: data.no_show_log.notification_sent || false,
      processedAt: data.no_show_log.processed_at || null,
      processingStatus: data.no_show_log.processing_status,
    } : null,
  },

  // Order items with analytics-friendly format
  items: data.order_items?.map(item => ({
    itemId: item.id,
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    createdAt: item.created_at || new Date().toISOString(),
  })) || [],

  // Analytics-specific calculated fields
  analytics: {
    orderValue: data.total_amount,
    itemCount: data.order_items?.length || 0,
    averageItemValue: data.order_items?.length ?
      data.total_amount / data.order_items.length : 0,
    hasPickupScheduled: !!(data.pickup_date && data.pickup_time),
    daysSinceCreated: data.created_at ?
      Math.floor((new Date().getTime() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    fulfillmentComplexity: data.order_items?.length || 0 + (data.pickup_reschedule_log?.length || 0),
  },

  // Internal metadata for debugging/monitoring
  _dbData: {
    originalStatus: data.status,
    rawFulfillmentType: data.fulfillment_type,
    originalPickupData: {
      date: data.pickup_date,
      time: data.pickup_time,
    },
  }
}));

// Export the transformation result type
export type OrderAnalyticsTransform = z.infer<typeof OrderAnalyticsTransformSchema>;

// Step 4: Metrics aggregation schemas
export const OrderMetricsSchema = z.object({
  totalOrders: z.number(),
  totalRevenue: z.number(),
  averageOrderValue: z.number(),
  orderVelocity: z.object({
    ordersPerHour: z.number(),
    ordersPerDay: z.number(),
    peakHours: z.array(z.number()),
  }),
  fulfillmentMetrics: z.object({
    pickupRate: z.number(),
    noShowRate: z.number(),
    rescheduleRate: z.number(),
    averageProcessingTime: z.number(),
  }),
  statusDistribution: z.record(z.string(), z.number()),
  paymentMetrics: z.object({
    successRate: z.number(),
    methodDistribution: z.record(z.string(), z.number()),
  }),
  customerMetrics: z.object({
    newCustomers: z.number(),
    returningCustomers: z.number(),
    averageItemsPerOrder: z.number(),
  }),
});

export type OrderMetrics = z.infer<typeof OrderMetricsSchema>;

// Step 5: Query options schema
export const OrderAnalyticsOptionsSchema = z.object({
  userId: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  status: z.array(z.string()).optional(),
  fulfillmentType: z.array(z.string()).optional(),
  includeItems: z.boolean().default(true),
  includePickupHistory: z.boolean().default(true),
  includeNoShowData: z.boolean().default(true),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type OrderAnalyticsOptions = z.infer<typeof OrderAnalyticsOptionsSchema>;

// Step 6: Error schemas for monitoring
export const OrderAnalyticsErrorSchema = z.object({
  code: z.enum([
    'ORDER_ANALYTICS_FETCH_FAILED',
    'ORDER_TRANSFORMATION_FAILED',
    'PERMISSION_DENIED',
    'INVALID_DATE_RANGE',
    'DATABASE_ERROR',
  ]),
  message: z.string(),
  context: z.string(),
  orderId: z.string().optional(),
  userId: z.string().optional(),
});

export type OrderAnalyticsError = z.infer<typeof OrderAnalyticsErrorSchema>;

// Utility schemas for batch processing
export const OrderAnalyticsBatchSchema = z.object({
  orders: z.array(OrderAnalyticsTransformSchema),
  metadata: z.object({
    totalProcessed: z.number(),
    totalSkipped: z.number(),
    errors: z.array(OrderAnalyticsErrorSchema),
    processingTimeMs: z.number(),
  }),
});

export type OrderAnalyticsBatch = z.infer<typeof OrderAnalyticsBatchSchema>;