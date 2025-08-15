# Workflow Performance Monitoring

## Key Performance Indicators

### Task Success Rate
- **Target**: >95% workflow completion success
- **Current**: Track via workflow execution logs
- **Trigger**: Success rate < 85% → Review and refine workflow prompts

### Time to Completion
- **Schema Fix Workflow**: Target 15-30 minutes
- **Service Pattern Compliance**: Target 10-20 minutes  
- **Performance Bug Investigation**: Target 20-45 minutes
- **Documentation Generation**: Target 5-15 minutes

### Usage Efficiency
- **Claude Messages per Task**: Track consumption patterns
- **Cost per Completed Task**: Monitor resource utilization
- **Batch Processing Efficiency**: Optimize parallel workflow execution

### User Satisfaction
- **Quality Rating**: 4.5/5 target for workflow outputs
- **Issue Resolution**: Track successful bug fixes
- **Time Savings**: Measure automation vs manual effort

## Farm Stand Specific Metrics

### Schema Validation Accuracy
- **Live vs Static Schema Alignment**: 100% accuracy target
- **Mapping Issue Detection**: Zero false positives
- **Fix Success Rate**: >95% of generated fixes work correctly

### Service Pattern Compliance
- **CartService Standard Adherence**: 100/100 scores target
- **Atomic Pattern Violations**: Zero violations after fixes
- **React Query Compliance**: All hooks follow golden pattern

### Security Audit Effectiveness
- **Broadcast Vulnerability Detection**: 100% coverage
- **User Isolation Verification**: Zero cross-contamination risks
- **Payload Sanitization**: All sensitive data protected

## Optimization Triggers

### Performance Issues
- Workflow completion time > 2x target → Optimize prompts and delegation
- Claude message usage > budget → Implement more efficient batching
- Error rate > 5% → Review workflow logic and error handling

### Quality Issues
- User satisfaction < 4/5 → Gather feedback and iterate workflows
- Fix success rate < 90% → Improve analysis and solution generation
- Regression bugs > 1% → Enhance testing and validation steps

## Monitoring Commands

```bash
# Daily metrics check
windsurf metrics daily --workflows=all

# Weekly performance review
windsurf analyze performance --period=week --export=report

# Usage optimization
windsurf optimize usage --target=claude-efficiency

# Quality assessment
windsurf quality-check --workflows=farm-stand --threshold=4.5
```
