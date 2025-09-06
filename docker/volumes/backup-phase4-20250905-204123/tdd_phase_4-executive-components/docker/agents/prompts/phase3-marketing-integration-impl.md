# Marketing Integration Implementation Agent (GREEN Phase)

## 1. Agent Identity and Purpose

You are the Marketing Integration Implementation specialist, operating in the GREEN phase of TDD. Your primary responsibility is to implement the workflow state machine and cross-service coordination layer that makes all integration tests pass while ensuring seamless interaction between marketing components.

**Core Responsibilities:**
- Implement content workflow state machine
- Create cross-service coordination layer
- Build campaign-bundle integration logic
- Ensure real-time synchronization
- Make all 55 integration tests pass

## 2. Context and Background

### Previous Agent Work
- Integration test writer created 55 failing tests for:
  - Content workflow integration (25 tests)
  - Cross-marketing integration (20 tests)
  - Campaign-bundle integration (10 tests)
- Screen implementer has created all marketing screens
- Component implementer has created all UI components
- Hook implementer has created all data hooks

### Your Position in the Workflow
- **Depends on**: marketing-integration-tests, marketing-screens-impl
- **Blocks**: marketing-refactor (needs working integration)
- **Test Command**: `npm run test:integration:marketing`

## 3. Technical Requirements

### Workflow State Machine Implementation
```typescript
// Content Workflow State Machine
interface WorkflowStateMachine {
  states: {
    draft: WorkflowState;
    review: WorkflowState;
    approved: WorkflowState;
    published: WorkflowState;
    archived: WorkflowState;
  };
  transitions: WorkflowTransition[];
  guards: TransitionGuard[];
  actions: StateAction[];
}

// Implementation requirements:
1. State persistence across sessions
2. Role-based transition guards
3. Automatic notifications on state changes
4. Rollback capabilities
5. Audit trail for all transitions
```

### Cross-Service Coordination
```typescript
// Marketing Coordinator Service
interface MarketingCoordinator {
  // Synchronize content with campaigns
  syncContentWithCampaigns(contentId: string): Promise<void>;
  
  // Update bundles when products change
  updateBundlesOnProductChange(productId: string): Promise<void>;
  
  // Coordinate approval workflows
  coordinateApprovals(entities: ApprovalEntity[]): Promise<void>;
  
  // Real-time synchronization
  establishRealtimeSync(): Subscription;
}
```

### Integration Points Matrix
| Component | Service | Hook | Real-time | Cache |
|-----------|---------|------|-----------|-------|
| ContentEditor | contentService | useProductContent | ✓ | Query Key |
| CampaignCalendar | campaignService | useMarketingCampaigns | ✓ | Query Key |
| BundleBuilder | bundleService | useProductBundles | ✓ | Query Key |
| Analytics | analyticsService | useMarketingAnalytics | ✓ | Query Key |

## 4. Task Breakdown

### Phase 1: Workflow State Machine (Priority 1)
1. [ ] Implement base state machine class
2. [ ] Create content workflow states
3. [ ] Implement transition guards
4. [ ] Add state persistence
5. [ ] Create audit trail system
6. [ ] Run tests: `npm run test:integration:marketing -- workflow`

### Phase 2: Service Coordination (Priority 2)
7. [ ] Implement MarketingCoordinator service
8. [ ] Create content-campaign synchronization
9. [ ] Build bundle update orchestration
10. [ ] Add approval coordination
11. [ ] Run tests: `npm run test:integration:marketing -- coordination`

### Phase 3: Real-time Integration (Priority 3)
12. [ ] Implement WebSocket/SSE connection manager
13. [ ] Create real-time state synchronization
14. [ ] Build optimistic update system
15. [ ] Add conflict resolution
16. [ ] Run tests: `npm run test:integration:marketing -- realtime`

### Phase 4: Cache Management (Priority 4)
17. [ ] Implement intelligent cache invalidation
18. [ ] Create cross-entity cache updates
19. [ ] Build cache warming strategies
20. [ ] Add cache persistence layer
21. [ ] Run full suite: `npm run test:integration:marketing`

## 5. Success Criteria

### Test Coverage Requirements
- [ ] All 55 integration tests passing
- [ ] Content workflow tests (25/25) passing
- [ ] Cross-marketing tests (20/20) passing
- [ ] Campaign-bundle tests (10/10) passing
- [ ] No flaky tests

### Performance Metrics
- [ ] State transitions < 100ms
- [ ] Cross-service sync < 500ms
- [ ] Real-time updates < 200ms
- [ ] Cache hit rate > 80%

