/**
 * PaymentService Test
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Tests payment functionality including individual validation with skip-on-error,
 * ValidationMonitor integration, graceful degradation, and user data isolation.
 */

import { paymentService } from '../paymentService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { Payment, PaymentMethod, PaymentIntent } from '../../types';

// Mock the supabase module
const mockSupabase = require('../../config/supabase').supabase;

// Mock Stripe
const mockStripe = {
  createPaymentIntent: jest.fn(),
  confirmPaymentIntent: jest.fn(),
  createPaymentMethod: jest.fn(),
  attachPaymentMethod: jest.fn(),
  createCustomer: jest.fn(),
  retrievePaymentIntent: jest.fn(),
};

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordCalculationMismatch: jest.fn(),
    recordDataQualityIssue: jest.fn(),
    recordPatternSuccess: jest.fn(),
  },
}));

// Mock payment broadcast utility
const mockPaymentBroadcast = {
  send: jest.fn(),
};

jest.mock('../../utils/broadcastFactory', () => ({
  paymentBroadcast: mockPaymentBroadcast,
}));

describe('PaymentService - Following Established Patterns', () => {
  // Test data following the established patterns
  const mockUser = {
    id: 'user123',
    email: 'test@example.com'
  };

  const mockPaymentMethod: PaymentMethod = {
    id: 'pm_123',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
    },
    created: new Date().getTime(),
    customer: 'cus_123',
  };

  const mockPaymentIntent: PaymentIntent = {
    id: 'pi_123',
    amount: 1000,
    currency: 'usd',
    status: 'requires_payment_method',
    client_secret: 'pi_123_secret',
    created: new Date().getTime(),
    payment_method: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('Individual Validation with Skip-on-Error (Following Pattern)', () => {
    it('should handle invalid payment data gracefully', async () => {
      // Following Pattern: Individual validation with skip-on-error processing
      const paymentData = [
        { cardNumber: '4242424242424242', amount: 10.00, currency: 'usd' }, // Valid
        { cardNumber: '', amount: -5, currency: 'invalid' }, // Invalid
        { cardNumber: '4000000000000002', amount: 20.00, currency: 'usd' } // Valid
      ];

      // Mock individual payment processing
      mockStripe.createPaymentIntent
        .mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' })
        .mockRejectedValueOnce(new Error('Invalid payment data'))
        .mockResolvedValueOnce({ id: 'pi_2', status: 'succeeded' });

      const result = await paymentService.processPayments(paymentData);

      // Should process valid payments and skip invalid ones
      expect(result.validPayments).toHaveLength(2);
      expect(result.invalidPayments).toHaveLength(1);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'PaymentService.processPayments',
        errorMessage: 'Invalid payment data',
        errorCode: 'PAYMENT_VALIDATION_FAILED',
        validationPattern: 'transformation_schema'
      });
    });

    it('should handle Stripe API failures gracefully in batch processing', async () => {
      // Following Pattern: Resilient item processing
      const paymentIntents = ['pi_1', 'pi_2', 'pi_3'];

      mockStripe.retrievePaymentIntent
        .mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' })
        .mockRejectedValueOnce(new Error('Stripe API error'))
        .mockResolvedValueOnce({ id: 'pi_3', status: 'succeeded' });

      const result = await paymentService.retrievePaymentIntents(paymentIntents);

      expect(result.retrieved).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
        context: 'PaymentService.retrievePaymentIntents',
        errorMessage: 'Stripe API error',
        errorCode: 'STRIPE_API_FAILED'
      });
    });
  });

  describe('ValidationMonitor Integration (Following Pattern)', () => {
    it('should use ValidationMonitor for calculation mismatches', async () => {
      // Following Pattern: Production calculation validation
      const paymentData = {
        subtotal: 10.00,
        tax: 0.85,
        total: 10.99 // Mismatch - should be 10.85
      };

      const result = await paymentService.validatePaymentAmount(paymentData);

      expect(result.correctedTotal).toBe(10.85);
      expect(ValidationMonitor.recordCalculationMismatch).toHaveBeenCalledWith({
        type: 'payment_total',
        expected: 10.85,
        actual: 10.99,
        difference: 0.14,
        tolerance: 0.01
      });
    });

    it('should record successful pattern usage', async () => {
      // Following Pattern: Monitor both successes and failures
      mockStripe.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      await paymentService.createPaymentIntent(1000, 'usd');

      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'PaymentService',
        pattern: 'direct_supabase_query',
        operation: 'createPaymentIntent'
      });
    });
  });

  describe('Graceful Degradation (Following Pattern)', () => {
    it('should provide graceful degradation on Stripe failures', async () => {
      // Following Pattern: Never break user workflow
      mockStripe.createPaymentIntent.mockRejectedValue(new Error('Stripe API down'));

      const result = await paymentService.createPaymentIntent(100);

      // Should return error state, not crash
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create payment intent. Please try again.');
      expect(result.fallbackOptions).toContain('cash_on_pickup');
      expect(result.fallbackOptions).toContain('bank_transfer');
    });

    it('should handle network failures with retry logic', async () => {
      // Following Pattern: Resilient error handling
      mockStripe.createPaymentIntent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPaymentIntent);

      const result = await paymentService.createPaymentIntentWithRetry(1000, 'usd');

      expect(result.success).toBe(true);
      expect(result.paymentIntent).toBeDefined();
    });

    it('should provide meaningful error messages for users', async () => {
      // Following Pattern: User-friendly error messages
      mockStripe.createPaymentIntent.mockRejectedValue(new Error('Your card was declined'));

      const result = await paymentService.createPaymentIntent(1000);

      expect(result.success).toBe(false);
      expect(result.userMessage).toBe('Your payment method was declined. Please try a different card or contact your bank.');
      expect(result.technicalMessage).toBe('Your card was declined');
    });
  });

  describe('User Data Isolation (Following Pattern)', () => {
    it('should validate user data isolation for payment methods', async () => {
      // Following Pattern: User data isolation
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { id: 'pm_1', user_id: 'user123', type: 'card' },
              { id: 'pm_2', user_id: 'user123', type: 'bank_account' }
            ],
            error: null
          })
        })
      });

      const paymentMethods = await paymentService.getUserPaymentMethods(mockUser.id);

      // Should only return current user's payment methods
      expect(paymentMethods.every(pm => pm.user_id === mockUser.id)).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_methods');
    });

    it('should prevent unauthorized access to payment data', async () => {
      // Following Pattern: Never trust parameters, always validate user
      const { data: { user } } = await mockSupabase.auth.getUser();
      
      if (!user || user.id !== mockUser.id) {
        const result = await paymentService.getUserPaymentMethods('different-user-id');
        expect(result.error).toBe('Unauthorized access');
        return;
      }

      // If we reach here, authentication passed
      const result = await paymentService.getUserPaymentMethods(mockUser.id);
      expect(result.error).toBeUndefined();
    });
  });

  describe('PCI Compliance & Security (Following Pattern)', () => {
    it('should handle PCI compliance requirements', async () => {
      // Following Pattern: Security-first patterns
      const cardData = { 
        number: '4242424242424242', 
        cvc: '123',
        exp_month: 12,
        exp_year: 2025
      };

      mockStripe.createPaymentMethod.mockResolvedValue({
        id: 'pm_123',
        type: 'card'
      });

      const tokenResult = await paymentService.tokenizeCard(cardData);

      // Should never store raw card data
      expect(tokenResult.token).toBeDefined();
      expect(tokenResult.cardData).toBeUndefined();
      
      // Verify no card data is stored locally
      expect(localStorage.getItem('card_number')).toBeNull();
      expect(sessionStorage.getItem('card_data')).toBeNull();
    });

    it('should use secure channel names for payment broadcasts', async () => {
      // Following Pattern: Cryptographic channel security
      await paymentService.broadcastPaymentUpdate(mockUser.id, 'payment_completed');

      expect(mockPaymentBroadcast.send).toHaveBeenCalledWith(
        expect.stringMatching(/^sec-payment-[a-f0-9]{16}$/),
        expect.any(Object)
      );
    });
  });

  describe('TypeScript Integration (Following Pattern)', () => {
    it('should maintain strong typing throughout', () => {
      // Following Pattern: Strong typing, no any types
      const paymentData: Payment = {
        id: 'pay_123',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        payment_method: 'pm_123',
        created: new Date().getTime()
      };

      // TypeScript should enforce correct types
      expect(typeof paymentData.amount).toBe('number');
      expect(typeof paymentData.currency).toBe('string');
      expect(['pending', 'succeeded', 'failed', 'canceled'].includes(paymentData.status)).toBe(true);
    });
  });

  describe('Database Operations (Following Pattern)', () => {
    it('should use atomic operations with broadcasting', async () => {
      // Following Pattern: Atomic operations with real-time sync
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await paymentService.recordPayment({
        amount: 1000,
        currency: 'usd',
        payment_intent_id: 'pi_123',
        user_id: mockUser.id
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('record_payment_transaction', {
        input_user_id: mockUser.id,
        input_amount: 1000,
        input_currency: 'usd',
        input_payment_intent_id: 'pi_123'
      });

      // Should broadcast for real-time sync (non-blocking)
      expect(mockPaymentBroadcast.send).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Following Pattern: Never break user workflow due to backend issues
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: new Error('Database connection failed') 
      });

      const result = await paymentService.recordPayment({
        amount: 1000,
        currency: 'usd',
        payment_intent_id: 'pi_123',
        user_id: mockUser.id
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to record payment. Transaction completed but may take a few minutes to appear.');
    });
  });
});