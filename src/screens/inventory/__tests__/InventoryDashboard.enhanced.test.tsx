/**
 * Enhanced Test Suite: Inventory Dashboard Screen
 * Following TDD approach - Write tests first, then implement
 * Target: 25 new tests covering all functionality
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Component under test
import InventoryDashboardScreen from '../InventoryDashboardScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
  useRoute: () => ({ params: {} }),
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
  RefreshControl: ({ onRefresh, refreshing, ...props }: any) => null,
  Dimensions: {
    get: () => ({ width: 375, height: 667 }),
    addEventListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
    compose: (style1: any, style2: any) => [style1, style2],
    hairlineWidth: 1,
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock stack navigation
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

// Mock all custom components to render their children properly
jest.mock('../../../components/Text', () => ({
  Text: ({ children, testID, ...props }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID, ...props }, children);
  },
}));

jest.mock('../../../components/Card', () => ({
  Card: ({ children, testID, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID, ...props }, children);
  },
}));

jest.mock('../../../components/Button', () => ({
  Button: ({ children, onPress, testID, ...props }: any) => {
    const React = require('react');
    return React.createElement(
      'TouchableOpacity',
      { onPress, testID, ...props },
      typeof children === 'string' 
        ? React.createElement('Text', {}, children)
        : children
    );
  },
}));

jest.mock('../../../components/Screen', () => ({
  Screen: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', props, children);
  },
}));

jest.mock('../../../components/Loading', () => ({
  Loading: () => {
    const React = require('react');
    return React.createElement('View', { testID: 'loading' }, 
      React.createElement('Text', {}, 'Loading...')
    );
  },
}));

// Mock inventory hooks with comprehensive data
const mockDashboardData = {
  metrics: {
    totalItems: 250,
    totalValue: 25000,
    lowStockCount: 15,
    outOfStockCount: 5,
    expiringCount: 8,
    categories: 12,
    suppliers: 8,
    pendingOrders: 3,
  },
  alerts: {
    critical: [
      { id: '1', type: 'out_of_stock', product: 'Tomatoes', severity: 'critical' },
      { id: '2', type: 'out_of_stock', product: 'Lettuce', severity: 'critical' },
    ],
    warning: [
      { id: '3', type: 'low_stock', product: 'Carrots', quantity: 5, threshold: 20 },
      { id: '4', type: 'expiring', product: 'Milk', daysUntilExpiry: 2 },
    ],
  },
  recentActivity: [
    { id: '1', type: 'restock', product: 'Apples', quantity: 50, timestamp: new Date().toISOString() },
    { id: '2', type: 'sale', product: 'Bananas', quantity: 20, timestamp: new Date().toISOString() },
  ],
  trends: {
    stockLevel: 'decreasing',
    salesVelocity: 'increasing',
    wastage: 'stable',
  },
};

const mockRealtimeStatus = {
  isHealthy: true,
  lastSync: new Date().toISOString(),
  pendingUpdates: 0,
  activeUsers: 3,
};

const mockPerformanceData = {
  turnoverRate: 4.2,
  fillRate: 0.95,
  stockAccuracy: 0.98,
  orderCycleTime: 2.5,
};

jest.mock('../../../hooks/inventory/useInventoryDashboard', () => ({
  useInventoryDashboard: jest.fn(() => ({
    data: mockDashboardData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useInventoryAlerts: jest.fn(() => ({
    data: mockDashboardData.alerts,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useInventoryPerformanceMetrics: jest.fn(() => ({
    data: mockPerformanceData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useInventoryRealtimeStatus: jest.fn(() => ({
    data: mockRealtimeStatus,
    isConnected: true,
    refreshStatus: jest.fn(),
  })),
}));

// Mock user role hook
jest.mock('../../../hooks/role-based/useUserRole', () => ({
  useUserRole: jest.fn(() => ({
    permissions: {
      canManageInventory: true,
      canViewReports: true,
      canExportData: true,
      canBulkEdit: true,
    },
    role: 'manager',
  })),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('InventoryDashboard Enhanced Tests', () => {
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

  describe('Core Dashboard Features', () => {
    it('1. should display dashboard title and real-time status indicator', async () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText('Inventory Dashboard')).toBeTruthy();
        expect(getByText('Healthy')).toBeTruthy();
      });
    });

    it('2. should show all key inventory metrics with correct values', async () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText('250')).toBeTruthy(); // Total items
        expect(getByText('$25,000')).toBeTruthy(); // Total value
        expect(getByText('15')).toBeTruthy(); // Low stock
        expect(getByText('5')).toBeTruthy(); // Out of stock
      });
    });

    it('3. should display metric cards with appropriate color coding', async () => {
      const { getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByTestId('metric-card-total')).toBeTruthy();
        expect(getByTestId('metric-card-low-stock')).toBeTruthy();
        expect(getByTestId('metric-card-out-of-stock')).toBeTruthy();
      });
    });

    it('4. should show critical alerts section with severity indicators', async () => {
      const { getByText, getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText('Critical Alerts')).toBeTruthy();
        expect(getByText('Tomatoes')).toBeTruthy();
        expect(getByText('Lettuce')).toBeTruthy();
        expect(getByTestId('alert-critical-1')).toBeTruthy();
      });
    });

    it('5. should display warning alerts separately from critical', async () => {
      const { getByText, getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText('Warnings')).toBeTruthy();
        expect(getByText('Carrots')).toBeTruthy();
        expect(getByText('Milk')).toBeTruthy();
        expect(getByTestId('alert-warning-3')).toBeTruthy();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('6. should show inventory performance KPIs', async () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText('Performance')).toBeTruthy();
        expect(getByText('4.2')).toBeTruthy(); // Turnover rate
        expect(getByText('95%')).toBeTruthy(); // Fill rate
        expect(getByText('98%')).toBeTruthy(); // Stock accuracy
      });
    });

    it('7. should display trend indicators for each metric', async () => {
      const { getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByTestId('trend-stock-decreasing')).toBeTruthy();
        expect(getByTestId('trend-sales-increasing')).toBeTruthy();
        expect(getByTestId('trend-wastage-stable')).toBeTruthy();
      });
    });

    it('8. should show inventory health score calculation', async () => {
      const { getByText, getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText('Health Score')).toBeTruthy();
        expect(getByTestId('health-score-gauge')).toBeTruthy();
      });
    });
  });

  describe('Quick Actions', () => {
    it('9. should display quick action buttons for authorized users', async () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText('Stock Count')).toBeTruthy();
        expect(getByText('Bulk Update')).toBeTruthy();
        expect(getByText('Transfer Stock')).toBeTruthy();
        expect(getByText('Generate Report')).toBeTruthy();
      });
    });

    it('10. should navigate to stock management on action press', async () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const button = getByText('Stock Count');
        fireEvent.press(button);
        expect(mockNavigate).toHaveBeenCalledWith('StockManagement', { mode: 'count' });
      });
    });

    it('11. should open bulk operations modal', async () => {
      const { getByText, getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const button = getByText('Bulk Update');
        fireEvent.press(button);
        expect(getByTestId('bulk-operations-modal')).toBeTruthy();
      });
    });

    it('12. should hide actions for users without permissions', async () => {
      const useUserRole = require('../../../hooks/role-based/useUserRole').useUserRole;
      useUserRole.mockReturnValueOnce({
        permissions: { canManageInventory: false },
        role: 'viewer',
      });

      const { queryByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(queryByText('Bulk Update')).toBeNull();
        expect(queryByText('Transfer Stock')).toBeNull();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('13. should show real-time connection status', async () => {
      const { getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByTestId('realtime-status-indicator')).toBeTruthy();
        expect(getByTestId('realtime-status-indicator')).toHaveStyle({ 
          backgroundColor: '#34C759' 
        });
      });
    });

    it('14. should display last sync timestamp', async () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText(/Last sync:/)).toBeTruthy();
      });
    });

    it('15. should auto-refresh data when real-time update received', async () => {
      const useInventoryDashboard = require('../../../hooks/inventory/useInventoryDashboard').useInventoryDashboard;
      const refetchMock = jest.fn();
      useInventoryDashboard.mockReturnValueOnce({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
      });

      renderWithProviders(<InventoryDashboardScreen />);
      
      // Simulate real-time update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(refetchMock).toHaveBeenCalled();
    });
  });

  describe('Alert Management', () => {
    it('16. should show alert count badges on metrics', async () => {
      const { getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByTestId('low-stock-badge')).toBeTruthy();
        expect(getByTestId('out-of-stock-badge')).toBeTruthy();
        expect(getByTestId('expiring-badge')).toBeTruthy();
      });
    });

    it('17. should navigate to alert details on alert press', async () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const alert = getByText('Tomatoes');
        fireEvent.press(alert);
        expect(mockNavigate).toHaveBeenCalledWith('ProductDetail', { 
          productId: expect.any(String),
          highlightAlert: true 
        });
      });
    });

    it('18. should open alert resolution modal', async () => {
      const { getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const resolveButton = getByTestId('resolve-alert-1');
        fireEvent.press(resolveButton);
        expect(getByTestId('alert-resolution-modal')).toBeTruthy();
      });
    });

    it('19. should filter alerts by severity', async () => {
      const { getByText, queryByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const filterButton = getByText('Critical Only');
        fireEvent.press(filterButton);
        
        expect(getByText('Tomatoes')).toBeTruthy();
        expect(queryByText('Carrots')).toBeNull();
      });
    });
  });

  describe('Data Export and Reports', () => {
    it('20. should show export options menu', async () => {
      const { getByText, getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const exportButton = getByText('Export');
        fireEvent.press(exportButton);
        expect(getByTestId('export-menu')).toBeTruthy();
        expect(getByText('Export as CSV')).toBeTruthy();
        expect(getByText('Export as PDF')).toBeTruthy();
      });
    });

    it('21. should generate inventory report', async () => {
      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const reportButton = getByText('Generate Report');
        fireEvent.press(reportButton);
        expect(mockNavigate).toHaveBeenCalledWith('ReportGenerator', {
          type: 'inventory',
          metrics: mockDashboardData.metrics,
        });
      });
    });

    it('22. should show report generation progress', async () => {
      const { getByText, getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const reportButton = getByText('Generate Report');
        fireEvent.press(reportButton);
        expect(getByTestId('report-progress')).toBeTruthy();
      });
    });
  });

  describe('Pull-to-Refresh', () => {
    it('23. should trigger data refresh on pull', async () => {
      const refetchMock = jest.fn();
      const useInventoryDashboard = require('../../../hooks/inventory/useInventoryDashboard').useInventoryDashboard;
      useInventoryDashboard.mockReturnValueOnce({
        data: mockDashboardData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
      });

      const { getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const scrollView = getByTestId('dashboard-scroll-view');
        fireEvent(scrollView, 'refresh');
        expect(refetchMock).toHaveBeenCalled();
      });
    });

    it('24. should show refresh indicator during update', async () => {
      const { getByTestId } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        const scrollView = getByTestId('dashboard-scroll-view');
        fireEvent(scrollView, 'refresh');
        expect(getByTestId('refresh-indicator')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('25. should display error state when data fetch fails', async () => {
      const useInventoryDashboard = require('../../../hooks/inventory/useInventoryDashboard').useInventoryDashboard;
      useInventoryDashboard.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch inventory data'),
        refetch: jest.fn(),
      });

      const { getByText } = renderWithProviders(<InventoryDashboardScreen />);
      
      await waitFor(() => {
        expect(getByText('Failed to load inventory data')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });
  });
});