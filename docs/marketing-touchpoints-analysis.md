# Marketing Feature - End-to-End Touchpoint Analysis

## Overview
This document provides a detailed analysis of all touchpoints in the marketing feature, tracing the complete data flow from user interface through to database operations. The marketing feature provides campaign management, content workflow, product bundles, and analytics capabilities for marketing and admin users.

## 1. MarketingHub Screen Flow

### Entry Point
**Screen:** `src/screens/marketing/MarketingHub.tsx`

#### Component Structure
```
MarketingHub
├── Menu Items (lines 69-107)
│   ├── Marketing Dashboard → navigate('MarketingDashboard')
│   ├── Campaign Management → navigate('CampaignManagement')
│   ├── Campaign Planner → navigate('CampaignPlanner')
│   ├── Product Content → navigate('ProductContent')
│   ├── Bundle Management → navigate('BundleManagement')
│   └── Marketing Analytics → navigate('MarketingAnalytics')
├── Permission Guards (lines 62-67)
│   └── canAccessMarketing = isAdmin || isManager || isMarketing
└── Badge Indicators
    ├── Active Campaigns Count
    └── NEW badges for new features
```

#### Hook Usage
- `useCurrentUser()` [line 60] - Authentication state
- `useNavigation()` [line 59] - Navigation control

#### Permission Model
```typescript
const userRole = user?.role?.toLowerCase();
const isAdmin = userRole === 'admin';
const isManager = userRole === 'manager';
const isMarketing = userRole === 'marketing';
const canAccessMarketing = isAdmin || isManager || isMarketing;
```

---

## 2. MarketingDashboard Screen Flow

### Screen: `src/screens/marketing/MarketingDashboard.tsx`

#### Component Structure
```
MarketingDashboard
├── Stats Overview (lines 71-93)
│   ├── Active Campaigns Count
│   ├── Pending Content Count
│   ├── Revenue Display
│   └── Conversion Rate
├── Campaign Section (lines 110-130)
│   └── CampaignCard Components
├── Content Section (lines 132-150)
│   └── ContentItem Components
└── Floating Action Button (lines 155-160)
```

#### Hook Chain
```
useMarketingDashboard() [line 26]
  ↓
├── useMarketingAnalytics()
│     ↓
│   analyticsService.getMarketingAnalytics()
│
├── useActiveCampaigns() [line 27]
│     ↓
│   campaignService.getActiveCampaigns()
│
└── usePendingContent() [line 28]
      ↓
    analyticsService.getPendingContent()
```

#### Data Flow
1. **Initial Load** → Shows LoadingScreen [lines 38-40]
2. **Error State** → Displays ErrorScreen with retry [lines 42-49]
3. **Data Display** → Renders StatCards with metrics [lines 71-105]
4. **Refresh** → Pull-to-refresh functionality [lines 32-36]

---

## 3. CampaignManagementScreen Flow

### Screen: `src/screens/marketing/CampaignManagementScreen.tsx`

#### Component Structure
```
CampaignManagementScreen
├── Campaign Wizard (lines 58-150)
│   ├── Step 1: Basic Information [lines 60-95]
│   ├── Step 2: Target Audience [lines 96-110]
│   ├── Step 3: Budget & Schedule [lines 111-125]
│   ├── Step 4: Channel Selection [lines 126-140]
│   └── Step 5: Review & Save [lines 141-150]
├── Campaign List
└── Navigation Controls [lines 41-51]
```

#### State Management
```typescript
const [campaignData, setCampaignData] = useState({
  name: '',
  description: '',
  type: '',
  objective: '',
  targetAudience: '',
  budget: '',
  startDate: '',
  endDate: '',
  products: [],
  channels: [],
  content: [],
  status: 'draft'
}); // [lines 17-30]
```

---

## 4. ContentWorkflow Implementation

### Screen: `src/screens/marketing/ContentWorkflow.tsx`

#### Workflow States
```
draft → review → approved → published
      ↗         ↙
       (reject)
```

#### Hook Usage
**File:** `src/hooks/marketing/useContentWorkflow.ts`

