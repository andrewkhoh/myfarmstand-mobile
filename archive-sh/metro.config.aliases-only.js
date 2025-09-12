const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add ONLY path aliases (no blockList)
config.resolver = {
  ...config.resolver,
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
};

module.exports = config;