import { supabase } from '../config/supabase';

/**
 * Utility to introspect database schema at runtime
 * Useful for development and debugging
 */
export const schemaIntrospection = {
  /**
   * Get all table names in the public schema
   */
  async getTables() {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      console.error('Error fetching tables:', error);
      return [];
    }
    
    return data?.map(t => t.table_name) || [];
  },

  /**
   * Get columns for a specific table
   */
  async getTableColumns(tableName: string) {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');
    
    if (error) {
      console.error(`Error fetching columns for ${tableName}:`, error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Get all RPC functions
   */
  async getFunctions() {
    const { data, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .eq('routine_type', 'FUNCTION');
    
    if (error) {
      console.error('Error fetching functions:', error);
      return [];
    }
    
    return data?.map(f => f.routine_name) || [];
  },

  /**
   * Get full schema information
   */
  async getFullSchema() {
    const tables = await this.getTables();
    const schema: Record<string, any> = {};
    
    for (const table of tables) {
      schema[table] = await this.getTableColumns(table);
    }
    
    const functions = await this.getFunctions();
    
    return {
      tables: schema,
      functions,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Compare local types with actual database schema
   */
  async validateLocalTypes() {
    const actualSchema = await this.getFullSchema();
    // You can compare with your local Database interface here
    console.log('Database Schema:', actualSchema);
    return actualSchema;
  }
};

// Example usage:
// const schema = await schemaIntrospection.getFullSchema();
// console.log('Current database schema:', schema);