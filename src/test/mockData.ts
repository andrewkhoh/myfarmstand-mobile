import { User, Order, Product, OrderItem, Payment, PaymentMethod, PaymentIntent, PaymentError, CreatePaymentRequest, CreatePaymentMethodRequest } from '../types';
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

// Payment mock data - Following established patterns
export const createMockPaymentMethod = (overrides?: Partial<PaymentMethod>): PaymentMethod => ({
  id: 'pm_test123',
  type: 'card',
  customerId: 'cus_test123',
  userId: 'user_123',
  isDefault: false,
  createdAt: new Date().toISOString(),
  card: {
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
  },
  ...overrides,
});

export const createMockPaymentIntent = (overrides?: Partial<PaymentIntent>): PaymentIntent => ({
  id: 'pi_test123',
  amount: 1000, // $10.00
  currency: 'usd',
  status: 'requires_payment_method',
  clientSecret: 'pi_test123_secret_test',
  paymentMethodId: '',
  confirmationMethod: 'automatic',
  createdAt: new Date().toISOString(),
  metadata: {},
  ...overrides,
});

export const createMockPayment = (overrides?: Partial<Payment>): Payment => ({
  id: 'payment_test123',
  paymentIntentId: 'pi_test123',
  paymentMethodId: 'pm_test123',
  amount: 1000,
  currency: 'usd',
  status: 'succeeded',
  userId: 'user_123',
  orderId: 'order_test123',
  clientSecret: 'pi_test123_secret_test',
  confirmationMethod: 'automatic',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: {
    order_id: 'order_test123',
    customer_note: 'Test payment'
  },
  ...overrides,
});

export const createMockPaymentError = (overrides?: Partial<PaymentError>): PaymentError => ({
  code: 'CARD_DECLINED',
  message: 'Your card was declined.',
  userMessage: 'Your payment method was declined. Please try a different card.',
  type: 'card_error',
  details: {},
  retryable: true,
  ...overrides,
});

export const createMockCreatePaymentRequest = (overrides?: Partial<CreatePaymentRequest>): CreatePaymentRequest => ({
  amount: 1000,
  currency: 'usd',
  paymentMethodId: 'pm_test123',
  confirmationMethod: 'automatic',
  metadata: {
    order_id: 'order_test123'
  },
  ...overrides,
});

export const createMockCreatePaymentMethodRequest = (overrides?: Partial<CreatePaymentMethodRequest>): CreatePaymentMethodRequest => ({
  type: 'card',
  customerId: 'cus_test123',
  card: {
    number: '4242424242424242',
    expMonth: 12,
    expYear: 2025,
    cvc: '123',
  },
  ...overrides,
});

// Executive Analytics mocks
export const createMockBusinessMetrics = (overrides?: any) => ({
  revenue: {
    total: 125000,
    growth: 15.2,
    trend: 'increasing' as const
  },
  orders: {
    total: 450,
    growth: 12.5,
    trend: 'stable' as const
  },
  customers: {
    total: 280,
    growth: 8.3,
    trend: 'increasing' as const
  },
  generatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

export const createMockBusinessInsight = (overrides?: any) => ({
  id: 'insight-1',
  insightType: 'correlation' as const,
  insightTitle: 'Inventory-Marketing Correlation',
  confidenceScore: 0.89,
  impactLevel: 'high' as const,
  affectedAreas: ['inventory', 'marketing'],
  description: 'Strong correlation detected between inventory levels and marketing performance',
  recommendations: ['Optimize inventory levels', 'Adjust marketing spend'],
  generatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

export const createMockPredictiveForecast = (overrides?: any) => ({
  forecastData: {
    demandPrediction: {
      nextMonth: 1500,
      nextQuarter: 4200,
      nextYear: 18000
    },
    confidenceIntervals: {
      nextMonth: { lower: 1350, upper: 1650, confidence: 0.95 },
      nextQuarter: { lower: 3800, upper: 4600, confidence: 0.95 }
    },
    seasonalFactors: {
      january: 0.8,
      july: 1.3,
      december: 1.5
    }
  },
  modelMetrics: {
    accuracy: 0.89,
    mape: 11.2,
    rmse: 125.5
  },
  generatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

export const createMockStrategicReport = (overrides?: any) => ({
  reportData: {
    crossRoleAnalysis: {
      correlationMatrix: {
        'inventory-marketing': 0.75,
        'marketing-sales': 0.82
      }
    },
    predictiveInsights: {
      demandForecast: { nextMonth: 1250, confidence: 0.87 }
    },
    performanceTrends: {
      overallPerformance: 'above_target' as const,
      keyMetrics: { revenue_growth: 15.2 }
    }
  },
  reportMetadata: {
    reportId: 'report-1',
    reportType: 'executive_summary' as const,
    generatedAt: '2024-01-15T10:00:00Z',
    dataSourcesUsed: ['business_metrics', 'predictive_forecasts']
  },
  performanceMetrics: { generationTime: 1200 },
  ...overrides,
});