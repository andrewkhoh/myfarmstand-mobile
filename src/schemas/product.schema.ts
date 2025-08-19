import { z } from 'zod';

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
}).transform(data => ({
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

// DB input schema (validates raw database format)
const RawProductSchema = z.object({
  // Input validation (DB format - snake_case)
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  stock_quantity: z.number().nullable(),
  category: z.string().min(1), // Simple category name from DB
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

// App output schema (validates + transforms to app format)
export const ProductSchema = RawProductSchema.transform((data) => {
  // RawProductSchema already validated name is a non-empty string
  const trimmedName = data.name.trim();
  
  // Output transformation (App format - mixed snake + camel for compatibility)
  return {
    // Core fields (keep snake_case for API compatibility)
    id: data.id,
    name: trimmedName,
    description: data.description,
    price: data.price,
    stock_quantity: data.stock_quantity,
    category_id: data.category, // Required by Product interface
    image_url: data.image_url,
    images: data.images || undefined,
    is_weekly_special: data.is_weekly_special,
    is_bundle: data.is_bundle,
    seasonal_availability: data.seasonal_availability,
    unit: data.unit,
    weight: data.weight,
    sku: data.sku,
    tags: data.tags,
    nutrition_info: data.nutrition_info,
    is_available: data.is_available,
    is_pre_order: data.is_pre_order,
    pre_order_available_date: data.pre_order_available_date,
    min_pre_order_quantity: data.min_pre_order_quantity,
    max_pre_order_quantity: data.max_pre_order_quantity,
    created_at: data.created_at,
    updated_at: data.updated_at,
    
    // Legacy camelCase mappings for backward compatibility
    stock: data.stock_quantity ?? 0,
    categoryId: data.category,
    imageUrl: data.image_url || undefined,
    isWeeklySpecial: data.is_weekly_special ?? false,
    isBundle: data.is_bundle ?? false,
    seasonalAvailability: data.seasonal_availability ?? false,
    nutritionInfo: data.nutrition_info || undefined,
    isActive: data.is_available ?? true,
    isPreOrder: data.is_pre_order ?? false,
    preOrderAvailableDate: data.pre_order_available_date || undefined,
    minPreOrderQuantity: data.min_pre_order_quantity || undefined,
    maxPreOrderQuantity: data.max_pre_order_quantity || undefined,
    createdAt: data.created_at || '',
    updatedAt: data.updated_at || '',
  };
});

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