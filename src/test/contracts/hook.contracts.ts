/**
 * Hook Contract Validators
 * 
 * Comprehensive validation layer for all React hooks to ensure
 * data consistency, type safety, and contract compliance.
 * 
 * Following MyFarmstand Mobile Architectural Patterns:
 * - Single validation pass with transformation
 * - Database-first validation
 * - Graceful degradation on errors
 * - User-isolated operations
 */

import { z } from 'zod';
import type { 
  UseQueryResult, 
  UseMutationResult,
  QueryKey 
} from '@tanstack/react-query';

// Import all schemas for validation
import { 
  UserSchema,
  AuthStateSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  UpdateProfileRequestSchema,
  UpdateProfileResponseSchema
} from '../../schemas/auth.schema';

import {
  CartItemSchema,
  CartStateSchema,
  AddToCartRequestSchema,
  UpdateCartItemRequestSchema,
  RemoveFromCartRequestSchema,
  CartOperationResponseSchema,
  CartSyncResponseSchema,
  StockValidationResponseSchema,
  CartSummarySchema
} from '../../schemas/cart.schema';

import {
  ProductSchema,
  CategorySchema,
  ProductArraySchema,
  CategoryArraySchema
} from '../../schemas/product.schema';

import {
  OrderSchema,
  OrderStatusSchema,
  CreateOrderRequestSchema,
  CreateOrderResponseSchema,
  UpdateOrderStatusRequestSchema,
  UpdateOrderResponseSchema,
  OrderHistoryResponseSchema,
  OrderSummarySchema
} from '../../schemas/order.schema';

import {
  PaymentSchema,
  PaymentMethodSchema,
  PaymentIntentSchema,
  CreatePaymentRequestSchema,
  CreatePaymentResponseSchema,
  ConfirmPaymentRequestSchema,
  ConfirmPaymentResponseSchema,
  PaymentMethodListResponseSchema
} from '../../schemas/payment.schema';

import {
  KioskSessionSchema,
  KioskConfigSchema,
  KioskStartSessionRequestSchema,
  KioskEndSessionRequestSchema,
  KioskActivityLogSchema
} from '../../schemas/kiosk.schema';

// ================================
// Core Validation Types
// ================================

export interface HookContractValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    hookName: string;
    operationType: 'query' | 'mutation' | 'subscription';
    timestamp: string;
    userId?: string;
  };
}

export interface HookContractOptions {
  strict?: boolean;
  logErrors?: boolean;
  validateOnMount?: boolean;
  validateOnUpdate?: boolean;
  skipValidation?: boolean;
  onValidationError?: (result: HookContractValidationResult) => void;
}

// ================================
// Hook-Specific Contract Definitions
// ================================

/**
 * Auth Hook Contracts
 */
export const authHookContracts = {
  // Queries
  getCurrentUser: {
    input: z.void(),
    output: UserSchema.nullable(),
    queryKey: ['auth', 'currentUser'] as QueryKey,
  },
  getAuthState: {
    input: z.void(),
    output: AuthStateSchema,
    queryKey: ['auth', 'state'] as QueryKey,
  },
  
  // Mutations
  login: {
    input: LoginRequestSchema,
    output: LoginResponseSchema,
    invalidates: [['auth']],
  },
  register: {
    input: RegisterRequestSchema,
    output: RegisterResponseSchema,
    invalidates: [['auth']],
  },
  logout: {
    input: z.void(),
    output: z.object({ success: z.boolean() }),
    invalidates: [['auth'], ['cart'], ['orders']],
  },
  updateProfile: {
    input: UpdateProfileRequestSchema,
    output: UpdateProfileResponseSchema,
    invalidates: [['auth', 'currentUser']],
  },
} as const;

/**
 * Cart Hook Contracts
 */
export const cartHookContracts = {
  // Queries
  getCart: {
    input: z.object({ userId: z.string().optional() }),
    output: CartStateSchema,
    queryKey: (userId?: string) => ['cart', userId || 'guest'] as QueryKey,
  },
  getCartSummary: {
    input: z.object({ userId: z.string().optional() }),
    output: CartSummarySchema,
    queryKey: (userId?: string) => ['cart', 'summary', userId || 'guest'] as QueryKey,
  },
  validateStock: {
    input: CartStateSchema,
    output: StockValidationResponseSchema,
    queryKey: ['cart', 'stock-validation'] as QueryKey,
  },
  
  // Mutations
  addToCart: {
    input: AddToCartRequestSchema,
    output: CartOperationResponseSchema,
    invalidates: [['cart'], ['cart', 'summary']],
  },
  updateCartItem: {
    input: UpdateCartItemRequestSchema,
    output: CartOperationResponseSchema,
    invalidates: [['cart'], ['cart', 'summary']],
  },
  removeFromCart: {
    input: RemoveFromCartRequestSchema,
    output: CartOperationResponseSchema,
    invalidates: [['cart'], ['cart', 'summary']],
  },
  clearCart: {
    input: z.object({ userId: z.string().optional() }),
    output: z.object({ success: z.boolean() }),
    invalidates: [['cart'], ['cart', 'summary']],
  },
  syncCart: {
    input: z.object({ 
      localCart: CartStateSchema,
      userId: z.string() 
    }),
    output: CartSyncResponseSchema,
    invalidates: [['cart']],
  },
} as const;

