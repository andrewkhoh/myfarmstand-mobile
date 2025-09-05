# Integration Merge Strategy Guide

## 🎯 Core Principle: Preserve ALL Agent Work, Merge Nothing
The PRIMARY strategy is to avoid merging altogether by using namespacing and composition.

## 📊 Conflict Types and Resolution Strategies

### Type 1: Duplicate Schema Definitions
**Scenario**: Multiple agents defined similar schemas (e.g., `MetricsSchema`)

```typescript
// Agent 1: decision-support created
interface MetricsSchema {
  revenue: number
  profit: number
  roi: number
}

// Agent 2: executive-services created
interface MetricsSchema {
  revenue: number
  costs: number
  margin: number
}
```

**Resolution Strategy: NAMESPACE + UNION**
```typescript
// ✅ CORRECT: Preserve both, namespace them
// src/schemas/executive-decision/metrics.ts
export interface DecisionMetricsSchema {
  revenue: number
  profit: number
  roi: number
}

// src/schemas/executive-services/metrics.ts
export interface ServicesMetricsSchema {
  revenue: number
  costs: number
  margin: number
}

// src/schemas/integration/unified-metrics.ts
// Create union type that satisfies both
import { DecisionMetricsSchema } from '@/schemas/executive-decision/metrics'
import { ServicesMetricsSchema } from '@/schemas/executive-services/metrics'

export type UnifiedMetricsSchema = DecisionMetricsSchema & ServicesMetricsSchema
// Result: { revenue, profit, roi, costs, margin }

// OR use discriminated union if they're mutually exclusive
export type MetricsSchema = 
  | { type: 'decision'; data: DecisionMetricsSchema }
  | { type: 'services'; data: ServicesMetricsSchema }
```

### Type 2: Overlapping Service Implementations
**Scenario**: Multiple agents implement similar services

```typescript
// Agent 1: decision-support
class MetricsService {
  calculateROI(revenue: number, investment: number) {
    return (revenue - investment) / investment
  }
}

// Agent 2: executive-services  
class MetricsService {
  calculateROI(revenue: number, costs: number) {
    return revenue / costs - 1
  }
}
```

**Resolution Strategy: ADAPTER PATTERN**
```typescript
// ✅ CORRECT: Keep both, create adapter
// src/services/integration/metrics-adapter.ts
import { MetricsService as DecisionMetrics } from '@/services/executive-decision'
import { MetricsService as ServicesMetrics } from '@/services/executive-services'

export class UnifiedMetricsService {
  private decisionMetrics = new DecisionMetrics()
  private servicesMetrics = new ServicesMetrics()
  
  // Use configuration to determine which to use
  calculateROI(revenue: number, value: number, mode: 'investment' | 'costs' = 'investment') {
    if (mode === 'investment') {
      return this.decisionMetrics.calculateROI(revenue, value)
    } else {
      return this.servicesMetrics.calculateROI(revenue, value)
    }
  }
  
  // Or provide both with clear naming
  calculateROIFromInvestment(revenue: number, investment: number) {
    return this.decisionMetrics.calculateROI(revenue, investment)
  }
  
  calculateROIFromCosts(revenue: number, costs: number) {
    return this.servicesMetrics.calculateROI(revenue, costs)
  }
}
```

### Type 3: Conflicting Component Props
**Scenario**: Multiple agents created components with same name but different props

```typescript
// Agent 1: executive-components
interface DashboardProps {
  metrics: MetricsData
  onRefresh: () => void
}

// Agent 2: executive-hooks
interface DashboardProps {
  data: AnalyticsData
  refreshInterval: number
}
```

**Resolution Strategy: COMPOSITION + EXTENSION**
```typescript
// ✅ CORRECT: Create composite component
// src/components/integration/unified-dashboard.tsx
import { Dashboard as ComponentsDashboard } from '@/components/executive-components'
import { Dashboard as HooksDashboard } from '@/components/executive-hooks'

interface UnifiedDashboardProps {
  // Accept all props from both
  metrics?: MetricsData
  data?: AnalyticsData
  onRefresh?: () => void
  refreshInterval?: number
  
  // Add discriminator
  variant: 'components' | 'hooks' | 'unified'
}

export function UnifiedDashboard(props: UnifiedDashboardProps) {
  switch (props.variant) {
    case 'components':
      return <ComponentsDashboard metrics={props.metrics!} onRefresh={props.onRefresh!} />
    case 'hooks':
      return <HooksDashboard data={props.data!} refreshInterval={props.refreshInterval!} />
    case 'unified':
      // Render both or create new unified view
      return (
        <div>
          {props.metrics && <ComponentsDashboard metrics={props.metrics} onRefresh={props.onRefresh} />}
          {props.data && <HooksDashboard data={props.data} refreshInterval={props.refreshInterval} />}
        </div>
      )
  }
}
```

### Type 4: Database Schema Conflicts
**Scenario**: Agents assumed different database structures

```typescript
// Agent 1: Expects 'business_metrics' table
// Agent 2: Expects 'executive_analytics' table
```

