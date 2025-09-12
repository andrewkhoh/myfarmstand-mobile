# Jest Configuration Migration Plan

## Executive Summary

This document outlines a comprehensive plan to reorganize and consolidate the Jest testing infrastructure for the MyFarmstand Mobile application. The migration addresses critical issues including configuration proliferation, inconsistent test results, and missing coverage due to multiple agents developing features in isolation.

## Current State Analysis

### Problems Identified

1. **Configuration Proliferation**: 40+ Jest configuration files in the root directory with overlapping concerns
2. **Naming Inconsistencies**: Temporary configurations (`.temp`, `.simple`, `.minimal`, `.debug`, `.fixed`) indicating incomplete work
3. **Feature Isolation**: Different agents created feature-specific configs without coordination
4. **Test Duplication**: Multiple configs testing same layers with different approaches
5. **Docker Volume Pollution**: Configurations exist in docker volumes causing scan overhead and performance issues

### Current Test Coverage Distribution

| Feature | Config Files | Test Files | Coverage Status |
|---------|-------------|------------|-----------------|
| Executive | 15+ configs | 50+ test files | Fragmented |
| Marketing | 10+ configs | 60+ test files | Inconsistent |
| Inventory | 12+ configs | 25+ test files | Partial |
| Core | 20+ configs | Various | Mixed |

## Proposed Architecture

### Directory Structure

```
jest/
├── base.config.js           # Shared base configuration
├── features/
│   ├── executive.js         # Executive feature suite
│   ├── marketing.js         # Marketing feature suite
│   └── inventory.js         # Inventory feature suite
├── layers/
│   ├── services.js          # Service layer tests
│   ├── hooks.js             # Hook layer tests
│   ├── components.js        # Component tests
│   └── screens.js           # Screen tests
├── specialized/
│   ├── race-conditions.js   # Race condition tests
│   ├── integration.js       # Integration tests
│   └── e2e.js              # End-to-end tests
└── performance/
    ├── security.js          # Security tests
    └── benchmarks.js        # Performance benchmarks
```

### Configuration Hierarchy

```
base.config.js
    ├── Shared settings (roots, ignore patterns, transforms)
    ├── Common module mappings
    └── Default coverage settings
        ↓
feature/layer configs
    ├── Extends base
    ├── Feature-specific test matches
    └── Custom setup files
        ↓
specialized configs
    ├── Extends appropriate base
    └── Specialized settings (timeouts, environments)
```

## Risk Mitigation Strategy

### Pre-Migration Safety Checks

#### 1. Baseline Capture (Critical)

```bash
# Create baseline directory
mkdir -p test-migration/baseline

# Capture current test results
npm run test:executive > test-migration/baseline/executive.txt 2>&1
npm run test:marketing > test-migration/baseline/marketing.txt 2>&1  
npm run test:inventory > test-migration/baseline/inventory.txt 2>&1
npm run test:services > test-migration/baseline/services.txt 2>&1
npm run test:hooks > test-migration/baseline/hooks.txt 2>&1

# Capture coverage metrics
npm run test:executive -- --coverage --coverageReporters=json-summary > test-migration/baseline/executive-coverage.json
npm run test:marketing -- --coverage --coverageReporters=json-summary > test-migration/baseline/marketing-coverage.json
npm run test:inventory -- --coverage --coverageReporters=json-summary > test-migration/baseline/inventory-coverage.json

# Record test file lists
jest --listTests --config=jest.config.executive.js > test-migration/baseline/executive-files.txt
jest --listTests --config=jest.config.marketing.js > test-migration/baseline/marketing-files.txt
jest --listTests --config=jest.config.inventory.js > test-migration/baseline/inventory-files.txt

# Create baseline snapshot
tar -czf test-migration/baseline-$(date +%Y%m%d-%H%M%S).tar.gz test-migration/baseline/
```

### Parallel Implementation Strategy

#### 2. Side-by-Side Approach

The new configuration structure will be implemented alongside existing configs to enable comparison testing:

```
/project-root
├── jest.config.*.js        # Keep ALL old configs untouched
├── jest/                   # New structure runs in parallel
│   ├── base.config.js
│   └── features/
└── package.json           # Add new scripts with :new suffix
```