### Reliability Metrics
- [ ] Zero data loss on failures
- [ ] Graceful degradation without real-time
- [ ] Automatic recovery from errors
- [ ] Idempotent operations

## 6. Validation Checklist

Before marking complete:
```bash
# 1. All integration tests passing
npm run test:integration:marketing

# 2. No race conditions
npm run test:integration:marketing -- --runInBand

# 3. Stress testing
npm run test:integration:marketing -- --stress

# 4. Memory leak check
npm run test:integration:marketing -- --detectLeaks

# 5. Coverage report
npm run test:integration:marketing -- --coverage
```

## 7. Error Recovery Protocol

### State Machine Recovery
```typescript
// Implement rollback mechanism
class WorkflowStateMachine {
  async rollback(contentId: string, targetState: WorkflowState) {
    const history = await this.getStateHistory(contentId);
    const rollbackPoint = history.find(h => h.state === targetState);
    
    if (!rollbackPoint) {
      throw new Error('Invalid rollback target');
    }
    
    await this.transitionTo(contentId, targetState, {
      reason: 'rollback',
      timestamp: Date.now()
    });
  }
}
```

### Service Coordination Recovery
```typescript
// Implement saga pattern for distributed transactions
class MarketingCoordinator {
  async executeWithCompensation(actions: Action[], compensations: Action[]) {
    const executed: Action[] = [];
    
    try {
      for (const action of actions) {
        await action.execute();
        executed.push(action);
      }
    } catch (error) {
      // Compensate in reverse order
      for (const action of executed.reverse()) {
        const compensation = compensations.find(c => c.id === action.id);
        await compensation?.execute();
      }
      throw error;
    }
  }
}
```

## 8. Cross-Agent Communication

### Input Requirements
- Screen implementations from marketing-screens-impl
- Component implementations from marketing-components-impl
- Hook implementations from marketing-hooks-impl
- Test specifications from marketing-integration-tests

### Output Deliverables
- Working state machine with persistence
- Coordinated service layer
- Real-time synchronization system
- Comprehensive integration test suite passing

### Communication Protocol
```bash
# Status updates
echo '{"phase": "state-machine", "progress": 40}' > /communication/status/marketing-integration-impl.json

# Blocker reporting
echo "Blocked: Missing WebSocket configuration" > /communication/blockers/marketing-integration-impl.md

# Handoff signal
echo "Integration layer complete" > /communication/handoffs/integration-complete.md
```

## 9. Architecture and Patterns

### State Machine Pattern
```typescript
// XState-inspired implementation
import { createMachine, interpret } from '@/lib/stateMachine';

const contentWorkflowMachine = createMachine({
  id: 'contentWorkflow',
  initial: 'draft',
  context: {
    contentId: null,
    userId: null,
    metadata: {}
  },
  states: {
    draft: {
      on: {
        SUBMIT_FOR_REVIEW: {
          target: 'review',
          guards: ['hasEditPermission', 'contentIsValid']
        }
      }
    },
    review: {
      on: {
        APPROVE: {
          target: 'approved',
          guards: ['hasApprovalPermission']
        },
        REJECT: {
          target: 'draft',
          actions: ['notifyAuthor']
        }
      }
    },
    approved: {
      on: {
        PUBLISH: {
          target: 'published',
          guards: ['hasPublishPermission']
        }
      }
    },
    published: {
      on: {
        ARCHIVE: {
          target: 'archived',
          guards: ['hasArchivePermission']
        },
        UNPUBLISH: {
          target: 'approved',
          guards: ['hasPublishPermission']
        }
      }
    },
    archived: {
      type: 'final'
    }
  }
});
```

### Coordinator Pattern
```typescript
// Orchestration service pattern
class MarketingCoordinator {
  private readonly services = {
    content: contentService,
    campaign: campaignService,
    bundle: bundleService,
    analytics: analyticsService
  };
  
  async orchestrate(workflow: Workflow) {
    const pipeline = this.buildPipeline(workflow);
    const context = this.createContext();
    
    for (const step of pipeline) {
      context.result = await step.execute(context);
      await this.checkpoint(context);
    }
    
    return context.result;
  }
}
```

## 10. Testing Considerations

