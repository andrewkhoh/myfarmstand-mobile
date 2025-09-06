// Intelligent Delegation Engine for Farm Stand Mobile App
const DelegationEngine = {
  analyzeTask: function(userInput, projectContext) {
    const complexity = this.assessComplexity(userInput, projectContext);
    const taskType = this.identifyTaskType(userInput);
    const resourceRequirements = this.estimateResources(complexity, taskType);
    
    return {
      shouldDelegate: complexity > 'medium' || taskType.requiresClaudeCode,
      workflow: this.selectWorkflow(taskType),
      priority: this.calculatePriority(complexity, projectContext),
      estimatedUsage: resourceRequirements.claudeMessages
    };
  },

  assessComplexity: function(userInput, projectContext) {
    const complexityIndicators = {
      high: [
        'schema mapping', 'database migration', 'architecture refactor',
        'security audit', 'performance optimization', 'multi-service changes',
        'broadcast system', 'RPC functions', 'atomic patterns'
      ],
      medium: [
        'component refactor', 'service update', 'hook modification',
        'documentation', 'test generation', 'type definitions'
      ],
      low: [
        'single file edit', 'style update', 'simple bug fix',
        'configuration change', 'dependency update'
      ]
    };

    const input = userInput.toLowerCase();
    
    if (complexityIndicators.high.some(indicator => input.includes(indicator))) {
      return 'high';
    }
    if (complexityIndicators.medium.some(indicator => input.includes(indicator))) {
      return 'medium';
    }
    return 'low';
  },

  identifyTaskType: function(userInput) {
    const taskPatterns = {
      refactoring: /refactor|restructure|reorganize|optimize|improve/i,
      documentation: /document|docs|readme|comment|explain/i,
      analysis: /review|analyze|audit|check|inspect|validate/i,
      architecture: /architecture|design|structure|plan|system/i,
      schema: /schema|mapping|database|supabase|migration/i,
      security: /security|auth|broadcast|rls|permission/i,
      performance: /performance|speed|optimize|slow|fast/i,
      testing: /test|spec|coverage|unit|integration/i
    };

    const matches = [];
    for (const [type, pattern] of Object.entries(taskPatterns)) {
      if (pattern.test(userInput)) {
        matches.push(type);
      }
    }

    return {
      primary: matches[0] || 'general',
      secondary: matches.slice(1),
      requiresClaudeCode: ['schema', 'security', 'architecture', 'performance'].includes(matches[0])
    };
  },

  selectWorkflow: function(taskType) {
    const workflowMap = {
      'refactoring': 'refactor',
      'documentation': 'docs',
      'analysis': 'code-review',
      'architecture': 'architecture',
      'optimization': 'refactor',
      'security': 'code-review',
      'schema': 'code-review',
      'performance': 'architecture',
      'testing': 'code-review'
    };
    
    return workflowMap[taskType.primary] || 'code-review';
  },

  calculatePriority: function(complexity, projectContext) {
    const priorityMatrix = {
      'high': {
        'schema': 'critical',
        'security': 'critical',
        'performance': 'high',
        'architecture': 'high'
      },
      'medium': {
        'refactoring': 'medium',
        'documentation': 'medium',
        'testing': 'medium'
      },
      'low': {
        'general': 'low'
      }
    };

    return priorityMatrix[complexity] || 'medium';
  },

  estimateResources: function(complexity, taskType) {
    const resourceMap = {
      'high': { claudeMessages: 15, estimatedTime: '30-60 min' },
      'medium': { claudeMessages: 8, estimatedTime: '15-30 min' },
      'low': { claudeMessages: 3, estimatedTime: '5-15 min' }
    };

    return resourceMap[complexity] || resourceMap['medium'];
  },

  // Farm Stand specific delegation rules
  farmStandRules: {
    schemaIssues: {
      trigger: ['327 mapping issues', 'schema validation', 'camelCase', 'snake_case'],
      workflow: 'code-review',
      priority: 'critical',
      context: 'Live schema inspection required, static schema.sql may be outdated'
    },
    
    servicePatterns: {
      trigger: ['CartService', 'golden pattern', 'atomic pattern', 'React Query'],
      workflow: 'refactor',
      priority: 'high',
      context: 'Ensure compliance with CartService golden standard'
    },
    
    broadcastSecurity: {
      trigger: ['broadcast', 'security', 'user isolation', 'payload sanitization'],
      workflow: 'code-review',
      priority: 'critical',
      context: 'Security audit required, check for cross-user contamination'
    },
    
    performanceBugs: {
      trigger: ['total = $0.00', 'undefined values', 'mapping errors'],
      workflow: 'code-review',
      priority: 'high',
      context: 'Root cause analysis needed for runtime mapping issues'
    }
  }
};

module.exports = DelegationEngine;
