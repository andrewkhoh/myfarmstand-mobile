const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add very simple blockList - just block the ARCHIVE directory
config.resolver = {
  ...config.resolver,
  blockList: [
    /.*\/ARCHIVE\/.*$/,
  ],
};

module.exports = config;