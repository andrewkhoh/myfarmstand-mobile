// Navigation Types
export type RootTabParamList = {
  Shop: undefined;
  Cart: undefined;
  MyOrders: undefined;
  Profile: undefined;
  Admin: undefined;
  StaffQRScanner: undefined;
  TestHub: undefined;
  Test: undefined;
  CatalogTest: undefined;
  DataTest: undefined;
  EnhancedCatalogTest: undefined;
  CartFunctionalityTest: undefined;
  ProfileManagementTest: undefined;
  StaffQRScannerTest: undefined;
  HybridAuthTest: undefined;
  AdminOrderTest: undefined;
  ProductDebugTest: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  ProductDetail: { productId: string };
  Checkout: undefined;
  OrderConfirmation: {
    order?: Order;
    success: boolean;
    error?: string;
  };
  MyOrders: undefined;
};

// User Types
export type UserRole = 'customer' | 'staff' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
}

// Auth Types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number | null; // Matches database field name
  category_id: string; // Matches database field name
  category?: Category; // Populated category object
  image_url?: string | null; // Matches database field name
  images?: string[]; // Multiple images
  is_weekly_special?: boolean | null; // Matches database field name
  is_bundle?: boolean | null; // Matches database field name
  seasonal_availability?: boolean | null; // Matches database field name
  unit?: string | null; // lb, each, bunch, etc.
  weight?: number | null;
  sku?: string | null;
  tags?: string[] | null;
  nutrition_info?: NutritionInfo | null; // Matches database field name
  is_available: boolean | null; // Matches database field name (was isActive)
  is_pre_order?: boolean | null; // Matches database field name
  pre_order_available_date?: string | null; // Matches database field name
  min_pre_order_quantity?: number | null; // Matches database field name
  max_pre_order_quantity?: number | null; // Matches database field name
  created_at: string | null; // Matches database field name
  updated_at: string | null; // Matches database field name
  
  // Legacy field mappings for backward compatibility
  stock?: number; // Maps to stock_quantity
  categoryId?: string; // Maps to category_id
  imageUrl?: string; // Maps to image_url
  isWeeklySpecial?: boolean; // Maps to is_weekly_special
  isBundle?: boolean; // Maps to is_bundle
  seasonalAvailability?: boolean; // Maps to seasonal_availability
  nutritionInfo?: NutritionInfo; // Maps to nutrition_info
  isActive?: boolean; // Maps to is_available
  isPreOrder?: boolean; // Maps to is_pre_order
  preOrderAvailableDate?: string; // Maps to pre_order_available_date
  minPreOrderQuantity?: number; // Maps to min_pre_order_quantity
  maxPreOrderQuantity?: number; // Maps to max_pre_order_quantity
  createdAt?: string; // Maps to created_at
  updatedAt?: string; // Maps to updated_at
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// Data Fetching States
export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch?: Date;
}

export interface ListDataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  lastFetch?: Date;
  hasMore?: boolean;
  page?: number;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
}

// Order Types
export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
export type FulfillmentType = 'pickup' | 'delivery';
export type PaymentMethod = 'online' | 'cash_on_pickup';
export type PaymentStatus = 'paid' | 'pending' | 'failed';

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address?: string; // Required for delivery orders
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  product?: Product; // Add optional product for populated data
}

export interface Order {
  id: string;
  user_id?: string | null; // Matches database field name (was customerId)
  customer_name: string; // Matches database field name
  customer_email: string; // Matches database field name
  customer_phone: string; // Matches database field name
  order_items?: OrderItem[]; // Will be populated from relationship
  subtotal: number;
  tax_amount: number; // Matches database field name (was tax)
  total_amount: number; // Matches database field name (was total)
  fulfillment_type: string; // Matches database field name
  status: string; // Matches database field name
  payment_method: string | null; // Matches database field name
  payment_status: string | null; // Matches database field name
  notes?: string | null;
  pickup_date?: string | null; // Matches database field name
  pickup_time?: string | null; // Matches database field name
  delivery_address?: string | null; // Matches database field name
  delivery_date?: string | null; // Add missing delivery date
  delivery_time?: string | null; // Add missing delivery time
  special_instructions?: string | null; // Matches database field name
  created_at: string | null; // Matches database field name
  updated_at: string | null; // Matches database field name
  qr_code_data?: string | null; // Additional field from database
  
  // Legacy field mappings for backward compatibility
  customerId?: string; // Maps to user_id
  customerInfo?: CustomerInfo; // Maps to customer_name, customer_email, customer_phone
  items?: OrderItem[]; // Maps to order_items
  tax?: number; // Maps to tax_amount
  total?: number; // Maps to total_amount
  fulfillmentType?: FulfillmentType; // Maps to fulfillment_type
  paymentMethod?: PaymentMethod; // Maps to payment_method
  paymentStatus?: PaymentStatus; // Maps to payment_status
  pickupDate?: string; // Maps to pickup_date
  pickupTime?: string; // Maps to pickup_time
  deliveryAddress?: string; // Maps to delivery_address
  specialInstructions?: string; // Maps to special_instructions
  createdAt?: string; // Maps to created_at
  updatedAt?: string; // Maps to updated_at
}

export interface CreateOrderRequest {
  customerInfo: CustomerInfo;
  items: OrderItem[];
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod; // Payment method selection
  notes?: string;
  pickupDate?: string;
  pickupTime?: string;
  deliveryAddress?: string;
  deliveryDate?: string; // Add missing delivery date
  deliveryTime?: string; // Add missing delivery time
  specialInstructions?: string; // Add missing special instructions
}

export interface OrderSubmissionResult {
  success: boolean;
  order?: Order;
  message?: string;
  error?: string;
  inventoryConflicts?: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

// Error Types
export interface BaseError {
  message: string;
  userMessage?: string;
  code?: string;
}

export interface AuthError extends BaseError {
  type?: 'authentication' | 'authorization' | 'validation';
}

export interface MutationError extends BaseError {
  operationType?: string;
  metadata?: Record<string, unknown>;
}
