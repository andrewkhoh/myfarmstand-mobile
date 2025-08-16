import * as fs from 'fs';
import * as path from 'path';

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: string;
  file: string;
  line: number;
  message: string;
  code?: string;
  recommendation: string;
}

interface SecurityAuditResult {
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  issues: SecurityIssue[];
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];

  // Security patterns to detect
  private securityPatterns = {
    // Authentication & Authorization
    unsecuredAuth: {
      pattern: /(?:password|token|secret)\s*=\s*['"][^'"]*['"]/gi,
      type: 'hardcoded_credentials',
      severity: 'critical' as const,
      message: 'Hardcoded credentials detected'
    },
    
    weakAuth: {
      pattern: /\.auth\s*\(\s*\)\s*\.\s*(?:login|signIn)\s*\([^)]*\)/gi,
      type: 'weak_auth',
      severity: 'medium' as const,
      message: 'Potentially weak authentication pattern'
    },

    noAuthValidation: {
      pattern: /if\s*\(\s*!?user(?:\.id)?\s*\)\s*{[^}]*return/gi,
      type: 'auth_validation',
      severity: 'info' as const,
      message: 'Basic auth validation found'
    },

    // Data exposure
    consoleLog: {
      pattern: /console\.log\([^)]*(?:password|token|secret|key|auth)[^)]*\)/gi,
      type: 'data_exposure',
      severity: 'high' as const,
      message: 'Sensitive data logged to console'
    },

    alertExposure: {
      pattern: /alert\([^)]*(?:password|token|secret|key|error)[^)]*\)/gi,
      type: 'data_exposure',
      severity: 'medium' as const,
      message: 'Sensitive data exposed in alert'
    },

    // SQL Injection
    sqlInjection: {
      pattern: /\$\{[^}]*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
      type: 'sql_injection',
      severity: 'critical' as const,
      message: 'Potential SQL injection vulnerability'
    },

    rawQuery: {
      pattern: /\.query\s*\(\s*`[^`]*\$\{[^}]*\}/gi,
      type: 'sql_injection',
      severity: 'high' as const,
      message: 'Dynamic SQL query construction'
    },

    // XSS vulnerabilities
    dangerousHtml: {
      pattern: /dangerouslySetInnerHTML|innerHTML\s*=/gi,
      type: 'xss',
      severity: 'high' as const,
      message: 'Potential XSS vulnerability'
    },

    // Insecure storage
    asyncStorageSecrets: {
      pattern: /AsyncStorage\.setItem\([^)]*(?:password|token|secret|key)[^)]*\)/gi,
      type: 'insecure_storage',
      severity: 'high' as const,
      message: 'Sensitive data stored in AsyncStorage without encryption'
    },

    // Network security
    httpUrls: {
      pattern: /['"]http:\/\/[^'"]*['"]/gi,
      type: 'insecure_transport',
      severity: 'medium' as const,
      message: 'HTTP URL detected - should use HTTPS'
    },

    noSslPinning: {
      pattern: /fetch\s*\(|axios\.|\.post\(|\.get\(/gi,
      type: 'network_security',
      severity: 'info' as const,
      message: 'Network request without SSL pinning verification'
    },

    // Input validation
    noInputValidation: {
      pattern: /const\s+\w+\s*=\s*(?:req\.body|params|query)\./gi,
      type: 'input_validation',
      severity: 'medium' as const,
      message: 'Direct use of user input without validation'
    },

    // File system access
    pathTraversal: {
      pattern: /\.\.\/|\.\.\\|\.\.\//gi,
      type: 'path_traversal',
      severity: 'high' as const,
      message: 'Potential path traversal vulnerability'
    },

    // React Native specific
    allowsArbitraryLoads: {
      pattern: /NSAllowsArbitraryLoads.*true/gi,
      type: 'react_native_security',
      severity: 'high' as const,
      message: 'App Transport Security disabled'
    },

    debuggingEnabled: {
      pattern: /__DEV__|\.isDebuggingEnabled|\.enableDebugMode/gi,
      type: 'debug_exposure',
      severity: 'medium' as const,
      message: 'Debug mode potentially enabled in production'
    },

    // Crypto issues
    weakCrypto: {
      pattern: /MD5|SHA1(?!.*SHA1(?:2|5|6))|DES(?!.*AES)/gi,
      type: 'weak_crypto',
      severity: 'medium' as const,
      message: 'Weak cryptographic algorithm detected'
    },

    // Permission issues
    dangerousPermissions: {
      pattern: /CAMERA|RECORD_AUDIO|ACCESS_FINE_LOCATION|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE/gi,
      type: 'permissions',
      severity: 'info' as const,
      message: 'Sensitive permission requested'
    }
  };

  // File-specific security checks
  private fileSpecificChecks = {
    '.env': this.checkEnvFile.bind(this),
    'package.json': this.checkPackageJson.bind(this),
    'app.json': this.checkAppConfig.bind(this),
    'expo.json': this.checkExpoConfig.bind(this),
    '.js': this.checkJavaScriptFile.bind(this),
    '.ts': this.checkTypeScriptFile.bind(this),
    '.tsx': this.checkReactFile.bind(this)
  };

  public auditFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);

    // Run pattern-based checks
    Object.entries(this.securityPatterns).forEach(([key, pattern]) => {
      const matches = Array.from(content.matchAll(pattern.pattern));
      matches.forEach(match => {
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        
        this.issues.push({
          severity: pattern.severity,
          type: pattern.type,
          file: filePath,
          line: lineNumber,
          message: pattern.message,
          code: match[0],
          recommendation: this.getRecommendation(pattern.type)
        });
      });
    });

    // Run file-specific checks
    if (this.fileSpecificChecks[fileName]) {
      this.fileSpecificChecks[fileName](filePath, content, lines);
    } else if (this.fileSpecificChecks[ext]) {
      this.fileSpecificChecks[ext](filePath, content, lines);
    }
  }

  private checkEnvFile(filePath: string, content: string, lines: string[]): void {
    lines.forEach((line, index) => {
      // Check for weak secrets
      if (line.includes('=') && (line.includes('test') || line.includes('dev') || line.includes('demo'))) {
        this.issues.push({
          severity: 'medium',
          type: 'weak_secrets',
          file: filePath,
          line: index + 1,
          message: 'Potentially weak secret in environment file',
          code: line,
          recommendation: 'Use strong, randomly generated secrets for all environments'
        });
      }

      // Check for production secrets in wrong files
      if (filePath.includes('.env.local') || filePath.includes('.env.development')) {
        if (line.includes('PROD') || line.includes('PRODUCTION')) {
          this.issues.push({
            severity: 'high',
            type: 'secret_misplacement',
            file: filePath,
            line: index + 1,
            message: 'Production secret in development environment file',
            code: line,
            recommendation: 'Move production secrets to secure environment-specific files'
          });
        }
      }
    });
  }

  private checkPackageJson(filePath: string, content: string, lines: string[]): void {
    try {
      const packageJson = JSON.parse(content);
      
      // Check for known vulnerable dependencies
      const vulnerableDeps = [
        'lodash@4.17.15', 'moment@2.29.1', 'axios@0.21.0', 'yargs-parser@13.1.1'
      ];

      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      Object.entries(allDeps).forEach(([name, version]) => {
        const depString = `${name}@${version}`;
        if (vulnerableDeps.some(vuln => depString.includes(vuln))) {
          this.issues.push({
            severity: 'high',
            type: 'vulnerable_dependency',
            file: filePath,
            line: 1,
            message: `Known vulnerable dependency: ${depString}`,
            recommendation: 'Update to latest secure version'
          });
        }
      });

      // Check for unnecessary dependencies
      const riskyDeps = ['eval', 'vm2', 'serialize-javascript'];
      Object.keys(allDeps).forEach(dep => {
        if (riskyDeps.includes(dep)) {
          this.issues.push({
            severity: 'medium',
            type: 'risky_dependency',
            file: filePath,
            line: 1,
            message: `Potentially risky dependency: ${dep}`,
            recommendation: 'Review if this dependency is necessary and secure'
          });
        }
      });

    } catch (error) {
      this.issues.push({
        severity: 'low',
        type: 'parse_error',
        file: filePath,
        line: 1,
        message: 'Could not parse package.json',
        recommendation: 'Fix JSON syntax errors'
      });
    }
  }

  private checkAppConfig(filePath: string, content: string, lines: string[]): void {
    try {
      const config = JSON.parse(content);
      
      // Check for debug settings in production
      if (config.expo?.packagerOpts?.dev !== false) {
        this.issues.push({
          severity: 'medium',
          type: 'debug_config',
          file: filePath,
          line: 1,
          message: 'Debug mode not explicitly disabled',
          recommendation: 'Set packagerOpts.dev to false for production builds'
        });
      }

      // Check for insecure permissions
      const permissions = config.expo?.permissions || [];
      const sensitivePermissions = ['CAMERA', 'RECORD_AUDIO', 'ACCESS_FINE_LOCATION'];
      
      permissions.forEach((permission: string) => {
        if (sensitivePermissions.includes(permission)) {
          this.issues.push({
            severity: 'info',
            type: 'sensitive_permission',
            file: filePath,
            line: 1,
            message: `Sensitive permission requested: ${permission}`,
            recommendation: 'Ensure this permission is necessary and properly justified to users'
          });
        }
      });

    } catch (error) {
      // Invalid JSON
    }
  }

  private checkExpoConfig(filePath: string, content: string, lines: string[]): void {
    this.checkAppConfig(filePath, content, lines);
  }

  private checkJavaScriptFile(filePath: string, content: string, lines: string[]): void {
    this.checkCommonCodePatterns(filePath, content, lines);
  }

  private checkTypeScriptFile(filePath: string, content: string, lines: string[]): void {
    this.checkCommonCodePatterns(filePath, content, lines);
    
    // TypeScript specific checks
    if (content.includes('any')) {
      const anyMatches = Array.from(content.matchAll(/:\s*any\b/gi));
      anyMatches.forEach(match => {
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        
        this.issues.push({
          severity: 'low',
          type: 'type_safety',
          file: filePath,
          line: lineNumber,
          message: 'Use of "any" type reduces type safety',
          code: match[0],
          recommendation: 'Use specific types instead of "any"'
        });
      });
    }
  }

  private checkReactFile(filePath: string, content: string, lines: string[]): void {
    this.checkTypeScriptFile(filePath, content, lines);
    
    // React specific security checks
    if (content.includes('useEffect') && !content.includes('dependencies')) {
      this.issues.push({
        severity: 'low',
        type: 'react_security',
        file: filePath,
        line: 1,
        message: 'useEffect without dependencies array can cause security issues',
        recommendation: 'Always specify dependencies array for useEffect'
      });
    }
  }

  private checkCommonCodePatterns(filePath: string, content: string, lines: string[]): void {
    // Check for hardcoded URLs and endpoints
    const urlMatches = Array.from(content.matchAll(/['"`]https?:\/\/[^'"`\s]+['"`]/gi));
    urlMatches.forEach(match => {
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      
      this.issues.push({
        severity: 'info',
        type: 'hardcoded_url',
        file: filePath,
        line: lineNumber,
        message: 'Hardcoded URL detected',
        code: match[0],
        recommendation: 'Move URLs to environment variables or configuration files'
      });
    });

    // Check for TODO/FIXME comments that might indicate security issues
    const todoMatches = Array.from(content.matchAll(/\/\/\s*(?:TODO|FIXME|HACK).*(?:security|auth|password|token)/gi));
    todoMatches.forEach(match => {
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      
      this.issues.push({
        severity: 'medium',
        type: 'security_todo',
        file: filePath,
        line: lineNumber,
        message: 'Security-related TODO/FIXME comment',
        code: match[0],
        recommendation: 'Address security-related TODOs before production deployment'
      });
    });
  }

  private getRecommendation(type: string): string {
    const recommendations: Record<string, string> = {
      hardcoded_credentials: 'Move credentials to environment variables or secure key management',
      weak_auth: 'Implement proper authentication with strong validation and session management',
      data_exposure: 'Remove sensitive data from logs and use secure logging practices',
      sql_injection: 'Use parameterized queries or ORM methods to prevent SQL injection',
      xss: 'Sanitize user input and use safe rendering methods',
      insecure_storage: 'Use secure storage solutions like Keychain (iOS) or Keystore (Android)',
      insecure_transport: 'Use HTTPS for all network communications',
      network_security: 'Implement certificate pinning and request/response validation',
      input_validation: 'Validate and sanitize all user inputs before processing',
      path_traversal: 'Use safe path manipulation functions and validate file paths',
      react_native_security: 'Follow React Native security best practices',
      debug_exposure: 'Ensure debug features are disabled in production builds',
      weak_crypto: 'Use strong cryptographic algorithms (AES-256, SHA-256+)',
      permissions: 'Request only necessary permissions and explain their purpose to users'
    };

    return recommendations[type] || 'Review and address this security concern';
  }

  public auditDirectory(dirPath: string): void {
    this.auditDirectoryRecursive(dirPath);
  }

  private auditDirectoryRecursive(dirPath: string): void {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .git, and other unnecessary directories
        if (!['node_modules', '.git', '.expo', 'build', 'dist', 'coverage'].includes(item)) {
          this.auditDirectoryRecursive(fullPath);
        }
      } else if (stat.isFile()) {
        // Only audit relevant file types
        const ext = path.extname(fullPath);
        const fileName = path.basename(fullPath);
        
        if (['.js', '.ts', '.tsx', '.json', '.env'].includes(ext) || 
            fileName.startsWith('.env') || 
            ['package.json', 'app.json', 'expo.json'].includes(fileName)) {
          this.auditFile(fullPath);
        }
      }
    }
  }

  public generateReport(): SecurityAuditResult {
    const criticalCount = this.issues.filter(i => i.severity === 'critical').length;
    const highCount = this.issues.filter(i => i.severity === 'high').length;
    const mediumCount = this.issues.filter(i => i.severity === 'medium').length;
    const lowCount = this.issues.filter(i => i.severity === 'low').length;
    const infoCount = this.issues.filter(i => i.severity === 'info').length;

    return {
      totalIssues: this.issues.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      issues: this.issues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
    };
  }

  public generateMarkdownReport(): string {
    const result = this.generateReport();
    
    let report = '# Security Audit Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Summary
    report += '## Executive Summary\n\n';
    report += `- **Total Issues**: ${result.totalIssues}\n`;
    report += `- **Critical**: ${result.criticalCount} 🔴\n`;
    report += `- **High**: ${result.highCount} ⚠️\n`;
    report += `- **Medium**: ${result.mediumCount} 🟡\n`;
    report += `- **Low**: ${result.lowCount} 🔵\n`;
    report += `- **Info**: ${result.infoCount} ℹ️\n\n`;

    // Risk assessment
    if (result.criticalCount > 0) {
      report += '🚨 **CRITICAL RISK**: Immediate action required\n\n';
    } else if (result.highCount > 0) {
      report += '⚠️ **HIGH RISK**: Address before production deployment\n\n';
    } else if (result.mediumCount > 0) {
      report += '🟡 **MEDIUM RISK**: Address in next development cycle\n\n';
    } else {
      report += '✅ **LOW RISK**: No critical security issues found\n\n';
    }

    // Issues by severity
    ['critical', 'high', 'medium', 'low', 'info'].forEach(severity => {
      const severityIssues = result.issues.filter(i => i.severity === severity);
      if (severityIssues.length === 0) return;

      const emoji = { critical: '🔴', high: '⚠️', medium: '🟡', low: '🔵', info: 'ℹ️' }[severity];
      report += `## ${emoji} ${severity.toUpperCase()} Issues (${severityIssues.length})\n\n`;

      severityIssues.forEach((issue, index) => {
        const relativePath = issue.file.replace(process.cwd() + '/', '');
        report += `### ${index + 1}. ${issue.message}\n\n`;
        report += `- **File**: \`${relativePath}:${issue.line}\`\n`;
        report += `- **Type**: ${issue.type}\n`;
        if (issue.code) {
          report += `- **Code**: \`${issue.code.trim()}\`\n`;
        }
        report += `- **Recommendation**: ${issue.recommendation}\n\n`;
      });
    });

    // Security recommendations
    report += '## Security Recommendations\n\n';
    report += '### Immediate Actions\n';
    if (result.criticalCount > 0) {
      report += '1. Address all critical security issues immediately\n';
      report += '2. Conduct security code review\n';
      report += '3. Implement security testing in CI/CD pipeline\n';
    }
    if (result.highCount > 0) {
      report += '1. Fix high-severity vulnerabilities before production\n';
      report += '2. Review authentication and authorization patterns\n';
      report += '3. Implement input validation and sanitization\n';
    }

    report += '\n### General Security Improvements\n';
    report += '1. Implement proper secret management (use environment variables)\n';
    report += '2. Add comprehensive input validation\n';
    report += '3. Use HTTPS for all network communications\n';
    report += '4. Implement proper error handling without information disclosure\n';
    report += '5. Regular dependency updates and vulnerability scanning\n';
    report += '6. Security testing and penetration testing\n\n';

    return report;
  }
}

