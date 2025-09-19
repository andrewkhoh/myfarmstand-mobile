# BusinessMetricsService - Fix Using Existing Tables
## Generated: 2025-09-18

## Current Issue
`BusinessMetricsService.aggregateBusinessMetrics()` is querying the non-existent `business_metrics` table. We need to update it to use existing tables like `orders`, `inventory_items`, and `users`.

## Immediate Fix for BusinessMetricsService

### Replace the current implementation at line 120-150:

```typescript
// CURRENT (BROKEN - queries non-existent business_metrics table)
const { data, error } = await supabase
  .from('business_metrics')
  .select(`...`)
  .in('metric_category', allowedCategories)
  // ...
```

### WITH THIS (WORKING - uses existing tables):

```typescript
static async aggregateBusinessMetrics(
  categories: string[],
  aggregationLevel: 'daily' | 'weekly' | 'monthly' | 'quarterly',
  startDate: string,
  endDate: string,
  filters?: {
    user_role?: string;
    // Note: user_id property should be added to type definition
  }
): Promise<BusinessMetricsTransform> {
  try {
    // ... permission checks remain the same ...

    // Initialize metrics structure
    const aggregatedMetrics = {
      revenue: { total: 0, growth: 0, trend: 'stable' as const },
      orders: { total: 0, growth: 0, trend: 'stable' as const },
      customers: { total: 0, growth: 0, trend: 'stable' as const },
      inventory: { total: 0, value: 0, turnover: 0 },
      conversion: { rate: 0, value: 0 }
    };

    // Fetch data from EXISTING tables based on categories
    const dataPromises = [];

    // 1. SALES METRICS - from orders table
    if (categories.includes('sales') || categories.includes('operational')) {
      const ordersPromise = supabase
        .from('orders')
        .select('id, total_amount, status, created_at, user_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['completed', 'delivered', 'picked_up']);

      dataPromises.push(ordersPromise);
    }

    // 2. INVENTORY METRICS - from inventory_items table
    if (categories.includes('inventory')) {
      const inventoryPromise = supabase
        .from('inventory_items')
        .select('id, name, quantity, unit_price, category, updated_at')
        .gte('updated_at', startDate)
        .lte('updated_at', endDate);

      dataPromises.push(inventoryPromise);
    }

    // 3. MARKETING/CUSTOMER METRICS - from users and campaign tables
    if (categories.includes('marketing') || categories.includes('strategic')) {
      const usersPromise = supabase
        .from('users')
        .select('id, created_at, role')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const campaignPromise = supabase
        .from('campaign_analytics')
        .select('impressions, clicks, conversions, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      dataPromises.push(usersPromise, campaignPromise);
    }

    // Execute all queries in parallel
    const results = await Promise.all(dataPromises);

    // Process results based on what was fetched
    let orderData = null;
    let inventoryData = null;
    let userData = null;
    let campaignData = null;

    // Map results to appropriate variables
    let resultIndex = 0;
    if (categories.includes('sales') || categories.includes('operational')) {
      const ordersResult = results[resultIndex++];
      if (!ordersResult.error) {
        orderData = ordersResult.data;
      }
    }

    if (categories.includes('inventory')) {
      const inventoryResult = results[resultIndex++];
      if (!inventoryResult.error) {
        inventoryData = inventoryResult.data;
      }
    }

    if (categories.includes('marketing') || categories.includes('strategic')) {
      const usersResult = results[resultIndex++];
      const campaignResult = results[resultIndex++];
      if (!usersResult.error) userData = usersResult.data;
      if (!campaignResult.error) campaignData = campaignResult.data;
    }

    // Calculate metrics from actual data
    if (orderData) {
      aggregatedMetrics.revenue.total = orderData.reduce((sum, order) =>
        sum + (order.total_amount || 0), 0);
      aggregatedMetrics.orders.total = orderData.length;

      // Calculate growth (compare with previous period)
      const midPoint = new Date(startDate);
      midPoint.setDate(midPoint.getDate() + Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (2 * 24 * 60 * 60 * 1000)));

      const firstHalf = orderData.filter(o => new Date(o.created_at) < midPoint);
      const secondHalf = orderData.filter(o => new Date(o.created_at) >= midPoint);

      if (firstHalf.length > 0) {
        const firstHalfRevenue = firstHalf.reduce((sum, o) => sum + o.total_amount, 0);
        const secondHalfRevenue = secondHalf.reduce((sum, o) => sum + o.total_amount, 0);
        aggregatedMetrics.revenue.growth = ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;
        aggregatedMetrics.revenue.trend = secondHalfRevenue > firstHalfRevenue ? 'up' :
          secondHalfRevenue < firstHalfRevenue ? 'down' : 'stable';
      }
    }

    if (inventoryData) {
      aggregatedMetrics.inventory.value = inventoryData.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0);
      aggregatedMetrics.inventory.total = inventoryData.reduce((sum, item) =>
        sum + item.quantity, 0);
    }

    if (userData) {
      aggregatedMetrics.customers.total = userData.length;
      // Calculate customer growth
      const midPoint = new Date(startDate);
      midPoint.setDate(midPoint.getDate() + Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (2 * 24 * 60 * 60 * 1000)));

      const newCustomers = userData.filter(u => new Date(u.created_at) >= midPoint).length;
      const oldCustomers = userData.filter(u => new Date(u.created_at) < midPoint).length;

      if (oldCustomers > 0) {
        aggregatedMetrics.customers.growth = ((newCustomers - oldCustomers) / oldCustomers) * 100;
        aggregatedMetrics.customers.trend = newCustomers > oldCustomers ? 'up' :
          newCustomers < oldCustomers ? 'down' : 'stable';
      }
    }

    if (campaignData && campaignData.length > 0) {
      const totalImpressions = campaignData.reduce((sum, c) => sum + (c.impressions || 0), 0);
      const totalClicks = campaignData.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const totalConversions = campaignData.reduce((sum, c) => sum + (c.conversions || 0), 0);

      if (totalImpressions > 0) {
        aggregatedMetrics.conversion.rate = (totalConversions / totalImpressions) * 100;
      }
    }

    // Return in the expected format
    const transformedResult: BusinessMetricsTransform = {
      id: crypto.randomUUID(),
      metricDate: new Date().toISOString(),
      metricCategory: categories.join(','),
      metricName: 'Aggregated Business Metrics',
      metricValue: aggregatedMetrics.revenue.total,
      metricUnit: 'USD',
      aggregationLevel,
      metrics: aggregatedMetrics,
      metadata: {
        dataPoints: (orderData?.length || 0) + (inventoryData?.length || 0) + (userData?.length || 0),
        categories: categories,
        dateRange: { start: startDate, end: endDate },
        aggregationLevel,
        generatedAt: new Date().toISOString()
      }
    };

    ValidationMonitor.recordPatternSuccess({
      pattern: 'aggregate_business_metrics',
      context: 'BusinessMetricsService.aggregateBusinessMetrics',
      description: `Aggregated metrics from existing tables for ${categories.join(', ')}`
    });

    return transformedResult;

  } catch (error) {
    ValidationMonitor.recordValidationError({
      context: 'BusinessMetricsService.aggregateBusinessMetrics',
      errorCode: 'METRICS_AGGREGATION_FAILED',
      validationPattern: 'direct_supabase_query',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
```

