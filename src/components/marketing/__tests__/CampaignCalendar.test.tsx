import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';

import CampaignCalendar from '../CampaignCalendar';

describe('CampaignCalendar', () => {
  const defaultProps = {
    selectedDates: [],
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
    it('should render calendar with current month', () => {
      const { getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      expect(getByText(currentMonth)).toBeTruthy();
    });
    
    it('should display weekday headers', () => {
      const { getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        expect(getByText(day)).toBeTruthy();
      });
    });
    
    it('should render all days of the month', () => {
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      // Check for at least 28 days (minimum month)
      for (let i = 1; i <= 28; i++) {
        expect(getByTestId(`day-${i}`)).toBeTruthy();
      }
    });
    
    it('should navigate to previous month', () => {
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const prevButton = getByTestId('prev-month');
      fireEvent.press(prevButton);
      
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const monthName = prevMonth.toLocaleString('default', { month: 'long' });
      
      expect(getByText(monthName)).toBeTruthy();
    });
    
    it('should navigate to next month', () => {
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const nextButton = getByTestId('next-month');
      fireEvent.press(nextButton);
      
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthName = nextMonth.toLocaleString('default', { month: 'long' });
      
      expect(getByText(monthName)).toBeTruthy();
    });
  });
  
  describe('date selection', () => {
    it('should select single date on press', () => {
      const onDateSelect = jest.fn();
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} onDateSelect={onDateSelect} />
      );
      
      const day15 = getByTestId('day-15');
      fireEvent.press(day15);
      
      expect(onDateSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          getDate: expect.any(Function)
        })
      );
    });
    
    it('should highlight selected dates', () => {
      const selectedDates = [new Date('2025-09-15')];
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} selectedDates={selectedDates} />
      );
      
      const day15 = getByTestId('day-15');
      expect(day15.props.style).toMatchObject({
        backgroundColor: expect.any(String)
      });
    });
    
    it('should allow multiple date selection', () => {
      const onDateSelect = jest.fn();
      const { getByTestId } = render(
        <CampaignCalendar 
          {...defaultProps} 
          multiSelect={true}
          onDateSelect={onDateSelect}
        />
      );
      
      fireEvent.press(getByTestId('day-10'));
      fireEvent.press(getByTestId('day-15'));
      fireEvent.press(getByTestId('day-20'));
      
      expect(onDateSelect).toHaveBeenCalledTimes(3);
    });
    
    it('should clear selection with clear button', () => {
      const onClear = jest.fn();
      const selectedDates = [new Date('2025-09-15')];
      const { getByTestId } = render(
        <CampaignCalendar 
          {...defaultProps} 
          selectedDates={selectedDates}
          onClear={onClear}
        />
      );
      
      const clearButton = getByTestId('clear-selection');
      fireEvent.press(clearButton);
      
      expect(onClear).toHaveBeenCalled();
    });
  });
  
  describe('range selection', () => {
    it('should select date range with long press and drag', () => {
      const onRangeSelect = jest.fn();
      const { getByTestId } = render(
        <CampaignCalendar 
          {...defaultProps} 
          rangeSelection={true}
          onRangeSelect={onRangeSelect}
        />
      );
      
      const startDay = getByTestId('day-10');
      const endDay = getByTestId('day-20');
      
      fireEvent(startDay, 'longPress');
      fireEvent(endDay, 'pressIn');
      fireEvent(endDay, 'pressOut');
      
      expect(onRangeSelect).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date)
      });
    });
    
    it('should highlight date range', () => {
      const range = {
        start: new Date('2025-09-10'),
        end: new Date('2025-09-20')
      };
      
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} selectedRange={range} />
      );
      
      // Check that days in range are highlighted
      for (let i = 10; i <= 20; i++) {
        const day = getByTestId(`day-${i}`);
        expect(day.props.style).toMatchObject({
          backgroundColor: expect.any(String)
        });
      }
    });
    
    it('should show range preview during selection', async () => {
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} rangeSelection={true} />
      );
      
      const startDay = getByTestId('day-10');
      fireEvent(startDay, 'longPress');
      
      await waitFor(() => {
        expect(getByText(/Selecting range/i)).toBeTruthy();
      });
    });
  });
  
  describe('event display', () => {
    it('should show event indicators on dates with events', () => {
      const events = [
        { date: new Date('2025-09-15'), title: 'Campaign Launch' },
        { date: new Date('2025-09-20'), title: 'Review Meeting' }
      ];
      
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} events={events} />
      );
      
      expect(getByTestId('event-dot-15')).toBeTruthy();
      expect(getByTestId('event-dot-20')).toBeTruthy();
    });
    
    it('should handle event click', () => {
      const onEventClick = jest.fn();
      const events = [
        { id: '1', date: new Date('2025-09-15'), title: 'Campaign Launch' }
      ];
      
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} events={events} onEventClick={onEventClick} />
      );
      
      const eventDay = getByTestId('day-15');
      fireEvent.press(eventDay);
      
      expect(onEventClick).toHaveBeenCalledWith(events[0]);
    });
    
    it('should show event list view', () => {
      const events = [
        { date: new Date('2025-09-15'), title: 'Campaign Launch' },
        { date: new Date('2025-09-20'), title: 'Review Meeting' }
      ];
      
      const { getByTestId, getByText } = render(
        <CampaignCalendar {...defaultProps} events={events} showEventList={true} />
      );
      
      const listToggle = getByTestId('toggle-list-view');
      fireEvent.press(listToggle);
      
      expect(getByText('Campaign Launch')).toBeTruthy();
      expect(getByText('Review Meeting')).toBeTruthy();
    });
  });
  
  describe('constraints', () => {
    it('should disable dates before minDate', () => {
      const minDate = new Date('2025-09-10');
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} minDate={minDate} />
      );
      
      const day5 = getByTestId('day-5');
      expect(day5.props.disabled).toBe(true);
    });
    
    it('should disable dates after maxDate', () => {
      const maxDate = new Date('2025-09-20');
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} maxDate={maxDate} />
      );
      
      const day25 = getByTestId('day-25');
      expect(day25.props.disabled).toBe(true);
    });
    
    it('should disable specific dates', () => {
      const disabledDates = [
        new Date('2025-09-15'),
        new Date('2025-09-16')
      ];
      
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} disabledDates={disabledDates} />
      );
      
      expect(getByTestId('day-15').props.disabled).toBe(true);
      expect(getByTestId('day-16').props.disabled).toBe(true);
    });
  });
  
  describe('accessibility', () => {
    it('should have accessible labels for dates', () => {
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const day15 = getByTestId('day-15');
      expect(day15.props.accessibilityLabel).toMatch(/15/);
    });
    
    it('should announce selected dates', () => {
      const selectedDates = [new Date('2025-09-15')];
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} selectedDates={selectedDates} />
      );
      
      const day15 = getByTestId('day-15');
      expect(day15.props.accessibilityState).toEqual({
        selected: true
      });
    });
    
    it('should provide navigation hints', () => {
      const { getByTestId } = render(
        <CampaignCalendar {...defaultProps} />
      );
      
      const prevButton = getByTestId('prev-month');
      expect(prevButton.props.accessibilityHint).toBe('Navigate to previous month');
      
      const nextButton = getByTestId('next-month');
      expect(nextButton.props.accessibilityHint).toBe('Navigate to next month');
    });
  });
});
