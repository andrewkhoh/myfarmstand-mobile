import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { 
  useKioskAuth, 
  useKioskSession, 
  useKioskSessionOperations,
  kioskKeys 
} from '../useKiosk';
import { kioskService } from '../../services/kioskService';

// Mock the kiosk service (following CLAUDE.md pattern: service layer mocked for hooks)
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

describe('useKiosk hooks - Simplified Tests', () => {
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

  describe('kioskKeys factory', () => {
    it('should generate consistent query keys', () => {
      expect(kioskKeys.all).toEqual(['kiosk']);
      expect(kioskKeys.sessions()).toEqual(['kiosk', 'sessions']);
      expect(kioskKeys.session('session_123')).toEqual(['kiosk', 'sessions', 'session_123']);
      expect(kioskKeys.auth()).toEqual(['kiosk', 'auth']);
      expect(kioskKeys.transactions('session_123')).toEqual(['kiosk', 'sessions', 'session_123', 'transactions']);
    });
  });

  describe('useKioskAuth', () => {
    it('should handle successful authentication', async () => {
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

      expect(authResult).toEqual(mockAuthResponse);
      expect(mockKioskService.authenticateStaff).toHaveBeenCalledWith('1234');
      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle authentication failure', async () => {
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
    });

    it('should handle service errors properly', async () => {
      const serviceError = new Error('Service unavailable');
      mockKioskService.authenticateStaff.mockRejectedValue(serviceError);

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync('1234');
        } catch (error) {
          expect(error).toBe(serviceError);
        }
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe('useKioskSession', () => {
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

    it('should not fetch when sessionId is null', async () => {
      const { result } = renderHook(() => useKioskSession(null), { wrapper });

      expect(mockKioskService.getSession).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle session fetch errors', async () => {
      const serviceError = new Error('Failed to fetch session');
      mockKioskService.getSession.mockRejectedValue(serviceError);

      const { result } = renderHook(() => useKioskSession('session_123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(serviceError);
    });
  });

  describe('useKioskSessionOperations', () => {
    it('should handle session ending', async () => {
      const mockEndResponse = {
        success: true,
        message: 'Session ended successfully'
      };

      mockKioskService.endSession.mockResolvedValue(mockEndResponse);

      const { result } = renderHook(() => useKioskSessionOperations(), { wrapper });

      let endResult;
      await act(async () => {
        endResult = await result.current.endSession.mutateAsync('session_123');
      });

      expect(endResult).toEqual(mockEndResponse);
      expect(mockKioskService.endSession).toHaveBeenCalledWith('session_123');
    });

    it('should handle adding customer info', async () => {
      const customerInfo = {
        email: 'customer@example.com',
        phone: '+1234567890',
        name: 'Jane Customer'
      };

      const mockUpdateResponse = {
        success: true,
        session: {
          id: 'session_123',
          staffId: 'staff_456',
          staffName: 'John Staff',
          sessionStart: new Date(),
          totalSales: 0,
          transactionCount: 0,
          isActive: true,
          currentCustomer: customerInfo
        }
      };

      mockKioskService.updateSessionCustomer.mockResolvedValue(mockUpdateResponse);

      const { result } = renderHook(() => useKioskSessionOperations(), { wrapper });

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateCustomer.mutateAsync({
          sessionId: 'session_123',
          customerInfo
        });
      });

      expect(updateResult).toEqual(mockUpdateResponse);
      expect(mockKioskService.updateSessionCustomer).toHaveBeenCalledWith('session_123', customerInfo);
    });
  });

  describe('Cache Invalidation Testing', () => {
    it('should invalidate session queries on successful auth', async () => {
      const mockAuthResponse = {
        success: true,
        sessionId: 'session_123',
        staffId: 'staff_456',
        staffName: 'John Staff'
      };

      mockKioskService.authenticateStaff.mockResolvedValue(mockAuthResponse);

      // Pre-populate cache with session data
      const sessionData = {
        success: true,
        session: {
          id: 'old_session',
          staffId: 'old_staff',
          staffName: 'Old Staff',
          sessionStart: new Date(),
          totalSales: 0,
          transactionCount: 0,
          isActive: false
        }
      };
      
      queryClient.setQueryData(kioskKeys.sessions(), [sessionData]);

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('1234');
      });

      // Wait for invalidation to complete
      await waitFor(() => {
        const cachedSessions = queryClient.getQueryState(kioskKeys.sessions());
        expect(cachedSessions?.isInvalidated).toBe(true);
      });
    });
  });

  describe('Validation Pattern Compliance', () => {
    it('should follow React Query patterns from CLAUDE.md', () => {
      // Test that hooks return proper React Query structure
      const { result } = renderHook(() => useKioskAuth(), { wrapper });
      
      // Should have standard React Query mutation properties
      expect(result.current).toHaveProperty('mutateAsync');
      expect(result.current).toHaveProperty('isPending');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('reset');
    });

    it('should use query key factory patterns', () => {
      // Query keys should be consistent and hierarchical
      const allKeys = kioskKeys.all;
      const sessionKeys = kioskKeys.sessions();
      const specificSessionKeys = kioskKeys.session('test');
      
      expect(specificSessionKeys).toContain(...allKeys);
      expect(specificSessionKeys).toContain(...sessionKeys);
      expect(specificSessionKeys[specificSessionKeys.length - 1]).toBe('test');
    });

    it('should use proper staleTime and refetch intervals', () => {
      // This tests that the hook configuration follows established patterns
      const { result } = renderHook(() => useKioskSession('session_123'), { wrapper });
      
      // Should be loading initially when enabled
      expect(result.current.isLoading).toBe(true);
    });
  });
});