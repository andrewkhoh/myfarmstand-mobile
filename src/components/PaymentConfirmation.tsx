/**
 * PaymentConfirmation Component
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Success confirmation component for completed payments with order details,
 * receipt information, and next action guidance following established patterns.
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { 
  Payment, 
  Order, 
  PaymentMethod, 
  PaymentError,
  PaymentSummary as PaymentSummaryType
} from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { PaymentSummary } from './PaymentSummary';
import { ValidationMonitor } from '../utils/validationMonitor';

interface PaymentConfirmationProps {
  payment: Payment;
  order?: Order;
  paymentMethod?: PaymentMethod;
  paymentSummary?: PaymentSummaryType;
  onContinue?: () => void;
  onViewOrder?: (orderId: string) => void;
  onPrintReceipt?: (payment: Payment) => void;
  onShareReceipt?: (payment: Payment) => void;
  style?: ViewStyle;
  variant?: 'default' | 'detailed' | 'minimal';
  showActions?: boolean;
  autoAdvanceDelay?: number;
}

// Helper function for formatting dates
const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch (error) {
    return dateString;
  }
};

// Helper function for formatting currency
const formatCurrency = (amount: number): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch (error) {
    return `$${(amount / 100).toFixed(2)}`;
  }
};

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  payment,
  order,
  paymentMethod,
  paymentSummary,
  onContinue,
  onViewOrder,
  onPrintReceipt,
  onShareReceipt,
  style,
  variant = 'default',
  showActions = true,
  autoAdvanceDelay,
}) => {
  // Following Pattern: ValidationMonitor for successful operations
  useEffect(() => {
    ValidationMonitor.recordPatternSuccess({
      service: 'PaymentConfirmation',
      pattern: 'transformation_schema',
      operation: 'displayPaymentSuccess'
    });
  }, []);

  // Following Pattern: Auto-advance functionality with timeout
  useEffect(() => {
    if (autoAdvanceDelay && onContinue) {
      const timeout = setTimeout(() => {
        onContinue();
      }, autoAdvanceDelay);

      return () => clearTimeout(timeout);
    }
  }, [autoAdvanceDelay, onContinue]);

  // Following Pattern: Error handling for button actions
  const handleAction = useCallback((action: () => void, actionName: string) => {
    try {
      action();
      
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentConfirmation',
        pattern: 'transformation_schema',
        operation: actionName
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: `PaymentConfirmation.${actionName}`,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ACTION_FAILED'
      });
    }
  }, []);

  // Following Pattern: Status indicator with appropriate styling
  const renderSuccessIcon = () => {
    return (
      <View style={styles.successIconContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSubtitle}>
          Your payment has been processed successfully
        </Text>
      </View>
    );
  };

  // Following Pattern: Transaction details with validation
  const renderTransactionDetails = () => {
    return (
      <Card variant="outlined" padding="md" style={styles.transactionCard}>
        <Text style={styles.sectionTitle}>Transaction Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transaction ID</Text>
          <Text style={styles.detailValue}>{payment.id}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method</Text>
          <Text style={styles.detailValue}>
            {paymentMethod?.type === 'card' && paymentMethod.card ? 
              `${paymentMethod.card.brand} •••• ${paymentMethod.card.last4}` :
              payment.paymentMethodId || 'Credit Card'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={[styles.detailValue, styles.amountValue]}>
            {formatCurrency(payment.amount)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date & Time</Text>
          <Text style={styles.detailValue}>
            {formatDateTime(payment.createdAt)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, styles.successStatusDot]} />
            <Text style={[styles.detailValue, styles.successStatus]}>
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  // Following Pattern: Order information with graceful degradation
  const renderOrderDetails = () => {
    if (!order) return null;

    return (
      <Card variant="default" padding="md" style={styles.orderCard}>
        <Text style={styles.sectionTitle}>Order Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Number</Text>
          <Text style={styles.detailValue}>#{order.id}</Text>
        </View>
        
        {order.pickupDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pickup Date</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(order.pickupDate)}
            </Text>
          </View>
        )}
        
        {order.customer_name && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Customer</Text>
            <Text style={styles.detailValue}>{order.customer_name}</Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Status</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, styles.orderStatusDot]} />
            <Text style={[styles.detailValue, styles.orderStatus]}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  // Following Pattern: Payment breakdown with calculation validation
  const renderPaymentSummary = () => {
    if (!paymentSummary) return null;

    // Convert payment summary to the expected format for PaymentSummary component
    const items = paymentSummary.items?.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price * 100, // Convert to cents
      subtotal: item.subtotal * 100, // Convert to cents
    })) || [];

    return (
      <View style={styles.summarySection}>
        <PaymentSummary
          items={items}
          subtotal={paymentSummary.subtotal * 100} // Convert to cents
          tax={paymentSummary.tax * 100} // Convert to cents
          tip={paymentSummary.tip ? paymentSummary.tip * 100 : 0}
          discount={paymentSummary.discount ? paymentSummary.discount * 100 : 0}
          total={paymentSummary.total * 100} // Convert to cents
          variant="compact"
          showItemDetails={variant === 'detailed'}
        />
      </View>
    );
  };

  // Following Pattern: Next steps guidance
  const renderNextSteps = () => {
    if (variant === 'minimal') return null;

    return (
      <Card variant="elevated" padding="md" style={styles.nextStepsCard}>
        <Text style={styles.sectionTitle}>What's Next?</Text>
        
        <View style={styles.nextStepsList}>
          <View style={styles.nextStepItem}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              You'll receive an email confirmation shortly
            </Text>
          </View>
          
          {order?.pickupDate ? (
            <View style={styles.nextStepItem}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Pickup your order on {formatDateTime(order.pickupDate)}
              </Text>
            </View>
          ) : (
            <View style={styles.nextStepItem}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                We'll notify you when your order is ready
              </Text>
            </View>
          )}
          
          <View style={styles.nextStepItem}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Enjoy your fresh farm-to-table products!
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  // Following Pattern: Action buttons with proper loading states
  const renderActions = () => {
    if (!showActions) return null;

    return (
      <View style={styles.actionsContainer}>
        {onViewOrder && order && (
          <Button
            title="View Order"
            variant="outline"
            onPress={() => handleAction(() => onViewOrder(order.id), 'viewOrder')}
            style={styles.actionButton}
          />
        )}
        
        {onPrintReceipt && (
          <Button
            title="Print Receipt"
            variant="ghost"
            onPress={() => handleAction(() => onPrintReceipt(payment), 'printReceipt')}
            style={styles.actionButton}
          />
        )}
        
        {onShareReceipt && (
          <Button
            title="Share Receipt"
            variant="ghost"
            onPress={() => handleAction(() => onShareReceipt(payment), 'shareReceipt')}
            style={styles.actionButton}
          />
        )}
        
        {onContinue && (
          <Button
            title="Continue Shopping"
            variant="primary"
            onPress={() => handleAction(onContinue, 'continueShopping')}
            style={[styles.actionButton, styles.primaryActionButton]}
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
      {/* Success Icon and Message */}
      {renderSuccessIcon()}
      
      {/* Transaction Details */}
      {renderTransactionDetails()}
      
      {/* Order Details */}
      {renderOrderDetails()}
      
      {/* Payment Summary */}
      {renderPaymentSummary()}
      
      {/* Next Steps */}
      {renderNextSteps()}
      
      {/* Actions */}
      {renderActions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  
  // Success icon
  successIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  checkmark: {
    fontSize: 36,
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.bold,
  },
  successTitle: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontSize: typography.fontSizes.lg,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  // Cards
  transactionCard: {
    marginBottom: spacing.md,
  },
  orderCard: {
    marginBottom: spacing.md,
  },
  nextStepsCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primary[50],
  },
  summarySection: {
    marginBottom: spacing.md,
  },
  
  // Section titles
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailLabel: {
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  amountValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.success[600],
  },
  
  // Status indicators
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  successStatusDot: {
    backgroundColor: colors.success[500],
  },
  orderStatusDot: {
    backgroundColor: colors.primary[500],
  },
  successStatus: {
    color: colors.success[600],
  },
  orderStatus: {
    color: colors.primary[600],
  },
  
  // Next steps
  nextStepsList: {
    // Styles for next steps list
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    color: colors.text.inverse,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
    lineHeight: 28,
    marginRight: spacing.sm,
  },
  stepText: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
    lineHeight: 24,
    paddingTop: 2,
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
    marginBottom: spacing.sm,
  },
  primaryActionButton: {
    width: '100%',
    flex: undefined,
  },
});

// Following Pattern: Export with proper TypeScript typing
export type { PaymentConfirmationProps };