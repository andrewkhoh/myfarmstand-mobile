import { supabase } from '../config/supabase';
import { CartState, CartItem, Product } from '../types';
import { cartBroadcast } from '../utils/broadcastFactory';
import { 
  getProductStock, 
  isProductPreOrder, 
  getProductMinPreOrderQty, 
  getProductMaxPreOrderQty,
  mapProductFromDB 
} from '../utils/typeMappers';
import {
  CartStateSchema,
  CartItemSchema,
  DbCartItemSchema,
  CartOperationResponseSchema,
  SaveCartRequestSchema,
  GetCartResponseSchema
} from '../schemas/cart.schema';
import { ProductSchema } from '../schemas/product.schema';
import { ZodError, z } from 'zod';
import { ValidationMonitor } from '../utils/validationMonitor';
import { DefensiveDatabase, DatabaseHelpers } from '../utils/defensiveDatabase';
import { ServiceValidator, ValidationUtils } from '../utils/validationPipeline';

// Import DbCartItemSchema from cart schema (already defined there)

// Database cart item interface
interface DbCartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

// Validation helper functions with backward-compatible error handling
const validateCartState = (cartData: any): CartState => {
  try {
    return CartStateSchema.parse(cartData);
  } catch (error) {
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'CartService.validateCartState',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'CART_STATE_VALIDATION_FAILED'
    });
    
    console.warn('Invalid cart state data:', {
      error: error instanceof Error ? error.message : 'Unknown validation error',
      invalidData: cartData
    });
    throw new Error('Invalid cart state data');
  }
};

const validateCartItem = (itemData: any): CartItem => {
  try {
    return CartItemSchema.parse(itemData);
  } catch (error) {
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'CartService.validateCartItem',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'CART_ITEM_VALIDATION_FAILED'
    });
    
    console.warn('Invalid cart item data:', {
      error: error instanceof Error ? error.message : 'Unknown validation error',
      invalidData: itemData
    });
    throw new Error('Invalid cart item data');
  }
};

const validateProduct = (productData: any): Product => {
  try {
    return ProductSchema.parse(productData);
  } catch (error) {
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'CartService.validateProduct',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'PRODUCT_VALIDATION_FAILED'
    });
    
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new Error(`Invalid product data: ${firstIssue.message}`);
    }
    throw new Error('Invalid product data provided');
  }
};

const validateAndConvertDbCartItems = (dbItems: DbCartItem[], products: any[]): CartItem[] => {
  const validCartItems: CartItem[] = [];
  
  for (const dbItem of dbItems) {
    try {
      // Find corresponding product
      const productData = products.find(p => p.id === dbItem.product_id);
      if (!productData) {
        console.warn('Product not found for cart item, skipping:', {
          cartItemId: dbItem.id,
          productId: dbItem.product_id
        });
        continue;
      }

      // Map and validate product
      const mappedProduct = mapProductFromDB(productData);
      const validatedProduct = validateProduct(mappedProduct);

      // Create cart item
      const cartItem = {
        product: validatedProduct,
        quantity: dbItem.quantity
      };

      const validatedCartItem = validateCartItem(cartItem);
      validCartItems.push(validatedCartItem);
    } catch (error) {
      console.warn('Invalid cart item, skipping:', {
        cartItemId: dbItem.id,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        invalidData: dbItem
      });
    }
  }
  
  return validCartItems;
};

// Calculate total helper
const calculateTotal = (items: CartItem[]): number => {
  if (!items || items.length === 0) return 0;
  return items.reduce((total, item) => {
    const price = item.product?.price || 0;
    const quantity = item.quantity || 0;
    return total + (price * quantity);
  }, 0);
};

// Production calculation validation helper
const validateCartTotal = (cart: CartState): CartState => {
  const calculatedTotal = calculateTotal(cart.items);
  const tolerance = 0.01;
  const difference = Math.abs(cart.total - calculatedTotal);
  
  if (difference > tolerance) {
    // Log calculation mismatch for monitoring
    ValidationMonitor.recordCalculationMismatch({
      type: 'cart_total',
      expected: calculatedTotal,
      actual: cart.total,
      difference,
      tolerance,
      cartId: 'user-cart' // In production, could include actual cart ID
    });
    
    // Auto-correct the cart total
    return {
      ...cart,
      total: calculatedTotal
    };
  }
  
  return cart;
};

// Helper to convert database cart items to app format
const convertDbCartItemsToCartState = async (dbItems: DbCartItem[]): Promise<CartState> => {
  // Fetch all products at once for efficiency using defensive database access
  const productIds = dbItems.map(item => item.product_id);
  
  const products = await DatabaseHelpers.fetchFiltered(
    'products',
    `cart-products-${productIds.length}`,
    ProductSchema,
    async () => supabase
      .from('products')
      .select('*')
      .in('id', productIds),
    {
      maxErrorThreshold: 0.2, // Allow up to 20% invalid products
      includeDetailedErrors: false // Don't include product details in logs for privacy
    }
  );
  
  // Use validation helper to convert and validate cart items
  const validCartItems = validateAndConvertDbCartItems(dbItems, products);
  
  // Create and validate cart state
  const cartStateData = {
    items: validCartItems,
    total: calculateTotal(validCartItems)
  };
  
  const validatedCart = validateCartState(cartStateData);
  
  // Add production calculation validation
  return validateCartTotal(validatedCart);
};

