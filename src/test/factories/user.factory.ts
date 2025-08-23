/**
 * User Factory - Schema-Validated Test Data
 * 
 * Creates valid user test data that always passes schema validation.
 * Supports different user roles and authentication scenarios.
 */

import { z } from 'zod';
import { SchemaFactory } from './base.factory';
import { 
  UserSchema, 
  UserRoleSchema,
  AuthStateSchema,
  SupabaseAuthUserSchema,
  SupabaseSessionSchema
} from '../../schemas/auth.schema';
import type { User, UserRole, AuthState } from '../../types';

export class UserFactory extends SchemaFactory<User, User> {
  constructor() {
    super('user');
  }

  protected getSchema(): z.ZodSchema<User> {
    return UserSchema as z.ZodSchema<User>;
  }

  protected getDbSchema(): z.ZodSchema<User> {
    return UserSchema; // Same schema for DB
  }

  protected getDefaults(): User {
    return {
      id: this.getNextId(),
      email: 'user@example.com',
      name: 'Test User',
      role: 'customer',
      phone: '+1234567890',
      address: '123 Test St, Test City, TS 12345'
    };
  }

  protected getMinimalDefaults(): Partial<User> {
    return {
      id: this.getNextId(),
      email: 'minimal@example.com',
      name: 'Minimal User',
      role: 'customer'
    };
  }

  /**
   * Create a customer user
   */
  createCustomer(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'customer',
      ...overrides
    });
  }

  /**
   * Create a staff user
   */
  createStaff(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'staff',
      email: 'staff@farmstand.com',
      name: 'Staff Member',
      ...overrides
    });
  }

  /**
   * Create a manager user
   */
  createManager(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'manager',
      email: 'manager@farmstand.com',
      name: 'Manager User',
      ...overrides
    });
  }

  /**
   * Create an admin user
   */
  createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'admin',
      email: 'admin@farmstand.com',
      name: 'Admin User',
      ...overrides
    });
  }

  /**
   * Create users with different roles
   */
  createWithRole(role: UserRole, overrides: Partial<User> = {}): User {
    const roleDefaults: Record<UserRole, Partial<User>> = {
      customer: { email: 'customer@example.com', name: 'Customer User' },
      staff: { email: 'staff@farmstand.com', name: 'Staff User' },
      manager: { email: 'manager@farmstand.com', name: 'Manager User' },
      admin: { email: 'admin@farmstand.com', name: 'Admin User' }
    };

    return this.create({
      ...roleDefaults[role],
      role,
      ...overrides
    });
  }

  /**
   * Create a user without optional fields
   */
  createWithoutOptionalFields(overrides: Partial<User> = {}): User {
    const { phone, address, ...defaults } = this.getDefaults();
    return this.create({
      ...defaults,
      phone: undefined,
      address: undefined,
      ...overrides
    });
  }

  /**
   * Create multiple users with different roles
   */
  createTeam(): { customer: User; staff: User; manager: User; admin: User } {
    return {
      customer: this.createCustomer(),
      staff: this.createStaff(),
      manager: this.createManager(),
      admin: this.createAdmin()
    };
  }

  /**
   * Create a user with sequential email
   */
  createWithSequentialEmail(index: number, overrides: Partial<User> = {}): User {
    return this.create({
      email: `user${index}@example.com`,
      name: `User ${index}`,
      ...overrides
    });
  }
}

/**
 * Auth State Factory
 */
export class AuthStateFactory extends SchemaFactory<AuthState, AuthState> {
  private userFactory: UserFactory;

  constructor() {
    super('auth-state');
    this.userFactory = new UserFactory();
  }

  protected getSchema(): z.ZodSchema<AuthState> {
    return AuthStateSchema as z.ZodSchema<AuthState>;
  }

  protected getDbSchema(): z.ZodSchema<AuthState> {
    return AuthStateSchema; // Same schema
  }

