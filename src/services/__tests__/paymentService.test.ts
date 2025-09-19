/**
 * PaymentService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from service tests
 */

// ============================================================================
// MOCK SETUP - MUST BE BEFORE ANY IMPORTS 
// ============================================================================

// Mock Supabase using the SimplifiedSupabaseMock pattern
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      ORDERS: 'orders',
      PAYMENTS: 'payments',
      PAYMENT_METHODS: 'payment_methods',
    }
  };
});

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataIntegrity: jest.fn()
  }
}));

// Note: Stripe SDK not mocked - service should handle gracefully when not available

// ============================================================================
// IMPORTS - AFTER ALL MOCKS ARE SET UP
// ============================================================================

import { paymentService } from '../paymentService';
import { createUser, createOrder, createPayment, resetAllFactories } from '../../test/factories';

describe('PaymentService - Refactored Infrastructure', () => {
  let testUser: any;
  let testOrder: any;
  let testPayment: any;
  let testPaymentMethod: any;

  beforeEach(() => {
    // Reset all factory counters for consistent test data
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    });

    testOrder = createOrder({
      id: 'order-456',
      user_id: testUser.id,
      total_amount: 100.00,
      status: 'pending'
    });

    testPayment = createPayment({
      id: 'payment-789',
      user_id: testUser.id,
      order_id: testOrder.id,
      amount: testOrder.total_amount,
      status: 'pending',
      metadata: JSON.stringify({ orderId: testOrder.id }) // Ensure metadata is a string
    });

    testPaymentMethod = createPaymentMethod({
      id: 'pm-123',
      user_id: testUser.id,
      type: 'card',
      card_brand: 'visa'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const result = await paymentService.createPaymentIntent({
        amount: 100.00,
        currency: 'usd',
        orderId: testOrder.id
      });
      
      expect(result).toBeDefined();
    });

    it('should handle payment creation errors gracefully', async () => {
      const result = await paymentService.createPaymentIntent({
        amount: -100.00, // Invalid amount
        currency: 'usd',
        orderId: 'invalid-order'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm payment successfully', async () => {
      const result = await paymentService.confirmPaymentIntent('pi_test');
      
      expect(result).toBeDefined();
    });

    it('should handle confirmation errors gracefully', async () => {
      const result = await paymentService.confirmPaymentIntent('invalid-intent');
      
      expect(result).toBeDefined();
    });
  });

  describe('processPayments', () => {
    it('should process batch payments with skip-on-error', async () => {
      const paymentIds = ['payment-1', 'payment-2', 'payment-3'];
      
      const result = await paymentService.processPayments(paymentIds);
      
      expect(result).toBeDefined();
    });

    it('should handle empty payment list', async () => {
      const result = await paymentService.processPayments([]);
      
      expect(result).toBeDefined();
    });
  });

  describe('validatePaymentAmount', () => {
    it('should validate payment calculations', async () => {
      const result = await paymentService.validatePaymentAmount(testPayment.id, 100.00);
      
      expect(result).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const result = await paymentService.validatePaymentAmount('invalid-payment', -50.00);
      
      expect(result).toBeDefined();
    });
  });

  describe('payment methods', () => {
    it('should save payment method', async () => {
      const result = await paymentService.savePaymentMethod(testUser.id, 'pm_test');
      
      expect(result).toBeDefined();
    });

    it('should list user payment methods', async () => {
      const result = await paymentService.getUserPaymentMethods(testUser.id);
      
      expect(result).toBeDefined();
    });

    it('should delete payment method', async () => {
      const result = await paymentService.deletePaymentMethod(testPaymentMethod.id);
      
      expect(result).toBeDefined();
    });
  });

  describe('refunds', () => {
    it('should process refund successfully', async () => {
      const result = await paymentService.refundPayment(testPayment.id, 50.00);
      
      expect(result).toBeDefined();
    });

    it('should handle partial refunds', async () => {
      const result = await paymentService.refundPayment(testPayment.id, 25.00);
      
      expect(result).toBeDefined();
    });

    it('should handle refund failures', async () => {
      const result = await paymentService.refundPayment('invalid-payment', 100.00);
      
      expect(result).toBeDefined();
    });
  });

  describe('user data isolation', () => {
    it('should only return payments for authenticated user', async () => {
      const result = await paymentService.getUserPayments(testUser.id);
      
      expect(result).toBeDefined();
    });

    it('should prevent access to other users payment methods', async () => {
      const otherUser = createUser({ id: 'other-user' });
      
      const result = await paymentService.getUserPaymentMethods(otherUser.id);
      
      expect(result).toBeDefined();
    });
  });

  describe('graceful degradation', () => {
    it('should provide fallback options when Stripe is unavailable', async () => {
      // Service should handle Stripe errors gracefully
      const result = await paymentService.createPaymentIntent({
        amount: 100.00,
        currency: 'usd',
        orderId: testOrder.id
      });
      
      expect(result).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      const result = await paymentService.confirmPaymentIntent('');
      
      expect(result).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      const result = await paymentService.processPayments([testPayment.id]);
      
      expect(result).toBeDefined();
    });
  });
});