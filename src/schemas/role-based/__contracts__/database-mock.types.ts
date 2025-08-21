// Mock database types for role-based testing
// This will be replaced by actual database.generated.ts once user_roles table exists

export interface MockDatabase {
  public: {
    Tables: {
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_type: 'inventory_staff' | 'marketing_staff' | 'executive' | 'admin';
          permissions: string[] | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_type: 'inventory_staff' | 'marketing_staff' | 'executive' | 'admin';
          permissions?: string[] | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_type?: 'inventory_staff' | 'marketing_staff' | 'executive' | 'admin';
          permissions?: string[] | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
}