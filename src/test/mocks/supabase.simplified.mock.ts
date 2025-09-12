/**
 * Simplified Supabase Mock
 * 
 * Replaces complex chain mocking with simple, data-driven mocks.
 * Test data is validated against schemas before being returned.
 */

import { z } from 'zod';

interface MockData {
  [table: string]: any[];
}

interface MockOptions {
  validateSchemas?: boolean;
  simulateLatency?: number;
  errorRate?: number;
}

export class SimplifiedSupabaseMock {
  private data: MockData = {};
  private schemas: Map<string, z.ZodSchema> = new Map();
  private options: MockOptions;
  private errorQueue: Error[] = [];
  private authState = {
    user: null as any,
    session: null as any
  };

  constructor(options: MockOptions = {}) {
    this.options = {
      validateSchemas: true,
      simulateLatency: 0,
      errorRate: 0,
      ...options
    };
  }
  
  /**
   * Generate a valid UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Set mock data for a table
   */
  setTableData(table: string, data: any[], schema?: z.ZodSchema): void {
    if (schema) {
      this.schemas.set(table, schema);
      
      // Validate all data if schemas enabled
      if (this.options.validateSchemas) {
        data.forEach(item => {
          const result = schema.safeParse(item);
          if (!result.success) {
            throw new Error(
              `Mock data validation failed for ${table}: ${result.error.message}`
            );
          }
        });
      }
    }
    
    this.data[table] = data;
  }

  /**
   * Queue an error to be thrown on the next operation
   */
  queueError(error: Error): void {
    this.errorQueue.push(error);
  }

  /**
   * Clear all mock data
   */
  clearAllData(): void {
    this.data = {};
  }

  /**
   * Get current data for a table
   */
  getTableData(table: string): any[] {
    return this.data[table] || [];
  }

  /**
   * Set auth state
   */
  setAuthState(user: any, session: any): void {
    this.authState.user = user;
    this.authState.session = session;
  }

  /**
   * Create the mock Supabase client
   */
  createClient() {
    const self = this;
    
    return {
      from: (table: string) => ({
        select: (columns?: string) => 
          self.createSelectChain(table, columns),
        
        insert: (data: any | any[]) => 
          self.createInsertChain(table, data),
        
        update: (data: any) => 
          self.createUpdateChain(table, data),
        
        delete: () => 
          self.createDeleteChain(table),
        
        upsert: (data: any | any[]) => 
          self.createUpsertChain(table, data)
      }),
      
      auth: this.createAuthMock(),
      storage: this.createStorageMock(),
      channel: this.createChannelMock(),
      rpc: this.createRpcMock()
    };
  }

  private async simulateOperation<T>(operation: () => T): Promise<T> {
    // Check for queued errors first
    if (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift()!;
      throw error;
    }
    
    // Simulate latency
    if (this.options.simulateLatency) {
      await new Promise(resolve => 
        setTimeout(resolve, this.options.simulateLatency)
      );
    }
    
    // Simulate random errors
    if (this.options.errorRate && Math.random() < this.options.errorRate) {
      throw new Error('Simulated database error');
    }
    
    return operation();
  }

