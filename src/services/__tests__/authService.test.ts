/**
 * AuthService Test
 * Testing authentication functionality
 */

import { AuthService } from '../authService';

// Mock the supabase module at the service level
const mockSupabase = require('../../config/supabase').supabase;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Supabase mocks to prevent state contamination
    if (global.resetSupabaseMocks) {
      global.resetSupabaseMocks();
    }
  });

  it('should validate email format', async () => {
    await expect(AuthService.login('invalid-email', 'password123'))
      .rejects.toThrow('email must be a valid email address');
  });

  it('should validate required fields', async () => {
    await expect(AuthService.login('', 'password123'))
      .rejects.toThrow('email must be a valid email address');
      
    await expect(AuthService.login('test@example.com', ''))
      .rejects.toThrow('password must be at least 6 characters long');
  });

  it('should handle successful login', async () => {
    // Setup successful login mock
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }
        },
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      },
      error: null
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              role: 'customer'
            },
            error: null
          })
        })
      })
    });

    const result = await AuthService.login('test@example.com', 'password123');
    
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('test@example.com');
    expect(result.accessToken).toBe('mock-access-token');
  });

  it('should handle login failure', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' }
    });

    await expect(AuthService.login('test@example.com', 'wrongpassword'))
      .rejects.toThrow('Invalid login credentials');
  });

  it('should validate registration fields', async () => {
    await expect(AuthService.register('', 'password', 'name', 'phone', 'address'))
      .rejects.toThrow('Email, password, and name are required');
      
    await expect(AuthService.register('test@example.com', '123', 'name', 'phone', 'address'))
      .rejects.toThrow('Password must be at least 6 characters long');
  });

  it('should handle logout', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    });

    const result = await AuthService.logout();
    
    expect(result.success).toBe(true);
  });

  it('should check authentication status', async () => {
    // Test authenticated state
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } }
    });
    
    let isAuth = await AuthService.isAuthenticated();
    expect(isAuth).toBe(true);
    
    // Test unauthenticated state
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null }
    });
    
    isAuth = await AuthService.isAuthenticated();
    expect(isAuth).toBe(false);
  });
});