import * as fs from 'fs';
import * as path from 'path';

interface TestFile {
  path: string;
  type: 'unit' | 'integration' | 'e2e' | 'component';
  framework: string;
  size: number;
  testCount: number;
  mockCount: number;
  coverage: 'none' | 'partial' | 'full';
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

interface TestCoverage {
  area: string;
  files: string[];
  testFiles: string[];
  coverage: number;
  gaps: string[];
}

interface TestingAuditResult {
  totalTestFiles: number;
  totalTests: number;
  coverageByArea: TestCoverage[];
  testingFrameworks: string[];
  testQuality: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  gaps: string[];
  recommendations: string[];
}

class TestingAuditor {
  private testFiles: TestFile[] = [];
  private sourceFiles: string[] = [];
  private coverageAreas: TestCoverage[] = [];

  private readonly codeAreas = {
    services: 'src/services',
    hooks: 'src/hooks', 
    screens: 'src/screens',
    components: 'src/components',
    utils: 'src/utils',
    config: 'src/config',
    types: 'src/types'
  };

  public async auditDirectory(dirPath: string): Promise<void> {
    // Find all test files
    await this.findTestFiles(dirPath);
    
    // Find all source files
    await this.findSourceFiles(dirPath);
    
    // Analyze coverage by area
    this.analyzeCoverageByArea();
  }

