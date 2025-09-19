# Integration Patterns and Guidelines

## Overview

This document establishes the integration patterns and guidelines to ensure consistent, maintainable development across features. These patterns were developed after a comprehensive cleanup of multi-agent development artifacts and should be followed for all future development.

## 🎯 Core Integration Principles

### 1. **Service-First Architecture**
- Every feature must have a dedicated service layer
- Services follow the naming convention: `featureService` (camelCase instance)
- Services are exported from `src/services/[feature]/index.ts`
- No direct database calls from hooks or components

### 2. **Hook-Centric State Management**
- All data fetching happens through React Query hooks
- Hooks provide the interface between services and components
- Hook files follow the pattern: `use[FeatureName][Operation].ts`
- No business logic in components

### 3. **Role-Based Security Integration**
- All sensitive operations must be wrapped in `PermissionGate` components
- Use `useRolePermissions()` hook for programmatic permission checks
- Apply the principle of least privilege

### 4. **Unified Real-time Integration**
- Use `useUnifiedRealtime()` for all real-time features
- Display connection status with `RealtimeStatusIndicator`
- Coordinate real-time updates across features

## 📁 File Organization Standards

### Service Layer Structure
```
src/services/[feature]/
├── index.ts                    # Central exports
├── [feature].service.ts        # Main service implementation
├── [specific].service.ts       # Specialized services
├── types.ts                    # Service-specific types
└── errors/
    └── ServiceError.ts         # Error handling
```

### Hook Layer Structure
```
src/hooks/[feature]/
├── index.ts                    # Central exports
├── use[Feature]Items.ts        # List operations
├── use[Feature]Item.ts         # Single item operations
├── useCreate[Feature].ts       # Creation operations
├── useUpdate[Feature].ts       # Update operations
├── use[Feature]Realtime.ts     # Real-time subscriptions
└── use[Feature]Permissions.ts  # Permission checks
```

### Component Layer Structure
```
src/components/[feature]/
├── index.ts                    # Central exports
├── [Feature]Card.tsx           # Item display component
├── [Feature]List.tsx           # List display component
├── [Feature]Form.tsx           # Form component
└── [Feature]Actions.tsx        # Action buttons/controls
```

## 🔌 Integration Checklist

### For New Features

#### 1. Service Integration
- [ ] Create service in `src/services/[feature]/`
- [ ] Export service from central index file
- [ ] Implement error handling with `ServiceError`
- [ ] Add TypeScript interfaces for all operations
- [ ] Follow existing service patterns (see `campaignService` example)

#### 2. Hook Integration
- [ ] Create hooks in `src/hooks/[feature]/`
- [ ] Use React Query for all data operations
- [ ] Implement optimistic updates where appropriate
- [ ] Add proper error handling and loading states
- [ ] Export hooks from central index file

#### 3. Screen Integration
- [ ] Import hooks, not services directly
- [ ] Add role-based permission checks
- [ ] Include real-time status indicator if applicable
- [ ] Implement proper loading and error states
- [ ] Add refresh functionality

#### 4. Component Integration
- [ ] Create reusable components following naming conventions
- [ ] Use role-based access controls (`PermissionGate`, `RoleBasedButton`)
- [ ] Follow consistent styling patterns
- [ ] Export components from central index file

#### 5. Real-time Integration
- [ ] Add real-time subscriptions if data changes frequently
- [ ] Use `useUnifiedRealtime()` for connection management
- [ ] Display connection status with `RealtimeStatusIndicator`
- [ ] Coordinate cache invalidation with real-time updates

### For Existing Features

#### Security Enhancement
- [ ] Wrap sensitive operations in `PermissionGate`
- [ ] Add permission checks to mutation hooks
- [ ] Implement role-based navigation restrictions
- [ ] Audit data access patterns

#### Real-time Enhancement
- [ ] Integrate with `useUnifiedRealtime()`
- [ ] Add `RealtimeStatusIndicator` to screens
- [ ] Implement automatic data refresh on real-time events
- [ ] Test connection quality indicators

## 🛡️ Permission Patterns

### Standard Permissions
```typescript
// Feature-level permissions
[feature].view              // View feature
[feature].create            // Create items
[feature].edit              // Edit existing items
[feature].delete            // Delete items
[feature].manage            // Full management access

// Specific permissions
[feature].[action].perform  // Specific action
[feature].[data_type].view  // View specific data type
[feature].bulk_operations   // Bulk operations
```

### Implementation Examples
```tsx
// Component-level permission gate
<PermissionGate permission="marketing.content.create">
  <CreateContentButton />
</PermissionGate>

// Hook-level permission check
const { hasPermission } = useRolePermissions();
if (!hasPermission('inventory.bulk_operations')) {
  throw new Error('Insufficient permissions');
}

// Role-based button
<RoleBasedButton
  requiredPermission="executive.revenue.view"
  onPress={handleViewRevenue}
>
  View Revenue Details
</RoleBasedButton>
```

