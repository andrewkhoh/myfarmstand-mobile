# Phase 3: Marketing Operations - Detailed Task List

## 📋 **Overview**

**Phase 3 Scope**: Marketing Operations with Content Management Workflows  
**Foundation**: Builds on Phase 1's role-based permissions + Phase 2's inventory operations  
**Target**: Complete marketing staff admin with content workflows and campaign management  
**Compliance**: 100% adherence to `docs/architectural-patterns-and-best-practices.md`

---

## 🎯 **Core Requirements Analysis**

### **Business Operations Needed**
1. **Product Content Management** - Upload/edit product images, descriptions, marketing copy
2. **Campaign Planning** - Create promotional campaigns, schedule content updates
3. **Bundle Management** - Create product bundles with special pricing
4. **Marketing Analytics** - Track campaign performance, content engagement metrics
5. **Cross-Role Integration** - Marketing actions affect inventory (tracked for executive analytics)

### **Role-Based Access Control Integration**
- **`marketing_staff`** - Full content management, campaign creation, bundle operations
- **`inventory_staff`** - View marketing content, limited bundle visibility (affecting stock)
- **`executive`** - View all marketing analytics and campaign performance (read-only)
- **`admin`** - All marketing operations + system configuration

---

## 🗃️ **Database Schema Design**

### **Primary Tables**
```sql
-- Product content management
CREATE TABLE product_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  marketing_title VARCHAR(255),
  marketing_description TEXT,
  marketing_highlights TEXT[], -- Key selling points
  seo_keywords TEXT[],
  featured_image_url VARCHAR(500),
  gallery_urls TEXT[],
  content_status TEXT NOT NULL DEFAULT 'draft' CHECK (content_status IN ('draft', 'review', 'approved', 'published')),
  content_priority INTEGER DEFAULT 1 CHECK (content_priority BETWEEN 1 AND 5),
  last_updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing campaigns
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('seasonal', 'promotional', 'new_product', 'clearance')),
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  discount_percentage DECIMAL(5,2),
  target_audience TEXT,
  campaign_status TEXT NOT NULL DEFAULT 'planned' CHECK (campaign_status IN ('planned', 'active', 'paused', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product bundles
CREATE TABLE product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_name VARCHAR(255) NOT NULL,
  bundle_description TEXT,
  bundle_price DECIMAL(10,2) NOT NULL,
  bundle_discount_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 100,
  campaign_id UUID REFERENCES marketing_campaigns(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bundle product associations
CREATE TABLE bundle_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_id, product_id)
);

-- Campaign performance tracking
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('views', 'clicks', 'conversions', 'revenue')),
  metric_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  product_id UUID REFERENCES products(id), -- For product-specific metrics
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, metric_date, metric_type, product_id)
);
```

### **Role-Based Security (RLS)**
- **marketing_staff**: Full access to content, campaigns, bundles, metrics
- **inventory_staff**: Read campaigns/bundles (affects stock planning), no content editing
- **executive**: Read-only access for analytics and performance insights
- **admin**: Full access to everything + system configuration

---

## 🏗️ **Implementation Architecture**

Following the exact same 4-layer architecture as Phase 1 & 2:

### **Layer 1: Schema Contracts**
- Database-first validation with exact field alignment
- Content workflow state validation (draft → review → approved → published)
- Campaign date validation and business rule enforcement

### **Layer 2: Service Layer**  
- Direct Supabase queries with ValidationMonitor integration
- Role permission integration using Phase 1 system
- Content workflow orchestration with state management
- Cross-role analytics collection for executive insights

### **Layer 3: Hook Layer**
- React Query integration with centralized query keys (extend roleKeys factory)
- Content upload progress tracking with optimistic updates
- Campaign metric aggregation and real-time updates

### **Layer 4: Integration Layer**
- Content workflow validation (upload → review → approval → publish)
- Cross-role integration (marketing actions → inventory impact tracking)
- Campaign performance pipeline validation

---

## 📝 **Detailed TDD Task Breakdown**

## **Phase 3.1: Schema Layer (RED → GREEN → REFACTOR)**

### **Day 1 Tasks - Schema Contract Tests (RED Phase)**

