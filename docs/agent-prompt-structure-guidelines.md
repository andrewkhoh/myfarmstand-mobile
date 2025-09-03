# Agent Prompt Structure Guidelines

## Purpose

This document defines the standard structure for multi-agent system prompts. Following this structure ensures agents:
- Understand historical context and learn from failures
- Communicate progress effectively
- Validate work continuously
- Preserve implementation details
- Enable successful integration

## The Complete Agent Prompt Template

Every agent prompt should follow this hierarchical structure with these specific sections:

## 📋 Standard Prompt Structure

### 1. 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**Purpose**: Ensure agents address previous issues before starting new work

**Required Content**:
```markdown
## 🔄 FEEDBACK CHECK (FIRST PRIORITY)

**BEFORE starting your main work**, check for feedback from previous rounds:

```bash
echo "=== CHECKING FOR FEEDBACK ==="
if [ -f "/shared/feedback/${AGENT_NAME}-improvements.md" ]; then
  echo "📋 PRIORITY: Address this feedback first:"
  cat "/shared/feedback/${AGENT_NAME}-improvements.md"
else
  echo "✅ No feedback - proceed with original requirements"
fi
```

If feedback exists, address it FIRST before continuing.
```

### 2. ⚠️ Why This Matters - Learn From History

**Purpose**: Provide context about previous failures and why this approach is needed

**Required Content**:
```markdown
## ⚠️ Why This Matters - Learn From History

### Previous Attempts Failed Because:
- [Specific failure pattern 1]
- [Specific failure pattern 2]
- [What we learned]

### This Version Exists Because:
- Previous approach: [what was tried]
- Why it failed: [specific reasons]
- New approach: [what's different]

### Success vs Failure Examples:
- ✅ Agent X: Followed patterns → 100% success
- ❌ Agent Y: Ignored patterns → 42% failure
```

### 3. 🚨 CRITICAL REQUIREMENTS

**Purpose**: Non-negotiable technical and process requirements

**Required Content**:
```markdown
## 🚨🚨 CRITICAL REQUIREMENTS 🚨🚨

### MANDATORY - These are NOT optional:
1. **Requirement 1**: [Specific requirement]
   - Why: [Reason this is critical]
   - Impact if ignored: [Consequences]

2. **Requirement 2**: [Specific requirement]
   - Why: [Reason this is critical]
   - Impact if ignored: [Consequences]

### ⚠️ STOP - Do NOT proceed unless you understand these requirements
```

### 4. 📚 ARCHITECTURAL PATTERNS

**Purpose**: Define the patterns and best practices to follow

**Required Content**:
```markdown
## 📚 ARCHITECTURAL PATTERNS - YOUR NORTH STAR

### Required Reading:
1. **`docs/architectural-patterns.md`** - MANDATORY
2. **`Reference implementation`** - Study before coding
3. **`Anti-pattern examples`** - What NOT to do

### Pattern Examples:
```[language]
// ✅ CORRECT Pattern
[Example of correct implementation]

// ❌ WRONG Pattern  
[Example of what not to do]
```

### Why These Patterns Matter:
- [Pattern 1]: Prevents [specific problem]
- [Pattern 2]: Ensures [specific benefit]
```

### 5. 🎯 Pre-Implementation Checklist

**Purpose**: Ensure understanding before any coding begins

**Required Content**:
```markdown
## 🎯 Pre-Implementation Checklist

Before writing ANY code, verify you understand:

### Process Understanding:
- [ ] I know why previous attempts failed
- [ ] I understand the success metrics
- [ ] I know when to commit (after each milestone)
- [ ] I know how to report progress

### Technical Understanding:
- [ ] I understand the architectural patterns
- [ ] I know which patterns to use where
- [ ] I understand the testing requirements
- [ ] I know what NOT to do

### Communication Understanding:
- [ ] I know which files to update
- [ ] I know what to write in progress files
- [ ] I know how to structure commit messages
- [ ] I know what to include in handoff

⚠️ If ANY box is unchecked, re-read the requirements
```

### 6. 📊 Success Metrics

**Purpose**: Define measurable outcomes for success

