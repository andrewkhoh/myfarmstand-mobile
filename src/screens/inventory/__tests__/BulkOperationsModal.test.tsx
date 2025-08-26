/**
 * Test Suite: Bulk Operations Modal
 * TDD Approach - 15 comprehensive tests  
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

import BulkOperationsModal from '../components/BulkOperationsModal';

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  Modal: ({ children, visible, ...props }: any) => visible ? children : null,
  ActivityIndicator: 'ActivityIndicator',
  ScrollView: 'ScrollView',
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
jest.mock('../../../components/Button', () => ({
  Button: ({ children, onPress }: any) => {
    const React = require('react');
    return React.createElement('TouchableOpacity', { onPress }, children);
  },
}));
jest.mock('../../../components/Input', () => ({
  Input: ({ ...props }: any) => {
    const React = require('react');
    return React.createElement('TextInput', props);
  },
}));

// Mock data
const mockSelectedProducts = [
  { id: '1', name: 'Tomatoes', currentStock: 20, price: 3.50 },
  { id: '2', name: 'Lettuce', currentStock: 50, price: 2.00 },
  { id: '3', name: 'Carrots', currentStock: 30, price: 1.50 },
];

// Mock hooks
jest.mock('../../../hooks/inventory/useStockOperations', () => ({
  useBulkOperations: jest.fn(() => ({
    executeBulkUpdate: jest.fn().mockResolvedValue({ success: true }),
    validateBulkOperation: jest.fn().mockReturnValue({ isValid: true }),
    isProcessing: false,
  })),
}));

jest.spyOn(Alert, 'alert');

describe('BulkOperationsModal', () => {
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

  const renderWithProviders = (props = {}) => {
    const defaultProps = {
      visible: true,
      selectedProducts: mockSelectedProducts,
      onClose: jest.fn(),
      onComplete: jest.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <BulkOperationsModal {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Modal Display', () => {
    it('1. should display modal with selected products count', async () => {
      const { getByText } = renderWithProviders();
      
      await waitFor(() => {
        expect(getByText('Bulk Operations')).toBeTruthy();
        expect(getByText('3 products selected')).toBeTruthy();
      });
    });

    it('2. should list all selected products', async () => {
      const { getByText } = renderWithProviders();
      
      await waitFor(() => {
        expect(getByText('Tomatoes')).toBeTruthy();
        expect(getByText('Lettuce')).toBeTruthy();
        expect(getByText('Carrots')).toBeTruthy();
      });
    });

    it('3. should show operation type selector', async () => {
      const { getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        expect(getByTestId('operation-type-selector')).toBeTruthy();
        expect(getByTestId('operation-stock-adjustment')).toBeTruthy();
        expect(getByTestId('operation-price-update')).toBeTruthy();
        expect(getByTestId('operation-category-change')).toBeTruthy();
      });
    });
  });

  describe('Stock Adjustment Operations', () => {
    it('4. should allow percentage-based stock adjustment', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-stock-adjustment'));
        fireEvent.press(getByText('Percentage'));
        
        const input = getByTestId('adjustment-percentage-input');
        fireEvent.changeText(input, '10');
        
        expect(getByText('Preview: +10% to all selected')).toBeTruthy();
      });
    });

    it('5. should allow absolute stock adjustment', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-stock-adjustment'));
        fireEvent.press(getByText('Absolute'));
        
        const input = getByTestId('adjustment-absolute-input');
        fireEvent.changeText(input, '5');
        
        expect(getByText('Preview: +5 units to all selected')).toBeTruthy();
      });
    });

    it('6. should show preview of changes before applying', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-stock-adjustment'));
        fireEvent.changeText(getByTestId('adjustment-absolute-input'), '10');
        
        expect(getByText('Tomatoes: 20 → 30')).toBeTruthy();
        expect(getByText('Lettuce: 50 → 60')).toBeTruthy();
        expect(getByText('Carrots: 30 → 40')).toBeTruthy();
      });
    });
  });

  describe('Price Update Operations', () => {
    it('7. should allow percentage-based price change', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-price-update'));
        fireEvent.press(getByText('Percentage'));
        
        const input = getByTestId('price-percentage-input');
        fireEvent.changeText(input, '15');
        
        expect(getByText('Preview: +15% to all prices')).toBeTruthy();
      });
    });

    it('8. should allow setting fixed price for all', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-price-update'));
        fireEvent.press(getByText('Fixed Price'));
        
        const input = getByTestId('fixed-price-input');
        fireEvent.changeText(input, '2.99');
        
        expect(getByText('Set all to $2.99')).toBeTruthy();
      });
    });

    it('9. should validate price constraints', async () => {
      const { getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-price-update'));
        const input = getByTestId('fixed-price-input');
        fireEvent.changeText(input, '-5');
        fireEvent.press(getByTestId('apply-button'));
        
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Price',
          'Price must be greater than 0'
        );
      });
    });
  });

  describe('Category Operations', () => {
    it('10. should allow category change for selected products', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-category-change'));
        const picker = getByTestId('category-picker');
        
        expect(picker).toBeTruthy();
        expect(getByText('Vegetables')).toBeTruthy();
        expect(getByText('Fruits')).toBeTruthy();
      });
    });

    it('11. should allow adding tags to products', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-add-tags'));
        const input = getByTestId('tags-input');
        fireEvent.changeText(input, 'organic, local');
        
        expect(getByText('Add tags: organic, local')).toBeTruthy();
      });
    });
  });

  describe('Operation Execution', () => {
    it('12. should require confirmation before applying changes', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-stock-adjustment'));
        fireEvent.changeText(getByTestId('adjustment-absolute-input'), '10');
        fireEvent.press(getByText('Apply Changes'));
        
        expect(getByTestId('confirmation-modal')).toBeTruthy();
        expect(getByText('Confirm Bulk Update')).toBeTruthy();
      });
    });

    it('13. should show progress during bulk operation', async () => {
      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-stock-adjustment'));
        fireEvent.changeText(getByTestId('adjustment-absolute-input'), '10');
        fireEvent.press(getByText('Apply Changes'));
        fireEvent.press(getByText('Confirm'));
        
        expect(getByTestId('operation-progress')).toBeTruthy();
        expect(getByText('Processing 3 products...')).toBeTruthy();
      });
    });

    it('14. should handle operation errors gracefully', async () => {
      const executeBulkUpdate = jest.fn().mockRejectedValue(new Error('Network error'));
      require('../../../hooks/inventory/useStockOperations').useBulkOperations.mockReturnValueOnce({
        executeBulkUpdate,
        validateBulkOperation: jest.fn().mockReturnValue({ isValid: true }),
        isProcessing: false,
      });

      const { getByText, getByTestId } = renderWithProviders();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-stock-adjustment'));
        fireEvent.changeText(getByTestId('adjustment-absolute-input'), '10');
        fireEvent.press(getByText('Apply Changes'));
        fireEvent.press(getByText('Confirm'));
        
        expect(Alert.alert).toHaveBeenCalledWith(
          'Operation Failed',
          expect.stringContaining('Network error')
        );
      });
    });

    it('15. should call onComplete callback after successful operation', async () => {
      const onComplete = jest.fn();
      const { getByText, getByTestId } = renderWithProviders({ onComplete });
      
      await waitFor(() => {
        fireEvent.press(getByTestId('operation-stock-adjustment'));
        fireEvent.changeText(getByTestId('adjustment-absolute-input'), '10');
        fireEvent.press(getByText('Apply Changes'));
        fireEvent.press(getByText('Confirm'));
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          type: 'stock-adjustment',
          affectedCount: 3,
          changes: expect.any(Array),
        });
      });
    });
  });
});