**Task 3.1.1: Create Database Schema**
- [ ] Create `database/marketing-test-schema.sql` with complete table definitions
- [ ] Include RLS policies for all 4 role types
- [ ] Add performance indexes for content queries and campaign analytics
- [ ] Include sample test data for content workflows

**Task 3.1.2: Create Database Mock Types**
- [ ] Create `src/schemas/marketing/__contracts__/database-mock.types.ts`
- [ ] Define exact TypeScript interfaces matching database structure
- [ ] Include Row, Insert, Update types for all 5 tables
- [ ] Ensure workflow state validation matches database constraints

**Task 3.1.3: Write Product Content Contract Tests (15+ tests)**
- [ ] Database interface alignment validation (compile-time enforcement)
- [ ] Content workflow state transition validation
- [ ] File upload URL validation and security checks
- [ ] Content status progression (draft → review → approved → published)
- [ ] Marketing field transformation (snake→camel)
- [ ] Role-based permission integration tests
- [ ] Query key factory integration validation (prevent dual systems)
- [ ] Edge cases: empty content, file upload failures, state conflicts
- [ ] Type safety enforcement across all content fields
- [ ] Complete workflow interface coverage validation

**Task 3.1.4: Write Marketing Campaign Contract Tests (12+ tests)**
- [ ] Campaign lifecycle validation (planned → active → completed)
- [ ] Date validation and business rule enforcement
- [ ] Campaign type enum constraint validation
- [ ] Discount percentage validation and constraints
- [ ] Performance metrics aggregation schema validation
- [ ] Type safety for all campaign fields
- [ ] Integration with bundle and content systems

**Task 3.1.5: Write Product Bundle Contract Tests (10+ tests)**
- [ ] Bundle pricing calculation validation
- [ ] Product association constraints and business rules
- [ ] Bundle display order and feature priority validation
- [ ] Campaign association validation
- [ ] Inventory impact tracking preparation
- [ ] Type safety for bundle configuration

**Expected Result**: All contract tests FAIL (RED phase) - schemas don't exist yet

### **Day 1 Tasks - Schema Implementation (GREEN Phase)**

**Task 3.1.6: Implement Product Content Schemas**
- [ ] Create `src/schemas/marketing/productContent.schemas.ts`
- [ ] Implement `ProductContentDatabaseSchema` (raw database validation)
- [ ] Implement `ProductContentTransformSchema` with TypeScript return annotation
- [ ] Implement content workflow state validation
- [ ] Implement `CreateProductContentSchema` and `UpdateProductContentSchema`
- [ ] Export all required types and workflow constants

**Task 3.1.7: Implement Marketing Campaign Schemas**
- [ ] Create `src/schemas/marketing/marketingCampaign.schemas.ts`
- [ ] Implement campaign lifecycle validation
- [ ] Handle date validation and business rule constraints
- [ ] Export campaign type constants and status enums

**Task 3.1.8: Implement Product Bundle Schemas**
- [ ] Create `src/schemas/marketing/productBundle.schemas.ts`
- [ ] Implement bundle pricing and product association validation
- [ ] Handle bundle configuration and display logic

**Task 3.1.9: Create Schema Index**
- [ ] Create `src/schemas/marketing/index.ts` with clean exports
- [ ] Ensure no circular dependencies
- [ ] Export all schemas, types, workflow constants, and enums

**Expected Result**: All 37+ schema contract tests PASS (GREEN phase)

### **Day 1 Tasks - Schema Optimization (REFACTOR Phase)**
- [ ] Performance optimization for content queries and campaign analytics
- [ ] Schema validation error message improvements for workflow states
- [ ] Type safety enhancements and content workflow edge cases

---

## **Phase 3.2: Service Layer (RED → GREEN → REFACTOR)**

### **Day 2 Tasks - Service Tests (RED Phase)**

**Task 3.2.1: Write Product Content Service Tests (20+ tests)**
- [ ] `getProductContent()` with role permission filtering
- [ ] `updateProductContent()` with content workflow state management
- [ ] `uploadContentImage()` with file handling and progress tracking
- [ ] `updateContentStatus()` with workflow state transitions
- [ ] `getContentByStatus()` with filtering and pagination
- [ ] `batchUpdateContent()` with resilient processing (skip-on-error)
- [ ] Error handling with ValidationMonitor integration
- [ ] Role permission integration using Phase 1 `RolePermissionService`
- [ ] File upload security validation and URL management
- [ ] Performance testing for image handling operations

