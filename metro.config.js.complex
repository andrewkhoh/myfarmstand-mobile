const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Optimize for production builds
config.transformer = {
  ...config.transformer,
  // Optimize asset handling
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  
  // Production minification settings
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: process.env.NODE_ENV === 'production', // Remove console logs in production
      drop_debugger: true,
      passes: 3,
    },
  },
};

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
  
  // Exclude test files and archives from bundling
  blockList: [
    /.*\/__tests__\/.*/,
    /.*\.test\.(ts|tsx|js|jsx)$/,
    /.*\.spec\.(ts|tsx|js|jsx)$/,
    /.*\/ARCHIVE\/.*/,
  ],
};

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Tree shaking configuration
  config.transformer.getTransformOptions = async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Better performance
    },
  });
  
  // Bundle splitting (for larger apps)
  config.serializer = {
    ...config.serializer,
    getModulesRunBeforeMainModule: () => [],
  };
}

module.exports = config;