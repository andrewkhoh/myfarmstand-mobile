# Multi-Agent Monitoring System Pattern

## Overview
This document outlines the best practices and patterns for implementing a robust monitoring system for containerized multi-agent workflows with self-correction capabilities.

## Architecture Components

### 1. Status Files (JSON)
- **Location**: `/shared/status/{agent-name}.json`
- **Purpose**: Structured, machine-readable agent state
- **Update Frequency**: Every 60 seconds (heartbeat) + on significant events

### 2. Progress Files (Markdown)
- **Location**: `/shared/progress/{agent-name}.md`
- **Purpose**: Human-readable activity log
- **Update Frequency**: Real-time as events occur

### 3. Log Files
- **Location**: `/shared/logs/{agent-name}.log`
- **Purpose**: Detailed debugging information
- **Update Frequency**: Continuous

## Critical Implementation Pattern

### The Initialization Order Problem
**Problem**: Background processes that update status files may start before variables are initialized, causing empty file creation and cascading failures.

**Solution**: Initialize status files synchronously BEFORE starting any background processes.

```bash
#!/bin/bash
# entrypoint.sh - Correct initialization order

# 1. Set up paths and variables FIRST
AGENT_NAME="${AGENT_NAME}"
STATUS_FILE="/shared/status/${AGENT_NAME}.json"
RESTART_COUNT_FILE="/shared/restart_counters/${AGENT_NAME}_count"

# 2. Export critical variables IMMEDIATELY
export RESTART_COUNT=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo 0)
export MAX_RESTARTS=${MAX_RESTARTS:-3}

# 3. Create initial status file BEFORE any async operations
jq -n --arg agent "$AGENT_NAME" \
      --arg status "initializing" \
      --arg startTime "$(date -Iseconds)" \
      --arg restartCycle "$((RESTART_COUNT + 1))" \
      --arg maxRestarts "$MAX_RESTARTS" \
      '{
        agent: $agent,
        status: $status,
        startTime: $startTime,
        restartCycle: ($restartCycle | tonumber),
        maxRestarts: ($maxRestarts | tonumber),
        heartbeat: $startTime,
        lastUpdate: $startTime,
        filesModified: [],
        errors: [],
        testsPass: 0
      }' > "$STATUS_FILE"

# 4. NOW safe to start background heartbeat
(
    while true; do
        sleep 60
        jq --arg heartbeat "$(date -Iseconds)" \
           '.heartbeat = $heartbeat' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && \
           mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    done
) &
```

## Status File Schema

```json
{
  "agent": "agent-name",
  "status": "initializing|running|waiting|completed|failed",
  "startTime": "ISO-8601 timestamp",
  "restartCycle": 1,
  "maxRestarts": 3,
  "heartbeat": "ISO-8601 timestamp",
  "lastUpdate": "ISO-8601 timestamp",
  "filesModified": ["array", "of", "files"],
  "errors": ["array", "of", "errors"],
  "testsPass": 0,
  "reason": "optional completion/failure reason",
  "experimentComplete": true  // when max restarts reached
}
```

## Update Function Pattern

```bash
update_status() {
    local key="$1"
    local value="$2"
    
    # Defensive: Check file exists and has content
    if [ ! -s "$STATUS_FILE" ]; then
        echo "Warning: Status file empty/missing, recreating..." >> "$LOG_FILE"
        # Recreate with safe defaults
        jq -n --arg agent "$AGENT_NAME" \
              --arg status "running" \
              --arg startTime "$(date -Iseconds)" \
              --arg restartCycle "$((${RESTART_COUNT:-0} + 1))" \
              --arg maxRestarts "${MAX_RESTARTS:-3}" \
              '{ agent: $agent, status: $status, startTime: $startTime,
                 restartCycle: ($restartCycle | tonumber),
                 maxRestarts: ($maxRestarts | tonumber),
                 lastUpdate: $startTime, filesModified: [],
                 errors: [], testsPass: 0 }' > "$STATUS_FILE"
    fi
    
    # Update specific fields
    if [ "$key" = "filesModified" ] || [ "$key" = "errors" ]; then
        # Append to arrays
        jq --arg key "$key" --arg value "$value" --arg timestamp "$(date -Iseconds)" \
           '.[$key] += [$value] | .lastUpdate = $timestamp' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && \
           mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    else
        # Update scalar values
        jq --arg key "$key" --arg value "$value" --arg timestamp "$(date -Iseconds)" \
           '.[$key] = $value | .lastUpdate = $timestamp' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && \
           mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    fi
}
```

