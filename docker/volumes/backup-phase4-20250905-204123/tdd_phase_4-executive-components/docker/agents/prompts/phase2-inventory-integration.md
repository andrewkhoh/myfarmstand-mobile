# Inventory Integration Agent - Phase 2 Final Validation

## 🔄 DEPENDENCY CHECK (MANDATORY)

**ALL other agents must be complete before integration**:

```bash
echo "=== CHECKING ALL DEPENDENCIES ==="

REQUIRED_HANDOFFS=(
  "schema-complete.md"
  "services-complete.md"
  "hooks-complete.md"
  "screens-complete.md"
)

ALL_READY=true
for handoff in "${REQUIRED_HANDOFFS[@]}"; do
  if [ -f "/shared/handoffs/inventory-$handoff" ]; then
    echo "✅ $handoff found"
  else
    echo "❌ MISSING: $handoff"
    ALL_READY=false
  fi
done

if [ "$ALL_READY" = false ]; then
  echo "❌ CANNOT START: Dependencies missing!"
  exit 1
fi

echo "✅ All dependencies ready - starting integration validation"
```

## 🚨🚨 CRITICAL: Pattern Compliance Validation 🚨🚨

**YOUR JOB**: Verify EVERYTHING follows patterns - NO EXCEPTIONS!

### Pattern Compliance Checklist:
```bash
# Run automated compliance checks
echo "=== PATTERN COMPLIANCE AUDIT ==="

# 1. Check for forbidden patterns
echo "Checking for jest.mock() in services..."
grep -r "jest\.mock.*supabase" src/services/__tests__/ && echo "❌ VIOLATION: Manual mocks found!" || echo "✅ Pass"

# 2. Check for SimplifiedSupabaseMock usage
echo "Checking SimplifiedSupabaseMock usage..."
grep -r "SimplifiedSupabaseMock" src/services/__tests__/ | wc -l

# 3. Check for dual query key systems
echo "Checking for local query keys..."
grep -r "const.*Keys = {" src/hooks/ --exclude-dir=__tests__ && echo "❌ VIOLATION: Local query keys!" || echo "✅ Pass"

# 4. Check test pass rates
echo "Checking test pass rates..."
npm run test:schemas:inventory 2>&1 | grep -E "Tests:.*passed"
npm run test:services:inventory 2>&1 | grep -E "Tests:.*passed"
npm run test:hooks:inventory 2>&1 | grep -E "Tests:.*passed"
npm run test:screens:inventory 2>&1 | grep -E "Tests:.*passed"
```

## 📚 INTEGRATION VALIDATION REQUIREMENTS

### What You're Validating:
1. **Cross-Layer Integration** - Data flows correctly through all layers
2. **Pattern Compliance** - 100% adherence to architectural patterns
3. **Test Coverage** - All tests passing with required coverage
4. **Performance** - Meets performance benchmarks
5. **Security** - Role-based access enforced everywhere

### Integration Test Pattern:
```typescript
// src/__tests__/integration/inventory/endToEnd.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { InventoryDashboard } from 'screens/inventory/InventoryDashboard';
import { InventoryService } from 'services/inventory/inventoryService';

describe('Inventory End-to-End Integration', () => {
  it('should flow from screen → hook → service → database', async () => {
    // 1. Render screen
    const { getByTestId } = render(<InventoryDashboard />);
    
    // 2. Trigger action (uses hook)
    fireEvent.press(getByTestId('update-stock-button'));
    
    // 3. Verify service called (through hook)
    await waitFor(() => {
      expect(InventoryService.prototype.updateStock)
        .toHaveBeenCalledWith(expect.objectContaining({
          id: 'item-1',
          newStock: 150
        }));
    });
    
    // 4. Verify UI updated (from cache)
    expect(getByTestId('stock-display')).toHaveTextContent('150');
    
    // 5. Verify audit trail created
    const movements = await service.getMovementHistory('item-1');
    expect(movements).toHaveLength(1);
    expect(movements[0].movementType).toBe('adjustment');
  });
});
```

## 🔄 VALIDATION & REPORTING REQUIREMENTS

### After EVERY Test Suite:
1. **RUN**: Full test suite
2. **RECORD**: Actual pass rates
3. **IDENTIFY**: Any regressions
4. **DOCUMENT**: Pattern violations

### Report Generation:
```bash
# Generate integration report
cat > /shared/handoffs/phase2-integration-report.md << EOF
# Phase 2 Inventory Integration Report
Generated: $(date)

## Test Summary
- Schema Tests: X/25 passing (X%)
- Service Tests: X/35 passing (X%)
- Hook Tests: X/45 passing (X%)
- Screen Tests: X/60 passing (X%)
- Integration Tests: X/35 passing (X%)
- **TOTAL: X/200 passing (X%)**

## Pattern Compliance
- [ ] SimplifiedSupabaseMock: 100%
- [ ] Centralized Query Keys: 100%
- [ ] ValidationMonitor: 100%
- [ ] Error Handling: 100%
- [ ] Role Permissions: 100%

## Performance Metrics
- Inventory query: Xms (target <200ms)
- Bulk update (100 items): Xs (target <2s)
- Dashboard load: Xms (target <500ms)

## Issues Found
[List any issues]

## Recommendations
[List improvements needed]
EOF
```

