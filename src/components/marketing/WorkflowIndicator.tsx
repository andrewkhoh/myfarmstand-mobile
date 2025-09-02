import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { WorkflowState, WorkflowTransition } from '@/types/marketing';

interface WorkflowIndicatorProps {
  currentState: WorkflowState;
  availableTransitions: WorkflowTransition[];
  onTransition: (nextState: WorkflowState) => void;
  compact?: boolean;
}

const stateColors: Record<WorkflowState, string> = {
  draft: '#8E8E93',
  review: '#FF9500',
  approved: '#5AC8FA',
  published: '#34C759',
  archived: '#C7C7CC',
};

const stateIcons: Record<WorkflowState, string> = {
  draft: '✏️',
  review: '👁️',
  approved: '✅',
  published: '🚀',
  archived: '📦',
};

export const WorkflowIndicator = memo<WorkflowIndicatorProps>(({
  currentState,
  availableTransitions,
  onTransition,
  compact = false,
}) => {
  const theme = useTheme();

  const handleTransition = useCallback((nextState: WorkflowState) => {
    AccessibilityInfo.announceForAccessibility(`Transitioning to ${nextState}`);
    onTransition(nextState);
  }, [onTransition]);

  const getStateLabel = (state: WorkflowState): string => {
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  if (compact) {
    return (
      <View style={styles.compactContainer} testID="workflow-indicator-compact">
        <View
          style={[
            styles.compactBadge,
            { backgroundColor: stateColors[currentState] },
          ]}
          accessibilityLabel={`Current workflow state: ${currentState}`}
          accessibilityRole="text"
        >
          <Text style={styles.compactIcon}>{stateIcons[currentState]}</Text>
          <Text style={styles.compactText}>{getStateLabel(currentState)}</Text>
        </View>
        {availableTransitions.length > 0 && (
          <View style={styles.compactTransitions}>
            {availableTransitions.map((transition) => (
              <TouchableOpacity
                key={transition.to}
                style={[
                  styles.compactTransitionButton,
                  { borderColor: theme.colors.primary },
                ]}
                onPress={() => handleTransition(transition.to)}
                accessibilityLabel={`Transition to ${transition.to}`}
                accessibilityRole="button"
                accessibilityHint={`Changes workflow state from ${currentState} to ${transition.to}`}
                testID={`transition-${transition.to}`}
              >
                <Text style={[styles.compactTransitionText, { color: theme.colors.primary }]}>
                  {stateIcons[transition.to]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  const allStates: WorkflowState[] = ['draft', 'review', 'approved', 'published', 'archived'];
  const currentStateIndex = allStates.indexOf(currentState);

  return (
    <View style={styles.container} testID="workflow-indicator">
      <View style={styles.timeline}>
        {allStates.map((state, index) => {
          const isActive = state === currentState;
          const isPast = index < currentStateIndex;
          const isFuture = index > currentStateIndex;

          return (
            <View key={state} style={styles.timelineItem}>
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    isPast && styles.connectorPast,
                    isActive && styles.connectorActive,
                  ]}
                />
              )}
              <View
                style={[
                  styles.stateNode,
                  { borderColor: stateColors[state] },
                  isActive && { backgroundColor: stateColors[state] },
                  isPast && styles.stateNodePast,
                  isFuture && styles.stateNodeFuture,
                ]}
                accessibilityLabel={`${state} ${isActive ? '(current)' : isPast ? '(completed)' : '(future)'}`}
                testID={`state-${state}`}
              >
                <Text style={[styles.stateIcon, isActive && styles.stateIconActive]}>
                  {stateIcons[state]}
                </Text>
              </View>
              <Text
                style={[
                  styles.stateLabel,
                  { color: theme.colors.text },
                  isActive && styles.stateLabelActive,
                  isFuture && styles.stateLabelFuture,
                ]}
              >
                {getStateLabel(state)}
              </Text>
            </View>
          );
        })}
      </View>

      {availableTransitions.length > 0 && (
        <View style={styles.transitionsContainer}>
          <Text style={[styles.transitionsTitle, { color: theme.colors.textSecondary }]}>
            Available Actions:
          </Text>
          <View style={styles.transitionButtons}>
            {availableTransitions.map((transition) => (
              <TouchableOpacity
                key={transition.to}
                style={[
                  styles.transitionButton,
                  { backgroundColor: stateColors[transition.to] },
                ]}
                onPress={() => handleTransition(transition.to)}
                accessibilityLabel={transition.label}
                accessibilityRole="button"
                accessibilityHint={`Transition from ${currentState} to ${transition.to}`}
                testID={`transition-button-${transition.to}`}
              >
                <Text style={styles.transitionButtonIcon}>{stateIcons[transition.to]}</Text>
                <Text style={styles.transitionButtonText}>{transition.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

WorkflowIndicator.displayName = 'WorkflowIndicator';

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  compactIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  compactText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  compactTransitions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  compactTransitionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  compactTransitionText: {
    fontSize: 14,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: 20,
    left: -50,
    right: 50,
    height: 2,
    backgroundColor: '#E5E5EA',
  },
  connectorPast: {
    backgroundColor: '#34C759',
  },
  connectorActive: {
    backgroundColor: '#007AFF',
  },
  stateNode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 1,
  },
  stateNodePast: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  stateNodeFuture: {
    opacity: 0.5,
  },
  stateIcon: {
    fontSize: 18,
  },
  stateIconActive: {
    fontSize: 20,
  },
  stateLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  stateLabelActive: {
    fontWeight: '700',
  },
  stateLabelFuture: {
    opacity: 0.5,
  },
  transitionsContainer: {
    marginTop: 16,
  },
  transitionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  transitionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  transitionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  transitionButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  transitionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});