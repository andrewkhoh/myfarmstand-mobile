// Phase 3: Database Mock Types for Marketing Operations
// Following Phase 1 & 2 patterns for strict schema contract enforcement
// These interfaces must match the actual database structure exactly

export interface MockDatabase {
  public: {
    Tables: {
      product_content: {
        Row: {
          id: string;
          product_id: string;
          marketing_title: string | null;
          marketing_description: string | null;
          marketing_highlights: string[] | null;
          seo_keywords: string[] | null;
          featured_image_url: string | null;
          gallery_urls: string[] | null;
          content_status: 'draft' | 'review' | 'approved' | 'published';
          content_priority: number | null;
          last_updated_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          marketing_title?: string | null;
          marketing_description?: string | null;
          marketing_highlights?: string[] | null;
          seo_keywords?: string[] | null;
          featured_image_url?: string | null;
          gallery_urls?: string[] | null;
          content_status?: 'draft' | 'review' | 'approved' | 'published';
          content_priority?: number | null;
          last_updated_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          marketing_title?: string | null;
          marketing_description?: string | null;
          marketing_highlights?: string[] | null;
          seo_keywords?: string[] | null;
          featured_image_url?: string | null;
          gallery_urls?: string[] | null;
          content_status?: 'draft' | 'review' | 'approved' | 'published';
          content_priority?: number | null;
          last_updated_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      marketing_campaigns: {
        Row: {
          id: string;
          campaign_name: string;
          campaign_type: 'seasonal' | 'promotional' | 'new_product' | 'clearance';
          description: string | null;
          start_date: string;
          end_date: string;
          discount_percentage: number | null;
          target_audience: string | null;
          campaign_status: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_name: string;
          campaign_type: 'seasonal' | 'promotional' | 'new_product' | 'clearance';
          description?: string | null;
          start_date: string;
          end_date: string;
          discount_percentage?: number | null;
          target_audience?: string | null;
          campaign_status?: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          campaign_name?: string;
          campaign_type?: 'seasonal' | 'promotional' | 'new_product' | 'clearance';
          description?: string | null;
          start_date?: string;
          end_date?: string;
          discount_percentage?: number | null;
          target_audience?: string | null;
          campaign_status?: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      product_bundles: {
        Row: {
          id: string;
          bundle_name: string;
          bundle_description: string | null;
          bundle_price: number;
          bundle_discount_amount: number | null;
          is_active: boolean | null;
          is_featured: boolean | null;
          display_order: number | null;
          campaign_id: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          bundle_name: string;
          bundle_description?: string | null;
          bundle_price: number;
          bundle_discount_amount?: number | null;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          display_order?: number | null;
          campaign_id?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          bundle_name?: string;
          bundle_description?: string | null;
          bundle_price?: number;
          bundle_discount_amount?: number | null;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          display_order?: number | null;
          campaign_id?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      bundle_products: {
        Row: {
          id: string;
          bundle_id: string;
          product_id: string;
          quantity: number;
          display_order: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          bundle_id: string;
          product_id: string;
          quantity?: number;
          display_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          bundle_id?: string;
          product_id?: string;
          quantity?: number;
          display_order?: number | null;
          created_at?: string | null;
        };
      };
      campaign_metrics: {
        Row: {
          id: string;
          campaign_id: string;
          metric_date: string;
          metric_type: 'views' | 'clicks' | 'conversions' | 'revenue';
          metric_value: number;
          product_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          metric_date?: string;
          metric_type: 'views' | 'clicks' | 'conversions' | 'revenue';
          metric_value?: number;
          product_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          metric_date?: string;
          metric_type?: 'views' | 'clicks' | 'conversions' | 'revenue';
          metric_value?: number;
          product_id?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
}

// Export individual table types for easier testing
export type ProductContentRow = MockDatabase['public']['Tables']['product_content']['Row'];
export type ProductContentInsert = MockDatabase['public']['Tables']['product_content']['Insert'];
export type ProductContentUpdate = MockDatabase['public']['Tables']['product_content']['Update'];

export type MarketingCampaignRow = MockDatabase['public']['Tables']['marketing_campaigns']['Row'];
export type MarketingCampaignInsert = MockDatabase['public']['Tables']['marketing_campaigns']['Insert'];
export type MarketingCampaignUpdate = MockDatabase['public']['Tables']['marketing_campaigns']['Update'];

export type ProductBundleRow = MockDatabase['public']['Tables']['product_bundles']['Row'];
export type ProductBundleInsert = MockDatabase['public']['Tables']['product_bundles']['Insert'];
export type ProductBundleUpdate = MockDatabase['public']['Tables']['product_bundles']['Update'];

export type BundleProductRow = MockDatabase['public']['Tables']['bundle_products']['Row'];
export type BundleProductInsert = MockDatabase['public']['Tables']['bundle_products']['Insert'];
export type BundleProductUpdate = MockDatabase['public']['Tables']['bundle_products']['Update'];

export type CampaignMetricRow = MockDatabase['public']['Tables']['campaign_metrics']['Row'];
export type CampaignMetricInsert = MockDatabase['public']['Tables']['campaign_metrics']['Insert'];
export type CampaignMetricUpdate = MockDatabase['public']['Tables']['campaign_metrics']['Update'];

// Content workflow constants for validation
export const CONTENT_STATUS_OPTIONS = ['draft', 'review', 'approved', 'published'] as const;
export const CAMPAIGN_TYPE_OPTIONS = ['seasonal', 'promotional', 'new_product', 'clearance'] as const;
export const CAMPAIGN_STATUS_OPTIONS = ['planned', 'active', 'paused', 'completed', 'cancelled'] as const;
export const METRIC_TYPE_OPTIONS = ['views', 'clicks', 'conversions', 'revenue'] as const;

// Content workflow state machine validation
export const VALID_CONTENT_TRANSITIONS: Record<string, string[]> = {
  draft: ['review', 'published'], // Can skip to published for urgent content
  review: ['approved', 'draft'], // Can return to draft for revisions
  approved: ['published', 'review'], // Can return to review for final changes
  published: ['review'] // Can only go back to review for updates
};

// Campaign status transitions
export const VALID_CAMPAIGN_TRANSITIONS: Record<string, string[]> = {
  planned: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [] // Terminal state
};