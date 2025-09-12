# Hooks Pattern Compliance Remediation Plan

## 🎯 **Executive Summary**

**Current State**: 38 hooks analyzed, 15 critical violations found  
**Compliance Rate**: 60% query key factory usage, 32% ValidationMonitor coverage  
**Timeline**: 4-week phased remediation approach  
**Risk Level**: HIGH - Cache inconsistencies affecting production reliability  

---

## 📅 **PHASE 1: Critical Violations (Week 1)**

### **Priority 1.1: Query Key Factory Violations (Days 1-3)**

#### **Task 1.1.1: Fix useUserRole.ts** 
```typescript
// File: /src/hooks/role-based/useUserRole.ts
// Current Issue: Line 39 - Manual key construction

// ❌ BEFORE:
queryKey: ['roles', 'user', 'unauthenticated'] as const,

// ✅ AFTER:
import { roleKeys } from '../../utils/queryKeyFactory';
queryKey: roleKeys.user('unauthenticated'),
```
**Estimated Time**: 2 hours  
**Testing Required**: Role-based permission flows  
**Impact**: Medium risk - affects role switching

#### **Task 1.1.2: Fix Executive Hooks Manual Keys** 
```typescript
// Files: All executive hooks in /src/hooks/executive/
// Issue: Manual construction instead of executiveAnalyticsKeys

// ❌ BEFORE:
queryKey: ['executive', 'businessMetrics', options],
queryKey: ['executive', 'reportSchedules', 'all'],

// ✅ AFTER:
import { executiveAnalyticsKeys } from '../../utils/queryKeyFactory';
queryKey: executiveAnalyticsKeys.businessMetrics(userId, options),
queryKey: executiveAnalyticsKeys.reportSchedules(userId),
```
**Files to Fix**: 12 executive hooks  
**Estimated Time**: 8 hours  
**Testing Required**: Full executive dashboard testing  
**Impact**: High risk - affects executive analytics cache

#### **Task 1.1.3: Fix Marketing Cache Invalidation**
```typescript
// Files: useProductBundles.ts, useMarketingCampaigns.ts
// Issue: Hard-coded invalidation keys

// ❌ BEFORE:
queryClient.invalidateQueries({ queryKey: ['inventory', 'availability'] });
queryClient.invalidateQueries({ queryKey: ['content', 'list'] });

// ✅ AFTER:
import { inventoryKeys, contentKeys } from '../../utils/queryKeyFactory';
queryClient.invalidateQueries({ queryKey: inventoryKeys.availability() });
queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
```
**Estimated Time**: 4 hours  
**Testing Required**: Marketing workflow integration tests  
**Impact**: Medium risk - affects cross-entity updates

### **Priority 1.2: Critical ValidationMonitor Integration (Days 4-5)**

#### **Task 1.2.1: Add Monitoring to High-Traffic Hooks**
```typescript
// Target hooks: usePayment, useNotifications, useCheckoutForm, useRealtime

// Pattern to implement:
import { ValidationMonitor } from '../utils/validationMonitor';

const paymentMutation = useMutation({
  onError: (error) => {
    ValidationMonitor.recordValidationError({
      context: 'usePayment.processPayment',
      errorCode: 'PAYMENT_FAILED',
      errorMessage: error.message
    });
  },
  onSuccess: (result) => {
    ValidationMonitor.recordPatternSuccess({
      pattern: 'payment_processing',
      context: 'usePayment.processPayment',
      description: `Payment processed for ${result.amount}`
    });
  }
});
```
**Target Hooks**: 4 critical user-facing hooks  
**Estimated Time**: 6 hours  
**Impact**: HIGH - Production observability improvement

### **Phase 1 Deliverables**
- [ ] All manual query keys replaced with factory methods
- [ ] Critical hooks have ValidationMonitor integration  
- [ ] Cache invalidation consistency across marketing hooks
- [ ] Updated tests for all modified hooks
- [ ] Performance regression testing completed

**Phase 1 Success Criteria**:
- Query Key Factory Usage: 85%+ compliant
- ValidationMonitor Coverage: 60%+ (doubled from current)
- Zero cache inconsistency issues in testing

---

## 📅 **PHASE 2: Error Handling & Performance (Week 2)**

### **Priority 2.1: Standardize Error Handling Patterns (Days 6-8)**

#### **Task 2.1.1: Implement Standard Error Interfaces**
```typescript
// Create standardized error interface for all hooks
interface HookError {
  code: string;
  message: string;
  userMessage: string;
  context?: Record<string, any>;
}

// Example implementation pattern:
const createHookError = (
  code: string,
  message: string, 
  userMessage: string,
  context?: Record<string, any>
): HookError => ({ code, message, userMessage, context });
```
**Target Hooks**: useStockValidation, useCheckoutForm, useNotifications  
**Estimated Time**: 8 hours

