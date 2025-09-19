/**
 * Historical Order Patterns Component
 * Following @docs/architectural-patterns-and-best-practices.md
 * Pattern: Permission-gated analytics visualization with predictive insights
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { PermissionCheck } from '../role-based/PermissionGate';
import { UserRole } from '../../types/roles';
import { TrendChart } from '../executive/TrendChart';
import {
  useHistoricalOrderAnalysis,
  useSeasonalPatterns,
  usePredictiveInsights
} from '../../hooks/analytics/useHistoricalOrderAnalysis';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { formatCompactNumber, formatPercent } from '../../utils/formatters';

interface HistoricalOrderPatternsProps {
  /** Date range for historical analysis */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Prediction horizon in days */
  predictionHorizon?: number;
  /** Component height */
  height?: number;
  /** Test ID for automation */
  testID?: string;
}

type ViewMode = 'trends' | 'seasonal' | 'predictions';

interface PatternCard {
  type: 'trend' | 'seasonal' | 'prediction';
  title: string;
  value: string;
  confidence: number;
  insight: string;
  color: string;
}

export const HistoricalOrderPatterns: React.FC<HistoricalOrderPatternsProps> = ({
  dateRange,
  predictionHorizon = 30,
  height = 700,
  testID = 'historical-order-patterns'
}) => {
  const { width } = Dimensions.get('window');
  const [viewMode, setViewMode] = useState<ViewMode>('trends');

  // Fetch historical analysis
  const {
    data: historicalData,
    isLoading: isHistoricalLoading,
    error: historicalError,
    isGrowing,
    primaryTrend,
    confidence,
    hasAnomalies,
    keyInsight
  } = useHistoricalOrderAnalysis({
    dateRange: dateRange ? {
      start: dateRange.start.toISOString().split('T')[0],
      end: dateRange.end.toISOString().split('T')[0]
    } : undefined,
    granularity: 'daily',
    includePredictions: true
  });

  // Fetch seasonal patterns
  const {
    data: seasonalData,
    isLoading: isSeasonalLoading,
    bestDay,
    worstDay,
    seasonalStrength,
    recommendedActions
  } = useSeasonalPatterns({
    dateRange: dateRange ? {
      start: dateRange.start.toISOString().split('T')[0],
      end: dateRange.end.toISOString().split('T')[0]
    } : undefined
  });

  // Fetch predictive insights
  const {
    data: predictionsData,
    isLoading: isPredictionsLoading,
    nextWeekOrders,
    nextMonthRevenue,
    predictionConfidence,
    growthForecast
  } = usePredictiveInsights(predictionHorizon, {
    dateRange: dateRange ? {
      start: dateRange.start.toISOString().split('T')[0],
      end: dateRange.end.toISOString().split('T')[0]
    } : undefined
  });

  // Transform historical data for trend chart
  const trendChartData = useMemo(() => {
    if (!historicalData?.dataPoints) return [];

    return historicalData.dataPoints.slice(-30).map((point: any) => ({
      x: new Date(point.date),
      y: point.orders,
      label: new Date(point.date).toLocaleDateString()
    }));
  }, [historicalData]);

  // Transform seasonal data for weekly pattern chart
  const seasonalChartData = useMemo(() => {
    if (!seasonalData?.weekly?.pattern) return [];

    return seasonalData.weekly.pattern.map((point, index) => ({
      x: index,
      y: point.multiplier * 100,
      label: point.period
    }));
  }, [seasonalData]);

  // Create pattern cards for overview
  const patternCards = useMemo((): PatternCard[] => {
    const cards: PatternCard[] = [];

    // Trend card
    if (primaryTrend) {
      cards.push({
        type: 'trend',
        title: 'Primary Trend',
        value: primaryTrend,
        confidence: confidence,
        insight: isGrowing ? 'Business is growing' : 'Consider optimization strategies',
        color: isGrowing ? '#10b981' : '#ef4444'
      });
    }

    // Seasonal card
    if (bestDay && worstDay) {
      cards.push({
        type: 'seasonal',
        title: 'Seasonal Pattern',
        value: `Best: ${bestDay}, Worst: ${worstDay}`,
        confidence: seasonalData?.weekly?.strength || 0,
        insight: `${seasonalStrength} seasonal patterns detected`,
        color: '#3b82f6'
      });
    }

    // Prediction card
    if (nextWeekOrders) {
      cards.push({
        type: 'prediction',
        title: 'Next Week Forecast',
        value: `${formatCompactNumber(nextWeekOrders)} orders`,
        confidence: predictionConfidence,
        insight: `Growth forecast: ${growthForecast}`,
        color: '#8b5cf6'
      });
    }

    return cards;
  }, [
    primaryTrend, confidence, isGrowing, bestDay, worstDay, seasonalStrength,
    seasonalData, nextWeekOrders, predictionConfidence, growthForecast
  ]);

  // Record analytics usage
  React.useEffect(() => {
    if (historicalData) {
      ValidationMonitor.recordPatternSuccess({
        service: 'HistoricalOrderPatterns',
        pattern: 'transformation_schema',
        operation: 'renderHistoricalAnalytics'
      });
    }
  }, [historicalData]);

  const isLoading = isHistoricalLoading || isSeasonalLoading || isPredictionsLoading;

  const renderViewModeContent = () => {
    switch (viewMode) {
      case 'trends':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Order Volume Trends</Text>

            {trendChartData.length > 0 && (
              <View style={styles.chartContainer}>
                <TrendChart
                  data={trendChartData}
                  width={width - 32}
                  height={200}
                  color="#3b82f6"
                  showPoints={true}
                  showLabels={true}
                  title="Daily Orders (Last 30 Days)"
                  testID={`${testID}-trends-chart`}
                />
              </View>
            )}

            {/* Trend Analysis Details */}
            {historicalData?.trends && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>Trend Analysis</Text>

                {Object.entries(historicalData.trends).map(([metric, trendData]) => (
                  <View key={metric} style={styles.trendItem}>
                    <View style={styles.trendHeader}>
                      <Text style={styles.trendMetric}>
                        {metric.charAt(0).toUpperCase() + metric.slice(1)}
                      </Text>
                      <Text style={[
                        styles.trendDirection,
                        { color: getTrendDirectionColor(trendData.direction) }
                      ]}>
                        {getTrendDirectionIcon(trendData.direction)} {trendData.direction.toUpperCase()}
                      </Text>
                    </View>

                    <Text style={styles.trendConfidence}>
                      Confidence: {formatPercent(trendData.confidence)}
                    </Text>

                    <Text style={styles.trendSlope}>
                      Rate of change: {trendData.slope > 0 ? '+' : ''}{trendData.slope.toFixed(2)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'seasonal':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Seasonal Patterns</Text>

            {seasonalChartData.length > 0 && (
              <View style={styles.chartContainer}>
                <TrendChart
                  data={seasonalChartData}
                  width={width - 32}
                  height={200}
                  color="#10b981"
                  showPoints={true}
                  showLabels={false}
                  title="Weekly Pattern Multipliers"
                  testID={`${testID}-seasonal-chart`}
                />
              </View>
            )}

            {/* Seasonal Analysis Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Pattern Insights</Text>

              <View style={styles.seasonalGrid}>
                <View style={styles.seasonalCard}>
                  <Text style={styles.seasonalLabel}>Best Day</Text>
                  <Text style={styles.seasonalValue}>{bestDay || 'N/A'}</Text>
                </View>

                <View style={styles.seasonalCard}>
                  <Text style={styles.seasonalLabel}>Worst Day</Text>
                  <Text style={styles.seasonalValue}>{worstDay || 'N/A'}</Text>
                </View>

                <View style={styles.seasonalCard}>
                  <Text style={styles.seasonalLabel}>Pattern Strength</Text>
                  <Text style={styles.seasonalValue}>{seasonalStrength.toUpperCase()}</Text>
                </View>
              </View>

              {/* Recommended Actions */}
              {recommendedActions.length > 0 && (
                <View style={styles.actionsSection}>
                  <Text style={styles.actionsTitle}>💡 Recommended Actions</Text>
                  {recommendedActions.map((action, index) => (
                    <Text key={index} style={styles.actionItem}>
                      • {action}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        );

      case 'predictions':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Predictive Insights</Text>

            {/* Prediction Summary Cards */}
            <View style={styles.predictionGrid}>
              <View style={styles.predictionCard}>
                <Text style={styles.predictionLabel}>Next Week</Text>
                <Text style={styles.predictionValue}>
                  {nextWeekOrders ? formatCompactNumber(nextWeekOrders) : 'N/A'}
                </Text>
                <Text style={styles.predictionUnit}>orders</Text>
              </View>

              <View style={styles.predictionCard}>
                <Text style={styles.predictionLabel}>Revenue Forecast</Text>
                <Text style={styles.predictionValue}>
                  {nextMonthRevenue ? `$${formatCompactNumber(nextMonthRevenue)}` : 'N/A'}
                </Text>
                <Text style={styles.predictionUnit}>next month</Text>
              </View>

              <View style={styles.predictionCard}>
                <Text style={styles.predictionLabel}>Growth Outlook</Text>
                <Text style={[
                  styles.predictionValue,
                  { color: getGrowthForecastColor(growthForecast) }
                ]}>
                  {growthForecast.toUpperCase()}
                </Text>
                <Text style={styles.predictionUnit}>
                  {formatPercent(predictionConfidence)} confidence
                </Text>
              </View>
            </View>

            {/* Prediction Details */}
            {predictionsData && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>Forecast Breakdown</Text>

                {['nextWeek', 'nextMonth', 'nextQuarter'].map(period => {
                  const predictions = predictionsData[period as keyof typeof predictionsData];
                  if (!Array.isArray(predictions)) return null;

                  return (
                    <View key={period} style={styles.forecastSection}>
                      <Text style={styles.forecastPeriod}>
                        {period.replace('next', 'Next ').replace(/([A-Z])/g, ' $1')}
                      </Text>

                      {predictions.map((pred, index) => (
                        <View key={index} style={styles.forecastItem}>
                          <Text style={styles.forecastMetric}>{pred.metric}</Text>
                          <Text style={styles.forecastValue}>
                            {formatCompactNumber(pred.value)}
                          </Text>
                          <Text style={styles.forecastConfidence}>
                            {formatPercent(pred.confidence)} confidence
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <PermissionCheck
      permissions={['analytics:forecast', 'analytics:view']}
      roles={[UserRole.EXECUTIVE, UserRole.ADMIN]}
      fallback={() => (
        <View style={styles.noAccessContainer} testID={`${testID}-no-access`}>
          <Text style={styles.noAccessText}>
            Historical Analytics requires Executive permissions with forecasting access
          </Text>
        </View>
      )}
      testID={`${testID}-permission-gate`}
    >
      <ScrollView
        style={[styles.container, { height }]}
        testID={testID}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Historical Order Patterns</Text>
          <Text style={styles.subtitle}>
            Deep insights from historical data with predictive analytics
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Analyzing historical patterns...</Text>
          </View>
        ) : historicalError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading historical data</Text>
            <Text style={styles.errorDetails}>{historicalError.message}</Text>
          </View>
        ) : (
          <>
            {/* Pattern Overview Cards */}
            <View style={styles.overviewSection}>
              <Text style={styles.overviewTitle}>Pattern Overview</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.cardScrollView}
              >
                {patternCards.map((card, index) => (
                  <View key={index} style={[styles.patternCard, { borderLeftColor: card.color }]}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardValue}>{card.value}</Text>
                    <Text style={styles.cardInsight}>{card.insight}</Text>
                    <View style={styles.confidenceBar}>
                      <View
                        style={[
                          styles.confidenceFill,
                          {
                            width: `${card.confidence * 100}%`,
                            backgroundColor: card.color
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.confidenceText}>
                      {formatPercent(card.confidence)} confidence
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* View Mode Tabs */}
            <View style={styles.tabsContainer}>
              {[
                { key: 'trends', label: 'Trends' },
                { key: 'seasonal', label: 'Seasonal' },
                { key: 'predictions', label: 'Predictions' }
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    viewMode === tab.key && styles.activeTab
                  ]}
                  onPress={() => setViewMode(tab.key as ViewMode)}
                  testID={`${testID}-tab-${tab.key}`}
                >
                  <Text style={[
                    styles.tabText,
                    viewMode === tab.key && styles.activeTabText
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dynamic Content */}
            {renderViewModeContent()}

            {/* Anomalies Alert */}
            {hasAnomalies && (
              <View style={styles.anomalyAlert}>
                <Text style={styles.anomalyTitle}>⚠️ Anomalies Detected</Text>
                <Text style={styles.anomalyText}>
                  Unusual patterns detected in your order data. Review the trends for potential issues or opportunities.
                </Text>
              </View>
            )}

            {/* Key Insight */}
            {keyInsight && (
              <View style={styles.keyInsightContainer}>
                <Text style={styles.keyInsightTitle}>🔍 Key Insight</Text>
                <Text style={styles.keyInsightText}>{keyInsight}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </PermissionCheck>
  );
};

// Helper functions
const getTrendDirectionColor = (direction: string): string => {
  switch (direction) {
    case 'increasing': return '#10b981';
    case 'decreasing': return '#ef4444';
    case 'stable': return '#6b7280';
    default: return '#6b7280';
  }
};

const getTrendDirectionIcon = (direction: string): string => {
  switch (direction) {
    case 'increasing': return '↗';
    case 'decreasing': return '↘';
    case 'stable': return '→';
    default: return '?';
  }
};

const getGrowthForecastColor = (forecast: string): string => {
  switch (forecast) {
    case 'positive': return '#10b981';
    case 'negative': return '#ef4444';
    case 'stable': return '#6b7280';
    case 'uncertain': return '#f59e0b';
    default: return '#6b7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    padding: 16,
    margin: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorDetails: {
    fontSize: 14,
    color: '#7f1d1d',
  },
  noAccessContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    margin: 16,
    borderRadius: 8,
  },
  noAccessText: {
    fontSize: 16,
    color: '#92400e',
    textAlign: 'center',
  },
  overviewSection: {
    padding: 16,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  cardScrollView: {
    flexDirection: 'row',
  },
  patternCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginRight: 12,
    width: 200,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  cardInsight: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 4,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 10,
    color: '#6b7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  contentSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  trendItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendMetric: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  trendDirection: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  trendConfidence: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  trendSlope: {
    fontSize: 12,
    color: '#6b7280',
  },
  seasonalGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  seasonalCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  seasonalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  seasonalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  actionsSection: {
    marginTop: 16,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  actionItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  predictionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  predictionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  predictionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  predictionUnit: {
    fontSize: 10,
    color: '#6b7280',
  },
  forecastSection: {
    marginBottom: 16,
  },
  forecastPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  forecastItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  forecastMetric: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  forecastValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
  },
  forecastConfidence: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    flex: 1,
  },
  anomalyAlert: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  anomalyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  anomalyText: {
    fontSize: 14,
    color: '#92400e',
  },
  keyInsightContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  keyInsightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  keyInsightText: {
    fontSize: 14,
    color: '#1e40af',
  },
});