#!/bin/bash

# Multi-Agent Project Generator
# Generates project-specific infrastructure from templates and configuration

set -euo pipefail

# Check if config file provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <config-file.yml>"
    echo ""
    echo "Example configs:"
    echo "  docker/configs/tdd-phase-2-inventory.yml"
    echo "  docker/configs/phase1-roles.yml"
    exit 1
fi

CONFIG_FILE="$1"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    exit 1
fi

echo "🚀 Multi-Agent Project Generator"
echo "================================"
echo "📋 Config: $CONFIG_FILE"
echo ""

# Basic YAML parsing (handles nested project structure)
get_config_value() {
    local key="$1"
    local file="$2"
    # Look for key under project section, strip comments and quotes
    awk "/^project:/ {found=1; next} found && /^[a-z]/ && !/^  / {found=0} found && /^  ${key}:/ {
        gsub(/^  ${key}: /, \"\"); 
        gsub(/\"/, \"\");
        gsub(/'/, \"\");
        gsub(/#.*$/, \"\");  # Remove comments
        gsub(/^[[:space:]]+|[[:space:]]+$/, \"\");  # Trim whitespace
        print
    }" "$file"
}

get_agent_field() {
    local agent_name="$1"
    local field="$2"
    local file="$3"
    
    # Find agent section and extract field
    awk "
    /^  - name: \"?${agent_name}\"?/ {
        found=1
        next
    }
    found && /^  - name:/ {
        found=0
        next
    }
    found && /^    ${field}:/ {
        gsub(/^    ${field}: /, \"\")
        gsub(/\"/, \"\")
        gsub(/'/, \"\")
        gsub(/^ +/, \"\")
        gsub(/ +$/, \"\")
        print
        found=0
    }
    " "$file"
}

get_agent_depends_on() {
    local agent_name="$1"
    local file="$2"
    
    # Find the agent block and extract depends_on array
    # This handles the format: depends_on: ["dep1", "dep2"]
    local deps=$(awk -v agent="$agent_name" '
    /^  - name:/ {
        # Check if this line contains our agent (with or without quotes)
        name_part = $0
        gsub(/^  - name:[ ]*/, "", name_part)
        gsub(/["'\'']/, "", name_part)
        gsub(/[ ]*$/, "", name_part)
        if (name_part == agent) {
            found=1
        } else {
            found=0
        }
        next
    }
    found && /^    depends_on:[ ]*\[/ {
        # Extract the array content
        line = $0
        gsub(/^.*\[/, "", line)
        gsub(/\].*$/, "", line)
        gsub(/["'\'']/, "", line)
        # Keep commas but remove extra spaces
        gsub(/[ ]+/, "", line)
        print line
        found=0
    }
    ' "$file")
    
    echo "$deps"
}

# Get workspace strategy for an agent (layer, unified, or isolated)
get_agent_workspace_strategy() {
    local agent_name="$1"
    local file="$2"
    
    # First check if explicitly defined in config
    local strategy=$(get_agent_field "$agent_name" "workspace_strategy" "$file")
    
    if [ -n "$strategy" ]; then
        echo "$strategy"
    else
        # Check for global workspace strategy in config (defaults to unified)
        local global_strategy=$(get_config_value "workspace_strategy" "$file")
        if [ -n "$global_strategy" ]; then
            echo "$global_strategy"
        else
            # Default to unified workspace for better TDD workflow
            # This ensures test writers and implementers share the same workspace
            echo "unified"
        fi
    fi
}

# Get the base layer name from an agent name
get_layer_name() {
    local agent_name="$1"
    
    # Remove -tests, -impl suffixes to get layer name
    if [[ "$agent_name" =~ ^(.+)-(tests|impl)$ ]]; then
        echo "${BASH_REMATCH[1]}"
    else
        echo "$agent_name"
    fi
}

# Extract project configuration
PROJECT_NAME=$(get_config_value "name" "$CONFIG_FILE")
PROJECT_PREFIX=$(get_config_value "prefix" "$CONFIG_FILE")
PROJECT_DESCRIPTION=$(get_config_value "description" "$CONFIG_FILE")
MAX_RESTARTS=$(get_config_value "max_restarts" "$CONFIG_FILE")
TEST_PASS_TARGET=$(get_config_value "test_pass_target" "$CONFIG_FILE")
MONITORING_PORT=$(get_config_value "monitoring_port" "$CONFIG_FILE")

echo "📊 Project Configuration:"
echo "  Name: $PROJECT_NAME"
echo "  Prefix: $PROJECT_PREFIX"
echo "  Description: $PROJECT_DESCRIPTION"
echo "  Max Restarts: $MAX_RESTARTS"
echo "  Test Target: $TEST_PASS_TARGET%"
echo "  Monitoring Port: $MONITORING_PORT"

# Determine global workspace strategy
GLOBAL_WORKSPACE_STRATEGY=$(get_config_value "workspace_strategy" "$CONFIG_FILE")
if [ -z "$GLOBAL_WORKSPACE_STRATEGY" ]; then
    GLOBAL_WORKSPACE_STRATEGY="unified"
fi
echo "  Workspace Strategy: $GLOBAL_WORKSPACE_STRATEGY (default: unified)"
echo ""

# Extract agent list
AGENTS=()
while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*name:[[:space:]]*(.+)$ ]]; then
        agent_name=$(echo "${BASH_REMATCH[1]}" | tr -d '"' | tr -d "'")
        AGENTS+=("$agent_name")
    fi
done < "$CONFIG_FILE"

echo "🤖 Agents (${#AGENTS[@]}):"
for agent in "${AGENTS[@]}"; do
    agent_type=$(get_agent_field "$agent" "type" "$CONFIG_FILE")
    agent_depends=$(get_agent_depends_on "$agent" "$CONFIG_FILE")
    echo "  - $agent ($agent_type) depends_on: [$agent_depends]"
done
echo ""

# Create project directory
PROJECT_DIR="docker/projects/$PROJECT_PREFIX"
echo "📁 Creating project directory: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR"

# Function to replace template variables
replace_template_vars() {
    local input_file="$1"
    local output_file="$2"
    
    # Create agent list string
    local agent_list=""
    for i in "${!AGENTS[@]}"; do
        if [ $i -eq 0 ]; then
            agent_list="\"${AGENTS[i]}\""
        else
            agent_list="${agent_list}\n    \"${AGENTS[i]}\""
        fi
    done
    
    # Create project separator
    local separator=$(printf '=%.0s' {1..60})
    
    # Replace all variables (escape special characters)
    local escaped_project_name=$(printf '%s\n' "$PROJECT_NAME" | sed 's/[[\.*^$()+?{|]/\\&/g')
    local escaped_project_prefix=$(printf '%s\n' "$PROJECT_PREFIX" | sed 's/[[\.*^$()+?{|]/\\&/g')
    
    sed \
        -e "s/{{PROJECT_NAME}}/${escaped_project_name}/g" \
        -e "s/{{PROJECT_PREFIX}}/${escaped_project_prefix}/g" \
        -e "s/{{PROJECT_DESCRIPTION}}/${PROJECT_DESCRIPTION}/g" \
        -e "s/{{MAX_RESTARTS_VALUE}}/${MAX_RESTARTS}/g" \
        -e "s/{{TARGET_PASS_RATE_VALUE}}/${TEST_PASS_TARGET}/g" \
        -e "s/{{MONITORING_PORT_VALUE}}/${MONITORING_PORT}/g" \
        -e "s/{{PROJECT_SEPARATOR}}/${separator}/g" \
        -e "s/{{AGENT_LIST}}/${agent_list}/g" \
        "$input_file" > "$output_file"
}

# Generate setup script
echo "🔧 Generating setup script..."
replace_template_vars "docker/templates/setup-project.template.sh" "$PROJECT_DIR/setup.sh"
chmod +x "$PROJECT_DIR/setup.sh"

# Generate stop script  
echo "🛑 Generating stop script..."
replace_template_vars "docker/templates/stop-project.template.sh" "$PROJECT_DIR/stop.sh"
chmod +x "$PROJECT_DIR/stop.sh"

# Copy entrypoint script (no template substitution needed - uses Docker ENV)
echo "📋 Copying entrypoint script..."
cp "docker/agents/entrypoint-generic.sh" "$PROJECT_DIR/entrypoint.sh"
chmod +x "$PROJECT_DIR/entrypoint.sh"

# Generate docker-compose.yml
echo "🐳 Generating docker-compose.yml..."

# Start with template header
cat > "$PROJECT_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
EOF

# Generate each agent section
for agent in "${AGENTS[@]}"; do
    agent_type=$(get_agent_field "$agent" "type" "$CONFIG_FILE")
    test_command=$(get_agent_field "$agent" "test_command" "$CONFIG_FILE")
    prompt_file=$(get_agent_field "$agent" "prompt_file" "$CONFIG_FILE")
    depends_on=$(get_agent_depends_on "$agent" "$CONFIG_FILE")
    
    # Phase 2 approach: Each agent gets its own workspace
    workspace_volume="${PROJECT_PREFIX}-${agent}"
    
    echo "  # $agent agent" >> "$PROJECT_DIR/docker-compose.yml"
    
    cat >> "$PROJECT_DIR/docker-compose.yml" << EOF
  ${agent}-agent:
    build: 
      context: ../../agents
      dockerfile: Dockerfile
    container_name: ${agent}-agent
    environment:
      - "AGENT_NAME=${agent}"
      - "AGENT_TYPE=${agent_type}"
      - "PROJECT_NAME=${PROJECT_NAME}"
      - "PROJECT_DESCRIPTION=${PROJECT_DESCRIPTION}"
      - "MAX_RESTARTS=${MAX_RESTARTS}"
      - "TARGET_PASS_RATE=${TEST_PASS_TARGET}"
      - "TEST_COMMAND=${test_command}"
      - "AGENT_PROMPT_FILE=/prompts/${prompt_file}"
      - "DEBUG=\${DEBUG:-false}"
      - "FRESH_START=\${FRESH_START:-false}"
EOF

    if [ -n "$depends_on" ]; then
        echo "      - \"DEPENDS_ON=${depends_on}\"" >> "$PROJECT_DIR/docker-compose.yml"
    fi
    
    cat >> "$PROJECT_DIR/docker-compose.yml" << EOF
    volumes:
      - ../../volumes/${workspace_volume}:/workspace:rw
      - ../../../docker/volumes/communication:/shared:rw
      - ../../agents/prompts:/prompts:ro
      - ./entrypoint.sh:/usr/local/bin/entrypoint-enhanced.sh:ro
      - ~/.claude:/home/agent/.claude:rw
    working_dir: /workspace
    entrypoint: ["/usr/local/bin/entrypoint-enhanced.sh"]
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
      - FOWNER
EOF

    # Add docker depends_on if there are dependencies
    if [ -n "$depends_on" ]; then
        echo "    depends_on:" >> "$PROJECT_DIR/docker-compose.yml"
        IFS=',' read -ra DEPS <<< "$depends_on"
        for dep in "${DEPS[@]}"; do
            dep=$(echo "$dep" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')  # Trim whitespace
            echo "      - ${dep}-agent" >> "$PROJECT_DIR/docker-compose.yml"
        done
    fi
    
    echo "" >> "$PROJECT_DIR/docker-compose.yml"
done

# Add authentication container
cat >> "$PROJECT_DIR/docker-compose.yml" << EOF
  # Authentication Container
  ${PROJECT_PREFIX}-auth:
    build:
      context: ../../agents
      dockerfile: Dockerfile
    container_name: ${PROJECT_PREFIX}-auth
    environment:
      - "AGENT_NAME=auth"
      - "PROJECT_NAME=${PROJECT_NAME}"
    volumes:
      - ~/.claude:/home/agent/.claude:rw
    entrypoint: ["sleep", "infinity"]
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL

EOF

# Add monitoring section
cat >> "$PROJECT_DIR/docker-compose.yml" << EOF
  # Monitoring Container
  ${PROJECT_PREFIX}-monitoring:
    build:
      context: ../../monitoring
      dockerfile: Dockerfile
    container_name: ${PROJECT_PREFIX}-monitoring
    environment:
      - PORT=${MONITORING_PORT}
      - PROJECT=${PROJECT_NAME}
    volumes:
      - ../../../docker/volumes/communication:/shared:rw
      - ../../monitoring/analyze-logs.sh:/app/analyze-logs.sh:ro
      - ~/.claude:/home/monitor/.claude:rw
    ports:
      - "${MONITORING_PORT}:${MONITORING_PORT}"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${MONITORING_PORT}/health"]
      interval: 30s
      timeout: 10s
      retries: 3

# Networks and volumes
networks:
  default:
    name: ${PROJECT_PREFIX}-network
    external: true

volumes:
  ${PROJECT_PREFIX}-data:
    driver: local
EOF

# Entrypoint already generated with proper template processing above

# Validation: Check that all templates were properly substituted
echo "🔍 Validating template substitution..."
VALIDATION_ERRORS=0

# Check for remaining placeholders in generated files (skip entrypoint.sh - it uses runtime ENV)
for file in "$PROJECT_DIR/setup.sh" "$PROJECT_DIR/stop.sh" "$PROJECT_DIR/docker-compose.yml"; do
    if [ -f "$file" ]; then
        # Check for common unsubstituted patterns (looking for literal placeholder strings)
        # Note: PROJECT_NAME="PROJECT_NAME" would be bad, but PROJECT_NAME="${PROJECT_NAME}" is fine
        if grep -E '\{\{[A-Z_]+\}\}' "$file" > /dev/null 2>&1; then
            echo "❌ ERROR: Unsubstituted placeholders found in $file:"
            grep -E '\{\{[A-Z_]+\}\}' "$file" | head -5
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
    else
        echo "❌ ERROR: Expected file not generated: $file"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
done

# Verify entrypoint.sh exists (but don't validate contents - it uses runtime ENV)
if [ ! -f "$PROJECT_DIR/entrypoint.sh" ]; then
    echo "❌ ERROR: entrypoint.sh not generated"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
else
    echo "✅ entrypoint.sh copied (uses Docker ENV at runtime)"
fi

if [ $VALIDATION_ERRORS -gt 0 ]; then
    echo ""
    echo "❌ Template generation failed with $VALIDATION_ERRORS errors!"
    echo "   Please check the template substitution patterns."
    exit 1
fi

echo "✅ All templates properly substituted!"
echo ""
echo "✅ Project $PROJECT_NAME generated successfully!"
echo ""
echo "📁 Generated files:"
echo "  $PROJECT_DIR/setup.sh"
echo "  $PROJECT_DIR/stop.sh" 
echo "  $PROJECT_DIR/docker-compose.yml"
echo "  $PROJECT_DIR/entrypoint.sh"
echo ""
echo "🚀 To launch:"
echo "  cd $PROJECT_DIR"
echo "  ./setup.sh"
echo "  docker-compose up -d"
echo ""
echo "📊 Monitor at: http://localhost:$MONITORING_PORT"
echo "🛑 Stop with: ./stop.sh"