/**
 * Service Contract Validators
 * 
 * Comprehensive validation layer ensuring service layer outputs match schema contracts.
 * This creates a safety net between services and consumers.
 * 
 * Following MyFarmstand Mobile Architectural Patterns:
 * - Database-first validation
 * - Single validation pass with transformation
 * - Graceful error handling
 * - User-isolated operations
 */

import { z } from 'zod';

// Import all service schemas for validation
import { 
  UserSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
  UpdateProfileResponseSchema
} from '../../schemas/auth.schema';

import {
  CartStateSchema,
  CartOperationResponseSchema,
  CartSyncResponseSchema,
  StockValidationResponseSchema
} from '../../schemas/cart.schema';

import {
  ProductSchema,
  ProductArraySchema,
  CategoryArraySchema
} from '../../schemas/product.schema';

import {
  OrderSchema,
  CreateOrderResponseSchema,
  UpdateOrderResponseSchema
} from '../../schemas/order.schema';

import {
  PaymentSchema,
  CreatePaymentResponseSchema,
  ConfirmPaymentResponseSchema,
  PaymentMethodListResponseSchema
} from '../../schemas/payment.schema';

import {
  KioskSessionSchema,
  KioskConfigSchema
} from '../../schemas/kiosk.schema';

export interface ContractValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    serviceName: string;
    methodName: string;
    timestamp: string;
    userId?: string;
    duration?: number;
  };
}

export interface ServiceContractOptions {
  strict?: boolean;
  logErrors?: boolean;
  validateInput?: boolean;
  validateOutput?: boolean;
  skipValidation?: boolean;
  transformOutput?: boolean;
  onValidationError?: (result: ContractValidationResult) => void;
  onValidationSuccess?: (result: ContractValidationResult) => void;
}

/**
 * Validate service output against schema contract
 */
export function validateServiceOutput<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  options: ServiceContractOptions = {},
  metadata?: Partial<ContractValidationResult['metadata']>
): ContractValidationResult<T> {
  if (options.skipValidation) {
    return { valid: true, data: data as T };
  }

  const startTime = Date.now();
  const result = schema.safeParse(data);
  const duration = Date.now() - startTime;
  
  const validationResult: ContractValidationResult<T> = {
    valid: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error.errors.map(e => 
      `${e.path.join('.')}: ${e.message}`
    ),
    metadata: {
      serviceName: metadata?.serviceName || 'unknown',
      methodName: metadata?.methodName || 'unknown',
      timestamp: new Date().toISOString(),
      duration,
      ...metadata
    }
  };
  
  if (!result.success) {
    if (options.logErrors !== false) {
      console.error(`Service contract violation in ${metadata?.serviceName}.${metadata?.methodName}:`, validationResult.errors);
    }
    
    if (options.onValidationError) {
      options.onValidationError(validationResult);
    }
    
    if (options.strict !== false) {
      throw new Error(
        `Service contract violation:\n${validationResult.errors?.join('\n')}`
      );
    }
  } else {
    if (options.onValidationSuccess) {
      options.onValidationSuccess(validationResult);
    }
  }
  
  return validationResult;
}

/**
 * Validate service input against schema contract
 */
export function validateServiceInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  options: ServiceContractOptions = {},
  metadata?: Partial<ContractValidationResult['metadata']>
): ContractValidationResult<T> {
  if (options.skipValidation || !options.validateInput) {
    return { valid: true, data: data as T };
  }

  return validateServiceOutput(data, schema, options, metadata);
}

/**
 * Batch validate multiple outputs
 */
export function validateBatch(
  items: Array<{ data: unknown; schema: z.ZodSchema; name: string }>
): ContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const item of items) {
    const result = item.schema.safeParse(item.data);
    
    if (!result.success) {
      const itemErrors = result.error.errors.map(e => 
        `${item.name}.${e.path.join('.')}: ${e.message}`
      );
      errors.push(...itemErrors);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create a contract test suite for a service
 */
export function createServiceContractTests<T>(
  serviceName: string,
  service: T,
  contracts: Array<{
    method: keyof T;
    schema: z.ZodSchema;
    args?: any[];
    description?: string;
  }>
) {
  describe(`${serviceName} Contract Validation`, () => {
    contracts.forEach(({ method, schema, args = [], description }) => {
      const testName = description || `${String(method)} should return schema-valid data`;
      
      it(testName, async () => {
        // Call the service method
        const serviceMethod = service[method] as any;
        const result = await serviceMethod(...args);
        
        // Validate against schema
        const validation = schema.safeParse(result);
        
        if (!validation.success) {
          const errors = validation.error.errors.map(e => 
            `${e.path.join('.')}: ${e.message}`
          );
          
          fail(`Contract violation in ${serviceName}.${String(method)}:\n${errors.join('\n')}`);
        }
        
        expect(validation.success).toBe(true);
      });
    });
  });
}

/**
 * Middleware for automatic contract validation
 */
export function withContractValidation<T extends (...args: any[]) => any>(
  fn: T,
  schema: z.ZodSchema,
  options: { validateInput?: z.ZodSchema; logErrors?: boolean } = {}
): T {
  return (async (...args: Parameters<T>) => {
    // Validate input if schema provided
    if (options.validateInput) {
      const inputResult = options.validateInput.safeParse(args[0]);
      if (!inputResult.success && options.logErrors) {
        console.error('Input validation failed:', inputResult.error);
      }
    }
    
    // Call original function
    const result = await fn(...args);
    
    // Validate output
    const outputResult = schema.safeParse(result);
    if (!outputResult.success) {
      if (options.logErrors) {
        console.error('Output validation failed:', outputResult.error);
      }
      throw new Error(`Contract violation: ${outputResult.error.message}`);
    }
    
    return result;
  }) as T;
}

/**
 * Test helper to ensure a value matches schema
 */
export function expectSchemaMatch<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
  message?: string
): void {
  const result = schema.safeParse(value);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => 
      `  - ${e.path.join('.')}: ${e.message}`
    ).join('\n');
    
    const errorMessage = message 
      ? `${message}\nSchema validation errors:\n${errors}`
      : `Schema validation failed:\n${errors}`;
    
    throw new Error(errorMessage);
  }
}

