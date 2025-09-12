import * as fs from 'fs';
import * as path from 'path';

interface ReactQueryPattern {
  name: string;
  present: boolean;
  details: string[];
  lineNumbers: number[];
}

interface HookAuditResult {
  file: string;
  hookNames: string[];
  patterns: ReactQueryPattern[];
  score: number;
  recommendations: string[];
  missingFromStandard: string[];
}

// Standard patterns from useCart.ts
const STANDARD_PATTERNS = {
  // Query patterns
  queryKeyFactoryUsage: {
    name: 'Query Key Factory Usage',
    regex: /(?:cartKeys|queryKeys|[a-zA-Z]+Keys)\./g,
    description: 'Uses centralized query key factory'
  },
  staleTimeConfig: {
    name: 'Stale Time Configuration',
    regex: /staleTime:\s*\d+\s*\*\s*\d+\s*\*\s*1000/g,
    description: 'Configures staleTime with readable time calculation'
  },
  gcTimeConfig: {
    name: 'GC Time Configuration', 
    regex: /gcTime:\s*\d+\s*\*\s*\d+\s*\*\s*1000/g,
    description: 'Configures gcTime with readable time calculation'
  },
  refetchConfig: {
    name: 'Refetch Configuration',
    regex: /refetchOn(?:Mount|WindowFocus):\s*(?:true|false)/g,
    description: 'Explicitly configures refetch behavior'
  },
  enabledGuard: {
    name: 'Enabled Guard',
    regex: /enabled:\s*!!?[^,\n}]+/g,
    description: 'Uses enabled prop to guard queries'
  },
  
  // Mutation patterns
  onMutateOptimistic: {
    name: 'Optimistic Updates (onMutate)',
    regex: /onMutate:\s*async\s*\([^)]*\)\s*=>\s*\{/g,
    description: 'Implements optimistic updates in onMutate'
  },
  cancelQueries: {
    name: 'Query Cancellation',
    regex: /queryClient\.cancelQueries/g,
    description: 'Cancels outgoing queries to prevent race conditions'
  },
  previousDataSnapshot: {
    name: 'Previous Data Snapshot',
    regex: /(?:previous|old)[A-Z]\w*\s*=\s*queryClient\.getQueryData/g,
    description: 'Snapshots previous data for rollback'
  },
  optimisticCacheUpdate: {
    name: 'Optimistic Cache Update',
    regex: /queryClient\.setQueryData/g,
    description: 'Updates query cache optimistically'
  },
  rollbackOnError: {
    name: 'Rollback on Error',
    regex: /onError:.*context.*queryClient\.setQueryData/s,
    description: 'Rolls back optimistic updates on error'
  },
  broadcastSupport: {
    name: 'Broadcast Support',
    regex: /(?:cartBroadcast|orderBroadcast|productBroadcast|\w+Broadcast)\.send/g,
    description: 'Supports real-time broadcasting'
  },
  invalidateOnSuccess: {
    name: 'Invalidate on Success',
    regex: /onSuccess:.*queryClient\.invalidateQueries/s,
    description: 'Invalidates queries on successful mutation'
  },
  
  // Auth patterns
  authGuard: {
    name: 'Authentication Guard',
    regex: /if\s*\(\s*!user/g,
    description: 'Guards operations with authentication check'
  },
  userContextUsage: {
    name: 'User Context Usage',
    regex: /useCurrentUser\(\)/g,
    description: 'Uses centralized user context'
  },
  
  // State management patterns
  isPendingState: {
    name: 'isPending State',
    regex: /isPending/g,
    description: 'Exposes loading state as isPending'
  },
  mutateAndMutateAsync: {
    name: 'Mutate & MutateAsync',
    regex: /(?:mutate:|mutateAsync:)/g,
    description: 'Exposes both sync and async mutation methods'
  },
  errorHandling: {
    name: 'Error Handling',
    regex: /error:/g,
    description: 'Exposes error state'
  },
  
  // Callback stability
  useCallbackUsage: {
    name: 'useCallback Usage',
    regex: /useCallback/g,
    description: 'Uses useCallback for stable references'
  },
  
  // Type safety
  typedQueryFn: {
    name: 'Typed Query Function',
    regex: /queryFn:\s*\([^)]*\):\s*Promise<[^>]+>/g,
    description: 'Uses typed query functions'
  },
  typedMutationFn: {
    name: 'Typed Mutation Function',
    regex: /mutationFn:\s*\([^)]*\):\s*Promise<[^>]+>/g,
    description: 'Uses typed mutation functions'
  }
};

