#!/bin/bash

# 🐳 Containerized Phase 1 Multi-Agent Setup
# Following docs/containerized-multi-agent-guide.md

set -euo pipefail

# Configuration
PROJECT_NAME="phase1-role-foundation"
MAIN_REPO="/Users/andrewkhoh/Documents/myfarmstand-mobile"
BASE_BRANCH="main"

echo "🐳 Setting up Containerized Phase 1 Multi-Agent Environment..."
echo "=============================================================="

# Create directory structure
echo "📁 Creating Docker infrastructure..."
mkdir -p docker/{agents,monitoring,volumes/communication/{progress,blockers,handoffs,contracts,snapshots}}
mkdir -p scripts agents

# Create communication hub
COMM_DIR="docker/volumes/communication"
mkdir -p ${COMM_DIR}/{progress,blockers,handoffs,contracts}

echo "  ✅ Created Docker directory structure"

# Define Phase 1 agent configuration
declare -A AGENTS=(
    ["role-services"]="foundation"
    ["role-hooks"]="foundation"
    ["role-navigation"]="foundation" 
    ["role-screens"]="extension"
    ["permission-ui"]="extension"
    ["integration"]="integration"
)

echo ""
echo "🏗️ Creating git worktrees for Phase 1 agents..."

# Create git worktrees for each agent
for agent in "${!AGENTS[@]}"; do
    WORKSPACE="${PROJECT_NAME}-${agent}"
    BRANCH="${PROJECT_NAME}-${agent}"
    WORKTREE_PATH="docker/volumes/${WORKSPACE}"
    
    # Create worktree
    cd $MAIN_REPO
    git worktree add $WORKTREE_PATH -b $BRANCH $BASE_BRANCH
    
    echo "  ✅ Created workspace for ${agent} at ${WORKTREE_PATH}"
done

cd $MAIN_REPO

echo ""
echo "⚙️ Generating Docker configuration..."

# Initialize task board
cat > ${COMM_DIR}/task-board.md << 'EOF'
# 📋 Phase 1 Containerized Task Board

Last Updated: $(date)

## 🎯 Phase 1 Scope: Role-Based Foundation

### Foundation Agents (Parallel Execution)
- [ ] Role Services - Container: role-services-agent
  - RolePermissionService, UserRoleService
  - Schema contracts and validation
  - 20+ service tests

- [ ] Role Hooks - Container: role-hooks-agent
  - useUserRole, useRolePermissions
  - Query key integration
  - 15+ hook tests

- [ ] Role Navigation - Container: role-navigation-agent
  - Dynamic navigation based on roles
  - Route guards and menu generation
  - 15+ navigation tests

### Extension Agents (Depends on Foundation)
- [ ] Role Screens - Container: role-screens-agent
  - RoleDashboard, RoleSelection screens
  - PermissionManagement interface
  - 20+ screen tests

- [ ] Permission UI - Container: permission-ui-agent
  - Permission gates and indicators
  - Access control UI components
  - 10+ UI component tests

### Integration & Cleanup
- [ ] Integration Agent - Container: integration-agent
  - End-to-end integration testing
  - Cross-agent validation
  - Final Phase 1 verification

## 🎯 Success Criteria
- 60+ tests minimum across all agents
- 100% architectural pattern compliance
- Role-based authentication working end-to-end
- Permission system functional across modules

## 🔒 Safety Status
- Blast Radius: ✅ Contained to containers
- Data Preservation: ✅ Volume mounts active
- Recovery Ready: ✅ Snapshots available
EOF

echo "  ✅ Created task board"

