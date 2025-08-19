import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { 
  useKiosk, 
  useKioskAuth, 
  useKioskSession, 
  useKioskSessions,
  useKioskSessionOperations,
  useKioskTransactions,
  useKioskTransactionOperations,
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
      cacheTime: 0,
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

describe('useKiosk hooks - Real React Query Tests', () => {
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

      await act(async () => {
        const authResult = await result.current.mutateAsync('1234');
        expect(authResult).toEqual(mockAuthResponse);
      });

      expect(mockKioskService.authenticateStaff).toHaveBeenCalledWith('1234');
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockAuthResponse);
    });

    it('should handle authentication failure', async () => {
      const mockFailureResponse = {
        success: false,
        message: 'Invalid PIN'
      };

      mockKioskService.authenticateStaff.mockResolvedValue(mockFailureResponse);

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      await act(async () => {
        const authResult = await result.current.mutateAsync('9999');
        expect(authResult).toEqual(mockFailureResponse);
      });

      expect(result.current.isSuccess).toBe(true); // Mutation succeeded, but auth failed
      expect(result.current.data?.success).toBe(false);
    });

    it('should handle service errors', async () => {
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
      expect(result.current.error).toBe(serviceError);
    });

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
        id: 'old_session',
        staffId: 'old_staff',
        staffName: 'Old Staff',
        sessionStart: new Date(),
        totalSales: 0,
        transactionCount: 0,
        isActive: false
      };
      
      queryClient.setQueryData(kioskKeys.sessions(), [sessionData]);

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('1234');
      });

      // Wait for invalidation to complete
      await waitFor(() => {
        // Cache should be invalidated (stale)
        const cachedSessions = queryClient.getQueryState(kioskKeys.sessions());
        expect(cachedSessions?.isInvalidated).toBe(true);
      });
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

      // Should not make any service calls
      expect(mockKioskService.getSession).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should refetch at configured intervals', async () => {
      mockKioskService.getSession.mockResolvedValue({
        success: true,
        session: mockSessionData
      });

      const { result } = renderHook(() => useKioskSession('session_123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear the mock to track refetch calls
      mockKioskService.getSession.mockClear();

      // Fast-forward time to trigger refetch (refetchInterval: 60 * 1000)
      jest.useFakeTimers();
      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });

      await waitFor(() => {
        expect(mockKioskService.getSession).toHaveBeenCalled();
      });

      jest.useRealTimers();
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

      await act(async () => {
        const endResult = await result.current.endSession.mutateAsync('session_123');
        expect(endResult).toEqual(mockEndResponse);
      });

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

      await act(async () => {
        const updateResult = await result.current.updateCustomer.mutateAsync({
          sessionId: 'session_123',
          customerInfo
        });
        expect(updateResult).toEqual(mockUpdateResponse);
      });

      expect(mockKioskService.updateSessionCustomer).toHaveBeenCalledWith('session_123', customerInfo);
    });

    it('should invalidate relevant queries on successful operations', async () => {
      mockKioskService.endSession.mockResolvedValue({ success: true });

      // Pre-populate cache
      queryClient.setQueryData(kioskKeys.session('session_123'), { 
        success: true, 
        session: { id: 'session_123', isActive: true } 
      });

      const { result } = renderHook(() => useKioskSessionOperations(), { wrapper });

      await act(async () => {
        await result.current.endSession.mutateAsync('session_123');
      });

      await waitFor(() => {
        const sessionQueryState = queryClient.getQueryState(kioskKeys.session('session_123'));
        expect(sessionQueryState?.isInvalidated).toBe(true);
      });
    });
  });

  describe('useKioskTransactions', () => {
    const mockTransactions = [
      {
        id: 'trans_001',
        sessionId: 'session_123',
        customerId: null,
        customerEmail: 'customer@example.com',
        items: [
          {
            productId: 'product_001',
            productName: 'Fresh Tomatoes',
            price: 4.99,
            quantity: 2,
            subtotal: 9.98
          }
        ],
        subtotal: 9.98,
        taxAmount: 0.80,
        totalAmount: 10.78,
        paymentMethod: 'card' as const,
        paymentStatus: 'completed' as const,
        completedAt: new Date('2025-08-19T11:00:00Z')
      }
    ];

    it('should fetch transactions for a session', async () => {
      mockKioskService.getSessionTransactions.mockResolvedValue({
        success: true,
        transactions: mockTransactions
      });

      const { result } = renderHook(() => useKioskTransactions('session_123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockKioskService.getSessionTransactions).toHaveBeenCalledWith('session_123');
      expect(result.current.data?.transactions).toEqual(mockTransactions);
    });

    it('should create new transactions', async () => {
      const newTransaction = {
        sessionId: 'session_123',
        items: [
          {
            productId: 'product_002',
            productName: 'Fresh Lettuce',
            price: 3.99,
            quantity: 1,
            subtotal: 3.99
          }
        ],
        customerInfo: {
          email: 'customer@example.com',
          name: 'Jane Customer'
        },
        paymentMethod: 'cash' as const
      };

      const mockCreateResponse = {
        success: true,
        transaction: {
          id: 'trans_002',
          ...newTransaction,
          subtotal: 3.99,
          taxAmount: 0.32,
          totalAmount: 4.31,
          paymentStatus: 'completed' as const,
          completedAt: new Date()
        }
      };

      mockKioskService.createTransaction.mockResolvedValue(mockCreateResponse);

      const { result } = renderHook(() => useKioskTransactionOperations(), { wrapper });

      await act(async () => {
        const createResult = await result.current.createTransaction.mutateAsync(newTransaction);
        expect(createResult).toEqual(mockCreateResponse);
      });

      expect(mockKioskService.createTransaction).toHaveBeenCalledWith(newTransaction);
    });
  });

  describe('Race Condition Testing', () => {
    it('should handle concurrent authentication attempts', async () => {
      // Setup different responses for concurrent calls
      mockKioskService.authenticateStaff
        .mockResolvedValueOnce({
          success: true,
          sessionId: 'session_001',
          staffId: 'staff_001',
          staffName: 'Staff One'
        })
        .mockResolvedValueOnce({
          success: false,
          message: 'Session already active'
        });

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      // Fire two concurrent authentication attempts
      const [auth1, auth2] = await act(async () => {
        return Promise.all([
          result.current.mutateAsync('1234'),
          result.current.mutateAsync('1234')
        ]);
      });

      expect(auth1.success).toBe(true);
      expect(auth2.success).toBe(false);
      expect(mockKioskService.authenticateStaff).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent session updates', async () => {
      const customerInfo1 = { name: 'Customer One', email: 'one@example.com' };
      const customerInfo2 = { name: 'Customer Two', email: 'two@example.com' };

      mockKioskService.updateSessionCustomer
        .mockResolvedValueOnce({
          success: true,
          session: { id: 'session_123', currentCustomer: customerInfo1 } as any
        })
        .mockResolvedValueOnce({
          success: true,
          session: { id: 'session_123', currentCustomer: customerInfo2 } as any
        });

      const { result } = renderHook(() => useKioskSessionOperations(), { wrapper });

      // Fire concurrent customer updates
      const [update1, update2] = await act(async () => {
        return Promise.all([
          result.current.updateCustomer.mutateAsync({
            sessionId: 'session_123',
            customerInfo: customerInfo1
          }),
          result.current.updateCustomer.mutateAsync({
            sessionId: 'session_123',
            customerInfo: customerInfo2
          })
        ]);
      });

      expect(update1.success).toBe(true);
      expect(update2.success).toBe(true);
      expect(mockKioskService.updateSessionCustomer).toHaveBeenCalledTimes(2);
    });

    it('should maintain cache consistency during concurrent operations', async () => {
      // Setup mock responses
      mockKioskService.authenticateStaff.mockResolvedValue({
        success: true,
        sessionId: 'session_123',
        staffId: 'staff_456'
      });

      mockKioskService.getSession.mockResolvedValue({
        success: true,
        session: {
          id: 'session_123',
          staffId: 'staff_456',
          staffName: 'John Staff',
          sessionStart: new Date(),
          totalSales: 0,
          transactionCount: 0,
          isActive: true
        }
      });

      const authHook = renderHook(() => useKioskAuth(), { wrapper });
      const sessionHook = renderHook(() => useKioskSession('session_123'), { wrapper });

      // Perform concurrent operations
      await act(async () => {
        await Promise.all([
          authHook.result.current.mutateAsync('1234'),
          // Session hook should refetch due to invalidation
          new Promise(resolve => setTimeout(resolve, 50))
        ]);
      });

      // Verify both operations completed successfully
      expect(authHook.result.current.isSuccess).toBe(true);
      
      await waitFor(() => {
        expect(sessionHook.result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Error Recovery Testing', () => {
    it('should recover from network errors', async () => {
      mockKioskService.authenticateStaff
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          sessionId: 'session_123',
          staffId: 'staff_456'
        });

      const { result } = renderHook(() => useKioskAuth(), { wrapper });

      // First attempt fails
      await act(async () => {
        try {
          await result.current.mutateAsync('1234');
        } catch (error) {
          expect(error).toEqual(new Error('Network error'));
        }
      });

      expect(result.current.isError).toBe(true);

      // Reset mutation state
      result.current.reset();

      // Second attempt succeeds
      await act(async () => {
        const authResult = await result.current.mutateAsync('1234');
        expect(authResult.success).toBe(true);
      });

      expect(result.current.isSuccess).toBe(true);
    });
  });
});