  private async findTestFiles(dirPath: string): Promise<void> {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !['node_modules', '.git', '.expo', 'build'].includes(item)) {
        await this.findTestFiles(fullPath);
      } else if (stat.isFile() && this.isTestFile(fullPath)) {
        const testFile = await this.analyzeTestFile(fullPath);
        this.testFiles.push(testFile);
      }
    }
  }

  private async findSourceFiles(dirPath: string): Promise<void> {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item === 'src') {
        await this.findSourceFilesRecursive(fullPath);
      }
    }
  }

  private async findSourceFilesRecursive(dirPath: string): Promise<void> {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !['__tests__', 'test', 'tests'].includes(item)) {
        await this.findSourceFilesRecursive(fullPath);
      } else if (stat.isFile() && this.isSourceFile(fullPath)) {
        this.sourceFiles.push(fullPath);
      }
    }
  }

  private isTestFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);
    
    return (
      ['.ts', '.tsx', '.js', '.jsx'].includes(ext) &&
      (fileName.includes('.test.') || 
       fileName.includes('.spec.') || 
       filePath.includes('__tests__') ||
       filePath.includes('/test/') ||
       filePath.includes('/tests/'))
    );
  }

  private isSourceFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !this.isTestFile(filePath);
  }

  private async analyzeTestFile(filePath: string): Promise<TestFile> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Determine test type
    const type = this.determineTestType(filePath, content);
    
    // Determine framework
    const framework = this.determineFramework(content);
    
    // Count tests
    const testCount = this.countTests(content);
    
    // Count mocks
    const mockCount = this.countMocks(content);
    
    // Assess coverage
    const coverage = this.assessCoverage(content, testCount);
    
    // Assess quality
    const quality = this.assessQuality(content, testCount, mockCount);
    
    return {
      path: filePath,
      type,
      framework,
      size: lines.length,
      testCount,
      mockCount,
      coverage,
      quality
    };
  }

  private determineTestType(filePath: string, content: string): 'unit' | 'integration' | 'e2e' | 'component' {
    // Component tests
    if (content.includes('render(') || content.includes('fireEvent') || filePath.includes('Screen')) {
      return 'component';
    }
    
    // Integration tests
    if (content.includes('supabase') || content.includes('API') || content.includes('Service')) {
      return 'integration';
    }
    
    // E2E tests
    if (content.includes('detox') || content.includes('e2e') || content.includes('Detox')) {
      return 'e2e';
    }
    
    // Default to unit
    return 'unit';
  }

  private determineFramework(content: string): string {
    const frameworks = [];
    
    if (content.includes('@testing-library')) {
      frameworks.push('React Testing Library');
    }
    if (content.includes('jest')) {
      frameworks.push('Jest');
    }
    if (content.includes('describe(') || content.includes('it(') || content.includes('test(')) {
      frameworks.push('Jest');
    }
    if (content.includes('detox')) {
      frameworks.push('Detox');
    }
    if (content.includes('enzyme')) {
      frameworks.push('Enzyme');
    }
    
    return frameworks.length > 0 ? frameworks.join(', ') : 'Unknown';
  }

  private countTests(content: string): number {
    const testPatterns = [
      /\bit\s*\(/g,
      /\btest\s*\(/g,
      /\bshould\s*\(/g,
      /\bexpect\s*\(/g
    ];
    
    let count = 0;
    testPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });
    
    return Math.max(count, content.match(/describe\s*\(/g)?.length || 0);
  }

  private countMocks(content: string): number {
    const mockPatterns = [
      /jest\.mock\(/g,
      /\.mockReturnValue\(/g,
      /\.mockImplementation\(/g,
      /\.mockResolvedValue\(/g,
      /\.mockRejectedValue\(/g,
      /MockedFunction/g
    ];
    
    let count = 0;
    mockPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });
    
    return count;
  }

  private assessCoverage(content: string, testCount: number): 'none' | 'partial' | 'full' {
    if (testCount === 0) return 'none';
    if (testCount < 5) return 'partial';
    
    // Check for comprehensive testing patterns
    const hasErrorTests = content.includes('error') || content.includes('fail');
    const hasSuccessTests = content.includes('success') || content.includes('should');
    const hasEdgeCases = content.includes('edge') || content.includes('empty') || content.includes('null');
    
    if (hasErrorTests && hasSuccessTests && hasEdgeCases) {
      return 'full';
    }
    
    return 'partial';
  }

  private assessQuality(content: string, testCount: number, mockCount: number): 'poor' | 'fair' | 'good' | 'excellent' {
    let score = 0;
    
    // Test count (max 3 points)
    if (testCount >= 10) score += 3;
    else if (testCount >= 5) score += 2;
    else if (testCount >= 1) score += 1;
    
    // Good practices (max 4 points)
    if (content.includes('beforeEach') || content.includes('setup')) score += 1;
    if (content.includes('afterEach') || content.includes('cleanup')) score += 1;
    if (content.includes('describe')) score += 1;
    if (mockCount > 0) score += 1;
    
    // Comprehensive testing (max 3 points)
    if (content.includes('error') || content.includes('throw')) score += 1;
    if (content.includes('waitFor') || content.includes('async')) score += 1;
    if (content.includes('expect')) score += 1;
    
    // Quality indicators (max 2 points)
    if (content.includes('// ') || content.includes('/* ')) score += 1; // Comments
    if (content.length > 500) score += 1; // Substantial test file
    
    if (score >= 10) return 'excellent';
    if (score >= 7) return 'good';
    if (score >= 4) return 'fair';
    return 'poor';
  }

  private analyzeCoverageByArea(): void {
    Object.entries(this.codeAreas).forEach(([areaName, areaPath]) => {
      const areaSourceFiles = this.sourceFiles.filter(f => f.includes(areaPath));
      const areaTestFiles = this.testFiles.filter(f => 
        f.path.includes(areaPath) || this.isTestingArea(f.path, areaPath)
      );
      
      const coverage = areaSourceFiles.length > 0 
        ? (areaTestFiles.length / areaSourceFiles.length) * 100 
        : 0;
      
      const gaps = this.findTestingGaps(areaSourceFiles, areaTestFiles);
      
      this.coverageAreas.push({
        area: areaName,
        files: areaSourceFiles,
        testFiles: areaTestFiles.map(t => t.path),
        coverage: Math.round(coverage),
        gaps
      });
    });
  }

  private isTestingArea(testPath: string, areaPath: string): boolean {
    const areaName = path.basename(areaPath);
    return testPath.includes(areaName) || 
           testPath.includes(`${areaName}.test`) ||
           testPath.includes(`${areaName}Test`);
  }

  private findTestingGaps(sourceFiles: string[], testFiles: TestFile[]): string[] {
    const gaps: string[] = [];
    const testFilePaths = testFiles.map(t => t.path);
    
    sourceFiles.forEach(sourceFile => {
      const baseName = path.basename(sourceFile, path.extname(sourceFile));
      const hasTest = testFilePaths.some(testFile => 
        testFile.includes(baseName) || 
        path.basename(testFile).includes(baseName)
      );
      
      if (!hasTest) {
        gaps.push(path.relative(process.cwd(), sourceFile));
      }
    });
    
    return gaps;
  }

  public generateReport(): TestingAuditResult {
    const totalTests = this.testFiles.reduce((sum, file) => sum + file.testCount, 0);
    const frameworks = [...new Set(this.testFiles.map(f => f.framework))];
    
    const qualityCounts = {
      excellent: this.testFiles.filter(f => f.quality === 'excellent').length,
      good: this.testFiles.filter(f => f.quality === 'good').length,
      fair: this.testFiles.filter(f => f.quality === 'fair').length,
      poor: this.testFiles.filter(f => f.quality === 'poor').length
    };
    
    const overallGaps = this.identifyOverallGaps();
    const recommendations = this.generateRecommendations();
    
    return {
      totalTestFiles: this.testFiles.length,
      totalTests,
      coverageByArea: this.coverageAreas,
      testingFrameworks: frameworks,
      testQuality: qualityCounts,
      gaps: overallGaps,
      recommendations
    };
  }

  private identifyOverallGaps(): string[] {
    const gaps: string[] = [];
    
    // Check for missing test types
    const hasUnitTests = this.testFiles.some(f => f.type === 'unit');
    const hasIntegrationTests = this.testFiles.some(f => f.type === 'integration');
    const hasComponentTests = this.testFiles.some(f => f.type === 'component');
    const hasE2ETests = this.testFiles.some(f => f.type === 'e2e');
    
    if (!hasUnitTests) gaps.push('No unit tests found');
    if (!hasIntegrationTests) gaps.push('Limited integration tests');
    if (!hasComponentTests) gaps.push('Limited component tests');
    if (!hasE2ETests) gaps.push('No end-to-end tests');
    
    // Check for low coverage areas
    this.coverageAreas.forEach(area => {
      if (area.coverage < 30) {
        gaps.push(`Low test coverage in ${area.area} (${area.coverage}%)`);
      }
    });
    
    // Check for missing critical testing patterns
    const hasErrorTesting = this.testFiles.some(f => 
      fs.readFileSync(f.path, 'utf-8').includes('error')
    );
    const hasAsyncTesting = this.testFiles.some(f => 
      fs.readFileSync(f.path, 'utf-8').includes('async') || 
      fs.readFileSync(f.path, 'utf-8').includes('waitFor')
    );
    
    if (!hasErrorTesting) gaps.push('Limited error scenario testing');
    if (!hasAsyncTesting) gaps.push('Limited async operation testing');
    
    return gaps;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Coverage recommendations
    const lowCoverageAreas = this.coverageAreas.filter(area => area.coverage < 50);
    if (lowCoverageAreas.length > 0) {
      recommendations.push(`Increase test coverage in: ${lowCoverageAreas.map(a => a.area).join(', ')}`);
    }
    
    // Quality recommendations
    const poorQualityTests = this.testFiles.filter(f => f.quality === 'poor');
    if (poorQualityTests.length > 0) {
      recommendations.push('Improve test quality by adding more assertions, error cases, and setup/teardown');
    }
    
    // Framework recommendations
    const frameworks = this.testFiles.map(f => f.framework);
    if (frameworks.includes('Unknown')) {
      recommendations.push('Standardize testing frameworks across all test files');
    }
    
    // Specific testing recommendations
    recommendations.push('Add comprehensive error handling tests');
    recommendations.push('Implement integration tests for critical user flows');
    recommendations.push('Add performance and load testing');
    recommendations.push('Set up automated visual regression testing');
    recommendations.push('Implement accessibility testing');
    
    return recommendations;
  }

  public generateMarkdownReport(): string {
    const result = this.generateReport();
    
    let report = '# Testing Audit Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Executive Summary
    report += '## Executive Summary\n\n';
    report += `- **Total Test Files**: ${result.totalTestFiles}\n`;
    report += `- **Total Tests**: ${result.totalTests}\n`;
    report += `- **Testing Frameworks**: ${result.testingFrameworks.join(', ')}\n`;
    report += `- **Average Coverage**: ${Math.round(result.coverageByArea.reduce((sum, area) => sum + area.coverage, 0) / result.coverageByArea.length)}%\n\n`;
    
    // Test Quality Distribution
    report += '## Test Quality Distribution\n\n';
    report += `- **Excellent**: ${result.testQuality.excellent} files\n`;
    report += `- **Good**: ${result.testQuality.good} files\n`;
    report += `- **Fair**: ${result.testQuality.fair} files\n`;
    report += `- **Poor**: ${result.testQuality.poor} files\n\n`;
    
    // Coverage by Area
    report += '## Test Coverage by Code Area\n\n';
    result.coverageByArea.forEach(area => {
      const emoji = area.coverage >= 80 ? '✅' : area.coverage >= 50 ? '⚠️' : '❌';
      report += `### ${emoji} ${area.area.toUpperCase()} - ${area.coverage}%\n\n`;
      report += `- **Source Files**: ${area.files.length}\n`;
      report += `- **Test Files**: ${area.testFiles.length}\n`;
      
      if (area.gaps.length > 0) {
        report += `- **Missing Tests**: ${area.gaps.length} files\n`;
        report += '  - ' + area.gaps.slice(0, 5).join('\n  - ');
        if (area.gaps.length > 5) {
          report += `\n  - ... and ${area.gaps.length - 5} more`;
        }
        report += '\n';
      }
      report += '\n';
    });
    
    // Test Files Analysis
    report += '## Individual Test Files\n\n';
    const sortedTests = this.testFiles.sort((a, b) => {
      const qualityOrder = { excellent: 4, good: 3, fair: 2, poor: 1 };
      return qualityOrder[b.quality] - qualityOrder[a.quality];
    });
    
    sortedTests.forEach(test => {
      const emoji = { excellent: '🥇', good: '🥈', fair: '🥉', poor: '❌' }[test.quality];
      const relativePath = path.relative(process.cwd(), test.path);
      
      report += `### ${emoji} ${relativePath}\n\n`;
      report += `- **Type**: ${test.type}\n`;
      report += `- **Framework**: ${test.framework}\n`;
      report += `- **Tests**: ${test.testCount}\n`;
      report += `- **Mocks**: ${test.mockCount}\n`;
      report += `- **Size**: ${test.size} lines\n`;
      report += `- **Quality**: ${test.quality}\n\n`;
    });
    
    // Critical Gaps
    report += '## Critical Testing Gaps\n\n';
    result.gaps.forEach(gap => {
      report += `- ❌ ${gap}\n`;
    });
    report += '\n';
    
    // Recommendations
    report += '## Recommendations\n\n';
    report += '### Immediate Actions (Next Sprint)\n';
    result.recommendations.slice(0, 3).forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    
    report += '\n### Medium-term Goals (Next Month)\n';
    result.recommendations.slice(3).forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    
    // Testing Strategy
    report += '\n## Recommended Testing Strategy\n\n';
    report += '### 1. Unit Testing (70% of tests)\n';
    report += '- Test individual functions and methods\n';
    report += '- Focus on business logic and edge cases\n';
    report += '- Fast execution, high coverage\n\n';
    
    report += '### 2. Integration Testing (20% of tests)\n';
    report += '- Test service interactions\n';
    report += '- Database operations\n';
    report += '- API endpoints\n\n';
    
    report += '### 3. Component Testing (8% of tests)\n';
    report += '- React Native screen components\n';
    report += '- User interaction flows\n';
    report += '- UI state management\n\n';
    
    report += '### 4. End-to-End Testing (2% of tests)\n';
    report += '- Critical user journeys\n';
    report += '- Cross-platform compatibility\n';
    report += '- Performance benchmarks\n\n';
    
    return report;
  }
}

// Run the testing audit
async function main() {
  console.log('🧪 Starting testing audit...\n');
  
  const auditor = new TestingAuditor();
  await auditor.auditDirectory(process.cwd());
  
  const result = auditor.generateReport();
  const markdownReport = auditor.generateMarkdownReport();
  
  // Save report
  const reportPath = path.join(process.cwd(), 'scripts/testing-audit-report.md');
  fs.writeFileSync(reportPath, markdownReport);
  
  // Output summary
  console.log('📊 Testing Audit Summary:');
  console.log(`- Test Files: ${result.totalTestFiles}`);
  console.log(`- Total Tests: ${result.totalTests}`);
  console.log(`- Frameworks: ${result.testingFrameworks.join(', ')}`);
  console.log(`- Quality: ${result.testQuality.excellent} excellent, ${result.testQuality.good} good, ${result.testQuality.fair} fair, ${result.testQuality.poor} poor`);
  
  console.log('\n📈 Coverage by Area:');
  result.coverageByArea.forEach(area => {
    const status = area.coverage >= 80 ? '✅' : area.coverage >= 50 ? '⚠️' : '❌';
    console.log(`${status} ${area.area}: ${area.coverage}% (${area.testFiles.length}/${area.files.length} files)`);
  });
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  if (result.gaps.length > 0) {
    console.log(`\n⚠️ Found ${result.gaps.length} critical testing gaps`);
  } else {
    console.log('\n✅ No critical testing gaps found');
  }
}

main().catch(console.error);