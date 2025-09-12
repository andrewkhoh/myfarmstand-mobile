#!/usr/bin/env node
// JSON Status Aggregator for Multi-Agent System

const fs = require('fs');
const path = require('path');

class StatusAggregator {
  constructor(communicationDir) {
    this.communicationDir = communicationDir;
    this.statusDir = path.join(communicationDir, 'status');
    this.progressDir = path.join(communicationDir, 'progress');
    this.logsDir = path.join(communicationDir, 'logs');
    this.outputFile = path.join(communicationDir, 'aggregate-status.json');
  }

  async aggregateStatus() {
    const agents = {};
    
    // Define expected agents
    const expectedAgents = [
      'role-services',
      'role-hooks', 
      'role-navigation',
      'role-screens',
      'permission-ui',
      'integration'
    ];
    
    for (const agentName of expectedAgents) {
      const statusPath = path.join(this.statusDir, `${agentName}.json`);
      const progressPath = path.join(this.progressDir, `${agentName}.md`);
      const logPath = path.join(this.logsDir, `${agentName}.log`);
      
      try {
        // Read status file if exists
        let statusData = {};
        if (fs.existsSync(statusPath)) {
          statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
        }
        
        // Calculate test metrics
        const testMetrics = this.calculateTestMetrics(statusData);
        
        // Check pattern compliance
        const patternCompliance = await this.checkPatternCompliance(logPath);
        
        // Calculate progress
        const progress = this.calculateProgress(statusData, progressPath);
        
        // Calculate health
        const health = this.calculateHealth(statusData);
        
        agents[agentName] = {
          status: statusData.status || 'not-started',
          lastUpdate: statusData.lastUpdate || null,
          heartbeat: statusData.heartbeat || null,
          startTime: statusData.startTime || null,
          
          // Files and modifications
          filesModified: (statusData.filesModified || []).length,
          filesModifiedList: statusData.filesModified || [],
          
          // Test metrics
          testsPass: testMetrics.passed,
          testSummary: statusData.testSummary || 'No tests run',
          testPassRate: testMetrics.passRate,
          
          // Errors and issues
          errors: (statusData.errors || []).length,
          errorList: (statusData.errors || []).slice(-5), // Last 5 errors
          
          // Pattern compliance
          patternCompliance: patternCompliance,
          usesSimplifiedMock: patternCompliance.usesSimplifiedMock,
          hasViolations: patternCompliance.hasViolations,
          
          // Progress and health
          progress: progress,
          health: health,
          
          // Activity tracking
          lastTool: statusData.lastTool || null,
          isActive: this.isAgentActive(statusData),
          
          // Type classification
          agentType: this.classifyAgentType(agentName)
        };
        
      } catch (error) {
        agents[agentName] = { 
          status: 'error', 
          error: error.message,
          health: 'unknown',
          progress: 0
        };
      }
    }
    
    // Calculate aggregate metrics
    const aggregate = {
      timestamp: new Date().toISOString(),
      overallHealth: this.calculateOverallHealth(agents),
      overallProgress: this.calculateOverallProgress(agents),
      agents,
      
      // Summary statistics
      summary: {
        total: Object.keys(agents).length,
        running: Object.values(agents).filter(a => a.status === 'running' || a.status === 'active').length,
        completed: Object.values(agents).filter(a => a.status === 'completed').length,
        failed: Object.values(agents).filter(a => a.status === 'failed').length,
        notStarted: Object.values(agents).filter(a => a.status === 'not-started').length,
        
        // Test metrics
        totalTestsPassed: Object.values(agents).reduce((sum, a) => sum + (a.testsPass || 0), 0),
        averageTestPassRate: this.calculateAverageTestPassRate(agents),
        
        // Error metrics
        totalErrors: Object.values(agents).reduce((sum, a) => sum + (a.errors || 0), 0),
        agentsWithErrors: Object.values(agents).filter(a => a.errors > 0).length,
        
        // Pattern compliance
        compliantAgents: Object.values(agents).filter(a => a.usesSimplifiedMock).length,
        violationAgents: Object.values(agents).filter(a => a.hasViolations).length,
        
        // Activity metrics
        activeAgents: Object.values(agents).filter(a => a.isActive).length,
        staleAgents: Object.values(agents).filter(a => a.health === 'stale').length
      },
      
      // Phase tracking
      phases: {
        foundation: this.getPhaseStatus(agents, ['role-services', 'role-hooks', 'role-navigation']),
        extension: this.getPhaseStatus(agents, ['role-screens', 'permission-ui']),
        integration: this.getPhaseStatus(agents, ['integration'])
      },
      
      // Alerts and recommendations
      alerts: this.generateAlerts(agents),
      recommendations: this.generateRecommendations(agents)
    };
    
    // Write aggregate status
    fs.writeFileSync(this.outputFile, JSON.stringify(aggregate, null, 2));
    
    return aggregate;
  }
  
