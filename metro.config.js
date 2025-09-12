const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add reporter for progress updates
config.reporter = {
  update: (event) => {
    if (event.type === 'bundle_transform_progressed') {
      console.log(`Bundling: ${event.transformedFileCount}/${event.totalFileCount} files processed`);
    }
    if (event.type === 'bundle_build_started') {
      console.log('Bundle build started...');
    }
    if (event.type === 'bundle_build_done') {
      console.log('Bundle build completed!');
    }
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
  
  // TDD-optimized blockList - exclude test files and dev artifacts
  blockList: exclusionList([
    /.*\/__tests__\/.*/,               // Test directories (most reliable)
    /.*\.test\.(ts|tsx|js|jsx)$/,      // Test files
    /.*\.spec\.(ts|tsx|js|jsx)$/,      // Spec files
    /.*\/ARCHIVE\/.*/,                 // Archive directory
    /.*\/coverage\/.*/,                // Coverage reports
    /.*\.stories\.(ts|tsx|js|jsx)$/,   // Storybook files
  ]),
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
  
  // Use more workers for faster bundling
  config.maxWorkers = 4;
  
  // Faster resolver
  config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
}

module.exports = config;