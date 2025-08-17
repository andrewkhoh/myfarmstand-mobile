/**
 * Secure Supabase Configuration
 * 
 * Uses SecretsManager for secure credential access.
 * This is the new secure way to configure Supabase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { secretsManager } from '../services/secretsManager';
import { Database } from './supabase';

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase client instance
 * Lazy loads credentials from SecureStore
 */
export async function getSupabaseClient(): Promise<SupabaseClient<Database>> {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    // Get credentials from secure storage
    const supabaseUrl = await secretsManager.get('SUPABASE_URL');
    const supabaseAnonKey = await secretsManager.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase credentials in secure storage. Run "npm run setup-secrets".');
    }

    // Create Supabase client with secure credentials
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Enable automatic token refresh
        autoRefreshToken: true,
        // Persist session in secure storage
        persistSession: true,
        // Detect session from URL (useful for deep linking)
        detectSessionInUrl: false,
      },
      // Configure realtime options
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    if (__DEV__) {
      console.log('🔐 Supabase client initialized with secure credentials');
    }

    return supabaseClient;

  } catch (error) {
    console.error('🔐 Failed to initialize Supabase client:', error);
    throw new Error('Failed to initialize Supabase with secure credentials');
  }
}

/**
 * Reset the Supabase client (for testing/development)
 */
export function resetSupabaseClient(): void {
  if (__DEV__) {
    supabaseClient = null;
    console.log('🔐 Supabase client reset (development only)');
  } else {
    throw new Error('Reset only available in development');
  }
}

/**
 * Get Supabase client synchronously (if already initialized)
 * Throws if not initialized - use getSupabaseClient() for async initialization
 */
export function getSupabaseClientSync(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call getSupabaseClient() first.');
  }
  return supabaseClient;
}

// Re-export database types and table names for convenience
export { Database, TABLES } from './supabase';