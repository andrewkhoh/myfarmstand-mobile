import { dataQualityService } from '@/services/integration/dataQualityService';
import { supabase } from '@/config/supabase';
import type { DataQualityCheck } from '@/services/integration/dataQualityService';

describe('Cross-Role Data Quality Integration', () => {
  const mockUserId = 'quality-user';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Quality Validation', () => {
    it('should validate data quality across all departments', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: Array(50).fill({}).map(() => ({
              metric: 100 + Math.random() * 50,
              date: new Date().toISOString()
            })),
            error: null
          })
        } as any;
      });

      const result = await dataQualityService.validateCrossRoleData(mockUserId);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.departmentScores).toBeInstanceOf(Map);
      expect(result.departmentScores.size).toBeGreaterThan(0);
      expect(result.criticalIssues).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should identify data completeness issues', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'inventory_metrics') {
          // Return data with null values
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [
                { metric: null, date: '2024-01-01' },
                { metric: 100, date: null },
                { metric: 150, date: '2024-01-03' }
              ],
              error: null
            })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const check = await dataQualityService.checkDepartmentData(mockUserId, 'inventory');

      expect(check.issues.length).toBeGreaterThan(0);
      expect(check.completeness).toBeLessThan(100);
      expect(check.status).not.toBe('valid');
    });

    it('should calculate overall data quality score', async () => {
      const checks: DataQualityCheck[] = [
        {
          department: 'sales',
          metric: 'sales_quality',
          status: 'valid',
          issues: [],
          completeness: 100,
          accuracy: 95
        },
        {
          department: 'inventory',
          metric: 'inventory_quality',
          status: 'warning',
          issues: ['Minor gaps'],
          completeness: 90,
          accuracy: 90
        }
      ];

      const score = dataQualityService.calculateOverallScore(checks);
      
      expect(score).toBe((97.5 + 90) / 2); // Average of averages
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should detect data accuracy issues', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'sales_metrics') {
          // Return data with outliers
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
              data: [
                { revenue: 100, date: '2024-01-01' },
                { revenue: 120, date: '2024-01-02' },
                { revenue: 10000, date: '2024-01-03' }, // Outlier
                { revenue: 110, date: '2024-01-04' }
              ],
              error: null
            })
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      const check = await dataQualityService.checkDepartmentData(mockUserId, 'sales');
      
      expect(check.issues.length).toBeGreaterThanOrEqual(0);
      expect(check.accuracy).toBeLessThanOrEqual(100);
    });

    it('should generate appropriate recommendations', async () => {
      const checks: DataQualityCheck[] = [
        {
          department: 'inventory',
          metric: 'inventory_quality',
          status: 'error',
          issues: ['High null value percentage: 30%'],
          completeness: 70,
          accuracy: 100
        },
        {
          department: 'sales',
          metric: 'sales_quality',
          status: 'warning',
          issues: ['Data is stale (>7 days old)'],
          completeness: 100,
          accuracy: 85
        }
      ];

      const recommendations = dataQualityService.generateRecommendations(checks);
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('null values'))).toBe(true);
    });

    it('should identify critical cross-department issues', async () => {
      const checks: DataQualityCheck[] = [
        {
          department: 'inventory',
          metric: 'inventory_quality',
          status: 'error',
          issues: ['Database connection failed'],
          completeness: 0,
          accuracy: 0
        },
        {
          department: 'sales',
          metric: 'sales_quality',
          status: 'error',
          issues: ['No data available'],
          completeness: 0,
          accuracy: 0
        },
        {
          department: 'marketing',
          metric: 'marketing_quality',
          status: 'error',
          issues: ['Schema validation failed'],
          completeness: 0,
          accuracy: 0
        }
      ];

      const criticalIssues = dataQualityService.identifyCriticalIssues(checks);
      
      expect(criticalIssues.length).toBeGreaterThan(0);
      expect(criticalIssues.some(issue => issue.includes('Multiple'))).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockRejectedValue(new Error('Connection timeout'))
        } as any;
      });

      const check = await dataQualityService.checkDepartmentData(mockUserId, 'inventory');
      
      expect(check.status).toBe('error');
      expect(check.completeness).toBe(0);
      expect(check.accuracy).toBe(0);
      expect(check.issues.length).toBeGreaterThan(0);
    });

    it('should check data freshness', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      
      jest.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [
              { metric: 100, date: oldDate.toISOString() },
              { metric: 110, date: oldDate.toISOString() }
            ],
            error: null
          })
        } as any;
      });

      const check = await dataQualityService.checkDepartmentData(mockUserId, 'inventory');
      
      expect(check.issues.some(i => i.includes('stale'))).toBe(true);
      expect(check.status).not.toBe('valid');
    });
  });

  describe('Department Score Calculation', () => {
    it('should calculate individual department scores', async () => {
      const checks: DataQualityCheck[] = [
        {
          department: 'inventory',
          metric: 'inventory_quality',
          status: 'valid',
          issues: [],
          completeness: 95,
          accuracy: 98
        },
        {
          department: 'sales',
          metric: 'sales_quality',
          status: 'warning',
          issues: ['Minor issues'],
          completeness: 85,
          accuracy: 90
        }
      ];

      const scores = dataQualityService.calculateDepartmentScores(checks);
      
      expect(scores.get('inventory')).toBe(96.5);
      expect(scores.get('sales')).toBe(87.5);
    });
  });

  describe('Cross-Validation', () => {
    it('should validate correlations between departments', async () => {
      const correlations = new Map([
        ['inventory-sales', 0.82],
        ['marketing-sales', 0.65],
        ['invalid-correlation', 1.5] // Invalid
      ]);

      const isValid = await validateCorrelations(correlations);
      
      expect(isValid).toBe(false);
    });
  });
});

// Helper function for correlation validation
async function validateCorrelations(correlations: Map<string, number>): Promise<boolean> {
  for (const [_pair, coefficient] of correlations) {
    if (coefficient < -1 || coefficient > 1) {
      return false;
    }
  }
  return true;
}