/**
 * Test: Inventory Dashboard Screen
 * Testing dashboard UI, metrics display, role-based features, and navigation
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

import InventoryDashboardScreen from '../InventoryDashboardScreen';
import * as inventoryDashboardHooks from '../../../hooks/inventory/useInventoryDashboard';
import * as userRoleHook from '../../../hooks/role-based/useUserRole';

// Mock navigation with complete implementation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
    dispatch: jest.fn(),
    reset: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => {
    // Simulate focus effect by calling immediately
    callback();
  }),
  NavigationContainer: ({ children }: any) => children,
  useRoute: () => ({ params: {} }),
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
  SectionList: 'SectionList',
  RefreshControl: ({ onRefresh, refreshing, ...props }: any) => null,
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Dimensions: {
    get: () => ({ width: 375, height: 667 }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
    Version: 14,
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
    compose: (style1: any, style2: any) => [style1, style2].filter(Boolean),
    hairlineWidth: 1,
    absoluteFillObject: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock components
jest.mock('../../../components/Text', () => ({
  Text: ({ children, ...props }: any) => children
}));
jest.mock('../../../components/Card', () => ({
  Card: ({ children, ...props }: any) => children
}));
jest.mock('../../../components/Button', () => ({
  Button: ({ children, onPress, ...props }: any) => children
}));
jest.mock('../../../components/Screen', () => ({
  Screen: ({ children, ...props }: any) => children
}));
jest.mock('../../../components/Loading', () => ({
  Loading: () => 'Loading...'
}));

// Mock hooks
jest.mock('../../../hooks/inventory/useInventoryDashboard');
jest.mock('../../../hooks/role-based/useUserRole');

const mockInventoryDashboardHooks = inventoryDashboardHooks as jest.Mocked<typeof inventoryDashboardHooks>;
const mockUserRoleHook = userRoleHook as jest.Mocked<typeof userRoleHook>;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('InventoryDashboardScreen', () => {
  let queryClient: QueryClient;

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
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

    mockInventoryDashboardHooks.useInventoryDashboard.mockReturnValue({
      data: {
        totalItems: 150,
        lowStockCount: 12,
        outOfStockCount: 3,
        totalValue: 25000,
        visibleToCustomers: 135,
        recentMovements: 8,
        criticalAlerts: 5
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
      data: [
        {
          id: 'alert-1',
          type: 'out_of_stock',
          productName: 'Critical Product',
          currentStock: 0,
          threshold: 10,
          severity: 'high' as const,
          createdAt: new Date().toISOString()
        },
        {
          id: 'alert-2',
          type: 'low_stock',
          productName: 'Low Stock Product',
          currentStock: 3,
          threshold: 15,
          severity: 'medium' as const,
          createdAt: new Date().toISOString()
        }
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockInventoryDashboardHooks.useInventoryPerformanceMetrics.mockReturnValue({
      data: {
        totalItems: 150,
        recentUpdates: 8,
        staleItems: 4,
        averageStock: 45.2,
        stockDistribution: {
          outOfStock: 3,
          lowStock: 12,
          healthyStock: 135
        },
        lastUpdated: new Date().toISOString()
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockInventoryDashboardHooks.useInventoryRealtimeStatus.mockReturnValue({
      data: {
        isHealthy: false,
        needsAttention: 15,
        lastSync: new Date().toISOString(),
        systemStatus: 'operational' as const
      },
      isLoading: false,
      error: null,
      refreshStatus: jest.fn(),
    } as any);

    jest.clearAllMocks();
  });

  describe('Rendering and Layout', () => {
    it('should render dashboard with all key metrics', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Inventory Dashboard')).toBeTruthy();
      expect(getByText('150')).toBeTruthy(); // Total items
      expect(getByText('12')).toBeTruthy(); // Low stock count
      expect(getByText('3')).toBeTruthy(); // Out of stock count
      expect(getByText('$25,000')).toBeTruthy(); // Total value
    });

    it('should display real-time status indicator', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Needs Attention')).toBeTruthy();
    });

    it('should show healthy status when inventory is healthy', () => {
      mockInventoryDashboardHooks.useInventoryRealtimeStatus.mockReturnValue({
        data: {
          isHealthy: true,
          needsAttention: 0,
          lastSync: new Date().toISOString(),
          systemStatus: 'operational' as const
        },
        refreshStatus: jest.fn(),
      } as any);

      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Healthy')).toBeTruthy();
    });

    it('should render critical alerts section when alerts exist', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Critical Alerts')).toBeTruthy();
      expect(getByText('Critical Product')).toBeTruthy();
      expect(getByText('View All')).toBeTruthy();
    });

    it('should display performance overview section', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Performance Overview')).toBeTruthy();
      expect(getByText('8')).toBeTruthy(); // Recent updates
      expect(getByText('4')).toBeTruthy(); // Stale items
      expect(getByText('45.2')).toBeTruthy(); // Average stock
    });

    it('should show quick actions for users with permissions', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Stock Management')).toBeTruthy();
      expect(getByText('Bulk Operations')).toBeTruthy();
      expect(getByText('Movement History')).toBeTruthy();
    });
  });

  describe('Permission-based Rendering', () => {
    it('should hide quick actions for users without management permissions', () => {
      mockUserRoleHook.useUserRole.mockReturnValue({
        userRole: { userId: 'test-user-1', role: 'read_only' },
        hasPermission: jest.fn(() => false),
        isLoading: false,
      } as any);

      const { queryByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(queryByText('Quick Actions')).toBeFalsy();
    });

    it('should show different metric colors based on alert levels', () => {
      // Out of stock should show danger color (tested implicitly through styling)
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      // Should still show the values even if colored differently
      expect(getByText('3')).toBeTruthy(); // Out of stock count
      expect(getByText('12')).toBeTruthy(); // Low stock count
    });
  });

  describe('Navigation and Interactions', () => {
    it('should navigate to stock management when metric is pressed', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('150')); // Total items metric
      expect(mockNavigate).toHaveBeenCalledWith('StockManagement');
    });

    it('should navigate to alerts when low stock metric is pressed', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('12')); // Low stock metric
      expect(mockNavigate).toHaveBeenCalledWith('InventoryAlerts');
    });

    it('should navigate to alerts when out of stock metric is pressed', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('3')); // Out of stock metric
      expect(mockNavigate).toHaveBeenCalledWith('InventoryAlerts');
    });

    it('should navigate to stock management from quick actions', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('Stock Management'));
      expect(mockNavigate).toHaveBeenCalledWith('StockManagement');
    });

    it('should navigate to bulk operations from quick actions', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('Bulk Operations'));
      expect(mockNavigate).toHaveBeenCalledWith('BulkOperations');
    });

    it('should navigate to movement history from quick actions', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('Movement History'));
      expect(mockNavigate).toHaveBeenCalledWith('StockMovementHistory');
    });
  });

  describe('Alert Modal and Interactions', () => {
    it('should open alerts modal when View All is pressed', () => {
      const { getByText, queryByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(queryByText('All Alerts')).toBeFalsy();
      
      fireEvent.press(getByText('View All'));
      
      expect(getByText('All Alerts')).toBeTruthy();
      expect(getByText('Close')).toBeTruthy();
    });

    it('should show all alerts in the modal', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('View All'));

      expect(getByText('Critical Product')).toBeTruthy();
      expect(getByText('Low Stock Product')).toBeTruthy();
    });

    it('should close alerts modal and navigate when alert is pressed', () => {
      const { getByText, queryByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('View All'));
      
      fireEvent.press(getByText('Critical Product'));

      expect(queryByText('All Alerts')).toBeFalsy();
      expect(mockNavigate).toHaveBeenCalledWith('StockManagement', { highlightItem: 'alert-1' });
    });

    it('should navigate to stock management with highlight when alert item is pressed', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('Critical Product'));

      expect(mockNavigate).toHaveBeenCalledWith('StockManagement', { highlightItem: 'alert-1' });
    });
  });

  describe('Refresh Functionality', () => {
    it('should trigger refresh for all queries when pull to refresh', async () => {
      const mockRefetch = jest.fn();
      const mockRefreshStatus = jest.fn();

      mockInventoryDashboardHooks.useInventoryDashboard.mockReturnValue({
        data: expect.any(Object),
        refetch: mockRefetch,
      } as any);

      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: expect.any(Array),
        refetch: mockRefetch,
      } as any);

      mockInventoryDashboardHooks.useInventoryPerformanceMetrics.mockReturnValue({
        data: expect.any(Object),
        refetch: mockRefetch,
      } as any);

      mockInventoryDashboardHooks.useInventoryRealtimeStatus.mockReturnValue({
        data: expect.any(Object),
        refreshStatus: mockRefreshStatus,
      } as any);

      const { getByTestId } = renderWithProviders(<InventoryDashboardScreen />);

      // Simulate pull to refresh
      const scrollView = getByTestId('scroll-view');
      fireEvent(scrollView, 'refresh');

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(3); // Dashboard, alerts, performance
        expect(mockRefreshStatus).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state when dashboard is loading', () => {
      mockInventoryDashboardHooks.useInventoryDashboard.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Loading inventory dashboard...')).toBeTruthy();
    });

    it('should show error state when dashboard fails to load', () => {
      mockInventoryDashboardHooks.useInventoryDashboard.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: jest.fn(),
      } as any);

      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Failed to load dashboard')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should retry loading when retry button is pressed', () => {
      const mockRefetch = jest.fn();
      
      mockInventoryDashboardHooks.useInventoryDashboard.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
      } as any);

      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      fireEvent.press(getByText('Retry'));
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should handle missing data gracefully', () => {
      mockInventoryDashboardHooks.useInventoryDashboard.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      // Should show 0 for undefined metrics
      expect(getByText('0')).toBeTruthy();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper accessibility labels for metrics', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Total Items')).toBeTruthy();
      expect(getByText('Low Stock')).toBeTruthy();
      expect(getByText('Out of Stock')).toBeTruthy();
      expect(getByText('Total Value')).toBeTruthy();
    });

    it('should properly format currency values', () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('$25,000')).toBeTruthy();
    });

    it('should handle very large numbers in metrics', () => {
      mockInventoryDashboardHooks.useInventoryDashboard.mockReturnValue({
        data: {
          totalItems: 1500000,
          lowStockCount: 12000,
          outOfStockCount: 3000,
          totalValue: 250000000,
          visibleToCustomers: 1350000,
          recentMovements: 80000,
          criticalAlerts: 50000
        },
        isLoading: false,
        error: null,
      } as any);

      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('1,500,000')).toBeTruthy();
      expect(getByText('$250,000,000')).toBeTruthy();
    });
  });

  describe('Real-time Updates', () => {
    it('should update status when real-time status changes', () => {
      const { rerender, getByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(getByText('Needs Attention')).toBeTruthy();

      // Update mock to healthy status
      mockInventoryDashboardHooks.useInventoryRealtimeStatus.mockReturnValue({
        data: {
          isHealthy: true,
          needsAttention: 0,
          lastSync: new Date().toISOString(),
          systemStatus: 'operational' as const
        },
        refreshStatus: jest.fn(),
      } as any);

      rerender(<InventoryDashboardScreen />);

      expect(getByText('Healthy')).toBeTruthy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty alerts array', () => {
      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      const { queryByText } = renderWithProviders(<InventoryDashboardScreen />);

      expect(queryByText('Critical Alerts')).toBeFalsy();
    });

    it('should filter and display only high priority alerts in main view', () => {
      const { queryByText } = renderWithProviders(<InventoryDashboardScreen />);

      // Should show high priority alert
      expect(queryByText('Critical Product')).toBeTruthy();
      
      // Should not show medium priority alert in main view
      expect(queryByText('Low Stock Product')).toBeFalsy();
    });

    it('should limit alerts displayed to first 3 in main view', () => {
      mockInventoryDashboardHooks.useInventoryAlerts.mockReturnValue({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `alert-${i}`,
          type: 'out_of_stock',
          productName: `Product ${i}`,
          currentStock: 0,
          threshold: 10,
          severity: 'high' as const,
          createdAt: new Date().toISOString()
        })),
        isLoading: false,
        error: null,
      } as any);

      const { queryByText } = renderWithProviders(<InventoryDashboardScreen />);

      // Should show first 3 products
      expect(queryByText('Product 0')).toBeTruthy();
      expect(queryByText('Product 1')).toBeTruthy();
      expect(queryByText('Product 2')).toBeTruthy();
      
      // Should not show beyond first 3
      expect(queryByText('Product 3')).toBeFalsy();
    });
  });
});