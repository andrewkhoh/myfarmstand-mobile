import React from 'react';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { 
  render, 
  fireEvent, 
  waitFor, 
  screen,
  createTestProducts,
  validCustomerInfo,
  invalidCustomerInfo,
  validDeliveryAddress,
  invalidDeliveryAddress,
  calculateExpectedTotals
} from '../../test/testUtils';
import { CheckoutScreen } from '../CheckoutScreen';
import { useCart } from '../../contexts/CartContext';

// Mock the cart context
jest.mock('../../contexts/CartContext');
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

// Mock React Query mutation
jest.mock('@tanstack/react-query');
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

// Mock navigation
const mockNavigate = jest.fn();
const mockRoute = {
  params: {},
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockRoute,
}));

describe('CheckoutScreen - Enhanced Checkout Tests', () => {
  const testProducts = createTestProducts();
  const mockClearCart = jest.fn();
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default cart context
    mockUseCart.mockReturnValue({
      items: [
        { product: testProducts[0], quantity: 2 },
        { product: testProducts[1], quantity: 1 },
      ],
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: mockClearCart,
      getTotalPrice: jest.fn(() => 10.47),
      getTotalItems: jest.fn(() => 3),
    });

    // Setup default mutation
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      data: null,
      reset: jest.fn(),
    } as any);
  });

  describe('Form Validation Tests', () => {
    test('should show validation errors for empty required fields', async () => {
      render(<CheckoutScreen />);

      // Try to submit empty form
      const submitButton = screen.getByText('Place Order');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeTruthy();
        expect(screen.getByText('Email is required')).toBeTruthy();
        expect(screen.getByText('Phone is required')).toBeTruthy();
      });
    });

    test('should show email format validation error', async () => {
      render(<CheckoutScreen />);

      const emailInput = screen.getByPlaceholderText('Email');
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    test('should show phone format validation error', async () => {
      render(<CheckoutScreen />);

      const phoneInput = screen.getByPlaceholderText('Phone');
      fireEvent.changeText(phoneInput, '123');
      fireEvent(phoneInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid phone number')).toBeTruthy();
      });
    });

    test('should clear validation errors when fields become valid', async () => {
      render(<CheckoutScreen />);

      const emailInput = screen.getByPlaceholderText('Email');
      
      // Enter invalid email
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
      });

      // Fix email
      fireEvent.changeText(emailInput, validCustomerInfo.email);

      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email address')).toBeNull();
      });
    });

    test('should disable submit button when form has validation errors', async () => {
      render(<CheckoutScreen />);

      const submitButton = screen.getByText('Place Order');
      
      // Button should be disabled initially (empty form)
      expect(submitButton).toBeDisabled();

      // Fill only name
      const nameInput = screen.getByPlaceholderText('Full Name');
      fireEvent.changeText(nameInput, validCustomerInfo.name);

      // Button should still be disabled
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Date/Time Picker Tests', () => {
    test('should show date/time pickers when pickup is selected', async () => {
      render(<CheckoutScreen />);

      const pickupRadio = screen.getByText('Pickup');
      fireEvent.press(pickupRadio);

      await waitFor(() => {
        expect(screen.getByTestId('date-picker-button')).toBeTruthy();
        expect(screen.getByTestId('time-picker-button')).toBeTruthy();
      });
    });

    test('should validate past pickup times', async () => {
      render(<CheckoutScreen />);

      const pickupRadio = screen.getByText('Pickup');
      fireEvent.press(pickupRadio);

      // Simulate selecting a past time
      const pastDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const dateButton = screen.getByTestId('date-picker-button');
      fireEvent.press(dateButton);

      // Mock date picker selection
      const datePicker = screen.getByTestId('datetimepicker-date');
      fireEvent.press(datePicker);

      await waitFor(() => {
        expect(screen.getByText('Pickup time must be at least 1 hour from now')).toBeTruthy();
      });
    });

    test('should hide date/time pickers when delivery is selected', async () => {
      render(<CheckoutScreen />);

      // First select pickup to show pickers
      const pickupRadio = screen.getByText('Pickup');
      fireEvent.press(pickupRadio);

      await waitFor(() => {
        expect(screen.getByTestId('date-picker-button')).toBeTruthy();
      });

      // Then select delivery
      const deliveryRadio = screen.getByText('Delivery');
      fireEvent.press(deliveryRadio);

      await waitFor(() => {
        expect(screen.queryByTestId('date-picker-button')).toBeNull();
        expect(screen.queryByTestId('time-picker-button')).toBeNull();
      });
    });
  });

  describe('Delivery Address Validation Tests', () => {
    test('should show address field when delivery is selected', async () => {
      render(<CheckoutScreen />);

      const deliveryRadio = screen.getByText('Delivery');
      fireEvent.press(deliveryRadio);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your delivery address')).toBeTruthy();
      });
    });

    test('should validate empty delivery address', async () => {
      render(<CheckoutScreen />);

      const deliveryRadio = screen.getByText('Delivery');
      fireEvent.press(deliveryRadio);

      const addressInput = screen.getByPlaceholderText('Enter your delivery address');
      fireEvent(addressInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Delivery address is required')).toBeTruthy();
      });
    });

    test('should validate short delivery address', async () => {
      render(<CheckoutScreen />);

      const deliveryRadio = screen.getByText('Delivery');
      fireEvent.press(deliveryRadio);

      const addressInput = screen.getByPlaceholderText('Enter your delivery address');
      fireEvent.changeText(addressInput, invalidDeliveryAddress);
      fireEvent(addressInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Please enter a complete address')).toBeTruthy();
      });
    });

    test('should accept valid multiline delivery address', async () => {
      render(<CheckoutScreen />);

      const deliveryRadio = screen.getByText('Delivery');
      fireEvent.press(deliveryRadio);

      const addressInput = screen.getByPlaceholderText('Enter your delivery address');
      fireEvent.changeText(addressInput, validDeliveryAddress);

      await waitFor(() => {
        expect(screen.queryByText('Please enter a complete address')).toBeNull();
        expect(screen.queryByText('Delivery address is required')).toBeNull();
      });
    });

    test('should show delivery note when delivery is selected', async () => {
      render(<CheckoutScreen />);

      const deliveryRadio = screen.getByText('Delivery');
      fireEvent.press(deliveryRadio);

      await waitFor(() => {
        expect(screen.getByText(/delivery available within/i)).toBeTruthy();
      });
    });
  });

  describe('Order Summary Tests', () => {
    test('should display correct order summary calculations', async () => {
      const { subtotal, tax, total } = calculateExpectedTotals(testProducts, [2, 1]);
      
      render(<CheckoutScreen />);

      await waitFor(() => {
        expect(screen.getByText(`$${subtotal.toFixed(2)}`)).toBeTruthy();
        expect(screen.getByText(`$${tax.toFixed(2)}`)).toBeTruthy();
        expect(screen.getByText(`$${total.toFixed(2)}`)).toBeTruthy();
      });
    });

    test('should display cart items with correct quantities', async () => {
      render(<CheckoutScreen />);

      await waitFor(() => {
        expect(screen.getByText('Test Apples')).toBeTruthy();
        expect(screen.getByText('Test Bananas')).toBeTruthy();
        expect(screen.getByText('Qty: 2')).toBeTruthy();
        expect(screen.getByText('Qty: 1')).toBeTruthy();
      });
    });
  });

  describe('Order Submission Tests', () => {
    test('should submit order successfully with valid data', async () => {
      // Mock successful mutation
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: { id: '12345', success: true },
        reset: jest.fn(),
      } as any);

      render(<CheckoutScreen />);

      // Fill valid form data
      fireEvent.changeText(screen.getByPlaceholderText('Full Name'), validCustomerInfo.name);
      fireEvent.changeText(screen.getByPlaceholderText('Email'), validCustomerInfo.email);
      fireEvent.changeText(screen.getByPlaceholderText('Phone'), validCustomerInfo.phone);

      // Select pickup
      fireEvent.press(screen.getByText('Pickup'));

      // Submit order
      const submitButton = screen.getByText('Place Order');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            customerInfo: validCustomerInfo,
            orderType: 'pickup',
            items: expect.any(Array),
          })
        );
      });
    });

    test('should handle order submission failure', async () => {
      // Mock failed mutation
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: true,
        error: new Error('Network error'),
        data: null,
        reset: jest.fn(),
      } as any);

      render(<CheckoutScreen />);

      // Fill valid form data
      fireEvent.changeText(screen.getByPlaceholderText('Full Name'), validCustomerInfo.name);
      fireEvent.changeText(screen.getByPlaceholderText('Email'), validCustomerInfo.email);
      fireEvent.changeText(screen.getByPlaceholderText('Phone'), validCustomerInfo.phone);

      // Submit order
      const submitButton = screen.getByText('Place Order');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('OrderConfirmation', {
          success: false,
          error: 'Network error',
        });
      });
    });

    test('should show loading state during order submission', async () => {
      // Mock pending mutation
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        error: null,
        data: null,
        reset: jest.fn(),
      } as any);

      render(<CheckoutScreen />);

      await waitFor(() => {
        expect(screen.getByText('Placing Order...')).toBeTruthy();
      });
    });
  });

  describe('Error Handling Tests', () => {
    test('should show validation error summary when submitting invalid form', async () => {
      render(<CheckoutScreen />);

      // Try to submit empty form
      const submitButton = screen.getByText('Place Order');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please fix the following errors:')).toBeTruthy();
      });
    });

    test('should prevent submission when form has validation errors', async () => {
      render(<CheckoutScreen />);

      // Fill invalid data
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'invalid-email');
      fireEvent.changeText(screen.getByPlaceholderText('Phone'), '123');

      const submitButton = screen.getByText('Place Order');
      fireEvent.press(submitButton);

      // Should not call mutate with invalid data
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Complete User Journey Tests', () => {
    test('should complete full pickup order flow', async () => {
      render(<CheckoutScreen />);

      // Fill customer information
      fireEvent.changeText(screen.getByPlaceholderText('Full Name'), validCustomerInfo.name);
      fireEvent.changeText(screen.getByPlaceholderText('Email'), validCustomerInfo.email);
      fireEvent.changeText(screen.getByPlaceholderText('Phone'), validCustomerInfo.phone);

      // Select pickup
      fireEvent.press(screen.getByText('Pickup'));

      // Set future pickup time (mock)
      const dateButton = screen.getByTestId('date-picker-button');
      fireEvent.press(dateButton);

      // Add order notes
      fireEvent.changeText(screen.getByPlaceholderText('Special instructions'), 'Test order notes');

      // Submit order
      const submitButton = screen.getByText('Place Order');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            customerInfo: validCustomerInfo,
            orderType: 'pickup',
            notes: 'Test order notes',
          })
        );
      });
    });

    test('should complete full delivery order flow', async () => {
      render(<CheckoutScreen />);

      // Fill customer information
      fireEvent.changeText(screen.getByPlaceholderText('Full Name'), validCustomerInfo.name);
      fireEvent.changeText(screen.getByPlaceholderText('Email'), validCustomerInfo.email);
      fireEvent.changeText(screen.getByPlaceholderText('Phone'), validCustomerInfo.phone);

      // Select delivery
      fireEvent.press(screen.getByText('Delivery'));

      // Fill delivery address
      fireEvent.changeText(
        screen.getByPlaceholderText('Enter your delivery address'), 
        validDeliveryAddress
      );

      // Add order notes
      fireEvent.changeText(screen.getByPlaceholderText('Special instructions'), 'Delivery test order');

      // Submit order
      const submitButton = screen.getByText('Place Order');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            customerInfo: validCustomerInfo,
            orderType: 'delivery',
            deliveryAddress: validDeliveryAddress,
            notes: 'Delivery test order',
          })
        );
      });
    });
  });
});
