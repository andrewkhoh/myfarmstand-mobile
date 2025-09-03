import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Campaign } from '../../types/marketing.types';

interface CampaignCardProps {
  campaign: Campaign;
  onPress?: (campaign: Campaign) => void;
}

export const CampaignCard = React.memo(({ campaign, onPress }: CampaignCardProps) => {
  return (
    <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="{campaign.name}"
      testID={`campaign-card-${campaign.id}`}
      style={styles.container}
      onPress={() => onPress?.(campaign)}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{campaign.name}</Text>
        <View style={[styles.statusBadge, styles[campaign.status]]}>
          <Text style={styles.statusText}>{campaign.status}</Text>
        </View>
      </View>
      <Text style={styles.description}>{campaign.description}</Text>
      {campaign.metrics && (
        <View style={styles.metrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Impressions</Text>
            <Text style={styles.metricValue}>{campaign.metrics.impressions.toLocaleString()}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>CTR</Text>
            <Text style={styles.metricValue}>{campaign.metrics.ctr}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ROI</Text>
            <Text style={styles.metricValue}>{campaign.metrics.roi}%</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.campaign.id === nextProps.campaign.id &&
         prevProps.campaign.updatedAt === nextProps.campaign.updatedAt;
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  active: {
    backgroundColor: '#4CAF50',
  },
  draft: {
    backgroundColor: '#9E9E9E',
  },
  paused: {
    backgroundColor: '#FF9800',
  },
  completed: {
    backgroundColor: '#2196F3',
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
