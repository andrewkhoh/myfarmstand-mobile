#!/usr/bin/env node

/**
 * Test Migration Script
 * 
 * Automates the conversion of tests from old patterns to new patterns.
 * Run with: npx tsx scripts/migrate-tests.ts [options]
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as readline from 'readline';

interface MigrationOptions {
  dryRun: boolean;
  targetFile?: string;
  targetDir?: string;
  verbose: boolean;
}

class TestMigrator {
  private options: MigrationOptions;
  private stats = {
    filesAnalyzed: 0,
    filesModified: 0,
    patternsReplaced: 0,
    errors: 0
  };

  constructor(options: MigrationOptions) {
    this.options = options;
  }

  async migrate(): Promise<void> {
    console.log('🔄 Starting test migration...\n');
    
    const files = await this.getTargetFiles();
    
    for (const file of files) {
      await this.migrateFile(file);
    }
    
    this.printSummary();
  }

  private async getTargetFiles(): Promise<string[]> {
    if (this.options.targetFile) {
      return [this.options.targetFile];
    }
    
    const pattern = this.options.targetDir 
      ? path.join(this.options.targetDir, '**/*.test.{ts,tsx}')
      : 'src/**/*.test.{ts,tsx}';
    
    return glob(pattern);
  }

  private async migrateFile(filePath: string): Promise<void> {
    this.stats.filesAnalyzed++;
    
    if (this.options.verbose) {
      console.log(`📝 Processing: ${filePath}`);
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const migrated = await this.applyMigrations(content, filePath);
      
      if (content !== migrated) {
        this.stats.filesModified++;
        
        if (!this.options.dryRun) {
          // Create backup
          fs.writeFileSync(`${filePath}.backup`, content);
          // Write migrated content
          fs.writeFileSync(filePath, migrated);
          console.log(`✅ Migrated: ${filePath}`);
        } else {
          console.log(`🔍 Would migrate: ${filePath}`);
        }
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  private async applyMigrations(content: string, filePath: string): Promise<string> {
    let migrated = content;
    
    // Migration patterns
    const migrations = [
      // Replace complex mock chains
      {
        name: 'Simplify Supabase mocks',
        pattern: /mockSupabase\.from\(\)[\s\S]*?\.mockResolvedValue\(/g,
        replacement: (match: string) => {
          this.stats.patternsReplaced++;
          return 'mockSupabase.from().select().then((resolve) => resolve(';
        }
      },
      
      // Add schema validation imports
      {
        name: 'Add schema imports',
        pattern: /^(import.*from.*['"]\.\.\/.*Service['"];?)$/m,
        replacement: (match: string) => {
          if (!content.includes('Schema')) {
            this.stats.patternsReplaced++;
            return `${match}\nimport { validateServiceOutput } from '../../test/contracts/service.contracts';`;
          }
          return match;
        }
      },
      
      // Replace manual test data with factories
      {
        name: 'Use factories for test data',
        pattern: /const mock(Product|Order|User) = \{[\s\S]*?\};/g,
        replacement: (match: string, entity: string) => {
          this.stats.patternsReplaced++;
          const factoryName = `${entity.toLowerCase()}Factory`;
          
          // Extract overrides from the original mock
          const overrides = this.extractOverrides(match);
          
          return `const mock${entity} = ${factoryName}.create(${overrides});`;
        }
      },
      
      // Add factory imports if needed
      {
        name: 'Add factory imports',
        pattern: /^(import[\s\S]*?from)/m,
        replacement: (match: string) => {
          const factories = [];
          
          if (content.includes('mockProduct') && !content.includes('ProductFactory')) {
            factories.push('ProductFactory');
          }
          if (content.includes('mockOrder') && !content.includes('OrderFactory')) {
            factories.push('OrderFactory');
          }
          if (content.includes('mockUser') && !content.includes('UserFactory')) {
            factories.push('UserFactory');
          }
          
          if (factories.length > 0) {
            this.stats.patternsReplaced++;
            return `import { ${factories.join(', ')} } from '../../test/factories';\n${match}`;
          }
          
          return match;
        }
      },
      
      // Add schema validation to assertions
      {
        name: 'Add schema validation',
        pattern: /expect\(result\)\.toEqual\(/g,
        replacement: (match: string) => {
          // Only add if schema is available
          if (this.canInferSchema(filePath)) {
            this.stats.patternsReplaced++;
            return 'expect(validateServiceOutput(result, Schema)).toEqual(';
          }
          return match;
        }
      },
      
      // Simplify mock setup
      {
        name: 'Simplify mock setup',
        pattern: /jest\.mock\(['"].*?['"]\, \(\) => \{[\s\S]*?\}\);/g,
        replacement: (match: string) => {
          if (match.length > 200) { // Only simplify complex mocks
            this.stats.patternsReplaced++;
            return this.simplifyMock(match);
          }
          return match;
        }
      }
    ];
    
    // Apply each migration
    for (const migration of migrations) {
      if (this.options.verbose) {
        const before = migrated;
        migrated = migrated.replace(migration.pattern, migration.replacement as any);
        if (before !== migrated) {
          console.log(`  ✓ Applied: ${migration.name}`);
        }
      } else {
        migrated = migrated.replace(migration.pattern, migration.replacement as any);
      }
    }
    
    return migrated;
  }

  private extractOverrides(mockDefinition: string): string {
    // Simple extraction - in real implementation would parse properly
    const hasOverrides = mockDefinition.includes('id:') || 
                         mockDefinition.includes('name:') ||
                         mockDefinition.includes('price:');
    
    if (hasOverrides) {
      // Extract key-value pairs (simplified)
      return '{ /* manual migration needed */ }';
    }
    
    return '{}';
  }

  private canInferSchema(filePath: string): boolean {
    // Check if we can determine the schema from the file path
    if (filePath.includes('product')) return true;
    if (filePath.includes('order')) return true;
    if (filePath.includes('user')) return true;
    return false;
  }

  private simplifyMock(mockBlock: string): string {
    // Extract the module being mocked
    const moduleMatch = mockBlock.match(/jest\.mock\(['"](.+?)['"]/);
    if (!moduleMatch) return mockBlock;
    
    const moduleName = moduleMatch[1];
    
    // Return simplified mock based on module
    if (moduleName.includes('supabase')) {
      return `jest.mock('${moduleName}', () => ({
  supabase: createSupabaseMock()
}));`;
    }
    
    return mockBlock;
  }

  private printSummary(): void {
    console.log('\n📊 Migration Summary');
    console.log('═══════════════════════════════');
    console.log(`Files analyzed:     ${this.stats.filesAnalyzed}`);
    console.log(`Files modified:     ${this.stats.filesModified}`);
    console.log(`Patterns replaced:  ${this.stats.patternsReplaced}`);
    console.log(`Errors:            ${this.stats.errors}`);
    
    if (this.options.dryRun) {
      console.log('\n⚠️  DRY RUN - No files were actually modified');
      console.log('Run without --dry-run to apply changes');
    }
    
    if (this.stats.filesModified > 0 && !this.options.dryRun) {
      console.log('\n✅ Migration complete! Backup files created with .backup extension');
      console.log('Run tests to verify: npm test');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    targetFile: args.find(a => a.endsWith('.test.ts') || a.endsWith('.test.tsx')),
    targetDir: args.find(a => a.startsWith('--dir='))?.replace('--dir=', '')
  };
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Test Migration Tool

Usage: npx tsx scripts/migrate-tests.ts [options]

Options:
  --dry-run          Preview changes without modifying files
  --verbose, -v      Show detailed progress
  --dir=PATH         Migrate tests in specific directory
  --help, -h         Show this help message
  
Examples:
  # Preview all migrations
  npx tsx scripts/migrate-tests.ts --dry-run
  
  # Migrate a specific test file
  npx tsx scripts/migrate-tests.ts src/services/__tests__/cartService.test.ts
  
  # Migrate all tests in a directory
  npx tsx scripts/migrate-tests.ts --dir=src/services
  
  # Verbose dry run
  npx tsx scripts/migrate-tests.ts --dry-run --verbose
`);
    process.exit(0);
  }
  
  const migrator = new TestMigrator(options);
  await migrator.migrate();
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { TestMigrator };