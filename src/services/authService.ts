import { User } from '../types';
import { TokenService } from './tokenService';
import { supabase } from '../config/supabase';
import type { AuthError, Session, AuthResponse } from '@supabase/supabase-js';

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
   * Login user with email and password using Supabase Auth
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session || !data.user) {
        throw new Error('Authentication failed');
      }

      // Get user profile from database
      let { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, create one
        const newProfile = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || email.split('@')[0],
          phone: data.user.user_metadata?.phone || null,
          address: data.user.user_metadata?.address || null,
          role: 'customer' as const, // Default role
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('users')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          throw new Error('Failed to create user profile');
        }

        userProfile = createdProfile;
      }

      // Convert to app User type
      const user: User = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        role: userProfile.role,
      };

      // Store tokens and user data securely
      await Promise.all([
        TokenService.setAccessToken(data.session.access_token),
        TokenService.setRefreshToken(data.session.refresh_token),
        TokenService.setUser(user),
      ]);

      return {
        success: true,
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new user using Supabase Auth
   */
  static async register(
    email: string,
    password: string,
    name: string,
    phone: string,
    address: string
  ): Promise<RegisterResponse> {
    try {
      // Input validation
      if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
      }

      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            address,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Registration failed');
      }

      // Create user profile in database
      const userProfile = {
        id: data.user.id,
        email: data.user.email!,
        name,
        phone: phone || null,
        address: address || null,
        role: 'customer' as const,
      };

      const { error: profileError } = await supabase
        .from('users')
        .insert(userProfile);

      if (profileError) {
        // If user creation fails, we should clean up the auth user
        // but for now, we'll just log the error
        console.error('Failed to create user profile:', profileError);
      }

      // Convert to app User type
      const user: User = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        role: userProfile.role,
      };

      // If we have a session (auto-login after registration)
      if (data.session) {
        await Promise.all([
          TokenService.setAccessToken(data.session.access_token),
          TokenService.setRefreshToken(data.session.refresh_token),
          TokenService.setUser(user),
        ]);
      }

      return {
        success: true,
        user,
        accessToken: data.session?.access_token || '',
        refreshToken: data.session?.refresh_token || '',
        message: 'Registration successful',
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Logout user and clear all tokens using Supabase Auth
   */
  static async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase logout error:', error);
        // Continue with local cleanup even if Supabase logout fails
      }

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
   * Get current user from Supabase session and database
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return null;
      }

      // Get user profile from database
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !userProfile) {
        console.error('Failed to get user profile:', error);
        return null;
      }

      // Convert to app User type
      const user: User = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        role: userProfile.role,
      };

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Update user profile using Supabase
   */
  static async updateProfile(userId: string, updates: Partial<User>): Promise<UpdateProfileResponse> {
    try {
      // Input validation
      if (updates.name && updates.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }

      if (updates.email && !updates.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Update user profile in database
      const { data: updatedProfile, error } = await supabase
        .from('users')
        .update({
          name: updates.name,
          phone: updates.phone || null,
          address: updates.address || null,
          // Note: email and role updates might need special handling
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!updatedProfile) {
        throw new Error('Failed to update user profile');
      }

      // Convert to app User type
      const updatedUser: User = {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        phone: updatedProfile.phone || '',
        address: updatedProfile.address || '',
        role: updatedProfile.role,
      };

      // Update local storage
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
   * Refresh access token using Supabase Auth
   */
  static async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      // Supabase handles token refresh automatically
      // This method manually triggers a refresh if needed
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        throw new Error('Failed to refresh session');
      }

      // Store new tokens
      await Promise.all([
        TokenService.setAccessToken(data.session.access_token),
        TokenService.setRefreshToken(data.session.refresh_token),
      ]);

      return {
        success: true,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid authentication using Supabase
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      return !!session?.user;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }
}
