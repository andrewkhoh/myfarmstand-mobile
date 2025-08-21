/**
 * PaymentMethodSelector Component
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Component for selecting payment methods with graceful error handling,
 * loading states, and comprehensive user experience patterns.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { 
  PaymentMethod, 
  PaymentError, 
  PaymentOperationResult 
} from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { Loading } from './Loading';
import { PaymentMethodCard } from './PaymentMethodCard';
import { PaymentForm } from './PaymentForm';
import { 
  usePaymentMethods, 
  useDeletePaymentMethod, 
  useUpdatePaymentMethod 
} from '../hooks/usePayment';
import { ValidationMonitor } from '../utils/validationMonitor';

interface PaymentMethodSelectorProps {
  selectedPaymentMethodId?: string;
  onPaymentMethodSelect: (paymentMethod: PaymentMethod) => void;
  onError?: (error: PaymentError) => void;
  style?: ViewStyle;
  title?: string;
  allowAddNew?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  maxHeight?: number;
}

interface SelectorState {
  showAddForm: boolean;
  editingPaymentMethodId: string | null;
  isProcessing: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedPaymentMethodId,
  onPaymentMethodSelect,
  onError,
  style,
  title = 'Choose Payment Method',
  allowAddNew = true,
  allowEdit = true,
  allowDelete = true,
  variant = 'default',
  maxHeight = 600,
}) => {
  const { 
    data: paymentMethods = [], 
    isLoading, 
    error: fetchError, 
    refetch 
  } = usePaymentMethods();
  
  const { 
    mutate: deletePaymentMethod, 
    isPending: isDeleting 
  } = useDeletePaymentMethod();
  
  const { 
    mutate: updatePaymentMethod, 
    isPending: isUpdating 
  } = useUpdatePaymentMethod();

  const [state, setState] = useState<SelectorState>({
    showAddForm: false,
    editingPaymentMethodId: null,
    isProcessing: false,
  });

  // Following Pattern: Graceful error handling with user-friendly messages
  const handleError = useCallback((error: PaymentError, context: string) => {
    ValidationMonitor.recordValidationError({
      context: `PaymentMethodSelector.${context}`,
      errorMessage: error.message,
      errorCode: error.code,
      validationPattern: 'user_experience_handling'
    });

    onError?.(error);
  }, [onError]);

  // Following Pattern: Individual processing with skip-on-error
  const handlePaymentMethodSelect = useCallback((paymentMethod: PaymentMethod) => {
    try {
      if (state.isProcessing) return;

      onPaymentMethodSelect(paymentMethod);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentMethodSelector',
        pattern: 'transformation_schema',
        operation: 'selectPaymentMethod'
      });
    } catch (error) {
      const paymentError: PaymentError = {
        code: 'SELECTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        userMessage: 'Unable to select payment method. Please try again.',
      };
      handleError(paymentError, 'handlePaymentMethodSelect');
    }
  }, [onPaymentMethodSelect, state.isProcessing, handleError]);

  // Following Pattern: Atomic operations with graceful degradation
  const handleSetDefault = useCallback((paymentMethod: PaymentMethod) => {
    setState(prev => ({ ...prev, isProcessing: true }));

    updatePaymentMethod(
      { id: paymentMethod.id, isDefault: true },
      {
        onSuccess: (result) => {
          setState(prev => ({ ...prev, isProcessing: false }));
          
          if (result.success) {
            ValidationMonitor.recordPatternSuccess({
              service: 'PaymentMethodSelector',
              pattern: 'direct_supabase_query',
              operation: 'setDefaultPaymentMethod'
            });
          } else {
            const error: PaymentError = {
              code: 'UPDATE_FAILED',
              message: result.message || 'Failed to set default payment method',
              userMessage: 'Unable to set as default. Please try again.',
            };
            handleError(error, 'handleSetDefault');
          }
        },
        onError: (error) => {
          setState(prev => ({ ...prev, isProcessing: false }));
          
          const paymentError: PaymentError = {
            code: 'UPDATE_FAILED',
            message: error.message,
            userMessage: 'Unable to set as default. Please try again.',
          };
          handleError(paymentError, 'handleSetDefault');
        }
      }
    );
  }, [updatePaymentMethod, handleError]);

  // Following Pattern: Confirmation dialogs for destructive actions
  const handleDelete = useCallback((paymentMethod: PaymentMethod) => {
    Alert.alert(
      'Delete Payment Method',
      `Are you sure you want to delete this ${paymentMethod.type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setState(prev => ({ ...prev, isProcessing: true }));

            deletePaymentMethod(paymentMethod.id, {
              onSuccess: (result) => {
                setState(prev => ({ ...prev, isProcessing: false }));
                
                if (result.success) {
                  ValidationMonitor.recordPatternSuccess({
                    service: 'PaymentMethodSelector',
                    pattern: 'direct_supabase_query',
                    operation: 'deletePaymentMethod'
                  });
                } else {
                  const error: PaymentError = {
                    code: 'DELETE_FAILED',
                    message: result.message || 'Failed to delete payment method',
                    userMessage: 'Unable to delete payment method. Please try again.',
                  };
                  handleError(error, 'handleDelete');
                }
              },
              onError: (error) => {
                setState(prev => ({ ...prev, isProcessing: false }));
                
                const paymentError: PaymentError = {
                  code: 'DELETE_FAILED',
                  message: error.message,
                  userMessage: 'Unable to delete payment method. Please try again.',
                };
                handleError(paymentError, 'handleDelete');
              }
            });
          }
        }
      ]
    );
  }, [deletePaymentMethod, handleError]);

  // Following Pattern: Form state management with validation
  const handleAddPaymentMethodSuccess = useCallback((paymentMethod: PaymentMethod) => {
    setState(prev => ({ 
      ...prev, 
      showAddForm: false,
      isProcessing: false 
    }));
    
    // Automatically select the newly added payment method
    onPaymentMethodSelect(paymentMethod);
    
    // Refresh the list to get the latest data
    refetch();
  }, [onPaymentMethodSelect, refetch]);

  const handleAddPaymentMethodError = useCallback((error: PaymentError) => {
    setState(prev => ({ ...prev, isProcessing: false }));
    handleError(error, 'handleAddPaymentMethodError');
  }, [handleError]);

  const handleCancelAddForm = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showAddForm: false,
      isProcessing: false 
    }));
  }, []);

  // Following Pattern: Loading states with graceful UX
  const renderLoadingState = () => {
    return (
      <Card variant="default" padding="lg" style={styles.loadingContainer}>
        <Loading size="large" />
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </Card>
    );
  };

  // Following Pattern: Error states with recovery options
  const renderErrorState = () => {
    const error = fetchError as PaymentError;
    
    return (
      <Card variant="outlined" padding="lg" style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Payment Methods</Text>
        <Text style={styles.errorMessage}>
          {error?.userMessage || 'Please check your connection and try again.'}
        </Text>
        <Button
          title="Try Again"
          variant="outline"
          onPress={() => refetch()}
          style={styles.retryButton}
        />
      </Card>
    );
  };

  // Following Pattern: Empty states with clear call-to-action
  const renderEmptyState = () => {
    return (
      <Card variant="default" padding="lg" style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Payment Methods</Text>
        <Text style={styles.emptyMessage}>
          Add a payment method to continue with your purchase.
        </Text>
        {allowAddNew && (
          <Button
            title="Add Payment Method"
            variant="primary"
            onPress={() => setState(prev => ({ ...prev, showAddForm: true }))}
            style={styles.addButton}
          />
        )}
      </Card>
    );
  };

  // Following Pattern: Form overlay with proper state management
  const renderAddPaymentForm = () => {
    if (!state.showAddForm) return null;

    return (
      <View style={styles.formOverlay}>
        <PaymentForm
          title="Add Payment Method"
          submitButtonText="Add Method"
          onSuccess={handleAddPaymentMethodSuccess}
          onError={handleAddPaymentMethodError}
          onCancel={handleCancelAddForm}
        />
      </View>
    );
  };

  // Following Pattern: List rendering with individual error handling
  const renderPaymentMethods = () => {
    return (
      <ScrollView 
        style={[styles.methodsList, { maxHeight }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.methodsListContent}
      >
        {paymentMethods.map((paymentMethod) => {
          try {
            const isSelected = paymentMethod.id === selectedPaymentMethodId;
            
            return (
              <PaymentMethodCard
                key={paymentMethod.id}
                paymentMethod={paymentMethod}
                isSelected={isSelected}
                isDefault={paymentMethod.isDefault}
                onSelect={handlePaymentMethodSelect}
                onSetDefault={allowEdit ? handleSetDefault : undefined}
                onDelete={allowDelete && !paymentMethod.isDefault ? handleDelete : undefined}
                showActions={variant !== 'compact'}
                disabled={state.isProcessing || isDeleting || isUpdating}
              />
            );
          } catch (error) {
            // Skip invalid payment methods gracefully
            ValidationMonitor.recordValidationError({
              context: 'PaymentMethodSelector.renderPaymentMethods',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorCode: 'PAYMENT_METHOD_RENDER_FAILED'
            });
            return null;
          }
        })}
      </ScrollView>
    );
  };

  // Following Pattern: Progressive disclosure for add button
  const renderAddButton = () => {
    if (!allowAddNew || state.showAddForm || paymentMethods.length === 0) return null;

    return (
      <Button
        title="+ Add New Payment Method"
        variant="ghost"
        onPress={() => setState(prev => ({ ...prev, showAddForm: true }))}
        style={styles.addNewButton}
        disabled={state.isProcessing}
      />
    );
  };

  // Main render with conditional states
  return (
    <View style={[styles.container, style]}>
      {variant !== 'compact' && (
        <Text style={styles.title}>{title}</Text>
      )}

      {/* Loading State */}
      {isLoading && renderLoadingState()}

      {/* Error State */}
      {!isLoading && fetchError && renderErrorState()}

      {/* Empty State */}
      {!isLoading && !fetchError && paymentMethods.length === 0 && !state.showAddForm && renderEmptyState()}

      {/* Payment Methods List */}
      {!isLoading && !fetchError && paymentMethods.length > 0 && renderPaymentMethods()}

      {/* Add Button */}
      {!isLoading && !fetchError && renderAddButton()}

      {/* Add Payment Form Overlay */}
      {renderAddPaymentForm()}

      {/* Processing Indicator */}
      {(state.isProcessing || isDeleting || isUpdating) && (
        <View style={styles.processingOverlay}>
          <Loading size="small" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Base container styles
  },
  
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  
  // Loading state
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  
  // Error state
  errorContainer: {
    alignItems: 'center',
    backgroundColor: colors.error[50],
    borderColor: colors.error[200],
  },
  errorTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.error[700],
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: typography.fontSizes.base,
    color: colors.error[600],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    minWidth: 120,
  },
  
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.fontSizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  addButton: {
    minWidth: 160,
  },
  
  // Methods list
  methodsList: {
    flexGrow: 0,
  },
  methodsListContent: {
    paddingBottom: spacing.sm,
  },
  
  // Add new button
  addNewButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  
  // Form overlay
  formOverlay: {
    marginTop: spacing.lg,
  },
  
  // Processing overlay
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
});

// Following Pattern: Export with proper TypeScript typing
export type { PaymentMethodSelectorProps };