**Required Content**:
```markdown
## 📊 Success Metrics - MEASURABLE OUTCOMES

### Minimum Acceptable Criteria:
- Test Pass Rate: ≥85%
- Code Coverage: ≥80%
- No regressions in existing tests
- All commits have detailed messages
- Progress reported every component

### Target Excellence Criteria:
- Test Pass Rate: 100%
- Code Coverage: ≥95%
- Performance improved from baseline
- Documentation complete
- Handoff includes learnings

### How to Measure:
```bash
# Capture metrics
PASS_RATE=$(npm test 2>&1 | grep -oE "[0-9]+%" | tail -1)
COVERAGE=$(npm run coverage 2>&1 | grep -oE "[0-9]+%" | tail -1)

echo "Current Metrics:"
echo "  Pass Rate: $PASS_RATE"
echo "  Coverage: $COVERAGE"
```
```

### 7. 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

**Purpose**: Define when and how to validate and commit work

**Required Content**:
```markdown
## 🔄 CONTINUOUS VALIDATION & COMMIT REQUIREMENTS

### After EVERY Component:
1. **RUN TESTS**: `npm test`
2. **CHECK METRICS**: Must maintain/improve pass rate
3. **DETECT REGRESSIONS**: If metrics drop, STOP and FIX
4. **COMMIT PROGRESS**: Detailed commit message
5. **UPDATE PROGRESS**: Write to progress files

### Commit Message Template:
```bash
git commit -m "feat($AGENT_NAME): $COMPONENT implemented

Results:
- Tests: $TESTS_PASS/$TOTAL_TESTS passing
- Pass Rate: $PASS_RATE%
- Coverage: $COVERAGE%
- Files: $FILES_MODIFIED modified, $FILES_ADDED added

Implementation:
- Pattern used: [pattern name]
- Key decisions: [why this approach]
- Dependencies: [what this relies on]

Agent: $AGENT_NAME
Cycle: $CYCLE/$MAX_CYCLES"
```

### Validation Checkpoints:
- [ ] After each function → Test
- [ ] After each component → Test & Commit
- [ ] After each milestone → Full validation
- [ ] Before handoff → Complete verification
```

### 8. 📢 Progress Reporting Templates

**Purpose**: Provide exact commands for communication

**Required Content**:
```markdown
## 📢 Progress Reporting Templates

### Console Output (REQUIRED):
```bash
# Before starting
echo "=== Starting: $COMPONENT ==="
echo "  Timestamp: $(date)"
echo "  Current metrics: $CURRENT_METRICS"

# During work
echo "  Created: $FILE"
echo "  Modified: $FILE"
echo "  Tests added: $COUNT"

# After completion
echo "✅ Completed: $COMPONENT"
echo "  New metrics: $NEW_METRICS"
echo "  Improvement: $IMPROVEMENT"
```

### Progress File Updates:
```bash
log_progress() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /shared/progress/${AGENT_NAME}.md
    echo "$1"  # Also echo to console
}

log_progress "Starting $COMPONENT"
log_progress "Tests: $PASS_RATE% passing"
log_progress "Committed: $COMMIT_HASH"
```

### Status File Updates:
```bash
update_status() {
    jq --arg key "$1" --arg value "$2" \
       '.[$key] = $value | .lastUpdate = now' \
       /shared/status/${AGENT_NAME}.json > tmp && mv tmp /shared/status/${AGENT_NAME}.json
}

update_status "component" "$COMPONENT"
update_status "passRate" "$PASS_RATE"
update_status "status" "implementing"
```
```

### 9. 🎯 Mission

**Purpose**: Clear, concise statement of the agent's objective

**Required Content**:
```markdown
## 🎯 Mission

Your mission is to [specific objective] by [approach/method] achieving [measurable outcome].

### Scope:
- IN SCOPE: [What to do]
- OUT OF SCOPE: [What NOT to do]

### Success Definition:
You succeed when [specific measurable criteria].
```

### 10. 📋 Implementation Tasks

**Purpose**: Detailed technical tasks to complete

**Required Content**:
```markdown
## 📋 Implementation Tasks

### Task Order (IMPORTANT - Follow this sequence):

#### 1. [First Task Name]
```[language]
[Code example or template]
```
- Why: [Reason this is first]
- Dependencies: [What this needs]
- Validation: [How to verify]

#### 2. [Second Task Name]
[Details as above]

### Task Checklist:
- [ ] Task 1: [Name] → TEST → COMMIT
- [ ] Task 2: [Name] → TEST → COMMIT
- [ ] Task 3: [Name] → TEST → COMMIT
```

### 11. ✅ Test Requirements

**Purpose**: Specific testing requirements and patterns

