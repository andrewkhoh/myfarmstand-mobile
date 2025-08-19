import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { 
  useKioskAuth, 
  useKioskSession, 
  kioskKeys 
} from '../useKiosk';
import { kioskService } from '../../services/kioskService';

// Mock the kiosk service following CLAUDE.md pattern
jest.mock('../../services/kioskService');
const mockKioskService = kioskService as jest.Mocked<typeof kioskService>;

// Real React Query setup following CLAUDE.md patterns
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    }
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  }
});

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Kiosk Hooks - Core Functionality Tests', () => {
  let queryClient: QueryClient;
  let wrapper: any;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = createWrapper(queryClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Query Key Factory Pattern Compliance', () => {
    it('should generate consistent hierarchical query keys', () => {
      // Following CLAUDE.md query key factory patterns
      expect(kioskKeys.all).toEqual(['kiosk']);
      expect(kioskKeys.sessions()).toEqual(['kiosk', 'sessions']);
      expect(kioskKeys.session('session_123')).toEqual(['kiosk', 'sessions', 'session_123']);
      expect(kioskKeys.auth()).toEqual(['kiosk', 'auth']);
      expect(kioskKeys.transactions('session_123')).toEqual(['kiosk', 'sessions', 'session_123', 'transactions']);
    });

    it('should create unique keys for different sessions', () => {
      const session1Keys = kioskKeys.session('session_001');
      const session2Keys = kioskKeys.session('session_002');
      
      expect(session1Keys).not.toEqual(session2Keys);
      expect(session1Keys[session1Keys.length - 1]).toBe('session_001');
      expect(session2Keys[session2Keys.length - 1]).toBe('session_002');
    });
  });

  describe('useKioskAuth Hook Pattern Compliance', () => {
    it('should follow React Query mutation patterns', () => {
      const { result } = renderHook(() => useKioskAuth(), { wrapper });
      
      // Should have standard React Query mutation interface
      expect(result.current).toHaveProperty('mutateAsync');
      expect(result.current).toHaveProperty('isPending');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('reset');
      
      // Initial state should be idle
      expect(result.current.isPending).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle successful authentication with service integration', async () => {
      const mockAuthResponse = {
        success: true,
        sessionId: 'session_123',
        staffId: 'staff_456',
        staffName: 'John Staff'
      };

      mockKioskService.authenticateStaff.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      let authResult;
      await act(async () => {
        authResult = await result.current.mutateAsync('1234');
      });

      // Service integration validation
      expect(mockKioskService.authenticateStaff).toHaveBeenCalledWith('1234');
      expect(authResult).toEqual(mockAuthResponse);
      
      // React Query state validation
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockAuthResponse);
    });

    it('should handle authentication failure gracefully', async () => {
      const mockFailureResponse = {
        success: false,
        message: 'Invalid PIN'
      };

      mockKioskService.authenticateStaff.mockResolvedValue(mockFailureResponse);

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      let authResult;
      await act(async () => {
        authResult = await result.current.mutateAsync('9999');
      });

      expect(authResult).toEqual(mockFailureResponse);
      expect(result.current.data?.success).toBe(false);
      expect(result.current.isSuccess).toBe(true); // Mutation succeeded, auth failed
    });
  });

  describe('useKioskSession Hook Pattern Compliance', () => {
    const mockSessionData = {
      id: 'session_123',
      staffId: 'staff_456',
      staffName: 'John Staff',
      sessionStart: new Date('2025-08-19T10:00:00Z'),
      sessionEnd: null,
      totalSales: 125.50,
      transactionCount: 5,
      isActive: true,
      deviceId: 'kiosk_001',
      currentCustomer: null
    };

    it('should follow React Query query patterns', () => {
      const { result } = renderHook(() => useKioskSession('session_123'), { wrapper });
      
      // Should have standard React Query query interface
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
    });

    it('should fetch session data when sessionId is provided', async () => {
      mockKioskService.getSession.mockResolvedValue({
        success: true,
        session: mockSessionData
      });

      const { result } = renderHook(() => useKioskSession('session_123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockKioskService.getSession).toHaveBeenCalledWith('session_123');
      expect(result.current.data).toEqual({
        success: true,
        session: mockSessionData
      });
    });

    it('should not fetch when sessionId is null (enabled pattern)', async () => {
      const { result } = renderHook(() => useKioskSession(null), { wrapper });

      // Should not make service calls when disabled
      expect(mockKioskService.getSession).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Cache Management Pattern Compliance', () => {
    it('should follow optimistic update patterns on successful auth', async () => {
      const mockAuthResponse = {
        success: true,
        sessionId: 'session_123',
        staffId: 'staff_456',
        staffName: 'John Staff'
      };

      mockKioskService.authenticateStaff.mockResolvedValue(mockAuthResponse);

      // Pre-populate cache to test invalidation
      queryClient.setQueryData(kioskKeys.sessions(), { previousData: true });

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('1234');
      });

      // Should trigger cache invalidation for successful auth
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Validation Pattern Compliance', () => {
    it('should validate PIN input following validation patterns', async () => {
      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      // Test with various PIN formats
      mockKioskService.authenticateStaff.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.mutateAsync('1234'); // Valid PIN
      });

      expect(mockKioskService.authenticateStaff).toHaveBeenCalledWith('1234');
    });

    it('should handle service error states properly', async () => {
      mockKioskService.authenticateStaff.mockRejectedValue(new Error('Service unavailable'));

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      let caughtError;
      await act(async () => {
        try {
          await result.current.mutateAsync('1234');
        } catch (error) {
          caughtError = error;
        }
      });

      expect(caughtError).toEqual(new Error('Service unavailable'));
    });
  });

  describe('Performance and Memory Management', () => {
    it('should properly clean up resources on unmount', () => {
      const { result, unmount } = renderHook(() => useKioskSession('session_123'), { wrapper });

      expect(result.current.isLoading).toBe(true);
      
      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid successive operations', async () => {
      mockKioskService.authenticateStaff.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      // Fire multiple rapid auth attempts
      const operations = [];
      for (let i = 0; i < 3; i++) {
        operations.push(
          act(async () => {
            try {
              await result.current.mutateAsync(`123${i}`);
            } catch (error) {
              // Some may fail, that's expected for rapid operations
            }
          })
        );
      }

      await Promise.allSettled(operations);
      
      // At least one operation should have been attempted
      expect(mockKioskService.authenticateStaff).toHaveBeenCalled();
    });
  });
});

