import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
// CartProvider removed - using React Query cart hooks instead
import { Product } from '../types';

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  queryClient = createTestQueryClient() 
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient;
  }
) => {
  const { queryClient, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper queryClient={queryClient}>
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  });
};

// Test data factories
export const createTestProduct = (overrides: Partial<Product> = {}): Product => ({
  id: '1',
  name: 'Test Apple',
  description: 'Fresh test apples',
  price: 3.99,
  stock: 10,
  categoryId: '1',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createTestProducts = (): Product[] => [
  createTestProduct({
    id: '1',
    name: 'Test Apples',
    price: 3.99,
    stock: 10,
  }),
  createTestProduct({
    id: '2',
    name: 'Test Bananas',
    price: 2.49,
    stock: 15,
  }),
];

// Test data for forms
export const validCustomerInfo = {
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '555-123-4567',
};

export const invalidCustomerInfo = {
  name: '',
  email: 'invalid-email',
  phone: '123',
};

export const validDeliveryAddress = '123 Main Street\nAnytown, CA 12345';
export const invalidDeliveryAddress = '123';

// Utility functions
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const calculateExpectedTotals = (products: Product[], quantities: number[]) => {
  const subtotal = products.reduce((sum, product, index) => 
    sum + (product.price * quantities[index]), 0
  );
  const tax = Math.round(subtotal * 0.085 * 100) / 100;
  const total = subtotal + tax;
  
  return { subtotal, tax, total };
};

// Re-export everything from testing library
export * from '@testing-library/react-native';
export { customRender as render };