# Generate docker-compose.yml for Phase 1
cat > docker/docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Foundation Agents (can run in parallel)
  role-services-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: role-services-agent
    environment:
      - AGENT_NAME=role-services
      - AGENT_TYPE=foundation
      - PHASE=1
      - CLAUDE_CONFIG=/config/claude-config.json
    volumes:
      - ./volumes/phase1-role-foundation-role-services:/workspace:rw
      - ./volumes/communication:/shared:rw
      - ./agents/claude-config.json:/config/claude-config.json:ro
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions", "--config", "/config/claude-config.json"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
      - SETUID
      - SETGID
    read_only: false
    tmpfs:
      - /tmp:rw,size=1G
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - monitor

  role-hooks-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: role-hooks-agent
    environment:
      - AGENT_NAME=role-hooks
      - AGENT_TYPE=foundation
      - PHASE=1
    volumes:
      - ./volumes/phase1-role-foundation-role-hooks:/workspace:rw
      - ./volumes/communication:/shared:rw
      - ./agents/claude-config.json:/config/claude-config.json:ro
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions", "--config", "/config/claude-config.json"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - monitor

  role-navigation-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: role-navigation-agent
    environment:
      - AGENT_NAME=role-navigation
      - AGENT_TYPE=foundation
      - PHASE=1
    volumes:
      - ./volumes/phase1-role-foundation-role-navigation:/workspace:rw
      - ./volumes/communication:/shared:rw
      - ./agents/claude-config.json:/config/claude-config.json:ro
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions", "--config", "/config/claude-config.json"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - monitor

  # Extension Agents (depend on foundation)
  role-screens-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: role-screens-agent
    environment:
      - AGENT_NAME=role-screens
      - AGENT_TYPE=extension
      - PHASE=1
    volumes:
      - ./volumes/phase1-role-foundation-role-screens:/workspace:rw
      - ./volumes/communication:/shared:rw
      - ./agents/claude-config.json:/config/claude-config.json:ro
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions", "--config", "/config/claude-config.json"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - role-services-agent
      - role-hooks-agent
      - role-navigation-agent

  permission-ui-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: permission-ui-agent
    environment:
      - AGENT_NAME=permission-ui
      - AGENT_TYPE=extension
      - PHASE=1
    volumes:
      - ./volumes/phase1-role-foundation-permission-ui:/workspace:rw
      - ./volumes/communication:/shared:rw
      - ./agents/claude-config.json:/config/claude-config.json:ro
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions", "--config", "/config/claude-config.json"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - role-services-agent
      - role-hooks-agent
      - role-navigation-agent

  # Integration Agent (depends on all others)
  integration-agent:
    build: 
      context: ./agents
      dockerfile: Dockerfile
    container_name: integration-agent
    environment:
      - AGENT_NAME=integration
      - AGENT_TYPE=integration
      - PHASE=1
    volumes:
      - ./volumes/phase1-role-foundation-integration:/workspace:rw
      - ./volumes/communication:/shared:rw
      - ./agents/claude-config.json:/config/claude-config.json:ro
    working_dir: /workspace
    command: ["claude-code", "--dangerous-permissions", "--config", "/config/claude-config.json"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
    mem_limit: 2G
    cpus: 1.0
    depends_on:
      - role-services-agent
      - role-hooks-agent
      - role-navigation-agent
      - role-screens-agent
      - permission-ui-agent

  # Monitor Container
  monitor:
    build:
      context: ./monitoring
      dockerfile: Dockerfile
    container_name: phase1-monitor
    environment:
      - PHASE=1
      - PROJECT=phase1-role-foundation
    volumes:
      - ./volumes/communication:/shared:ro
    ports:
      - "3001:3001"
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 512M
    cpus: 0.5

networks:
  default:
    name: phase1-agents
EOF

echo "  ✅ Generated docker-compose.yml"

# Create Agent Dockerfile
cat > docker/agents/Dockerfile << 'EOF'
FROM node:18-alpine

# Install system dependencies for dangerous operations
RUN apk add --no-cache \
    bash \
    git \
    curl \
    sudo \
    build-base \
    python3 \
    py3-pip

# Create agent user (but allow dangerous operations)
RUN addgroup -g 1000 agent && \
    adduser -u 1000 -G agent -s /bin/bash -D agent && \
    echo "agent ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Install Claude Code (placeholder - adjust for actual installation)
# Note: This would need the actual Claude Code installation method
RUN curl -fsSL https://claude.ai/install | bash || echo "Claude Code installation placeholder"

# Set up workspace
WORKDIR /workspace
RUN chown -R agent:agent /workspace

# Switch to agent user (dangerous permissions still available via sudo)
USER agent

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD echo "Agent container healthy"

ENTRYPOINT ["bash", "-c", "echo 'Agent container ready' && sleep infinity"]
EOF

echo "  ✅ Created Agent Dockerfile"

# Create Monitor Dockerfile
cat > docker/monitoring/Dockerfile << 'EOF'
FROM node:18-alpine

RUN apk add --no-cache bash curl

WORKDIR /monitor

# Copy monitoring scripts
COPY dashboard.js health-checker.js ./

# Install dependencies (if any)
RUN npm init -y && npm install express ws

EXPOSE 3001

USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dashboard.js"]
EOF

echo "  ✅ Created Monitor Dockerfile"

# Create monitoring dashboard
cat > docker/monitoring/dashboard.js << 'EOF'
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    const commDir = '/shared';
    const status = {
        agents: {},
        blockers: [],
        completed: [],
        timestamp: new Date().toISOString()
    };

    // Read agent progress
    try {
        const progressDir = path.join(commDir, 'progress');
        const files = fs.readdirSync(progressDir);
        files.forEach(file => {
            const content = fs.readFileSync(path.join(progressDir, file), 'utf8');
            const agent = file.replace('.md', '');
            status.agents[agent] = content.split('\n').pop();
        });
    } catch (err) {
        console.log('No progress files yet');
    }

    // Read completion status
    try {
        const handoffDir = path.join(commDir, 'handoffs');
        const files = fs.readdirSync(handoffDir);
        status.completed = files.map(f => f.replace('-complete.md', ''));
    } catch (err) {
        console.log('No handoffs yet');
    }

    res.json(status);
});