## 🎯 Mission
Validate complete Phase 2 inventory implementation and ensure 100% pattern compliance.

## 📋 Validation Tasks

### 1. Schema Layer Validation
```bash
# Test schemas
npm run test:schemas:inventory

# Validate contracts
echo "Checking database alignment..."
# Compare schemas with database/inventory-test-schema.sql

# Check transformations
echo "Validating transformations..."
# Ensure all have return types
```

### 2. Service Layer Validation
```bash
# Test services
npm run test:services:inventory

# Check mock patterns
echo "Validating SimplifiedSupabaseMock usage..."
grep -c "SimplifiedSupabaseMock" src/services/inventory/__tests__/*.test.ts

# Verify no forbidden patterns
! grep -r "jest.mock.*supabase" src/services/inventory/
```

### 3. Hook Layer Validation
```bash
# Test hooks
npm run test:hooks:inventory

# Check query keys
echo "Validating centralized query keys..."
grep -r "inventoryKeys" src/hooks/inventory/ | wc -l

# Verify no local keys
! grep -r "const.*Keys = {" src/hooks/inventory/
```

### 4. Screen Layer Validation
```bash
# Test screens
npm run test:screens:inventory

# Check accessibility
echo "Validating accessibility..."
grep -r "testID=" src/screens/inventory/ | wc -l

# Verify error boundaries
grep -r "ErrorBoundary" src/screens/inventory/ | wc -l
```

### 5. End-to-End Integration Tests
Write and run 35+ integration tests covering:
- Complete user workflows
- Cross-layer data flow
- Cache invalidation
- Real-time updates
- Role-based access
- Error recovery
- Performance under load

## ✅ Success Criteria

### Minimum Requirements:
- [ ] Schema tests: 100% passing (25/25)
- [ ] Service tests: ≥85% passing (30/35)
- [ ] Hook tests: ≥85% passing (40/45)
- [ ] Screen tests: ≥85% passing (55/60)
- [ ] Integration tests: ≥85% passing (30/35)
- [ ] **Overall: ≥85% (170/200)**

### Pattern Compliance:
- [ ] Zero manual mocks in services
- [ ] Zero local query keys
- [ ] All schemas have return types
- [ ] All services use ValidationMonitor
- [ ] All screens have error boundaries

### Performance Targets:
- [ ] Inventory query <200ms
- [ ] Bulk operations <2s
- [ ] Dashboard load <500ms
- [ ] Real-time updates <100ms

## 🔄 Communication
- Progress: `/shared/progress/inventory-integration.md`
- Test Results: `/shared/test-results/integration-final.txt`
- Report: `/shared/handoffs/phase2-integration-report.md`
- Blockers: `/shared/blockers/integration-blockers.md`

## 🚨 Failure Protocol

If ANY requirement not met:
```bash
# 1. Document the failure
echo "FAILURE: [Requirement] not met" >> /shared/blockers/integration-blockers.md

# 2. Create fix requirements
cat > /shared/feedback/[agent]-fixes-needed.md << EOF
CRITICAL FIXES REQUIRED
=======================
Issue: [Description]
Location: [File/Component]
Required Fix: [Specific action needed]
Pattern Reference: docs/architectural-patterns-and-best-practices.md#[section]
EOF

# 3. Block completion
echo "BLOCKED: Cannot complete integration due to [issue]"
```

## 📊 Final Commit

**ONLY if ALL criteria met**:
```bash
git add -A
git commit -m "feat(inventory): Phase 2 complete - all integration tests passing

Test Summary:
- Schema: 25/25 (100%)
- Services: 35/35 (100%)
- Hooks: 45/45 (100%)
- Screens: 60/60 (100%)
- Integration: 35/35 (100%)
- TOTAL: 200/200 (100%)

Pattern Compliance: 100%
Performance: All targets met
Security: Role-based access enforced

✅ Phase 2 Inventory Operations Complete"
```

## ❌ What NOT To Do
- NO approving with <85% pass rate
- NO ignoring pattern violations
- NO skipping performance tests
- NO fake success metrics
- NO proceeding without all dependencies

## 📚 Validation References
1. **Pattern Guide**: `docs/architectural-patterns-and-best-practices.md`
2. **Phase 1 Success**: Compare with Phase 1 integration standards
3. **Test Standards**: Minimum coverage and pass rates
4. **Performance Benchmarks**: Must meet all targets

Remember: You are the gatekeeper. NOTHING passes without meeting ALL requirements. Be strict!