```typescript
export function useContentWorkflow(contentId: string, options?: UseContentWorkflowOptions) {
  const userRole = options?.role || useUserRole();

  // Permission matrix [lines 22-27]
  const permissions: Record<UserRole, WorkflowState[]> = {
    viewer: [],
    editor: ['review'],
    manager: ['review', 'approved'],
    admin: ['review', 'approved', 'published', 'archived']
  };

  // Content query [lines 29-33]
  const contentQuery = useQuery({
    queryKey: marketingKeys.content.detail(contentId),
    queryFn: () => contentWorkflowService.getContent(contentId),
    staleTime: 30000
  });

  // Transition mutation with optimistic updates [lines 39-101]
  const transitionMutation = useMutation({
    mutationFn: async ({ targetState }) => {
      // Validate transition server-side
      const isValid = await contentWorkflowService.validateTransition(
        contentId,
        currentState,
        targetState
      );

      if (!isValid) throw new Error('Invalid transition');

      return contentWorkflowService.transitionTo(contentId, targetState);
    },
    onMutate: async ({ targetState }) => {
      // Permission check
      if (!canTransitionTo(targetState)) {
        throw new Error('Insufficient permissions');
      }
      // Optimistic update logic
    }
  });
}
```

---

## 5. Core Hook Implementations

### useMarketingAnalytics Hook
**File:** `src/hooks/marketing/useMarketingAnalytics.ts`

```typescript
export function useMarketingAnalytics(options?: {
  includeHistorical?: boolean;
  dateRange?: { start: Date; end: Date };
  refreshInterval?: number;
}) {
  // Main analytics query [lines 19-24]
  const analyticsQuery = useQuery({
    queryKey: marketingKeys.analytics.dashboard(),
    queryFn: () => analyticsService.getMarketingAnalytics(),
    staleTime: 30000,
    refetchInterval: refreshInterval || 60000
  });

  // Active campaigns query [lines 27-31]
  const campaignsQuery = useQuery({
    queryKey: marketingKeys.campaign.active(),
    queryFn: () => campaignService.getActiveCampaigns(),
    staleTime: 30000
  });

  // Aggregated metrics calculation [lines 41-65]
  const aggregatedMetrics = useMemo(() => {
    const totalSpent = topPerformingCampaigns.reduce((sum, c) => sum + c.spent, 0);
    const averageRoi = totalSpent > 0 ? (revenue / totalSpent) : 0;
    const engagementRate = engagement.totalImpressions > 0
      ? (engagement.totalClicks / engagement.totalImpressions) * 100
      : 0;

    return {
      totalRevenue: revenue,
      averageRoi,
      engagementRate,
      contentVelocity: publishedContent / 30,
      conversionValue: revenue / (engagement.totalClicks || 1)
    };
  }, [analyticsQuery.data]);
}
```

### useMarketingCampaign Hook
**File:** `src/hooks/marketing/useMarketingCampaign.ts`

```typescript
export function useMarketingCampaign(campaignId?: string) {
  const queryClient = useQueryClient();

  // Campaign data query [lines 30-50]
  const campaignQuery = useQuery({
    queryKey: marketingKeys.campaigns.detail(campaignId || ''),
    queryFn: async () => {
      if (!campaignId) return null;

      if (campaignService.getCampaign) {
        return campaignService.getCampaign(campaignId);
      }

      // Fallback to mock data
      return {
        id: campaignId,
        name: 'Sample Campaign',
        status: 'active',
        budget: 10000,
        metrics: {
          impressions: 50000,
          clicks: 2500,
          conversions: 125,
          ctr: 5
        }
      };
    }
  });

  // Update campaign mutation
  const updateMutation = useMutation({
    mutationFn: (updates) => campaignService.updateCampaign(campaignId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketingKeys.campaigns.detail(campaignId)
      });
    }
  });
}
```

### useProductBundle Hook
**File:** `src/hooks/marketing/useProductBundle.ts`

```typescript
export function useProductBundle(bundleId?: string) {
  const [optimisticBundle, setOptimisticBundle] = useState<Bundle | null>(null);

  // Bundle query [lines 37-50]
  const bundleQuery = useQuery({
    queryKey: marketingKeys.bundles.detail(bundleId || ''),
    queryFn: async () => {
      if (!bundleId) return null;

      if (bundleService.getBundle) {
        return bundleService.getBundle(bundleId);
      }

      return mockBundleData;
    }
  });

  // Create bundle mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (bundleData) => bundleService.createBundle(bundleData),
    onMutate: async (newBundle) => {
      setOptimisticBundle(newBundle);
      return { previousBundle: bundleQuery.data };
    },
    onError: (err, newBundle, context) => {
      setOptimisticBundle(null);
      if (context?.previousBundle) {
        queryClient.setQueryData(
          marketingKeys.bundles.detail(bundleId),
          context.previousBundle
        );
      }
    },
    onSuccess: (data) => {
      setOptimisticBundle(null);
      queryClient.setQueryData(marketingKeys.bundles.detail(data.id), data);
    }
  });
}
```

