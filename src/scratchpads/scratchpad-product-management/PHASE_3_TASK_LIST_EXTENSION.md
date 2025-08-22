# Phase 3 Extension: Marketing Operations Screen Integration
**Closing the UI Layer and Content Workflow Integration Gaps with Full Compliance**

## 📋 **Overview**

**Extension Scope**: Complete missing marketing screens and content workflow UI  
**Foundation**: Builds on existing Phase 3 marketing services  
**Target**: Fully integrated marketing operations with content management workflows  
**Compliance**: 100% adherence to `docs/architectural-patterns-and-best-practices.md`

---

## 🧪 **Test Setup Configuration**

### **Service Test Setup (Following scratchpad-service-test-setup patterns)**
```typescript
// src/test/serviceSetup.ts patterns to follow:
- Mock-based setup for marketing service isolation
- Content workflow state machine testing
- File upload mock handlers
- Campaign lifecycle testing mocks
- Bundle calculation testing utilities
```

### **Hook Test Setup for Marketing**
```typescript
// src/test/marketingHookSetup.ts
- Real React Query for content operations
- File upload progress testing
- Content workflow state transitions
- Campaign scheduling testing
- Bundle pricing calculations
```

### **Screen Test Setup for Marketing**
```typescript
// src/test/marketingScreenSetup.ts
- React Native Testing Library for marketing UI
- Content editor testing utilities
- Image upload gesture testing
- Campaign calendar interactions
- Bundle builder drag-and-drop testing
```

---

## 🚨 **Identified Gaps to Address**

### **Critical Missing Components**
1. ❌ **MarketingDashboard Screen** - Campaign overview and metrics
2. ❌ **ProductContentScreen** - Content editing with workflow states
3. ❌ **CampaignPlannerScreen** - Campaign creation and scheduling
4. ❌ **BundleManagementScreen** - Product bundle builder
5. ❌ **MarketingAnalyticsScreen** - Performance metrics and insights
6. ❌ **Content Workflow UI** - Draft → Review → Approved → Published flow
7. ❌ **Hook-Service Integration** - Connect marketing hooks to services

---

## 📝 **Detailed TDD Task Breakdown**

## **Phase 3.E1: Marketing Hooks Implementation (RED → GREEN → REFACTOR → AUDIT)**

### **Day 1 Tasks - Hook Test Setup (SETUP Phase)**

**Task 3.E1.1: Setup Marketing Hook Test Infrastructure**
```bash
# Following scratchpad-service-test-setup patterns
- [ ] Create jest.config.hooks.marketing.js
- [ ] Setup marketing hook test utilities
- [ ] Configure mock content data generators
- [ ] Setup file upload mock handlers
- [ ] Add test scripts to package.json:
      "test:hooks:marketing": "jest --config=jest.config.hooks.marketing.js --forceExit"
      "test:hooks:marketing:watch": "jest --config=jest.config.hooks.marketing.js --watch"
```

### **Day 1 Tasks - Hook Tests (RED Phase)**

**Task 3.E1.2: Write Content Management Hooks Tests (25+ tests)**
```typescript
// src/hooks/marketing/__tests__/useContentManagement.test.tsx
- [ ] Test content CRUD operations
- [ ] Test workflow state transitions
- [ ] Test content validation
- [ ] Test image upload with progress
- [ ] Test gallery management
- [ ] Test SEO keyword suggestions
- [ ] Test content versioning
- [ ] Test approval workflow
- [ ] Test publishing scheduling
- [ ] Test rollback capabilities
```

**Task 3.E1.3: Write Campaign Hooks Tests (20+ tests)**
```typescript
// src/hooks/marketing/__tests__/useCampaignManagement.test.tsx
- [ ] Test campaign creation
- [ ] Test campaign scheduling
- [ ] Test discount calculations
- [ ] Test target audience selection
- [ ] Test campaign status updates
- [ ] Test performance metrics
- [ ] Test campaign cloning
- [ ] Test A/B testing setup
- [ ] Test notification scheduling
```

**Task 3.E1.4: Write Bundle Hooks Tests (15+ tests)**
```typescript
// src/hooks/marketing/__tests__/useBundleManagement.test.tsx
- [ ] Test bundle creation
- [ ] Test product associations
- [ ] Test pricing calculations
- [ ] Test discount validations
- [ ] Test inventory impact
- [ ] Test bundle activation
- [ ] Test featured bundle logic
- [ ] Test bundle performance tracking
```

**Expected Result**: All hook tests FAIL (RED phase) - hooks don't exist

