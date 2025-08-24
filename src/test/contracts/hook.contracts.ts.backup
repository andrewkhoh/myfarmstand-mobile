/**
 * Hook Contract Validators
 * 
<<<<<<< HEAD
 * Ensures hook layer outputs match expected schemas.
 * Provides validation for all hook return values and mutations.
 */

import { z } from 'zod';

// Base schemas for common hook patterns
const BaseUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['customer', 'admin', 'staff']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const BaseProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number().min(0),
  unit: z.string(),
  category_id: z.string(),
  farmer_id: z.string(),
  stock_quantity: z.number().min(0),
  is_available: z.boolean(),
  image_url: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const BaseOrderSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  status: z.enum(['pending', 'confirmed', 'ready', 'completed', 'cancelled']),
  total_amount: z.number().min(0),
  pickup_time: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const BaseCartItemSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0),
  product: BaseProductSchema.optional(),
});

const BaseCartSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  items: z.array(BaseCartItemSchema),
  total: z.number().min(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Auth hook contracts
export const authContracts = {
  validateLogin: (result: unknown) => {
    const schema = z.object({
      user: BaseUserSchema,
      session: z.object({
        access_token: z.string(),
        refresh_token: z.string().optional(),
        expires_at: z.string().optional(),
      }).optional(),
    });
    return schema.parse(result);
  },
  
  validateRegister: (result: unknown) => {
    const schema = z.object({
      user: BaseUserSchema,
      session: z.object({
        access_token: z.string(),
        refresh_token: z.string().optional(),
      }).optional(),
    });
    return schema.parse(result);
  },
  
  validateLogout: (result: unknown) => {
    const schema = z.object({
      success: z.boolean(),
    });
    return schema.parse(result);
  },
  
  validateCurrentUser: (result: unknown) => {
    const schema = BaseUserSchema.nullable();
    return schema.parse(result);
  },
  
  validateAuthStatus: (result: unknown) => {
    const schema = z.object({
      isAuthenticated: z.boolean(),
      isLoading: z.boolean(),
      user: BaseUserSchema.nullable(),
    });
    return schema.parse(result);
  },
};

// Cart hook contracts
export const cartContracts = {
  validateCart: (result: unknown) => {
    return BaseCartSchema.parse(result);
  },
  
  validateAddItem: (result: unknown) => {
    const schema = z.object({
      success: z.boolean(),
      cart: BaseCartSchema.optional(),
      item: BaseCartItemSchema.optional(),
    });
    return schema.parse(result);
  },
  
  validateUpdateQuantity: (result: unknown) => {
    const schema = z.object({
      success: z.boolean(),
      cart: BaseCartSchema.optional(),
      item: BaseCartItemSchema.optional(),
    });
    return schema.parse(result);
  },
  
  validateRemoveItem: (result: unknown) => {
    const schema = z.object({
      success: z.boolean(),
      cart: BaseCartSchema.optional(),
    });
    return schema.parse(result);
  },
  
  validateClearCart: (result: unknown) => {
    const schema = z.object({
      success: z.boolean(),
    });
    return schema.parse(result);
  },
};

// Orders hook contracts
export const orderContracts = {
  validateOrder: (result: unknown) => {
    return BaseOrderSchema.parse(result);
  },
  
  validateOrderList: (result: unknown) => {
    const schema = z.array(BaseOrderSchema);
    return schema.parse(result);
  },
  
  validateCreateOrder: (result: unknown) => {
    const schema = z.object({
      order: BaseOrderSchema,
      success: z.boolean().optional(),
    });
    return schema.parse(result);
  },
  
  validateUpdateOrder: (result: unknown) => {
    const schema = z.object({
      order: BaseOrderSchema,
      success: z.boolean().optional(),
    });
    return schema.parse(result);
  },
  
  validateCancelOrder: (result: unknown) => {
    const schema = z.object({
      success: z.boolean(),
      order: BaseOrderSchema.optional(),
    });
    return schema.parse(result);
  },
};

// Products hook contracts
export const productContracts = {
  validateProduct: (result: unknown) => {
    return BaseProductSchema.parse(result);
  },
  
  validateProductList: (result: unknown) => {
    const schema = z.array(BaseProductSchema);
    return schema.parse(result);
  },
  
  validateSearchResults: (result: unknown) => {
    const schema = z.object({
      products: z.array(BaseProductSchema),
      total: z.number(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    });
    return schema.parse(result);
  },
  
  validateCategories: (result: unknown) => {
    const schema = z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      product_count: z.number().optional(),
    }));
    return schema.parse(result);
  },
};

