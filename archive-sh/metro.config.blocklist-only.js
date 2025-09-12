const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add ONLY blockList to exclude test files and archives
config.resolver = {
  ...config.resolver,
  blockList: [
    // Exclude specific test file patterns
    /.*\.test\.(ts|tsx|js|jsx)$/,
    /.*\.spec\.(ts|tsx|js|jsx)$/,
    
    // Exclude archive directories  
    /.*\/ARCHIVE\/.*$/,
    /.*\/archive\/.*$/,
  ],
};

module.exports = config;