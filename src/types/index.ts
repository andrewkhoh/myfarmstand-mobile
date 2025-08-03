// Navigation Types
export type RootTabParamList = {
  Shop: undefined;
  Cart: undefined;
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
  stock: number;
  categoryId: string;
  category?: Category; // Populated category object
  imageUrl?: string;
  images?: string[]; // Multiple images
  isWeeklySpecial?: boolean;
  isBundle?: boolean;
  seasonalAvailability?: boolean;
  unit?: string; // lb, each, bunch, etc.
  weight?: number;
  sku?: string;
  tags?: string[];
  nutritionInfo?: NutritionInfo;
  isActive: boolean;
  isPreOrder?: boolean; // Pre-order item flag
  preOrderAvailableDate?: string; // When pre-order item becomes available
  minPreOrderQuantity?: number; // Minimum quantity for pre-orders
  maxPreOrderQuantity?: number; // Maximum quantity for pre-orders
  createdAt: string;
  updatedAt: string;
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
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type FulfillmentType = 'pickup' | 'delivery';

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
}

export interface Order {
  id: string;
  customerId?: string; // Optional for guest orders
  customerInfo: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
  notes?: string;
  pickupDate?: string; // ISO date string
  pickupTime?: string; // Time string
  deliveryAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  customerInfo: CustomerInfo;
  items: OrderItem[];
  fulfillmentType: FulfillmentType;
  notes?: string;
  pickupDate?: string;
  pickupTime?: string;
  deliveryAddress?: string;
}

export interface OrderSubmissionResult {
  success: boolean;
  order?: Order;
  message?: string;
  error?: string;
}