// Kiosk hook contracts
export const kioskContracts = {
  validateKioskAuth: (result: unknown) => {
    const schema = z.object({
      authenticated: z.boolean(),
      staff: z.object({
        id: z.string(),
        name: z.string(),
        role: z.enum(['staff', 'manager', 'admin']),
      }).nullable(),
    });
    return schema.parse(result);
  },
  
  validateKioskOrder: (result: unknown) => {
    const schema = z.object({
      order: BaseOrderSchema,
      customer: BaseUserSchema.optional(),
    });
    return schema.parse(result);
  },
};

// Realtime hook contracts
export const realtimeContracts = {
  validateSubscription: (result: unknown) => {
    const schema = z.object({
      channel: z.string(),
      status: z.enum(['connected', 'disconnected', 'error']),
      error: z.string().optional(),
    });
    return schema.parse(result);
  },
  
  validateBroadcast: (result: unknown) => {
    const schema = z.object({
      channel: z.string(),
      event: z.string(),
      payload: z.any(),
      timestamp: z.string(),
    });
    return schema.parse(result);
  },
};

// Payment hook contracts
export const paymentContracts = {
  validatePaymentIntent: (result: unknown) => {
    const schema = z.object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      status: z.enum(['pending', 'processing', 'succeeded', 'failed']),
      client_secret: z.string().optional(),
    });
    return schema.parse(result);
  },
  
  validatePaymentMethod: (result: unknown) => {
    const schema = z.object({
      id: z.string(),
      type: z.enum(['card', 'apple_pay', 'google_pay']),
      last4: z.string().optional(),
      brand: z.string().optional(),
    });
    return schema.parse(result);
  },
};

// Notification hook contracts
export const notificationContracts = {
  validateNotification: (result: unknown) => {
    const schema = z.object({
      id: z.string(),
      title: z.string(),
      message: z.string(),
      type: z.enum(['info', 'success', 'warning', 'error']),
      read: z.boolean(),
      created_at: z.string(),
    });
    return schema.parse(result);
  },
  
  validateNotificationList: (result: unknown) => {
    const schema = z.array(z.object({
      id: z.string(),
      title: z.string(),
      message: z.string(),
      type: z.enum(['info', 'success', 'warning', 'error']),
      read: z.boolean(),
      created_at: z.string(),
    }));
    return schema.parse(result);
  },
};

// Helper function to create hook test validators
export function createHookContractValidator<T>(
  hookName: string,
  contracts: Record<string, (result: unknown) => T>
) {
  return {
    validate: (method: string, result: unknown): T => {
      const validator = contracts[method];
      if (!validator) {
        throw new Error(`No contract validator found for ${hookName}.${method}`);
      }
      
      try {
        return validator(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.errors.map(e => 
            `${e.path.join('.')}: ${e.message}`
          ).join('\n');
          throw new Error(
            `Hook contract violation in ${hookName}.${method}:\n${errors}`
          );
        }
        throw error;
      }
    },
    
    validateAll: (results: Record<string, unknown>): Record<string, T> => {
      const validated: Record<string, T> = {};
      
      for (const [method, result] of Object.entries(results)) {
        const validator = contracts[method];
        if (validator) {
          validated[method] = validator(result);
        }
      }
      
      return validated;
=======
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
>>>>>>> test-refactor-schemas
    },
  };
}

<<<<<<< HEAD
// Export all hook contracts
export const hookContracts = {
  auth: createHookContractValidator('useAuth', authContracts),
  cart: createHookContractValidator('useCart', cartContracts),
  orders: createHookContractValidator('useOrders', orderContracts),
  products: createHookContractValidator('useProducts', productContracts),
  kiosk: createHookContractValidator('useKiosk', kioskContracts),
  realtime: createHookContractValidator('useRealtime', realtimeContracts),
  payment: createHookContractValidator('usePayment', paymentContracts),
  notifications: createHookContractValidator('useNotifications', notificationContracts),
};

// Test helper for hook validation in tests
export function expectHookResult<T>(
  hookName: keyof typeof hookContracts,
  method: string,
  result: unknown
): T {
  return (hookContracts[hookName] as any).validate(method, result);
}
=======
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
>>>>>>> test-refactor-schemas
