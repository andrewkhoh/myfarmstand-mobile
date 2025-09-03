import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';

export default function CampaignPlannerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Campaign data state
  const [campaign, setCampaign] = useState({
    id: route.params?.campaignId || '',
    name: 'Summer Sale 2025',
    description: 'Annual summer promotion',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    status: 'scheduled',
    targetAudience: {
      segments: ['young-adults', 'fashion-enthusiasts'],
      demographics: { ageRange: '18-35', gender: 'all' },
    },
    channels: ['email', 'social', 'push'],
    budget: 25000,
    goals: {
      impressions: 100000,
      clicks: 5000,
      conversions: 250,
    },
  });

  const [schedule, setSchedule] = useState({
    events: [
      {
        id: 'event-1',
        date: '2025-06-01',
        type: 'launch',
        description: 'Campaign launch',
        channels: ['email', 'social'],
      },
      {
        id: 'event-2',
        date: '2025-07-15',
        type: 'milestone',
        description: 'Mid-campaign boost',
        channels: ['push'],
      },
    ],
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSave = () => {
    Alert.alert('Success', 'Campaign saved successfully');
  };

  const handlePublish = () => {
    setCampaign({ ...campaign, status: 'active' });
    Alert.alert('Success', 'Campaign published successfully');
  };

  const handleScheduleEvent = (event: Campaign) => {
    setSchedule({
      ...schedule,
      events: [...schedule.events, event],
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setSchedule({
      ...schedule,
      events: schedule.events.filter(e => e.id !== eventId),
    });
  };

  if (loading && !refreshing) {
    return <LoadingState message="Loading campaign..." />;
  }

  if (error && !refreshing) {
    return <ErrorState error={error} onRetry={() => setError(null)} />;
  }

  return (
    <ScrollView
      testID="campaign-planner-screen"
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Campaign Info Section */}
      <View testID="campaign-info-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Campaign Information</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Campaign Name</Text>
          <TextInput
            testID="campaign-name-input"
            style={styles.input}
            value={campaign.name}
            onChangeText={(text) => setCampaign({ ...campaign, name: text })}
            placeholder="Enter campaign name"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            testID="campaign-description-input"
            style={[styles.input, styles.textArea]}
            value={campaign.description}
            onChangeText={(text) => setCampaign({ ...campaign, description: text })}
            placeholder="Enter campaign description"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Date Range Section */}
      <View testID="date-range-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Campaign Duration</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity testID="start-date-picker" style={styles.datePicker}
        accessibilityRole="button"
        accessibilityLabel="{campaign.startDate}">
              <Text>{campaign.startDate}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity testID="end-date-picker" style={styles.datePicker}
        accessibilityRole="button"
        accessibilityLabel="{campaign.endDate}">
              <Text>{campaign.endDate}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Target Audience Section */}
      <View testID="audience-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Target Audience</Text>
        <View style={styles.audienceSegments}>
          {campaign.targetAudience.segments.map((segment, index) => (
            <View key={segment} testID={`audience-segment-${index}`} style={styles.segment}>
              <Text style={styles.segmentText}>{segment}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity testID="add-segment-button" style={styles.addButton}
        accessibilityRole="button"
        accessibilityLabel="+ Add Segment">
          <Text style={styles.addButtonText}>+ Add Segment</Text>
        </TouchableOpacity>
      </View>

      {/* Channels Section */}
      <View testID="channels-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Marketing Channels</Text>
        <View style={styles.channelsList}>
          {['email', 'social', 'push', 'sms'].map((channel) => (
            <View key={channel} testID={`channel-${channel}`} style={styles.channelItem}>
              <Text style={styles.channelName}>{channel.charAt(0).toUpperCase() + channel.slice(1)}</Text>
              <Switch
                testID={`channel-${channel}-toggle`}
                value={campaign.channels.includes(channel)}
                onValueChange={(value) => {
                  if (value) {
                    setCampaign({
                      ...campaign,
                      channels: [...campaign.channels, channel],
                    });
                  } else {
                    setCampaign({
                      ...campaign,
                      channels: campaign.channels.filter(c => c !== channel),
                    });
                  }
                }}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Budget Section */}
      <View testID="budget-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Budget</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Total Budget</Text>
          <TextInput
            testID="budget-input"
            style={styles.input}
            value={campaign.budget.toString()}
            onChangeText={(text) => setCampaign({ ...campaign, budget: parseInt(text) || 0 })}
            placeholder="Enter budget"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Goals Section */}
      <View testID="goals-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Campaign Goals</Text>
        <View style={styles.goalsGrid}>
          <View style={styles.goalItem}>
            <Text style={styles.goalLabel}>Impressions</Text>
            <TextInput
              testID="goal-impressions-input"
              style={styles.goalInput}
              value={campaign.goals.impressions.toString()}
              onChangeText={(text) => 
                setCampaign({
                  ...campaign,
                  goals: { ...campaign.goals, impressions: parseInt(text) || 0 },
                })
              }
              keyboardType="numeric"
            />
          </View>
          <View style={styles.goalItem}>
            <Text style={styles.goalLabel}>Clicks</Text>
            <TextInput
              testID="goal-clicks-input"
              style={styles.goalInput}
              value={campaign.goals.clicks.toString()}
              onChangeText={(text) =>
                setCampaign({
                  ...campaign,
                  goals: { ...campaign.goals, clicks: parseInt(text) || 0 },
                })
              }
              keyboardType="numeric"
            />
          </View>
          <View style={styles.goalItem}>
            <Text style={styles.goalLabel}>Conversions</Text>
            <TextInput
              testID="goal-conversions-input"
              style={styles.goalInput}
              value={campaign.goals.conversions.toString()}
              onChangeText={(text) =>
                setCampaign({
                  ...campaign,
                  goals: { ...campaign.goals, conversions: parseInt(text) || 0 },
                })
              }
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Schedule Section */}
      <View testID="schedule-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Campaign Schedule</Text>
        <View testID="calendar-view" style={styles.calendar}>
          {schedule.events.map((event, index) => (
            <View key={event.id} testID={`schedule-event-${index}`} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventDate}>{event.date}</Text>
                <Text style={styles.eventType}>{event.type}</Text>
              </View>
              <Text style={styles.eventDescription}>{event.description}</Text>
              <View style={styles.eventChannels}>
                {event.channels.map((channel) => (
                  <Text key={channel} style={styles.eventChannel}>
                    {channel}
                  </Text>
                ))}
              </View>
              <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Delete"
                testID={`delete-event-${event.id}`}
                onPress={() => handleDeleteEvent(event.id)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <TouchableOpacity testID="add-event-button" style={styles.addButton}
        accessibilityRole="button"
        accessibilityLabel="+ Add Event">
          <Text style={styles.addButtonText}>+ Add Event</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View testID="action-buttons" style={styles.actions}>
        <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Save Draft"
          testID="save-draft-button"
          style={[styles.actionButton, styles.saveDraftButton]}
          onPress={handleSave}
        >
          <Text style={styles.saveDraftText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Publish Campaign"
          testID="publish-button"
          style={[styles.actionButton, styles.publishButton]}
          onPress={handlePublish}
        >
          <Text style={styles.publishText}>Publish Campaign</Text>
        </TouchableOpacity>
      </View>

      {/* Status Indicator */}
      <View testID="campaign-status" style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status: </Text>
        <Text testID="status-text" style={[styles.statusValue, styles[campaign.status]]}>
          {campaign.status}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateField: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePicker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  audienceSegments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  segment: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  segmentText: {
    color: '#2196F3',
    fontSize: 14,
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  channelsList: {
    marginTop: 8,
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  channelName: {
    fontSize: 16,
  },
  goalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  goalLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
  },
  calendar: {
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  eventChannels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  eventChannel: {
    fontSize: 12,
    color: '#2196F3',
    marginRight: 8,
  },
  deleteButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  deleteButtonText: {
    color: '#f44336',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  saveDraftButton: {
    backgroundColor: '#f0f0f0',
  },
  saveDraftText: {
    color: '#333',
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: '#2196F3',
  },
  publishText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduled: {
    color: '#FF9800',
  },
  active: {
    color: '#4CAF50',
  },
  draft: {
    color: '#9E9E9E',
  },
});