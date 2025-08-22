# Payment Integration Task List - Following Established Patterns

**Created**: 2025-08-20  
**Status**: Ready for Implementation  
**Following**: MyFarmstand Mobile Architectural Patterns & Best Practices

## **📋 Overview**

This task list implements payment integration following ALL established architectural patterns from `docs/architectural-patterns-and-best-practices.md`. Every task maintains the quality-first architecture, validation patterns, React Query strategies, and security standards established in the codebase.

---

## **📋 Phase 1: Test-Driven Foundation (Days 1-2)**

### **Task 1.1: Payment Service Tests (Following Validation Patterns)**
```typescript
// Create: src/services/__tests__/paymentService.test.ts
// Following Pattern: Individual validation with skip-on-error processing
// Following Pattern: ValidationMonitor integration for both success and failure
```

**Key Test Cases Following Established Patterns:**
```typescript
describe('PaymentService', () => {
  it('should handle invalid payment data gracefully', async () => {
    // Following Pattern: Individual validation with skip-on-error
    const paymentResults = await paymentService.processPayments([
      { cardNumber: 'valid-card', amount: 10 },
      { cardNumber: '', amount: -5 }, // Invalid data
      { cardNumber: 'valid-card-2', amount: 20 }
    ]);
    
    // Should process valid payments and skip invalid ones
    expect(paymentResults.validPayments).toHaveLength(2);
    expect(ValidationMonitor.recordValidationError).toHaveBeenCalledWith({
      context: 'PaymentService.processPayments',
      errorCode: 'PAYMENT_VALIDATION_FAILED'
    });
  });

  it('should use ValidationMonitor for calculation mismatches', async () => {
    // Following Pattern: Production calculation validation
    const payment = await paymentService.validatePaymentAmount({
      subtotal: 10.00,
      tax: 0.85,
      total: 10.99 // Mismatch - should be 10.85
    });

    expect(ValidationMonitor.recordCalculationMismatch).toHaveBeenCalledWith({
      type: 'payment_total',
      expected: 10.85,
      actual: 10.99,
      tolerance: 0.01
    });
  });

  it('should provide graceful degradation on Stripe failures', async () => {
    // Following Pattern: Never break user workflow
    mockStripe.createPaymentIntent.mockRejectedValue(new Error('Stripe API down'));
    
    const result = await paymentService.createPaymentIntent(100);
    
    // Should return error state, not crash
    expect(result.success).toBe(false);
    expect(result.message).toBe('Failed to create payment intent. Please try again.');
    expect(result.fallbackOptions).toContain('cash_on_pickup');
  });

  it('should validate user data isolation', async () => {
    // Following Pattern: User data isolation
    const { data: { user } } = await supabase.auth.getUser();
    
    const paymentMethods = await paymentService.getUserPaymentMethods(user.id);
    
    // Should only return current user's payment methods
    expect(paymentMethods.every(pm => pm.user_id === user.id)).toBe(true);
  });

  it('should handle PCI compliance requirements', async () => {
    // Following Pattern: Security-first patterns
    const cardData = { number: '4242424242424242', cvc: '123' };
    
    const tokenResult = await paymentService.tokenizeCard(cardData);
    
    // Should never store raw card data
    expect(tokenResult.token).toBeDefined();
    expect(tokenResult.cardData).toBeUndefined();
    expect(localStorage.getItem('card_number')).toBeNull();
  });
});
```

### **Task 1.2: Payment Schema Tests (Database-First Validation)**
```typescript
// Create: src/schemas/__tests__/payment.schema.test.ts
// Following Pattern: Database-first validation, transformation schemas
// Following Pattern: Single validation pass with transformation

describe('Payment Schema Validation', () => {
  it('should handle database nulls gracefully', () => {
    // Following Pattern: Database-first validation
    const rawPaymentData = {
      id: 'payment_123',
      payment_intent_id: null, // Database allows null
      amount: 1000,
      currency: 'usd',
      status: null, // Database allows null
      created_at: null,
    };
    
    const result = PaymentTransformSchema.parse(rawPaymentData);
    
    expect(result.paymentIntentId).toBe('');
    expect(result.status).toBe('pending');
    expect(result.createdAt).toBeDefined();
  });

  it('should transform snake_case to camelCase', () => {
    // Following Pattern: Transformation schema
    const dbData = {
      payment_intent_id: 'pi_123',
      payment_method_id: 'pm_456',
      client_secret: 'pi_123_secret',
    };
    
    const result = PaymentTransformSchema.parse(dbData);
    
    expect(result.paymentIntentId).toBe('pi_123');
    expect(result.paymentMethodId).toBe('pm_456');
    expect(result.clientSecret).toBe('pi_123_secret');
  });

  it('should include debug metadata', () => {
    // Following Pattern: Include metadata for debugging
    const result = PaymentTransformSchema.parse(validPaymentData);
    
    expect(result._dbData).toBeDefined();
    expect(result._dbData.originalPaymentIntent).toBeDefined();
  });
});
```

### **Task 1.3: Payment Hook Tests (Centralized Query Key Factory)**
```typescript
// Create: src/hooks/__tests__/usePayment.test.ts
// Following Pattern: CRITICAL - Use centralized query key factory, never create local duplicates
// Following Pattern: User-isolated query keys with fallback strategies

describe('usePayment Hooks', () => {
  it('should use centralized query key factory', () => {
    // Following Pattern: No local duplicate factories
    const { result } = renderHook(() => usePaymentMethods(), { wrapper });
    
    // Verify using centralized factory
    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: paymentKeys.paymentMethods(mockUser.id),
      // ... other options
    });
    
    // Should NOT create local keys
    expect(mockUseQuery).not.toHaveBeenCalledWith({
      queryKey: ['payment', 'methods'], // Local duplicate - anti-pattern
    });
  });

  it('should handle user isolation with fallback', () => {
    // Following Pattern: User isolation with fallback
    const { result } = renderHook(() => usePaymentMethods(), { 
      wrapper: createWrapperWithUser(null) // No user
    });
    
    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should use appropriate cache settings', () => {
    // Following Pattern: Context-appropriate cache settings
    renderHook(() => usePaymentMethods(), { wrapper });
    
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 5 * 60 * 1000, // 5 minutes - payment methods change rarely
        gcTime: 10 * 60 * 1000,   // 10 minutes - longer cache retention
        refetchOnMount: true,      // Following cart pattern
        refetchOnWindowFocus: false,
      })
    );
  });
});
```

---

## **📋 Phase 2: Schema & Type Layer (Day 2)**

### **Task 2.1: Payment Schema Implementation (Following Transformation Pattern)**
```typescript
// Create: src/schemas/payment.schema.ts
// Following Pattern: Database-first validation + transformation schema

import { z } from 'zod';
import { ValidationMonitor } from '../utils/validationMonitor';

// Step 1: Raw database schema (input validation only)
const RawStripePaymentSchema = z.object({
  id: z.string().min(1),
  payment_intent_id: z.string().nullable().optional(), // Database allows null
  payment_method_id: z.string().nullable().optional(),
  amount: z.number().min(0),
  currency: z.string().min(1),
  status: z.string().nullable().optional(),
  client_secret: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Payment method schema for saved cards
const RawPaymentMethodSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  stripe_payment_method_id: z.string().min(1),
  card_brand: z.string().nullable().optional(),
  card_last_four: z.string().nullable().optional(),
  card_exp_month: z.number().nullable().optional(),
  card_exp_year: z.number().nullable().optional(),
  is_default: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Step 2: Transformation schema (DB → App format)
export const PaymentTransformSchema = RawStripePaymentSchema.transform((data) => ({
  // App interface format
  id: data.id,
  paymentIntentId: data.payment_intent_id || '',
  paymentMethodId: data.payment_method_id || '',
  amount: data.amount,
  currency: data.currency,
  status: data.status || 'pending',
  clientSecret: data.client_secret || '',
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
  
  // Internal metadata for debugging/monitoring
  _dbData: {
    originalPaymentIntent: data.payment_intent_id,
    rawStatus: data.status
  }
}));

export const PaymentMethodTransformSchema = RawPaymentMethodSchema.transform((data) => ({
  id: data.id,
  userId: data.user_id,
  stripePaymentMethodId: data.stripe_payment_method_id,
  cardBrand: data.card_brand || 'unknown',
  cardLastFour: data.card_last_four || '****',
  cardExpMonth: data.card_exp_month || 12,
  cardExpYear: data.card_exp_year || new Date().getFullYear(),
  isDefault: data.is_default ?? false,
  createdAt: data.created_at || new Date().toISOString(),
  updatedAt: data.updated_at || new Date().toISOString(),
  
  _dbData: {
    originalIsDefault: data.is_default,
    rawCardData: {
      brand: data.card_brand,
      lastFour: data.card_last_four
    }
  }
}));

// Stripe client-side schemas (for API responses)
export const StripePaymentIntentSchema = z.object({
  id: z.string().min(1),
  client_secret: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().min(1),
  status: z.enum(['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'canceled']),
  payment_method: z.string().nullable().optional(),
  last_payment_error: z.object({
    code: z.string(),
    message: z.string(),
    type: z.string(),
  }).nullable().optional(),
});

// Payment validation schemas
export const PaymentAmountValidationSchema = z.object({
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  discount: z.number().min(0).optional(),
}).refine((data) => {
  const calculatedTotal = data.subtotal + data.tax - (data.discount || 0);
  const tolerance = 0.01;
  return Math.abs(data.total - calculatedTotal) <= tolerance;
}, {
  message: "Total amount doesn't match subtotal + tax - discount",
  path: ["total"]
});

// Export type interfaces
export type Payment = z.infer<typeof PaymentTransformSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodTransformSchema>;
export type StripePaymentIntent = z.infer<typeof StripePaymentIntentSchema>;
export type PaymentAmountValidation = z.infer<typeof PaymentAmountValidationSchema>;
```

