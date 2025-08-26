/**
 * Test Suite: Stock History View Component
 * TDD Approach - 10 comprehensive tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import StockHistoryView from '../components/StockHistoryView';

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Modal: ({ children, visible, ...props }: any) => visible ? children : null,
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

// Mock data
const mockHistoryData = [
  {
    id: '1',
    productId: 'prod-1',
    productName: 'Tomatoes',
    type: 'adjustment',
    quantity: 20,
    previousQuantity: 15,
    newQuantity: 35,
    reason: 'Restock',
    user: 'John Doe',
    timestamp: new Date('2024-01-15T10:00:00').toISOString(),
    notes: 'Weekly restock from supplier',
  },
  {
    id: '2',
    productId: 'prod-1',
    productName: 'Tomatoes',
    type: 'sale',
    quantity: -5,
    previousQuantity: 35,
    newQuantity: 30,
    reason: 'Customer purchase',
    user: 'System',
    timestamp: new Date('2024-01-15T14:30:00').toISOString(),
    orderId: 'ORD-123',
  },
  {
    id: '3',
    productId: 'prod-1',
    productName: 'Tomatoes',
    type: 'transfer',
    quantity: -10,
    previousQuantity: 30,
    newQuantity: 20,
    reason: 'Location transfer',
    user: 'Jane Smith',
    timestamp: new Date('2024-01-16T09:00:00').toISOString(),
    fromLocation: 'Warehouse A',
    toLocation: 'Store Front',
  },
  {
    id: '4',
    productId: 'prod-1',
    productName: 'Tomatoes',
    type: 'waste',
    quantity: -3,
    previousQuantity: 20,
    newQuantity: 17,
    reason: 'Expired',
    user: 'Mike Johnson',
    timestamp: new Date('2024-01-17T16:00:00').toISOString(),
    notes: 'Disposed due to expiration',
  },
];

// Mock hooks
jest.mock('../../../hooks/inventory/useStockHistory', () => ({
  useStockHistory: jest.fn(() => ({
    data: mockHistoryData,
    isLoading: false,
    error: null,
    hasMore: true,
    loadMore: jest.fn(),
  })),
}));

describe('StockHistoryView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (props = {}) => {
    const defaultProps = {
      productId: 'prod-1',
      productName: 'Tomatoes',
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <StockHistoryView {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('History Display', () => {
    it('1. should display transaction timeline with all entries', async () => {
      const { getByText } = renderWithProviders();
      
      await waitFor(() => {
        expect(getByText('Stock History - Tomatoes')).toBeTruthy();
        expect(getByText('Restock')).toBeTruthy();
        expect(getByText('Customer purchase')).toBeTruthy();
        expect(getByText('Location transfer')).toBeTruthy();
        expect(getByText('Expired')).toBeTruthy();
      });
    });

    it('2. should show quantity changes with positive/negative indicators', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        expect(getByText('+20')).toBeTruthy(); // Restock
        expect(getByText('-5')).toBeTruthy();  // Sale
        expect(getByText('-10')).toBeTruthy(); // Transfer
        expect(getByTestId('quantity-positive-1')).toBeTruthy();
        expect(getByTestId('quantity-negative-2')).toBeTruthy();
      });
    });

    it('3. should display user who performed each action', async () => {
      const { getByText } = renderWithProviders();
      
      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('System')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
        expect(getByText('Mike Johnson')).toBeTruthy();
      });
    });

    it('4. should show timestamps in readable format', async () => {
      const { getByText } = renderWithProviders();
      
      await waitFor(() => {
        expect(getByText(/Jan 15, 2024/)).toBeTruthy();
        expect(getByText(/10:00 AM/)).toBeTruthy();
        expect(getByText(/2:30 PM/)).toBeTruthy();
      });
    });
  });

  describe('Filtering and Sorting', () => {
    it('5. should filter by transaction type', async () => {
      const { getByText, queryByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        const filterButton = getByTestId('filter-button');
        fireEvent.press(filterButton);
        fireEvent.press(getByText('Adjustments Only'));
        
        expect(getByText('Restock')).toBeTruthy();
        expect(queryByText('Customer purchase')).toBeNull();
        expect(queryByText('Location transfer')).toBeNull();
      });
    });

    it('6. should filter by date range', async () => {
      const { getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        const dateFilter = getByTestId('date-range-filter');
        fireEvent.press(dateFilter);
        
        expect(getByTestId('start-date-picker')).toBeTruthy();
        expect(getByTestId('end-date-picker')).toBeTruthy();
      });
    });

    it('7. should sort by date ascending/descending', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        const sortButton = getByTestId('sort-button');
        fireEvent.press(sortButton);
        fireEvent.press(getByText('Oldest First'));
        
        const firstItem = getByTestId('history-item-0');
        expect(firstItem).toHaveTextContent('Jan 15');
      });
    });
  });

  describe('Transaction Details', () => {
    it('8. should expand to show full transaction details', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        const firstTransaction = getByTestId('history-item-1');
        fireEvent.press(firstTransaction);
        
        expect(getByText('Transaction Details')).toBeTruthy();
        expect(getByText('Previous Stock: 15')).toBeTruthy();
        expect(getByText('New Stock: 35')).toBeTruthy();
        expect(getByText('Notes: Weekly restock from supplier')).toBeTruthy();
      });
    });

    it('9. should show transfer locations when applicable', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        const transferTransaction = getByTestId('history-item-3');
        fireEvent.press(transferTransaction);
        
        expect(getByText('From: Warehouse A')).toBeTruthy();
        expect(getByText('To: Store Front')).toBeTruthy();
      });
    });
  });

  describe('Export and Load More', () => {
    it('10. should provide export options for history data', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        const exportButton = getByTestId('export-history-button');
        fireEvent.press(exportButton);
        
        expect(getByText('Export as CSV')).toBeTruthy();
        expect(getByText('Export as PDF')).toBeTruthy();
        expect(getByText('Email Report')).toBeTruthy();
      });
    });
  });
});