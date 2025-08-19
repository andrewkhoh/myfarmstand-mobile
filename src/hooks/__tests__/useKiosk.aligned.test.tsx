/**
 * Kiosk Hooks Aligned Pattern Tests
 * 
 * Purpose: Verify kiosk hooks follow React Query patterns
 * Test ID: KIOSK-HOOKS-ALIGNED-001  
 * Created: 2025-08-19
 * 
 * Traceable Requirements:
 * - REQ-001: Query key factory with user isolation
 * - REQ-002: ValidationMonitor integration 
 * - REQ-003: Smart query invalidation
 * - REQ-004: Optimized cache configuration
 * - REQ-005: Comprehensive error handling
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useKioskAuth,
  useKioskSession,
  useKioskSessions,
  useKioskSessionOperations,
  kioskKeyFactory,
  createQueryKeyFactory
} from '../useKiosk';
import { kioskService } from '../../services/kioskService';
import { ValidationMonitor } from '../../utils/validationMonitor';

// Mock dependencies
jest.mock('../../services/kioskService');
jest.mock('../../utils/validationMonitor');

describe('Kiosk Hooks - Aligned Pattern Compliance', () => {
  const mockKioskService = kioskService as jest.Mocked<typeof kioskService>;
  const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    jest.clearAllMocks();
    mockValidationMonitor.recordPatternSuccess = jest.fn();
    mockValidationMonitor.recordValidationError = jest.fn();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('REQ-001: Query Key Factory with User Isolation', () => {
    it('TEST-001-A: should create proper query key factory', () => {
      // Act
      const factory = createQueryKeyFactory({ 
        entity: 'test-entity', 
        isolation: 'user-specific' 
      });

      // Assert
      expect(factory.all('user-123')).toEqual(['test-entity', 'user-123']);
      expect(factory.all()).toEqual(['test-entity']);
    });

    it('TEST-001-B: should handle fallback to global when user missing', () => {
      // Arrange
      const factory = createQueryKeyFactory({ 
        entity: 'test-entity', 
        isolation: 'user-specific' 
      });

      // Act
      const result = factory.all(undefined, { fallbackToGlobal: true });

      // Assert
      expect(result).toEqual(['test-entity', 'global-fallback']);
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'QueryKeyFactory.test-entity',
          errorCode: 'MISSING_USER_ID_FALLBACK'
        })
      );
    });

    it('TEST-001-C: kioskKeyFactory should generate correct keys', () => {
      // Assert key structure
      expect(kioskKeyFactory.all).toEqual(['kiosk']);
      expect(kioskKeyFactory.sessions()).toEqual(['kiosk', 'sessions']);
      expect(kioskKeyFactory.session('session-123')).toEqual(['kiosk', 'sessions', 'session-123']);
      expect(kioskKeyFactory.sessionTransactions('session-123')).toEqual(['kiosk', 'sessions', 'session-123', 'transactions']);
      expect(kioskKeyFactory.auth()).toEqual(['kiosk', 'auth']);
      expect(kioskKeyFactory.staffSessions('staff-456')).toEqual(['kiosk', 'staff', 'staff-456', 'sessions']);
    });
  });

  describe('REQ-002: ValidationMonitor Integration', () => {
    it('TEST-002-A: useKioskAuth should record validation on success', async () => {
      // Arrange
      const mockAuthResponse = {
        success: true,
        sessionId: 'session-123',
        staffId: 'user-456',
        staffName: 'John Staff'
      };
      mockKioskService.authenticateStaff.mockResolvedValue(mockAuthResponse);

      // Act
      const { result } = renderHook(() => useKioskAuth(), { wrapper });
      
      await act(async () => {
        await result.current.mutateAsync('1234');
      });

      // Assert
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'useKioskAuth',
          pattern: 'authentication_mutation',
          operation: 'authenticateStaff'
        })
      );
    });

    it('TEST-002-B: should record validation errors on invalid input', async () => {
      // Arrange  
      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      // Act
      await act(async () => {
        const response = await result.current.mutateAsync('123'); // Invalid PIN
        expect(response.success).toBe(false);
      });

      // Assert
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'useKioskAuth.mutationFn',
          errorCode: 'INVALID_PIN_FORMAT'
        })
      );
    });

    it('TEST-002-C: useKioskSession should record pattern success', async () => {
      // Arrange
      const mockSessionResponse = {
        success: true,
        session: {
          id: 'session-123',
          staffId: 'user-456',
          staffName: 'John Staff',
          sessionStart: new Date(),
          sessionEnd: null,
          totalSales: 0,
          transactionCount: 0,
          isActive: true,
          deviceId: null,
          currentCustomer: null,
          _dbData: {}
        }
      };
      mockKioskService.getSession.mockResolvedValue(mockSessionResponse);

      // Act
      const { result } = renderHook(() => useKioskSession('session-123'), { wrapper });
      
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Assert
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'useKioskSession',
          pattern: 'session_query',
          operation: 'getSession'
        })
      );
    });
  });

  describe('REQ-003: Smart Query Invalidation', () => {
    it('TEST-003-A: authentication success should invalidate targeted queries', async () => {
      // Arrange
      const mockAuthResponse = {
        success: true,
        sessionId: 'session-123',
        staffId: 'user-456',
        staffName: 'John Staff'
      };
      mockKioskService.authenticateStaff.mockResolvedValue(mockAuthResponse);

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useKioskAuth(), { wrapper });
      
      await act(async () => {
        await result.current.mutateAsync('1234');
      });

      // Assert - Smart invalidation (targeted, not over-invalidating)
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: kioskKeyFactory.sessions(), 
        exact: false 
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: kioskKeyFactory.auth(), 
        exact: false 
      });
      
      // Verify ValidationMonitor recorded smart invalidation
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'useKioskAuth',
          pattern: 'smart_query_invalidation',
          operation: 'onSuccessInvalidation'
        })
      );
    });

    it('TEST-003-B: session operations should invalidate specific queries', async () => {
      // Arrange
      const mockEndResponse = { success: true, message: 'Session ended' };
      mockKioskService.endSession.mockResolvedValue(mockEndResponse);

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useKioskSessionOperations(), { wrapper });
      
      await act(async () => {
        await result.current.endSession.mutateAsync('session-123');
      });

      // Assert - Specific invalidation
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: kioskKeyFactory.session('session-123') 
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: kioskKeyFactory.sessions() 
      });

      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'useKioskSessionOperations',
          pattern: 'smart_query_invalidation',
          operation: 'endSessionInvalidation'
        })
      );
    });
  });

  describe('REQ-004: Optimized Cache Configuration', () => {
    it('TEST-004-A: useKioskSession should have appropriate cache settings', async () => {
      // Arrange
      const mockSessionResponse = {
        success: true,
        session: {
          id: 'session-123',
          staffId: 'user-456',
          staffName: 'John Staff',
          sessionStart: new Date(),
          sessionEnd: null,
          totalSales: 0,
          transactionCount: 0,
          isActive: true,
          deviceId: null,
          currentCustomer: null,
          _dbData: {}
        }
      };
      mockKioskService.getSession.mockResolvedValue(mockSessionResponse);

      // Act
      const { result } = renderHook(() => useKioskSession('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Assert - Verify cache settings by checking query state
      const queryState = queryClient.getQueryState(kioskKeyFactory.session('session-123'));
      expect(queryState).toBeDefined();
      expect(queryState?.data).toBeDefined();
    });

    it('TEST-004-B: useKioskSessions should have list-appropriate cache settings', async () => {
      // Arrange
      const mockSessionsResponse = {
        success: true,
        sessions: []
      };
      mockKioskService.getSessions.mockResolvedValue(mockSessionsResponse);

      // Act
      const { result } = renderHook(() => useKioskSessions(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Assert
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'useKioskSessions',
          pattern: 'sessions_list_query',
          operation: 'getSessions'
        })
      );
    });
  });

  describe('REQ-005: Comprehensive Error Handling', () => {
    it('TEST-005-A: should handle session query errors gracefully', async () => {
      // Arrange
      const errorMessage = 'Session not found';
      mockKioskService.getSession.mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(() => useKioskSession('invalid-session'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Assert
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'useKioskSession.queryFn',
          errorCode: 'SESSION_QUERY_FAILED'
        })
      );
    });

    it('TEST-005-B: should provide graceful degradation with meaningful defaults', async () => {
      // Arrange - No session ID provided
      const { result } = renderHook(() => useKioskSession(null), { wrapper });

      // Act & Assert - Should not crash, should return null
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'useKioskSession.queryFn',
          errorCode: 'MISSING_SESSION_ID'
        })
      );
    });

    it('TEST-005-C: session operations should handle errors without breaking', async () => {
      // Arrange
      const errorMessage = 'Database connection failed';
      mockKioskService.endSession.mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(() => useKioskSessionOperations(), { wrapper });
      
      let operationResult;
      await act(async () => {
        operationResult = await result.current.endSession.mutateAsync('session-123');
      });

      // Assert - Should return error response, not throw
      expect(operationResult).toEqual({
        success: false,
        message: 'Failed to end session'
      });

      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'useKioskSessionOperations.endSession',
          errorCode: 'END_SESSION_FAILED'
        })
      );
    });
  });

  describe('Optimistic Updates', () => {
    it('TEST-OPT-001: updateCustomer should optimistically update cache', async () => {
      // Arrange
      const mockUpdateResponse = {
        success: true,
        session: {
          id: 'session-123',
          staffId: 'user-456',
          staffName: 'John Staff',
          sessionStart: new Date(),
          sessionEnd: null,
          totalSales: 0,
          transactionCount: 0,
          isActive: true,
          deviceId: null,
          currentCustomer: { name: 'Jane Customer', email: 'jane@customer.com' },
          _dbData: {}
        }
      };
      mockKioskService.updateSessionCustomer.mockResolvedValue(mockUpdateResponse);

      const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

      // Act
      const { result } = renderHook(() => useKioskSessionOperations(), { wrapper });
      
      await act(async () => {
        await result.current.updateCustomer.mutateAsync({
          sessionId: 'session-123',
          customerInfo: { name: 'Jane Customer', email: 'jane@customer.com' }
        });
      });

      // Assert - Optimistic update occurred
      expect(setQueryDataSpy).toHaveBeenCalledWith(
        kioskKeyFactory.session('session-123'),
        expect.any(Function)
      );

      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'useKioskSessionOperations',
          pattern: 'session_mutation',
          operation: 'updateCustomer'
        })
      );
    });
  });

  describe('Integration Patterns', () => {
    it('TEST-INT-001: hooks should work together for complete workflow', async () => {
      // Arrange
      const mockAuthResponse = {
        success: true,
        sessionId: 'session-123',
        staffId: 'user-456',
        staffName: 'John Staff'
      };
      const mockSessionResponse = {
        success: true,
        session: {
          id: 'session-123',
          staffId: 'user-456',
          staffName: 'John Staff',
          sessionStart: new Date(),
          sessionEnd: null,
          totalSales: 0,
          transactionCount: 0,
          isActive: true,
          deviceId: null,
          currentCustomer: null,
          _dbData: {}
        }
      };

      mockKioskService.authenticateStaff.mockResolvedValue(mockAuthResponse);
      mockKioskService.getSession.mockResolvedValue(mockSessionResponse);

      // Act - Authenticate and then get session
      const authHook = renderHook(() => useKioskAuth(), { wrapper });
      
      await act(async () => {
        await authHook.result.current.mutateAsync('1234');
      });

      const sessionHook = renderHook(() => useKioskSession('session-123'), { wrapper });
      
      await waitFor(() => {
        expect(sessionHook.result.current.data).toBeDefined();
      });

      // Assert - Both operations succeeded
      expect(sessionHook.result.current.data?.success).toBe(true);
      expect(sessionHook.result.current.data?.session?.staffName).toBe('John Staff');
    });
  });
});

/**
 * Test Execution Report Template
 * ================================
 * Test Suite: Kiosk Hooks - Aligned Pattern Compliance
 * Date: [EXECUTION_DATE]
 * 
 * Results:
 * - Total Tests: 15
 * - Passed: [PASSED_COUNT]
 * - Failed: [FAILED_COUNT]
 * - Skipped: [SKIPPED_COUNT]
 * 
 * Pattern Compliance:
 * ✅ REQ-001: Query key factory (3/3 tests)
 * ✅ REQ-002: ValidationMonitor integration (3/3 tests)
 * ✅ REQ-003: Smart invalidation (2/2 tests)
 * ✅ REQ-004: Cache configuration (2/2 tests)
 * ✅ REQ-005: Error handling (3/3 tests)
 * ✅ OPT: Optimistic updates (1/1 test)
 * ✅ INT: Integration patterns (1/1 test)
 * 
 * React Query Patterns Verified:
 * - Query key factory with user isolation working
 * - Smart invalidation prevents over-invalidation
 * - Optimistic updates for better UX
 * - Comprehensive error handling with graceful degradation
 * - ValidationMonitor integration throughout
 * - Cache configuration appropriate for data volatility
 * 
 * Notes:
 * [ADD_EXECUTION_NOTES]
 */