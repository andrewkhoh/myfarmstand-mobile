# Integration Examples: Real Scenarios and Solutions

## Example 1: Multiple Agents Created MetricsSchema

### 🔍 Discovery
```bash
# Agent finds these during integration:
docker/volumes/tdd_phase_4-decision-support/src/schemas/executive/metrics.ts
docker/volumes/tdd_phase_4-executive-services/src/schemas/executive/business.ts
docker/volumes/tdd_phase_4-executive-schemas/src/schemas/executive/kpi.ts
```

### ❌ WRONG APPROACH - Trying to Merge
```typescript
// DON'T DO THIS - Modifying agent code
interface MetricsSchema {
  // Trying to combine all fields
  revenue: number        // from decision-support
  profit: number         // from decision-support  
  costs: number          // from executive-services
  margin: number         // from executive-services
  kpi: KPIData          // from executive-schemas
  performance: number    // from executive-schemas
}
```

### ✅ CORRECT APPROACH - Namespace and Compose
```typescript
// Step 1: Place each in namespaced location
// src/schemas/executive-decision/metrics.ts (copied as-is)
export interface DecisionMetricsSchema {
  revenue: number
  profit: number
  roi: number
}

// src/schemas/executive-services/business.ts (copied as-is)
export interface ServicesBusinessSchema {
  revenue: number
  costs: number
  margin: number
}

// src/schemas/executive-schemas/kpi.ts (copied as-is)
export interface SchemasKPISchema {
  kpi: KPIData
  performance: number
}

// Step 2: Create integration layer
// src/schemas/integration/executive-metrics.ts
import { DecisionMetricsSchema } from '@/schemas/executive-decision/metrics'
import { ServicesBusinessSchema } from '@/schemas/executive-services/business'
import { SchemasKPISchema } from '@/schemas/executive-schemas/kpi'

// Intersection type for shared fields
export type SharedMetricsFields = {
  revenue: number  // Common field
}

// Union for all metrics
export type AllMetrics = DecisionMetricsSchema & ServicesBusinessSchema & SchemasKPISchema

// Discriminated union for specific usage
export type ExecutiveMetrics = 
  | { source: 'decision'; data: DecisionMetricsSchema }
  | { source: 'services'; data: ServicesBusinessSchema }
  | { source: 'schemas'; data: SchemasKPISchema }

// Adapter for unified access
export class MetricsAdapter {
  static toUnified(metrics: ExecutiveMetrics): AllMetrics {
    // Provide defaults for missing fields based on source
    switch (metrics.source) {
      case 'decision':
        return {
          ...metrics.data,
          costs: 0,
          margin: 0,
          kpi: {} as KPIData,
          performance: 0
        }
      case 'services':
        return {
          ...metrics.data,
          profit: metrics.data.revenue - metrics.data.costs,
          roi: 0,
          kpi: {} as KPIData,
          performance: 0
        }
      case 'schemas':
        return {
          revenue: 0,
          profit: 0,
          roi: 0,
          costs: 0,
          margin: 0,
          ...metrics.data
        }
    }
  }
}
```

## Example 2: Same Service Name, Different Implementations

### 🔍 Discovery
```bash
# Both agents created BusinessMetricsService
docker/volumes/tdd_phase_4-decision-support/src/services/executive/BusinessMetricsService.ts
docker/volumes/tdd_phase_4-executive-services/src/services/executive/BusinessMetricsService.ts
```

### ❌ WRONG APPROACH - Picking One
```typescript
// DON'T DO THIS - Deleting one implementation
// Just use decision-support version and delete the other
import { BusinessMetricsService } from '@/services/executive-decision'
// Deleted executive-services version - WRONG!
```

