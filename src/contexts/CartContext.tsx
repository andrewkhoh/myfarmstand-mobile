import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartState, CartItem, Product } from '../types';

interface CartContextType extends CartState {
  addItem: (product: Product, quantity?: number) => Promise<{ success: boolean; message?: string }>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => Promise<{ success: boolean; message?: string }>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState };

const calculateTotal = (items: CartItem[]): number => {
  if (!items || items.length === 0) return 0;
  return items.reduce((total, item) => {
    const price = item.product?.price || 0;
    const quantity = item.quantity || 0;
    return total + (price * quantity);
  }, 0);
};

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
  if (product.stock <= 0) {
    return {
      isValid: false,
      message: `${product.name} is out of stock`
    };
  }
  
  if (totalQuantity > product.stock) {
    return {
      isValid: false,
      message: `Only ${product.stock} ${product.name} available in stock`
    };
  }
  
  return { isValid: true };
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity } = action.payload;
      const existingItemIndex = state.items.findIndex(
        item => item.product.id === product.id
      );
      
      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Update existing item
        newItems = state.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        newItems = [...state.items, { product, quantity }];
      }
      
      const newTotal = calculateTotal(newItems);
      return {
        items: newItems,
        total: newTotal,
      };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.product.id !== action.payload);
      const newTotal = calculateTotal(newItems);
      return {
        items: newItems,
        total: newTotal,
      };
    }
    
    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      let newItems: CartItem[];
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        newItems = state.items.filter(item => item.product.id !== productId);
      } else {
        // Update quantity
        newItems = state.items.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        );
      }
      
      const newTotal = calculateTotal(newItems);
      return {
        items: newItems,
        total: newTotal,
      };
    }
    
    case 'CLEAR_CART':
      return {
        items: [],
        total: 0,
      };
    case 'LOAD_CART':
      return action.payload;
    default:
      return state;
  }
};

const initialState: CartState = {
  items: [],
  total: 0,
};

const CART_STORAGE_KEY = 'farmstand_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const stateRef = useRef(state);
  
  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const addItem = useCallback(async (product: Product, quantity: number = 1): Promise<{ success: boolean; message?: string }> => {
    // Get current quantity in cart for this product using ref for latest state
    const existingItem = stateRef.current.items.find(item => item.product.id === product.id);
    const currentCartQuantity = existingItem ? existingItem.quantity : 0;
    
    // Validate stock
    const validation = validateStock(product, quantity, currentCartQuantity);
    
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message
      };
    }
    
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
    return { success: true };
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number): Promise<{ success: boolean; message?: string }> => {
    const existingItem = stateRef.current.items.find(item => item.product.id === productId);
    
    if (!existingItem) {
      return {
        success: false,
        message: 'Item not found in cart'
      };
    }
    
    // For quantity updates, validate the new absolute quantity (not the difference)
    const validation = validateStock(existingItem.product, quantity, 0); // quantity is the new total, not additional
    
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.message
      };
    }
    
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
    return { success: true };
  }, []);

  const clearCart = useCallback(async (): Promise<void> => {
    // Immediately update the ref to ensure synchronous clearing
    stateRef.current = {
      items: [],
      total: 0,
    };
    
    // Then dispatch the action for React state
    dispatch({ type: 'CLEAR_CART' });
    
    // Remove from AsyncStorage to prevent reload
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear cart from storage:', error);
    }
    
    // Small delay to ensure state propagation
    await new Promise(resolve => setTimeout(resolve, 50));
  }, []);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (cartData) {
          const parsedCart: CartState = JSON.parse(cartData);
          // Validate the loaded data structure
          if (parsedCart.items && Array.isArray(parsedCart.items)) {
            dispatch({ type: 'LOAD_CART', payload: parsedCart });
          }
        }
      } catch (error) {
        console.warn('Failed to load cart from storage:', error);
        // Continue with empty cart if loading fails
      } finally {
        // Mark cart as loaded regardless of success/failure
        setIsCartLoaded(true);
      }
    };

    loadCart();
  }, []); // Empty dependency array - only run on mount

  // Track if cart has been loaded to avoid saving initial empty state
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Save cart to AsyncStorage whenever state changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        if (state.items.length === 0 && state.total === 0) {
          // For empty cart, remove from storage entirely
          await AsyncStorage.removeItem(CART_STORAGE_KEY);
        } else {
          // For non-empty cart, save the state
          await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
        }
      } catch (error) {
        console.warn('Failed to save cart to storage:', error);
      }
    };

    // Only save if cart has been loaded (avoid saving initial empty state)
    if (isCartLoaded) {
      saveCart();
    }
  }, [state, isCartLoaded]); // Dependency on state and loaded flag

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