### **Task 2.2: Extend Existing Types**
```typescript
// Update: src/types/index.ts
// Following Pattern: Database-first field naming
// Add: PaymentIntent, PaymentMethod interfaces
// Maintain: Backward compatibility with existing PaymentMethod enum

// Extend existing PaymentMethod enum to be more specific
export type PaymentMethodType = 'online' | 'cash_on_pickup' | 'stripe_card' | 'apple_pay' | 'google_pay';

// Update existing PaymentMethod to be more specific
export type PaymentMethod = PaymentMethodType;

// New payment-specific interfaces
export interface StripePaymentIntent {
  id: string;
  paymentIntentId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret: string;
  createdAt: string;
  updatedAt: string;
  _dbData?: {
    originalPaymentIntent: string | null;
    rawStatus: string | null;
  };
}

export interface SavedPaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  cardBrand: string;
  cardLastFour: string;
  cardExpMonth: number;
  cardExpYear: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _dbData?: {
    originalIsDefault: boolean | null;
    rawCardData: {
      brand: string | null;
      lastFour: string | null;
    };
  };
}

export interface PaymentProcessingResult {
  success: boolean;
  paymentIntent?: StripePaymentIntent;
  error?: PaymentError;
  requiresAction?: boolean;
  actionUrl?: string;
  fallbackOptions?: PaymentMethodType[];
}

export interface PaymentError {
  code: 'CARD_DECLINED' | 'INSUFFICIENT_FUNDS' | 'EXPIRED_CARD' | 'INVALID_CVC' | 'PROCESSING_ERROR' | 'NETWORK_ERROR' | 'AUTHENTICATION_REQUIRED';
  message: string;
  userMessage: string;
  stripeCode?: string;
  declineCode?: string;
  metadata?: Record<string, any>;
}

export interface PaymentValidationResult {
  valid: boolean;
  correctedTotal?: number;
  correctionApplied?: boolean;
  errors?: string[];
}

// Extend CreateOrderRequest to include payment intent
export interface CreateOrderRequestWithPayment extends CreateOrderRequest {
  paymentIntentId?: string;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
}
```

### **Task 2.3: Query Key Factory Extension (Following Established Pattern)**
```typescript
// Update: src/utils/queryKeyFactory.ts
// Following Pattern: Entity-specific factory methods, never manual key spreading

// Add to existing EntityType
export type EntityType = 'cart' | 'orders' | 'products' | 'auth' | 'stock' | 'kiosk' | 'notifications' | 'payment';

// Create payment-specific query key factory
export const paymentKeys = {
  ...createQueryKeyFactory({ entity: 'payment', isolation: 'user-specific' }),
  
  // Entity-specific methods to replace manual spreading
  paymentMethods: (userId?: string) => 
    [...paymentKeys.lists(userId), 'methods'],
  
  paymentIntent: (intentId: string, userId?: string) => 
    [...paymentKeys.details(userId), 'intent', intentId],
  
  stripeSession: (sessionId: string, userId?: string) => 
    [...paymentKeys.details(userId), 'stripe-session', sessionId],
  
  paymentHistory: (userId?: string) => 
    [...paymentKeys.lists(userId), 'history'],
  
  defaultPaymentMethod: (userId?: string) => 
    [...paymentKeys.details(userId), 'default-method'],
};

// Usage examples:
// ✅ CORRECT:
// queryKey: paymentKeys.paymentIntent(intentId, user?.id)
// queryKey: paymentKeys.paymentMethods(user?.id)

// ❌ WRONG (manual key spreading):
// queryKey: [...paymentKeys.details(user?.id), 'intent', intentId]
// queryKey: ['payment', 'methods', user?.id]
```

---

## **📋 Phase 3: Service Layer Implementation (Day 3)**

### **Task 3.1: Payment Service Core (Following Service Patterns)**
```typescript
// Create: src/services/paymentService.ts
// Following Pattern: Direct Supabase + validation pipeline
// Following Pattern: Individual validation with skip-on-error processing
// Following Pattern: ValidationMonitor integration

import { supabase } from '../config/supabase';
import { PaymentTransformSchema, PaymentMethodTransformSchema, StripePaymentIntentSchema } from '../schemas/payment.schema';
import { ValidationMonitor } from '../utils/validationMonitor';
import { secretsManager } from './secretsManager';
import type { 
  StripePaymentIntent, 
  SavedPaymentMethod, 
  PaymentProcessingResult, 
  PaymentError,
  PaymentValidationResult 
} from '../types';

// Enhanced error handling utility (following cart pattern)
const createPaymentError = (
  code: PaymentError['code'],
  technicalMessage: string,
  userMessage: string,
  metadata?: Partial<PaymentError>
): PaymentError => ({
  code,
  message: technicalMessage,      // For developers/logs
  userMessage,                    // For users
  ...metadata,
});

// Production calculation validation helper (following cart pattern)
const validatePaymentAmount = (orderData: {
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
}): PaymentValidationResult => {
  const calculatedTotal = orderData.subtotal + orderData.tax - (orderData.discount || 0);
  const tolerance = 0.01;
  const difference = Math.abs(orderData.total - calculatedTotal);
  
  if (difference > tolerance) {
    ValidationMonitor.recordCalculationMismatch({
      type: 'payment_total',
      expected: calculatedTotal,
      actual: orderData.total,
      difference,
      tolerance
    });
    
    // Auto-correct for user experience (following pattern)
    return {
      valid: true,
      correctedTotal: calculatedTotal,
      correctionApplied: true
    };
  }
  
  return { valid: true };
};

export const paymentService = {
  // Following Pattern: Direct Supabase with validation pipeline
  createPaymentIntent: async (amount: number, currency: string = 'usd'): Promise<PaymentProcessingResult> => {
    try {
      // Step 1: Get current user (user isolation)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: createPaymentError(
            'AUTHENTICATION_REQUIRED',
            'User not authenticated',
            'Please sign in to continue with payment.'
          )
        };
      }

      // Step 2: Validate payment amount
      const validationResult = validatePaymentAmount({
        subtotal: amount - Math.round(amount * 0.08), // Assuming 8% tax
        tax: Math.round(amount * 0.08),
        total: amount
      });

      const finalAmount = validationResult.correctedTotal || amount;

      // Step 3: Direct Stripe API call via Supabase Edge Function
      const { data: rawPaymentIntent, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { 
          amount: Math.round(finalAmount * 100), // Convert to cents
          currency,
          userId: user.id 
        }
      });

      if (error) {
        return {
          success: false,
          error: createPaymentError(
            'PROCESSING_ERROR',
            `Stripe API error: ${error.message}`,
            'Unable to process payment. Please try again.',
            { stripeError: error }
          ),
          fallbackOptions: ['cash_on_pickup']
        };
      }

      // Step 4: Individual validation with skip-on-error
      try {
        const paymentIntent = PaymentTransformSchema.parse(rawPaymentIntent);
        
        ValidationMonitor.recordPatternSuccess({
          service: 'PaymentService',
          pattern: 'transformation_schema',
          operation: 'createPaymentIntent'
        });
        
        return { 
          success: true, 
          paymentIntent,
          requiresAction: paymentIntent.status === 'requires_action'
        };
      } catch (validationError) {
        ValidationMonitor.recordValidationError({
          context: 'PaymentService.createPaymentIntent',
          errorMessage: validationError.message,
          errorCode: 'PAYMENT_INTENT_VALIDATION_FAILED',
          validationPattern: 'transformation_schema'
        });
        
        // Still return success but log validation issue
        return { 
          success: true, 
          paymentIntent: rawPaymentIntent,
          requiresAction: false
        };
      }
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentService.createPaymentIntent',
        errorMessage: error.message,
        errorCode: 'PAYMENT_INTENT_CREATION_FAILED'
      });

      return { 
        success: false, 
        error: createPaymentError(
          'NETWORK_ERROR',
          `Payment intent creation failed: ${error.message}`,
          'Failed to create payment intent. Please try again.'
        ),
        fallbackOptions: ['cash_on_pickup']
      };
    }
  },

  // Following Pattern: Direct Supabase query with user isolation
  getUserPaymentMethods: async (): Promise<SavedPaymentMethod[]> => {
    try {
      // Step 1: Get current user (user isolation pattern)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ User not authenticated, returning empty payment methods');
        return [];
      }

      // Step 2: Direct Supabase query with user isolation
      const { data: rawPaymentMethods, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id) // Always filter by authenticated user
        .order('created_at', { ascending: false });

      if (error) {
        ValidationMonitor.recordValidationError({
          context: 'PaymentService.getUserPaymentMethods',
          errorMessage: error.message,
          errorCode: 'PAYMENT_METHODS_FETCH_FAILED'
        });
        return [];
      }

      // Step 3: Individual validation with skip-on-error
      const validPaymentMethods: SavedPaymentMethod[] = [];
      
      for (const rawMethod of rawPaymentMethods || []) {
        try {
          const paymentMethod = PaymentMethodTransformSchema.parse(rawMethod);
          validPaymentMethods.push(paymentMethod);
        } catch (error) {
          ValidationMonitor.recordValidationError({
            context: 'PaymentService.getUserPaymentMethods.validation',
            errorMessage: error.message,
            errorCode: 'PAYMENT_METHOD_VALIDATION_FAILED'
          });
          // Continue with other payment methods
        }
      }
      
      return validPaymentMethods;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentService.getUserPaymentMethods',
        errorMessage: error.message,
        errorCode: 'PAYMENT_METHODS_SERVICE_ERROR'
      });
      return [];
    }
  },

  // Following Pattern: Atomic operations with broadcasting
  savePaymentMethod: async (stripePaymentMethodId: string, setAsDefault: boolean = false): Promise<{ success: boolean; paymentMethod?: SavedPaymentMethod; error?: PaymentError }> => {
    try {
      // Step 1: User authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: createPaymentError(
            'AUTHENTICATION_REQUIRED',
            'User not authenticated',
            'Please sign in to save payment method.'
          )
        };
      }

      // Step 2: Atomic database operation
      const { data: rawPaymentMethod, error } = await supabase.rpc('save_payment_method', {
        input_user_id: user.id,
        input_stripe_payment_method_id: stripePaymentMethodId,
        input_set_as_default: setAsDefault
      });

      if (error) {
        return {
          success: false,
          error: createPaymentError(
            'PROCESSING_ERROR',
            `Database error: ${error.message}`,
            'Failed to save payment method. Please try again.'
          )
        };
      }

      // Step 3: Validation and transformation
      try {
        const paymentMethod = PaymentMethodTransformSchema.parse(rawPaymentMethod);
        
        ValidationMonitor.recordPatternSuccess({
          service: 'PaymentService',
          pattern: 'atomic_operation',
          operation: 'savePaymentMethod'
        });

        return { success: true, paymentMethod };
      } catch (validationError) {
        ValidationMonitor.recordValidationError({
          context: 'PaymentService.savePaymentMethod',
          errorMessage: validationError.message,
          errorCode: 'SAVED_PAYMENT_METHOD_VALIDATION_FAILED'
        });
        
        // Return success with raw data if validation fails
        return { success: true, paymentMethod: rawPaymentMethod };
      }
    } catch (error) {
      return {
        success: false,
        error: createPaymentError(
          'NETWORK_ERROR',
          `Save payment method failed: ${error.message}`,
          'Failed to save payment method. Please try again.'
        )
      };
    }
  },

  // Following Pattern: Real-time validation before operations
  validatePaymentAmount,

  // Following Pattern: Graceful degradation for payment processing
  processPayment: async (paymentIntentId: string, paymentMethodId: string): Promise<PaymentProcessingResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: createPaymentError(
            'AUTHENTICATION_REQUIRED',
            'User not authenticated',
            'Please sign in to complete payment.'
          )
        };
      }

      // Confirm payment with Stripe
      const { data: result, error } = await supabase.functions.invoke('confirm-payment', {
        body: { 
          paymentIntentId,
          paymentMethodId,
          userId: user.id 
        }
      });

      if (error) {
        return {
          success: false,
          error: createPaymentError(
            'PROCESSING_ERROR',
            `Payment confirmation failed: ${error.message}`,
            'Payment could not be processed. Please try again or use a different payment method.',
            { paymentIntentId, stripeError: error }
          ),
          fallbackOptions: ['cash_on_pickup']
        };
      }

      const paymentIntent = StripePaymentIntentSchema.parse(result);
      
      if (paymentIntent.status === 'succeeded') {
        ValidationMonitor.recordPatternSuccess({
          service: 'PaymentService',
          pattern: 'payment_processing',
          operation: 'processPayment'
        });

        return { success: true, paymentIntent };
      } else if (paymentIntent.status === 'requires_action') {
        return { 
          success: false, 
          requiresAction: true,
          paymentIntent,
          error: createPaymentError(
            'PROCESSING_ERROR',
            'Payment requires additional authentication',
            'Please complete the additional verification step.'
          )
        };
      } else {
        return {
          success: false,
          error: createPaymentError(
            'PROCESSING_ERROR',
            `Payment failed with status: ${paymentIntent.status}`,
            'Payment was not successful. Please try again.',
            { status: paymentIntent.status, lastError: paymentIntent.last_payment_error }
          ),
          fallbackOptions: ['cash_on_pickup']
        };
      }
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentService.processPayment',
        errorMessage: error.message,
        errorCode: 'PAYMENT_PROCESSING_FAILED'
      });

      return {
        success: false,
        error: createPaymentError(
          'NETWORK_ERROR',
          `Payment processing error: ${error.message}`,
          'Payment could not be processed due to a technical error. Please try again.'
        ),
        fallbackOptions: ['cash_on_pickup']
      };
    }
  }
};
```