#### 3. Verification Scripts

Package.json additions for comparison testing:

```json
{
  "scripts": {
    "test:executive:old": "jest -c jest.config.executive.js",
    "test:executive:new": "jest -c jest/features/executive.js",
    "test:executive:compare": "npm run test:executive:old -- --json > old.json && npm run test:executive:new -- --json > new.json && node scripts/compare-results.js",
    
    "test:marketing:old": "jest -c jest.config.marketing.js",
    "test:marketing:new": "jest -c jest/features/marketing.js",
    "test:marketing:compare": "node scripts/compare-test-runs.js marketing",
    
    "test:inventory:old": "jest -c jest.config.inventory.js",
    "test:inventory:new": "jest -c jest/features/inventory.js",
    "test:inventory:compare": "node scripts/compare-test-runs.js inventory"
  }
}
```

### Migration Validation Tests

#### 4. Validation Suite

Create automated validation to ensure migration safety:

```javascript
// jest/validation/migration-tests.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Migration Validation', () => {
  test('All test files are discovered', () => {
    const oldFiles = getTestFiles('jest.config.executive.js');
    const newFiles = getTestFiles('jest/features/executive.js');
    expect(newFiles.sort()).toEqual(oldFiles.sort());
  });

  test('Test counts match between old and new configs', () => {
    const oldCount = getTestCount('jest.config.executive.js');
    const newCount = getTestCount('jest/features/executive.js');
    expect(newCount).toBe(oldCount);
  });

  test('Coverage thresholds are maintained or improved', () => {
    const oldCoverage = getCoverage('old');
    const newCoverage = getCoverage('new');
    expect(newCoverage.lines).toBeGreaterThanOrEqual(oldCoverage.lines);
    expect(newCoverage.statements).toBeGreaterThanOrEqual(oldCoverage.statements);
    expect(newCoverage.functions).toBeGreaterThanOrEqual(oldCoverage.functions);
    expect(newCoverage.branches).toBeGreaterThanOrEqual(oldCoverage.branches);
  });

  test('No test files are orphaned', () => {
    const allTestFiles = getAllTestFiles('src');
    const configuredFiles = getAllConfiguredTestFiles();
    const orphaned = allTestFiles.filter(f => !configuredFiles.includes(f));
    expect(orphaned).toEqual([]);
  });
});
```

### Critical Validation Points

#### 5. Per-Feature Migration Checklist

For each feature (executive, marketing, inventory), execute:

```bash
#!/bin/bash
# scripts/validate-migration.sh

FEATURE=$1

echo "=== Validating $FEATURE migration ==="

# 1. Test discovery validation
echo "Checking test discovery..."
diff <(jest --listTests --config=jest.config.$FEATURE.js | sort) \
     <(jest --listTests --config=jest/features/$FEATURE.js | sort) || {
    echo "ERROR: Test discovery mismatch"
    exit 1
}

# 2. Test execution validation
echo "Comparing test results..."
npm run test:$FEATURE:old -- --json --outputFile=old-results.json
npm run test:$FEATURE:new -- --json --outputFile=new-results.json
node scripts/compare-test-results.js old-results.json new-results.json || {
    echo "ERROR: Test results differ"
    exit 1
}

# 3. Coverage validation
echo "Comparing coverage..."
npm run test:$FEATURE:old -- --coverage --coverageReporters=json-summary
mv coverage/coverage-summary.json old-coverage.json
npm run test:$FEATURE:new -- --coverage --coverageReporters=json-summary
mv coverage/coverage-summary.json new-coverage.json
node scripts/compare-coverage.js old-coverage.json new-coverage.json || {
    echo "ERROR: Coverage regression detected"
    exit 1
}

# 4. Performance validation
echo "Checking performance..."
OLD_TIME=$(time -p npm run test:$FEATURE:old 2>&1 | grep real | awk '{print $2}')
NEW_TIME=$(time -p npm run test:$FEATURE:new 2>&1 | grep real | awk '{print $2}')
node scripts/compare-performance.js $OLD_TIME $NEW_TIME || {
    echo "WARNING: Performance regression detected"
}

# 5. Module resolution validation
echo "Checking module resolution..."
npm run test:$FEATURE:new -- --verbose 2>&1 | grep -i "warning\|error" && {
    echo "WARNING: Module resolution issues detected"
}

echo "✅ $FEATURE validation complete"
```

