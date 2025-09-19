import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { errorCoordinator, WorkflowError } from '../../services/cross-workflow/errorCoordinator';
import { ValidationMonitor } from '../../utils/validationMonitorAdapter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  operation?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}

export class InventoryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Inventory Error Boundary caught:', error, errorInfo);

    // Record error in validation monitor
    ValidationMonitor.recordValidationError('inventory-error-boundary', error);

    // Handle error through coordinator
    const workflowError: WorkflowError = {
      workflow: 'inventory',
      operation: this.props.operation || 'unknown',
      errorType: this.getErrorType(error),
      severity: this.getErrorSeverity(error),
      message: error.message,
      code: (error as any).code,
      context: {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      },
      timestamp: new Date(),
      stackTrace: error.stack,
    };

    errorCoordinator.handleError(workflowError).then((strategy) => {
      if (strategy?.type === 'retry' && this.state.retryCount < (strategy.maxRetries || 3)) {
        this.setState({ isRecovering: true });
        setTimeout(() => this.retry(), 1000);
      }
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  private getErrorType(error: Error): WorkflowError['errorType'] {
    const message = error.message.toLowerCase();
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('stock') || message.includes('inventory')) {
      return 'business';
    }
    return 'system';
  }

  private getErrorSeverity(error: Error): WorkflowError['severity'] {
    const message = error.message.toLowerCase();
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    if (message.includes('out of stock') || message.includes('insufficient')) {
      return 'high';
    }
    if (message.includes('warning') || message.includes('low stock')) {
      return 'medium';
    }
    return 'low';
  }

  private retry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRecovering: false,
    }));
  };

  private reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Inventory Operation Failed</Text>

              {this.state.isRecovering ? (
                <View style={styles.recoveringContainer}>
                  <Text style={styles.recoveringText}>Attempting to recover...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.errorMessage}>
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </Text>

                  {this.state.retryCount > 0 && (
                    <Text style={styles.retryCount}>
                      Retry attempts: {this.state.retryCount}
                    </Text>
                  )}

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.retryButton]}
                      onPress={this.retry}
                    >
                      <Text style={styles.buttonText}>Retry Operation</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, styles.resetButton]}
                      onPress={this.reset}
                    >
                      <Text style={styles.buttonText}>Reset</Text>
                    </TouchableOpacity>
                  </View>

                  {__DEV__ && this.state.errorInfo && (
                    <View style={styles.debugContainer}>
                      <Text style={styles.debugTitle}>Debug Information:</Text>
                      <ScrollView style={styles.debugScroll}>
                        <Text style={styles.debugText}>
                          {this.state.error?.stack}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#4caf50',
  },
  resetButton: {
    backgroundColor: '#2196f3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recoveringContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  recoveringText: {
    fontSize: 16,
    color: '#ff9800',
    fontStyle: 'italic',
  },
  debugContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});