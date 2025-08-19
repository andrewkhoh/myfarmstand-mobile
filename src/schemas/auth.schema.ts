import { z } from 'zod';

// User role validation
export const UserRoleSchema = z.enum(['customer', 'staff', 'manager', 'admin']);

// User schema with comprehensive validation
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().transform(email => email.toLowerCase().trim()),
  name: z.string().min(1).transform(name => name.trim()),
  role: UserRoleSchema,
  phone: z.string().optional(),
  address: z.string().optional(),
}).transform((data) => {
  // Ensure name is never empty after trimming
  if (!data.name || data.name.length === 0) {
    throw new Error('User name cannot be empty');
  }
  return data;
});

// Authentication state schema
export const AuthStateSchema = z.object({
  user: UserSchema.nullable(),
  isLoading: z.boolean(),
  isAuthenticated: z.boolean(),
});

// Login request validation
export const LoginRequestSchema = z.object({
  email: z.string().email().transform(email => email.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// Register request validation
export const RegisterRequestSchema = z.object({
  email: z.string().email().transform(email => email.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string(),
  name: z.string().min(1).transform(name => name.trim()),
  phone: z.string().optional(),
  address: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Login response schema
export const LoginResponseSchema = z.object({
  success: z.boolean(),
  user: UserSchema.optional(),
  session: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number(),
    expires_at: z.number().optional(),
    token_type: z.string(),
    user: z.object({
      id: z.string(),
      email: z.string().email(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  }).optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Register response schema
export const RegisterResponseSchema = z.object({
  success: z.boolean(),
  user: UserSchema.optional(),
  session: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number(),
    expires_at: z.number().optional(),
    token_type: z.string(),
    user: z.object({
      id: z.string(),
      email: z.string().email(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  }).optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Profile update request schema
export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1).transform(name => name.trim()).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Profile update response schema
export const UpdateProfileResponseSchema = z.object({
  success: z.boolean(),
  user: UserSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Token refresh response schema
export const RefreshTokenResponseSchema = z.object({
  success: z.boolean(),
  session: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number(),
    expires_at: z.number().optional(),
    token_type: z.string(),
    user: z.object({
      id: z.string(),
      email: z.string().email(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  }).optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Supabase Auth User schema (from Supabase Auth API)
// Made more flexible to handle different Supabase response formats
export const SupabaseAuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(), // Email is required for authenticated users
  created_at: z.string().optional(), // Made optional for flexibility
  updated_at: z.string().optional(), // Made optional for flexibility
  email_confirmed_at: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  confirmed_at: z.string().nullable().optional(),
  last_sign_in_at: z.string().nullable().optional(),
  app_metadata: z.record(z.unknown()).optional(),
  user_metadata: z.record(z.unknown()).optional(),
  identities: z.array(z.unknown()).optional(),
  aud: z.string().optional(), // Added aud field that Supabase might return
  role: z.string().optional(), // Added role field
}).passthrough(); // Allow additional fields that Supabase might include

// Supabase Session schema
export const SupabaseSessionSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(), // Made optional as it might not always be present
  expires_in: z.number(),
  expires_at: z.number().optional(),
  token_type: z.string(),
  user: SupabaseAuthUserSchema,
}).passthrough(); // Allow additional fields that Supabase might include

// Export types inferred from schemas
export type ValidatedUser = z.infer<typeof UserSchema>;
export type ValidatedUserRole = z.infer<typeof UserRoleSchema>;
export type ValidatedAuthState = z.infer<typeof AuthStateSchema>;
export type ValidatedLoginRequest = z.infer<typeof LoginRequestSchema>;
export type ValidatedRegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type ValidatedLoginResponse = z.infer<typeof LoginResponseSchema>;
export type ValidatedRegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type ValidatedUpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type ValidatedUpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
export type ValidatedRefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type ValidatedSupabaseAuthUser = z.infer<typeof SupabaseAuthUserSchema>;
export type ValidatedSupabaseSession = z.infer<typeof SupabaseSessionSchema>;