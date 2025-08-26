/**
 * Test Suite: Stock Management Screen
 * TDD Approach - 20 comprehensive tests
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

import StockManagementScreen from '../StockManagementScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({ 
    params: { 
      mode: 'manage',
      productId: undefined 
    } 
  }),
  useFocusEffect: jest.fn(),
}));

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  Modal: ({ children, visible, ...props }: any) => visible ? children : null,
  ActivityIndicator: 'ActivityIndicator',
  FlatList: 'FlatList',
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
    compose: (style1: any, style2: any) => [style1, style2],
    hairlineWidth: 1,
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));

// Mock components
jest.mock('../../../components/Text', () => ({
  Text: ({ children }: any) => children,
}));
jest.mock('../../../components/Card', () => ({
  Card: ({ children }: any) => children,
}));
jest.mock('../../../components/Button', () => ({
  Button: ({ children, onPress }: any) => {
    const React = require('react');
    return React.createElement('TouchableOpacity', { onPress }, children);
  },
}));
jest.mock('../../../components/Screen', () => ({
  Screen: ({ children }: any) => children,
}));
jest.mock('../../../components/Loading', () => ({
  Loading: () => 'Loading...',
}));
jest.mock('../../../components/Input', () => ({
  Input: ({ ...props }: any) => {
    const React = require('react');
    return React.createElement('TextInput', props);
  },
}));

// Mock data
const mockStockData = {
  products: [
    { 
      id: '1', 
      name: 'Tomatoes', 
      sku: 'TOM-001',
      currentStock: 5, 
      minStock: 20, 
      maxStock: 100,
      unit: 'kg',
      location: 'Warehouse A',
      lastUpdated: new Date().toISOString(),
    },
    { 
      id: '2', 
      name: 'Lettuce', 
      sku: 'LET-001',
      currentStock: 50, 
      minStock: 10, 
      maxStock: 80,
      unit: 'units',
      location: 'Warehouse B',
      lastUpdated: new Date().toISOString(),
    },
  ],
  locations: ['Warehouse A', 'Warehouse B', 'Store Front'],
  categories: ['Vegetables', 'Fruits', 'Dairy'],
};

// Mock hooks
jest.mock('../../../hooks/inventory/useStockOperations', () => ({
  useStockOperations: jest.fn(() => ({
    updateStock: jest.fn(),
    bulkUpdateStock: jest.fn(),
    transferStock: jest.fn(),
    adjustStock: jest.fn(),
  })),
  useStockData: jest.fn(() => ({
    data: mockStockData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useStockHistory: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

jest.mock('../../../hooks/role-based/useUserRole', () => ({
  useUserRole: jest.fn(() => ({
    data: {
      id: 'role-123',
      userId: 'user-123',
      roleType: 'manager',
      permissions: ['inventory:write', 'inventory:adjust', 'inventory:transfer'],
    },
    hasPermission: jest.fn(() => true),
    isLoading: false,
    error: null,
  })),
}));

jest.spyOn(Alert, 'alert');

describe('StockManagementScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Stock Display', () => {
    it('1. should display list of products with current stock levels', async () => {
      const { getByText } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        expect(getByText('Tomatoes')).toBeTruthy();
        expect(getByText('5 kg')).toBeTruthy();
        expect(getByText('Lettuce')).toBeTruthy();
        expect(getByText('50 units')).toBeTruthy();
      });
    });

    it('2. should show low stock indicators', async () => {
      const { getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        expect(getByTestId('low-stock-indicator-1')).toBeTruthy();
      });
    });

    it('3. should display SKU and location for each product', async () => {
      const { getByText } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        expect(getByText('TOM-001')).toBeTruthy();
        expect(getByText('Warehouse A')).toBeTruthy();
      });
    });

    it('4. should show min/max stock thresholds', async () => {
      const { getByText } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        expect(getByText('Min: 20')).toBeTruthy();
        expect(getByText('Max: 100')).toBeTruthy();
      });
    });
  });

  describe('Stock Adjustment', () => {
    it('5. should open stock adjustment modal on product tap', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        expect(getByTestId('stock-adjustment-modal')).toBeTruthy();
      });
    });

    it('6. should allow quantity input for adjustment', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        const input = getByTestId('adjustment-quantity-input');
        fireEvent.changeText(input, '25');
        expect(input.props.value).toBe('25');
      });
    });

    it('7. should require adjustment reason', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        const reasonPicker = getByTestId('adjustment-reason-picker');
        expect(reasonPicker).toBeTruthy();
      });
    });

    it('8. should validate stock adjustments against limits', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        const input = getByTestId('adjustment-quantity-input');
        fireEvent.changeText(input, '150'); // Exceeds max stock
        fireEvent.press(getByText('Confirm'));
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Quantity',
          expect.any(String)
        );
      });
    });

    it('9. should save stock adjustment with audit trail', async () => {
      const adjustStock = jest.fn();
      require('../../../hooks/inventory/useStockOperations').useStockOperations.mockReturnValueOnce({
        adjustStock,
        updateStock: jest.fn(),
        bulkUpdateStock: jest.fn(),
        transferStock: jest.fn(),
      });

      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        fireEvent.changeText(getByTestId('adjustment-quantity-input'), '30');
        fireEvent.press(getByText('Confirm'));
        
        expect(adjustStock).toHaveBeenCalledWith({
          productId: '1',
          newQuantity: 30,
          reason: expect.any(String),
          notes: expect.any(String),
        });
      });
    });
  });

  describe('Bulk Operations', () => {
    it('10. should enable multi-select mode', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Select Multiple'));
        expect(getByTestId('multi-select-toolbar')).toBeTruthy();
      });
    });

    it('11. should select/deselect products in bulk mode', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Select Multiple'));
        const checkbox = getByTestId('select-product-1');
        fireEvent.press(checkbox);
        expect(getByText('1 selected')).toBeTruthy();
      });
    });

    it('12. should perform bulk stock update', async () => {
      const bulkUpdateStock = jest.fn();
      require('../../../hooks/inventory/useStockOperations').useStockOperations.mockReturnValueOnce({
        bulkUpdateStock,
        adjustStock: jest.fn(),
        updateStock: jest.fn(),
        transferStock: jest.fn(),
      });

      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Select Multiple'));
        fireEvent.press(getByTestId('select-product-1'));
        fireEvent.press(getByTestId('select-product-2'));
        fireEvent.press(getByText('Bulk Update'));
        
        expect(bulkUpdateStock).toHaveBeenCalled();
      });
    });
  });

  describe('Stock Transfer', () => {
    it('13. should open transfer modal', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        fireEvent.press(getByText('Transfer'));
        expect(getByTestId('stock-transfer-modal')).toBeTruthy();
      });
    });

    it('14. should allow location selection for transfer', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        fireEvent.press(getByText('Transfer'));
        expect(getByTestId('location-picker')).toBeTruthy();
        expect(getByText('Warehouse B')).toBeTruthy();
        expect(getByText('Store Front')).toBeTruthy();
      });
    });

    it('15. should validate transfer quantity', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        fireEvent.press(getByText('Transfer'));
        const input = getByTestId('transfer-quantity-input');
        fireEvent.changeText(input, '10'); // More than available
        fireEvent.press(getByText('Confirm Transfer'));
        
        expect(Alert.alert).toHaveBeenCalledWith(
          'Insufficient Stock',
          expect.any(String)
        );
      });
    });
  });

  describe('Filtering and Search', () => {
    it('16. should filter products by search term', async () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        const searchInput = getByTestId('search-input');
        fireEvent.changeText(searchInput, 'Tomato');
        
        expect(getByText('Tomatoes')).toBeTruthy();
        expect(queryByText('Lettuce')).toBeNull();
      });
    });

    it('17. should filter by stock status', async () => {
      const { getByText, queryByText } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Low Stock Only'));
        
        expect(getByText('Tomatoes')).toBeTruthy();
        expect(queryByText('Lettuce')).toBeNull();
      });
    });

    it('18. should filter by location', async () => {
      const { getByText, queryByText } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Filter by Location'));
        fireEvent.press(getByText('Warehouse A'));
        
        expect(getByText('Tomatoes')).toBeTruthy();
        expect(queryByText('Lettuce')).toBeNull();
      });
    });
  });

  describe('Stock History', () => {
    it('19. should show stock movement history', async () => {
      const { getByText, getByTestId } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Tomatoes'));
        fireEvent.press(getByText('View History'));
        expect(getByTestId('stock-history-list')).toBeTruthy();
      });
    });

    it('20. should export stock data', async () => {
      const { getByText } = renderWithProviders(<StockManagementScreen />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Export'));
        expect(getByText('Export as CSV')).toBeTruthy();
        expect(getByText('Export as Excel')).toBeTruthy();
      });
    });
  });
});