## 🔄 Real-time Integration Patterns

### Basic Real-time Setup
```tsx
// In main feature hook
import { useUnifiedRealtime } from '../../hooks/useUnifiedRealtime';

export function FeatureScreen() {
  const { isConnected, status } = useUnifiedRealtime();

  return (
    <View>
      <RealtimeStatusIndicator showDetails={true} />
      {/* Feature content */}
    </View>
  );
}
```

### Advanced Real-time Coordination
```tsx
// In service or hook that handles real-time updates
const { refreshAll } = useUnifiedRealtime();

// Trigger unified refresh after important operations
await createItem(data);
refreshAll(); // Refreshes all connected features
```

## 🚨 Anti-Patterns to Avoid

### ❌ Don't Do These

1. **Direct Service Imports in Components**
   ```tsx
   // ❌ Wrong
   import { campaignService } from '../services/marketing';

   // ✅ Right
   import { useCampaigns } from '../hooks/marketing';
   ```

2. **Duplicate Component Names**
   ```tsx
   // ❌ Wrong - Multiple LoadingScreen components
   LoadingScreen.tsx
   LoadingState.tsx
   Loading.tsx

   // ✅ Right - Single Loading component with variants
   Loading.tsx (with overlay, size, and message props)
   ```

3. **Orphaned Hooks**
   ```tsx
   // ❌ Wrong - Creating hooks not used by any screens
   useAdvancedAnalytics.ts  // If no screen uses it

   // ✅ Right - Create hooks only when needed by screens
   ```

4. **Inconsistent Naming**
   ```tsx
   // ❌ Wrong
   useProductBundle.ts     // Singular
   useProductBundles.ts    // Plural

   // ✅ Right - Pick one pattern and stick to it
   useProductBundles.ts    // For lists
   useProductBundle.ts     // For single items
   ```

5. **Missing Permission Checks**
   ```tsx
   // ❌ Wrong - No permission validation
   <Button onPress={deleteAllData} />

   // ✅ Right - Protected sensitive actions
   <PermissionGate permission="admin.data.delete">
     <Button onPress={deleteAllData} />
   </PermissionGate>
   ```

## 📊 Integration Health Monitoring

### Key Metrics to Track

1. **Hook Utilization Rate**: % of hooks actually used by screens
2. **Service Integration Coverage**: % of features with proper service layer
3. **Permission Coverage**: % of sensitive operations protected
4. **Real-time Feature Adoption**: % of applicable features using real-time
5. **Component Reuse Rate**: % of components shared across features

### Health Check Commands
```bash
# Count orphaned hooks
find src/hooks -name "*.ts" | xargs grep -L "import.*from.*hooks" src/screens/**/*.tsx

# Check permission gate usage
grep -r "PermissionGate\|RoleBasedButton" src/screens/

# Verify service patterns
find src/services -name "index.ts" | xargs grep "export.*Service"
```

## 🔄 Migration Guide

### From Legacy Patterns

1. **Service Integration Migration**
   - Identify direct service imports in components
   - Create corresponding hooks if they don't exist
   - Replace service calls with hook usage
   - Add permission checks

2. **Real-time Feature Migration**
   - Replace individual real-time hooks with `useUnifiedRealtime()`
   - Add `RealtimeStatusIndicator` to screens
   - Coordinate cache invalidation

3. **Component Consolidation**
   - Identify duplicate components (Loading, Error states)
   - Choose the most feature-rich version
   - Update all imports to use consolidated component
   - Remove duplicate files

## 🎯 Success Criteria

A well-integrated feature should have:

- ✅ **95%+ hook utilization** (no orphaned hooks)
- ✅ **Complete service layer** with proper error handling
- ✅ **Permission gates** around all sensitive operations
- ✅ **Real-time integration** where applicable
- ✅ **Consistent naming** following established patterns
- ✅ **Proper error and loading states** in all screens
- ✅ **Reusable components** following design system
- ✅ **TypeScript coverage** for all interfaces and operations

## 🤝 Team Collaboration Guidelines

### For Agent Development
1. **Read this document** before starting any feature development
2. **Check existing patterns** before creating new services/hooks
3. **Integrate incrementally** - don't build features in isolation
4. **Test integration** with existing features before considering complete
5. **Document deviations** from these patterns with clear reasoning

### For Code Reviews
1. **Verify integration patterns** are followed
2. **Check for orphaned code** (hooks, services, components not used)
3. **Ensure permission checks** are in place for sensitive operations
4. **Validate naming consistency** with existing codebase
5. **Test real-time integration** if applicable

---

**Remember**: The goal is sustainable, maintainable code that different agents (and humans) can work on without creating chaos. These patterns ensure consistency and prevent the integration debt that accumulated from multi-agent development.