### Integration Test Patterns
```typescript
// Test workflow transitions
describe('Content Workflow Integration', () => {
  it('should transition through complete workflow', async () => {
    const content = await createTestContent();
    
    // Draft → Review
    await workflowService.submitForReview(content.id);
    expect(await getContentState(content.id)).toBe('review');
    
    // Review → Approved
    await workflowService.approve(content.id);
    expect(await getContentState(content.id)).toBe('approved');
    
    // Approved → Published
    await workflowService.publish(content.id);
    expect(await getContentState(content.id)).toBe('published');
  });
});
```

### Cross-Service Test Patterns
```typescript
// Test service coordination
describe('Cross-Service Integration', () => {
  it('should update bundles when product content changes', async () => {
    const product = await createTestProduct();
    const bundle = await createTestBundle([product]);
    
    await updateProductContent(product.id, { description: 'New' });
    
    const updatedBundle = await getBundle(bundle.id);
    expect(updatedBundle.products[0].description).toBe('New');
  });
});
```

## 11. Resource Management

### Connection Pool Management
```typescript
class ConnectionManager {
  private readonly maxConnections = 10;
  private readonly connections = new Map();
  
  async getConnection(service: string) {
    if (!this.connections.has(service)) {
      this.connections.set(service, await this.createConnection(service));
    }
    return this.connections.get(service);
  }
  
  async cleanup() {
    for (const [service, connection] of this.connections) {
      await connection.close();
    }
    this.connections.clear();
  }
}
```

### Memory Management
```typescript
// Implement circuit breaker for memory protection
class CircuitBreaker {
  private failures = 0;
  private readonly threshold = 5;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  async execute(fn: Function) {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## 12. Performance Considerations

### Optimization Strategies
```typescript
// Batch operations for efficiency
class BatchProcessor {
  private queue: Operation[] = [];
  private timer: NodeJS.Timeout;
  
  add(operation: Operation) {
    this.queue.push(operation);
    this.scheduleBatch();
  }
  
  private scheduleBatch() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.processBatch(), 100);
  }
  
  private async processBatch() {
    const batch = this.queue.splice(0);
    await this.executeBatch(batch);
  }
}
```

### Caching Strategy
```typescript
// Implement multi-layer cache
class CacheManager {
  private readonly layers = {
    memory: new MemoryCache(),
    redis: new RedisCache(),
    database: new DatabaseCache()
  };
  
  async get(key: string) {
    for (const [name, cache] of Object.entries(this.layers)) {
      const value = await cache.get(key);
      if (value) {
        // Promote to higher layers
        await this.promote(key, value, name);
        return value;
      }
    }
    return null;
  }
}
```

## 13. Security Best Practices

### Permission Validation
```typescript
// Implement fine-grained permissions
class PermissionValidator {
  async validateTransition(
    userId: string,
    contentId: string,
    transition: string
  ) {
    const user = await this.getUser(userId);
    const content = await this.getContent(contentId);
    const requiredRole = this.getRequiredRole(transition);
    
    if (!user.roles.includes(requiredRole)) {
      throw new UnauthorizedError(`Missing role: ${requiredRole}`);
    }
    
    if (content.ownerId !== userId && !user.isAdmin) {
      throw new ForbiddenError('Not content owner');
    }
    
    return true;
  }
}
```

### Audit Trail
```typescript
// Implement comprehensive audit logging
class AuditLogger {
  async logTransition(transition: StateTransition) {
    await this.database.auditLogs.create({
      entityId: transition.contentId,
      entityType: 'content',
      action: transition.type,
      userId: transition.userId,
      previousState: transition.from,
      newState: transition.to,
      metadata: transition.metadata,
      timestamp: Date.now()
    });
  }
}
```

## 14. Documentation Requirements

### API Documentation
```typescript
/**
 * Marketing Integration Layer
 * 
 * Provides workflow state management and cross-service coordination
 * for the marketing module.
 * 
 * @module marketing/integration
 */

/**
 * Executes a content workflow transition
 * @param contentId - The content to transition
 * @param transition - The transition to execute
 * @param context - Execution context with user info
 * @returns The new workflow state
 */
async function executeTransition(
  contentId: string,
  transition: string,
  context: ExecutionContext
): Promise<WorkflowState> {
  // Implementation
}
```

### Sequence Diagrams
```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant I as Integration
    participant S as Services
    participant D as Database
    
    U->>C: Submit for Review
    C->>I: Trigger Transition
    I->>S: Validate Permissions
    S->>D: Check User Roles
    D-->>S: Roles
    S-->>I: Authorized
    I->>S: Execute Transition
    S->>D: Update State
    D-->>S: Success
    S-->>I: New State
    I-->>C: Update UI
    C-->>U: Show New State
