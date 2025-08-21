// Phase 4: Database Mock Types for Executive Analytics Operations
// Following Phase 1, 2, & 3 patterns for strict schema contract enforcement
// These interfaces must match the actual database structure exactly

export interface MockDatabase {
  public: {
    Tables: {
      business_metrics: {
        Row: {
          id: string;
          metric_date: string; // DATE type as string
          metric_category: 'inventory' | 'marketing' | 'sales' | 'operational' | 'strategic';
          metric_name: string;
          metric_value: number; // DECIMAL as number
          metric_unit: string | null;
          aggregation_level: 'daily' | 'weekly' | 'monthly' | 'quarterly';
          source_data_type: string;
          correlation_factors: Record<string, any> | null; // JSONB
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          metric_date?: string;
          metric_category: 'inventory' | 'marketing' | 'sales' | 'operational' | 'strategic';
          metric_name: string;
          metric_value: number;
          metric_unit?: string | null;
          aggregation_level: 'daily' | 'weekly' | 'monthly' | 'quarterly';
          source_data_type: string;
          correlation_factors?: Record<string, any> | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          metric_date?: string;
          metric_category?: 'inventory' | 'marketing' | 'sales' | 'operational' | 'strategic';
          metric_name?: string;
          metric_value?: number;
          metric_unit?: string | null;
          aggregation_level?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
          source_data_type?: string;
          correlation_factors?: Record<string, any> | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      business_insights: {
        Row: {
          id: string;
          insight_type: 'correlation' | 'trend' | 'anomaly' | 'recommendation';
          insight_title: string;
          insight_description: string;
          confidence_score: number | null; // DECIMAL as number
          impact_level: 'low' | 'medium' | 'high' | 'critical';
          affected_areas: string[]; // TEXT[] array
          supporting_data: Record<string, any> | null; // JSONB
          recommendation_actions: string[]; // TEXT[] array
          insight_date_range: string; // DATERANGE as string (e.g., "[2024-01-01,2024-01-31)")
          generated_by: string;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          insight_type: 'correlation' | 'trend' | 'anomaly' | 'recommendation';
          insight_title: string;
          insight_description: string;
          confidence_score?: number | null;
          impact_level: 'low' | 'medium' | 'high' | 'critical';
          affected_areas: string[];
          supporting_data?: Record<string, any> | null;
          recommendation_actions?: string[];
          insight_date_range: string;
          generated_by?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          insight_type?: 'correlation' | 'trend' | 'anomaly' | 'recommendation';
          insight_title?: string;
          insight_description?: string;
          confidence_score?: number | null;
          impact_level?: 'low' | 'medium' | 'high' | 'critical';
          affected_areas?: string[];
          supporting_data?: Record<string, any> | null;
          recommendation_actions?: string[];
          insight_date_range?: string;
          generated_by?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      strategic_reports: {
        Row: {
          id: string;
          report_name: string;
          report_type: 'performance' | 'forecast' | 'correlation' | 'strategic';
          report_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand';
          report_config: Record<string, any>; // JSONB NOT NULL
          last_generated_at: string | null;
          next_generation_at: string | null;
          is_automated: boolean | null;
          created_by: string | null; // UUID reference to auth.users
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          report_name: string;
          report_type: 'performance' | 'forecast' | 'correlation' | 'strategic';
          report_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand';
          report_config: Record<string, any>;
          last_generated_at?: string | null;
          next_generation_at?: string | null;
          is_automated?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          report_name?: string;
          report_type?: 'performance' | 'forecast' | 'correlation' | 'strategic';
          report_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand';
          report_config?: Record<string, any>;
          last_generated_at?: string | null;
          next_generation_at?: string | null;
          is_automated?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      predictive_forecasts: {
        Row: {
          id: string;
          forecast_type: 'demand' | 'inventory' | 'revenue' | 'risk';
          forecast_target: string;
          forecast_period: string; // DATERANGE as string
          model_type: string;
          forecast_values: Record<string, any>; // JSONB NOT NULL
          confidence_intervals: Record<string, any> | null; // JSONB
          model_accuracy: number | null; // DECIMAL as number
          input_features: string[]; // TEXT[] array
          generated_at: string | null;
          expires_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          forecast_type: 'demand' | 'inventory' | 'revenue' | 'risk';
          forecast_target: string;
          forecast_period: string;
          model_type: string;
          forecast_values: Record<string, any>;
          confidence_intervals?: Record<string, any> | null;
          model_accuracy?: number | null;
          input_features?: string[];
          generated_at?: string | null;
          expires_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          forecast_type?: 'demand' | 'inventory' | 'revenue' | 'risk';
          forecast_target?: string;
          forecast_period?: string;
          model_type?: string;
          forecast_values?: Record<string, any>;
          confidence_intervals?: Record<string, any> | null;
          model_accuracy?: number | null;
          input_features?: string[];
          generated_at?: string | null;
          expires_at?: string | null;
          created_at?: string | null;
        };
      };
      decision_support: {
        Row: {
          id: string;
          scenario_name: string;
          scenario_type: 'optimization' | 'risk_mitigation' | 'growth_strategy' | 'cost_reduction';
          current_state: Record<string, any>; // JSONB NOT NULL
          proposed_changes: Record<string, any>; // JSONB NOT NULL
          projected_outcomes: Record<string, any>; // JSONB NOT NULL
          risk_assessment: Record<string, any> | null; // JSONB
          implementation_priority: 'low' | 'medium' | 'high' | 'urgent';
          estimated_impact: number | null; // DECIMAL as number
          implementation_timeline: string | null;
          supporting_insights: string[]; // UUID[] array references to business_insights
          status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
          created_by: string | null; // UUID reference to auth.users
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          scenario_name: string;
          scenario_type: 'optimization' | 'risk_mitigation' | 'growth_strategy' | 'cost_reduction';
          current_state: Record<string, any>;
          proposed_changes: Record<string, any>;
          projected_outcomes: Record<string, any>;
          risk_assessment?: Record<string, any> | null;
          implementation_priority: 'low' | 'medium' | 'high' | 'urgent';
          estimated_impact?: number | null;
          implementation_timeline?: string | null;
          supporting_insights?: string[];
          status?: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          scenario_name?: string;
          scenario_type?: 'optimization' | 'risk_mitigation' | 'growth_strategy' | 'cost_reduction';
          current_state?: Record<string, any>;
          proposed_changes?: Record<string, any>;
          projected_outcomes?: Record<string, any>;
          risk_assessment?: Record<string, any> | null;
          implementation_priority?: 'low' | 'medium' | 'high' | 'urgent';
          estimated_impact?: number | null;
          implementation_timeline?: string | null;
          supporting_insights?: string[];
          status?: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
}