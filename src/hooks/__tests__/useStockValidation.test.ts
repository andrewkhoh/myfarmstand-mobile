import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { createWrapper } from '../../test/test-utils';
import { useStockValidation } from '../useStockValidation';
import { useCurrentUser } from '../useAuth';

jest.mock('../useAuth');
const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

jest.mock('../../utils/broadcastFactory', () => ({
  createBroadcastHelper: () => ({
    send: jest.fn(),
  }),
}));

// Mock the stock validation service
const mockValidateStock = jest.fn();
const mockGetStockLevel = jest.fn();

jest.mock('../../services/stockValidationService', () => ({
  StockValidationService: {
    validateStock: mockValidateStock,
    getStockLevel: mockGetStockLevel,
  },
}));


const mockUser = { id: 'user123', email: 'test@example.com', name: 'Test User', role: 'customer' as const };

describe('useStockValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    } as any);
  });

  it('should provide stock validation functionality', () => {
    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.validateStock).toBeDefined();
    expect(result.current.validateStockAsync).toBeDefined();
    expect(typeof result.current.isValidating).toBe('boolean');
  });

  it('should validate stock successfully', async () => {
    const mockResult = { isValid: true, availableQuantity: 10 };
    mockValidateStock.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    const validationData = { productId: 'prod123', requestedQuantity: 5 };
    result.current.validateStock(validationData);

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(mockValidateStock).toHaveBeenCalledWith(validationData);
  });

  it('should handle validation failure', async () => {
    mockValidateStock.mockRejectedValue(new Error('Validation failed'));

    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    const validationData = { productId: 'prod123', requestedQuantity: 5 };
    result.current.validateStock(validationData);

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should provide async validation operation', async () => {
    const mockResult = { isValid: true, availableQuantity: 10 };
    mockValidateStock.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    const validationData = { productId: 'prod123', requestedQuantity: 5 };
    const response = await result.current.validateStockAsync(validationData);

    expect(response.success).toBe(true);
    expect(mockValidateStock).toHaveBeenCalledWith(validationData);
  });

  it('should handle insufficient stock', async () => {
    const mockResult = { isValid: false, availableQuantity: 2 };
    mockValidateStock.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useStockValidation(), {
      wrapper: createWrapper(),
    });

    const validationData = { productId: 'prod123', requestedQuantity: 5 };
    result.current.validateStock(validationData);

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(mockValidateStock).toHaveBeenCalledWith(validationData);
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should block operations when not authenticated', () => {
      const { result } = renderHook(() => useStockValidation(), {
        wrapper: createWrapper(),
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      result.current.validateStock({ productId: 'prod123', requestedQuantity: 5 });

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Stock validation operation blocked: User not authenticated');

      consoleSpy.mockRestore();
    });

    it('should return error for async operations when not authenticated', async () => {
      const { result } = renderHook(() => useStockValidation(), {
        wrapper: createWrapper(),
      });

      const response = await result.current.validateStockAsync({ productId: 'prod123', requestedQuantity: 5 });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });
});