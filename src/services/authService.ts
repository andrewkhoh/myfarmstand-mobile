import { User } from '../types';
import { TokenService } from './tokenService';
import { supabase } from '../config/supabase';
import type { AuthError, Session, AuthResponse } from '@supabase/supabase-js';
import { 
  UserSchema, 
  LoginResponseSchema, 
  RegisterResponseSchema, 
  UpdateProfileResponseSchema,
  RefreshTokenResponseSchema,
  SupabaseAuthUserSchema,
  SupabaseSessionSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  UpdateProfileRequestSchema
} from '../schemas/auth.schema';
import { ServiceOperationResultSchema } from '../schemas/common.schema';
import { ZodError, z } from 'zod';
import { ValidationMonitor } from '../utils/validationMonitor';
import { ServiceValidator, ValidationUtils } from '../utils/validationPipeline';

// Validation helper functions
const validateUser = (userData: any): User => {
  try {
    return UserSchema.parse(userData);
  } catch (error) {
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'AuthService.validateUser',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'USER_VALIDATION_FAILED'
    });
    
    console.warn('Invalid user data received:', {
      error: error instanceof Error ? error.message : 'Unknown validation error',
      invalidData: userData
    });
    throw new Error('Invalid user data received from server');
  }
};

const validateSupabaseAuthUser = (authUser: any): any => {
  try {
    return SupabaseAuthUserSchema.parse(authUser);
  } catch (error) {
    // Log detailed validation error for debugging
    if (error instanceof ZodError) {
      console.error('🔴 Supabase auth user validation failed:', {
        issues: error.issues,
        receivedData: authUser,
        message: error.message
      });
    }
    
    // Add production validation monitoring
    ValidationMonitor.recordValidationError({
      context: 'AuthService.validateSupabaseAuthUser',
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      errorCode: 'SUPABASE_AUTH_USER_VALIDATION_FAILED'
    });
    
    console.warn('Invalid Supabase auth user data:', {
      error: error instanceof Error ? error.message : 'Unknown validation error',
      invalidData: authUser
    });
    throw new Error('Invalid authentication data received');
  }
};

const validateSupabaseSession = (session: any): any => {
  try {
    return SupabaseSessionSchema.parse(session);
  } catch (error) {
    console.warn('Invalid Supabase session data:', {
      error: error instanceof Error ? error.message : 'Unknown validation error',
      invalidData: session
    });
    throw new Error('Invalid session data received');
  }
};

// Input validation helpers that convert ZodError to domain errors
const validateLoginInput = (email: string, password: string): { email: string; password: string } => {
  // Pre-validate for backward compatibility with original error messages
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  if (!email.includes('@')) {
    throw new Error('Please enter a valid email address');
  }
  
  try {
    return LoginRequestSchema.parse({ email, password });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      if (firstIssue.path.includes('email')) {
        throw new Error('Please enter a valid email address');
      }
      if (firstIssue.path.includes('password')) {
        throw new Error(firstIssue.message);
      }
    }
    throw new Error('Invalid login credentials provided');
  }
};

