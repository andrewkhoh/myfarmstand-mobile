/**
 * Payment Hooks
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Implements payment hooks with centralized query key factory, user isolation,
 * React Query patterns, and comprehensive error handling.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { paymentService } from '../services/paymentService';
import { useCurrentUser } from './useAuth';
import type { 
  Payment, 
  PaymentMethod, 
  PaymentIntent, 
  PaymentOperationResult,
  PaymentMethodOperationResult,
  CreatePaymentRequest,
  CreatePaymentMethodRequest,
  PaymentError,
  PaymentCalculation,
  PaymentTokenizationResult
} from '../types';
import { paymentKeys } from '../utils/queryKeyFactory';
import { paymentBroadcast } from '../utils/broadcastFactory';

// Enhanced TypeScript interfaces for payment operations
interface PaymentMutationContext {
  previousPaymentMethods?: PaymentMethod[];
  previousPaymentIntents?: PaymentIntent[];
  operationType: 'create_payment' | 'create_method' | 'update_method' | 'delete_method' | 'confirm_payment';
  metadata?: Record<string, any>;
}

// Typed query functions
type PaymentMethodsQueryFn = () => Promise<PaymentMethod[]>;
type PaymentIntentsQueryFn = () => Promise<PaymentIntent[]>;
type PaymentHistoryQueryFn = () => Promise<Payment[]>;

// Typed mutation functions
type CreatePaymentMutationFn = (params: CreatePaymentRequest) => Promise<PaymentOperationResult>;
type CreatePaymentMethodMutationFn = (params: CreatePaymentMethodRequest) => Promise<PaymentMethodOperationResult>;
type UpdatePaymentMethodMutationFn = (params: { id: string; isDefault?: boolean }) => Promise<PaymentMethodOperationResult>;
type DeletePaymentMethodMutationFn = (methodId: string) => Promise<PaymentMethodOperationResult>;
type ConfirmPaymentMutationFn = (params: { paymentIntentId: string; paymentMethodId: string }) => Promise<PaymentOperationResult>;

// Enhanced error handling utility
const createPaymentError = (
  code: PaymentError['code'],
  message: string,
  userMessage: string,
  metadata?: Partial<PaymentError>
): PaymentError => ({
  code,
  message,
  userMessage,
  ...metadata,
});

// Enhanced invalidation strategy for payment-related queries
const getRelatedPaymentQueryKeys = (userId: string) => [
  paymentKeys.paymentMethods(userId),
  paymentKeys.paymentIntents(userId),
  paymentKeys.paymentHistory(userId),
  paymentKeys.paymentSettings(userId),
];

// Payment Methods Hook - Following centralized query key factory pattern
export const usePaymentMethods = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Following Pattern: Enhanced authentication guard with graceful degradation
  if (!user?.id) {
    const authError = createPaymentError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view your payment methods'
    );

    return {
      data: [] as PaymentMethod[],
      isLoading: false,
      error: authError,
      isError: true,
      refetch: () => Promise.resolve({ data: [] as PaymentMethod[] } as any),
    };
  }

  // Following Pattern: Use centralized query key factory consistently
  const paymentMethodsQueryKey = paymentKeys.paymentMethods(user.id);

  const {
    data: paymentMethods = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: paymentMethodsQueryKey,
    queryFn: (() => paymentService.getUserPaymentMethods(user.id)) as PaymentMethodsQueryFn,
    // Following Pattern: Context-appropriate cache settings
    staleTime: 5 * 60 * 1000, // 5 minutes - payment methods change rarely
    gcTime: 10 * 60 * 1000,   // 10 minutes - longer cache retention
    refetchOnMount: true,      // Always check on mount
    refetchOnWindowFocus: false, // Don't spam on focus changes
    enabled: !!user?.id,
    retry: (failureCount, error) => {
      // Smart retry logic
      if (failureCount < 2) return true;
      // Don't retry on authentication errors
      if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return {
    data: paymentMethods,
    isLoading,
    error: queryError,
    isError: !!queryError,
    refetch,
  };
};

// Payment Intents Hook - Following user isolation pattern
export const usePaymentIntents = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Following Pattern: User data isolation with fallback
  if (!user?.id) {
    const authError = createPaymentError(
      'AUTHENTICATION_REQUIRED',
      'User not authenticated',
      'Please sign in to view your payment history'
    );

    return {
      data: [] as PaymentIntent[],
      isLoading: false,
      error: authError,
      isError: true,
      refetch: () => Promise.resolve({ data: [] as PaymentIntent[] } as any),
    };
  }

  const paymentIntentsQueryKey = paymentKeys.paymentIntents(user.id);

  const {
    data: paymentIntents = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: paymentIntentsQueryKey,
    queryFn: (() => paymentService.retrievePaymentIntents(['mock'])) as any, // Mock function for now
    staleTime: 1 * 60 * 1000, // 1 minute - payment intents change more frequently
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    enabled: !!user?.id,
  });

  return {
    data: paymentIntents,
    isLoading,
    error: queryError,
    isError: !!queryError,
    refetch,
  };
};

// Create Payment Hook - Following smart query invalidation pattern
export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: ((params: CreatePaymentRequest) => 
      paymentService.createPaymentIntent(params.amount, params.currency)
    ) as CreatePaymentMutationFn,
    
    // Following Pattern: Smart query invalidation without over-invalidating
    onSuccess: async (result, variables, context) => {
      if (!user?.id) return;

      // Invalidate related queries only
      await queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentIntents(user.id)
      });

      await queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentHistory(user.id)
      });

      // Real-time broadcast for payment updates
      try {
        await paymentBroadcast.send('payment-created', {
          userId: user.id,
          paymentIntentId: result.paymentIntent?.id,
          amount: variables.amount,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast payment creation:', broadcastError);
      }
    },

    // Following Pattern: Don't invalidate on error - keep existing cache
    onError: (error, variables, context) => {
      console.error('Payment creation failed:', error);
      // Don't invalidate queries on error
    },
  });
};

// Create Payment Method Hook
export const useCreatePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation<PaymentTokenizationResult, PaymentError, CreatePaymentMethodRequest, PaymentMutationContext>({
    mutationFn: (params: CreatePaymentMethodRequest) => 
      paymentService.tokenizeCard({
        cardNumber: params.card?.number || '',
        expiryMonth: params.card?.expMonth || 0,
        expiryYear: params.card?.expYear || 0,
        cvc: params.card?.cvc || '',
      }),

    onMutate: async (variables) => {
      // Optimistic update preparation
      if (!user?.id) return;

      await queryClient.cancelQueries({
        queryKey: paymentKeys.paymentMethods(user.id)
      });

      const previousPaymentMethods = queryClient.getQueryData<PaymentMethod[]>(
        paymentKeys.paymentMethods(user.id)
      );

      return { previousPaymentMethods } as PaymentMutationContext;
    },

    onSuccess: async (result, variables, context) => {
      if (!user?.id) return;

      // Invalidate payment methods cache
      await queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentMethods(user.id)
      });

      // Broadcast payment method addition
      try {
        await paymentBroadcast.send('payment-method-added', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast payment method addition:', broadcastError);
      }
    },

    onError: (error, variables, context) => {
      if (!user?.id || !context?.previousPaymentMethods) return;

      // Restore previous state on error
      queryClient.setQueryData(
        paymentKeys.paymentMethods(user.id),
        context.previousPaymentMethods
      );
    },
  });
};

// Update Payment Method Hook
export const useUpdatePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: (async (params: { id: string; isDefault?: boolean }) => {
      // Mock implementation - would integrate with actual payment service
      return {
        success: true,
        paymentMethod: {
          id: params.id,
          isDefault: params.isDefault || false,
        } as PaymentMethod,
      };
    }) as UpdatePaymentMethodMutationFn,

    onSuccess: async (result, variables, context) => {
      if (!user?.id) return;

      // Targeted cache update
      await queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentMethods(user.id)
      });

      // If setting as default, update settings cache
      if (variables.isDefault) {
        await queryClient.invalidateQueries({
          queryKey: paymentKeys.paymentSettings(user.id)
        });
      }
    },
  });
};

// Delete Payment Method Hook
export const useDeletePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: (async (methodId: string) => {
      // Mock implementation
      return {
        success: true,
        message: 'Payment method deleted successfully',
      };
    }) as DeletePaymentMethodMutationFn,

    onMutate: async (methodId) => {
      if (!user?.id) return;

      await queryClient.cancelQueries({
        queryKey: paymentKeys.paymentMethods(user.id)
      });

      const previousPaymentMethods = queryClient.getQueryData<PaymentMethod[]>(
        paymentKeys.paymentMethods(user.id)
      );

      // Optimistic update - remove the payment method
      queryClient.setQueryData(
        paymentKeys.paymentMethods(user.id),
        (old: PaymentMethod[] = []) => old.filter(method => method.id !== methodId)
      );

      return { previousPaymentMethods, methodId } as PaymentMutationContext & { methodId: string };
    },

    onSuccess: async (result, methodId, context) => {
      if (!user?.id) return;

      // Confirm the deletion with fresh data
      await queryClient.invalidateQueries({
        queryKey: paymentKeys.paymentMethods(user.id)
      });

      // Broadcast deletion
      try {
        await paymentBroadcast.send('payment-method-deleted', {
          userId: user.id,
          methodId,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast payment method deletion:', broadcastError);
      }
    },

    onError: (error, methodId, context) => {
      if (!user?.id || !context?.previousPaymentMethods) return;

      // Restore previous state on error
      queryClient.setQueryData(
        paymentKeys.paymentMethods(user.id),
        context.previousPaymentMethods
      );
    },
  });
};

// Confirm Payment Hook
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: (async (params: { paymentIntentId: string; paymentMethodId: string }) => {
      // Mock implementation - would integrate with Stripe
      return {
        success: true,
        payment: {
          id: `payment_${Date.now()}`,
          paymentIntentId: params.paymentIntentId,
          paymentMethodId: params.paymentMethodId,
          status: 'succeeded',
          userId: user?.id || '',
        } as Payment,
      };
    }) as ConfirmPaymentMutationFn,

    onSuccess: async (result, variables, context) => {
      if (!user?.id) return;

      // Invalidate all payment-related queries
      const relatedKeys = getRelatedPaymentQueryKeys(user.id);
      for (const queryKey of relatedKeys) {
        await queryClient.invalidateQueries({ queryKey });
      }

      // Broadcast payment confirmation
      try {
        await paymentBroadcast.send('payment-confirmed', {
          userId: user.id,
          paymentIntentId: variables.paymentIntentId,
          paymentMethodId: variables.paymentMethodId,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('Failed to broadcast payment confirmation:', broadcastError);
      }
    },
  });
};

// Payment Calculation Hook - For validating payment amounts
export const usePaymentCalculation = () => {
  return useCallback(async (calculation: PaymentCalculation) => {
    return await paymentService.validatePaymentAmount(calculation);
  }, []);
};

// Real-time Payment Updates Hook
export const usePaymentRealtime = () => {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const updatePaymentStatus = useCallback((paymentIntentId: string, status: string) => {
    if (!user?.id) return;

    // Update specific payment intent status
    queryClient.setQueryData(
      paymentKeys.paymentIntent(paymentIntentId, user.id),
      (old: PaymentIntent | undefined) => 
        old ? { ...old, status: status as any } : undefined
    );

    // Also update the list of payment intents
    queryClient.setQueryData(
      paymentKeys.paymentIntents(user.id),
      (old: PaymentIntent[] = []) => 
        old.map(intent => 
          intent.id === paymentIntentId 
            ? { ...intent, status: status as any }
            : intent
        )
    );
  }, [queryClient, user?.id]);

  return {
    updatePaymentStatus,
  };
};