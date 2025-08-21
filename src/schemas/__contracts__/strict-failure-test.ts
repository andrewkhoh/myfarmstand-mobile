/**
 * 🧪 STRICT FAILURE TESTS
 * Testing if our contract system actually catches real schema drift
 */

import { z } from 'zod';
import type { Product } from '../../types';

// ✅ TEST: Try to create a Product without required description field
const testMissingField = (): Product => {
  // This SHOULD cause a TypeScript error if our system works
  return {
    id: "test",
    name: "test product",
    // Missing required 'description' field
    price: 10.99,
    stock_quantity: 5,
    category_id: "cat1",
    is_available: true,
    created_at: "2023-01-01",
    updated_at: "2023-01-01"
  };
};

// ✅ TEST: Try to assign wrong type to required field  
const testWrongType = (): Product => {
  return {
    id: "test",
    name: "test product", 
    description: "test description",
    price: "wrong type", // Should be number, not string
    stock_quantity: 5,
    category_id: "cat1", 
    is_available: true,
    created_at: "2023-01-01",
    updated_at: "2023-01-01"
  };
};

export { testMissingField, testWrongType };