  private createSelectChain(table: string, columns?: string) {
    const tableData = this.data[table] || [];
    let filteredData = [...tableData];
    
    const chain = {
      eq: (column: string, value: any) => {
        filteredData = filteredData.filter(item => item[column] === value);
        return chain;
      },
      
      neq: (column: string, value: any) => {
        filteredData = filteredData.filter(item => item[column] !== value);
        return chain;
      },
      
      in: (column: string, values: any[]) => {
        filteredData = filteredData.filter(item => 
          values.includes(item[column])
        );
        return chain;
      },
      
      gte: (column: string, value: any) => {
        filteredData = filteredData.filter(item => item[column] >= value);
        return chain;
      },
      
      lte: (column: string, value: any) => {
        filteredData = filteredData.filter(item => item[column] <= value);
        return chain;
      },
      
      gt: (column: string, value: any) => {
        filteredData = filteredData.filter(item => item[column] > value);
        return chain;
      },
      
      lt: (column: string, value: any) => {
        filteredData = filteredData.filter(item => item[column] < value);
        return chain;
      },
      
      like: (column: string, pattern: string) => {
        const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
        filteredData = filteredData.filter(item => 
          regex.test(String(item[column]))
        );
        return chain;
      },
      
      ilike: (column: string, pattern: string) => {
        const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
        filteredData = filteredData.filter(item => 
          regex.test(String(item[column]))
        );
        return chain;
      },
      
      is: (column: string, value: any) => {
        filteredData = filteredData.filter(item => {
          if (value === null) return item[column] === null;
          if (value === true) return item[column] === true;
          if (value === false) return item[column] === false;
          return item[column] === value;
        });
        return chain;
      },
      
      or: (filters: string) => {
        // Simplified OR filter - would need more complex parsing in production
        // For now, just return the chain unchanged
        return chain;
      },
      
      filter: (column: string, operator: string, value: any) => {
        switch (operator) {
          case 'eq':
            filteredData = filteredData.filter(item => item[column] === value);
            break;
          case 'neq':
            filteredData = filteredData.filter(item => item[column] !== value);
            break;
          case 'gt':
            filteredData = filteredData.filter(item => item[column] > value);
            break;
          case 'gte':
            filteredData = filteredData.filter(item => item[column] >= value);
            break;
          case 'lt':
            filteredData = filteredData.filter(item => item[column] < value);
            break;
          case 'lte':
            filteredData = filteredData.filter(item => item[column] <= value);
            break;
          case 'like':
          case 'ilike':
            const regex = new RegExp(value.replace(/%/g, '.*'), 'i');
            filteredData = filteredData.filter(item => regex.test(String(item[column])));
            break;
          case 'in':
            filteredData = filteredData.filter(item => value.includes(item[column]));
            break;
          case 'is':
            if (value === null) {
              filteredData = filteredData.filter(item => item[column] === null);
            } else {
              filteredData = filteredData.filter(item => item[column] === value);
            }
            break;
        }
        return chain;
      },
      
      range: (from: number, to: number) => {
        filteredData = filteredData.slice(from, to + 1);
        return chain;
      },
      
      order: (column: string, options?: { ascending?: boolean }) => {
        const ascending = options?.ascending !== false;
        filteredData.sort((a, b) => {
          const aVal = a[column];
          const bVal = b[column];
          const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return ascending ? result : -result;
        });
        return chain;
      },
      
      limit: (count: number) => {
        filteredData = filteredData.slice(0, count);
        return chain;
      },
      
      single: async () => {
        const result = await this.simulateOperation(() => filteredData[0]);
        return {
          data: result || null,
          error: result ? null : { message: 'No rows returned' }
        };
      },
      
      maybeSingle: async () => {
        const result = await this.simulateOperation(() => filteredData[0]);
        if (filteredData.length > 1) {
          return {
            data: null,
            error: { message: 'Multiple rows returned' }
          };
        }
        return {
          data: result || null,
          error: null
        };
      },
      
      then: async (resolve: Function) => {
        const result = await this.simulateOperation(() => filteredData);
        resolve({
          data: result,
          error: null
        });
      }
    };
    
    // Make chain thenable for async/await
    (chain as any).then = chain.then;
    
    return chain;
  }

