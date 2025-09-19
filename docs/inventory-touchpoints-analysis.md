# Inventory Feature - End-to-End Touchpoint Analysis

## Overview
This document provides a detailed analysis of all touchpoints in the inventory feature, tracing the complete data flow from user interface through to database operations.

## 1. InventoryHub Screen Flow

### Entry Point
**Screen:** `src/screens/inventory/InventoryHub.tsx`

#### User Actions → Hook Calls
```
User clicks menu item → navigation.navigate()
├── InventoryDashboard button → navigate('InventoryDashboard')
├── Inventory Alerts button → navigate('InventoryAlerts')
├── Stock Management button → navigate('StockManagement')
├── Bulk Operations button → navigate('BulkOperations')
└── Movement History button → navigate('StockMovementHistory')
```

#### Hook Usage
- `useCurrentUser()` - src/hooks/useAuth.ts:28
- `useInventoryDashboard()` - src/hooks/inventory/useInventoryDashboard.ts:12

---

## 2. InventoryDashboardScreen Flow

### Screen: `src/screens/inventory/InventoryDashboardScreen.tsx`

#### Component Structure
```
InventoryDashboardScreen
├── MetricCard (Total Items)
├── MetricCard (Low Stock)
├── MetricCard (Out of Stock)
├── MetricCard (Total Value)
├── AlertItem (Recent Alerts)
├── MovementItem (Recent Movements)
└── QuickActionButtons
```

#### Hook Chain
```
useInventoryDashboard() [line 28]
  ↓
useQuery() [@tanstack/react-query]
  ↓
InventoryService.getInventoryItems() [line 24]
InventoryService.getLowStockItems() [line 25]
InventoryService.getRecentMovements() [line 26]
InventoryService.getAlerts() [line 27]
```

#### Service Calls
**File:** `src/services/inventory/inventoryService.ts`

1. **getInventoryItems(userId)** [line 70-99]
   ```typescript
   await this.supabase
     .from('inventory_items')
     .select('*')
   ```

2. **getLowStockItems(userId)** [line 250-280]
   ```typescript
   await this.supabase
     .from('inventory_items')
     .select('*')
     .lt('current_stock', 'minimum_stock')
   ```

3. **getRecentMovements(userId)** [line 350-380]
   ```typescript
   await this.supabase
     .from('stock_movements')
     .select('*')
     .order('created_at', { ascending: false })
     .limit(10)
   ```

4. **getAlerts(userId)** [line 400-430]
   ```typescript
   await this.supabase
     .from('inventory_alerts')
     .select('*')
     .eq('acknowledged', false)
   ```

---

## 3. InventoryAlertsScreen Flow

### Screen: `src/screens/inventory/InventoryAlertsScreen.tsx`

#### Hook Chain
```
useStockAlerts() [line 21] (currently stubbed)
useAcknowledgeAlert() [line 22] (currently stubbed)
```

#### Component Actions
- `handleAlertAction()` → Navigate to ItemDetail [line 24-28]
- `handleDismiss()` → dismissAlert.mutate(alertId) [line 30-32]

#### Service Integration (Missing)
⚠️ **Note:** Hooks are currently stubbed due to missing implementation

---

## 4. BulkOperationsScreen Flow

### Screen: `src/screens/inventory/BulkOperationsScreen.tsx`

#### Hook Usage
```
useInventoryItems() → Fetch all items
useBulkUpdateStock() → Batch stock updates
useBulkUpdatePrices() → Batch price updates
```

#### Service Calls
**Bulk Operations Service Pattern:**
```typescript
// Batch update pattern
await Promise.all(
  selectedItems.map(item =>
    InventoryService.updateStock(item.id, updates)
  )
)
```

---

## 5. Core Hook Implementations

### useInventoryDashboard Hook
**File:** `src/hooks/inventory/useInventoryDashboard.ts`