const validateRegisterInput = (email: string, password: string, name: string, phone?: string, address?: string) => {
  // Pre-validate for backward compatibility
  if (!email || !password || !name) {
    throw new Error('Email, password, and name are required');
  }
  
  if (!email.includes('@')) {
    throw new Error('Please enter a valid email address');
  }
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  
  try {
    return RegisterRequestSchema.parse({ 
      email, 
      password, 
      confirmPassword: password,
      name,
      phone,
      address
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new Error(firstIssue.message);
    }
    throw new Error('Invalid registration data provided');
  }
};

const validateUpdateProfileInput = (updates: Partial<User>) => {
  try {
    return UpdateProfileRequestSchema.parse({
      name: updates.name,
      phone: updates.phone,
      address: updates.address,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new Error(firstIssue.message);
    }
    throw new Error('Invalid profile update data provided');
  }
};

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
      console.log('🔐 Starting login process for:', email);
      
      // Enhanced input validation using validation pipeline
      const LoginInputSchema = z.object({
        email: ValidationUtils.createEmailSchema(),
        password: z.string().min(6, 'Password must be at least 6 characters long')
      });
      
      const validatedInput = await ServiceValidator.validateInput(
        { email, password },
        LoginInputSchema,
        'AuthService.login'
      );
      
      // Use validated input for consistency
      email = validatedInput.email;
      password = validatedInput.password;

      // Clear any existing session first to prevent conflicts (device-specific)
      console.log('🧹 Clearing any existing session...');
      
      // Check if there's an existing session
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession.session) {
        console.log('⚠️ Found existing session, clearing...');
        await supabase.auth.signOut({ scope: 'local' });
        // Additional cleanup for devices
        await supabase.auth.signOut({ scope: 'global' });
      } else {
        console.log('✅ No existing session found');
      }
      
      // Longer delay for devices to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 200));

      // Authenticate with Supabase
      console.log('🔑 Attempting Supabase authentication...');
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

      // Log the actual data structure for debugging
      console.log('🔍 Supabase auth response user data:', JSON.stringify(data.user, null, 2));
      console.log('🔍 Supabase auth response session data:', JSON.stringify(data.session, null, 2));
      
      // Validate Supabase auth response data
      const validatedAuthUser = validateSupabaseAuthUser(data.user);
      const validatedSession = validateSupabaseSession(data.session);

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

      // Convert to app User type and validate
      const userObject = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        phone: userProfile.phone || undefined,
        address: userProfile.address || undefined,
        role: userProfile.role,
      };
      
      const user = validateUser(userObject);

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
    phone?: string,
    address?: string
  ): Promise<RegisterResponse> {
    try {
      // Input validation with backward-compatible error handling
      const validatedInput = validateRegisterInput(email, password, name, phone, address);
      
      // Use validated input for consistency
      email = validatedInput.email;
      password = validatedInput.password;
      name = validatedInput.name;

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
      console.log('🚪 Starting logout process...');
      
      // Device-specific aggressive session cleanup
      console.log('📱 Performing device-specific session cleanup...');
      
      // First, try global scope signout for devices
      const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
      if (globalError) {
        console.warn('⚠️ Global signout failed:', globalError.message);
      } else {
        console.log('✅ Global Supabase session cleared');
      }
      
      // Then local scope as backup
      const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
      if (localError) {
        console.warn('⚠️ Local signout failed:', localError.message);
      } else {
        console.log('✅ Local Supabase session cleared');
      }

      // Clear all stored tokens and user data with device-specific cleanup
      await TokenService.clearAllTokens();
      console.log('🧹 Local tokens cleared');

      // Verify session is actually cleared
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (sessionCheck.session) {
        console.warn('⚠️ Session still exists after cleanup, forcing additional cleanup...');
        // Force additional cleanup
        await supabase.auth.signOut({ scope: 'others' });
      } else {
        console.log('✅ Session verification: no active session');
      }

      // Longer delay for devices to ensure native cleanup
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force cleanup even on error
      try {
        await TokenService.clearAllTokens();
      } catch (cleanupError) {
        console.error('❌ Token cleanup error:', cleanupError);
      }
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

      // Validate session data
      const validatedSession = validateSupabaseSession(session);

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

      // Convert to app User type and validate
      const userObject = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        phone: userProfile.phone || undefined,
        address: userProfile.address || undefined,
        role: userProfile.role,
      };
      
      const user = validateUser(userObject);
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
      // Input validation with backward-compatible error handling
      const validatedUpdates = validateUpdateProfileInput(updates);

      // Update user profile in database
      const { data: updatedProfile, error } = await supabase
        .from('users')
        .update({
          name: validatedUpdates.name,
          phone: validatedUpdates.phone || null,
          address: validatedUpdates.address || null,
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

      // Convert to app User type and validate
      const userObject = {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        phone: updatedProfile.phone || undefined,
        address: updatedProfile.address || undefined,
        role: updatedProfile.role,
      };
      
      const updatedUser = validateUser(userObject);

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
   * Change user password using Supabase Auth
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Input validation
      if (!currentPassword) {
        throw new Error('Current password is required');
      }

      if (!newPassword) {
        throw new Error('New password is required');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Change password error:', error);
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
