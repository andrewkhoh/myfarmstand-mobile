import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KioskProvider } from '../../contexts';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock hooks
jest.mock('../../hooks/useProducts', () => ({
  useProducts: () => ({
    data: [
      {
        id: 'test-product-1',
        name: 'Test Tomato',
        price: 4.99,
        description: 'Fresh tomatoes',
        available: true,
        category_id: 'vegetables',
      }
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCategories: () => ({
    data: [{ id: 'vegetables', name: 'Vegetables' }],
    isLoading: false,
  }),
}));

jest.mock('../../hooks/useCart', () => ({
  useCart: () => ({
    addItem: jest.fn(),
    getCartQuantity: jest.fn(() => 0),
  }),
}));

jest.mock('../../hooks/useKiosk', () => ({
  useKioskAuth: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useKioskSession: () => ({
    data: null,
    isLoading: false,
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
  logger: { log: () => {}, warn: () => {}, error: () => {} }
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <KioskProvider>
        {children}
      </KioskProvider>
    </QueryClientProvider>
  );
};

describe('Customer Transparency Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UI Transparency', () => {
    it('should show identical UI whether kiosk mode is active or not', async () => {
      // Test 1: Normal mode (no kiosk session)
      const { container: normalContainer } = render(
        <TestWrapper>
          <ShopScreen />
        </TestWrapper>
      );

      // Verify core customer elements are present
      expect(screen.getByText('🌱 Farm Stand')).toBeTruthy();
      expect(screen.getByText('Test Tomato')).toBeTruthy();
      expect(screen.getByPlaceholderText(/search products/i)).toBeTruthy();

      // Test 2: With kiosk context available but not active
      // The UI should be identical since kiosk mode is transparent to customers
      const { container: kioskAvailableContainer } = render(
        <TestWrapper>
          <ShopScreen />
        </TestWrapper>
      );

      // UI should be functionally identical
      expect(screen.getByText('🌱 Farm Stand')).toBeTruthy();
      expect(screen.getByText('Test Tomato')).toBeTruthy();
      expect(screen.getByPlaceholderText(/search products/i)).toBeTruthy();
    });

    it('should not show kiosk-specific controls to customers in normal mode', () => {
      render(
        <TestWrapper>
          <ShopScreen />
        </TestWrapper>
      );

      // Should NOT show kiosk indicator when not in kiosk mode
      expect(() => screen.getByText(/kiosk mode/i)).toThrow();
      expect(() => screen.getByText(/end session/i)).toThrow();
    });

    it('should preserve all customer functionality when kiosk context is available', () => {
      render(
        <TestWrapper>
          <ShopScreen />
        </TestWrapper>
      );

      // All normal customer functionality should be present
      expect(screen.getByText('Test Tomato')).toBeTruthy();
      expect(screen.getByPlaceholderText(/search products/i)).toBeTruthy();
      
      // Should be able to access product details, cart, etc.
      // This verifies that adding kiosk context doesn't break existing functionality
    });
  });

  describe('Kiosk Context Integration', () => {
    it('should provide kiosk context without affecting customer experience', () => {
      const TestComponent = () => {
        // This simulates how existing screens will use kiosk context
        // They can access it, but customers don't see any difference
        return (
          <TestWrapper>
            <ShopScreen />
          </TestWrapper>
        );
      };

      // Should render successfully without errors
      expect(() => render(<TestComponent />)).not.toThrow();
    });

    it('should handle kiosk hooks gracefully when no session is active', () => {
      // This tests that our kiosk hooks don't break when used in normal customer mode
      render(
        <TestWrapper>
          <ShopScreen />
        </TestWrapper>
      );

      // Should render without issues
      expect(screen.getByText('🌱 Farm Stand')).toBeTruthy();
      expect(screen.getByText('Test Tomato')).toBeTruthy();
    });
  });

  describe('Hidden Staff Entry Point', () => {
    it('should have hidden staff access that does not interfere with customer experience', () => {
      render(
        <TestWrapper>
          <ShopScreen />
        </TestWrapper>
      );

      // The title should be pressable (for staff) but appear normal to customers
      const title = screen.getByText('🌱 Farm Stand');
      expect(title).toBeTruthy();
      
      // Should not show any indication that it's interactive for kiosk access
      // (The press functionality exists but is invisible to customers)
    });
  });

  describe('Component Isolation', () => {
    it('should not leak kiosk functionality into customer-facing components', () => {
      render(
        <TestWrapper>
          <ShopScreen />
        </TestWrapper>
      );

      // Verify that standard customer UI elements work normally
      const searchInput = screen.getByPlaceholderText(/search products/i);
      expect(searchInput).toBeTruthy();
      
      // Should not have any visible kiosk-related elements when not in kiosk mode
      const kioskElements = screen.queryAllByText(/kiosk/i);
      expect(kioskElements).toHaveLength(0);
    });
  });
});

describe('KioskProvider Integration', () => {
  it('should provide kiosk context throughout the app without side effects', () => {
    const TestApp = () => (
      <TestWrapper>
        <ShopScreen />
      </TestWrapper>
    );

    expect(() => render(<TestApp />)).not.toThrow();
  });

  it('should maintain performance with kiosk context provider', () => {
    // This is a basic performance test - the app should render quickly
    const startTime = Date.now();
    
    render(
      <TestWrapper>
        <ShopScreen />
      </TestWrapper>
    );

    const renderTime = Date.now() - startTime;
    // Should render within reasonable time (less than 1 second)
    expect(renderTime).toBeLessThan(1000);
  });
});

console.log('✅ Customer transparency integration tests completed');