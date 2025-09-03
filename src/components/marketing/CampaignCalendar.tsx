import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MarketingCampaign, MarketingContent, CampaignFilter, Product, ProductBundle, WorkflowState, WorkflowConfig, WorkflowResult, WorkflowContext, CalendarEvent } from '@/schemas/marketing';


interface CampaignCalendarProps {
  selectedDates?: Date[];
  onDateSelect: (date: Date) => void;
  onRangeSelect: (range: { start: Date; end: Date }) => void;
  onEventClick: (event: CalendarEvent) => void;
  onClear?: () => void;
  minDate?: Date;
  maxDate?: Date;
  events?: Array<{ id?: string; date: Date; title: string }>;
  disabledDates?: Date[];
  multiSelect?: boolean;
  rangeSelection?: boolean;
  showEventList?: boolean;
  selectedRange?: { start: Date; end: Date };
  testID?: string;
}

export default function CampaignCalendar(props: CampaignCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDates, setSelectedDates] = React.useState<Date[]>(props.selectedDates || []);
  const [rangeStart, setRangeStart] = React.useState<Date | null>(null);
  const [showList, setShowList] = React.useState(false);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const handleDatePress = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    const event = props.events?.find(e => 
      e.date.getDate() === day && 
      e.date.getMonth() === currentMonth.getMonth()
    );
    
    if (event) {
      props.onEventClick?.(event);
    } else {
      props.onDateSelect?.(date);
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleLongPress = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setRangeStart(date);
  };

  const handlePressOut = (day: number) => {
    if (rangeStart) {
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      props.onRangeSelect?.({ start: rangeStart, end: endDate });
      setRangeStart(null);
    }
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (props.minDate && date < props.minDate) return true;
    if (props.maxDate && date > props.maxDate) return true;
    if (props.disabledDates?.some(d => d.getDate() === day)) return true;
    
    return false;
  };

  const isDateSelected = (day: number) => {
    return selectedDates.some(d => 
      d.getDate() === day && 
      d.getMonth() === currentMonth.getMonth()
    );
  };

  const isInRange = (day: number) => {
    if (!props.selectedRange) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date >= props.selectedRange.start && date <= props.selectedRange.end;
  };

  const hasEvent = (day: number) => {
    return props.events?.some(e => 
      e.date.getDate() === day && 
      e.date.getMonth() === currentMonth.getMonth()
    );
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container} testID={props.testID}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="prev-month"
          onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          accessibilityHint="Navigate to previous month"
        >
          <Text>‹</Text>
        </TouchableOpacity>
        <Text>{monthName}</Text>
        <TouchableOpacity
          testID="next-month"
          onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          accessibilityHint="Navigate to next month"
        >
          <Text>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekDays}>
        {weekDays.map(day => (
          <Text key={day} style={styles.weekDay}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendar}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Day ${day}`}
            key={day}
            testID={`day-${day}`}
            style={[
              styles.day,
              isDateSelected(day) && styles.selectedDay,
              isInRange(day) && { backgroundColor: 'lightblue' },
              isDateDisabled(day) && styles.disabledDay
            ]}
            onPress={() => handleDatePress(day)}
            onLongPress={() => handleLongPress(day)}
            onPressIn={() => {}}
            onPressOut={() => handlePressOut(day)}
            disabled={isDateDisabled(day)}
            accessibilityState={{ selected: isDateSelected(day) }}
          >
            <Text>{day}</Text>
            {hasEvent(day) && <View testID={`event-dot-${day}`} style={styles.eventDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {props.multiSelect && (
        <TouchableOpacity 
          testID="clear-selection" 
          onPress={props.onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear Selection"
        >
          <Text>Clear Selection</Text>
        </TouchableOpacity>
      )}

      {rangeStart && (
        <Text>Selecting range...</Text>
      )}

      {props.showEventList && (
        <TouchableOpacity 
          testID="toggle-list-view" 
          onPress={() => setShowList(!showList)}
          accessibilityRole="button"
          accessibilityLabel="Toggle List"
        >
          <Text>Toggle List</Text>
        </TouchableOpacity>
      )}

      {showList && props.events && (
        <ScrollView>
          {props.events.map((event, index) => (
            <View key={index}>
              <Text>{event.title}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDay: {
    fontWeight: 'bold',
    width: 40,
    textAlign: 'center',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedDay: {
    backgroundColor: '#007bff',
  },
  disabledDay: {
    opacity: 0.3,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'red',
    position: 'absolute',
    bottom: 2,
  },
});