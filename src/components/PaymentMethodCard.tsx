/**
 * PaymentMethodCard Component
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * UI component for displaying payment methods with graceful error handling,
 * following established component patterns from Card.tsx and Button.tsx.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { PaymentMethod, PaymentError } from '../types';
import { Card } from './Card';
import { Button } from './Button';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  isSelected?: boolean;
  isDefault?: boolean;
  onSelect?: (paymentMethod: PaymentMethod) => void;
  onEdit?: (paymentMethod: PaymentMethod) => void;
  onDelete?: (paymentMethod: PaymentMethod) => void;
  onSetDefault?: (paymentMethod: PaymentMethod) => void;
  style?: ViewStyle;
  disabled?: boolean;
  error?: PaymentError;
  showActions?: boolean;
}

// Helper function for getting card brand display info
const getCardBrandInfo = (brand: string) => {
  const brandMap = {
    visa: { name: 'Visa', color: colors.blue[600] },
    mastercard: { name: 'Mastercard', color: colors.red[600] },
    amex: { name: 'American Express', color: colors.green[600] },
    discover: { name: 'Discover', color: colors.orange[600] },
    diners: { name: 'Diners Club', color: colors.purple[600] },
    jcb: { name: 'JCB', color: colors.indigo[600] },
    unionpay: { name: 'UnionPay', color: colors.pink[600] },
    unknown: { name: 'Card', color: colors.neutral[600] },
  };
  
  return brandMap[brand as keyof typeof brandMap] || brandMap.unknown;
};

// Helper function for formatting expiry date
const formatExpiryDate = (month: number, year: number): string => {
  const formattedMonth = month.toString().padStart(2, '0');
  const formattedYear = year.toString().slice(-2);
  return `${formattedMonth}/${formattedYear}`;
};

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  isSelected = false,
  isDefault = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  style,
  disabled = false,
  error,
  showActions = true,
}) => {
  const cardBrandInfo = getCardBrandInfo(paymentMethod.card?.brand || 'unknown');

  // Following Pattern: Graceful error handling without breaking UI
  const renderErrorState = () => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error.userMessage || 'Payment method unavailable'}
        </Text>
      </View>
    );
  };

  // Following Pattern: Meaningful error messages for users
  const renderCardInfo = () => {
    if (paymentMethod.type === 'card' && paymentMethod.card) {
      return (
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View style={[styles.brandIndicator, { backgroundColor: cardBrandInfo.color }]} />
            <Text style={styles.brandText}>{cardBrandInfo.name}</Text>
            <Text style={styles.lastFourText}>•••• {paymentMethod.card.last4}</Text>
          </View>
          <Text style={styles.expiryText}>
            Expires {formatExpiryDate(paymentMethod.card.expMonth, paymentMethod.card.expYear)}
          </Text>
        </View>
      );
    }

    if (paymentMethod.type === 'us_bank_account' && paymentMethod.bankAccount) {
      return (
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View style={[styles.brandIndicator, { backgroundColor: colors.blue[600] }]} />
            <Text style={styles.brandText}>Bank Account</Text>
            <Text style={styles.lastFourText}>•••• {paymentMethod.bankAccount.last4}</Text>
          </View>
          <Text style={styles.expiryText}>
            {paymentMethod.bankAccount.accountType.charAt(0).toUpperCase() + 
             paymentMethod.bankAccount.accountType.slice(1)}
          </Text>
        </View>
      );
    }

    // Fallback for unknown payment method types
    return (
      <View style={styles.cardInfo}>
        <Text style={styles.brandText}>Payment Method</Text>
        <Text style={styles.expiryText}>Type: {paymentMethod.type}</Text>
      </View>
    );
  };

  // Following Pattern: Handle touch interactions with proper disabled states
  const handleCardPress = () => {
    if (disabled || error) return;
    onSelect?.(paymentMethod);
  };

  const handleSetDefaultPress = () => {
    if (disabled || error || isDefault) return;
    onSetDefault?.(paymentMethod);
  };

  const handleEditPress = () => {
    if (disabled || error) return;
    onEdit?.(paymentMethod);
  };

  const handleDeletePress = () => {
    if (disabled || error || isDefault) return;
    onDelete?.(paymentMethod);
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handleCardPress}
      disabled={disabled || !!error}
      activeOpacity={0.8}
    >
      <Card
        variant={isSelected ? 'elevated' : error ? 'outlined' : 'default'}
        padding="md"
        style={StyleSheet.flatten([
          isSelected && styles.selectedCard,
          error && styles.errorCard,
          disabled && styles.disabledCard,
        ])}
      >
        {/* Default Badge */}
        {isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}

        {/* Error State */}
        {renderErrorState()}

        {/* Payment Method Info */}
        {renderCardInfo()}

        {/* Actions */}
        {showActions && !error && (
          <View style={styles.actionsContainer}>
            {!isDefault && (
              <Button
                title="Set Default"
                variant="ghost"
                size="sm"
                onPress={handleSetDefaultPress}
                disabled={disabled}
                style={styles.actionButton}
              />
            )}
            
            <Button
              title="Edit"
              variant="ghost"
              size="sm"
              onPress={handleEditPress}
              disabled={disabled}
              style={styles.actionButton}
            />
            
            {!isDefault && (
              <Button
                title="Delete"
                variant="ghost"
                size="sm"
                onPress={handleDeletePress}
                disabled={disabled}
                style={StyleSheet.flatten([styles.actionButton, styles.deleteButton])}
                textStyle={styles.deleteButtonText}
              />
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  
  // Card states
  selectedCard: {
    borderColor: colors.primary[600],
    borderWidth: 2,
    ...shadows.lg,
  },
  errorCard: {
    borderColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  disabledCard: {
    opacity: 0.6,
  },
  
  // Default badge
  defaultBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.success[500],
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  defaultBadgeText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  
  // Error state
  errorContainer: {
    backgroundColor: colors.error[100],
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.error[700],
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  
  // Card info
  cardInfo: {
    marginTop: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  brandIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  brandText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
    flex: 1,
  },
  lastFourText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  expiryText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.md,
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    marginLeft: spacing.sm,
    minWidth: 60,
  },
  deleteButton: {
    // Specific styling for delete button if needed
  },
  deleteButtonText: {
    color: colors.error[600],
  },
});

// Following Pattern: Export component with proper TypeScript typing
export type { PaymentMethodCardProps };