import { z } from 'zod';

/**
 * Kiosk Sessions Schema - POS system session management
 * Following docs/architectural-patterns-and-best-practices.md
 * Pattern 2: Database-first validation + Pattern 4: Transformation with return types
 */

// Database schema (matches database.generated.ts)
const RawKioskSessionSchema = z.object({
  id: z.string().uuid(),
  session_start: z.string().datetime(),
  session_end: z.string().datetime().nullable(),
  staff_id: z.string().uuid().nullable(),
  location: z.string().nullable(),
  total_sales: z.number().min(0).nullable(),
  total_transactions: z.number().int().min(0).nullable(),
  cash_drawer_start: z.number().min(0).nullable(),
  cash_drawer_end: z.number().min(0).nullable(),
  session_status: z.enum(['active', 'paused', 'closed', 'error']),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Interface for transformed kiosk session
export interface KioskSession {
  id: string;
  sessionStart: string;
  sessionEnd: string | null;
  staffId: string | null;
  location: string | null;
  totalSales: number;
  totalTransactions: number;
  cashDrawerStart: number | null;
  cashDrawerEnd: number | null;
  sessionStatus: 'active' | 'paused' | 'closed' | 'error';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  sessionDuration: number | null; // Minutes
  averageTransactionValue: number | null;
}

// Transform schema (snake_case → camelCase)
export const KioskSessionSchema = RawKioskSessionSchema.transform((data): KioskSession => {
  // Calculate session duration in minutes
  let sessionDuration: number | null = null;
  if (data.session_end) {
    const start = new Date(data.session_start);
    const end = new Date(data.session_end);
    sessionDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  // Calculate average transaction value
  const totalSales = data.total_sales || 0;
  const totalTransactions = data.total_transactions || 0;
  const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : null;

  return {
    id: data.id,
    sessionStart: data.session_start,
    sessionEnd: data.session_end,
    staffId: data.staff_id,
    location: data.location,
    totalSales,
    totalTransactions,
    cashDrawerStart: data.cash_drawer_start,
    cashDrawerEnd: data.cash_drawer_end,
    sessionStatus: data.session_status,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    sessionDuration,
    averageTransactionValue,
  };
});

// Input schema for creating kiosk sessions
export const CreateKioskSessionSchema = z.object({
  staffId: z.string().uuid().optional(),
  location: z.string().optional(),
  cashDrawerStart: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// Input schema for updating kiosk sessions
export const UpdateKioskSessionSchema = z.object({
  sessionEnd: z.string().datetime().optional(),
  totalSales: z.number().min(0).optional(),
  totalTransactions: z.number().int().min(0).optional(),
  cashDrawerEnd: z.number().min(0).optional(),
  sessionStatus: z.enum(['active', 'paused', 'closed', 'error']).optional(),
  notes: z.string().optional(),
});

export type CreateKioskSessionInput = z.infer<typeof CreateKioskSessionSchema>;
export type UpdateKioskSessionInput = z.infer<typeof UpdateKioskSessionSchema>;