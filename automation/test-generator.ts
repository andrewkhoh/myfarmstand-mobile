#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface TestTemplate {
  type: 'unit' | 'integration';
  service: string;
  testFile: string;
  content: string;
  dependencies: string[];
}

interface TestGenerationResult {
  service: string;
  testsGenerated: TestTemplate[];
  coverage: {
    methods: string[];
    hooks: string[];
    scenarios: string[];
  };
  status: 'success' | 'partial' | 'failed';
}

export class TestGenerator {
  private projectRoot: string;
  private testDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.testDir = path.join(this.projectRoot, 'src/tests/generated');
    
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
  }

  async generateAllTests(): Promise<TestGenerationResult[]> {
    console.log('🧪 Starting Test Generation...');

    const services = this.discoverServices();
    const hooks = this.discoverHooks();
    const results: TestGenerationResult[] = [];

    // Generate tests for services
    for (const servicePath of services) {
      const result = await this.generateServiceTests(servicePath);
      results.push(result);
    }

    // Generate tests for hooks
    for (const hookPath of hooks) {
      const result = await this.generateHookTests(hookPath);
      results.push(result);
    }

    this.generateTestReport(results);
    return results;
  }

  private discoverServices(): string[] {
    const servicesDir = path.join(this.projectRoot, 'src/services');
    if (!fs.existsSync(servicesDir)) return [];

    return fs.readdirSync(servicesDir)
      .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .map(file => path.join(servicesDir, file));
  }

  private discoverHooks(): string[] {
    const hooksDir = path.join(this.projectRoot, 'src/hooks');
    if (!fs.existsSync(hooksDir)) return [];

    return fs.readdirSync(hooksDir)
      .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .map(file => path.join(hooksDir, file));
  }

  private async generateServiceTests(servicePath: string): Promise<TestGenerationResult> {
    const serviceName = path.basename(servicePath, '.ts');
    console.log(`\n🧪 Generating tests for service: ${serviceName}`);

    const content = fs.readFileSync(servicePath, 'utf8');
    const methods = this.extractMethods(content);
    const testsGenerated: TestTemplate[] = [];

    // Generate unit tests
    const unitTest = this.generateServiceUnitTest(serviceName, content, methods);
    testsGenerated.push(unitTest);

    // Generate integration tests
    const integrationTest = this.generateServiceIntegrationTest(serviceName, content, methods);
    testsGenerated.push(integrationTest);

    // Write test files
    for (const test of testsGenerated) {
      fs.writeFileSync(test.testFile, test.content);
    }

    console.log(`   Generated ${testsGenerated.length} test files`);

    return {
      service: serviceName,
      testsGenerated,
      coverage: {
        methods,
        hooks: [],
        scenarios: this.generateTestScenarios(serviceName, methods)
      },
      status: 'success'
    };
  }

  private async generateHookTests(hookPath: string): Promise<TestGenerationResult> {
    const hookName = path.basename(hookPath, '.ts');
    console.log(`\n🪝 Generating tests for hook: ${hookName}`);

    const content = fs.readFileSync(hookPath, 'utf8');
    const hookMethods = this.extractHookMethods(content);
    const testsGenerated: TestTemplate[] = [];

    // Generate hook tests
    const hookTest = this.generateHookUnitTest(hookName, content, hookMethods);
    testsGenerated.push(hookTest);

    // Write test files
    for (const test of testsGenerated) {
      fs.writeFileSync(test.testFile, test.content);
    }

    console.log(`   Generated ${testsGenerated.length} test files`);

    return {
      service: hookName,
      testsGenerated,
      coverage: {
        methods: [],
        hooks: hookMethods,
        scenarios: this.generateHookTestScenarios(hookName, hookMethods)
      },
      status: 'success'
    };
  }

  private extractMethods(content: string): string[] {
    const methods: string[] = [];
    const methodRegex = /(?:export\s+)?(?:async\s+)?(?:function\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      if (!['constructor', 'render', 'default'].includes(methodName)) {
        methods.push(methodName);
      }
    }

    return [...new Set(methods)]; // Remove duplicates
  }

  private extractHookMethods(content: string): string[] {
    const methods: string[] = [];
    
    // Look for returned methods from hooks
    const returnRegex = /return\s*{([^}]+)}/g;
    let match;

    while ((match = returnRegex.exec(content)) !== null) {
      const returnContent = match[1];
      const methodMatches = returnContent.match(/(\w+)(?:\s*[,:}])/g);
      
      if (methodMatches) {
        methodMatches.forEach(m => {
          const method = m.replace(/[,:}]/g, '').trim();
          if (method && !methods.includes(method)) {
            methods.push(method);
          }
        });
      }
    }

    return methods;
  }

  private generateServiceUnitTest(serviceName: string, content: string, methods: string[]): TestTemplate {
    const testFileName = `${serviceName}.unit.test.ts`;
    const testPath = path.join(this.testDir, testFileName);

    const testContent = `// Generated Unit Tests for ${serviceName}
// Generated: ${new Date().toISOString()}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as ${serviceName} from '../../services/${serviceName}';

// Mock dependencies
vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

vi.mock('../../utils/broadcastFactory', () => ({
  sendOrderBroadcast: vi.fn(() => Promise.resolve({ success: true }))
}));

describe('${serviceName} Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

${methods.map(method => `
  describe('${method}', () => {
    it('should handle successful execution', async () => {
      // Arrange
      const mockInput = {}; // TODO: Add appropriate test data
      
      // Act
      const result = await ${serviceName}.${method}(mockInput);
      
      // Assert
      expect(result).toBeDefined();
      // TODO: Add specific assertions based on expected behavior
    });

    it('should handle error cases', async () => {
      // Arrange
      const mockInput = {}; // TODO: Add error-triggering test data
      
      // Act & Assert
      // TODO: Add error handling tests
      expect(true).toBe(true); // Placeholder
    });

    it('should validate input parameters', async () => {
      // Arrange
      const invalidInput = null;
      
      // Act & Assert
      // TODO: Add input validation tests
      expect(true).toBe(true); // Placeholder
    });
  });`).join('')}

  // Integration scenarios
  describe('Integration Scenarios', () => {
    it('should handle complete workflow', async () => {
      // TODO: Add end-to-end workflow tests
      expect(true).toBe(true); // Placeholder
    });

    it('should handle concurrent operations', async () => {
      // TODO: Add concurrency tests
      expect(true).toBe(true); // Placeholder
    });

    it('should maintain data consistency', async () => {
      // TODO: Add data consistency tests
      expect(true).toBe(true); // Placeholder
    });
  });
});`;

    return {
      type: 'unit',
      service: serviceName,
      testFile: testPath,
      content: testContent,
      dependencies: ['vitest', 'supabase', 'broadcastFactory']
    };
  }

  private generateServiceIntegrationTest(serviceName: string, content: string, methods: string[]): TestTemplate {
    const testFileName = `${serviceName}.integration.test.ts`;
    const testPath = path.join(this.testDir, testFileName);

    const testContent = `// Generated Integration Tests for ${serviceName}
// Generated: ${new Date().toISOString()}

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as ${serviceName} from '../../services/${serviceName}';

// Test database setup
const testSupabaseUrl = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const testSupabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-key';
const testSupabase = createClient(testSupabaseUrl, testSupabaseKey);

describe('${serviceName} Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    console.log('Setting up integration test database...');
  });

  afterAll(async () => {
    // Cleanup test database
    console.log('Cleaning up integration test database...');
  });

  beforeEach(async () => {
    // Reset test data before each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

${methods.map(method => `
  describe('${method} Integration', () => {
    it('should work with real database', async () => {
      // Arrange
      const testData = {}; // TODO: Create realistic test data
      
      // Act
      const result = await ${serviceName}.${method}(testData);
      
      // Assert
      expect(result).toBeDefined();
      // TODO: Verify database state changes
    });

    it('should handle database constraints', async () => {
      // TODO: Test database constraint violations
      expect(true).toBe(true); // Placeholder
    });

    it('should maintain referential integrity', async () => {
      // TODO: Test foreign key relationships
      expect(true).toBe(true); // Placeholder
    });
  });`).join('')}

  // Cross-service integration tests
  describe('Cross-Service Integration', () => {
    it('should work with related services', async () => {
      // TODO: Test interactions with other services
      expect(true).toBe(true); // Placeholder
    });

    it('should handle broadcast events', async () => {
      // TODO: Test broadcast integration
      expect(true).toBe(true); // Placeholder
    });

    it('should maintain cache consistency', async () => {
      // TODO: Test React Query cache interactions
      expect(true).toBe(true); // Placeholder
    });
  });

  // Performance tests
  describe('Performance Tests', () => {
    it('should handle large datasets', async () => {
      // TODO: Test with large amounts of data
      expect(true).toBe(true); // Placeholder
    });

    it('should complete within acceptable time limits', async () => {
      // TODO: Add performance benchmarks
      expect(true).toBe(true); // Placeholder
    });
  });
});`;

    return {
      type: 'integration',
      service: serviceName,
      testFile: testPath,
      content: testContent,
      dependencies: ['vitest', '@supabase/supabase-js']
    };
  }

  private generateHookUnitTest(hookName: string, content: string, methods: string[]): TestTemplate {
    const testFileName = `${hookName}.test.ts`;
    const testPath = path.join(this.testDir, testFileName);

    const testContent = `// Generated Tests for ${hookName}
// Generated: ${new Date().toISOString()}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import ${hookName} from '../../hooks/${hookName}';

// Mock dependencies
vi.mock('../../services/orderService', () => ({
  updateOrderStatus: vi.fn(() => Promise.resolve({ success: true })),
  getOrder: vi.fn(() => Promise.resolve({ id: '1', status: 'pending' }))
}));

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('${hookName}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default state', () => {
    // Arrange & Act
    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper()
    });

    // Assert
    expect(result.current).toBeDefined();
    // TODO: Add specific state assertions
  });

${methods.map(method => `
  describe('${method}', () => {
    it('should execute successfully', async () => {
      // Arrange
      const { result } = renderHook(() => ${hookName}(), {
        wrapper: createWrapper()
      });

      // Act
      if (typeof result.current.${method} === 'function') {
        result.current.${method}();
      }

      // Assert
      await waitFor(() => {
        // TODO: Add specific assertions for ${method}
        expect(true).toBe(true); // Placeholder
      });
    });

    it('should handle loading states', async () => {
      // TODO: Test loading state management
      expect(true).toBe(true); // Placeholder
    });

    it('should handle error states', async () => {
      // TODO: Test error handling
      expect(true).toBe(true); // Placeholder
    });
  });`).join('')}

  // React Query specific tests
  describe('React Query Integration', () => {
    it('should invalidate cache correctly', async () => {
      // TODO: Test cache invalidation
      expect(true).toBe(true); // Placeholder
    });

    it('should handle optimistic updates', async () => {
      // TODO: Test optimistic update patterns
      expect(true).toBe(true); // Placeholder
    });

    it('should rollback on error', async () => {
      // TODO: Test error rollback
      expect(true).toBe(true); // Placeholder
    });
  });

  // Hook-specific behavior tests
  describe('Hook Behavior', () => {
    it('should cleanup on unmount', () => {
      // TODO: Test cleanup behavior
      expect(true).toBe(true); // Placeholder
    });

    it('should handle re-renders correctly', () => {
      // TODO: Test re-render stability
      expect(true).toBe(true); // Placeholder
    });

    it('should maintain referential equality where appropriate', () => {
      // TODO: Test memoization
      expect(true).toBe(true); // Placeholder
    });
  });
});`;

    return {
      type: 'unit',
      service: hookName,
      testFile: testPath,
      content: testContent,
      dependencies: ['vitest', '@testing-library/react', '@tanstack/react-query']
    };
  }

  private generateTestScenarios(serviceName: string, methods: string[]): string[] {
    const scenarios = [
      `${serviceName} successful operations`,
      `${serviceName} error handling`,
      `${serviceName} input validation`,
      `${serviceName} database integration`,
      `${serviceName} broadcast events`,
      `${serviceName} concurrent operations`
    ];

    methods.forEach(method => {
      scenarios.push(`${method} success case`);
      scenarios.push(`${method} error case`);
      scenarios.push(`${method} edge cases`);
    });

    return scenarios;
  }

  private generateHookTestScenarios(hookName: string, methods: string[]): string[] {
    const scenarios = [
      `${hookName} initialization`,
      `${hookName} loading states`,
      `${hookName} error states`,
      `${hookName} cache management`,
      `${hookName} optimistic updates`,
      `${hookName} cleanup behavior`
    ];

    methods.forEach(method => {
      scenarios.push(`${method} execution`);
      scenarios.push(`${method} state management`);
    });

    return scenarios;
  }

  private generateTestReport(results: TestGenerationResult[]): void {
    const reportDir = './automation/reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `test-generation-${timestamp}.json`);
    const markdownPath = path.join(reportDir, `test-generation-${timestamp}.md`);

    // JSON Report
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Markdown Report
    const markdown = this.generateMarkdownTestReport(results);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📊 Test generation reports created:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${markdownPath}`);
  }

  private generateMarkdownTestReport(results: TestGenerationResult[]): string {
    const totalServices = results.length;
    const totalTests = results.reduce((sum, r) => sum + r.testsGenerated.length, 0);
    const totalScenarios = results.reduce((sum, r) => sum + r.coverage.scenarios.length, 0);

    let markdown = `# Test Generation Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## 📊 Summary\n\n`;
    markdown += `- **Services/Hooks Processed:** ${totalServices}\n`;
    markdown += `- **Test Files Generated:** ${totalTests}\n`;
    markdown += `- **Test Scenarios:** ${totalScenarios}\n`;
    markdown += `- **Test Directory:** \`src/tests/generated/\`\n\n`;

    markdown += `## 🧪 Generated Tests\n\n`;

    for (const result of results) {
      const statusIcon = result.status === 'success' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
      markdown += `### ${statusIcon} ${result.service}\n\n`;
      
      markdown += `**Test Files Generated:**\n`;
      for (const test of result.testsGenerated) {
        const testIcon = test.type === 'unit' ? '🔬' : '🔗';
        markdown += `- ${testIcon} \`${path.basename(test.testFile)}\` (${test.type})\n`;
      }

      if (result.coverage.methods.length > 0) {
        markdown += `\n**Methods Covered:** ${result.coverage.methods.join(', ')}\n`;
      }

      if (result.coverage.hooks.length > 0) {
        markdown += `\n**Hook Methods Covered:** ${result.coverage.hooks.join(', ')}\n`;
      }

      markdown += `\n**Test Scenarios:** ${result.coverage.scenarios.length}\n`;
      markdown += `\n`;
    }

    markdown += `## 🚀 Next Steps\n\n`;
    markdown += `1. **Review Generated Tests:** Check the generated test files and customize them for your specific needs\n`;
    markdown += `2. **Add Test Data:** Replace placeholder test data with realistic scenarios\n`;
    markdown += `3. **Configure Test Environment:** Set up test database and environment variables\n`;
    markdown += `4. **Run Tests:** Execute \`npm test\` to run the generated test suite\n`;
    markdown += `5. **Measure Coverage:** Use \`npm run test:coverage\` to check test coverage\n\n`;

    markdown += `## 📝 Test File Locations\n\n`;
    for (const result of results) {
      for (const test of result.testsGenerated) {
        markdown += `- \`${test.testFile.replace(this.projectRoot, '.')}\`\n`;
      }
    }

    return markdown;
  }
}

// CLI execution
if (require.main === module) {
  const generator = new TestGenerator();
  generator.generateAllTests()
    .then(results => {
      const totalTests = results.reduce((sum, r) => sum + r.testsGenerated.length, 0);
      const successCount = results.filter(r => r.status === 'success').length;
      
      console.log(`\n🎯 Test Generation Complete!`);
      console.log(`   ${totalTests} test files generated`);
      console.log(`   ${successCount}/${results.length} services/hooks processed successfully`);
      console.log(`\n📁 Tests created in: src/tests/generated/`);
      console.log(`\n🚀 Next steps:`);
      console.log(`   1. Review and customize generated tests`);
      console.log(`   2. Add realistic test data`);
      console.log(`   3. Run: npm test`);
    })
    .catch(error => {
      console.error('❌ Test generation failed:', error);
      process.exit(1);
    });
}

export default TestGenerator;