/**
 * Create a mock that validates its return values
 */
export function createValidatedMock<T>(
  schema: z.ZodSchema<T>,
  defaultValue: T | ((...args: any[]) => T)
): jest.Mock {
  return jest.fn().mockImplementation((...args) => {
    const result = typeof defaultValue === 'function' 
      ? defaultValue(...args)
      : defaultValue;
    
    // Validate the mock return value
    const validation = schema.safeParse(result);
    if (!validation.success) {
      throw new Error(
        `Mock returned invalid data: ${validation.error.message}`
      );
    }
    
    return result;
  });
}

// ================================
// Service-Specific Contract Definitions
// ================================

/**
 * Auth Service Contracts
 */
export const authServiceContracts = {
  login: {
    input: z.object({
      email: z.string().email(),
      password: z.string()
    }),
    output: LoginResponseSchema
  },
  register: {
    input: z.object({
      email: z.string().email(),
      password: z.string(),
      name: z.string()
    }),
    output: RegisterResponseSchema
  },
  getCurrentUser: {
    input: z.void(),
    output: UserSchema.nullable()
  },
  updateProfile: {
    input: z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional()
    }),
    output: UpdateProfileResponseSchema
  },
  logout: {
    input: z.void(),
    output: z.object({ success: z.boolean() })
  }
} as const;

/**
 * Cart Service Contracts
 */
export const cartServiceContracts = {
  getCart: {
    input: z.string().optional(),
    output: CartStateSchema
  },
  addToCart: {
    input: z.object({
      userId: z.string().optional(),
      product: ProductSchema,
      quantity: z.number()
    }),
    output: CartOperationResponseSchema
  },
  updateCartItem: {
    input: z.object({
      userId: z.string().optional(),
      productId: z.string(),
      quantity: z.number()
    }),
    output: CartOperationResponseSchema
  },
  removeFromCart: {
    input: z.object({
      userId: z.string().optional(),
      productId: z.string()
    }),
    output: CartOperationResponseSchema
  },
  clearCart: {
    input: z.string().optional(),
    output: z.object({ success: z.boolean() })
  },
  syncCart: {
    input: z.object({
      userId: z.string(),
      localCart: CartStateSchema
    }),
    output: CartSyncResponseSchema
  },
  validateStock: {
    input: CartStateSchema,
    output: StockValidationResponseSchema
  }
} as const;

/**
 * Product Service Contracts
 */
export const productServiceContracts = {
  getProducts: {
    input: z.object({
      categoryId: z.string().optional(),
      search: z.string().optional(),
      isWeeklySpecial: z.boolean().optional()
    }).optional(),
    output: ProductArraySchema
  },
  getProduct: {
    input: z.string(),
    output: ProductSchema
  },
  getCategories: {
    input: z.void(),
    output: CategoryArraySchema
  },
  searchProducts: {
    input: z.string(),
    output: ProductArraySchema
  }
} as const;

/**
 * Order Service Contracts
 */
export const orderServiceContracts = {
  createOrder: {
    input: z.object({
      userId: z.string().optional(),
      cart: CartStateSchema,
      customerInfo: z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string(),
        address: z.string().optional()
      }),
      fulfillmentType: z.enum(['pickup', 'delivery']),
      paymentMethod: z.enum(['online', 'cash_on_pickup'])
    }),
    output: CreateOrderResponseSchema
  },
  getOrder: {
    input: z.string(),
    output: OrderSchema
  },
  getOrders: {
    input: z.object({
      userId: z.string().optional(),
      status: z.string().optional()
    }).optional(),
    output: z.array(OrderSchema)
  },
  updateOrderStatus: {
    input: z.object({
      orderId: z.string(),
      status: z.enum(['pending', 'confirmed', 'ready', 'completed', 'cancelled'])
    }),
    output: UpdateOrderResponseSchema
  },
  cancelOrder: {
    input: z.object({
      orderId: z.string(),
      reason: z.string().optional()
    }),
    output: z.object({ success: z.boolean() })
  }
} as const;

