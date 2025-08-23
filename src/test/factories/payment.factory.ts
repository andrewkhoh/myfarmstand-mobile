/**
 * Payment Factory - Schema-Validated Test Data
 * 
 * Creates valid payment test data that always passes schema validation.
 * Handles payments, payment methods, payment intents, and various payment scenarios.
 */

import { z } from 'zod';
import { SchemaFactory } from './base.factory';
import { 
  PaymentTransformSchema,
  PaymentMethodTransformSchema,
  PaymentIntentTransformSchema,
  CreatePaymentRequestSchema,
  PaymentCalculationSchema,
  DbPaymentSchema,
  DbPaymentMethodSchema,
  DbPaymentIntentSchema
} from '../../schemas/payment.schema';
import type { 
  Payment, 
  PaymentMethod, 
  PaymentIntent,
  CreatePaymentRequest,
  PaymentStatus,
  PaymentMethodType,
  CurrencyCode
} from '../../types';

export class PaymentFactory extends SchemaFactory<Payment, any> {
  constructor() {
    super('payment');
  }

  protected getSchema(): z.ZodSchema<Payment> {
    return PaymentTransformSchema as z.ZodSchema<Payment>;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return DbPaymentSchema;
  }

  protected getDefaults(): Payment {
    const now = new Date().toISOString();
    return {
      id: this.getNextId(),
      paymentIntentId: `pi_${this.getNextId()}`,
      paymentMethodId: `pm_${this.getNextId()}`,
      amount: 2999, // $29.99 in cents
      currency: 'usd' as CurrencyCode,
      status: 'succeeded' as PaymentStatus,
      userId: 'user-1',
      orderId: 'order-1',
      clientSecret: `pi_${this.getNextId()}_secret`,
      confirmationMethod: 'automatic',
      createdAt: now,
      updatedAt: now,
      metadata: {}
    };
  }

  protected transformToDb(payment: Payment): any {
    return {
      id: payment.id,
      payment_intent_id: payment.paymentIntentId || null,
      payment_method_id: payment.paymentMethodId || null,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status || null,
      user_id: payment.userId,
      order_id: payment.orderId || null,
      client_secret: payment.clientSecret || null,
      confirmation_method: payment.confirmationMethod || null,
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
      metadata: payment.metadata ? JSON.stringify(payment.metadata) : null
    };
  }

  /**
   * Create a pending payment
   */
  createPending(overrides: Partial<Payment> = {}): Payment {
    return this.create({
      status: 'pending' as PaymentStatus,
      ...overrides
    });
  }

  /**
   * Create a processing payment
   */
  createProcessing(overrides: Partial<Payment> = {}): Payment {
    return this.create({
      status: 'processing' as PaymentStatus,
      ...overrides
    });
  }

  /**
   * Create a failed payment
   */
  createFailed(overrides: Partial<Payment> = {}): Payment {
    return this.create({
      status: 'failed' as PaymentStatus,
      ...overrides
    });
  }

  /**
   * Create a canceled payment
   */
  createCanceled(overrides: Partial<Payment> = {}): Payment {
    return this.create({
      status: 'canceled' as PaymentStatus,
      ...overrides
    });
  }

  /**
   * Create a payment that requires action
   */
  createRequiresAction(overrides: Partial<Payment> = {}): Payment {
    return this.create({
      status: 'requires_action' as PaymentStatus,
      confirmationMethod: 'manual',
      ...overrides
    });
  }

  /**
   * Create a payment with specific amount
   */
  createWithAmount(amountInCents: number, overrides: Partial<Payment> = {}): Payment {
    return this.create({
      amount: amountInCents,
      ...overrides
    });
  }

  /**
   * Create a payment in different currency
   */
  createInCurrency(currency: CurrencyCode, overrides: Partial<Payment> = {}): Payment {
    return this.create({
      currency,
      ...overrides
    });
  }

  /**
   * Create multiple payments for an order
   */
  createPaymentHistory(orderId: string, count: number = 3): Payment[] {
    const statuses: PaymentStatus[] = ['failed', 'canceled', 'succeeded'];
    return Array.from({ length: count }, (_, i) => {
      const createdAt = new Date(Date.now() - (count - i) * 60000).toISOString(); // 1 minute apart
      return this.create({
        orderId,
        status: statuses[i % statuses.length],
        createdAt,
        updatedAt: createdAt
      });
    });
  }
}

export class PaymentMethodFactory extends SchemaFactory<PaymentMethod, any> {
  constructor() {
    super('payment-method');
  }

  protected getSchema(): z.ZodSchema<PaymentMethod> {
    return PaymentMethodTransformSchema as z.ZodSchema<PaymentMethod>;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return DbPaymentMethodSchema;
  }