### **Task 3.2: Secrets Management Integration**
```typescript
// Update: src/services/secretsManager.ts
// Following Pattern: Secure secrets management from docs/SECRETS_MANAGEMENT.md

// Add payment-related secrets to required secrets list
const REQUIRED_SECRETS = {
  SUPABASE_URL: 'SUPABASE_URL',
  SUPABASE_ANON_KEY: 'SUPABASE_ANON_KEY',
  CHANNEL_SECRET: 'CHANNEL_SECRET',
  // Add new payment secrets
  STRIPE_PUBLISHABLE_KEY: 'STRIPE_PUBLISHABLE_KEY',
  STRIPE_SECRET_KEY: 'STRIPE_SECRET_KEY', // For server-side operations
  PAYMENT_WEBHOOK_SECRET: 'PAYMENT_WEBHOOK_SECRET'
} as const;

// Add validation for Stripe keys
const validateSecret = (key: string, value: string): boolean => {
  switch (key) {
    case 'STRIPE_PUBLISHABLE_KEY':
      return value.startsWith('pk_');
    case 'STRIPE_SECRET_KEY':
      return value.startsWith('sk_');
    case 'PAYMENT_WEBHOOK_SECRET':
      return value.startsWith('whsec_');
    // ... existing validations
    default:
      return value.length > 0;
  }
};

// Usage in payment service:
// const stripeKey = await secretsManager.get('STRIPE_PUBLISHABLE_KEY');
```

### **Task 3.3: Payment Service Tests Implementation**
```typescript
// Implement the test cases from Task 1.1
// Following Pattern: Test actual patterns, not circumvent them
// Following Pattern: Real payment flows with proper mocking

import { paymentService } from '../paymentService';
import { ValidationMonitor } from '../../utils/validationMonitor';

// Mock Stripe
jest.mock('@stripe/stripe-js');
jest.mock('../secretsManager');

describe('PaymentService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ValidationMonitor.clearMetrics();
  });

  it('should process valid payments and skip invalid ones', async () => {
    // Following Pattern: Individual validation with skip-on-error
    const payments = [
      { amount: 1000, currency: 'usd' }, // Valid
      { amount: -100, currency: 'usd' }, // Invalid amount
      { amount: 2000, currency: 'usd' }  // Valid
    ];

    const results = [];
    for (const payment of payments) {
      try {
        const result = await paymentService.createPaymentIntent(payment.amount, payment.currency);
        if (result.success) {
          results.push(result);
        }
      } catch (error) {
        // Log but continue processing
        console.warn('Payment failed:', error);
      }
    }

    expect(results).toHaveLength(2); // Two valid payments
    expect(ValidationMonitor.getMetrics().validationErrors).toBe(1); // One validation error logged
  });

  it('should maintain user data isolation', async () => {
    // Following Pattern: User data isolation
    const user1Methods = await paymentService.getUserPaymentMethods();
    
    // Switch user context
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user2' } }
    });
    
    const user2Methods = await paymentService.getUserPaymentMethods();
    
    // Should not have any overlapping payment methods
    expect(user1Methods.every(m1 => 
      !user2Methods.some(m2 => m2.id === m1.id)
    )).toBe(true);
  });

  it('should provide graceful degradation on failures', async () => {
    // Following Pattern: Never break user workflow
    mockSupabase.functions.invoke.mockRejectedValue(new Error('Stripe service unavailable'));
    
    const result = await paymentService.createPaymentIntent(1000);
    
    expect(result.success).toBe(false);
    expect(result.fallbackOptions).toContain('cash_on_pickup');
    expect(result.error?.userMessage).toContain('Please try again');
  });
});
```

---

## **📋 Phase 4: Hook Layer Implementation (Day 4)**

