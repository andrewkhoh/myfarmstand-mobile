import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useErrorRecovery } from '../../hooks/error/useErrorRecovery';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: any, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  level?: 'screen' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorRecovery: any;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo
    });

    // Report error to recovery service
    this.props.onError?.(error, errorInfo);

    // Log to error recovery service
    if (this.errorRecovery?.captureError) {
      this.errorRecovery.captureError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (this.errorRecovery?.resetBoundary) {
      this.errorRecovery.resetBoundary();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.state.errorInfo, this.handleRetry);
      }

      return <DefaultErrorFallback
        error={this.state.error!}
        errorInfo={this.state.errorInfo}
        onRetry={this.handleRetry}
        level={this.props.level || 'component'}
      />;
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error;
  errorInfo: any;
  onRetry: () => void;
  level: 'screen' | 'component' | 'critical';
}

function DefaultErrorFallback({ error, errorInfo, onRetry, level }: FallbackProps) {
  const getMessage = () => {
    switch (level) {
      case 'critical':
        return 'A critical error has occurred. Please restart the app or contact support.';
      case 'screen':
        return 'This screen encountered an error. Please try again or navigate back.';
      default:
        return 'Something went wrong with this component. Please try again.';
    }
  };

  const getTitle = () => {
    switch (level) {
      case 'critical':
        return 'Critical Error';
      case 'screen':
        return 'Screen Error';
      default:
        return 'Component Error';
    }
  };

  return (
    <View style={[styles.container, level === 'critical' && styles.criticalContainer]}>
      <View style={styles.content}>
        <Text style={[styles.title, level === 'critical' && styles.criticalTitle]}>
          {getTitle()}
        </Text>

        <Text style={styles.message}>
          {getMessage()}
        </Text>

        {level !== 'critical' && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {__DEV__ && (
          <ScrollView style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Information:</Text>
            <Text style={styles.debugText}>
              {error.message}
            </Text>
            {error.stack && (
              <Text style={styles.debugText}>
                {error.stack}
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook version for functional components
export function ErrorBoundaryWrapper({
  children,
  ...props
}: Props) {
  return (
    <ErrorBoundary {...props}>
      {children}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  criticalContainer: {
    backgroundColor: '#fff5f5'
  },
  content: {
    alignItems: 'center',
    maxWidth: 400
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center'
  },
  criticalTitle: {
    color: '#721c24'
  },
  message: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  debugContainer: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    padding: 12
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8
  },
  debugText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace'
  }
});