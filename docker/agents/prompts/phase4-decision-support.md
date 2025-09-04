# Phase 4: Decision Support Agent

## 1. 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/shared/feedback/decision-support-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/decision-support-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.

## 2. ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- Raw metrics without actionable recommendations
- No prioritization of critical issues
- Missing confidence scoring for decisions
- Lack of impact assessment

### This Version Exists Because:
- Previous approach: Data display only
- Why it failed: Executives need decisions, not just data
- New approach: AI-driven recommendations with confidence scores

### Success vs Failure Examples:
- ✅ Decision systems with scoring: 78% action rate
- ❌ Pure dashboards: 23% action rate

## 3. 🚨 CRITICAL REQUIREMENTS

### MANDATORY - These are NOT optional:
1. **Confidence Scoring**: Every recommendation needs confidence level
   - Why: Executives must assess risk
   - Impact if ignored: Poor decision quality

2. **Impact Assessment**: Quantify potential outcomes
   - Why: ROI-driven decision making
   - Impact if ignored: Unmeasurable results

3. **Priority Ranking**: Order by business impact
   - Why: Focus on high-value decisions
   - Impact if ignored: Wasted effort on low-impact items

### ⚠️ STOP - Do NOT proceed unless you understand these requirements

## 4. 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns-and-best-practices.md`** - MANDATORY
2. **`src/services/analytics/`** - Analytics patterns
3. **`src/utils/recommendations/`** - Recommendation engine

### Pattern Examples:
```typescript
// ✅ CORRECT: Decision support with confidence and impact
export const decisionSupportService = {
  async generateRecommendations(
    data: ExecutiveData,
    context: BusinessContext
  ): Promise<Recommendation[]> {
    // Analyze multiple data sources
    const analysis = {
      trends: this.analyzeTrends(data),
      anomalies: this.detectAnomalies(data),
      correlations: this.findCorrelations(data),
      forecasts: this.generateForecasts(data)
    };

    // Generate recommendations
    const recommendations = [];

    // Inventory optimization
    if (analysis.correlations.inventorySales > 0.7) {
      const stockoutRisk = this.calculateStockoutRisk(data.inventory);
      if (stockoutRisk.probability > 0.3) {
        recommendations.push({
          id: 'inv-001',
          type: 'inventory_optimization',
          title: 'Increase Safety Stock Levels',
          description: `High correlation (${analysis.correlations.inventorySales}) between inventory and sales with ${(stockoutRisk.probability * 100).toFixed(0)}% stockout risk`,
          action: {
            type: 'adjust_inventory',
            parameters: {
              increase: stockoutRisk.recommendedIncrease,
              products: stockoutRisk.atRiskProducts
            }
          },
          impact: {
            revenue: stockoutRisk.potentialRevenueLoss * -1, // Prevent loss
            cost: stockoutRisk.recommendedIncrease * data.inventory.avgCost,
            timeframe: '30 days',
            confidence: this.calculateConfidence(analysis)
          },
          confidence: 0.85,
          priority: this.calculatePriority(stockoutRisk.potentialRevenueLoss),
          supportingData: {
            historicalStockouts: stockoutRisk.history,
            correlationChart: analysis.correlations.chart,
            forecast: analysis.forecasts.inventory
          }
        });
      }
    }

    // Marketing ROI optimization
    const campaignROI = this.analyzeCampaignROI(data.marketing);
    const underperforming = campaignROI.filter(c => c.roi < 1.5);
    if (underperforming.length > 0) {
      recommendations.push({
        id: 'mkt-001',
        type: 'marketing_optimization',
        title: 'Reallocate Marketing Budget',
        description: `${underperforming.length} campaigns below ROI threshold`,
        action: {
          type: 'reallocate_budget',
          parameters: {
            from: underperforming.map(c => c.id),
            to: campaignROI.filter(c => c.roi > 3).map(c => c.id),
            amount: underperforming.reduce((sum, c) => sum + c.budget, 0)
          }
        },
        impact: {
          revenue: this.calculateReallocationImpact(campaignROI),
          cost: 0, // Budget neutral
          timeframe: '14 days',
          confidence: 0.72
        },
        confidence: 0.72,
        priority: 'medium',
        supportingData: {
          campaignPerformance: campaignROI,
          historicalROI: data.marketing.historical
        }
      });
    }

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aScore = priorityWeight[a.priority] * a.confidence;
      const bScore = priorityWeight[b.priority] * b.confidence;
      return bScore - aScore;
    });
  },

  calculateConfidence(analysis: Analysis): number {
    const weights = {
      dataCompleteness: 0.3,
      historicalAccuracy: 0.3,
      correlationStrength: 0.2,
      trendStability: 0.2
    };

    return (
      analysis.dataCompleteness * weights.dataCompleteness +
      analysis.historicalAccuracy * weights.historicalAccuracy +
      Math.abs(analysis.correlationStrength) * weights.correlationStrength +
      analysis.trendStability * weights.trendStability
    );
  }
};

// ❌ WRONG: Vague recommendations without metrics
export const badDecisionSupport = {
  getRecommendations(data) {
    return [
      { text: "Sales are down, consider marketing" }, // No actionable steps
      { text: "Inventory might be too high" } // No confidence or impact
    ];
  }
};
```