#### **Task 2.1.2: Add Error Recovery Mechanisms**
```typescript
// Pattern for error recovery:
const useHookWithRecovery = () => {
  return useQuery({
    queryKey: hookKeys.data(userId),
    queryFn: fetchData,
    retry: (failureCount, error) => {
      // Custom retry logic based on error type
      if (error.code === 'NETWORK_ERROR' && failureCount < 3) return true;
      if (error.code === 'AUTH_ERROR') return false;
      return failureCount < 1;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};
```
**Target Areas**: Network failures, auth errors, timeout handling  
**Estimated Time**: 10 hours

### **Priority 2.2: Performance Optimization (Days 9-10)**

#### **Task 2.2.1: Add Pagination to Data-Heavy Hooks**
```typescript
// Target: useNotifications, useOrderHistory, useProductAdmin
const usePaginatedHook = (pageSize = 20) => {
  const [cursor, setCursor] = useState<string | null>(null);
  
  return useInfiniteQuery({
    queryKey: hookKeys.paginated(userId, pageSize),
    queryFn: ({ pageParam }) => fetchPaginatedData(pageParam, pageSize),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null
  });
};
```

#### **Task 2.2.2: Implement Debouncing for Search Operations**
```typescript
// Target: useProductAdmin search, useNotifications search
import { useDebouncedCallback } from 'use-debounce';

const useSearchWithDebounce = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedCallback(setSearchTerm, 300);
  
  const searchResults = useQuery({
    queryKey: hookKeys.search(searchTerm),
    queryFn: () => searchService.search(searchTerm),
    enabled: searchTerm.length > 2
  });
  
  return { debouncedSearch, searchResults };
};
```

#### **Task 2.2.3: Fix Memory Leaks in Real-time Connections**
```typescript
// Target: useRealtime.ts WebSocket connections
const useRealtimeWithCleanup = () => {
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    // Connection setup...
    
    return () => {
      // Proper cleanup
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);
};
```

### **Phase 2 Deliverables**
- [ ] Standardized error handling across all hooks
- [ ] Pagination implemented for data-heavy operations
- [ ] Debouncing added to search operations  
- [ ] Memory leak fixes in real-time connections
- [ ] Performance benchmarks established and met

---

## 📅 **PHASE 3: Cache Optimization (Week 3)**

### **Priority 3.1: Cache Configuration Standardization**

#### **Task 3.1.1: Implement Consistent Cache Strategies**
```typescript
// Standard cache configurations by data type:
const CACHE_CONFIG = {
  USER_DATA: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  PRODUCT_DATA: { staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000 },
  REAL_TIME_DATA: { staleTime: 30 * 1000, gcTime: 1 * 60 * 1000 },
  STATIC_DATA: { staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000 }
};

// Apply to all hooks based on data type
```

#### **Task 3.1.2: Implement Smart Cache Invalidation**
```typescript
// Centralized invalidation patterns
const invalidateRelatedData = (entityType: string, entityId: string) => {
  const patterns = INVALIDATION_PATTERNS[entityType];
  patterns.forEach(pattern => {
    queryClient.invalidateQueries({ 
      queryKey: pattern.buildKey(entityId),
      predicate: pattern.predicate 
    });
  });
};
```

### **Priority 3.2: Optimistic Updates Implementation**

#### **Task 3.2.1: Add Optimistic Updates to Missing Mutations**
```typescript
// Target: usePickupRescheduling, useNoShowHandling, useNotifications
const useOptimisticMutation = () => {
  return useMutation({
    mutationFn: updateData,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: hookKeys.data(userId) });
      
      // Snapshot previous value  
      const previousData = queryClient.getQueryData(hookKeys.data(userId));
      
      // Optimistically update
      queryClient.setQueryData(hookKeys.data(userId), oldData => 
        updateOptimistically(oldData, variables)
      );
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(hookKeys.data(userId), context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: hookKeys.data(userId) });
    }
  });
};
```

### **Phase 3 Deliverables**
- [ ] Consistent cache configuration across all hooks
- [ ] Smart invalidation patterns implemented
- [ ] Optimistic updates for all user-facing mutations
- [ ] Cache performance metrics improved by 30%

---

## 📅 **PHASE 4: Automation & Prevention (Week 4)**

### **Priority 4.1: Automated Compliance Checking**