### Rollback Strategy

#### 6. Safe Rollback Points

Implement feature flags for gradual rollout:

```javascript
// scripts/run-test.js
const config = require('../package.json').config.useNewJestConfig;
const feature = process.argv[2];

const useNew = config[feature] || false;
const configPath = useNew 
  ? `jest/features/${feature}.js`
  : `jest.config.${feature}.js`;

const { spawn } = require('child_process');
spawn('jest', ['-c', configPath], { stdio: 'inherit' });
```

Package.json configuration:

```json
{
  "config": {
    "useNewJestConfig": {
      "executive": false,
      "marketing": false,
      "inventory": false,
      "services": false,
      "hooks": false
    }
  }
}
```

### Integration Test Suite

#### 7. Cross-Feature Validation

```javascript
// jest/validation/integration-validation.test.js
describe('Cross-Feature Integration', () => {
  test('No test file conflicts across configs', () => {
    const allConfigs = [
      'jest/features/executive.js',
      'jest/features/marketing.js',
      'jest/features/inventory.js'
    ];
    
    const testFiles = allConfigs.map(getTestFiles).flat();
    const duplicates = testFiles.filter((file, index) => 
      testFiles.indexOf(file) !== index
    );
    
    expect(duplicates).toEqual([]);
  });

  test('Mock consistency across features', () => {
    const mockPaths = [
      'src/test/__mocks__',
      'src/__mocks__'
    ];
    
    mockPaths.forEach(mockPath => {
      const mocks = fs.readdirSync(mockPath);
      // Verify each mock is used consistently
      mocks.forEach(mock => {
        validateMockUsage(mock);
      });
    });
  });

  test('Setup files compatibility', () => {
    const setupFiles = [
      'src/test/test-setup.ts',
      'src/test/serviceSetup.ts',
      'src/test/race-condition-setup.ts'
    ];
    
    setupFiles.forEach(file => {
      expect(fs.existsSync(file)).toBe(true);
      // Verify no conflicting global setups
      validateSetupFile(file);
    });
  });
});
```

### Monitoring Commands

#### 8. Health Check Scripts

```bash
#!/bin/bash
# scripts/test-health-check.sh

echo "=== Test Suite Health Check ==="

# Check for orphaned tests
echo "Checking for orphaned tests..."
find src -name "*.test.*" -o -name "*.spec.*" | while read file; do
  FOUND=0
  for config in jest/features/*.js jest/layers/*.js; do
    jest --listTests --config=$config 2>/dev/null | grep -q "$file" && FOUND=1
  done
  if [ $FOUND -eq 0 ]; then
    echo "WARNING: Orphaned test: $file"
  fi
done

# Check for duplicate test names
echo "Checking for duplicate test names..."
jest --listTests --config=jest/all.config.js | sort | uniq -d | while read dup; do
  echo "WARNING: Duplicate test: $dup"
done

# Verify no tests are skipped unintentionally
echo "Checking for skipped tests..."
grep -r "test.skip\|describe.skip\|it.skip" src/ --include="*.test.*" --include="*.spec.*" | while read skip; do
  echo "INFO: Skipped test found: $skip"
done

# Check coverage gaps
echo "Analyzing coverage gaps..."
npm run test:all -- --coverage --coverageReporters=text-summary

# Check for test file naming consistency
echo "Checking test file naming..."
find src -name "*.test.*" -o -name "*.spec.*" | while read file; do
  basename "$file" | grep -E "\.(test|spec)\.(ts|tsx|js|jsx)$" > /dev/null || {
    echo "WARNING: Non-standard test file naming: $file"
  }
done

echo "=== Health check complete ==="
```

### Final Validation Suite

#### 9. Comprehensive Validation

