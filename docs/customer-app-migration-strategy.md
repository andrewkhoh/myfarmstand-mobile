# Customer App Migration Strategy

## Executive Summary

This document outlines the strategy for extracting a standalone customer mobile application from the existing MyFarmstand monolithic codebase. The goal is to create a secure, performant customer app suitable for App Store deployment while maintaining the sophisticated business management capabilities in a separate application.

## Current State Analysis

### Architecture Overview
The current codebase contains two distinct applications within a single React Native project:

1. **Customer-Facing App**: Shop, Cart, Checkout, Orders, Profile
2. **Business Management App**: Inventory, Marketing, Executive Analytics, Admin

### Key Findings
- ✅ **Clean Separation Exists**: Customer screens have no business module imports
- ✅ **Service Layer Ready**: Core hooks (`useCart`, `useProducts`, `useAuth`) are customer-focused
- ✅ **Database Abstraction**: Well-structured service layer prevents tight coupling
- ⚠️ **Integration Points**: Kiosk system, validation monitoring, real-time coordination

## Migration Objectives

### Primary Goals
1. **Security**: Remove all business logic from customer app bundle
2. **Performance**: Reduce customer app size by ~40% (50MB → 30MB)
3. **Maintainability**: Independent deployment cycles for customer vs business features
4. **App Store Readiness**: Clean, focused customer experience

### Success Metrics
- Customer app bundle size < 30MB
- Customer app startup time < 3 seconds
- Zero business code in customer bundle
- App Store approval within 1 week
- No breaking changes to business functionality

## Migration Approach

### Recommended Architecture: Monorepo with Separate Apps

```
myfarmstand-monorepo/
├── packages/
│   ├── shared-core/           # Shared infrastructure
│   ├── customer-mobile/       # Customer React Native app
│   └── business-web/          # Business web dashboard
├── apps/
│   ├── customer-mobile/       # Expo/React Native customer app
│   └── business-dashboard/    # Next.js business web app
└── docs/                      # Documentation
```

## Risk Assessment

### High Risk ⚠️
1. **Kiosk Integration**: Customer screens use kiosk for staff assistance
2. **Validation Monitor**: 154 files depend on centralized monitoring

### Medium Risk ⚠️
3. **Query Invalidation**: Complex cross-module cache invalidation
4. **Real-time Updates**: Inventory changes affect customer product display

### Low Risk ✅
5. **Authentication**: Shared between apps but clean API
6. **Database**: Well-structured with clear boundaries
7. **Service Layer**: Already abstracted through hooks

## Implementation Timeline

**Total Duration**: 8 weeks

- **Phase 1**: Foundation Setup (2 weeks)
- **Phase 2**: Customer App Creation (2 weeks)
- **Phase 3**: Business App Consolidation (2 weeks)
- **Phase 4**: Optimization & Deployment (2 weeks)

## Next Steps

1. Review and approve migration strategy
2. Set up development environment for monorepo
3. Begin Phase 1: Foundation Setup
4. Establish testing protocols for separated applications

## Related Documents

- [Detailed Implementation Plan](./customer-app-implementation-plan.md)
- [Technical Architecture](./customer-app-technical-architecture.md)
- [Database Security Model](./customer-app-database-security.md)
- [Testing Strategy](./customer-app-testing-strategy.md)