# Service Test Success Pattern

## Key Finding: Service Mode Incorrectly Mocked Services

The main issue was that `src/test/test-setup.ts` was mocking services in SERVICE mode, which breaks service tests since we're trying to test the actual service implementations.

### Fixed in test-setup.ts

```typescript
function mockServices() {
  // NOTE: In SERVICE mode, we should NOT mock the services themselves
  // as we're testing the actual service implementations.
  // Only mock services when testing hooks or components that use services.
  
  // This function is now a no-op for SERVICE mode
  // Services should mock their own dependencies in their test files
}
```

## Working Service Test Pattern

### 1. Mock Setup Order (CRITICAL)

```typescript
// Setup all mocks BEFORE any imports
jest.mock('../../config/supabase', () => {
  const mockAuth = {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    // ... all auth methods
  };
  
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    // ... chainable query methods
  }));
  
  return {
    supabase: {
      auth: mockAuth,
      from: mockFrom,
    },
    TABLES: { /* table constants */ }
  };
});

// Mock all service dependencies
jest.mock('../tokenService', () => ({
  TokenService: {
    setAccessToken: jest.fn().mockResolvedValue(undefined),
    clearAllTokens: jest.fn().mockResolvedValue(undefined),
    // ... all token service methods
  }
}));

// Mock validation utilities
jest.mock('../../utils/validationPipeline', () => ({
  ServiceValidator: {
    validateInput: jest.fn(async (data, schema, context) => {
      // Implement proper validation logic for tests
      if (typeof data === 'object' && data.email && data.password) {
        if (!data.email.includes('@')) {
          throw new Error('Invalid email format');
        }
        if (data.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        return data;
      }
      return data;
    }),
  },
  ValidationUtils: {
    createEmailSchema: jest.fn(() => ({
      parse: (email: string) => {
        if (!email || !email.includes('@')) {
          throw new Error('Invalid email');
        }
        return email;
      }
    })),
  }
}));

// Import AFTER mocks are setup
import { AuthService } from '../authService';
import { TokenService } from '../tokenService';
import { supabase } from '../../config/supabase';

// Get mock references for use in tests
const mockSupabaseAuth = supabase.auth as any;
const mockSupabaseFrom = supabase.from as jest.Mock;
```

### 2. Test Structure

```typescript
describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset default mock behaviors
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Setup specific mock responses for this test
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });
      
      // Mock database queries with proper chaining
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserProfile,
          error: null
        })
      });
      
      // Call the service method
      const result = await AuthService.login('test@example.com', 'password123');
      
      // Verify results
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(TokenService.setAccessToken).toHaveBeenCalledWith('access-token');
    });

    it('should handle error case', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });
      
      await expect(
        AuthService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### 3. Key Patterns

#### Mock Data Must Match Schemas
```typescript
const mockSession = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,        // Required by SupabaseSessionSchema
  token_type: 'bearer',    // Required by SupabaseSessionSchema
  user: mockUser
};
```

#### Chain Mocking for Database Queries
```typescript
// WRONG: This doesn't work for chained calls
const fromMock = mockSupabaseFrom();
fromMock.single.mockResolvedValue({...});

// RIGHT: Mock the entire chain
mockSupabaseFrom.mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: mockData,
    error: null
  })
});
```

#### Proper Method Name Matching
```typescript
// AuthService calls clearAllTokens(), not clearTokens()
TokenService: {
  clearAllTokens: jest.fn().mockResolvedValue(undefined), // ✅
  clearTokens: jest.fn().mockResolvedValue(undefined),    // ❌ wrong method
}
```

### 4. Results

- **authService.test.ts**: 16/16 tests passing (100% ✅)
- Fixed global service mocking issue in test-setup.ts
- Created reusable pattern for other service tests

### 5. Next Steps

Apply this pattern to other service tests:
- orderService.test.ts
- productService.test.ts  
- cartService.test.ts
- paymentService.test.ts

Each service test should:
1. Mock its own dependencies (not be mocked itself)
2. Use proper mock setup order
3. Follow the established testing patterns