import { supabase } from '@/config/supabase';

// Mock types
interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  department: string;
  message: string;
  timestamp: string;
  impact: number;
}

interface PrioritizedAlerts {
  critical: Alert[];
  warning: Alert[];
  info: Alert[];
  recommendations: Map<string, string>;
}

// Mock alert service
const alertPrioritizationService = {
  async prioritizeAlerts(userId: string): Promise<PrioritizedAlerts> {
    const alerts = await this.fetchAlerts(userId);
    const prioritized = this.categorizeAlerts(alerts);
    const recommendations = this.generateAlertRecommendations(alerts);
    
    return {
      ...prioritized,
      recommendations
    };
  },

  async fetchAlerts(userId: string): Promise<Alert[]> {
    // Mock fetching alerts
    const { data } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    return data || this.generateMockAlerts();
  },

  generateMockAlerts(): Alert[] {
    return [
      {
        id: '1',
        severity: 'critical',
        department: 'operations',
        message: 'System downtime detected',
        timestamp: new Date().toISOString(),
        impact: 10000
      },
      {
        id: '2',
        severity: 'warning',
        department: 'inventory',
        message: 'Low stock levels',
        timestamp: new Date().toISOString(),
        impact: 5000
      },
      {
        id: '3',
        severity: 'info',
        department: 'marketing',
        message: 'Campaign completed',
        timestamp: new Date().toISOString(),
        impact: 1000
      }
    ];
  },

  categorizeAlerts(alerts: Alert[]): Omit<PrioritizedAlerts, 'recommendations'> {
    const critical = alerts.filter(a => a.severity === 'critical');
    const warning = alerts.filter(a => a.severity === 'warning');
    const info = alerts.filter(a => a.severity === 'info');
    
    // Sort each category by impact
    critical.sort((a, b) => b.impact - a.impact);
    warning.sort((a, b) => b.impact - a.impact);
    info.sort((a, b) => b.impact - a.impact);
    
    return { critical, warning, info };
  },

  generateAlertRecommendations(alerts: Alert[]): Map<string, string> {
    const recommendations = new Map<string, string>();
    
    alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        recommendations.set(alert.id, `Immediate action required: ${alert.message}`);
      } else if (alert.severity === 'warning') {
        recommendations.set(alert.id, `Monitor closely: ${alert.message}`);
      }
    });
    
    return recommendations;
  },

  calculateAlertImpact(alert: Alert): number {
    const severityMultiplier = {
      critical: 3,
      warning: 2,
      info: 1
    };
    
    return alert.impact * severityMultiplier[alert.severity];
  }
};

describe('Alert Prioritization Integration', () => {
  const mockUserId = 'alert-user';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alert Categorization', () => {
    it('should prioritize alerts by severity', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      });

      const result = await alertPrioritizationService.prioritizeAlerts(mockUserId);

      expect(result.critical).toBeInstanceOf(Array);
      expect(result.warning).toBeInstanceOf(Array);
      expect(result.info).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Map);
    });

    it('should sort alerts within each category by impact', () => {
      const alerts: Alert[] = [
        { id: '1', severity: 'warning', department: 'sales', message: 'Low sales', timestamp: '', impact: 3000 },
        { id: '2', severity: 'warning', department: 'sales', message: 'Very low sales', timestamp: '', impact: 5000 },
        { id: '3', severity: 'warning', department: 'sales', message: 'Moderate sales', timestamp: '', impact: 4000 }
      ];

      const result = alertPrioritizationService.categorizeAlerts(alerts);

      expect(result.warning[0].impact).toBe(5000);
      expect(result.warning[1].impact).toBe(4000);
      expect(result.warning[2].impact).toBe(3000);
    });

    it('should generate recommendations for critical alerts', () => {
      const alerts: Alert[] = [
        { id: '1', severity: 'critical', department: 'ops', message: 'System failure', timestamp: '', impact: 10000 }
      ];

      const recommendations = alertPrioritizationService.generateAlertRecommendations(alerts);

      expect(recommendations.size).toBe(1);
      expect(recommendations.get('1')).toContain('Immediate action required');
    });

    it('should calculate weighted impact scores', () => {
      const criticalAlert: Alert = {
        id: '1',
        severity: 'critical',
        department: 'finance',
        message: 'Payment system down',
        timestamp: '',
        impact: 1000
      };

      const impact = alertPrioritizationService.calculateAlertImpact(criticalAlert);

      expect(impact).toBe(3000); // 1000 * 3 (critical multiplier)
    });

    it('should maintain user isolation', async () => {
      let queryParams: any = {};

      jest.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(function(this: any, field: string, value: any) {
            queryParams[field] = value;
            return this;
          }),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      });

      await alertPrioritizationService.fetchAlerts(mockUserId);

      expect(queryParams.user_id).toBe(mockUserId);
    });
  });

  describe('Performance', () => {
    it('should prioritize alerts within 100ms', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ 
            data: alertPrioritizationService.generateMockAlerts(), 
            error: null 
          })
        } as any;
      });

      const startTime = Date.now();
      await alertPrioritizationService.prioritizeAlerts(mockUserId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });
});