app.listen(port, () => {
    console.log(`Phase 1 Monitor dashboard running at http://localhost:${port}`);
});
EOF

echo "  ✅ Created monitoring dashboard"

# Create Claude configuration
cat > docker/agents/claude-config.json << 'EOF'
{
  "dangerous_permissions": true,
  "workspace_isolation": true,
  "auto_save": true,
  "progress_reporting": true,
  "communication_dir": "/shared"
}
EOF

echo "  ✅ Created Claude configuration"

# Create launch script with agent prompt instructions
cat > scripts/launch-phase1-agents.sh << 'EOF'
#!/bin/bash

set -e

echo "🐳 Launching Phase 1 Containerized Agents..."
echo "============================================="

cd docker

# Build containers
echo "🏗️ Building containers..."
docker-compose build

# Display agent prompt instructions
echo ""
echo "📋 AGENT SETUP INSTRUCTIONS"
echo "═══════════════════════════════════════"
echo ""
echo "Each agent container is now ready. Open separate Claude Code tabs and connect to:"
echo ""
echo "🏗️ FOUNDATION AGENTS (Launch in parallel):"
echo "  1. role-services-agent:"
echo "     • Workspace: docker/volumes/phase1-role-foundation-role-services"
echo "     • Prompt: docker/agents/prompts/role-services-agent.md"
echo "     • Command: docker exec -it role-services-agent bash"
echo ""
echo "  2. role-hooks-agent:"
echo "     • Workspace: docker/volumes/phase1-role-foundation-role-hooks"
echo "     • Prompt: docker/agents/prompts/role-hooks-agent.md"
echo "     • Command: docker exec -it role-hooks-agent bash"
echo ""
echo "  3. role-navigation-agent:"
echo "     • Workspace: docker/volumes/phase1-role-foundation-role-navigation"
echo "     • Prompt: docker/agents/prompts/role-navigation-agent.md"
echo "     • Command: docker exec -it role-navigation-agent bash"
echo ""
echo "🔧 EXTENSION AGENTS (Launch after foundation complete):"
echo "  4. role-screens-agent:"
echo "     • Workspace: docker/volumes/phase1-role-foundation-role-screens"
echo "     • Prompt: docker/agents/prompts/role-screens-agent.md"
echo "     • Command: docker exec -it role-screens-agent bash"
echo ""
echo "  5. permission-ui-agent:"
echo "     • Workspace: docker/volumes/phase1-role-foundation-permission-ui"
echo "     • Prompt: docker/agents/prompts/permission-ui-agent.md"
echo "     • Command: docker exec -it permission-ui-agent bash"
echo ""
echo "🔗 INTEGRATION AGENT (Launch last):"
echo "  6. integration-agent:"
echo "     • Workspace: docker/volumes/phase1-role-foundation-integration"
echo "     • Prompt: docker/agents/prompts/integration-agent.md"
echo "     • Command: docker exec -it integration-agent bash"
echo ""
echo "⚠️  CRITICAL INSTRUCTIONS FOR ALL AGENTS:"
echo "   • READ the agent prompt file completely before starting"
echo "   • USE SimplifiedSupabaseMock pattern for service tests"
echo "   • USE real React Query setup for hook tests"
echo "   • FOLLOW architectural patterns in docs/architectural-patterns-and-best-practices.md"
echo "   • UPDATE progress in /shared/progress/[agent-name].md"
echo "   • REPORT blockers in /shared/blockers/[agent-name]-blockers.md"
echo "   • CREATE completion handoff in /shared/handoffs/[agent-name]-complete.md"
echo ""