```bash
#!/bin/bash
# scripts/final-validation.sh

set -e  # Exit on any error

echo "=== Running Final Validation Suite ==="

# 1. All features test successfully
echo "Testing all features..."
npm run test:executive:new || exit 1
npm run test:marketing:new || exit 1  
npm run test:inventory:new || exit 1

# 2. Cross-feature layer tests work
echo "Testing cross-feature layers..."
npm run test:services || exit 1
npm run test:hooks || exit 1
npm run test:components || exit 1

# 3. Specialized tests work
echo "Testing specialized suites..."
npm run test:race || exit 1
npm run test:integration || exit 1

# 4. Coverage meets thresholds
echo "Checking coverage thresholds..."
npm run test:all -- --coverage || exit 1

# 5. No test timing regression (>20% slower fails)
echo "Checking performance..."
./scripts/performance-check.sh || exit 1

# 6. Verify all test files are included
echo "Verifying test inclusion..."
EXPECTED_COUNT=$(find src -name "*.test.*" -o -name "*.spec.*" | wc -l)
ACTUAL_COUNT=$(jest --listTests --config=jest/all.config.js | wc -l)
if [ $EXPECTED_COUNT -ne $ACTUAL_COUNT ]; then
  echo "ERROR: Test count mismatch. Expected: $EXPECTED_COUNT, Actual: $ACTUAL_COUNT"
  exit 1
fi

echo "✅ All validations passed successfully!"
```

## Risk Matrix & Mitigation

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| Tests not discovered | High | Medium | Run diff on --listTests output before/after |
| Coverage drops | High | Low | Compare coverage JSON, set minimum thresholds |
| Mock conflicts | Medium | Medium | Test each feature in isolation first |
| Performance degradation | Medium | Low | Time each suite, set acceptable thresholds |
| Module resolution breaks | High | Low | Validate with --verbose flag, check for warnings |
| Setup file conflicts | Medium | Medium | Run with --no-cache initially |
| CI/CD pipeline breaks | High | Low | Test in feature branch with CI first |
| Race condition test failures | High | Medium | Maintain separate race condition config |
| Memory leaks in tests | Medium | Low | Monitor with --detectLeaks flag |
| Snapshot mismatches | Low | High | Update snapshots after validation |

## Migration Phases

### Phase 1: Foundation (Week 1)
- Create baseline captures
- Set up parallel directory structure
- Implement base configuration
- Create validation scripts

### Phase 2: Low-Risk Migration (Week 1-2)
- Migrate performance tests
- Migrate security tests
- Validate each migration
- Document findings

### Phase 3: Layer Migration (Week 2)
- Migrate service layer tests
- Migrate hook layer tests
- Migrate component tests
- Run cross-layer validation

### Phase 4: Feature Migration (Week 3)
- Migrate inventory feature (least critical)
- Migrate marketing feature
- Migrate executive feature (most critical)
- Validate feature completeness

### Phase 5: Integration & Cleanup (Week 3-4)
- Migrate integration tests
- Update CI/CD configurations
- Remove old configurations
- Update documentation

### Phase 6: Monitoring & Optimization (Week 4+)
- Monitor test performance
- Optimize slow tests
- Address any issues
- Create maintenance plan

## Success Criteria

1. **No Test Loss**: 100% of existing tests are discoverable and running
2. **Coverage Maintained**: Coverage percentages equal or better than baseline
3. **Performance**: No more than 10% increase in total test execution time
4. **Reliability**: No new flaky tests introduced
5. **Maintainability**: Clear structure understood by all team members
6. **CI/CD Compatibility**: All pipelines functioning without modification
7. **Documentation**: Complete migration guide and troubleshooting docs

## Rollback Plan

If critical issues arise at any phase:

1. **Immediate**: Revert package.json to use old configs
2. **Short-term**: Keep both config systems running in parallel
3. **Investigation**: Use validation suite to identify root cause
4. **Fix Forward**: Address issues in new configs while old remains active
5. **Re-attempt**: Once issues resolved, restart migration from last successful phase

## Post-Migration Monitoring

### Weekly Checks (First Month)
- Test execution times
- Coverage trends
- Flaky test reports
- Developer feedback

### Monthly Reviews
- Config optimization opportunities
- New test patterns to incorporate
- Documentation updates
- Training needs

## Appendix A: Command Reference

### New Test Commands Structure

