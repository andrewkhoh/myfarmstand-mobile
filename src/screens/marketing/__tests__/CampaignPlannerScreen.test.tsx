import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Mock the screen (doesn't exist yet - RED phase)
const CampaignPlannerScreen = jest.fn(() => null);
jest.mock('../CampaignPlannerScreen', () => ({
  default: jest.fn(() => null)
}));

// Mock campaign planning hooks
jest.mock('@/hooks/marketing/useCampaignPlanner', () => ({
  useCampaignPlanner: jest.fn(() => ({
    campaigns: [
      {
        id: '1',
        name: 'Summer Sale',
        startDate: '2025-06-01',
        endDate: '2025-06-30',
        channels: ['email', 'social'],
        status: 'scheduled'
      },
      {
        id: '2',
        name: 'Back to School',
        startDate: '2025-08-15',
        endDate: '2025-09-15',
        channels: ['email', 'push'],
        status: 'draft'
      }
    ],
    createCampaign: jest.fn(),
    updateCampaign: jest.fn(),
    deleteCampaign: jest.fn(),
    duplicateCampaign: jest.fn(),
    isLoading: false
  }))
}));

jest.mock('@/hooks/marketing/useTargetAudience', () => ({
  useTargetAudience: jest.fn(() => ({
    segments: [
      { id: '1', name: 'VIP Customers', size: 1200 },
      { id: '2', name: 'New Customers', size: 3400 },
      { id: '3', name: 'Inactive Users', size: 890 }
    ],
    createSegment: jest.fn(),
    estimateReach: jest.fn(() => 5490),
    isCalculating: false
  }))
}));

jest.mock('@/hooks/marketing/useCalendar', () => ({
  useCalendar: jest.fn(() => ({
    events: [],
    addEvent: jest.fn(),
    updateEvent: jest.fn(),
    removeEvent: jest.fn(),
    view: 'month',
    setView: jest.fn(),
    selectedDate: new Date('2025-01-15')
  }))
}));

const mockNavigate = jest.fn();

describe('CampaignPlannerScreen', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });
  
  const renderScreen = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <CampaignPlannerScreen {...props} />
        </NavigationContainer>
      </QueryClientProvider>
    );
  };
  
  describe('Calendar View', () => {
    it('should render calendar component', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('campaign-calendar')).toBeTruthy();
      });
    });
    
    it('should display current month by default', async () => {
      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('January 2025')).toBeTruthy();
      });
    });
    
    it('should navigate between months', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('next-month-button'));
        expect(getByText('February 2025')).toBeTruthy();
        
        fireEvent.press(getByTestId('prev-month-button'));
        expect(getByText('January 2025')).toBeTruthy();
      });
    });
    
    it('should switch between calendar views', async () => {
      const { getByTestId, getByText } = renderScreen();
      const { setView } = require('@/hooks/marketing/useCalendar').useCalendar();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-switcher'));
        fireEvent.press(getByText('Week'));
      });
      
      expect(setView).toHaveBeenCalledWith('week');
    });
    
    it('should highlight campaigns on calendar', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('campaign-event-1')).toBeTruthy();
        expect(getByTestId('campaign-event-2')).toBeTruthy();
      });
    });
    
    it('should show campaign details on date tap', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('calendar-date-2025-06-01'));
      });
      
      expect(getByTestId('campaign-details-modal')).toBeTruthy();
      expect(getByText('Summer Sale')).toBeTruthy();
    });
    
    it('should allow drag and drop to reschedule', async () => {
      const { getByTestId } = renderScreen();
      const { updateCampaign } = require('@/hooks/marketing/useCampaignPlanner').useCampaignPlanner();
      
      await waitFor(() => {
        const event = getByTestId('campaign-event-1');
        fireEvent(event, 'onDragStart');
        fireEvent(event, 'onDragEnd', { 
          date: '2025-06-05' 
        });
      });
      
      expect(updateCampaign).toHaveBeenCalledWith('1', {
        startDate: '2025-06-05'
      });
    });
  });
  
  describe('Campaign Creation', () => {
    it('should show create campaign button', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('create-campaign-button')).toBeTruthy();
      });
    });
    
    it('should open campaign creation form', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-campaign-button'));
      });
      
      expect(getByTestId('campaign-form-modal')).toBeTruthy();
      expect(getByText('New Campaign')).toBeTruthy();
    });
    
    it('should validate campaign name', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-campaign-button'));
        fireEvent.press(getByTestId('save-campaign-button'));
      });
      
      expect(getByText('Campaign name is required')).toBeTruthy();
    });
    
    it('should select campaign dates', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-campaign-button'));
        
        const startDatePicker = getByTestId('start-date-picker');
        fireEvent(startDatePicker, 'onDateChange', new Date('2025-07-01'));
        
        const endDatePicker = getByTestId('end-date-picker');
        fireEvent(endDatePicker, 'onDateChange', new Date('2025-07-31'));
      });
      
      expect(getByTestId('date-range-display')).toHaveTextContent('Jul 1 - Jul 31, 2025');
    });
    
    it('should validate date range', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-campaign-button'));
        
        const startDatePicker = getByTestId('start-date-picker');
        fireEvent(startDatePicker, 'onDateChange', new Date('2025-07-31'));
        
        const endDatePicker = getByTestId('end-date-picker');
        fireEvent(endDatePicker, 'onDateChange', new Date('2025-07-01'));
      });
      
      expect(getByText('End date must be after start date')).toBeTruthy();
    });
    
    it('should save new campaign', async () => {
      const { getByTestId } = renderScreen();
      const { createCampaign } = require('@/hooks/marketing/useCampaignPlanner').useCampaignPlanner();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-campaign-button'));
        
        const nameInput = getByTestId('campaign-name-input');
        fireEvent.changeText(nameInput, 'Flash Sale');
        
        fireEvent.press(getByTestId('save-campaign-button'));
      });
      
      expect(createCampaign).toHaveBeenCalledWith({
        name: 'Flash Sale',
        startDate: expect.any(Date),
        endDate: expect.any(Date)
      });
    });
  });
  
  describe('Target Audience Builder', () => {
    it('should display audience segments', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('audience-builder')).toBeTruthy();
        const segments = getAllByTestId(/segment-item-/);
        expect(segments).toHaveLength(3);
      });
    });
    
    it('should show segment sizes', async () => {
      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('VIP Customers (1,200)')).toBeTruthy();
        expect(getByText('New Customers (3,400)')).toBeTruthy();
        expect(getByText('Inactive Users (890)')).toBeTruthy();
      });
    });
    
    it('should select multiple segments', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const segment1 = getByTestId('segment-checkbox-1');
        const segment2 = getByTestId('segment-checkbox-2');
        
        fireEvent.press(segment1);
        fireEvent.press(segment2);
        
        expect(segment1.props.checked).toBe(true);
        expect(segment2.props.checked).toBe(true);
      });
    });
    
    it('should calculate estimated reach', async () => {
      const { getByTestId, getByText } = renderScreen();
      const { estimateReach } = require('@/hooks/marketing/useTargetAudience').useTargetAudience();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('segment-checkbox-1'));
        fireEvent.press(getByTestId('segment-checkbox-2'));
      });
      
      expect(estimateReach).toHaveBeenCalledWith(['1', '2']);
      expect(getByText('Estimated Reach: 4,600')).toBeTruthy();
    });
    
    it('should create custom segment', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-segment-button'));
      });
      
      expect(getByTestId('segment-builder-modal')).toBeTruthy();
      expect(getByText('Create Audience Segment')).toBeTruthy();
    });
    
    it('should add segment filters', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('create-segment-button'));
        fireEvent.press(getByTestId('add-filter-button'));
      });
      
      expect(getByText('Age Range')).toBeTruthy();
      expect(getByText('Location')).toBeTruthy();
      expect(getByText('Purchase History')).toBeTruthy();
      expect(getByText('Engagement Level')).toBeTruthy();
    });
  });
  
  describe('Channel Selection', () => {
    it('should display available channels', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByTestId('channel-selector')).toBeTruthy();
        expect(getByText('Email')).toBeTruthy();
        expect(getByText('Push Notifications')).toBeTruthy();
        expect(getByText('SMS')).toBeTruthy();
        expect(getByText('Social Media')).toBeTruthy();
      });
    });
    
    it('should select multiple channels', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        const emailChannel = getByTestId('channel-email');
        const pushChannel = getByTestId('channel-push');
        
        fireEvent.press(emailChannel);
        fireEvent.press(pushChannel);
        
        expect(emailChannel.props.selected).toBe(true);
        expect(pushChannel.props.selected).toBe(true);
      });
    });
    
    it('should show channel-specific settings', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('channel-email'));
        fireEvent.press(getByTestId('channel-settings-email'));
      });
      
      expect(getByText('Email Settings')).toBeTruthy();
      expect(getByTestId('email-template-selector')).toBeTruthy();
      expect(getByTestId('email-subject-input')).toBeTruthy();
    });
    
    it('should preview channel content', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('channel-email'));
        fireEvent.press(getByTestId('preview-channel-email'));
      });
      
      expect(getByTestId('channel-preview-modal')).toBeTruthy();
      expect(getByTestId('email-preview-content')).toBeTruthy();
    });
  });
  
  describe('Campaign Templates', () => {
    it('should show template gallery', async () => {
      const { getByTestId, getByText } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('use-template-button'));
      });
      
      expect(getByTestId('template-gallery')).toBeTruthy();
      expect(getByText('Seasonal Sale')).toBeTruthy();
      expect(getByText('Product Launch')).toBeTruthy();
      expect(getByText('Customer Win-back')).toBeTruthy();
    });
    
    it('should apply template to campaign', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('use-template-button'));
        fireEvent.press(getByTestId('template-seasonal-sale'));
      });
      
      expect(getByTestId('campaign-name-input').props.value).toBe('Seasonal Sale Campaign');
    });
  });
  
  describe('Campaign List View', () => {
    it('should toggle between calendar and list view', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-toggle-button'));
      });
      
      expect(getByTestId('campaign-list-view')).toBeTruthy();
    });
    
    it('should display campaigns in list', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-toggle-button'));
        const campaignRows = getAllByTestId(/campaign-row-/);
        expect(campaignRows).toHaveLength(2);
      });
    });
    
    it('should sort campaigns', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-toggle-button'));
        fireEvent.press(getByTestId('sort-button'));
        fireEvent.press(getByTestId('sort-by-date'));
      });
      
      const firstRow = getByTestId('campaign-row-0');
      expect(firstRow).toHaveTextContent('Summer Sale');
    });
    
    it('should filter campaigns', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('view-toggle-button'));
        fireEvent.press(getByTestId('filter-button'));
        fireEvent.press(getByTestId('filter-scheduled'));
      });
      
      const campaignRows = getAllByTestId(/campaign-row-/);
      expect(campaignRows).toHaveLength(1);
    });
  });
  
  describe('Navigation and Actions', () => {
    it('should navigate to campaign details', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('campaign-event-1'));
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('CampaignDetails', {
        campaignId: '1'
      });
    });
    
    it('should duplicate campaign', async () => {
      const { getByTestId } = renderScreen();
      const { duplicateCampaign } = require('@/hooks/marketing/useCampaignPlanner').useCampaignPlanner();
      
      await waitFor(() => {
        fireEvent.longPress(getByTestId('campaign-event-1'));
        fireEvent.press(getByTestId('duplicate-option'));
      });
      
      expect(duplicateCampaign).toHaveBeenCalledWith('1');
    });
    
    it('should delete campaign with confirmation', async () => {
      const { getByTestId } = renderScreen();
      const { deleteCampaign } = require('@/hooks/marketing/useCampaignPlanner').useCampaignPlanner();
      
      await waitFor(() => {
        fireEvent.longPress(getByTestId('campaign-event-1'));
        fireEvent.press(getByTestId('delete-option'));
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Campaign',
        'Are you sure you want to delete this campaign?',
        expect.any(Array)
      );
      
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      alertCall[2][1].onPress();
      
      expect(deleteCampaign).toHaveBeenCalledWith('1');
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = renderScreen();
      
      await waitFor(() => {
        expect(getByLabelText('Campaign Calendar')).toBeTruthy();
        expect(getByLabelText('Create New Campaign')).toBeTruthy();
        expect(getByLabelText('Target Audience Builder')).toBeTruthy();
        expect(getByLabelText('Channel Selector')).toBeTruthy();
      });
    });
    
    it('should announce calendar navigation', async () => {
      const { getByTestId } = renderScreen();
      
      await waitFor(() => {
        fireEvent.press(getByTestId('next-month-button'));
        const announcement = getByTestId('screen-reader-announcement');
        expect(announcement).toHaveTextContent('Navigated to February 2025');
      });
    });
  });
});