  protected getDefaults(): PaymentMethod {
    const now = new Date().toISOString();
    return {
      id: `pm_${this.getNextId()}`,
      type: 'card' as PaymentMethodType,
      customerId: `cus_${this.getNextId()}`,
      userId: 'user-1',
      isDefault: false,
      createdAt: now,
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025
      }
    };
  }

  protected transformToDb(method: PaymentMethod): any {
    const base = {
      id: method.id,
      type: method.type,
      customer_id: method.customerId || null,
      user_id: method.userId,
      is_default: method.isDefault || null,
      created_at: method.createdAt,
      card_brand: null,
      card_last4: null,
      card_exp_month: null,
      card_exp_year: null,
      bank_account_last4: null,
      bank_account_routing_number: null,
      bank_account_account_type: null
    };

    // Add card fields if present
    if (method.card) {
      base.card_brand = method.card.brand;
      base.card_last4 = method.card.last4;
      base.card_exp_month = method.card.expMonth;
      base.card_exp_year = method.card.expYear;
    }

    // Add bank account fields if present
    if (method.bankAccount) {
      base.bank_account_last4 = method.bankAccount.last4;
      base.bank_account_routing_number = method.bankAccount.routingNumber;
      base.bank_account_account_type = method.bankAccount.accountType;
    }

    return base;
  }

  /**
   * Create a Visa card payment method
   */
  createVisa(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
    return this.create({
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025
      },
      ...overrides
    });
  }

  /**
   * Create a Mastercard payment method
   */
  createMastercard(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
    return this.create({
      card: {
        brand: 'mastercard',
        last4: '5555',
        expMonth: 6,
        expYear: 2026
      },
      ...overrides
    });
  }

  /**
   * Create an Amex payment method
   */
  createAmex(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
    return this.create({
      card: {
        brand: 'amex',
        last4: '0005',
        expMonth: 3,
        expYear: 2027
      },
      ...overrides
    });
  }

  /**
   * Create an expired card
   */
  createExpiredCard(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
    const lastYear = new Date().getFullYear() - 1;
    return this.create({
      card: {
        brand: 'visa',
        last4: '9999',
        expMonth: 1,
        expYear: lastYear
      },
      ...overrides
    });
  }

  /**
   * Create a bank account payment method
   */
  createBankAccount(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
    return this.create({
      type: 'us_bank_account' as PaymentMethodType,
      card: undefined,
      bankAccount: {
        last4: '6789',
        routingNumber: '110000000',
        accountType: 'checking'
      },
      ...overrides
    });
  }

  /**
   * Create a default payment method
   */
  createDefault(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
    return this.create({
      isDefault: true,
      ...overrides
    });
  }

  /**
   * Create multiple payment methods for a user
   */
  createUserPaymentMethods(userId: string, count: number = 3): PaymentMethod[] {
    const brands = ['visa', 'mastercard', 'amex'];
    return Array.from({ length: count }, (_, i) => 
      this.create({
        userId,
        isDefault: i === 0,
        card: {
          brand: brands[i % brands.length] as any,
          last4: `${4000 + i}`,
          expMonth: (i + 1) % 12 + 1,
          expYear: 2025 + i
        }
      })
    );
  }
}

export class PaymentIntentFactory extends SchemaFactory<PaymentIntent, any> {
  constructor() {
    super('payment-intent');
  }

  protected getSchema(): z.ZodSchema<PaymentIntent> {
    return PaymentIntentTransformSchema as z.ZodSchema<PaymentIntent>;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return DbPaymentIntentSchema;
  }

  protected getDefaults(): PaymentIntent {
    const now = new Date().toISOString();
    return {
      id: `pi_${this.getNextId()}`,
      amount: 2999, // $29.99 in cents
      currency: 'usd' as CurrencyCode,
      status: 'succeeded',
      clientSecret: `pi_${this.getNextId()}_secret`,
      paymentMethodId: `pm_${this.getNextId()}`,
      confirmationMethod: 'automatic',
      createdAt: now,
      metadata: {}
    };
  }

  protected transformToDb(intent: PaymentIntent): any {
    return {
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      client_secret: intent.clientSecret || null,
      payment_method_id: intent.paymentMethodId || null,
      confirmation_method: intent.confirmationMethod || null,
      created_at: intent.createdAt,
      metadata: intent.metadata ? JSON.stringify(intent.metadata) : null
    };
  }

  /**
   * Create an intent requiring payment method
   */
  createRequiresPaymentMethod(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
    return this.create({
      status: 'requires_payment_method',
      paymentMethodId: undefined,
      ...overrides
    });
  }

