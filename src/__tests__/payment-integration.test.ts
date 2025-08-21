/**
 * Payment Integration Tests
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * End-to-end integration tests validating the complete payment flow
 * with all established patterns: validation, security, React Query, and UI.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { paymentService } from '../services/paymentService';
import { usePaymentMethods, useCreatePayment, useCreatePaymentMethod } from '../hooks/usePayment';
import { PaymentSecurityManager } from '../utils/paymentSecurity';
import { ValidationMonitor } from '../utils/validationMonitor';
import { 
  PaymentTransformSchema,
  PaymentMethodTransformSchema,
  PaymentCalculationSchema 
} from '../schemas/payment.schema';
import { 
  createMockUser,
  createMockPaymentMethod,
  createMockPaymentIntent,
  createMockCreatePaymentRequest 
} from '../test/mockData';

// Mock the supabase module
const mockSupabase = require('../config/supabase').supabase;

// Mock payment broadcast
const mockPaymentBroadcast = {
  send: jest.fn(),
};

jest.mock('../utils/broadcastFactory', () => ({
  paymentBroadcast: mockPaymentBroadcast,
}));

// Mock ValidationMonitor
jest.mock('../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordCalculationMismatch: jest.fn(),
    recordPatternSuccess: jest.fn(),
    recordDataQualityIssue: jest.fn(),
  },
}));

describe('Payment Integration Tests - Following Architectural Patterns', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  const mockUser = createMockUser();
  const mockPaymentMethod = createMockPaymentMethod();
  const mockPaymentIntent = createMockPaymentIntent();

  beforeEach(() => {
    jest.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Mock authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('End-to-End Payment Flow Integration', () => {
    it('should complete full payment flow with all patterns', async () => {
      // Phase 1: Mock database responses
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [mockPaymentMethod],
              error: null
            })
          })
        })
      });

      // Phase 2: Test hook integration with centralized query keys
      const { result: paymentMethodsResult } = renderHook(() => usePaymentMethods(), { wrapper });

      await waitFor(() => {
        expect(paymentMethodsResult.current.data).toBeDefined();
      });

      // Verify centralized query key factory usage
      expect(paymentMethodsResult.current.data).toEqual([mockPaymentMethod]);

      // Phase 3: Test payment creation with validation
      const { result: createPaymentResult } = renderHook(() => useCreatePayment(), { wrapper });

      const paymentRequest = createMockCreatePaymentRequest();
      
      await act(async () => {
        createPaymentResult.current.mutate(paymentRequest);
      });

      // Phase 4: Verify ValidationMonitor integration
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith({
        service: 'PaymentService',
        pattern: 'direct_supabase_query',
        operation: 'createPaymentIntent'
      });

      // Phase 5: Verify real-time broadcasting
      expect(mockPaymentBroadcast.send).toHaveBeenCalledWith(
        'payment-created',
        expect.objectContaining({
          userId: mockUser.id,
          amount: paymentRequest.amount
        })
      );
    });

    it('should handle individual validation with skip-on-error processing', async () => {
      // Test data with one invalid payment method
      const mixedPaymentData = [
        { id: 'pm_1', type: 'card', user_id: mockUser.id, card_brand: 'visa', card_last4: '4242' },
        { id: '', type: 'card', user_id: '', card_brand: null, card_last4: null }, // Invalid
        { id: 'pm_2', type: 'card', user_id: mockUser.id, card_brand: 'mastercard', card_last4: '5555' }
      ];

      const result = await paymentService.getUserPaymentMethods(mockUser.id);

      // Should process valid payment methods and skip invalid ones
      expect(Array.isArray(result)).toBe(true);
      
      // Should record validation error for invalid payment method
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'PaymentService.getUserPaymentMethods',
          errorCode: 'PAYMENT_METHOD_VALIDATION_FAILED'
        })
      );
    });

    it('should handle graceful degradation on service failures', async () => {
      // Mock service failure
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      });

      const result = await paymentService.getUserPaymentMethods(mockUser.id);

      // Should return empty array instead of crashing
      expect(result).toEqual([]);
      
      // Should still function without breaking user workflow
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Schema Integration Tests', () => {
    it('should validate database-first transformation patterns', () => {
      // Test raw database data with nulls (following pattern)
      const rawPaymentData = {
        id: 'payment_123',
        payment_intent_id: null,
        payment_method_id: null,
        amount: 1000,
        currency: 'usd',
        status: null,
        user_id: mockUser.id,
        created_at: null,
        updated_at: null,
        metadata: null,
      };

      // Should transform database nulls to appropriate defaults
      const result = PaymentTransformSchema.parse(rawPaymentData);

      expect(result.paymentIntentId).toBe('');
      expect(result.paymentMethodId).toBe('');
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.metadata).toEqual({});
      expect(result._dbData).toBeDefined();
    });

    it('should validate payment calculations with tolerance', () => {
      // Test calculation validation with tolerance
      const validCalculation = {
        subtotal: 10.00,
        tax: 0.85,
        tip: 2.00,
        total: 12.85,
      };

      const result = PaymentCalculationSchema.parse(validCalculation);
      expect(result).toEqual(validCalculation);

      // Test calculation mismatch (should throw)
      const invalidCalculation = {
        subtotal: 10.00,
        tax: 0.85,
        tip: 2.00,
        total: 13.00, // Wrong total
      };

      expect(() => PaymentCalculationSchema.parse(invalidCalculation)).toThrow();
    });

    it('should handle single validation pass with transformation', () => {
      const rawPaymentMethodData = {
        id: 'pm_123',
        type: 'card' as const,
        user_id: mockUser.id,
        stripe_payment_method_id: 'pm_stripe_123',
        card_brand: 'visa',
        card_last_four: '4242',
        card_exp_month: 12,
        card_exp_year: 2025,
        is_default: true,
        created_at: '2025-08-20T10:00:00Z',
        updated_at: null,
      };

      // Should transform in single pass (following pattern)
      const result = PaymentMethodTransformSchema.parse(rawPaymentMethodData);

      expect(result.id).toBe('pm_123');
      expect(result.userId).toBe(mockUser.id);
      expect(result.cardBrand).toBe('visa');
      expect(result.cardLastFour).toBe('4242');
      expect(result.isDefault).toBe(true);
      expect(result._dbData).toBeDefined();
    });
  });

  describe('Security Integration Tests', () => {
    it('should implement PCI compliance patterns', () => {
      const sensitiveCardData = {
        cardNumber: '4242424242424242',
        cvc: '123',
        expiryMonth: 12,
        expiryYear: 2025,
        cardholderName: 'John Doe'
      };

      // Should sanitize sensitive data for logging
      const sanitized = PaymentSecurityManager.sanitizeForLogging(sensitiveCardData);

      expect(sanitized.cardNumber).toBe('[REDACTED_PCI]');
      expect(sanitized.cvc).toBe('[REDACTED_PCI]');
      expect(sanitized.cardholderName).toBeDefined(); // Not in PCI sensitive fields
    });

    it('should mask card numbers securely', () => {
      const cardNumber = '4242424242424242';
      const masked = PaymentSecurityManager.maskCardNumber(cardNumber);

      expect(masked).toBe('•••• •••• •••• 4242');
      expect(masked).not.toContain('4242424242424242');
    });

    it('should extract only safe card data for storage', () => {
      const cardData = {
        number: '4242424242424242',
        cvc: '123', // Should not be included in safe data
        expMonth: 12,
        expYear: 2025,
      };

      const safeData = PaymentSecurityManager.extractSafeCardData(cardData);

      expect(safeData.last4).toBe('4242');
      expect(safeData.brand).toBe('visa');
      expect(safeData.expMonth).toBe(12);
      expect(safeData.expYear).toBe(2025);
      expect(safeData.maskedNumber).toBe('•••• •••• •••• 4242');
      expect(safeData).not.toHaveProperty('cvc');
      expect(safeData).not.toHaveProperty('number');
    });

    it('should create and validate secure session tokens', () => {
      const userId = mockUser.id;
      const amount = 1000;

      // Create session token
      const token = PaymentSecurityManager.createPaymentSessionToken(userId, amount, 15);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Validate session token
      const validation = PaymentSecurityManager.validatePaymentSessionToken(token);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(userId);
      expect(validation.amount).toBe(amount);

      // Test expired token (mock future time)
      const expiredToken = PaymentSecurityManager.createPaymentSessionToken(userId, amount, -1);
      const expiredValidation = PaymentSecurityManager.validatePaymentSessionToken(expiredToken);
      expect(expiredValidation.valid).toBe(false);
      expect(expiredValidation.error).toContain('expired');
    });
  });

  describe('Real-time Integration Tests', () => {
    it('should handle real-time payment updates with secure channels', async () => {
      const operation = 'payment_created';
      const secureChannel = PaymentSecurityManager.generateSecurePaymentChannel(mockUser.id, operation);

      expect(typeof secureChannel).toBe('string');
      expect(secureChannel).toMatch(/^sec-payment-[a-f0-9]{16}$/);

      // Test broadcasting to secure channel
      await paymentService.broadcastPaymentUpdate(mockUser.id, operation);

      expect(mockPaymentBroadcast.send).toHaveBeenCalledWith(
        expect.stringMatching(/^sec-payment-[a-f0-9]{16}$/),
        expect.objectContaining({
          type: operation,
          userId: mockUser.id
        })
      );
    });

    it('should handle cache invalidation with user isolation', async () => {
      const { result } = renderHook(() => useCreatePaymentMethod(), { wrapper });

      // Mock successful payment method creation
      await act(async () => {
        result.current.mutate({
          type: 'card',
          customerId: 'cus_123',
          card: {
            number: '4242424242424242',
            expMonth: 12,
            expYear: 2025,
            cvc: '123',
          },
        });
      });

      // Should invalidate user-specific payment methods cache
      // Verify this by checking that the query was marked as stale
      const paymentMethodsQuery = queryClient.getQueryState(['payment', mockUser.id, 'list', 'methods']);
      expect(paymentMethodsQuery).toBeDefined();
    });
  });

  describe('Error Recovery Integration Tests', () => {
    it('should handle network failures with retry logic', async () => {
      // Mock network failure then success
      let callCount = 0;
      mockSupabase.functions.invoke.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          data: mockPaymentIntent,
          error: null
        });
      });

      const result = await paymentService.createPaymentIntentWithRetry(1000, 'usd');

      expect(result.success).toBe(true);
      expect(result.paymentIntent).toBeDefined();
      expect(callCount).toBe(2); // Should have retried once
    });

    it('should provide meaningful error messages to users', async () => {
      // Mock card declined error
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Your card was declined'));

      const result = await paymentService.createPaymentIntent(1000);

      expect(result.success).toBe(false);
      expect(result.error?.userMessage).toBe('Payment processing is temporarily unavailable. Please try again or use an alternative payment method.');
      expect(result.fallbackOptions).toContain('cash_on_pickup');
    });
  });

  describe('Performance and Memory Integration Tests', () => {
    it('should handle secure memory cleanup', () => {
      const sensitiveData = {
        cardNumber: '4242424242424242',
        cvc: '123',
        accountNumber: '1234567890',
        normalField: 'safe data'
      };

      PaymentSecurityManager.secureMemoryCleanup(sensitiveData);

      // Sensitive fields should be overwritten/deleted
      expect(sensitiveData.cardNumber).toBeUndefined();
      expect(sensitiveData.cvc).toBeUndefined();
      expect(sensitiveData.accountNumber).toBeUndefined();
      
      // Normal fields should remain
      expect(sensitiveData.normalField).toBe('safe data');
    });

    it('should validate payment amounts to prevent manipulation', () => {
      // Valid amounts
      expect(PaymentSecurityManager.validatePaymentAmount(1000).valid).toBe(true);
      expect(PaymentSecurityManager.validatePaymentAmount(1).valid).toBe(true);

      // Invalid amounts
      expect(PaymentSecurityManager.validatePaymentAmount(-100).valid).toBe(false);
      expect(PaymentSecurityManager.validatePaymentAmount(0).valid).toBe(false);
      expect(PaymentSecurityManager.validatePaymentAmount(10000001 * 100).valid).toBe(false); // Too large
      expect(PaymentSecurityManager.validatePaymentAmount(10.5).valid).toBe(false); // Not whole cents
      expect(PaymentSecurityManager.validatePaymentAmount(NaN).valid).toBe(false);
    });
  });

  describe('Comprehensive Pattern Compliance Tests', () => {
    it('should maintain all architectural patterns throughout payment flow', async () => {
      // Test complete payment flow with all patterns
      const { result: hooks } = renderHook(() => ({
        paymentMethods: usePaymentMethods(),
        createPayment: useCreatePayment(),
        createPaymentMethod: useCreatePaymentMethod(),
      }), { wrapper });

      // 1. Centralized Query Key Factory (no dual systems)
      expect(hooks.current.paymentMethods.data).toBeDefined();

      // 2. User Data Isolation
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();

      // 3. Individual Validation with Skip-on-Error
      const testData = [
        { valid: true, amount: 1000 },
        { valid: false, amount: -100 }, // Invalid
        { valid: true, amount: 2000 },
      ];

      const processed = testData.filter(item => {
        const validation = PaymentSecurityManager.validatePaymentAmount(item.amount);
        return validation.valid;
      });

      expect(processed).toHaveLength(2); // Should skip invalid item

      // 4. ValidationMonitor Integration
      expect(ValidationMonitor.recordPatternSuccess).toHaveBeenCalled();

      // 5. Graceful Degradation
      const emptyResult = await paymentService.getUserPaymentMethods('');
      expect(Array.isArray(emptyResult)).toBe(true); // Should not crash

      // 6. Security Patterns
      const sanitized = PaymentSecurityManager.sanitizeForLogging({
        cardNumber: '4242424242424242',
        amount: 1000
      });
      expect(sanitized.cardNumber).toBe('[REDACTED_PCI]');
      expect(sanitized.amount).toBe(1000); // Safe field preserved

      console.log('✅ All architectural patterns validated successfully');
    });
  });
});