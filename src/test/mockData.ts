import { User, Order, Product, OrderItem } from '../types';
import { NotificationRequest, NotificationResult, NotificationChannel, NotificationType } from '../services/notificationService';
import { NoShowHandlingResult } from '../services/noShowHandlingService';
import { ErrorRecoveryResult, ErrorContext } from '../services/errorRecoveryService';
import { LoginResponse, RegisterResponse } from '../services/authService';

// User mocks
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer',
  phone: '555-1234',
  address: '123 Test St',
  ...overrides,
});

// Product mocks
export const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: 'prod1',
  name: 'Test Product',
  description: 'A test product',
  price: 10,
  stock_quantity: 100,
  category_id: 'cat1',
  is_available: true,
  image_url: null,
  is_weekly_special: false,
  is_bundle: false,
  seasonal_availability: false,
  unit: 'each',
  weight: null,
  sku: 'SKU001',
  tags: [],
  nutrition_info: null,
  is_pre_order: false,
  pre_order_available_date: null,
  min_pre_order_quantity: null,
  max_pre_order_quantity: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

// OrderItem mocks
export const createMockOrderItem = (overrides?: Partial<OrderItem>): OrderItem => ({
  productId: 'prod1',
  productName: 'Test Product',
  price: 10,
  quantity: 2,
  subtotal: 20,
  product: createMockProduct(),
  ...overrides,
});

// Order mocks
export const createMockOrder = (overrides?: Partial<Order>): Order => ({
  id: 'order123',
  user_id: 'user123',
  customer_name: 'Test User',
  customer_email: 'test@example.com',
  customer_phone: '555-1234',
  order_items: [],
  subtotal: 45,
  tax_amount: 5,
  total_amount: 50,
  fulfillment_type: 'pickup',
  status: 'pending',
  payment_method: 'credit_card',
  payment_status: 'paid',
  notes: null,
  pickup_date: '2023-01-15',
  pickup_time: '14:00',
  delivery_address: null,
  delivery_date: null,
  delivery_time: null,
  special_instructions: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  qr_code_data: null,
  ...overrides,
});

// Notification mocks
export const createMockNotificationRequest = (overrides?: Partial<NotificationRequest>): NotificationRequest => ({
  userId: 'user123',
  customerEmail: 'test@example.com',
  customerPhone: '555-1234',
  customerName: 'Test User',
  type: 'order_ready' as NotificationType,
  channels: ['email', 'sms'] as NotificationChannel[],
  order: createMockOrder(),
  customMessage: 'Your order is ready',
  ...overrides,
});

export const createMockNotificationResult = (overrides?: Partial<NotificationResult>): NotificationResult => ({
  success: true,
  sentChannels: ['email', 'sms'] as NotificationChannel[],
  failedChannels: [] as NotificationChannel[],
  message: 'Notification sent successfully',
  ...overrides,
});

// NoShow mocks
export const createMockNoShowHandlingResult = (overrides?: Partial<NoShowHandlingResult>): NoShowHandlingResult => ({
  success: true,
  processedOrders: [],
  errors: [],
  message: 'No-show orders processed',
  ...overrides,
});

// Cart mocks
export const createMockCartState = () => ({
  items: [
    {
      product: createMockProduct(),
      quantity: 2,
    },
  ],
  total: 20,
});

// Reschedule Request mock
export const createMockRescheduleRequest = () => ({
  orderId: 'order123',
  newPickupDate: '2023-01-20',
  newPickupTime: '15:00',
  reason: 'Schedule conflict',
  requestedBy: 'customer' as const,
  requestedByUserId: 'user123',
  customerNotification: true,
});

// Error Recovery mocks
export const createMockErrorRecoveryResult = (overrides?: Partial<ErrorRecoveryResult>): ErrorRecoveryResult => ({
  success: true,
  action: 'retry',
  attempts: 1,
  recovered: true,
  compensationApplied: false,
  message: 'Error recovered successfully',
  ...overrides,
});

export const createMockErrorContext = (overrides?: Partial<ErrorContext>): ErrorContext => ({
  errorType: 'payment_failed',
  orderId: 'order123',
  userId: 'user123',
  operation: 'test_operation',
  originalError: new Error('Test error'),
  timestamp: '2023-01-01T00:00:00Z',
  retryCount: 0,
  metadata: {},
  ...overrides,
});

// Auth Service mocks
export const createMockLoginResponse = (overrides?: Partial<LoginResponse>): LoginResponse => ({
  success: true,
  user: createMockUser(),
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  message: 'Login successful',
  ...overrides,
});

export const createMockRegisterResponse = (overrides?: Partial<RegisterResponse>): RegisterResponse => ({
  success: true,
  user: createMockUser(),
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  message: 'Registration successful',
  ...overrides,
});

export const createMockLogoutResponse = () => ({
  success: true,
  message: 'Logout successful',
});