---

## 6. Service Layer Details

### MarketingCampaignService
**File:** `src/services/marketing/marketingCampaign.service.ts`

#### Core Methods

1. **createCampaign()** [lines 43-76]
   ```typescript
   async createCampaign(data: unknown): Promise<MarketingCampaign> {
     // Validate with Zod schema
     const validated = marketingCampaignTransform.parse({
       ...data,
       id: this.generateId(),
       createdAt: new Date(),
       updatedAt: new Date()
     });

     // Business validations [lines 53-66]
     if (validated.status === 'active') {
       const now = new Date();
       if (now < validated.startDate || now > validated.endDate) {
         throw new ValidationError('Active campaigns must be within date range');
       }
     }

     if (validated.discount > 50) {
       throw new ValidationError('Discount cannot exceed 50%');
     }

     this.mockData.set(validated.id, validated);
     return validated;
   }
   ```

2. **updateCampaign()** [lines 86-110]
   - Prevents status changes for completed campaigns
   - Ensures unique updatedAt timestamps
   - Validates all updates through schema

3. **calculatePerformance()** [lines 150-180]
   - Calculates CTR, conversion rate, ROI
   - Cost per conversion metrics

### ContentWorkflowService
**File:** `src/services/marketing/contentWorkflow.service.ts`

```typescript
export class ContentWorkflowService {
  // Workflow transition rules [lines 27-32]
  private readonly transitions: Record<WorkflowState, WorkflowState[]> = {
    draft: ['review'],
    review: ['approved', 'draft'],
    approved: ['published', 'draft'],
    published: []
  };

  // Role-based permissions [lines 34-38]
  private readonly rolePermissions: Record<string, WorkflowState[]> = {
    viewer: [],
    editor: ['draft', 'review'],
    admin: ['draft', 'review', 'approved', 'published']
  };

  async transitionTo(
    contentId: string,
    targetState: WorkflowState,
    options?: TransitionOptions
  ): Promise<ProductContent> {
    const current = await this.getContent(contentId);

    // Validate transition [lines 98-102]
    const allowedStates = this.transitions[current.workflowState];
    if (!allowedStates.includes(targetState)) {
      throw new ServiceError(`Invalid transition from ${current.workflowState} to ${targetState}`);
    }

    // Check permissions [lines 104-108]
    if (options?.user) {
      const allowed = this.rolePermissions[options.user.role];
      if (!allowed.includes(targetState)) {
        throw new ForbiddenError('Insufficient permissions');
      }
    }

    // Update content
    return this.updateContent(contentId, { workflowState: targetState });
  }
}
```

### ProductBundleService
**File:** `src/services/marketing/productBundle.service.ts`

```typescript
export class ProductBundleService {
  async createBundle(data: unknown): Promise<ProductBundle> {
    // Auto-calculate final price [lines 43-54]
    if (processedData.pricing.finalPrice === 0) {
      const { discountType, discountValue, basePrice } = processedData.pricing;
      if (discountType === 'percentage') {
        processedData.pricing.finalPrice = basePrice * (1 - discountValue / 100);
      } else {
        processedData.pricing.finalPrice = Math.max(0.01, basePrice - discountValue);
      }
    }

    // Validate products exist [lines 64-70]
    for (const product of validated.products) {
      if (!this.productPrices.has(product.productId)) {
        throw new ValidationError(`Product ${product.productId} does not exist`);
      }
    }

    // Validate pricing logic [lines 73-78]
    const calculatedBase = await this.calculateBasePrice(validated.products);
    if (validated.pricing.basePrice > calculatedBase) {
      throw new ValidationError('Bundle price cannot exceed sum of product prices');
    }

    this.mockData.set(validated.id, validated);
    return validated;
  }

  async calculatePricing(bundle: ProductBundle): Promise<PricingCalculation> {
    const basePrice = await this.calculateBasePrice(bundle.products);
    const { discountType, discountValue, finalPrice } = bundle.pricing;

    const savings = basePrice - finalPrice;
    const savingsPercentage = (savings / basePrice) * 100;

    return {
      basePrice,
      discountType,
      discountValue,
      finalPrice,
      savings,
      savingsPercentage
    };
  }
}
```

