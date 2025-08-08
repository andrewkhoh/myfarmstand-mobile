import { supabase } from '../config/supabase';
import { CartState, CartItem, Product } from '../types';
import { cartBroadcast } from '../utils/broadcastFactory';

// Database cart item interface
interface DbCartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

// Stock validation helper
const validateStock = (product: Product, requestedQuantity: number, currentCartQuantity: number = 0): { isValid: boolean; message?: string } => {
  const totalQuantity = currentCartQuantity + requestedQuantity;
  
  // Pre-order item validation
  if (product.isPreOrder) {
    if (product.minPreOrderQuantity && totalQuantity < product.minPreOrderQuantity) {
      return {
        isValid: false,
        message: `Minimum pre-order quantity is ${product.minPreOrderQuantity}`
      };
    }
    if (product.maxPreOrderQuantity && totalQuantity > product.maxPreOrderQuantity) {
      return {
        isValid: false,
        message: `Maximum pre-order quantity is ${product.maxPreOrderQuantity}`
      };
    }
    return { isValid: true };
  }
  
  // Regular stock validation
  if (product.stock !== undefined && totalQuantity > product.stock) {
    return {
      isValid: false,
      message: `Only ${product.stock} items available in stock`
    };
  }
  
  return { isValid: true };
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

// Helper to convert database cart items to app format
const convertDbCartItemsToCartState = async (dbItems: DbCartItem[]): Promise<CartState> => {
  const cartItems: CartItem[] = [];
  
  // Fetch product details for each cart item
  for (const dbItem of dbItems) {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', dbItem.product_id)
      .single();
    
    if (product) {
      cartItems.push({
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock_quantity,
          categoryId: product.category, // Note: database uses category name, not ID
          imageUrl: product.image_url,
          unit: product.unit,
          isActive: product.is_available,
          isPreOrder: product.is_pre_order,
          minPreOrderQuantity: product.min_pre_order_quantity,
          maxPreOrderQuantity: product.max_pre_order_quantity,
          tags: product.tags || [],
          createdAt: product.created_at || new Date().toISOString(),
          updatedAt: product.updated_at || new Date().toISOString()
        },
        quantity: dbItem.quantity
      });
    }
  }
  
  return {
    items: cartItems,
    total: calculateTotal(cartItems)
  };
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
      
      // User is authenticated - get cart from Supabase
      console.log('📡 Fetching cart from Supabase for user:', user.id);
      const { data: dbCartItems, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      console.log('📊 Supabase cart query result:', { dbCartItems, error });
      
      if (error) {
        console.warn('Failed to load cart from Supabase:', error);
        throw error; // Let React Query handle retries and error states
      }
      
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🚫 User not authenticated, cannot save cart to Supabase');
        throw new Error('User must be authenticated to save cart');
      }
      
      // User is authenticated - save cart to Supabase using pure UPSERT
      console.log('💾 Saving cart to Supabase for user:', user.id);
      
      if (cart.items.length > 0) {
        // Use pure UPSERT - truly atomic for each cart item
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
      
      // Return updated cart with calculated total
      const updatedCart = {
        items: cart.items,
        total: calculateTotal(cart.items)
      };
      
      console.log('✅ Cart saved to Supabase successfully');
      return updatedCart;
    } catch (error) {
      console.warn('Failed to save cart to Supabase:', error);
      throw error; // Let React Query handle error states and retries
    }
  },

  // Add item to cart - Atomic operation with real-time stock validation
  addItem: async (product: Product, quantity: number = 1): Promise<{ success: boolean; message?: string }> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: 'User must be authenticated to add items to cart'
        };
      }

      // REAL-TIME STOCK VALIDATION: Check current stock before adding
      const { data: stockData, error: stockError } = await supabase
        .from('products')
        .select('stock_quantity, is_pre_order, min_pre_order_quantity, max_pre_order_quantity')
        .eq('id', product.id)
        .eq('is_available', true)
        .single();

      if (stockError || !stockData) {
        return {
          success: false,
          message: 'Product is no longer available'
        };
      }

      // Get current cart quantity for this product
      const { data: currentCartData } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

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
        const availableStock = stockData.stock_quantity || 0;
        
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
