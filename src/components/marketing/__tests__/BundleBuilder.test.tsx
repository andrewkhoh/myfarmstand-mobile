import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the component (doesn't exist yet - RED phase)
jest.mock('../BundleBuilder', () => ({
  default: jest.fn(() => null)
}));

import BundleBuilder from '../BundleBuilder';

describe('BundleBuilder', () => {
  const defaultProps = {
    products: [],
    selectedProducts: [],
    onProductAdd: jest.fn(),
    onProductRemove: jest.fn(),
    onQuantityChange: jest.fn(),
    onReorder: jest.fn(),
    onPriceUpdate: jest.fn(),
    maxItems: 10,
    currency: 'USD',
    testID: 'bundle-builder'
  };

  const mockProducts = [
    { id: '1', name: 'Product A', price: 29.99, image: 'image1.jpg' },
    { id: '2', name: 'Product B', price: 49.99, image: 'image2.jpg' },
    { id: '3', name: 'Product C', price: 19.99, image: 'image3.jpg' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('product selection', () => {
    it('should display available products', () => {
      const { getByText } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      mockProducts.forEach(product => {
        expect(getByText(product.name)).toBeTruthy();
        expect(getByText(`$${product.price}`)).toBeTruthy();
      });
    });

    it('should allow adding products to bundle', () => {
      const onProductAdd = jest.fn();
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} onProductAdd={onProductAdd} />
      );
      
      const addButton = getByTestId('add-product-1');
      fireEvent.press(addButton);
      
      expect(onProductAdd).toHaveBeenCalledWith('1');
    });

    it('should display selected products in bundle', () => {
      const selectedProducts = [
        { ...mockProducts[0], quantity: 2 },
        { ...mockProducts[1], quantity: 1 }
      ];
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      expect(getByTestId('bundle-item-1')).toBeTruthy();
      expect(getByTestId('bundle-item-2')).toBeTruthy();
    });

    it('should allow removing products from bundle', () => {
      const onProductRemove = jest.fn();
      const selectedProducts = [{ ...mockProducts[0], quantity: 1 }];
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          selectedProducts={selectedProducts} 
          onProductRemove={onProductRemove}
        />
      );
      
      const removeButton = getByTestId('remove-product-1');
      fireEvent.press(removeButton);
      
      expect(onProductRemove).toHaveBeenCalledWith('1');
    });

    it('should enforce maximum items limit', () => {
      const selectedProducts = Array(10).fill(null).map((_, i) => ({
        id: `${i}`,
        name: `Product ${i}`,
        price: 10,
        quantity: 1
      }));
      
      const { getByTestId, getByText } = render(
        <BundleBuilder 
          {...defaultProps} 
          selectedProducts={selectedProducts}
          maxItems={10}
        />
      );
      
      expect(getByText('Maximum items reached (10)')).toBeTruthy();
      expect(getByTestId('add-product-1').props.disabled).toBe(true);
    });
  });

  describe('quantity management', () => {
    it('should display quantity controls for each product', () => {
      const selectedProducts = [{ ...mockProducts[0], quantity: 1 }];
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      expect(getByTestId('quantity-decrease-1')).toBeTruthy();
      expect(getByTestId('quantity-input-1')).toBeTruthy();
      expect(getByTestId('quantity-increase-1')).toBeTruthy();
    });

    it('should increase product quantity', () => {
      const onQuantityChange = jest.fn();
      const selectedProducts = [{ ...mockProducts[0], quantity: 1 }];
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          selectedProducts={selectedProducts}
          onQuantityChange={onQuantityChange}
        />
      );
      
      const increaseButton = getByTestId('quantity-increase-1');
      fireEvent.press(increaseButton);
      
      expect(onQuantityChange).toHaveBeenCalledWith('1', 2);
    });

    it('should decrease product quantity', () => {
      const onQuantityChange = jest.fn();
      const selectedProducts = [{ ...mockProducts[0], quantity: 3 }];
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          selectedProducts={selectedProducts}
          onQuantityChange={onQuantityChange}
        />
      );
      
      const decreaseButton = getByTestId('quantity-decrease-1');
      fireEvent.press(decreaseButton);
      
      expect(onQuantityChange).toHaveBeenCalledWith('1', 2);
    });

    it('should allow direct quantity input', () => {
      const onQuantityChange = jest.fn();
      const selectedProducts = [{ ...mockProducts[0], quantity: 1 }];
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          selectedProducts={selectedProducts}
          onQuantityChange={onQuantityChange}
        />
      );
      
      const quantityInput = getByTestId('quantity-input-1');
      fireEvent.changeText(quantityInput, '5');
      
      expect(onQuantityChange).toHaveBeenCalledWith('1', 5);
    });

    it('should validate quantity limits', () => {
      const onQuantityChange = jest.fn();
      const selectedProducts = [{ ...mockProducts[0], quantity: 1, maxQuantity: 5 }];
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          selectedProducts={selectedProducts}
          onQuantityChange={onQuantityChange}
        />
      );
      
      const quantityInput = getByTestId('quantity-input-1');
      fireEvent.changeText(quantityInput, '10');
      
      expect(onQuantityChange).toHaveBeenCalledWith('1', 5);
    });
  });

  describe('pricing display', () => {
    it('should calculate and display total price', () => {
      const selectedProducts = [
        { ...mockProducts[0], quantity: 2 }, // 29.99 * 2 = 59.98
        { ...mockProducts[1], quantity: 1 }  // 49.99 * 1 = 49.99
      ];
      
      const { getByText } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      expect(getByText('Total: $109.97')).toBeTruthy();
    });

    it('should display individual item subtotals', () => {
      const selectedProducts = [
        { ...mockProducts[0], quantity: 3 } // 29.99 * 3 = 89.97
      ];
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      const subtotal = getByTestId('subtotal-1');
      expect(subtotal.props.children).toContain('$89.97');
    });

    it('should apply and display discounts', () => {
      const selectedProducts = [
        { ...mockProducts[0], quantity: 2, discount: 10 } // 10% off
      ];
      
      const { getByText } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      expect(getByText('Discount: -$6.00')).toBeTruthy();
      expect(getByText('Total: $53.98')).toBeTruthy();
    });

    it('should format prices according to currency', () => {
      const selectedProducts = [{ ...mockProducts[0], quantity: 1 }];
      
      const { getByText } = render(
        <BundleBuilder 
          {...defaultProps} 
          selectedProducts={selectedProducts}
          currency="EUR"
        />
      );
      
      expect(getByText('€29.99')).toBeTruthy();
    });
  });

  describe('drag and drop reordering', () => {
    it('should support drag handles on bundle items', () => {
      const selectedProducts = [
        { ...mockProducts[0], quantity: 1 },
        { ...mockProducts[1], quantity: 1 }
      ];
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      expect(getByTestId('drag-handle-1')).toBeTruthy();
      expect(getByTestId('drag-handle-2')).toBeTruthy();
    });

    it('should reorder items via drag and drop', () => {
      const onReorder = jest.fn();
      const selectedProducts = [
        { ...mockProducts[0], quantity: 1 },
        { ...mockProducts[1], quantity: 1 },
        { ...mockProducts[2], quantity: 1 }
      ];
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          selectedProducts={selectedProducts}
          onReorder={onReorder}
        />
      );
      
      const dragItem = getByTestId('bundle-item-1');
      
      // Simulate drag from position 0 to position 2
      fireEvent(dragItem, 'dragStart');
      fireEvent(dragItem, 'dragEnd', {
        nativeEvent: { 
          pageY: 200 // Assuming this corresponds to position 2
        }
      });
      
      expect(onReorder).toHaveBeenCalledWith(['2', '3', '1']);
    });

    it('should provide visual feedback during drag', () => {
      const selectedProducts = [
        { ...mockProducts[0], quantity: 1 },
        { ...mockProducts[1], quantity: 1 }
      ];
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      const dragItem = getByTestId('bundle-item-1');
      fireEvent(dragItem, 'dragStart');
      
      expect(dragItem.props.style).toMatchObject({
        opacity: expect.any(Number)
      });
    });
  });

  describe('validation', () => {
    it('should validate minimum bundle requirements', () => {
      const { getByText } = render(
        <BundleBuilder {...defaultProps} minItems={3} selectedProducts={[]} />
      );
      
      expect(getByText('Add at least 3 items to create a bundle')).toBeTruthy();
    });

    it('should show stock availability', () => {
      const products = [
        { ...mockProducts[0], stock: 5 },
        { ...mockProducts[1], stock: 0 }
      ];
      
      const { getByTestId, getByText } = render(
        <BundleBuilder {...defaultProps} products={products} />
      );
      
      expect(getByText('5 in stock')).toBeTruthy();
      expect(getByText('Out of stock')).toBeTruthy();
      expect(getByTestId('add-product-2').props.disabled).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      const addButton = getByTestId('add-product-1');
      expect(addButton.props.accessibilityLabel).toBe('Add Product A to bundle');
    });

    it('should announce bundle changes', () => {
      const selectedProducts = [{ ...mockProducts[0], quantity: 2 }];
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      const bundleContainer = getByTestId('bundle-container');
      expect(bundleContainer.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should provide drag and drop hints', () => {
      const selectedProducts = [{ ...mockProducts[0], quantity: 1 }];
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} selectedProducts={selectedProducts} />
      );
      
      const dragHandle = getByTestId('drag-handle-1');
      expect(dragHandle.props.accessibilityHint).toBe('Drag to reorder bundle items');
    });
  });
});