  /**
   * Create an intent requiring confirmation
   */
  createRequiresConfirmation(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
    return this.create({
      status: 'requires_confirmation',
      ...overrides
    });
  }

  /**
   * Create an intent requiring action (3D Secure)
   */
  createRequiresAction(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
    return this.create({
      status: 'requires_action',
      confirmationMethod: 'manual',
      ...overrides
    });
  }

  /**
   * Create a processing intent
   */
  createProcessing(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
    return this.create({
      status: 'processing',
      ...overrides
    });
  }

  /**
   * Create a canceled intent
   */
  createCanceled(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
    return this.create({
      status: 'canceled',
      ...overrides
    });
  }

  /**
   * Create an intent with metadata
   */
  createWithMetadata(metadata: Record<string, any>, overrides: Partial<PaymentIntent> = {}): PaymentIntent {
    return this.create({
      metadata,
      ...overrides
    });
  }
}

/**
 * Payment Calculation Factory
 */
export class PaymentCalculationFactory extends SchemaFactory<any, any> {
  constructor() {
    super('payment-calc');
  }

  protected getSchema(): z.ZodSchema<any> {
    return PaymentCalculationSchema;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return PaymentCalculationSchema;
  }

  protected getDefaults(): any {
    const subtotal = 100.00;
    const tax = 8.00;
    const tip = 15.00;
    const discount = 10.00;
    
    return {
      subtotal,
      tax,
      tip,
      discount,
      total: subtotal + tax + tip - discount
    };
  }

  /**
   * Create calculation without tip
   */
  createWithoutTip(overrides: any = {}): any {
    const subtotal = overrides.subtotal || 100.00;
    const tax = overrides.tax || 8.00;
    const discount = overrides.discount || 0;
    
    return this.create({
      subtotal,
      tax,
      tip: 0,
      discount,
      total: subtotal + tax - discount,
      ...overrides
    });
  }

  /**
   * Create calculation with percentage tip
   */
  createWithPercentageTip(tipPercent: number, overrides: any = {}): any {
    const subtotal = overrides.subtotal || 100.00;
    const tax = overrides.tax || 8.00;
    const tip = subtotal * (tipPercent / 100);
    const discount = overrides.discount || 0;
    
    return this.create({
      subtotal,
      tax,
      tip,
      discount,
      total: subtotal + tax + tip - discount,
      ...overrides
    });
  }
}

/**
 * Create Payment Request Factory
 */
export class CreatePaymentRequestFactory extends SchemaFactory<CreatePaymentRequest, any> {
  constructor() {
    super('payment-request');
  }

  protected getSchema(): z.ZodSchema<CreatePaymentRequest> {
    return CreatePaymentRequestSchema.transform((data) => data) as z.ZodSchema<CreatePaymentRequest>;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return CreatePaymentRequestSchema;
  }

  protected getDefaults(): CreatePaymentRequest {
    return {
      amount: 2999, // $29.99 in cents
      currency: 'usd' as CurrencyCode,
      paymentMethodId: `pm_${this.getNextId()}`,
      confirmationMethod: 'automatic',
      returnUrl: 'https://example.com/return',
      metadata: {}
    };
  }

  /**
   * Create a minimal payment request
   */
  createMinimal(overrides: Partial<CreatePaymentRequest> = {}): CreatePaymentRequest {
    return this.create({
      amount: 100,
      currency: 'usd' as CurrencyCode,
      paymentMethodId: `pm_${this.getNextId()}`,
      confirmationMethod: undefined,
      returnUrl: undefined,
      metadata: undefined,
      ...overrides
    });
  }

  /**
   * Create a request with metadata
   */
  createWithMetadata(metadata: Record<string, string>, overrides: Partial<CreatePaymentRequest> = {}): CreatePaymentRequest {
    return this.create({
      metadata,
      ...overrides
    });
  }
}

// Export singleton instances for convenience
export const paymentFactory = new PaymentFactory();
export const paymentMethodFactory = new PaymentMethodFactory();
export const paymentIntentFactory = new PaymentIntentFactory();
export const paymentCalculationFactory = new PaymentCalculationFactory();
export const createPaymentRequestFactory = new CreatePaymentRequestFactory();

// Export helper functions for quick creation
export const createPayment = (overrides?: Partial<Payment>) => paymentFactory.create(overrides);
export const createPaymentMethod = (overrides?: Partial<PaymentMethod>) => paymentMethodFactory.create(overrides);
export const createPaymentIntent = (overrides?: Partial<PaymentIntent>) => paymentIntentFactory.create(overrides);
export const createPaymentCalculation = (overrides?: any) => paymentCalculationFactory.create(overrides);
export const createPaymentRequest = (overrides?: Partial<CreatePaymentRequest>) => createPaymentRequestFactory.create(overrides);