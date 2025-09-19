import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileScreen } from '../ProfileScreen';
import { useCurrentUser } from '../../hooks/useAuth';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('ProfileScreen Logout Functionality', () => {
  let queryClient: QueryClient;
  let mockLogout: jest.Mock;
  let mockUpdateUser: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockLogout = jest.fn().mockResolvedValue(undefined);
    mockUpdateUser = jest.fn();

    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'customer',
        phone: '555-0123',
        address: '123 Test St'
      },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      clearUserData: jest.fn(),
      updateUser: mockUpdateUser,
    });

    jest.clearAllMocks();
  });

  const renderProfileScreen = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProfileScreen />
      </QueryClientProvider>
    );
  };

  it('should display logout button', () => {
    const { getByText } = renderProfileScreen();
    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('should show confirmation dialog when logout button is pressed', () => {
    const { getByText } = renderProfileScreen();
    
    fireEvent.press(getByText('Sign Out'));
    
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Sign Out', style: 'destructive' }),
      ])
    );
  });

  it('should call logout function when user confirms logout', async () => {
    const { getByText } = renderProfileScreen();
    
    fireEvent.press(getByText('Sign Out'));
    
    // Get the Alert.alert call arguments
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const signOutButton = buttons.find((button: any) => button.text === 'Sign Out');
    
    // Simulate pressing the Sign Out button in the alert
    await act(async () => {
      await signOutButton.onPress();
    });
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should not call logout function when user cancels', () => {
    const { getByText } = renderProfileScreen();
    
    fireEvent.press(getByText('Sign Out'));
    
    // Get the Alert.alert call arguments
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const cancelButton = buttons.find((button: any) => button.text === 'Cancel');
    
    // Simulate pressing the Cancel button in the alert
    if (cancelButton.onPress) {
      cancelButton.onPress();
    }
    
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('should handle logout errors gracefully', async () => {
    const logoutError = new Error('Network error');
    mockLogout.mockRejectedValueOnce(logoutError);
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const { getByText } = renderProfileScreen();
    
    fireEvent.press(getByText('Sign Out'));
    
    // Get the Alert.alert call arguments
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const signOutButton = buttons.find((button: any) => button.text === 'Sign Out');
    
    // Simulate pressing the Sign Out button in the alert
    await act(async () => {
      await signOutButton.onPress();
    });
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith('Logout error:', logoutError);
    
    // Should show error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to sign out. Please try again.'
      );
    });
    
    consoleSpy.mockRestore();
  });

  it('should handle successful logout', async () => {
    const { getByText } = renderProfileScreen();
    
    fireEvent.press(getByText('Sign Out'));
    
    // Get the Alert.alert call arguments
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const signOutButton = buttons.find((button: any) => button.text === 'Sign Out');
    
    // Simulate pressing the Sign Out button in the alert
    await act(async () => {
      await signOutButton.onPress();
    });
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
    
    // Should not show any error alerts (only the confirmation alert)
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('should render logout button with correct styling', () => {
    const { getByText } = renderProfileScreen();
    const logoutButton = getByText('Sign Out');
    
    expect(logoutButton).toBeTruthy();
    // The button should be rendered within the Account Actions section
    expect(logoutButton.parent).toBeTruthy();
  });
});