### **Day 1 Tasks - Hook Implementation (GREEN Phase)**

**Task 3.E1.5: Implement Content Management Hooks**
```typescript
// src/hooks/marketing/useContentManagement.ts
- [ ] Create useProductContent hook
- [ ] Implement useContentWorkflow
- [ ] Add useContentUpload with progress
- [ ] Create useContentApproval
- [ ] Implement useContentPublishing
- [ ] Use centralized query key factory (marketingKeys)
- [ ] Add optimistic updates for content
- [ ] Integrate ValidationMonitor
```

**Task 3.E1.6: Implement Campaign Management Hooks**
```typescript
// src/hooks/marketing/useCampaignManagement.ts
- [ ] Create useCampaigns hook
- [ ] Implement useCampaignScheduling
- [ ] Add useCampaignMetrics
- [ ] Create useCampaignTargeting
- [ ] Implement campaign lifecycle hooks
- [ ] Use centralized query keys (NO dual systems!)
- [ ] Add real-time campaign updates
```

**Task 3.E1.7: Implement Bundle Management Hooks**
```typescript
// src/hooks/marketing/useBundleManagement.ts
- [ ] Create useProductBundles hook
- [ ] Implement useBundlePricing
- [ ] Add useBundleInventory
- [ ] Create useBundlePerformance
- [ ] Add bundle activation hooks
- [ ] Integrate with inventory hooks
```

**Expected Result**: All 60+ hook tests PASS (GREEN phase)

**🎯 Commit Gate 3.E1**: 
```bash
npm run test:hooks:marketing
# If all tests pass → Auto commit:
git add -A && git commit -m "feat(marketing-hooks): implement marketing hooks with content workflows"
```

### **Day 1 Tasks - Hook Audit (AUDIT Phase)**

**Task 3.E1.8: Hook Pattern Compliance Audit**
- [ ] Verify centralized query key usage (marketingKeys only)
- [ ] Check content workflow state machine
- [ ] Validate file upload patterns
- [ ] Ensure optimistic update patterns
- [ ] Verify ValidationMonitor integration
- [ ] Check TypeScript strict compliance
- [ ] Run hook validation:
```bash
npm run validate:marketing-hooks
```

---

## **Phase 3.E2: Marketing Screens Implementation (RED → GREEN → REFACTOR → AUDIT)**

### **Day 2 Tasks - Screen Test Setup (SETUP Phase)**

**Task 3.E2.1: Setup Marketing Screen Test Infrastructure**
```bash
# Following scratchpad-service-test-setup patterns
- [ ] Create jest.config.screens.marketing.js
- [ ] Setup marketing screen test utilities
- [ ] Configure content editor mocks
- [ ] Setup campaign calendar mocks
- [ ] Add test scripts:
      "test:screens:marketing": "jest --config=jest.config.screens.marketing.js --forceExit"
```

### **Day 2 Tasks - Screen Tests (RED Phase)**

**Task 3.E2.2: Write Marketing Dashboard Screen Tests (25+ tests)**
```typescript
// src/screens/marketing/__tests__/MarketingDashboard.test.tsx
- [ ] Test campaign overview cards
- [ ] Test content status widgets
- [ ] Test upcoming promotions list
- [ ] Test performance metrics display
- [ ] Test quick action buttons
- [ ] Test navigation to sub-screens
- [ ] Test real-time updates
- [ ] Test role-based visibility
- [ ] Test pull-to-refresh
- [ ] Test accessibility compliance
```

**Task 3.E2.3: Write Product Content Screen Tests (30+ tests)**
```typescript
// src/screens/marketing/__tests__/ProductContentScreen.test.tsx
- [ ] Test content editor interface
- [ ] Test rich text formatting
- [ ] Test image upload with preview
- [ ] Test gallery management
- [ ] Test SEO keyword interface
- [ ] Test workflow state transitions
- [ ] Test approval request flow
- [ ] Test publishing scheduler
- [ ] Test content preview
- [ ] Test version history
- [ ] Test rollback functionality
```

**Task 3.E2.4: Write Campaign Planner Screen Tests (25+ tests)**
```typescript
// src/screens/marketing/__tests__/CampaignPlannerScreen.test.tsx
- [ ] Test campaign creation wizard
- [ ] Test calendar interface
- [ ] Test discount configuration
- [ ] Test audience targeting
- [ ] Test campaign templates
- [ ] Test scheduling interface
- [ ] Test conflict detection
- [ ] Test preview functionality
- [ ] Test notification setup
- [ ] Test campaign analytics
```

