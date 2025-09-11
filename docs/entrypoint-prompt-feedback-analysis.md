# Entrypoint Prompt and Feedback Analysis

## Current Implementation Analysis

### 1. Feedback Mechanism
**Location**: Lines 453-457
```bash
if [ -f "/shared/feedback/${PROJECT_NAME}-${AGENT_NAME}-improvements.md" ]; then
    echo "📋 Found feedback from previous cycle" >> "$PROGRESS_FILE"
    cat "/shared/feedback/${PROJECT_NAME}-${AGENT_NAME}-improvements.md" >> "$PROGRESS_FILE"
fi
```

**Issues**:
- ❌ **Feedback only logged, not used**: Written to progress file but NOT included in Claude prompt for regular tasks
- ❌ **Lost after restart**: Due to simulated annealing pattern, context resets lose feedback
- ✅ **Only restoration tasks use feedback**: Lines 563-568 show restoration tasks properly prepend feedback

### 2. Prompt Construction

#### Regular TDD Tasks (Lines 574-591)
```bash
CLAUDE_PROMPT="You are working on ${AGENT_NAME}...
Current test results:...
Test output from last run:...
Your task: Analyze failures...
$(cat $PROMPT_FILE)"  # Feedback NOT included!
```

#### Restoration Tasks (Lines 561-572)
```bash
if [ -f "/shared/feedback/..." ]; then
    CLAUDE_PROMPT="## IMPORTANT FEEDBACK FROM PREVIOUS CYCLE:
    $(cat feedback)
    ## RESTORATION INSTRUCTIONS:
    $(cat $PROMPT_FILE)"
```

### 3. Critical Finding: Feedback Ignored in TDD Mode

The feedback file is:
1. Created somewhere (not in this script)
2. Checked and logged to progress
3. **NEVER included in the Claude prompt for regular TDD tasks**
4. Only used for restoration tasks

## Improvement Opportunities

### 1. Include Feedback in TDD Prompts
```bash
# For regular TDD tasks - IMPROVED VERSION
CLAUDE_PROMPT="You are working on ${AGENT_NAME} for ${PROJECT_DESCRIPTION}.
This is self-improvement cycle ${RESTART_COUNT} of ${MAX_RESTARTS}.

Current test results:
- Tests passing: ${TESTS_PASS}
- Tests failing: ${TESTS_FAIL}
- Pass rate: ${PASS_RATE}%
- Target: ${TARGET_PASS_RATE}%"

# ADD FEEDBACK HERE
if [ -f "/shared/feedback/${PROJECT_NAME}-${AGENT_NAME}-improvements.md" ]; then
    CLAUDE_PROMPT="${CLAUDE_PROMPT}

## IMPORTANT FEEDBACK FROM PREVIOUS CYCLE:
$(cat /shared/feedback/${PROJECT_NAME}-${AGENT_NAME}-improvements.md)"
fi

CLAUDE_PROMPT="${CLAUDE_PROMPT}

Test output from last run:
$(tail -100 ${TEST_RESULTS_FILE} 2>/dev/null || echo "No test output yet")

Your task: Analyze the failures and implement the required functionality to make tests pass.
Follow ALL architectural patterns from docs/architectural-patterns-and-best-practices.md
Focus on making tests pass - this is TDD cycle ${RESTART_COUNT}.

$(cat $PROMPT_FILE)"
```

### 2. Learning History Across Restarts
Since simulated annealing loses context, maintain learning history:

```bash
# Store cycle summaries
LEARNING_FILE="/shared/learning/${PROJECT_NAME}-${AGENT_NAME}-history.md"

# After each cycle, append summary
echo "## Cycle ${RESTART_COUNT} - Pass Rate: ${PASS_RATE}%" >> "$LEARNING_FILE"
echo "- Tried: ${APPROACH_SUMMARY}" >> "$LEARNING_FILE"
echo "- Result: ${OUTCOME}" >> "$LEARNING_FILE"
echo "" >> "$LEARNING_FILE"

# Include learning history in prompt (last 3 cycles)
LEARNING_CONTEXT=$(tail -30 "$LEARNING_FILE" 2>/dev/null)
if [ -n "$LEARNING_CONTEXT" ]; then
    CLAUDE_PROMPT="${CLAUDE_PROMPT}

## LEARNING FROM PREVIOUS ATTEMPTS:
${LEARNING_CONTEXT}"
fi
```

