/**
 * Environment Configuration
 * Handles different deployment environments with security safeguards
 */

type Environment = 'development' | 'staging' | 'production' | 'preview';

interface EnvironmentConfig {
  env: Environment;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  allowDevScripts: boolean;
  showTests: boolean;
  enableCrashReporting: boolean;
  enableAnalytics: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

// Get environment from build-time configuration
const getEnvironment = (): Environment => {
  // Check build-time environment first (from EAS)
  const buildEnv = process.env.EXPO_PUBLIC_ENV as Environment;
  if (buildEnv && ['development', 'staging', 'production', 'preview'].includes(buildEnv)) {
    return buildEnv;
  }

  // Fallback to NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'staging') return 'staging';
  
  // Default to development
  return 'development';
};

const ENV = getEnvironment();

// 🔐 SECURITY: Prevent development scripts in non-development environments
const getAllowDevScripts = (): boolean => {
  // Only allow in development environment
  if (ENV !== 'development') return false;
  
  // Check explicit permission
  return process.env.EXPO_PUBLIC_ALLOW_DEV_SCRIPTS === 'true';
};

// Get configuration from app.config.js extra field or environment variables
const getConfig = (): EnvironmentConfig => {
  const config: EnvironmentConfig = {
    env: ENV,
    isDevelopment: ENV === 'development',
    isStaging: ENV === 'staging',
    isProduction: ENV === 'production',
    allowDevScripts: getAllowDevScripts(),
    showTests: process.env.EXPO_PUBLIC_SHOW_TESTS === 'true',
    enableCrashReporting: ENV === 'production',
    enableAnalytics: ENV === 'production',
    
    // Get from app.config.js extra field (preferred) or fallback to env vars
    supabaseUrl: (global as any)?.expo?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: (global as any)?.expo?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  };

  // 🔐 SECURITY: Validate required configuration
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error('❌ Missing required Supabase configuration');
    console.error('Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return config;
};

export const Config = getConfig();

// 🚨 SECURITY: Database script execution guard
export const isDatabaseScriptAllowed = (scriptType: 'dev-setup' | 'migration' | 'seed'): boolean => {
  // NEVER allow dev-setup scripts in non-development environments
  if (scriptType === 'dev-setup') {
    if (!Config.isDevelopment) {
      console.error(`🚨 SECURITY: ${scriptType} scripts are FORBIDDEN in ${Config.env} environment`);
      return false;
    }
    
    if (!Config.allowDevScripts) {
      console.error(`🚨 SECURITY: ${scriptType} scripts disabled. Set EXPO_PUBLIC_ALLOW_DEV_SCRIPTS=true for development`);
      return false;
    }
  }

  // Migration and seed scripts require explicit approval in production
  if (scriptType === 'migration' || scriptType === 'seed') {
    if (Config.isProduction) {
      console.warn(`⚠️ ${scriptType} script in PRODUCTION - requires manual approval`);
      // Return false by default - production migrations should be handled separately
      return false;
    }
  }

  return true;
};

// Export environment info for debugging
export const getEnvironmentInfo = () => ({
  environment: Config.env,
  isDevelopment: Config.isDevelopment,
  isProduction: Config.isProduction,
  allowDevScripts: Config.allowDevScripts,
  showTests: Config.showTests,
  buildTime: new Date().toISOString(),
});

// Log environment info on app start (development only)
if (Config.isDevelopment) {
  console.log('🌍 Environment Configuration:', getEnvironmentInfo());
}