  private createInsertChain(table: string, data: any | any[]) {
    const insertData = Array.isArray(data) ? data : [data];
    const schema = this.schemas.get(table);
    
    return {
      select: (columns?: string) => ({
        single: async () => {
          // Validate if schema exists
          if (schema && this.options.validateSchemas) {
            insertData.forEach(item => {
              const result = schema.safeParse(item);
              if (!result.success) {
                return {
                  data: null,
                  error: { message: `Validation failed: ${result.error}` }
                };
              }
            });
          }
          
          // Add IDs and timestamps to inserted data
          const enrichedData = insertData.map(item => ({
            id: this.generateUUID(),
            ...item,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString()
          }));
          
          // Add to mock data
          this.data[table] = [...(this.data[table] || []), ...enrichedData];
          
          return this.simulateOperation(() => ({
            data: enrichedData[0],
            error: null
          }));
        },
        
        then: async (resolve: Function) => {
          // Add IDs and timestamps to inserted data
          const enrichedData = insertData.map(item => ({
            id: this.generateUUID(),
            ...item,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString()
          }));
          
          // Add to mock data
          this.data[table] = [...(this.data[table] || []), ...enrichedData];
          
          const result = await this.simulateOperation(() => enrichedData);
          resolve({
            data: result,
            error: null
          });
        }
      })
    };
  }

  private createUpdateChain(table: string, updates: any) {
    const tableData = this.data[table] || [];
    let filteredIndices: number[] = tableData.map((_, i) => i);
    
    const chain = {
      eq: (column: string, value: any) => {
        filteredIndices = filteredIndices.filter(i => 
          tableData[i][column] === value
        );
        return chain;
      },
      
      neq: (column: string, value: any) => {
        filteredIndices = filteredIndices.filter(i => 
          tableData[i][column] !== value
        );
        return chain;
      },
      
      in: (column: string, values: any[]) => {
        filteredIndices = filteredIndices.filter(i => 
          values.includes(tableData[i][column])
        );
        return chain;
      },
      
      is: (column: string, value: any) => {
        filteredIndices = filteredIndices.filter(i => {
          const val = tableData[i][column];
          if (value === null) return val === null;
          if (value === true) return val === true;
          if (value === false) return val === false;
          return val === value;
        });
        return chain;
      },
      
      select: (columns?: string) => ({
        single: async () => {
          if (filteredIndices.length > 0) {
            const index = filteredIndices[0];
            tableData[index] = { 
              ...tableData[index], 
              ...updates,
              updated_at: new Date().toISOString()
            };
            
            // Validate if schema exists
            const schema = this.schemas.get(table);
            if (schema && this.options.validateSchemas) {
              const result = schema.safeParse(tableData[index]);
              if (!result.success) {
                return {
                  data: null,
                  error: { message: `Validation failed: ${result.error}` }
                };
              }
            }
            
            return this.simulateOperation(() => ({
              data: tableData[index],
              error: null
            }));
          }
          
          return {
            data: null,
            error: { message: 'No rows updated' }
          };
        },
        
        then: async (resolve: Function) => {
          const updatedRows: any[] = [];
          for (const index of filteredIndices) {
            tableData[index] = { 
              ...tableData[index], 
              ...updates,
              updated_at: new Date().toISOString()
            };
            updatedRows.push(tableData[index]);
          }
          
          const result = await this.simulateOperation(() => updatedRows);
          resolve({
            data: result,
            error: null
          });
        }
      }),
      
      then: async (resolve: Function) => {
        // Direct update without select
        for (const index of filteredIndices) {
          tableData[index] = { 
            ...tableData[index], 
            ...updates,
            updated_at: new Date().toISOString()
          };
        }
        
        const result = await this.simulateOperation(() => null);
        resolve({
          data: result,
          error: null
        });
      }
    };
    
    // Make chain thenable
    (chain as any).then = chain.then;
    
    return chain;
  }

