const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Alternative approach: use sourceExts to be more specific about what we include
// rather than blockList to exclude
config.resolver = {
  ...config.resolver,
  
  // Path aliases
  alias: {
    '@': './src',
    '@components': './src/components',
    '@screens': './src/screens',
    '@services': './src/services',
    '@hooks': './src/hooks',
    '@utils': './src/utils',
    '@types': './src/types',
    '@navigation': './src/navigation',
  },
  
  // Be more specific about source extensions - only include what we need
  sourceExts: [
    'js',
    'jsx', 
    'ts',
    'tsx',
    'json',
    // Explicitly exclude common test extensions by not including them
  ],
};

module.exports = config;