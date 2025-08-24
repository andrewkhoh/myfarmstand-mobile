/**
 * Simple, targeted fixes for the most common test issues
 * This approach avoids Jest's restrictions while fixing the majority of failures
 */

// Fix missing resetAllFactories
if (!(global as any).resetAllFactories) {
  (global as any).resetAllFactories = () => {
    // Simple reset function
    console.log('Resetting factories');
  };
}

// Fix missing factory functions
if (!(global as any).createProduct) {
  (global as any).createProduct = (overrides = {}) => ({
    id: 'product-1',
    name: 'Test Product',
    price: 9.99,
    stock_quantity: 100,
    ...overrides
  });
}

if (!(global as any).createUser) {
  (global as any).createUser = (overrides = {}) => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides
  });
}

// Export for use in tests
export const testHelpers = {
  resetAllFactories: (global as any).resetAllFactories,
  createProduct: (global as any).createProduct,
  createUser: (global as any).createUser,
};