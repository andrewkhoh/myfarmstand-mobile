/**
 * Test Data Factories - Centralized Export
 * 
 * All test data factories with schema validation for consistent test data generation.
 * These factories ensure that all test data passes schema validation, preventing
 * test failures due to invalid data structures.
 */

// Base factory class
import { SchemaFactory } from './base.factory';
export { SchemaFactory };
export type { FactoryEntity, FactoryDbEntity } from './base.factory';

// Import all factory instances for use in resetAllFactories
import { ProductFactory } from './product.factory';
import { 
  orderFactory,
  orderItemFactory,
  customerInfoFactory
} from './order.factory';
import {
  userFactory,
  authStateFactory,
  supabaseAuthUserFactory,
  supabaseSessionFactory
} from './user.factory';
import {
  cartItemFactory,
  cartStateFactory,
  cartSummaryFactory
} from './cart.factory';
import { categoryFactory } from './category.factory';
import {
  paymentFactory,
  paymentMethodFactory,
  paymentIntentFactory,
  paymentCalculationFactory,
  createPaymentRequestFactory
} from './payment.factory';
// Product Factory
import {
  createProduct,
  createDbProduct,
  createProducts
} from './product.factory';
export { 
  ProductFactory,
  createProduct,
  createDbProduct,
  createProducts
};

// Order Factory
import {
  OrderFactory,
  OrderItemFactory,
  CustomerInfoFactory,
  orderFactory,
  orderItemFactory,
  customerInfoFactory,
  createOrder,
  createOrderItem,
  createCustomerInfo
} from './order.factory';
export { 
  OrderFactory,
  OrderItemFactory,
  CustomerInfoFactory,
  orderFactory,
  orderItemFactory,
  customerInfoFactory,
  createOrder,
  createOrderItem,
  createCustomerInfo
};

// User Factory
import {
  UserFactory,
  AuthStateFactory,
  SupabaseAuthUserFactory,
  SupabaseSessionFactory,
  userFactory,
  authStateFactory,
  supabaseAuthUserFactory,
  supabaseSessionFactory,
  createUser,
  createAuthState,
  createSupabaseUser,
  createSupabaseSession
} from './user.factory';
export { 
  UserFactory,
  AuthStateFactory,
  SupabaseAuthUserFactory,
  SupabaseSessionFactory,
  userFactory,
  authStateFactory,
  supabaseAuthUserFactory,
  supabaseSessionFactory,
  createUser,
  createAuthState,
  createSupabaseUser,
  createSupabaseSession
};

// Cart Factory
import {
  CartItemFactory,
  CartStateFactory,
  CartSummaryFactory,
  cartItemFactory,
  cartStateFactory,
  cartSummaryFactory,
  createCartItem,
  createCartState,
  createCartSummary
} from './cart.factory';
export { 
  CartItemFactory,
  CartStateFactory,
  CartSummaryFactory,
  cartItemFactory,
  cartStateFactory,
  cartSummaryFactory,
  createCartItem,
  createCartState,
  createCartSummary
};

// Category Factory
import {
  CategoryFactory,
  categoryFactory,
  createCategory,
  createDbCategory,
  createCategories
} from './category.factory';
export { 
  CategoryFactory,
  categoryFactory,
  createCategory,
  createDbCategory,
  createCategories
};

// Payment Factory
import {
  PaymentFactory,
  PaymentMethodFactory,
  PaymentIntentFactory,
  PaymentCalculationFactory,
  CreatePaymentRequestFactory,
  paymentFactory,
  paymentMethodFactory,
  paymentIntentFactory,
  paymentCalculationFactory,
  createPaymentRequestFactory,
  createPayment,
  createPaymentMethod,
  createPaymentIntent,
  createPaymentCalculation,
  createPaymentRequest
} from './payment.factory';
export { 
  PaymentFactory,
  PaymentMethodFactory,
  PaymentIntentFactory,
  PaymentCalculationFactory,
  CreatePaymentRequestFactory,
  paymentFactory,
  paymentMethodFactory,
  paymentIntentFactory,
  paymentCalculationFactory,
  createPaymentRequestFactory,
  createPayment,
  createPaymentMethod,
  createPaymentIntent,
  createPaymentCalculation,
  createPaymentRequest
};

/**
 * Reset all factory ID counters
 * Useful for test isolation
 */
export function resetAllFactories(): void {
  // Reset individual factory instances
  orderFactory.reset();
  orderItemFactory.reset();
  customerInfoFactory.reset();
  userFactory.reset();
  authStateFactory.reset();
  supabaseAuthUserFactory.reset();
  supabaseSessionFactory.reset();
  cartItemFactory.reset();
  cartStateFactory.reset();
  cartSummaryFactory.reset();
  categoryFactory.reset();
  paymentFactory.reset();
  paymentMethodFactory.reset();
  paymentIntentFactory.reset();
  paymentCalculationFactory.reset();
  createPaymentRequestFactory.reset();
  
  // Reset ProductFactory static counter
  ProductFactory.reset();
}

/**
 * Common test data scenarios
 */
export const testScenarios = {
  /**
   * Create a complete e-commerce test scenario
   */
  createCompleteScenario() {
    const user = createUser();
    const categories = categoryFactory.createFarmCategories();
    const products = createProducts(10);
    const cart = createCartState();
    const paymentMethod = createPaymentMethod({ userId: user.id });
    const order = createOrder({ user_id: user.id });
    const payment = createPayment({ userId: user.id, orderId: order.id });
    
    return {
      user,
      categories,
      products,
      cart,
      paymentMethod,
      order,
      payment
    };
  },

  /**
   * Create a checkout scenario
   */
  createCheckoutScenario() {
    const user = createUser();
    const products = createProducts(3);
    const cartItems = products.map(p => cartItemFactory.createWithProduct(p));
    const cart = cartStateFactory.createWithItems(cartItems);
    const paymentMethod = paymentMethodFactory.createDefault({ userId: user.id });
    const customerInfo = createCustomerInfo({
      name: user.name,
      email: user.email,
      phone: user.phone || '+1234567890'
    });
    
    return {
      user,
      products,
      cart,
      paymentMethod,
      customerInfo
    };
  },

  /**
   * Create a failed payment scenario
   */
  createFailedPaymentScenario() {
    const user = createUser();
    const order = createOrder({ 
      user_id: user.id,
      payment_status: 'failed'
    });
    const expiredCard = paymentMethodFactory.createExpiredCard({ userId: user.id });
    const failedPayment = paymentFactory.createFailed({
      userId: user.id,
      orderId: order.id,
      paymentMethodId: expiredCard.id
    });
    
    return {
      user,
      order,
      paymentMethod: expiredCard,
      payment: failedPayment
    };
  },

  /**
   * Create an admin testing scenario
   */
  createAdminScenario() {
    const admin = userFactory.createAdmin();
    const customers = userFactory.createMany(5);
    const orders = customers.map(c => 
      orderFactory.createWithItems(
        orderItemFactory.createMany(3),
        { user_id: c.id }
      )
    );
    const categories = categoryFactory.createFarmCategories();
    const products = createProducts(20);
    
    return {
      admin,
      customers,
      orders,
      categories,
      products
    };
  }
};