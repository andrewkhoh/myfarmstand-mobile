#!/usr/bin/env node

/**
 * Database Schema Introspection Script
 * Compares current database schema with project requirements
 * Generates migration SQL
 */

const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(supabaseUrl, supabaseKey);

// Required schema from project
const REQUIRED_TABLES = {
  // Core tables
  users: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      email: 'text UNIQUE NOT NULL',
      name: 'text NOT NULL',
      phone: 'text',
      address: 'text',
      role: "text DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin', 'manager'))",
      created_at: 'timestamptz DEFAULT now()',
      updated_at: 'timestamptz DEFAULT now()'
    }
  },
  
  products: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      name: 'text NOT NULL',
      description: 'text',
      price: 'decimal(10,2) NOT NULL CHECK (price >= 0)',
      category_id: 'uuid REFERENCES categories(id)',
      image_url: 'text',
      stock_quantity: 'integer DEFAULT 0 CHECK (stock_quantity >= 0)',
      is_available: 'boolean DEFAULT true',
      is_pre_order: 'boolean DEFAULT false',
      pre_order_available_date: 'date',
      min_pre_order_quantity: 'integer',
      created_at: 'timestamptz DEFAULT now()',
      updated_at: 'timestamptz DEFAULT now()'
    }
  },

  categories: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      name: 'text UNIQUE NOT NULL',
      description: 'text',
      image_url: 'text',
      is_active: 'boolean DEFAULT true',
      display_order: 'integer DEFAULT 0',
      created_at: 'timestamptz DEFAULT now()',
      updated_at: 'timestamptz DEFAULT now()'
    }
  },

  orders: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      user_id: 'uuid REFERENCES users(id)',
      status: "text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'completed', 'cancelled'))",
      total_amount: 'decimal(10,2) NOT NULL',
      tax_amount: 'decimal(10,2) DEFAULT 0',
      customer_name: 'text NOT NULL',
      customer_email: 'text NOT NULL',
      customer_phone: 'text NOT NULL',
      pickup_date: 'date NOT NULL',
      pickup_time: 'time NOT NULL',
      special_instructions: 'text',
      created_at: 'timestamptz DEFAULT now()',
      updated_at: 'timestamptz DEFAULT now()'
    }
  },

  order_items: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      order_id: 'uuid REFERENCES orders(id) ON DELETE CASCADE',
      product_id: 'uuid REFERENCES products(id)',
      quantity: 'integer NOT NULL CHECK (quantity > 0)',
      unit_price: 'decimal(10,2) NOT NULL',
      total_price: 'decimal(10,2) NOT NULL',
      created_at: 'timestamptz DEFAULT now()'
    }
  },

  cart_items: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      user_id: 'uuid REFERENCES users(id) ON DELETE CASCADE',
      product_id: 'uuid REFERENCES products(id)',
      quantity: 'integer NOT NULL CHECK (quantity > 0)',
      created_at: 'timestamptz DEFAULT now()',
      updated_at: 'timestamptz DEFAULT now()'
    }
  },

  // Kiosk tables
  kiosk_sessions: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      kiosk_id: 'text NOT NULL',
      user_id: 'uuid REFERENCES users(id)',
      started_at: 'timestamptz DEFAULT now()',
      ended_at: 'timestamptz',
      is_active: 'boolean DEFAULT true'
    }
  },

  staff_pins: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      user_id: 'uuid REFERENCES users(id) UNIQUE',
      pin_hash: 'text NOT NULL',
      created_at: 'timestamptz DEFAULT now()',
      updated_at: 'timestamptz DEFAULT now()'
    }
  },

  // Marketing tables
  campaigns: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      name: 'text NOT NULL',
      description: 'text',
      start_date: 'date NOT NULL',
      end_date: 'date NOT NULL',
      discount_type: "text CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'bundle'))",
      discount_value: 'decimal(10,2)',
      is_active: 'boolean DEFAULT true',
      created_at: 'timestamptz DEFAULT now()',
      updated_at: 'timestamptz DEFAULT now()'
    }
  },

  product_bundles: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      name: 'text NOT NULL',
      description: 'text',
      bundle_price: 'decimal(10,2) NOT NULL',
      is_active: 'boolean DEFAULT true',
      created_at: 'timestamptz DEFAULT now()'
    }
  },

  bundle_items: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      bundle_id: 'uuid REFERENCES product_bundles(id) ON DELETE CASCADE',
      product_id: 'uuid REFERENCES products(id)',
      quantity: 'integer DEFAULT 1'
    }
  },

  // Analytics tables
  customer_analytics: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      user_id: 'uuid REFERENCES users(id)',
      total_orders: 'integer DEFAULT 0',
      total_spent: 'decimal(10,2) DEFAULT 0',
      average_order_value: 'decimal(10,2) DEFAULT 0',
      last_order_date: 'date',
      favorite_category: 'text',
      calculated_at: 'timestamptz DEFAULT now()'
    }
  },

  inventory_movements: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      product_id: 'uuid REFERENCES products(id)',
      movement_type: "text CHECK (movement_type IN ('in', 'out', 'adjustment', 'return'))",
      quantity: 'integer NOT NULL',
      reason: 'text',
      reference_id: 'uuid',
      reference_type: "text CHECK (reference_type IN ('order', 'manual', 'return', 'expiry'))",
      created_by: 'uuid REFERENCES users(id)',
      created_at: 'timestamptz DEFAULT now()'
    }
  },

  // Role management
  user_permissions: {
    columns: {
      id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
      user_id: 'uuid REFERENCES users(id)',
      permission: 'text NOT NULL',
      granted_by: 'uuid REFERENCES users(id)',
      granted_at: 'timestamptz DEFAULT now()'
    }
  }
};

