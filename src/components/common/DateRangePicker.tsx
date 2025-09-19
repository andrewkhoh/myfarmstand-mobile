import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  presets?: Array<{
    label: string;
    getValue: () => DateRange;
  }>;
  showComparison?: boolean;
  onComparisonChange?: (range: DateRange | null) => void;
}

const defaultPresets = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { startDate: today, endDate: end, label: 'Today' };
    },
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      return { startDate: yesterday, endDate: end, label: 'Yesterday' };
    },
  },
  {
    label: 'Last 7 Days',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, endDate: end, label: 'Last 7 Days' };
    },
  },
  {
    label: 'Last 30 Days',
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, endDate: end, label: 'Last 30 Days' };
    },
  },
  {
    label: 'This Month',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'This Month' };
    },
  },
  {
    label: 'Last Month',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Last Month' };
    },
  },
  {
    label: 'This Quarter',
    getValue: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'This Quarter' };
    },
  },
  {
    label: 'Last Quarter',
    getValue: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Last Quarter' };
    },
  },
  {
    label: 'This Year',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'This Year' };
    },
  },
  {
    label: 'Last Year',
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Last Year' };
    },
  },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  presets = defaultPresets,
  showComparison = false,
  onComparisonChange,
}) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(value);
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null);

  const formatDateRange = (range: DateRange) => {
    const formatDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    if (range.label && presets.some(p => p.label === range.label)) {
      return range.label;
    }

    return `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`;
  };

  const handlePresetSelect = useCallback((preset: typeof presets[0]) => {
    const range = preset.getValue();
    setSelectedRange(range);
    onChange(range);

    if (comparisonEnabled && onComparisonChange) {
      // Auto-select previous period for comparison
      const duration = range.endDate.getTime() - range.startDate.getTime();
      const compStart = new Date(range.startDate.getTime() - duration);
      const compEnd = new Date(range.endDate.getTime() - duration);
      const compRange = {
        startDate: compStart,
        endDate: compEnd,
        label: `Previous ${range.label}`,
      };
      setComparisonRange(compRange);
      onComparisonChange(compRange);
    }

    setModalVisible(false);
  }, [onChange, onComparisonChange, comparisonEnabled]);

  const toggleComparison = useCallback(() => {
    const newEnabled = !comparisonEnabled;
    setComparisonEnabled(newEnabled);

    if (!newEnabled && onComparisonChange) {
      setComparisonRange(null);
      onComparisonChange(null);
    }
  }, [comparisonEnabled, onComparisonChange]);

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="date-range" size={20} color="#6b7280" />
        <Text style={styles.triggerText}>
          {selectedRange ? formatDateRange(selectedRange) : 'Select Date Range'}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {showComparison && (
              <TouchableOpacity
                style={styles.comparisonToggle}
                onPress={toggleComparison}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={comparisonEnabled ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color="#4f46e5"
                />
                <Text style={styles.comparisonText}>Compare to previous period</Text>
              </TouchableOpacity>
            )}

            <ScrollView style={styles.presetsList}>
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.presetItem,
                    selectedRange?.label === preset.label && styles.presetItemActive,
                  ]}
                  onPress={() => handlePresetSelect(preset)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetText,
                      selectedRange?.label === preset.label && styles.presetTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                  {selectedRange?.label === preset.label && (
                    <MaterialIcons name="check" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {comparisonEnabled && comparisonRange && (
              <View style={styles.comparisonInfo}>
                <Text style={styles.comparisonLabel}>Comparing to:</Text>
                <Text style={styles.comparisonValue}>
                  {formatDateRange(comparisonRange)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 8,
  },
  triggerText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  comparisonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  comparisonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4b5563',
  },
  presetsList: {
    paddingVertical: 8,
  },
  presetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  presetItemActive: {
    backgroundColor: '#eff6ff',
  },
  presetText: {
    fontSize: 16,
    color: '#374151',
  },
  presetTextActive: {
    color: '#4f46e5',
    fontWeight: '500',
  },
  comparisonInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
});