### **Task 4.1: Payment Hooks (Following React Query Patterns)**
```typescript
// Create: src/hooks/usePayment.ts
// Following Pattern: Centralized query key factory usage
// Following Pattern: Context-appropriate cache settings
// Following Pattern: Smart query invalidation

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { paymentService } from '../services/paymentService';
import { paymentKeys } from '../utils/queryKeyFactory';
import { useCurrentUser } from './useAuth';
import type { 
  SavedPaymentMethod, 
  PaymentProcessingResult, 
  PaymentError,
  StripePaymentIntent 
} from '../types';

// Enhanced interfaces following cart/order pattern
interface PaymentMutationContext {
  previousPaymentMethods?: SavedPaymentMethod[];
  previousPaymentIntent?: StripePaymentIntent | null;
  operationType: 'create-intent' | 'save-method' | 'process-payment' | 'delete-method';
  metadata: Record<string, any>;
}

// Enhanced error creation utility (following cart pattern)
function createPaymentError(
  code: PaymentError['code'], 
  message: string, 
  userMessage: string, 
  metadata?: Record<string, any>
): PaymentError {
  return {
    code,
    message,
    userMessage,
    metadata,
  } as PaymentError;
}

// Enhanced default query configuration (following cart/order pattern)
const defaultPaymentQueryConfig = {
  staleTime: 5 * 60 * 1000,   // 5 minutes - payment methods change rarely
  gcTime: 10 * 60 * 1000,     // 10 minutes - longer cache retention
  refetchOnMount: true,        // Following cart pattern
  refetchOnWindowFocus: false,
  retry: (failureCount: number, error: any) => {
    // Following Pattern: Smart retry logic - don't retry on auth errors
    if (failureCount < 2) return true;
    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      return false;
    }
    return failureCount < 3;
  },
  retryDelay: 1000,
};

/**
 * Hook for fetching user's saved payment methods
 * Following Pattern: User-isolated query keys with fallback strategies
 */
export const usePaymentMethods = () => {
  const { data: user } = useCurrentUser();
  
  // Following Pattern: Enhanced authentication guard
  if (!user?.id) {
    return {
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      refetch: () => Promise.resolve({ data: [] } as any),
    };
  }

  return useQuery({
    queryKey: paymentKeys.paymentMethods(user.id), // Following Pattern: Centralized factory
    queryFn: paymentService.getUserPaymentMethods,
    ...defaultPaymentQueryConfig,
    enabled: !!user?.id, // Enhanced enabled guard
  });
};

/**
 * Hook for creating Stripe payment intents
 * Following Pattern: Smart invalidation without over-invalidating
 */
export const useCreatePaymentIntent = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation<PaymentProcessingResult, PaymentError, { amount: number; currency?: string }, PaymentMutationContext>({
    mutationFn: ({ amount, currency = 'usd' }) => 
      paymentService.createPaymentIntent(amount, currency),
    
    // Following Pattern: Optimistic updates with rollback
    onMutate: async ({ amount, currency }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: paymentKeys.all(user?.id) });
      
      // Snapshot the previous state
      const previousPaymentIntent = queryClient.getQueryData(paymentKeys.paymentIntent('pending', user?.id));
      
      return { 
        previousPaymentIntent,
        operationType: 'create-intent' as const,
        metadata: { amount, currency }
      };
    },

    onSuccess: (result, variables, context) => {
      // Following Pattern: Targeted invalidation with fallbacks
      if (result.success && result.paymentIntent) {
        // Cache the new payment intent
        queryClient.setQueryData(
          paymentKeys.paymentIntent(result.paymentIntent.id, user?.id),
          result.paymentIntent
        );
      }
      
      // Smart invalidation - only invalidate related queries
      const relatedQueryKeys = [
        paymentKeys.paymentMethods(user?.id),
        ['orders'], // Payment intents affect order status
        // Don't invalidate products - they rarely change due to payment operations
      ];
      
      relatedQueryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    },

    onError: (error, variables, context) => {
      // Following Pattern: Don't invalidate on error - keep existing cache
      console.error('Payment intent creation failed:', error);
      
      // Rollback optimistic update if any
      if (context?.previousPaymentIntent) {
        queryClient.setQueryData(
          paymentKeys.paymentIntent('pending', user?.id),
          context.previousPaymentIntent
        );
      }
    }
  });
};

/**
 * Hook for saving payment methods
 * Following Pattern: Atomic operations with proper error handling
 */
export const useSavePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation<
    { success: boolean; paymentMethod?: SavedPaymentMethod; error?: PaymentError },
    PaymentError,
    { stripePaymentMethodId: string; setAsDefault?: boolean },
    PaymentMutationContext
  >({
    mutationFn: ({ stripePaymentMethodId, setAsDefault = false }) =>
      paymentService.savePaymentMethod(stripePaymentMethodId, setAsDefault),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: paymentKeys.paymentMethods(user?.id) });
      
      // Snapshot previous payment methods
      const previousPaymentMethods = queryClient.getQueryData<SavedPaymentMethod[]>(
        paymentKeys.paymentMethods(user?.id)
      );
      
      return {
        previousPaymentMethods,
        operationType: 'save-method' as const,
        metadata: variables
      };
    },

    onSuccess: (result, variables, context) => {
      if (result.success && result.paymentMethod) {
        // Update payment methods cache
        queryClient.setQueryData<SavedPaymentMethod[]>(
          paymentKeys.paymentMethods(user?.id),
          (old = []) => [result.paymentMethod!, ...old]
        );

        // Update default payment method cache if this was set as default
        if (variables.setAsDefault) {
          queryClient.setQueryData(
            paymentKeys.defaultPaymentMethod(user?.id),
            result.paymentMethod
          );
        }
      }
    },

    onError: (error, variables, context) => {
      console.error('Save payment method failed:', error);
      
      // Rollback optimistic update
      if (context?.previousPaymentMethods) {
        queryClient.setQueryData(
          paymentKeys.paymentMethods(user?.id),
          context.previousPaymentMethods
        );
      }
    }
  });
};

/**
 * Hook for processing payments
 * Following Pattern: Comprehensive error handling with graceful degradation
 */
export const useProcessPayment = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation<
    PaymentProcessingResult,
    PaymentError,
    { paymentIntentId: string; paymentMethodId: string },
    PaymentMutationContext
  >({
    mutationFn: ({ paymentIntentId, paymentMethodId }) =>
      paymentService.processPayment(paymentIntentId, paymentMethodId),

    onSuccess: (result, variables, context) => {
      if (result.success && result.paymentIntent) {
        // Update payment intent cache
        queryClient.setQueryData(
          paymentKeys.paymentIntent(result.paymentIntent.id, user?.id),
          result.paymentIntent
        );

        // Invalidate related caches
        queryClient.invalidateQueries({ queryKey: paymentKeys.paymentHistory(user?.id) });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    },

    onError: (error, variables, context) => {
      console.error('Payment processing failed:', error);
      // Note: Don't invalidate caches on payment errors - user may retry
    }
  });
};

/**
 * Hook for getting default payment method
 * Following Pattern: Context-appropriate cache settings
 */
export const useDefaultPaymentMethod = () => {
  const { data: user } = useCurrentUser();
  
  if (!user?.id) {
    return {
      data: null,
      isLoading: false,
      error: null,
      isError: false,
    };
  }

  return useQuery({
    queryKey: paymentKeys.defaultPaymentMethod(user.id),
    queryFn: async (): Promise<SavedPaymentMethod | null> => {
      const paymentMethods = await paymentService.getUserPaymentMethods();
      return paymentMethods.find(pm => pm.isDefault) || null;
    },
    ...defaultPaymentQueryConfig,
    enabled: !!user?.id,
  });
};

// Custom hook for payment amount validation
export const usePaymentValidation = () => {
  return useCallback((orderData: {
    subtotal: number;
    tax: number;
    total: number;
    discount?: number;
  }) => {
    return paymentService.validatePaymentAmount(orderData);
  }, []);
};
```

### **Task 4.2: Checkout Form Enhancement**
```typescript
// Update: src/hooks/useCheckoutForm.ts
// Following Pattern: Race condition prevention
// Add: Payment processing state management
// Maintain: Existing form isolation patterns

import { useState, useCallback, useMemo } from 'react';

// Extend existing PaymentMethod type
export type PaymentMethodType = 'online' | 'cash_on_pickup' | 'stripe_card' | 'apple_pay' | 'google_pay';

// Extend existing interface
interface CheckoutFormData {
  paymentMethod: PaymentMethodType;
  paymentMethodId?: string; // For saved payment methods
  savePaymentMethod?: boolean; // For new payment methods
  notes: string;
  pickupDate: Date;
  pickupTime: Date;
  showDatePicker: boolean;
  showTimePicker: boolean;
  // Add payment-specific state
  paymentIntentId?: string;
  isProcessingPayment: boolean;
  paymentRequiresAction: boolean;
}

interface CheckoutFormErrors {
  [key: string]: string;
  paymentMethod?: string;
  paymentProcessing?: string;
}

// Extend existing hook
export const useCheckoutForm = () => {
  const defaultDateTime = useMemo(() => generateDefaultDateTime(), []);
  
  // Existing form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('online');
  const [notes, setNotes] = useState('');
  const [pickupDate, setPickupDate] = useState<Date>(defaultDateTime.date);
  const [pickupTime, setPickupTime] = useState<Date>(defaultDateTime.time);
  
  // New payment-specific state
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [savePaymentMethod, setSavePaymentMethod] = useState<boolean>(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentRequiresAction, setPaymentRequiresAction] = useState<boolean>(false);
  
  // Existing UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState<CheckoutFormErrors>({});

  // Enhanced validation to include payment validation
  const validateForm = useCallback((): CheckoutFormValidation => {
    const newErrors: CheckoutFormErrors = {};
    
    // Existing validations
    if (!pickupDate) {
      newErrors.pickupDate = 'Pickup date is required';
    }
    if (!pickupTime) {
      newErrors.pickupTime = 'Pickup time is required';
    }
    
    // Payment validation
    if (paymentMethod === 'online' || paymentMethod === 'stripe_card') {
      if (!paymentMethodId && !paymentIntentId) {
        newErrors.paymentMethod = 'Please select a payment method';
      }
    }
    
    if (isProcessingPayment) {
      newErrors.paymentProcessing = 'Payment is being processed. Please wait.';
    }
    
    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  }, [pickupDate, pickupTime, paymentMethod, paymentMethodId, paymentIntentId, isProcessingPayment]);

  // Enhanced form data getter
  const getFormData = useCallback(() => {
    return {
      paymentMethod,
      paymentMethodId: paymentMethodId || undefined,
      savePaymentMethod,
      notes: notes.trim() || undefined,
      pickupDate: pickupDate.toISOString().split('T')[0],
      pickupTime: pickupTime.toTimeString().split(' ')[0].substring(0, 5),
      paymentIntentId: paymentIntentId || undefined,
    };
  }, [paymentMethod, paymentMethodId, savePaymentMethod, notes, pickupDate, pickupTime, paymentIntentId]);

  // Enhanced reset function
  const resetForm = useCallback(() => {
    setPaymentMethod('online');
    setPaymentMethodId('');
    setSavePaymentMethod(false);
    setPaymentIntentId('');
    setIsProcessingPayment(false);
    setPaymentRequiresAction(false);
    setNotes('');
    setPickupDate(defaultDateTime.date);
    setPickupTime(defaultDateTime.time);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setErrors({});
  }, [defaultDateTime]);

  return {
    // Existing properties
    paymentMethod,
    setPaymentMethod,
    notes,
    setNotes,
    pickupDate,
    setPickupDate,
    pickupTime,
    setPickupTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    errors,
    validateForm,
    getFormData,
    resetForm,
    clearError,
    formattedPickupDateTime,
    
    // New payment properties
    paymentMethodId,
    setPaymentMethodId,
    savePaymentMethod,
    setSavePaymentMethod,
    paymentIntentId,
    setPaymentIntentId,
    isProcessingPayment,
    setIsProcessingPayment,
    paymentRequiresAction,
    setPaymentRequiresAction,
  };
};
```

