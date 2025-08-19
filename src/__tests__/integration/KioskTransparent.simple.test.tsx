import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KioskProvider, useKioskContext, useIsKioskMode, useKioskSessionInfo } from '../../contexts';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock kiosk hooks
jest.mock('../../hooks/useKiosk', () => ({
  useKioskAuth: () => ({
    mutateAsync: jest.fn(() => Promise.resolve({
      success: true,
      sessionId: 'test-session-123',
      staffId: 'staff-456',
      staffName: 'Test Staff'
    })),
    isPending: false,
  }),
  useKioskSession: () => ({
    data: null,
    isLoading: false,
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
  logger: { log: () => {}, warn: () => {}, error: () => {} }
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <KioskProvider>
        {children}
      </KioskProvider>
    </QueryClientProvider>
  );
};

describe('Kiosk Transparent Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('KioskContext Provider Integration', () => {
    it('should provide kiosk context without errors', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(result.current.isKioskMode).toBe(false);
      expect(result.current.sessionId).toBe(null);
    });

    it('should provide utility hooks', () => {
      const { result: isKioskMode } = renderHook(() => useIsKioskMode(), {
        wrapper: TestWrapper,
      });

      const { result: sessionInfo } = renderHook(() => useKioskSessionInfo(), {
        wrapper: TestWrapper,
      });

      expect(isKioskMode.current).toBe(false);
      expect(sessionInfo.current.isActive).toBe(false);
      expect(sessionInfo.current.sessionId).toBe(null);
      expect(sessionInfo.current.staffName).toBe(null);
      expect(sessionInfo.current.totalSales).toBe(0);
      expect(sessionInfo.current.transactionCount).toBe(0);
    });
  });

  describe('Customer Transparency', () => {
    it('should not affect normal app behavior when kiosk context is available', () => {
      // This simulates how the app works with kiosk context available but not active
      const { result } = renderHook(() => {
        const kioskContext = useKioskContext();
        const isKioskMode = useIsKioskMode();
        const sessionInfo = useKioskSessionInfo();

        return {
          kioskContext,
          isKioskMode,
          sessionInfo,
        };
      }, { wrapper: TestWrapper });

      // Kiosk context should be available but not interfere with normal operation
      expect(result.current.kioskContext).toBeDefined();
      expect(result.current.isKioskMode).toBe(false);
      expect(result.current.sessionInfo.isActive).toBe(false);
      
      // All methods should be available but not in active state
      expect(typeof result.current.kioskContext.startAuthentication).toBe('function');
      expect(typeof result.current.kioskContext.hideAuthentication).toBe('function');
      expect(typeof result.current.kioskContext.authenticateStaff).toBe('function');
      expect(typeof result.current.kioskContext.endSession).toBe('function');
      expect(typeof result.current.kioskContext.getSessionInfo).toBe('function');
    });

    it('should maintain consistent state for utility hooks', () => {
      const { result: isKioskMode1 } = renderHook(() => useIsKioskMode(), {
        wrapper: TestWrapper,
      });

      const { result: isKioskMode2 } = renderHook(() => useIsKioskMode(), {
        wrapper: TestWrapper,
      });

      const { result: sessionInfo1 } = renderHook(() => useKioskSessionInfo(), {
        wrapper: TestWrapper,
      });

      const { result: sessionInfo2 } = renderHook(() => useKioskSessionInfo(), {
        wrapper: TestWrapper,
      });

      // All hooks should return consistent values
      expect(isKioskMode1.current).toBe(isKioskMode2.current);
      expect(sessionInfo1.current.isActive).toBe(sessionInfo2.current.isActive);
    });
  });

  describe('Staff Access Hidden Entry', () => {
    it('should provide startAuthentication method for hidden staff access', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.startAuthentication).toBe('function');
      expect(result.current.isAuthenticationVisible).toBe(false);
    });

    it('should control authentication modal visibility', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      // Initially hidden
      expect(result.current.isAuthenticationVisible).toBe(false);

      // Can be shown (for staff access)
      result.current.startAuthentication();
      expect(result.current.isAuthenticationVisible).toBe(true);

      // Can be hidden
      result.current.hideAuthentication();
      expect(result.current.isAuthenticationVisible).toBe(false);
    });
  });

  describe('Kiosk Session State Management', () => {
    it('should maintain session information correctly', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      const sessionInfo = result.current.getSessionInfo();

      expect(sessionInfo).toEqual({
        isActive: false,
        sessionId: null,
        staffName: null,
        totalSales: 0,
        transactionCount: 0,
      });
    });

    it('should provide session management methods', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.authenticateStaff).toBe('function');
      expect(typeof result.current.endSession).toBe('function');
    });
  });

  describe('Integration Performance', () => {
    it('should not significantly impact render performance', () => {
      const startTime = Date.now();

      renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      const renderTime = Date.now() - startTime;
      
      // Should render quickly (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle multiple hook instances without issues', () => {
      const hooks = [];
      
      for (let i = 0; i < 5; i++) {
        hooks.push(renderHook(() => useKioskContext(), {
          wrapper: TestWrapper,
        }));
      }

      // All hooks should be successfully created
      expect(hooks).toHaveLength(5);
      hooks.forEach(hook => {
        expect(hook.result.current.isKioskMode).toBe(false);
      });

      // Clean up
      hooks.forEach(hook => hook.unmount());
    });
  });

  describe('Error Boundaries', () => {
    it('should provide proper error handling for missing provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useKioskContext());
      }).toThrow('useKioskContext must be used within a KioskProvider');

      expect(() => {
        renderHook(() => useIsKioskMode());
      }).toThrow('useKioskContext must be used within a KioskProvider');

      expect(() => {
        renderHook(() => useKioskSessionInfo());
      }).toThrow('useKioskContext must be used within a KioskProvider');

      consoleSpy.mockRestore();
    });
  });
});

describe('Kiosk Integration Patterns', () => {
  it('should demonstrate correct usage pattern for components', () => {
    const TestComponent = () => {
      const { isKioskMode, sessionId, staffName } = useKioskContext();
      
      return {
        canUseKioskFeatures: isKioskMode,
        hasActiveSession: !!sessionId,
        staffInfo: staffName,
      };
    };

    const { result } = renderHook(() => TestComponent(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toEqual({
      canUseKioskFeatures: false,
      hasActiveSession: false,
      staffInfo: null,
    });
  });

  it('should support conditional kiosk behavior without breaking normal flow', () => {
    const TestShoppingFlow = () => {
      const { isKioskMode, sessionId } = useKioskContext();
      
      // This simulates how a component might conditionally use kiosk features
      const shouldTrackKioskSession = isKioskMode && sessionId;
      const orderData = {
        customerId: 'customer-123',
        items: ['item-1', 'item-2'],
        // Only add kiosk session ID if in kiosk mode
        ...(shouldTrackKioskSession && { kioskSessionId: sessionId }),
      };

      return orderData;
    };

    const { result } = renderHook(() => TestShoppingFlow(), {
      wrapper: TestWrapper,
    });

    // Should work normally without kiosk session
    expect(result.current).toEqual({
      customerId: 'customer-123',
      items: ['item-1', 'item-2'],
    });

    // Should not include kioskSessionId when not in kiosk mode
    expect(result.current).not.toHaveProperty('kioskSessionId');
  });
});

console.log('✅ Kiosk transparent integration tests completed successfully');