**Expected Result**: All screen tests FAIL (RED phase) - screens don't exist

### **Day 2 Tasks - Screen Implementation (GREEN Phase)**

**Task 3.E2.5: Implement Marketing Dashboard Screen**
```typescript
// src/screens/marketing/MarketingDashboard.tsx
- [ ] Create dashboard layout
- [ ] Add campaign overview widgets
- [ ] Implement content status cards
- [ ] Add promotion timeline
- [ ] Create quick actions grid
- [ ] Integrate marketing hooks
- [ ] Add real-time updates
- [ ] Implement role filtering
- [ ] Add analytics tracking
```

**Task 3.E2.6: Implement Product Content Screen**
```typescript
// src/screens/marketing/ProductContentScreen.tsx
- [ ] Create content editor UI
- [ ] Add rich text editor
- [ ] Implement image uploader
- [ ] Create gallery manager
- [ ] Add SEO tools section
- [ ] Implement workflow controls
- [ ] Add approval interface
- [ ] Create publishing scheduler
- [ ] Add preview modal
- [ ] Implement version history
```

**Task 3.E2.7: Implement Campaign Planner Screen**
```typescript
// src/screens/marketing/CampaignPlannerScreen.tsx
- [ ] Create campaign wizard
- [ ] Implement calendar view
- [ ] Add discount configurator
- [ ] Create audience selector
- [ ] Add template gallery
- [ ] Implement scheduling UI
- [ ] Add conflict checker
- [ ] Create preview interface
- [ ] Add notification builder
```

**Expected Result**: All 80+ screen tests PASS (GREEN phase)

**🎯 Commit Gate 3.E2**: 
```bash
npm run test:screens:marketing
# If all tests pass → Auto commit:
git add -A && git commit -m "feat(marketing-screens): implement marketing screens with content workflows"
```

### **Day 2 Tasks - Screen Audit (AUDIT Phase)**

**Task 3.E2.8: Screen Pattern Compliance Audit**
- [ ] Verify content workflow UI patterns
- [ ] Check file upload implementation
- [ ] Validate form validation patterns
- [ ] Ensure accessibility compliance
- [ ] Verify responsive design
- [ ] Check performance optimizations
- [ ] Run screen validation:
```bash
npm run validate:marketing-screens
```

---

## **Phase 3.E3: Bundle Management & Cross-Integration (RED → GREEN → REFACTOR → AUDIT)**

### **Day 3 Tasks - Bundle Tests (RED Phase)**

**Task 3.E3.1: Write Bundle Management Screen Tests (25+ tests)**
```typescript
// src/screens/marketing/__tests__/BundleManagementScreen.test.tsx
- [ ] Test bundle builder interface
- [ ] Test product selection
- [ ] Test drag-and-drop ordering
- [ ] Test pricing calculator
- [ ] Test discount preview
- [ ] Test inventory validation
- [ ] Test bundle templates
- [ ] Test activation controls
- [ ] Test performance metrics
- [ ] Test bundle preview
```

**Task 3.E3.2: Write Marketing Analytics Screen Tests (20+ tests)**
```typescript
// src/screens/marketing/__tests__/MarketingAnalyticsScreen.test.tsx
- [ ] Test metric visualizations
- [ ] Test date range selection
- [ ] Test campaign comparisons
- [ ] Test content performance
- [ ] Test bundle analytics
- [ ] Test export functionality
- [ ] Test drill-down navigation
- [ ] Test real-time updates
```

### **Day 3 Tasks - Bundle Implementation (GREEN Phase)**

**Task 3.E3.3: Implement Bundle Management Screen**
```typescript
// src/screens/marketing/BundleManagementScreen.tsx
- [ ] Create bundle builder UI
- [ ] Add product selector
- [ ] Implement drag-drop interface
- [ ] Create pricing calculator
- [ ] Add discount configurator
- [ ] Integrate inventory validation
- [ ] Add template system
- [ ] Implement activation controls
```

**Task 3.E3.4: Implement Marketing Analytics Screen**
```typescript
// src/screens/marketing/MarketingAnalyticsScreen.tsx
- [ ] Create analytics dashboard
- [ ] Add chart components
- [ ] Implement date filters
- [ ] Add comparison tools
- [ ] Create drill-down navigation
- [ ] Add export functionality
- [ ] Integrate real-time data
```

**Expected Result**: All 45+ bundle tests PASS (GREEN phase)

**🎯 Commit Gate 3.E3**: 
```bash
npm run test:screens:bundle
# If all tests pass → Auto commit:
git add -A && git commit -m "feat(marketing-bundle): implement bundle management and analytics screens"
```