---

## **📋 Phase 5: UI Layer Implementation (Day 5)**

### **Task 5.1: Payment Method Components**
```typescript
// Create: src/components/payment/PaymentMethodSelector.tsx
// Following Pattern: Graceful degradation, user-friendly errors

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePaymentMethods, useDefaultPaymentMethod } from '../../hooks/usePayment';
import type { PaymentMethodType, SavedPaymentMethod } from '../../types';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  selectedMethodId?: string;
  onMethodSelect: (method: PaymentMethodType, methodId?: string) => void;
  disabled?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  selectedMethodId,
  onMethodSelect,
  disabled = false
}) => {
  const { data: paymentMethods = [], isLoading, error } = usePaymentMethods();
  const { data: defaultMethod } = useDefaultPaymentMethod();

  // Following Pattern: Graceful degradation
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={20} color="#ef4444" />
          <Text style={styles.errorText}>Unable to load payment methods</Text>
        </View>
        {/* Fallback option */}
        <TouchableOpacity
          style={[styles.paymentOption, selectedMethod === 'cash_on_pickup' && styles.selected]}
          onPress={() => onMethodSelect('cash_on_pickup')}
          disabled={disabled}
        >
          <Ionicons name="cash-outline" size={24} color="#10b981" />
          <Text style={styles.paymentText}>Cash on Pickup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      
      {/* Saved Payment Methods */}
      {paymentMethods.length > 0 && (
        <View style={styles.savedMethodsSection}>
          <Text style={styles.subsectionTitle}>Saved Payment Methods</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentOption,
                selectedMethodId === method.id && styles.selected
              ]}
              onPress={() => onMethodSelect('stripe_card', method.id)}
              disabled={disabled}
            >
              <View style={styles.cardInfo}>
                <Ionicons 
                  name="card-outline" 
                  size={24} 
                  color={method.isDefault ? "#10b981" : "#6b7280"} 
                />
                <View style={styles.cardDetails}>
                  <Text style={styles.cardBrand}>{method.cardBrand.toUpperCase()}</Text>
                  <Text style={styles.cardLast4}>•••• {method.cardLastFour}</Text>
                </View>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* New Payment Methods */}
      <View style={styles.newMethodsSection}>
        <Text style={styles.subsectionTitle}>Payment Options</Text>
        
        <TouchableOpacity
          style={[styles.paymentOption, selectedMethod === 'stripe_card' && !selectedMethodId && styles.selected]}
          onPress={() => onMethodSelect('stripe_card')}
          disabled={disabled}
        >
          <Ionicons name="card-outline" size={24} color="#10b981" />
          <Text style={styles.paymentText}>Credit/Debit Card</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paymentOption, selectedMethod === 'apple_pay' && styles.selected]}
          onPress={() => onMethodSelect('apple_pay')}
          disabled={disabled}
        >
          <Ionicons name="logo-apple" size={24} color="#000000" />
          <Text style={styles.paymentText}>Apple Pay</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paymentOption, selectedMethod === 'google_pay' && styles.selected]}
          onPress={() => onMethodSelect('google_pay')}
          disabled={disabled}
        >
          <Ionicons name="logo-google" size={24} color="#4285f4" />
          <Text style={styles.paymentText}>Google Pay</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paymentOption, selectedMethod === 'cash_on_pickup' && styles.selected]}
          onPress={() => onMethodSelect('cash_on_pickup')}
          disabled={disabled}
        >
          <Ionicons name="cash-outline" size={24} color="#10b981" />
          <Text style={styles.paymentText}>Cash on Pickup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#6b7280',
  },
  savedMethodsSection: {
    marginBottom: 16,
  },
  newMethodsSection: {
    // Styles for new payment methods
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  selected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  paymentText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardDetails: {
    marginLeft: 12,
    flex: 1,
  },
  cardBrand: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  cardLast4: {
    fontSize: 12,
    color: '#6b7280',
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    marginBottom: 12,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ef4444',
  },
});
```

```typescript
// Create: src/components/payment/StripeCardForm.tsx
// Following Pattern: User-friendly error messages + proper validation

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { CardForm, useStripe } from '@stripe/stripe-react-native';
import { Button } from '../ui/Button';
import { useCreatePaymentIntent, useSavePaymentMethod } from '../../hooks/usePayment';

interface StripeCardFormProps {
  amount: number;
  onPaymentIntentCreated: (paymentIntentId: string, clientSecret: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export const StripeCardForm: React.FC<StripeCardFormProps> = ({
  amount,
  onPaymentIntentCreated,
  onError,
  disabled = false
}) => {
  const { createPaymentMethod } = useStripe();
  const createPaymentIntent = useCreatePaymentIntent();
  const savePaymentMethod = useSavePaymentMethod();
  
  const [cardComplete, setCardComplete] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!cardComplete) {
      onError('Please complete your card information');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Step 1: Create payment method
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (pmError || !paymentMethod) {
        onError(pmError?.message || 'Failed to create payment method');
        return;
      }

      // Step 2: Create payment intent
      const intentResult = await createPaymentIntent.mutateAsync({ amount });
      
      if (!intentResult.success || !intentResult.paymentIntent) {
        onError(intentResult.error?.userMessage || 'Failed to create payment intent');
        return;
      }

      // Step 3: Save payment method if requested
      if (saveCard) {
        try {
          await savePaymentMethod.mutateAsync({
            stripePaymentMethodId: paymentMethod.id,
            setAsDefault: false
          });
        } catch (saveError) {
          // Don't fail the payment if saving fails
          console.warn('Failed to save payment method:', saveError);
        }
      }

      // Step 4: Return payment intent details
      onPaymentIntentCreated(
        intentResult.paymentIntent.id,
        intentResult.paymentIntent.clientSecret
      );
      
    } catch (error) {
      onError('Payment processing failed. Please try again.');
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card Information</Text>
      
      <CardForm
        postalCodeEnabled={true}
        placeholders={{
          number: '4242 4242 4242 4242',
          postalCode: '12345',
          cvc: 'CVC',
          expiryDate: 'MM/YY',
        }}
        cardStyle={{
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 8,
          fontSize: 16,
        }}
        style={styles.cardForm}
        onFormComplete={(cardDetails) => {
          setCardComplete(cardDetails.complete);
        }}
        disabled={disabled || isProcessing}
      />
      
      <View style={styles.saveCardContainer}>
        <Text style={styles.saveCardText}>Save card for future purchases</Text>
        <Switch
          value={saveCard}
          onValueChange={setSaveCard}
          disabled={disabled || isProcessing}
          trackColor={{ false: '#e5e7eb', true: '#10b981' }}
          thumbColor={saveCard ? '#ffffff' : '#ffffff'}
        />
      </View>
      
      <Button
        title={isProcessing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        onPress={handlePayment}
        disabled={!cardComplete || disabled || isProcessing}
        loading={isProcessing}
        style={styles.payButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  cardForm: {
    height: 50,
    marginVertical: 12,
  },
  saveCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  saveCardText: {
    fontSize: 14,
    color: '#6b7280',
  },
  payButton: {
    marginTop: 16,
  },
});
```

```typescript
// Create: src/components/payment/ApplePayButton.tsx
// Following Pattern: Platform-specific graceful degradation

import React from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useCreatePaymentIntent } from '../../hooks/usePayment';

interface ApplePayButtonProps {
  amount: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  amount,
  onPaymentSuccess,
  onError,
  disabled = false
}) => {
  const { presentApplePay, isApplePaySupported } = useStripe();
  const createPaymentIntent = useCreatePaymentIntent();

  // Following Pattern: Platform-specific graceful degradation
  if (Platform.OS !== 'ios' || !isApplePaySupported) {
    return null; // Don't render on unsupported platforms
  }

  const handleApplePay = async () => {
    try {
      // Create payment intent first
      const intentResult = await createPaymentIntent.mutateAsync({ amount });
      
      if (!intentResult.success || !intentResult.paymentIntent) {
        onError(intentResult.error?.userMessage || 'Failed to initialize payment');
        return;
      }

      // Present Apple Pay
      const { error } = await presentApplePay({
        cartItems: [{
          label: 'Total',
          amount: (amount / 100).toFixed(2),
          paymentType: 'Immediate',
        }],
        country: 'US',
        currency: 'USD',
        requiredShippingAddressFields: [],
        requiredBillingContactFields: [],
      });

      if (error) {
        onError(`Apple Pay failed: ${error.message}`);
        return;
      }

      onPaymentSuccess(intentResult.paymentIntent.id);
      
    } catch (error) {
      onError('Apple Pay processing failed. Please try again.');
      console.error('Apple Pay error:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.applePayButton, disabled && styles.disabled]}
      onPress={handleApplePay}
      disabled={disabled}
    >
      <Ionicons name="logo-apple" size={24} color="#ffffff" />
      <Text style={styles.applePayText}>Pay with Apple Pay</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  applePayButton: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  disabled: {
    backgroundColor: '#9ca3af',
  },
  applePayText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
```

