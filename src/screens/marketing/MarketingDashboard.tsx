import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { CampaignCard } from '../../components/marketing/CampaignCard';
import { Campaign, MarketingAnalytics } from '../../types/marketing.types';
import { marketingService } from '../../services/marketing/marketingService';
import { MarketingCampaign, MarketingContent, CampaignFilter, Product, ProductBundle, WorkflowState, WorkflowConfig, WorkflowResult, WorkflowContext, CalendarEvent } from '@/schemas/marketing';


interface MarketingDashboardProps {
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

export const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ navigation }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<MarketingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      
      const [campaignsData, analyticsData] = await Promise.all([
        marketingService.getCampaigns(),
        marketingService.getAnalytics(),
      ]);
      
      setCampaigns(campaignsData);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleCampaignPress = (campaign: Campaign) => {
    navigation?.navigate('CampaignDetails', { campaignId: campaign.id });
  };

  if (loading && !refreshing) {
    return (
      <View testID="loading-indicator">
        <LoadingState message="Loading marketing data..." />
      </View>
    );
  }

  if (error && !refreshing) {
    return <ErrorState error={error} onRetry={() => loadData()} />;
  }

  return (
    <ScrollView 
      testID="campaign-list"
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      accessible
      accessibilityLabel="Marketing Dashboard"
    >
      {analytics && (
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.totalCampaigns}</Text>
              <Text style={styles.metricLabel}>Total Campaigns</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.activeCampaigns}</Text>
              <Text style={styles.metricLabel}>Active Campaigns</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.totalContent}</Text>
              <Text style={styles.metricLabel}>Total Content</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.publishedContent}</Text>
              <Text style={styles.metricLabel}>Published</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.campaignsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Marketing Dashboard</Text>
          <TouchableOpacity 
            testID="create-campaign-button"
            style={styles.createButton}
            onPress={() => navigation?.navigate('CampaignPlanner')}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Create new campaign"
          >
            <Text style={styles.createButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
        
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No campaigns yet</Text>
            <Text style={styles.emptySubtext}>Create your first campaign to get started</Text>
          </View>
        ) : (
          campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onPress={handleCampaignPress}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  metricsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
  campaignsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  createButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});
