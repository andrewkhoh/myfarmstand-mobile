import { Product } from '../types';

export interface StockDisplayInfo {
  availableStock: number;
  isOutOfStock: boolean;
  lowStockWarning: string | null;
  stockColor: 'error' | 'warning' | 'secondary';
  stockMessage: string;
  canAddToCart: boolean;
  addToCartButtonText: string;
}

/**
 * Centralized stock display logic for consistent messaging across all screens
 * Uses static product data (not real-time) per business requirements
 */
export const getStockDisplayInfo = (
  product: Product, 
  cartQuantity: number = 0,
  messageVariant: 'full' | 'compact' = 'full'
): StockDisplayInfo => {
  const availableStock = Math.max(0, product.stock - cartQuantity);
  const isOutOfStock = product.stock === 0;
  
  // Low-stock warning system with consistent thresholds
  const getLowStockWarning = (): string | null => {
    if (isOutOfStock) return null;
    
    if (availableStock === 1) {
      return messageVariant === 'compact' ? " Last one!" : " Last one available!";
    } else if (availableStock === 2) {
      return " Only 2 left!";
    } else if (availableStock <= 5) {
      return messageVariant === 'compact' 
        ? ` ${availableStock} left`
        : ` Low stock - ${availableStock} remaining`;
    }
    return null;
  };
  
  // Consistent color coding across all screens
  const getStockColor = (): 'error' | 'warning' | 'secondary' => {
    if (isOutOfStock) return "error";
    if (availableStock <= 2) return "error";
    if (availableStock <= 5) return "warning";
    return "secondary";
  };
  
  // Base stock message
  const getStockMessage = (): string => {
    if (isOutOfStock) return 'Out of stock';
    
    let message = `${availableStock} available`;
    if (cartQuantity > 0) {
      message += ` (${cartQuantity} in cart)`;
    }
    return message;
  };
  
  // Determine if product can be added to cart (critical UX fix)
  const canAddToCart = availableStock > 0;
  
  // Button text for adding to cart (handles edge case where all stock is in cart)
  const getAddToCartButtonText = (): string => {
    if (isOutOfStock) return 'Out of Stock';
    if (availableStock === 0) return 'No More Available';
    return 'Add to Cart';
  };
  
  return {
    availableStock,
    isOutOfStock,
    lowStockWarning: getLowStockWarning(),
    stockColor: getStockColor(),
    stockMessage: getStockMessage(),
    canAddToCart,
    addToCartButtonText: getAddToCartButtonText(),
  };
};

/**
 * Stock display thresholds for reference and easy modification
 */
export const STOCK_THRESHOLDS = {
  VERY_LOW: 2,     // Red warning (error color)
  LOW: 5,          // Orange warning (warning color)
  NORMAL: 6,       // No warning (secondary color)
} as const;