  protected getDefaults(): AuthState {
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false
    };
  }

  /**
   * Create an authenticated state
   */
  createAuthenticated(user?: User, overrides: Partial<AuthState> = {}): AuthState {
    return this.create({
      user: user || this.userFactory.createCustomer(),
      isLoading: false,
      isAuthenticated: true,
      ...overrides
    });
  }

  /**
   * Create an unauthenticated state
   */
  createUnauthenticated(overrides: Partial<AuthState> = {}): AuthState {
    return this.create({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      ...overrides
    });
  }

  /**
   * Create a loading state
   */
  createLoading(overrides: Partial<AuthState> = {}): AuthState {
    return this.create({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      ...overrides
    });
  }
}

/**
 * Supabase Auth User Factory
 */
export class SupabaseAuthUserFactory extends SchemaFactory<any, any> {
  constructor() {
    super('supabase-user');
  }

  protected getSchema(): z.ZodSchema<any> {
    return SupabaseAuthUserSchema;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return SupabaseAuthUserSchema;
  }

  protected getDefaults(): any {
    const now = new Date().toISOString();
    return {
      id: this.getNextId(),
      email: 'user@example.com',
      created_at: now,
      updated_at: now,
      email_confirmed_at: now,
      phone: null,
      confirmed_at: now,
      last_sign_in_at: now,
      app_metadata: {},
      user_metadata: {
        name: 'Test User',
        role: 'customer'
      },
      identities: [],
      aud: 'authenticated',
      role: 'authenticated'
    };
  }

  /**
   * Create an unconfirmed user
   */
  createUnconfirmed(overrides: any = {}): any {
    return this.create({
      email_confirmed_at: null,
      confirmed_at: null,
      ...overrides
    });
  }

  /**
   * Create a user with metadata
   */
  createWithMetadata(metadata: { name?: string; role?: string }, overrides: any = {}): any {
    return this.create({
      user_metadata: metadata,
      ...overrides
    });
  }
}

/**
 * Supabase Session Factory
 */
export class SupabaseSessionFactory extends SchemaFactory<any, any> {
  private supabaseUserFactory: SupabaseAuthUserFactory;

  constructor() {
    super('session');
    this.supabaseUserFactory = new SupabaseAuthUserFactory();
  }

  protected getSchema(): z.ZodSchema<any> {
    return SupabaseSessionSchema;
  }

  protected getDbSchema(): z.ZodSchema<any> {
    return SupabaseSessionSchema;
  }

  protected getDefaults(): any {
    const expiresIn = 3600; // 1 hour
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    
    return {
      access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: this.getNextId(), exp: expiresAt })).toString('base64')}`,
      refresh_token: `refresh_${this.getNextId()}`,
      expires_in: expiresIn,
      expires_at: expiresAt,
      token_type: 'bearer',
      user: this.supabaseUserFactory.create()
    };
  }

  /**
   * Create an expired session
   */
  createExpired(overrides: any = {}): any {
    const expiresAt = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    
    return this.create({
      expires_at: expiresAt,
      expires_in: 0,
      ...overrides
    });
  }

  /**
   * Create a session without refresh token
   */
  createWithoutRefreshToken(overrides: any = {}): any {
    const { refresh_token, ...defaults } = this.getDefaults();
    return this.create({
      ...defaults,
      refresh_token: undefined,
      ...overrides
    });
  }

  /**
   * Create a session for a specific user
   */
  createForUser(user: any, overrides: any = {}): any {
    return this.create({
      user,
      access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: user.id })).toString('base64')}`,
      ...overrides
    });
  }
}

// Export singleton instances for convenience
export const userFactory = new UserFactory();
export const authStateFactory = new AuthStateFactory();
export const supabaseAuthUserFactory = new SupabaseAuthUserFactory();
export const supabaseSessionFactory = new SupabaseSessionFactory();

// Export helper functions for quick creation
export const createUser = (overrides?: Partial<User>) => userFactory.create(overrides);
export const createAuthState = (overrides?: Partial<AuthState>) => authStateFactory.create(overrides);
export const createSupabaseUser = (overrides?: any) => supabaseAuthUserFactory.create(overrides);
export const createSupabaseSession = (overrides?: any) => supabaseSessionFactory.create(overrides);