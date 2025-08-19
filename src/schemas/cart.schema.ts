import { z } from 'zod';
import { ProductSchema } from './product.schema';

// Cart item schema with validation
export const CartItemSchema = z.object({
  product: ProductSchema,
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
}).refine((data) => {
  // Validate product availability
  if (data.product.is_available === false) {
    return false;
  }
  return true;
}, {
  message: "Cannot add unavailable product to cart",
  path: ["product"],
}).refine((data) => {
  // Validate stock availability
  if (data.product.stock_quantity !== null && data.quantity > data.product.stock_quantity) {
    return false;
  }
  return true;
}, {
  message: "Quantity exceeds available stock",
  path: ["quantity"],
});

// Cart state schema with total calculation validation
export const CartStateSchema = z.object({
  items: z.array(CartItemSchema),
  total: z.number().min(0),
}).refine((data) => {
  // Validate total calculation
  const calculatedTotal = data.items.reduce((sum, item) => {
    return sum + (item.product.price * item.quantity);
  }, 0);
  
  const tolerance = 0.01; // Allow for small floating point differences
  return Math.abs(data.total - calculatedTotal) < tolerance;
}, {
  message: "Cart total must equal sum of (price × quantity) for all items",
  path: ["total"],
});

// Raw database cart item schema (validation only, no transformation)
const RawDbCartItemSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  product_id: z.string().min(1),
  quantity: z.number().int().min(1),
  created_at: z.string().nullable().optional(),    // Database allows null/undefined
  updated_at: z.string().nullable().optional(),    // Database allows null/undefined
});

// Legacy schema for backward compatibility (deprecated - use transformation schemas instead)
export const DbCartItemSchema = RawDbCartItemSchema;

// Cart item transformation schema (DB → App format)
// This is the main schema that should be used by cartService
export const DbCartItemTransformSchema = RawDbCartItemSchema.extend({
  product: z.any().optional() // Will be populated by cartService after product lookup
}).transform((data) => ({
  // App format (CartItem interface)
  product: data.product, // Set by cart service after product lookup
  quantity: data.quantity,
  
  // Internal metadata for cart operations
  _dbData: {
    id: data.id,
    user_id: data.user_id,
    product_id: data.product_id,
    created_at: data.created_at,
    updated_at: data.updated_at
  }
}));

// Cart state transformation helper for bulk operations
export const DbCartItemArrayTransformSchema = z.array(RawDbCartItemSchema);

// Cart operation request schemas
export const AddToCartRequestSchema = z.object({
  product: ProductSchema,
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
}).refine((data) => {
  // Validate product is available
  if (data.product.is_available === false) {
    return false;
  }
  return true;
}, {
  message: "Cannot add unavailable product to cart",
  path: ["product"],
});

export const UpdateCartItemRequestSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
});

export const RemoveFromCartRequestSchema = z.object({
  productId: z.string().min(1),
});

// Cart operation response schemas
export const CartOperationResponseSchema = z.object({
  success: z.boolean(),
  cartState: CartStateSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Cart sync response schema (for cross-device sync)
export const CartSyncResponseSchema = z.object({
  success: z.boolean(),
  localCart: CartStateSchema.optional(),
  serverCart: CartStateSchema.optional(),
  mergedCart: CartStateSchema.optional(),
  conflicts: z.array(z.object({
    productId: z.string(),
    localQuantity: z.number(),
    serverQuantity: z.number(),
    resolvedQuantity: z.number(),
  })).optional(),
  error: z.string().optional(),
});

// Stock validation response schema
export const StockValidationResponseSchema = z.object({
  success: z.boolean(),
  validItems: z.array(CartItemSchema),
  invalidItems: z.array(z.object({
    item: CartItemSchema,
    reason: z.string(),
    availableStock: z.number().optional(),
  })),
  updatedCart: CartStateSchema.optional(),
  error: z.string().optional(),
});

// Cart summary schema (for checkout)
export const CartSummarySchema = z.object({
  itemCount: z.number().int().min(0),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    price: z.number().min(0),
    quantity: z.number().int().min(1),
    subtotal: z.number().min(0),
  })),
}).refine((data) => {
  // Validate subtotal calculation
  const calculatedSubtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
  const tolerance = 0.01;
  return Math.abs(data.subtotal - calculatedSubtotal) < tolerance;
}, {
  message: "Subtotal must equal sum of item subtotals",
  path: ["subtotal"],
}).refine((data) => {
  // Validate total calculation
  const expectedTotal = data.subtotal + data.tax;
  const tolerance = 0.01;
  return Math.abs(data.total - expectedTotal) < tolerance;
}, {
  message: "Total must equal subtotal + tax",
  path: ["total"],
});

// Cart persistence request schema
export const SaveCartRequestSchema = z.object({
  cartState: CartStateSchema,
  userId: z.string().min(1),
});

// Cart retrieval response schema
export const GetCartResponseSchema = z.object({
  success: z.boolean(),
  cartState: CartStateSchema.optional(),
  lastUpdated: z.string().optional(),
  error: z.string().optional(),
});

// Cart clearing response schema
export const ClearCartResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Cart merge strategy schema
export const CartMergeStrategySchema = z.enum(['keep_local', 'keep_server', 'merge_sum', 'merge_max']);

// Cart merge request schema
export const CartMergeRequestSchema = z.object({
  localCart: CartStateSchema,
  serverCart: CartStateSchema,
  strategy: CartMergeStrategySchema,
});

// Arrays for bulk operations
export const CartItemArraySchema = z.array(CartItemSchema);
export const DbCartItemArraySchema = z.array(DbCartItemSchema);

// Export types inferred from schemas
export type ValidatedCartItem = z.infer<typeof CartItemSchema>;
export type ValidatedCartState = z.infer<typeof CartStateSchema>;
export type ValidatedDbCartItem = z.infer<typeof DbCartItemSchema>;
export type ValidatedDbCartItemTransformed = z.infer<typeof DbCartItemTransformSchema>;
export type ValidatedAddToCartRequest = z.infer<typeof AddToCartRequestSchema>;
export type ValidatedUpdateCartItemRequest = z.infer<typeof UpdateCartItemRequestSchema>;
export type ValidatedRemoveFromCartRequest = z.infer<typeof RemoveFromCartRequestSchema>;
export type ValidatedCartOperationResponse = z.infer<typeof CartOperationResponseSchema>;
export type ValidatedCartSyncResponse = z.infer<typeof CartSyncResponseSchema>;
export type ValidatedStockValidationResponse = z.infer<typeof StockValidationResponseSchema>;
export type ValidatedCartSummary = z.infer<typeof CartSummarySchema>;
export type ValidatedSaveCartRequest = z.infer<typeof SaveCartRequestSchema>;
export type ValidatedGetCartResponse = z.infer<typeof GetCartResponseSchema>;
export type ValidatedClearCartResponse = z.infer<typeof ClearCartResponseSchema>;
export type ValidatedCartMergeStrategy = z.infer<typeof CartMergeStrategySchema>;
export type ValidatedCartMergeRequest = z.infer<typeof CartMergeRequestSchema>;