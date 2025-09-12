const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enhanced resolver configuration
config.resolver = {
  ...config.resolver,
  
  // Path aliases for cleaner imports
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
  
  // Platform-specific extensions
  platforms: ['ios', 'android', 'web'],
  
  // Asset extensions
  assetExts: [
    ...config.resolver.assetExts,
    'sql', // For database files
  ],
  
  // Source extensions
  sourceExts: [
    ...config.resolver.sourceExts,
    'tsx',
    'ts',
    'jsx',
    'js',
  ],
  
  // TDD-optimized blockList - exclude test files and dev artifacts
  blockList: [
    /.*\/__tests__\/.*/,               // Test directories (most reliable)
    /.*\.test\.(ts|tsx|js|jsx)$/,      // Test files
    /.*\.spec\.(ts|tsx|js|jsx)$/,      // Spec files
    /.*\/ARCHIVE\/.*/,                 // Archive directory
    /.*\/coverage\/.*/,                // Coverage reports
    /.*\.stories\.(ts|tsx|js|jsx)$/,   // Storybook files
  ],
};

// Environment-specific optimizations
if (process.env.NODE_ENV === 'production') {
  // Production: Full optimizations
  config.transformer = {
    ...config.transformer,
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
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
  
  config.serializer = {
    ...config.serializer,
    getModulesRunBeforeMainModule: () => [],
  };
} else {
  // Development: TDD-optimized for fast rebuilds
  config.transformer = {
    ...config.transformer,
    minifierConfig: {}, // Disable minification for faster dev builds
  };
}

module.exports = config;