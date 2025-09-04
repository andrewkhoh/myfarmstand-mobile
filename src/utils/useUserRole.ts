import { UserRole } from '@/types/marketing';

// Mock user role hook for testing
export function useUserRole(): UserRole {
  // In a real app, this would get from auth context
  return 'manager';
}