# Agent Prompt Communication Guidelines

## The Silent Agent Problem

Multi-agent systems can suffer from what we call "Silent Agent Syndrome" - agents that successfully complete work but fail to communicate their progress, results, and decisions effectively. This leads to:
- Generic commit messages like "commit" instead of detailed implementation history
- Integration agents unable to understand what was built
- Lost context about implementation decisions
- No traceability of which agent did what work
- Debugging difficulties when issues arise

## Core Principle: Verbose Progress Reporting

**Every agent prompt must include explicit instructions for communication at three levels:**
1. **Console Output** - Real-time progress visibility
2. **File Artifacts** - Persistent progress records
3. **Git Commits** - Historical documentation

## 📢 Essential Communication Components

### 1. Progress Reporting Requirements

Every agent prompt MUST include explicit progress reporting instructions:

```markdown
## 📢 MANDATORY Progress Reporting

### Report EVERYTHING you do:
- BEFORE starting: Echo what you're about to do
- DURING work: Echo progress milestones
- AFTER completion: Echo results and metrics

### Example Pattern:
```bash
echo "=== Starting Component: $COMPONENT_NAME ==="
echo "Timestamp: $(date)"
echo "Previous state: $PREVIOUS_STATE"

# Do the work
[implementation]

echo "✅ Completed: $COMPONENT_NAME"
echo "Results: $RESULTS"
echo "Metrics: $METRICS"
```
```

### 2. Test Result Capture and Reporting

Agents must capture and report test metrics explicitly:

```markdown
## 📊 Test Result Reporting

### After EVERY test run:
```bash
# Capture test output
TEST_OUTPUT=$(npm run test 2>&1)

# Extract metrics
TOTAL_TESTS=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ total" | grep -oE "[0-9]+")
TESTS_PASS=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ passing" | grep -oE "[0-9]+")
TESTS_FAIL=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ failing" | grep -oE "[0-9]+")
PASS_RATE=$((TESTS_PASS * 100 / TOTAL_TESTS))

# Report metrics
echo "📊 Test Results:"
echo "  Total: $TOTAL_TESTS"
echo "  Passing: $TESTS_PASS"
echo "  Failing: $TESTS_FAIL"
echo "  Pass Rate: ${PASS_RATE}%"

# Write to test results file
cat > /shared/test-results/${AGENT_NAME}-cycle-${CYCLE}.txt << EOF
Test Run: $(date)
Total Tests: $TOTAL_TESTS
Passing: $TESTS_PASS
Failing: $TESTS_FAIL
Pass Rate: ${PASS_RATE}%

Full Output:
$TEST_OUTPUT
EOF
```
```

### 3. Detailed Commit Messages

Every commit must include comprehensive information:

```markdown
## 📝 Git Commit Requirements

### Commit Template:
```bash
git add -A
git commit -m "feat($AGENT_NAME): $COMPONENT implemented

## What Changed
- Component: $COMPONENT_NAME
- Files Modified: $(git diff --cached --numstat | wc -l)
- Lines Added: $(git diff --cached --stat | grep -oE "[0-9]+ insertion" | grep -oE "[0-9]+" | awk '{s+=$1} END {print s}')
- Lines Removed: $(git diff --cached --stat | grep -oE "[0-9]+ deletion" | grep -oE "[0-9]+" | awk '{s+=$1} END {print s}')

## Test Results
- Tests Passing: $TESTS_PASS/$TOTAL_TESTS
- Pass Rate: ${PASS_RATE}%
- New Tests Added: $NEW_TESTS

## Implementation Details
- Pattern Used: [e.g., Repository pattern, Factory pattern]
- Key Decisions: [Why you chose this approach]
- Dependencies: [What this relies on]
- Breaking Changes: [Any API changes]

## Quality Metrics
- Type Coverage: ${TYPE_COVERAGE}%
- Complexity: $COMPLEXITY_SCORE
- Performance: $PERFORMANCE_METRIC

Agent: $AGENT_NAME
Cycle: $CYCLE/$MAX_CYCLES
Timestamp: $(date)"
```
```