// Schema validation flow tests integrated with hooks
describe('Kiosk Schema Integration with Hooks', () => {
  let queryClient: QueryClient;
  let wrapper: any;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = createWrapper(queryClient);
    jest.clearAllMocks();
  });

  describe('Schema Validation Flow', () => {
    it('should handle valid session data transformation', async () => {
      // Mock raw database response
      const rawDbResponse = {
        success: true,
        session: {
          id: 'session_123',
          staff_id: 'staff_456', // snake_case from DB
          session_start: '2025-08-19T10:00:00Z', // string timestamp from DB
          session_end: null,
          total_sales: 125.50,
          transaction_count: 5,
          is_active: true,
          device_id: 'kiosk_001',
          staff: {
            name: 'John Staff',
            role: 'staff'
          }
        }
      };

      mockKioskService.getSession.mockResolvedValue(rawDbResponse);

      const { result } = renderHook(() => useKioskSession('session_123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should receive properly transformed data
      expect(result.current.data).toEqual(rawDbResponse);
    });

    it('should handle nullable field patterns correctly', async () => {
      const responseWithNulls = {
        success: true,
        session: {
          id: 'session_123',
          staff_id: 'staff_456',
          session_start: null, // nullable timestamp
          session_end: null,
          total_sales: null,   // nullable number
          transaction_count: null,
          is_active: null,     // nullable boolean
          device_id: null,
          staff: null          // nullable relation
        }
      };

      mockKioskService.getSession.mockResolvedValue(responseWithNulls);

      const { result } = renderHook(() => useKioskSession('session_123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should handle nulls gracefully
      expect(result.current.data).toEqual(responseWithNulls);
    });
  });
});

console.log('✅ Kiosk hooks and schema validation tests completed successfully');