## Monitoring Dashboard Implementation

### Express.js Dashboard Server

```javascript
// dashboard.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const SHARED_DIR = '/shared';
const app = express();

async function readJSON(filepath) {
    try {
        const content = await fs.readFile(filepath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        return null;
    }
}

async function getAgentStatuses() {
    const statusDir = path.join(SHARED_DIR, 'status');
    const agents = {};
    
    try {
        const files = await fs.readdir(statusDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const agentName = file.replace('.json', '');
                agents[agentName] = await readJSON(path.join(statusDir, file));
            }
        }
    } catch (e) {
        console.error('Error reading status files:', e);
    }
    
    return agents;
}

// API endpoint
app.get('/api/status', async (req, res) => {
    const statuses = await getAgentStatuses();
    res.json(statuses);
});

// HTML dashboard
app.get('/', async (req, res) => {
    const agents = await getAgentStatuses();
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Multi-Agent Monitor</title>
        <meta http-equiv="refresh" content="10">
        <style>
            body { font-family: monospace; background: #1a1a1a; color: #0f0; }
            .agent-card {
                border: 1px solid #0f0;
                padding: 10px;
                margin: 10px;
                position: relative;
            }
            .restart-badge {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #333;
                padding: 5px 10px;
                border: 1px solid #0f0;
            }
            .heartbeat {
                color: #ff0;
            }
            .status-running { color: #0f0; }
            .status-completed { color: #00f; }
            .status-failed { color: #f00; }
        </style>
    </head>
    <body>
        <h1>Multi-Agent Monitoring Dashboard</h1>`;
    
    for (const [name, status] of Object.entries(agents)) {
        if (!status) continue;
        
        const timeSinceHeartbeat = status.heartbeat ? 
            Math.floor((Date.now() - new Date(status.heartbeat)) / 1000) : 999;
        
        html += `
        <div class="agent-card">
            <div class="restart-badge">Cycle ${status.restartCycle}/${status.maxRestarts}</div>
            <h3>${name}</h3>
            <p class="status-${status.status}">Status: ${status.status}</p>
            <p class="heartbeat">❤️ Heartbeat: ${timeSinceHeartbeat}s ago</p>
            <p>Files Modified: ${status.filesModified?.length || 0}</p>
            <p>Tests Passed: ${status.testsPass || 0}</p>
            <p>Errors: ${status.errors?.length || 0}</p>
        </div>`;
    }
    
    html += `
        <div style="margin-top: 20px; padding: 10px; border: 1px solid #666;">
            <h3>Experiment Status</h3>
            <p>Total Agents: ${Object.keys(agents).length}</p>
            <p>Running: ${Object.values(agents).filter(a => a?.status === 'running').length}</p>
            <p>Completed: ${Object.values(agents).filter(a => a?.status === 'completed').length}</p>
        </div>
    </body>
    </html>`;
    
    res.send(html);
});

