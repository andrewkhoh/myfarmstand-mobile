/**
 * Auth Schema Tests
 * Following MyFarmstand Mobile Architectural Patterns
 */

import { z } from 'zod';
import {
  UserSchema,
  UserRoleSchema,
  AuthStateSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
  UpdateProfileRequestSchema,
  UpdateProfileResponseSchema,
  RefreshTokenResponseSchema,
  SupabaseAuthUserSchema,
  SupabaseSessionSchema
} from '../auth.schema';

describe('Auth Schema Tests', () => {
  // 1️⃣ User Schema Tests
  describe('User Schema Validation', () => {
    it('should transform and validate user data correctly', () => {
      const userData = {
        id: 'user-123',
        email: '  TEST@EXAMPLE.COM  ',
        name: '  John Doe  ',
        role: 'customer' as const,
        phone: '+1234567890',
        address: '123 Main St'
      };

      const result = UserSchema.parse(userData);
      
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com'); // Lowercased and trimmed
      expect(result.name).toBe('John Doe'); // Trimmed
      expect(result.role).toBe('customer');
      expect(result.phone).toBe('+1234567890');
      expect(result.address).toBe('123 Main St');
    });

    it('should handle optional fields', () => {
      const userData = {
        id: 'user-456',
        email: 'user@example.com',
        name: 'Jane Smith',
        role: 'staff' as const
        // phone and address omitted
      };

      const result = UserSchema.parse(userData);
      
      expect(result.phone).toBeUndefined();
      expect(result.address).toBeUndefined();
    });

    it('should reject empty name after trimming', () => {
      const userData = {
        id: 'user-789',
        email: 'test@example.com',
        name: '   ', // Only whitespace
        role: 'customer' as const
      };

      expect(() => UserSchema.parse(userData))
        .toThrow('User name cannot be empty');
    });

    it('should validate email format', () => {
      const invalidData = {
        id: 'user-123',
        email: 'not-an-email',
        name: 'Test User',
        role: 'customer' as const
      };

      expect(() => UserSchema.parse(invalidData)).toThrow();
    });

    it('should validate user roles', () => {
      const validRoles = ['customer', 'staff', 'manager', 'admin'];
      
      validRoles.forEach(role => {
        const userData = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role
        };
        
        expect(() => UserSchema.parse(userData)).not.toThrow();
      });

      const invalidRole = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'superuser' // Invalid role
      };

      expect(() => UserSchema.parse(invalidRole)).toThrow();
    });
  });

  // 2️⃣ Auth State Schema Tests
  describe('Auth State Schema', () => {
    it('should validate auth state with user', () => {
      const authState = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer' as const
        },
        isLoading: false,
        isAuthenticated: true
      };

      const result = AuthStateSchema.parse(authState);
      
      expect(result.user).toBeDefined();
      expect(result.isLoading).toBe(false);
      expect(result.isAuthenticated).toBe(true);
    });

    it('should handle null user', () => {
      const authState = {
        user: null,
        isLoading: false,
        isAuthenticated: false
      };

      const result = AuthStateSchema.parse(authState);
      
      expect(result.user).toBeNull();
      expect(result.isAuthenticated).toBe(false);
    });
  });

  // 3️⃣ Login Request Schema Tests
  describe('Login Request Schema', () => {
    it('should validate and transform login request', () => {
      const loginData = {
        email: '  USER@EXAMPLE.COM  ',
        password: 'securePassword123'
      };

      const result = LoginRequestSchema.parse(loginData);
      
      expect(result.email).toBe('user@example.com');
      expect(result.password).toBe('securePassword123');
    });

    it('should validate password length', () => {
      const shortPassword = {
        email: 'user@example.com',
        password: '12345' // Too short
      };

      expect(() => LoginRequestSchema.parse(shortPassword))
        .toThrow('Password must be at least 6 characters long');
    });

    it('should validate email format', () => {
      const invalidEmail = {
        email: 'invalid-email',
        password: 'validPassword'
      };

      expect(() => LoginRequestSchema.parse(invalidEmail)).toThrow();
    });
  });

  // 4️⃣ Register Request Schema Tests
  describe('Register Request Schema', () => {
    it('should validate complete registration data', () => {
      const registerData = {
        email: '  NEW@EXAMPLE.COM  ',
        password: 'securePassword123',
        confirmPassword: 'securePassword123',
        name: '  New User  ',
        phone: '+1234567890',
        address: '456 Oak St'
      };

      const result = RegisterRequestSchema.parse(registerData);
      
      expect(result.email).toBe('new@example.com');
      expect(result.name).toBe('New User');
      expect(result.password).toBe('securePassword123');
      expect(result.phone).toBe('+1234567890');
      expect(result.address).toBe('456 Oak St');
    });

    it('should validate password confirmation', () => {
      const mismatchedPasswords = {
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'password456', // Doesn't match
        name: 'Test User'
      };

      expect(() => RegisterRequestSchema.parse(mismatchedPasswords))
        .toThrow("Passwords don't match");
    });

    it('should handle optional fields', () => {
      const minimalData = {
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        name: 'Test User'
        // phone and address omitted
      };

      const result = RegisterRequestSchema.parse(minimalData);
      
      expect(result.phone).toBeUndefined();
      expect(result.address).toBeUndefined();
    });
  });

  // 5️⃣ Login/Register Response Schema Tests
  describe('Auth Response Schemas', () => {
    it('should validate successful login response', () => {
      const successResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer' as const
        },
        session: {
          access_token: 'token123',
          refresh_token: 'refresh123',
          expires_in: 3600,
          expires_at: 1234567890,
          token_type: 'Bearer',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        }
      };

      const result = LoginResponseSchema.parse(successResponse);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session?.access_token).toBe('token123');
    });

    it('should validate error response', () => {
      const errorResponse = {
        success: false,
        error: 'Invalid credentials',
        message: 'The email or password you entered is incorrect'
      };

      const result = LoginResponseSchema.parse(errorResponse);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.message).toBe('The email or password you entered is incorrect');
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
    });

    it('should validate register response', () => {
      const registerResponse = {
        success: true,
        user: {
          id: 'new-user-123',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'customer' as const
        },
        session: {
          access_token: 'newtoken123',
          refresh_token: 'newrefresh123',
          expires_in: 3600,
          token_type: 'Bearer',
          user: {
            id: 'new-user-123',
            email: 'newuser@example.com',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        }
      };

      const result = RegisterResponseSchema.parse(registerResponse);
      
      expect(result.success).toBe(true);
      expect(result.user?.id).toBe('new-user-123');
      expect(result.session?.access_token).toBe('newtoken123');
    });
  });

  // 6️⃣ Profile Update Schema Tests
  describe('Profile Update Schemas', () => {
    it('should validate profile update request', () => {
      const updateData = {
        name: '  Updated Name  ',
        phone: '+9876543210',
        address: '789 Pine St'
      };

      const result = UpdateProfileRequestSchema.parse(updateData);
      
      expect(result.name).toBe('Updated Name');
      expect(result.phone).toBe('+9876543210');
      expect(result.address).toBe('789 Pine St');
    });

    it('should handle partial updates', () => {
      const partialUpdate = {
        phone: '+1111111111'
        // name and address omitted
      };

      const result = UpdateProfileRequestSchema.parse(partialUpdate);
      
      expect(result.name).toBeUndefined();
      expect(result.phone).toBe('+1111111111');
      expect(result.address).toBeUndefined();
    });

    it('should validate profile update response', () => {
      const updateResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Updated Name',
          role: 'customer' as const,
          phone: '+9876543210'
        },
        message: 'Profile updated successfully'
      };

      const result = UpdateProfileResponseSchema.parse(updateResponse);
      
      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Updated Name');
      expect(result.message).toBe('Profile updated successfully');
    });
  });

  // 7️⃣ Token Refresh Schema Tests
  describe('Token Refresh Schema', () => {
    it('should validate refresh token response', () => {
      const refreshResponse = {
        success: true,
        session: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          expires_at: 9999999999,
          token_type: 'Bearer',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        }
      };

      const result = RefreshTokenResponseSchema.parse(refreshResponse);
      
      expect(result.success).toBe(true);
      expect(result.session?.access_token).toBe('new-access-token');
      expect(result.session?.refresh_token).toBe('new-refresh-token');
    });

    it('should handle refresh error', () => {
      const errorResponse = {
        success: false,
        error: 'Token expired',
        message: 'Please login again'
      };

      const result = RefreshTokenResponseSchema.parse(errorResponse);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.session).toBeUndefined();
    });
  });

  // 8️⃣ Supabase Schema Tests
  describe('Supabase Integration Schemas', () => {
    it('should validate Supabase auth user', () => {
      const supabaseUser = {
        id: 'supabase-user-123',
        email: 'user@example.com',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        email_confirmed_at: '2025-01-01T00:00:00Z',
        phone: null,
        confirmed_at: '2025-01-01T00:00:00Z',
        last_sign_in_at: '2025-01-01T12:00:00Z',
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'Test User' },
        identities: [],
        aud: 'authenticated',
        role: 'authenticated'
      };

      const result = SupabaseAuthUserSchema.parse(supabaseUser);
      
      expect(result.id).toBe('supabase-user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.role).toBe('authenticated');
    });

    it('should handle minimal Supabase user', () => {
      const minimalUser = {
        id: 'user-123',
        email: 'user@example.com'
        // All other fields optional
      };

      const result = SupabaseAuthUserSchema.parse(minimalUser);
      
      expect(result.id).toBe('user-123');
      expect(result.email).toBe('user@example.com');
    });

    it('should allow passthrough for unknown fields', () => {
      const userWithExtra = {
        id: 'user-123',
        email: 'user@example.com',
        custom_field: 'custom_value',
        another_field: 123
      };

      const result = SupabaseAuthUserSchema.parse(userWithExtra);
      
      expect(result.id).toBe('user-123');
      expect(result.custom_field).toBe('custom_value');
      expect(result.another_field).toBe(123);
    });

    it('should validate Supabase session', () => {
      const session = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 3600,
        expires_at: 1234567890,
        token_type: 'Bearer',
        user: {
          id: 'user-123',
          email: 'user@example.com'
        }
      };

      const result = SupabaseSessionSchema.parse(session);
      
      expect(result.access_token).toBe('access-token-123');
      expect(result.refresh_token).toBe('refresh-token-456');
      expect(result.user.id).toBe('user-123');
    });

    it('should handle session without refresh token', () => {
      const sessionNoRefresh = {
        access_token: 'access-only',
        expires_in: 3600,
        token_type: 'Bearer',
        user: {
          id: 'user-123',
          email: 'user@example.com'
        }
      };

      const result = SupabaseSessionSchema.parse(sessionNoRefresh);
      
      expect(result.access_token).toBe('access-only');
      expect(result.refresh_token).toBeUndefined();
    });
  });

  // 9️⃣ Edge Cases
  describe('Edge Cases', () => {
    it('should handle extremely long strings', () => {
      const longString = 'a'.repeat(1000);
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        name: longString,
        role: 'customer' as const
      };

      const result = UserSchema.parse(userData);
      expect(result.name).toBe(longString);
    });

    it('should handle international characters', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        name: '名前 الاسم नाम',
        role: 'customer' as const,
        address: '街道 123号'
      };

      const result = UserSchema.parse(userData);
      expect(result.name).toBe('名前 الاسم नाम');
      expect(result.address).toBe('街道 123号');
    });

    it('should handle special characters in email', () => {
      const userData = {
        id: 'user-123',
        email: 'test+tag@sub.example.com',
        name: 'Test User',
        role: 'customer' as const
      };

      const result = UserSchema.parse(userData);
      expect(result.email).toBe('test+tag@sub.example.com');
    });
  });

  // 🔟 User Role Schema Tests
  describe('User Role Schema', () => {
    it('should validate all valid roles', () => {
      const roles = ['customer', 'staff', 'manager', 'admin'];
      
      roles.forEach(role => {
        const result = UserRoleSchema.parse(role);
        expect(result).toBe(role);
      });
    });

    it('should reject invalid roles', () => {
      const invalidRoles = ['superadmin', 'guest', 'moderator', ''];
      
      invalidRoles.forEach(role => {
        expect(() => UserRoleSchema.parse(role)).toThrow();
      });
    });
  });
});