**Required Content**:
```markdown
## ✅ Test Requirements

### Test Coverage Requirements:
- Minimum tests per component: X
- Total test count target: Y
- Coverage requirement: Z%

### Test Patterns:
```[language]
// Required test structure
describe('Component', () => {
  it('should [specific behavior]', () => {
    // Test implementation
  });
});
```

### Test Validation:
```bash
# After writing tests
npm test -- --coverage
# Must see:
# - Tests: X passing
# - Coverage: Y%
```
```

### 12. 🎯 Milestone Validation Protocol

**Purpose**: Clear checkpoints with validation criteria

**Required Content**:
```markdown
## 🎯 Milestone Validation Protocol

### Milestone 1: [Name]
- [ ] Complete: [Component/Task]
- [ ] Tests: ≥X passing
- [ ] Commit: With metrics
- [ ] Progress: Updated

### Milestone 2: [Name]
[Same structure]

### Final Validation:
- [ ] All tests passing (≥85%)
- [ ] No regressions
- [ ] All commits detailed
- [ ] Handoff complete
```

### 13. 🔄 Self-Improvement Protocol

**Purpose**: Define how to iterate and improve

**Required Content**:
```markdown
## 🔄 Self-Improvement Protocol

### After Each Cycle:
1. **Measure**: Current metrics
2. **Identify**: Failures and issues
3. **Fix**: Address problems
4. **Validate**: Verify improvement
5. **Document**: What was learned

### If Metrics Drop:
```bash
if [ "$NEW_PASS_RATE" -lt "$OLD_PASS_RATE" ]; then
    echo "❌ REGRESSION DETECTED"
    echo "  Was: $OLD_PASS_RATE%"
    echo "  Now: $NEW_PASS_RATE%"
    # STOP - Fix before continuing
    git reset --hard
fi
```

### Continuous Improvement:
- Each cycle MUST improve on the previous
- Document what worked and what didn't
- Share learnings in handoff
```

### 14. 🚫 Regression Prevention

**Purpose**: Safeguards against breaking existing functionality

**Required Content**:
```markdown
## 🚫 Regression Prevention

### Before EVERY Change:
```bash
# Capture baseline
BASELINE_TESTS=$(npm test 2>&1 | grep -oE "[0-9]+ passing")
BASELINE_COVERAGE=$(npm run coverage 2>&1 | grep -oE "[0-9]+%")

# After changes
NEW_TESTS=$(npm test 2>&1 | grep -oE "[0-9]+ passing")
NEW_COVERAGE=$(npm run coverage 2>&1 | grep -oE "[0-9]+%")

# Validate no regression
if [ "$NEW_TESTS" -lt "$BASELINE_TESTS" ]; then
    echo "❌ REGRESSION: Tests dropped from $BASELINE_TESTS to $NEW_TESTS"
    git reset --hard
    exit 1
fi
```

### Regression Rules:
- NEVER commit if tests decrease
- NEVER commit if coverage drops >5%
- ALWAYS fix regressions immediately
```

### 15. ⚠️ Critical Technical Decisions

**Purpose**: Document important do's and don'ts with reasoning

**Required Content**:
```markdown
## ⚠️ Critical Technical Decisions

### ✅ ALWAYS:
- [Decision 1]: Because [reason]
- [Decision 2]: Because [reason]
- Use [pattern]: Prevents [problem]

### ❌ NEVER:
- [Anti-pattern 1]: Causes [problem]
- [Anti-pattern 2]: Breaks [functionality]
- Skip [requirement]: Results in [failure]

### Decision Matrix:
| Scenario | Right Choice | Wrong Choice | Why |
|----------|-------------|--------------|-----|
| [Case 1] | [Do this]   | [Not this]   | [Reason] |
| [Case 2] | [Do this]   | [Not this]   | [Reason] |
```

### 16. 🔄 Communication

**Purpose**: Define all communication channels and content

**Required Content**:
```markdown
## 🔄 Communication

### Required Files to Update:
- Progress: `/shared/progress/${AGENT_NAME}.md`
  - Update after EVERY action
  - Include timestamps and metrics
  
- Status: `/shared/status/${AGENT_NAME}.json`
  - Update component status
  - Include current metrics
  
- Test Results: `/shared/test-results/${AGENT_NAME}-latest.txt`
  - Full test output
  - Updated after each test run
  
- Handoff: `/shared/handoffs/${AGENT_NAME}-complete.md`
  - Created when complete
  - Comprehensive summary

### Update Frequency:
- Console: Continuously
- Progress: Every action
- Status: Every component
- Tests: Every test run
- Handoff: On completion
```

