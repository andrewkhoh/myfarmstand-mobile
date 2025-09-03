import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export interface WorkflowPermissions {
  canEdit: boolean;
  canApprove: boolean;
  canPublish: boolean;
}

export interface WorkflowHistoryItem {
  state: string;
  timestamp: string;
  user: string;
}

export interface WorkflowIndicatorProps {
  currentState: string;
  onTransition: (nextState: string) => void;
  permissions?: WorkflowPermissions;
  history?: WorkflowHistoryItem[];
  showHistory?: boolean;
  showProgress?: boolean;
  testID?: string;
  onStateChange?: (prevState: string, newState: string) => void;
}

const WorkflowIndicator = memo<WorkflowIndicatorProps>(({
  currentState,
  onTransition,
  permissions = { canEdit: false, canApprove: false, canPublish: false },
  history = [],
  showHistory = false,
  showProgress = false,
  testID = 'workflow-indicator',
  onStateChange
}) => {
  const [historyVisible, setHistoryVisible] = useState(showHistory);
  const [previousState, setPreviousState] = useState(currentState);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (previousState !== currentState) {
      const displayName = currentState.charAt(0).toUpperCase() + currentState.slice(1);
      setNotification(`Status changed to ${displayName}`);
      
      if (onStateChange) {
        onStateChange(previousState, currentState);
      }
      
      setPreviousState(currentState);
      
      setTimeout(() => setNotification(null), 3000);
    }
  }, [currentState, previousState, onStateChange]);

  const getStateDisplayName = (state: string) => {
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'draft': return '#6B7280';
      case 'review': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'published': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const getAvailableTransitions = () => {
    const transitions: { label: string; nextState: string; permission?: keyof WorkflowPermissions }[] = [];
    
    switch (currentState) {
      case 'draft':
        transitions.push({ label: 'Submit for Review', nextState: 'review', permission: 'canEdit' });
        break;
      case 'review':
        if (permissions.canApprove) {
          transitions.push({ label: 'Approve', nextState: 'approved', permission: 'canApprove' });
        }
        if (permissions.canEdit) {
          transitions.push({ label: 'Request Changes', nextState: 'draft', permission: 'canEdit' });
        }
        break;
      case 'approved':
        transitions.push({ label: 'Publish', nextState: 'published', permission: 'canPublish' });
        break;
      case 'published':
        transitions.push({ label: 'Unpublish', nextState: 'draft', permission: 'canEdit' });
        break;
    }
    
    return transitions;
  };

  const handleTransition = useCallback((nextState: string) => {
    onTransition(nextState);
  }, [onTransition]);

  const toggleHistory = useCallback(() => {
    setHistoryVisible(!historyVisible);
  }, [historyVisible]);

  const transitions = getAvailableTransitions();
  const stateColor = getStateColor(currentState);
  const displayName = getStateDisplayName(currentState);

  return (
    <View 
      testID={testID}
      style={[styles.container, { backgroundColor: stateColor + '20' }]}
      accessibilityLabel={`Workflow status: ${displayName}`}
    >
      {notification && (
        <Text style={styles.notification}>{notification}</Text>
      )}
      
      <View style={styles.stateContainer}>
        <View 
          testID={`state-icon-${currentState}`}
          style={[styles.stateIcon, { backgroundColor: stateColor }]}
        />
        <Text style={[styles.stateText, { color: stateColor }]}>
          {displayName}
        </Text>
      </View>

      {showProgress && (
        <View testID="workflow-progress" style={styles.progressBar}>
          <View style={[styles.progressFill, { 
            width: currentState === 'draft' ? '25%' : 
                   currentState === 'review' ? '50%' : 
                   currentState === 'approved' ? '75%' : '100%',
            backgroundColor: stateColor 
          }]} />
        </View>
      )}

      <View style={styles.transitionsContainer}>
        {transitions.map((transition) => {
          const hasPermission = !transition.permission || permissions[transition.permission];
          const isDisabled = transition.permission && !permissions[transition.permission];
          
          if (transition.permission && !hasPermission && transition.nextState !== 'published') {
            return null;
          }
          
          return (
            <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Button"
              key={transition.nextState}
              style={[
                styles.transitionButton,
                isDisabled && styles.disabledButton
              ]}
              onPress={() => handleTransition(transition.nextState)}
              disabled={isDisabled}
              accessibilityHint={`Move content to ${transition.nextState} state`}
              accessibilityState={{ disabled: isDisabled }}
            >
              <Text style={[
                styles.transitionButtonText,
                isDisabled && styles.disabledButtonText
              ]}>
                {transition.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {history.length > 0 && (
        <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="{historyVisible ? 'Hide' : 'Show'} History"
          testID="toggle-history"
          style={styles.historyToggle}
          onPress={toggleHistory}
        >
          <Text style={styles.historyToggleText}>
            {historyVisible ? 'Hide' : 'Show'} History
          </Text>
        </TouchableOpacity>
      )}

      {historyVisible && history.length > 0 && (
        <ScrollView style={styles.historyContainer}>
          {history.map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyState}>
                {getStateDisplayName(item.state)}
              </Text>
              <Text style={styles.historyMeta}>
                {item.user} - {item.timestamp}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

WorkflowIndicator.displayName = 'WorkflowIndicator';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  notification: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stateIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  stateText: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  transitionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  transitionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  transitionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  historyToggle: {
    marginTop: 12,
    paddingVertical: 8,
  },
  historyToggleText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  historyContainer: {
    marginTop: 12,
    maxHeight: 200,
  },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  historyState: {
    fontWeight: '500',
    marginBottom: 4,
  },
  historyMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default WorkflowIndicator;