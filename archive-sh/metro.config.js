const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add path aliases for cleaner imports (safe optimization)
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
  // Exclude test files for faster bundling in TDD
  blockList: exclusionList([
    // Exclude test files to speed up bundling for TDD
    /.*\/__tests__\/.*/,
    /.*\.test\.(ts|tsx|js|jsx)$/,
    /.*\.spec\.(ts|tsx|js|jsx)$/,
    // Exclude Storybook files
    /.*\.stories\.(ts|tsx|js|jsx)$/,
    // Exclude any ARCHIVE directories in src
    /.*\/ARCHIVE\/.*/,
  ]),
};

// Development optimizations for faster TDD cycles
if (process.env.NODE_ENV !== 'production') {
  // Disable minification in development for faster rebuilds
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      keep_fnames: true,
      mangle: false,
      compress: false,
    },
  };
}

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      keep_fnames: true,
      mangle: { keep_fnames: true },
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
      },
    },
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  };
}

module.exports = config;