---

## **Phase 3.E4: Content Workflow Integration (RED → GREEN → REFACTOR → AUDIT)**

### **Day 4 Tasks - Workflow Tests (RED Phase)**

**Task 3.E4.1: Write Content Workflow Integration Tests (25+ tests)**
```typescript
// src/__tests__/integration/marketing/contentWorkflow.test.tsx
- [ ] Test draft → review transition
- [ ] Test review → approved transition
- [ ] Test approved → published transition
- [ ] Test rejection flow
- [ ] Test rollback capabilities
- [ ] Test multi-user collaboration
- [ ] Test conflict resolution
- [ ] Test notification system
- [ ] Test audit trail
- [ ] Test permission enforcement
```

**Task 3.E4.2: Write Cross-Marketing Integration Tests (20+ tests)**
```typescript
// src/__tests__/integration/marketing/crossMarketing.test.tsx
- [ ] Test content-campaign integration
- [ ] Test bundle-inventory integration
- [ ] Test campaign-notification integration
- [ ] Test analytics data flow
- [ ] Test real-time synchronization
- [ ] Test cache coordination
- [ ] Test error recovery
```

### **Day 4 Tasks - Workflow Implementation (GREEN Phase)**

**Task 3.E4.3: Implement Content Workflow System**
- [ ] Create workflow state machine
- [ ] Implement transition validators
- [ ] Add approval system
- [ ] Create notification triggers
- [ ] Implement audit logging
- [ ] Add permission checks
- [ ] Create rollback mechanism

**Task 3.E4.4: Implement Cross-Marketing Integration**
- [ ] Connect content to campaigns
- [ ] Integrate bundles with inventory
- [ ] Link campaigns to notifications
- [ ] Coordinate analytics collection
- [ ] Implement real-time sync
- [ ] Add cache coordination

**Expected Result**: All 45+ workflow tests PASS (GREEN phase)

**🎯 Commit Gate 3.E4**: 
```bash
npm run test:integration:marketing:workflow
# If all tests pass → Auto commit:
git add -A && git commit -m "feat(marketing-workflow): implement content workflow and cross-integration"
```

---

## **Phase 3.E5: Final Compliance Audit (AUDIT → FIX → VALIDATE)**

### **Day 5 Tasks - Comprehensive Audit (AUDIT Phase)**

**Task 3.E5.1: Full Marketing Pattern Compliance Audit (40+ checks)**
- [ ] **Content Workflow Patterns**
  - [ ] State machine implementation
  - [ ] Transition validation
  - [ ] Approval flow patterns
  - [ ] Rollback mechanisms
- [ ] **File Upload Patterns**
  - [ ] Progress tracking
  - [ ] Error recovery
  - [ ] Security validation
  - [ ] Size/type restrictions
- [ ] **Campaign Management Patterns**
  - [ ] Lifecycle management
  - [ ] Scheduling patterns
  - [ ] Conflict detection
  - [ ] Template system
- [ ] **Bundle Integration Patterns**
  - [ ] Inventory validation
  - [ ] Pricing calculations
  - [ ] Cross-service coordination
- [ ] **Hook Layer Patterns**
  - [ ] Centralized query keys (marketingKeys)
  - [ ] Optimistic updates
  - [ ] File upload progress
  - [ ] Workflow state management
- [ ] **Screen Layer Patterns**
  - [ ] Content editor patterns
  - [ ] Calendar interface patterns
  - [ ] Drag-drop patterns
  - [ ] Preview patterns

**Task 3.E5.2: Run Automated Compliance Checks**
```bash
# Run all marketing pattern validation
npm run validate:marketing:all
npm run test:marketing:coverage -- --coverage-threshold=90
npm run audit:marketing:security
npm run perf:marketing:benchmark
```

### **Day 5 Tasks - Fix Violations (FIX Phase)**

**Task 3.E5.3: Pattern Violation Remediation**
- [ ] Fix workflow pattern violations
- [ ] Correct file upload issues
- [ ] Fix campaign management problems
- [ ] Resolve bundle integration issues
- [ ] Fix hook pattern violations
- [ ] Correct screen implementation issues

### **Day 5 Tasks - Validate Fixes (VALIDATE Phase)**

**Task 3.E5.4: Final Validation**
- [ ] Re-run all marketing tests
- [ ] Re-run pattern validation
- [ ] Verify workflow integrity
- [ ] Confirm file upload security
- [ ] Validate performance targets

