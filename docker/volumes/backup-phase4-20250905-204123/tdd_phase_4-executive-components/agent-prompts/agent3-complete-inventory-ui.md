# Agent 3: Complete Inventory UI Implementation

## Mission
Complete the remaining inventory UI screens and tests following TDD (Test-Driven Development) approach.

## Context
- **Working Directory**: `../test-fixes-complete-inventory-ui`
- **Branch**: `test-fixes-complete-inventory-ui`
- **Communication Hub**: `../test-fixes-communication`
- **Current Status**: 50/105 tests written, basic screens need enhancement

## Your Tasks

### 1. Initial Assessment
```bash
cd ../test-fixes-complete-inventory-ui

# Check existing implementation
ls -la src/screens/inventory/
ls -la src/screens/inventory/__tests__/

# Run current tests
npm run test -- src/screens/inventory/__tests__ 2>&1 | tee ../test-fixes-communication/status/inventory-ui-initial.txt
```

### 2. TDD Approach (RED → GREEN → REFACTOR)

#### Step 1: RED - Write Failing Tests First
```typescript
// Example: InventoryDashboard.test.tsx
describe('InventoryDashboard', () => {
  it('should display low stock alerts', async () => {
    const { getByText } = render(<InventoryDashboard />);
    await waitFor(() => {
      expect(getByText('5 items low on stock')).toBeTruthy();
    });
  });

  it('should show inventory metrics', async () => {
    const { getByText } = render(<InventoryDashboard />);
    await waitFor(() => {
      expect(getByText('Total Items: 150')).toBeTruthy();
      expect(getByText('Total Value: $12,500')).toBeTruthy();
    });
  });

  it('should navigate to stock management', async () => {
    const { getByText } = render(<InventoryDashboard />);
    const button = getByText('Manage Stock');
    fireEvent.press(button);
    expect(mockNavigate).toHaveBeenCalledWith('StockManagement');
  });
});
```

#### Step 2: GREEN - Implement Minimum Code
```typescript
// InventoryDashboard.tsx
const InventoryDashboard: React.FC = () => {
  const { data: metrics } = useInventoryDashboard();
  const { data: alerts } = useInventoryAlerts();
  
  return (
    <ScrollView>
      <Card>
        <Text>Total Items: {metrics?.totalItems}</Text>
        <Text>Total Value: ${metrics?.totalValue}</Text>
      </Card>
      
      {alerts?.lowStock && (
        <AlertCard>
          <Text>{alerts.lowStock.length} items low on stock</Text>
        </AlertCard>
      )}
      
      <Button onPress={() => navigation.navigate('StockManagement')}>
        Manage Stock
      </Button>
    </ScrollView>
  );
};
```

#### Step 3: REFACTOR - Improve Code Quality
- Extract components
- Add proper typing
- Optimize performance
- Add accessibility

### 3. Screens to Complete

#### InventoryDashboard.tsx (Enhancement Required)
**Current**: Basic implementation  
**Needed**: 
- Metrics cards with real-time updates
- Low stock alerts with severity levels
- Quick actions menu
- Inventory trends chart
- Pull-to-refresh
**Tests**: 25 additional tests needed

#### StockManagementScreen.tsx (New)
**Features**:
- Stock level adjustments
- Bulk operations
- Location transfers
- Stock history view
- Barcode scanning integration
**Tests**: 20 tests needed

#### InventoryAlertsScreen.tsx (Enhancement Required)
**Current**: Basic alert list  
**Needed**:
- Alert categorization (low stock, expiring, damaged)
- Alert actions (reorder, transfer, dispose)
- Alert history
- Notification preferences
**Tests**: 10 additional tests needed

#### BulkOperationsModal.tsx (New Component)
**Features**:
- Multi-select items
- Bulk price updates
- Bulk stock adjustments
- Bulk category changes
- Operation preview
**Tests**: 15 tests needed

#### StockHistoryView.tsx (New Component)
**Features**:
- Transaction timeline
- Filter by operation type
- Export functionality
- Audit trail
**Tests**: 10 tests needed

### 4. Use Existing Hooks (Already Working)
```typescript
import { useInventoryDashboard } from 'hooks/inventory/useInventoryDashboard';
import { useStockOperations } from 'hooks/inventory/useStockOperations';
import { useInventoryAlerts } from 'hooks/inventory/useInventoryAlerts';

// These hooks are already tested and working
// Focus on UI implementation and tests
```

### 5. Testing Patterns

```typescript
// Setup for all inventory tests
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {component}
      </NavigationContainer>
    </QueryClientProvider>
  );
};

// Mock the working hooks
jest.mock('hooks/inventory/useInventoryDashboard', () => ({
  useInventoryDashboard: () => ({
    data: mockDashboardData,
    isLoading: false,
    error: null
  })
}));
```

### 6. Progress Tracking

```bash
# After completing each screen
echo "$(date): Completed InventoryDashboard - 25/55 new tests" >> ../test-fixes-communication/progress/complete-inventory-ui.md

# Run tests for specific screen
npm run test -- InventoryDashboard.test.tsx

# Coverage check
npm run test -- src/screens/inventory --coverage
```

### 7. Implementation Order

1. **Write all tests first** (RED phase)
   - InventoryDashboard tests (25)
   - StockManagementScreen tests (20)
   - InventoryAlertsScreen tests (10)

2. **Implement screens** (GREEN phase)
   - Basic functionality to pass tests
   - Use existing hooks
   - Simple UI components

3. **Refactor and enhance** (REFACTOR phase)
   - Extract reusable components
   - Add animations
   - Optimize performance
   - Accessibility features

## Communication Protocol

### Status Updates
```bash
# Every screen completion
echo "$(date): [Screen] - Tests: X/Y, Implementation: Complete" >> ../test-fixes-communication/progress/complete-inventory-ui.md
```

### Handoff Points
```bash
# When ready for integration
echo "READY: InventoryDashboard complete with 25 tests" >> ../test-fixes-communication/handoffs/inventory-ready.md
```

### If Blocked
```bash
echo "BLOCKED: [Issue] in [Component]" >> ../test-fixes-communication/handoffs/inventory-blockers.md
```

## Success Criteria
- 55 new tests written and passing
- 5 screens fully implemented
- All screens use existing hooks
- Pull-to-refresh on all screens
- Real-time updates integrated
- Accessibility compliant

## Quick Reference

### Commands
- `npm run test -- src/screens/inventory` - Test inventory screens
- `npm run test:watch` - Watch mode for TDD
- `npm run typecheck` - Check TypeScript

### Key Files
- `src/hooks/inventory/*.ts` - Working hooks (don't modify)
- `src/screens/inventory/*.tsx` - Screens to implement
- `src/components/inventory/*.tsx` - Reusable components

## Start Here
1. Review existing hook implementations
2. Write all InventoryDashboard tests (RED)
3. Implement InventoryDashboard (GREEN)
4. Refactor and move to next screen
5. Track progress in communication hub