**Task 3.2.2: Write Marketing Campaign Service Tests (15+ tests)**
- [ ] `createCampaign()` with complete lifecycle management
- [ ] `updateCampaignStatus()` with state transition validation
- [ ] `getCampaignPerformance()` with metrics aggregation
- [ ] `scheduleCampaign()` with date validation and automation
- [ ] `getCampaignsByStatus()` with filtering and role-based access
- [ ] `recordCampaignMetric()` with analytics collection
- [ ] Integration with product content and bundle systems
- [ ] Cross-role analytics collection for executive insights

**Task 3.2.3: Write Product Bundle Service Tests (12+ tests)**
- [ ] `createBundle()` with product association and pricing validation
- [ ] `updateBundleProducts()` with inventory impact calculation
- [ ] `getBundlePerformance()` with sales and conversion tracking
- [ ] `toggleBundleStatus()` with inventory integration
- [ ] `calculateBundleDiscount()` with pricing business logic
- [ ] Role-based access control for bundle management
- [ ] Integration with campaign system

**Expected Result**: All service tests FAIL (RED phase) - services don't exist yet

### **Day 2 Tasks - Service Implementation (GREEN Phase)**

**Task 3.2.4: Implement Product Content Service**
- [ ] Create `src/services/marketing/productContentService.ts`
- [ ] Implement all content CRUD operations with workflow management
- [ ] Direct Supabase queries with exact field selection
- [ ] ValidationMonitor integration throughout content operations
- [ ] File upload handling with security validation
- [ ] Content workflow orchestration (draft → review → approved → published)
- [ ] Role permission checks integrated with Phase 1 system

**Task 3.2.5: Implement Marketing Campaign Service**
- [ ] Create `src/services/marketing/marketingCampaignService.ts`
- [ ] Implement campaign lifecycle management
- [ ] Campaign performance metrics collection and aggregation
- [ ] Integration with content and bundle systems
- [ ] Cross-role analytics collection for executive insights

**Task 3.2.6: Implement Product Bundle Service**
- [ ] Create `src/services/marketing/productBundleService.ts`
- [ ] Implement bundle creation with product associations
- [ ] Bundle pricing calculations and discount logic
- [ ] Inventory impact tracking for cross-role analytics
- [ ] Integration with campaign and content systems

**Task 3.2.7: Service Integration Testing**
- [ ] Cross-service integration (content + campaigns + bundles)
- [ ] Content workflow orchestration across all services
- [ ] Role permission enforcement across all marketing operations
- [ ] Performance validation for complex content operations

**Expected Result**: All 47+ service tests PASS (GREEN phase)

### **Day 2 Tasks - Service Optimization (REFACTOR Phase)**
- [ ] Content query performance optimizations
- [ ] File upload efficiency improvements
- [ ] Campaign metric aggregation performance tuning
- [ ] Cross-service integration optimization

---

## **Phase 3.3: Hook Layer (RED → GREEN → REFACTOR)**

### **Day 3 Tasks - Hook Tests (RED Phase)**

**Task 3.3.1: Write Product Content Hooks Tests (20+ tests)**
- [ ] `useProductContent()` with role-based content filtering
- [ ] `useContentByStatus()` with workflow state filtering
- [ ] `useUpdateProductContent()` mutation with optimistic updates
- [ ] `useUploadContentImage()` with progress tracking and error handling
- [ ] `useContentWorkflow()` for state transition management
- [ ] `useBatchContentOperations()` with progress tracking
- [ ] Query key validation (centralized factory integration)
- [ ] Cache invalidation strategies for content updates
- [ ] Real-time update integration for collaborative editing
- [ ] Error handling and retry logic for file operations

**Task 3.3.2: Write Marketing Campaign Hooks Tests (15+ tests)**
- [ ] `useMarketingCampaigns()` with role-based filtering
- [ ] `useCampaignPerformance()` with metrics aggregation
- [ ] `useCreateCampaign()` mutation with validation
- [ ] `useCampaignScheduling()` with date management
- [ ] `useCampaignMetrics()` for real-time analytics
- [ ] Cache invalidation for campaign status changes
- [ ] Integration with content and bundle hooks

