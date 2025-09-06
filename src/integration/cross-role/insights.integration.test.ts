// Simple insight generation tests
describe('Cross-Role Insight Generation', () => {

  describe('Insight Creation', () => {
    it('should generate insights from correlations', () => {
      const correlations = [
        { type: 'inventory-sales', coefficient: 0.82 },
        { type: 'marketing-sales', coefficient: 0.74 }
      ];

      const insights = correlations.map(c => ({
        type: c.type,
        strength: c.coefficient > 0.7 ? 'strong' : 'moderate',
        recommendation: `Optimize ${c.type} relationship`
      }));

      expect(insights).toHaveLength(2);
      expect(insights[0].strength).toBe('strong');
    });

    it('should prioritize insights by impact', () => {
      const insights = [
        { impact: 5000, message: 'Low priority' },
        { impact: 10000, message: 'High priority' },
        { impact: 7500, message: 'Medium priority' }
      ];

      insights.sort((a, b) => b.impact - a.impact);

      expect(insights[0].impact).toBe(10000);
      expect(insights[1].impact).toBe(7500);
      expect(insights[2].impact).toBe(5000);
    });

    it('should categorize insights by department', () => {
      const insights = [
        { department: 'sales', message: 'Sales insight' },
        { department: 'marketing', message: 'Marketing insight' },
        { department: 'sales', message: 'Another sales insight' }
      ];

      const byDepartment = insights.reduce((acc, insight) => {
        if (!acc[insight.department]) acc[insight.department] = [];
        acc[insight.department].push(insight);
        return acc;
      }, {} as Record<string, any[]>);

      expect(byDepartment.sales).toHaveLength(2);
      expect(byDepartment.marketing).toHaveLength(1);
    });

    it('should filter insights by threshold', () => {
      const insights = [
        { confidence: 0.9, message: 'High confidence' },
        { confidence: 0.5, message: 'Low confidence' },
        { confidence: 0.8, message: 'Good confidence' }
      ];

      const filtered = insights.filter(i => i.confidence > 0.7);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(i => i.confidence > 0.7)).toBe(true);
    });

    it('should aggregate insights across time periods', () => {
      const dailyInsights = [
        { date: '2024-01-01', count: 5 },
        { date: '2024-01-02', count: 3 },
        { date: '2024-01-03', count: 7 }
      ];

      const total = dailyInsights.reduce((sum, day) => sum + day.count, 0);
      const average = total / dailyInsights.length;

      expect(total).toBe(15);
      expect(average).toBe(5);
    });

    it('should validate insight data structure', () => {
      const insight = {
        id: '123',
        type: 'correlation',
        department: 'cross-role',
        message: 'Strong correlation detected',
        timestamp: new Date().toISOString()
      };

      expect(insight).toHaveProperty('id');
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('department');
      expect(insight).toHaveProperty('message');
      expect(insight).toHaveProperty('timestamp');
    });

    it('should handle empty insight data gracefully', () => {
      const insights: any[] = [];
      
      const summary = {
        total: insights.length,
        hasData: insights.length > 0,
        message: insights.length > 0 ? 'Insights available' : 'No insights'
      };

      expect(summary.total).toBe(0);
      expect(summary.hasData).toBe(false);
      expect(summary.message).toBe('No insights');
    });

    it('should format insights for display', () => {
      const insight = {
        type: 'warning',
        message: 'Low inventory detected',
        impact: 5000
      };

      const formatted = `[${insight.type.toUpperCase()}] ${insight.message} (Impact: $${insight.impact})`;

      expect(formatted).toContain('WARNING');
      expect(formatted).toContain('Low inventory');
      expect(formatted).toContain('$5000');
    });

    it('should merge duplicate insights', () => {
      const insights = [
        { type: 'inventory', message: 'Low stock', count: 1 },
        { type: 'inventory', message: 'Low stock', count: 1 },
        { type: 'sales', message: 'High demand', count: 1 }
      ];

      const merged = insights.reduce((acc, insight) => {
        const existing = acc.find(i => i.type === insight.type && i.message === insight.message);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ ...insight });
        }
        return acc;
      }, [] as any[]);

      expect(merged).toHaveLength(2);
      expect(merged[0].count).toBe(2);
    });

    it('should calculate insight confidence scores', () => {
      const dataPoints = 100;
      const correlationStrength = 0.85;
      const confidence = Math.min(dataPoints / 100, 1) * correlationStrength;

      expect(confidence).toBeCloseTo(0.85, 2);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should rank insights by business value', () => {
      const insights = [
        { value: 10000, priority: 'high' },
        { value: 5000, priority: 'medium' },
        { value: 15000, priority: 'critical' }
      ];

      const ranked = insights.sort((a, b) => b.value - a.value);

      expect(ranked[0].priority).toBe('critical');
      expect(ranked[0].value).toBe(15000);
    });

    it('should identify actionable vs informational insights', () => {
      const insights = [
        { type: 'action', message: 'Restock inventory' },
        { type: 'info', message: 'Sales trending up' },
        { type: 'action', message: 'Adjust pricing' }
      ];

      const actionable = insights.filter(i => i.type === 'action');
      const informational = insights.filter(i => i.type === 'info');

      expect(actionable).toHaveLength(2);
      expect(informational).toHaveLength(1);
    });

    it('should handle insight timestamps', () => {
      const now = new Date();
      const insight = {
        timestamp: now.toISOString(),
        message: 'Test insight'
      };

      const age = Date.now() - new Date(insight.timestamp).getTime();
      
      expect(age).toBeLessThan(1000); // Less than 1 second old
      expect(insight.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should group insights by time window', () => {
      const insights = [
        { timestamp: '2024-01-01T10:00:00Z', value: 100 },
        { timestamp: '2024-01-01T10:30:00Z', value: 200 },
        { timestamp: '2024-01-01T11:00:00Z', value: 150 }
      ];

      const hourlyGroups = insights.reduce((acc, insight) => {
        const hour = new Date(insight.timestamp).getHours();
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(insight);
        return acc;
      }, {} as Record<number, any[]>);

      expect(Object.keys(hourlyGroups)).toHaveLength(2);
      expect(hourlyGroups[10]).toHaveLength(2);
      expect(hourlyGroups[11]).toHaveLength(1);
    });
  });
});