  calculateTestMetrics(data) {
    const passed = data.testsPass || 0;
    const summary = data.testSummary || '';
    
    // Try to extract total from summary (e.g., "15/20 tests passing")
    const match = summary.match(/(\d+)\/(\d+)/);
    if (match) {
      const total = parseInt(match[2]);
      return {
        passed: parseInt(match[1]),
        total: total,
        passRate: total > 0 ? Math.round((parseInt(match[1]) / total) * 100) : 0
      };
    }
    
    return {
      passed: passed,
      total: passed, // Assume all tests pass if no failures reported
      passRate: passed > 0 ? 100 : 0
    };
  }
  
  async checkPatternCompliance(logPath) {
    if (!fs.existsSync(logPath)) {
      return {
        usesSimplifiedMock: false,
        hasViolations: false,
        violations: []
      };
    }
    
    const logContent = fs.readFileSync(logPath, 'utf-8');
    const violations = [];
    
    // Check for SimplifiedSupabaseMock usage
    const usesSimplifiedMock = logContent.includes('SimplifiedSupabaseMock');
    
    // Check for violations
    if (logContent.includes('jest.mock') && logContent.includes('@supabase')) {
      violations.push('jest.mock() for Supabase detected');
    }
    
    if (/const mock.*=.*{.*from:.*jest\.fn\(\)/.test(logContent)) {
      violations.push('Manual mock creation detected');
    }
    
    return {
      usesSimplifiedMock,
      hasViolations: violations.length > 0,
      violations
    };
  }
  
  calculateProgress(data, progressPath) {
    // If completed, return 100%
    if (data.status === 'completed') return 100;
    if (data.status === 'failed') return -1;
    if (data.status === 'not-started') return 0;
    
    // Calculate based on activity indicators
    let progress = 0;
    
    // Files modified (each file = 5% progress, max 30%)
    progress += Math.min(30, (data.filesModified?.length || 0) * 5);
    
    // Tests passed (each test = 2% progress, max 40%)
    progress += Math.min(40, (data.testsPass || 0) * 2);
    
    // Time-based progress (max 20%)
    if (data.startTime) {
      const startTime = new Date(data.startTime).getTime();
      const now = new Date().getTime();
      const elapsed = (now - startTime) / (1000 * 60); // minutes
      progress += Math.min(20, Math.floor(elapsed / 10) * 5);
    }
    
    // Activity bonus (10% if active)
    if (this.isAgentActive(data)) {
      progress += 10;
    }
    
    return Math.min(95, progress); // Cap at 95% unless explicitly completed
  }
  
  calculateHealth(data) {
    const now = new Date();
    
    // Check heartbeat
    if (data.heartbeat) {
      const lastHeartbeat = new Date(data.heartbeat);
      const timeSinceHeartbeat = (now - lastHeartbeat) / 1000; // seconds
      
      if (timeSinceHeartbeat > 300) return 'stale';      // >5 minutes
      if (timeSinceHeartbeat > 180) return 'slow';       // >3 minutes
    } else if (data.status === 'running' || data.status === 'active') {
      return 'unknown'; // Running but no heartbeat
    }
    
    // Check for errors
    if ((data.errors?.length || 0) > 10) return 'unhealthy';
    if ((data.errors?.length || 0) > 5) return 'degraded';
    
    // Check status
    if (data.status === 'failed') return 'failed';
    if (data.status === 'completed') return 'completed';
    if (data.status === 'not-started') return 'pending';
    
    return 'healthy';
  }
  
  isAgentActive(data) {
    if (!data.lastUpdate) return false;
    
    const lastUpdate = new Date(data.lastUpdate);
    const now = new Date();
    const timeSinceUpdate = (now - lastUpdate) / 1000; // seconds
    
    return timeSinceUpdate < 120; // Active if updated in last 2 minutes
  }
  
  classifyAgentType(agentName) {
    if (['role-services', 'role-hooks', 'role-navigation'].includes(agentName)) {
      return 'foundation';
    }
    if (['role-screens', 'permission-ui'].includes(agentName)) {
      return 'extension';
    }
    if (agentName === 'integration') {
      return 'integration';
    }
    return 'unknown';
  }
  
  calculateOverallHealth(agents) {
    const healths = Object.values(agents).map(a => a.health);
    
    if (healths.includes('failed')) return 'critical';
    if (healths.includes('unhealthy')) return 'unhealthy';
    if (healths.includes('stale') || healths.includes('degraded')) return 'degraded';
    if (healths.every(h => h === 'completed')) return 'completed';
    if (healths.includes('unknown')) return 'uncertain';
    
    return 'healthy';
  }
  
  calculateOverallProgress(agents) {
    const progresses = Object.values(agents)
      .filter(a => a.progress >= 0)
      .map(a => a.progress);
    
    if (progresses.length === 0) return 0;
    
    return Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
  }
  
  calculateAverageTestPassRate(agents) {
    const rates = Object.values(agents)
      .filter(a => a.testPassRate !== undefined && a.testPassRate >= 0)
      .map(a => a.testPassRate);
    
    if (rates.length === 0) return 0;
    
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }
  
  getPhaseStatus(agents, phaseAgents) {
    const phaseAgentData = phaseAgents.map(name => agents[name]).filter(Boolean);
    
    return {
      agents: phaseAgents,
      completed: phaseAgentData.filter(a => a.status === 'completed').length,
      total: phaseAgents.length,
      progress: Math.round(
        phaseAgentData.reduce((sum, a) => sum + (a.progress || 0), 0) / phaseAgents.length
      ),
      health: this.calculateOverallHealth(
        Object.fromEntries(phaseAgents.map(name => [name, agents[name]]).filter(([_, a]) => a))
      )
    };
  }
  
  generateAlerts(agents) {
    const alerts = [];
    
    Object.entries(agents).forEach(([name, agent]) => {
      if (agent.health === 'stale') {
        alerts.push({
          level: 'warning',
          agent: name,
          message: 'Agent appears stale (no recent heartbeat)'
        });
      }
      
      if (agent.health === 'failed') {
        alerts.push({
          level: 'critical',
          agent: name,
          message: 'Agent has failed'
        });
      }
      
      if (agent.hasViolations) {
        alerts.push({
          level: 'critical',
          agent: name,
          message: `Pattern violations detected: ${agent.patternCompliance.violations.join(', ')}`
        });
      }
      
      if (agent.errors > 10) {
        alerts.push({
          level: 'warning',
          agent: name,
          message: `High error count: ${agent.errors} errors`
        });
      }
      
      if (agent.testPassRate < 85 && agent.testPassRate > 0) {
        alerts.push({
          level: 'warning',
          agent: name,
          message: `Test pass rate below target: ${agent.testPassRate}% < 85%`
        });
      }
    });
    
    return alerts;
  }
  
  generateRecommendations(agents) {
    const recommendations = [];
    
    // Check for stale agents
    const staleAgents = Object.entries(agents).filter(([_, a]) => a.health === 'stale');
    if (staleAgents.length > 0) {
      recommendations.push(`Restart stale agents: ${staleAgents.map(([n]) => n).join(', ')}`);
    }
    
    // Check for pattern violations
    const violatingAgents = Object.entries(agents).filter(([_, a]) => a.hasViolations);
    if (violatingAgents.length > 0) {
      recommendations.push(`Fix pattern violations in: ${violatingAgents.map(([n]) => n).join(', ')}`);
    }
    
    // Check test pass rates
    const lowTestAgents = Object.entries(agents)
      .filter(([_, a]) => a.testPassRate < 85 && a.testPassRate > 0);
    if (lowTestAgents.length > 0) {
      recommendations.push(`Improve test pass rates for: ${lowTestAgents.map(([n]) => n).join(', ')}`);
    }
    
    return recommendations;
  }
}

// Run aggregator if executed directly
if (require.main === module) {
  const aggregator = new StatusAggregator('docker/volumes/communication');
  
  // Run once if --once flag provided
  if (process.argv.includes('--once')) {
    aggregator.aggregateStatus().then(status => {
      console.log(JSON.stringify(status, null, 2));
      process.exit(0);
    });
  } else {
    // Run continuously
    console.log('📊 Status Aggregator Started');
    console.log('Output: docker/volumes/communication/aggregate-status.json');
    console.log('Updating every 30 seconds...\n');
    
    const runAggregation = async () => {
      const status = await aggregator.aggregateStatus();
      
      console.clear();
      console.log('📊 AGGREGATE STATUS - ' + new Date().toLocaleTimeString());
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Overall Health: ${status.overallHealth}`);
      console.log(`Overall Progress: ${status.overallProgress}%`);
      console.log(`Active Agents: ${status.summary.activeAgents}/${status.summary.total}`);
      console.log(`Test Pass Rate: ${status.summary.averageTestPassRate}%`);
      console.log(`Pattern Compliance: ${status.summary.compliantAgents}/${status.summary.total} agents`);
      
      console.log('\n📈 Phase Progress:');
      Object.entries(status.phases).forEach(([phase, data]) => {
        console.log(`  ${phase}: ${data.completed}/${data.total} complete (${data.progress}%)`);
      });
      
      console.log('\n🤖 Agent Details:');
      Object.entries(status.agents).forEach(([name, agent]) => {
        const healthIcon = agent.health === 'healthy' ? '✅' : 
                          agent.health === 'stale' ? '⚠️' : 
                          agent.health === 'failed' ? '❌' : '❓';
        console.log(`  ${healthIcon} ${name}: ${agent.status} (${agent.progress}%) - ${agent.health}`);
      });
      
      if (status.alerts.length > 0) {
        console.log('\n🚨 Alerts:');
        status.alerts.forEach(alert => {
          console.log(`  [${alert.level}] ${alert.agent}: ${alert.message}`);
        });
      }
      
      if (status.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        status.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }
    };
    
    // Run immediately and then every 30 seconds
    runAggregation();
    setInterval(runAggregation, 30000);
  }
}