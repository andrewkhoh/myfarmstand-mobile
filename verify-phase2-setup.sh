#!/bin/bash

# Phase 2 Setup Verification Script
# Checks all components are ready for Docker orchestration

echo "🔍 PHASE 2 SETUP VERIFICATION"
echo "=============================="
echo ""

# Track issues
issues=0

# 1. Check Docker
echo "1. Docker Environment:"
if command -v docker &> /dev/null; then
    echo "   ✅ Docker installed"
    if docker info &> /dev/null; then
        echo "   ✅ Docker daemon running"
    else
        echo "   ❌ Docker daemon not running"
        issues=$((issues + 1))
    fi
else
    echo "   ❌ Docker not installed"
    issues=$((issues + 1))
fi

# 2. Check Docker Compose
echo ""
echo "2. Docker Compose:"
if [ -f "docker-compose.phase2.yml" ]; then
    echo "   ✅ docker-compose.phase2.yml exists"
    
    # Verify volume paths
    echo "   Checking volume mounts:"
    for worktree in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
        if grep -q "../$worktree:/workspace" docker-compose.phase2.yml; then
            echo "      ✅ $worktree mount configured"
        else
            echo "      ❌ $worktree mount missing or incorrect"
            issues=$((issues + 1))
        fi
    done
else
    echo "   ❌ docker-compose.phase2.yml not found"
    issues=$((issues + 1))
fi

# 3. Check Dockerfiles
echo ""
echo "3. Dockerfiles:"
for dockerfile in Dockerfile.orchestrator Dockerfile.agent; do
    if [ -f "$dockerfile" ]; then
        echo "   ✅ $dockerfile exists"
    else
        echo "   ❌ $dockerfile missing"
        issues=$((issues + 1))
    fi
done

# 4. Check Worktrees
echo ""
echo "4. Phase 2 Worktrees:"
for worktree in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
    if [ -d "../$worktree" ]; then
        echo "   ✅ ../$worktree exists"
        
        # Check if it's a valid git worktree
        if [ -f "../$worktree/.git" ]; then
            branch=$(cd "../$worktree" && git branch --show-current 2>/dev/null)
            echo "      Branch: $branch"
        fi
    else
        echo "   ❌ ../$worktree missing"
        issues=$((issues + 1))
    fi
done

# 5. Check Task Files
echo ""
echo "5. Task Files:"
task_count=0
for task in phase2-core-services phase2-extension-services phase2-core-hooks phase2-extension-hooks phase2-schema-other; do
    if [ -f "test-fixes-communication/tasks/$task.json" ]; then
        files=$(grep -c '"src/' "test-fixes-communication/tasks/$task.json" 2>/dev/null || echo "0")
        echo "   ✅ $task.json ($files files)"
        task_count=$((task_count + files))
    else
        echo "   ❌ $task.json missing"
        issues=$((issues + 1))
    fi
done
echo "   Total files to fix: $task_count"

# 6. Check Claude Code SDK Scripts
echo ""
echo "6. Claude Code SDK Scripts:"
for script in scripts/claude-agent-executor.ts scripts/orchestrate-phase2.ts; do
    if [ -f "$script" ]; then
        echo "   ✅ $script exists"
    else
        echo "   ❌ $script missing"
        issues=$((issues + 1))
    fi
done

# 7. Check Reference Documents
echo ""
echo "7. Reference Pattern Documents:"
for ref in "src/test/service-test-pattern (REFERENCE).md" "src/test/hook-test-pattern-guide (REFERENCE).md"; do
    if [ -f "$ref" ]; then
        lines=$(wc -l < "$ref")
        echo "   ✅ $(basename "$ref") ($lines lines)"
    else
        echo "   ❌ $(basename "$ref") missing"
        issues=$((issues + 1))
    fi
done

# 8. Check Communication Directory
echo ""
echo "8. Communication Structure:"
if [ -d "test-fixes-communication" ]; then
    echo "   ✅ test-fixes-communication exists"
    for subdir in tasks prompts progress handoffs blockers; do
        if [ -d "test-fixes-communication/$subdir" ]; then
            echo "      ✅ $subdir/"
        else
            echo "      ⚠️  $subdir/ missing (will be created)"
        fi
    done
else
    echo "   ❌ test-fixes-communication missing"
    issues=$((issues + 1))
fi

# 9. Check Environment
echo ""
echo "9. Environment Variables:"
if [ -n "$CLAUDE_API_KEY" ]; then
    echo "   ✅ CLAUDE_API_KEY is set"
else
    echo "   ⚠️  CLAUDE_API_KEY not set (will run in simulation mode)"
fi

# 10. Current Infrastructure Status
echo ""
echo "10. Current Infrastructure Status:"
if [ -f "./phase2-infrastructure-audit.sh" ]; then
    adoption=$(./phase2-infrastructure-audit.sh 2>/dev/null | grep "OVERALL" | grep -o '[0-9]*%' | head -1)
    echo "   Current adoption: ${adoption:-unknown}"
    echo "   Target: 100%"
else
    echo "   ⚠️  Audit script not found"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════════"
if [ $issues -eq 0 ]; then
    echo "✅ VERIFICATION PASSED - Ready for Phase 2!"
    echo ""
    echo "Next steps:"
    echo "1. Set CLAUDE_API_KEY if not set:"
    echo "   export CLAUDE_API_KEY=your-key-here"
    echo ""
    echo "2. Launch Docker orchestration:"
    echo "   ./launch-docker-phase2.sh"
    echo ""
    echo "3. Monitor progress:"
    echo "   ./scripts/monitor-phase2.sh"
else
    echo "❌ VERIFICATION FAILED - $issues issues found"
    echo ""
    echo "Fix the issues above, then run this script again."
    echo ""
    echo "Quick fixes:"
    echo "- Create worktrees: git worktree add ../phase2-{name} -b phase2-{name} main"
    echo "- Generate tasks: ./test-fixes-communication/generate-phase2-tasks.sh"
    echo "- Start Docker: docker daemon start (or Docker Desktop)"
fi
echo "═══════════════════════════════════════════════════════════════════"