#### **Task 4.1.1: ESLint Rules for Pattern Enforcement**
```javascript
// .eslintrc.js custom rules
module.exports = {
  rules: {
    'no-manual-query-keys': {
      create: function(context) {
        return {
          'CallExpression[callee.name="useQuery"] Property[key.name="queryKey"]': function(node) {
            if (isManualQueryKey(node)) {
              context.report({
                node,
                message: 'Use centralized query key factory instead of manual construction'
              });
            }
          }
        };
      }
    }
  }
};
```

#### **Task 4.1.2: Pre-commit Hook Updates**
```bash
#!/usr/bin/env sh
echo "🔍 Running hooks compliance audit..."

# Check for manual query key construction
npx eslint src/hooks/ --rule 'no-manual-query-keys: error' --quiet
if [ $? -ne 0 ]; then
  echo "❌ Manual query key construction detected"
  exit 1
fi

# Check ValidationMonitor integration
node scripts/check-validation-monitor.js
if [ $? -ne 0 ]; then
  echo "❌ Missing ValidationMonitor integration in critical hooks"  
  exit 1
fi

echo "✅ All hooks compliance checks passed"
```

#### **Task 4.1.3: Automated Compliance Dashboard**
```typescript
// Create compliance monitoring dashboard
interface ComplianceMetrics {
  queryKeyFactoryUsage: number;
  validationMonitorCoverage: number;
  errorHandlingStandardization: number;
  performanceOptimization: number;
}

const generateComplianceReport = (): ComplianceMetrics => {
  // Automated analysis of hook files
  return analyzecodebase();
};
```

### **Priority 4.2: Documentation & Training**

#### **Task 4.2.1: Update Hook Development Guidelines**
- Complete hook development checklist
- Pattern examples and anti-patterns
- Performance optimization guidelines
- Testing requirements for each pattern

#### **Task 4.2.2: Create Development Tools**
```typescript
// Hook generator template
const generateHook = (hookName: string, entityType: string) => {
  return `
// Generated hook following all patterns
import { ${entityType}Keys } from '../utils/queryKeyFactory';
import { ValidationMonitor } from '../utils/validationMonitor';

export const ${hookName} = (userId?: string) => {
  return useQuery({
    queryKey: ${entityType}Keys.data(userId),
    queryFn: () => ${entityType}Service.getData(userId),
    ...STANDARD_CACHE_CONFIG.${entityType.toUpperCase()}_DATA,
    onError: (error) => ValidationMonitor.recordValidationError({
      context: '${hookName}',
      errorCode: 'FETCH_FAILED',
      errorMessage: error.message
    })
  });
};`;
};
```

### **Phase 4 Deliverables**
- [ ] Automated compliance checking in CI/CD
- [ ] ESLint rules prevent future violations
- [ ] Updated documentation and guidelines
- [ ] Developer tools for pattern compliance
- [ ] Training materials for team

---

## 📊 **Success Metrics & Timeline**

### **Weekly Milestones**
- **Week 1**: 85% query key compliance, 60% ValidationMonitor coverage
- **Week 2**: 90% error handling standardization, performance benchmarks met  
- **Week 3**: 95% cache configuration consistency, optimistic updates implemented
- **Week 4**: 100% automation in place, developer tools deployed

### **Final Success Criteria**
- ✅ **95%+ hooks using centralized query key factory**
- ✅ **90%+ hooks with ValidationMonitor integration** 
- ✅ **100% standardized error handling patterns**
- ✅ **Zero manual query key construction in new code**
- ✅ **Automated compliance checking prevents violations**
- ✅ **Performance improvements: 30% faster cache operations**

### **Risk Mitigation**
- **Daily code reviews** during Phase 1 critical changes
- **Incremental rollout** with feature flags for major modifications
- **Rollback plans** for each phase in case of production issues
- **Extensive testing** at each milestone before proceeding

---

## 🎯 **Resource Requirements**

### **Developer Time Allocation**
- **Phase 1**: 20 hours (critical fixes)
- **Phase 2**: 30 hours (error handling & performance)  
- **Phase 3**: 25 hours (cache optimization)
- **Phase 4**: 15 hours (automation & documentation)
- **Total**: 90 hours over 4 weeks

### **Testing Requirements**
- Unit tests for all modified hooks
- Integration tests for cache invalidation patterns
- Performance regression testing
- End-to-end user workflow testing

### **Tools & Infrastructure**
- ESLint rule development
- CI/CD pipeline updates
- Monitoring dashboard creation  
- Documentation platform updates

**Expected ROI**: 
- Reduced debugging time: -50%
- Faster development velocity: +25%
- Production stability improvement: +40%
- Developer onboarding time: -30%