// Run the security audit
async function main() {
  console.log('🔍 Starting security audit...\n');
  
  const auditor = new SecurityAuditor();
  
  // Audit the entire codebase
  auditor.auditDirectory(process.cwd());
  
  // Generate reports
  const result = auditor.generateReport();
  const markdownReport = auditor.generateMarkdownReport();
  
  // Save report
  const reportPath = path.join(process.cwd(), 'scripts/security-audit-report.md');
  fs.writeFileSync(reportPath, markdownReport);
  
  // Output summary
  console.log('🛡️ Security Audit Complete\n');
  console.log(`📊 Summary:`);
  console.log(`- Total Issues: ${result.totalIssues}`);
  console.log(`- Critical: ${result.criticalCount} 🔴`);
  console.log(`- High: ${result.highCount} ⚠️`);
  console.log(`- Medium: ${result.mediumCount} 🟡`);
  console.log(`- Low: ${result.lowCount} 🔵`);
  console.log(`- Info: ${result.infoCount} ℹ️`);
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  if (result.criticalCount > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND - Immediate action required!');
  } else if (result.highCount > 0) {
    console.log('\n⚠️ HIGH-RISK ISSUES FOUND - Address before production!');
  } else {
    console.log('\n✅ No critical security issues detected');
  }
}

main().catch(console.error);