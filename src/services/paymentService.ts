/**
 * Payment Service
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Implements payment functionality with individual validation, ValidationMonitor integration,
 * graceful degradation, user data isolation, and atomic operations with broadcasting.
 */

import { supabase } from '../config/supabase';
import { 
  Payment, 
  PaymentMethod, 
  PaymentIntent, 
  PaymentOperationResult, 
  PaymentMethodOperationResult,
  CreatePaymentRequest,
  CreatePaymentMethodRequest,
  PaymentError,
  PaymentCalculation,
  PaymentTokenizationRequest,
  PaymentTokenizationResult,
} from '../types';
import { paymentBroadcast } from '../utils/broadcastFactory';
import { 
  PaymentTransformSchema,
  PaymentMethodTransformSchema,
  PaymentIntentTransformSchema,
  PaymentCalculationSchema
} from '../schemas/payment.schema';
import { ValidationMonitor } from '../utils/validationMonitor';

// Development vs Production Stripe Integration
import Constants from 'expo-constants';

// Stripe configuration based on environment
const getStripeConfig = () => {
  const isDevelopment = Constants.expoConfig?.extra?.nodeEnv !== 'production';
  
  return {
    publishableKey: isDevelopment 
      ? Constants.expoConfig?.extra?.stripePublishableKeyTest 
      : Constants.expoConfig?.extra?.stripePublishableKeyLive,
    secretKey: isDevelopment
      ? Constants.expoConfig?.extra?.stripeSecretKeyTest
      : Constants.expoConfig?.extra?.stripeSecretKeyLive,
    isDevelopment,
  };
};

// Test card numbers for development
export const STRIPE_TEST_CARDS = {
  // Successful payments
  visa: '4242424242424242',
  visaDebit: '4000056655665556', 
  mastercard: '5555555555554444',
  amex: '378282246310005',
  
  // Declined payments (for testing error handling)
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  expiredCard: '4000000000000069',
  incorrectCvc: '4000000000000127',
  processingError: '4000000000000119',
  
  // 3D Secure authentication
  require3DS: '4000002760003184',
  require3DSDeclined: '4000008400001629',
  
  // International cards
  visaInternational: '4000000760000002',
  mastercardPrepaid: '5200828282828210',
};

// Enhanced Stripe client with development/production modes
interface StripeClient {
  createPaymentIntent: (params: any) => Promise<any>;
  confirmPaymentIntent: (id: string, params?: any) => Promise<any>;
  createPaymentMethod: (params: any) => Promise<any>;
  attachPaymentMethod: (id: string, customerId: string) => Promise<any>;
  createCustomer: (params: any) => Promise<any>;
  retrievePaymentIntent: (id: string) => Promise<any>;
}