export const cartService = {
  // Get cart from Supabase only (React Query handles caching)
  getCart: async (): Promise<CartState> => {
    console.log('🛒 getCart() called - fetching from Supabase only...');
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 User auth status:', user ? 'authenticated' : 'not authenticated');
      
      if (!user) {
        console.log('🚫 User not authenticated, returning empty cart');
        return { items: [], total: 0 };
      }
      
      // User is authenticated - get cart from Supabase using defensive database access
      console.log('📡 Fetching cart from Supabase for user:', user.id);
      
      const dbCartItems = await DatabaseHelpers.fetchFiltered(
        'cart_items',
        `user-${user.id}`,
        DbCartItemSchema,
        async () => supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        {
          maxErrorThreshold: 0.1, // Allow up to 10% invalid cart items
          includeDetailedErrors: false, // Don't log cart details for privacy
          throwOnCriticalFailure: false // Continue with valid items even if some are invalid
        }
      );
      
      console.log('📊 Defensive cart query result:', { 
        itemCount: dbCartItems.length,
        userId: user.id 
      });
      
      if (dbCartItems && dbCartItems.length > 0) {
        console.log('📌 Cart has items, converting and returning...');
        const cartState = await convertDbCartItemsToCartState(dbCartItems);
        console.log('✅ Returning cart with items:', cartState);
        return cartState;
      } else {
        console.log('✅ No cart items in Supabase, returning empty cart');
        return { items: [], total: 0 };
      }
    } catch (error) {
      console.warn('Failed to load cart:', error);
      throw error; // Let React Query handle error states
    }
  },

  // Save cart to Supabase only (React Query handles caching)
  saveCart: async (cart: CartState): Promise<CartState> => {
    try {
      // Validate cart state before saving
      const validatedCart = validateCartState(cart);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🚫 User not authenticated, cannot save cart to Supabase');
        throw new Error('User must be authenticated to save cart');
      }
      
      // User is authenticated - save cart to Supabase using pure UPSERT
      console.log('💾 Saving cart to Supabase for user:', user.id);
      
      if (validatedCart.items.length > 0) {
        // Use pure UPSERT - truly atomic for each cart item
        const cartItemsToUpsert = validatedCart.items.map(item => ({
          user_id: user.id,
          product_id: item.product.id,
          quantity: item.quantity
        }));
        
        const { error } = await supabase
          .from('cart_items')
          .upsert(cartItemsToUpsert, {
            onConflict: 'user_id,product_id'
          });
        
        if (error) {
          console.warn('Failed to save cart to Supabase:', error);
          throw error; // Let React Query handle retries
        }
      } else {
        // Cart is empty - clear all items for this user
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);
      }
      
      // Return validated cart with calculated total
      const updatedCartData = {
        items: validatedCart.items,
        total: calculateTotal(validatedCart.items)
      };
      
      const updatedCart = validateCartState(updatedCartData);
      
      // Add production calculation validation
      const validatedUpdatedCart = validateCartTotal(updatedCart);
      
      console.log('✅ Cart saved to Supabase successfully');
      return validatedUpdatedCart;
    } catch (error) {
      console.warn('Failed to save cart to Supabase:', error);
      throw error; // Let React Query handle error states and retries
    }
  },

  // Add item to cart - Atomic operation with real-time stock validation
  addItem: async (product: Product, quantity: number = 1): Promise<{ success: boolean; message?: string }> => {
    try {
      // Enhanced input validation using validation pipeline
      const AddItemInputSchema = z.object({
        product: ProductSchema,
        quantity: ValidationUtils.createQuantitySchema()
      });
      
      const validatedInput = await ServiceValidator.validateInput(
        { product, quantity },
        AddItemInputSchema,
        'CartService.addItem'
      );
      
      const validatedProduct = validatedInput.product;
      const validatedQuantity = validatedInput.quantity;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'User must be authenticated to add items to cart'
        };
      }

      // REAL-TIME STOCK VALIDATION: Check current stock before adding using defensive database access
      const StockDataSchema = z.object({
        stock_quantity: z.number().min(0),
        is_pre_order: z.boolean().optional().default(false),
        min_pre_order_quantity: z.number().min(0).optional().default(1),
        max_pre_order_quantity: z.number().min(1).optional().default(999)
      });
      
      const stockData = await DefensiveDatabase.fetchSingleWithValidation(
        async () => supabase
          .from('products')
          .select('stock_quantity, is_pre_order, min_pre_order_quantity, max_pre_order_quantity')
          .eq('id', validatedProduct.id)
          .eq('is_available', true)
          .single(),
        StockDataSchema,
        `stock-check-${validatedProduct.id}`,
        {
          throwOnCriticalFailure: false // Don't throw, return null if invalid
        }
      );

      if (!stockData) {
        return {
          success: false,
          message: 'Product is no longer available'
        };
      }

      // Get current cart quantity for this product using defensive database access
      const CartQuantitySchema = z.object({
        quantity: z.number().min(0).max(1000)
      });
      
      const currentCartData = await DefensiveDatabase.fetchSingleWithValidation(
        async () => supabase
          .from('cart_items')
          .select('quantity')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .single(),
        CartQuantitySchema,
        `current-cart-${user.id}-${product.id}`,
        {
          throwOnCriticalFailure: false
        }
      );

      const currentCartQuantity = currentCartData?.quantity || 0;
      const totalRequestedQuantity = currentCartQuantity + quantity;

      // Validate stock limits
      if (stockData.is_pre_order) {
        // Pre-order validation
        const minPreOrder = stockData.min_pre_order_quantity || 1;
        const maxPreOrder = stockData.max_pre_order_quantity || 999;
        
        if (totalRequestedQuantity < minPreOrder) {
          return {
            success: false,
            message: `Minimum pre-order quantity is ${minPreOrder}`
          };
        }
        
        if (totalRequestedQuantity > maxPreOrder) {
          return {
            success: false,
            message: `Maximum pre-order quantity is ${maxPreOrder}`
          };
        }
      } else {
        // Regular stock validation
        const availableStock = getProductStock(stockData);
        
        if (totalRequestedQuantity > availableStock) {
          const remainingStock = Math.max(0, availableStock - currentCartQuantity);
          if (remainingStock <= 0) {
            return {
              success: false,
              message: 'This item is out of stock'
            };
          } else {
            return {
              success: false,
              message: `Only ${remainingStock} more items can be added to your cart`
            };
          }
        }
      }

      // Stock validation passed - proceed with atomic operation
      const { error } = await supabase
        .rpc('upsert_cart_item', {
          input_user_id: user.id,
          input_product_id: product.id,
          input_quantity_to_add: quantity
        });

      if (error) {
        console.error('Error adding item to cart:', error);
        return {
          success: false,
          message: `Failed to add item to cart: ${error.message}`
        };
      }

      // Broadcast cart update for cross-device sync
      try {
        await cartBroadcast.send('cart-item-added', {
          productId: product.id,
          quantity,
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to broadcast cart update:', error);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error in addItem:', error);
      return {
        success: false,
        message: 'Failed to add item to cart. Please try again.'
      };
    }
  },

  // Remove item from cart - Atomic operation
  removeItem: async (productId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'User must be authenticated to remove items from cart'
        };
      }

      // Atomic DELETE operation
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        console.error('Error removing cart item:', error);
        return {
          success: false,
          message: `Failed to remove item: ${error.message}`
        };
      }

      // Broadcast cart update for cross-device sync
      try {
        await cartBroadcast.send('cart-item-removed', {
          productId,
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to broadcast cart update:', error);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error in removeItem:', error);
      return {
        success: false,
        message: 'Failed to remove item. Please try again.'
      };
    }
  },

  // Update item quantity - Atomic operation
  updateQuantity: async (productId: string, quantity: number): Promise<{ success: boolean; message?: string }> => {
    try {
      // Enhanced input validation using validation pipeline
      const UpdateQuantityInputSchema = z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: ValidationUtils.createQuantitySchema()
      });
      
      const validatedInput = await ServiceValidator.validateInput(
        { productId, quantity },
        UpdateQuantityInputSchema,
        'CartService.updateQuantity'
      );
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'User must be authenticated to update cart'
        };
      }

      // Atomic UPDATE operation - set exact quantity
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) {
        console.error('Error updating cart item quantity:', error);
        return {
          success: false,
          message: `Failed to update quantity: ${error.message}`
        };
      }

      // Broadcast cart update for cross-device sync
      try {
        await cartBroadcast.send('cart-quantity-updated', {
          productId,
          quantity,
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to broadcast cart update:', error);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error in updateQuantity:', error);
      return {
        success: false,
        message: 'Failed to update quantity. Please try again.'
      };
    }
  },

  // Clear cart - Atomic operation
  clearCart: async (): Promise<{ success: boolean; message?: string }> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'User must be authenticated to clear cart'
        };
      }

      // Atomic DELETE operation - remove all cart items for user
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing cart:', error);
        return {
          success: false,
          message: `Failed to clear cart: ${error.message}`
        };
      }

      // Broadcast cart update for cross-device sync
      try {
        await cartBroadcast.send('cart-cleared', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to broadcast cart update:', error);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error in clearCart:', error);
      return {
        success: false,
        message: 'Failed to clear cart. Please try again.'
      };
    }
  }
};
