/**
 * PaymentError Component
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Error handling component for payment failures with recovery options,
 * user-friendly messaging, and comprehensive fallback strategies.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { 
  PaymentError as PaymentErrorType, 
  PaymentMethod,
  PaymentOperationResult 
} from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { ValidationMonitor } from '../utils/validationMonitor';

interface PaymentErrorProps {
  error: PaymentErrorType;
  onRetry?: () => void;
  onTryDifferentMethod?: () => void;
  onContactSupport?: () => void;
  onUseFallbackMethod?: (method: 'cash_on_pickup' | 'bank_transfer') => void;
  style?: ViewStyle;
  variant?: 'default' | 'detailed' | 'minimal';
  showFallbackOptions?: boolean;
  showSupportContact?: boolean;
  customSupportInfo?: {
    phone?: string;
    email?: string;
    hours?: string;
  };
}

interface ErrorRecoveryState {
  isRetrying: boolean;
  retryCount: number;
  showDetails: boolean;
}

// Error message mapping for user-friendly communication
const getErrorDisplayInfo = (error: PaymentErrorType) => {
  const errorMap = {
    'CARD_DECLINED': {
      title: 'Card Declined',
      message: 'Your card was declined. Please try a different payment method or contact your bank.',
      icon: '❌',
      severity: 'high' as const,
      canRetry: false,
      suggestDifferentMethod: true,
    },
    'INSUFFICIENT_FUNDS': {
      title: 'Insufficient Funds',
      message: 'Your card has insufficient funds. Please use a different payment method.',
      icon: '💳',
      severity: 'high' as const,
      canRetry: false,
      suggestDifferentMethod: true,
    },
    'EXPIRED_CARD': {
      title: 'Card Expired',
      message: 'Your card has expired. Please add a new payment method.',
      icon: '📅',
      severity: 'high' as const,
      canRetry: false,
      suggestDifferentMethod: true,
    },
    'INVALID_CARD_NUMBER': {
      title: 'Invalid Card',
      message: 'The card information is invalid. Please check your details and try again.',
      icon: '⚠️',
      severity: 'medium' as const,
      canRetry: true,
      suggestDifferentMethod: true,
    },
    'NETWORK_ERROR': {
      title: 'Connection Problem',
      message: 'Unable to process payment due to a network issue. Please check your connection and try again.',
      icon: '📶',
      severity: 'medium' as const,
      canRetry: true,
      suggestDifferentMethod: false,
    },
    'STRIPE_API_ERROR': {
      title: 'Payment Processing Error',
      message: 'There was an issue processing your payment. Please try again or use a different method.',
      icon: '⚡',
      severity: 'medium' as const,
      canRetry: true,
      suggestDifferentMethod: true,
    },
    'AUTHENTICATION_REQUIRED': {
      title: 'Authentication Required',
      message: 'Please sign in to continue with your payment.',
      icon: '🔐',
      severity: 'high' as const,
      canRetry: false,
      suggestDifferentMethod: false,
    },
    'PROCESSING_ERROR': {
      title: 'Processing Error',
      message: 'Unable to process your payment. Please try again.',
      icon: '⚙️',
      severity: 'medium' as const,
      canRetry: true,
      suggestDifferentMethod: true,
    },
    'INVALID_REQUEST': {
      title: 'Invalid Request',
      message: 'There was an issue with your payment request. Please try again.',
      icon: '📝',
      severity: 'low' as const,
      canRetry: true,
      suggestDifferentMethod: false,
    },
    'PAYMENT_METHOD_UNACTIVATED': {
      title: 'Payment Method Issue',
      message: 'Unable to process this payment method. Please try a different one.',
      icon: '💳',
      severity: 'medium' as const,
      canRetry: false,
      suggestDifferentMethod: true,
    },
    'INVALID_EXPIRY_DATE': {
      title: 'Invalid Expiry Date',
      message: 'The card expiry date is invalid. Please check and try again.',
      icon: '📅',
      severity: 'medium' as const,
      canRetry: true,
      suggestDifferentMethod: false,
    },
  };
  
  return errorMap[error.code as keyof typeof errorMap] || {
    title: 'Payment Error',
    message: error.userMessage || 'An unexpected error occurred. Please try again.',
    icon: '❗',
    severity: 'medium' as const,
    canRetry: true,
    suggestDifferentMethod: true,
  };
};

export const PaymentError: React.FC<PaymentErrorProps> = ({
  error,
  onRetry,
  onTryDifferentMethod,
  onContactSupport,
  onUseFallbackMethod,
  style,
  variant = 'default',
  showFallbackOptions = true,
  showSupportContact = true,
  customSupportInfo,
}) => {
  const [state, setState] = useState<ErrorRecoveryState>({
    isRetrying: false,
    retryCount: 0,
    showDetails: false,
  });

  const errorInfo = getErrorDisplayInfo(error);

  // Following Pattern: ValidationMonitor for error tracking
  React.useEffect(() => {
    ValidationMonitor.recordValidationError({
      context: 'PaymentError.display',
      errorMessage: error.message,
      errorCode: error.code,
      validationPattern: 'transformation_schema'
    });
  }, [error]);

  // Following Pattern: Safe action handling with error recovery
  const handleAction = useCallback(async (action: () => void | Promise<void>, actionName: string) => {
    try {
      setState(prev => ({ ...prev, isRetrying: true }));
      
      await action();
      
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentError',
        pattern: 'transformation_schema',
        operation: actionName
      });
    } catch (actionError) {
      ValidationMonitor.recordValidationError({
        context: `PaymentError.${actionName}`,
        errorMessage: actionError instanceof Error ? actionError.message : 'Unknown error',
        errorCode: 'ACTION_FAILED'
      });
    } finally {
      setState(prev => ({ ...prev, isRetrying: false }));
    }
  }, []);

  // Following Pattern: Retry logic with exponential backoff simulation
  const handleRetry = useCallback(() => {
    if (!onRetry || state.retryCount >= 3) return;

    setState(prev => ({ 
      ...prev, 
      retryCount: prev.retryCount + 1,
    }));

    handleAction(onRetry, 'retryPayment');
  }, [onRetry, state.retryCount, handleAction]);

  // Following Pattern: Error severity-based styling
  const getErrorStyles = () => {
    const severityStyles = {
      low: { 
        backgroundColor: colors.warning[50], 
        borderColor: colors.warning[200] 
      },
      medium: { 
        backgroundColor: colors.error[50], 
        borderColor: colors.error[200] 
      },
      high: { 
        backgroundColor: colors.error[100], 
        borderColor: colors.error[300] 
      },
    };
    
    return severityStyles[errorInfo.severity];
  };

  // Following Pattern: Progressive disclosure for technical details
  const renderErrorDetails = () => {
    if (variant === 'minimal' || !state.showDetails) return null;

    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Technical Details</Text>
        <Text style={styles.detailsText}>Error Code: {error.code}</Text>
        {error.message && (
          <Text style={styles.detailsText}>Message: {error.message}</Text>
        )}
        {error.timestamp && (
          <Text style={styles.detailsText}>
            Time: {new Date(error.timestamp).toLocaleString()}
          </Text>
        )}
      </View>
    );
  };

  // Following Pattern: Contextual help and guidance
  const renderHelpSection = () => {
    if (variant === 'minimal') return null;

    const helpTexts = {
      'CARD_DECLINED': 'Try using a different card or contact your bank to authorize the transaction.',
      'INSUFFICIENT_FUNDS': 'Check your account balance or use a different payment method.',
      'EXPIRED_CARD': 'Update your card information or add a new payment method.',
      'NETWORK_ERROR': 'Check your internet connection and try again.',
      'INVALID_CARD_NUMBER': 'Double-check your card number, expiry date, and security code.',
    };

    const helpText = helpTexts[error.code as keyof typeof helpTexts];
    
    if (!helpText) return null;

    return (
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>How to fix this:</Text>
        <Text style={styles.helpText}>{helpText}</Text>
      </View>
    );
  };

  // Following Pattern: Fallback options with clear hierarchy
  const renderFallbackOptions = () => {
    if (!showFallbackOptions || variant === 'minimal') return null;

    return (
      <View style={styles.fallbackSection}>
        <Text style={styles.fallbackTitle}>Alternative Payment Options</Text>
        
        <Button
          title="💰 Pay Cash on Pickup"
          variant="outline"
          onPress={() => handleAction(() => onUseFallbackMethod?.('cash_on_pickup'), 'useCashOnPickup')}
          style={styles.fallbackButton}
          disabled={state.isRetrying}
        />
        
        <Button
          title="🏦 Bank Transfer"
          variant="outline"
          onPress={() => handleAction(() => onUseFallbackMethod?.('bank_transfer'), 'useBankTransfer')}
          style={styles.fallbackButton}
          disabled={state.isRetrying}
        />
      </View>
    );
  };

  // Following Pattern: Support contact with multiple channels
  const renderSupportSection = () => {
    if (!showSupportContact) return null;

    const supportInfo = customSupportInfo || {
      phone: '1-800-FARM-HELP',
      email: 'support@myfarmstand.com',
      hours: 'Mon-Fri 9AM-6PM EST',
    };

    return (
      <View style={styles.supportSection}>
        <Text style={styles.supportTitle}>Need Help?</Text>
        <Text style={styles.supportText}>
          Our customer support team is here to help resolve payment issues.
        </Text>
        
        {supportInfo.phone && (
          <Text style={styles.supportDetail}>📞 {supportInfo.phone}</Text>
        )}
        {supportInfo.email && (
          <Text style={styles.supportDetail}>✉️ {supportInfo.email}</Text>
        )}
        {supportInfo.hours && (
          <Text style={styles.supportDetail}>🕒 {supportInfo.hours}</Text>
        )}
        
        {onContactSupport && (
          <Button
            title="Contact Support"
            variant="ghost"
            onPress={() => handleAction(onContactSupport, 'contactSupport')}
            style={styles.supportButton}
            disabled={state.isRetrying}
          />
        )}
      </View>
    );
  };

  // Following Pattern: Action buttons with proper prioritization
  const renderActions = () => {
    return (
      <View style={styles.actionsContainer}>
        {errorInfo.canRetry && onRetry && state.retryCount < 3 && (
          <Button
            title={state.retryCount > 0 ? `Retry (${3 - state.retryCount} left)` : 'Try Again'}
            variant="primary"
            onPress={handleRetry}
            loading={state.isRetrying}
            disabled={state.isRetrying}
            style={styles.primaryAction}
          />
        )}
        
        {errorInfo.suggestDifferentMethod && onTryDifferentMethod && (
          <Button
            title="Try Different Method"
            variant="outline"
            onPress={() => handleAction(onTryDifferentMethod, 'tryDifferentMethod')}
            disabled={state.isRetrying}
            style={styles.secondaryAction}
          />
        )}
        
        {variant !== 'minimal' && (
          <Button
            title={state.showDetails ? 'Hide Details' : 'Show Details'}
            variant="ghost"
            onPress={() => setState(prev => ({ ...prev, showDetails: !prev.showDetails }))}
            style={styles.tertiaryAction}
          />
        )}
      </View>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, style]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Card
        variant="outlined"
        padding="lg"
        style={[styles.errorCard, getErrorStyles()]}
      >
        {/* Error Header */}
        <View style={styles.errorHeader}>
          <Text style={styles.errorIcon}>{errorInfo.icon}</Text>
          <Text style={styles.errorTitle}>{errorInfo.title}</Text>
          <Text style={styles.errorMessage}>{errorInfo.message}</Text>
        </View>

        {/* Help Section */}
        {renderHelpSection()}

        {/* Error Details */}
        {renderErrorDetails()}

        {/* Actions */}
        {renderActions()}
      </Card>

      {/* Fallback Options */}
      {renderFallbackOptions()}

      {/* Support Section */}
      {renderSupportSection()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  
  // Error card
  errorCard: {
    marginBottom: spacing.lg,
  },
  
  // Error header
  errorHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.error[700],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Help section
  helpSection: {
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  helpTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.blue[700],
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: typography.fontSizes.sm,
    color: colors.blue[600],
    lineHeight: 20,
  },
  
  // Details section
  detailsContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailsTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  detailsText: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  
  // Actions
  actionsContainer: {
    // gap: spacing.sm, // Remove gap property for React Native compatibility
  },
  primaryAction: {
    width: '100%',
  },
  secondaryAction: {
    width: '100%',
  },
  tertiaryAction: {
    alignSelf: 'center',
  },
  
  // Fallback section
  fallbackSection: {
    marginBottom: spacing.lg,
  },
  fallbackTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  fallbackButton: {
    marginBottom: spacing.sm,
  },
  
  // Support section
  supportSection: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  supportTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary[700],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  supportText: {
    fontSize: typography.fontSizes.base,
    color: colors.primary[600],
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  supportDetail: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary[600],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  supportButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
});

// Following Pattern: Export with proper TypeScript typing
export type { PaymentErrorProps };