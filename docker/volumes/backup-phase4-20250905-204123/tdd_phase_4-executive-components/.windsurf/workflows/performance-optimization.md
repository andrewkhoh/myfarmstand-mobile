# Performance Optimization Workflow

## Description
Comprehensive performance optimization for React Native app, focusing on React Query patterns, database queries, and real-time operations.

## Parameters
- `target` (string): Optimization target (default: "entire app")
- `focus` (string): Focus areas (default: "queries,real-time,rendering")
- `metrics` (boolean): Include performance metrics analysis (default: true)

## Trigger
Use this workflow when:
- App performance issues reported
- Slow query responses detected
- Real-time updates lagging
- React Query optimization needed

## Action
Use claude_code tool with the following prompt:

```
Your work folder is {PROJECT_PATH}

TASK TYPE: Performance Optimization
TASK ID: perf-{TIMESTAMP}

CONTEXT:
- Target: {TARGET}
- Focus Areas: {FOCUS}
- Current Issues: Performance bottlenecks in React Query patterns and database operations
- Goal: Optimize app responsiveness and efficiency

OPTIMIZATION AREAS:
1. **React Query Pattern Optimization**
   - Analyze query key strategies and caching
   - Optimize invalidation patterns
   - Review stale time and cache time settings
   - Implement efficient background refetching
   - Reduce unnecessary re-renders

2. **Database Query Optimization**
   - Analyze Supabase RPC function performance
   - Optimize database query patterns
   - Review index usage and query plans
   - Implement efficient data fetching strategies
   - Reduce database round trips

3. **Real-time Performance**
   - Optimize broadcast channel efficiency
   - Reduce payload sizes for real-time updates
   - Implement smart update batching
   - Optimize subscription management
   - Minimize real-time overhead

4. **React Native Rendering**
   - Identify and fix unnecessary re-renders
   - Optimize component memoization
   - Review FlatList and ScrollView performance
   - Implement efficient state management
   - Optimize navigation performance

5. **Memory and Resource Management**
   - Analyze memory usage patterns
   - Optimize image loading and caching
   - Review resource cleanup
   - Implement efficient data structures
   - Reduce memory leaks

PERFORMANCE METRICS TO TRACK:
- Query response times
- Component render times
- Memory usage patterns
- Network request efficiency
- Real-time update latency

COMPLETION CRITERIA:
- Measurable performance improvements
- Reduced query response times
- Optimized real-time operations
- Improved user experience metrics
- No performance regressions
```

## Expected Outputs
1. **Performance analysis report** with current metrics
2. **Optimization recommendations** with implementation plan
3. **Code improvements** for critical performance areas
4. **Performance benchmarks** before and after changes
5. **Monitoring setup** for ongoing performance tracking

## Usage Examples

```bash
# Full app performance optimization
/performance-optimization --target="entire app" --focus="queries,real-time,rendering"

# Focus on database performance
/performance-optimization --target="database operations" --focus="queries,rpc-functions"

# React Query specific optimization
/performance-optimization --target="react query" --focus="caching,invalidation"
```

## Integration Notes
- Works with existing service patterns and automation
- Maintains security and data integrity
- Provides measurable performance improvements
- Ensures optimal user experience
