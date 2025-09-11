console.log('Starting test debug...');

try {
  console.log('Loading jest-expo preset...');
  const preset = require('jest-expo/jest-preset');
  console.log('Preset loaded successfully');
  
  console.log('Loading react-native jest setup...');
  require('react-native/jest/setup');
  console.log('Setup loaded successfully');
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('All done!');