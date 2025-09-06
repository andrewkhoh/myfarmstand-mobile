# Phase 1 vs Phase 2 Docker Setup Comparison

## Summary
Phase 2 follows Phase 1 patterns correctly with these key elements:

## ✅ Correct Implementation

### 1. **Restart Mechanism**
- **Phase 1**: `restart: unless-stopped` - Container restarts after exit
- **Phase 2**: `restart: unless-stopped` - CORRECT! Same pattern
- **How it works**: 
  - Entrypoint exits with `exit 0` after Claude completes work
  - Docker automatically restarts container (unless manually stopped)
  - On restart, entrypoint reads counter from persistent file
  - After MAX_RESTARTS, enters infinite loop (maintenance mode)

### 2. **Entrypoint Pattern**
- **Phase 1**: `entrypoint-enhanced.sh`
  - Manages restart counter
  - Runs Claude once per cycle
  - Exits normally to trigger restart
  - After MAX_RESTARTS, infinite loop prevents further restarts
  
- **Phase 2**: `phase2-entrypoint-enhanced.sh`
  - Same restart mechanism as Phase 1
  - **Addition**: TDD cycles with test running
  - **Addition**: Dependency checking between layers
  - **Addition**: 85% test pass rate target

### 3. **Docker Compose Structure**
Both use identical patterns:
```yaml
restart: unless-stopped  # Triggers self-improvement cycles
volumes:
  - ./volumes/{project-name}:/workspace:rw
  - ./volumes/communication:/shared:rw
  - ~/.claude:/home/agent/.claude:rw  # Shared auth
```

### 4. **Workspace Paths**
- **Phase 1**: `docker/volumes/phase1-role-foundation-{agent}`
- **Phase 2**: `docker/volumes/phase2-inventory-{agent}` (after fix)

## Key Insights

### The Self-Improvement Cycle Flow:
1. Container starts → entrypoint runs
2. Checks restart counter from persistent file
3. If counter < MAX_RESTARTS:
   - Increment counter
   - Run Claude with prompt
   - Exit 0 (success)
   - Docker restarts container → Go to step 1
4. If counter >= MAX_RESTARTS:
   - Enter infinite loop (maintenance mode)
   - Container stays running but idle
   - No more restarts

### Why `restart: unless-stopped` is Correct:
- **NOT** `restart: on-failure` - We want restart on SUCCESS too!
- **NOT** `restart: always` - We want manual control to stop
- **PERFECT** `restart: unless-stopped` - Restarts on exit, stops when we want

## Phase 2 Enhancements Over Phase 1

### TDD Integration (Phase 2 only):
1. Run tests before Claude → identify failures
2. Claude implements fixes based on test failures
3. Run tests after Claude → verify improvements
4. Track test metrics across cycles
5. Target 85% pass rate for handoff

### Dependency Management (Phase 2 only):
- Schema layer runs first
- Services wait for schema completion
- Hooks wait for services completion
- Screens wait for hooks completion
- Integration validates all layers

## Files Involved

### Phase 1:
- `docker/docker-compose-phase1.yml`
- `docker/agents/entrypoint-enhanced.sh`
- `docker/agents/Dockerfile`
- `launch-phase1-workflow.sh`

### Phase 2:
- `docker/docker-compose-phase2.yml`
- `docker/agents/phase2-entrypoint-enhanced.sh`
- `docker/agents/Dockerfile` (reused from Phase 1)
- `scripts/launch-phase2.sh`

## Status
✅ Phase 2 correctly implements Phase 1 patterns
✅ Restart mechanism properly configured
✅ Entrypoint handles self-improvement cycles
✅ Docker compose follows established patterns
✅ Ready for launch