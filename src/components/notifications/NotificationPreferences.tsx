import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import { useNotificationPreferences } from '../../hooks/notifications/useNotifications';
import { NotificationPreferences as PreferencesType } from '../../services/notifications/notificationService';

interface NotificationPreferencesProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationPreferences({ visible, onClose }: NotificationPreferencesProps) {
  const {
    preferences,
    isLoading,
    isUpdating,
    toggleCategory,
    toggleUrgencyLevel,
    toggleQuietHours,
    updateQuietHoursTime,
    updatePreferences
  } = useNotificationPreferences();

  const [showTimeSelector, setShowTimeSelector] = useState<'start' | 'end' | null>(null);

  if (isLoading || !preferences) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.loadingContainer}>
          <Text>Loading preferences...</Text>
        </View>
      </Modal>
    );
  }

  const handleChannelToggle = (channel: keyof Pick<PreferencesType, 'emailNotifications' | 'pushNotifications' | 'smsNotifications'>) => {
    const newPreferences = {
      ...preferences,
      [channel]: !preferences[channel]
    };
    updatePreferences(newPreferences);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Preferences',
      'This will reset all notification preferences to their default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultPreferences: PreferencesType = {
              emailNotifications: true,
              pushNotifications: true,
              smsNotifications: false,
              categories: {
                inventory: true,
                marketing: true,
                sales: true,
                system: true,
                security: true
              },
              urgencyLevels: {
                low: true,
                medium: true,
                high: true,
                critical: true
              },
              quietHours: {
                enabled: false,
                start: '22:00',
                end: '08:00'
              }
            };
            updatePreferences(defaultPreferences);
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Notification Preferences</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Notification Channels */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Channels</Text>
            <Text style={styles.sectionDescription}>
              Choose how you want to receive notifications
            </Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Real-time notifications on your device
                </Text>
              </View>
              <Switch
                value={preferences.pushNotifications}
                onValueChange={() => handleChannelToggle('pushNotifications')}
                disabled={isUpdating}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Notifications sent to your email address
                </Text>
              </View>
              <Switch
                value={preferences.emailNotifications}
                onValueChange={() => handleChannelToggle('emailNotifications')}
                disabled={isUpdating}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>SMS Notifications</Text>
                <Text style={styles.settingDescription}>
                  Critical alerts via text message
                </Text>
              </View>
              <Switch
                value={preferences.smsNotifications}
                onValueChange={() => handleChannelToggle('smsNotifications')}
                disabled={isUpdating}
              />
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Categories</Text>
            <Text style={styles.sectionDescription}>
              Select which types of notifications you want to receive
            </Text>

            {Object.entries(preferences.categories).map(([category, enabled]) => (
              <View key={category} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {getCategoryIcon(category)} {getCategoryName(category)}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {getCategoryDescription(category)}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleCategory(category as any)}
                  disabled={isUpdating}
                />
              </View>
            ))}
          </View>

          {/* Urgency Levels */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Urgency Levels</Text>
            <Text style={styles.sectionDescription}>
              Choose which urgency levels you want to receive
            </Text>

            {Object.entries(preferences.urgencyLevels).map(([level, enabled]) => (
              <View key={level} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {getUrgencyIcon(level)} {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {getUrgencyDescription(level)}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleUrgencyLevel(level as any)}
                  disabled={isUpdating}
                />
              </View>
            ))}
          </View>

          {/* Quiet Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
            <Text style={styles.sectionDescription}>
              Set times when only critical notifications are allowed
            </Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
                <Text style={styles.settingDescription}>
                  Only critical notifications during specified hours
                </Text>
              </View>
              <Switch
                value={preferences.quietHours.enabled}
                onValueChange={toggleQuietHours}
                disabled={isUpdating}
              />
            </View>

            {preferences.quietHours.enabled && (
              <View style={styles.quietHoursConfig}>
                <View style={styles.timeSelector}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimeSelector('start')}
                  >
                    <Text style={styles.timeButtonText}>
                      {preferences.quietHours.start}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.timeSelector}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimeSelector('end')}
                  >
                    <Text style={styles.timeButtonText}>
                      {preferences.quietHours.end}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Reset Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetToDefaults}
              disabled={isUpdating}
            >
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Time Picker Modal */}
        {showTimeSelector && (
          <TimePickerModal
            visible={true}
            currentTime={
              showTimeSelector === 'start'
                ? preferences.quietHours.start
                : preferences.quietHours.end
            }
            onConfirm={(time) => {
              if (showTimeSelector === 'start') {
                updateQuietHoursTime(time, undefined);
              } else {
                updateQuietHoursTime(undefined, time);
              }
              setShowTimeSelector(null);
            }}
            onCancel={() => setShowTimeSelector(null)}
          />
        )}
      </View>
    </Modal>
  );
}

