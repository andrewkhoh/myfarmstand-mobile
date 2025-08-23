/**
 * Simplified Auth Mock
 * 
 * Standalone auth mock that doesn't require complex chaining.
 * Manages auth state internally and provides simple test helpers.
 */

import { jest } from '@jest/globals';

interface User {
  id: string;
  email: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
}

interface AuthOptions {
  persistSession?: boolean;
  autoRefreshToken?: boolean;
  detectSessionInUrl?: boolean;
}

export class SimplifiedAuthMock {
  private state: AuthState = {
    user: null,
    session: null,
    isAuthenticated: false
  };
  
  private listeners: Set<(event: string, session: Session | null) => void> = new Set();
  private options: AuthOptions;
  
  constructor(options: AuthOptions = {}) {
    this.options = {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      ...options
    };
  }
  
  /**
   * Create the mock auth client
   */
  createClient() {
    const self = this;
    
    return {
      /**
       * Get current user
       */
      getUser: jest.fn().mockImplementation(async () => {
        if (self.state.user) {
          return {
            data: { user: self.state.user },
            error: null
          };
        }
        return {
          data: { user: null },
          error: { message: 'No user logged in', status: 401 }
        };
      }),
      
      /**
       * Get current session
       */
      getSession: jest.fn().mockImplementation(async () => {
        if (self.state.session) {
          // Check if session is expired
          if (self.state.session.expires_at < Date.now()) {
            self.clearSession();
            return {
              data: { session: null },
              error: { message: 'Session expired', status: 401 }
            };
          }
          
          return {
            data: { session: self.state.session },
            error: null
          };
        }
        return {
          data: { session: null },
          error: null
        };
      }),
      
      /**
       * Sign in with email and password
       */
      signInWithPassword: jest.fn().mockImplementation(async ({ 
        email, 
        password 
      }: { 
        email: string; 
        password: string; 
      }) => {
        // Simple validation
        if (!email || !password) {
          return {
            data: { user: null, session: null },
            error: { message: 'Email and password are required', status: 400 }
          };
        }
        
        // Create mock user and session
        const user: User = {
          id: `user-${Date.now()}`,
          email,
          app_metadata: { provider: 'email' },
          user_metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const session: Session = {
          access_token: `token-${Date.now()}`,
          refresh_token: `refresh-${Date.now()}`,
          expires_at: Date.now() + 3600000, // 1 hour
          user
        };
        
        self.setSession(session);
        
        return {
          data: { user, session },
          error: null
        };
      }),
      
      /**
       * Sign in with OAuth provider
       */
      signInWithOAuth: jest.fn().mockImplementation(async ({ 
        provider,
        options 
      }: { 
        provider: string;
        options?: any;
      }) => {
        return {
          data: { 
            url: `https://auth.example.com/authorize?provider=${provider}`,
            provider
          },
          error: null
        };
      }),
      
      /**
       * Sign up new user
       */
      signUp: jest.fn().mockImplementation(async ({ 
        email, 
        password,
        options
      }: { 
        email: string; 
        password: string;
        options?: { data?: any; emailRedirectTo?: string };
      }) => {
        // Simple validation
        if (!email || !password) {
          return {
            data: { user: null, session: null },
            error: { message: 'Email and password are required', status: 400 }
          };
        }
        
        const user: User = {
          id: `user-${Date.now()}`,
          email,
          app_metadata: { provider: 'email' },
          user_metadata: options?.data || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // For sign up, typically no session until email is confirmed
        return {
          data: { 
            user,
            session: null 
          },
          error: null
        };
      }),
      
      /**
       * Sign out current user
       */
      signOut: jest.fn().mockImplementation(async () => {
        self.clearSession();
        return { error: null };
      }),
      
      /**
       * Reset password request
       */
      resetPasswordForEmail: jest.fn().mockImplementation(async ({ 
        email,
        options 
      }: { 
        email: string;
        options?: { redirectTo?: string };
      }) => {
        return {
          data: {},
          error: null
        };
      }),
      
      /**
       * Update user
       */
      updateUser: jest.fn().mockImplementation(async ({ 
        email,
        password,
        data
      }: { 
        email?: string;
        password?: string;
        data?: any;
      }) => {
        if (!self.state.user) {
          return {
            data: { user: null },
            error: { message: 'No user logged in', status: 401 }
          };
        }
        
        // Update user data
        if (email) self.state.user.email = email;
        if (data) self.state.user.user_metadata = { ...self.state.user.user_metadata, ...data };
        self.state.user.updated_at = new Date().toISOString();
        
        return {
          data: { user: self.state.user },
          error: null
        };
      }),
      
      /**
       * Refresh session
       */
      refreshSession: jest.fn().mockImplementation(async () => {
        if (!self.state.session) {
          return {
            data: { session: null },
            error: { message: 'No session to refresh', status: 401 }
          };
        }
        
        // Extend session
        self.state.session.expires_at = Date.now() + 3600000;
        self.state.session.access_token = `token-${Date.now()}`;
        
        return {
          data: { session: self.state.session },
          error: null
        };
      }),
      
      /**
       * Set session (for testing)
       */
      setSession: jest.fn().mockImplementation(async (refresh_token: string) => {
        // This is typically used to restore a session from storage
        // For testing, we'll just create a mock session
        const user: User = {
          id: `user-restored-${Date.now()}`,
          email: 'restored@example.com',
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString()
        };
        
        const session: Session = {
          access_token: `token-${Date.now()}`,
          refresh_token,
          expires_at: Date.now() + 3600000,
          user
        };
        
        self.setSession(session);
        
        return {
          data: { session },
          error: null
        };
      }),
      
      /**
       * Listen to auth state changes
       */
      onAuthStateChange: jest.fn().mockImplementation((callback: (event: string, session: Session | null) => void) => {
        self.listeners.add(callback);
        
        // Immediately call with current state
        callback(
          self.state.isAuthenticated ? 'SIGNED_IN' : 'SIGNED_OUT',
          self.state.session
        );
        
        // Return subscription object
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn().mockImplementation(() => {
                self.listeners.delete(callback);
              })
            }
          }
        };
      }),
      
      /**
       * Exchange code for session (OAuth flow)
       */
      exchangeCodeForSession: jest.fn().mockImplementation(async (code: string) => {
        const user: User = {
          id: `user-oauth-${Date.now()}`,
          email: 'oauth@example.com',
          app_metadata: { provider: 'google' },
          user_metadata: {},
          created_at: new Date().toISOString()
        };
        
        const session: Session = {
          access_token: `token-${Date.now()}`,
          refresh_token: `refresh-${Date.now()}`,
          expires_at: Date.now() + 3600000,
          user
        };
        
        self.setSession(session);
        
        return {
          data: { session },
          error: null
        };
      })
    };
  }
  
  /**
   * Set session and notify listeners
   */
  private setSession(session: Session) {
    this.state.session = session;
    this.state.user = session.user;
    this.state.isAuthenticated = true;
    
    // Notify all listeners
    this.listeners.forEach(callback => {
      callback('SIGNED_IN', session);
    });
  }
  
  /**
   * Clear session and notify listeners
   */
  private clearSession() {
    this.state.session = null;
    this.state.user = null;
    this.state.isAuthenticated = false;
    
    // Notify all listeners
    this.listeners.forEach(callback => {
      callback('SIGNED_OUT', null);
    });
  }
  
  /**
   * Test helper: Set authenticated state
   */
  setAuthenticatedUser(user: Partial<User>) {
    const fullUser: User = {
      id: user.id || `user-${Date.now()}`,
      email: user.email || 'test@example.com',
      app_metadata: user.app_metadata || {},
      user_metadata: user.user_metadata || {},
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString()
    };
    
    const session: Session = {
      access_token: `token-${Date.now()}`,
      refresh_token: `refresh-${Date.now()}`,
      expires_at: Date.now() + 3600000,
      user: fullUser
    };
    
    this.setSession(session);
  }
  
  /**
   * Test helper: Clear auth state
   */
  clearAuth() {
    this.clearSession();
  }
  
  /**
   * Test helper: Get current state
   */
  getState(): AuthState {
    return { ...this.state };
  }
  
  /**
   * Test helper: Expire current session
   */
  expireSession() {
    if (this.state.session) {
      this.state.session.expires_at = Date.now() - 1000;
    }
  }
}

/**
 * Factory function for quick auth mock creation
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const auth = createAuthMock();
 * 
 * // With initial user
 * const auth = createAuthMock({
 *   user: { email: 'test@example.com' }
 * });
 * 
 * // Test sign in flow
 * const result = await auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * ```
 */
export const createAuthMock = (initialState?: {
  user?: Partial<User>;
  options?: AuthOptions;
}) => {
  const mock = new SimplifiedAuthMock(initialState?.options);
  
  if (initialState?.user) {
    mock.setAuthenticatedUser(initialState.user);
  }
  
  return mock.createClient();
};

/**
 * Export the class for advanced usage
 */
export { SimplifiedAuthMock as AuthMock };