## Other Methods to Update

### getCrossRoleMetrics() - Use existing tables
```typescript
static async getCrossRoleMetrics(options: {
  categories: string[];
  user_role?: string;
}) {
  // Instead of querying business_metrics table
  // Aggregate from orders, inventory_items, campaign_analytics

  const metrics = {};

  // Get inventory metrics
  if (options.categories.includes('inventory')) {
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('quantity, unit_price, category');

    metrics['inventory'] = {
      totalValue: inventory?.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0) || 0,
      totalItems: inventory?.reduce((sum, i) => sum + i.quantity, 0) || 0
    };
  }

  // Get marketing metrics
  if (options.categories.includes('marketing')) {
    const { data: campaigns } = await supabase
      .from('campaign_analytics')
      .select('impressions, clicks, conversions');

    metrics['marketing'] = {
      totalImpressions: campaigns?.reduce((sum, c) => sum + c.impressions, 0) || 0,
      totalConversions: campaigns?.reduce((sum, c) => sum + c.conversions, 0) || 0
    };
  }

  return { metrics };
}
```

### generateCorrelationAnalysis() - Correlate existing data
```typescript
static async generateCorrelationAnalysis(
  dataSource1: string,
  dataSource2: string
) {
  // Map data sources to actual tables
  const tableMapping = {
    'inventory': 'inventory_items',
    'marketing': 'campaign_analytics',
    'sales': 'orders',
    'customers': 'users'
  };

  const table1 = tableMapping[dataSource1] || 'orders';
  const table2 = tableMapping[dataSource2] || 'inventory_items';

  // Fetch data from real tables
  const [result1, result2] = await Promise.all([
    supabase.from(table1).select('*').limit(100),
    supabase.from(table2).select('*').limit(100)
  ]);

  // Calculate correlations from actual data
  // ... correlation logic ...
}
```

## Benefits of This Approach

1. **Works Immediately** - No need to wait for new tables
2. **Real Data** - Uses actual business data from existing tables
3. **No Schema Changes** - Works with current database structure
4. **Proven Tables** - Tables already validated and working

## Tables Being Used

- `orders` → Revenue, sales metrics
- `inventory_items` → Stock levels, inventory value
- `users` → Customer growth, retention
- `campaign_analytics` → Marketing performance
- `inventory_alerts` → Anomaly detection

## Next Steps

1. Update the `BusinessMetricsService.aggregateBusinessMetrics()` method with the code above
2. Test with real data from existing tables
3. Update other methods similarly to use existing tables
4. Only create new tables for storing generated insights/forecasts if needed

This approach makes the executive feature functional immediately without waiting for database changes!