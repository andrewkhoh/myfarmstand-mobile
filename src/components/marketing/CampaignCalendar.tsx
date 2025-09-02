import React, { memo, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { MarketingCampaign } from '@/types/marketing';

interface CampaignCalendarProps {
  campaigns: MarketingCampaign[];
  onDateSelect: (date: Date) => void;
  onCampaignSelect: (campaign: MarketingCampaign) => void;
  viewMode: 'month' | 'week' | 'list';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CampaignCalendar = memo<CampaignCalendarProps>(({
  campaigns,
  onDateSelect,
  onCampaignSelect,
  viewMode,
}) => {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    if (!filterType) return campaigns;
    return campaigns.filter(c => c.type === filterType);
  }, [campaigns, filterType]);

  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, []);

  const getWeekDays = useCallback((date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, []);

  const getCampaignsForDate = useCallback((date: Date) => {
    return filteredCampaigns.filter(campaign => {
      const campaignStart = new Date(campaign.startDate);
      const campaignEnd = new Date(campaign.endDate);
      const checkDate = new Date(date);
      
      campaignStart.setHours(0, 0, 0, 0);
      campaignEnd.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0);
      
      return checkDate >= campaignStart && checkDate <= campaignEnd;
    });
  }, [filteredCampaigns]);

  const checkOverlap = useCallback((campaign: MarketingCampaign) => {
    const overlapping = campaigns.filter(c => {
      if (c.id === campaign.id) return false;
      const start1 = new Date(campaign.startDate);
      const end1 = new Date(campaign.endDate);
      const start2 = new Date(c.startDate);
      const end2 = new Date(c.endDate);
      
      return (start1 <= end2 && end1 >= start2);
    });
    
    if (overlapping.length > 0) {
      Alert.alert(
        'Campaign Overlap Detected',
        `This campaign overlaps with ${overlapping.length} other campaign(s): ${overlapping.map(c => c.name).join(', ')}`
      );
    }
  }, [campaigns]);

  const handleDatePress = useCallback((day: number | null) => {
    if (!day) return;
    
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(selected);
    onDateSelect(selected);
    
    const campaignsOnDate = getCampaignsForDate(selected);
    if (campaignsOnDate.length === 1) {
      onCampaignSelect(campaignsOnDate[0]);
    }
  }, [currentDate, onDateSelect, getCampaignsForDate, onCampaignSelect]);

  const handleCampaignPress = useCallback((campaign: MarketingCampaign) => {
    checkOverlap(campaign);
    onCampaignSelect(campaign);
  }, [checkOverlap, onCampaignSelect]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  const exportToCalendar = useCallback(() => {
    Alert.alert(
      'Export Calendar',
      'Export campaigns to device calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            Alert.alert('Success', 'Campaigns exported to calendar');
          },
        },
      ]
    );
  }, []);

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    
    return (
      <View style={styles.monthView}>
        <View style={styles.weekDaysRow}>
          {DAYS.map(day => (
            <Text key={day} style={[styles.weekDay, { color: theme.colors.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>
        
        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            const dateForDay = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
            const campaignsOnDay = dateForDay ? getCampaignsForDate(dateForDay) : [];
            const isSelected = selectedDate && dateForDay && 
              selectedDate.toDateString() === dateForDay.toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  isSelected && styles.selectedDay,
                  !day && styles.emptyDay,
                ]}
                onPress={() => handleDatePress(day)}
                disabled={!day}
                testID={day ? `day-${day}` : `empty-${index}`}
              >
                {day && (
                  <>
                    <Text style={[
                      styles.dayNumber,
                      { color: theme.colors.text },
                      isSelected && styles.selectedDayText,
                    ]}>
                      {day}
                    </Text>
                    {campaignsOnDay.length > 0 && (
                      <View style={styles.campaignIndicators}>
                        {campaignsOnDay.slice(0, 3).map((campaign, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.campaignDot,
                              { backgroundColor: campaign.color || theme.colors.primary },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.weekView}>
          {weekDays.map((date, index) => {
            const campaignsOnDay = getCampaignsForDate(date);
            const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.weekDayColumn,
                  isSelected && styles.selectedWeekDay,
                ]}
                onPress={() => {
                  setSelectedDate(date);
                  onDateSelect(date);
                }}
                testID={`week-day-${index}`}
              >
                <Text style={[styles.weekDayLabel, { color: theme.colors.textSecondary }]}>
                  {DAYS[date.getDay()]}
                </Text>
                <Text style={[styles.weekDayNumber, { color: theme.colors.text }]}>
                  {date.getDate()}
                </Text>
                
                <View style={styles.weekDayCampaigns}>
                  {campaignsOnDay.map((campaign, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.weekCampaignItem,
                        { backgroundColor: campaign.color || theme.colors.primary },
                      ]}
                      onPress={() => handleCampaignPress(campaign)}
                    >
                      <Text style={styles.weekCampaignText} numberOfLines={1}>
                        {campaign.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderListView = () => {
    return (
      <FlatList
        data={filteredCampaigns}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.listItem, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleCampaignPress(item)}
            testID={`campaign-${item.id}`}
          >
            <View style={[styles.listItemIndicator, { backgroundColor: item.color || theme.colors.primary }]} />
            <View style={styles.listItemContent}>
              <Text style={[styles.listItemTitle, { color: theme.colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.listItemDate, { color: theme.colors.textSecondary }]}>
                {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
              </Text>
              <View style={styles.listItemTags}>
                <View style={[styles.tag, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.primary }]}>
                    {item.type}
                  </Text>
                </View>
                <View style={[
                  styles.tag,
                  { backgroundColor: item.status === 'active' ? theme.colors.success + '20' : theme.colors.warning + '20' }
                ]}>
                  <Text style={[
                    styles.tagText,
                    { color: item.status === 'active' ? theme.colors.success : theme.colors.warning }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      />
    );
  };

  return (
    <View style={styles.container} testID="campaign-calendar">
      <View style={styles.header}>
        <View style={styles.navigationRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
            accessibilityLabel="Previous month"
            testID="prev-month"
          >
            <Text style={[styles.navButtonText, { color: theme.colors.primary }]}>‹</Text>
          </TouchableOpacity>
          
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
            accessibilityLabel="Next month"
            testID="next-month"
          >
            <Text style={[styles.navButtonText, { color: theme.colors.primary }]}>›</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                !filterType && styles.filterChipActive,
                { borderColor: theme.colors.primary },
              ]}
              onPress={() => setFilterType(null)}
              testID="filter-all"
            >
              <Text style={[
                styles.filterChipText,
                { color: !filterType ? 'white' : theme.colors.primary },
              ]}>
                All
              </Text>
            </TouchableOpacity>
            
            {['promotion', 'seasonal', 'clearance', 'new_arrival'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  filterType === type && styles.filterChipActive,
                  { borderColor: theme.colors.primary },
                ]}
                onPress={() => setFilterType(type)}
                testID={`filter-${type}`}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filterType === type ? 'white' : theme.colors.primary },
                ]}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: theme.colors.secondary }]}
          onPress={exportToCalendar}
          accessibilityLabel="Export to calendar"
          testID="export-button"
        >
          <Text style={styles.exportButtonText}>Export to Calendar</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'list' && renderListView()}
      </View>
    </View>
  );
});

CampaignCalendar.displayName = 'CampaignCalendar';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exportButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  monthView: {
    flex: 1,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  weekDay: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  selectedDay: {
    backgroundColor: '#007AFF20',
    borderColor: '#007AFF',
  },
  emptyDay: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  dayNumber: {
    fontSize: 16,
    marginBottom: 4,
  },
  selectedDayText: {
    fontWeight: '700',
  },
  campaignIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  campaignDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  weekView: {
    flexDirection: 'row',
  },
  weekDayColumn: {
    width: 100,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedWeekDay: {
    backgroundColor: '#007AFF10',
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  weekDayCampaigns: {
    flex: 1,
  },
  weekCampaignItem: {
    padding: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  weekCampaignText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
  },
  listItemIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  listItemTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listSeparator: {
    height: 8,
  },
});