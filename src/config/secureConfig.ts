/**
 * Secure Configuration Manager
 * 
 * Uses EAS Secrets (build-time) + Expo SecureStore (runtime) for maximum security.
 * Never exposes secrets in app bundle or source code.
 */

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// 🔐 SECURITY: Secret keys for SecureStore (never change these)
const SECURE_KEYS = {
  SUPABASE_URL: 'sb_url_v1',
  SUPABASE_ANON_KEY: 'sb_anon_v1',
  CHANNEL_SECRET: 'ch_secret_v1',
  DEBUG_CHANNELS: 'debug_ch_v1',
} as const;

type SecretKey = keyof typeof SECURE_KEYS;

interface SecretConfig {
  key: SecretKey;
  required: boolean;
  validator?: (value: string) => boolean;
  fallbackEnvVar?: string; // Only for development
}

// Configuration for each secret
const SECRET_CONFIGS: Record<SecretKey, SecretConfig> = {
  SUPABASE_URL: {
    key: 'SUPABASE_URL',
    required: true,
    validator: (value: string) => value.startsWith('https://') && value.includes('.supabase.co'),
    fallbackEnvVar: __DEV__ ? 'EXPO_PUBLIC_SUPABASE_URL' : undefined
  },
  SUPABASE_ANON_KEY: {
    key: 'SUPABASE_ANON_KEY', 
    required: true,
    validator: (value: string) => value.length > 20 && (value.startsWith('eyJ') || value.startsWith('sb_')),
    fallbackEnvVar: __DEV__ ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY' : undefined
  },
  CHANNEL_SECRET: {
    key: 'CHANNEL_SECRET',
    required: false,
    validator: (value: string) => value.length >= 32,
    fallbackEnvVar: __DEV__ ? 'EXPO_PUBLIC_CHANNEL_SECRET' : undefined
  },
  DEBUG_CHANNELS: {
    key: 'DEBUG_CHANNELS',
    required: false,
    validator: (value: string) => /^[a-z,]*$/.test(value),
    fallbackEnvVar: __DEV__ ? 'DEBUG_CHANNELS' : undefined
  }
};

export class SecureConfigManager {
  private static cache = new Map<SecretKey, string>();
  private static initialized = false;

  /**
   * 🔐 SECURE: Initialize secrets from EAS build-time secrets
   * Called once at app startup
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 🔐 STEP 1: Get build-time secrets from EAS (secure)
      const buildSecrets = this.getBuildTimeSecrets();
      
      // 🔐 STEP 2: Store in device SecureStore (encrypted)
      await this.storeBuildSecretsSecurely(buildSecrets);
      
      // 🔐 STEP 3: Load into memory cache
      await this.loadSecretsFromSecureStore();
      
      this.initialized = true;
      console.log('🔐 Secure configuration initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize secure configuration:', error);
      throw new Error('Secure configuration initialization failed');
    }
  }

  /**
   * 🔐 SECURE: Get secrets from EAS build-time environment
   * These are injected by EAS and never visible in source code
   */
  private static getBuildTimeSecrets(): Partial<Record<SecretKey, string>> {
    const secrets: Partial<Record<SecretKey, string>> = {};

    // 🔐 SECURITY: Only available during EAS builds, never in source
    // EAS injects these as environment variables, not EXPO_PUBLIC_*
    secrets.SUPABASE_URL = process.env.SUPABASE_URL;
    secrets.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    secrets.CHANNEL_SECRET = process.env.CHANNEL_SECRET;
    secrets.DEBUG_CHANNELS = process.env.DEBUG_CHANNELS;

    return secrets;
  }

  /**
   * 🔐 SECURE: Store build-time secrets in device SecureStore
   */
  private static async storeBuildSecretsSecurely(buildSecrets: Partial<Record<SecretKey, string>>): Promise<void> {
    for (const [key, value] of Object.entries(buildSecrets)) {
      if (value && value.trim()) {
        try {
          await SecureStore.setItemAsync(SECURE_KEYS[key as SecretKey], value);
          console.log(`🔐 Stored ${key} in SecureStore`);
        } catch (error) {
          console.error(`❌ Failed to store ${key} in SecureStore:`, error);
        }
      }
    }
  }

  /**
   * 🔐 SECURE: Load secrets from device SecureStore into memory
   */
  private static async loadSecretsFromSecureStore(): Promise<void> {
    for (const [key, config] of Object.entries(SECRET_CONFIGS)) {
      try {
        const value = await SecureStore.getItemAsync(SECURE_KEYS[key as SecretKey]);
        
        if (value) {
          // Validate the secret
          if (config.validator && !config.validator(value)) {
            throw new Error(`Invalid ${key} format`);
          }
          
          this.cache.set(key as SecretKey, value);
          
        } else if (config.required) {
          // Try fallback for development only
          if (__DEV__ && config.fallbackEnvVar) {
            const fallback = process.env[config.fallbackEnvVar];
            if (fallback) {
              console.warn(`⚠️ Using development fallback for ${key}`);
              this.cache.set(key as SecretKey, fallback);
            } else {
              throw new Error(`Required secret ${key} not found`);
            }
          } else {
            throw new Error(`Required secret ${key} not found`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to load ${key}:`, error);
        if (config.required) {
          throw error;
        }
      }
    }
  }

  /**
   * 🔐 SECURE: Get a secret value (from memory cache)
   */
  static getSecret(key: SecretKey): string | undefined {
    if (!this.initialized) {
      throw new Error('SecureConfigManager not initialized. Call initialize() first.');
    }
    
    return this.cache.get(key);
  }

  /**
   * 🔐 SECURE: Get required secret (throws if missing)
   */
  static getRequiredSecret(key: SecretKey): string {
    const value = this.getSecret(key);
    if (!value) {
      throw new Error(`Required secret ${key} is not available`);
    }
    return value;
  }

  /**
   * 🔐 SECURE: Check if all required secrets are available
   */
  static validateSecrets(): boolean {
    try {
      for (const [key, config] of Object.entries(SECRET_CONFIGS)) {
        if (config.required) {
          this.getRequiredSecret(key as SecretKey);
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Secret validation failed:', error);
      return false;
    }
  }

  /**
   * 🔐 SECURE: Clear all secrets from memory (for security)
   */
  static clearCache(): void {
    this.cache.clear();
    this.initialized = false;
    console.log('🔐 Secret cache cleared');
  }

  /**
   * 🔐 DEVELOPMENT: Get secrets info (no values)
   */
  static getSecretsInfo(): Record<string, { available: boolean; source: string }> {
    const info: Record<string, { available: boolean; source: string }> = {};
    
    for (const key of Object.keys(SECRET_CONFIGS)) {
      const hasValue = this.cache.has(key as SecretKey);
      const config = SECRET_CONFIGS[key as SecretKey];
      
      let source = 'SecureStore';
      if (__DEV__ && config.fallbackEnvVar && process.env[config.fallbackEnvVar]) {
        source = 'Development Fallback';
      }
      
      info[key] = {
        available: hasValue,
        source: hasValue ? source : 'Not Available'
      };
    }
    
    return info;
  }
}