**Task 3.3.3: Write Product Bundle Hooks Tests (12+ tests)**
- [ ] `useProductBundles()` with role-based access control
- [ ] `useBundlePerformance()` with sales tracking
- [ ] `useCreateBundle()` mutation with product associations
- [ ] `useBundleInventoryImpact()` for cross-role integration
- [ ] Cache invalidation for bundle updates affecting inventory

**Expected Result**: All hook tests FAIL (RED phase) - hooks don't exist yet

### **Day 3 Tasks - Hook Implementation (GREEN Phase)**

**Task 3.3.4: Implement Product Content Hooks**
- [ ] Create `src/hooks/marketing/useProductContent.ts`
- [ ] Create `src/hooks/marketing/useContentWorkflow.ts`
- [ ] Create `src/hooks/marketing/useContentOperations.ts`
- [ ] React Query integration with proper cache configuration
- [ ] Query key factory extensions for marketing operations
- [ ] Optimistic updates for content editing with automatic rollback
- [ ] File upload progress tracking and error handling

**Task 3.3.5: Implement Marketing Campaign Hooks**
- [ ] Create `src/hooks/marketing/useMarketingCampaigns.ts`
- [ ] Create `src/hooks/marketing/useCampaignPerformance.ts`
- [ ] Campaign lifecycle management with real-time updates
- [ ] Metrics aggregation and performance tracking

**Task 3.3.6: Implement Product Bundle Hooks**
- [ ] Create `src/hooks/marketing/useProductBundles.ts`
- [ ] Create `src/hooks/marketing/useBundleOperations.ts`
- [ ] Bundle management with inventory impact tracking
- [ ] Integration with campaign and content systems

**Task 3.3.7: Query Key Factory Extensions**
- [ ] Extend `src/utils/queryKeyFactory.ts` with marketing keys
- [ ] Add marketing-specific query key methods
- [ ] Ensure no dual systems are created (audit compliance)
- [ ] Content, campaign, and bundle query key integration

**Expected Result**: All 47+ hook tests PASS (GREEN phase)

### **Day 3 Tasks - Hook Optimization (REFACTOR Phase)**
**Task 3.3.8: Hook Performance and Cache Optimization**
- [ ] Cache strategy optimization for content and campaigns
- [ ] Real-time update efficiency improvements
- [ ] File upload optimization and error recovery
- [ ] Performance tuning for large content datasets

---

## **Phase 3.4: Integration Layer (RED → GREEN → REFACTOR)**

### **Day 4 Tasks - Integration Tests (RED Phase)**

**Task 3.4.1: Write Content Workflow Integration Tests (15+ tests)**
- [ ] Complete content workflow (draft → review → approved → published)
- [ ] Role permission enforcement across content lifecycle
- [ ] File upload → content update → cache invalidation flow
- [ ] Collaborative editing with conflict resolution
- [ ] Error recovery workflow validation
- [ ] Performance validation for content operations

**Task 3.4.2: Write Campaign Management Integration Tests (12+ tests)**
- [ ] Campaign creation → content association → performance tracking flow
- [ ] Campaign lifecycle management with status transitions
- [ ] Campaign metrics collection and aggregation
- [ ] Integration with bundle system for promotional campaigns
- [ ] Cross-role analytics data collection

**Task 3.4.3: Write Cross-Role Integration Tests (10+ tests)**
- [ ] Marketing actions → inventory impact tracking
- [ ] Bundle creation → inventory reservation validation
- [ ] Campaign performance → executive analytics pipeline
- [ ] Role permission boundaries across marketing operations

**Task 3.4.4: Write Performance Integration Tests (8+ tests)**
- [ ] Large content dataset handling across all layers
- [ ] File upload performance with progress tracking
- [ ] Campaign metric aggregation performance
- [ ] Cache efficiency with complex invalidation patterns

**Expected Result**: All integration tests FAIL initially (RED phase)

### **Day 4 Tasks - Integration Implementation (GREEN Phase)**

