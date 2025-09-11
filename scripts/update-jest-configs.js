#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration to add to all Jest configs
const dockerIgnoreConfig = `  // Ignore Docker volumes to prevent Jest from scanning them
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/docker/volumes/**',
    '<rootDir>/docker/projects/**'
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/node_modules/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
  ],
  haste: {
    throwOnModuleCollision: false
  },`;

// Find all jest.config*.js files
const configFiles = glob.sync('jest.config*.js', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${configFiles.length} Jest config files to update`);

configFiles.forEach(configFile => {
  try {
    let content = fs.readFileSync(configFile, 'utf8');
    const filename = path.basename(configFile);
    
    // Check if already has haste configuration
    if (content.includes('haste:')) {
      console.log(`✓ ${filename} - Already has haste configuration`);
      return;
    }
    
    // Check if already has testPathIgnorePatterns with docker
    if (content.includes('docker/volumes')) {
      console.log(`✓ ${filename} - Already ignores Docker volumes`);
      return;
    }
    
    // Find where to insert the config
    // Look for existing testPathIgnorePatterns
    if (content.includes('testPathIgnorePatterns:')) {
      // Merge with existing testPathIgnorePatterns
      content = content.replace(
        /testPathIgnorePatterns:\s*\[([^\]]*)\]/,
        (match, patterns) => {
          // Parse existing patterns and add new ones
          const existingPatterns = patterns.trim();
          const newPatterns = existingPatterns ? 
            `${existingPatterns},
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'` :
            `
    '<rootDir>/node_modules/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'`;
          
          return `testPathIgnorePatterns: [${newPatterns}
  ]`;
        }
      );
      
      // Add other ignore patterns if not present
      if (!content.includes('watchPathIgnorePatterns:')) {
        const insertPoint = content.indexOf('testPathIgnorePatterns:');
        const nextLine = content.indexOf('\n', insertPoint);
        const endOfArray = content.indexOf(']', nextLine) + 1;
        
        const additionalConfig = `,
  watchPathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/',
    '<rootDir>/node_modules/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
  ],
  haste: {
    throwOnModuleCollision: false
  }`;
        
        content = content.slice(0, endOfArray) + additionalConfig + content.slice(endOfArray);
      }
    } else {
      // No existing testPathIgnorePatterns, add complete config
      // Find a good insertion point after module.exports = {
      const insertPoint = content.indexOf('module.exports = {') + 'module.exports = {'.length;
      content = content.slice(0, insertPoint) + '\n' + dockerIgnoreConfig + content.slice(insertPoint);
    }
    
    // Write updated content
    fs.writeFileSync(configFile, content, 'utf8');
    console.log(`✅ ${filename} - Updated with Docker ignore patterns`);
    
  } catch (error) {
    console.error(`❌ Error updating ${path.basename(configFile)}: ${error.message}`);
  }
});

console.log('\nDone! All Jest configs have been updated to ignore Docker volumes.');