```typescript
export function useInventoryDashboard() {
  return useQuery({
    queryKey: ['inventory', 'dashboard'],
    queryFn: async (): Promise<InventoryDashboard> => {
      const service = new InventoryService(supabase);

      // Parallel data fetching [lines 23-28]
      const [items, lowStock, movements, alerts] = await Promise.all([
        service.getInventoryItems(userId),
        service.getLowStockItems(userId),
        service.getRecentMovements(userId),
        service.getAlerts(userId)
      ]);

      // Calculate metrics [lines 31-37]
      return {
        totalItems: items.length,
        lowStockCount: lowStock.length,
        outOfStockCount: items.filter(item => item.currentStock === 0).length,
        totalValue: items.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0),
        recentMovements: movements,
        alerts
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### useInventoryItems Hook
**File:** `src/hooks/inventory/useInventoryItems.ts`

```typescript
export function useInventoryItems(filters?: InventoryFilters) {
  return useQuery({
    queryKey: filters ? ['inventory', 'list', JSON.stringify(filters)] : ['inventory', 'list'],
    queryFn: async () => {
      const service = new InventoryService(supabase);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'test-user-id';

      return service.getInventoryItems(userId, filters);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### useInventoryOperations Hook
**File:** `src/hooks/inventory/useInventoryOperations.ts`

Advanced operations with caching:

```typescript
export function useUpdateStock() {
  const queryClient = useQueryClient();
  const cacheManager = getInventoryCacheManager(queryClient);
  const performanceMonitor = getCachePerformanceMonitor();

  return useMutation({
    mutationFn: withCachePerformanceMonitoring(
      'stock-update',
      async ({ inventoryId, stockUpdate }) =>
        InventoryService.updateStock(inventoryId, stockUpdate),
      1
    ),

    // Optimistic update [lines 38-55]
    onMutate: async ({ inventoryId, stockUpdate }) => {
      await cacheManager.optimisticStockUpdate(inventoryId, stockUpdate);
    },

    // Smart invalidation [lines 59-79]
    onSuccess: async (updatedInventory, { inventoryId, stockUpdate }) => {
      await cacheManager.invalidateStockUpdate(inventoryId, movement);
    },

    // Cache warming [lines 94-103]
    onSettled: async (data, error, { inventoryId }) => {
      if (data && !error) {
        await cacheManager.warmInventoryCaches([inventoryId]);
      }
    },
  });
}
```

---

## 6. Service Layer Details

### InventoryService Class
**File:** `src/services/inventory/inventoryService.ts`

#### Core Methods

1. **getInventoryItem(id)** [lines 43-65]
   - Single item fetch with validation
   - Schema: `InventoryItemTransformSchema`
   - Error tracking via `ValidationMonitor`

2. **createInventoryItem(data)** [lines 133-172]
   - Input validation: `CreateInventoryItemSchema`
   - Database transformation
   - Returns validated `InventoryItem`

3. **updateInventoryItem(id, data)** [lines 174-207]
   - Partial update support
   - Schema validation: `UpdateInventoryItemSchema`
   - Optimistic locking via timestamps

4. **updateStock(inventoryId, stockUpdate)** [lines 210-245]
   - Stock level modifications
   - Audit trail creation
   - Real-time sync triggers

5. **batchUpdateStock(updates)** [lines 300-340]
   - Batch operations with transaction support
   - Rollback on partial failure
   - Performance optimization

---

## 7. Database Schema

### Tables Used

#### inventory_items
```sql
- id (uuid, primary key)
- product_id (uuid, foreign key)
- warehouse_id (uuid, foreign key)
- current_stock (integer)
- reserved_stock (integer)
- minimum_stock (integer)
- maximum_stock (integer)
- reorder_point (integer)
- reorder_quantity (integer)
- unit_cost (decimal)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### stock_movements
```sql
- id (uuid, primary key)
- inventory_item_id (uuid, foreign key)
- movement_type (enum)
- quantity_change (integer)
- new_stock (integer)
- reason (text)
- performed_by (uuid)
- created_at (timestamp)
```

#### inventory_alerts
```sql
- id (uuid, primary key)
- inventory_item_id (uuid, foreign key)
- alert_type (enum)
- severity (enum)
- message (text)
- acknowledged (boolean)
- acknowledged_by (uuid)
- created_at (timestamp)
```

---

## 8. Cache Management

### Cache Integration
**File:** `src/hooks/inventory/cacheIntegration.ts`

#### Cache Keys Pattern
```typescript
inventoryKeys = {
  all: ['inventory'],
  lists: () => ['inventory', 'list'],
  list: (filters) => ['inventory', 'list', filters],
  items: () => ['inventory', 'items'],
  item: (id) => ['inventory', 'items', id],
  itemByProduct: (productId) => ['inventory', 'product', productId],
  dashboard: () => ['inventory', 'dashboard'],
  movements: () => ['inventory', 'movements'],
  alerts: () => ['inventory', 'alerts'],
}
```

#### Cache Invalidation Strategy
1. **Optimistic Updates** - Immediate UI feedback
2. **Smart Invalidation** - Only affected queries
3. **Cache Warming** - Pre-fetch related data
4. **Performance Monitoring** - Track cache hits/misses

---

## 9. Performance Optimization

### Performance Monitor
**File:** `src/hooks/inventory/cachePerformanceMonitor.ts`

Tracks:
- Cache hit rates
- Query execution times
- Optimistic update performance
- Invalidation cascade impact

### Optimization Techniques
1. **Parallel Fetching** - Dashboard loads all data simultaneously
2. **Stale-While-Revalidate** - Shows cached data while fetching
3. **Query Deduplication** - Prevents duplicate requests
4. **Selective Invalidation** - Only refreshes changed data

---

## 10. Error Handling Flow

### Validation Monitor
**File:** `src/utils/validationMonitorAdapter.ts`

Error tracking pattern:
```typescript
try {
  const validated = Schema.parse(data);
  ValidationMonitor.recordPatternSuccess('operation');
  return validated;
} catch (error) {
  ValidationMonitor.recordValidationError('operation', error);
  throw error;
}
```

### Error Recovery
1. **Optimistic Rollback** - Reverts UI on failure
2. **Retry Logic** - Automatic retry with exponential backoff
3. **Error Boundaries** - Prevents cascade failures
4. **User Notification** - Clear error messages

---

## 11. Real-time Updates (Planned)

### WebSocket Integration Points
```typescript
// Planned implementation
supabase
  .channel('inventory-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'inventory_items'
  }, (payload) => {
    queryClient.invalidateQueries(['inventory']);
  })
  .subscribe();
```

---

## 12. Missing Implementations

### Critical Gaps
1. **useStockAlerts** hook - Currently stubbed
2. **useAcknowledgeAlert** hook - Currently stubbed
3. **StockManagementScreen** - File missing
4. **Real-time subscriptions** - Not implemented
5. **Barcode scanning** - No integration

### Recommended Additions
1. Implement missing hooks for alerts
2. Add real-time WebSocket subscriptions
3. Create StockManagementScreen component
4. Add barcode/QR scanning capability
5. Implement offline support with sync

---

## Summary

The inventory feature follows a clear architectural pattern:

1. **User Interface** → React Native screens with typed props
2. **State Management** → React Query hooks with caching
3. **Business Logic** → Service classes with validation
4. **Data Access** → Supabase client with error handling
5. **Database** → PostgreSQL with proper schemas

The implementation demonstrates good separation of concerns, comprehensive error handling, and performance optimization through caching. However, some components are missing or stubbed, particularly around real-time updates and alert management.