### 4. Progress File Updates

Agents must continuously update progress files:

```markdown
## 📄 Progress File Management

### Update progress file after EACH action:
```bash
PROGRESS_FILE="/shared/progress/${AGENT_NAME}.md"

# Function to log progress
log_progress() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "$PROGRESS_FILE"
    echo "$message"  # Also echo to console
}

# Use throughout implementation
log_progress "🚀 Starting implementation of $COMPONENT"
log_progress "📝 Created file: $FILENAME"
log_progress "🧪 Running tests for $COMPONENT"
log_progress "✅ Tests passing: $PASS_RATE%"
log_progress "💾 Committed changes: $COMMIT_HASH"
```
```

### 5. Handoff Documentation

Create comprehensive handoff files for downstream agents:

```markdown
## 🤝 Handoff File Creation

### Write detailed handoff when complete:
```bash
HANDOFF_FILE="/shared/handoffs/${AGENT_NAME}-complete.md"

cat > "$HANDOFF_FILE" << EOF
# ${AGENT_NAME} Implementation Complete

## Summary
- Start Time: $START_TIME
- End Time: $(date)
- Total Duration: $DURATION
- Cycles Used: $CYCLES_USED/$MAX_CYCLES

## Components Implemented
$(for component in "${COMPONENTS[@]}"; do
    echo "- ✅ $component"
done)

## Test Results
- Total Tests: $TOTAL_TESTS
- Passing: $TESTS_PASS
- Failing: $TESTS_FAIL
- Pass Rate: ${PASS_RATE}%
- Coverage: ${COVERAGE}%

## Files Created/Modified
$(git diff --name-status $START_COMMIT..HEAD)

## API Contracts
[Document any APIs created]

## Known Issues
[List any known problems]

## Dependencies for Next Agent
[What the next agent needs to know]

## Performance Metrics
- Build Time: $BUILD_TIME
- Test Execution Time: $TEST_TIME
- Bundle Size: $BUNDLE_SIZE

## Recommendations
[Suggestions for downstream agents]
EOF

echo "✅ Handoff file created: $HANDOFF_FILE"
```
```

## 🎯 Communication Milestones

Agents should report at these key points:

### 1. Initialization
```bash
echo "=== ${AGENT_NAME} Agent Starting ==="
echo "Configuration:"
echo "  Max Cycles: $MAX_CYCLES"
echo "  Target Pass Rate: $TARGET_RATE%"
echo "  Test Command: $TEST_COMMAND"
```

### 2. Dependency Check
```bash
echo "=== Checking Dependencies ==="
for dep in "${DEPENDENCIES[@]}"; do
    if [ -f "/shared/handoffs/${dep}-complete.md" ]; then
        echo "  ✅ $dep ready"
    else
        echo "  ⏳ Waiting for $dep"
    fi
done
```

### 3. Before Each Component
```bash
echo "=== Component: $COMPONENT_NAME ==="
echo "  Type: $COMPONENT_TYPE"
echo "  Complexity: $ESTIMATED_COMPLEXITY"
echo "  Dependencies: ${DEPENDENCIES[*]}"
```

### 4. After Each Component
```bash
echo "✅ Component Complete: $COMPONENT_NAME"
echo "  Files Created: $FILES_CREATED"
echo "  Tests Added: $TESTS_ADDED"
echo "  Pass Rate: ${PASS_RATE}%"
```

### 5. Cycle Completion
```bash
echo "=== Cycle $CYCLE Complete ==="
echo "  Progress: ${COMPONENTS_DONE}/${TOTAL_COMPONENTS}"
echo "  Overall Pass Rate: ${PASS_RATE}%"
echo "  Time Elapsed: $ELAPSED"
```

## 📊 Metrics Collection

Agents must collect and report these metrics:

### Code Metrics
- Files created/modified/deleted
- Lines of code added/removed
- Functions/classes created
- Complexity scores

### Test Metrics
- Total tests
- Passing/failing tests
- Pass rate percentage
- Test execution time
- Coverage percentage

### Performance Metrics
- Build time
- Bundle size
- Memory usage
- Execution time