app.listen(3001, () => {
    console.log('Monitoring dashboard running on http://localhost:3001');
});
```

## Self-Correction Workflow Patterns

### 1. Restart Counter Management

```bash
# Check restart count at startup
if [ "$RESTART_COUNT" -ge "$MAX_RESTARTS" ]; then
    echo "✅ Max restarts reached ($MAX_RESTARTS). Entering maintenance mode."
    
    # Update status to show completion
    jq -n --arg agent "$AGENT_NAME" \
       --arg status "completed" \
       --arg reason "max_restarts_reached" \
       --arg cycles "$MAX_RESTARTS" \
       '{
         agent: $agent,
         status: $status,
         reason: $reason,
         cycles: $cycles,
         experimentComplete: true
       }' > "$STATUS_FILE"
    
    # Keep container alive with periodic heartbeats
    while true; do
        sleep 60
        jq --arg heartbeat "$(date -Iseconds)" \
           '.heartbeat = $heartbeat' \
           "$STATUS_FILE" > "${STATUS_FILE}.tmp" && \
           mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    done
else
    # Increment counter for next restart
    echo $((RESTART_COUNT + 1)) > "$RESTART_COUNT_FILE"
    # Continue with normal agent work...
fi
```

### 2. Feedback Loop Integration

```bash
# Check for feedback from previous iterations
check_feedback() {
    local feedback_dir="/shared/feedback"
    local agent_name="${AGENT_NAME}"
    
    if [ -f "$feedback_dir/${agent_name}-improvements.md" ]; then
        echo "📋 Processing feedback from integration agent..."
        # Apply improvements...
        update_status "status" "applying_feedback"
    fi
}
```

## Docker Compose Configuration

```yaml
services:
  agent:
    environment:
      - AGENT_NAME=role-services
      - MAX_RESTARTS=3  # Configurable max cycles
    volumes:
      - ./volumes/communication:/shared:rw
    restart: unless-stopped  # Enables auto-restart
    healthcheck:
      test: ["CMD", "test", "-f", "/shared/status/${AGENT_NAME}.json"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Best Practices

### 1. **Defensive Programming**
- Always check if files exist before reading
- Use default values for all variables
- Validate JSON before updates
- Log all errors for debugging

### 2. **Atomic Operations**
- Use temporary files with mv for atomic updates
- Never directly modify status files
- Always check command success before proceeding

### 3. **Visibility**
- Heartbeats every 60 seconds minimum
- Log significant events immediately
- Maintain both human-readable and machine-readable formats
- Include timestamps on everything

### 4. **Error Recovery**
- Recreate status files if corrupted
- Fallback to progress files if status unavailable
- Keep containers running even after errors
- Log recovery attempts

### 5. **Performance Considerations**
- Batch status updates when possible
- Use jq for efficient JSON manipulation
- Avoid excessive file I/O
- Keep status files small (<10KB)

## Common Pitfalls to Avoid

1. **Race Conditions**: Starting background processes before initialization
2. **Empty Files**: Not checking if jq commands produce output
3. **Variable Scope**: Forgetting to export variables for subshells
4. **File Permissions**: Not ensuring write permissions on shared volumes
5. **JSON Corruption**: Not validating JSON before updates
6. **Silent Failures**: Not logging when operations fail
7. **Orphaned Processes**: Not cleaning up background tasks on exit

## Testing the Monitoring System

```bash
# Test status file creation
docker exec agent-name cat /shared/status/agent-name.json | jq '.'

# Test heartbeat updates
docker exec agent-name bash -c 'watch -n 1 cat /shared/status/agent-name.json | jq .heartbeat'

# Test dashboard API
curl http://localhost:3001/api/status | jq '.'

# Monitor logs
docker-compose logs -f agent-name

# Check restart cycles
for agent in role-services role-hooks role-navigation; do
  echo "$agent: $(docker exec ${agent}-agent cat /shared/restart_counters/${agent}_count 2>/dev/null || echo 0)"
done
```

## Conclusion

A robust monitoring system for multi-agent workflows requires:
1. **Correct initialization order** (variables → files → processes)
2. **Defensive programming** at every step
3. **Multiple data formats** for different consumers
4. **Atomic operations** for data integrity
5. **Clear visibility** into agent state and progress

Following these patterns ensures reliable monitoring even during self-correction cycles and container restarts.