async function introspectDatabase() {
  console.log('🔍 Introspecting current database schema...\n');
  
  try {
    // Query to get all tables and columns from information_schema
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info', {});

    if (tablesError) {
      // Fallback: Try direct query if RPC doesn't exist
      console.log('ℹ️  RPC function not found, using fallback method...');
      
      // We'll need to check tables individually
      const existingTables = {};
      
      for (const tableName of Object.keys(REQUIRED_TABLES)) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (!error) {
          existingTables[tableName] = true;
          console.log(`✅ Table exists: ${tableName}`);
        } else if (error.code === '42P01') {
          console.log(`❌ Table missing: ${tableName}`);
        } else {
          console.log(`⚠️  Error checking ${tableName}: ${error.message}`);
        }
      }
      
      return existingTables;
    }

    return tables;
  } catch (error) {
    console.error('Error introspecting database:', error);
    return {};
  }
}

async function generateMigrationSQL(existingTables) {
  console.log('\n📝 Generating migration SQL...\n');
  
  let sql = `-- MyFarmstand Database Migration Script
-- Generated: ${new Date().toISOString()}
-- This script creates missing tables and adds required policies

`;

  // Create missing tables
  for (const [tableName, tableSchema] of Object.entries(REQUIRED_TABLES)) {
    if (!existingTables[tableName]) {
      sql += `-- Create ${tableName} table\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      
      const columns = Object.entries(tableSchema.columns)
        .map(([colName, colDef]) => `  ${colName} ${colDef}`)
        .join(',\n');
      
      sql += columns;
      sql += `\n);\n\n`;
      
      // Add indexes
      if (tableName === 'products') {
        sql += `CREATE INDEX idx_products_category ON products(category_id);\n`;
        sql += `CREATE INDEX idx_products_available ON products(is_available);\n\n`;
      }
      if (tableName === 'orders') {
        sql += `CREATE INDEX idx_orders_user ON orders(user_id);\n`;
        sql += `CREATE INDEX idx_orders_status ON orders(status);\n`;
        sql += `CREATE INDEX idx_orders_pickup ON orders(pickup_date, pickup_time);\n\n`;
      }
      if (tableName === 'cart_items') {
        sql += `CREATE INDEX idx_cart_user ON cart_items(user_id);\n\n`;
      }
    }
  }

  // Add RLS policies
  sql += generateRLSPolicies();
  
  // Add helper functions
  sql += generateHelperFunctions();
  
  return sql;
}

function generateRLSPolicies() {
  return `
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Staff can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view available products" ON products
  FOR SELECT USING (is_available = true);

CREATE POLICY "Staff can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

-- Orders policies
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own orders" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Staff can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

-- Order items policies
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

-- Cart items policies
CREATE POLICY "Users can manage their own cart" ON cart_items
  FOR ALL USING (user_id = auth.uid());

-- Kiosk policies
CREATE POLICY "Kiosk sessions viewable by staff" ON kiosk_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Staff pins only viewable by admins" ON staff_pins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Marketing policies
CREATE POLICY "Active campaigns are public" ON campaigns
  FOR SELECT USING (is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);

CREATE POLICY "Staff can manage campaigns" ON campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Active bundles are public" ON product_bundles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage bundles" ON product_bundles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Bundle items follow bundle visibility" ON bundle_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM product_bundles 
      WHERE product_bundles.id = bundle_items.bundle_id 
      AND product_bundles.is_active = true
    )
  );

-- Analytics policies
CREATE POLICY "Users can view their own analytics" ON customer_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Staff can view all analytics" ON customer_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Staff can view inventory movements" ON inventory_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin', 'manager')
    )
  );

-- Permissions policies
CREATE POLICY "Admins can manage permissions" ON user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

`;
}

function generateHelperFunctions() {
  return `
