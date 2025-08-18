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
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).transform((name) => name.trim()),
  description: z.string().min(1),
  price: z.number().min(0),
  stock_quantity: z.number().nullable(),
  category_id: z.string().min(1),
  category: CategorySchema.optional(),
  image_url: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).optional(),
  is_weekly_special: z.boolean().nullable().optional(),
  is_bundle: z.boolean().nullable().optional(),
  seasonal_availability: z.boolean().nullable().optional(),
  unit: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  sku: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  nutrition_info: NutritionInfoSchema,
  is_available: z.boolean().nullable(),
  is_pre_order: z.boolean().nullable().optional(),
  pre_order_available_date: z.string().nullable().optional(),
  min_pre_order_quantity: z.number().nullable().optional(),
  max_pre_order_quantity: z.number().nullable().optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  
  // Legacy field mappings for backward compatibility
  stock: z.number().optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isWeeklySpecial: z.boolean().optional(),
  isBundle: z.boolean().optional(),
  seasonalAvailability: z.boolean().optional(),
  nutritionInfo: NutritionInfoSchema,
  isActive: z.boolean().optional(),
  isPreOrder: z.boolean().optional(),
  preOrderAvailableDate: z.string().optional(),
  minPreOrderQuantity: z.number().optional(),
  maxPreOrderQuantity: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).transform((data) => {
  // Ensure name is never empty after trimming
  if (!data.name || data.name.length === 0) {
    throw new Error('Product name cannot be empty');
  }
  return data;
});

export const ProductArraySchema = z.array(ProductSchema);

export const CategoryArraySchema = z.array(CategorySchema);

// Export types inferred from schemas
export type ValidatedProduct = z.infer<typeof ProductSchema>;
export type ValidatedCategory = z.infer<typeof CategorySchema>;
export type ValidatedNutritionInfo = z.infer<typeof NutritionInfoSchema>;