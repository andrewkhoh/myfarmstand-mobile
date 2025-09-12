#!/usr/bin/env ts-node

/**
 * Phase 2 Agent using Real Claude Code SDK
 * Achieves 100% infrastructure adoption for assigned test files
 */

import { query } from "@anthropic-ai/claude-code";
import * as fs from 'fs';
import * as path from 'path';

interface TaskFile {
  agent_id: string;
  reference: string;
  files_to_fix: string[];
  patterns_to_apply: string[];
}

class Phase2Agent {
  private agentId: string;
  private taskFile: TaskFile;
  private communicationDir: string;
  private abortController = new AbortController();

  constructor() {
    this.agentId = process.env.AGENT_ID || 'unknown';
    this.communicationDir = process.env.COMM_DIR || '../myfarmstand-mobile/test-fixes-communication';
    
    // Load task file
    const taskPath = path.join(this.communicationDir, 'tasks', `${this.agentId}.json`);
    this.taskFile = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    
    console.log(`🤖 Agent ${this.agentId} initialized`);
    console.log(`📋 Files to fix: ${this.taskFile.files_to_fix.length}`);
  }

  /**
   * Generate the master prompt for this agent
   */
  private generateMasterPrompt(): string {
    const fileList = this.taskFile.files_to_fix.map(f => `- ${f}`).join('\n');
    const patterns = this.taskFile.patterns_to_apply.map(p => `- ${p}`).join('\n');
    
    return `
You are a test infrastructure specialist for the MyFarmstand Mobile project.

MISSION: Achieve 100% infrastructure pattern compliance for the following test files.

REFERENCE DOCUMENT: ${this.taskFile.reference}

FILES TO FIX:
${fileList}

PATTERNS TO APPLY:
${patterns}

INSTRUCTIONS:
1. Read the reference document to understand the canonical patterns
2. For EACH file listed above:
   a. Read the current file
   b. Identify which patterns are missing
   c. Apply ALL required patterns exactly as shown in the reference
   d. Ensure the file follows the pattern 100%
   e. Save the file
   f. Move to the next file

CRITICAL REQUIREMENTS:
- DO NOT modify implementation logic, only test infrastructure
- Follow the reference patterns EXACTLY
- Ensure all mocks are in the correct order
- Add all required imports and mocks
- Fix one file completely before moving to the next

${this.getPatternSpecificInstructions()}

Start by reading the reference document, then fix each file in sequence.
`;
  }

  /**
   * Get pattern-specific instructions based on agent type
   */
  private getPatternSpecificInstructions(): string {
    if (this.agentId.includes('service')) {
      return `
SERVICE TEST SPECIFIC:
- SimplifiedSupabaseMock must be imported from test/mocks/supabase.simplified.mock
- Use createSupabaseMock() in beforeEach
- Import and use resetAllFactories() from test/factories
- Mock order: Mocks BEFORE imports of the service being tested
`;
    } else if (this.agentId.includes('hook')) {
      return `
HOOK TEST SPECIFIC:
- Defensive imports at the VERY TOP of the file (before all other imports)
- Mock @tanstack/react-query BEFORE other mocks
- Mock queryKeyFactory with ALL methods (all, list, detail, details)
- Mock broadcastFactory if the hook uses broadcasts
- Mock useCurrentUser if authentication is used
- Use createWrapper from test/test-utils
`;
    } else if (this.agentId.includes('schema')) {
      return `
SCHEMA TEST SPECIFIC:
- Use transform validation pattern
- Add null handling for all fields
- Follow database-first validation approach
- Test both valid and invalid data
`;
    }
    return '';
  }