---

## 7. Database Schema (Mock Implementation)

### Tables Structure (In-Memory Maps)

#### marketing_campaigns
```typescript
interface MarketingCampaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  budget: number;
  spent: number;
  startDate: Date;
  endDate: Date;
  targetAudience: string[];
  channels: string[];
  metrics?: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
}
```

#### product_content
```typescript
interface ProductContent {
  id: string;
  productId: string;
  title: string;
  description: string;
  workflowState: WorkflowState;
  content: {
    shortDescription?: string;
    longDescription?: string;
    features?: string[];
    specifications?: Record<string, any>;
  };
  media: MediaItem[];
  seo?: SEOData;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}
```

#### product_bundles
```typescript
interface ProductBundle {
  id: string;
  name: string;
  description?: string;
  type: BundleType;
  products: BundleProduct[];
  pricing: {
    basePrice: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    finalPrice: number;
  };
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 8. Real-time Updates

### WebSocket Subscriptions (Planned)
**Implementation Pattern:**

```typescript
// Campaign updates
const campaignChannel = supabase
  .channel('campaign-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'marketing_campaigns',
    filter: `status=eq.active`
  }, (payload) => {
    queryClient.invalidateQueries({
      queryKey: marketingKeys.campaigns.active()
    });
  })
  .subscribe();

// Content workflow updates
const contentChannel = supabase
  .channel('content-workflow')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'product_content',
    filter: `workflowState=eq.review`
  }, (payload) => {
    // Notify reviewers
    showNotification('New content pending review');
  })
  .subscribe();
```

---

## 9. Cache Management

### Query Keys Pattern
**File:** `src/utils/queryKeys.ts`

```typescript
export const marketingKeys = {
  all: ['marketing'],
  campaigns: {
    all: () => ['marketing', 'campaigns'],
    list: (filters) => ['marketing', 'campaigns', 'list', filters],
    detail: (id) => ['marketing', 'campaigns', 'detail', id],
    active: () => ['marketing', 'campaigns', 'active']
  },
  content: {
    all: () => ['marketing', 'content'],
    list: (filters) => ['marketing', 'content', 'list', filters],
    detail: (id) => ['marketing', 'content', 'detail', id],
    pending: () => ['marketing', 'content', 'pending']
  },
  bundles: {
    all: () => ['marketing', 'bundles'],
    list: (filters) => ['marketing', 'bundles', 'list', filters],
    detail: (id) => ['marketing', 'bundles', 'detail', id]
  },
  analytics: {
    dashboard: () => ['marketing', 'analytics', 'dashboard'],
    campaign: (id) => ['marketing', 'analytics', 'campaign', id]
  }
};
```

### Cache Strategy
- **Stale Time:** 30 seconds for active data, 5 minutes for analytics
- **Refetch Interval:** 60 seconds for dashboard metrics
- **Invalidation:** Smart invalidation on mutations
- **Optimistic Updates:** Immediate UI feedback for user actions

---

## 10. Performance Optimizations

### Data Loading Patterns
1. **Parallel Queries** - Multiple queries run simultaneously
2. **Lazy Loading** - Content loaded on demand
3. **Pagination** - Large campaign lists paginated
4. **Memoization** - Computed metrics cached

### Optimistic Updates Example
```typescript
// From useContentWorkflow [lines 57-78]
onMutate: async ({ targetState }) => {
  // Cancel outgoing queries
  await queryClient.cancelQueries({
    queryKey: marketingKeys.content.detail(contentId)
  });

  // Snapshot for rollback
  const previousContent = queryClient.getQueryData(
    marketingKeys.content.detail(contentId)
  );

  // Apply optimistic update
  queryClient.setQueryData(
    marketingKeys.content.detail(contentId),
    { ...previousContent, workflowState: targetState }
  );

  return { previousContent };
}
```

---

## 11. Error Handling

### Error Types
```typescript
// From ServiceError.ts
export class ServiceError extends Error {
  code: string;
  statusCode: number;
}

