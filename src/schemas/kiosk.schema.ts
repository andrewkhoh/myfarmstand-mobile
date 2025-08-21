import { z } from 'zod';

// Helper types for transform return values
type KioskSessionTransformResult = {
  id: string;
  staffId: string;
  staffName: string;
  sessionStart: Date;
  sessionEnd: Date | null;
  totalSales: number;
  transactionCount: number;
  isActive: boolean;
  deviceId: string | null;
  currentCustomer: null;
  _dbData: Record<string, any>;
};

type StaffPinTransformResult = {
  id: string;
  userId: string;
  pin: string;
  isActive: boolean;
  lastUsed: Date | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'staff' | 'manager' | 'admin';
  } | null;
  _dbData: Record<string, any>;
};

type KioskTransactionTransformResult = {
  id: string;
  sessionId: string;
  customerId: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  paymentStatus: 'pending' | 'completed' | 'failed';
  completedAt: Date | null;
  _dbData: Record<string, any>;
};

// ✅ PATTERN: Database-First Validation - Raw schemas (input validation only)
// Handle database reality, not application assumptions

// Step 1: Raw database schema for kiosk_sessions (input validation only)
const RawDbKioskSessionSchema = z.object({
  id: z.string().min(1),
  staff_id: z.string().min(1),
  session_start: z.string().nullable().optional(), // Database allows null
  session_end: z.string().nullable().optional(),
  total_sales: z.number().nullable().optional(),    // Database allows null
  transaction_count: z.number().int().nullable().optional(),
  is_active: z.boolean().nullable().optional(),     // Database allows null
  device_id: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Step 1: Raw database schema for staff_pins (input validation only)
const RawDbStaffPinSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  pin: z.string().length(4),
  is_active: z.boolean().nullable().optional(),
  last_used: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Step 1: Raw database schema for user data from joins
const RawDbUserSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  raw_user_meta_data: z.object({
    role: z.string().optional()
  }).nullable().optional()
});

// ✅ PATTERN: Transformation Schema Architecture - DB → App format conversion

// Step 2: Kiosk Session Transformation Schema
export const DbKioskSessionTransformSchema = RawDbKioskSessionSchema
  .extend({
    // Optional staff relation data
    staff: z.object({
      name: z.string(),
      role: z.string()
    }).nullable().optional()
  })
  .transform((data): KioskSessionTransformResult => ({
    // ✅ PATTERN: App interface format with proper defaults
    id: data.id,
    staffId: data.staff_id,
    staffName: data.staff?.name || 'Unknown Staff',
    sessionStart: new Date(data.session_start || Date.now()),
    sessionEnd: data.session_end ? new Date(data.session_end) : null,
    totalSales: data.total_sales ?? 0,          // ✅ Apply defaults during transformation
    transactionCount: data.transaction_count ?? 0, 
    isActive: data.is_active ?? true,           
    deviceId: data.device_id || null,
    currentCustomer: null, // Runtime value, not from DB
    
    // ✅ PATTERN: Internal metadata for debugging/monitoring
    _dbData: {
      staff_id: data.staff_id,
      session_start: data.session_start,
      session_end: data.session_end,
      raw_total_sales: data.total_sales,
      raw_transaction_count: data.transaction_count,
      raw_is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }));

// Step 2: Staff PIN Transformation Schema
export const DbStaffPinTransformSchema = RawDbStaffPinSchema
  .extend({
    // User relation data
    users: RawDbUserSchema.nullable().optional()
  })
  .transform((data): StaffPinTransformResult => ({
    // ✅ PATTERN: App interface format
    id: data.id,
    userId: data.user_id,
    pin: data.pin,
    isActive: data.is_active ?? true,
    lastUsed: data.last_used ? new Date(data.last_used) : null,
    user: data.users ? {
      id: data.users.id,
      name: data.users.name,
      email: data.users.email,
      role: (data.users.raw_user_meta_data?.role || 'staff') as 'customer' | 'staff' | 'manager' | 'admin'
    } : null,
    
    // ✅ PATTERN: Internal metadata
    _dbData: {
      user_id: data.user_id,
      raw_is_active: data.is_active,
      last_used: data.last_used,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }));

// ✅ PATTERN: Input Validation Schemas (application boundaries)

// Kiosk Authentication Request - Input validation
export const KioskAuthRequestSchema = z.object({
  pin: z.string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only numbers'),
  deviceId: z.string().optional()
});

// ✅ PATTERN: Response Validation Schemas

export const KioskAuthResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().optional(),
  staffId: z.string().optional(),
  staffName: z.string().optional(),
  message: z.string().optional()
});