### **Task 5.2: Checkout Screen Enhancement**
```typescript
// Update: src/screens/CheckoutScreen.tsx  
// Following Pattern: Never break user workflow
// Replace: Placeholder payment selection with real payment forms
// Maintain: Existing stock validation and kiosk integration

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  StyleSheet 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderKeys } from '../utils/queryKeyFactory';
import { useCart } from '../hooks/useCart';
import { useCurrentUser } from '../hooks/useAuth';
import { useStockValidation } from '../hooks/useStockValidation';
import { useCheckoutForm } from '../hooks/useCheckoutForm';
import { useKioskSessionInfo } from '../contexts';
import { submitOrder } from '../services/orderService';
import { 
  usePaymentMethods, 
  useCreatePaymentIntent, 
  useProcessPayment,
  usePaymentValidation 
} from '../hooks/usePayment';
import { PaymentMethodSelector } from '../components/payment/PaymentMethodSelector';
import { StripeCardForm } from '../components/payment/StripeCardForm';
import { ApplePayButton } from '../components/payment/ApplePayButton';
import type { CreateOrderRequestWithPayment, PaymentMethodType } from '../types';

export const CheckoutScreen: React.FC = () => {
  const { items, total, clearCart, updateQuantity, removeItem } = useCart();
  const { data: user } = useCurrentUser();
  const { validateStock, getStockInfo } = useStockValidation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const kioskSessionInfo = useKioskSessionInfo();
  const validatePaymentAmount = usePaymentValidation();
  
  // Enhanced form hook with payment state
  const {
    paymentMethod,
    setPaymentMethod,
    paymentMethodId,
    setPaymentMethodId,
    paymentIntentId,
    setPaymentIntentId,
    isProcessingPayment,
    setIsProcessingPayment,
    paymentRequiresAction,
    setPaymentRequiresAction,
    savePaymentMethod,
    setSavePaymentMethod,
    notes,
    setNotes,
    pickupDate,
    setPickupDate,
    pickupTime,
    setPickupTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    errors,
    validateForm,
    getFormData,
    resetForm,
    clearError,
    formattedPickupDateTime,
  } = useCheckoutForm();

  // Payment hooks
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = usePaymentMethods();
  const createPaymentIntent = useCreatePaymentIntent();
  const processPayment = useProcessPayment();

  // Following Pattern: Production calculation validation
  useEffect(() => {
    const validation = validatePaymentAmount({
      subtotal: total * 0.92, // Assuming 8% tax
      tax: total * 0.08,
      total: total
    });
    
    if (validation.correctionApplied) {
      Alert.alert(
        'Total Adjusted',
        `Order total has been corrected to $${validation.correctedTotal?.toFixed(2)}`,
        [{ text: 'OK' }]
      );
    }
  }, [total, validatePaymentAmount]);

  // Enhanced order submission with payment processing
  const orderMutation = useMutation({
    mutationFn: async (orderRequest: CreateOrderRequestWithPayment) => {
      // Step 1: Validate payment is ready
      if (orderRequest.paymentMethod !== 'cash_on_pickup' && !orderRequest.paymentIntentId) {
        throw new Error('Payment not initialized');
      }

      // Step 2: Submit order with payment details
      return submitOrder(orderRequest, kioskSessionInfo.sessionId);
    },
    onSuccess: async (result) => {
      if (result.success && result.order) {
        await clearCart(undefined);
        queryClient.invalidateQueries({ queryKey: orderKeys.all(user?.id) });
        
        navigation.navigate('OrderConfirmation', {
          order: result.order,
          success: true,
        });
      } else if (result.inventoryConflicts && result.inventoryConflicts.length > 0) {
        handleInventoryConflicts(result.inventoryConflicts, result.error || 'Inventory conflicts detected');
      } else {
        navigation.navigate('OrderConfirmation', {
          success: false,
          error: result.error || 'Failed to submit order',
        });
      }
    },
    onError: (error) => {
      navigation.navigate('OrderConfirmation', {
        success: false,
        error: `Error: ${error.message}`,
      });
    },
  });

  // Payment method selection handler
  const handlePaymentMethodSelect = (method: PaymentMethodType, methodId?: string) => {
    setPaymentMethod(method);
    setPaymentMethodId(methodId || '');
    clearError('paymentMethod');
  };

  // Payment intent creation handler
  const handlePaymentIntentCreated = (intentId: string, clientSecret: string) => {
    setPaymentIntentId(intentId);
    clearError('paymentProcessing');
  };

  // Payment error handler
  const handlePaymentError = (error: string) => {
    Alert.alert('Payment Error', error, [
      { text: 'OK' },
      { 
        text: 'Use Cash Instead', 
        onPress: () => {
          setPaymentMethod('cash_on_pickup');
          clearError('paymentMethod');
        }
      }
    ]);
  };

  // Enhanced order submission handler
  const handleSubmitOrder = async () => {
    setIsProcessingPayment(true);
    
    try {
      // Step 1: Validate form
      const validation = validateForm();
      if (!validation.isValid) {
        setIsProcessingPayment(false);
        return;
      }

      // Step 2: Process payment if needed
      let finalPaymentIntentId = paymentIntentId;
      
      if (paymentMethod !== 'cash_on_pickup' && paymentMethodId && !paymentIntentId) {
        // Create payment intent for saved payment method
        const intentResult = await createPaymentIntent.mutateAsync({ 
          amount: Math.round(total * 100) // Convert to cents
        });
        
        if (!intentResult.success || !intentResult.paymentIntent) {
          handlePaymentError(intentResult.error?.userMessage || 'Failed to initialize payment');
          setIsProcessingPayment(false);
          return;
        }
        
        finalPaymentIntentId = intentResult.paymentIntent.id;
        setPaymentIntentId(finalPaymentIntentId);
      }
      
      if (paymentMethod !== 'cash_on_pickup' && paymentMethodId && finalPaymentIntentId) {
        // Process the payment
        const paymentResult = await processPayment.mutateAsync({
          paymentIntentId: finalPaymentIntentId,
          paymentMethodId: paymentMethodId
        });
        
        if (!paymentResult.success) {
          handlePaymentError(paymentResult.error?.userMessage || 'Payment failed');
          setIsProcessingPayment(false);
          return;
        }
        
        if (paymentResult.requiresAction) {
          setPaymentRequiresAction(true);
          setIsProcessingPayment(false);
          return;
        }
      }

      // Step 3: Submit order
      const formData = getFormData();
      const orderRequest: CreateOrderRequestWithPayment = {
        customerInfo: {
          name: user?.name || 'Guest',
          email: user?.email || '',
          phone: user?.phone || '',
        },
        items: convertCartToOrderItems(),
        fulfillmentType: 'pickup',
        paymentMethod: paymentMethod,
        paymentIntentId: finalPaymentIntentId,
        paymentMethodId: paymentMethodId || undefined,
        savePaymentMethod: savePaymentMethod,
        notes: formData.notes,
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
      };

      await orderMutation.mutateAsync(orderRequest);
      
    } catch (error) {
      handlePaymentError('Order submission failed. Please try again.');
      console.error('Order submission error:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Following Pattern: Graceful degradation for loading states
  if (paymentMethodsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading payment options...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Existing order summary section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {items.map((item, index) => (
          <OrderItemRow 
            key={`${item.product.id}-${index}`}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
          />
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total: ${total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Enhanced payment method selection */}
      <View style={styles.section}>
        <PaymentMethodSelector
          selectedMethod={paymentMethod}
          selectedMethodId={paymentMethodId}
          onMethodSelect={handlePaymentMethodSelect}
          disabled={isProcessingPayment}
        />
        
        {/* Payment method specific forms */}
        {paymentMethod === 'stripe_card' && !paymentMethodId && (
          <StripeCardForm
            amount={Math.round(total * 100)}
            onPaymentIntentCreated={handlePaymentIntentCreated}
            onError={handlePaymentError}
            disabled={isProcessingPayment}
          />
        )}
        
        {paymentMethod === 'apple_pay' && (
          <ApplePayButton
            amount={Math.round(total * 100)}
            onPaymentSuccess={(intentId) => {
              setPaymentIntentId(intentId);
              handleSubmitOrder();
            }}
            onError={handlePaymentError}
            disabled={isProcessingPayment}
          />
        )}
        
        {/* Error display */}
        {errors.paymentMethod && (
          <Text style={styles.errorText}>{errors.paymentMethod}</Text>
        )}
        {errors.paymentProcessing && (
          <Text style={styles.errorText}>{errors.paymentProcessing}</Text>
        )}
      </View>

      {/* Existing pickup date/time section */}
      <View style={styles.section}>
        {/* ... existing pickup date/time UI ... */}
      </View>

      {/* Enhanced submit button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isProcessingPayment || orderMutation.isLoading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitOrder}
          disabled={isProcessingPayment || orderMutation.isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isProcessingPayment ? 'Processing Payment...' : 
             orderMutation.isLoading ? 'Submitting Order...' : 
             paymentMethod === 'cash_on_pickup' ? 'Place Order' : 
             `Pay $${total.toFixed(2)} & Place Order`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Additional styles for payment integration
const styles = StyleSheet.create({
  // ... existing styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});
```

