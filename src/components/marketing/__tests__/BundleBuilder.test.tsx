import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';

import BundleBuilder from '../BundleBuilder';

describe('BundleBuilder', () => {
  const defaultProps = {
    products: [],
    onAdd: jest.fn(),
    onRemove: jest.fn(),
    onReorder: jest.fn(),
    onQuantityChange: jest.fn(),
    onPriceUpdate: jest.fn(),
    maxItems: 10,
    pricing: {
      basePrice: 0,
      discountPercentage: 0
    },
    testID: 'bundle-builder'
  };
  
  const mockProducts = [
    { id: '1', name: 'Product A', price: 29.99, image: 'imageA.jpg' },
    { id: '2', name: 'Product B', price: 39.99, image: 'imageB.jpg' },
    { id: '3', name: 'Product C', price: 49.99, image: 'imageC.jpg' }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('product display', () => {
    it('should render empty state when no products', () => {
      const { getByText } = render(
        <BundleBuilder {...defaultProps} />
      );
      expect(getByText('No products in bundle')).toBeTruthy();
    });
    
    it('should display product list', () => {
      const { getByText } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      expect(getByText('Product A')).toBeTruthy();
      expect(getByText('Product B')).toBeTruthy();
      expect(getByText('Product C')).toBeTruthy();
    });
    
    it('should show product images', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      expect(getByTestId('product-image-1').props.source.uri).toBe('imageA.jpg');
      expect(getByTestId('product-image-2').props.source.uri).toBe('imageB.jpg');
    });
    
    it('should display product prices', () => {
      const { getByText } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      expect(getByText('$29.99')).toBeTruthy();
      expect(getByText('$39.99')).toBeTruthy();
      expect(getByText('$49.99')).toBeTruthy();
    });
  });
  
  describe('product selection', () => {
    it('should show add product button', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} />
      );
      expect(getByTestId('add-product-button')).toBeTruthy();
    });
    
    it('should open product selector modal', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} />
      );
      
      const addButton = getByTestId('add-product-button');
      fireEvent.press(addButton);
      
      expect(getByTestId('product-selector-modal')).toBeTruthy();
    });
    
    it('should call onAdd when product selected', () => {
      const onAdd = jest.fn();
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} onAdd={onAdd} />
      );
      
      const addButton = getByTestId('add-product-button');
      fireEvent.press(addButton);
      
      const productOption = getByTestId('select-product-1');
      fireEvent.press(productOption);
      
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    });
    
    it('should disable add button when max items reached', () => {
      const maxProducts = Array(5).fill(null).map((_, i) => ({
        id: String(i),
        name: `Product ${i}`,
        price: 10
      }));
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={maxProducts} maxItems={5} />
      );
      
      const addButton = getByTestId('add-product-button');
      expect(addButton.props.disabled).toBe(true);
    });
    
    it('should show item count indicator', () => {
      const { getByText } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} maxItems={10} />
      );
      
      expect(getByText('3 / 10 items')).toBeTruthy();
    });
  });
  
  describe('product removal', () => {
    it('should show remove button for each product', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      expect(getByTestId('remove-product-1')).toBeTruthy();
      expect(getByTestId('remove-product-2')).toBeTruthy();
    });
    
    it('should call onRemove when remove button pressed', () => {
      const onRemove = jest.fn();
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} onRemove={onRemove} />
      );
      
      const removeButton = getByTestId('remove-product-1');
      fireEvent.press(removeButton);
      
      expect(onRemove).toHaveBeenCalledWith('1');
    });
    
    it('should show confirmation before removing', async () => {
      const { getByTestId, getByText } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} confirmRemove={true} />
      );
      
      const removeButton = getByTestId('remove-product-1');
      fireEvent.press(removeButton);
      
      await waitFor(() => {
        expect(getByText('Remove this product?')).toBeTruthy();
      });
    });
  });
  
  describe('drag and drop reordering', () => {
    it('should support drag handle for each product', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      expect(getByTestId('drag-handle-1')).toBeTruthy();
      expect(getByTestId('drag-handle-2')).toBeTruthy();
    });
    
    it('should call onReorder when products dragged', () => {
      const onReorder = jest.fn();
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} onReorder={onReorder} />
      );
      
      const product1 = getByTestId('product-item-1');
      
      fireEvent(product1, 'dragStart');
      fireEvent(product1, 'dragEnd', { nativeEvent: { y: 200 } });
      
      expect(onReorder).toHaveBeenCalledWith(expect.any(Array));
    });
    
    it('should show drop zone indicator during drag', async () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      const dragHandle = getByTestId('drag-handle-1');
      fireEvent(dragHandle, 'dragStart');
      
      await waitFor(() => {
        expect(getByTestId('drop-zone-indicator')).toBeTruthy();
      });
    });
  });
  
  describe('quantity management', () => {
    it('should show quantity controls for each product', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      expect(getByTestId('quantity-decrease-1')).toBeTruthy();
      expect(getByTestId('quantity-increase-1')).toBeTruthy();
      expect(getByTestId('quantity-input-1')).toBeTruthy();
    });
    
    it('should call onQuantityChange when quantity increased', () => {
      const onQuantityChange = jest.fn();
      const productsWithQty = mockProducts.map(p => ({ ...p, quantity: 1 }));
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          products={productsWithQty}
          onQuantityChange={onQuantityChange}
        />
      );
      
      const increaseButton = getByTestId('quantity-increase-1');
      fireEvent.press(increaseButton);
      
      expect(onQuantityChange).toHaveBeenCalledWith('1', 2);
    });
    
    it('should call onQuantityChange when quantity decreased', () => {
      const onQuantityChange = jest.fn();
      const productsWithQty = mockProducts.map(p => ({ ...p, quantity: 2 }));
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          products={productsWithQty}
          onQuantityChange={onQuantityChange}
        />
      );
      
      const decreaseButton = getByTestId('quantity-decrease-1');
      fireEvent.press(decreaseButton);
      
      expect(onQuantityChange).toHaveBeenCalledWith('1', 1);
    });
    
    it('should allow direct quantity input', () => {
      const onQuantityChange = jest.fn();
      const productsWithQty = mockProducts.map(p => ({ ...p, quantity: 1 }));
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          products={productsWithQty}
          onQuantityChange={onQuantityChange}
        />
      );
      
      const quantityInput = getByTestId('quantity-input-1');
      fireEvent.changeText(quantityInput, '5');
      
      expect(onQuantityChange).toHaveBeenCalledWith('1', 5);
    });
    
    it('should validate quantity limits', () => {
      const productsWithQty = mockProducts.map(p => ({ ...p, quantity: 1, maxQuantity: 3 }));
      
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={productsWithQty} />
      );
      
      const quantityInput = getByTestId('quantity-input-1');
      fireEvent.changeText(quantityInput, '10');
      
      expect(getByTestId('quantity-error-1')).toBeTruthy();
    });
  });
  
  describe('pricing display', () => {
    it('should calculate and display total price', () => {
      const productsWithQty = mockProducts.map(p => ({ ...p, quantity: 1 }));
      const { getByText } = render(
        <BundleBuilder {...defaultProps} products={productsWithQty} />
      );
      
      // Total: 29.99 + 39.99 + 49.99 = 119.97
      expect(getByText('Total: $119.97')).toBeTruthy();
    });
    
    it('should apply bundle discount', () => {
      const productsWithQty = mockProducts.map(p => ({ ...p, quantity: 1 }));
      const pricing = { basePrice: 0, discountPercentage: 10 };
      
      const { getByText } = render(
        <BundleBuilder {...defaultProps} products={productsWithQty} pricing={pricing} />
      );
      
      expect(getByText('Discount: 10%')).toBeTruthy();
      expect(getByText('Total: $107.97')).toBeTruthy(); // 119.97 - 10%
    });
    
    it('should show savings amount', () => {
      const productsWithQty = mockProducts.map(p => ({ ...p, quantity: 1 }));
      const pricing = { basePrice: 0, discountPercentage: 10 };
      
      const { getByText } = render(
        <BundleBuilder {...defaultProps} products={productsWithQty} pricing={pricing} />
      );
      
      expect(getByText('You save: $12.00')).toBeTruthy();
    });
    
    it('should update price when quantity changes', () => {
      const onPriceUpdate = jest.fn();
      const productsWithQty = mockProducts.map(p => ({ ...p, quantity: 1 }));
      
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          products={productsWithQty}
          onPriceUpdate={onPriceUpdate}
        />
      );
      
      const increaseButton = getByTestId('quantity-increase-1');
      fireEvent.press(increaseButton);
      
      expect(onPriceUpdate).toHaveBeenCalledWith(expect.objectContaining({
        total: expect.any(Number),
        subtotal: expect.any(Number),
        discount: expect.any(Number)
      }));
    });
  });
  
  describe('validation', () => {
    it('should validate minimum items requirement', () => {
      const { getByText } = render(
        <BundleBuilder {...defaultProps} products={[mockProducts[0]]} minItems={3} />
      );
      
      expect(getByText('Minimum 3 items required')).toBeTruthy();
    });
    
    it('should show validation summary', () => {
      const { getByTestId } = render(
        <BundleBuilder 
          {...defaultProps} 
          products={[]} 
          minItems={2}
          showValidation={true}
        />
      );
      
      expect(getByTestId('validation-summary')).toBeTruthy();
    });
  });
  
  describe('accessibility', () => {
    it('should have accessible labels for controls', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      const addButton = getByTestId('add-product-button');
      expect(addButton.props.accessibilityLabel).toBe('Add product to bundle');
    });
    
    it('should announce bundle changes', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      const bundleContainer = getByTestId('bundle-builder');
      expect(bundleContainer.props.accessibilityLiveRegion).toBe('polite');
    });
    
    it('should provide hints for drag and drop', () => {
      const { getByTestId } = render(
        <BundleBuilder {...defaultProps} products={mockProducts} />
      );
      
      const dragHandle = getByTestId('drag-handle-1');
      expect(dragHandle.props.accessibilityHint).toBe('Long press and drag to reorder');
    });
  });
});