/**
 * Product Hook Contracts
 */
export const productHookContracts = {
  // Queries
  getProducts: {
    input: z.object({
      categoryId: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(['name', 'price', 'created_at']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }).optional(),
    output: ProductArraySchema,
    queryKey: (filters?: any) => ['products', filters] as QueryKey,
  },
  getProduct: {
    input: z.string(),
    output: ProductSchema,
    queryKey: (id: string) => ['products', id] as QueryKey,
  },
  getCategories: {
    input: z.void(),
    output: CategoryArraySchema,
    queryKey: ['categories'] as QueryKey,
  },
  getWeeklySpecials: {
    input: z.void(),
    output: ProductArraySchema,
    queryKey: ['products', 'weekly-specials'] as QueryKey,
  },
  
  // Mutations (for admin features)
  createProduct: {
    input: ProductSchema.omit({ id: true, created_at: true, updated_at: true }),
    output: ProductSchema,
    invalidates: [['products']],
  },
  updateProduct: {
    input: ProductSchema,
    output: ProductSchema,
    invalidates: [['products']],
  },
  deleteProduct: {
    input: z.string(),
    output: z.object({ success: z.boolean() }),
    invalidates: [['products']],
  },
} as const;

/**
 * Order Hook Contracts
 */
export const orderHookContracts = {
  // Queries
  getOrders: {
    input: z.object({
      userId: z.string().optional(),
      status: OrderStatusSchema.optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional(),
    output: z.array(OrderSchema),
    queryKey: (filters?: any) => ['orders', filters] as QueryKey,
  },
  getOrder: {
    input: z.string(),
    output: OrderSchema,
    queryKey: (id: string) => ['orders', id] as QueryKey,
  },
  getOrderHistory: {
    input: z.object({ userId: z.string() }),
    output: z.array(OrderSchema),
    queryKey: (userId: string) => ['orders', 'history', userId] as QueryKey,
  },
  
  // Mutations
  createOrder: {
    input: CreateOrderRequestSchema,
    output: CreateOrderResponseSchema,
    invalidates: [['orders'], ['cart']],
  },
  updateOrderStatus: {
    input: UpdateOrderStatusRequestSchema,
    output: UpdateOrderResponseSchema,
    invalidates: [['orders']],
  },
  cancelOrder: {
    input: z.object({
      orderId: z.string(),
      reason: z.string().optional(),
    }),
    output: z.object({ 
      success: z.boolean(),
      order: OrderSchema.optional(),
    }),
    invalidates: [['orders']],
  },
} as const;

/**
 * Payment Hook Contracts
 */
export const paymentHookContracts = {
  // Queries
  getPaymentMethods: {
    input: z.object({ userId: z.string() }),
    output: PaymentMethodListResponseSchema,
    queryKey: (userId: string) => ['payment-methods', userId] as QueryKey,
  },
  getPaymentIntent: {
    input: z.string(),
    output: PaymentIntentSchema,
    queryKey: (id: string) => ['payment-intent', id] as QueryKey,
  },
  
  // Mutations
  createPaymentIntent: {
    input: CreatePaymentRequestSchema,
    output: CreatePaymentResponseSchema,
    invalidates: [],
  },
  confirmPayment: {
    input: ConfirmPaymentRequestSchema,
    output: ConfirmPaymentResponseSchema,
    invalidates: [['orders'], ['payment-intent']],
  },
  savePaymentMethod: {
    input: z.object({
      userId: z.string(),
      paymentMethodId: z.string(),
      setAsDefault: z.boolean().optional(),
    }),
    output: PaymentMethodSchema,
    invalidates: [['payment-methods']],
  },
  deletePaymentMethod: {
    input: z.object({
      userId: z.string(),
      paymentMethodId: z.string(),
    }),
    output: z.object({ success: z.boolean() }),
    invalidates: [['payment-methods']],
  },
} as const;

/**
 * Kiosk Hook Contracts
 */
export const kioskHookContracts = {
  // Queries
  getKioskConfig: {
    input: z.void(),
    output: KioskConfigSchema,
    queryKey: ['kiosk', 'config'] as QueryKey,
  },
  getKioskSession: {
    input: z.string().optional(),
    output: KioskSessionSchema.nullable(),
    queryKey: (sessionId?: string) => ['kiosk', 'session', sessionId] as QueryKey,
  },
  getKioskActivityLog: {
    input: z.object({
      sessionId: z.string().optional(),
      limit: z.number().optional(),
    }),
    output: z.array(KioskActivityLogSchema),
    queryKey: (filters?: any) => ['kiosk', 'activity', filters] as QueryKey,
  },
  
  // Mutations
  startKioskSession: {
    input: KioskStartSessionRequestSchema,
    output: KioskSessionSchema,
    invalidates: [['kiosk', 'session']],
  },
  endKioskSession: {
    input: KioskEndSessionRequestSchema,
    output: z.object({ success: z.boolean() }),
    invalidates: [['kiosk', 'session'], ['orders']],
  },
} as const;

// ================================
// Validation Helper Functions
// ================================

/**
 * Validate hook input against contract
 */
export function validateHookInput<T>(
  hookName: string,
  operationName: string,
  input: unknown,
  schema: z.ZodSchema<T>,
  options: HookContractOptions = {}
): HookContractValidationResult<T> {
  if (options.skipValidation) {
    return { valid: true, data: input as T };
  }

  const result = schema.safeParse(input);
  
  const validationResult: HookContractValidationResult<T> = {
    valid: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => 
      `${e.path.join('.')}: ${e.message}`
    ),
    metadata: {
      hookName,
      operationType: 'mutation',
      timestamp: new Date().toISOString(),
    }
  };

  if (!result.success) {
    if (options.logErrors) {
      console.error(`Hook input validation failed for ${hookName}.${operationName}:`, validationResult.errors);
    }
    
    if (options.onValidationError) {
      options.onValidationError(validationResult);
    }
    
    if (options.strict !== false) {
      throw new Error(
        `Hook contract violation in ${hookName}.${operationName}:\n${validationResult.errors?.join('\n')}`
      );
    }
  }

  return validationResult;
}

/**
 * Validate hook output against contract
 */
export function validateHookOutput<T>(
  hookName: string,
  operationName: string,
  output: unknown,
  schema: z.ZodSchema<T>,
  options: HookContractOptions = {}
): HookContractValidationResult<T> {
  if (options.skipValidation) {
    return { valid: true, data: output as T };
  }

  const result = schema.safeParse(output);
  
  const validationResult: HookContractValidationResult<T> = {
    valid: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => 
      `${e.path.join('.')}: ${e.message}`
    ),
    warnings: [],
    metadata: {
      hookName,
      operationType: 'query',
      timestamp: new Date().toISOString(),
    }
  };

  if (!result.success) {
    // For output validation, we're more lenient - log warnings but don't throw
    if (options.logErrors !== false) {
      console.warn(`Hook output validation warning for ${hookName}.${operationName}:`, validationResult.errors);
    }
    
    if (options.onValidationError) {
      options.onValidationError(validationResult);
    }
    
    // Only throw in strict mode
    if (options.strict === true) {
      throw new Error(
        `Hook contract violation in ${hookName}.${operationName}:\n${validationResult.errors?.join('\n')}`
      );
    }
  }

  return validationResult;
}

/**
 * Create a validated hook wrapper for queries
 */
export function createValidatedQuery<TData, TError = unknown>(
  hookName: string,
  operationName: string,
  queryResult: UseQueryResult<TData, TError>,
  outputSchema: z.ZodSchema<TData>,
  options: HookContractOptions = {}
): UseQueryResult<TData, TError> {
  // Validate on successful data fetch
  if (queryResult.data !== undefined && !queryResult.isLoading) {
    const validation = validateHookOutput(
      hookName,
      operationName,
      queryResult.data,
      outputSchema,
      options
    );
    
    // In non-strict mode, return data even if validation fails
    if (!validation.valid && options.strict !== true) {
      console.warn(`Using unvalidated data from ${hookName}.${operationName}`);
    }
  }
  
  return queryResult;
}

/**
 * Create a validated hook wrapper for mutations
 */
export function createValidatedMutation<TData, TError, TVariables, TContext = unknown>(
  hookName: string,
  operationName: string,
  mutationResult: UseMutationResult<TData, TError, TVariables, TContext>,
  inputSchema: z.ZodSchema<TVariables>,
  outputSchema: z.ZodSchema<TData>,
  options: HookContractOptions = {}
): UseMutationResult<TData, TError, TVariables, TContext> {
  const originalMutate = mutationResult.mutate;
  const originalMutateAsync = mutationResult.mutateAsync;
  
  // Wrap mutate function with validation
  mutationResult.mutate = (variables: TVariables, mutateOptions?: any) => {
    const inputValidation = validateHookInput(
      hookName,
      operationName,
      variables,
      inputSchema,
      options
    );
    
    if (!inputValidation.valid && options.strict !== false) {
      console.error(`Mutation blocked due to invalid input in ${hookName}.${operationName}`);
      return;
    }
    
    return originalMutate(variables, {
      ...mutateOptions,
      onSuccess: (data: TData, vars: TVariables, context: TContext) => {
        // Validate output
        validateHookOutput(hookName, operationName, data, outputSchema, options);
        
        // Call original onSuccess if provided
        if (mutateOptions?.onSuccess) {
          mutateOptions.onSuccess(data, vars, context);
        }
      },
    });
  };
  
  // Wrap mutateAsync function with validation
  mutationResult.mutateAsync = async (variables: TVariables, mutateOptions?: any) => {
    const inputValidation = validateHookInput(
      hookName,
      operationName,
      variables,
      inputSchema,
      options
    );
    
    if (!inputValidation.valid && options.strict !== false) {
      throw new Error(`Invalid input for ${hookName}.${operationName}`);
    }
    
    const result = await originalMutateAsync(variables, mutateOptions);
    
    // Validate output
    validateHookOutput(hookName, operationName, result, outputSchema, options);
    
    return result;
  };
  
  return mutationResult;
}

// ================================
// Batch Validation for Multiple Hooks
// ================================

/**
 * Validate multiple hook operations in batch
 */
export function validateHookBatch(
  operations: Array<{
    hookName: string;
    operationName: string;
    data: unknown;
    schema: z.ZodSchema;
    type: 'input' | 'output';
  }>,
  options: HookContractOptions = {}
): {
  allValid: boolean;
  results: HookContractValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    errors: string[];
  };
} {
  const results: HookContractValidationResult[] = [];
  const errors: string[] = [];
  
  for (const op of operations) {
    const validation = op.type === 'input'
      ? validateHookInput(op.hookName, op.operationName, op.data, op.schema, options)
      : validateHookOutput(op.hookName, op.operationName, op.data, op.schema, options);
    
    results.push(validation);
    
    if (!validation.valid && validation.errors) {
      errors.push(`${op.hookName}.${op.operationName}: ${validation.errors.join(', ')}`);
    }
  }
  
  const validCount = results.filter(r => r.valid).length;
  
  return {
    allValid: validCount === operations.length,
    results,
    summary: {
      total: operations.length,
      valid: validCount,
      invalid: operations.length - validCount,
      errors,
    },
  };
}

