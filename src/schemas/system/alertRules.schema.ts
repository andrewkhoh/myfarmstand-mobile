import { z } from 'zod';

/**
 * Alert Rules Schema - System notification triggers
 * Following docs/architectural-patterns-and-best-practices.md
 * Pattern 2: Database-first validation + Pattern 4: Transformation with return types
 */

// Database schema (matches database.generated.ts)
const RawAlertRuleSchema = z.object({
  id: z.string().uuid(),
  rule_name: z.string().min(1).max(255),
  rule_type: z.enum(['low_stock', 'out_of_stock', 'price_change', 'order_anomaly', 'system_error']),
  conditions: z.record(z.any()).nullable(), // JSONB field
  trigger_threshold: z.number().nullable(),
  is_active: z.boolean(),
  notification_channels: z.array(z.string()).nullable(), // JSON array
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Interface for transformed alert rule
export interface AlertRule {
  id: string;
  ruleName: string;
  ruleType: 'low_stock' | 'out_of_stock' | 'price_change' | 'order_anomaly' | 'system_error';
  conditions: Record<string, any> | null;
  triggerThreshold: number | null;
  isActive: boolean;
  notificationChannels: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Transform schema (snake_case → camelCase)
export const AlertRuleSchema = RawAlertRuleSchema.transform((data): AlertRule => ({
  id: data.id,
  ruleName: data.rule_name,
  ruleType: data.rule_type,
  conditions: data.conditions,
  triggerThreshold: data.trigger_threshold,
  isActive: data.is_active,
  notificationChannels: data.notification_channels || [],
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
}));

// Input schema for creating alert rules
export const CreateAlertRuleSchema = z.object({
  ruleName: z.string().min(1).max(255),
  ruleType: z.enum(['low_stock', 'out_of_stock', 'price_change', 'order_anomaly', 'system_error']),
  conditions: z.record(z.any()).optional(),
  triggerThreshold: z.number().optional(),
  isActive: z.boolean().default(true),
  notificationChannels: z.array(z.string()).default([]),
  createdBy: z.string().uuid().optional(),
});

export type CreateAlertRuleInput = z.infer<typeof CreateAlertRuleSchema>;