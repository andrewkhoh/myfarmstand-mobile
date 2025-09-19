import { render, fireEvent, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest, afterEach } from '@jest/globals';
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  renderApp,
  createMockWorkflowData,
  validateWorkflowState,
  TestContext,
} from '@/test/integration-utils';
import BundleManagementScreen from '@/screens/marketing/BundleManagementScreen';

describe('Bundle Creation Workflow', () => {
  let testContext: TestContext;
  let mockData: ReturnType<typeof createMockWorkflowData>;

  beforeEach(async () => {
    testContext = await setupIntegrationTest();
    mockData = createMockWorkflowData();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupIntegrationTest(testContext);
  });

  describe('Complete Bundle Creation and Management', () => {
    it('should create, configure, price, and activate product bundle end-to-end', async () => {
      const { getByText, getByTestId, queryByText } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Step 1: Initialize bundle creation
      fireEvent.press(getByText('Create Bundle'));
      
      expect(getByTestId('bundle-creator-wizard')).toBeTruthy();
      expect(getByText('Step 1: Bundle Information')).toBeTruthy();

      // Basic information
      fireEvent.changeText(getByTestId('bundle-name-input'), 'Summer Essentials Pack');
      fireEvent.changeText(getByTestId('bundle-description-input'), 
        'Complete summer collection with beach essentials and sun protection');
      
      fireEvent.press(getByTestId('bundle-category-select'));
      fireEvent.press(getByText('Seasonal'));
      
      fireEvent.press(getByTestId('bundle-type-select'));
      fireEvent.press(getByText('Fixed Bundle'));
      
      // Tags for searchability
      fireEvent.changeText(getByTestId('bundle-tags-input'), 'summer, beach, essentials, vacation');
      
      fireEvent.press(getByText('Next'));

      // Step 2: Product selection
      expect(getByText('Step 2: Select Products')).toBeTruthy();
      
      // Search products
      fireEvent.changeText(getByTestId('product-search-input'), 'sun');
      
      await waitFor(() => {
        expect(getByText('Sunscreen SPF 50')).toBeTruthy();
        expect(getByText('Sunglasses Premium')).toBeTruthy();
        expect(getByText('Sun Hat Wide Brim')).toBeTruthy();
      });

      // Select products with quantities
      fireEvent.press(getByTestId('product-checkbox-1'));
      fireEvent.changeText(getByTestId('product-quantity-1'), '1');
      
      fireEvent.press(getByTestId('product-checkbox-2'));
      fireEvent.changeText(getByTestId('product-quantity-2'), '1');
      
      fireEvent.press(getByTestId('product-checkbox-3'));
      fireEvent.changeText(getByTestId('product-quantity-3'), '1');
      
      // Add more products
      fireEvent.changeText(getByTestId('product-search-input'), 'beach');
      
      await waitFor(() => {
        expect(getByText('Beach Towel XL')).toBeTruthy();
        expect(getByText('Beach Bag Waterproof')).toBeTruthy();
      });

      fireEvent.press(getByTestId('product-checkbox-4'));
      fireEvent.changeText(getByTestId('product-quantity-4'), '2');
      
      fireEvent.press(getByTestId('product-checkbox-5'));
      fireEvent.changeText(getByTestId('product-quantity-5'), '1');
      
      // View bundle composition
      fireEvent.press(getByText('Review Selection (5 products)'));
      
      expect(getByText('Bundle Contents:')).toBeTruthy();
      expect(getByText('1x Sunscreen SPF 50 - $15.99')).toBeTruthy();
      expect(getByText('1x Sunglasses Premium - $45.99')).toBeTruthy();
      expect(getByText('1x Sun Hat Wide Brim - $24.99')).toBeTruthy();
      expect(getByText('2x Beach Towel XL - $19.99 each')).toBeTruthy();
      expect(getByText('1x Beach Bag Waterproof - $29.99')).toBeTruthy();
      expect(getByText('Total Value: $156.94')).toBeTruthy();
      
      fireEvent.press(getByText('Next'));

      // Step 3: Pricing strategy
      expect(getByText('Step 3: Pricing Strategy')).toBeTruthy();
      
      // Pricing model
      fireEvent.press(getByTestId('pricing-model-select'));
      fireEvent.press(getByText('Fixed Discount'));
      
      fireEvent.changeText(getByTestId('bundle-discount-input'), '25');
      
      // Calculate bundle price
      await waitFor(() => {
        expect(getByText('Bundle Price: $117.71')).toBeTruthy();
        expect(getByText('Customer Saves: $39.23 (25%)')).toBeTruthy();
      });

      // Tiered pricing
      fireEvent.press(getByTestId('tiered-pricing-toggle'));
      
      fireEvent.changeText(getByTestId('tier-1-quantity'), '1');
      fireEvent.changeText(getByTestId('tier-1-discount'), '25');
      
      fireEvent.press(getByText('Add Tier'));
      fireEvent.changeText(getByTestId('tier-2-quantity'), '3');
      fireEvent.changeText(getByTestId('tier-2-discount'), '30');
      
      fireEvent.press(getByText('Add Tier'));
      fireEvent.changeText(getByTestId('tier-3-quantity'), '5');
      fireEvent.changeText(getByTestId('tier-3-discount'), '35');
      
      // Limited time pricing
      fireEvent.press(getByTestId('limited-time-toggle'));
      fireEvent.press(getByTestId('promo-start-date'));
      fireEvent.press(getByText('Tomorrow'));
      fireEvent.press(getByTestId('promo-end-date'));
      fireEvent.press(getByText('Next Week'));
      
      fireEvent.press(getByText('Next'));

      // Step 4: Inventory and availability
      expect(getByText('Step 4: Inventory & Availability')).toBeTruthy();
      
      // Check product availability
      fireEvent.press(getByText('Check Inventory'));
      
      await waitFor(() => {
        expect(getByText('Inventory Status:')).toBeTruthy();
        expect(getByText('Sunscreen SPF 50: 500 units')).toBeTruthy();
        expect(getByText('Sunglasses Premium: 150 units')).toBeTruthy();
        expect(getByText('Sun Hat Wide Brim: 200 units')).toBeTruthy();
        expect(getByText('Beach Towel XL: 300 units')).toBeTruthy();
        expect(getByText('Beach Bag Waterproof: 100 units')).toBeTruthy();
      });

      // Maximum bundle availability
      expect(getByText('Max Bundles Available: 100')).toBeTruthy();
      expect(getByText('Limited by: Beach Bag Waterproof')).toBeTruthy();
      
      // Set bundle limits
      fireEvent.changeText(getByTestId('bundle-limit-input'), '50');
      fireEvent.press(getByTestId('reserve-inventory-toggle'));
      
      // Stock alerts
      fireEvent.press(getByTestId('stock-alerts-toggle'));
      fireEvent.changeText(getByTestId('low-stock-threshold'), '10');
      
      fireEvent.press(getByText('Next'));

      // Step 5: Display and marketing
      expect(getByText('Step 5: Display & Marketing')).toBeTruthy();
      
      // Bundle images
      fireEvent.press(getByText('Add Bundle Images'));
      fireEvent.press(getByTestId('image-picker'));
      
      await waitFor(() => {
        expect(getByTestId('bundle-image-preview')).toBeTruthy();
      });

      // Hero image
      fireEvent.press(getByTestId('set-hero-image'));
      
      // Display options
      fireEvent.press(getByTestId('featured-bundle-toggle'));
      fireEvent.press(getByTestId('homepage-display-toggle'));
      
      // Marketing copy
      fireEvent.changeText(getByTestId('marketing-headline-input'), 
        'Everything You Need for the Perfect Beach Day');
      fireEvent.changeText(getByTestId('marketing-subheadline-input'),
        'Save 25% when you buy the complete collection');
      
      // Call-to-action
      fireEvent.press(getByTestId('cta-style-select'));
      fireEvent.press(getByText('Prominent Button'));
      fireEvent.changeText(getByTestId('cta-text-input'), 'Shop Summer Bundle');
      
      fireEvent.press(getByText('Next'));

      // Step 6: Rules and restrictions
      expect(getByText('Step 6: Rules & Restrictions')).toBeTruthy();
      
      // Purchase restrictions
      fireEvent.press(getByTestId('one-per-customer-toggle'));
      fireEvent.press(getByTestId('new-customers-only-toggle'));
      
      // Combination rules
      fireEvent.press(getByTestId('combine-with-other-offers-toggle'));
      
      // Geographic restrictions
      fireEvent.press(getByTestId('geo-restrictions-toggle'));
      fireEvent.press(getByTestId('country-select'));
      fireEvent.press(getByText('United States'));
      fireEvent.press(getByText('Canada'));
      fireEvent.press(getByText('Done'));
      
      // Minimum purchase
      fireEvent.press(getByTestId('min-purchase-toggle'));
      fireEvent.changeText(getByTestId('min-purchase-amount'), '50');
      
      fireEvent.press(getByText('Next'));

      // Step 7: Review and activate
      expect(getByText('Step 7: Review & Activate')).toBeTruthy();
      
      // Bundle summary
      expect(getByText('Bundle Summary')).toBeTruthy();
      expect(getByText('Name: Summer Essentials Pack')).toBeTruthy();
      expect(getByText('Products: 5 items')).toBeTruthy();
      expect(getByText('Price: $117.71 (25% off)')).toBeTruthy();
      expect(getByText('Available: 50 bundles')).toBeTruthy();
      expect(getByText('Status: Ready to Activate')).toBeTruthy();
      
      // Validation checks
      expect(getByTestId('validation-check-products')).toBeTruthy();
      expect(getByTestId('validation-check-pricing')).toBeTruthy();
      expect(getByTestId('validation-check-inventory')).toBeTruthy();
      expect(getByTestId('validation-check-marketing')).toBeTruthy();
      
      // Save as draft
      fireEvent.press(getByText('Save as Draft'));
      
      await waitFor(() => {
        expect(getByText('Bundle saved as draft')).toBeTruthy();
        expect(testContext.mockServices.bundleService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Summer Essentials Pack',
            status: 'draft',
            products: expect.arrayContaining([
              expect.objectContaining({ id: expect.any(String), quantity: expect.any(Number) })
            ]),
            pricing: expect.objectContaining({
              model: 'fixed_discount',
              discount: 25,
            }),
          })
        );
      });

      // Activate bundle
      fireEvent.press(getByText('Activate Bundle'));
      
      expect(getByText('Activate Bundle?')).toBeTruthy();
      expect(getByText('This will make the bundle available for purchase')).toBeTruthy();
      
      fireEvent.press(getByText('Confirm Activation'));
      
      await waitFor(() => {
        expect(getByText('Status: Active')).toBeTruthy();
        expect(testContext.mockServices.bundleService.activate).toHaveBeenCalled();
        expect(getByText('Bundle activated successfully')).toBeTruthy();
      });

      // Verify analytics tracking
      expect(testContext.mockServices.analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'bundle_activated',
          bundleId: expect.any(String),
          name: 'Summer Essentials Pack',
        })
      );
    });

    it('should support dynamic bundle configuration', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Bundle'));
      
      fireEvent.changeText(getByTestId('bundle-name-input'), 'Build Your Own Bundle');
      
      fireEvent.press(getByTestId('bundle-type-select'));
      fireEvent.press(getByText('Dynamic Bundle'));
      
      fireEvent.press(getByText('Next'));
      
      // Configure dynamic rules
      expect(getByText('Dynamic Bundle Rules')).toBeTruthy();
      
      // Minimum/maximum items
      fireEvent.changeText(getByTestId('min-items-input'), '3');
      fireEvent.changeText(getByTestId('max-items-input'), '7');
      
      // Category restrictions
      fireEvent.press(getByText('Add Category Rule'));
      fireEvent.press(getByTestId('category-select'));
      fireEvent.press(getByText('Electronics'));
      fireEvent.changeText(getByTestId('category-min-input'), '1');
      fireEvent.changeText(getByTestId('category-max-input'), '3');
      
      // Product pool
      fireEvent.press(getByText('Select Product Pool'));
      
      await waitFor(() => {
        expect(getByTestId('product-pool-selector')).toBeTruthy();
      });

      // Select eligible products
      fireEvent.press(getByTestId('select-all-electronics'));
      fireEvent.press(getByTestId('select-all-accessories'));
      fireEvent.press(getByText('Confirm Pool (45 products)'));
      
      // Dynamic pricing
      fireEvent.press(getByText('Configure Dynamic Pricing'));
      
      fireEvent.press(getByTestId('pricing-method-select'));
      fireEvent.press(getByText('Progressive Discount'));
      
      fireEvent.changeText(getByTestId('base-discount-input'), '10');
      fireEvent.changeText(getByTestId('increment-per-item-input'), '2');
      fireEvent.changeText(getByTestId('max-discount-input'), '30');
      
      // Preview dynamic pricing
      fireEvent.press(getByText('Preview Pricing'));
      
      await waitFor(() => {
        expect(getByText('3 items: 10% off')).toBeTruthy();
        expect(getByText('4 items: 12% off')).toBeTruthy();
        expect(getByText('5 items: 14% off')).toBeTruthy();
        expect(getByText('7 items: 18% off')).toBeTruthy();
      });
    });

    it('should validate bundle conflicts and dependencies', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Bundle'));
      fireEvent.changeText(getByTestId('bundle-name-input'), 'Tech Bundle');
      
      // Add products with compatibility issues
      fireEvent.press(getByText('Next'));
      
      fireEvent.press(getByTestId('product-checkbox-phone'));
      fireEvent.press(getByTestId('product-checkbox-case-iphone'));
      fireEvent.press(getByTestId('product-checkbox-case-android'));
      
      // Conflict detection
      await waitFor(() => {
        expect(getByTestId('conflict-warning')).toBeTruthy();
        expect(getByText('Product Conflict Detected')).toBeTruthy();
        expect(getByText('iPhone Case and Android Case are incompatible')).toBeTruthy();
      });

      // Resolution options
      expect(getByText('Create variant bundles')).toBeTruthy();
      expect(getByText('Remove conflicting item')).toBeTruthy();
      expect(getByText('Keep as customer choice')).toBeTruthy();
      
      // Choose variant bundles
      fireEvent.press(getByText('Create variant bundles'));
      
      await waitFor(() => {
        expect(getByText('Bundle Variants Created:')).toBeTruthy();
        expect(getByText('Tech Bundle - iPhone')).toBeTruthy();
        expect(getByText('Tech Bundle - Android')).toBeTruthy();
      });
    });
  });

  describe('Bundle Inventory Management', () => {
    it('should track and update bundle inventory in real-time', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Load bundle with inventory
      testContext.mockServices.bundleService.getById.mockResolvedValueOnce({
        ...mockData.bundle,
        inventory: {
          available: 45,
          reserved: 5,
          sold: 20,
        },
      });

      fireEvent.press(getByText('View Bundle'));
      
      await waitFor(() => {
        expect(getByTestId('inventory-dashboard')).toBeTruthy();
      });

      // Inventory metrics
      expect(getByText('Available: 45')).toBeTruthy();
      expect(getByText('Reserved: 5')).toBeTruthy();
      expect(getByText('Sold: 20')).toBeTruthy();
      expect(getByText('Total Created: 70')).toBeTruthy();
      
      // Real-time updates
      fireEvent.press(getByText('Enable Real-time Updates'));
      
      await waitFor(() => {
        expect(getByTestId('realtime-indicator')).toBeTruthy();
      });

      // Simulate purchase
      testContext.mockServices.bundleService.getById.mockResolvedValueOnce({
        ...mockData.bundle,
        inventory: {
          available: 44,
          reserved: 4,
          sold: 21,
        },
      });

      await waitFor(() => {
        expect(getByText('Available: 44')).toBeTruthy();
        expect(getByText('Sold: 21')).toBeTruthy();
        expect(getByTestId('inventory-change-animation')).toBeTruthy();
      });

      // Low stock alert
      testContext.mockServices.bundleService.getById.mockResolvedValueOnce({
        ...mockData.bundle,
        inventory: {
          available: 8,
          reserved: 2,
          sold: 60,
        },
      });

      await waitFor(() => {
        expect(getByTestId('low-stock-alert')).toBeTruthy();
        expect(getByText('Low Stock Warning')).toBeTruthy();
        expect(getByText('Only 8 bundles remaining')).toBeTruthy();
      });

      // Replenishment options
      expect(getByText('Restock Bundle')).toBeTruthy();
      expect(getByText('Set Auto-reorder')).toBeTruthy();
      expect(getByText('Notify When Back')).toBeTruthy();
    });

    it('should handle inventory reservation and release', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Bundle'));
      fireEvent.press(getByText('Manage Inventory'));
      
      // Reserve inventory
      fireEvent.press(getByText('Reserve Inventory'));
      
      fireEvent.changeText(getByTestId('reserve-quantity-input'), '10');
      fireEvent.changeText(getByTestId('reserve-reason-input'), 'Corporate order pending');
      fireEvent.press(getByTestId('reserve-duration-select'));
      fireEvent.press(getByText('24 hours'));
      
      fireEvent.press(getByText('Confirm Reservation'));
      
      await waitFor(() => {
        expect(getByText('10 units reserved')).toBeTruthy();
        expect(testContext.mockServices.bundleService.update).toHaveBeenCalledWith(
          expect.objectContaining({
            inventory: expect.objectContaining({
              reserved: expect.any(Number),
            }),
          })
        );
      });

      // Auto-release after timeout
      fireEvent.press(getByTestId('dev-tools'));
      fireEvent.press(getByText('Simulate: +24 hours'));
      
      await waitFor(() => {
        expect(getByText('Reservation expired')).toBeTruthy();
        expect(getByText('10 units released back to available')).toBeTruthy();
      });
    });

    it('should prevent overselling through inventory locks', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      // Bundle with limited inventory
      testContext.mockServices.bundleService.getById.mockResolvedValueOnce({
        ...mockData.bundle,
        inventory: {
          available: 2,
          reserved: 0,
          sold: 98,
        },
      });

      fireEvent.press(getByText('View Bundle'));
      
      // Try to purchase more than available
      fireEvent.press(getByText('Test Purchase'));
      fireEvent.changeText(getByTestId('purchase-quantity-input'), '5');
      fireEvent.press(getByText('Process Purchase'));
      
      await waitFor(() => {
        expect(getByText('Insufficient Inventory')).toBeTruthy();
        expect(getByText('Only 2 units available')).toBeTruthy();
      });

      // Enable waitlist
      fireEvent.press(getByText('Join Waitlist'));
      
      fireEvent.changeText(getByTestId('waitlist-email-input'), 'customer@example.com');
      fireEvent.changeText(getByTestId('waitlist-quantity-input'), '3');
      
      fireEvent.press(getByText('Add to Waitlist'));
      
      await waitFor(() => {
        expect(getByText('Added to waitlist')).toBeTruthy();
        expect(getByText('Position #1 for 3 units')).toBeTruthy();
      });
    });
  });

  describe('Bundle Pricing and Promotions', () => {
    it('should apply complex pricing rules and calculations', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Bundle'));
      fireEvent.press(getByText('Pricing Rules'));
      
      // Add volume discount
      fireEvent.press(getByText('Add Pricing Rule'));
      fireEvent.press(getByTestId('rule-type-select'));
      fireEvent.press(getByText('Volume Discount'));
      
      fireEvent.changeText(getByTestId('volume-threshold-input'), '5');
      fireEvent.changeText(getByTestId('volume-discount-input'), '10');
      
      fireEvent.press(getByText('Add Rule'));
      
      // Add early bird discount
      fireEvent.press(getByText('Add Pricing Rule'));
      fireEvent.press(getByTestId('rule-type-select'));
      fireEvent.press(getByText('Time-based Discount'));
      
      fireEvent.press(getByTestId('discount-start-date'));
      fireEvent.press(getByText('Today'));
      fireEvent.press(getByTestId('discount-end-date'));
      fireEvent.press(getByText('Tomorrow'));
      fireEvent.changeText(getByTestId('time-discount-input'), '15');
      
      fireEvent.press(getByText('Add Rule'));
      
      // Add member discount
      fireEvent.press(getByText('Add Pricing Rule'));
      fireEvent.press(getByTestId('rule-type-select'));
      fireEvent.press(getByText('Member Discount'));
      
      fireEvent.press(getByTestId('member-tier-select'));
      fireEvent.press(getByText('Gold Members'));
      fireEvent.changeText(getByTestId('member-discount-input'), '20');
      
      fireEvent.press(getByText('Add Rule'));
      
      // Test price calculation
      fireEvent.press(getByText('Test Pricing'));
      
      fireEvent.changeText(getByTestId('test-quantity-input'), '5');
      fireEvent.press(getByTestId('test-member-toggle'));
      fireEvent.press(getByTestId('member-tier-select'));
      fireEvent.press(getByText('Gold'));
      
      fireEvent.press(getByText('Calculate Price'));
      
      await waitFor(() => {
        expect(getByText('Price Breakdown:')).toBeTruthy();
        expect(getByText('Base Price: $99.99 × 5 = $499.95')).toBeTruthy();
        expect(getByText('Volume Discount (10%): -$49.99')).toBeTruthy();
        expect(getByText('Early Bird (15%): -$67.49')).toBeTruthy();
        expect(getByText('Gold Member (20%): -$76.49')).toBeTruthy();
        expect(getByText('Final Price: $305.98')).toBeTruthy();
        expect(getByText('Total Savings: $193.97 (38.8%)')).toBeTruthy();
      });

      // Rule priority
      fireEvent.press(getByText('Configure Priority'));
      
      expect(getByText('Rule Application Order:')).toBeTruthy();
      expect(getByText('1. Volume Discount')).toBeTruthy();
      expect(getByText('2. Time-based Discount')).toBeTruthy();
      expect(getByText('3. Member Discount')).toBeTruthy();
      
      // Reorder rules
      fireEvent.press(getByTestId('rule-2'));
      fireEvent.press(getByTestId('move-up'));
      
      expect(getByText('1. Time-based Discount')).toBeTruthy();
      expect(getByText('2. Volume Discount')).toBeTruthy();
    });

    it('should handle coupon integration with bundles', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Bundle'));
      fireEvent.press(getByText('Coupon Settings'));
      
      // Create bundle-specific coupon
      fireEvent.press(getByText('Create Coupon'));
      
      fireEvent.changeText(getByTestId('coupon-code-input'), 'SUMMER25');
      fireEvent.changeText(getByTestId('coupon-discount-input'), '25');
      fireEvent.press(getByTestId('coupon-type-select'));
      fireEvent.press(getByText('Percentage'));
      
      // Usage limits
      fireEvent.changeText(getByTestId('total-uses-input'), '100');
      fireEvent.changeText(getByTestId('uses-per-customer-input'), '1');
      
      // Validity period
      fireEvent.press(getByTestId('coupon-start-date'));
      fireEvent.press(getByText('Today'));
      fireEvent.press(getByTestId('coupon-end-date'));
      fireEvent.press(getByText('Next Month'));
      
      fireEvent.press(getByText('Create Coupon'));
      
      await waitFor(() => {
        expect(getByText('Coupon created: SUMMER25')).toBeTruthy();
      });

      // Test coupon application
      fireEvent.press(getByText('Test Coupon'));
      
      fireEvent.changeText(getByTestId('test-coupon-code'), 'SUMMER25');
      fireEvent.press(getByText('Apply'));
      
      await waitFor(() => {
        expect(getByText('Coupon Valid')).toBeTruthy();
        expect(getByText('Discount: 25% off')).toBeTruthy();
        expect(getByText('New Price: $74.99')).toBeTruthy();
      });

      // Test invalid coupon
      fireEvent.changeText(getByTestId('test-coupon-code'), 'INVALID');
      fireEvent.press(getByText('Apply'));
      
      await waitFor(() => {
        expect(getByText('Invalid coupon code')).toBeTruthy();
      });
    });
  });

  describe('Bundle Analytics and Performance', () => {
    it('should track bundle performance metrics', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Bundle'));
      fireEvent.press(getByText('Analytics'));
      
      await waitFor(() => {
        expect(getByTestId('bundle-analytics-dashboard')).toBeTruthy();
      });

      // Performance metrics
      expect(getByText('Bundle Performance')).toBeTruthy();
      expect(getByText('Units Sold: 245')).toBeTruthy();
      expect(getByText('Revenue: $24,500')).toBeTruthy();
      expect(getByText('Avg Order Value: $100')).toBeTruthy();
      expect(getByText('Conversion Rate: 3.5%')).toBeTruthy();
      
      // Trend charts
      expect(getByTestId('sales-trend-chart')).toBeTruthy();
      expect(getByTestId('revenue-trend-chart')).toBeTruthy();
      
      // Customer insights
      fireEvent.press(getByText('Customer Insights'));
      
      await waitFor(() => {
        expect(getByText('Buyer Demographics')).toBeTruthy();
        expect(getByText('Age 25-34: 45%')).toBeTruthy();
        expect(getByText('Age 35-44: 30%')).toBeTruthy();
        expect(getByText('Repeat Buyers: 23%')).toBeTruthy();
      });

      // Product performance within bundle
      fireEvent.press(getByText('Product Performance'));
      
      await waitFor(() => {
        expect(getByText('Most Popular Items:')).toBeTruthy();
        expect(getByText('1. Sunscreen SPF 50 (in 98% of bundles)')).toBeTruthy();
        expect(getByText('2. Sunglasses Premium (in 92% of bundles)')).toBeTruthy();
      });

      // Abandonment analysis
      fireEvent.press(getByText('Abandonment Analysis'));
      
      await waitFor(() => {
        expect(getByText('Cart Abandonment Rate: 35%')).toBeTruthy();
        expect(getByText('Common Drop-off Points:')).toBeTruthy();
        expect(getByText('1. Price reveal (15%)')).toBeTruthy();
        expect(getByText('2. Shipping cost (12%)')).toBeTruthy();
        expect(getByText('3. Login required (8%)')).toBeTruthy();
      });
    });

    it('should provide optimization recommendations', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Bundle'));
      fireEvent.press(getByText('Optimization'));
      
      await waitFor(() => {
        expect(getByTestId('optimization-panel')).toBeTruthy();
      });

      // AI recommendations
      expect(getByText('AI Recommendations')).toBeTruthy();
      expect(getByText('1. Reduce price by 10% to increase conversion')).toBeTruthy();
      expect(getByText('Expected impact: +25% sales')).toBeTruthy();
      
      expect(getByText('2. Add free shipping for bundles over $75')).toBeTruthy();
      expect(getByText('Expected impact: -35% abandonment')).toBeTruthy();
      
      expect(getByText('3. Replace low-performing item')).toBeTruthy();
      expect(getByText('Suggested: Swap Beach Ball for Pool Float')).toBeTruthy();
      
      // A/B test suggestions
      fireEvent.press(getByText('A/B Test Ideas'));
      
      expect(getByText('Test 1: Bundle Image')).toBeTruthy();
      expect(getByText('Lifestyle vs Product Grid')).toBeTruthy();
      
      expect(getByText('Test 2: Pricing Display')).toBeTruthy();
      expect(getByText('Show savings vs Show percentage')).toBeTruthy();
      
      // Apply recommendation
      fireEvent.press(getByTestId('apply-recommendation-1'));
      
      await waitFor(() => {
        expect(getByText('Price updated to $89.99')).toBeTruthy();
        expect(testContext.mockServices.bundleService.setPricing).toHaveBeenCalled();
      });
    });
  });

  describe('Bundle Variants and Customization', () => {
    it('should support bundle variants for different customer segments', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('View Bundle'));
      fireEvent.press(getByText('Create Variant'));
      
      expect(getByTestId('variant-creator')).toBeTruthy();
      
      // Variant details
      fireEvent.changeText(getByTestId('variant-name-input'), 'Summer Essentials - Premium');
      fireEvent.press(getByTestId('target-segment-select'));
      fireEvent.press(getByText('VIP Customers'));
      
      // Modify products
      fireEvent.press(getByText('Customize Products'));
      
      // Upgrade products
      fireEvent.press(getByTestId('product-1'));
      fireEvent.press(getByText('Upgrade'));
      fireEvent.press(getByText('Sunscreen SPF 70 Premium'));
      
      fireEvent.press(getByTestId('product-2'));
      fireEvent.press(getByText('Upgrade'));
      fireEvent.press(getByText('Designer Sunglasses'));
      
      // Add exclusive item
      fireEvent.press(getByText('Add Product'));
      fireEvent.press(getByText('Beach Umbrella Deluxe'));
      
      // Variant pricing
      fireEvent.press(getByText('Set Variant Price'));
      fireEvent.changeText(getByTestId('variant-price-input'), '189.99');
      
      fireEvent.press(getByText('Create Variant'));
      
      await waitFor(() => {
        expect(getByText('Variant created successfully')).toBeTruthy();
        expect(getByText('Summer Essentials - Premium')).toBeTruthy();
      });

      // Compare variants
      fireEvent.press(getByText('Compare Variants'));
      
      expect(getByTestId('variant-comparison-table')).toBeTruthy();
      expect(getByText('Standard | Premium')).toBeTruthy();
      expect(getByText('Price: $117.71 | $189.99')).toBeTruthy();
      expect(getByText('Products: 5 | 6')).toBeTruthy();
    });

    it('should allow customer bundle customization', async () => {
      const { getByText, getByTestId } = renderApp(
        <BundleManagementScreen />,
        { queryClient: testContext.queryClient }
      );

      fireEvent.press(getByText('Create Bundle'));
      fireEvent.changeText(getByTestId('bundle-name-input'), 'Custom Gift Box');
      
      fireEvent.press(getByTestId('bundle-type-select'));
      fireEvent.press(getByText('Customizable'));
      
      fireEvent.press(getByText('Next'));
      
      // Customization options
      expect(getByText('Customization Settings')).toBeTruthy();
      
      // Define slots
      fireEvent.press(getByText('Add Slot'));
      fireEvent.changeText(getByTestId('slot-name-input'), 'Main Item');
      fireEvent.press(getByTestId('slot-category-select'));
      fireEvent.press(getByText('Electronics'));
      fireEvent.changeText(getByTestId('slot-required-input'), '1');
      
      fireEvent.press(getByText('Add Slot'));
      fireEvent.changeText(getByTestId('slot-name-input'), 'Accessories');
      fireEvent.press(getByTestId('slot-category-select'));
      fireEvent.press(getByText('Accessories'));
      fireEvent.changeText(getByTestId('slot-min-input'), '2');
      fireEvent.changeText(getByTestId('slot-max-input'), '4');
      
      // Price calculation method
      fireEvent.press(getByTestId('price-calc-select'));
      fireEvent.press(getByText('Sum with Discount'));
      fireEvent.changeText(getByTestId('bundle-discount-input'), '15');
      
      // Preview customization
      fireEvent.press(getByText('Preview Customer Experience'));
      
      await waitFor(() => {
        expect(getByTestId('customization-preview')).toBeTruthy();
        expect(getByText('Build Your Gift Box')).toBeTruthy();
        expect(getByText('Step 1: Choose Main Item')).toBeTruthy();
        expect(getByText('Step 2: Add 2-4 Accessories')).toBeTruthy();
      });
    });
  });
});