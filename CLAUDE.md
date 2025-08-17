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
- Query key factories for consistent caching
- Broadcast factories for real-time updates
- Error recovery with exponential backoff
- TypeScript interfaces for robust typing

## 🎯 **Current Status**
- ✅ Race condition testing infrastructure complete
- ✅ Real React Query testing working reliably
- ✅ Service and hook test separation established
- 🔄 Ready for expansion to other hooks (useAuth, useOrders, useRealtime)

## 📁 **Important Files**
- `src/test/serviceSetup.ts` - Mock-based setup for services
- `src/test/race-condition-setup.ts` - Real React Query setup for race conditions
- `src/scratchpads/` - Session analysis and documentation
- `jest.config.*.js` - Test configurations for different test types

## ⚡ **Quick Reference**
- **Fake timers**: Avoid in React Query tests (causes hanging)
- **Real short delays**: Use 50-100ms for race condition timing
- **Product-specific mocking**: Better than sequential mocking for concurrent tests
- **waitFor + act**: Required pattern for async state assertions