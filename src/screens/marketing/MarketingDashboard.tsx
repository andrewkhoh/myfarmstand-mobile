import React from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMarketingDashboard } from '@/hooks/marketing/useMarketingDashboard';
import { CampaignCard } from '@/components/marketing/CampaignCard';
import { ContentCard } from '@/components/marketing/ContentCard';
import { QuickActions } from '@/components/marketing/QuickActions';
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from '@/components/common';

export function MarketingDashboard() {
  const navigation = useNavigation();
  const {
    campaigns,
    content,
    metrics,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useMarketingDashboard();

  // Handle loading state
  if (isLoading && !isRefetching) {
    return <LoadingState testID="dashboard-loading" />;
  }

  // Handle error state
  if (error && !campaigns && !content) {
    return (
      <ErrorState
        testID="dashboard-error"
        error={error}
        message="Unable to load dashboard"
        onRetry={refetch}
      />
    );
  }

  // Handle empty state
  if (!campaigns?.length && !content?.length) {
    return (
      <EmptyState
        testID="dashboard-empty"
        message="No marketing data yet"
        actionLabel="Create Campaign"
        onAction={() => navigation.navigate('CreateCampaign' as never)}
      />
    );
  }

  return (
    <ScreenContainer testID="marketing-dashboard">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            testID="pull-to-refresh"
          />
        }
      >
        {/* Metrics Overview */}
        {metrics && (
          <View style={styles.metricsSection} testID="metrics-overview">
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{metrics.activeCampaigns}</Text>
                <Text style={styles.metricLabel}>Active Campaigns</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{metrics.publishedContent}</Text>
                <Text style={styles.metricLabel}>Published Content</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{metrics.avgConversionRate.toFixed(1)}%</Text>
                <Text style={styles.metricLabel}>Conversion Rate</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>${(metrics.totalRevenue / 1000).toFixed(0)}K</Text>
                <Text style={styles.metricLabel}>Revenue</Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Campaigns Section */}
        {campaigns && campaigns.length > 0 && (
          <View style={styles.section} testID="campaign-section">
            <Text style={styles.sectionTitle}>Active Campaigns</Text>
            {campaigns.map((campaign, index) => (
              <CampaignCard
                key={campaign.id}
                testID={`campaign-card-${index}`}
                campaign={campaign}
                onPress={() => navigation.navigate('CampaignDetails' as never, { id: campaign.id } as never)}
              />
            ))}
          </View>
        )}

        {/* Recent Content Section */}
        {content && content.length > 0 && (
          <View style={styles.section} testID="content-section">
            <Text style={styles.sectionTitle}>Recent Content</Text>
            {content.map((item, index) => (
              <ContentCard
                key={item.id}
                testID={`content-card-${index}`}
                content={item}
                onPress={() => navigation.navigate('ContentDetails' as never, { id: item.id } as never)}
              />
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <QuickActions
          onCreateContent={() => navigation.navigate('CreateContent' as never)}
          onCreateCampaign={() => navigation.navigate('CreateCampaign' as never)}
          onCreateBundle={() => navigation.navigate('CreateBundle' as never)}
          onViewAnalytics={() => navigation.navigate('MarketingAnalytics' as never)}
        />
        
        {/* Accessibility */}
        <View
          accessible
          accessibilityRole="navigation"
          accessibilityLabel="Marketing Dashboard"
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsSection: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
});