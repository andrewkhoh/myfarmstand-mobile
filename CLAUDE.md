# MyFarmstand Mobile - Claude Code Memory

## 📋 **Project Overview**
React Native e-commerce mobile app for farm-to-table marketplace with real-time features.

## 🧪 **Testing Infrastructure**

### **Race Condition Testing** ✅ COMPLETED
- **Status**: Production-ready race condition testing with real React Query
- **Location**: `src/hooks/__tests__/*.race.test.tsx`
- **Config**: `jest.config.hooks.race.js`
- **Key Achievement**: 11/11 useCart race condition tests passing (100% success rate)
- **Strategy**: Real timers with short delays (50-100ms) instead of fake timers
- **Commands**:
  - `npm run test:hooks:race` - Run race condition tests
  - `npm run test:hooks` - Run regular hook tests

### **Service Testing**
- **Location**: `src/services/__tests__/`
- **Config**: `jest.config.services.js`
- **Commands**: `npm run test:services`

## 🛠 **Development Commands**

### **Testing**
```bash
# All tests
npm test

# Specific test suites
npm run test:services          # Service layer tests
npm run test:hooks             # Regular hook tests  
npm run test:hooks:race        # Race condition tests

# Watch mode
npm run test:services:watch
npm run test:hooks:watch
```

### **Build & Lint**
```bash
npm run build
npm run lint
npm run typecheck
```

## 🏗 **Architecture Notes**

### **State Management**
- **React Query** for server state and caching
- **Optimistic updates** with automatic rollbacks
- **Real-time subscriptions** via WebSocket/SSE

### **Testing Strategy**
- **Service layer**: Mocked for isolation
- **Hook layer**: Real React Query for race condition testing
- **Integration**: End-to-end behavior testing

### **Key Patterns**
- **Query key factories** for consistent caching ⚠️ **AUDIT FINDINGS**: Dual systems problem requiring immediate fix
- **Broadcast factories** for real-time updates
- **Error recovery** with exponential backoff
- **TypeScript interfaces** for robust typing

## 🎯 **Current Status**
- ✅ Race condition testing infrastructure complete
- ✅ Real React Query testing working reliably
- ✅ Service and hook test separation established
- ✅ Kiosk feature implementation with schema and types synchronized
- 🔄 Ready for expansion to other hooks (useAuth, useOrders, useRealtime)

## 🏪 **Kiosk Setup**

### **Development Testing**
- **Setup Script**: `database/kiosk-dev-setup.sql`
- **Test PINs**: 1234 (staff), 5678 (manager), 9999 (admin)
- **Apply Schema**: `npm run sync-schema` after applying kiosk schema to database
- **Run Setup**: `psql $DATABASE_URL -f database/kiosk-dev-setup.sql`

### **Production Setup**  
- Real staff PINs must be created in `staff_pins` table
- Ensure proper user authentication with role-based access

## 📁 **Important Files**
- `src/test/serviceSetup.ts` - Mock-based setup for services
- `src/test/race-condition-setup.ts` - Real React Query setup for race conditions
- `src/scratchpad*/` - Session analysis and documentation
- `jest.config.*.js` - Test configurations for different test types
- **`docs/architectural-patterns-and-best-practices.md`** - **CANONICAL REFERENCE** for all development patterns

## 📚 **Architectural Patterns & Standards**

### **Core Development Philosophy**
- **Quality-first architecture**: Data integrity > raw performance
- **Graceful degradation**: Never break user workflows
- **Resilient validation**: Individual item processing with skip-on-error
- **User experience priority**: Meaningful error messages and fallback states

### **Key Architectural Patterns**
- **Zod Validation**: Single validation pass, database-first validation, transformation schemas
- **React Query**: User-isolated cache keys, smart invalidation, comprehensive error handling
- **Database Queries**: Direct Supabase with validation pipelines, atomic operations
- **Security**: User data isolation, cryptographic channel security (HMAC-SHA256)
- **Monitoring**: ValidationMonitor for both successes and failures

### **Pattern Compliance Rules**
- ✅ **Follow established patterns** - Don't create new ones without strong justification
- ✅ **Optimize within patterns** - Enhance existing architecture, don't replace it
- ❌ **Never break validation pipelines** - Individual validation enables resilience
- ❌ **No micro-optimizations** - That create maintenance nightmares
- ❌ **No performance shortcuts** - That compromise data integrity or user experience

### **Required Reading**
**ALL agents implementing features MUST review:**
`docs/architectural-patterns-and-best-practices.md`

This document contains:
- Complete pattern examples with ✅ correct and ❌ incorrect implementations
- Implementation checklists for services, schemas, hooks, and security
- Rationale behind "inefficient" patterns (they're actually resilience features)
- Performance optimization strategies that maintain architectural integrity

## 🔑 **Query Key Factory Audit Findings** ⚠️ CRITICAL

### **Discovery**: Dual Systems Problem
- **Status**: URGENT - Inconsistent query key factory adoption across codebase
- **Impact**: Cache invalidation inconsistencies, developer confusion, maintenance burden
- **Audit Location**: `src/scratchpad-querykey-refactor/`

### **Key Issues Found**
1. **Products Hook**: `useProducts.ts` has local `productQueryKeys` + centralized `productKeys` (dual systems)
2. **Auth Hook**: `useAuth.ts` completely bypasses centralized `authKeys` factory
3. **Service Layer**: `realtimeService.ts` mixes manual key construction with factory usage
4. **Kiosk Manual Spreading**: Complex manual key spreading instead of factory methods

### **Adoption Scorecard**
| Entity | Factory Usage | Issues |
|--------|---------------|--------|
| Cart | ✅ 95% | Excellent |
| Orders | ✅ 90% | Good |
| Products | ⚠️ 50% | **Dual systems** |
| Auth | ❌ 10% | **Complete bypass** |
| Kiosk | ⚠️ 70% | Manual spreading |

### **Key Pattern Guidelines**
1. **Consistency First**: Always use centralized query key factories across all entities
2. **Eliminate Dual Systems**: Avoid creating local duplicate factories alongside centralized ones
3. **Service Integration**: Services should leverage factories for cache invalidation operations
4. **Entity Extensions**: Extend base factories with entity-specific methods rather than manual key construction

## ⚡ **Quick Reference**
- **Fake timers**: Avoid in React Query tests (causes hanging)
- **Real short delays**: Use 50-100ms for race condition timing
- **Product-specific mocking**: Better than sequential mocking for concurrent tests
- **waitFor + act**: Required pattern for async state assertions
- **Pattern compliance**: Always check docs/architectural-patterns-and-best-practices.md before implementing
- **Query key factory**: ALWAYS use centralized factory, never create local duplicates