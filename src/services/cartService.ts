import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { CartState, CartItem, Product } from '../types';

const CART_STORAGE_KEY = '@farmstand_cart';

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
  // Get cart from Supabase (with AsyncStorage fallback)
  getCart: async (): Promise<CartState> => {
    try {
      // Try to get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is authenticated - get cart from Supabase
        const { data: dbCartItems, error } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.warn('Failed to load cart from Supabase:', error);
          // Fall back to AsyncStorage
          return await this.getLocalCart();
        }
        
        if (dbCartItems && dbCartItems.length > 0) {
          const cartState = await convertDbCartItemsToCartState(dbCartItems);
          // Sync to local storage for offline access
          await cartService.saveLocalCart(cartState);
          return cartState;
        }
      }
      
      // User not authenticated or no cart items - try local storage
      return await cartService.getLocalCart();
    } catch (error) {
      console.warn('Failed to load cart:', error);
      return await this.getLocalCart();
    }
  },

  // Get cart from local AsyncStorage only
  getLocalCart: async (): Promise<CartState> => {
    try {
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (cartData) {
        const parsedCart: CartState = JSON.parse(cartData);
        if (parsedCart.items && Array.isArray(parsedCart.items)) {
          return {
            items: parsedCart.items,
            total: calculateTotal(parsedCart.items)
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load cart from local storage:', error);
    }
    
    return { items: [], total: 0 };
  },

  // Save cart to local AsyncStorage only
  saveLocalCart: async (cart: CartState): Promise<CartState> => {
    try {
      if (cart.items.length === 0) {
        await AsyncStorage.removeItem(CART_STORAGE_KEY);
      } else {
        const updatedCart = {
          items: cart.items,
          total: calculateTotal(cart.items)
        };
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
        return updatedCart;
      }
    } catch (error) {
      console.warn('Failed to save cart to local storage:', error);
    }
    return cart;
  },

  // Save cart to Supabase (with local storage sync)
  saveCart: async (cart: CartState): Promise<CartState> => {
    try {
      if (cart.items.length === 0) {
        // Remove empty cart from storage
        await AsyncStorage.removeItem(CART_STORAGE_KEY);
      } else {
        // Save cart with recalculated total
        const updatedCart = {
          items: cart.items,
          total: calculateTotal(cart.items)
        };
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
        return updatedCart;
      }
    } catch (error) {
      console.warn('Failed to save cart to storage:', error);
    }
    return cart;
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
    
    return {
      success: true,
      cart: savedCart
    };
  },

  // Remove item from cart
  removeItem: async (productId: string): Promise<CartState> => {
    const currentCart = await cartService.getCart();
    const newItems = currentCart.items.filter(item => item.product.id !== productId);
    const newCart = { items: newItems, total: calculateTotal(newItems) };
    return await cartService.saveCart(newCart);
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
    
    return {
      success: true,
      cart: savedCart
    };
  },

  // Clear cart
  clearCart: async (): Promise<CartState> => {
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear cart from storage:', error);
    }
    return { items: [], total: 0 };
  }
};