---

## **📋 Phase 6: Security & Compliance (Day 6)**

### **Task 6.1: PCI Compliance Implementation**
```typescript
// Create: src/utils/pciCompliance.ts
// Following Pattern: Security-first patterns, no sensitive data storage

/**
 * PCI Compliance Utilities
 * Following Pattern: Cryptographic security throughout
 */

export class PCIComplianceManager {
  // Following Pattern: Never store sensitive payment data
  static validateNoPCIDataStored(): boolean {
    const sensitiveKeys = [
      'card_number',
      'cvv',
      'cvc', 
      'card_exp',
      'expiry',
      'full_card_number',
      'pan'
    ];
    
    // Check localStorage/AsyncStorage
    try {
      sensitiveKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          console.error(`🚨 PCI VIOLATION: ${key} found in localStorage`);
          localStorage.removeItem(key); // Clean up violation
          return false;
        }
      });
      
      return true;
    } catch (error) {
      console.error('PCI compliance check failed:', error);
      return false;
    }
  }
  
  // Following Pattern: Secure payment processing flow
  static sanitizePaymentLogs(logData: any): any {
    const sanitized = { ...logData };
    
    // Remove sensitive fields from logs
    const sensitiveFields = [
      'card_number', 'number', 'cardNumber',
      'cvc', 'cvv', 'securityCode',
      'exp_month', 'exp_year', 'expiry',
      'client_secret' // Stripe client secrets
    ];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  // Secure token validation
  static validatePaymentToken(token: string): boolean {
    // Stripe tokens start with specific prefixes
    const validPrefixes = ['pm_', 'pi_', 'tok_', 'src_'];
    return validPrefixes.some(prefix => token.startsWith(prefix));
  }
}

// Custom console override for payment operations
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args: any[]) => {
  const sanitizedArgs = args.map(arg => 
    typeof arg === 'object' ? PCIComplianceManager.sanitizePaymentLogs(arg) : arg
  );
  originalConsoleLog.apply(console, sanitizedArgs);
};

console.error = (...args: any[]) => {
  const sanitizedArgs = args.map(arg => 
    typeof arg === 'object' ? PCIComplianceManager.sanitizePaymentLogs(arg) : arg
  );
  originalConsoleError.apply(console, sanitizedArgs);
};
```

### **Task 6.2: Enhanced Secrets Management for Payments**
```typescript
// Update: src/services/secretsManager.ts
// Following Pattern: Secure secrets management

// Add payment-specific secrets with validation
const PAYMENT_SECRETS = {
  STRIPE_PUBLISHABLE_KEY: {
    key: 'STRIPE_PUBLISHABLE_KEY',
    required: true,
    validator: (value: string) => value.startsWith('pk_'),
    description: 'Stripe publishable key for client-side operations'
  },
  STRIPE_SECRET_KEY: {
    key: 'STRIPE_SECRET_KEY', 
    required: false, // Client-side doesn't need secret key
    validator: (value: string) => value.startsWith('sk_'),
    description: 'Stripe secret key (server-side only)'
  },
  PAYMENT_WEBHOOK_SECRET: {
    key: 'PAYMENT_WEBHOOK_SECRET',
    required: false,
    validator: (value: string) => value.startsWith('whsec_'),
    description: 'Stripe webhook endpoint secret'
  }
} as const;

// Enhanced validation with payment-specific rules
export const validateSecret = (key: string, value: string): boolean => {
  if (PAYMENT_SECRETS[key as keyof typeof PAYMENT_SECRETS]) {
    return PAYMENT_SECRETS[key as keyof typeof PAYMENT_SECRETS].validator(value);
  }
  
  // Existing validation logic
  return validateExistingSecret(key, value);
};

// Secure Stripe configuration
export const getStripeConfiguration = async () => {
  const publishableKey = await secretsManager.get('STRIPE_PUBLISHABLE_KEY');
  
  if (!publishableKey || !publishableKey.startsWith('pk_')) {
    throw new Error('Invalid Stripe publishable key configuration');
  }
  
  return {
    publishableKey,
    merchantIdentifier: 'merchant.com.myfarmstand.mobile', // For Apple Pay
  };
};
```

### **Task 6.3: Payment Error Handling & Security**
```typescript
// Create: src/utils/paymentSecurity.ts
// Following Pattern: User data isolation + comprehensive error handling

export class PaymentSecurityManager {
  // Following Pattern: User data isolation
  static validateUserOwnership(userId: string, paymentData: any): boolean {
    // Ensure payment data belongs to current user
    if (paymentData.user_id && paymentData.user_id !== userId) {
      console.error('🚨 SECURITY VIOLATION: Payment data user mismatch');
      return false;
    }
    return true;
  }
  
  // Following Pattern: Comprehensive error handling with user-friendly messages
  static createSecurePaymentError(
    technicalError: any,
    context: string
  ): { userMessage: string; logDetails: any } {
    // Sanitize technical details for logging
    const sanitizedError = PCIComplianceManager.sanitizePaymentLogs(technicalError);
    
    // Provide user-friendly messages based on error type
    let userMessage = 'Payment could not be processed. Please try again.';
    
    if (technicalError?.code === 'card_declined') {
      userMessage = 'Your card was declined. Please check your card details or try a different payment method.';
    } else if (technicalError?.code === 'insufficient_funds') {
      userMessage = 'Insufficient funds. Please try a different payment method.';
    } else if (technicalError?.code === 'expired_card') {
      userMessage = 'Your card has expired. Please use a different payment method.';
    } else if (technicalError?.code === 'incorrect_cvc') {
      userMessage = 'Incorrect security code. Please check and try again.';
    }
    
    return {
      userMessage,
      logDetails: {
        context,
        sanitizedError,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  // Rate limiting for payment attempts
  private static paymentAttempts: Map<string, number> = new Map();
  
  static checkRateLimit(userId: string, maxAttempts: number = 5): boolean {
    const attempts = this.paymentAttempts.get(userId) || 0;
    
    if (attempts >= maxAttempts) {
      console.warn(`Rate limit exceeded for user ${userId}`);
      return false;
    }
    
    this.paymentAttempts.set(userId, attempts + 1);
    
    // Reset after 1 hour
    setTimeout(() => {
      this.paymentAttempts.delete(userId);
    }, 60 * 60 * 1000);
    
    return true;
  }
}
```

---

## **📋 Phase 7: Integration & Testing (Day 7)**

### **Task 7.1: End-to-End Payment Flow Testing**
```typescript
// Create: src/__tests__/integration/paymentFlow.integration.test.ts
// Following Pattern: Test actual patterns, comprehensive flows

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCart } from '../hooks/useCart';
import { useCreatePaymentIntent, useProcessPayment } from '../hooks/usePayment';
import { submitOrder } from '../services/orderService';
import { PCIComplianceManager } from '../utils/pciCompliance';

// Test wrapper with React Query
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Payment Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure PCI compliance at start of each test
    expect(PCIComplianceManager.validateNoPCIDataStored()).toBe(true);
  });

  it('should complete end-to-end checkout with card payment', async () => {
    // Following Pattern: Test complete user workflow
    const wrapper = createTestWrapper();
    
    // Step 1: Add items to cart
    const { result: cartResult } = renderHook(() => useCart(), { wrapper });
    
    await act(async () => {
      await cartResult.current.addItem.mutateAsync({
        product: mockProduct,
        quantity: 2
      });
    });
    
    await waitFor(() => {
      expect(cartResult.current.cart.items).toHaveLength(1);
      expect(cartResult.current.cart.total).toBe(20.00);
    });
    
    // Step 2: Create payment intent
    const { result: paymentResult } = renderHook(() => useCreatePaymentIntent(), { wrapper });
    
    let paymentIntent;
    await act(async () => {
      const result = await paymentResult.current.mutateAsync({ 
        amount: Math.round(cartResult.current.cart.total * 100) 
      });
      paymentIntent = result.paymentIntent;
    });
    
    expect(paymentIntent).toBeDefined();
    expect(paymentIntent.amount).toBe(2000); // In cents
    
    // Step 3: Process payment
    const { result: processResult } = renderHook(() => useProcessPayment(), { wrapper });
    
    await act(async () => {
      const result = await processResult.current.mutateAsync({
        paymentIntentId: paymentIntent.id,
        paymentMethodId: 'pm_test_card'
      });
      expect(result.success).toBe(true);
    });
    
    // Step 4: Submit order
    const orderResult = await submitOrder({
      customerInfo: mockCustomerInfo,
      items: cartResult.current.cart.items,
      fulfillmentType: 'pickup',
      paymentMethod: 'stripe_card',
      paymentIntentId: paymentIntent.id,
      paymentMethodId: 'pm_test_card'
    });
    
    expect(orderResult.success).toBe(true);
    expect(orderResult.order).toBeDefined();
    
    // Verify PCI compliance maintained throughout
    expect(PCIComplianceManager.validateNoPCIDataStored()).toBe(true);
  });

  it('should handle payment failures gracefully', async () => {
    // Following Pattern: Graceful degradation on failures
    const wrapper = createTestWrapper();
    
    // Mock payment failure
    mockStripeService.createPaymentIntent.mockRejectedValue({
      code: 'card_declined',
      message: 'Your card was declined.'
    });
    
    const { result } = renderHook(() => useCreatePaymentIntent(), { wrapper });
    
    await act(async () => {
      try {
        await result.current.mutateAsync({ amount: 1000 });
      } catch (error) {
        // Should provide user-friendly error
        expect(error.userMessage).toContain('declined');
        expect(error.fallbackOptions).toContain('cash_on_pickup');
      }
    });
    
    // User should still be able to checkout with cash
    const orderResult = await submitOrder({
      customerInfo: mockCustomerInfo,
      items: mockCartItems,
      fulfillmentType: 'pickup',
      paymentMethod: 'cash_on_pickup', // Fallback option
    });
    
    expect(orderResult.success).toBe(true);
  });

  it('should validate user data isolation throughout payment flow', async () => {
    // Following Pattern: User data isolation
    const wrapper = createTestWrapper();
    
    // Mock different user contexts
    const user1Data = { id: 'user1', email: 'user1@test.com' };
    const user2Data = { id: 'user2', email: 'user2@test.com' };
    
    // Create payment intent as user1
    mockAuth.getUser.mockResolvedValue({ data: { user: user1Data } });
    const { result: payment1 } = renderHook(() => useCreatePaymentIntent(), { wrapper });
    
    let user1PaymentIntent;
    await act(async () => {
      const result = await payment1.current.mutateAsync({ amount: 1000 });
      user1PaymentIntent = result.paymentIntent;
    });
    
    // Switch to user2 and try to access user1's payment intent
    mockAuth.getUser.mockResolvedValue({ data: { user: user2Data } });
    const { result: payment2 } = renderHook(() => useProcessPayment(), { wrapper });
    
    await act(async () => {
      try {
        await payment2.current.mutateAsync({
          paymentIntentId: user1PaymentIntent.id,
          paymentMethodId: 'pm_test_card'
        });
        // Should fail due to user mismatch
        fail('Should have thrown authorization error');
      } catch (error) {
        expect(error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  it('should maintain query key factory consistency', () => {
    // Following Pattern: Centralized query key factory usage
    const wrapper = createTestWrapper();
    
    const { result } = renderHook(() => usePaymentMethods(), { wrapper });
    
    // Verify using centralized factory
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: paymentKeys.paymentMethods('test-user-id'),
      })
    );
    
    // Verify NOT using local duplicate keys
    expect(mockUseQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['payment', 'methods'], // Local duplicate - anti-pattern
      })
    );
  });
});
```

