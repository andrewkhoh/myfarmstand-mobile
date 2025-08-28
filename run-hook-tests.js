#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Construct the full path to jest
const jestPath = path.join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');
const configPath = path.join(__dirname, 'jest.config.hooks.regular.js');

// Get test file path from arguments or use default
const testFile = process.argv[2] || 'src/hooks/__tests__/';

// Run jest with proper configuration
const jest = spawn('node', [
  jestPath,
  '--config',
  configPath,
  testFile,
  '--forceExit',
  '--no-coverage'
], {
  stdio: 'inherit',
  cwd: __dirname
});

jest.on('close', (code) => {
  process.exit(code);
});