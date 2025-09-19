export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      alert_rules: {
        Row: {
          condition_type: string
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          last_triggered_at: string | null
          metric_name: string
          notification_channels: string[] | null
          rule_name: string
          rule_type: string
          severity: string | null
          threshold_unit: string | null
          threshold_value: number | null
          trigger_count: number | null
          updated_at: string | null
        }
        Insert: {
          condition_type: string
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          metric_name: string
          notification_channels?: string[] | null
          rule_name: string
          rule_type: string
          severity?: string | null
          threshold_unit?: string | null
          threshold_value?: number | null
          trigger_count?: number | null
          updated_at?: string | null
        }
        Update: {
          condition_type?: string
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          metric_name?: string
          notification_channels?: string[] | null
          rule_name?: string
          rule_type?: string
          severity?: string | null
          threshold_unit?: string | null
          threshold_value?: number | null
          trigger_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string | null
          id: string
          product_id: string | null
          quantity: number | null
        }
        Insert: {
          bundle_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
        }
        Update: {
          bundle_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_products: {
        Row: {
          bundle_id: string
          created_at: string | null
          display_order: number | null
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_products_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          id: string
          impact_score: string | null
          insight_data: Json
          insight_date_range: unknown
          insight_description: string | null
          insight_title: string
          insight_type: string
          is_active: boolean | null
          recommendations: Json | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          impact_score?: string | null
          insight_data: Json
          insight_date_range: unknown
          insight_description?: string | null
          insight_title: string
          insight_type: string
          is_active?: boolean | null
          recommendations?: Json | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          impact_score?: string | null
          insight_data?: Json
          insight_date_range?: unknown
          insight_description?: string | null
          insight_title?: string
          insight_type?: string
          is_active?: boolean | null
          recommendations?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      business_metrics: {
        Row: {
          aggregation_level: string | null
          correlation_factors: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          metric_category: string
          metric_date: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          source_data_type: string | null
          updated_at: string | null
        }
        Insert: {
          aggregation_level?: string | null
          correlation_factors?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metric_category: string
          metric_date: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          source_data_type?: string | null
          updated_at?: string | null
        }
        Update: {
          aggregation_level?: string | null
          correlation_factors?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metric_category?: string
          metric_date?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          source_data_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_metrics: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          metric_date: string
          metric_type: string
          metric_value: number
          product_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          metric_date?: string
          metric_type: string
          metric_value?: number
          product_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          metric_date?: string
          metric_type?: string
          metric_value?: number
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cross_role_analytics: {
        Row: {
          analysis_data: Json
          analysis_type: string
          correlation_strength: number | null
          created_at: string | null
          created_by: string | null
          date_range: unknown
          id: string
          insights: Json | null
          source_role: string
          target_role: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_data: Json
          analysis_type: string
          correlation_strength?: number | null
          created_at?: string | null
          created_by?: string | null
          date_range: unknown
          id?: string
          insights?: Json | null
          source_role: string
          target_role?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_data?: Json
          analysis_type?: string
          correlation_strength?: number | null
          created_at?: string | null
          created_by?: string | null
          date_range?: unknown
          id?: string
          insights?: Json | null
          source_role?: string
          target_role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_analytics: {
        Row: {
          average_order_value: number | null
          calculated_at: string | null
          favorite_category: string | null
          id: string
          last_order_date: string | null
          total_orders: number | null
          total_spent: number | null
          user_id: string | null
        }
        Insert: {
          average_order_value?: number | null
          calculated_at?: string | null
          favorite_category?: string | null
          id?: string
          last_order_date?: string | null
          total_orders?: number | null
          total_spent?: number | null
          user_id?: string | null
        }
        Update: {
          average_order_value?: number | null
          calculated_at?: string | null
          favorite_category?: string | null
          id?: string
          last_order_date?: string | null
          total_orders?: number | null
          total_spent?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      error_recovery_log: {
        Row: {
          attempts_made: number | null
          compensation_applied: boolean | null
          completed_at: string | null
          created_at: string | null
          error_type: string
          id: string
          metadata: Json | null
          operation: string
          order_id: string | null
          original_error: string | null
          recovery_strategy: string
          result_message: string | null
          retry_count: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          attempts_made?: number | null
          compensation_applied?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          operation?: string
          order_id?: string | null
          original_error?: string | null
          recovery_strategy: string
          result_message?: string | null
          retry_count?: number | null
          status?: string
          user_id?: string | null
        }
        Update: {
          attempts_made?: number | null
          compensation_applied?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          operation?: string
          order_id?: string | null
          original_error?: string | null
          recovery_strategy?: string
          result_message?: string | null
          retry_count?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_recovery_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_recovery_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          current_value: number | null
          id: string
          inventory_item_id: string
          item_name: string | null
          message: string
          severity: string
          threshold_value: number | null
          user_id: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          current_value?: number | null
          id?: string
          inventory_item_id: string
          item_name?: string | null
          message: string
          severity: string
          threshold_value?: number | null
          user_id?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          current_value?: number | null
          id?: string
          inventory_item_id?: string
          item_name?: string | null
          message?: string
          severity?: string
          threshold_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          last_counted_at: string | null
          last_restocked_at: string | null
          maximum_stock: number
          minimum_stock: number
          product_id: string
          reorder_point: number
          reorder_quantity: number
          reserved_stock: number
          unit_cost: number
          updated_at: string
          user_id: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          last_counted_at?: string | null
          last_restocked_at?: string | null
          maximum_stock?: number
          minimum_stock?: number
          product_id: string
          reorder_point?: number
          reorder_quantity?: number
          reserved_stock?: number
          unit_cost?: number
          updated_at?: string
          user_id?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          last_counted_at?: string | null
          last_restocked_at?: string | null
          maximum_stock?: number
          minimum_stock?: number
          product_id?: string
          reorder_point?: number
          reorder_quantity?: number
          reserved_stock?: number
          unit_cost?: number
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_quantity: number
          previous_quantity: number
          product_id: string
          quantity_change: number
          reason: string | null
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_quantity: number
          previous_quantity: number
          product_id: string
          quantity_change: number
          reason?: string | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_quantity?: number
          previous_quantity?: number
          product_id?: string
          quantity_change?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string | null
          product_id: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string | null
          product_id?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string | null
          product_id?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_sessions: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          session_id: string
          staff_name: string
          staff_user_id: string | null
          start_time: string | null
          total_sales: number | null
          transaction_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          session_id: string
          staff_name: string
          staff_user_id?: string | null
          start_time?: string | null
          total_sales?: number | null
          transaction_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          session_id?: string
          staff_name?: string
          staff_user_id?: string | null
          start_time?: string | null
          total_sales?: number | null
          transaction_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kiosk_transaction_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "kiosk_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_transactions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          payment_method: string
          payment_status: string
          session_id: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          payment_method: string
          payment_status?: string
          session_id: string
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          payment_method?: string
          payment_status?: string
          session_id?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          campaign_name: string
          campaign_status: string
          campaign_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_percentage: number | null
          end_date: string
          id: string
          start_date: string
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_name: string
          campaign_status?: string
          campaign_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_percentage?: number | null
          end_date: string
          id?: string
          start_date: string
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_name?: string
          campaign_status?: string
          campaign_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_percentage?: number | null
          end_date?: string
          id?: string
          start_date?: string
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      no_show_log: {
        Row: {
          cancellation_reason: string | null
          detected_at: string | null
          grace_period_minutes: number | null
          id: string
          metadata: Json | null
          notification_sent: boolean | null
          order_id: string
          original_pickup_date: string
          original_pickup_time: string
          processed_at: string | null
          processing_status: string
          stock_restoration_applied: boolean | null
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          detected_at?: string | null
          grace_period_minutes?: number | null
          id?: string
          metadata?: Json | null
          notification_sent?: boolean | null
          order_id: string
          original_pickup_date: string
          original_pickup_time: string
          processed_at?: string | null
          processing_status?: string
          stock_restoration_applied?: boolean | null
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          detected_at?: string | null
          grace_period_minutes?: number | null
          id?: string
          metadata?: Json | null
          notification_sent?: boolean | null
          order_id?: string
          original_pickup_date?: string
          original_pickup_time?: string
          processed_at?: string | null
          processing_status?: string
          stock_restoration_applied?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_show_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_show_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_method: string
          error_message: string | null
          id: string
          message_content: string | null
          metadata: Json | null
          notification_type: string
          order_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_method?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          notification_type: string
          order_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_method?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          notification_type?: string
          order_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channels_attempted: string[]
          channels_failed: string[]
          channels_sent: string[]
          created_at: string
          customer_email: string
          id: string
          notification_type: string
          order_id: string | null
          template_body: string
          template_title: string
          updated_at: string
        }
        Insert: {
          channels_attempted?: string[]
          channels_failed?: string[]
          channels_sent?: string[]
          created_at?: string
          customer_email: string
          id?: string
          notification_type: string
          order_id?: string | null
          template_body: string
          template_title: string
          updated_at?: string
        }
        Update: {
          channels_attempted?: string[]
          channels_failed?: string[]
          channels_sent?: string[]
          created_at?: string
          customer_email?: string
          id?: string
          notification_type?: string
          order_id?: string | null
          template_body?: string
          template_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          fulfillment_type: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          pickup_date: string | null
          pickup_time: string | null
          qr_code_data: string | null
          special_instructions: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          fulfillment_type?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_date?: string | null
          pickup_time?: string | null
          qr_code_data?: string | null
          special_instructions?: string | null
          status?: string
          subtotal: number
          tax_amount?: number
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          fulfillment_type?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_date?: string | null
          pickup_time?: string | null
          qr_code_data?: string | null
          special_instructions?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_reschedule_log: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          new_pickup_date: string
          new_pickup_time: string
          order_id: string
          original_pickup_date: string | null
          original_pickup_time: string | null
          reason: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          new_pickup_date: string
          new_pickup_time: string
          order_id: string
          original_pickup_date?: string | null
          original_pickup_time?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          new_pickup_date?: string
          new_pickup_time?: string
          order_id?: string
          original_pickup_date?: string | null
          original_pickup_time?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_reschedule_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_reschedule_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_forecasts: {
        Row: {
          confidence_intervals: Json | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          forecast_period: unknown
          forecast_target: string
          forecast_type: string
          forecast_values: Json
          generated_at: string | null
          id: string
          input_features: string[] | null
          is_active: boolean | null
          model_accuracy: number | null
          model_parameters: Json | null
          model_type: string
          updated_at: string | null
        }
        Insert: {
          confidence_intervals?: Json | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          forecast_period: unknown
          forecast_target: string
          forecast_type: string
          forecast_values: Json
          generated_at?: string | null
          id?: string
          input_features?: string[] | null
          is_active?: boolean | null
          model_accuracy?: number | null
          model_parameters?: Json | null
          model_type: string
          updated_at?: string | null
        }
        Update: {
          confidence_intervals?: Json | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          forecast_period?: unknown
          forecast_target?: string
          forecast_type?: string
          forecast_values?: Json
          generated_at?: string | null
          id?: string
          input_features?: string[] | null
          is_active?: boolean | null
          model_accuracy?: number | null
          model_parameters?: Json | null
          model_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_bundles: {
        Row: {
          bundle_description: string | null
          bundle_discount_amount: number | null
          bundle_name: string
          bundle_price: number
          campaign_id: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          updated_at: string | null
        }
        Insert: {
          bundle_description?: string | null
          bundle_discount_amount?: number | null
          bundle_name: string
          bundle_price: number
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          updated_at?: string | null
        }
        Update: {
          bundle_description?: string | null
          bundle_discount_amount?: number | null
          bundle_name?: string
          bundle_price?: number
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_bundles_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      product_content: {
        Row: {
          content_priority: number | null
          content_status: string
          created_at: string | null
          featured_image_url: string | null
          gallery_urls: string[] | null
          id: string
          last_updated_by: string | null
          marketing_description: string | null
          marketing_highlights: string[] | null
          marketing_title: string | null
          product_id: string
          seo_keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          content_priority?: number | null
          content_status?: string
          created_at?: string | null
          featured_image_url?: string | null
          gallery_urls?: string[] | null
          id?: string
          last_updated_by?: string | null
          marketing_description?: string | null
          marketing_highlights?: string[] | null
          marketing_title?: string | null
          product_id: string
          seo_keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          content_priority?: number | null
          content_status?: string
          created_at?: string | null
          featured_image_url?: string | null
          gallery_urls?: string[] | null
          id?: string
          last_updated_by?: string | null
          marketing_description?: string | null
          marketing_highlights?: string[] | null
          marketing_title?: string | null
          product_id?: string
          seo_keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          category_id: string
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          is_available: boolean | null
          is_bundle: boolean | null
          is_pre_order: boolean | null
          is_weekly_special: boolean | null
          max_pre_order_quantity: number | null
          min_pre_order_quantity: number | null
          name: string
          nutrition_info: Json | null
          pre_order_available_date: string | null
          price: number
          seasonal_availability: boolean | null
          sku: string | null
          stock_quantity: number | null
          tags: string[] | null
          unit: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category: string
          category_id: string
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_bundle?: boolean | null
          is_pre_order?: boolean | null
          is_weekly_special?: boolean | null
          max_pre_order_quantity?: number | null
          min_pre_order_quantity?: number | null
          name: string
          nutrition_info?: Json | null
          pre_order_available_date?: string | null
          price: number
          seasonal_availability?: boolean | null
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          unit?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category?: string
          category_id?: string
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_bundle?: boolean | null
          is_pre_order?: boolean | null
          is_weekly_special?: boolean | null
          max_pre_order_quantity?: number | null
          min_pre_order_quantity?: number | null
          name?: string
          nutrition_info?: Json | null
          pre_order_available_date?: string | null
          price?: number
          seasonal_availability?: boolean | null
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          unit?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_pins: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          last_used: string | null
          pin: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          last_used?: string | null
          pin: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          last_used?: string | null
          pin?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          movement_type: string
          performed_by: string | null
          quantity: number
          reason: string | null
          stock_after: number | null
          stock_before: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          movement_type: string
          performed_by?: string | null
          quantity: number
          reason?: string | null
          stock_after?: number | null
          stock_before?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          movement_type?: string
          performed_by?: string | null
          quantity?: number
          reason?: string | null
          stock_after?: number | null
          stock_before?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_reports: {
        Row: {
          alerts: Json | null
          created_at: string | null
          created_by: string | null
          download_url: string | null
          frequency: string | null
          generated_at: string | null
          generation_time: number | null
          id: string
          key_findings: Json | null
          next_scheduled_at: string | null
          priority: string | null
          report_data: Json
          report_status: string | null
          report_summary: string | null
          report_title: string
          report_type: string
          sections: Json | null
          updated_at: string | null
        }
        Insert: {
          alerts?: Json | null
          created_at?: string | null
          created_by?: string | null
          download_url?: string | null
          frequency?: string | null
          generated_at?: string | null
          generation_time?: number | null
          id?: string
          key_findings?: Json | null
          next_scheduled_at?: string | null
          priority?: string | null
          report_data: Json
          report_status?: string | null
          report_summary?: string | null
          report_title: string
          report_type: string
          sections?: Json | null
          updated_at?: string | null
        }
        Update: {
          alerts?: Json | null
          created_at?: string | null
          created_by?: string | null
          download_url?: string | null
          frequency?: string | null
          generated_at?: string | null
          generation_time?: number | null
          id?: string
          key_findings?: Json | null
          next_scheduled_at?: string | null
          priority?: string | null
          report_data?: Json
          report_status?: string | null
          report_summary?: string | null
          report_title?: string
          report_type?: string
          sections?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_inventory_items: {
        Row: {
          available_stock: number
          created_at: string | null
          current_stock: number
          id: string
          is_active: boolean | null
          is_visible_to_customers: boolean | null
          last_stock_update: string | null
          maximum_threshold: number | null
          minimum_threshold: number | null
          product_id: string
          reserved_stock: number
          updated_at: string | null
        }
        Insert: {
          available_stock?: number
          created_at?: string | null
          current_stock?: number
          id?: string
          is_active?: boolean | null
          is_visible_to_customers?: boolean | null
          last_stock_update?: string | null
          maximum_threshold?: number | null
          minimum_threshold?: number | null
          product_id: string
          reserved_stock?: number
          updated_at?: string | null
        }
        Update: {
          available_stock?: number
          created_at?: string | null
          current_stock?: number
          id?: string
          is_active?: boolean | null
          is_visible_to_customers?: boolean | null
          last_stock_update?: string | null
          maximum_threshold?: number | null
          minimum_threshold?: number | null
          product_id?: string
          reserved_stock?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      test_stock_movements: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          inventory_item_id: string
          movement_type: string
          new_stock: number
          performed_at: string | null
          performed_by: string | null
          previous_stock: number
          quantity_change: number
          reason: string | null
          reference_order_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          inventory_item_id: string
          movement_type: string
          new_stock: number
          performed_at?: string | null
          performed_by?: string | null
          previous_stock: number
          quantity_change: number
          reason?: string | null
          reference_order_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          movement_type?: string
          new_stock?: number
          performed_at?: string | null
          performed_by?: string | null
          previous_stock?: number
          quantity_change?: number
          reason?: string | null
          reference_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "test_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      test_user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          permissions: string[] | null
          role_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: string[] | null
          role_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: string[] | null
          role_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission: string
          user_id: string | null
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission: string
          user_id?: string | null
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      order_summary: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          id: string | null
          item_count: number | null
          pickup_date: string | null
          pickup_time: string | null
          products: string | null
          status: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      product_inventory: {
        Row: {
          category: string | null
          category_name: string | null
          created_at: string | null
          id: string | null
          is_available: boolean | null
          name: string | null
          price: number | null
          stock_quantity: number | null
          tags: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      batch_update_stock: {
        Args: { p_updates: Json; p_user_id: string }
        Returns: {
          item_id: string
          message: string
          new_stock: number
          success: boolean
        }[]
      }
      calculate_customer_analytics: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_stock_alerts: {
        Args: { p_current_stock: number; p_item_id: string; p_user_id: string }
        Returns: undefined
      }
      check_stock_availability: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: boolean
      }
      decrement_product_stock: {
        Args: { product_id: string; quantity_to_subtract: number }
        Returns: undefined
      }
      increment_product_stock: {
        Args: { product_id: string; quantity_to_add: number }
        Returns: undefined
      }
      process_no_show_atomic: {
        Args: { input_grace_period_minutes?: number; input_order_id: string }
        Returns: Json
      }
      recover_from_error_atomic: {
        Args: {
          input_error_type: string
          input_metadata?: Json
          input_operation?: string
          input_order_id?: string
          input_original_error?: string
          input_retry_count?: number
          input_user_id?: string
        }
        Returns: Json
      }
      reschedule_pickup_atomic: {
        Args: {
          input_new_pickup_date: string
          input_new_pickup_time: string
          input_order_id: string
          input_reason?: string
          input_requested_by?: string
          input_user_id: string
        }
        Returns: Json
      }
      send_notification_atomic: {
        Args: {
          input_customer_email?: string
          input_customer_name?: string
          input_customer_phone?: string
          input_delivery_method?: string
          input_message_content?: string
          input_metadata?: Json
          input_notification_type: string
          input_order_id?: string
          input_user_id: string
        }
        Returns: Json
      }
      submit_order_atomic: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_delivery_address?: string
          p_fulfillment_type: string
          p_order_id: string
          p_order_items: Json
          p_payment_method: string
          p_payment_status: string
          p_pickup_date?: string
          p_pickup_time?: string
          p_special_instructions?: string
          p_status?: string
          p_subtotal: number
          p_tax_amount: number
          p_total_amount: number
          p_user_id: string
        }
        Returns: Json
      }
      update_stock_atomic: {
        Args: {
          p_item_id: string
          p_operation: string
          p_performed_by?: string
          p_quantity: number
          p_reason?: string
          p_user_id: string
        }
        Returns: {
          message: string
          new_stock: number
          success: boolean
        }[]
      }
      upsert_cart_item: {
        Args: {
          input_product_id: string
          input_quantity_to_add: number
          input_user_id: string
        }
        Returns: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