**Task 3.4.5: Content Workflow Integration**
- [ ] Complete workflow validation and orchestration
- [ ] Cross-layer error handling for content operations
- [ ] File upload integration with content management
- [ ] Performance optimization for content workflows

**Task 3.4.6: Campaign Management Integration**
- [ ] Campaign lifecycle integration across all systems
- [ ] Performance tracking and analytics pipeline
- [ ] Integration with content and bundle management
- [ ] Cross-role analytics collection implementation

**Task 3.4.7: Cross-Role Analytics Integration**
- [ ] Marketing action → inventory impact tracking
- [ ] Executive analytics data collection pipeline
- [ ] Real-time cross-role update coordination
- [ ] Performance optimization for analytics collection

**Expected Result**: All 45+ integration tests PASS (GREEN phase)

### **Day 4 Tasks - Integration Optimization (REFACTOR Phase)**
**Task 3.4.8: Cross-Layer Performance Optimization**
- [ ] Performance tuning across all marketing layers
- [ ] Content workflow efficiency improvements
- [ ] Campaign analytics optimization
- [ ] Cross-role integration performance enhancement

---

## **Phase 3.5: Post-Implementation Compliance Audit (AUDIT → FIX → VALIDATE)**

### **Day 5 Tasks - Compliance Audit (AUDIT Phase)**

**Task 3.5.1: Comprehensive Pattern Compliance Audit (20+ checks)**
- [ ] **Zod Validation Patterns Audit**
  - [ ] Single validation pass principle compliance across all marketing schemas
  - [ ] Database-first validation adherence (no application assumptions)
  - [ ] Resilient item processing with skip-on-error in all marketing services
  - [ ] Transformation schema architecture compliance (DB → App format)
  - [ ] Database-interface alignment validation (all fields properly mapped)
- [ ] **React Query Patterns Audit**
  - [ ] Centralized query key factory usage (zero dual systems detected)
  - [ ] User-isolated query keys with proper fallback strategies
  - [ ] Entity-specific factory methods instead of manual key spreading
  - [ ] Optimized cache configuration for marketing data volatility
  - [ ] Smart query invalidation without over-invalidation
- [ ] **Database Query Patterns Audit**
  - [ ] Direct Supabase queries with proper validation pipelines
  - [ ] Atomic operations with real-time broadcasting patterns
  - [ ] Real-time stock validation for bundle operations
  - [ ] Proper field selection matching database.generated.ts
- [ ] **Security Patterns Audit**
  - [ ] User data isolation across all marketing operations
  - [ ] Cryptographic channel security for real-time features
  - [ ] Role permission enforcement at every boundary
- [ ] **Schema Contract Management Audit**
  - [ ] Compile-time contract enforcement for all marketing schemas
  - [ ] Service field selection validation against database structure
  - [ ] Pre-commit contract validation integration
  - [ ] Transformation completeness with TypeScript return annotations

**Task 3.5.2: Marketing-Specific Pattern Audit (15+ checks)**
- [ ] **Content Workflow Pattern Compliance**
  - [ ] Content state transitions following established patterns
  - [ ] File upload security validation patterns
  - [ ] Content workflow orchestration following service layer patterns
- [ ] **Campaign Management Pattern Compliance**
  - [ ] Campaign lifecycle management following state patterns
  - [ ] Cross-role analytics collection following monitoring patterns
  - [ ] Performance metrics aggregation following database patterns
- [ ] **Bundle Management Pattern Compliance**
  - [ ] Inventory integration following cross-service patterns
  - [ ] Bundle pricing calculation following business logic patterns
  - [ ] Product association validation following relationship patterns

**Task 3.5.3: Cross-Phase Integration Audit (10+ checks)**
- [ ] **Phase 1 Integration Compliance**
  - [ ] Role permission service integration following established patterns
  - [ ] User context usage matching Phase 1 patterns
  - [ ] ValidationMonitor integration consistency
- [ ] **Phase 2 Integration Compliance**
  - [ ] Inventory service integration following cross-service patterns
  - [ ] Stock validation patterns consistent with Phase 2
  - [ ] Bundle-inventory impact tracking following data flow patterns

