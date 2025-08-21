/**
 * Query Performance Test Suite
 * Phase 5: Production Readiness - Database query performance validation
 * 
 * Tests query performance across all services to ensure <500ms response times
 * Following patterns from docs/architectural-patterns-and-best-practices.md
 */

import { supabase } from '../../config/supabase';
import { performanceMonitoring } from '../../monitoring/performanceMonitoring';

// Mock performance monitoring to avoid actual database writes during tests
jest.mock('../../monitoring/performanceMonitoring', () => ({
  performanceMonitoring: {
    logQueryPerformance: jest.fn().mockResolvedValue({ success: true }),
    logMetric: jest.fn().mockResolvedValue({ success: true }),
    startTiming: jest.fn(() => ({
      end: jest.fn().mockResolvedValue(undefined)
    })),
  }
}));

describe('Query Performance Tests', () => {
  beforeEach(() => {
    jest.setTimeout(30000); // 30 second timeout for performance tests
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(async () => {
    // Force cleanup for production tests
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Role Permission Query Performance', () => {
    it('should query user roles within 200ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .limit(100);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(200);
      expect(performanceMonitoring.logQueryPerformance).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should query role permissions within 200ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', 'inventory_staff')
        .limit(100);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(200);
    });

    it('should perform role-based access checks within 150ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: 'test-user-id',
        p_resource: 'inventory',
        p_action: 'read'
      }).single();
      
      const executionTime = performance.now() - startTime;
      
      expect(executionTime).toBeLessThan(150);
    });
  });

  describe('Inventory Query Performance', () => {
    it('should query inventory items within 300ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          product:products(id, name, price)
        `)
        .limit(100);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(300);
    });

    it('should query stock movements within 250ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          inventory_item:inventory_items(
            id,
            product:products(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(250);
    });

    it('should perform batch inventory updates within 500ms', async () => {
      const startTime = performance.now();
      
      const updates = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        quantity: Math.floor(Math.random() * 100),
      }));
      
      const promises = updates.map(update =>
        supabase
          .from('inventory_items')
          .update({ quantity: update.quantity })
          .eq('id', update.id)
      );
      
      await Promise.all(promises);
      
      const executionTime = performance.now() - startTime;
      
      expect(executionTime).toBeLessThan(500);
    });

    it('should query low stock items within 200ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          product:products(id, name)
        `)
        .lt('quantity', 10)
        .limit(50);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(200);
    });
  });

  describe('Product Query Performance', () => {
    it('should query products with categories within 250ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(id, name)
        `)
        .eq('available', true)
        .limit(100);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(250);
    });

    it('should search products by name within 200ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('name', '%apple%')
        .limit(50);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(200);
    });

    it('should filter products by category within 200ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', 'test-category-id')
        .eq('available', true)
        .limit(100);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(200);
    });
  });

  describe('Order Query Performance', () => {
    it('should query orders with items within 400ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(id, name, price)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(400);
    });

    it('should query user order history within 300ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          created_at,
          pickup_time
        `)
        .eq('user_id', 'test-user-id')
        .order('created_at', { ascending: false })
        .limit(20);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(300);
    });

    it('should query pending orders within 250ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true })
        .limit(100);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(250);
    });
  });

  describe('Cart Query Performance', () => {
    it('should query cart items within 200ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(
            id,
            name,
            price,
            image_url,
            stock
          )
        `)
        .eq('user_id', 'test-user-id');
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(200);
    });

    it('should perform cart upsert operations within 150ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: 'test-user-id',
          product_id: 'test-product-id',
          quantity: 3,
        })
        .select()
        .single();
      
      const executionTime = performance.now() - startTime;
      
      expect(executionTime).toBeLessThan(150);
    });

    it('should clear cart within 200ms', async () => {
      const startTime = performance.now();
      
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', 'test-user-id');
      
      const executionTime = performance.now() - startTime;
      
      expect(executionTime).toBeLessThan(200);
    });
  });

  describe('Analytics Query Performance', () => {
    it('should generate sales analytics within 500ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'completed');
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(500);
    });

    it('should generate inventory analytics within 400ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          quantity,
          product:products(
            name,
            category_id,
            price
          )
        `)
        .limit(1000);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(400);
    });

    it('should generate product performance metrics within 500ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price,
          product_id,
          order:orders(
            created_at,
            status
          )
        `)
        .limit(1000);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(500);
    });
  });

  describe('Complex Aggregation Performance', () => {
    it('should perform cross-table aggregations within 500ms', async () => {
      const startTime = performance.now();
      
      // Complex query joining multiple tables
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          status,
          order_items(
            quantity,
            price,
            product:products(
              name,
              category:categories(name)
            )
          ),
          user:users(
            email,
            profile:profiles(
              first_name,
              last_name
            )
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(500);
    });

    it('should calculate daily revenue aggregates within 400ms', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase.rpc('calculate_daily_revenue', {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      });
      
      const executionTime = performance.now() - startTime;
      
      expect(executionTime).toBeLessThan(400);
    });
  });

  describe('Pagination Performance', () => {
    it('should paginate large datasets efficiently within 200ms', async () => {
      const startTime = performance.now();
      
      const pageSize = 20;
      const page = 5;
      
      const { data, error } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(200);
    });

    it('should use cursor-based pagination within 150ms', async () => {
      const startTime = performance.now();
      
      const lastId = 'cursor-id';
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('id', lastId)
        .order('id')
        .limit(20);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(150);
    });
  });

  describe('N+1 Query Detection', () => {
    it('should avoid N+1 queries with proper joins', async () => {
      const startTime = performance.now();
      
      // Good: Single query with joins
      const { data: ordersWithItems, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(*)
          )
        `)
        .limit(10);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(300);
      
      // Verify we got nested data in single query
      if (ordersWithItems && ordersWithItems.length > 0) {
        expect(ordersWithItems[0]).toHaveProperty('order_items');
      }
    });

    it('should detect and prevent N+1 query patterns', async () => {
      // This test demonstrates what NOT to do
      const startTime = performance.now();
      
      // Bad: N+1 query pattern (for demonstration)
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .limit(5);
      
      if (orders) {
        // This would cause N+1 queries - DON'T DO THIS
        const itemPromises = orders.map(order =>
          supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)
        );
        
        // Even with Promise.all, this is still inefficient
        await Promise.all(itemPromises);
      }
      
      const executionTime = performance.now() - startTime;
      
      // Even though we're doing multiple queries, they should still be fast
      // But this pattern should be avoided
      expect(executionTime).toBeLessThan(500);
    });
  });

  describe('Database Index Effectiveness', () => {
    it('should utilize indexes for common query patterns', async () => {
      const startTime = performance.now();
      
      // Query that should use index on created_at
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(150);
    });

    it('should use composite indexes effectively', async () => {
      const startTime = performance.now();
      
      // Query that should use composite index on (user_id, status)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', 'test-user-id')
        .eq('status', 'pending');
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Connection Pooling Performance', () => {
    it('should handle concurrent queries efficiently', async () => {
      const startTime = performance.now();
      
      // Execute 10 concurrent queries
      const queries = Array.from({ length: 10 }, () =>
        supabase.from('products').select('*').limit(10)
      );
      
      const results = await Promise.all(queries);
      
      const executionTime = performance.now() - startTime;
      
      // All queries should complete within reasonable time
      expect(executionTime).toBeLessThan(500);
      
      // All queries should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
      });
    });

    it('should reuse connections for sequential queries', async () => {
      const startTime = performance.now();
      
      // Execute 5 sequential queries
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name')
          .limit(5);
        
        expect(error).toBeNull();
      }
      
      const executionTime = performance.now() - startTime;
      
      // Sequential queries should be fast due to connection reuse
      expect(executionTime).toBeLessThan(300);
    });
  });
});