### 17. 🤝 Handoff Requirements

**Purpose**: Define what downstream agents need

**Required Content**:
```markdown
## 🤝 Handoff Requirements

### Your Handoff MUST Include:

```bash
cat > /shared/handoffs/${AGENT_NAME}-complete.md << EOF
# ${AGENT_NAME} Complete

## Summary
- Start: $START_TIME
- End: $END_TIME
- Duration: $DURATION
- Cycles: $CYCLES_USED

## Components Implemented
[List all components with status]

## Test Results
- Total: $TOTAL_TESTS
- Passing: $PASSING_TESTS
- Rate: $PASS_RATE%

## Files Modified
[List of all files changed]

## API Contracts
[Document interfaces created]

## Known Issues
[Any problems for next agent]

## Recommendations
[Suggestions for downstream]
EOF
```
```

### 18. 🚨 Common Issues & Solutions

**Purpose**: Troubleshooting guide for known problems

**Required Content**:
```markdown
## 🚨 Common Issues & Solutions

### Issue: [Common Problem 1]
**Symptoms**: [What you'll see]
**Cause**: [Why it happens]
**Solution**:
```bash
[Commands to fix]
```

### Issue: [Common Problem 2]
[Same structure]

### Quick Diagnostics:
```bash
# Check for common issues
[Diagnostic commands]
```
```

### 19. 📚 Study These Examples

**Purpose**: Provide reference implementations

**Required Content**:
```markdown
## 📚 Study These Examples

### Before starting, study:
1. **[File/Component]** - Shows [what to learn]
2. **[File/Component]** - Demonstrates [pattern]
3. **[File/Component]** - Perfect example of [technique]

### Key Patterns to Notice:
- In [file]: Notice how [pattern]
- In [file]: See the [technique]
- In [file]: Example of [approach]

### Copy These Patterns:
```[language]
// This pattern from [source]
[Code to reuse]
```
```

## Validation Checklist

Before deploying an agent prompt, verify it contains ALL sections:

- [ ] 1. Feedback Check
- [ ] 2. Historical Context (Why This Matters)
- [ ] 3. Critical Requirements
- [ ] 4. Architectural Patterns
- [ ] 5. Pre-Implementation Checklist
- [ ] 6. Success Metrics
- [ ] 7. Continuous Validation
- [ ] 8. Progress Reporting Templates
- [ ] 9. Mission Statement
- [ ] 10. Implementation Tasks
- [ ] 11. Test Requirements
- [ ] 12. Milestone Validation
- [ ] 13. Self-Improvement Protocol
- [ ] 14. Regression Prevention
- [ ] 15. Critical Decisions
- [ ] 16. Communication Channels
- [ ] 17. Handoff Requirements
- [ ] 18. Common Issues
- [ ] 19. Reference Examples

## Why This Structure Works

### Learning from History
Agents understand WHY they exist and what failed before, preventing repeated mistakes.

### Clear Success Definition
Measurable metrics eliminate ambiguity about what "done" means.

### Continuous Validation
Frequent checkpoints prevent drift and catch issues early.

### Verbose Communication
Rich progress reporting enables debugging and integration.

### Self-Improvement
Iterative refinement ensures quality improves over cycles.

### Knowledge Transfer
Comprehensive handoffs preserve context for downstream agents.

## Anti-Patterns to Avoid

### ❌ Missing Historical Context
Agents repeat past failures without understanding why previous attempts failed.

### ❌ Vague Success Criteria
"Make it work" instead of "Achieve 85% test pass rate with 80% coverage"

### ❌ Silent Execution
No progress reporting leads to invisible failures and lost work.

### ❌ Monolithic Commits
One giant commit at the end loses all incremental progress.

### ❌ Missing Handoffs
Next agent has no context about what was built or why.

## Template Usage

When creating a new agent prompt:

1. **Copy the entire structure** - Don't skip sections
2. **Fill in ALL sections** - Empty sections are failures waiting to happen
3. **Be specific** - Generic instructions produce generic results
4. **Include examples** - Show, don't just tell
5. **Test the prompt** - Run it yourself to verify clarity

## Conclusion

A well-structured prompt is the difference between an agent that produces excellent, traceable, integrated work and one that silently fails or produces unmaintainable code. Every section in this template serves a specific purpose in the agent's success.

Remember: **Structure enables success**. Agents can only be as good as their instructions.