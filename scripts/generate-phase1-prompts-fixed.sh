#!/bin/bash
# Automatic prompt generation for Phase 1 agents
# WITH STRONG EMPHASIS ON TEST INFRASTRUCTURE PATTERNS

set -euo pipefail

PROMPTS_DIR="docker/agents/prompts"
SCRIPTS_DIR="scripts"

echo "📝 Generating Phase 1 Agent Prompts with Test Infrastructure Enforcement..."

# Ensure prompts directory exists
mkdir -p $PROMPTS_DIR

# Function to generate each agent prompt
generate_agent_prompt() {
    local agent_name="$1"
    local agent_description="$2"
    local agent_tasks="$3"
    
    cat > "$PROMPTS_DIR/${agent_name}-agent.md" << 'ENDOFPROMPT'
# ${agent_name} Agent - Phase 1

## 🎯 Mission
${agent_description}

## 🚨 CRITICAL TEST INFRASTRUCTURE REQUIREMENTS

**MANDATORY**: Follow the established test patterns that achieved 100% success rate!

### Required Patterns:
1. **Services**: Use SimplifiedSupabaseMock from src/test/serviceSetup.ts
2. **Hooks**: Use real React Query from src/test/race-condition-setup.ts
3. **Query Keys**: Use centralized factory from src/utils/queryKeyFactory.ts
4. **Architecture**: Follow docs/architectural-patterns-and-best-practices.md

### Test Infrastructure:
- NEVER use jest.mock() for Supabase
- NEVER create manual mocks
- ALWAYS use SimplifiedSupabaseMock for services
- ALWAYS use real React Query for hooks

## 📋 Your Tasks
${agent_tasks}

## ✅ Success Criteria
- 85%+ test pass rate
- SimplifiedSupabaseMock used for ALL service tests
- Real React Query used for ALL hook tests
- Zero manual mocks or jest.mock()
- Pattern compliance 100%

## 🔄 Continuous Validation
After EVERY task:
1. Run tests: npm run test:services or test:hooks
2. Check pass rate (must be 85%+)
3. Fix any regressions immediately
4. Commit when tests pass

Remember: Report REAL results. Fix until you ACTUALLY achieve targets!
ENDOFPROMPT
}

# Generate prompts for each agent
echo "  Generating role-services prompt..."
generate_agent_prompt "role-services" \
    "Implement RolePermissionService and UserRoleService with test coverage" \
    "1. Create role permission service
2. Create user role service
3. Write comprehensive tests using SimplifiedSupabaseMock
4. Achieve 85%+ test pass rate"

echo "  Generating role-hooks prompt..."
generate_agent_prompt "role-hooks" \
    "Implement useUserRole and useRolePermissions hooks with React Query" \
    "1. Create useUserRole hook
2. Create useRolePermissions hook
3. Write tests using real React Query
4. Achieve 85%+ test pass rate"

echo "  Generating role-navigation prompt..."
generate_agent_prompt "role-navigation" \
    "Implement dynamic role-based navigation with route guards" \
    "1. Create navigation service
2. Implement route guards
3. Create dynamic menu generation
4. Write comprehensive tests
5. Achieve 85%+ test pass rate"

echo "  Generating role-screens prompt..."
generate_agent_prompt "role-screens" \
    "Create role management screens and dashboards" \
    "1. Create RoleDashboard screen
2. Create RoleSelection screen
3. Create PermissionManagement screen
4. Write screen tests
5. Achieve 85%+ test pass rate"

echo "  Generating permission-ui prompt..."
generate_agent_prompt "permission-ui" \
    "Build permission UI components and gates" \
    "1. Create PermissionGate component
2. Create AccessIndicator component
3. Create permission UI utilities
4. Write component tests
5. Achieve 85%+ test pass rate"

echo "  Generating integration prompt..."
generate_agent_prompt "integration" \
    "Integrate and validate all Phase 1 components" \
    "1. Verify all services work together
2. Run end-to-end integration tests
3. Validate pattern compliance
4. Generate final report
5. Ensure 85%+ overall pass rate"

echo "✅ All Phase 1 agent prompts generated successfully!"
echo "📁 Prompts location: $PROMPTS_DIR"
ls -la $PROMPTS_DIR/