### Quality Metrics
- Type coverage
- Lint warnings/errors
- Code duplication
- Technical debt introduced

## 🚨 Anti-Patterns to Avoid

### ❌ Silent Work
```bash
# BAD - No communication
implement_component()
run_tests()
git commit -m "done"
```

### ❌ Generic Messages
```bash
# BAD - No context
echo "Working..."
git commit -m "updates"
```

### ❌ Missing Metrics
```bash
# BAD - No measurements
echo "Tests complete"
git commit -m "tests added"
```

### ❌ Binary Status
```bash
# BAD - No detail
echo "Success"
# or
echo "Failed"
```

## ✅ Good Communication Examples

### Component Implementation
```bash
echo "=== Implementing User Authentication Hook ==="
echo "  Strategy: JWT with refresh tokens"
echo "  Dependencies: auth-service, token-utils"
echo "  Estimated LOC: ~200"

# ... implementation ...

echo "✅ User Authentication Hook Complete"
echo "  Files: 3 created, 2 modified"
echo "  Tests: 15 passing (100%)"
echo "  Coverage: 94%"
echo "  Build Impact: +2.3kb"
```

### Problem Resolution
```bash
echo "⚠️ Issue Detected: Type mismatch in inventory schema"
echo "  Expected: InventoryItem[]"
echo "  Received: { items: InventoryItem[] }"
echo "  Resolution: Updating type definitions"

# ... fix implementation ...

echo "✅ Issue Resolved"
echo "  Files Updated: 3"
echo "  Tests Fixed: 7"
echo "  Regression Tests Added: 2"
```

## 📝 Template Sections for Agent Prompts

Every agent prompt should include these communication sections:

```markdown
## 📢 Communication Requirements

You MUST provide verbose output at every stage:
- Echo what you're about to do
- Echo what you're doing
- Echo what you completed
- Echo all metrics and results

## 📊 Progress Reporting

Update these files continuously:
- Progress: `/shared/progress/${AGENT_NAME}.md`
- Status: `/shared/status/${AGENT_NAME}.json`
- Test Results: `/shared/test-results/${AGENT_NAME}-latest.txt`
- Handoff: `/shared/handoffs/${AGENT_NAME}-complete.md`

## 📝 Commit Protocol

Every commit must include:
- What changed (specific components)
- Test results (actual numbers)
- Implementation details (patterns used)
- Quality metrics (coverage, complexity)

## 🎯 Success Reporting

When complete, create comprehensive handoff with:
- Everything you implemented
- All test results
- Any issues encountered
- Recommendations for next agents
```

## Validation Checklist

Before deploying an agent prompt, verify it includes:

- [ ] Explicit echo statements for all actions
- [ ] Test metric capture and reporting
- [ ] Detailed commit message templates
- [ ] Progress file update instructions
- [ ] Handoff file creation template
- [ ] Milestone reporting requirements
- [ ] Error reporting guidelines
- [ ] Metric collection instructions
- [ ] Success criteria reporting
- [ ] Communication file paths

## Benefits of Verbose Communication

1. **Debugging**: Easy to trace what went wrong and when
2. **Integration**: Integration agents can create meaningful commits
3. **Monitoring**: Real-time visibility into agent progress
4. **Audit Trail**: Complete history of implementation decisions
5. **Knowledge Transfer**: Next developer understands the system
6. **Quality Assurance**: Metrics prove quality standards met
7. **Project Management**: Accurate progress tracking
8. **Continuous Improvement**: Data for optimizing agent performance

## Conclusion

The difference between a successful multi-agent system and a failed one often comes down to communication. Agents must be instructed to be verbose, detailed, and consistent in their reporting. Every action should produce visible output, every test should report metrics, and every commit should tell a complete story.

Remember: **Silent agents are failed agents**. If an agent isn't communicating, it might as well not be working.

## Quick Reference

```bash
# The Communication Mantra
echo "Starting..."    # Before
implement_component   # During  
echo "Complete!"      # After
git commit -m "..."   # Document
```

Always: **Report → Work → Report → Commit → Report**