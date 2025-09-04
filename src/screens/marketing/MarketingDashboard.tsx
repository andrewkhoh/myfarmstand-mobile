import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMarketingDashboard } from '@/hooks/marketing/useMarketingDashboard';
import { useActiveCampaigns } from '@/hooks/marketing/useActiveCampaigns';
import { usePendingContent } from '@/hooks/marketing/usePendingContent';
import { StatCard } from '@/components/marketing/StatCard';
import { CampaignCard } from '@/components/marketing/CampaignCard';
import { ContentItem } from '@/components/marketing/ContentItem';
import { Section } from '@/components/marketing/Section';
import { FloatingActionButton } from '@/components/marketing/FloatingActionButton';
import { LoadingScreen } from '@/components/marketing/LoadingScreen';
import { ErrorScreen } from '@/components/marketing/ErrorScreen';

export function MarketingDashboard() {
  const navigation = useNavigation<any>();
  const { stats, isLoading, error, refetchAll } = useMarketingDashboard();
  const { campaigns } = useActiveCampaigns();
  const { content } = usePendingContent();
  
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);
  
  if (isLoading && !refreshing) {
    return <LoadingScreen testID="loading-screen" />;
  }
  
  if (error && !stats) {
    return (
      <ErrorScreen
        message="Failed to load dashboard"
        onRetry={refetchAll}
      />
    );
  }
  
  const dashboardStats = stats || {
    activeCampaigns: 0,
    pendingContent: 0,
    totalRevenue: 0,
    conversionRate: 0,
    totalProducts: 0,
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        testID="dashboard-scroll"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <StatCard
            testID="stat-card-campaigns"
            title="Active Campaigns"
            value={String(dashboardStats.activeCampaigns || 0)}
            icon="campaign"
            onPress={() => navigation.navigate('CampaignPlanner')}
          />
          <StatCard
            testID="stat-card-content"
            title="Pending Content"
            value={String(dashboardStats.pendingContent || 0)}
            icon="content"
            onPress={() => navigation.navigate('ProductContent')}
          />
          <StatCard
            testID="stat-card-revenue"
            title="Revenue"
            value={`$${(dashboardStats.totalRevenue || 0).toFixed(2)}`}
            icon="revenue"
            onPress={() => navigation.navigate('MarketingAnalytics')}
          />
        </View>
        
        {/* Additional Stats Row */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Conversion Rate"
            value={`${Math.round((dashboardStats.conversionRate || 0) * 100)}%`}
            icon="percentage"
            onPress={() => navigation.navigate('MarketingAnalytics')}
          />
          <StatCard
            title="Total Products"
            value={String(dashboardStats.totalProducts || 0)}
            icon="products"
            onPress={() => navigation.navigate('BundleManagement')}
          />
        </View>
        
        {/* Active Campaigns List */}
        <Section title="Active Campaigns">
          {campaigns && campaigns.length > 0 ? (
            campaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                testID={`campaign-card-${campaign.id}`}
                campaign={campaign}
                onPress={() => navigation.navigate('CampaignDetail', { 
                  campaignId: campaign.id 
                })}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No active campaigns</Text>
          )}
        </Section>
        
        {/* Content Workflow */}
        <Section title="Content Awaiting Review">
          {content && content.length > 0 ? (
            content.map(item => (
              <ContentItem
                key={item.id}
                testID={`content-item-${item.id}`}
                content={item}
                onPress={() => navigation.navigate('ProductContent', { 
                  contentId: item.id 
                })}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No pending content</Text>
          )}
        </Section>
      </ScrollView>
      
      {/* Quick Actions FAB */}
      <FloatingActionButton
        actions={[
          {
            icon: 'add-campaign',
            label: 'New Campaign',
            accessibilityLabel: 'New Campaign',
            onPress: () => navigation.navigate('CampaignPlanner', { 
              mode: 'create' 
            }),
          },
          {
            icon: 'add-content',
            label: 'Create Content',
            accessibilityLabel: 'Create Content',
            onPress: () => navigation.navigate('ProductContent', { 
              mode: 'create' 
            }),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
});