interface TimePickerModalProps {
  visible: boolean;
  currentTime: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

function TimePickerModal({ visible, currentTime, onConfirm, onCancel }: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState(
    parseInt(currentTime.split(':')[0])
  );
  const [selectedMinute, setSelectedMinute] = useState(
    parseInt(currentTime.split(':')[1])
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    const time = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onConfirm(time);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.timePickerOverlay}>
        <View style={styles.timePickerModal}>
          <Text style={styles.timePickerTitle}>Select Time</Text>

          <View style={styles.timePickerContainer}>
            <ScrollView style={styles.timePicker}>
              {hours.map(hour => (
                <TouchableOpacity
                  key={hour}
                  style={[
                    styles.timeOption,
                    selectedHour === hour && styles.selectedTimeOption
                  ]}
                  onPress={() => setSelectedHour(hour)}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      selectedHour === hour && styles.selectedTimeOptionText
                    ]}
                  >
                    {hour.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.timeSeparator}>:</Text>

            <ScrollView style={styles.timePicker}>
              {minutes.filter(minute => minute % 15 === 0).map(minute => (
                <TouchableOpacity
                  key={minute}
                  style={[
                    styles.timeOption,
                    selectedMinute === minute && styles.selectedTimeOption
                  ]}
                  onPress={() => setSelectedMinute(minute)}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      selectedMinute === minute && styles.selectedTimeOptionText
                    ]}
                  >
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.timePickerButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Helper functions
function getCategoryIcon(category: string): string {
  switch (category) {
    case 'inventory': return '📦';
    case 'marketing': return '📈';
    case 'sales': return '💰';
    case 'system': return '⚙️';
    case 'security': return '🔒';
    default: return '📋';
  }
}

function getCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function getCategoryDescription(category: string): string {
  switch (category) {
    case 'inventory': return 'Stock levels, alerts, and inventory management';
    case 'marketing': return 'Campaign updates and marketing performance';
    case 'sales': return 'Orders, revenue, and sales metrics';
    case 'system': return 'App updates, maintenance, and system alerts';
    case 'security': return 'Security alerts and access notifications';
    default: return 'General notifications';
  }
}

function getUrgencyIcon(urgency: string): string {
  switch (urgency) {
    case 'low': return '🟢';
    case 'medium': return '🟡';
    case 'high': return '🟠';
    case 'critical': return '🔴';
    default: return '⚪';
  }
}

function getUrgencyDescription(urgency: string): string {
  switch (urgency) {
    case 'low': return 'General updates and non-urgent information';
    case 'medium': return 'Important updates that may require attention';
    case 'high': return 'Important alerts that should be addressed soon';
    case 'critical': return 'Urgent alerts requiring immediate attention';
    default: return 'Standard notifications';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d'
  },
  content: {
    flex: 1,
    padding: 20
  },
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4'
  },
  settingInfo: {
    flex: 1,
    marginRight: 12
  },
  settingLabel: {
    fontSize: 16,
    color: '#212529',
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18
  },
  quietHoursConfig: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4'
  },
  timeSelector: {
    flex: 1,
    marginHorizontal: 8
  },
  timeLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  timeButtonText: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '600'
  },
  resetButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 20
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 200,
    marginBottom: 20
  },
  timePicker: {
    flex: 1,
    maxHeight: 200
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginHorizontal: 16
  },
  timeOption: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    margin: 2
  },
  selectedTimeOption: {
    backgroundColor: '#007bff'
  },
  timeOptionText: {
    fontSize: 16,
    color: '#212529'
  },
  selectedTimeOptionText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  timePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});