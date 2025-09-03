import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { CampaignPlannerScreen } from '../CampaignPlannerScreen';
import { marketingService } from '../../../services/marketing/marketingService';

// Mock the marketing service
jest.mock('../../../services/marketing/marketingService');

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

describe('CampaignPlannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (marketingService.createCampaign as jest.Mock).mockResolvedValue({
      id: 'new-campaign-1',
      name: 'New Campaign',
      description: 'Campaign description',
      status: 'draft',
      startDate: new Date(),
      endDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (marketingService.updateCampaign as jest.Mock).mockResolvedValue({
      id: 'campaign-1',
      name: 'Updated Campaign',
      status: 'active',
    });

    (marketingService.getCampaigns as jest.Mock).mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('should render the campaign planner screen', () => {
      const { getByText, getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      expect(getByText('Campaign Planner')).toBeTruthy();
      expect(getByTestId('campaign-planner-screen')).toBeTruthy();
    });

    it('should display calendar view', () => {
      const { getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      expect(getByTestId('campaign-calendar')).toBeTruthy();
    });

    it('should show campaign form fields', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      expect(getByPlaceholderText('Campaign Name')).toBeTruthy();
      expect(getByPlaceholderText('Campaign Description')).toBeTruthy();
      expect(getByTestId('start-date-picker')).toBeTruthy();
      expect(getByTestId('end-date-picker')).toBeTruthy();
    });

    it('should display target audience builder', () => {
      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      expect(getByText('Target Audience')).toBeTruthy();
      expect(getByTestId('audience-builder')).toBeTruthy();
    });

    it('should show channel selection', () => {
      const { getByText, getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      expect(getByText('Marketing Channels')).toBeTruthy();
      expect(getByTestId('channel-email')).toBeTruthy();
      expect(getByTestId('channel-social')).toBeTruthy();
      expect(getByTestId('channel-sms')).toBeTruthy();
    });

    it('should display budget settings', () => {
      const { getByPlaceholderText, getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      expect(getByText('Budget')).toBeTruthy();
      expect(getByPlaceholderText('Total Budget')).toBeTruthy();
      expect(getByPlaceholderText('Daily Spend Limit')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should handle campaign name input', () => {
      const { getByPlaceholderText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const nameInput = getByPlaceholderText('Campaign Name');
      fireEvent.changeText(nameInput, 'Summer Sale 2024');
      
      expect(nameInput.props.value).toBe('Summer Sale 2024');
    });

    it('should handle date selection', () => {
      const { getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const startDatePicker = getByTestId('start-date-picker');
      fireEvent.press(startDatePicker);
      
      expect(getByTestId('date-picker-modal')).toBeTruthy();
    });

    it('should handle channel selection', () => {
      const { getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const emailChannel = getByTestId('channel-email');
      fireEvent.press(emailChannel);
      
      expect(emailChannel.props.selected).toBe(true);
    });

    it('should create campaign on submit', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      // Fill form
      fireEvent.changeText(getByPlaceholderText('Campaign Name'), 'Test Campaign');
      fireEvent.changeText(getByPlaceholderText('Campaign Description'), 'Test Description');
      
      // Submit
      fireEvent.press(getByTestId('create-campaign-button'));
      
      await waitFor(() => {
        expect(marketingService.createCampaign).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Campaign',
            description: 'Test Description',
          })
        );
      });
    });

    it('should navigate back after successful creation', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      fireEvent.changeText(getByPlaceholderText('Campaign Name'), 'Test Campaign');
      fireEvent.press(getByTestId('create-campaign-button'));
      
      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });

    it('should validate required fields', () => {
      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      // Try to submit without filling required fields
      fireEvent.press(getByTestId('create-campaign-button'));
      
      expect(getByText('Campaign name is required')).toBeTruthy();
    });

    it('should handle audience segment selection', () => {
      const { getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const segment = getByTestId('segment-young-adults');
      fireEvent.press(segment);
      
      expect(segment.props.selected).toBe(true);
    });

    it('should calculate estimated reach', () => {
      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      // Select audience segments
      fireEvent.press(getByTestId('segment-young-adults'));
      fireEvent.press(getByTestId('segment-urban'));
      
      expect(getByText('Estimated Reach: 25,000')).toBeTruthy();
    });

    it('should handle budget input', () => {
      const { getByPlaceholderText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const budgetInput = getByPlaceholderText('Total Budget');
      fireEvent.changeText(budgetInput, '5000');
      
      expect(budgetInput.props.value).toBe('5000');
    });

    it('should preview campaign before creation', () => {
      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('preview-campaign-button'));
      
      expect(getByTestId('campaign-preview-modal')).toBeTruthy();
      expect(getByText('Campaign Preview')).toBeTruthy();
    });
  });

  describe('Calendar Features', () => {
    it('should display current month', () => {
      const { getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      expect(getByText(currentMonth)).toBeTruthy();
    });

    it('should navigate between months', () => {
      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const nextButton = getByTestId('calendar-next-month');
      fireEvent.press(nextButton);
      
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleString('default', { month: 'long' });
      expect(getByText(new RegExp(nextMonth))).toBeTruthy();
    });

    it('should highlight selected dates', () => {
      const { getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const date = getByTestId('calendar-date-15');
      fireEvent.press(date);
      
      expect(date.props.style).toContainEqual(expect.objectContaining({
        backgroundColor: expect.any(String)
      }));
    });

    it('should show existing campaigns on calendar', async () => {
      (marketingService.getCampaigns as jest.Mock).mockResolvedValue([
        {
          id: '1',
          name: 'Existing Campaign',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      ]);
      
      const { getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      await waitFor(() => {
        expect(getByTestId('calendar-campaign-indicator')).toBeTruthy();
      });
    });
  });

  describe('Target Audience Builder', () => {
    it('should display demographic options', () => {
      const { getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      expect(getByText('Age Range')).toBeTruthy();
      expect(getByText('Gender')).toBeTruthy();
      expect(getByText('Location')).toBeTruthy();
      expect(getByText('Interests')).toBeTruthy();
    });

    it('should handle age range selection', () => {
      const { getByTestId } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const ageSlider = getByTestId('age-range-slider');
      fireEvent(ageSlider, 'onValueChange', [25, 45]);
      
      expect(getByTestId('age-range-display').props.children).toContain('25-45');
    });

    it('should handle location input', () => {
      const { getByPlaceholderText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      const locationInput = getByPlaceholderText('Enter locations');
      fireEvent.changeText(locationInput, 'New York, Los Angeles');
      
      expect(locationInput.props.value).toBe('New York, Los Angeles');
    });

    it('should show audience size estimate', () => {
      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      // Make selections
      fireEvent.press(getByTestId('gender-all'));
      fireEvent(getByTestId('age-range-slider'), 'onValueChange', [18, 65]);
      
      expect(getByText(/Estimated Audience:/)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      expect(getByLabelText('Campaign name input')).toBeTruthy();
      expect(getByLabelText('Start date selector')).toBeTruthy();
      expect(getByLabelText('Create campaign')).toBeTruthy();
    });

    it('should announce form validation errors', () => {
      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen navigation={mockNavigation} />
      );
      
      fireEvent.press(getByTestId('create-campaign-button'));
      
      const errorMessage = getByText('Campaign name is required');
      expect(errorMessage.props.accessibilityRole).toBe('alert');
    });
  });
});