### Why These Patterns Matter:
- Confidence scoring: Enables risk assessment
- Impact quantification: Justifies decisions
- Priority ranking: Focuses executive attention

## 5. 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I understand decision support vs data display
- [ ] I know the 85% test pass rate target
- [ ] I know when to commit (after each feature)
- [ ] I know how to calculate confidence scores

### Technical Understanding:
- [ ] I understand recommendation algorithms
- [ ] I know impact assessment methods
- [ ] I understand priority ranking systems
- [ ] I know anomaly detection patterns

### Communication Understanding:
- [ ] I know to update `/shared/progress/decision-support.md`
- [ ] I know the commit message format
- [ ] I know what to document for handoff

⚠️ If ANY box is unchecked, re-read the requirements

## 6. 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Test Pass Rate: ≥85% (60/70 tests)
- TypeScript: Zero compilation errors
- All recommendations have confidence scores
- All recommendations have impact assessments
- Priority ranking implemented

### Target Excellence Criteria:
- Test Pass Rate: 100%
- Recommendation accuracy: >75%
- Confidence calibration: ±10%
- Real-time recommendation updates

### How to Measure:
```bash
# Capture metrics
npm run test:features:decision 2>&1 | tee test-results.txt
PASS_RATE=$(grep -oE "[0-9]+ passing" test-results.txt | grep -oE "[0-9]+")

# Test recommendation accuracy
npm run validate:recommendations -- --historical-data

echo "Metrics:"
echo "  Pass Rate: $PASS_RATE/70"
echo "  Accuracy: $(npm run accuracy:recommendations)"
echo "  TypeScript: $(npx tsc --noEmit 2>&1 | grep -c "error TS")"
```

## 7. 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Feature:
1. **RUN TESTS**: `npm run test:features:decision`
2. **VALIDATE ACCURACY**: Check recommendation quality
3. **TEST CONFIDENCE**: Verify scoring calibration
4. **COMMIT PROGRESS**: Detailed commit message
5. **UPDATE PROGRESS**: Write to progress files

### Commit Message Template:
```bash
git add -A
git commit -m "feat(decision-support): Implement inventory optimization recommendations

Test Results:
- Tests: 18/20 passing (90%)
- TypeScript: Clean
- Coverage: 88%
- Accuracy: 78% on test data

Implementation:
- Stockout risk assessment algorithm
- Safety stock recommendations
- Impact calculation with confidence scoring
- Priority ranking by potential revenue loss

Algorithms:
- Monte Carlo simulation for risk assessment
- Linear regression for trend analysis
- Confidence intervals for scoring

Agent: decision-support
Cycle: 1/5
Phase: GREEN"
```