// ================================
// Contract Test Helpers
// ================================

/**
 * Create contract tests for a hook
 */
export function createHookContractTests(
  hookName: string,
  contracts: Record<string, {
    input?: z.ZodSchema;
    output: z.ZodSchema;
    queryKey?: QueryKey | ((...args: any[]) => QueryKey);
    invalidates?: QueryKey[];
  }>
) {
  describe(`${hookName} Hook Contract Tests`, () => {
    Object.entries(contracts).forEach(([operationName, contract]) => {
      describe(operationName, () => {
        if (contract.input) {
          it('should validate input schema', () => {
            // Test with valid input
            const validInput = contract.input.parse({
              /* Add valid test data based on schema */
            });
            expect(validInput).toBeDefined();
          });
        }
        
        it('should validate output schema', () => {
          // Test with valid output
          const validOutput = contract.output.parse({
            /* Add valid test data based on schema */
          });
          expect(validOutput).toBeDefined();
        });
        
        if (contract.queryKey) {
          it('should have valid query key', () => {
            const key = typeof contract.queryKey === 'function' 
              ? contract.queryKey()
              : contract.queryKey;
            expect(Array.isArray(key)).toBe(true);
            expect(key.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
}

// ================================
// Export All Contracts
// ================================

export const allHookContracts = {
  auth: authHookContracts,
  cart: cartHookContracts,
  products: productHookContracts,
  orders: orderHookContracts,
  payment: paymentHookContracts,
  kiosk: kioskHookContracts,
} as const;

// Type exports for TypeScript support
export type AuthHookContracts = typeof authHookContracts;
export type CartHookContracts = typeof cartHookContracts;
export type ProductHookContracts = typeof productHookContracts;
export type OrderHookContracts = typeof orderHookContracts;
export type PaymentHookContracts = typeof paymentHookContracts;
export type KioskHookContracts = typeof kioskHookContracts;
export type AllHookContracts = typeof allHookContracts;