**Resolution Strategy: DATABASE VIEWS/ALIASES**
```sql
-- ✅ CORRECT: Create views that satisfy both
CREATE VIEW business_metrics AS 
  SELECT * FROM executive_metrics;

CREATE VIEW executive_analytics AS
  SELECT * FROM executive_metrics;

-- Or create mapping layer in service
class DatabaseAdapter {
  async getBusinessMetrics() {
    // Map from actual table to expected structure
    const data = await supabase.from('executive_metrics').select()
    return this.mapToBusinessMetrics(data)
  }
  
  async getExecutiveAnalytics() {
    const data = await supabase.from('executive_metrics').select()
    return this.mapToExecutiveAnalytics(data)
  }
}
```

## 🚨 Escalation Strategy: When to Stop and Ask

### Level 1: Automated Resolution (Agent Continues)
**Conditions**: 
- Simple namespace conflicts
- Import path issues
- Type export problems

**Action**: Agent resolves using strategies above

### Level 2: Complex But Resolvable (Agent Attempts)
**Conditions**:
- Multiple similar implementations
- Overlapping but compatible interfaces
- Different calculation methods for same metric

**Action**: Agent creates adapter/wrapper pattern and documents assumptions

### Level 3: Stop and Report (Requires Human Decision)
**Conditions**:
- **Incompatible Business Logic**: Two agents calculate same metric differently with no clear way to preserve both
- **Data Model Conflicts**: Fundamental schema incompatibilities
- **Security Conflicts**: Different authentication/authorization approaches
- **State Management Conflicts**: One uses Redux, other uses Context

**Report Format**:
```markdown
🛑 MERGE CONFLICT - HUMAN DECISION REQUIRED

**Conflict Type**: Incompatible Business Logic
**Severity**: HIGH
**Repositories Involved**: 
- tdd_phase_4-decision-support
- tdd_phase_4-executive-services

**Conflict Details**:
Both agents implement ROI calculation but with incompatible logic:
- Decision Support: ROI = (Revenue - Investment) / Investment
- Executive Services: ROI = Revenue / Costs - 1

**Test Impact**:
- Decision Support Tests: Expect first formula (15 tests)
- Executive Services Tests: Expect second formula (8 tests)
- Cannot satisfy both test suites simultaneously

**Options**:
1. **Use Decision Support Version** 
   - Pros: More comprehensive, 15 tests
   - Cons: Breaks 8 executive-services tests
   
2. **Use Executive Services Version**
   - Pros: Simpler calculation
   - Cons: Breaks 15 decision-support tests
   
3. **Keep Both with Mode Selection**
   - Pros: All tests pass
   - Cons: Requires config/UI to choose mode
   
4. **Manual Merge Required**
   - Human needs to decide business logic

**Recommendation**: Option 3 - Keep both with clear naming

**Awaiting Decision**: Please specify preference or provide merge logic
```

## 📋 Priority Rules for Conflict Resolution

### Priority Order (Highest to Lowest)
1. **Test Coverage**: Solution that allows most tests to pass
2. **Code Completeness**: More complete implementation wins
3. **Business Logic Integrity**: Preserve unique business logic
4. **Simplicity**: Simpler integration approach preferred
5. **Performance**: Consider performance implications last

### Decision Matrix
| Conflict Type | Both Tests Pass? | Action |
|--------------|-----------------|---------|
| Naming only | Yes (namespace) | Auto-resolve with namespacing |
| Interface diff | Yes (union) | Auto-resolve with union types |
| Logic diff | No | Create adapter with modes |
| Fundamental | No | **STOP - Human decision required** |

## 🔧 Test-Driven Resolution Process

```bash
# For each conflict, follow this process:

# 1. Try namespacing approach
npm test
if [ $? -eq 0 ]; then
  echo "✅ Resolved with namespacing"
  exit 0
fi

# 2. Try adapter pattern
# Create adapter implementation
npm test
if [ $? -eq 0 ]; then
  echo "✅ Resolved with adapter"
  exit 0
fi

# 3. Try composition pattern  
# Create composite implementation
npm test
if [ $? -eq 0 ]; then
  echo "✅ Resolved with composition"
  exit 0
fi

# 4. Analyze test failures
FAILED_TESTS=$(npm test 2>&1 | grep "FAIL")
if echo "$FAILED_TESTS" | grep -q "business logic"; then
  echo "🛑 STOP: Incompatible business logic detected"
  echo "Human intervention required"
  # Generate detailed conflict report
  exit 1
fi
```

## 🎯 Integration Success Metrics

### Acceptable Solutions
- ✅ All tests pass (100%)
- ✅ No agent code modified (only integration layer)
- ✅ Both implementations accessible
- ✅ Clear documentation of approach

### Unacceptable Solutions  
- ❌ Modifying agent's original code
- ❌ Deleting one implementation
- ❌ Changing test expectations
- ❌ Breaking existing functionality

## 💡 Key Insight: Composition Over Modification

The golden rule: **"If you can't merge it cleanly, compose it clearly"**

Instead of trying to merge two implementations into one, create a third that composes both:
- Preserves all agent work
- Allows tests to pass
- Provides clear API for choosing behavior
- Documents the composition strategy

This approach ensures we never lose work and always maintain reversibility.