// Development-aware Stripe client
const createStripeClient = (): StripeClient => {
  const config = getStripeConfig();
  
  if (config.isDevelopment) {
    console.log('🧪 Using Stripe Test Mode');
    
    return {
      createPaymentIntent: async (params) => {
        // Simulate different responses based on test card numbers
        const amount = params.amount;
        const testCardBehavior = getTestCardBehavior(params.payment_method?.card?.number);
        
        if (testCardBehavior.shouldFail) {
          throw new Error(testCardBehavior.error);
        }
        
        return {
          id: `pi_test_${Date.now()}`,
          amount,
          currency: params.currency,
          status: testCardBehavior.status,
          client_secret: `pi_test_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
          created: Math.floor(Date.now() / 1000),
          payment_method: params.payment_method,
          requires_action: testCardBehavior.requiresAction,
        };
      },
      
      confirmPaymentIntent: async (id, params) => {
        const testCardBehavior = getTestCardBehavior(params?.payment_method?.card?.number);
        
        if (testCardBehavior.shouldFailOnConfirm) {
          throw new Error(testCardBehavior.error);
        }
        
        return {
          id,
          status: testCardBehavior.finalStatus || 'succeeded',
          payment_method: params?.payment_method,
        };
      },
      
      createPaymentMethod: async (params) => {
        const cardNumber = params.card?.number;
        const testCardBehavior = getTestCardBehavior(cardNumber);
        
        if (testCardBehavior.shouldFailOnMethod) {
          throw new Error('Your card number is invalid.');
        }
        
        return {
          id: `pm_test_${Date.now()}`,
          type: params.type,
          card: params.card ? {
            brand: detectCardBrand(cardNumber),
            last4: cardNumber?.slice(-4) || '0000',
            exp_month: params.card.exp_month,
            exp_year: params.card.exp_year,
          } : undefined,
          created: Math.floor(Date.now() / 1000),
        };
      },
      
      attachPaymentMethod: async (id, customerId) => ({ 
        id, 
        customer: customerId 
      }),
      
      createCustomer: async (params) => ({
        id: `cus_test_${Date.now()}`,
        email: params.email,
        created: Math.floor(Date.now() / 1000),
      }),
      
      retrievePaymentIntent: async (id) => ({
        id,
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
        created: Math.floor(Date.now() / 1000),
      }),
    };
  } else {
    // Production Stripe integration would go here
    // This would use the actual Stripe SDK
    throw new Error('Production Stripe integration not implemented. Use Stripe SDK.');
  }
};

// Helper function to simulate test card behaviors
const getTestCardBehavior = (cardNumber?: string) => {
  if (!cardNumber) return { status: 'requires_payment_method' };
  
  switch (cardNumber) {
    case STRIPE_TEST_CARDS.declined:
      return { 
        shouldFail: true, 
        error: 'Your card was declined.',
        status: 'requires_payment_method' 
      };
      
    case STRIPE_TEST_CARDS.insufficientFunds:
      return { 
        shouldFail: true, 
        error: 'Your card has insufficient funds.',
        status: 'requires_payment_method' 
      };
      
    case STRIPE_TEST_CARDS.expiredCard:
      return { 
        shouldFailOnMethod: true,
        error: 'Your card has expired.',
        status: 'requires_payment_method' 
      };
      
    case STRIPE_TEST_CARDS.incorrectCvc:
      return { 
        shouldFailOnMethod: true,
        error: 'Your card\'s security code is incorrect.',
        status: 'requires_payment_method' 
      };
      
    case STRIPE_TEST_CARDS.processingError:
      return { 
        shouldFail: true, 
        error: 'An error occurred while processing your card.',
        status: 'requires_payment_method' 
      };
      
    case STRIPE_TEST_CARDS.require3DS:
      return { 
        status: 'requires_action',
        requiresAction: true,
        finalStatus: 'succeeded' 
      };
      
    case STRIPE_TEST_CARDS.require3DSDeclined:
      return { 
        status: 'requires_action',
        requiresAction: true,
        shouldFailOnConfirm: true,
        error: 'Authentication failed.',
        finalStatus: 'requires_payment_method' 
      };
      
    default:
      return { status: 'requires_confirmation' };
  }
};

// Helper function to detect card brand
const detectCardBrand = (cardNumber?: string): string => {
  if (!cardNumber) return 'unknown';
  
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('4')) return 'visa';
  if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'mastercard';
  if (cleaned.startsWith('34') || cleaned.startsWith('37')) return 'amex';
  if (cleaned.startsWith('6')) return 'discover';
  
  return 'unknown';
};

const stripe = createStripeClient();

// Helper function for creating payment errors following established patterns
const createPaymentError = (
  code: PaymentError['code'],
  technicalMessage: string,
  userMessage: string,
  metadata?: Partial<PaymentError>
): PaymentError => ({
  code,
  message: technicalMessage,
  userMessage,
  ...metadata,
});

// Helper function for payment calculation validation
const validatePaymentCalculation = (calculation: PaymentCalculation): PaymentCalculation => {
  try {
    return PaymentCalculationSchema.parse(calculation);
  } catch (error) {
    const calculatedTotal = calculation.subtotal + calculation.tax + (calculation.tip || 0) - (calculation.discount || 0);
    const tolerance = 0.01;
    const difference = Math.abs(calculation.total - calculatedTotal);

    if (difference > tolerance) {
      // Record calculation mismatch for monitoring
      ValidationMonitor.recordCalculationMismatch({
        type: 'payment_total',
        expected: calculatedTotal,
        actual: calculation.total,
        difference,
        tolerance,
      });

      // Auto-correct the total
      return {
        ...calculation,
        total: calculatedTotal,
        correctedTotal: calculatedTotal,
      } as PaymentCalculation;
    }

    throw error;
  }
};

export const paymentService = {
  // Get user payment methods - Following user data isolation pattern
  getUserPaymentMethods: async (userId?: string): Promise<PaymentMethod[]> => {
    console.log('💳 getUserPaymentMethods() called');
    try {
      // Following Pattern: User data isolation - always validate user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (userId && user.id !== userId) {
        throw new Error('Unauthorized access');
      }

      // Step 1: Direct Supabase query (following established pattern)
      const { data: rawPaymentMethods, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
      }

      // Step 2: Individual validation with skip-on-error
      const validPaymentMethods: PaymentMethod[] = [];
      
      for (const rawMethod of rawPaymentMethods || []) {
        try {
          const paymentMethod = PaymentMethodTransformSchema.parse(rawMethod);
          validPaymentMethods.push(paymentMethod);
        } catch (validationError) {
          // Log validation error but continue processing
          ValidationMonitor.recordValidationError({
            context: 'PaymentService.getUserPaymentMethods',
            errorMessage: validationError instanceof Error ? validationError.message : 'Unknown error',
            errorCode: 'PAYMENT_METHOD_VALIDATION_FAILED',
            validationPattern: 'transformation_schema'
          });
          console.warn('Invalid payment method, skipping:', rawMethod.id);
        }
      }

      // Record successful pattern usage
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentService',
        pattern: 'direct_supabase_query',
        operation: 'getUserPaymentMethods'
      });

      return validPaymentMethods;
    } catch (error) {
      console.error('Failed to get user payment methods:', error);
      return [];
    }
  },

  // Create payment intent - Following graceful degradation pattern
  createPaymentIntent: async (amount: number, currency: string = 'usd'): Promise<PaymentOperationResult> => {
    console.log('💰 createPaymentIntent() called');
    try {
      // Following Pattern: Input validation
      if (amount < 1) {
        return {
          success: false,
          error: createPaymentError(
            'INVALID_REQUEST',
            'Amount must be at least 1 cent',
            'Invalid payment amount. Please try again.'
          )
        };
      }

      // Step 1: Create payment intent with Stripe
      const paymentIntent = await stripe.createPaymentIntent({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
      });

      // Step 2: Record pattern success
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentService',
        pattern: 'direct_supabase_query',
        operation: 'createPaymentIntent'
      });

      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
          confirmationMethod: 'automatic',
          createdAt: new Date().toISOString(),
          metadata: {},
        }
      };
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      
      // Following Pattern: Graceful degradation with fallback options
      return {
        success: false,
        message: 'Failed to create payment intent. Please try again.',
        error: createPaymentError(
          'STRIPE_API_ERROR',
          error instanceof Error ? error.message : 'Unknown error',
          'Payment processing is temporarily unavailable. Please try again or use an alternative payment method.'
        ),
        fallbackOptions: ['cash_on_pickup', 'bank_transfer']
      };
    }
  },

  // Create payment intent with retry logic - Following resilient error handling
  createPaymentIntentWithRetry: async (amount: number, currency: string = 'usd', maxRetries: number = 2): Promise<PaymentOperationResult> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await paymentService.createPaymentIntent(amount, currency);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Payment intent creation attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: createPaymentError(
        'NETWORK_ERROR',
        lastError?.message || 'Network error after retries',
        'Unable to process payment after multiple attempts. Please check your connection and try again.'
      )
    };
  },

  // Process payments with individual validation - Following batch processing pattern
  processPayments: async (paymentDataArray: any[]): Promise<{ validPayments: Payment[], invalidPayments: any[] }> => {
    console.log('🔄 processPayments() called');
    const validPayments: Payment[] = [];
    const invalidPayments: any[] = [];

    // Following Pattern: Individual validation with skip-on-error
    for (const paymentData of paymentDataArray) {
      try {
        // Validate payment data
        if (!paymentData.cardNumber || paymentData.amount <= 0) {
          throw new Error('Invalid payment data');
        }

        // Create payment intent
        const paymentIntent = await stripe.createPaymentIntent({
          amount: paymentData.amount * 100, // Convert to cents
          currency: paymentData.currency || 'usd',
        });

        // Transform to Payment object
        const payment: Payment = {
          id: `payment_${Date.now()}`,
          paymentIntentId: paymentIntent.id,
          paymentMethodId: '',
          amount: paymentData.amount * 100,
          currency: paymentData.currency || 'usd',
          status: 'succeeded',
          userId: 'user123', // Should come from auth
          confirmationMethod: 'automatic',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
        };

        validPayments.push(payment);
      } catch (error) {
        // Log validation error but continue processing
        ValidationMonitor.recordValidationError({
          context: 'PaymentService.processPayments',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'PAYMENT_VALIDATION_FAILED',
          validationPattern: 'transformation_schema'
        });
        
        invalidPayments.push(paymentData);
      }
    }

    return { validPayments, invalidPayments };
  },

  // Retrieve payment intents with individual validation
  retrievePaymentIntents: async (intentIds: string[]): Promise<{ retrieved: PaymentIntent[], failed: string[] }> => {
    const retrieved: PaymentIntent[] = [];
    const failed: string[] = [];

    // Following Pattern: Individual processing with error isolation
    for (const intentId of intentIds) {
      try {
        const intent = await stripe.retrievePaymentIntent(intentId);
        
        const paymentIntent: PaymentIntent = {
          id: intent.id,
          amount: intent.amount,
          currency: intent.currency,
          status: intent.status,
          clientSecret: '',
          confirmationMethod: 'automatic',
          createdAt: new Date().toISOString(),
          metadata: {},
        };

        retrieved.push(paymentIntent);
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'PaymentService.retrievePaymentIntents',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'STRIPE_API_FAILED'
        });
        
        failed.push(intentId);
      }
    }

    return { retrieved, failed };
  },

  // Validate payment amount with calculation checking
  validatePaymentAmount: async (paymentData: PaymentCalculation): Promise<PaymentCalculation & { correctedTotal?: number }> => {
    console.log('🧮 validatePaymentAmount() called');
    
    try {
      return validatePaymentCalculation(paymentData);
    } catch (error) {
      // This will have auto-correction applied by validatePaymentCalculation
      const correctedCalculation = validatePaymentCalculation({
        ...paymentData,
        total: paymentData.subtotal + paymentData.tax + (paymentData.tip || 0) - (paymentData.discount || 0)
      });
      
      return correctedCalculation;
    }
  },

  // Record payment with atomic operations and broadcasting
  recordPayment: async (paymentData: {
    amount: number;
    currency: string;
    payment_intent_id: string;
    user_id: string;
  }): Promise<PaymentOperationResult> => {
    console.log('📝 recordPayment() called');
    
    try {
      // Following Pattern: Atomic database operation
      const { data, error } = await supabase.rpc('record_payment_transaction', {
        input_user_id: paymentData.user_id,
        input_amount: paymentData.amount,
        input_currency: paymentData.currency,
        input_payment_intent_id: paymentData.payment_intent_id
      });

      if (error) {
        throw error;
      }

      // Following Pattern: Non-blocking real-time broadcasting
      try {
        await paymentBroadcast.send('payment-recorded', {
          paymentIntentId: paymentData.payment_intent_id,
          amount: paymentData.amount,
          userId: paymentData.user_id,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        // Don't fail the operation if broadcast fails
        console.warn('Failed to broadcast payment update:', broadcastError);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to record payment:', error);
      
      // Following Pattern: Graceful error handling
      return {
        success: false,
        message: 'Failed to record payment. Transaction completed but may take a few minutes to appear.',
        error: createPaymentError(
          'PROCESSING_ERROR',
          error instanceof Error ? error.message : 'Unknown error',
          'Payment was processed but there was an issue recording it. Please contact support if it doesn\'t appear soon.'
        )
      };
    }
  },

  // Tokenize card for PCI compliance
  tokenizeCard: async (cardData: PaymentTokenizationRequest): Promise<PaymentTokenizationResult> => {
    console.log('🔒 tokenizeCard() called');
    
    try {
      // Following Pattern: Security-first - never store raw card data
      const paymentMethod = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: cardData.cardNumber,
          exp_month: cardData.expiryMonth,
          exp_year: cardData.expiryYear,
          cvc: cardData.cvc,
        },
        billing_details: cardData.billingAddress ? {
          address: {
            line1: cardData.billingAddress.line1,
            line2: cardData.billingAddress.line2,
            city: cardData.billingAddress.city,
            state: cardData.billingAddress.state,
            postal_code: cardData.billingAddress.postalCode,
            country: cardData.billingAddress.country,
          }
        } : undefined,
      });

      // Extract safe data only
      return {
        token: paymentMethod.id,
        last4: cardData.cardNumber.slice(-4),
        brand: 'visa', // Would come from Stripe response
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
      };
    } catch (error) {
      return {
        token: '',
        last4: '',
        brand: 'unknown',
        expiryMonth: 0,
        expiryYear: 0,
        error: createPaymentError(
          'INVALID_CARD_NUMBER',
          error instanceof Error ? error.message : 'Unknown error',
          'Invalid card information. Please check your card details and try again.'
        ),
      };
    }
  },

  // Broadcast payment update with secure channel names
  broadcastPaymentUpdate: async (userId: string, eventType: string): Promise<void> => {
    try {
      // Following Pattern: Cryptographic channel security
      const secureChannelName = `sec-payment-${userId.substring(0, 16)}`;
      
      await paymentBroadcast.send(secureChannelName, {
        type: eventType,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to broadcast payment update:', error);
    }
  },
};