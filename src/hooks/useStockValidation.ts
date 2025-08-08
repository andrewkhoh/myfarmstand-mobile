import { useQuery } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { Product } from '../types';
import { useCart } from './useCart';

// Real-time stock data interface
interface StockData {
  productId: string;
  availableStock: number;
  isPreOrder: boolean;
  minPreOrderQuantity?: number;
  maxPreOrderQuantity?: number;
}

// Stock validation result interface
export interface StockValidationResult {
  isValid: boolean;
  availableStock: number;
  currentCartQuantity: number;
  maxAllowedQuantity: number;
  message?: string;
  canAddMore: boolean;
  remainingStock: number;
}

// Real-time stock validation hook
export const useStockValidation = () => {
  const { getCartQuantity } = useCart();

  // Real-time stock data query - React Query is the single source of truth
  const { data: stockData = [], refetch: refetchStock, isLoading } = useQuery({
    queryKey: ['stock-validation'],
    queryFn: async (): Promise<StockData[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, stock_quantity, is_pre_order, min_pre_order_quantity, max_pre_order_quantity')
        .eq('is_available', true);

      if (error) {
        console.error('Error fetching stock data:', error);
        throw new Error('Failed to fetch stock data');
      }

      return data.map((item: any) => ({
        productId: item.id,
        availableStock: item.stock_quantity || 0,
        isPreOrder: item.is_pre_order || false,
        minPreOrderQuantity: item.min_pre_order_quantity,
        maxPreOrderQuantity: item.max_pre_order_quantity
      }));
    },
    staleTime: 30 * 1000, // 30 seconds - frequent updates for real-time validation
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
  });

  // Core validation function - kept for flexibility
  const validateStock = (
    product: Product, 
    requestedQuantity: number = 1
  ): StockValidationResult => {
    const stockInfo = stockData.find(s => s.productId === product.id);
    const currentCartQuantity = getCartQuantity(product.id);
    
    // Default values if stock data not available
    const availableStock = stockInfo?.availableStock ?? product.stock ?? 0;
    const isPreOrder = stockInfo?.isPreOrder ?? product.isPreOrder ?? false;
    
    // Calculate totals
    const totalRequestedQuantity = currentCartQuantity + requestedQuantity;
    
    // Pre-order validation
    if (isPreOrder) {
      const minPreOrder = stockInfo?.minPreOrderQuantity ?? product.minPreOrderQuantity ?? 1;
      const maxPreOrder = stockInfo?.maxPreOrderQuantity ?? product.maxPreOrderQuantity ?? 999;
      
      if (totalRequestedQuantity < minPreOrder) {
        return {
          isValid: false,
          availableStock,
          currentCartQuantity,
          maxAllowedQuantity: maxPreOrder,
          message: `Minimum pre-order quantity is ${minPreOrder}`,
          canAddMore: true,
          remainingStock: maxPreOrder - currentCartQuantity
        };
      }
      
      if (totalRequestedQuantity > maxPreOrder) {
        return {
          isValid: false,
          availableStock,
          currentCartQuantity,
          maxAllowedQuantity: maxPreOrder,
          message: `Maximum pre-order quantity is ${maxPreOrder}`,
          canAddMore: currentCartQuantity < maxPreOrder,
          remainingStock: Math.max(0, maxPreOrder - currentCartQuantity)
        };
      }
      
      return {
        isValid: true,
        availableStock,
        currentCartQuantity,
        maxAllowedQuantity: maxPreOrder,
        canAddMore: currentCartQuantity < maxPreOrder,
        remainingStock: maxPreOrder - currentCartQuantity
      };
    }
    
    // Regular stock validation
    if (totalRequestedQuantity > availableStock) {
      return {
        isValid: false,
        availableStock,
        currentCartQuantity,
        maxAllowedQuantity: availableStock,
        message: `Only ${availableStock} items available in stock`,
        canAddMore: currentCartQuantity < availableStock,
        remainingStock: Math.max(0, availableStock - currentCartQuantity)
      };
    }
    
    return {
      isValid: true,
      availableStock,
      currentCartQuantity,
      maxAllowedQuantity: availableStock,
      canAddMore: currentCartQuantity < availableStock,
      remainingStock: availableStock - currentCartQuantity
    };
  };

  // Intent-specific functions with clear names
  
  // STATE INQUIRY: Get current stock information without hypothetical additions
  const getStockInfo = (product: Product) => {
    const stockInfo = stockData.find(s => s.productId === product.id);
    const currentCartQuantity = getCartQuantity(product.id);
    const availableStock = stockInfo?.availableStock ?? product.stock ?? 0;
    const isPreOrder = stockInfo?.isPreOrder ?? product.isPreOrder ?? false;
    
    return {
      availableStock,
      currentCartQuantity,
      remainingStock: Math.max(0, availableStock - currentCartQuantity),
      isPreOrder
    };
  };

  // ACTION VALIDATION: Can user add one more item?
  const canAddOneMore = (productId: string): boolean => {
    const product = { id: productId } as Product;
    const validation = validateStock(product, 1);
    return validation.canAddMore;
  };

  // ACTION VALIDATION: Can user add specific quantity?
  const canAddQuantity = (product: Product, quantity: number): boolean => {
    const validation = validateStock(product, quantity);
    return validation.isValid;
  };

  // STATE INQUIRY: Get remaining stock (current state)
  const getRemainingStock = (productId: string): number => {
    const product = { id: productId } as Product;
    const stockInfo = getStockInfo(product);
    return stockInfo.remainingStock;
  };

  // DISPLAY: Get user-friendly stock status message
  const getStockStatusMessage = (product: Product): string => {
    const stockInfo = getStockInfo(product);
    const { availableStock, currentCartQuantity, remainingStock, isPreOrder } = stockInfo;
    
    if (isPreOrder) {
      if (currentCartQuantity > 0) {
        return `Pre-order (${currentCartQuantity} in cart)`;
      }
      return 'Available for pre-order';
    }
    
    if (remainingStock <= 0) {
      if (currentCartQuantity > 0) {
        return `Out of stock (${currentCartQuantity} in cart)`;
      }
      return 'Out of stock';
    }
    
    if (currentCartQuantity > 0) {
      return `${remainingStock} available (${currentCartQuantity} in cart)`;
    }
    
    return `${availableStock} available`;
  };

  // DEPRECATED: Keep for backward compatibility but mark as deprecated
  const canAddMore = (productId: string): boolean => {
    console.warn('canAddMore is deprecated, use canAddOneMore instead');
    return canAddOneMore(productId);
  };

  return {
    stockData,
    // Core validation (for advanced use cases)
    validateStock,
    // Intent-specific functions (recommended)
    getStockInfo,
    canAddOneMore,
    canAddQuantity,
    getRemainingStock,
    getStockStatusMessage,
    // Backward compatibility
    canAddMore,
    getCartQuantity,
    refetchStock,
    isLoading
  };
};