export class ValidationError extends ServiceError {
  constructor(message: string, errors?: any) {
    super(message);
    this.code = 'VALIDATION_ERROR';
    this.statusCode = 400;
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.code = 'NOT_FOUND';
    this.statusCode = 404;
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message: string) {
    super(message);
    this.code = 'FORBIDDEN';
    this.statusCode = 403;
  }
}
```

### Error Recovery Flow
1. **Validation Errors** - Show field-specific errors
2. **Permission Errors** - Redirect to appropriate screen
3. **Network Errors** - Retry with exponential backoff
4. **Not Found** - Show 404 component

---

## 12. Component Library

### Marketing-Specific Components
- **CampaignCard** - Campaign display card
- **CampaignCalendar** - Visual campaign scheduler
- **ContentCard** - Content item display
- **ContentEditor** - Rich text editor
- **BundleBuilder** - Interactive bundle creator
- **ImageUploader** - Media upload component
- **WorkflowIndicator** - Visual workflow state
- **StatCard** - Metric display card
- **Section** - Content section wrapper
- **FloatingActionButton** - Quick actions

---

## 13. Navigation Flow

### Screen Navigation Map
```
MarketingHub
├── MarketingDashboard
│   ├── CampaignPlanner (via Stats)
│   ├── ProductContent (via Stats)
│   └── MarketingAnalytics (via Stats)
├── CampaignManagement
│   └── Campaign Wizard (5 steps)
├── CampaignPlanner
│   └── Calendar View
├── ProductContent
│   └── Content Editor
├── BundleManagement
│   └── Bundle Builder
└── MarketingAnalytics
    └── Reports Dashboard
```

---

## 14. Testing Infrastructure

### Mock Services
All services currently use in-memory Map storage for testing:
- `MarketingCampaignService` - Mock campaign data
- `ContentWorkflowService` - Mock content workflow
- `ProductBundleService` - Mock bundle management

### Test Patterns
```typescript
// Service testing pattern
describe('MarketingCampaignService', () => {
  let service: MarketingCampaignService;

  beforeEach(() => {
    service = new MarketingCampaignService();
  });

  it('should create campaign with valid data', async () => {
    const campaign = await service.createCampaign({
      name: 'Test Campaign',
      type: 'promotional',
      status: 'draft',
      budget: 1000
    });

    expect(campaign.id).toBeDefined();
    expect(campaign.status).toBe('draft');
  });
});
```

---

## 15. Missing Implementations & Gaps

### Critical Gaps
1. **No Real Database Integration** - All services use mock data
2. **Missing Supabase Connection** - No actual database queries
3. **Incomplete Real-time** - WebSocket subscriptions not implemented
4. **No File Upload** - ImageUploader is placeholder
5. **Missing Analytics Service** - Returns static data

### Service Duplication Issues
1. **Multiple Campaign Services:**
   - `marketingCampaignService.ts`
   - `marketingCampaign.service.ts`
   - `campaignService.ts`

2. **Multiple Bundle Services:**
   - `productBundleService.ts`
   - `productBundle.service.ts`
   - `bundleService.ts`

3. **Multiple Content Services:**
   - `productContentService.ts`
   - `contentService.ts`
   - `contentWorkflow.service.ts`

### Recommended Fixes
1. Consolidate duplicate services
2. Implement Supabase integration
3. Add real-time subscriptions
4. Implement file upload with storage
5. Connect to actual analytics data
6. Clean up archived test files
7. Standardize service naming

---

## Summary

The marketing feature demonstrates a complex workflow-driven architecture with:

1. **Content workflow management** with role-based permissions
2. **Campaign lifecycle management** from draft to completion
3. **Product bundle creation** with pricing calculations
4. **Analytics integration** with performance metrics
5. **Optimistic updates** for better UX

However, the implementation suffers from:
- Service layer confusion with multiple duplicates
- Mock data instead of real database integration
- Incomplete real-time features
- Missing file upload functionality

Key strengths:
- Comprehensive workflow state machine
- Role-based permission model
- Rich component library
- Good error handling patterns
- Optimistic update implementation

The marketing feature is more complex than inventory or executive features, with sophisticated workflow management but needs significant cleanup and real implementation of services for production use.