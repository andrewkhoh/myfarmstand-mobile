import { SupabaseClient } from '@supabase/supabase-js';

interface MockChainMethods {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  contains: jest.Mock;
  containedBy: jest.Mock;
  range: jest.Mock;
  overlaps: jest.Mock;
  match: jest.Mock;
  not: jest.Mock;
  or: jest.Mock;
  filter: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  limit: jest.Mock;
  order: jest.Mock;
  throwOnError: jest.Mock;
}

export class SimplifiedSupabaseMock {
  public client: SupabaseClient;
  private chainMethods: MockChainMethods;
  private currentTable: string = '';

  constructor() {
    this.chainMethods = this.createChainMethods();
    this.client = this.createClient();
  }

  private createChainMethods(): MockChainMethods {
    const methods: MockChainMethods = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      throwOnError: jest.fn().mockReturnThis(),
    };

    // Make chainable methods return the chain object
    Object.keys(methods).forEach((key: string) => {
      if (key !== 'single' && key !== 'maybeSingle') {
        (methods as any)[key].mockImplementation(() => {
          return methods;
        });
      }
    });

    // Default resolved value for terminal methods
    methods.single.mockResolvedValue({ data: null, error: null });
    methods.maybeSingle.mockResolvedValue({ data: null, error: null });

    return methods;
  }

  private createClient(): SupabaseClient {
    const fromMethod = jest.fn((table: string) => {
      this.currentTable = table;
      return this.chainMethods;
    });

    const rpcMethod = jest.fn().mockResolvedValue({ data: null, error: null });

    const authMethod = {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    };

    const storageMethod = {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
      })),
    };

    return {
      from: fromMethod,
      rpc: rpcMethod,
      auth: authMethod,
      storage: storageMethod,
      channel: jest.fn(),
      removeChannel: jest.fn(),
      removeAllChannels: jest.fn(),
      getChannels: jest.fn().mockReturnValue([]),
    } as unknown as SupabaseClient;
  }

  from(table: string) {
    this.currentTable = table;
    return this.chainMethods;
  }

  // Helper methods for setting up mock responses
  mockSelectResponse(data: any, error: any = null) {
    this.chainMethods.select.mockReturnValue({
      ...this.chainMethods,
      single: jest.fn().mockResolvedValue({ data, error }),
      maybeSingle: jest.fn().mockResolvedValue({ data, error }),
      then: jest.fn().mockImplementation((callback) => {
        return Promise.resolve({ data, error }).then(callback);
      }),
    });
    return this;
  }

  mockInsertResponse(data: any, error: any = null) {
    this.chainMethods.insert.mockReturnValue({
      ...this.chainMethods,
      select: jest.fn().mockReturnValue({
        ...this.chainMethods,
        single: jest.fn().mockResolvedValue({ data, error }),
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve({ data, error }).then(callback);
        }),
      }),
      then: jest.fn().mockImplementation((callback) => {
        return Promise.resolve({ data, error }).then(callback);
      }),
    });
    return this;
  }

  mockUpdateResponse(data: any, error: any = null) {
    this.chainMethods.update.mockReturnValue({
      ...this.chainMethods,
      eq: jest.fn().mockReturnValue({
        ...this.chainMethods,
        select: jest.fn().mockReturnValue({
          ...this.chainMethods,
          single: jest.fn().mockResolvedValue({ data, error }),
          then: jest.fn().mockImplementation((callback) => {
            return Promise.resolve({ data, error }).then(callback);
          }),
        }),
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve({ data, error }).then(callback);
        }),
      }),
    });
    return this;
  }

  mockDeleteResponse(data: any, error: any = null) {
    this.chainMethods.delete.mockReturnValue({
      ...this.chainMethods,
      eq: jest.fn().mockReturnValue({
        ...this.chainMethods,
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve({ data, error }).then(callback);
        }),
      }),
    });
    return this;
  }

  // Reset all mocks
  reset() {
    Object.values(this.chainMethods).forEach((method) => {
      if (typeof method.mockClear === 'function') {
        method.mockClear();
      }
    });
    this.currentTable = '';
  }
}

// Backward compatibility - keep the old function for existing tests
export function createMockSupabaseClient(): any {
  const mockFrom = jest.fn();
  
  // Create chainable methods that can be overridden in tests
  const createChainableMethods = () => {
    const chain: any = {};
    
    // Define all chainable methods
    const methods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
      'like', 'ilike', 'in', 'contains', 'order',
      'limit', 'range', 'single', 'maybeSingle'
    ];
    
    // Create each method with proper mock functions
    methods.forEach(method => {
      chain[method] = jest.fn(() => chain);
    });
    
    // Override specific methods to handle resolved values
    chain.select.mockResolvedValue = jest.fn((value: any) => {
      chain.select.mockImplementation(() => {
        // Return a new chain that resolves to the value
        const newChain = { ...chain };
        Object.keys(newChain).forEach(key => {
          if (typeof newChain[key] === 'function' && key !== 'then') {
            const originalFn = newChain[key];
            newChain[key] = jest.fn((...args) => {
              const result = originalFn(...args);
              return result === chain ? newChain : result;
            });
          }
        });
        // Make the chain thenable
        newChain.then = (resolve: any) => Promise.resolve(value).then(resolve);
        return newChain;
      });
      return chain.select;
    });
    
    chain.single.mockResolvedValue = jest.fn((value: any) => {
      chain.single.mockImplementation(() => Promise.resolve(value));
      return chain.single;
    });
    
    chain.maybeSingle.mockResolvedValue = jest.fn((value: any) => {
      chain.maybeSingle.mockImplementation(() => Promise.resolve(value));
      return chain.maybeSingle;
    });
    
    chain.order.mockResolvedValue = jest.fn((value: any) => {
      chain.order.mockImplementation(() => {
        const newChain = { ...chain };
        newChain.then = (resolve: any) => Promise.resolve(value).then(resolve);
        return newChain;
      });
      return chain.order;
    });
    
    chain.range.mockResolvedValue = jest.fn((value: any) => {
      chain.range.mockImplementation(() => {
        const newChain = { ...chain };
        newChain.then = (resolve: any) => Promise.resolve(value).then(resolve);
        return newChain;
      });
      return chain.range;
    });
    
    chain.in.mockResolvedValue = jest.fn((value: any) => {
      chain.in.mockImplementation(() => {
        const newChain = { ...chain };
        newChain.then = (resolve: any) => Promise.resolve(value).then(resolve);
        return newChain;
      });
      return chain.in;
    });
    
    // Set default resolved value for single
    chain.single.mockResolvedValue({ data: null, error: null });
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    
    return chain;
  };

  // Default implementation - returns chainable methods
  mockFrom.mockImplementation(() => createChainableMethods());

  const mockClient: any = {
    from: mockFrom,
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn()
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn()
      })
    },
    realtime: {
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
      })
    },
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    })
  };

  return mockClient;
}