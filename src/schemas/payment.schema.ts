/**
 * Payment Schema with Database-First Validation and Transformation
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Implements database-first validation, single validation pass with transformation,
 * and comprehensive TypeScript integration following cart.schema.ts patterns.
 */

import { z } from 'zod';
import type { Payment, PaymentMethod, PaymentIntent, CreatePaymentRequest } from '../types';

// ================================
// Raw Database Schemas (Input Validation Only)
// ================================

// Payment status enum based on database constraints
const PaymentStatusEnum = z.enum(['pending', 'processing', 'succeeded', 'failed', 'canceled', 'requires_payment_method', 'requires_confirmation', 'requires_action']);

// Currency codes (expandable list)
const CurrencyCodeEnum = z.enum(['usd', 'eur', 'gbp', 'cad', 'aud']);

// Payment method types
const PaymentMethodTypeEnum = z.enum(['card', 'us_bank_account', 'sepa_debit', 'ideal', 'paypal']);

// Card brands
const CardBrandEnum = z.enum(['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'unknown']);

// Account types for bank accounts
const BankAccountTypeEnum = z.enum(['checking', 'savings']);

// Raw database payment schema (validation only, no transformation)
const RawDbPaymentSchema = z.object({
  id: z.string().min(1),
  payment_intent_id: z.string().nullable().optional(),
  payment_method_id: z.string().nullable().optional(),
  amount: z.number().int().min(0), // Amount in cents
  currency: CurrencyCodeEnum,
  status: PaymentStatusEnum.nullable().optional(),
  user_id: z.string().min(1),
  order_id: z.string().nullable().optional(),
  client_secret: z.string().nullable().optional(),
  confirmation_method: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(), // JSON string from database
});

// Raw database payment method schema
const RawDbPaymentMethodSchema = z.object({
  id: z.string().min(1),
  type: PaymentMethodTypeEnum,
  customer_id: z.string().nullable().optional(),
  user_id: z.string().min(1),
  is_default: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  
  // Card-specific fields
  card_brand: CardBrandEnum.nullable().optional(),
  card_last4: z.string().nullable().optional(),
  card_exp_month: z.number().int().min(1).max(12).nullable().optional(),
  card_exp_year: z.number().int().min(2020).max(2100).nullable().optional(),
  
  // Bank account-specific fields
  bank_account_last4: z.string().nullable().optional(),
  bank_account_routing_number: z.string().nullable().optional(),
  bank_account_account_type: BankAccountTypeEnum.nullable().optional(),
});

// Payment intent status enum (subset of payment status)
const PaymentIntentStatusEnum = z.enum(['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'canceled']);

// Raw database payment intent schema
const RawDbPaymentIntentSchema = z.object({
  id: z.string().min(1),
  amount: z.number().int().min(0),
  currency: CurrencyCodeEnum,
  status: PaymentIntentStatusEnum,
  client_secret: z.string().nullable().optional(),
  payment_method_id: z.string().nullable().optional(),
  confirmation_method: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(),
});

// ================================
// Transformation Schemas (DB → App Format)
// ================================

// Payment transformation schema - main schema for payment service
export const PaymentTransformSchema = RawDbPaymentSchema.transform((data): Payment & { _dbData?: any } => {
  // Parse metadata safely
  let parsedMetadata = {};
  if (data.metadata) {
    try {
      parsedMetadata = JSON.parse(data.metadata);
    } catch (error) {
      console.warn('Failed to parse payment metadata, using empty object:', error);
      parsedMetadata = {};
    }
  }

  return {
    // App interface format (camelCase)
    id: data.id,
    paymentIntentId: data.payment_intent_id || '',
    paymentMethodId: data.payment_method_id || '',
    amount: data.amount,
    currency: data.currency,
    status: data.status || 'pending',
    userId: data.user_id,
    orderId: data.order_id || '',
    clientSecret: data.client_secret || '',
    confirmationMethod: data.confirmation_method || 'automatic',
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    metadata: parsedMetadata,

    // Internal metadata for debugging/monitoring
    _dbData: {
      originalPaymentIntent: data.payment_intent_id,
      originalPaymentMethod: data.payment_method_id,
      originalStatus: data.status,
      rawMetadata: data.metadata,
      rawCreatedAt: data.created_at,
      rawUpdatedAt: data.updated_at,
    }
  };
});

// Payment method transformation schema
export const PaymentMethodTransformSchema = RawDbPaymentMethodSchema.transform((data): PaymentMethod & { _dbData?: any } => {
  // Build card object if card fields are present
  const card = data.type === 'card' && data.card_brand ? {
    brand: data.card_brand,
    last4: data.card_last4 || '',
    expMonth: data.card_exp_month || 0,
    expYear: data.card_exp_year || 0,
  } : undefined;

  // Build bank account object if bank fields are present
  const bankAccount = data.type === 'us_bank_account' && data.bank_account_last4 ? {
    last4: data.bank_account_last4,
    routingNumber: data.bank_account_routing_number || '',
    accountType: data.bank_account_account_type || 'checking',
  } : undefined;

  return {
    // App interface format
    id: data.id,
    type: data.type,
    customerId: data.customer_id || '',
    userId: data.user_id,
    isDefault: data.is_default ?? false,
    createdAt: data.created_at || new Date().toISOString(),
    
    // Conditional fields
    ...(card && { card }),
    ...(bankAccount && { bankAccount }),

    // Internal metadata
    _dbData: {
      originalCustomerId: data.customer_id,
      originalIsDefault: data.is_default,
      rawCardBrand: data.card_brand,
      rawBankAccountType: data.bank_account_account_type,
    }
  };
});

// Payment intent transformation schema
export const PaymentIntentTransformSchema = RawDbPaymentIntentSchema.transform((data): PaymentIntent & { _dbData?: any } => {
  // Parse metadata safely
  let parsedMetadata = {};
  if (data.metadata) {
    try {
      parsedMetadata = JSON.parse(data.metadata);
    } catch (error) {
      console.warn('Failed to parse payment intent metadata:', error);
      parsedMetadata = {};
    }
  }

  return {
    // App interface format
    id: data.id,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    clientSecret: data.client_secret || '',
    paymentMethodId: data.payment_method_id || '',
    confirmationMethod: data.confirmation_method || 'automatic',
    createdAt: data.created_at || new Date().toISOString(),
    metadata: parsedMetadata,

    // Internal metadata
    _dbData: {
      originalClientSecret: data.client_secret,
      originalPaymentMethodId: data.payment_method_id,
      rawMetadata: data.metadata,
    }
  };
});

// ================================
// Calculation and Validation Schemas
// ================================

// Payment calculation schema with tolerance validation
export const PaymentCalculationSchema = z.object({
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  tip: z.number().min(0).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  total: z.number().min(0),
}).refine((data) => {
  // Validate total calculation with tolerance for floating point arithmetic
  const calculatedTotal = data.subtotal + data.tax + data.tip - data.discount;
  const tolerance = 0.01; // 1 cent tolerance
  return Math.abs(data.total - calculatedTotal) <= tolerance;
}, {
  message: "Total must equal subtotal + tax + tip - discount",
  path: ["total"],
});

// ================================
// Request/Response Schemas
// ================================

// Create payment request schema
export const CreatePaymentRequestSchema = z.object({
  amount: z.number().int().min(1), // Minimum 1 cent
  currency: CurrencyCodeEnum,
  payment_method_id: z.string().min(1),
  confirmation_method: z.string().optional().default('automatic'),
  return_url: z.string().url().optional(),
  metadata: z.record(z.string()).optional().default({}),
}).transform((data): CreatePaymentRequest => ({
  // Transform to camelCase for app usage
  amount: data.amount,
  currency: data.currency,
  paymentMethodId: data.payment_method_id,
  confirmationMethod: data.confirmation_method,
  returnUrl: data.return_url,
  metadata: data.metadata,
}));

// Update payment status request schema
export const UpdatePaymentStatusRequestSchema = z.object({
  payment_id: z.string().min(1),
  status: PaymentStatusEnum,
  metadata: z.record(z.string()).optional(),
}).transform((data): { paymentId: string; status: PaymentStatus; metadata: Record<string, string> } => ({
  paymentId: data.payment_id,
  status: data.status,
  metadata: data.metadata || {},
}));

// Payment operation response schema
export const PaymentOperationResponseSchema = z.object({
  success: z.boolean(),
  payment: PaymentTransformSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    userMessage: z.string().optional(),
    details: z.record(z.any()).optional(),
  }).optional(),
  message: z.string().optional(),
}).refine((data) => {
  // Either success with payment or failure with error
  return (data.success && data.payment) || (!data.success && data.error);
}, {
  message: "Success responses must include payment, failure responses must include error",
});

// ================================
// Legacy Schema Support (Backward Compatibility)
// ================================

// Legacy schemas for backward compatibility (deprecated - use transformation schemas instead)
export const DbPaymentSchema = RawDbPaymentSchema;
export const DbPaymentMethodSchema = RawDbPaymentMethodSchema;
export const DbPaymentIntentSchema = RawDbPaymentIntentSchema;

// ================================
// Array Schemas for Bulk Operations
// ================================

export const PaymentArrayTransformSchema = z.array(RawDbPaymentSchema);
export const PaymentMethodArrayTransformSchema = z.array(RawDbPaymentMethodSchema);
export const PaymentIntentArrayTransformSchema = z.array(RawDbPaymentIntentSchema);

// ================================
// Export Types Inferred from Schemas
// ================================

export type ValidatedPayment = z.infer<typeof PaymentTransformSchema>;
export type ValidatedPaymentMethod = z.infer<typeof PaymentMethodTransformSchema>;
export type ValidatedPaymentIntent = z.infer<typeof PaymentIntentTransformSchema>;
export type ValidatedPaymentCalculation = z.infer<typeof PaymentCalculationSchema>;
export type ValidatedCreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;
export type ValidatedUpdatePaymentStatusRequest = z.infer<typeof UpdatePaymentStatusRequestSchema>;
export type ValidatedPaymentOperationResponse = z.infer<typeof PaymentOperationResponseSchema>;

// Raw database types (for internal use)
export type RawDbPayment = z.infer<typeof RawDbPaymentSchema>;
export type RawDbPaymentMethod = z.infer<typeof RawDbPaymentMethodSchema>;
export type RawDbPaymentIntent = z.infer<typeof RawDbPaymentIntentSchema>;

// Enum types for external usage
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export type CurrencyCode = z.infer<typeof CurrencyCodeEnum>;
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeEnum>;
export type CardBrand = z.infer<typeof CardBrandEnum>;
export type BankAccountType = z.infer<typeof BankAccountTypeEnum>;