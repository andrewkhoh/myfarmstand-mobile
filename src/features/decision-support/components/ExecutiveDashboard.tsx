/**
 * Executive Dashboard Component - Decision Support Integration
 * Following architectural patterns with role-based access control
 */

import React, { useState } from 'react';
import { View, Text as RNText, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  useGenerateRecommendations,
  useLearningMetrics,
  useTrackOutcome,
  useProcessFeedback,
  type ExecutiveData,
  type RecommendationOptions
} from '../index';

interface ExecutiveDashboardProps {
  executiveData?: ExecutiveData;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ executiveData }) => {

  // Decision support hooks with role-based access control
  const {
    recommendations,
    isLoading: recommendationsLoading,
    isError: recommendationsError,
    error: recommendationsErrorDetail,
    refetch: refetchRecommendations
  } = useGenerateRecommendations(executiveData, {
    minConfidence: 0.6,
    maxRecommendations: 10
  } as RecommendationOptions);

  const {
    metrics,
    isLoading: metricsLoading,
    isError: metricsError
  } = useLearningMetrics();

  const trackOutcomeMutation = useTrackOutcome();
  const processFeedbackMutation = useProcessFeedback();

  // Handle permission denied or authentication errors
  if (recommendationsError &&
      recommendationsErrorDetail &&
      'code' in recommendationsErrorDetail &&
      recommendationsErrorDetail.code === 'PERMISSION_DENIED') {
    return (
      <View style={styles.errorContainer}>
        <RNText style={styles.errorTitle}>Access Denied</RNText>
        <RNText style={styles.errorMessage}>
          {'userMessage' in recommendationsErrorDetail
            ? recommendationsErrorDetail.userMessage
            : 'You need executive permissions to access this feature'}
        </RNText>
      </View>
    );
  }

  if (recommendationsError &&
      recommendationsErrorDetail &&
      'code' in recommendationsErrorDetail &&
      recommendationsErrorDetail.code === 'AUTHENTICATION_REQUIRED') {
    return (
      <View style={styles.errorContainer}>
        <RNText style={styles.errorTitle}>Authentication Required</RNText>
        <RNText style={styles.errorMessage}>
          {'userMessage' in recommendationsErrorDetail
            ? recommendationsErrorDetail.userMessage
            : 'Please sign in to access executive features'}
        </RNText>
      </View>
    );
  }

  const handleTrackOutcome = async (recommendationId: string, success: boolean) => {
    try {
      await trackOutcomeMutation.mutateAsync({
        recommendationId,
        outcome: { success, timestamp: new Date().toISOString() }
      });
      Alert.alert('Success', 'Outcome tracked successfully');
    } catch (error: any) {
      Alert.alert('Error', error?.userMessage || 'Failed to track outcome');
    }
  };

  const handleProvideFeedback = async (recommendationId: string, useful: boolean) => {
    try {
      await processFeedbackMutation.mutateAsync({
        recommendationId,
        useful,
        outcome: useful ? 'positive' : 'negative',
        timestamp: new Date().toISOString()
      });
      Alert.alert('Success', 'Feedback submitted successfully');
    } catch (error: any) {
      Alert.alert('Error', error?.userMessage || 'Failed to submit feedback');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <RNText style={styles.title}>Executive Decision Support Dashboard</RNText>

      {/* Learning Metrics Section */}
      <View style={styles.section}>
        <RNText style={styles.sectionTitle}>Learning Metrics</RNText>
        {metricsLoading ? (
          <RNText style={styles.loadingRNText}>Loading metrics...</RNText>
        ) : metricsError ? (
          <RNText style={styles.errorRNText}>Failed to load metrics</RNText>
        ) : metrics ? (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <RNText style={styles.metricValue}>{(metrics.accuracy * 100).toFixed(1)}%</RNText>
              <RNText style={styles.metricLabel}>Accuracy</RNText>
            </View>
            <View style={styles.metricCard}>
              <RNText style={styles.metricValue}>{metrics.totalFeedback}</RNText>
              <RNText style={styles.metricLabel}>Total Feedback</RNText>
            </View>
            <View style={styles.metricCard}>
              <RNText style={styles.metricValue}>{(metrics.successRate * 100).toFixed(1)}%</RNText>
              <RNText style={styles.metricLabel}>Success Rate</RNText>
            </View>
            <View style={styles.metricCard}>
              <RNText style={styles.metricValue}>{(metrics.improvement * 100).toFixed(1)}%</RNText>
              <RNText style={styles.metricLabel}>Improvement</RNText>
            </View>
          </View>
        ) : null}
      </View>

      {/* Recommendations Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <RNText style={styles.sectionTitle}>AI Recommendations</RNText>
          <TouchableOpacity
            onPress={() => refetchRecommendations()}
            style={styles.refreshButton}
          >
            <RNText style={styles.refreshButtonRNText}>Refresh</RNText>
          </TouchableOpacity>
        </View>

        {recommendationsLoading ? (
          <RNText style={styles.loadingRNText}>Generating recommendations...</RNText>
        ) : recommendationsError ? (
          <View style={styles.errorContainer}>
            <RNText style={styles.errorRNText}>Failed to load recommendations</RNText>
            {recommendationsErrorDetail &&
             'userMessage' in recommendationsErrorDetail &&
             recommendationsErrorDetail.userMessage && (
              <RNText style={styles.errorMessage}>{recommendationsErrorDetail.userMessage}</RNText>
            )}
          </View>
        ) : recommendations.length === 0 ? (
          <RNText style={styles.emptyRNText}>
            {executiveData ? 'No recommendations available' : 'Provide executive data to generate recommendations'}
          </RNText>
        ) : (
          <View style={styles.recommendationsList}>
            {recommendations.map((recommendation: any) => (
              <View key={recommendation.id} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <RNText style={styles.recommendationTitle}>{recommendation.title}</RNText>
                  <RNText style={[
                    styles.priorityBadge,
                    recommendation.priority === 'high' ? styles.priorityHigh :
                    recommendation.priority === 'medium' ? styles.priorityMedium :
                    styles.priorityLow
                  ]}>
                    {recommendation.priority.toUpperCase()}
                  </RNText>
                </View>

                <RNText style={styles.recommendationDescription}>
                  {recommendation.description}
                </RNText>

                <View style={styles.recommendationStats}>
                  <RNText style={styles.statRNText}>
                    Confidence: {(recommendation.confidence * 100).toFixed(0)}%
                  </RNText>
                  <RNText style={styles.statRNText}>
                    Type: {recommendation.type.replace('_', ' ')}
                  </RNText>
                </View>

                {recommendation.impact && (
                  <View style={styles.impactContainer}>
                    <RNText style={styles.impactTitle}>Expected Impact:</RNText>
                    {recommendation.impact.revenue && (
                      <RNText style={styles.impactRNText}>
                        Revenue: ${recommendation.impact.revenue.toLocaleString()}
                      </RNText>
                    )}
                    {recommendation.impact.cost && (
                      <RNText style={styles.impactRNText}>
                        Cost: ${recommendation.impact.cost.toLocaleString()}
                      </RNText>
                    )}
                    <RNText style={styles.impactRNText}>
                      Timeframe: {recommendation.impact.timeframe}
                    </RNText>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.successButton]}
                    onPress={() => handleTrackOutcome(recommendation.id, true)}
                  >
                    <RNText style={styles.actionButtonRNText}>Mark Successful</RNText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.warningButton]}
                    onPress={() => handleTrackOutcome(recommendation.id, false)}
                  >
                    <RNText style={styles.actionButtonRNText}>Mark Failed</RNText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.infoButton]}
                    onPress={() => handleProvideFeedback(recommendation.id, true)}
                  >
                    <RNText style={styles.actionButtonRNText}>Helpful</RNText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  refreshButtonRNText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  priorityHigh: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  priorityMedium: {
    backgroundColor: '#ffc107',
    color: '#212529',
  },
  priorityLow: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  recommendationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statRNText: {
    fontSize: 12,
    color: '#666',
  },
  impactContainer: {
    backgroundColor: '#e7f3ff',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  impactTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  impactRNText: {
    fontSize: 11,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  warningButton: {
    backgroundColor: '#dc3545',
  },
  infoButton: {
    backgroundColor: '#17a2b8',
  },
  actionButtonRNText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingRNText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
  },
  errorRNText: {
    color: '#dc3545',
    textAlign: 'center',
  },
  errorMessage: {
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  emptyRNText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default ExecutiveDashboard;