**Expected Result**: Comprehensive audit report with all non-compliance issues identified

### **Day 5 Tasks - Compliance Remediation (FIX Phase)**

**Task 3.5.4: Pattern Violation Remediation**
- [ ] Fix all identified Zod validation pattern violations
- [ ] Correct React Query pattern non-compliance issues
- [ ] Remediate database query pattern violations
- [ ] Fix security pattern non-compliance
- [ ] Correct schema contract management violations

**Task 3.5.5: Marketing-Specific Pattern Fixes**
- [ ] Fix content workflow pattern violations
- [ ] Correct campaign management pattern issues
- [ ] Remediate bundle management pattern violations

**Task 3.5.6: Cross-Phase Integration Fixes**
- [ ] Fix Phase 1 integration pattern violations
- [ ] Correct Phase 2 integration pattern issues
- [ ] Ensure consistent pattern usage across all integrations

**Expected Result**: All identified pattern violations fixed and validated

### **Day 5 Tasks - Compliance Validation (VALIDATE Phase)**

**Task 3.5.7: Post-Remediation Compliance Validation**
- [ ] Re-run complete pattern compliance audit
- [ ] Validate all fixes maintain functional correctness
- [ ] Ensure no new pattern violations introduced during fixes
- [ ] Validate architectural integrity maintained

**Task 3.5.8: Documentation and Knowledge Transfer**
- [ ] Document all pattern violations found and fixed
- [ ] Update team knowledge base with compliance learnings
- [ ] Create compliance monitoring checklist for future phases
- [ ] Document pattern compliance validation procedures

**Expected Result**: 100% pattern compliance validated with comprehensive documentation

---

## 🎯 **Commit Gates (Following Phase 1 & 2 Pattern)**

### **Gate 1: Schema Layer Complete**
- ✅ All 37+ schema contract tests passing
- ✅ Database-TypeScript alignment verified for all marketing tables  
- ✅ Content workflow transformation patterns working correctly
- ✅ Compile-time contract enforcement successful
- 🎯 **Commit**: `feat(marketing-schema): Phase 3 marketing schema contracts with workflow validation`

### **Gate 2: Service Layer Complete**
- ✅ All 47+ service tests passing
- ✅ Role permission integration working across all marketing operations
- ✅ ValidationMonitor tracking all operations (successes + failures)
- ✅ Content workflow orchestration handling all state transitions
- ✅ Cross-role analytics collection integrated
- 🎯 **Commit**: `feat(marketing-service): Phase 3 marketing service with content workflows`

### **Gate 3: Hook Layer Complete**
- ✅ All 47+ hook tests passing
- ✅ React Query integration with proper caching for marketing operations
- ✅ Query key factory extensions working (no dual systems)
- ✅ Cache invalidation strategies effective for content and campaigns
- ✅ File upload progress tracking and error handling working
- 🎯 **Commit**: `feat(marketing-hooks): Phase 3 marketing hooks with content workflow management`

### **Gate 4: Integration Complete**
- ✅ All 45+ integration tests passing
- ✅ Content workflows functioning correctly across all layers
- ✅ Campaign management integration working end-to-end
- ✅ Cross-role analytics collection operational
- ✅ Performance benchmarks meeting targets for content operations
- 🎯 **Final Commit**: `feat(marketing): Complete Phase 3 marketing operations with content workflows`

---

## 🔗 **Phase 1 & 2 Integration Points**

### **Required Integrations**
1. **Role Permission Checks** - Use `RolePermissionService.hasPermission()` throughout
2. **User Context** - Leverage `useUserRole()` for permission-aware UI
3. **Query Key Factory** - Extend existing centralized factory (no dual systems)
4. **ValidationMonitor** - Consistent monitoring patterns across all operations
5. **Schema Transformation** - Same snake_case → camelCase patterns
6. **Inventory Integration** - Marketing actions → inventory impact tracking

### **Reusable Patterns**
- All Zod validation patterns from Phase 1 & 2
- ValidationMonitor integration approaches
- React Query configuration strategies
- Error handling and graceful degradation
- Resilient item processing with skip-on-error
- Cross-service integration patterns

---

## 🎨 **Marketing-Specific UI Components**

