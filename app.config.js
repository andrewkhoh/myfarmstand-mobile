require('dotenv').config();

// Load additional environment files
const fs = require('fs');
const path = require('path');

// Function to load .env.secret if it exists
function loadSecretEnv() {
  const secretEnvPath = path.resolve(__dirname, '.env.secret');
  if (fs.existsSync(secretEnvPath)) {
    const secretEnvContent = fs.readFileSync(secretEnvPath, 'utf8');
    const lines = secretEnvContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
          
          // // DEBUG: Log environment variable loading
          // if (key === 'DEBUG_CHANNELS') {
          //   console.log(`🔧 Loading env var: ${key} = "${value}" (length: ${value.length})`);
          //   console.log(`🔧 Raw line was: "${line}"`);
          //   console.log(`🔧 Trimmed line: "${trimmedLine}"`);
          // }
        }
      }
    });
    // console.log(' .env.secret loaded successfully');
  } else {
    // console.warn(' .env.secret not found - cryptographic security may not work');
  }
}

// Load secrets for build-time configuration
const { loadSecretsForBuild } = require('./scripts/build-config');

// Load secrets into environment variables
try {
  loadSecretsForBuild();
} catch (error) {
  console.warn('⚠️ Could not load secrets for build:', error.message);
  console.log('💡 Run "npm run setup-secrets" to configure secrets');
  
  // Fallback to legacy .env.secret loading
  loadSecretEnv();
}

// DEBUG: Verify environment loading worked
// console.log('🔧 Environment loading verification:', {
//   DEBUG_CHANNELS: process.env.DEBUG_CHANNELS,
//   NODE_ENV: process.env.NODE_ENV,
//   hasChannelSecret: !!process.env.EXPO_PUBLIC_CHANNEL_SECRET,
//   allDebugKeys: Object.keys(process.env).filter(k => k.includes('DEBUG'))
// });


module.exports = {
  expo: {
    name: "myfarmstand-mobile",
    slug: "myfarmstand-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.myfarmstand-mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-font",
      "expo-barcode-scanner",
      "expo-secure-store"
    ],
    extra: {
      // SECURITY: Expose secrets to the app
      // These are loaded from SecureStore via build-config.js
      supabaseUrl: process.env.BUILD_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.BUILD_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      channelSecret: process.env.BUILD_CHANNEL_SECRET || process.env.EXPO_PUBLIC_CHANNEL_SECRET,
      debugChannels: process.env.BUILD_DEBUG_CHANNELS || process.env.DEBUG_CHANNELS,
      
      // Environment configuration
      nodeEnv: process.env.NODE_ENV || 'development',
      environment: process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development',
      
      // Security flags - prevent dangerous features in production
      allowDevScripts: process.env.EXPO_PUBLIC_ALLOW_DEV_SCRIPTS === 'true',
      showTests: process.env.EXPO_PUBLIC_SHOW_TESTS === 'true',
      
      // Production optimization flags
      enableCrashReporting: process.env.NODE_ENV === 'production',
      enableAnalytics: process.env.NODE_ENV === 'production',
      
      // Build metadata
      buildTime: new Date().toISOString(),
      buildProfile: process.env.EAS_BUILD_PROFILE || 'development',
    }
  }
};
