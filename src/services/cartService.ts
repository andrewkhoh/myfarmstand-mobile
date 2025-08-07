import { supabase } from '../config/supabase';
import { CartState, CartItem, Product } from '../types';
import { BroadcastHelper } from '../utils/broadcastHelper';

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
      
      // User is authenticated - save cart to Supabase
      console.log('💾 Saving cart to Supabase for user:', user.id);
      
      // First, clear existing cart items for this user
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
      
      if (cart.items.length > 0) {
        // Insert new cart items
        const cartItemsToInsert = cart.items.map(item => ({
          user_id: user.id,
          product_id: item.product.id,
          quantity: item.quantity
        }));
        
        const { error } = await supabase
          .from('cart_items')
          .insert(cartItemsToInsert);
        
        if (error) {
          console.warn('Failed to save cart to Supabase:', error);
          throw error; // Let React Query handle retries
        }
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

  // Add item to cart
  addItem: async (product: Product, quantity: number = 1): Promise<{ success: boolean; message?: string; cart: CartState }> => {
    const currentCart = await cartService.getCart();
    const existingItemIndex = currentCart.items.findIndex(item => item.product.id === product.id);
    
    let currentQuantity = 0;
    if (existingItemIndex >= 0) {
      currentQuantity = currentCart.items[existingItemIndex].quantity;
    }
    
    // Validate stock
    const validation = validateStock(product, quantity, currentQuantity);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message,
        cart: currentCart
      };
    }
    
    // Add or update item
    const newItems = [...currentCart.items];
    if (existingItemIndex >= 0) {
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: currentQuantity + quantity
      };
    } else {
      newItems.push({ product, quantity });
    }
    
    const newCart = { items: newItems, total: calculateTotal(newItems) };
    const savedCart = await cartService.saveCart(newCart);
    
    
    // Broadcast cart update for cross-device sync
    try {
      await BroadcastHelper.sendCartUpdate('cart-item-added', {
        productId: product.id,
        quantity,
        cartTotal: savedCart.total,
        itemCount: savedCart.items.length
      });
    } catch (error) {
      console.warn('Failed to broadcast cart update:', error);
    }

    return {
      success: true,
      cart: savedCart
    };
  },

  // Remove item from cart
  removeItem: async (productId: string): Promise<{ success: boolean; message?: string; cart: CartState }> => {
    const currentCart = await cartService.getCart();
    const newItems = currentCart.items.filter(item => item.product.id !== productId);
    const newCart = { items: newItems, total: calculateTotal(newItems) };
    const savedCart = await cartService.saveCart(newCart);
    
    // Broadcast cart update for cross-device sync
    try {
      await BroadcastHelper.sendCartUpdate('cart-item-removed', {
        productId,
        cartTotal: savedCart.total,
        itemCount: savedCart.items.length
      });
    } catch (error) {
      console.warn('Failed to broadcast cart update:', error);
    }
    
    return {
      success: true,
      cart: savedCart
    };
  },

  // Update item quantity
  updateQuantity: async (productId: string, quantity: number): Promise<{ success: boolean; message?: string; cart: CartState }> => {
    const currentCart = await cartService.getCart();
    const existingItemIndex = currentCart.items.findIndex(item => item.product.id === productId);
    
    if (existingItemIndex < 0) {
      return {
        success: false,
        message: 'Item not found in cart',
        cart: currentCart
      };
    }
    
    const existingItem = currentCart.items[existingItemIndex];
    
    // Validate stock for new quantity
    const validation = validateStock(existingItem.product, quantity, 0);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message,
        cart: currentCart
      };
    }
    
    const newItems = [...currentCart.items];
    newItems[existingItemIndex] = { ...existingItem, quantity };
    
    const newCart = { items: newItems, total: calculateTotal(newItems) };
    const savedCart = await cartService.saveCart(newCart);
    
    
    // Broadcast cart update for cross-device sync
    try {
      await BroadcastHelper.sendCartUpdate('cart-quantity-updated', {
        productId,
        quantity,
        cartTotal: savedCart.total,
        itemCount: savedCart.items.length
      });
    } catch (error) {
      console.warn('Failed to broadcast cart update:', error);
    }

    return {
      success: true,
      cart: savedCart
    };
  },

  // Clear cart
  clearCart: async (): Promise<{ success: boolean; message?: string; cart: CartState }> => {
    const emptyCart = { items: [], total: 0 };
    const savedCart = await cartService.saveCart(emptyCart);
    
    // Broadcast cart update for cross-device sync
    try {
      await BroadcastHelper.sendCartUpdate('cart-cleared', {
        cartTotal: savedCart.total,
        itemCount: savedCart.items.length
      });
    } catch (error) {
      console.warn('Failed to broadcast cart update:', error);
    }
    
    return {
      success: true,
      cart: savedCart
    };
  }
};
