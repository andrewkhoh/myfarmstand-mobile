import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CampaignPlannerScreen } from '../CampaignPlannerScreen';
import { useCampaignMutation } from '@/hooks/marketing/useCampaignMutation';
import { useCampaignData } from '@/hooks/marketing/useCampaignData';
import { Alert } from 'react-native';

jest.mock('@/hooks/marketing/useCampaignMutation');
jest.mock('@/hooks/marketing/useCampaignData');

describe('CampaignPlannerScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  const mockRoute = {
    params: {},
    name: 'CampaignPlanner',
    key: 'campaign-planner',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = jest.fn();
  });

  describe('Form Rendering', () => {
    it('should render all form fields', () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByTestId, getByPlaceholderText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(getByPlaceholderText('Campaign Name')).toBeTruthy();
      expect(getByPlaceholderText('Description')).toBeTruthy();
      expect(getByTestId('start-date-picker')).toBeTruthy();
      expect(getByTestId('end-date-picker')).toBeTruthy();
      expect(getByTestId('target-audience-input')).toBeTruthy();
      expect(getByTestId('budget-input')).toBeTruthy();
    });

    it('should show create mode UI', () => {
      const createRoute = {
        params: { mode: 'create' as 'create' },
        name: 'CampaignPlanner',
        key: 'campaign-planner',
      };

      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByText } = render(
        <CampaignPlannerScreen route={createRoute} navigation={mockNavigation} />
      );

      expect(getByText('Create Campaign')).toBeTruthy();
    });

    it('should show edit mode UI with existing data', () => {
      const editRoute = {
        params: { campaignId: 'campaign-1', mode: 'edit' as 'edit' },
        name: 'CampaignPlanner',
        key: 'campaign-planner',
      };

      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: {
          id: 'campaign-1',
          name: 'Summer Sale',
          description: 'Summer promotion',
          startDate: '2024-06-01',
          endDate: '2024-08-31',
          targetAudience: 'All customers',
          budget: 5000,
        },
        isLoading: false,
      });

      const { getByDisplayValue, getByText } = render(
        <CampaignPlannerScreen route={editRoute} navigation={mockNavigation} />
      );

      expect(getByDisplayValue('Summer Sale')).toBeTruthy();
      expect(getByDisplayValue('Summer promotion')).toBeTruthy();
      expect(getByText('Update Campaign')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty campaign name', async () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const submitButton = getByText('Create Campaign');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Campaign name is required')).toBeTruthy();
      });
    });

    it('should validate date range', async () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const startDatePicker = getByTestId('start-date-picker');
      const endDatePicker = getByTestId('end-date-picker');

      // Set end date before start date
      fireEvent(startDatePicker, 'onChange', new Date('2024-08-01'));
      fireEvent(endDatePicker, 'onChange', new Date('2024-07-01'));

      const submitButton = getByText('Create Campaign');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('End date must be after start date')).toBeTruthy();
      });
    });

    it('should validate budget is positive', async () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const budgetInput = getByTestId('budget-input');
      fireEvent.changeText(budgetInput, '-100');

      const submitButton = getByText('Create Campaign');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Budget must be positive')).toBeTruthy();
      });
    });
  });

  describe('Campaign Creation', () => {
    it('should handle successful campaign creation', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ id: 'new-campaign' });
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: mockCreate,
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Campaign Name'), 'New Campaign');
      fireEvent.changeText(getByPlaceholderText('Description'), 'Test description');
      // Since we can't actually pick dates in the test, just press the date pickers
      // which will set them to current date
      fireEvent.press(getByTestId('start-date-picker'));
      fireEvent.press(getByTestId('end-date-picker'));
      fireEvent.changeText(getByTestId('budget-input'), '1000');

      const submitButton = getByText('Create Campaign');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'New Campaign',
          description: 'Test description',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          budget: 1000,
          targetAudience: '',
        });
        expect(mockNavigation.goBack).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Campaign created');
      });
    });

    it('should show loading state during creation', () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: true,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByTestId } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const submitButton = getByTestId('submit-button');
      expect(submitButton.props.disabled).toBe(true);
      expect(getByTestId('submit-loading')).toBeTruthy();
    });

    it('should handle creation error', async () => {
      const mockCreate = jest.fn().mockRejectedValue(new Error('Network error'));
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: mockCreate,
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Campaign Name'), 'New Campaign');
      // Since we can't actually pick dates in the test, just press the date pickers
      // which will set them to current date
      fireEvent.press(getByTestId('start-date-picker'));
      fireEvent.press(getByTestId('end-date-picker'));

      const submitButton = getByText('Create Campaign');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });
  });

  describe('Campaign Update', () => {
    it('should handle successful campaign update', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ id: 'campaign-1' });
      const editRoute = {
        params: { campaignId: 'campaign-1', mode: 'edit' as 'edit' },
        name: 'CampaignPlanner',
        key: 'campaign-planner',
      };

      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: mockUpdate,
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: {
          id: 'campaign-1',
          name: 'Existing Campaign',
          description: 'Existing description',
          startDate: '2024-06-01',
          endDate: '2024-08-31',
          targetAudience: 'All',
          budget: 5000,
        },
        isLoading: false,
      });

      const { getByDisplayValue, getByText } = render(
        <CampaignPlannerScreen route={editRoute} navigation={mockNavigation} />
      );

      const nameInput = getByDisplayValue('Existing Campaign');
      fireEvent.changeText(nameInput, 'Updated Campaign');

      const submitButton = getByText('Update Campaign');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          id: 'campaign-1',
          name: 'Updated Campaign',
          description: 'Existing description',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          targetAudience: 'All',
          budget: 5000,
        });
        expect(mockNavigation.goBack).toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Campaign updated');
      });
    });
  });

  describe('Target Audience Selection', () => {
    it('should allow selecting predefined audience segments', () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
        audienceSegments: ['New Customers', 'Returning Customers', 'VIP'],
      });

      const { getByTestId, getByText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const audienceDropdown = getByTestId('audience-dropdown');
      fireEvent.press(audienceDropdown);

      expect(getByText('New Customers')).toBeTruthy();
      expect(getByText('Returning Customers')).toBeTruthy();
      expect(getByText('VIP')).toBeTruthy();
    });

    it('should allow custom audience input', () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByTestId } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const audienceInput = getByTestId('target-audience-input');
      fireEvent.changeText(audienceInput, 'Custom segment');

      expect(audienceInput.props.value).toBe('Custom segment');
    });
  });

  describe('Products Selection', () => {
    it('should allow selecting products for campaign', () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
        availableProducts: [
          { id: 'p1', name: 'Product A' },
          { id: 'p2', name: 'Product B' },
        ],
      });

      const { getByText, getByTestId } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const productSelector = getByTestId('product-selector');
      fireEvent.press(productSelector);

      const productA = getByText('Product A');
      fireEvent.press(productA);

      expect(getByTestId('selected-products')).toBeTruthy();
    });

    it('should handle removing selected products', () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: {
          selectedProducts: ['p1'],
        },
        isLoading: false,
      });

      const { getByTestId } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const removeButton = getByTestId('remove-product-p1');
      fireEvent.press(removeButton);

      expect(getByTestId('selected-products').children).toHaveLength(0);
    });
  });

  describe('Navigation', () => {
    it('should have cancel button that goes back', () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should show unsaved changes warning', () => {
      (useCampaignMutation as jest.Mock).mockReturnValue({
        createCampaign: jest.fn(),
        updateCampaign: jest.fn(),
        isCreating: false,
      });
      (useCampaignData as jest.Mock).mockReturnValue({
        campaign: null,
        isLoading: false,
      });

      const { getByPlaceholderText, getByText } = render(
        <CampaignPlannerScreen route={mockRoute} navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Campaign Name'), 'Test');
      
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        expect.any(Array)
      );
    });
  });
});