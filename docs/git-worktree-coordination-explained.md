# Git Worktree Coordination: The Missing Link Explained

**Key Insight**: Git worktrees are **isolated working directories** - they DON'T automatically share uncommitted changes!

## The Fundamental Problem

```bash
# Main repo state
main/
├── .git/              # Shared git database
├── src/
│   └── services/      # Empty
└── src/
    └── hooks/         # Empty

# Create worktrees
git worktree add service-worktree
git worktree add hooks-worktree

# Now we have:
service-worktree/      # Isolated copy
├── .git              # Pointer to main/.git
└── src/services/     # Empty

hooks-worktree/        # Another isolated copy
├── .git              # Pointer to main/.git
└── src/hooks/        # Empty
```

## The Coordination Challenge

### What DOESN'T Work

```bash
# Agent 1 in service-worktree
cd service-worktree
echo "export class UserService {}" > src/services/user.ts

# Agent 2 in hooks-worktree  
cd hooks-worktree
ls src/services/
# EMPTY! Agent 2 cannot see user.ts
```

**Why?** Each worktree has its own isolated working directory. Changes in one worktree are NOT visible to another until they're committed and pulled!

## Solution Patterns

### Pattern 1: Commit & Pull (Git-Based)

```bash
# Agent 1 (Services) 
cd service-worktree
echo "export class UserService {}" > src/services/user.ts
git add src/services/user.ts
git commit -m "Add UserService"
git push origin service-branch

# Agent 2 (Hooks) - must pull changes
cd hooks-worktree
git pull origin service-branch  # Or merge/rebase
# NOW src/services/user.ts exists here
import { UserService } from '../services/user'  # Works!
```

**Problems**:
- Requires push/pull coordination
- Pollutes git history with WIP commits
- Complex branch management

### Pattern 2: Shared Volume (File-Based) ✅ RECOMMENDED

```bash
# Docker volume structure
/shared/
├── artifacts/        # Built files go here
├── handoffs/        # Coordination messages
└── status/          # Progress tracking

# Agent 1 (Services)
cd service-worktree
echo "export class UserService {}" > src/services/user.ts
# Copy to shared volume
cp src/services/user.ts /shared/artifacts/services/user.ts
echo "UserService ready" > /shared/handoffs/services-complete.md

# Agent 2 (Hooks)
# Check handoff
if [ -f /shared/handoffs/services-complete.md ]; then
  # Copy from shared volume
  cp /shared/artifacts/services/user.ts src/services/user.ts
  # Now can use it
  echo "import { UserService } from '../services/user'" > src/hooks/useUser.ts
fi
```

### Pattern 3: Sequential in Same Worktree (Simple)

```bash
# Single worktree, sequential execution
cd my-worktree

# Step 1: Services
echo "export class UserService {}" > src/services/user.ts

# Step 2: Hooks (same worktree, files already there)
echo "import { UserService } from '../services/user'" > src/hooks/useUser.ts

# Step 3: Screens (everything available)
echo "import { useUser } from '../hooks/useUser'" > src/screens/UserScreen.tsx

# Finally commit everything
git add .
git commit -m "Complete feature implementation"
```

## Real-World Example: Phase 3B Marketing

Let's trace how Phase 3B SHOULD have worked:

### Initial Setup
```bash
# Host creates worktrees
git worktree add marketing-schema
git worktree add marketing-services  
git worktree add marketing-hooks

# Mount in containers with shared volume
docker run -v ./marketing-schema:/workspace \
           -v ./shared:/shared \
           marketing-schema-agent

docker run -v ./marketing-services:/workspace \
           -v ./shared:/shared \
           marketing-services-agent
```

### Execution Flow

**Schema Agent**:
```typescript
// In marketing-schema worktree
// Creates src/types/marketing.ts
export interface MarketingCampaign {
  id: string;
  name: string;
}

// Copies to shared
cp src/types/marketing.ts /shared/artifacts/types/marketing.ts

// Writes handoff
echo "Schema complete: marketing.ts" > /shared/handoffs/schema-done.md
```

**Services Agent**:
```typescript
// Waits for handoff
while [ ! -f /shared/handoffs/schema-done.md ]; do sleep 5; done

// Copies schema from shared to its worktree
mkdir -p src/types
cp /shared/artifacts/types/marketing.ts src/types/marketing.ts

// Now can import and use
import { MarketingCampaign } from '../types/marketing';

export class MarketingService {
  async getCampaign(): Promise<MarketingCampaign> {
    // Implementation
  }
}

// Copies service to shared
cp src/services/marketing.ts /shared/artifacts/services/marketing.ts
echo "Service complete" > /shared/handoffs/service-done.md
```

**Hooks Agent**:
```typescript
// Waits for both
while [ ! -f /shared/handoffs/service-done.md ]; do sleep 5; done

// Copies BOTH from shared
cp -r /shared/artifacts/types src/
cp -r /shared/artifacts/services src/

// Now has everything
import { MarketingService } from '../services/marketing';
import { MarketingCampaign } from '../types/marketing';

export function useMarketingCampaign() {
  // Can use both!
}
```

### Final Integration
```bash
# After all agents done, integrate
git worktree add integration main
cd integration

# Copy all artifacts
cp -r /shared/artifacts/types/* src/types/
cp -r /shared/artifacts/services/* src/services/
cp -r /shared/artifacts/hooks/* src/hooks/

# Single commit with everything
git add .
git commit -m "feat: Complete marketing implementation"
git push
```

## Why Phase 1 Worked Without This Complexity

**Single Agent = Single Worktree = No Coordination Needed!**

```bash
# Phase 1: One agent, one worktree
cd role-complete-worktree

# Creates services
vim src/services/roleService.ts

# Creates hooks (services already in same worktree)
vim src/hooks/useRole.ts

# Creates screens (everything in same worktree)
vim src/screens/RoleScreen.tsx

# One commit with everything
git add .
git commit -m "Complete role implementation"
```

## The Architecture Decision

### Multi-Agent with Worktrees Requires:
1. **Shared volume** for artifact exchange
2. **Handoff protocol** for coordination  
3. **Copy operations** between worktrees and shared volume
4. **Final integration** step to combine all work
5. **Complex orchestration** logic

### Single-Agent with Worktree Requires:
1. Just work in the worktree
2. That's it

## Key Takeaway

**Git worktrees provide isolation, NOT automatic sharing!**

You're absolutely correct - worktrees alone don't solve the coordination problem. You need either:
- **Commit/pull cycles** (creates messy history)
- **Shared file volumes** (adds complexity)
- **Single agent approach** (simplest, proven effective)

This is why Phase 1's single-agent approach was so successful - it eliminated the coordination complexity entirely by having one agent own the complete workflow in a single worktree!

---

*The illusion that worktrees magically share files is a common misconception. They share the .git database, but NOT the working directory!*