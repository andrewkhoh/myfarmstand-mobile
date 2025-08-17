# Testing Guide

This project has comprehensive test coverage with two distinct testing patterns: service layer tests and hook tests.

## Available Test Commands

### Service Layer Tests
```bash
# Run all service tests
npm run test:services

# Run service tests in watch mode
npm run test:services:watch
```

### Hook Tests
```bash
# Run regular hook tests (stable, recommended)
npm run test:hooks

# Run hook tests in watch mode
npm run test:hooks:watch

# Run race condition tests (experimental)
npm run test:hooks:race

# Run race condition tests in watch mode
npm run test:hooks:race:watch
```

### All Tests
```bash
# Run both service and hook tests
npm run test:all
```

## Testing Patterns

### 1. Service Layer Tests

**Location**: `src/services/__tests__/`
**Configuration**: `jest.config.services.js`
**Pattern**: Mock Supabase client directly

**Key characteristics**:
- Tests business logic and data operations
- Mocks Supabase client and database responses
- Tests error handling and edge cases
- Uses real service implementations with mocked dependencies

**Example structure**:
```typescript
// Mock Supabase before importing services
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn()
    }
  }
}));

describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful operations', async () => {
    // Mock successful response
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        data: [/* mock data */],
        error: null
      })
    });

    const result = await ServiceName.methodName();
    expect(result.success).toBe(true);
  });
});
```

### 2. Hook Tests

**Location**: `src/hooks/__tests__/`
**Configuration**: `jest.config.hooks.regular.js`
**Pattern**: Mock React Query and services

**Key characteristics**:
- Tests React hooks and component integration
- Mocks React Query mutations and queries
- Tests authentication guards and loading states
- Uses React Testing Library for hook testing

**Example structure**:
```typescript
// Setup happens in src/test/minimal-setup.js
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('useHookName', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should handle authenticated scenarios', async () => {
    mockUseCurrentUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null
    });

    const { result } = renderHook(() => useHookName(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
```

### 3. Race Condition Tests (Experimental)

**Location**: `src/hooks/__tests__/*race.test.ts`
**Configuration**: `jest.config.hooks.race.js`
**Status**: Experimental - contains JSX syntax issues

**Key characteristics**:
- Tests concurrent operations and race conditions
- Tests optimistic updates and rollback scenarios
- More complex setup requirements
- Currently has configuration issues with JSX parsing

## Test Setup Files

### Service Tests Setup
- **File**: `src/test/serviceSetup.ts`
- **Purpose**: Mock Supabase and configure service test environment
- **Key mocks**: Supabase client, authentication, database operations

### Hook Tests Setup
- **File**: `src/test/minimal-setup.js`
- **Purpose**: Mock React Query, broadcast factory, and React Native components
- **Key mocks**: React Query hooks, broadcast helpers, React Native modules

## Mock Strategies

### Service Layer Mocking
```typescript
// Mock the Supabase client directly
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({ data: [], error: null })),
    insert: jest.fn(() => ({ data: [], error: null })),
    update: jest.fn(() => ({ data: [], error: null })),
    delete: jest.fn(() => ({ data: [], error: null }))
  }))
};
```

### Hook Layer Mocking
```typescript
// Mock React Query mutations
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
    data: null
  })),
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn()
  }))
}));
```

## Common Patterns

### Authentication Testing
```typescript
// Test authenticated scenarios
mockUseCurrentUser.mockReturnValue({
  data: mockUser,
  isLoading: false,
  error: null
});

// Test unauthenticated scenarios
mockUseCurrentUser.mockReturnValue({
  data: null,
  isLoading: false,
  error: null
});
```

### Error Handling Testing
```typescript
// Test service errors
mockSupabase.from.mockReturnValue({
  select: jest.fn().mockReturnValue({
    data: null,
    error: { message: 'Database error', code: 'PGRST116' }
  })
});

// Test network errors
mockMutation.mutateAsync.mockRejectedValue(new Error('Network error'));
```

### Loading State Testing
```typescript
// Test loading states
mockUseQuery.mockReturnValue({
  data: null,
  isLoading: true,
  error: null
});

await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

## Best Practices

1. **Always clear mocks** between tests using `jest.clearAllMocks()`
2. **Use proper cleanup** in `beforeEach` and `afterEach` hooks
3. **Test both success and error scenarios** for comprehensive coverage
4. **Mock external dependencies** consistently across test files
5. **Use `waitFor`** when testing async operations
6. **Test authentication guards** for all hooks that require authentication
7. **Verify console outputs** are appropriate (logs, warnings, errors)

## Troubleshooting

### Common Issues

1. **Race condition tests failing**: Use `npm run test:hooks` instead of `npm run test:hooks:race`
2. **JSX syntax errors**: Race condition tests need React JSX configuration fixes
3. **Worker process hangs**: Tests use `--forceExit` to handle cleanup issues
4. **Mock not found errors**: Check that all required mocks are in setup files

### Test Performance
- Service tests: ~26 test suites, fast execution
- Hook tests: ~15 test suites, slower execution due to React rendering
- Use watch mode during development for faster feedback

## Coverage
The test suite provides comprehensive coverage of:
- ✅ Service layer business logic
- ✅ Hook functionality and integration
- ✅ Authentication flows
- ✅ Error handling and recovery
- ✅ Loading states and async operations
- ⚠️ Race conditions (experimental)