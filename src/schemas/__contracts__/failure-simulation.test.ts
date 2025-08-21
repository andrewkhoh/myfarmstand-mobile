/**
 * 🧪 FAILURE SIMULATION TESTS
 * These tests intentionally create contract violations to verify our detection works
 * Each test should FAIL compilation if our contract system is working
 */

import { z } from 'zod';
import type { Product, Category } from '../../types';

// ✅ TEST 1: Schema Missing Required Field  
// This should cause TypeScript compilation error
const BrokenProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Missing required 'description' field that Product interface requires
  price: z.number(),
}).transform((data): Product => {
  // @ts-expect-error - This should fail: missing required description field
  return {
    id: data.id,
    name: data.name,
    // Missing description field entirely
    price: data.price,
    stock_quantity: null,
    category_id: '',
    is_available: true,
    created_at: '',
    updated_at: ''
  };
});

// ✅ TEST 2: Schema With Wrong Field Type
// This should cause TypeScript compilation error  
const WrongTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.string(), // Should be boolean in Category interface
}).transform((data): Category => {
  return {
    id: data.id,
    name: data.name,
    // @ts-expect-error - This should fail: wrong type (string instead of boolean)
    isActive: data.isActive,
    createdAt: '',
    updatedAt: ''
  };
});

// ✅ TEST 3: Schema With Extra Unexpected Field
const ExtraFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  unexpectedField: z.string(), // This doesn't exist in Product interface
}).transform((data): Product => {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    price: data.price,
    stock_quantity: null,
    category_id: '',
    is_available: true,
    created_at: '',
    updated_at: '',
    // @ts-expect-error - This should fail: extra field not in Product interface
    unexpectedField: data.unexpectedField
  };
});

export const FailureTests = {
  brokenProduct: BrokenProductSchema,
  wrongType: WrongTypeSchema,
  extraField: ExtraFieldSchema
};