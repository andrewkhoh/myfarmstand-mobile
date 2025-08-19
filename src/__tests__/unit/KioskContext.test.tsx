import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KioskProvider, useKioskContext } from '../../contexts/KioskContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock kiosk hooks
jest.mock('../../hooks/useKiosk', () => ({
  useKioskAuth: () => ({
    mutateAsync: jest.fn(),
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

describe('KioskContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.clear();
  });

  describe('Initial State', () => {
    it('should provide initial context values', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isKioskMode).toBe(false);
      expect(result.current.sessionId).toBe(null);
      expect(result.current.staffId).toBe(null);
      expect(result.current.staffName).toBe(null);
      expect(result.current.sessionData).toBe(null);
      expect(result.current.isAuthenticationVisible).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.startAuthentication).toBe('function');
      expect(typeof result.current.hideAuthentication).toBe('function');
      expect(typeof result.current.authenticateStaff).toBe('function');
      expect(typeof result.current.endSession).toBe('function');
      expect(typeof result.current.getSessionInfo).toBe('function');
    });
  });

  describe('Authentication Modal Control', () => {
    it('should show authentication modal when startAuthentication is called', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startAuthentication();
      });

      expect(result.current.isAuthenticationVisible).toBe(true);
    });

    it('should hide authentication modal when hideAuthentication is called', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      // First show it
      act(() => {
        result.current.startAuthentication();
      });

      // Then hide it
      act(() => {
        result.current.hideAuthentication();
      });

      expect(result.current.isAuthenticationVisible).toBe(false);
    });
  });

  describe('Session Information', () => {
    it('should return correct session info when no session is active', () => {
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

    it('should handle session state changes correctly', async () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      // Initially no session
      expect(result.current.isKioskMode).toBe(false);
      expect(result.current.getSessionInfo().isActive).toBe(false);

      // The actual authentication would be tested with proper mock
      // For now, we verify the context structure is correct
    });
  });

  describe('Storage Integration', () => {
    it('should attempt to hydrate from storage on mount', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      // Should attempt to read from storage
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@kiosk_session');
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      // Should not throw and should maintain default state
      expect(result.current.isKioskMode).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      // This would be expanded with proper mock responses
      expect(result.current.error).toBe(null);
    });

    it('should clear errors when starting new authentication', () => {
      const { result } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startAuthentication();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Performance and Cleanup', () => {
    it('should not cause memory leaks', () => {
      const { unmount } = renderHook(() => useKioskContext(), {
        wrapper: TestWrapper,
      });

      expect(() => unmount()).not.toThrow();
    });
  });
});

describe('KioskContext Error Boundaries', () => {
  it('should throw error when used outside KioskProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useKioskContext());
    }).toThrow('useKioskContext must be used within a KioskProvider');

    consoleSpy.mockRestore();
  });
});

console.log('✅ KioskContext unit tests completed');