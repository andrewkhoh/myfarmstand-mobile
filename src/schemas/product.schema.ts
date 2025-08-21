import { z } from 'zod';
import type { Product, Category } from '../types';

export const NutritionInfoSchema = z.object({
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
  sodium: z.number().optional(),
}).optional();

export const CategorySchema = z.object({
  // Input validation (DB format - snake_case)
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  sort_order: z.number().nullable().optional(),
  is_available: z.boolean().nullable().optional(), // Database allows null/undefined
  created_at: z.string().nullable().optional(),    // Database allows null/undefined
  updated_at: z.string().nullable().optional(),    // Database allows null/undefined
}).transform((data): Category => ({
  // Output transformation (App format - camelCase)
  id: data.id,
  name: data.name,
  description: data.description || undefined,
  imageUrl: data.image_url || undefined,
  sortOrder: data.sort_order || undefined,
  isActive: data.is_available ?? true,  // Default to true if null
  createdAt: data.created_at || '',     // Default to empty string if null
  updatedAt: data.updated_at || '',     // Default to empty string if null
}));

// DB input schema (validates raw database format with JOIN)
const RawProductSchema = z.object({
  // Input validation (DB format - snake_case)
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  stock_quantity: z.number().nullable(),
  category_id: z.string().min(1), // Foreign key to categories table
  image_url: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).nullable().optional(),
  is_weekly_special: z.boolean().nullable().optional(),
  is_bundle: z.boolean().nullable().optional(),
  seasonal_availability: z.boolean().nullable().optional(),
  unit: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  sku: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  nutrition_info: NutritionInfoSchema.nullable().optional(),
  is_available: z.boolean().nullable(),
  is_pre_order: z.boolean().nullable().optional(),
  pre_order_available_date: z.string().nullable().optional(),
  min_pre_order_quantity: z.number().nullable().optional(),
  max_pre_order_quantity: z.number().nullable().optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

// ✅ SAFETY NET 2: Runtime business logic validation
const validateProductTransformation = (input: any, output: Product, categories: any[] = []): void => {
  // Catch the exact category bug pattern
  if (output.category_id === input.category) {
    throw new Error(
      `🚨 CRITICAL BUG: category_id should be ID, not category name! ` +
      `Got category_id="${output.category_id}" from input.category="${input.category}". ` +
      `This will break UI filtering. Use input.category_id instead.`
    );
  }
  
  // Validate category population logic
  if (input.category_id && !output.category && categories.length > 0) {
    console.warn(
      `⚠️ BUSINESS LOGIC WARNING: Product has category_id="${input.category_id}" ` +
      `but category object is not populated. UI filtering may not work.`
    );
  }
};

// ✅ COMPREHENSIVE FIX: Transform function that accepts categories separately (following Pattern 1)
export const transformProductWithCategory = (
  rawProduct: z.infer<typeof RawProductSchema>, 
  categories: any[] = []
): Product => {
  // First validate the raw product data
  const validatedProduct = RawProductSchema.parse(rawProduct);
  const trimmedName = validatedProduct.name.trim();
  
  // Find matching category (resilient lookup)
  const matchingCategory = categories.find(cat => cat.id === validatedProduct.category_id);
  
  // Output transformation (App format - mixed snake + camel for compatibility)
  const result: Product = {
    // Core fields (keep snake_case for API compatibility)
    id: validatedProduct.id,
    name: trimmedName,
    description: validatedProduct.description,
    price: validatedProduct.price,
    stock_quantity: validatedProduct.stock_quantity,
    category_id: validatedProduct.category_id, // ✅ FIXED: Correct mapping from database field
    // ✅ COMPREHENSIVE FIX: Populate category object from separate category lookup
    category: matchingCategory ? {
      id: matchingCategory.id,
      name: matchingCategory.name,
      description: matchingCategory.description || undefined,
      imageUrl: matchingCategory.image_url || undefined,
      sortOrder: matchingCategory.sort_order || undefined,
      isActive: matchingCategory.is_available, // ✅ FIXED: Use correct database field
      createdAt: matchingCategory.created_at || '',
      updatedAt: matchingCategory.updated_at || ''
    } : undefined,
    image_url: validatedProduct.image_url,
    images: validatedProduct.images || undefined,
    is_weekly_special: validatedProduct.is_weekly_special,
    is_bundle: validatedProduct.is_bundle,
    seasonal_availability: validatedProduct.seasonal_availability,
    unit: validatedProduct.unit,
    weight: validatedProduct.weight,
    sku: validatedProduct.sku,
    tags: validatedProduct.tags,
    nutrition_info: validatedProduct.nutrition_info,
    is_available: validatedProduct.is_available,
    is_pre_order: validatedProduct.is_pre_order,
    pre_order_available_date: validatedProduct.pre_order_available_date,
    min_pre_order_quantity: validatedProduct.min_pre_order_quantity,
    max_pre_order_quantity: validatedProduct.max_pre_order_quantity,
    created_at: validatedProduct.created_at,
    updated_at: validatedProduct.updated_at,
    
    // Legacy camelCase mappings for backward compatibility
    stock: validatedProduct.stock_quantity ?? 0,
    categoryId: validatedProduct.category_id, // ✅ FIXED: Correct mapping for legacy field
    imageUrl: validatedProduct.image_url || undefined,
    isWeeklySpecial: validatedProduct.is_weekly_special ?? false,
    isBundle: validatedProduct.is_bundle ?? false,
    seasonalAvailability: validatedProduct.seasonal_availability ?? false,
    nutritionInfo: validatedProduct.nutrition_info || undefined,
    isActive: validatedProduct.is_available ?? true,
    isPreOrder: validatedProduct.is_pre_order ?? false,
    preOrderAvailableDate: validatedProduct.pre_order_available_date || undefined,
    minPreOrderQuantity: validatedProduct.min_pre_order_quantity || undefined,
    maxPreOrderQuantity: validatedProduct.max_pre_order_quantity || undefined,
    createdAt: validatedProduct.created_at || '',
    updatedAt: validatedProduct.updated_at || '',
  };
  
  // ✅ SAFETY NET 2: Validate business logic after transformation
  validateProductTransformation(rawProduct, result, categories);
  
  return result;
};

// ✅ COMPREHENSIVE FIX: Create proper Zod schema with category support
// ✅ SAFETY NET 1: TypeScript return annotation catches incomplete transformations
export const ProductSchema = RawProductSchema.transform((data): Product => {
  // Default transformation without categories for backward compatibility
  return transformProductWithCategory(data, []);
});

// ✅ NEW: Enhanced transformation function for use with categories
export const transformProduct = (rawProduct: any, categories: any[] = []) => {
  return transformProductWithCategory(rawProduct, categories);
};

// Raw category schema for database validation
const RawCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  sort_order: z.number().nullable().optional(),
  is_available: z.boolean().nullable().optional(), // Database allows null/undefined
  created_at: z.string().nullable().optional(),    // Database allows null/undefined
  updated_at: z.string().nullable().optional(),    // Database allows null/undefined
});

// Export raw schemas for database validation
export const DbProductSchema = RawProductSchema;
export const DbCategorySchema = RawCategorySchema;

export const ProductArraySchema = z.array(ProductSchema);

export const CategoryArraySchema = z.array(CategorySchema);

// Export types inferred from schemas
export type ValidatedProduct = z.infer<typeof ProductSchema>;
export type ValidatedCategory = z.infer<typeof CategorySchema>;
export type ValidatedNutritionInfo = z.infer<typeof NutritionInfoSchema>;