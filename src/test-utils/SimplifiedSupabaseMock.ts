export class SimplifiedSupabaseMock {
  private data: Record<string, any[]> = {};
  private error: any = null;
  private shouldFail = false;

  constructor() {
    this.reset();
  }

  reset() {
    this.data = {
      inventory_items: [],
      inventory_movements: [],
      audit_logs: []
    };
    this.error = null;
    this.shouldFail = false;
  }

  setData(table: string, data: any[]) {
    this.data[table] = data;
  }

  setShouldFail(shouldFail: boolean, error?: any) {
    this.shouldFail = shouldFail;
    this.error = error || new Error('Database error');
  }

  from(table: string) {
    const self = this;
    return {
      select: (columns?: string) => ({
        eq: (column: string, value: any) => self.executeQuery(table, { [column]: value }),
        neq: (column: string, value: any) => self.executeQuery(table, { [`!${column}`]: value }),
        gt: (column: string, value: any) => self.executeQuery(table, { [`>${column}`]: value }),
        gte: (column: string, value: any) => self.executeQuery(table, { [`>=${column}`]: value }),
        lt: (column: string, value: any) => self.executeQuery(table, { [`<${column}`]: value }),
        lte: (column: string, value: any) => self.executeQuery(table, { [`<=${column}`]: value }),
        order: (column: string, options?: { ascending: boolean }) => self.executeQuery(table),
        limit: (count: number) => self.executeQuery(table),
        single: () => self.executeQuery(table, {}, true),
        then: (resolve: Function) => resolve(self.executeQuery(table))
      }),
      insert: (data: any | any[]) => self.executeInsert(table, data),
      update: (data: any) => ({
        eq: (column: string, value: any) => self.executeUpdate(table, data, { [column]: value }),
        match: (filter: any) => self.executeUpdate(table, data, filter)
      }),
      delete: () => ({
        eq: (column: string, value: any) => self.executeDelete(table, { [column]: value }),
        match: (filter: any) => self.executeDelete(table, filter)
      }),
      upsert: (data: any | any[]) => self.executeUpsert(table, data)
    };
  }

  private executeQuery(table: string, filter?: any, single = false) {
    if (this.shouldFail) {
      return { data: null, error: this.error };
    }

    let result = this.data[table] || [];

    if (filter) {
      result = result.filter(item => {
        return Object.entries(filter).every(([key, value]) => {
          if (key.startsWith('!')) {
            return item[key.substring(1)] !== value;
          }
          if (key.startsWith('>')) {
            return item[key.substring(1)] > value;
          }
          if (key.startsWith('>=')) {
            return item[key.substring(2)] >= value;
          }
          if (key.startsWith('<')) {
            return item[key.substring(1)] < value;
          }
          if (key.startsWith('<=')) {
            return item[key.substring(2)] <= value;
          }
          return item[key] === value;
        });
      });
    }

    if (single) {
      return { data: result[0] || null, error: null };
    }

    return { data: result, error: null };
  }

  private executeInsert(table: string, data: any | any[]) {
    if (this.shouldFail) {
      return { data: null, error: this.error };
    }

    const dataArray = Array.isArray(data) ? data : [data];
    const insertedData = dataArray.map(item => ({
      ...item,
      id: item.id || `${table}-${Date.now()}-${Math.random()}`,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString()
    }));

    this.data[table] = [...(this.data[table] || []), ...insertedData];

    return { 
      data: Array.isArray(data) ? insertedData : insertedData[0], 
      error: null 
    };
  }

  private executeUpdate(table: string, updates: any, filter: any) {
    if (this.shouldFail) {
      return { data: null, error: this.error };
    }

    const tableData = this.data[table] || [];
    const updatedData: any[] = [];

    this.data[table] = tableData.map(item => {
      const matches = Object.entries(filter).every(([key, value]) => item[key] === value);
      if (matches) {
        const updated = { 
          ...item, 
          ...updates, 
          updated_at: new Date().toISOString() 
        };
        updatedData.push(updated);
        return updated;
      }
      return item;
    });

    return { data: updatedData, error: null };
  }

  private executeDelete(table: string, filter: any) {
    if (this.shouldFail) {
      return { data: null, error: this.error };
    }

    const deletedData: any[] = [];
    const tableData = this.data[table] || [];

    this.data[table] = tableData.filter(item => {
      const matches = Object.entries(filter).every(([key, value]) => item[key] === value);
      if (matches) {
        deletedData.push(item);
        return false;
      }
      return true;
    });

    return { data: deletedData, error: null };
  }

  private executeUpsert(table: string, data: any | any[]) {
    if (this.shouldFail) {
      return { data: null, error: this.error };
    }

    const dataArray = Array.isArray(data) ? data : [data];
    const tableData = this.data[table] || [];
    const upsertedData: any[] = [];

    dataArray.forEach(item => {
      const existingIndex = tableData.findIndex(existing => existing.id === item.id);
      
      if (existingIndex >= 0) {
        // Update existing
        const updated = {
          ...tableData[existingIndex],
          ...item,
          updated_at: new Date().toISOString()
        };
        tableData[existingIndex] = updated;
        upsertedData.push(updated);
      } else {
        // Insert new
        const inserted = {
          ...item,
          id: item.id || `${table}-${Date.now()}-${Math.random()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        tableData.push(inserted);
        upsertedData.push(inserted);
      }
    });

    this.data[table] = tableData;

    return { 
      data: Array.isArray(data) ? upsertedData : upsertedData[0], 
      error: null 
    };
  }

  // Real-time subscription mock
  channel(channelName: string) {
    return {
      on: (event: string, filter: any, callback: Function) => {
        // Mock subscription
        return {
          subscribe: () => {
            return {
              unsubscribe: jest.fn()
            };
          }
        };
      }
    };
  }

  // Auth mock
  auth = {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: { role: 'admin' }
        }
      },
      error: null
    }),
    signIn: jest.fn(),
    signOut: jest.fn()
  };

  // Storage mock
  storage = {
    from: (bucket: string) => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://example.com/file' } })
    })
  };
}