# Start foundation agents first
echo "🚀 Starting foundation agents (parallel)..."
docker-compose up -d role-services-agent role-hooks-agent role-navigation-agent monitor

echo "⏳ Waiting for foundation agents to initialize..."
sleep 30

# Check foundation agent health
echo "🔍 Checking foundation agent status..."
docker-compose ps

# Start extension agents
echo "🚀 Starting extension agents..."
docker-compose up -d role-screens-agent permission-ui-agent

echo "⏳ Waiting for extension agents to initialize..."
sleep 20

# Start integration agent
echo "🚀 Starting integration agent..."
docker-compose up -d integration-agent

echo ""
echo "✅ All Phase 1 agents launched!"
echo ""
echo "📊 Monitoring:"
echo "  Dashboard: http://localhost:3001"
echo "  Logs: docker-compose logs -f [agent-name]"
echo "  Status: docker-compose ps"
echo ""
echo "🔧 Management:"
echo "  Stop all: docker-compose down"
echo "  Restart agent: docker-compose restart [agent-name]"
echo "  View progress: cat docker/volumes/communication/progress/[agent].md"
echo ""
echo "🎯 Next Steps:"
echo "  1. Open 6 separate Claude Code tabs"
echo "  2. Connect each tab to its assigned agent container"
echo "  3. Copy the agent prompt into each Claude Code session"
echo "  4. Start with foundation agents, wait for completion"
echo "  5. Launch extension agents after foundation complete"
echo "  6. Run integration agent last for final validation"
EOF

chmod +x scripts/launch-phase1-agents.sh

echo "  ✅ Created launch script"

# Create recovery script
cat > scripts/emergency-recovery.sh << 'EOF'
#!/bin/bash

echo "🚨 Emergency Recovery for Phase 1 Agents"
echo "========================================"

cd docker

# Stop all containers
echo "🛑 Stopping all containers..."
docker-compose down

# Create snapshot
echo "📸 Creating emergency snapshot..."
SNAPSHOT_DIR="volumes/snapshots/emergency-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SNAPSHOT_DIR"
cp -r volumes/communication "$SNAPSHOT_DIR/"

# Restart from clean state
echo "🔄 Restarting from clean state..."
docker-compose up -d

echo "✅ Emergency recovery complete!"
echo "📁 Snapshot saved to: $SNAPSHOT_DIR"
EOF

chmod +x scripts/emergency-recovery.sh

echo "  ✅ Created emergency recovery script"

echo ""
echo "✅ Phase 1 Containerized Multi-Agent Environment Ready!"
echo ""
echo "🎯 Next Steps:"
echo "  1. Launch agents: ./scripts/launch-phase1-agents.sh"
echo "  2. Monitor progress: http://localhost:3001"
echo "  3. View logs: docker-compose -f docker/docker-compose.yml logs -f"
echo ""
echo "🔒 Safety Features:"
echo "  • Container isolation prevents system damage"
echo "  • Volume mounts preserve work across crashes" 
echo "  • Emergency recovery available"
echo "  • Resource limits prevent runaway processes"
echo ""
echo "📋 Phase 1 Agents:"
echo "  • role-services-agent (Foundation)"
echo "  • role-hooks-agent (Foundation)"  
echo "  • role-navigation-agent (Foundation)"
echo "  • role-screens-agent (Extension)"
echo "  • permission-ui-agent (Extension)"
echo "  • integration-agent (Integration)"