  /**
   * Update progress tracking
   */
  private updateProgress(current: string, filesFixed: number) {
    const progressDir = path.join(this.communicationDir, 'progress', this.agentId);
    fs.mkdirSync(progressDir, { recursive: true });
    
    // Update current status
    fs.writeFileSync(
      path.join(progressDir, 'current.md'),
      `${new Date().toISOString()}: ${current}`
    );
    
    // Update metrics
    const metrics = {
      agent_id: this.agentId,
      completion: Math.floor((filesFixed / this.taskFile.files_to_fix.length) * 100),
      files_fixed: filesFixed,
      files_total: this.taskFile.files_to_fix.length,
      status: filesFixed === this.taskFile.files_to_fix.length ? 'complete' : 'running',
      last_update: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(progressDir, 'metrics.json'),
      JSON.stringify(metrics, null, 2)
    );
  }

  /**
   * Execute the agent's task
   */
  async execute() {
    console.log('🚀 Starting execution with Claude Code SDK');
    
    let filesFixed = 0;
    this.updateProgress('Starting', 0);
    
    try {
      // Execute the master prompt with Claude Code SDK
      for await (const message of query({
        prompt: this.generateMasterPrompt(),
        abortController: this.abortController,
        options: {
          maxTurns: 10, // Allow multiple turns for all files
          systemPrompt: "You are a test infrastructure specialist. Apply patterns with 100% accuracy.",
          allowedTools: ["Read", "Write", "Edit", "MultiEdit", "Bash", "Grep"],
          permissionMode: "acceptEdits", // Auto-accept edits for automation
          cwd: process.cwd()
        }
      })) {
        // Handle different message types
        if (message.type === "assistant") {
          // Log assistant actions
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text') {
                console.log('Claude:', block.text.substring(0, 100) + '...');
              } else if (block.type === 'tool_use') {
                console.log(`🔧 Using tool: ${block.name}`);
                
                // Track file progress
                if (block.name === 'Write' || block.name === 'Edit') {
                  const input = block.input as any;
                  if (input.file_path) {
                    const fileName = path.basename(input.file_path);
                    this.updateProgress(`Fixing ${fileName}`, filesFixed);
                    
                    // Check if this completes a file
                    if (this.taskFile.files_to_fix.some(f => f.includes(fileName))) {
                      filesFixed++;
                      console.log(`✅ Fixed ${fileName} (${filesFixed}/${this.taskFile.files_to_fix.length})`);
                      this.updateProgress(`Completed ${fileName}`, filesFixed);
                    }
                  }
                }
              }
            }
          }
        } else if (message.type === "result") {
          // Final result
          console.log('\n📊 Execution complete!');
          console.log(`Total cost: $${message.total_cost_usd}`);
          console.log(`Duration: ${message.duration_ms}ms`);
          console.log(`Turns used: ${message.num_turns}`);
          
          if (message.subtype === 'success') {
            this.markComplete();
          } else {
            console.error('⚠️ Execution ended with:', message.subtype);
          }
        } else if (message.type === "system" && message.subtype === "init") {
          console.log('🔧 Tools available:', message.tools.join(', '));
        }
      }
    } catch (error) {
      console.error('❌ Error during execution:', error);
      this.logBlocker(`Execution error: ${error}`);
    }
  }

  /**
   * Mark agent as complete
   */
  private markComplete() {
    console.log('✅ Agent completed successfully!');
    
    const handoffDir = path.join(this.communicationDir, 'handoffs', this.agentId);
    fs.mkdirSync(handoffDir, { recursive: true });
    fs.writeFileSync(
      path.join(handoffDir, 'ready-to-merge.flag'),
      new Date().toISOString()
    );
    
    this.updateProgress('Complete', this.taskFile.files_to_fix.length);
  }

  /**
   * Log a blocker
   */
  private logBlocker(issue: string) {
    const blockerDir = path.join(this.communicationDir, 'blockers', this.agentId);
    fs.mkdirSync(blockerDir, { recursive: true });
    fs.writeFileSync(
      path.join(blockerDir, 'issue.md'),
      issue
    );
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('🛑 Shutting down agent...');
    this.abortController.abort();
  }
}

// Main execution
if (require.main === module) {
  const agent = new Phase2Agent();
  
  // Handle shutdown signals
  process.on('SIGINT', () => {
    agent.shutdown();
    process.exit(0);
  });
  
  // Execute
  agent.execute().catch(console.error);
}

export { Phase2Agent };