#!/usr/bin/env ts-node

/**
 * Phase 2 Orchestrator - Manages parallel execution of 5 agents
 * Coordinates infrastructure adoption to achieve 100% compliance
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface AgentConfig {
  id: string;
  type: 'service' | 'hook' | 'schema' | 'mixed';
  worktree: string;
  taskFile: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

class Phase2Orchestrator {
  private agents: AgentConfig[] = [
    {
      id: 'phase2-core-services',
      type: 'service',
      worktree: '../phase2-core-services',
      taskFile: 'phase2-core-services.json',
      priority: 'CRITICAL'
    },
    {
      id: 'phase2-extension-services',
      type: 'service',
      worktree: '../phase2-extension-services',
      taskFile: 'phase2-extension-services.json',
      priority: 'HIGH'
    },
    {
      id: 'phase2-core-hooks',
      type: 'hook',
      worktree: '../phase2-core-hooks',
      taskFile: 'phase2-core-hooks.json',
      priority: 'HIGH'
    },
    {
      id: 'phase2-extension-hooks',
      type: 'hook',
      worktree: '../phase2-extension-hooks',
      taskFile: 'phase2-extension-hooks.json',
      priority: 'CRITICAL'
    },
    {
      id: 'phase2-schema-other',
      type: 'mixed',
      worktree: '../phase2-schema-other',
      taskFile: 'phase2-schema-other.json',
      priority: 'MEDIUM'
    }
  ];

  private communicationDir = '/communication';
  private startTime = new Date();

  async orchestrate() {
    console.log('🎭 PHASE 2 ORCHESTRATOR STARTING');
    console.log('=================================');
    console.log(`Target: 100% Infrastructure Adoption`);
    console.log(`Agents: ${this.agents.length}`);
    console.log(`Start: ${this.startTime.toISOString()}\n`);

    try {
      // Phase 1: Initialize
      await this.initialize();

      // Phase 2: Run baseline audit
      await this.runBaselineAudit();

      // Phase 3: Generate detailed prompts for each agent
      await this.generateAgentPrompts();

      // Phase 4: Launch agents in parallel
      await this.launchAgents();

      // Phase 5: Monitor progress
      await this.monitorProgress();

      // Phase 6: Verify results
      await this.verifyResults();

      // Phase 7: Prepare integration
      await this.prepareIntegration();

      console.log('\n✅ ORCHESTRATION COMPLETE!');
      
    } catch (error) {
      console.error('\n❌ ORCHESTRATION FAILED:', error);
      process.exit(1);
    }
  }

  private async initialize() {
    console.log('📦 Initializing orchestration...');
    
    // Ensure communication directories exist
    for (const agent of this.agents) {
      const dirs = [
        `${this.communicationDir}/progress/${agent.id}`,
        `${this.communicationDir}/handoffs/${agent.id}`,
        `${this.communicationDir}/blockers/${agent.id}`
      ];
      
      for (const dir of dirs) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    console.log('   ✓ Communication channels ready');
  }

  private async runBaselineAudit() {
    console.log('\n📊 Running baseline audit...');
    
    try {
      const { stdout } = await execAsync('./phase2-infrastructure-audit.sh');
      
      // Save audit results
      fs.writeFileSync(
        `${this.communicationDir}/baseline-audit.txt`,
        stdout
      );
      
      // Extract key metrics
      const overallMatch = stdout.match(/OVERALL.*?(\d+)%/);
      if (overallMatch) {
        console.log(`   Current adoption: ${overallMatch[1]}%`);
        console.log(`   Target: 100%`);
        console.log(`   Gap: ${100 - parseInt(overallMatch[1])}%`);
      }
      
    } catch (error) {
      console.log('   ⚠️ Audit failed, continuing anyway');
    }
  }

  private async generateAgentPrompts() {
    console.log('\n📝 Generating agent-specific prompts...');
    
    for (const agent of this.agents) {
      const taskPath = `${this.communicationDir}/tasks/${agent.taskFile}`;
      
      if (!fs.existsSync(taskPath)) {
        console.log(`   ⚠️ No task file for ${agent.id}`);
        continue;
      }
      
      const tasks = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
      const promptPath = `${this.communicationDir}/prompts/${agent.id}.md`;
      
      // Generate detailed prompt for this agent
      const prompt = this.generatePromptForAgent(agent, tasks);
      
      fs.mkdirSync(path.dirname(promptPath), { recursive: true });
      fs.writeFileSync(promptPath, prompt);
      
      console.log(`   ✓ Generated prompt for ${agent.id} (${tasks.files_to_fix?.length || 0} files)`);
    }
  }

  private generatePromptForAgent(agent: AgentConfig, tasks: any): string {
    return `# Agent: ${agent.id}

## Mission
Achieve 100% infrastructure pattern compliance for all assigned test files.

## Priority: ${agent.priority}

## Reference Document
${tasks.reference}

## Files to Fix (${tasks.files_to_fix?.length || 0} files)
${tasks.files_to_fix?.map((f: string) => `- ${f}`).join('\n') || 'See task file for details'}

## Patterns to Apply
${tasks.patterns_to_apply?.map((p: string) => `- ${p}`).join('\n')}

## Specific Instructions

### For Service Tests
1. Add SimplifiedSupabaseMock import and usage
2. Implement Factory/Reset pattern with resetAllFactories()
3. Ensure proper mock order (mocks before imports)
4. Mock all service dependencies

### For Hook Tests
1. Add defensive imports at the TOP of the file
2. Mock React Query before other mocks
3. Mock Query Key Factory with ALL methods
4. Mock Broadcast Factory if used
5. Mock useCurrentUser if authentication is used

### For Schema Tests
1. Implement transform validation pattern
2. Add null handling for all fields
3. Use database-first validation approach

## Success Criteria
- All files compile without errors
- No mock-related runtime errors
- Tests run (pass or fail) without infrastructure issues
- 100% compliance with reference patterns

## Process
1. Read each file
2. Identify missing patterns
3. Apply ALL required patterns
4. Verify the file runs without mock errors
5. Move to next file
6. Report completion when all files are done

Remember: Fix ONLY test infrastructure, do not modify implementation logic.`;
  }

  private async launchAgents() {
    console.log('\n🚀 Launching agents in parallel...');
    
    const agentPromises = this.agents.map(agent => this.launchSingleAgent(agent));
    
    // Launch all agents in parallel
    const results = await Promise.allSettled(agentPromises);
    
    // Check results
    results.forEach((result, index) => {
      const agent = this.agents[index];
      if (result.status === 'fulfilled') {
        console.log(`   ✓ ${agent.id} launched`);
      } else {
        console.log(`   ❌ ${agent.id} failed to launch:`, result.reason);
      }
    });
  }

  private async launchSingleAgent(agent: AgentConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // In Docker environment, agents are separate containers
      // For local testing, we simulate with subprocess
      
      if (process.env.DOCKER_ENV) {
        // Agent is already running as separate container
        resolve();
      } else {
        // Local simulation
        const agentProcess = spawn('ts-node', [
          'scripts/claude-agent-executor.ts'
        ], {
          cwd: agent.worktree,
          env: {
            ...process.env,
            AGENT_ID: agent.id,
            REFERENCE_DOC: `src/test/${agent.type}-test-pattern (REFERENCE).md`
          },
          detached: true,
          stdio: 'ignore'
        });
        
        agentProcess.unref();
        resolve();
      }
    });
  }

  private async monitorProgress() {
    console.log('\n📈 Monitoring agent progress...');
    
    let allComplete = false;
    let iterations = 0;
    const maxIterations = 360; // 30 minutes max
    
    while (!allComplete && iterations < maxIterations) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
      
      const statuses = this.agents.map(agent => {
        const metricsPath = `${this.communicationDir}/progress/${agent.id}/metrics.json`;
        
        if (fs.existsSync(metricsPath)) {
          const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
          return {
            agent: agent.id,
            completion: metrics.completion,
            status: metrics.status
          };
        }
        
        return {
          agent: agent.id,
          completion: 0,
          status: 'waiting'
        };
      });
      
      // Display progress
      if (iterations % 12 === 0) { // Every minute
        console.log(`\n   Progress at ${new Date().toLocaleTimeString()}:`);
        statuses.forEach(s => {
          const indicator = s.status === 'complete' ? '✅' : 
                          s.status === 'running' ? '🔄' : '⏳';
          console.log(`   ${indicator} ${s.agent}: ${s.completion}%`);
        });
      }
      
      allComplete = statuses.every(s => s.status === 'complete');
      iterations++;
    }
    
    if (allComplete) {
      console.log('\n✅ All agents completed!');
    } else {
      console.log('\n⚠️ Timeout reached, some agents may still be running');
    }
  }

  private async verifyResults() {
    console.log('\n🔍 Verifying results...');
    
    // Run final audit
    try {
      const { stdout } = await execAsync('./phase2-infrastructure-audit.sh');
      
      fs.writeFileSync(
        `${this.communicationDir}/final-audit.txt`,
        stdout
      );
      
      // Extract final metrics
      const overallMatch = stdout.match(/OVERALL.*?(\d+)%/);
      if (overallMatch) {
        const finalAdoption = parseInt(overallMatch[1]);
        console.log(`   Final adoption: ${finalAdoption}%`);
        
        if (finalAdoption === 100) {
          console.log('   🎉 TARGET ACHIEVED: 100% Infrastructure Adoption!');
        } else {
          console.log(`   📊 Progress made, ${100 - finalAdoption}% remaining`);
        }
      }
      
      // Run tests
      console.log('\n   Running test suites...');
      const { stdout: testOutput } = await execAsync('npm test 2>&1 | grep -E "Tests:|Suites:" | tail -2');
      console.log('   ' + testOutput.trim().replace(/\n/g, '\n   '));
      
    } catch (error: any) {
      console.log('   ⚠️ Verification encountered issues:', error.message);
    }
  }

  private async prepareIntegration() {
    console.log('\n🔄 Preparing for integration...');
    
    // Generate merge script
    const mergeScript = `#!/bin/bash
# Phase 2 Integration Script
# Generated: ${new Date().toISOString()}

echo "Merging Phase 2 changes..."

${this.agents.map(agent => `
echo "Merging ${agent.id}..."
cd ${agent.worktree}
git add -A
git commit -m "Phase 2: 100% infrastructure adoption for ${agent.id}"
cd -
git merge ${agent.id} --no-ff -m "Integrate ${agent.id} infrastructure fixes"
`).join('\n')}

echo "✅ All agents merged!"
echo "Running final tests..."
npm test
`;
    
    fs.writeFileSync(
      `${this.communicationDir}/merge-phase2.sh`,
      mergeScript,
      { mode: 0o755 }
    );
    
    console.log('   ✓ Merge script generated: merge-phase2.sh');
    console.log('   ✓ Ready for integration to main branch');
  }
}

// Execute orchestration
if (require.main === module) {
  const orchestrator = new Phase2Orchestrator();
  orchestrator.orchestrate().catch(console.error);
}

export { Phase2Orchestrator };