### Validation Checkpoints:
- [ ] After each algorithm → Test accuracy
- [ ] Verify confidence calibration → Statistical test
- [ ] Test with edge cases → Resilience
- [ ] Before handoff → Full validation

## 8. 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: Inventory Optimization Recommendations ==="
echo "  Timestamp: $(date)"
echo "  Target: Generate actionable inventory decisions"

# During work
echo "  ✓ Implemented stockout risk assessment"
echo "  ✓ Created safety stock calculator"
echo "  ✓ Added confidence scoring (85% confidence)"
echo "  ✓ Quantified impact: $45K potential savings"

# After completion
echo "✅ Completed: Inventory Optimization"
echo "  Recommendations generated: 5"
echo "  Average confidence: 82%"
echo "  Tests: 18/20 passing (90%)"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /shared/progress/decision-support.md
    echo "$1"  # Also echo to console
}

log_progress "🚀 Starting inventory optimization feature"
log_progress "📊 Implemented Monte Carlo risk simulation"
log_progress "💡 Generated 5 recommendations with 82% avg confidence"
log_progress "🧪 Tests: 18/20 passing"
log_progress "✅ Feature complete, committing"
```

### Status File Updates:
```bash
update_status() {
    echo "{
      \"agent\": \"decision-support\",
      \"currentFeature\": \"$1\",
      \"recommendationsGenerated\": $2,
      \"avgConfidence\": $3,
      \"testsPass\": $4,
      \"testsTotal\": 70,
      \"status\": \"active\",
      \"lastUpdate\": \"$(date -Iseconds)\"
    }" > /shared/status/decision-support.json
}

update_status "inventory-optimization" 5 0.82 18
```

## 9. 🎯 Mission

Your mission is to implement advanced decision support features that transform executive data into actionable recommendations with confidence scores and impact assessments, achieving 85% test pass rate.

### Scope:
- IN SCOPE: Recommendations, confidence scoring, impact assessment, anomaly detection
- OUT OF SCOPE: UI implementation, data fetching, basic analytics

### Success Definition:
You succeed when all decision support features generate accurate, actionable recommendations with ≥85% test pass rate.

## 10. 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. Recommendation Engine Core
```typescript
// src/services/decision/recommendationEngine.ts
export class RecommendationEngine {
  private readonly thresholds = {
    stockoutRisk: 0.3,
    roiMinimum: 1.5,
    correlationSignificant: 0.7,
    anomalyZScore: 3
  };

  async generateRecommendations(
    data: ExecutiveData,
    options: RecommendationOptions = {}
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Run all analyzers in parallel
    const analyses = await Promise.all([
      this.analyzeInventory(data.inventory),
      this.analyzeMarketing(data.marketing),
      this.analyzeOperations(data.operations),
      this.analyzeFinancials(data.financials),
      this.analyzeCustomers(data.customers)
    ]);

    // Flatten and filter recommendations
    const allRecommendations = analyses.flat()
      .filter(r => r.confidence >= (options.minConfidence || 0.6));

    // Rank by business impact
    return this.rankByPriority(allRecommendations);
  }

  private async analyzeInventory(inventory: InventoryData): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Stockout risk analysis
    const stockoutRisk = this.calculateStockoutRisk(inventory);
    if (stockoutRisk.probability > this.thresholds.stockoutRisk) {
      recommendations.push(this.createStockoutRecommendation(stockoutRisk));
    }

    // Overstock analysis
    const overstockItems = this.identifyOverstock(inventory);
    if (overstockItems.length > 0) {
      recommendations.push(this.createOverstockRecommendation(overstockItems));
    }

    // Turnover optimization
    const slowMoving = this.identifySlowMoving(inventory);
    if (slowMoving.length > 0) {
      recommendations.push(this.createTurnoverRecommendation(slowMoving));
    }

