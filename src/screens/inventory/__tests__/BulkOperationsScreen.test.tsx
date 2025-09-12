import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BulkOperationsScreen } from '../BulkOperationsScreen';

// Mock the hook
jest.mock('hooks/inventory/useBulkOperations');

describe('BulkOperationsScreen', () => {
  let queryClient: QueryClient;
  let mockMutate: jest.Mock;
  let mockGoBack: jest.Mock;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    
    mockMutate = jest.fn();
    mockGoBack = jest.fn();
    
    const { useBulkUpdateStock } = require('hooks/inventory/useBulkOperations');
    
    useBulkUpdateStock.mockReturnValue({
      mutate: mockMutate,
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  const renderScreen = (items = ['1', '2', '3']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BulkOperationsScreen
          route={{ params: { items } }}
          navigation={{ goBack: mockGoBack }}
        />
      </QueryClientProvider>
    );
  };
  
  it('should display selected items count', async () => {
    const { getByText } = renderScreen();
    
    await waitFor(() => {
      expect(getByText('3 items selected')).toBeTruthy();
    });
  });
  
  it('should toggle between operation types', async () => {
    const { getByTestId } = renderScreen();
    
    const adjustButton = getByTestId('operation-adjust');
    const setButton = getByTestId('operation-set');
    
    // Adjust should be selected by default
    expect(adjustButton.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#007bff' })
    );
    
    fireEvent.press(setButton);
    
    await waitFor(() => {
      expect(setButton.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: '#007bff' })
      );
    });
  });
  
  it('should handle value input', async () => {
    const { getByTestId } = renderScreen();
    
    const input = getByTestId('value-input');
    
    fireEvent.changeText(input, '50');
    
    expect(input.props.value).toBe('50');
  });
  
  it('should handle reason input', async () => {
    const { getByTestId } = renderScreen();
    
    const input = getByTestId('reason-input');
    
    fireEvent.changeText(input, 'Stock audit adjustment');
    
    expect(input.props.value).toBe('Stock audit adjustment');
  });
  
  it('should disable apply button when no value', async () => {
    const { getByTestId } = renderScreen();
    
    const applyButton = getByTestId('apply-button');
    
    expect(applyButton.props.disabled).toBe(true);
  });
  
  it('should enable apply button when value entered', async () => {
    const { getByTestId } = renderScreen();
    
    const input = getByTestId('value-input');
    const applyButton = getByTestId('apply-button');
    
    fireEvent.changeText(input, '25');
    
    await waitFor(() => {
      expect(applyButton.props.disabled).toBe(false);
    });
  });
  
  it('should apply bulk update', async () => {
    const { getByTestId } = renderScreen(['1', '2', '3']);
    
    const input = getByTestId('value-input');
    const applyButton = getByTestId('apply-button');
    
    fireEvent.changeText(input, '100');
    fireEvent.press(applyButton);
    
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
    
    expect(mockMutate).toHaveBeenCalledWith([
      { id: '1', newStock: 100, reason: 'Bulk operation' },
      { id: '2', newStock: 100, reason: 'Bulk operation' },
      { id: '3', newStock: 100, reason: 'Bulk operation' }
    ]);
    expect(mockGoBack).toHaveBeenCalled();
  });
  
  it('should handle cancel', async () => {
    const { getByTestId } = renderScreen();
    
    const cancelButton = getByTestId('cancel-button');
    
    fireEvent.press(cancelButton);
    
    expect(mockGoBack).toHaveBeenCalled();
  });
  
  it('should handle empty items array', async () => {
    const { getByText } = renderScreen([]);
    
    await waitFor(() => {
      expect(getByText('0 items selected')).toBeTruthy();
    });
  });
  
  it('should ignore non-numeric input', async () => {
    const { getByTestId } = renderScreen(['1']);
    
    const input = getByTestId('value-input');
    const applyButton = getByTestId('apply-button');
    
    fireEvent.changeText(input, 'abc');
    fireEvent.press(applyButton);
    
    await waitFor(() => {
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});