### 3. Feedback Generation Mechanism
Currently missing - where does feedback come from? Should add:

```bash
# After test run, analyze patterns
analyze_test_patterns() {
    local feedback_file="/shared/feedback/${PROJECT_NAME}-${AGENT_NAME}-improvements.md"
    
    # If stuck at same pass rate for 2+ cycles
    if [ "$PASS_RATE" -eq "$PREVIOUS_PASS_RATE" ]; then
        echo "## Stuck Pattern Detected" > "$feedback_file"
        echo "- Same ${PASS_RATE}% for multiple cycles" >> "$feedback_file"
        echo "- Try different approach:" >> "$feedback_file"
        echo "  - Check test assumptions" >> "$feedback_file"
        echo "  - Review error patterns" >> "$feedback_file"
        echo "  - Consider architectural constraints" >> "$feedback_file"
    fi
    
    # If regression detected
    if [ "$PASS_RATE" -lt "$PREVIOUS_PASS_RATE" ]; then
        echo "## Regression Alert" > "$feedback_file"
        echo "- Pass rate dropped from ${PREVIOUS_PASS_RATE}% to ${PASS_RATE}%" >> "$feedback_file"
        echo "- Revert last changes or fix introduced bugs" >> "$feedback_file"
    fi
}
```

### 4. Structured Test Analysis
Enhance test output parsing:

```bash
# Instead of just tail -100
TEST_ANALYSIS=$(analyze_test_output)

analyze_test_output() {
    # Extract failing test names
    FAILING_TESTS=$(grep "FAIL" "$TEST_RESULTS_FILE" | head -10)
    
    # Extract error types
    ERROR_PATTERNS=$(grep -E "Error:|TypeError:|ReferenceError:" "$TEST_RESULTS_FILE" | 
                     sort | uniq -c | sort -rn | head -5)
    
    echo "### Failing Tests:"
    echo "$FAILING_TESTS"
    echo ""
    echo "### Common Error Patterns:"
    echo "$ERROR_PATTERNS"
    echo ""
    echo "### Full Output (last 50 lines):"
    tail -50 "$TEST_RESULTS_FILE"
}
```

### 5. Smart Restart Decision
Instead of always restarting, use feedback to decide:

```bash
# Adaptive restart based on feedback
should_restart() {
    # Always restart early cycles (exploration)
    if [ "$RESTART_COUNT" -le 2 ]; then
        return 0  # Yes, restart
    fi
    
    # Check if feedback suggests different approach needed
    if grep -q "Try different approach" "$feedback_file"; then
        return 0  # Yes, restart for fresh perspective
    fi
    
    # If making progress, continue
    if [ "$PASS_RATE" -gt "$PREVIOUS_PASS_RATE" ]; then
        return 1  # No, keep context
    fi
    
    # Default: restart
    return 0
}

if should_restart; then
    exit 0
fi
```

## Summary of Key Issues

1. **Feedback files exist but aren't used** in TDD tasks
2. **No feedback generation mechanism** visible
3. **Learning history lost** between restarts
4. **Test analysis is rudimentary** (just tail -100)
5. **Prompt structure doesn't leverage** available context

## Recommended Priority Fixes

1. **HIGH**: Include feedback in TDD task prompts (simple fix, high impact)
2. **HIGH**: Create learning history file that persists across restarts
3. **MEDIUM**: Add feedback generation based on test patterns
4. **LOW**: Enhance test output analysis
5. **FUTURE**: Adaptive restart strategy based on feedback

The most critical issue is that feedback files are created but completely ignored in the Claude prompt for TDD tasks, making the feedback mechanism ineffective.