export const KioskSessionResponseSchema = z.object({
  success: z.boolean(),
  session: DbKioskSessionTransformSchema.optional(),
  message: z.string().optional()
});

export const KioskSessionsListResponseSchema = z.object({
  success: z.boolean(),
  sessions: z.array(DbKioskSessionTransformSchema),
  message: z.string().optional()
});

// ✅ PATTERN: Transaction Schemas following same pattern

// Step 1: Raw database transaction schema
const RawDbKioskTransactionSchema = z.object({
  id: z.string().min(1),
  session_id: z.string().min(1),
  customer_id: z.string().nullable().optional(),
  customer_email: z.string().nullable().optional(),
  customer_phone: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  subtotal: z.number(),
  tax_amount: z.number().nullable().optional(),
  total_amount: z.number(),
  payment_method: z.enum(['cash', 'card', 'digital']),
  payment_status: z.enum(['pending', 'completed', 'failed']),
  completed_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional()
});

// Step 2: Transaction transformation schema
export const DbKioskTransactionTransformSchema = RawDbKioskTransactionSchema
  .extend({
    // Optional transaction items relation
    kiosk_transaction_items: z.array(z.object({
      id: z.string(),
      product_id: z.string(),
      product_name: z.string(),
      unit_price: z.number(),
      quantity: z.number(),
      total_price: z.number()
    })).optional()
  })
  .transform((data): KioskTransactionTransformResult => ({
    // App interface format
    id: data.id,
    sessionId: data.session_id,
    customerId: data.customer_id,
    customerEmail: data.customer_email,
    customerPhone: data.customer_phone,
    customerName: data.customer_name,
    items: (data.kiosk_transaction_items || []).map(item => ({
      productId: item.product_id,
      productName: item.product_name,
      price: item.unit_price,
      quantity: item.quantity,
      subtotal: item.total_price
    })),
    subtotal: data.subtotal,
    taxAmount: data.tax_amount ?? 0,
    totalAmount: data.total_amount,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    completedAt: data.completed_at ? new Date(data.completed_at) : null,
    
    // Internal metadata
    _dbData: {
      session_id: data.session_id,
      raw_tax_amount: data.tax_amount,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }));

export const KioskTransactionResponseSchema = z.object({
  success: z.boolean(),
  transaction: DbKioskTransactionTransformSchema.optional(),
  message: z.string().optional()
});

export const KioskTransactionsListResponseSchema = z.object({
  success: z.boolean(),
  transactions: z.array(DbKioskTransactionTransformSchema),
  message: z.string().optional()
});

// ✅ PATTERN: TypeScript types from schemas (maintain type safety)
export type KioskAuthRequest = z.infer<typeof KioskAuthRequestSchema>;
export type KioskAuthResponse = z.infer<typeof KioskAuthResponseSchema>;
export type KioskSession = z.infer<typeof DbKioskSessionTransformSchema>;
export type KioskSessionResponse = z.infer<typeof KioskSessionResponseSchema>;
export type KioskSessionsListResponse = z.infer<typeof KioskSessionsListResponseSchema>;
export type KioskTransaction = z.infer<typeof DbKioskTransactionTransformSchema>;
export type KioskTransactionResponse = z.infer<typeof KioskTransactionResponseSchema>;
export type KioskTransactionsListResponse = z.infer<typeof KioskTransactionsListResponseSchema>;
export type StaffPin = z.infer<typeof DbStaffPinTransformSchema>;

// ✅ PATTERN: Export raw schemas for service layer usage
export { RawDbKioskSessionSchema, RawDbStaffPinSchema, RawDbKioskTransactionSchema };