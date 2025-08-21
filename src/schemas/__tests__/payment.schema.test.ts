/**
 * Payment Schema Tests
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Tests database-first validation, transformation schemas, and single validation pass principles.
 * Following patterns from cart.schema.test.ts and other established schema tests.
 */

import { z } from 'zod';
import {
  RawDbPaymentSchema,
  PaymentTransformSchema,
  PaymentMethodTransformSchema,
  PaymentIntentTransformSchema,
  PaymentOperationResponseSchema,
  PaymentCalculationSchema,
  CreatePaymentRequestSchema,
  UpdatePaymentStatusRequestSchema,
} from '../payment.schema';

describe('Payment Schema Validation - Following Established Patterns', () => {
  describe('Database-First Validation (Following Pattern)', () => {
    it('should handle database nulls gracefully', () => {
      // Following Pattern: Database-first validation - handle nullable fields
      const rawPaymentData = {
        id: 'payment_123',
        payment_intent_id: null, // Database allows null
        payment_method_id: null, // Database allows null
        amount: 1000,
        currency: 'usd',
        status: null, // Database allows null
        user_id: 'user_123',
        created_at: null, // Database allows null
        updated_at: null, // Database allows null
        metadata: null, // Database allows null
      };

      const result = PaymentTransformSchema.parse(rawPaymentData);

      // Should transform nulls to appropriate defaults
      expect(result.paymentIntentId).toBe('');
      expect(result.paymentMethodId).toBe('');
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.metadata).toEqual({});
    });

    it('should validate required fields from database', () => {
      // Following Pattern: Validate against database reality
      const invalidData = {
        // Missing required id
        payment_intent_id: 'pi_123',
        amount: 1000,
        currency: 'usd',
        user_id: 'user_123'
      };

      expect(() => PaymentTransformSchema.parse(invalidData)).toThrow();
    });

    it('should handle empty strings as valid nullable fields', () => {
      // Following Pattern: Handle various forms of "empty" data
      const dataWithEmptyStrings = {
        id: 'payment_123',
        payment_intent_id: '', // Empty string instead of null
        payment_method_id: '',
        amount: 1000,
        currency: 'usd',
        status: '',
        user_id: 'user_123',
        created_at: '',
        updated_at: '',
        metadata: null,
      };

      const result = PaymentTransformSchema.parse(dataWithEmptyStrings);

      expect(result.paymentIntentId).toBe('');
      expect(result.paymentMethodId).toBe('');
      expect(result.status).toBe('pending'); // Default for empty status
    });
  });

  describe('Single Validation Pass with Transformation (Following Pattern)', () => {
    it('should transform snake_case to camelCase in one pass', () => {
      // Following Pattern: Single validation + transformation
      const dbData = {
        id: 'payment_123',
        payment_intent_id: 'pi_123',
        payment_method_id: 'pm_456',
        client_secret: 'pi_123_secret',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        user_id: 'user_123',
        created_at: '2025-08-20T10:00:00Z',
        updated_at: '2025-08-20T10:30:00Z',
        metadata: '{"order_id": "order_123"}',
      };

      const result = PaymentTransformSchema.parse(dbData);

      // Should convert snake_case to camelCase
      expect(result.paymentIntentId).toBe('pi_123');
      expect(result.paymentMethodId).toBe('pm_456');
      expect(result.clientSecret).toBe('pi_123_secret');
      expect(result.userId).toBe('user_123');
      expect(result.createdAt).toBe('2025-08-20T10:00:00Z');
      expect(result.updatedAt).toBe('2025-08-20T10:30:00Z');
    });

    it('should parse JSON metadata safely', () => {
      // Following Pattern: Safe data transformation
      const validJsonData = {
        id: 'payment_123',
        amount: 1000,
        currency: 'usd',
        user_id: 'user_123',
        metadata: '{"order_id": "order_123", "customer_note": "Rush order"}',
      };

      const invalidJsonData = {
        id: 'payment_124',
        amount: 1000,
        currency: 'usd',
        user_id: 'user_123',
        metadata: 'invalid json{',
      };

      const validResult = PaymentTransformSchema.parse(validJsonData);
      expect(validResult.metadata).toEqual({
        order_id: 'order_123',
        customer_note: 'Rush order'
      });

      const invalidResult = PaymentTransformSchema.parse(invalidJsonData);
      expect(invalidResult.metadata).toEqual({}); // Should fallback to empty object
    });
  });

  describe('Debug Metadata Inclusion (Following Pattern)', () => {
    it('should include debug metadata for troubleshooting', () => {
      // Following Pattern: Include metadata for debugging/monitoring
      const rawData = {
        id: 'payment_123',
        payment_intent_id: 'pi_123',
        payment_method_id: null,
        amount: 1000,
        currency: 'usd',
        status: 'processing',
        user_id: 'user_123',
        created_at: '2025-08-20T10:00:00Z',
        updated_at: null,
      };

      const result = PaymentTransformSchema.parse(rawData);

      expect(result._dbData).toBeDefined();
      expect(result._dbData.originalPaymentIntent).toBe('pi_123');
      expect(result._dbData.originalPaymentMethod).toBeNull();
      expect(result._dbData.originalStatus).toBe('processing');
      expect(result._dbData.rawUpdatedAt).toBeNull();
    });
  });

  describe('Payment Method Schema (Following Pattern)', () => {
    it('should handle card payment method data', () => {
      const cardPaymentMethodData = {
        id: 'pm_123',
        type: 'card',
        card_brand: 'visa',
        card_last4: '4242',
        card_exp_month: 12,
        card_exp_year: 2025,
        customer_id: 'cus_123',
        user_id: 'user_123',
        is_default: true,
        created_at: '2025-08-20T10:00:00Z',
      };

      const result = PaymentMethodTransformSchema.parse(cardPaymentMethodData);

      expect(result.type).toBe('card');
      expect(result.card).toEqual({
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      });
      expect(result.customerId).toBe('cus_123');
      expect(result.isDefault).toBe(true);
    });

    it('should handle bank account payment method data', () => {
      const bankPaymentMethodData = {
        id: 'pm_124',
        type: 'us_bank_account',
        bank_account_last4: '6789',
        bank_account_routing_number: '110000000',
        bank_account_account_type: 'checking',
        customer_id: 'cus_123',
        user_id: 'user_123',
        is_default: false,
        created_at: '2025-08-20T10:00:00Z',
      };

      const result = PaymentMethodTransformSchema.parse(bankPaymentMethodData);

      expect(result.type).toBe('us_bank_account');
      expect(result.bankAccount).toEqual({
        last4: '6789',
        routingNumber: '110000000',
        accountType: 'checking',
      });
      expect(result.card).toBeUndefined();
    });
  });

  describe('Payment Intent Schema (Following Pattern)', () => {
    it('should transform payment intent data correctly', () => {
      const paymentIntentData = {
        id: 'pi_123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_123_secret',
        payment_method_id: null,
        confirmation_method: 'automatic',
        created_at: '2025-08-20T10:00:00Z',
        metadata: '{"order_id": "order_123"}',
      };

      const result = PaymentIntentTransformSchema.parse(paymentIntentData);

      expect(result.amount).toBe(1000);
      expect(result.currency).toBe('usd');
      expect(result.status).toBe('requires_payment_method');
      expect(result.clientSecret).toBe('pi_123_secret');
      expect(result.paymentMethodId).toBe('');
      expect(result.confirmationMethod).toBe('automatic');
      expect(result.metadata).toEqual({ order_id: 'order_123' });
    });
  });

  describe('Calculation Validation (Following Pattern)', () => {
    it('should validate payment calculations with tolerance', () => {
      // Following Pattern: Calculation validation with tolerance
      const validCalculation = {
        subtotal: 10.00,
        tax: 0.85,
        tip: 2.00,
        total: 12.85,
      };

      const result = PaymentCalculationSchema.parse(validCalculation);
      expect(result).toEqual(validCalculation);
    });

    it('should detect calculation mismatches', () => {
      // Following Pattern: Detect calculation errors
      const invalidCalculation = {
        subtotal: 10.00,
        tax: 0.85,
        tip: 2.00,
        total: 13.00, // Should be 12.85
      };

      expect(() => PaymentCalculationSchema.parse(invalidCalculation)).toThrow(
        'Total must equal subtotal + tax + tip'
      );
    });

    it('should allow small floating point differences', () => {
      // Following Pattern: Tolerance for floating point arithmetic
      const calculationWithRounding = {
        subtotal: 10.00,
        tax: 0.853, // This creates floating point precision issues
        tip: 2.00,
        total: 12.85, // Rounds to this
      };

      // Should pass due to tolerance
      const result = PaymentCalculationSchema.parse(calculationWithRounding);
      expect(result.total).toBe(12.85);
    });
  });

  describe('Request/Response Schema Validation (Following Pattern)', () => {
    it('should validate create payment request', () => {
      const createPaymentRequest = {
        amount: 1000,
        currency: 'usd',
        payment_method_id: 'pm_123',
        confirmation_method: 'automatic',
        metadata: {
          order_id: 'order_123',
          customer_note: 'Rush delivery'
        }
      };

      const result = CreatePaymentRequestSchema.parse(createPaymentRequest);
      expect(result.amount).toBe(1000);
      expect(result.currency).toBe('usd');
      expect(result.paymentMethodId).toBe('pm_123');
    });

    it('should validate payment operation response', () => {
      const successResponse = {
        success: true,
        payment: {
          id: 'payment_123',
          amount: 1000,
          currency: 'usd',
          status: 'succeeded',
        },
        message: 'Payment processed successfully'
      };

      const result = PaymentOperationResponseSchema.parse(successResponse);
      expect(result.success).toBe(true);
      expect(result.payment).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should validate error response', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'CARD_DECLINED',
          message: 'Your card was declined',
          userMessage: 'Please try a different payment method'
        }
      };

      const result = PaymentOperationResponseSchema.parse(errorResponse);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.payment).toBeUndefined();
    });
  });

  describe('Array Processing (Following Pattern)', () => {
    it('should handle arrays of payment data', () => {
      // Following Pattern: Bulk operations with individual validation
      const paymentsArray = [
        {
          id: 'payment_1',
          amount: 1000,
          currency: 'usd',
          status: 'succeeded',
          user_id: 'user_123',
        },
        {
          id: 'payment_2',
          amount: 2000,
          currency: 'usd',
          status: 'pending',
          user_id: 'user_123',
        }
      ];

      const results = paymentsArray.map(payment => 
        PaymentTransformSchema.parse(payment)
      );

      expect(results).toHaveLength(2);
      expect(results[0].amount).toBe(1000);
      expect(results[1].amount).toBe(2000);
    });
  });

  describe('Edge Cases and Error Handling (Following Pattern)', () => {
    it('should handle extremely large amounts', () => {
      const largeAmountData = {
        id: 'payment_large',
        amount: 999999999, // $9,999,999.99
        currency: 'usd',
        user_id: 'user_123',
      };

      const result = PaymentTransformSchema.parse(largeAmountData);
      expect(result.amount).toBe(999999999);
    });

    it('should reject negative amounts', () => {
      const negativeAmountData = {
        id: 'payment_negative',
        amount: -1000,
        currency: 'usd',
        user_id: 'user_123',
      };

      expect(() => PaymentTransformSchema.parse(negativeAmountData)).toThrow();
    });

    it('should validate currency codes', () => {
      const validCurrencies = ['usd', 'eur', 'gbp', 'cad'];
      const invalidCurrency = 'xyz';

      validCurrencies.forEach(currency => {
        const data = {
          id: 'payment_currency_test',
          amount: 1000,
          currency,
          user_id: 'user_123',
        };

        expect(() => PaymentTransformSchema.parse(data)).not.toThrow();
      });

      const invalidData = {
        id: 'payment_invalid_currency',
        amount: 1000,
        currency: invalidCurrency,
        user_id: 'user_123',
      };

      expect(() => PaymentTransformSchema.parse(invalidData)).toThrow();
    });
  });
});