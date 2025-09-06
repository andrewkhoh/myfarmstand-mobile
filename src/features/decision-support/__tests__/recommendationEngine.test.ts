import { RecommendationEngine } from '../services/recommendationEngine';
import { 
  ExecutiveData, 
  Recommendation, 
  StockoutRisk, 
  RecommendationOptions,
  InventoryData,
  MarketingData,
  OperationsData,
  FinancialsData,
  CustomersData
} from '../types';
import { generateExecutiveData, generateInventoryData, generateMarketingData } from '../utils/testDataGenerators';

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  describe('Core Recommendation Generation', () => {
    it('should generate recommendations with confidence scores', async () => {
      const mockData = generateExecutiveData();
      const recommendations = await engine.generateRecommendations(mockData);
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            confidence: expect.any(Number),
            impact: expect.objectContaining({
              revenue: expect.any(Number),
              timeframe: expect.any(String)
            }),
            priority: expect.stringMatching(/high|medium|low/)
          })
        ])
      );
      
      recommendations.forEach(rec => {
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should rank recommendations by priority and confidence', async () => {
      const mockData = generateExecutiveData();
      const recommendations = await engine.generateRecommendations(mockData);
      
      const getPriorityScore = (rec: Recommendation) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[rec.priority] * rec.confidence;
      };
      
      for (let i = 1; i < recommendations.length; i++) {
        const prevScore = getPriorityScore(recommendations[i - 1]);
        const currScore = getPriorityScore(recommendations[i]);
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });

    it('should filter recommendations by minimum confidence', async () => {
      const mockData = generateExecutiveData();
      const minConfidence = 0.7;
      const recommendations = await engine.generateRecommendations(mockData, { minConfidence });
      
      recommendations.forEach(rec => {
        expect(rec.confidence).toBeGreaterThanOrEqual(minConfidence);
      });
    });

    it('should handle incomplete data gracefully', async () => {
      const incompleteData = {
        inventory: null,
        marketing: generateMarketingData(),
        operations: null,
        financials: null,
        customers: null
      } as any;
      
      const recommendations = await engine.generateRecommendations(incompleteData);
      
      expect(recommendations.some(r => r.type === 'marketing_optimization')).toBe(true);
      expect(Math.max(...recommendations.map(r => r.confidence))).toBeLessThan(0.8);
    });

    it('should include supporting data in recommendations', async () => {
      const mockData = generateExecutiveData();
      const recommendations = await engine.generateRecommendations(mockData);
      
      recommendations.forEach(rec => {
        expect(rec.supportingData).toBeDefined();
        expect(Object.keys(rec.supportingData).length).toBeGreaterThan(0);
      });
    });

    it('should generate actionable recommendations with specific parameters', async () => {
      const mockData = generateExecutiveData();
      const recommendations = await engine.generateRecommendations(mockData);
      
      recommendations.forEach(rec => {
        expect(rec.action).toBeDefined();
        expect(rec.action.type).toBeDefined();
        expect(rec.action.parameters).toBeDefined();
      });
    });

    it('should respect category filters', async () => {
      const mockData = generateExecutiveData();
      const options: RecommendationOptions = { categories: ['inventory'] };
      const recommendations = await engine.generateRecommendations(mockData, options);
      
      recommendations.forEach(rec => {
        expect(rec.type).toContain('inventory');
      });
    });

    it('should limit number of recommendations when specified', async () => {
      const mockData = generateExecutiveData();
      const maxRecommendations = 5;
      const recommendations = await engine.generateRecommendations(mockData, { maxRecommendations });
      
      expect(recommendations.length).toBeLessThanOrEqual(maxRecommendations);
    });

    it('should include confidence intervals in impact assessment', async () => {
      const mockData = generateExecutiveData();
      const recommendations = await engine.generateRecommendations(mockData);
      
      recommendations.forEach(rec => {
        expect(rec.impact.confidence).toBeDefined();
        expect(rec.impact.confidence).toBeGreaterThan(0);
        expect(rec.impact.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should generate unique recommendation IDs', async () => {
      const mockData = generateExecutiveData();
      const recommendations = await engine.generateRecommendations(mockData);
      
      const ids = recommendations.map(r => r.id);
      const uniqueIds = Array.from(new Set(ids));
      expect(uniqueIds.length).toBe(ids.length);
    });
  });

  describe('Inventory Analysis', () => {
    it('should calculate accurate stockout risk', () => {
      const inventory = generateInventoryData({ 
        currentStock: 100,
        dailyDemand: 20,
        leadTime: 7
      });
      
      const risk = engine.calculateStockoutRisk(inventory);
      
      expect(risk.probability).toBeCloseTo(0.35, 1);
      expect(risk.recommendedIncrease).toBeCloseTo(40, 0);
      expect(risk.confidence).toBeGreaterThan(0.8);
    });

    it('should identify at-risk products', () => {
      const inventory = generateInventoryData({
        products: [
          { id: '1', stock: 10, demandRate: 5, leadTime: 3 },
          { id: '2', stock: 100, demandRate: 5, leadTime: 3 },
          { id: '3', stock: 5, demandRate: 10, leadTime: 5 }
        ]
      });
      
      const risk = engine.calculateStockoutRisk(inventory);
      
      expect(risk.atRiskProducts).toContain('1');
      expect(risk.atRiskProducts).toContain('3');
      expect(risk.atRiskProducts).not.toContain('2');
    });

    it('should calculate safety stock recommendations', () => {
      const inventory = generateInventoryData();
      const safetyStock = engine.calculateSafetyStock(inventory, 0.95);
      
      expect(safetyStock).toBeGreaterThan(0);
      expect(safetyStock).toBeLessThan(inventory.currentStock * 2);
    });

    it('should detect overstock situations', () => {
      const inventory = generateInventoryData({
        products: [
          { id: '1', stock: 1000, demandRate: 5, holdingCost: 2 },
          { id: '2', stock: 50, demandRate: 45, holdingCost: 1 }
        ]
      });
      
      const overstockItems = engine.identifyOverstock(inventory);
      
      expect(overstockItems).toContainEqual(
        expect.objectContaining({ id: '1' })
      );
      expect(overstockItems.length).toBeGreaterThan(0);
    });

    it('should identify slow-moving inventory', () => {
      const inventory = generateInventoryData({
        products: [
          { id: '1', turnoverRate: 0.5 },
          { id: '2', turnoverRate: 12 },
          { id: '3', turnoverRate: 1.2 }
        ]
      });
      
      const slowMoving = engine.identifySlowMoving(inventory);
      
      expect(slowMoving).toContainEqual(
        expect.objectContaining({ id: '1' })
      );
      expect(slowMoving).toContainEqual(
        expect.objectContaining({ id: '3' })
      );
    });

    it('should generate inventory optimization recommendations', async () => {
      const mockData = generateExecutiveData({
        inventory: generateInventoryData({
          currentStock: 50,
          dailyDemand: 15,
          leadTime: 5
        })
      });
      
      const recommendations = await engine.generateRecommendations(mockData);
      const inventoryRecs = recommendations.filter(r => r.type.includes('inventory'));
      
      expect(inventoryRecs.length).toBeGreaterThan(0);
      expect(inventoryRecs[0].action.type).toBe('adjust_inventory');
    });

    it('should calculate inventory holding costs', () => {
      const inventory = generateInventoryData();
      const holdingCost = engine.calculateHoldingCosts(inventory);
      
      expect(holdingCost).toBeGreaterThan(0);
      expect(holdingCost).toBeLessThan(inventory.totalValue);
    });
  });

  describe('Marketing Analysis', () => {
    it('should analyze campaign ROI correctly', () => {
      const marketing = generateMarketingData({
        campaigns: [
          { id: '1', budget: 1000, revenue: 3000 },
          { id: '2', budget: 2000, revenue: 2500 },
          { id: '3', budget: 500, revenue: 2000 }
        ]
      });
      
      const campaignROI = engine.analyzeCampaignROI(marketing);
      
      expect(campaignROI[0].roi).toBe(3);
      expect(campaignROI[1].roi).toBe(1.25);
      expect(campaignROI[2].roi).toBe(4);
    });

    it('should identify underperforming campaigns', () => {
      const marketing = generateMarketingData({
        campaigns: [
          { id: '1', budget: 1000, revenue: 1200 },
          { id: '2', budget: 2000, revenue: 6000 },
          { id: '3', budget: 500, revenue: 400 }
        ]
      });
      
      const underperforming = engine.identifyUnderperformingCampaigns(marketing);
      
      expect(underperforming).toContainEqual(
        expect.objectContaining({ id: '1' })
      );
      expect(underperforming).toContainEqual(
        expect.objectContaining({ id: '3' })
      );
    });

    it('should calculate budget reallocation impact', () => {
      const campaignROI = [
        { id: '1', budget: 1000, roi: 1.2 },
        { id: '2', budget: 2000, roi: 3.5 },
        { id: '3', budget: 1500, roi: 0.8 }
      ];
      
      const impact = engine.calculateReallocationImpact(campaignROI);
      
      expect(impact).toBeGreaterThan(0);
    });

    it('should generate marketing optimization recommendations', async () => {
      const mockData = generateExecutiveData({
        marketing: generateMarketingData({
          campaigns: [
            { id: '1', budget: 1000, revenue: 1200 },
            { id: '2', budget: 2000, revenue: 8000 }
          ]
        })
      });
      
      const recommendations = await engine.generateRecommendations(mockData);
      const marketingRecs = recommendations.filter(r => r.type === 'marketing_optimization');
      
      expect(marketingRecs.length).toBeGreaterThan(0);
      expect(marketingRecs[0].action.type).toBe('reallocate_budget');
    });

    it('should identify high-performing channels', () => {
      const marketing = generateMarketingData();
      const topChannels = engine.identifyTopPerformingChannels(marketing);
      
      expect(topChannels).toBeDefined();
      expect(topChannels.length).toBeGreaterThan(0);
      expect(topChannels[0].performance).toBeGreaterThan(topChannels[topChannels.length - 1].performance);
    });

    it('should calculate customer acquisition cost', () => {
      const marketing = generateMarketingData({
        totalSpend: 10000,
        newCustomers: 50
      });
      
      const cac = engine.calculateCAC(marketing);
      
      expect(cac).toBe(200);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on data quality', () => {
      const confidence = engine.calculateConfidence(0.9, 0.85, 0.8);
      
      expect(confidence).toBeCloseTo(0.85, 1);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(confidence).toBeGreaterThanOrEqual(0);
    });

    it('should adjust confidence for incomplete data', () => {
      const fullDataConfidence = engine.calculateConfidence(1, 0.9, 0.85);
      const partialDataConfidence = engine.calculateConfidence(0.5, 0.9, 0.85);
      
      expect(partialDataConfidence).toBeLessThan(fullDataConfidence);
    });

    it('should weight confidence factors appropriately', () => {
      const highDataLowAlgorithm = engine.calculateConfidence(0.95, 0.5, 0.7);
      const lowDataHighAlgorithm = engine.calculateConfidence(0.5, 0.95, 0.7);
      
      expect(highDataLowAlgorithm).toBeGreaterThan(lowDataHighAlgorithm);
    });

    it('should calibrate confidence scores', () => {
      const rawConfidence = 0.8;
      const historicalAccuracy = 0.75;
      const calibrated = engine.calibrateConfidence(rawConfidence, historicalAccuracy);
      
      expect(calibrated).toBeDefined();
      expect(calibrated).toBeLessThanOrEqual(1);
      expect(calibrated).toBeGreaterThanOrEqual(0);
    });

    it('should provide confidence intervals', () => {
      const mean = 100;
      const stdDev = 10;
      const n = 100;
      const [lower, upper] = engine.confidenceInterval(mean, stdDev, n);
      
      expect(lower).toBeLessThan(mean);
      expect(upper).toBeGreaterThan(mean);
      expect(upper - lower).toBeCloseTo(3.92, 1);
    });
  });

  describe('Impact Assessment', () => {
    it('should calculate revenue impact', () => {
      const recommendation = {
        type: 'inventory_optimization',
        currentRevenue: 10000,
        projectedIncrease: 0.15
      };
      
      const impact = engine.calculateImpact(recommendation);
      
      expect(impact.revenue).toBe(1500);
    });

    it('should calculate cost impact', () => {
      const recommendation = {
        type: 'cost_reduction',
        currentCost: 5000,
        projectedSavings: 0.2
      };
      
      const impact = engine.calculateImpact(recommendation);
      
      expect(impact.cost).toBe(-1000);
    });

    it('should calculate ROI', () => {
      const investment = 1000;
      const returns = 1500;
      const roi = engine.calculateROI(investment, returns);
      
      expect(roi).toBe(0.5);
    });

    it('should calculate net present value', () => {
      const cashFlows = [1000, 1200, 1400];
      const discountRate = 0.1;
      const npv = engine.calculateNPV(cashFlows, discountRate);
      
      expect(npv).toBeGreaterThan(0);
    });

    it('should apply realistic constraints to impact', () => {
      const base = 10000;
      const improvement = 0.5;
      const constrained = engine.applyConstraints(base, improvement);
      
      expect(constrained).toBe(13000); // 30% max improvement
    });

    it('should include risk adjustment in impact', () => {
      const baseImpact = 10000;
      const riskFactor = 0.8;
      const adjusted = engine.riskAdjustedImpact(baseImpact, riskFactor);
      
      expect(adjusted).toBe(8000);
    });
  });

  describe('Priority Ranking', () => {
    it('should calculate priority scores correctly', () => {
      const impact = 0.8;
      const confidence = 0.7;
      const urgency = 0.9;
      const priority = engine.calculatePriority(impact, confidence, urgency);
      
      expect(priority).toBe('high');
    });

    it('should rank by multiple criteria', () => {
      const recommendations = [
        { impact: 0.9, confidence: 0.6, urgency: 0.5 },
        { impact: 0.7, confidence: 0.9, urgency: 0.8 },
        { impact: 0.5, confidence: 0.8, urgency: 0.9 }
      ];
      
      const ranked = engine.rankByMultipleCriteria(recommendations);
      
      expect(ranked[0].impact).toBe(0.7);
    });

    it('should adjust weights dynamically', () => {
      const context = { focus: 'risk_mitigation' };
      const weights = engine.getDynamicWeights(context);
      
      expect(weights.risk).toBeGreaterThan(weights.revenue);
    });

    it('should consider urgency in priority', () => {
      const urgent = engine.calculatePriority(0.5, 0.7, 0.95);
      const notUrgent = engine.calculatePriority(0.5, 0.7, 0.2);
      
      expect(urgent).toBe('high');
      expect(notUrgent).toBe('low');
    });

    it('should handle equal priorities deterministically', () => {
      const recs = [
        { id: 'a', score: 0.5 },
        { id: 'b', score: 0.5 }
      ];
      
      const ranked1 = engine.rankRecommendations(recs);
      const ranked2 = engine.rankRecommendations(recs);
      
      expect(ranked1).toEqual(ranked2);
    });
  });

  describe('Monte Carlo Simulations', () => {
    it('should run Monte Carlo simulation for risk assessment', () => {
      const model = {
        baseValue: 100,
        volatility: 0.2,
        timeHorizon: 30
      };
      
      const result = engine.monteCarloSimulation(model, 1000);
      
      expect(result.mean).toBeDefined();
      expect(result.stdDev).toBeDefined();
      expect(result.percentiles).toBeDefined();
    });

    it('should generate scenario distributions', () => {
      const scenarios = engine.generateScenarios(1000);
      
      expect(scenarios.length).toBe(1000);
      expect(scenarios.every(s => s >= 0 && s <= 1)).toBe(true);
    });

    it('should calculate value at risk', () => {
      const simResults = Array(1000).fill(0).map(() => Math.random() * 200 - 50);
      const var95 = engine.calculateVaR(simResults, 0.95);
      
      expect(var95).toBeDefined();
      expect(var95).toBeLessThan(0);
    });

    it('should simulate demand variations', () => {
      const historicalDemand = [100, 110, 95, 105, 115];
      const simulated = engine.simulateDemand(historicalDemand);
      
      expect(simulated).toBeDefined();
      expect(simulated).toBeGreaterThan(80);
      expect(simulated).toBeLessThan(130);
    });

    it('should simulate lead time variations', () => {
      const leadTimes = { mean: 7, stdDev: 1.5 };
      const simulated = engine.simulateLeadTime(leadTimes);
      
      expect(simulated).toBeDefined();
      expect(simulated).toBeGreaterThan(3);
      expect(simulated).toBeLessThan(11);
    });
  });

  describe('Operations Analysis', () => {
    it('should identify bottlenecks', async () => {
      const operations = {
        processes: [
          { id: '1', throughput: 100, capacity: 120 },
          { id: '2', throughput: 95, capacity: 100 },
          { id: '3', throughput: 110, capacity: 150 }
        ]
      };
      
      const bottlenecks = engine.identifyBottlenecks(operations);
      
      expect(bottlenecks).toContainEqual(
        expect.objectContaining({ id: '2' })
      );
    });

    it('should calculate efficiency metrics', () => {
      const operations = {
        actualOutput: 850,
        maxOutput: 1000
      };
      
      const efficiency = engine.calculateEfficiency(operations);
      
      expect(efficiency).toBe(0.85);
    });

    it('should recommend process improvements', async () => {
      const mockData = generateExecutiveData({
        operations: {
          efficiency: 0.65,
          bottlenecks: ['packaging', 'quality_control']
        }
      });
      
      const recommendations = await engine.generateRecommendations(mockData);
      const opsRecs = recommendations.filter(r => r.type === 'operations_optimization');
      
      expect(opsRecs.length).toBeGreaterThan(0);
    });

    it('should calculate capacity utilization', () => {
      const operations = {
        currentCapacity: 750,
        maxCapacity: 1000
      };
      
      const utilization = engine.calculateUtilization(operations);
      
      expect(utilization).toBe(0.75);
    });
  });

  describe('Financial Analysis', () => {
    it('should analyze cash flow patterns', () => {
      const financials = {
        cashFlows: [10000, -5000, 15000, -3000, 12000]
      };
      
      const analysis = engine.analyzeCashFlow(financials);
      
      expect(analysis.trend).toBeDefined();
      expect(analysis.volatility).toBeDefined();
      expect(analysis.forecast).toBeDefined();
    });

    it('should identify financial risks', () => {
      const financials = {
        currentRatio: 0.8,
        debtToEquity: 2.5,
        cashReserves: 5000
      };
      
      const risks = engine.identifyFinancialRisks(financials);
      
      expect(risks.length).toBeGreaterThan(0);
      expect(risks).toContainEqual(
        expect.objectContaining({ type: 'liquidity_risk' })
      );
    });

    it('should calculate working capital optimization', () => {
      const financials = {
        receivables: 50000,
        payables: 30000,
        inventory: 40000
      };
      
      const optimization = engine.optimizeWorkingCapital(financials);
      
      expect(optimization.recommendations).toBeDefined();
      expect(optimization.potentialImprovement).toBeGreaterThan(0);
    });

    it('should project revenue growth', () => {
      const historicalRevenue = [100000, 110000, 125000, 140000];
      const projection = engine.projectRevenue(historicalRevenue, 3);
      
      expect(projection.length).toBe(3);
      expect(projection[0]).toBeGreaterThan(140000);
    });
  });

  describe('Customer Analysis', () => {
    it('should analyze customer segments', () => {
      const customers = {
        segments: [
          { id: 'premium', value: 5000, count: 100 },
          { id: 'regular', value: 1000, count: 500 },
          { id: 'basic', value: 200, count: 2000 }
        ]
      };
      
      const analysis = engine.analyzeSegments(customers);
      
      expect(analysis.mostValuable).toBe('premium');
      expect(analysis.recommendations).toBeDefined();
    });

    it('should calculate customer lifetime value', () => {
      const customer = {
        averagePurchase: 100,
        purchaseFrequency: 12,
        retentionRate: 0.8,
        margin: 0.3
      };
      
      const clv = engine.calculateCLV(customer);
      
      expect(clv).toBeGreaterThan(0);
      expect(clv).toBeLessThan(10000);
    });

    it('should identify churn risks', () => {
      const customers = {
        segments: [
          { id: '1', lastPurchase: 90, avgFrequency: 30 },
          { id: '2', lastPurchase: 15, avgFrequency: 20 },
          { id: '3', lastPurchase: 120, avgFrequency: 45 }
        ]
      };
      
      const atRisk = engine.identifyChurnRisk(customers);
      
      expect(atRisk).toContainEqual(
        expect.objectContaining({ id: '1' })
      );
      expect(atRisk).toContainEqual(
        expect.objectContaining({ id: '3' })
      );
    });

    it('should recommend retention strategies', async () => {
      const mockData = generateExecutiveData({
        customers: {
          churnRate: 0.15,
          atRiskCount: 150
        }
      });
      
      const recommendations = await engine.generateRecommendations(mockData);
      const retentionRecs = recommendations.filter(r => r.type === 'customer_retention');
      
      expect(retentionRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Correlation Analysis', () => {
    it('should calculate correlation between metrics', () => {
      const metric1 = [1, 2, 3, 4, 5];
      const metric2 = [2, 4, 6, 8, 10];
      
      const correlation = engine.calculateCorrelation(metric1, metric2);
      
      expect(correlation).toBeCloseTo(1, 2);
    });

    it('should identify significant correlations', () => {
      const data = {
        inventory: [100, 90, 80, 70, 60],
        sales: [50, 60, 70, 80, 90]
      };
      
      const correlations = engine.findCorrelations(data);
      
      expect(correlations.inventorySales).toBeCloseTo(-1, 1);
    });

    it('should detect causation patterns', () => {
      const data = {
        marketing: [1000, 2000, 3000, 4000],
        salesLagged: [0, 1500, 2500, 3500]
      };
      
      const causation = engine.detectCausation(data);
      
      expect(causation.marketingToSales).toBeGreaterThan(0.8);
    });
  });

  describe('Trend Analysis', () => {
    it('should detect upward trends', () => {
      const data = [100, 110, 115, 125, 135, 145];
      const trend = engine.analyzeTrend(data);
      
      expect(trend.direction).toBe('upward');
      expect(trend.strength).toBeGreaterThan(0.8);
    });

    it('should detect downward trends', () => {
      const data = [145, 135, 125, 115, 110, 100];
      const trend = engine.analyzeTrend(data);
      
      expect(trend.direction).toBe('downward');
      expect(trend.strength).toBeGreaterThan(0.8);
    });

    it('should identify seasonal patterns', () => {
      const data = [100, 120, 110, 130, 100, 120, 110, 130];
      const seasonal = engine.detectSeasonality(data);
      
      expect(seasonal.hasSeasonality).toBe(true);
      expect(seasonal.period).toBe(4);
    });

    it('should forecast based on trends', () => {
      const data = [100, 110, 120, 130, 140];
      const forecast = engine.forecastTrend(data, 3);
      
      expect(forecast.length).toBe(3);
      expect(forecast[0]).toBeGreaterThan(140);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty data sets', async () => {
      const emptyData = {} as ExecutiveData;
      const recommendations = await engine.generateRecommendations(emptyData);
      
      expect(recommendations).toEqual([]);
    });

    it('should handle negative values appropriately', () => {
      const inventory = generateInventoryData({
        currentStock: -10
      });
      
      const risk = engine.calculateStockoutRisk(inventory);
      
      expect(risk.probability).toBe(1);
    });

    it('should handle division by zero', () => {
      const roi = engine.calculateROI(0, 100);
      
      expect(roi).toBe(Infinity);
    });

    it('should handle extreme outliers', () => {
      const data = [100, 102, 98, 101, 10000, 99];
      const cleaned = engine.removeOutliers(data);
      
      expect(cleaned).not.toContain(10000);
    });

    it('should validate input parameters', () => {
      expect(() => {
        engine.calculateConfidence(-0.5, 1.2, 0.8);
      }).toThrow();
    });
  });

  describe('Learning and Adaptation', () => {
    it('should track recommendation outcomes', () => {
      const recommendation = { id: 'rec-1', confidence: 0.8 };
      const outcome = { success: true, actualImpact: 1500 };
      
      engine.trackOutcome(recommendation.id, outcome);
      const history = engine.getOutcomeHistory();
      
      expect(history[recommendation.id]).toEqual(outcome);
    });

    it('should adjust confidence based on historical performance', () => {
      engine.trackOutcome('type-1', { success: true });
      engine.trackOutcome('type-1', { success: true });
      engine.trackOutcome('type-1', { success: false });
      
      const adjusted = engine.getAdjustedConfidence('type-1', 0.7);
      
      expect(adjusted).toBeCloseTo(0.65, 1);
    });

    it('should learn from user feedback', () => {
      const feedback = {
        recommendationId: 'rec-1',
        useful: true,
        implemented: true,
        outcome: 'positive' as const
      };
      
      engine.processFeedback(feedback);
      const learning = engine.getLearningMetrics();
      
      expect(learning.accuracy).toBeDefined();
      expect(learning.improvement).toBeDefined();
    });

    it('should improve over time', () => {
      const initialAccuracy = engine.getCurrentAccuracy();
      
      for (let i = 0; i < 10; i++) {
        engine.processFeedback({
          recommendationId: `rec-${i}`,
          useful: true,
          outcome: 'positive'
        });
      }
      
      const finalAccuracy = engine.getCurrentAccuracy();
      
      expect(finalAccuracy).toBeGreaterThan(initialAccuracy);
    });
  });
});