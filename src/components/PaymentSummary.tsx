/**
 * PaymentSummary Component
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Payment summary component with calculation validation, ValidationMonitor integration,
 * and graceful error handling following established patterns.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { PaymentSummary, PaymentCalculation, CurrencyCode } from '../types';
import { Card } from './Card';
import { ValidationMonitor } from '../utils/validationMonitor';
import { usePaymentCalculation } from '../hooks/usePayment';

interface PaymentSummaryProps {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  tip?: number;
  discount?: number;
  total: number;
  currency?: CurrencyCode;
  style?: ViewStyle;
  showItemDetails?: boolean;
  onCalculationError?: (error: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
}

// Following Pattern: Helper function for currency formatting
const formatCurrency = (amount: number, currency: CurrencyCode = 'usd'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100); // Convert from cents
  } catch (error) {
    // Fallback formatting if Intl fails
    return `$${(amount / 100).toFixed(2)}`;
  }
};

// Following Pattern: Calculation validation with tolerance
const validateCalculation = (
  subtotal: number,
  tax: number,
  tip: number = 0,
  discount: number = 0,
  providedTotal: number,
  tolerance: number = 0.01
): { isValid: boolean; calculatedTotal: number; difference: number } => {
  const calculatedTotal = subtotal + tax + tip - discount;
  const difference = Math.abs(providedTotal - calculatedTotal);
  const isValid = difference <= tolerance;
  
  return { isValid, calculatedTotal, difference };
};

export const PaymentSummaryComponent: React.FC<PaymentSummaryProps> = ({
  items,
  subtotal,
  tax,
  tip = 0,
  discount = 0,
  total,
  currency = 'usd',
  style,
  showItemDetails = true,
  onCalculationError,
  variant = 'default',
}) => {
  const paymentCalculation = usePaymentCalculation();

  // Following Pattern: Real-time calculation validation with monitoring
  const calculationValidation = useMemo(() => {
    const validation = validateCalculation(subtotal, tax, tip, discount, total);
    
    if (!validation.isValid) {
      // Record calculation mismatch for monitoring
      ValidationMonitor.recordCalculationMismatch({
        type: 'order_total',
        expected: validation.calculatedTotal,
        actual: total,
        difference: validation.difference,
        tolerance: 0.01,
      });
      
      // Notify parent component of calculation error
      onCalculationError?.(
        `Total calculation mismatch: expected ${validation.calculatedTotal}, got ${total}`
      );
    } else {
      // Record successful calculation
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentSummary',
        pattern: 'transformation_schema',
        operation: 'validatePaymentTotal'
      });
    }
    
    return validation;
  }, [subtotal, tax, tip, discount, total, onCalculationError]);

  // Following Pattern: Individual item validation with skip-on-error
  const validatedItems = useMemo(() => {
    return items.filter(item => {
      try {
        // Validate each item's calculation
        const expectedSubtotal = item.price * item.quantity;
        const tolerance = 0.01;
        const isValid = Math.abs(item.subtotal - expectedSubtotal) <= tolerance;
        
        if (!isValid) {
          ValidationMonitor.recordCalculationMismatch({
            type: 'item_subtotal',
            expected: expectedSubtotal,
            actual: item.subtotal,
            difference: Math.abs(item.subtotal - expectedSubtotal),
            tolerance,
            itemId: item.name, // Using name as ID for this context
          });
          
          console.warn(`Item calculation mismatch for ${item.name}:`, {
            expected: expectedSubtotal,
            actual: item.subtotal
          });
          
          // Still include the item but with corrected subtotal
          item.subtotal = expectedSubtotal;
        }
        
        return true;
      } catch (error) {
        ValidationMonitor.recordValidationError({
          context: 'PaymentSummary.validateItems',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'ITEM_VALIDATION_FAILED'
        });
        
        // Skip invalid items
        return false;
      }
    });
  }, [items]);

  // Following Pattern: Graceful degradation - render different variants
  const renderItemDetails = () => {
    if (!showItemDetails || variant === 'compact') return null;
    
    return (
      <View style={styles.itemsSection}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        {validatedItems.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
            </View>
            <View style={styles.itemPricing}>
              <Text style={styles.itemPrice}>
                {formatCurrency(item.price, currency)} each
              </Text>
              <Text style={styles.itemSubtotal}>
                {formatCurrency(item.subtotal, currency)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderCalculationWarning = () => {
    if (calculationValidation.isValid) return null;
    
    return (
      <View style={styles.warningContainer}>
        <Text style={styles.warningText}>
          ⚠️ Calculation adjusted: Using {formatCurrency(calculationValidation.calculatedTotal, currency)}
        </Text>
      </View>
    );
  };

  const renderSummarySection = () => {
    // Use corrected total if calculation was invalid
    const displayTotal = calculationValidation.isValid ? total : calculationValidation.calculatedTotal;
    
    return (
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(subtotal, currency)}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(tax, currency)}
          </Text>
        </View>
        
        {tip > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tip</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(tip, currency)}
            </Text>
          </View>
        )}
        
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.discountLabel]}>Discount</Text>
            <Text style={[styles.summaryValue, styles.discountValue]}>
              -{formatCurrency(discount, currency)}
            </Text>
          </View>
        )}
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(displayTotal, currency)}
          </Text>
        </View>
      </View>
    );
  };

  // Following Pattern: Variant-based rendering
  const getCardVariant = () => {
    if (!calculationValidation.isValid) return 'outlined';
    return variant === 'detailed' ? 'elevated' : 'default';
  };

  return (
    <Card
      variant={getCardVariant()}
      padding={variant === 'compact' ? 'sm' : 'md'}
      style={[styles.container, style]}
    >
      {renderCalculationWarning()}
      {renderItemDetails()}
      {renderSummarySection()}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    // Base container styles
  },
  
  // Warning styles
  warningContainer: {
    backgroundColor: colors.warning[100],
    borderColor: colors.warning[400],
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  warningText: {
    color: colors.warning[700],
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
  
  // Section styles
  itemsSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  summarySection: {
    // Summary-specific styles
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  // Item detail styles
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemQuantity: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  itemSubtotal: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
  },
  
  // Summary row styles
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
  },
  
  // Discount styles
  discountLabel: {
    color: colors.success[600],
  },
  discountValue: {
    color: colors.success[600],
  },
  
  // Total row styles
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.medium,
  },
  totalLabel: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary[600],
  },
});

// Following Pattern: Export with proper TypeScript typing
export type { PaymentSummaryProps };
export { PaymentSummaryComponent as PaymentSummary };