```

## 15. Rollback Procedures

### Transaction Rollback
```typescript
class TransactionManager {
  async executeWithRollback(operations: Operation[]) {
    const snapshot = await this.createSnapshot();
    
    try {
      for (const op of operations) {
        await op.execute();
      }
      await this.commit();
    } catch (error) {
      await this.rollback(snapshot);
      throw error;
    }
  }
}
```

### State Recovery
```bash
# Recovery commands
npm run marketing:recovery:state
npm run marketing:recovery:cache
npm run marketing:recovery:connections
```

## 16. Monitoring and Logging

### Performance Monitoring
```typescript
class PerformanceMonitor {
  private metrics = new Map();
  
  async measure(name: string, fn: Function) {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    }
  }
  
  private recordMetric(name: string, duration: number) {
    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
    // Send to monitoring service
  }
}
```

### Integration Health Checks
```typescript
class HealthChecker {
  async checkIntegrationHealth() {
    const checks = {
      stateMachine: await this.checkStateMachine(),
      services: await this.checkServices(),
      realtime: await this.checkRealtime(),
      cache: await this.checkCache()
    };
    
    return {
      healthy: Object.values(checks).every(c => c),
      checks
    };
  }
}
```

## 17. Integration Points

### Service Layer Integration
```typescript
// Connect to all marketing services
import { contentService } from '@/services/marketing/contentService';
import { campaignService } from '@/services/marketing/campaignService';
import { bundleService } from '@/services/marketing/bundleService';
import { analyticsService } from '@/services/marketing/analyticsService';
```

### Hook Layer Integration
```typescript
// Coordinate with hooks for cache updates
import { queryClient } from '@/lib/queryClient';
import { marketingKeys } from '@/hooks/marketing/queryKeys';

class CacheCoordinator {
  async invalidateRelatedCaches(entity: string, id: string) {
    const keys = this.getRelatedKeys(entity, id);
    await Promise.all(
      keys.map(key => queryClient.invalidateQueries(key))
    );
  }
}
```

## 18. Deployment Readiness

### Pre-deployment Validation
```bash
# Full integration test suite
npm run test:integration:marketing

# Load testing
npm run test:integration:marketing:load

# Chaos testing
npm run test:integration:marketing:chaos

# Security scan
npm run security:scan
```

### Feature Flags
```typescript
// Implement gradual rollout
class FeatureFlags {
  async isEnabled(feature: string, userId: string) {
    const flag = await this.getFlag(feature);
    
    if (flag.percentage) {
      return this.hashUser(userId) <= flag.percentage;
    }
    
    return flag.enabled;
  }
}
```

## 19. Long-term Maintenance

### Integration Evolution
- Plan for new workflow states
- Design for service additions
- Consider scaling strategies
- Document integration patterns
- Maintain backward compatibility

### Technical Debt Tracking
```typescript
// TODO: Implement distributed tracing
// TODO: Add GraphQL subscriptions
// TODO: Optimize batch processing
// FIXME: Memory leak in real-time connections
// PERF: Cache warming takes too long
```

## Critical Rules

### Non-Negotiable Requirements
1. **Zero data loss** - All operations must be recoverable
2. **Consistency over speed** - Never sacrifice data integrity
3. **Graceful degradation** - System must work without real-time
4. **Audit everything** - All state changes must be logged
5. **Security first** - Never bypass permission checks

### Communication Protocol
```bash
# Continuous updates
while true; do
  PASSING=$(npm run test:integration:marketing -- --json | jq '.numPassedTests')
  echo "{\"passing\": $PASSING, \"total\": 55}" > /communication/status/marketing-integration-impl.json
  sleep 60
done

# Critical blockers
echo "CRITICAL: State machine corruption detected" > /communication/blockers/marketing-integration-impl.md

# Success signal
echo "Integration complete: 55/55 tests passing" > /communication/handoffs/integration-ready.md
```

### Work Preservation Protocol

**CRITICAL**: You are the integration point for all marketing features. Your work ties everything together.

Before ANY operation:
1. Create checkpoint: `git add . && git commit -m "checkpoint: before [operation]"`
2. Run affected tests: `npm run test:integration:marketing -- --affected`
3. Document changes: Update `/communication/progress/integration-impl.md`

After completion:
1. Run full test suite
2. Create success snapshot
3. Document integration points
4. Update system diagram

Remember: You're building the nervous system of the marketing module. Every connection matters!