```json
{
  "scripts": {
    // Top-level commands
    "test": "npm run test:all",
    "test:all": "jest -c jest/all.config.js",
    "test:watch": "jest -c jest/all.config.js --watch",
    "test:coverage": "jest -c jest/all.config.js --coverage",
    
    // Feature-based testing
    "test:features": "npm run test:executive && npm run test:marketing && npm run test:inventory",
    "test:executive": "jest -c jest/features/executive.js",
    "test:marketing": "jest -c jest/features/marketing.js", 
    "test:inventory": "jest -c jest/features/inventory.js",
    
    // Layer-based testing  
    "test:layers": "npm run test:services && npm run test:hooks && npm run test:components && npm run test:screens",
    "test:services": "jest -c jest/layers/services.js",
    "test:hooks": "jest -c jest/layers/hooks.js",
    "test:components": "jest -c jest/layers/components.js",
    "test:screens": "jest -c jest/layers/screens.js",
    
    // Specialized testing
    "test:specialized": "npm run test:race && npm run test:integration && npm run test:e2e",
    "test:race": "jest -c jest/specialized/race-conditions.js",
    "test:integration": "jest -c jest/specialized/integration.js",
    "test:e2e": "jest -c jest/specialized/e2e.js",
    
    // Performance testing
    "test:performance": "npm run test:security && npm run test:benchmarks",
    "test:security": "jest -c jest/performance/security.js",
    "test:benchmarks": "jest -c jest/performance/benchmarks.js",
    
    // Feature + Layer combinations
    "test:executive:services": "jest -c jest/features/executive.js --testPathPattern=services",
    "test:marketing:hooks": "jest -c jest/features/marketing.js --testPathPattern=hooks",
    "test:inventory:components": "jest -c jest/features/inventory.js --testPathPattern=components",
    
    // Validation commands
    "test:validate": "node scripts/validate-migration.sh",
    "test:health": "bash scripts/test-health-check.sh",
    "test:compare": "node scripts/compare-all-configs.js"
  }
}
```

## Appendix B: Troubleshooting Guide

### Common Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Tests not found | "No tests found" error | Check testMatch patterns in config |
| Module resolution fails | Cannot find module errors | Verify moduleNameMapper settings |
| Setup file errors | Tests fail before running | Check setupFilesAfterEnv paths |
| Coverage missing | 0% coverage reported | Verify collectCoverageFrom patterns |
| Slow test execution | Tests take >2x longer | Check transformIgnorePatterns |
| Memory issues | Heap out of memory | Add --maxWorkers=2 flag |
| Flaky tests | Intermittent failures | Isolate with --runInBand flag |

## Appendix C: Configuration Templates

### Base Configuration Template

```javascript
// jest/base.config.js
module.exports = {
  // Roots
  roots: ['<rootDir>/src'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/docker/volumes/',
    '<rootDir>/docker/projects/'
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
  
  // Haste map config
  haste: {
    throwOnModuleCollision: false
  },
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Feature Configuration Template

```javascript
// jest/features/[feature-name].js
const baseConfig = require('../base.config');

module.exports = {
  ...baseConfig,
  
  displayName: 'feature-name',
  
  testMatch: [
    '**/feature-name/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/services/feature-name/**/*.(test|spec).(ts|tsx|js)',
    '**/hooks/feature-name/**/*.(test|spec).(ts|tsx|js)',
    '**/screens/feature-name/**/*.(test|spec).(ts|tsx|js)'
  ],
  
  setupFilesAfterEnv: [
    '<rootDir>/src/test/test-setup.ts',
    '<rootDir>/src/test/feature-setup.ts'
  ],
  
  coverageDirectory: '<rootDir>/coverage/feature-name'
};
```

## Document Version

- **Version**: 1.0.0
- **Date**: 2025-09-12
- **Author**: Development Team
- **Status**: Draft
- **Review Date**: 2025-09-19

## References

- [Jest Documentation](https://jestjs.io/docs/configuration)
- [Testing Best Practices](./testing-best-practices.md)
- [CI/CD Pipeline Documentation](./ci-cd-pipeline.md)
- [Development Guidelines](./development-guidelines.md)