/**
 * Payment Service Contracts
 */
export const paymentServiceContracts = {
  createPaymentIntent: {
    input: z.object({
      amount: z.number(),
      currency: z.string(),
      orderId: z.string()
    }),
    output: CreatePaymentResponseSchema
  },
  confirmPayment: {
    input: z.object({
      paymentIntentId: z.string(),
      paymentMethodId: z.string()
    }),
    output: ConfirmPaymentResponseSchema
  },
  getPaymentMethods: {
    input: z.string(),
    output: PaymentMethodListResponseSchema
  },
  savePaymentMethod: {
    input: z.object({
      userId: z.string(),
      paymentMethodId: z.string()
    }),
    output: PaymentSchema
  }
} as const;

/**
 * Kiosk Service Contracts
 */
export const kioskServiceContracts = {
  startSession: {
    input: z.object({
      pin: z.string(),
      deviceId: z.string().optional()
    }),
    output: KioskSessionSchema
  },
  endSession: {
    input: z.string(),
    output: z.object({ success: z.boolean() })
  },
  getConfig: {
    input: z.void(),
    output: KioskConfigSchema
  },
  validatePin: {
    input: z.string(),
    output: z.object({
      valid: z.boolean(),
      role: z.string().optional()
    })
  }
} as const;

// ================================
// Service Contract Wrapper
// ================================

/**
 * Wrap a service method with automatic contract validation
 */
export function withServiceContract<
  TInput,
  TOutput,
  TService extends (...args: any[]) => any
>(
  serviceName: string,
  methodName: string,
  method: TService,
  contracts: {
    input?: z.ZodSchema<TInput>;
    output: z.ZodSchema<TOutput>;
  },
  options: ServiceContractOptions = {}
): TService {
  return (async (...args: Parameters<TService>) => {
    const metadata = {
      serviceName,
      methodName,
      timestamp: new Date().toISOString()
    };

    // Validate input if schema provided
    if (contracts.input && options.validateInput !== false) {
      const inputValidation = validateServiceInput(
        args[0],
        contracts.input,
        options,
        metadata
      );
      
      if (!inputValidation.valid && options.strict !== false) {
        throw new Error(
          `Input validation failed for ${serviceName}.${methodName}`
        );
      }
    }
    
    // Call original method
    const result = await method(...args);
    
    // Validate output
    if (options.validateOutput !== false) {
      const outputValidation = validateServiceOutput(
        result,
        contracts.output,
        options,
        metadata
      );
      
      if (!outputValidation.valid && options.strict === true) {
        throw new Error(
          `Output validation failed for ${serviceName}.${methodName}`
        );
      }
      
      return outputValidation.data || result;
    }
    
    return result;
  }) as TService;
}

// ================================
// Batch Service Validation
// ================================

/**
 * Validate multiple service operations in batch
 */
export function validateServiceBatch(
  operations: Array<{
    serviceName: string;
    methodName: string;
    data: unknown;
    schema: z.ZodSchema;
    type: 'input' | 'output';
  }>,
  options: ServiceContractOptions = {}
): {
  allValid: boolean;
  results: ContractValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    errors: string[];
    avgDuration: number;
  };
} {
  const results: ContractValidationResult[] = [];
  const errors: string[] = [];
  let totalDuration = 0;
  
  for (const op of operations) {
    const metadata = {
      serviceName: op.serviceName,
      methodName: op.methodName
    };
    
    const validation = op.type === 'input'
      ? validateServiceInput(op.data, op.schema, options, metadata)
      : validateServiceOutput(op.data, op.schema, options, metadata);
    
    results.push(validation);
    totalDuration += validation.metadata?.duration || 0;
    
    if (!validation.valid && validation.errors) {
      errors.push(`${op.serviceName}.${op.methodName}: ${validation.errors.join(', ')}`);
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
      avgDuration: totalDuration / operations.length
    }
  };
}

// ================================
// Export All Contracts
// ================================

export const allServiceContracts = {
  auth: authServiceContracts,
  cart: cartServiceContracts,
  products: productServiceContracts,
  orders: orderServiceContracts,
  payment: paymentServiceContracts,
  kiosk: kioskServiceContracts
} as const;

// Type exports
export type AuthServiceContracts = typeof authServiceContracts;
export type CartServiceContracts = typeof cartServiceContracts;
export type ProductServiceContracts = typeof productServiceContracts;
export type OrderServiceContracts = typeof orderServiceContracts;
export type PaymentServiceContracts = typeof paymentServiceContracts;
export type KioskServiceContracts = typeof kioskServiceContracts;
export type AllServiceContracts = typeof allServiceContracts;