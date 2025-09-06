# Inventory Screens Agent - Phase 2 UI Layer

## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting**, verify dependencies:

```bash
echo "=== CHECKING DEPENDENCIES ==="
# Hooks must be complete for screens
if [ -f "/shared/handoffs/inventory-hooks-complete.md" ]; then
  echo "✅ Hooks ready - can build screens"
  cat "/shared/handoffs/inventory-hooks-complete.md"
else
  echo "❌ ERROR: Hooks not complete - cannot build screens!"
  exit 1
fi

# Check for feedback
if [ -f "/shared/feedback/inventory-screens-improvements.md" ]; then
  echo "📋 Address this feedback:"
  cat "/shared/feedback/inventory-screens-improvements.md"
fi
```

## 🚨🚨 CRITICAL: React Native Testing Patterns 🚨🚨

**SCREENS USE REACT NATIVE TESTING LIBRARY** - Specific patterns required!

### ✅ CORRECT SCREEN TEST PATTERN
```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryDashboard } from '../InventoryDashboard';

describe('InventoryDashboard', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
  });
  
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <InventoryDashboard {...props} />
      </QueryClientProvider>
    );
  };
  
  it('should display inventory metrics', async () => {
    const { getByTestId, getByText } = renderScreen();
    
    await waitFor(() => {
      expect(getByTestId('total-items-metric')).toBeTruthy();
    });
    
    expect(getByText(/Total Items/i)).toBeTruthy();
  });
  
  it('should handle pull to refresh', async () => {
    const { getByTestId } = renderScreen();
    
    const scrollView = getByTestId('dashboard-scroll');
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { y: -100 }
      }
    });
    
    await waitFor(() => {
      // Check refresh triggered
    });
  });
});
```

### ❌ WRONG PATTERNS FOR SCREENS
```typescript
// ❌ DON'T use DOM testing library
import { render } from '@testing-library/react'; // Wrong!

// ❌ DON'T skip QueryClient wrapper
render(<InventoryDashboard />); // Missing provider!

// ❌ DON'T use querySelector
screen.querySelector('.metric'); // Not React Native!
```

## 📚 ARCHITECTURAL PATTERNS - Screen Requirements

### Screen Implementation Pattern:
```typescript
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useInventoryDashboard } from 'hooks/inventory/useInventoryDashboard';
import { useUserRole } from 'hooks/useUserRole';

export function InventoryDashboard({ navigation }) {
  const { data, isLoading, refetch, error } = useInventoryDashboard();
  const { hasPermission } = useUserRole();
  
  const canEditInventory = hasPermission('inventory:write');
  
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Failed to load inventory data
        </Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <FlatList
      testID="dashboard-scroll"
      data={data?.metrics || []}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
        />
      }
      ListHeaderComponent={() => (
        <View testID="dashboard-header">
          <MetricCard
            testID="total-items-metric"
            title="Total Items"
            value={data?.totalItems || 0}
          />
          <MetricCard
            testID="low-stock-metric"
            title="Low Stock"
            value={data?.lowStockCount || 0}
            variant="warning"
          />
        </View>
      )}
      renderItem={({ item }) => (
        <InventoryItemCard
          item={item}
          onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
          showActions={canEditInventory}
        />
      )}
      keyExtractor={item => item.id}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 16
  }
});
```

## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Screen Implementation:
1. **RUN TESTS**: `npm run test:screens:inventory`
2. **CHECK**: All screen tests passing
3. **VERIFY**: Accessibility compliance
4. **COMMIT**: With component count

### Git Commit Protocol:
```bash
# After dashboard screen
git commit -m "feat(inventory): implement inventory dashboard screen

- Components: 5 created
- Tests: 15/15 passing
- Accessibility: ✓
- Role integration: ✓"

# After management screen
git commit -m "feat(inventory): implement stock management screen

- Components: 8 created
- Tests: 20/20 passing
- Bulk operations: ✓
- Pattern compliance: 100%"
```

## 🎯 Mission
Implement all inventory screens with role-based features, accessibility, and comprehensive testing.

## 📋 Implementation Tasks

### 1. Inventory Dashboard Screen Tests (15+ tests)
```typescript
describe('InventoryDashboard', () => {
  it('should display key metrics', async () => {
    // Test metric cards display
  });
  
  it('should show low stock alerts prominently', async () => {
    // Test alert visibility
  });
  
  it('should navigate to detail on item press', async () => {
    // Test navigation
  });
  
  it('should handle empty state', async () => {
    // Test no inventory case
  });
  
  it('should respect role permissions', async () => {
    // Test action visibility based on role
  });
});
```

