/**
 * Hook Contract Validators
 * 
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
    },
  };
}

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