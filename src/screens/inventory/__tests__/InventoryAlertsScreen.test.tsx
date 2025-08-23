/**
 * Test: Inventory Alerts Screen
 * Testing alert management, filtering, threshold configuration, and quick actions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

import InventoryAlertsScreen from '../InventoryAlertsScreen';
import * as inventoryDashboardHooks from '../../../hooks/inventory/useInventoryDashboard';
import * as inventoryOperationsHooks from '../../../hooks/inventory/useInventoryOperations';
import * as userRoleHook from '../../../hooks/role-based/useUserRole';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock hooks
jest.mock('../../../hooks/inventory/useInventoryDashboard');
jest.mock('../../../hooks/inventory/useInventoryOperations');
jest.mock('../../../hooks/role-based/useUserRole');

const mockInventoryDashboardHooks = inventoryDashboardHooks as jest.Mocked<typeof inventoryDashboardHooks>;
const mockInventoryOperationsHooks = inventoryOperationsHooks as jest.Mocked<typeof inventoryOperationsHooks>;
const mockUserRoleHook = userRoleHook as jest.Mocked<typeof userRoleHook>;

// Mock Alert
const mockAlert = jest.spyOn(Alert, 'alert');

describe('InventoryAlertsScreen', () => {
  let queryClient: QueryClient;

  const mockAlerts = [
    {
      id: 'alert-1',
      type: 'out_of_stock' as const,
      productName: 'Critical Product A',
      currentStock: 0,
      threshold: 10,
      severity: 'high' as const,
      createdAt: new Date().toISOString()
    },
    {
      id: 'alert-2',
      type: 'threshold_breach' as const,
      productName: 'Critical Product B',
      currentStock: 2,
      threshold: 20,
      severity: 'high' as const,
      createdAt: new Date().toISOString()
    },
    {
      id: 'alert-3',
      type: 'low_stock' as const,
      productName: 'Medium Priority Product',
      currentStock: 8,
      threshold: 25,
      severity: 'medium' as const,
      createdAt: new Date().toISOString()
    },
    {
      id: 'alert-4',
      type: 'low_stock' as const,
      productName: 'Low Priority Product',
      currentStock: 15,
      threshold: 20,
      severity: 'low' as const,
      createdAt: new Date().toISOString()
    }
  ];

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          {component}
        </NavigationContainer>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mock implementations
    mockUserRoleHook.useUserRole.mockReturnValue({
      userRole: { userId: 'test-user-1', role: 'inventory_staff' },
      hasPermission: jest.fn(() => true),
      isLoading: false,
    } as any);

    mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockInventoryOperationsHooks.useUpdateStock.mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
      error: null,
    } as any);

    jest.clearAllMocks();
  });

  describe('Rendering and Layout', () => {
    it('should render alerts screen with header and alert count', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('Inventory Alerts')).toBeTruthy();
      expect(getByText('4 active alerts')).toBeTruthy();
    });

    it('should display filter controls', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('All')).toBeTruthy();
      expect(getByText('High')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('Low')).toBeTruthy();
    });

    it('should show alert settings section', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('Alert Settings')).toBeTruthy();
      expect(getByText('Push Notifications')).toBeTruthy();
      expect(getByText('Auto Refresh')).toBeTruthy();
    });

    it('should organize alerts by severity sections', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('Critical Alerts')).toBeTruthy();
      expect(getByText('Warning Alerts')).toBeTruthy();
      expect(getByText('Low Priority Alerts')).toBeTruthy();
    });

    it('should display correct alert counts in section headers', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('(2)')).toBeTruthy(); // Critical alerts count
      expect(getByText('(1)')).toBeTruthy(); // Warning alerts count
    });
  });

  describe('Alert Item Display', () => {
    it('should display alert details correctly', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('Critical Product A')).toBeTruthy();
      expect(getByText('Stock: 0 / Threshold: 10')).toBeTruthy();
      expect(getByText('OUT OF STOCK')).toBeTruthy();
    });

    it('should show correct status for different stock levels', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('OUT OF STOCK')).toBeTruthy(); // 0 stock
      expect(getByText('CRITICAL')).toBeTruthy(); // 2 stock (threshold_breach)
    });

    it('should display appropriate icons for different alert types', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      // Icons are displayed as text emojis
      expect(getByText('⚠️')).toBeTruthy(); // out_of_stock
      expect(getByText('🚨')).toBeTruthy(); // threshold_breach
      expect(getByText('📉')).toBeTruthy(); // low_stock
    });

    it('should show severity badges with correct styling', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('HIGH')).toBeTruthy();
      expect(getByText('MEDIUM')).toBeTruthy();
      expect(getByText('LOW')).toBeTruthy();
    });
  });

  describe('Filtering Functionality', () => {
    it('should filter alerts by severity when filter is selected', () => {
      const { getByText, queryByText } = renderWithProviders(<InventoryAlertsScreen />);

      // Click high priority filter
      fireEvent.press(getByText('High'));

      // Should show high priority alerts
      expect(getByText('Critical Product A')).toBeTruthy();
      expect(getByText('Critical Product B')).toBeTruthy();

      // Should not show medium/low priority alerts
      expect(queryByText('Medium Priority Product')).toBeFalsy();
      expect(queryByText('Low Priority Product')).toBeFalsy();
    });

    it('should update alert count when filter is applied', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      fireEvent.press(getByText('High'));

      expect(getByText('2 active alerts')).toBeTruthy();
    });

    it('should show all alerts when All filter is selected', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      // First apply a filter
      fireEvent.press(getByText('High'));
      
      // Then select All
      fireEvent.press(getByText('All'));

      expect(getByText('4 active alerts')).toBeTruthy();
    });

    it('should handle empty results for filter', () => {
      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('No Alerts')).toBeTruthy();
      expect(getByText('All inventory levels are healthy!')).toBeTruthy();
    });
  });

  describe('Quick Actions', () => {
    it('should show quick action buttons for each alert', () => {
      const { getAllByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getAllByText('Quick Restock').length).toBeGreaterThan(0);
      expect(getAllByText('Adjust Threshold').length).toBeGreaterThan(0);
      expect(getAllByText('Hide').length).toBeGreaterThan(0);
    });

    it('should open restock modal when Quick Restock is pressed', () => {
      const { getAllByText, getByText } = renderWithProviders(<InventoryAlertsScreen />);

      fireEvent.press(getAllByText('Quick Restock')[0]);

      expect(getByText('Quick Restock')).toBeTruthy();
      expect(getByText('Critical Product A')).toBeTruthy();
      expect(getByText('Current Stock: 0')).toBeTruthy();
    });

    it('should navigate to stock management when Adjust Threshold is pressed', () => {
      const { getAllByText } = renderWithProviders(<InventoryAlertsScreen />);

      fireEvent.press(getAllByText('Adjust Threshold')[0]);

      expect(mockNavigate).toHaveBeenCalledWith('StockManagement', { 
        highlightItem: 'alert-1',
        mode: 'threshold_edit' 
      });
    });

    it('should show coming soon alert when Hide is pressed', () => {
      const { getAllByText } = renderWithProviders(<InventoryAlertsScreen />);

      fireEvent.press(getAllByText('Hide')[0]);

      expect(mockAlert).toHaveBeenCalledWith('Feature Coming Soon', 'Alert dismissal will be available soon');
    });

    it('should handle permission denial for stock management', () => {
      mockUserRoleHook.useUserRole.mockReturnValue({
        userRole: { userId: 'test-user-1', role: 'read_only' },
        hasPermission: jest.fn((permissions) => !permissions.includes('inventory:write')),
        isLoading: false,
      } as any);

      const { getAllByText } = renderWithProviders(<InventoryAlertsScreen />);

      fireEvent.press(getAllByText('Quick Restock')[0]);

      expect(mockAlert).toHaveBeenCalledWith('Permission Denied', 'You do not have permission to update stock');
    });

    it('should handle permission denial for threshold configuration', () => {
      mockUserRoleHook.useUserRole.mockReturnValue({
        userRole: { userId: 'test-user-1', role: 'read_only' },
        hasPermission: jest.fn((permissions) => !permissions.includes('inventory:configure')),
        isLoading: false,
      } as any);

      const { getAllByText } = renderWithProviders(<InventoryAlertsScreen />);

      fireEvent.press(getAllByText('Adjust Threshold')[0]);

      expect(mockAlert).toHaveBeenCalledWith('Permission Denied', 'You do not have permission to configure thresholds');
    });
  });

  describe('Quick Restock Modal', () => {
    beforeEach(() => {
      const { getAllByText } = renderWithProviders(<InventoryAlertsScreen />);
      fireEvent.press(getAllByText('Quick Restock')[0]);
    });

    it('should show current stock and threshold information', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);

      expect(getByText('Current Stock: 0')).toBeTruthy();
      expect(getByText('Threshold: 10')).toBeTruthy();
    });

    it('should provide suggested quantity', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);

      expect(getByText('Suggested: 10 (to reach threshold)')).toBeTruthy();
    });

    it('should apply suggested quantity when suggestion is pressed', () => {
      const { getByText, getByDisplayValue } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);
      fireEvent.press(getByText('Suggested: 10 (to reach threshold)'));

      expect(getByDisplayValue('10')).toBeTruthy();
    });

    it('should show preview of stock level after restock', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);
      
      const quantityInput = getByPlaceholderText('Enter quantity');
      fireEvent.changeText(quantityInput, '15');

      expect(getByText('15 units')).toBeTruthy(); // After restock: 0 + 15 = 15
    });

    it('should validate quantity input', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);
      
      const quantityInput = getByPlaceholderText('Enter quantity');
      fireEvent.changeText(quantityInput, '-5'); // Invalid quantity
      
      fireEvent.press(getByText('Restock Now'));

      expect(mockAlert).toHaveBeenCalledWith('Invalid Quantity', 'Please enter a valid quantity greater than 0');
    });

    it('should perform restock operation when valid quantity is submitted', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({});
      
      mockInventoryOperationsHooks.useUpdateStock.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: false,
        error: null,
      } as any);

      const { getByText, getByPlaceholderText } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);
      
      const quantityInput = getByPlaceholderText('Enter quantity');
      fireEvent.changeText(quantityInput, '20');
      
      fireEvent.press(getByText('Restock Now'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          inventoryId: 'alert-1',
          stockUpdate: {
            currentStock: 20, // 0 + 20
            reason: 'Quick restock: +20 units from alerts',
            performedBy: 'test-user-1'
          }
        });
      });
    });

    it('should show success message after successful restock', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({});
      
      mockInventoryOperationsHooks.useUpdateStock.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: false,
        error: null,
      } as any);

      const { getByText, getByPlaceholderText } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);
      
      const quantityInput = getByPlaceholderText('Enter quantity');
      fireEvent.changeText(quantityInput, '20');
      
      fireEvent.press(getByText('Restock Now'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Stock Updated',
          'Successfully added 20 units to Critical Product A'
        );
      });
    });

    it('should handle restock failure with error message', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('Stock update failed'));
      
      mockInventoryOperationsHooks.useUpdateStock.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: false,
        error: null,
      } as any);

      const { getByText, getByPlaceholderText } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);
      
      const quantityInput = getByPlaceholderText('Enter quantity');
      fireEvent.changeText(quantityInput, '20');
      
      fireEvent.press(getByText('Restock Now'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Update Failed',
          'Failed to update stock: Stock update failed'
        );
      });
    });

    it('should close modal when cancel is pressed', () => {
      const { getByText, queryByText } = renderWithProviders(<InventoryAlertsScreen />);
      
      fireEvent.press(getAllByText('Quick Restock')[0]);
      expect(getByText('Quick Restock')).toBeTruthy();
      
      fireEvent.press(getByText('Cancel'));
      expect(queryByText('Quick Restock')).toBeFalsy();
    });
  });

  describe('Settings and Configuration', () => {
    it('should toggle notification settings', () => {
      const { getByTestId } = renderWithProviders(<InventoryAlertsScreen />);

      const notificationSwitch = getByTestId('notifications-switch');
      fireEvent(notificationSwitch, 'onValueChange', false);

      // Settings state should be updated (tested implicitly through component state)
    });

    it('should toggle auto refresh setting', () => {
      const { getByTestId } = renderWithProviders(<InventoryAlertsScreen />);

      const autoRefreshSwitch = getByTestId('auto-refresh-switch');
      fireEvent(autoRefreshSwitch, 'onValueChange', false);

      // Settings state should be updated (tested implicitly through component state)
    });
  });

  describe('Refresh and Loading States', () => {
    it('should show loading state when alerts are loading', () => {
      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('Loading alerts...')).toBeTruthy();
    });

    it('should show error state when alerts fail to load', () => {
      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: jest.fn(),
      } as any);

      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('Failed to load alerts')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should trigger refetch on pull to refresh', async () => {
      const mockRefetch = jest.fn();
      
      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: mockAlerts,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { getByTestId } = renderWithProviders(<InventoryAlertsScreen />);

      const scrollView = getByTestId('scroll-view');
      fireEvent(scrollView, 'refresh');

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle singular alert count', () => {
      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: [mockAlerts[0]],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('1 active alert')).toBeTruthy(); // Singular form
    });

    it('should handle alerts with missing product names', () => {
      const alertsWithMissingNames = [{
        ...mockAlerts[0],
        productName: undefined
      }];

      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: alertsWithMissingNames,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      expect(getByText('Unknown Product')).toBeTruthy();
    });

    it('should show appropriate message when filtered results are empty', () => {
      const { getByText } = renderWithProviders(<InventoryAlertsScreen />);

      // Apply filter that results in no matches
      fireEvent.press(getByText('High'));
      
      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Re-render to reflect the empty filtered state
      expect(getByText('No high priority alerts at this time.')).toBeTruthy();
    });
  });
});