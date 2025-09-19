/**
 * Order Schema Anti-Pattern Fix Test
 * Verifies that business logic calculation validation has been removed from schemas
 * and that schemas now only validate data structure, not business rules.
 * 
 * This test ensures Phase 1 of the validation pattern compliance audit is working correctly.
 */

import { describe, expect } from '@jest/globals';
import { DbOrderItemSchema, OrderItemSchema } from '../order.schema';

describe('Order Schema Anti-Pattern Fix', () => {
  describe('DbOrderItemSchema', () => {
    it('should accept data with incorrect calculations (business logic removed)', () => {
      // Test data with intentionally wrong calculation
      const dbOrderItemWithWrongCalculation = {
        id: 'item-1',
        product_id: 'product-1', 
        product_name: 'Test Product',
        unit_price: 10.50,
        quantity: 2,
        total_price: 19.00 // Intentionally wrong: should be 21.00 (10.50 * 2)
      };

      // This should PASS because business logic validation was removed
      expect(() => {
        const result = DbOrderItemSchema.parse(dbOrderItemWithWrongCalculation);
        expect(result.total_price).toBe(19.00); // Accepts wrong calculation
        expect(result.unit_price).toBe(10.50);
        expect(result.quantity).toBe(2);
      }).not.toThrow();
    });

    it('should still validate required fields and data types (structural validation)', () => {
      const invalidStructuralData = {
        id: '', // Invalid: empty string
        product_id: 'product-1',
        product_name: 'Test Product',
        unit_price: -5, // Invalid: negative price
        quantity: 0, // Invalid: zero quantity
        total_price: 10
      };

      // Should fail on structural validation
      expect(() => {
        DbOrderItemSchema.parse(invalidStructuralData);
      }).toThrow();
    });

    it('should accept correct data structure', () => {
      const validData = {
        id: 'item-1',
        product_id: 'product-1',
        product_name: 'Test Product',
        unit_price: 10.50,
        quantity: 2,
        total_price: 21.00 // Correct calculation
      };

      expect(() => {
        const result = DbOrderItemSchema.parse(validData);
        expect(result).toEqual(validData);
      }).not.toThrow();
    });
  });

  describe('OrderItemSchema', () => {
    it('should accept data with incorrect calculations (business logic removed)', () => {
      // Test data with intentionally wrong calculation
      const orderItemWithWrongCalculation = {
        productId: 'product-1',
        productName: 'Test Product', 
        price: 10.50,
        quantity: 2,
        subtotal: 19.00 // Intentionally wrong: should be 21.00 (10.50 * 2)
      };

      // This should PASS because business logic validation was removed
      expect(() => {
        const result = OrderItemSchema.parse(orderItemWithWrongCalculation);
        expect(result.subtotal).toBe(19.00); // Accepts wrong calculation
        expect(result.price).toBe(10.50);
        expect(result.quantity).toBe(2);
      }).not.toThrow();
    });

    it('should still validate required fields and data types (structural validation)', () => {
      const invalidStructuralData = {
        productId: '', // Invalid: empty string
        productName: 'Test Product',
        price: -5, // Invalid: negative price
        quantity: 0, // Invalid: zero quantity
        subtotal: 10
      };

      // Should fail on structural validation
      expect(() => {
        OrderItemSchema.parse(invalidStructuralData);
      }).toThrow();
    });

    it('should accept correct data structure', () => {
      const validData = {
        productId: 'product-1',
        productName: 'Test Product',
        price: 10.50,
        quantity: 2,
        subtotal: 21.00 // Correct calculation
      };

      expect(() => {
        const result = OrderItemSchema.parse(validData);
        expect(result).toEqual(validData);
      }).not.toThrow();
    });
  });

  describe('Validation Pattern Compliance', () => {
    it('should demonstrate that calculation validation is now service-layer responsibility', () => {
      // This test documents the new separation of concerns:
      // - Schemas: Validate structure, types, required fields
      // - Services: Validate business logic, calculations, complex rules
      
      const dataWithWrongCalculation = {
        productId: 'product-1',
        productName: 'Test Product',
        price: 15.00,
        quantity: 3,
        subtotal: 40.00 // Wrong: should be 45.00
      };
      
      // Schema accepts it (structure is valid)
      const schemaResult = OrderItemSchema.parse(dataWithWrongCalculation);
      expect(schemaResult.subtotal).toBe(40.00);
      
      // Service layer would catch this calculation error
      // (This would be handled in orderService.ts with ValidationMonitor)
      const expectedSubtotal = schemaResult.price * schemaResult.quantity;
      const calculationError = Math.abs(schemaResult.subtotal - expectedSubtotal) > 0.01;
      
      expect(calculationError).toBe(true); // Service layer would detect this
      expect(expectedSubtotal).toBe(45.00); // Service layer would know correct value
    });
  });
});