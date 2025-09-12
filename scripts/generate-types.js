#!/usr/bin/env node

/**
 * Generate TypeScript types from Supabase database
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load secrets
const secretsPath = path.join(__dirname, '../temp-secrets.json');
const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));

const supabaseUrl = secrets.BUILD_SUPABASE_URL || secrets.SUPABASE_URL;
const supabaseKey = secrets.BUILD_SUPABASE_ANON_KEY || secrets.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in temp-secrets.json');
  process.exit(1);
}

// Extract project ID from URL
const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectId) {
  console.error('❌ Could not extract project ID from Supabase URL');
  process.exit(1);
}

console.log('🔄 Generating TypeScript types from Supabase...');
console.log(`📦 Project ID: ${projectId}`);

// Generate types using Supabase CLI
const outputPath = path.join(__dirname, '../src/types/database.generated.ts');

// Create types directory if it doesn't exist
const typesDir = path.dirname(outputPath);
if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}

// Use curl to fetch the types from Supabase API
const apiUrl = `${supabaseUrl}/rest/v1/`;
const typeGenUrl = `https://api.supabase.com/v1/projects/${projectId}/types/typescript`;

// Alternative: Generate types from the OpenAPI spec
const openApiUrl = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;

console.log('🔍 Fetching database schema...');

// Try using npx supabase gen types
exec(`npx supabase gen types typescript --project-id ${projectId}`, (error, stdout, stderr) => {
  if (error) {
    console.log('⚠️  Supabase CLI not available, generating basic types...');
    
    // Fallback: Generate basic types from our known schema
    generateBasicTypes(outputPath);
    return;
  }
  
  if (stderr) {
    console.error('⚠️  Warning:', stderr);
  }
  
  // Write the generated types
  fs.writeFileSync(outputPath, stdout);
  console.log('✅ Types generated successfully!');
  console.log(`📁 Output: ${outputPath}`);
});

function generateBasicTypes(outputPath) {
  const basicTypes = `// Generated TypeScript types for MyFarmstand Database
// Generated: ${new Date().toISOString()}

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
        Insert: Partial<Database['public']['Tables']['users']['Row']>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          category_id: string | null;
          image_url: string | null;
          stock_quantity: number;
          is_available: boolean;
          is_pre_order: boolean;
          pre_order_available_date: string | null;
          min_pre_order_quantity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['products']['Row']>;
        Update: Partial<Database['public']['Tables']['products']['Row']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          is_available: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['categories']['Row']>;
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
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
        Insert: Partial<Database['public']['Tables']['orders']['Row']>;
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
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
        Insert: Partial<Database['public']['Tables']['order_items']['Row']>;
        Update: Partial<Database['public']['Tables']['order_items']['Row']>;
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
        Insert: Partial<Database['public']['Tables']['cart_items']['Row']>;
        Update: Partial<Database['public']['Tables']['cart_items']['Row']>;
      };
      kiosk_sessions: {
        Row: {
          id: string;
          kiosk_id: string;
          user_id: string | null;
          started_at: string;
          ended_at: string | null;
          is_active: boolean;
        };
        Insert: Partial<Database['public']['Tables']['kiosk_sessions']['Row']>;
        Update: Partial<Database['public']['Tables']['kiosk_sessions']['Row']>;
      };
      staff_pins: {
        Row: {
          id: string;
          user_id: string;
          pin_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['staff_pins']['Row']>;
        Update: Partial<Database['public']['Tables']['staff_pins']['Row']>;
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          discount_type: 'percentage' | 'fixed' | 'bogo' | 'bundle' | null;
          discount_value: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['campaigns']['Row']>;
        Update: Partial<Database['public']['Tables']['campaigns']['Row']>;
      };
      product_bundles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          bundle_price: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['product_bundles']['Row']>;
        Update: Partial<Database['public']['Tables']['product_bundles']['Row']>;
      };
      bundle_items: {
        Row: {
          id: string;
          bundle_id: string;
          product_id: string;
          quantity: number;
        };
        Insert: Partial<Database['public']['Tables']['bundle_items']['Row']>;
        Update: Partial<Database['public']['Tables']['bundle_items']['Row']>;
      };
      customer_analytics: {
        Row: {
          id: string;
          user_id: string;
          total_orders: number;
          total_spent: number;
          average_order_value: number;
          last_order_date: string | null;
          favorite_category: string | null;
          calculated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['customer_analytics']['Row']>;
        Update: Partial<Database['public']['Tables']['customer_analytics']['Row']>;
      };
      inventory_movements: {
        Row: {
          id: string;
          product_id: string;
          movement_type: 'in' | 'out' | 'adjustment' | 'return';
          quantity: number;
          reason: string | null;
          reference_id: string | null;
          reference_type: 'order' | 'manual' | 'return' | 'expiry' | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['inventory_movements']['Row']>;
        Update: Partial<Database['public']['Tables']['inventory_movements']['Row']>;
      };
      user_permissions: {
        Row: {
          id: string;
          user_id: string;
          permission: string;
          granted_by: string;
          granted_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_permissions']['Row']>;
        Update: Partial<Database['public']['Tables']['user_permissions']['Row']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_customer_analytics: {
        Args: { p_user_id: string };
        Returns: void;
      };
      check_stock_availability: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: boolean;
      };
      get_table_info: {
        Args: {};
        Returns: {
          table_name: string;
          column_name: string;
          data_type: string;
        }[];
      };
    };
    Enums: {
      user_role: 'customer' | 'staff' | 'admin' | 'manager';
      order_status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
      movement_type: 'in' | 'out' | 'adjustment' | 'return';
      reference_type: 'order' | 'manual' | 'return' | 'expiry';
      discount_type: 'percentage' | 'fixed' | 'bogo' | 'bundle';
    };
  };
}

// Export type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
`;

  fs.writeFileSync(outputPath, basicTypes);
  console.log('✅ Basic types generated successfully!');
  console.log(`📁 Output: ${outputPath}`);
  console.log('\n⚠️  Note: These are basic types. For full type safety, install Supabase CLI:');
  console.log('   npm install -g supabase');
  console.log('   Then run: npm run generate-types');
}