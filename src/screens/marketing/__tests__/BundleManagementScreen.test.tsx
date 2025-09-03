import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { BundleManagementScreen } from '../BundleManagementScreen';
import { marketingService } from '../../../services/marketing/marketingService';
import { bundleService } from '../../../services/marketing/bundleService';

// Mock services
jest.mock('../../../services/marketing/marketingService');
jest.mock('../../../services/marketing/bundleService');

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

describe('BundleManagementScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (bundleService.getBundles as jest.Mock).mockResolvedValue([
      {
        id: 'bundle-1',
        name: 'Summer Collection',
        description: 'Best summer products',
        products: ['product-1', 'product-2'],
        pricing: {
          originalPrice: 150,
          bundlePrice: 120,
          discount: 20,
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'bundle-2',
        name: 'Starter Pack',
        description: 'Essential items for beginners',
        products: ['product-3', 'product-4', 'product-5'],
        pricing: {
          originalPrice: 200,
          bundlePrice: 150,
          discount: 25,
        },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    (bundleService.createBundle as jest.Mock).mockResolvedValue({
      id: 'new-bundle',
      name: 'New Bundle',
      products: [],
      status: 'draft',
    });

    (marketingService.getProducts as jest.Mock).mockResolvedValue([
      { id: 'product-1', name: 'Product 1', price: 50, stock: 100 },
      { id: 'product-2', name: 'Product 2', price: 100, stock: 50 },
      { id: 'product-3', name: 'Product 3', price: 75, stock: 200 },
    ]);
  });

  describe('Rendering', () => {
    it('should render bundle management screen', () => {
      const { getByText, getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      expect(getByText('Bundle Management')).toBeTruthy();
      expect(getByTestId('bundle-management-screen')).toBeTruthy();
    });

    it('should display existing bundles', async () => {
      const { getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('Summer Collection')).toBeTruthy();
        expect(getByText('Starter Pack')).toBeTruthy();
      });
    });

    it('should show bundle pricing information', async () => {
      const { getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('$120')).toBeTruthy(); // Bundle price
        expect(getByText('Save 20%')).toBeTruthy(); // Discount
      });
    });

    it('should display bundle status badges', async () => {
      const { getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('active')).toBeTruthy();
        expect(getByText('draft')).toBeTruthy();
      });
    });

    it('should show loading state initially', () => {
      const { getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should display empty state when no bundles', async () => {
      (bundleService.getBundles as jest.Mock).mockResolvedValue([]);
      
      const { getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByText('No bundles created yet')).toBeTruthy();
        expect(getByText('Create your first product bundle')).toBeTruthy();
      });
    });
  });

  describe('Bundle Creation', () => {
    it('should open bundle creation modal', () => {
      const { getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-bundle-button'));
      
      expect(getByTestId('bundle-creation-modal')).toBeTruthy();
    });

    it('should display product selector', () => {
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-bundle-button'));
      
      expect(getByText('Select Products')).toBeTruthy();
      expect(getByTestId('product-selector')).toBeTruthy();
    });

    it('should handle product selection', async () => {
      const { getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-bundle-button'));
      
      await waitFor(() => {
        expect(getByTestId('product-checkbox-1')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('product-checkbox-1'));
      fireEvent.press(getByTestId('product-checkbox-2'));
      
      const selectedProducts = getByTestId('selected-products');
      expect(selectedProducts.props.children).toContain('2 products selected');
    });

    it('should calculate bundle pricing automatically', async () => {
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-bundle-button'));
      
      await waitFor(() => {
        fireEvent.press(getByTestId('product-checkbox-1')); // $50
        fireEvent.press(getByTestId('product-checkbox-2')); // $100
      });
      
      expect(getByText('Original Price: $150')).toBeTruthy();
      expect(getByTestId('bundle-price-input').props.placeholder).toBe('Suggested: $120');
    });

    it('should validate bundle name', () => {
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-bundle-button'));
      fireEvent.press(getByTestId('save-bundle-button'));
      
      expect(getByText('Bundle name is required')).toBeTruthy();
    });

    it('should create bundle on submit', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-bundle-button'));
      
      // Fill form
      fireEvent.changeText(getByPlaceholderText('Bundle Name'), 'Holiday Special');
      fireEvent.changeText(getByPlaceholderText('Description'), 'Special holiday bundle');
      
      await waitFor(() => {
        fireEvent.press(getByTestId('product-checkbox-1'));
        fireEvent.press(getByTestId('product-checkbox-2'));
      });
      
      fireEvent.changeText(getByTestId('bundle-price-input'), '99');
      
      fireEvent.press(getByTestId('save-bundle-button'));
      
      await waitFor(() => {
        expect(bundleService.createBundle).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Holiday Special',
            description: 'Special holiday bundle',
            products: ['product-1', 'product-2'],
            pricing: expect.objectContaining({
              bundlePrice: 99,
            }),
          })
        );
      });
    });
  });

  describe('Bundle Management', () => {
    it('should edit existing bundle', async () => {
      const { getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('bundle-card-bundle-1')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('edit-bundle-1'));
      
      expect(getByTestId('bundle-edit-modal')).toBeTruthy();
    });

    it('should delete bundle with confirmation', async () => {
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('bundle-card-bundle-1')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('delete-bundle-1'));
      
      expect(getByText('Delete Bundle?')).toBeTruthy();
      expect(getByText('This action cannot be undone')).toBeTruthy();
      
      fireEvent.press(getByText('Confirm'));
      
      await waitFor(() => {
        expect(bundleService.deleteBundle).toHaveBeenCalledWith('bundle-1');
      });
    });

    it('should activate/deactivate bundle', async () => {
      const { getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('bundle-status-toggle-bundle-2')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('bundle-status-toggle-bundle-2'));
      
      await waitFor(() => {
        expect(bundleService.updateBundle).toHaveBeenCalledWith('bundle-2', {
          status: 'active',
        });
      });
    });

    it('should duplicate bundle', async () => {
      const { getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('bundle-card-bundle-1')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('duplicate-bundle-1'));
      
      await waitFor(() => {
        expect(bundleService.createBundle).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Summer Collection (Copy)',
            products: ['product-1', 'product-2'],
          })
        );
      });
    });
  });

  describe('Inventory Impact', () => {
    it('should display inventory impact', async () => {
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-inventory-impact-bundle-1'));
      });
      
      expect(getByTestId('inventory-impact-modal')).toBeTruthy();
      expect(getByText('Product 1: 100 units')).toBeTruthy();
      expect(getByText('Product 2: 50 units')).toBeTruthy();
    });

    it('should show low stock warning', async () => {
      (marketingService.getProducts as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product 1', price: 50, stock: 5 },
      ]);
      
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-bundle-button'));
      
      await waitFor(() => {
        fireEvent.press(getByTestId('product-checkbox-1'));
      });
      
      expect(getByText('⚠️ Low stock: 5 units')).toBeTruthy();
    });

    it('should calculate max bundle quantity', async () => {
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-inventory-impact-bundle-1'));
      });
      
      // Product 2 has 50 units, limiting factor
      expect(getByText('Max bundles available: 50')).toBeTruthy();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter bundles by status', async () => {
      const { getByTestId, queryByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('filter-button')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('filter-button'));
      fireEvent.press(getByTestId('filter-active'));
      
      await waitFor(() => {
        expect(queryByText('Summer Collection')).toBeTruthy();
        expect(queryByText('Starter Pack')).toBeNull();
      });
    });

    it('should search bundles by name', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(queryByText('Summer Collection')).toBeTruthy();
      });
      
      const searchInput = getByPlaceholderText('Search bundles...');
      fireEvent.changeText(searchInput, 'Starter');
      
      await waitFor(() => {
        expect(queryByText('Starter Pack')).toBeTruthy();
        expect(queryByText('Summer Collection')).toBeNull();
      });
    });

    it('should sort bundles', async () => {
      const { getByTestId, getAllByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('sort-button')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('sort-button'));
      fireEvent.press(getByTestId('sort-price-asc'));
      
      await waitFor(() => {
        const bundles = getAllByTestId(/^bundle-card-/);
        expect(bundles[0].props.testID).toBe('bundle-card-bundle-1'); // $120
        expect(bundles[1].props.testID).toBe('bundle-card-bundle-2'); // $150
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should display bundle performance metrics', async () => {
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-analytics-bundle-1'));
      });
      
      expect(getByTestId('bundle-analytics-modal')).toBeTruthy();
      expect(getByText('Sales: 45 units')).toBeTruthy();
      expect(getByText('Revenue: $5,400')).toBeTruthy();
      expect(getByText('Conversion Rate: 3.2%')).toBeTruthy();
    });

    it('should show bundle popularity score', async () => {
      const { getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('popularity-score-bundle-1')).toBeTruthy();
      });
      
      const popularityBadge = getByTestId('popularity-score-bundle-1');
      expect(popularityBadge.props.children).toContain('⭐ 4.5');
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByLabelText('Create new bundle')).toBeTruthy();
        expect(getByLabelText('Search bundles')).toBeTruthy();
        expect(getByLabelText('Filter bundles')).toBeTruthy();
      });
    });

    it('should announce bundle creation success', async () => {
      const { getByTestId, getByText } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-bundle-button'));
      fireEvent.changeText(getByTestId('bundle-name-input'), 'Test Bundle');
      fireEvent.press(getByTestId('save-bundle-button'));
      
      await waitFor(() => {
        const successMessage = getByText('Bundle created successfully');
        expect(successMessage.props.accessibilityRole).toBe('alert');
        expect(successMessage.props.accessibilityLiveRegion).toBe('polite');
      });
    });

    it('should have keyboard navigation support', () => {
      const { getByTestId } = render(
        <BundleManagementScreen navigation={mockNavigation} />
      );
      
      const bundleList = getByTestId('bundle-list');
      expect(bundleList.props.keyboardShouldPersistTaps).toBe('handled');
    });
  });
});