### 2. Stock Management Screen (`src/screens/inventory/StockManagementScreen.tsx`)
```typescript
export function StockManagementScreen() {
  const { data: items, isLoading } = useInventoryItems();
  const updateStock = useUpdateStock();
  const [selectedItems, setSelectedItems] = useState([]);
  
  const handleQuickAdjust = useCallback((item, adjustment) => {
    updateStock.mutate({
      id: item.id,
      newStock: item.currentStock + adjustment
    });
  }, [updateStock]);
  
  const handleBulkUpdate = useCallback(() => {
    navigation.navigate('BulkOperations', { 
      items: selectedItems 
    });
  }, [selectedItems]);
  
  return (
    <View style={styles.container}>
      {selectedItems.length > 0 && (
        <BulkActionBar
          testID="bulk-action-bar"
          count={selectedItems.length}
          onUpdate={handleBulkUpdate}
          onClear={() => setSelectedItems([])}
        />
      )}
      
      <FlatList
        data={items}
        renderItem={({ item }) => (
          <StockItemCard
            item={item}
            selected={selectedItems.includes(item.id)}
            onSelect={() => toggleSelection(item.id)}
            onQuickAdjust={handleQuickAdjust}
          />
        )}
      />
    </View>
  );
}
```

### 3. Inventory Alerts Screen (`src/screens/inventory/InventoryAlertsScreen.tsx`)
```typescript
export function InventoryAlertsScreen() {
  const { data: alerts, isLoading } = useInventoryAlerts();
  const dismissAlert = useDismissAlert();
  
  const renderAlert = useCallback(({ item }) => (
    <AlertCard
      alert={item}
      onDismiss={() => dismissAlert.mutate(item.id)}
      onAction={() => handleAlertAction(item)}
    />
  ), [dismissAlert]);
  
  return (
    <SectionList
      sections={[
        { title: 'Critical', data: alerts?.critical || [] },
        { title: 'Warning', data: alerts?.warning || [] },
        { title: 'Info', data: alerts?.info || [] }
      ]}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={renderAlert}
    />
  );
}
```

### 4. Component Library (`src/screens/inventory/components/`)
Create reusable components:
- `MetricCard.tsx` - Dashboard metrics display
- `StockItemCard.tsx` - Inventory item with actions
- `AlertCard.tsx` - Alert display with actions
- `BulkActionBar.tsx` - Bulk operation controls
- `StockAdjuster.tsx` - Quick stock adjustment UI

## ✅ Test Requirements
- `InventoryDashboard.test.tsx`: 15+ tests
- `StockManagementScreen.test.tsx`: 20+ tests
- `InventoryAlertsScreen.test.tsx`: 15+ tests
- `BulkOperationsScreen.test.tsx`: 10+ tests
- Component tests: 5+ per component

## 🎯 Milestone Validation Protocol

### Your Milestones:
- [ ] Milestone 1: Dashboard screen (15+ tests)
  - Metrics display → Commit
- [ ] Milestone 2: Management screen (20+ tests)
  - Stock operations → Commit
- [ ] Milestone 3: Alerts screen (15+ tests)
  - Alert handling → Commit
- [ ] Milestone 4: Bulk operations (10+ tests)
  - Batch UI → Commit
- [ ] Milestone 5: Component library
  - Reusable components → Commit
- [ ] Final: All screens complete (60+ tests)
  - Full UI coverage → Commit

## 📊 Success Criteria
- [ ] 60+ screen tests passing
- [ ] Role-based UI features
- [ ] Accessibility compliance
- [ ] Loading/error states
- [ ] Pull-to-refresh
- [ ] Navigation working

## 🔄 Communication
- Progress: `/shared/progress/inventory-screens.md`
- Test Results: `/shared/test-results/screens-cycle-X.txt`
- Blockers: `/shared/blockers/inventory-screens-blockers.md`
- Handoff: `/shared/handoffs/inventory-screens-complete.md`

## 🚨 Common Screen Issues

### Issue: Navigation not mocked
```typescript
// Solution: Mock navigation
const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate };
renderScreen({ navigation });
```

### Issue: Async data not loading
```typescript
// Solution: Wait for data
await waitFor(() => {
  expect(getByTestId('data-loaded')).toBeTruthy();
});
```

### Issue: Touch events not firing
```typescript
// Solution: Use fireEvent.press for React Native
fireEvent.press(button); // NOT click!
```

## ❌ What NOT To Do
- NO DOM methods (querySelector, etc.)
- NO missing test IDs
- NO hardcoded strings without i18n
- NO missing error boundaries
- NO inaccessible components

## 📚 Required References
1. **Existing screens**: `src/screens/` - Follow patterns
2. **Component library**: `src/components/` - Reuse components
3. **Test examples**: `src/screens/__tests__/` - Copy test patterns
4. **Styles**: Follow existing style patterns

## 🎨 UI/UX Requirements
- Consistent with existing app design
- Support dark/light themes
- Responsive to different screen sizes
- Smooth animations (60 FPS)
- Haptic feedback for actions
- Accessibility labels on all interactive elements

Remember: Screens are what users see. They must be polished, accessible, and thoroughly tested!