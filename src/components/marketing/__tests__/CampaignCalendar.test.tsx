import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the component (doesn't exist yet - RED phase)
jest.mock('../CampaignCalendar', () => ({
  default: jest.fn(() => null)
}));

import CampaignCalendar from '../CampaignCalendar';

describe('CampaignCalendar', () => {
  const defaultProps = {
    selectedDate: new Date('2025-08-29'),
    onDateSelect: jest.fn(),
    onRangeSelect: jest.fn(),
    onEventClick: jest.fn(),
    minDate: new Date('2025-01-01'),
    maxDate: new Date('2025-12-31'),
    events: [],
    testID: 'campaign-calendar'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calendar display', () => {
    it('should render current month view', () => {
      const { getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      expect(getByText('August 2025')).toBeTruthy();
    });

    it('should display days of the week', () => {
      const { getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        expect(getByText(day)).toBeTruthy();
      });
    });

    it('should highlight selected date', () => {
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} selectedDate={new Date('2025-08-15')} />
      );
      
      const selectedDay = getByTestId('day-2025-08-15');
      expect(selectedDay.props.style).toMatchObject({ 
        backgroundColor: expect.any(String) 
      });
    });

    it('should navigate to previous month', () => {
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const prevButton = getByTestId('prev-month');
      fireEvent.press(prevButton);
      
      expect(getByText('July 2025')).toBeTruthy();
    });

    it('should navigate to next month', () => {
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const nextButton = getByTestId('next-month');
      fireEvent.press(nextButton);
      
      expect(getByText('September 2025')).toBeTruthy();
    });

    it('should show today indicator', () => {
      const today = new Date();
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const todayCell = getByTestId(`day-${today.toISOString().split('T')[0]}`);
      expect(todayCell.props.style).toMatchObject({
        borderColor: expect.any(String)
      });
    });
  });

  describe('date selection', () => {
    it('should call onDateSelect when date is pressed', () => {
      const onDateSelect = jest.fn();
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} onDateSelect={onDateSelect} />
      );
      
      const day = getByTestId('day-2025-08-15');
      fireEvent.press(day);
      
      expect(onDateSelect).toHaveBeenCalledWith(expect.objectContaining({
        date: expect.any(Date)
      }));
    });

    it('should support range selection mode', () => {
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} mode="range" />
      );
      
      const startDay = getByTestId('day-2025-08-10');
      const endDay = getByTestId('day-2025-08-15');
      
      fireEvent.press(startDay);
      fireEvent.press(endDay);
      
      // Check range highlight
      for (let i = 11; i <= 14; i++) {
        const rangeDay = getByTestId(`day-2025-08-${i.toString().padStart(2, '0')}`);
        expect(rangeDay.props.style).toMatchObject({
          backgroundColor: expect.any(String)
        });
      }
    });

    it('should call onRangeSelect with start and end dates', () => {
      const onRangeSelect = jest.fn();
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} mode="range" onRangeSelect={onRangeSelect} />
      );
      
      const startDay = getByTestId('day-2025-08-10');
      const endDay = getByTestId('day-2025-08-15');
      
      fireEvent.press(startDay);
      fireEvent.press(endDay);
      
      expect(onRangeSelect).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date)
      });
    });

    it('should disable dates outside min/max range', () => {
      const { getByTestId } = render(
        <CampaignCalendar 
          {...defaultProps} 
          minDate={new Date('2025-08-10')}
          maxDate={new Date('2025-08-20')}
        />
      );
      
      const disabledDay = getByTestId('day-2025-08-05');
      expect(disabledDay.props.disabled).toBe(true);
    });

    it('should support multi-select mode', () => {
      const onMultiSelect = jest.fn();
      const { getByTestId } = render(
        <CampaignCalendar 
          {...defaultProps} 
          mode="multiple"
          onMultiSelect={onMultiSelect}
        />
      );
      
      fireEvent.press(getByTestId('day-2025-08-10'));
      fireEvent.press(getByTestId('day-2025-08-15'));
      fireEvent.press(getByTestId('day-2025-08-20'));
      
      expect(onMultiSelect).toHaveBeenCalledWith([
        expect.any(Date),
        expect.any(Date),
        expect.any(Date)
      ]);
    });
  });

  describe('event display', () => {
    it('should display events on calendar', () => {
      const events = [
        { id: '1', date: '2025-08-15', title: 'Campaign Launch' },
        { id: '2', date: '2025-08-20', title: 'Flash Sale' }
      ];
      
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} events={events} />
      );
      
      expect(getByTestId('event-indicator-2025-08-15')).toBeTruthy();
      expect(getByTestId('event-indicator-2025-08-20')).toBeTruthy();
    });

    it('should show event tooltip on press', () => {
      const events = [
        { id: '1', date: '2025-08-15', title: 'Campaign Launch', description: 'Summer campaign' }
      ];
      
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} events={events} />
      );
      
      const eventIndicator = getByTestId('event-indicator-2025-08-15');
      fireEvent.press(eventIndicator);
      
      expect(getByText('Campaign Launch')).toBeTruthy();
      expect(getByText('Summer campaign')).toBeTruthy();
    });

    it('should call onEventClick when event is selected', () => {
      const onEventClick = jest.fn();
      const events = [
        { id: '1', date: '2025-08-15', title: 'Campaign Launch' }
      ];
      
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} events={events} onEventClick={onEventClick} />
      );
      
      const eventIndicator = getByTestId('event-indicator-2025-08-15');
      fireEvent.press(eventIndicator);
      
      expect(onEventClick).toHaveBeenCalledWith(events[0]);
    });

    it('should display multiple events on same date', () => {
      const events = [
        { id: '1', date: '2025-08-15', title: 'Campaign Launch' },
        { id: '2', date: '2025-08-15', title: 'Email Blast' },
        { id: '3', date: '2025-08-15', title: 'Social Media Push' }
      ];
      
      const { getByText, getByTestId } = render(
        <CampaignCalendar {...defaultProps} events={events} />
      );
      
      const eventCount = getByTestId('event-count-2025-08-15');
      expect(getByText('+3')).toBeTruthy();
    });
  });

  describe('view modes', () => {
    it('should switch to week view', () => {
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const viewToggle = getByTestId('view-toggle');
      fireEvent.press(viewToggle);
      
      const weekOption = getByText('Week');
      fireEvent.press(weekOption);
      
      expect(getByText('Week of Aug 25, 2025')).toBeTruthy();
    });

    it('should display time slots in day view', () => {
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} view="day" />
      );
      
      ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'].forEach(time => {
        expect(getByText(time)).toBeTruthy();
      });
    });

    it('should show agenda view with event list', () => {
      const events = [
        { id: '1', date: '2025-08-15', title: 'Campaign Launch', time: '10:00 AM' },
        { id: '2', date: '2025-08-20', title: 'Flash Sale', time: '2:00 PM' }
      ];
      
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} view="agenda" events={events} />
      );
      
      expect(getByTestId('agenda-item-1')).toBeTruthy();
      expect(getByTestId('agenda-item-2')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels for dates', () => {
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const day = getByTestId('day-2025-08-15');
      expect(day.props.accessibilityLabel).toBe('August 15, 2025');
    });

    it('should announce selected date to screen readers', () => {
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} selectedDate={new Date('2025-08-15')} />
      );
      
      const selectedDay = getByTestId('day-2025-08-15');
      expect(selectedDay.props.accessibilityState).toEqual({
        selected: true
      });
    });

    it('should provide navigation hints', () => {
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const prevButton = getByTestId('prev-month');
      const nextButton = getByTestId('next-month');
      
      expect(prevButton.props.accessibilityHint).toBe('Navigate to previous month');
      expect(nextButton.props.accessibilityHint).toBe('Navigate to next month');
    });
  });
});