### **Content Management Screens**
```typescript
// src/screens/marketing/ProductContentScreen.tsx
export const ProductContentScreen = () => {
  const { data: products } = useProductContent();
  const { mutate: updateContent } = useUpdateProductContent();
  const { mutate: uploadImage } = useUploadContentImage();
  
  return (
    <Screen>
      <ContentUploadZone 
        onImageUpload={uploadImage}
        supportedFormats={['jpg', 'png', 'webp']}
        maxSize={5} // 5MB
        showProgress
      />
      
      <ProductContentList 
        products={products}
        renderItem={({ item }) => (
          <MarketingProductCard 
            product={item}
            onUpdateContent={(content) => updateContent({ id: item.id, ...content })}
            showContentControls
            showWorkflowStatus
            showMarketingMetrics
          />
        )}
      />
    </Screen>
  );
};
```

### **Campaign Management Interface**
```typescript
// src/screens/marketing/CampaignPlannerScreen.tsx
export const CampaignPlannerScreen = () => {
  const { data: campaigns } = useMarketingCampaigns();
  const { data: performance } = useCampaignPerformance();
  
  return (
    <Screen>
      <CampaignCreationWizard 
        onCreateCampaign={(campaign) => createCampaign(campaign)}
        showDatePicker
        showTargetAudience
        showPerformanceTargets
      />
      
      <CampaignPerformanceGrid 
        campaigns={campaigns}
        performanceData={performance}
        showMetrics={['views', 'clicks', 'conversions', 'revenue']}
      />
    </Screen>
  );
};
```

---

## 📊 **Success Metrics**

### **Test Coverage Targets**
- **Schema Layer**: 37+ contract tests (content workflows + campaign lifecycle + bundle management)
- **Service Layer**: 47+ service tests (content + campaigns + bundles + cross-role integration)
- **Hook Layer**: 47+ hook tests (React Query + file uploads + workflow management)
- **Integration Layer**: 45+ integration tests (workflows + cross-role + performance)
- **Total**: 176+ tests covering all marketing architectural patterns

### **Performance Targets**
- Content queries: <200ms
- File uploads (5MB): <10s with progress tracking
- Campaign metric aggregation: <500ms
- Cache invalidation: <50ms for affected marketing queries
- Cross-role analytics collection: <100ms

### **Architectural Compliance**
- ✅ 100% ValidationMonitor integration (all marketing patterns valid)
- ✅ 100% centralized query key factory usage (no dual systems)
- ✅ 100% role permission enforcement across marketing operations
- ✅ 100% schema contract enforcement for content workflows
- ✅ 100% graceful degradation patterns for content operations

---

## 🎯 **Expected Deliverables**

### **Files to Create (Complete List)**
```
database/marketing-test-schema.sql
src/schemas/marketing/productContent.schemas.ts
src/schemas/marketing/marketingCampaign.schemas.ts
src/schemas/marketing/productBundle.schemas.ts
src/schemas/marketing/index.ts
src/schemas/marketing/__contracts__/database-mock.types.ts
src/schemas/marketing/__contracts__/productContent.contracts.test.ts
src/schemas/marketing/__contracts__/marketingCampaign.contracts.test.ts
src/schemas/marketing/__contracts__/productBundle.contracts.test.ts
src/services/marketing/productContentService.ts
src/services/marketing/marketingCampaignService.ts
src/services/marketing/productBundleService.ts
src/services/marketing/__tests__/productContentService.test.ts
src/services/marketing/__tests__/marketingCampaignService.test.ts
src/services/marketing/__tests__/productBundleService.test.ts
src/hooks/marketing/useProductContent.ts
src/hooks/marketing/useContentWorkflow.ts
src/hooks/marketing/useContentOperations.ts
src/hooks/marketing/useMarketingCampaigns.ts
src/hooks/marketing/useCampaignPerformance.ts
src/hooks/marketing/useProductBundles.ts
src/hooks/marketing/useBundleOperations.ts
src/hooks/marketing/__tests__/useProductContent.test.tsx
src/hooks/marketing/__tests__/useContentWorkflow.test.tsx
src/hooks/marketing/__tests__/useMarketingCampaigns.test.tsx
src/hooks/marketing/__tests__/useProductBundles.test.tsx
src/hooks/marketing/__tests__/marketing.integration.test.tsx
src/screens/marketing/ProductContentScreen.tsx
src/screens/marketing/CampaignPlannerScreen.tsx
src/screens/marketing/BundleManagementScreen.tsx
src/screens/marketing/MarketingAnalytics.tsx
```

