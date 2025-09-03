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
    chain.select.mockResolvedValue = jest.fn((value) => {
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
    
    chain.single.mockResolvedValue = jest.fn((value) => {
      chain.single.mockImplementation(() => Promise.resolve(value));
      return chain.single;
    });
    
    chain.maybeSingle.mockResolvedValue = jest.fn((value) => {
      chain.maybeSingle.mockImplementation(() => Promise.resolve(value));
      return chain.maybeSingle;
    });
    
    chain.order.mockResolvedValue = jest.fn((value) => {
      chain.order.mockImplementation(() => {
        const newChain = { ...chain };
        newChain.then = (resolve: any) => Promise.resolve(value).then(resolve);
        return newChain;
      });
      return chain.order;
    });
    
    chain.range.mockResolvedValue = jest.fn((value) => {
      chain.range.mockImplementation(() => {
        const newChain = { ...chain };
        newChain.then = (resolve: any) => Promise.resolve(value).then(resolve);
        return newChain;
      });
      return chain.range;
    });
    
    chain.in.mockResolvedValue = jest.fn((value) => {
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