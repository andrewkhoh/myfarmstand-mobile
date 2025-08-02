import React from 'react';
import { 
  render, 
  fireEvent, 
  waitFor, 
  screen,
  createTestProducts,
  calculateExpectedTotals
} from '../../test/testUtils';
import { OrderConfirmationScreen } from '../OrderConfirmationScreen';
import { useCart } from '../../contexts/CartContext';
import { Order } from '../../types';

// Mock the cart context
jest.mock('../../contexts/CartContext');
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

// Mock navigation
const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ 
    navigate: mockNavigate,
    reset: mockReset,
  }),
  useRoute: () => ({
    params: {
      order: null,
      success: false,
      error: null,
    },
  }),
}));

describe('OrderConfirmationScreen - Automated Tests', () => {
  const testProducts = createTestProducts();
  const mockClearCart = jest.fn();

  const createTestOrder = (overrides: Partial<Order> = {}): Order => ({
    id: '12345',
    customerInfo: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '555-123-4567',
    },
    items: [
      { productId: testProducts[0].id, quantity: 2, price: testProducts[0].price },
      { productId: testProducts[1].id, quantity: 1, price: testProducts[1].price },
    ],
    orderType: 'pickup',
    pickupDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    deliveryAddress: undefined,
    notes: 'Test order',
    subtotal: 10.47,
    tax: 0.89,
    total: 11.36,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseCart.mockReturnValue({
      items: [],
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: mockClearCart,
      getTotalPrice: jest.fn(() => 0),
      getTotalItems: jest.fn(() => 0),
    });
  });

  describe('Success State Tests', () => {
    test('should display success message and order details for successful order', async () => {
      const testOrder = createTestOrder();
      
      // Mock route params for success
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText('Order Confirmed!')).toBeTruthy();
        expect(screen.getByText('✅')).toBeTruthy();
        expect(screen.getByText(`Order #${testOrder.id}`)).toBeTruthy();
      });
    });

    test('should display correct customer information', async () => {
      const testOrder = createTestOrder();
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText(testOrder.customerInfo.name)).toBeTruthy();
        expect(screen.getByText(testOrder.customerInfo.email)).toBeTruthy();
        expect(screen.getByText(testOrder.customerInfo.phone)).toBeTruthy();
      });
    });

    test('should display correct order totals', async () => {
      const testOrder = createTestOrder();
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText(`$${testOrder.subtotal.toFixed(2)}`)).toBeTruthy();
        expect(screen.getByText(`$${testOrder.tax.toFixed(2)}`)).toBeTruthy();
        expect(screen.getByText(`$${testOrder.total.toFixed(2)}`)).toBeTruthy();
      });
    });

    test('should display pickup information for pickup orders', async () => {
      const testOrder = createTestOrder({
        orderType: 'pickup',
        pickupDateTime: new Date('2025-08-03T14:00:00'),
      });
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText('Pickup')).toBeTruthy();
        expect(screen.getByText(/August 3, 2025/)).toBeTruthy();
        expect(screen.getByText(/2:00 PM/)).toBeTruthy();
      });
    });

    test('should display delivery information for delivery orders', async () => {
      const testOrder = createTestOrder({
        orderType: 'delivery',
        deliveryAddress: '123 Main Street\nAnytown, CA 12345',
        pickupDateTime: undefined,
      });
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText('Delivery')).toBeTruthy();
        expect(screen.getByText('123 Main Street')).toBeTruthy();
        expect(screen.getByText('Anytown, CA 12345')).toBeTruthy();
      });
    });

    test('should clear cart automatically on successful order', async () => {
      const testOrder = createTestOrder();
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(mockClearCart).toHaveBeenCalled();
      });
    });

    test('should navigate back to main app when Continue Shopping is pressed', async () => {
      const testOrder = createTestOrder();
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      const continueButton = screen.getByText('Continue Shopping');
      fireEvent.press(continueButton);

      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    });
  });

  describe('Error State Tests', () => {
    test('should display error message for failed order', async () => {
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: null,
            success: false,
            error: 'Network connection failed',
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText('Order Failed')).toBeTruthy();
        expect(screen.getByText('❌')).toBeTruthy();
        expect(screen.getByText('Network connection failed')).toBeTruthy();
      });
    });

    test('should show Try Again button for failed orders', async () => {
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: null,
            success: false,
            error: 'Server error',
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeTruthy();
      });
    });

    test('should navigate back to checkout when Try Again is pressed', async () => {
      const mockGoBack = jest.fn();
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({ 
          navigate: mockNavigate,
          reset: mockReset,
          goBack: mockGoBack,
        }),
        useRoute: () => ({
          params: {
            order: null,
            success: false,
            error: 'Server error',
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.press(tryAgainButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    test('should not clear cart for failed orders', async () => {
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: null,
            success: false,
            error: 'Payment failed',
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText('Order Failed')).toBeTruthy();
      });

      // Cart should not be cleared for failed orders
      expect(mockClearCart).not.toHaveBeenCalled();
    });
  });

  describe('Order Items Display Tests', () => {
    test('should display all order items with correct quantities and prices', async () => {
      const testOrder = createTestOrder();
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        // Check for item quantities
        expect(screen.getByText('2x')).toBeTruthy(); // First item quantity
        expect(screen.getByText('1x')).toBeTruthy(); // Second item quantity
        
        // Check for item prices
        expect(screen.getByText(`$${testProducts[0].price.toFixed(2)}`)).toBeTruthy();
        expect(screen.getByText(`$${testProducts[1].price.toFixed(2)}`)).toBeTruthy();
      });
    });

    test('should display order notes when provided', async () => {
      const testOrder = createTestOrder({
        notes: 'Special handling instructions',
      });
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.getByText('Special handling instructions')).toBeTruthy();
      });
    });

    test('should not display notes section when no notes provided', async () => {
      const testOrder = createTestOrder({
        notes: '',
      });
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: testOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      render(<MockedScreen />);

      await waitFor(() => {
        expect(screen.queryByText('Order Notes')).toBeNull();
      });
    });
  });

  describe('Edge Cases Tests', () => {
    test('should handle missing order data gracefully', async () => {
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: null,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      
      // Should not crash when order is null
      expect(() => render(<MockedScreen />)).not.toThrow();
    });

    test('should handle malformed order data', async () => {
      const malformedOrder = {
        id: '12345',
        // Missing required fields
      } as any;
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useRoute: () => ({
          params: {
            order: malformedOrder,
            success: true,
            error: null,
          },
        }),
      }));

      const { OrderConfirmationScreen: MockedScreen } = require('../OrderConfirmationScreen');
      
      // Should not crash with malformed data
      expect(() => render(<MockedScreen />)).not.toThrow();
    });
  });
});