**🎯 Final Commit Gate**: 
```bash
npm run test:marketing:all
npm run validate:marketing:patterns
# If all pass → Auto commit:
git add -A && git commit -m "feat(marketing): Phase 3 extension complete with full compliance"
```

---

## 🎯 **Automated Commit Strategy**

### **Commit on Test Success Pattern**
```json
// package.json scripts
{
  "scripts": {
    "test:marketing:commit": "npm run test:marketing:all && git add -A && git commit -m 'feat(marketing): tests passing - auto commit'",
    "test:hooks:marketing:commit": "npm run test:hooks:marketing && npm run commit:marketing:hooks",
    "test:screens:marketing:commit": "npm run test:screens:marketing && npm run commit:marketing:screens",
    "test:workflow:marketing:commit": "npm run test:integration:marketing:workflow && npm run commit:marketing:workflow",
    "commit:marketing:hooks": "git add -A && git commit -m 'feat(marketing-hooks): marketing hooks complete'",
    "commit:marketing:screens": "git add -A && git commit -m 'feat(marketing-screens): marketing screens complete'",
    "commit:marketing:workflow": "git add -A && git commit -m 'feat(marketing-workflow): content workflow complete'"
  }
}
```

### **Pre-commit Validation**
```bash
# .husky/pre-commit for marketing
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run marketing pattern validation before commit
npm run validate:marketing:patterns
npm run test:marketing:affected
```

---

## 📊 **Success Metrics**

### **Test Coverage Targets**
- **Hook Layer**: 60+ tests (content, campaigns, bundles)
- **Screen Layer**: 80+ tests (dashboard, content, planner, bundles)
- **Workflow Layer**: 45+ tests (state machine, integration)
- **Analytics Layer**: 20+ tests (metrics, visualizations)
- **Compliance Checks**: 40+ pattern validations
- **Total**: 245+ tests with full compliance validation

### **Performance Targets**
- Content query: <200ms
- Image upload (5MB): <10s with progress
- Campaign creation: <500ms
- Bundle calculation: <100ms
- Workflow transition: <200ms
- Pattern validation: <10s

### **Quality Gates**
- Test coverage: >90%
- TypeScript strict: 100% compliance
- Pattern violations: 0
- Accessibility score: >95%
- Workflow integrity: 100%

---

## 🎯 **Expected Deliverables**

### **New Files to Create**
```
src/hooks/marketing/useContentManagement.ts
src/hooks/marketing/useCampaignManagement.ts
src/hooks/marketing/useBundleManagement.ts
src/hooks/marketing/useContentWorkflow.ts
src/hooks/marketing/useMarketingAnalytics.ts
src/hooks/marketing/__tests__/*.test.tsx
src/screens/marketing/MarketingDashboard.tsx
src/screens/marketing/ProductContentScreen.tsx
src/screens/marketing/CampaignPlannerScreen.tsx
src/screens/marketing/BundleManagementScreen.tsx
src/screens/marketing/MarketingAnalyticsScreen.tsx
src/screens/marketing/__tests__/*.test.tsx
src/components/marketing/ContentEditor.tsx
src/components/marketing/CampaignCalendar.tsx
src/components/marketing/BundleBuilder.tsx
src/components/marketing/WorkflowIndicator.tsx
src/components/marketing/ImageUploader.tsx
src/__tests__/integration/marketing/contentWorkflow.test.tsx
src/__tests__/integration/marketing/crossMarketing.test.tsx
src/utils/marketing/workflowStateMachine.ts
scripts/validate-marketing-patterns.js
jest.config.hooks.marketing.js
jest.config.screens.marketing.js
```

### **Files to Modify**
```
src/services/marketing/productContentService.ts (add UI helpers)
src/services/marketing/marketingCampaignService.ts (add UI helpers)
src/services/marketing/productBundleService.ts (add UI helpers)
src/utils/queryKeyFactory.ts (ensure marketing keys present)
src/test/serviceSetup.ts (add marketing mocks)
package.json (add marketing test scripts)
```

---

## ✅ **Phase 3 Extension Readiness Checklist**

- [x] Original Phase 3 marketing services exist
- [x] Marketing schema in database
- [x] Content workflow states defined
- [x] Test setup patterns available
- [ ] Ready to implement marketing hooks
- [ ] Ready to create marketing screens
- [ ] Ready for workflow integration

---

**This extension ensures Phase 3 provides complete marketing operations with content workflows, campaign management, and 100% pattern compliance.**

**Next Step**: Run `npm run test:hooks:marketing` to start RED phase 🚀