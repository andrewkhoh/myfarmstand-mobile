import { supabase } from '../config/supabase';
import { CartState, CartItem, Product } from '../types';
import { cartBroadcast } from '../utils/broadcastFactory';
import { 
  getProductStock, 
  isProductPreOrder, 
  getProductMinPreOrderQty, 
  getProductMaxPreOrderQty
} from '../utils/typeMappers';
import {
  DbCartItemTransformSchema
} from '../schemas/cart.schema';
import { ProductSchema } from '../schemas/product.schema';
import { z } from 'zod';
import { ValidationMonitor } from '../utils/validationMonitor';
// Removed unused imports: DefensiveDatabase, DatabaseHelpers, ServiceValidator, ValidationUtils

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

// Removed unused validation functions: validateCartState, validateCartItem, validateProduct
// These are no longer needed since we use direct types and ProductSchema validation

// Removed unused function: validateAndConvertDbCartItems - now done directly in getCart()

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

// Removed unused function: convertDbCartItemsToCartState - functionality moved directly into getCart()

export const cartService = {
  // Get cart from Supabase - Following ProductService pattern
  getCart: async (): Promise<CartState> => {
    console.log('🛒 getCart() called - fetching from Supabase...');
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 User auth status:', user ? 'authenticated' : 'not authenticated');
      
      if (!user) {
        console.log('🚫 User not authenticated, returning empty cart');
        return { items: [], total: 0 };
      }
      
      // Step 1: Get raw cart items (direct Supabase)
      console.log('📡 Fetching cart items from Supabase for user:', user.id);
      const { data: rawCartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (cartError) {
        console.error('Error fetching cart items:', cartError);
        throw cartError;
      }

      if (!rawCartItems || rawCartItems.length === 0) {
        console.log('✅ No cart items found, returning empty cart');
        return { items: [], total: 0 };
      }

      console.log(`📊 Found ${rawCartItems.length} cart items`);

      // Step 2: Get products for cart items (direct Supabase)
      const productIds = rawCartItems.map(item => item.product_id);
      console.log('🛍️ Fetching products for cart items:', productIds);
      
      const { data: rawProducts, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, description, price, stock_quantity, 
          category, image_url, is_weekly_special, is_bundle,
          seasonal_availability, unit, weight, sku, tags, nutrition_info,
          is_available, is_pre_order, pre_order_available_date,
          min_pre_order_quantity, max_pre_order_quantity, created_at, updated_at
        `)
        .in('id', productIds)
        .eq('is_available', true);

      if (productsError) {
        console.error('Error fetching products for cart:', productsError);
        throw productsError;
      }

      // Step 3: Transform products using ProductSchema (following pattern)
      const validProducts: Product[] = [];
      for (const rawProduct of rawProducts || []) {
        try {
          const transformedProduct = ProductSchema.parse(rawProduct);
          validProducts.push(transformedProduct);
        } catch (error) {
          // Enhanced monitoring for schema validation failures
          ValidationMonitor.recordValidationError({
            context: 'CartService.getCart.productValidation',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'PRODUCT_SCHEMA_VALIDATION_FAILED',
            validationPattern: 'transformation_schema'
          });
          console.warn('Invalid product in cart, skipping:', {
            productId: rawProduct.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`✅ Validated ${validProducts.length} products`);

      // Step 4: Transform cart items with populated products
      const validCartItems: CartItem[] = [];
      for (const rawCartItem of rawCartItems) {
        try {
          const product = validProducts.find(p => p.id === rawCartItem.product_id);
          if (!product) {
            console.warn('Product not found for cart item, skipping:', rawCartItem.product_id);
            continue;
          }
          
          const transformedCartItem = DbCartItemTransformSchema.parse({
            ...rawCartItem,
            product
          });

          // Extract the cart item format for CartState - ensure non-null product
          if (transformedCartItem.product) {
            validCartItems.push({
              product: transformedCartItem.product,
              quantity: transformedCartItem.quantity
            });
          } else {
            console.warn('Skipping cart item with null product:', rawCartItem.id);
          }
        } catch (error) {
          // Enhanced monitoring for cart item transformation failures
          ValidationMonitor.recordValidationError({
            context: 'CartService.getCart.cartItemTransformation',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'CART_ITEM_TRANSFORM_FAILED',
            validationPattern: 'transformation_schema'
          });
          console.warn('Invalid cart item, skipping:', {
            cartItemId: rawCartItem.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Step 5: Create and validate cart state
      const total = calculateTotal(validCartItems);
      const cartState: CartState = { items: validCartItems, total };
      
      // Record successful pattern usage (positive monitoring)
      ValidationMonitor.recordPatternSuccess({
        service: 'CartService',
        pattern: 'direct_supabase_query',
        operation: 'getCart',
        performanceMs: Date.now() - (Date.now() - 1000) // Simplified timing
      });
      
      console.log(`✅ Returning cart with ${validCartItems.length} items, total: $${total}`);
      return cartState;

    } catch (error) {
      console.error('Error in getCart:', error);
      throw error; // Let React Query handle error states
    }
  },

  // Save cart to Supabase - Following ProductService pattern
  saveCart: async (cart: CartState): Promise<CartState> => {
    try {
      console.log('💾 saveCart() called - saving to Supabase...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🚫 User not authenticated, cannot save cart to Supabase');
        throw new Error('User must be authenticated to save cart');
      }
      
      console.log('📡 Saving cart to Supabase for user:', user.id);
      
      if (cart.items.length > 0) {
        // Use atomic UPSERT for cart items
        const cartItemsToUpsert = cart.items.map(item => ({
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
          console.error('Failed to save cart to Supabase:', error);
          throw error;
        }

        console.log(`✅ Saved ${cart.items.length} cart items`);
      } else {
        // Cart is empty - clear all items for this user
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to clear cart in Supabase:', error);
          throw error;
        }

        console.log('✅ Cleared cart in Supabase');
      }
      
      // Return the cart with recalculated total
      const updatedCart: CartState = {
        items: cart.items,
        total: calculateTotal(cart.items)
      };
      
      console.log(`✅ Cart saved successfully, total: $${updatedCart.total}`);
      return updatedCart;
      
    } catch (error) {
      console.error('Error in saveCart:', error);
      throw error; // Let React Query handle error states and retries
    }
  },

  // Add item to cart - Atomic operation with real-time stock validation
  addItem: async (product: Product, quantity: number = 1): Promise<{ success: boolean; message?: string }> => {
    try {
      // Basic input validation for product and quantity
      if (!product || !product.id) {
        return {
          success: false,
          message: 'Invalid product provided'
        };
      }
      
      if (!quantity || quantity < 1) {
        return {
          success: false,
          message: 'Quantity must be at least 1'
        };
      }
      
      const validatedProduct = product;
      const validatedQuantity = quantity;
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Auth verification passed
      
      if (!user) {
        console.error('🚨 User not authenticated for cart operation');
        return {
          success: false,
          message: 'User must be authenticated to add items to cart'
        };
      }

      // REAL-TIME STOCK VALIDATION: Check current stock before adding (direct Supabase)
      console.log('📊 Checking stock for product:', validatedProduct.id);
      
      const { data: stockData, error: stockError } = await supabase
        .from('products')
        .select('stock_quantity, is_pre_order, min_pre_order_quantity, max_pre_order_quantity')
        .eq('id', validatedProduct.id)
        .eq('is_available', true)
        .single();

      if (stockError || !stockData) {
        console.warn('Product not available or error fetching stock:', stockError);
        return {
          success: false,
          message: 'Product is no longer available'
        };
      }

      // Get current cart quantity for this product - handle both missing records and corrupted data
      let currentCartQuantity = 0;
      
      try {
        const { data: cartItemData, error } = await supabase
          .from('cart_items')
          .select('quantity')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 for 0 rows

        if (error) {
          console.error('🚨 Cart query error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            userId: user.id,
            productId: product.id
          });
          console.warn('🚨 Unexpected error getting cart quantity:', error);
          currentCartQuantity = 0; // Fail safe to 0
        } else if (cartItemData === null) {
          // maybeSingle() returns null when no rows found - this is normal for first-time adds
          console.log('✅ No existing cart item found (expected for first add)');
          currentCartQuantity = 0;
        } else {
          // Validate the returned quantity data
          const quantity = cartItemData.quantity;
          if (typeof quantity === 'number' && quantity >= 0) {
            currentCartQuantity = quantity;
            console.log(`📦 Found existing cart quantity: ${quantity}`);
          } else {
            console.warn('Invalid cart quantity data, defaulting to 0:', { 
              productId: product.id, 
              userId: user.id, 
              receivedQuantity: quantity 
            });
            currentCartQuantity = 0;
          }
        }
      } catch (error) {
        console.warn('Error fetching cart quantity, defaulting to 0:', error);
        currentCartQuantity = 0;
      }
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
      // Basic input validation for productId and quantity
      if (!productId || productId.length === 0) {
        return {
          success: false,
          message: 'Product ID is required'
        };
      }
      
      if (quantity < 1) {
        return {
          success: false,
          message: 'Quantity must be at least 1'
        };
      }
      
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