    return recommendations;
  }

  private calculateStockoutRisk(inventory: InventoryData): StockoutRisk {
    // Monte Carlo simulation for risk assessment
    const simulations = 10000;
    let stockoutCount = 0;

    for (let i = 0; i < simulations; i++) {
      const demandSimulation = this.simulateDemand(inventory.historicalDemand);
      const leadTimeSimulation = this.simulateLeadTime(inventory.leadTimes);
      
      if (this.willStockout(inventory.current, demandSimulation, leadTimeSimulation)) {
        stockoutCount++;
      }
    }

    const probability = stockoutCount / simulations;
    const potentialLoss = this.calculatePotentialLoss(inventory, probability);
    const recommendedIncrease = this.calculateSafetyStock(inventory, probability);

    return {
      probability,
      potentialLoss,
      recommendedIncrease,
      atRiskProducts: this.identifyAtRiskProducts(inventory),
      confidence: this.calculateSimulationConfidence(simulations, inventory.dataQuality)
    };
  }

  private calculateConfidence(
    dataQuality: number,
    algorithmAccuracy: number,
    historicalSuccess: number
  ): number {
    const weights = { data: 0.4, algorithm: 0.3, history: 0.3 };
    return (
      dataQuality * weights.data +
      algorithmAccuracy * weights.algorithm +
      historicalSuccess * weights.history
    );
  }

  private calculateImpact(recommendation: Partial<Recommendation>): Impact {
    return {
      revenue: recommendation.revenueImpact || 0,
      cost: recommendation.costImpact || 0,
      efficiency: recommendation.efficiencyImpact || 0,
      risk: recommendation.riskReduction || 0,
      timeframe: recommendation.timeframe || '30 days',
      confidence: recommendation.impactConfidence || 0.7
    };
  }
}
```

#### 2. Anomaly Detection System
- Statistical anomaly detection
- Pattern-based anomalies
- Predictive anomalies
- Alert generation

#### 3. Impact Assessment Engine
- Revenue impact calculation
- Cost-benefit analysis
- Risk quantification
- ROI projections

#### 4. Priority Ranking System
- Multi-criteria scoring
- Executive preference learning
- Dynamic weight adjustment
- Urgency factors

#### 5. Recommendation Monitoring
- Track recommendation outcomes
- Adjust confidence based on results
- Learn from decisions
- Continuous improvement

### Task Checklist:
- [ ] Recommendation Engine → TEST → COMMIT
- [ ] Anomaly Detection → TEST → COMMIT
- [ ] Impact Assessment → TEST → COMMIT
- [ ] Priority Ranking → TEST → COMMIT
- [ ] Monitoring System → TEST → COMMIT

## 11. ✅ Test Requirements

### Test Coverage Requirements:
- Minimum tests per feature: 14
- Total test count target: 70
- Coverage requirement: 85%

### Test Patterns:
```typescript
describe('Recommendation Engine', () => {
  it('should generate recommendations with confidence scores', async () => {
    const mockData = generateExecutiveData();
    const engine = new RecommendationEngine();
    
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
    
    // All confidence scores between 0 and 1
    recommendations.forEach(rec => {
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('should rank recommendations by priority and confidence', async () => {
    const recommendations = await engine.generateRecommendations(mockData);
    
    // Verify sorting
    for (let i = 1; i < recommendations.length; i++) {
      const prevScore = getPriorityScore(recommendations[i - 1]);
      const currScore = getPriorityScore(recommendations[i]);
      expect(prevScore).toBeGreaterThanOrEqual(currScore);
    }
  });

  it('should calculate accurate stockout risk', () => {
    const inventory = generateInventoryData({ 
      currentStock: 100,
      dailyDemand: 20,
      leadTime: 7
    });
    
    const risk = engine.calculateStockoutRisk(inventory);
    
    expect(risk.probability).toBeCloseTo(0.35, 1); // 35% risk
    expect(risk.recommendedIncrease).toBeCloseTo(40, 0); // ~40 units
    expect(risk.confidence).toBeGreaterThan(0.8);
  });

  it('should handle incomplete data gracefully', async () => {
    const incompleteData = {
      inventory: null,
      marketing: generateMarketingData(),
      operations: null
    };
    
    const recommendations = await engine.generateRecommendations(incompleteData);
    
    // Should still generate marketing recommendations
    expect(recommendations.some(r => r.type === 'marketing_optimization')).toBe(true);
    // But confidence should be lower due to incomplete data
    expect(Math.max(...recommendations.map(r => r.confidence))).toBeLessThan(0.8);
  });
});

describe('Anomaly Detection', () => {
  it('should detect statistical anomalies', () => {
    const data = generateTimeSeriesData();
    data[50] = data[50] * 5; // Inject anomaly
    
    const anomalies = anomalyDetector.detect(data);
    
    expect(anomalies).toContainEqual(
      expect.objectContaining({
        index: 50,
        type: 'statistical',
        severity: 'high',
        zScore: expect.any(Number)
      })
    );
  });
});
```

### Test Validation:
```bash
# After writing tests
npm run test:features:decision -- --coverage
# Must see:
# - Tests: 60+ passing
# - Coverage: 85%+
```

## 12. 🎯 Milestone Validation Protocol

### Milestone 1: Core Engine
- [ ] Complete: Recommendation engine
- [ ] Tests: ≥14 passing
- [ ] Confidence: Calibrated
- [ ] Commit: With metrics

### Milestone 2: Anomaly Detection
- [ ] Complete: Anomaly algorithms
- [ ] Tests: ≥28 total passing
- [ ] Accuracy: >75%
- [ ] Commit: With metrics

### Milestone 3: Impact Assessment
- [ ] Complete: Impact calculations
- [ ] Tests: ≥42 total passing
- [ ] ROI: Quantified
- [ ] Commit: With metrics

### Milestone 4: Priority System
- [ ] Complete: Ranking algorithm
- [ ] Tests: ≥56 total passing
- [ ] Sorting: Validated
- [ ] Commit: With metrics

### Milestone 5: Monitoring
- [ ] Complete: Feedback loop
- [ ] Tests: ≥70 total passing (85%+)
- [ ] Learning: Implemented
- [ ] Final commit: With summary
- [ ] Handoff: Complete

## 13. 🔄 Self-Improvement Protocol

### After Each Feature:
1. **Measure**: Recommendation accuracy
2. **Calibrate**: Confidence scores
3. **Optimize**: Algorithm performance
4. **Validate**: Impact predictions
5. **Document**: Decision patterns

### Accuracy Validation:
```bash
# Test against historical data
npm run validate:recommendations -- --historical

echo "Validation Results:"
echo "  Accuracy: $ACCURACY%"
echo "  Precision: $PRECISION"
echo "  Recall: $RECALL"
echo "  F1 Score: $F1"

if [ "$ACCURACY" -lt 75 ]; then
  echo "⚠️ Low accuracy - tuning algorithms"
  npm run tune:algorithms
fi
```

### Continuous Improvement:
- Track recommendation outcomes
- Adjust confidence calibration
- Refine impact calculations

## 14. 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Capture baseline
BASELINE_ACCURACY=$(npm run test:accuracy 2>&1 | grep "Accuracy")
BASELINE_TESTS=$(npm run test:features:decision 2>&1 | grep -oE "[0-9]+ passing")

echo "Baseline: $BASELINE_TESTS tests, $BASELINE_ACCURACY"

# After changes
NEW_ACCURACY=$(npm run test:accuracy 2>&1 | grep "Accuracy")
NEW_TESTS=$(npm run test:features:decision 2>&1 | grep -oE "[0-9]+ passing")

# Validate no regression
if [ "$NEW_TESTS" -lt "$BASELINE_TESTS" ]; then
    echo "❌ REGRESSION: Tests decreased"
    git reset --hard HEAD
    exit 1
fi

# Check accuracy didn't drop significantly
if [ "$NEW_ACCURACY" -lt $((BASELINE_ACCURACY - 5)) ]; then
    echo "❌ REGRESSION: Accuracy dropped >5%"
    git reset --hard HEAD
    exit 1
fi
```

### Regression Rules:
- NEVER reduce recommendation accuracy
- NEVER break confidence calibration
- ALWAYS maintain algorithm performance

## 15. ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- Include confidence scores: Every recommendation
- Quantify impact: Revenue, cost, risk
- Provide supporting data: Evidence for decisions
- Use statistical methods: Not arbitrary thresholds

### ❌ NEVER:
- Generate vague recommendations: Must be actionable
- Skip confidence calculation: Always required
- Hard-code thresholds: Use adaptive algorithms
- Ignore edge cases: Handle incomplete data

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| Low confidence | Show with warning | Hide | Transparency |
| Missing data | Lower confidence | Skip analysis | Resilience |
| Multiple options | Rank by impact | Random order | Value focus |
| Uncertainty | Range estimate | Point estimate | Honesty |

## 16. 🔄 Communication

### Required Files to Update:
- Progress: `/shared/progress/decision-support.md`
  - Update after EVERY feature
  - Include accuracy metrics
  
- Status: `/shared/status/decision-support.json`
  - Update recommendation count
  - Include confidence averages
  
- Test Results: `/shared/test-results/decision-support-latest.txt`
  - Full test output
  - Accuracy validation
  
- Handoff: `/shared/handoffs/decision-support-complete.md`
  - Algorithm documentation
  - Tuning parameters

### Update Frequency:
- Console: Continuously
- Progress: Every algorithm
- Status: Every feature
- Tests: Every test run
- Handoff: On completion

## 17. 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /shared/handoffs/decision-support-complete.md << EOF
# Decision Support Complete

## Summary
- Start: $START_TIME
- End: $END_TIME
- Duration: $DURATION
- Features Completed: 5/5

## Features Implemented

### Recommendation Engine
- Algorithms: Monte Carlo, Linear Regression, Correlation Analysis
- Recommendations Generated: 127 in testing
- Average Confidence: 78%
- Tests: 14/14 passing

### Anomaly Detection
- Methods: Z-score, Isolation Forest, Pattern Matching
- Anomalies Detected: 95% accuracy
- False Positive Rate: 8%
- Tests: 13/14 passing

### Impact Assessment
- Calculations: ROI, NPV, Risk-adjusted Returns
- Accuracy: ±12% on historical data
- Confidence Calibration: Well-calibrated (Brier score: 0.18)
- Tests: 14/14 passing

### Priority Ranking
- Algorithm: Multi-criteria weighted scoring
- Factors: Impact, Confidence, Urgency, Risk
- Consistency: 94% agreement with expert ranking
- Tests: 12/14 passing

### Monitoring System
- Feedback Loop: Implemented
- Learning Rate: 0.03 improvement per cycle
- Adaptation: Automatic threshold adjustment
- Tests: 13/14 passing

## Test Results
- Total: 66/70 tests (94.3%)
- TypeScript: Clean
- Coverage: 91%

## Recommendation Categories
1. Inventory Optimization (23 recommendations)
2. Marketing Budget Reallocation (18 recommendations)
3. Operational Efficiency (31 recommendations)
4. Revenue Opportunities (27 recommendations)
5. Risk Mitigation (28 recommendations)

## Algorithm Performance
| Algorithm | Accuracy | Precision | Recall | F1 Score |
|-----------|----------|-----------|--------|----------|
| Stockout Risk | 82% | 0.85 | 0.79 | 0.82 |
| ROI Prediction | 76% | 0.78 | 0.74 | 0.76 |
| Anomaly Detection | 95% | 0.92 | 0.97 | 0.94 |
| Impact Assessment | 88% | 0.86 | 0.90 | 0.88 |

## Confidence Calibration
- Average Confidence: 0.78
- Actual Accuracy: 0.81
- Calibration Error: 0.03 (excellent)

## Key Algorithms
\`\`\`typescript
// Monte Carlo Stockout Risk
function calculateStockoutRisk(inventory, simulations = 10000) {
  // Implementation details...
}

// Anomaly Detection
function detectAnomalies(data, threshold = 3) {
  // Z-score based detection...
}

// Impact Assessment
function assessImpact(recommendation, historicalData) {
  // ROI calculation with confidence intervals...
}
\`\`\`

## Tuning Parameters
- Stockout Risk Threshold: 0.3
- ROI Minimum: 1.5
- Anomaly Z-Score: 3.0
- Confidence Minimum: 0.6

## Known Issues
- Large dataset processing >10K items slow
- Seasonal adjustment needs refinement

## Recommendations for Production
1. Implement A/B testing for recommendations
2. Add feedback mechanism for users
3. Consider ML model for pattern learning
4. Cache frequently used calculations
EOF
```

## 18. 🚨 Common Issues & Solutions

### Issue: Confidence scores always high/low
**Symptoms**: All recommendations have similar confidence
**Cause**: Poor calibration
**Solution**:
```typescript
// Calibrate against historical outcomes
function calibrateConfidence(rawConfidence: number, historicalAccuracy: number): number {
  // Platt scaling
  const A = -1.5;
  const B = 0.5;
  return 1 / (1 + Math.exp(A * rawConfidence + B));
}
```

### Issue: Recommendations not actionable
**Symptoms**: Vague or generic recommendations
**Cause**: Missing specific parameters
**Solution**:
```typescript
// Always include specific actions
interface ActionableRecommendation {
  action: {
    type: string;
    parameters: Record<string, any>;
    steps: string[];
    timeline: string;
  };
}
```

### Issue: Impact calculations unrealistic
**Symptoms**: Huge ROI predictions
**Cause**: Not accounting for constraints
**Solution**:
```typescript
// Apply realistic constraints
function calculateImpact(base: number, improvement: number): number {
  const maxImprovement = 0.3; // 30% max
  const constrainedImprovement = Math.min(improvement, maxImprovement);
  return base * (1 + constrainedImprovement);
}
```

### Quick Diagnostics:
```bash
# Check confidence calibration
npm run test:calibration -- --verbose

# Validate recommendations
npm run validate:recommendations -- --sample=100

# Test edge cases
npm run test:edge-cases -- --feature=decision
```

## 19. 📚 Study These Examples

### Before starting, study:
1. **src/services/analytics/forecastingService.ts** - Prediction patterns
2. **src/utils/statistics/confidence.ts** - Confidence calculations
3. **src/services/recommendations/base.ts** - Recommendation structure

### Key Patterns to Notice:
- In forecastingService: Time series analysis methods
- In confidence: Statistical confidence intervals
- In base: Recommendation data structure

### Copy These Patterns:
```typescript
// Confidence interval calculation
function confidenceInterval(mean: number, stdDev: number, n: number, confidence = 0.95): [number, number] {
  const zScore = confidence === 0.95 ? 1.96 : 2.58;
  const margin = zScore * (stdDev / Math.sqrt(n));
  return [mean - margin, mean + margin];
}

// Monte Carlo simulation
function monteCarloSimulation(model: SimulationModel, iterations = 10000): SimulationResult {
  const results = [];
  for (let i = 0; i < iterations; i++) {
    const scenario = generateScenario(model);
    const outcome = runSimulation(scenario);
    results.push(outcome);
  }
  return analyzeResults(results);
}

// Priority scoring
function calculatePriority(impact: number, confidence: number, urgency: number): Priority {
  const score = (impact * 0.5) + (confidence * 0.3) + (urgency * 0.2);
  if (score > 0.7) return 'high';
  if (score > 0.4) return 'medium';
  return 'low';
}
```

---

Remember: You're building the DECISION layer that transforms data into actionable executive recommendations. Focus on confidence scoring, impact assessment, and achieving 85% test pass rate. Every recommendation must be specific, quantified, and actionable!