### ✅ CORRECT APPROACH - Keep Both, Compose
```typescript
// Step 1: Place both in namespaced locations
// src/services/executive-decision/BusinessMetricsService.ts
export class DecisionBusinessMetricsService {
  calculateROI(revenue: number, investment: number) {
    return (revenue - investment) / investment * 100
  }
  
  analyzeGrowth(current: number, previous: number) {
    return ((current - previous) / previous) * 100
  }
}

// src/services/executive-services/BusinessMetricsService.ts  
export class ServicesBusinessMetricsService {
  calculateROI(revenue: number, costs: number) {
    return (revenue / costs - 1) * 100
  }
  
  calculateMargin(revenue: number, costs: number) {
    return ((revenue - costs) / revenue) * 100
  }
}

// Step 2: Create unified service
// src/services/integration/UnifiedBusinessMetricsService.ts
import { DecisionBusinessMetricsService } from '@/services/executive-decision/BusinessMetricsService'
import { ServicesBusinessMetricsService } from '@/services/executive-services/BusinessMetricsService'

export class UnifiedBusinessMetricsService {
  private decision = new DecisionBusinessMetricsService()
  private services = new ServicesBusinessMetricsService()
  
  // Expose both calculation methods with clear names
  calculateROIFromInvestment(revenue: number, investment: number) {
    return this.decision.calculateROI(revenue, investment)
  }
  
  calculateROIFromCosts(revenue: number, costs: number) {
    return this.services.calculateROI(revenue, costs)
  }
  
  // Expose unique methods from each
  analyzeGrowth(current: number, previous: number) {
    return this.decision.analyzeGrowth(current, previous)
  }
  
  calculateMargin(revenue: number, costs: number) {
    return this.services.calculateMargin(revenue, costs)
  }
  
  // Smart method that chooses based on available data
  calculateROI(data: { revenue: number; investment?: number; costs?: number }) {
    if (data.investment !== undefined) {
      return this.calculateROIFromInvestment(data.revenue, data.investment)
    } else if (data.costs !== undefined) {
      return this.calculateROIFromCosts(data.revenue, data.costs)
    } else {
      throw new Error('Either investment or costs must be provided')
    }
  }
}

// Step 3: Update tests to use unified service
// src/services/integration/__tests__/UnifiedBusinessMetricsService.test.ts
describe('UnifiedBusinessMetricsService', () => {
  const service = new UnifiedBusinessMetricsService()
  
  // Original decision-support tests still pass
  it('calculates ROI from investment correctly', () => {
    expect(service.calculateROIFromInvestment(1000, 100)).toBe(900)
  })
  
  // Original executive-services tests still pass
  it('calculates ROI from costs correctly', () => {
    expect(service.calculateROIFromCosts(1000, 500)).toBe(100)
  })
  
  // New unified test
  it('intelligently chooses calculation method', () => {
    expect(service.calculateROI({ revenue: 1000, investment: 100 })).toBe(900)
    expect(service.calculateROI({ revenue: 1000, costs: 500 })).toBe(100)
  })
})
```

## Example 3: Component Name Conflicts

### 🔍 Discovery
```bash
# Three agents created ExecutiveDashboard components
docker/volumes/tdd_phase_4-executive-components/src/components/executive/ExecutiveDashboard.tsx
docker/volumes/tdd_phase_4-decision-support/src/components/executive/Dashboard.tsx
docker/volumes/tdd_phase_4-executive-hooks/src/components/executive/MetricsDashboard.tsx
```

### ❌ WRONG APPROACH - Trying to Merge Components
```typescript
// DON'T DO THIS - Attempting to merge different components
export function ExecutiveDashboard(props: any) {
  // Trying to combine logic from all three - WRONG!
  return (
    <div>
      {/* Mixed logic from different implementations */}
    </div>
  )
}
```

