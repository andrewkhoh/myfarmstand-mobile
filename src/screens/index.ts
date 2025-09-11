// Export main application screens
export { LoginScreen } from './LoginScreen';
export { RegisterScreen } from './RegisterScreen';
export { ShopScreen } from './ShopScreen';
export { CartScreen } from './CartScreen';
export { ProfileScreen } from './ProfileScreen';
export { MyOrdersScreen } from './MyOrdersScreen';
export { AdminScreen } from './AdminScreen';
export { default as AdminOrderScreen } from './AdminOrderScreen';
export { RealtimeTestScreen } from './testScreens/RealtimeTestScreen';
export { BroadcastArchitectureTestScreen } from './testScreens/BroadcastArchitectureTestScreen';
export { ProductDetailScreen } from './ProductDetailScreen';
export { CheckoutScreen } from './CheckoutScreen';
export { OrderConfirmationScreen } from './OrderConfirmationScreen';
export { TestHubScreen } from './TestHubScreen';

// Export test screens from testScreens directory
export { TestScreen } from './testScreens/TestScreen';
export { EnhancedCatalogTestScreen } from './testScreens/EnhancedCatalogTestScreen';
export { CartFunctionalityTestScreen } from './testScreens/CartFunctionalityTestScreen';
export { StockValidationTestScreen } from './testScreens/StockValidationTestScreen';
export { OrderPlacementTestScreen } from './testScreens/OrderPlacementTestScreen';
export { EnhancedCheckoutTestScreen } from './testScreens/EnhancedCheckoutTestScreen';
export { HybridAuthTestScreen } from './testScreens/HybridAuthTestScreen';
export { ProfileManagementTestScreen } from './testScreens/ProfileManagementTestScreen';
export { StaffQRScannerTestScreen } from './testScreens/StaffQRScannerTestScreen';
export { SecurityBroadcastTestScreen } from './testScreens/SecurityBroadcastTestScreen';
export { default as AdminOrderTestScreen } from './testScreens/AdminOrderTestScreen';
export { default as ProductDebugTestScreen } from './testScreens/ProductDebugTestScreen';
export { StaffQRScannerScreen } from './StaffQRScannerScreen';
export { KioskAuthScreen } from './KioskAuthScreen';
export { KioskDashboardScreen } from './KioskDashboardScreen';

// Export Hub screens
export { ExecutiveHub } from './executive/ExecutiveHub';
export { MarketingHub } from './marketing/MarketingHub';
export { InventoryHub } from './inventory/InventoryHub';

// Export Executive screens
export { ExecutiveDashboard } from './executive/ExecutiveDashboard';
export { CustomerAnalytics } from './executive/CustomerAnalytics';
export { InventoryOverview } from './executive/InventoryOverview';
export { PerformanceAnalytics } from './executive/PerformanceAnalytics';
export { RevenueInsights } from './executive/RevenueInsights';

// Export Marketing screens
export { MarketingDashboard } from './marketing/MarketingDashboard';
export { default as CampaignManagementScreen } from './marketing/CampaignManagementScreen';
export { CampaignPlannerScreen } from './marketing/CampaignPlannerScreen';
export { ProductContentScreen } from './marketing/ProductContentScreen';
export { BundleManagementScreen } from './marketing/BundleManagementScreen';
export { MarketingAnalyticsScreen } from './marketing/MarketingAnalyticsScreen';

// Export Inventory screens
export { InventoryDashboardScreen } from './inventory/InventoryDashboardScreen';
export { InventoryAlertsScreen } from './inventory/InventoryAlertsScreen';
export { BulkOperationsScreen } from './inventory/BulkOperationsScreen';
export { StockMovementHistoryScreen } from './inventory/StockMovementHistoryScreen';

// Export Product Management screens
export { ProductManagementScreen } from './ProductManagementScreen';
export { ProductCreateEditScreen } from './ProductCreateEditScreen';

// DEPRECATED: These screens are replaced by the hub architecture
// StockManagementScreen → Use InventoryHub instead
// MetricsAnalyticsScreen → Use ExecutiveHub instead
// Keeping exports for backward compatibility only
export { StockManagementScreen } from './StockManagementScreen';
export { default as MetricsAnalyticsScreen } from './MetricsAnalyticsScreen';

// Export test utilities
export { AutomatedTestRunner } from '../test/AutomatedTestRunner';