class ReactQueryHookAuditor {
  private results: HookAuditResult[] = [];

  public auditFile(filePath: string): HookAuditResult {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const hookNames = this.extractHookNames(content);
    const patterns: ReactQueryPattern[] = [];
    
    // Check each standard pattern
    Object.entries(STANDARD_PATTERNS).forEach(([key, pattern]) => {
      const matches = Array.from(content.matchAll(new RegExp(pattern.regex.source, 'g')));
      const lineNumbers: number[] = [];
      
      matches.forEach(match => {
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        lineNumbers.push(lineNumber);
      });
      
      patterns.push({
        name: pattern.name,
        present: matches.length > 0,
        details: matches.map(m => m[0]),
        lineNumbers
      });
    });

    // Calculate score
    const presentPatterns = patterns.filter(p => p.present).length;
    const totalPatterns = patterns.length;
    const score = Math.round((presentPatterns / totalPatterns) * 100);

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns, content, hookNames);
    const missingFromStandard = this.findMissingPatterns(patterns);

    const result: HookAuditResult = {
      file: filePath,
      hookNames,
      patterns,
      score,
      recommendations,
      missingFromStandard
    };

    return result;
  }

  private extractHookNames(content: string): string[] {
    const hookRegex = /export\s+const\s+(use[A-Z]\w*)/g;
    const matches = Array.from(content.matchAll(hookRegex));
    return matches.map(match => match[1]);
  }

  private generateRecommendations(patterns: ReactQueryPattern[], content: string, hookNames: string[]): string[] {
    const recommendations: string[] = [];
    
    // Check for missing critical patterns
    const criticalPatterns = [
      'Query Key Factory Usage',
      'Authentication Guard', 
      'Optimistic Updates (onMutate)',
      'Rollback on Error',
      'Invalidate on Success'
    ];

    criticalPatterns.forEach(patternName => {
      const pattern = patterns.find(p => p.name === patternName);
      if (!pattern?.present) {
        recommendations.push(`Add ${patternName} pattern following useCart.ts standard`);
      }
    });

    // Check for React Query imports
    if (!content.includes('@tanstack/react-query')) {
      recommendations.push('Import React Query hooks from @tanstack/react-query');
    }

    // Check for useQueryClient usage in mutations
    if (content.includes('useMutation') && !content.includes('useQueryClient')) {
      recommendations.push('Add useQueryClient for cache management in mutations');
    }

    // Check for time configurations
    if (content.includes('useQuery') && !patterns.find(p => p.name === 'Stale Time Configuration')?.present) {
      recommendations.push('Add staleTime configuration with readable time calculation (e.g., 2 * 60 * 1000)');
    }

    // Check for broadcast support in mutations
    if (content.includes('useMutation') && !patterns.find(p => p.name === 'Broadcast Support')?.present) {
      recommendations.push('Add broadcast support for real-time synchronization');
    }

    // Check for proper error handling
    if (content.includes('useMutation') && !content.includes('onError')) {
      recommendations.push('Add onError handler for mutation error handling');
    }

    return recommendations;
  }

  private findMissingPatterns(patterns: ReactQueryPattern[]): string[] {
    return patterns
      .filter(p => !p.present)
      .map(p => p.name);
  }

  public auditDirectory(dirPath: string): void {
    const files = this.getHookFiles(dirPath);
    
    for (const file of files) {
      const result = this.auditFile(file);
      this.results.push(result);
    }
  }

  private getHookFiles(dirPath: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile() && item.endsWith('.ts') && item.startsWith('use')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  public generateReport(): string {
    let report = '# React Query Hooks Audit Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Standard: useCart.ts patterns\n\n`;
    
    // Summary
    const avgScore = Math.round(this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length);
    const totalHooks = this.results.reduce((sum, r) => sum + r.hookNames.length, 0);
    
    report += `## Executive Summary\n`;
    report += `- Hooks audited: ${this.results.length} files\n`;
    report += `- Total hooks: ${totalHooks}\n`;
    report += `- Average conformance: ${avgScore}%\n`;
    report += `- Standard: useCart.ts (100% baseline)\n\n`;
    
    // Sort results by score (lowest first - most issues)
    const sortedResults = [...this.results].sort((a, b) => a.score - b.score);
    
    report += `## Hooks by Conformance Score\n\n`;
    
    for (const result of sortedResults) {
      const relativePath = result.file.replace(process.cwd() + '/', '');
      const emoji = result.score >= 80 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
      
      report += `### ${emoji} ${relativePath} (${result.score}%)\n\n`;
      report += `**Hooks:** ${result.hookNames.join(', ')}\n\n`;
      
      // Missing patterns
      if (result.missingFromStandard.length > 0) {
        report += `**Missing Patterns:**\n`;
        result.missingFromStandard.forEach(pattern => {
          report += `- ${pattern}\n`;
        });
        report += '\n';
      }
      
      // Present patterns with details
      const presentPatterns = result.patterns.filter(p => p.present);
      if (presentPatterns.length > 0) {
        report += `**Present Patterns:**\n`;
        presentPatterns.forEach(pattern => {
          report += `- ✅ ${pattern.name} (lines: ${pattern.lineNumbers.join(', ')})\n`;
        });
        report += '\n';
      }
      
      // Recommendations
      if (result.recommendations.length > 0) {
        report += `**Recommendations:**\n`;
        result.recommendations.forEach(rec => {
          report += `- ${rec}\n`;
        });
        report += '\n';
      }
      
      report += '---\n\n';
    }
    
    // Pattern adoption summary
    report += `## Pattern Adoption Summary\n\n`;
    
    const patternAdoption = new Map<string, number>();
    Object.keys(STANDARD_PATTERNS).forEach(key => {
      const patternName = STANDARD_PATTERNS[key as keyof typeof STANDARD_PATTERNS].name;
      const adoptionCount = this.results.filter(r => 
        r.patterns.find(p => p.name === patternName)?.present
      ).length;
      patternAdoption.set(patternName, adoptionCount);
    });
    
    // Sort by adoption rate
    const sortedPatterns = Array.from(patternAdoption.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedPatterns.forEach(([pattern, count]) => {
      const percentage = Math.round((count / this.results.length) * 100);
      const emoji = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
      report += `- ${emoji} **${pattern}**: ${count}/${this.results.length} files (${percentage}%)\n`;
    });
    
    report += '\n## Key Recommendations\n\n';
    
    // Find most common missing patterns
    const missingPatternCounts = new Map<string, number>();
    this.results.forEach(result => {
      result.missingFromStandard.forEach(pattern => {
        missingPatternCounts.set(pattern, (missingPatternCounts.get(pattern) || 0) + 1);
      });
    });
    
    const topMissing = Array.from(missingPatternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    report += `### Most Commonly Missing Patterns\n\n`;
    topMissing.forEach(([pattern, count], index) => {
      report += `${index + 1}. **${pattern}** - Missing in ${count}/${this.results.length} files\n`;
    });
    
    return report;
  }

  public getResults(): HookAuditResult[] {
    return this.results;
  }
}

// Run the audit
async function main() {
  console.log('Starting React Query hooks audit...\n');
  
  const auditor = new ReactQueryHookAuditor();
  
  // Audit all hooks in hooks directory
  const hooksDir = path.join(process.cwd(), 'src/hooks');
  auditor.auditDirectory(hooksDir);
  
  // Generate and save report
  const report = auditor.generateReport();
  
  const reportPath = path.join(process.cwd(), 'scripts/react-query-hooks-audit-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(report);
  console.log(`\nAudit report saved to: ${reportPath}`);
  
  // Show summary
  const results = auditor.getResults();
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  
  console.log(`\n📊 Summary:`);
  console.log(`- Files audited: ${results.length}`);
  console.log(`- Average score: ${avgScore}%`);
  console.log(`- Standard: useCart.ts (${results.find(r => r.file.includes('useCart.ts'))?.score || 'N/A'}%)`);
}

main().catch(console.error);