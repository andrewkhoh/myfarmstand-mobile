// Unified Jest configuration that routes to appropriate configs
// Based on test patterns or environment variables

const isServiceTest = process.env.TEST_TYPE === 'services' || 
                      process.argv.includes('--testPathPattern=.*services.*') ||
                      process.argv.includes('src/services') ||
                      process.argv.includes('src/tests');

if (isServiceTest) {
  // Use Node.js environment for service tests
  module.exports = require('./jest.config.services.js');
} else {
  // Use React Native environment for hook tests (default)
  module.exports = require('./jest.config.hooks.js');
}