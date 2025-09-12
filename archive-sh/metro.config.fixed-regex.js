const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Try the exact format from the original config that used to work
config.resolver = {
  ...config.resolver,
  blockList: [
    /.*\/__tests__\/.*/,
  ],
};

module.exports = config;