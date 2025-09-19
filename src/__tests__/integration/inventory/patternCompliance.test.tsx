import React from 'react';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

describe('Pattern Compliance Validation', () => {
  const projectRoot = '/workspace/src';

  const getAllFiles = (dir: string, pattern: RegExp): string[] => {
    const files: string[] = [];
    
    const walk = (currentDir: string) => {
      try {
        const items = readdirSync(currentDir);
        for (const item of items) {
          const fullPath = join(currentDir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('__tests__')) {
            walk(fullPath);
          } else if (stat.isFile() && pattern.test(item)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    walk(dir);
    return files;
  };

  describe('SimplifiedSupabaseMock Usage', () => {
    it('should use SimplifiedSupabaseMock in all service tests', () => {
      const serviceTestFiles = getAllFiles(
        join(projectRoot, 'services'),
        /\.test\.tsx?$/
      );

      const violations: string[] = [];
      
      for (const file of serviceTestFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Check for forbidden patterns
        if (content.includes("jest.mock('@supabase/supabase-js')")) {
          violations.push(`${file}: Uses manual mock instead of SimplifiedSupabaseMock`);
        }
        
        if (content.includes("jest.mock('../supabase')")) {
          violations.push(`${file}: Uses manual mock instead of SimplifiedSupabaseMock`);
        }
        
        // Check for correct pattern
        if (!content.includes('SimplifiedSupabaseMock')) {
          violations.push(`${file}: Does not use SimplifiedSupabaseMock`);
        }
      }

      expect(violations).toEqual([]);
    });

    it('should not have any manual mocks in service layer', () => {
      const serviceFiles = getAllFiles(
        join(projectRoot, 'services'),
        /\.(ts|tsx)$/
      );

      const violations: string[] = [];
      
      for (const file of serviceFiles) {
        const content = readFileSync(file, 'utf-8');
        
        if (content.includes('jest.mock(') && !file.includes('test')) {
          violations.push(`${file}: Contains jest.mock() outside of test file`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Centralized Query Keys', () => {
    it('should use centralized query keys from services/queryKeys', () => {
      const hookFiles = getAllFiles(
        join(projectRoot, 'hooks'),
        /\.(ts|tsx)$/
      );

      const violations: string[] = [];
      
      for (const file of hookFiles) {
        if (file.includes('__tests__')) continue;
        
        const content = readFileSync(file, 'utf-8');
        
        // Check for local query key definitions
        if (content.match(/const\s+\w*Keys\s*=\s*{/)) {
          violations.push(`${file}: Defines local query keys`);
        }
        
        if (content.includes("queryKey: ['") && !content.includes('inventoryKeys')) {
          violations.push(`${file}: Uses inline query keys instead of centralized keys`);
        }
        
        // Should import from queryKeys
        if (!content.includes("from '../services/queryKeys'") && 
            !content.includes('from "../../services/queryKeys"')) {
          violations.push(`${file}: Does not import from centralized queryKeys`);
        }
      }

      expect(violations).toEqual([]);
    });

    it('should have all inventory keys defined in central location', () => {
      const queryKeysPath = join(projectRoot, 'services/queryKeys.ts');
      const content = readFileSync(queryKeysPath, 'utf-8');
      
      const requiredKeys = [
        'all',
        'lists',
        'list',
        'details',
        'detail',
        'stats',
        'alerts',
        'movements',
        'categories',
        'suppliers'
      ];
      
      const missingKeys = requiredKeys.filter(key => 
        !content.includes(`${key}:`) && !content.includes(`'${key}'`)
      );
      
      expect(missingKeys).toEqual([]);
    });
  });

  describe('ValidationMonitor Usage', () => {
    it('should use ValidationMonitor in all services', () => {
      const serviceFiles = getAllFiles(
        join(projectRoot, 'services/inventory'),
        /^(?!.*\.test\.).*\.ts$/
      );

      const violations: string[] = [];
      
      for (const file of serviceFiles) {
        const content = readFileSync(file, 'utf-8');
        
        if (!content.includes('ValidationMonitor')) {
          violations.push(`${file}: Does not use ValidationMonitor`);
        }
        
        if (!content.includes('validationMonitor.validateResponse')) {
          violations.push(`${file}: Does not validate responses`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Schema Return Types', () => {
    it('should have return types for all transformation functions', () => {
      const schemaFiles = getAllFiles(
        join(projectRoot, 'schemas'),
        /\.ts$/
      );

      const violations: string[] = [];
      
      for (const file of schemaFiles) {
        if (file.includes('__tests__')) continue;
        
        const content = readFileSync(file, 'utf-8');
        
        // Check for transform functions without return types
        const transformMatches = content.matchAll(/transform:\s*\([^)]*\)\s*=>\s*(?!{)/g);
        
        for (const match of transformMatches) {
          const line = content.substring(0, match.index).split('\n').length;
          violations.push(`${file}:${line}: Transform function without explicit return type`);
        }
        
        // Check that schemas have proper typing
        if (!content.includes('z.infer<typeof')) {
          violations.push(`${file}: Missing type inference from schemas`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Error Boundaries', () => {
    it('should have error boundaries in all screen components', () => {
      const screenFiles = getAllFiles(
        join(projectRoot, 'screens'),
        /\.tsx$/
      );

      const violations: string[] = [];
      
      for (const file of screenFiles) {
        if (file.includes('__tests__')) continue;
        
        const content = readFileSync(file, 'utf-8');
        
        if (!content.includes('ErrorBoundary') && !content.includes('error boundary')) {
          violations.push(`${file}: Missing error boundary`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Test Coverage', () => {
    it('should have test files for all implementation files', () => {
      const implementationFiles = getAllFiles(projectRoot, /^(?!.*\.test\.).*\.(ts|tsx)$/);
      const missingTests: string[] = [];
      
      for (const file of implementationFiles) {
        if (file.includes('__tests__') || 
            file.includes('test-utils') || 
            file.includes('.test.') ||
            file.includes('types') ||
            file.includes('constants')) continue;
        
        const testFile = file.replace(/\.(ts|tsx)$/, '.test.$1');
        const testInDir = file.replace(/\/([^/]+)\.(ts|tsx)$/, '/__tests__/$1.test.$2');
        
        try {
          statSync(testFile);
        } catch {
          try {
            statSync(testInDir);
          } catch {
            missingTests.push(file);
          }
        }
      }

      expect(missingTests).toEqual([]);
    });
  });

  describe('Accessibility', () => {
    it('should have testIDs on all interactive elements', () => {
      const screenFiles = getAllFiles(
        join(projectRoot, 'screens'),
        /\.tsx$/
      );

      const violations: string[] = [];
      
      for (const file of screenFiles) {
        if (file.includes('__tests__')) continue;
        
        const content = readFileSync(file, 'utf-8');
        
        // Check for interactive elements without testID
        const interactiveElements = [
          '<TouchableOpacity',
          '<Pressable',
          '<Button',
          '<TextInput'
        ];
        
        for (const element of interactiveElements) {
          const elementMatches = content.matchAll(new RegExp(`${element}[^>]*>`, 'g'));
          
          for (const match of elementMatches) {
            if (!match[0].includes('testID=')) {
              const line = content.substring(0, match.index).split('\n').length;
              violations.push(`${file}:${line}: ${element} without testID`);
            }
          }
        }
      }

      // Allow some violations but not too many
      expect(violations.length).toBeLessThan(5);
    });
  });

  describe('Performance Patterns', () => {
    it('should use proper memoization in components', () => {
      const componentFiles = getAllFiles(
        join(projectRoot, 'screens'),
        /\.tsx$/
      );

      const violations: string[] = [];
      
      for (const file of componentFiles) {
        if (file.includes('__tests__')) continue;
        
        const content = readFileSync(file, 'utf-8');
        
        // Check for components that should use memo
        if (content.includes('export const') && !content.includes('React.memo')) {
          // Check if it's a complex component that should be memoized
          const lineCount = content.split('\n').length;
          if (lineCount > 100) {
            violations.push(`${file}: Large component without React.memo`);
          }
        }
        
        // Check for expensive computations without useMemo
        if (content.includes('.map(') && content.includes('.filter(') && !content.includes('useMemo')) {
          violations.push(`${file}: Complex computations without useMemo`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Security Patterns', () => {
    it('should not expose sensitive data in logs', () => {
      const allFiles = getAllFiles(projectRoot, /\.(ts|tsx)$/);
      const violations: string[] = [];
      
      for (const file of allFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Check for console.log of sensitive data
        if (content.match(/console\.(log|error|warn).*password/i)) {
          violations.push(`${file}: Logs password`);
        }
        
        if (content.match(/console\.(log|error|warn).*token/i)) {
          violations.push(`${file}: Logs token`);
        }
        
        if (content.match(/console\.(log|error|warn).*secret/i)) {
          violations.push(`${file}: Logs secret`);
        }
      }

      expect(violations).toEqual([]);
    });

    it('should enforce role-based access in services', () => {
      const serviceFiles = getAllFiles(
        join(projectRoot, 'services/inventory'),
        /^(?!.*\.test\.).*\.ts$/
      );

      const violations: string[] = [];
      
      for (const file of serviceFiles) {
        const content = readFileSync(file, 'utf-8');
        
        // Check that methods check permissions
        const methodMatches = content.matchAll(/async\s+(\w+)\s*\([^)]*\)/g);
        
        for (const match of methodMatches) {
          const methodName = match[1];
          const methodBody = content.substring(match.index!);
          
          // Skip private methods
          if (methodName.startsWith('_')) continue;
          
          // Check for permission checks
          if (!methodBody.includes('checkPermission') && 
              !methodBody.includes('role') &&
              !methodBody.includes('permission')) {
            violations.push(`${file}: Method ${methodName} does not check permissions`);
          }
        }
      }

      // Some violations expected for helper methods
      expect(violations.length).toBeLessThan(3);
    });
  });
});