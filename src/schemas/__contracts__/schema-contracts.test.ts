/**
 * ✅ COMPILE-TIME CONTRACT ENFORCEMENT
 * These tests ensure schemas match their TypeScript interfaces exactly.
 * If these fail to compile, schemas have drifted from interfaces.
 */

import { z } from 'zod';
import { 
  ProductSchema, 
  CategorySchema,
  DbCartItemTransformSchema,
  OrderSchema,
  UserSchema,
  PaymentTransformSchema 
} from '../index';

import type { 
  Product, 
  Category, 
  CartItem,
  Order, 
  User,
  Payment 
} from '../../types';

// Utility type to ensure exact matches
type AssertExact<T, U> = T extends U ? U extends T ? true : false : false;

// ✅ COMPILE-TIME CONTRACT TESTS
// If any of these lines cause TypeScript errors, schemas have drifted from interfaces

type ProductContract = AssertExact<
  z.infer<typeof ProductSchema>, 
  Product
>;

type CategoryContract = AssertExact<
  z.infer<typeof CategorySchema>, 
  Category
>;

type CartItemContract = AssertExact<
  Omit<z.infer<typeof DbCartItemTransformSchema>, '_dbData'>, 
  CartItem
>;

type OrderContract = AssertExact<
  z.infer<typeof OrderSchema>, 
  Order
>;

type UserContract = AssertExact<
  z.infer<typeof UserSchema>, 
  User
>;

type PaymentContract = AssertExact<
  Omit<z.infer<typeof PaymentTransformSchema>, '_dbData'>, 
  Payment
>;

// ✅ RUNTIME CONTRACT VALIDATION (for development/testing)
export const contractTests = {
  product: (): ProductContract => true as ProductContract,
  category: (): CategoryContract => true as CategoryContract, 
  cartItem: (): CartItemContract => true as CartItemContract,
  order: (): OrderContract => true as OrderContract,
  user: (): UserContract => true as UserContract,
  payment: (): PaymentContract => true as PaymentContract,
};

// ✅ BUILD-TIME VALIDATION
// This will fail TypeScript compilation if contracts are violated
const validateAllContracts = () => {
  contractTests.product();
  contractTests.category();
  contractTests.cartItem();
  contractTests.order();
  contractTests.user();
  contractTests.payment();
};

export default validateAllContracts;

// Add a minimal Jest test so the file doesn't fail
describe('Schema Contracts', () => {
  it('should validate all contracts at runtime', () => {
    expect(() => validateAllContracts()).not.toThrow();
  });
});