-- Helper Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_pins_updated_at BEFORE UPDATE ON staff_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate customer analytics
CREATE OR REPLACE FUNCTION calculate_customer_analytics(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO customer_analytics (
    user_id,
    total_orders,
    total_spent,
    average_order_value,
    last_order_date,
    favorite_category
  )
  SELECT 
    p_user_id,
    COUNT(o.id),
    COALESCE(SUM(o.total_amount), 0),
    COALESCE(AVG(o.total_amount), 0),
    MAX(o.created_at::date),
    (
      SELECT c.name
      FROM categories c
      JOIN products p ON p.category_id = c.id
      JOIN order_items oi ON oi.product_id = p.id
      JOIN orders o2 ON o2.id = oi.order_id
      WHERE o2.user_id = p_user_id
      GROUP BY c.name
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  FROM orders o
  WHERE o.user_id = p_user_id
    AND o.status = 'completed'
  ON CONFLICT (user_id) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_spent = EXCLUDED.total_spent,
    average_order_value = EXCLUDED.average_order_value,
    last_order_date = EXCLUDED.last_order_date,
    favorite_category = EXCLUDED.favorite_category,
    calculated_at = now();
END;
$$ language 'plpgsql';

-- Function to check stock availability
CREATE OR REPLACE FUNCTION check_stock_availability(p_product_id uuid, p_quantity integer)
RETURNS boolean AS $$
DECLARE
  v_stock integer;
BEGIN
  SELECT stock_quantity INTO v_stock
  FROM products
  WHERE id = p_product_id;
  
  RETURN v_stock >= p_quantity;
END;
$$ language 'plpgsql';

-- Function to update stock after order
CREATE OR REPLACE FUNCTION update_stock_after_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    -- Decrease stock for all items in the order
    UPDATE products p
    SET stock_quantity = stock_quantity - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND p.id = oi.product_id;
      
    -- Record inventory movements
    INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, reference_id, reference_type, created_by)
    SELECT 
      oi.product_id,
      'out',
      -oi.quantity,
      'Order confirmed',
      NEW.id,
      'order',
      NEW.user_id
    FROM order_items oi
    WHERE oi.order_id = NEW.id;
  END IF;
  
  IF NEW.status = 'cancelled' AND OLD.status IN ('confirmed', 'ready') THEN
    -- Restore stock for cancelled orders
    UPDATE products p
    SET stock_quantity = stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND p.id = oi.product_id;
      
    -- Record inventory movements
    INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, reference_id, reference_type, created_by)
    SELECT 
      oi.product_id,
      'in',
      oi.quantity,
      'Order cancelled',
      NEW.id,
      'order',
      NEW.user_id
    FROM order_items oi
    WHERE oi.order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_stock_after_order
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_order();

-- RPC function to get table info (for introspection)
CREATE OR REPLACE FUNCTION get_table_info()
RETURNS TABLE(table_name text, column_name text, data_type text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    c.column_name::text,
    c.data_type::text
  FROM information_schema.tables t
  JOIN information_schema.columns c ON t.table_name = c.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name, c.ordinal_position;
END;
$$ language 'plpgsql' SECURITY DEFINER;

`;
}

async function scanProjectSchemas() {
  console.log('\n📂 Scanning project for schema definitions...\n');
  
  const schemaFiles = [
    '../src/config/supabase.ts',
    '../src/types/database.generated.ts',
    '../src/schemas/*.schema.ts'
  ];
  
  const foundSchemas = new Set();
  
  // Check for schema files
  const schemasDir = path.join(__dirname, '../src/schemas');
  if (fs.existsSync(schemasDir)) {
    const files = fs.readdirSync(schemasDir);
    files.forEach(file => {
      if (file.endsWith('.schema.ts')) {
        const schemaName = file.replace('.schema.ts', '');
        foundSchemas.add(schemaName);
        console.log(`✅ Found schema: ${schemaName}`);
      }
    });
  }
  
  // Check for database types
  const dbTypesPath = path.join(__dirname, '../src/types/database.generated.ts');
  if (fs.existsSync(dbTypesPath)) {
    console.log('✅ Found database.generated.ts');
  } else {
    console.log('⚠️  Missing database.generated.ts - run Supabase type generation');
  }
  
  return foundSchemas;
}

async function main() {
  console.log('🚀 MyFarmstand Database Schema Tool\n');
  console.log('=====================================\n');
  
  // Check if Supabase is accessible
  console.log('🔗 Connecting to Supabase...');
  console.log(`URL: ${supabaseUrl}\n`);
  
  // Introspect current database
  const existingTables = await introspectDatabase();
  
  // Update todo
  console.log('\n✅ Database introspection complete');
  
  // Scan project schemas
  const projectSchemas = await scanProjectSchemas();
  
  // Generate migration SQL
  const migrationSQL = await generateMigrationSQL(existingTables);
  
  // Save migration file
  const migrationPath = path.join(__dirname, '../database/migration.sql');
  fs.writeFileSync(migrationPath, migrationSQL);
  
  console.log(`\n✅ Migration SQL saved to: database/migration.sql`);
  console.log('\n📋 Next steps:');
  console.log('1. Review the migration.sql file');
  console.log('2. Run it in Supabase SQL Editor');
  console.log('3. Generate TypeScript types: npm run generate-types');
  console.log('4. Test the application');
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`- Required tables: ${Object.keys(REQUIRED_TABLES).length}`);
  console.log(`- Existing tables: ${Object.keys(existingTables).length}`);
  console.log(`- Missing tables: ${Object.keys(REQUIRED_TABLES).length - Object.keys(existingTables).length}`);
  console.log(`- Project schemas found: ${projectSchemas.size}`);
}

main().catch(console.error);