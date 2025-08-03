import { User } from '../types';
import { TokenService } from './tokenService';

// Auth API response types
export interface LoginResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
  message?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  user: User;
  message?: string;
}

/**
 * Auth service for API calls
 * This replaces the mock auth logic in AuthContext
 */
export class AuthService {
  private static readonly API_BASE_URL = 'https://api.myfarmstand.com'; // Replace with actual API URL

  /**
   * Login user with email and password
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Mock API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Mock successful login
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        phone: '+1234567890',
        address: '123 Farm Street, Agriculture City, AC 12345',
        role: 'admin', // Always use admin for testing
      };

      const mockTokens = {
        accessToken: `mock_access_token_${Date.now()}`,
        refreshToken: `mock_refresh_token_${Date.now()}`,
      };

      // Store tokens securely
      await Promise.all([
        TokenService.setAccessToken(mockTokens.accessToken),
        TokenService.setRefreshToken(mockTokens.refreshToken),
        TokenService.setUser(mockUser),
      ]);

      return {
        success: true,
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  static async register(
    email: string,
    password: string,
    name: string,
    phone: string,
    address: string
  ): Promise<RegisterResponse> {
    try {
      // Mock API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock validation
      if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
      }

      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Mock successful registration
      const mockUser: User = {
        id: Date.now().toString(),
        email,
        name,
        phone: phone || '',
        address: address || '',
        role: 'customer',
      };

      const mockTokens = {
        accessToken: `mock_access_token_${Date.now()}`,
        refreshToken: `mock_refresh_token_${Date.now()}`,
      };

      // Store tokens securely
      await Promise.all([
        TokenService.setAccessToken(mockTokens.accessToken),
        TokenService.setRefreshToken(mockTokens.refreshToken),
        TokenService.setUser(mockUser),
      ]);

      return {
        success: true,
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        message: 'Registration successful',
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Logout user and clear all tokens
   */
  static async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      // In a real app, you might want to call an API endpoint to invalidate tokens
      // await fetch(`${this.API_BASE_URL}/auth/logout`, { method: 'POST' });

      // Clear all stored tokens and user data
      await TokenService.clearAllTokens();

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current user from secure storage
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      return await TokenService.getUser();
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<User>): Promise<UpdateProfileResponse> {
    try {
      // Mock API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock validation
      if (!updates.name || updates.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      if (!updates.email || !updates.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Get current user and merge updates
      const currentUser = await TokenService.getUser();
      if (!currentUser) {
        throw new Error('User not found');
      }

      const updatedUser: User = {
        ...currentUser,
        ...updates,
        id: currentUser.id, // Ensure ID doesn't change
      };

      // Store updated user
      await TokenService.setUser(updatedUser);

      return {
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = await TokenService.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Mock API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 500));

      const newTokens = {
        accessToken: `mock_access_token_${Date.now()}`,
        refreshToken: `mock_refresh_token_${Date.now()}`,
      };

      // Store new tokens
      await Promise.all([
        TokenService.setAccessToken(newTokens.accessToken),
        TokenService.setRefreshToken(newTokens.refreshToken),
      ]);

      return {
        success: true,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid authentication
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const hasTokens = await TokenService.hasValidTokens();
      const user = await TokenService.getUser();
      return hasTokens && !!user;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }
}
