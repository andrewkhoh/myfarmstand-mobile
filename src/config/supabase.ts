import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Supabase configuration
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Persist session in secure storage
    persistSession: true,
    // Detect session from URL (useful for deep linking)
    detectSessionInUrl: false,
  },
  // Configure realtime options
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database table names (centralized for consistency)
export const TABLES = {
  USERS: 'users',
  PRODUCTS: 'products', 
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  CART_ITEMS: 'cart_items',
} as const;

// Database types (will be generated from Supabase schema)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          address: string | null;
          role: 'customer' | 'staff' | 'admin' | 'manager';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          role?: 'customer' | 'staff' | 'admin' | 'manager';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          role?: 'customer' | 'staff' | 'admin' | 'manager';
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          category: string;
          image_url: string | null;
          stock_quantity: number;
          is_available: boolean;
          is_pre_order: boolean;
          pre_order_available_date: string | null;
          min_pre_order_quantity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          price: number;
          category: string;
          image_url?: string | null;
          stock_quantity?: number;
          is_available?: boolean;
          is_pre_order?: boolean;
          pre_order_available_date?: string | null;
          min_pre_order_quantity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          category?: string;
          image_url?: string | null;
          stock_quantity?: number;
          is_available?: boolean;
          is_pre_order?: boolean;
          pre_order_available_date?: string | null;
          min_pre_order_quantity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
          total_amount: number;
          tax_amount: number;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          pickup_date: string;
          pickup_time: string;
          special_instructions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
          total_amount: number;
          tax_amount: number;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          pickup_date: string;
          pickup_time: string;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
          total_amount?: number;
          tax_amount?: number;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          pickup_date?: string;
          pickup_time?: string;
          special_instructions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
