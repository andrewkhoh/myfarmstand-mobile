import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Mock the screen (doesn't exist yet - RED phase)
const BundleManagementScreen = jest.fn(() => null);
jest.mock('../BundleManagementScreen', () => ({
  default: jest.fn(() => null)
}));

// Mock bundle management hooks
jest.mock('@/hooks/marketing/useBundleManagement', () => ({
  useBundleManagement: jest.fn(() => ({
    bundles: [
      {
        id: '1',
        name: 'Starter Pack',
        products: [
          { id: 'p1', name: 'Basic Item', price: 29.99, quantity: 1 },
          { id: 'p2', name: 'Accessory', price: 9.99, quantity: 2 }
        ],
        discount: 15,
        price: 42.97,
        originalPrice: 49.97,
        stock: 45
      },
      {
        id: '2',
        name: 'Pro Bundle',
        products: [
          { id: 'p3', name: 'Premium Item', price: 99.99, quantity: 1 },
          { id: 'p4', name: 'Pro Accessory', price: 29.99, quantity: 1 }
        ],
        discount: 25,
        price: 97.48,
        originalPrice: 129.98,
        stock: 12
      }
    ],
    createBundle: jest.fn(),
    updateBundle: jest.fn(),
    deleteBundle: jest.fn(),
    calculatePrice: jest.fn(),
    checkInventory: jest.fn(),
    isLoading: false
  }))
}));

jest.mock('@/hooks/marketing/useProductSearch', () => ({
  useProductSearch: jest.fn(() => ({
    products: [
      { id: 'p1', name: 'Basic Item', price: 29.99, stock: 100 },
      { id: 'p2', name: 'Accessory', price: 9.99, stock: 200 },
      { id: 'p3', name: 'Premium Item', price: 99.99, stock: 50 },
      { id: 'p4', name: 'Pro Accessory', price: 29.99, stock: 75 }
    ],
    searchProducts: jest.fn(),
    isSearching: false
  }))
}));

const mockNavigate = jest.fn();

describe('BundleManagementScreen', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <BundleManagementScreen {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };
  
  describe('Bundle List', () => {
    it('should display existing bundles', async () => {
      const { getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        const bundleCards = getAllByTestId(/bundle-card-/);
        expect(bundleCards).toHaveLength(2);
      });
    });
    
    it('should show bundle details', async () => {
      const { getByText, getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Starter Pack')).toBeTruthy();
        expect(getByText('15% OFF')).toBeTruthy();
        expect(getByTestId('bundle-price-1')).toHaveTextContent('$42.97');
        expect(getByTestId('bundle-original-price-1')).toHaveTextContent('$49.97');
      });
    });
    
    it('should display product count in bundle', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('product-count-1')).toHaveTextContent('3 items');
        expect(getByTestId('product-count-2')).toHaveTextContent('2 items');
      });
    });
    
    it('should show stock availability', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('stock-indicator-1')).toHaveTextContent('45 in stock');
        expect(getByTestId('stock-indicator-2')).toHaveTextContent('12 in stock');
      });
    });
    
    it('should highlight low stock bundles', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const lowStockBundle = getByTestId('bundle-card-2');
        expect(lowStockBundle.props.style).toContainEqual(
          expect.objectContaining({ borderColor: '#FF6B6B' })
        );
      });
    });
  });
  
  describe('Bundle Creation', () => {
    it('should show create bundle button', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('create-bundle-button')).toBeTruthy();
      });
    });
    
    it('should open bundle builder', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
      });
      
      expect(getByTestId('bundle-builder-modal')).toBeTruthy();
      expect(getByText('Create New Bundle')).toBeTruthy();
    });
    
    it('should enter bundle name', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        const nameInput = getByTestId('bundle-name-input');
        fireEvent.changeText(nameInput, 'Holiday Special');
        
        expect(nameInput.props.value).toBe('Holiday Special');
      });
    });
    
    it('should validate bundle name', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('save-bundle-button'));
      });
      
      expect(getByText('Bundle name is required')).toBeTruthy();
    });
  });
  
  describe('Product Selection', () => {
    it('should display product search', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        expect(getByTestId('product-search-input')).toBeTruthy();
      });
    });
    
    it('should search for products', async () => {
      const { getByTestId } = renderScreen();
      const { searchProducts } = require('@/hooks/marketing/useProductSearch').useProductSearch();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        const searchInput = getByTestId('product-search-input');
        fireEvent.changeText(searchInput, 'Premium');
      });
      
      expect(searchProducts).toHaveBeenCalledWith('Premium');
    });
    
    it('should display search results', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        const productItems = getAllByTestId(/product-item-/);
        expect(productItems).toHaveLength(4);
      });
    });
    
    it('should add product to bundle', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
      });
      
      expect(getByTestId('selected-product-p1')).toBeTruthy();
    });
    
    it('should show selected products list', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
        fireEvent.press(getByTestId('add-product-p2'));
        
        const selectedProducts = getAllByTestId(/selected-product-/);
        expect(selectedProducts).toHaveLength(2);
      });
    });
    
    it('should adjust product quantity', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
        
        const quantityInput = getByTestId('quantity-input-p1');
        fireEvent.changeText(quantityInput, '3');
        
        expect(quantityInput.props.value).toBe('3');
      });
    });
    
    it('should remove product from bundle', async () => {
      const { getByTestId, queryByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
        fireEvent.press(getByTestId('remove-product-p1'));
      });
      
      expect(queryByTestId('selected-product-p1')).toBeNull();
    });
    
    it('should use drag and drop to reorder products', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
        fireEvent.press(getByTestId('add-product-p2'));
        
        const product1 = getByTestId('selected-product-p1');
        fireEvent(product1, 'onDragStart');
        fireEvent(product1, 'onDragEnd', { index: 1 });
      });
      
      expect(getByTestId('selected-product-0')).toHaveTextContent('Accessory');
    });
  });
  
  describe('Pricing and Discounts', () => {
    it('should display discount slider', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        expect(getByTestId('discount-slider')).toBeTruthy();
      });
    });
    
    it('should adjust discount percentage', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        const slider = getByTestId('discount-slider');
        fireEvent(slider, 'onValueChange', 20);
      });
      
      expect(getByText('20% discount')).toBeTruthy();
    });
    
    it('should calculate bundle price', async () => {
      const { getByTestId } = renderScreen();
      const { calculatePrice } = require('@/hooks/marketing/useBundleManagement').useBundleManagement();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
        fireEvent.press(getByTestId('add-product-p2'));
        
        const slider = getByTestId('discount-slider');
        fireEvent(slider, 'onValueChange', 20);
      });
      
      expect(calculatePrice).toHaveBeenCalledWith(
        expect.any(Array),
        20
      );
    });
    
    it('should display price breakdown', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
        fireEvent.press(getByTestId('add-product-p2'));
      });
      
      expect(getByText('Original Price: $39.98')).toBeTruthy();
      expect(getByText('Discount: -$5.99')).toBeTruthy();
      expect(getByText('Bundle Price: $33.99')).toBeTruthy();
    });
    
    it('should show savings amount', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
        
        const slider = getByTestId('discount-slider');
        fireEvent(slider, 'onValueChange', 25);
      });
      
      expect(getByTestId('savings-badge')).toHaveTextContent('Save $7.50');
    });
  });
  
  describe('Inventory Impact', () => {
    it('should check inventory availability', async () => {
      const { getByTestId } = renderScreen();
      const { checkInventory } = require('@/hooks/marketing/useBundleManagement').useBundleManagement();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
      });
      
      expect(checkInventory).toHaveBeenCalledWith(['p1']);
    });
    
    it('should display inventory warnings', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      require('@/hooks/marketing/useBundleManagement').useBundleManagement().checkInventory.mockReturnValue({
        available: false,
        message: 'Limited stock available'
      });
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
      });
      
      expect(getByText('Limited stock available')).toBeTruthy();
      expect(getByTestId('inventory-warning')).toBeTruthy();
    });
    
    it('should show maximum bundle quantity', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
      });
      
      expect(getByTestId('max-bundles')).toHaveTextContent('Max bundles: 100');
    });
  });
  
  describe('Bundle Editing', () => {
    it('should open bundle for editing', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('edit-bundle-1'));
      });
      
      expect(getByTestId('bundle-editor-modal')).toBeTruthy();
      expect(getByTestId('bundle-name-input').props.value).toBe('Starter Pack');
    });
    
    it('should update bundle name', async () => {
      const { getByTestId } = renderScreen();
      const { updateBundle } = require('@/hooks/marketing/useBundleManagement').useBundleManagement();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('edit-bundle-1'));
        const nameInput = getByTestId('bundle-name-input');
        fireEvent.changeText(nameInput, 'Updated Bundle');
        fireEvent.press(getByTestId('save-bundle-button'));
      });
      
      expect(updateBundle).toHaveBeenCalledWith('1', {
        name: 'Updated Bundle'
      });
    });
    
    it('should delete bundle with confirmation', async () => {
      const { getByTestId } = renderScreen();
      const { deleteBundle } = require('@/hooks/marketing/useBundleManagement').useBundleManagement();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('delete-bundle-1'));
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Bundle',
        'Are you sure you want to delete this bundle?',
        expect.any(Array)
      );
      
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      alertCall[2][1].onPress();
      
      expect(deleteBundle).toHaveBeenCalledWith('1');
    });
  });
  
  describe('Bundle Preview', () => {
    it('should show bundle preview', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('preview-bundle-1'));
      });
      
      expect(getByTestId('bundle-preview-modal')).toBeTruthy();
    });
    
    it('should display preview as customer view', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('preview-bundle-1'));
      });
      
      expect(getByText('Customer View')).toBeTruthy();
      expect(getByTestId('preview-bundle-card')).toBeTruthy();
      expect(getByTestId('preview-add-to-cart')).toBeTruthy();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = renderScreen();
      
      await waitFor(() => {
        expect(getByLabelText('Bundle Management')).toBeTruthy();
        expect(getByLabelText('Create New Bundle')).toBeTruthy();
        expect(getByLabelText('Bundle List')).toBeTruthy();
      });
    });
    
    it('should announce bundle actions', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-bundle-button'));
        fireEvent.press(getByTestId('add-product-p1'));
        
        const announcement = getByTestId('screen-reader-announcement');
        expect(announcement).toHaveTextContent('Product added to bundle');
      });
    });
    
    it('should have proper roles for interactive elements', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const createButton = getByTestId('create-bundle-button');
        expect(createButton.props.accessibilityRole).toBe('button');
        
        const slider = getByTestId('discount-slider');
        expect(slider.props.accessibilityRole).toBe('adjustable');
      });
    });
  });
  
  describe('Loading and Error States', () => {
    it('should show loading state', async () => {
      require('@/hooks/marketing/useBundleManagement').useBundleManagement.mockReturnValue({
        isLoading: true,
        bundles: []
      });
      
      const { getByTestId } = renderScreen();
      
      expect(getByTestId('bundles-loading')).toBeTruthy();
    });
    
    it('should display error message', async () => {
      require('@/hooks/marketing/useBundleManagement').useBundleManagement.mockReturnValue({
        isError: true,
        error: new Error('Failed to load bundles'),
        bundles: []
      });
      
      const { getByText } = renderScreen();
      
      expect(getByText('Failed to load bundles')).toBeTruthy();
    });
  });
});