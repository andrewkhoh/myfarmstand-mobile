/**
 * Product Admin Schema with Exact Database Alignment
 * 
 * Following Pattern 2: Database-first validation with exact field alignment
 * Following Pattern 4: Transformation Schema Architecture
 * 
 * Critical: All fields MUST match database.generated.ts exactly for products and categories tables
 */

import { z } from 'zod';
import type { Database } from '../types/database.generated';

// Raw database schema types - MUST match database.generated.ts EXACTLY
type DatabaseProduct = Database['public']['Tables']['products']['Row'];
type DatabaseProductInsert = Database['public']['Tables']['products']['Insert'];
type DatabaseProductUpdate = Database['public']['Tables']['products']['Update'];
type DatabaseCategory = Database['public']['Tables']['categories']['Row'];
type DatabaseCategoryInsert = Database['public']['Tables']['categories']['Insert'];
type DatabaseCategoryUpdate = Database['public']['Tables']['categories']['Update'];

// Raw database validation schemas - Pattern 2: Database-first validation
export const ProductAdminDatabaseSchema = z.object({
  // Core fields - MUST match products table Row exactly
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string().optional(), // Note: This comes from database view/join, optional when fetching directly from table
  category_id: z.string(),
  image_url: z.string().nullable(),
  is_available: z.boolean().nullable(),
  is_bundle: z.boolean().nullable(),
  is_pre_order: z.boolean().nullable(),
  is_weekly_special: z.boolean().nullable(),
  max_pre_order_quantity: z.number().nullable(),
  min_pre_order_quantity: z.number().nullable(),
  nutrition_info: z.any().nullable(), // Json type from database
  pre_order_available_date: z.string().nullable(),
  seasonal_availability: z.boolean().nullable(),
  sku: z.string().nullable(),
  stock_quantity: z.number().nullable(),
  tags: z.array(z.string()).nullable(),
  unit: z.string().nullable(),
  weight: z.number().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const CategoryAdminDatabaseSchema = z.object({
  // Core fields - MUST match categories table Row exactly
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  sort_order: z.number().nullable(),
  is_available: z.boolean().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

// Transformation schemas for API responses (Pattern 4: Transformation Schema Architecture)
export const ProductAdminTransformSchema = z.object({
  // Transformed for UI consumption
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().default(null),
  price: z.number().min(0),
  category: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().default(null),
    image_url: z.string().nullable().default(null),
    sort_order: z.number().default(0),
    is_available: z.boolean().default(true),
  }).nullable().default(null),
  image_url: z.string().nullable().default(null),
  is_available: z.boolean().default(true),
  is_bundle: z.boolean().default(false),
  is_pre_order: z.boolean().default(false),
  is_weekly_special: z.boolean().default(false),
  max_pre_order_quantity: z.number().nullable().default(null),
  min_pre_order_quantity: z.number().nullable().default(null),
  nutrition_info: z.any().nullable().default(null),
  pre_order_available_date: z.string().nullable().default(null),
  seasonal_availability: z.boolean().default(true),
  sku: z.string().nullable().default(null),
  stock_quantity: z.number().min(0).default(0),
  tags: z.array(z.string()).default([]),
  unit: z.string().nullable().default(null),
  weight: z.number().min(0).nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CategoryAdminTransformSchema = z.object({
  // Transformed for UI consumption
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  sort_order: z.number().default(0),
  is_available: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
});

// Create/Update request schemas with proper validation
export const ProductAdminCreateSchema = z.object({
  // Required fields for product creation
  name: z.string().min(1, 'Product name is required').max(255, 'Product name too long'),
  description: z.string().min(1, 'Product description is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  category: z.string().min(1, 'Category is required'), // Will be mapped to category_id
  category_id: z.string().min(1, 'Category ID is required'),
  
  // Optional fields with validation
  image_url: z.string().url('Invalid image URL').optional(),
  is_available: z.boolean().default(true),
  is_bundle: z.boolean().default(false),
  is_pre_order: z.boolean().default(false),
  is_weekly_special: z.boolean().default(false),
  max_pre_order_quantity: z.number().min(1).optional(),
  min_pre_order_quantity: z.number().min(1).optional(),
  nutrition_info: z.any().optional(),
  pre_order_available_date: z.string().datetime().optional(),
  seasonal_availability: z.boolean().default(true),
  sku: z.string().max(50, 'SKU too long').optional(),
  stock_quantity: z.number().min(0, 'Stock cannot be negative').default(0),
  tags: z.array(z.string().max(50, 'Tag too long')).default([]),
  unit: z.string().max(20, 'Unit too long').optional(),
  weight: z.number().min(0, 'Weight cannot be negative').optional(),
}).refine(
  (data) => {
    // Pre-order validation
    if (data.is_pre_order) {
      return data.min_pre_order_quantity && data.max_pre_order_quantity && 
             data.min_pre_order_quantity <= data.max_pre_order_quantity;
    }
    return true;
  },
  {
    message: 'Pre-order products must have valid min/max quantities',
    path: ['min_pre_order_quantity', 'max_pre_order_quantity'],
  }
);

export const ProductAdminUpdateSchema = z.object({
  // All fields optional for partial updates
  name: z.string().min(1, 'Product name is required').max(255, 'Product name too long').optional(),
  description: z.string().min(1, 'Product description is required').optional(),
  price: z.number().min(0.01, 'Price must be greater than 0').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  category_id: z.string().min(1, 'Category ID is required').optional(),
  image_url: z.string().url('Invalid image URL').optional(),
  is_available: z.boolean().optional(),
  is_bundle: z.boolean().optional(),
  is_pre_order: z.boolean().optional(),
  is_weekly_special: z.boolean().optional(),
  max_pre_order_quantity: z.number().min(1).optional(),
  min_pre_order_quantity: z.number().min(1).optional(),
  nutrition_info: z.any().optional(),
  pre_order_available_date: z.string().datetime().optional(),
  seasonal_availability: z.boolean().optional(),
  sku: z.string().max(50, 'SKU too long').optional(),
  stock_quantity: z.number().min(0, 'Stock cannot be negative').optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).optional(),
  unit: z.string().max(20, 'Unit too long').optional(),
  weight: z.number().min(0, 'Weight cannot be negative').optional(),
}).refine(
  (data) => {
    // Pre-order validation for updates
    if (data.is_pre_order === true) {
      return (data.min_pre_order_quantity !== undefined && data.max_pre_order_quantity !== undefined) &&
             (data.min_pre_order_quantity <= data.max_pre_order_quantity);
    }
    return true;
  },
  {
    message: 'Pre-order products must have valid min/max quantities',
    path: ['min_pre_order_quantity', 'max_pre_order_quantity'],
  }
);

export const CategoryAdminCreateSchema = z.object({
  // Required fields for category creation
  name: z.string().min(1, 'Category name is required').max(255, 'Category name too long'),
  
  // Optional fields with validation
  description: z.string().max(1000, 'Description too long').optional(),
  image_url: z.string().url('Invalid image URL').optional(),
  sort_order: z.number().min(0, 'Sort order cannot be negative').default(0),
  is_available: z.boolean().default(true),
});

export const CategoryAdminUpdateSchema = z.object({
  // All fields optional for partial updates
  name: z.string().min(1, 'Category name is required').max(255, 'Category name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  image_url: z.string().url('Invalid image URL').optional(),
  sort_order: z.number().min(0, 'Sort order cannot be negative').optional(),
  is_available: z.boolean().optional(),
});

// Bulk operation schemas
export const BulkStockUpdateSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  new_stock: z.number().min(0, 'Stock cannot be negative'),
  reason: z.string().max(255, 'Reason too long').optional(),
});

export const BulkPriceUpdateSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  new_price: z.number().min(0.01, 'Price must be greater than 0'),
  reason: z.string().max(255, 'Reason too long').optional(),
});

export const BulkOperationSchema = z.object({
  operations: z.array(z.union([BulkStockUpdateSchema, BulkPriceUpdateSchema])).min(1, 'At least one operation required'),
  apply_immediately: z.boolean().default(true),
  dry_run: z.boolean().default(false),
});

// Low stock/out of stock query schemas
export const LowStockQuerySchema = z.object({
  threshold: z.number().min(0, 'Threshold cannot be negative').default(10),
  include_unavailable: z.boolean().default(false),
  category_filter: z.string().optional(),
});

export const OutOfStockQuerySchema = z.object({
  include_unavailable: z.boolean().default(false),
  category_filter: z.string().optional(),
  include_pre_order: z.boolean().default(true),
});

// Enhanced transformation function with category population (Pattern 4)
export const transformProductAdmin = (
  rawProduct: unknown,
  categoriesData: unknown[] = []
): z.infer<typeof ProductAdminTransformSchema> => {
  // Step 1: Validate raw database data
  const validatedProduct = ProductAdminDatabaseSchema.parse(rawProduct);
  
  // Step 2: Find and validate category
  let categoryData = null;
  if (validatedProduct.category_id && categoriesData.length > 0) {
    const rawCategory = categoriesData.find(
      (cat: any) => cat.id === validatedProduct.category_id
    );
    
    if (rawCategory) {
      try {
        const validatedCategory = CategoryAdminDatabaseSchema.parse(rawCategory);
        categoryData = {
          id: validatedCategory.id,
          name: validatedCategory.name,
          description: validatedCategory.description,
          image_url: validatedCategory.image_url,
          sort_order: validatedCategory.sort_order ?? 0,
          is_available: validatedCategory.is_available ?? true,
        };
      } catch (categoryError) {
        console.warn('Invalid category data, using null:', categoryError);
        categoryData = null;
      }
    }
  }
  
  // Step 3: Transform to UI format with defaults
  const transformedProduct = {
    id: validatedProduct.id,
    name: validatedProduct.name,
    description: validatedProduct.description,
    price: validatedProduct.price,
    category: categoryData,
    image_url: validatedProduct.image_url,
    is_available: validatedProduct.is_available ?? true,
    is_bundle: validatedProduct.is_bundle ?? false,
    is_pre_order: validatedProduct.is_pre_order ?? false,
    is_weekly_special: validatedProduct.is_weekly_special ?? false,
    max_pre_order_quantity: validatedProduct.max_pre_order_quantity,
    min_pre_order_quantity: validatedProduct.min_pre_order_quantity,
    nutrition_info: validatedProduct.nutrition_info,
    pre_order_available_date: validatedProduct.pre_order_available_date,
    seasonal_availability: validatedProduct.seasonal_availability ?? true,
    sku: validatedProduct.sku,
    stock_quantity: validatedProduct.stock_quantity ?? 0,
    tags: validatedProduct.tags ?? [],
    unit: validatedProduct.unit,
    weight: validatedProduct.weight,
    created_at: validatedProduct.created_at!,
    updated_at: validatedProduct.updated_at!,
  };
  
  // Step 4: Final validation with transformation schema
  return ProductAdminTransformSchema.parse(transformedProduct);
};

export const transformCategoryAdmin = (rawCategory: unknown): z.infer<typeof CategoryAdminTransformSchema> => {
  // Step 1: Validate raw database data
  const validatedCategory = CategoryAdminDatabaseSchema.parse(rawCategory);
  
  // Step 2: Transform to UI format with defaults
  const transformedCategory = {
    id: validatedCategory.id,
    name: validatedCategory.name,
    description: validatedCategory.description,
    image_url: validatedCategory.image_url,
    sort_order: validatedCategory.sort_order ?? 0,
    is_available: validatedCategory.is_available ?? true,
    created_at: validatedCategory.created_at!,
    updated_at: validatedCategory.updated_at!,
  };
  
  // Step 3: Final validation with transformation schema
  return CategoryAdminTransformSchema.parse(transformedCategory);
};

// Database insert/update preparation functions
export const prepareProductForInsert = (
  createData: z.infer<typeof ProductAdminCreateSchema>
): DatabaseProductInsert => {
  return {
    name: createData.name,
    description: createData.description,
    price: createData.price,
    category: createData.category,
    category_id: createData.category_id,
    image_url: createData.image_url || null,
    is_available: createData.is_available,
    is_bundle: createData.is_bundle,
    is_pre_order: createData.is_pre_order,
    is_weekly_special: createData.is_weekly_special,
    max_pre_order_quantity: createData.max_pre_order_quantity || null,
    min_pre_order_quantity: createData.min_pre_order_quantity || null,
    nutrition_info: createData.nutrition_info || null,
    pre_order_available_date: createData.pre_order_available_date || null,
    seasonal_availability: createData.seasonal_availability,
    sku: createData.sku || null,
    stock_quantity: createData.stock_quantity,
    tags: createData.tags,
    unit: createData.unit || null,
    weight: createData.weight || null,
  };
};

export const prepareProductForUpdate = (
  updateData: z.infer<typeof ProductAdminUpdateSchema>
): DatabaseProductUpdate => {
  const update: DatabaseProductUpdate = {};
  
  // Only include defined fields
  if (updateData.name !== undefined) update.name = updateData.name;
  if (updateData.description !== undefined) update.description = updateData.description;
  if (updateData.price !== undefined) update.price = updateData.price;
  if (updateData.category !== undefined) update.category = updateData.category;
  if (updateData.category_id !== undefined) update.category_id = updateData.category_id;
  if (updateData.image_url !== undefined) update.image_url = updateData.image_url;
  if (updateData.is_available !== undefined) update.is_available = updateData.is_available;
  if (updateData.is_bundle !== undefined) update.is_bundle = updateData.is_bundle;
  if (updateData.is_pre_order !== undefined) update.is_pre_order = updateData.is_pre_order;
  if (updateData.is_weekly_special !== undefined) update.is_weekly_special = updateData.is_weekly_special;
  if (updateData.max_pre_order_quantity !== undefined) update.max_pre_order_quantity = updateData.max_pre_order_quantity;
  if (updateData.min_pre_order_quantity !== undefined) update.min_pre_order_quantity = updateData.min_pre_order_quantity;
  if (updateData.nutrition_info !== undefined) update.nutrition_info = updateData.nutrition_info;
  if (updateData.pre_order_available_date !== undefined) update.pre_order_available_date = updateData.pre_order_available_date;
  if (updateData.seasonal_availability !== undefined) update.seasonal_availability = updateData.seasonal_availability;
  if (updateData.sku !== undefined) update.sku = updateData.sku;
  if (updateData.stock_quantity !== undefined) update.stock_quantity = updateData.stock_quantity;
  if (updateData.tags !== undefined) update.tags = updateData.tags;
  if (updateData.unit !== undefined) update.unit = updateData.unit;
  if (updateData.weight !== undefined) update.weight = updateData.weight;
  
  // Always update timestamp
  update.updated_at = new Date().toISOString();
  
  return update;
};

export const prepareCategoryForInsert = (
  createData: z.infer<typeof CategoryAdminCreateSchema>
): DatabaseCategoryInsert => {
  return {
    name: createData.name,
    description: createData.description || null,
    image_url: createData.image_url || null,
    sort_order: createData.sort_order,
    is_available: createData.is_available,
  };
};

export const prepareCategoryForUpdate = (
  updateData: z.infer<typeof CategoryAdminUpdateSchema>
): DatabaseCategoryUpdate => {
  const update: DatabaseCategoryUpdate = {};
  
  // Only include defined fields
  if (updateData.name !== undefined) update.name = updateData.name;
  if (updateData.description !== undefined) update.description = updateData.description;
  if (updateData.image_url !== undefined) update.image_url = updateData.image_url;
  if (updateData.sort_order !== undefined) update.sort_order = updateData.sort_order;
  if (updateData.is_available !== undefined) update.is_available = updateData.is_available;
  
  // Always update timestamp
  update.updated_at = new Date().toISOString();
  
  return update;
};

// Type exports for use in services and hooks
export type ProductAdminDatabase = z.infer<typeof ProductAdminDatabaseSchema>;
export type CategoryAdminDatabase = z.infer<typeof CategoryAdminDatabaseSchema>;
export type ProductAdminTransform = z.infer<typeof ProductAdminTransformSchema>;
export type CategoryAdminTransform = z.infer<typeof CategoryAdminTransformSchema>;
export type ProductAdminCreate = z.infer<typeof ProductAdminCreateSchema>;
export type ProductAdminUpdate = z.infer<typeof ProductAdminUpdateSchema>;
export type CategoryAdminCreate = z.infer<typeof CategoryAdminCreateSchema>;
export type CategoryAdminUpdate = z.infer<typeof CategoryAdminUpdateSchema>;
export type BulkStockUpdate = z.infer<typeof BulkStockUpdateSchema>;
export type BulkPriceUpdate = z.infer<typeof BulkPriceUpdateSchema>;
export type BulkOperation = z.infer<typeof BulkOperationSchema>;
export type LowStockQuery = z.infer<typeof LowStockQuerySchema>;
export type OutOfStockQuery = z.infer<typeof OutOfStockQuerySchema>;