### **Files to Modify**
```
src/utils/queryKeyFactory.ts (add marketing key extensions)
```

---

## ✅ **Phase 3 Readiness Checklist**

- [x] **Phase 1 Complete**: Role-based permission infrastructure implemented
- [x] **Phase 2 Complete**: Inventory operations with role integration working
- [x] **Phase 1 & 2 Compliant**: 100% adherence to architectural patterns
- [x] **Phase 2 Tested**: All inventory tests passing and operational
- [x] **Documentation Current**: Task list aligns with established patterns
- [ ] **Team Approval**: Ready to proceed with Phase 3 implementation

---

**This detailed task list ensures 100% compliance with architectural patterns while building comprehensive marketing operations with content workflows on top of the established role-based foundation.**

**Next Step**: Begin Phase 3.1.1 - Create Database Schema (RED Phase) 🚀

## 🎯 **TDD Implementation Notes**

### **Automated Commit Strategy**
Following the established pattern from Phase 1 & 2:

1. **All tests written FIRST** (RED phase)
2. **Implementation to make tests pass** (GREEN phase)  
3. **Optimization and refactoring** (REFACTOR phase)
4. **Automatic commit when all tests pass** using commit gates

### **⚠️ CRITICAL: Test Hanging Prevention**
**MANDATORY for all async operations in tests:**

```typescript
// ✅ REQUIRED: Always use --forceExit in package.json test scripts
"test:marketing": "jest --config=jest.config.marketing.js --forceExit",
"test:hooks:marketing": "jest --config=jest.config.hooks.js --forceExit",
"test:services:marketing": "jest --config=jest.config.services.js --forceExit",

// ✅ REQUIRED: Set test timeout and force cleanup
describe('Marketing Service Tests', () => {
  beforeEach(() => {
    jest.setTimeout(10000); // 10 second timeout
  });
  
  afterEach(async () => {
    // Force cleanup of any pending operations
    await jest.runAllTimers();
    jest.clearAllMocks();
  });
  
  afterAll(async () => {
    // Force exit cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });
});

// ✅ REQUIRED: Wrap all async operations with timeout
it('should handle marketing content upload', async () => {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Test timeout')), 5000)
  );
  
  const testPromise = async () => {
    const result = await uploadContent(mockContent);
    expect(result.success).toBe(true);
  };
  
  await Promise.race([testPromise(), timeoutPromise]);
});

// ✅ REQUIRED: Always cleanup subscriptions and timers
it('should cleanup real-time subscriptions', async () => {
  const cleanup = setupRealtimeSubscription();
  
  try {
    // Test logic here
  } finally {
    cleanup(); // Always cleanup in finally block
  }
});
```

**🚨 If tests hang:**
1. Add `--forceExit` to jest command
2. Wrap async operations in `Promise.race()` with timeout
3. Use `afterAll(() => process.exit(0))` as last resort
4. Check for unclosed database connections, timers, or subscriptions

### **Test Commands for Phase 3**
```bash
# Marketing-specific test commands (to be added to package.json)
npm run test:services:marketing     # Marketing service tests
npm run test:hooks:marketing        # Marketing hook tests  
npm run test:integration:marketing  # Marketing integration tests
npm run test:marketing              # All marketing tests

# Full test suite including Phase 1, 2, and 3
npm run test:role-based             # All role-based functionality
```

### **Commit Gate Commands**
```bash
# Schema validation
npx tsc --noEmit src/schemas/marketing/__contracts__/*.test.ts

# Service testing  
npm run test:services:marketing

# Hook testing
npm run test:hooks:marketing

# Integration testing
npm run test:integration:marketing

# Full compilation check
npx tsc --noEmit --strict
```

This Phase 3 plan builds complete marketing operations with content workflows while maintaining 100% architectural compliance and preparing the foundation for Phase 4 executive analytics.