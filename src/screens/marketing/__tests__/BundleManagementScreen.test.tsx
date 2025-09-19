import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BundleManagementScreen } from '../BundleManagementScreen';
import { useProductBundles } from '@/hooks/marketing/useProductBundles';

jest.mock('@/hooks/marketing/useProductBundles');

describe('BundleManagementScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render bundle list', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [
        { id: 'b1', name: 'Bundle A', products: ['p1', 'p2'], price: 99.99 },
        { id: 'b2', name: 'Bundle B', products: ['p3', 'p4'], price: 149.99 },
      ],
      isLoading: false,
    });

    const { getByText } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    expect(getByText('Bundle A')).toBeTruthy();
    expect(getByText('Bundle B')).toBeTruthy();
    expect(getByText('$99.99')).toBeTruthy();
    expect(getByText('$149.99')).toBeTruthy();
  });

  it('should handle bundle creation', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [],
      isLoading: false,
    });

    const { getByText } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    const createButton = getByText('Create Bundle');
    fireEvent.press(createButton);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateBundle');
  });

  it('should handle bundle deletion', async () => {
    const mockDeleteBundle = jest.fn();
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [
        { id: 'b1', name: 'Bundle A', products: ['p1', 'p2'], price: 99.99 },
      ],
      isLoading: false,
      deleteBundle: mockDeleteBundle,
    });

    const { getByTestId } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    const deleteButton = getByTestId('delete-bundle-b1');
    fireEvent.press(deleteButton);
    
    await waitFor(() => {
      expect(mockDeleteBundle).toHaveBeenCalledWith('b1');
    });
  });

  it('should show loading state', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [],
      isLoading: true,
    });

    const { getByTestId } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('should show empty state', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [],
      isLoading: false,
    });

    const { getByText } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    expect(getByText('No bundles created yet')).toBeTruthy();
  });

  it('should handle bundle edit', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [
        { id: 'b1', name: 'Bundle A', products: ['p1', 'p2'], price: 99.99 },
      ],
      isLoading: false,
    });

    const { getByTestId } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    const editButton = getByTestId('edit-bundle-b1');
    fireEvent.press(editButton);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditBundle', { bundleId: 'b1' });
  });

  it('should display bundle products count', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [
        { id: 'b1', name: 'Bundle A', products: ['p1', 'p2'], price: 99.99 },
        { id: 'b2', name: 'Bundle B', products: ['p3', 'p4', 'p5'], price: 149.99 },
      ],
      isLoading: false,
    });

    const { getByText } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    expect(getByText('2 products')).toBeTruthy();
    expect(getByText('3 products')).toBeTruthy();
  });

  it('should handle bundle search', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [
        { id: 'b1', name: 'Summer Bundle', products: ['p1', 'p2'], price: 99.99 },
        { id: 'b2', name: 'Winter Bundle', products: ['p3', 'p4'], price: 149.99 },
      ],
      isLoading: false,
    });

    const { getByPlaceholderText, queryByText } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    const searchInput = getByPlaceholderText('Search bundles...');
    fireEvent.changeText(searchInput, 'Summer');
    
    expect(queryByText('Summer Bundle')).toBeTruthy();
    expect(queryByText('Winter Bundle')).toBeFalsy();
  });

  it('should sort bundles by price', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [
        { id: 'b1', name: 'Bundle A', products: ['p1'], price: 149.99 },
        { id: 'b2', name: 'Bundle B', products: ['p2'], price: 99.99 },
      ],
      isLoading: false,
    });

    const { getByTestId, getAllByTestId } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    const sortButton = getByTestId('sort-by-price');
    fireEvent.press(sortButton);
    
    const bundleCards = getAllByTestId(/^bundle-card-/);
    expect(bundleCards[0]).toHaveProperty('props.testID', 'bundle-card-b2');
    expect(bundleCards[1]).toHaveProperty('props.testID', 'bundle-card-b1');
  });

  it('should toggle bundle activation', async () => {
    const mockToggleActive = jest.fn();
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [
        { id: 'b1', name: 'Bundle A', products: ['p1'], price: 99.99, isActive: true },
      ],
      isLoading: false,
      toggleBundleActive: mockToggleActive,
    });

    const { getByTestId } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    const toggleSwitch = getByTestId('toggle-active-b1');
    fireEvent(toggleSwitch, 'valueChange', false);
    
    await waitFor(() => {
      expect(mockToggleActive).toHaveBeenCalledWith('b1', false);
    });
  });

  it('should display bundle savings', () => {
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [
        { 
          id: 'b1', 
          name: 'Bundle A', 
          products: ['p1', 'p2'], 
          price: 99.99,
          originalPrice: 129.99,
          savings: 30.00
        },
      ],
      isLoading: false,
    });

    const { getByText } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    expect(getByText('Save $30.00')).toBeTruthy();
  });

  it('should handle refresh', async () => {
    const mockRefetch = jest.fn();
    (useProductBundles as jest.Mock).mockReturnValue({
      bundles: [{ id: 'b1', name: 'Bundle A', price: 99.99, products: ['p1'] }],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByTestId } = render(<BundleManagementScreen navigation={mockNavigation} />);
    
    const scrollView = getByTestId('bundle-list');
    const { refreshControl } = scrollView.props;
    
    await act(async () => {
      refreshControl.props.onRefresh();
    });
    
    expect(mockRefetch).toHaveBeenCalled();
  });
});