  private createDeleteChain(table: string) {
    const tableData = this.data[table] || [];
    let filteredIndices: number[] = tableData.map((_, i) => i);
    
    const chain = {
      eq: (column: string, value: any) => {
        filteredIndices = filteredIndices.filter(i => 
          tableData[i][column] === value
        );
        return chain;
      },
      
      neq: (column: string, value: any) => {
        filteredIndices = filteredIndices.filter(i => 
          tableData[i][column] !== value
        );
        return chain;
      },
      
      in: (column: string, values: any[]) => {
        filteredIndices = filteredIndices.filter(i => 
          values.includes(tableData[i][column])
        );
        return chain;
      },
      
      select: (columns?: string) => ({
        then: async (resolve: Function) => {
          const deletedRows = filteredIndices.map(i => tableData[i]);
          
          // Remove items by filtering out the indices
          const indicesToDelete = new Set(filteredIndices);
          this.data[table] = tableData.filter((_, i) => !indicesToDelete.has(i));
          
          const result = await this.simulateOperation(() => deletedRows);
          resolve({
            data: result,
            error: null
          });
        }
      }),
      
      then: async (resolve: Function) => {
        // Remove items by filtering out the indices
        const indicesToDelete = new Set(filteredIndices);
        this.data[table] = tableData.filter((_, i) => !indicesToDelete.has(i));
        
        const result = await this.simulateOperation(() => null);
        resolve({
          data: result,
          error: null
        });
      }
    };
    
    // Make chain thenable
    (chain as any).then = chain.then;
    
    return chain;
  }

