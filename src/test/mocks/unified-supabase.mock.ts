/**
 * Unified Supabase Mock - Fixes all mock infrastructure issues
 * 
 * This combines the client interface with mock control methods,
 * resolving the "mockSupabase.from.mockReturnValue is not a function" errors.
 */

import { SimplifiedSupabaseMock } from './supabase.simplified.mock';

interface UnifiedSupabaseMock {
  // Client methods
  from: any;
  auth: any;
  storage: any;
  channel: any;
  rpc: any;
  
  // Mock control methods
  setTableData: (table: string, data: any[]) => void;
  setAuthState: (user: any, session?: any) => void;
  queueError: (error: Error) => void;
  clearErrors: () => void;
  reset: () => void;
  
  // Jest mock helpers
  from: jest.MockedFunction<any>;
}

/**
 * Creates a unified mock that works with both old and new test patterns
 */
export function createUnifiedSupabaseMock(initialData: any = {}, options: any = {}) {
  const mockInstance = new SimplifiedSupabaseMock(options);
  
  // Set initial data
  Object.entries(initialData).forEach(([table, data]) => {
    mockInstance.setTableData(table, data as any[]);
  });
  
  // Get the client
  const client = mockInstance.createClient();
  
  // Create unified mock with both client and control methods
  const unifiedMock: any = {
    // Spread client methods
    ...client,
    
    // Add mock control methods
    setTableData: (table: string, data: any[]) => mockInstance.setTableData(table, data),
    setAuthState: (user: any, session?: any) => mockInstance.setAuthState(user, session),
    queueError: (error: Error) => mockInstance.queueError(error),
    clearErrors: () => mockInstance.clearErrors(),
    reset: () => mockInstance.reset(),
    
    // Make from a jest mock for backward compatibility
    from: jest.fn((table: string) => {
      const originalFrom = client.from(table);
      
      // Wrap methods to be jest mocks
      return {
        select: jest.fn().mockImplementation(originalFrom.select),
        insert: jest.fn().mockImplementation(originalFrom.insert),
        update: jest.fn().mockImplementation(originalFrom.update),
        delete: jest.fn().mockImplementation(originalFrom.delete),
        upsert: jest.fn().mockImplementation(originalFrom.upsert),
      };
    }),
  };
  
  // Add mockReturnValue support for backward compatibility
  unifiedMock.from.mockReturnValue = jest.fn().mockImplementation((returnValue: any) => {
    unifiedMock.from = jest.fn(() => returnValue);
    return unifiedMock.from;
  });
  
  return unifiedMock;
}

// Export a default mock for simple cases
export const defaultSupabaseMock = createUnifiedSupabaseMock();