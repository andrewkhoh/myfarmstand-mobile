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

  constructor(options: MockOptions = {}) {
    this.options = {
      validateSchemas: true,
      simulateLatency: 0,
      errorRate: 0,
      ...options
    };
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
          
          // Add to mock data
          this.data[table] = [...(this.data[table] || []), ...insertData];
          
          return this.simulateOperation(() => ({
            data: insertData[0],
            error: null
          }));
        },
        
        then: async (resolve: Function) => {
          // Add to mock data
          this.data[table] = [...(this.data[table] || []), ...insertData];
          
          const result = await this.simulateOperation(() => insertData);
          resolve({
            data: result,
            error: null
          });
        }
      })
    };
  }

  private createUpdateChain(table: string, updates: any) {
    return {
      eq: (column: string, value: any) => ({
        select: (columns?: string) => ({
          single: async () => {
            const tableData = this.data[table] || [];
            const index = tableData.findIndex(item => item[column] === value);
            
            if (index >= 0) {
              tableData[index] = { ...tableData[index], ...updates };
              return this.simulateOperation(() => ({
                data: tableData[index],
                error: null
              }));
            }
            
            return {
              data: null,
              error: { message: 'No rows updated' }
            };
          }
        })
      })
    };
  }

  private createDeleteChain(table: string) {
    return {
      eq: (column: string, value: any) => ({
        then: async (resolve: Function) => {
          const tableData = this.data[table] || [];
          this.data[table] = tableData.filter(item => item[column] !== value);
          
          const result = await this.simulateOperation(() => null);
          resolve({
            data: result,
            error: null
          });
        }
      })
    };
  }

  private createUpsertChain(table: string, data: any | any[]) {
    // Simplified upsert - just insert for now
    return this.createInsertChain(table, data);
  }

  private createAuthMock() {
    return {
      getUser: jest.fn().mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user', 
            email: 'test@example.com' 
          } 
        },
        error: null
      }),
      
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { 
          session: { access_token: 'test-token' },
          user: { id: 'test-user', email: 'test@example.com' }
        },
        error: null
      }),
      
      signOut: jest.fn().mockResolvedValue({
        error: null
      })
    };
  }

  private createStorageMock() {
    return {
      from: (bucket: string) => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: `${bucket}/test-file.jpg` },
          error: null
        }),
        remove: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })
    };
  }

  private createChannelMock() {
    const channel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue('SUBSCRIBED'),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue({ success: true })
    };
    
    return jest.fn(() => channel);
  }

  private createRpcMock() {
    return jest.fn().mockResolvedValue({
      data: null,
      error: null
    });
  }
}

/**
 * Factory function for quick mock creation
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