  private createUpsertChain(table: string, data: any | any[]) {
    const upsertData = Array.isArray(data) ? data : [data];
    const tableData = this.data[table] || [];
    const schema = this.schemas.get(table);
    
    return {
      select: (columns?: string) => ({
        single: async () => {
          // Validate if schema exists
          if (schema && this.options.validateSchemas) {
            for (const item of upsertData) {
              const result = schema.safeParse(item);
              if (!result.success) {
                return {
                  data: null,
                  error: { message: `Validation failed: ${result.error}` }
                };
              }
            }
          }
          
          // Perform upsert logic
          const resultData: any[] = [];
          for (const item of upsertData) {
            // Assume 'id' is the primary key for upsert matching
            const existingIndex = tableData.findIndex(row => row.id === item.id);
            
            if (existingIndex >= 0) {
              // Update existing
              tableData[existingIndex] = { 
                ...tableData[existingIndex], 
                ...item,
                updated_at: new Date().toISOString()
              };
              resultData.push(tableData[existingIndex]);
            } else {
              // Insert new
              const newItem = {
                ...item,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              tableData.push(newItem);
              resultData.push(newItem);
            }
          }
          
          this.data[table] = tableData;
          
          return this.simulateOperation(() => ({
            data: resultData[0],
            error: null
          }));
        },
        
        then: async (resolve: Function) => {
          // Perform upsert logic
          const resultData: any[] = [];
          for (const item of upsertData) {
            const existingIndex = tableData.findIndex(row => row.id === item.id);
            
            if (existingIndex >= 0) {
              tableData[existingIndex] = { 
                ...tableData[existingIndex], 
                ...item,
                updated_at: new Date().toISOString()
              };
              resultData.push(tableData[existingIndex]);
            } else {
              const newItem = {
                ...item,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              tableData.push(newItem);
              resultData.push(newItem);
            }
          }
          
          this.data[table] = tableData;
          
          const result = await this.simulateOperation(() => resultData);
          resolve({
            data: result,
            error: null
          });
        }
      }),
      
      then: async (resolve: Function) => {
        // Direct upsert without select
        for (const item of upsertData) {
          const existingIndex = tableData.findIndex(row => row.id === item.id);
          
          if (existingIndex >= 0) {
            tableData[existingIndex] = { 
              ...tableData[existingIndex], 
              ...item,
              updated_at: new Date().toISOString()
            };
          } else {
            tableData.push({
              ...item,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
        
        this.data[table] = tableData;
        
        const result = await this.simulateOperation(() => null);
        resolve({
          data: result,
          error: null
        });
      }
    };
  }

  private createAuthMock() {
    const self = this;
    
    return {
      getUser: jest.fn().mockImplementation(async () => {
        if (self.authState.user) {
          return {
            data: { user: self.authState.user },
            error: null
          };
        }
        return {
          data: { user: null },
          error: { message: 'No user logged in' }
        };
      }),
      
      getSession: jest.fn().mockImplementation(async () => {
        if (self.authState.session) {
          return {
            data: { session: self.authState.session },
            error: null
          };
        }
        return {
          data: { session: null },
          error: null
        };
      }),
      
      signInWithPassword: jest.fn().mockImplementation(async ({ email, password }) => {
        const user = { 
          id: `user-${Date.now()}`, 
          email,
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString()
        };
        const session = { 
          access_token: `token-${Date.now()}`,
          refresh_token: `refresh-${Date.now()}`,
          expires_at: Date.now() + 3600000,
          user
        };
        
        self.authState.user = user;
        self.authState.session = session;
        
        return {
          data: { session, user },
          error: null
        };
      }),
      
      signUp: jest.fn().mockImplementation(async ({ email, password, options }) => {
        const user = { 
          id: `user-${Date.now()}`, 
          email,
          app_metadata: {},
          user_metadata: options?.data || {},
          created_at: new Date().toISOString()
        };
        
        return {
          data: { 
            user,
            session: null 
          },
          error: null
        };
      }),
      
      signOut: jest.fn().mockImplementation(async () => {
        self.authState.user = null;
        self.authState.session = null;
        
        return { error: null };
      }),
      
      onAuthStateChange: jest.fn().mockImplementation((callback) => {
        // Return a subscription-like object
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        };
      })
    };
  }

  private createStorageMock() {
    const self = this;
    const storage: { [bucket: string]: { [path: string]: any } } = {};
    
    return {
      from: (bucket: string) => ({
        upload: jest.fn().mockImplementation(async (path: string, file: any, options?: any) => {
          if (!storage[bucket]) {
            storage[bucket] = {};
          }
          
          storage[bucket][path] = {
            file,
            metadata: options?.metadata || {},
            contentType: options?.contentType || 'application/octet-stream',
            uploadedAt: new Date().toISOString()
          };
          
          return self.simulateOperation(() => ({
            data: { 
              path: `${bucket}/${path}`,
              id: `file-${Date.now()}`,
              fullPath: `${bucket}/${path}`
            },
            error: null
          }));
        }),
        
        download: jest.fn().mockImplementation(async (path: string) => {
          if (storage[bucket]?.[path]) {
            return self.simulateOperation(() => ({
              data: storage[bucket][path].file,
              error: null
            }));
          }
          
          return {
            data: null,
            error: { message: 'File not found' }
          };
        }),
        
        remove: jest.fn().mockImplementation(async (paths: string[]) => {
          const removedPaths: string[] = [];
          
          for (const path of paths) {
            if (storage[bucket]?.[path]) {
              delete storage[bucket][path];
              removedPaths.push(path);
            }
          }
          
          return self.simulateOperation(() => ({
            data: removedPaths,
            error: null
          }));
        }),
        
        list: jest.fn().mockImplementation(async (path?: string, options?: any) => {
          const files: any[] = [];
          
          if (storage[bucket]) {
            for (const [filePath, fileData] of Object.entries(storage[bucket])) {
              if (!path || filePath.startsWith(path)) {
                files.push({
                  name: filePath.split('/').pop(),
                  id: `file-${filePath}`,
                  updated_at: fileData.uploadedAt,
                  created_at: fileData.uploadedAt,
                  metadata: fileData.metadata
                });
              }
            }
          }
          
          return self.simulateOperation(() => ({
            data: files,
            error: null
          }));
        }),
        
        getPublicUrl: (path: string) => ({
          data: {
            publicUrl: `https://test-storage.supabase.co/storage/v1/object/public/${bucket}/${path}`
          }
        })
      })
    };
  }

  private createChannelMock() {
    const channels: Map<string, any> = new Map();
    
    return jest.fn((channelName: string) => {
      if (!channels.has(channelName)) {
        const listeners: Map<string, Function[]> = new Map();
        let isSubscribed = false;
        
        const channel = {
          on: jest.fn().mockImplementation((event: string, filter: any, callback?: Function) => {
            // Handle both (event, callback) and (event, filter, callback) signatures
            const cb = typeof filter === 'function' ? filter : callback;
            
            if (!listeners.has(event)) {
              listeners.set(event, []);
            }
            listeners.get(event)!.push(cb);
            
            return channel;
          }),
          
          subscribe: jest.fn().mockImplementation(async (callback?: Function) => {
            isSubscribed = true;
            if (callback) {
              callback('SUBSCRIBED');
            }
            return 'SUBSCRIBED';
          }),
          
          unsubscribe: jest.fn().mockImplementation(async () => {
            isSubscribed = false;
            listeners.clear();
            channels.delete(channelName);
            return undefined;
          }),
          
          send: jest.fn().mockImplementation(async (payload: any) => {
            if (!isSubscribed) {
              return { success: false, error: 'Channel not subscribed' };
            }
            
            // Trigger any presence listeners
            const presenceListeners = listeners.get('presence') || [];
            for (const listener of presenceListeners) {
              listener({ event: 'sync', payload });
            }
            
            return { success: true };
          }),
          
          track: jest.fn().mockImplementation(async (payload: any) => {
            if (!isSubscribed) {
              return { success: false, error: 'Channel not subscribed' };
            }
            
            // Trigger presence sync
            const presenceListeners = listeners.get('presence') || [];
            for (const listener of presenceListeners) {
              listener({ event: 'sync', payload });
            }
            
            return { success: true };
          }),
          
          // Helper method to trigger events in tests
          _trigger: (event: string, payload: any) => {
            const eventListeners = listeners.get(event) || [];
            for (const listener of eventListeners) {
              listener(payload);
            }
          }
        };
        
        channels.set(channelName, channel);
      }
      
      return channels.get(channelName);
    });
  }

  private createRpcMock() {
    const self = this;
    const rpcHandlers: Map<string, Function> = new Map();
    
    // Add some default RPC handlers
    rpcHandlers.set('get_user_stats', async (params: any) => ({
      total_orders: 0,
      total_spent: 0,
      ...params
    }));
    
    return jest.fn().mockImplementation(async (functionName: string, params?: any) => {
      try {
        // Check if there's a custom handler
        if (rpcHandlers.has(functionName)) {
          const handler = rpcHandlers.get(functionName)!;
          const data = await handler(params);
          
          return self.simulateOperation(() => ({
            data,
            error: null
          }));
        }
        
        // Default response for unknown functions
        return self.simulateOperation(() => ({
          data: null,
          error: null
        }));
      } catch (error: any) {
        return {
          data: null,
          error: { message: error.message || 'RPC function error' }
        };
      }
    });
  }
  
  /**
   * Register a custom RPC handler for testing
   */
  registerRpcHandler(functionName: string, handler: Function): void {
    // This would need to be exposed somehow, or we could make rpcHandlers a class property
    // For now, this is just a placeholder showing the pattern
  }
}

/**
 * Factory function for quick mock creation
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const supabase = createSupabaseMock({
 *   products: [
 *     { id: '1', name: 'Apple', price: 1.99 },
 *     { id: '2', name: 'Banana', price: 0.99 }
 *   ],
 *   users: [
 *     { id: 'user-1', email: 'test@example.com' }
 *   ]
 * });
 * 
 * // With options
 * const supabase = createSupabaseMock(
 *   { products: [] },
 *   { 
 *     simulateLatency: 100,
 *     errorRate: 0.1,
 *     validateSchemas: true 
 *   }
 * );
 * 
 * // Advanced usage with schema validation
 * const mock = new SimplifiedSupabaseMock();
 * mock.setTableData('products', products, ProductSchema);
 * const supabase = mock.createClient();
 * ```
 */
export const createSupabaseMock = (
  initialData: MockData = {},
  options?: MockOptions
) => {
  const mock = new SimplifiedSupabaseMock(options);
  
  Object.entries(initialData).forEach(([table, data]) => {
    mock.setTableData(table, data);
  });
  
  return mock.createClient();
};

/**
 * Export the class for advanced usage
 */
export { SimplifiedSupabaseMock as SupabaseMock };