### ✅ CORRECT APPROACH - Component Composition
```typescript
// Step 1: Place each in namespaced location
// src/components/executive-components/ExecutiveDashboard.tsx
export function ComponentsExecutiveDashboard({ metrics, theme }: ComponentsDashboardProps) {
  // Original implementation preserved
}

// src/components/executive-decision/Dashboard.tsx
export function DecisionDashboard({ data, onRefresh }: DecisionDashboardProps) {
  // Original implementation preserved
}

// src/components/executive-hooks/MetricsDashboard.tsx
export function HooksMetricsDashboard({ useRealtimeData }: HooksDashboardProps) {
  // Original implementation preserved
}

// Step 2: Create composed dashboard
// src/components/integration/ExecutiveDashboard.tsx
import { ComponentsExecutiveDashboard } from '@/components/executive-components/ExecutiveDashboard'
import { DecisionDashboard } from '@/components/executive-decision/Dashboard'
import { HooksMetricsDashboard } from '@/components/executive-hooks/MetricsDashboard'

export interface UnifiedDashboardProps {
  variant?: 'components' | 'decision' | 'hooks' | 'unified'
  // Accept all possible props
  metrics?: any
  theme?: any
  data?: any
  onRefresh?: () => void
  useRealtimeData?: boolean
}

export function ExecutiveDashboard(props: UnifiedDashboardProps) {
  const { variant = 'unified' } = props
  
  // Single dashboard mode
  if (variant !== 'unified') {
    switch (variant) {
      case 'components':
        return <ComponentsExecutiveDashboard metrics={props.metrics} theme={props.theme} />
      case 'decision':
        return <DecisionDashboard data={props.data} onRefresh={props.onRefresh} />
      case 'hooks':
        return <HooksMetricsDashboard useRealtimeData={props.useRealtimeData} />
    }
  }
  
  // Unified mode - compose all dashboards
  return (
    <div className="unified-executive-dashboard">
      <div className="dashboard-grid">
        {props.metrics && (
          <div className="dashboard-section">
            <h2>Executive Overview</h2>
            <ComponentsExecutiveDashboard metrics={props.metrics} theme={props.theme} />
          </div>
        )}
        
        {props.data && (
          <div className="dashboard-section">
            <h2>Decision Support</h2>
            <DecisionDashboard data={props.data} onRefresh={props.onRefresh} />
          </div>
        )}
        
        {props.useRealtimeData && (
          <div className="dashboard-section">
            <h2>Real-time Metrics</h2>
            <HooksMetricsDashboard useRealtimeData={props.useRealtimeData} />
          </div>
        )}
      </div>
    </div>
  )
}

// Step 3: Export for backward compatibility
export { ComponentsExecutiveDashboard } from '@/components/executive-components/ExecutiveDashboard'
export { DecisionDashboard } from '@/components/executive-decision/Dashboard'
export { HooksMetricsDashboard } from '@/components/executive-hooks/MetricsDashboard'
```

## Example 4: Test Conflicts - When to STOP

### 🔍 Discovery
```bash
# Tests expect different calculations for same metric
docker/volumes/tdd_phase_4-decision-support/calculateProfit.test.ts
# Expects: profit = revenue - costs - taxes

docker/volumes/tdd_phase_4-executive-services/calculateProfit.test.ts  
# Expects: profit = revenue - costs (no taxes)
```

### 🛑 STOP AND REPORT
```markdown
🛑 INTEGRATION BLOCKED - HUMAN INTERVENTION REQUIRED

**Conflict Type**: Incompatible Business Logic
**Severity**: CRITICAL
**Repositories**: decision-support, executive-services

**Issue**: Fundamental disagreement on profit calculation
- Decision Support: `profit = revenue - costs - taxes`
- Executive Services: `profit = revenue - costs`

**Test Impact**:
- Decision tests expect taxes to be deducted (12 tests)
- Services tests expect taxes NOT deducted (8 tests)
- Cannot satisfy both without changing business logic

**Attempted Solutions**:
1. ❌ Namespace approach - Tests still fail
2. ❌ Adapter pattern - Can't adapt incompatible formulas
3. ❌ Union type - Doesn't resolve calculation difference

**Options for Human Decision**:
1. Use Decision Support formula (with taxes) - MORE ACCURATE
2. Use Executive Services formula (no taxes) - SIMPLER
3. Add configuration flag for tax inclusion
4. Rename one to 'grossProfit' and other to 'netProfit'

**Recommendation**: Option 4 - Semantic distinction

**ACTION REQUIRED**: Please provide decision on profit calculation approach
```

## Key Takeaways

1. **Always Try Composition First** - Don't merge, compose
2. **Preserve Everything** - Never delete agent work
3. **Namespace Liberally** - Better to have `executive-decision-support-metrics` than conflicts
4. **Create Adapters** - Bridge differences without modifying originals
5. **Stop When Logic Conflicts** - Don't guess at business rules
6. **Document Decisions** - Leave clear trail of integration choices
7. **Tests Are Truth** - If tests can't pass without modification, STOP

Remember: You're an integrator, not a merger. Your job is to make pieces fit together, not to reshape them.