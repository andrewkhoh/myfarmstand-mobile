/**
 * ✅ DATABASE TYPE INTEGRATION
 * Single source of truth for database types
 * Use these types when creating new schemas to ensure alignment
 */

import type { Database } from '../../types/database.generated';

// ✅ Extract database table types
export type DbProduct = Database['public']['Tables']['products']['Row'];
export type DbCategory = Database['public']['Tables']['categories']['Row'];
export type DbOrder = Database['public']['Tables']['orders']['Row'];
export type DbOrderItem = Database['public']['Tables']['order_items']['Row'];
export type DbKioskSession = Database['public']['Tables']['kiosk_sessions']['Row'];
export type DbStaffPin = Database['public']['Tables']['staff_pins']['Row'];

// ✅ Helper to validate schema against database type
export type ValidateDbSchema<TSchema, TDbType> = {
  [K in keyof TDbType]: K extends keyof TSchema ? TSchema[K] : never;
};

// ✅ Field selector helper (for future use)
export type DbFields<T extends keyof Database['public']['Tables']> = 
  keyof Database['public']['Tables'][T]['Row'];

// ✅ Type-safe field selection (future enhancement)
export const createFieldSelector = <T extends keyof Database['public']['Tables']>(
  tableName: T
) => {
  return {
    select: <K extends DbFields<T>[]>(...fields: K): string => {
      return fields.join(', ');
    }
  };
};

// ✅ Usage examples:
// const productSelector = createFieldSelector('products');
// const fields = productSelector.select('id', 'name', 'category_id'); // Type-safe!