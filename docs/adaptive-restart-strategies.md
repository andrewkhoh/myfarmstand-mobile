# Adaptive Restart Strategies for Multi-Agent TDD

## Current Discovery: Pure Simulated Annealing Works
- Phase 3B & 4: Unconditional restart every cycle → ~99% pass rates
- Phase 4B: Goal-oriented (conditional) → ~85-95% pass rates
- **Key insight**: Complete memory loss prevents local optima trapping

## Proposed Enhancement: Adaptive Restart Schedules

### Strategy 1: Temperature-Based Cooling Schedule
**Concept**: Restart frequency decreases over time (true simulated annealing)

```bash
# Pseudo-code for adaptive restart
CYCLE=1
MAX_CYCLES=10
RESTART_PROBABILITY=100  # Start with 100% restart

for CYCLE in $(seq 1 $MAX_CYCLES); do
    # Run Claude
    claude_execute
    run_tests
    
    # Calculate restart probability (exponential decay)
    RESTART_PROBABILITY=$((100 * (MAX_CYCLES - CYCLE) / MAX_CYCLES))
    
    # Probabilistic restart
    if [ $((RANDOM % 100)) -lt $RESTART_PROBABILITY ]; then
        exit 0  # Restart (lose memory)
    fi
    # else continue with memory (no restart)
done
```

**Benefits**:
- Early cycles: High restart rate → Maximum exploration
- Later cycles: Lower restart rate → Refinement with context
- Natural convergence from exploration to exploitation

### Strategy 2: Performance-Based Restart (Escape Local Minima)
**Concept**: Restart when improvement plateaus

```bash
# Track improvement delta
PREVIOUS_PASS_RATE=0
STUCK_COUNTER=0
STUCK_THRESHOLD=2  # Restart if no improvement for 2 cycles

for CYCLE in $(seq 1 $MAX_CYCLES); do
    claude_execute
    run_tests
    
    # Check if stuck (no improvement)
    IMPROVEMENT=$((PASS_RATE - PREVIOUS_PASS_RATE))
    
    if [ $IMPROVEMENT -le 0 ]; then
        STUCK_COUNTER=$((STUCK_COUNTER + 1))
    else
        STUCK_COUNTER=0  # Reset on improvement
    fi
    
    # Force restart if stuck
    if [ $STUCK_COUNTER -ge $STUCK_THRESHOLD ]; then
        echo "Stuck at local minima - forcing restart"
        exit 0
    fi
    
    # Optional: Always restart if below threshold
    if [ $PASS_RATE -lt 50 ]; then
        echo "Poor performance - restart for fresh approach"
        exit 0
    fi
    
    PREVIOUS_PASS_RATE=$PASS_RATE
done
```

**Benefits**:
- Escapes plateaus automatically
- Maintains context when making progress
- Aggressive restart on poor performance

### Strategy 3: Hybrid Adaptive Schedule
**Concept**: Combine time-based and performance-based strategies

```bash
# Early Phase (Cycles 1-3): ALWAYS restart (exploration)
if [ $CYCLE -le 3 ]; then
    exit 0  # Unconditional restart
fi

# Middle Phase (Cycles 4-7): Performance-based restart
if [ $CYCLE -le 7 ]; then
    if [ $PASS_RATE -lt 90 ] || [ $IMPROVEMENT -le 5 ]; then
        exit 0  # Restart if not excellent or stuck
    fi
fi

# Late Phase (Cycles 8-10): Only restart if truly stuck
if [ $IMPROVEMENT -lt 0 ] && [ $PASS_RATE -lt 95 ]; then
    exit 0  # Only restart if regressing
fi
```

### Strategy 4: Test Complexity Awareness
**Concept**: Adjust restart strategy based on test suite characteristics

```bash
# Analyze test complexity
TOTAL_TESTS=$(get_total_test_count)
TEST_COMPLEXITY=$(analyze_test_dependencies)

# Simple test suites (< 10 tests): Less restart needed
if [ $TOTAL_TESTS -lt 10 ]; then
    RESTART_FREQUENCY="low"
# Complex test suites (> 100 tests): More restart beneficial
elif [ $TOTAL_TESTS -gt 100 ]; then
    RESTART_FREQUENCY="high"
fi

# Adjust strategy based on complexity
case $RESTART_FREQUENCY in
    "high")
        exit 0  # Always restart for complex problems
        ;;
    "low")
        [ $PASS_RATE -lt 80 ] && exit 0  # Only restart if struggling
        ;;
esac
```

## Implementation Considerations

### Tracking Across Restarts
Since restarts lose memory, we need external state:
```bash
# Store learning history in shared volume
echo "$CYCLE:$PASS_RATE:$IMPROVEMENT" >> /shared/learning-history/${AGENT_NAME}.csv

# Read history on startup to determine strategy
HISTORY=$(tail -5 /shared/learning-history/${AGENT_NAME}.csv)
PLATEAU_DETECTED=$(analyze_plateau "$HISTORY")
```

### Docker Compose Configuration
```yaml
environment:
  - RESTART_STRATEGY=adaptive  # adaptive|always|never|performance
  - COOLING_SCHEDULE=exponential  # exponential|linear|step
  - PLATEAU_THRESHOLD=2  # Cycles without improvement
  - EXPLORATION_CYCLES=3  # Initial exploration phase
```

## Theoretical Advantages

1. **Best of Both Worlds**
   - Early: Simulated annealing exploration
   - Late: Gradient descent refinement

2. **Adaptive to Problem Complexity**
   - Simple problems: Fewer restarts needed
   - Complex problems: More exploration beneficial

3. **Escape Mechanisms**
   - Automatic detection of local optima
   - Forced restart when stuck

4. **Resource Efficiency**
   - Fewer unnecessary restarts when converging well
   - More restarts only when needed

## Empirical Testing Needed

To validate these strategies, we'd need to test:
1. Same test suite with different strategies
2. Measure: cycles to convergence, final pass rate, total time
3. Compare: Always restart vs Adaptive vs Never restart

## Hypothesis

The optimal strategy likely follows a **logarithmic decay**:
- Cycles 1-2: 100% restart (pure exploration)
- Cycles 3-4: 75% restart (biased exploration)
- Cycles 5-6: 50% restart (balanced)
- Cycles 7-8: 25% restart (biased exploitation)
- Cycles 9-10: 0% restart (pure exploitation)

This mirrors classical simulated annealing temperature schedules that have proven optimal for many optimization problems.