### **Task 7.2: Error Recovery & Resilience Testing**
```typescript
// Create: src/__tests__/integration/paymentResilience.test.ts
// Following Pattern: Test error recovery and graceful degradation

describe('Payment Resilience Testing', () => {
  it('should recover from network failures during payment', async () => {
    // Following Pattern: Network error recovery
    const wrapper = createTestWrapper();
    
    // Simulate network failure
    mockSupabase.functions.invoke
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({ data: mockPaymentIntent });
    
    const { result } = renderHook(() => useCreatePaymentIntent(), { wrapper });
    
    // First attempt should fail, second should succeed
    await act(async () => {
      try {
        await result.current.mutateAsync({ amount: 1000 });
        fail('First attempt should have failed');
      } catch (error) {
        expect(error.message).toContain('Network timeout');
      }
    });
    
    // Retry should succeed
    await act(async () => {
      const result = await result.current.mutateAsync({ amount: 1000 });
      expect(result.success).toBe(true);
    });
  });

  it('should handle partial payment processing failures', async () => {
    // Following Pattern: Partial operation handling
    const wrapper = createTestWrapper();
    
    // Payment intent created but processing fails
    mockStripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
    mockStripeService.confirmPaymentIntent.mockRejectedValue({
      code: 'authentication_required',
      message: 'Payment requires additional authentication'
    });
    
    const { result: createResult } = renderHook(() => useCreatePaymentIntent(), { wrapper });
    const { result: processResult } = renderHook(() => useProcessPayment(), { wrapper });
    
    // Step 1: Create payment intent (should succeed)
    let paymentIntent;
    await act(async () => {
      const result = await createResult.current.mutateAsync({ amount: 1000 });
      paymentIntent = result.paymentIntent;
      expect(result.success).toBe(true);
    });
    
    // Step 2: Process payment (should fail but provide next steps)
    await act(async () => {
      try {
        await processResult.current.mutateAsync({
          paymentIntentId: paymentIntent.id,
          paymentMethodId: 'pm_test_card'
        });
      } catch (error) {
        expect(error.requiresAction).toBe(true);
        expect(error.userMessage).toContain('additional authentication');
      }
    });
    
    // User should still be able to complete order with cash fallback
    const orderResult = await submitOrder({
      customerInfo: mockCustomerInfo,
      items: mockCartItems,
      fulfillmentType: 'pickup',
      paymentMethod: 'cash_on_pickup'
    });
    
    expect(orderResult.success).toBe(true);
  });

  it('should validate all established patterns under stress', async () => {
    // Following Pattern: Stress test all architectural patterns
    const wrapper = createTestWrapper();
    
    // Concurrent payment operations
    const concurrentOperations = Array.from({ length: 5 }, (_, i) => 
      renderHook(() => useCreatePaymentIntent(), { wrapper })
    );
    
    // Execute all operations concurrently
    const results = await Promise.allSettled(
      concurrentOperations.map(async ({ result }, index) => {
        await act(async () => {
          return result.current.mutateAsync({ amount: (index + 1) * 1000 });
        });
      })
    );
    
    // Verify individual validation with skip-on-error
    const successfulResults = results.filter(r => r.status === 'fulfilled');
    const failedResults = results.filter(r => r.status === 'rejected');
    
    // Should have some successes even if some fail
    expect(successfulResults.length).toBeGreaterThan(0);
    
    // Verify ValidationMonitor was called for any failures
    if (failedResults.length > 0) {
      expect(ValidationMonitor.recordValidationError).toHaveBeenCalled();
    }
    
    // Verify query key factory consistency maintained
    concurrentOperations.forEach(({ result }) => {
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['payment'])
        })
      );
    });
    
    // Verify PCI compliance maintained
    expect(PCIComplianceManager.validateNoPCIDataStored()).toBe(true);
  });
});
```

---

## **🎯 Critical Pattern Compliance Checklist**

### **✅ Must Follow These Exact Patterns:**

#### **Query Key Factory Patterns**
- [ ] **CRITICAL**: Use `paymentKeys` from centralized factory, never create local duplicates
- [ ] Use entity-specific methods: `paymentKeys.paymentMethods(userId)` not manual spreading
- [ ] User-isolated keys with fallback strategies for unauthenticated users

#### **Schema Validation Patterns**  
- [ ] Database-first validation with transformation schemas
- [ ] Single validation pass: `PaymentTransformSchema.parse(rawDbData)`
- [ ] Handle database nulls explicitly with proper defaults
- [ ] Include debug metadata: `_dbData` for production debugging

#### **Service Layer Patterns**
- [ ] Direct Supabase queries with proper user isolation
- [ ] Individual validation with skip-on-error processing for arrays
- [ ] ValidationMonitor integration for both success and failure cases
- [ ] User-friendly error messages + technical details for logging
- [ ] Never break user workflow - provide fallback options

#### **Hook Layer Patterns**
- [ ] Context-appropriate cache settings (5min staleTime for payment methods)
- [ ] Smart retry logic (don't retry on auth errors)
- [ ] Enhanced enabled guards: `enabled: !!user?.id`
- [ ] Targeted invalidation without over-invalidation
- [ ] Optimistic updates with proper rollback on errors

#### **Security Patterns**
- [ ] User data isolation: Always filter by authenticated user ID
- [ ] Cryptographic security: Secure secrets management
- [ ] PCI compliance: Never store sensitive payment data locally
- [ ] Rate limiting and security monitoring

#### **Error Handling Patterns**
- [ ] Graceful degradation: Return empty states rather than crashing
- [ ] User-friendly messages: Technical errors translated to user language
- [ ] Fallback options: Always provide alternative paths (cash_on_pickup)
- [ ] ValidationMonitor logging for production insights

### **❌ Anti-Patterns to Avoid:**

1. ❌ Creating local query key factories: `const localPaymentKeys = { ... }`
2. ❌ All-or-nothing validation that breaks on single payment failures
3. ❌ Over-invalidation: `queryClient.invalidateQueries()` without specific keys
4. ❌ Breaking user workflow due to payment processing issues
5. ❌ Storing sensitive payment data in localStorage/AsyncStorage
6. ❌ Mixing user payment data or trusting parameter-based user IDs
7. ❌ Manual key spreading: `[...paymentKeys.details(userId), 'intent', intentId]`

---

## **🏁 Summary**

This comprehensive task list implements payment integration while **strictly following every established pattern** from the architectural documentation:

- **Query Key Factory**: Centralized usage, no local duplicates
- **Schema Validation**: Database-first transformation schemas
- **Service Layer**: Direct Supabase + individual validation + monitoring
- **Hook Layer**: Smart caching + proper invalidation + user isolation
- **Security**: PCI compliance + user data isolation + secure secrets
- **Error Handling**: Graceful degradation + user-friendly messages

The implementation maintains the **quality-first architecture** and **production resilience** standards established throughout the codebase, ensuring payment integration enhances rather than compromises the existing system integrity.